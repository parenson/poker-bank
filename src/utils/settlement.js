/**
 * settlement.js
 * Port of settlement.dart logic.
 *
 * Dealer fee modes (game.dealerFeeIncluded, default true):
 *   - included: the buy-in already contains the dealer fee. E.g. a $200
 *     buy-in with a $40 fee gives the player $160 in chips; the $40 goes to
 *     the dealer. Rebuys are the full buy-in amount, all in chips.
 *       winnings = cashOut - potIn
 *   - extra (legacy games saved before this change): the fee was charged on
 *     top of the buy-in.
 *       winnings = cashOut - (potIn + upfrontDealer)
 *
 * Tip modes (game.tipMode):
 *   - 'percent' (default): winners pay a set % of their winnings (rules below).
 *   - 'chips': players hand tip chips to the dealer during/after the game.
 *     No tip is computed; game.dealerTipChips is the value of the chips the
 *     dealer holds, counted toward the chip balance and paid out by the banker.
 *
 * Percent tip rules:
 *   - If winnings < 20 → NO TIP
 *   - If winnings >= 20 → tip = floor(winnings * tipPercent)  (rounds DOWN to $1)
 *   - finalNet = winnings - tip
 *
 * Payment flow:
 *   - Net losers pay Banker
 *   - Banker pays net winners
 *   - Banker pays Dealer (upfronts + tips)
 */

function roundCents(x) {
  return Math.round(x * 100) / 100
}

/**
 * @param {object} game - { buyInAmount, dealerUpfrontPerPlayer, dealerTipPercent,
 *                          dealerName, dealerVenmoHandle, bankerName, bankerVenmoHandle }
 * @param {Array}  players - [{ id, name, initials, venmoHandle, buyInCount, rebuyCount, cashOut }]
 * @returns {GameSettlement}
 */
export function computeSettlement(game, players) {
  const { buyInAmount, dealerUpfrontPerPlayer, dealerTipPercent } = game
  const feeIncluded = game.dealerFeeIncluded !== false
  const tipChipsMode = game.tipMode === 'chips' && game.gameType !== 'amalfi'
  const dealerTipChips = tipChipsMode ? Math.max(0, Number(game.dealerTipChips) || 0) : 0

  const playerSettlements = []
  let totalPot = 0
  let totalDealerUpfront = 0
  let totalTip = 0

  for (const gp of players) {
    const totalBuyInCount = gp.buyInCount + gp.rebuyCount
    const potIn = buyInAmount * totalBuyInCount
    const upfrontDealer = dealerUpfrontPerPlayer
    const cashOut = gp.cashOut ?? 0

    const baseCost = feeIncluded ? potIn : potIn + upfrontDealer
    const winningsBeforeTip = cashOut - baseCost
    const netBeforeTip = winningsBeforeTip

    let tipShare = 0
    if (!tipChipsMode && winningsBeforeTip >= 20) {
      const rawTip = winningsBeforeTip * dealerTipPercent
      tipShare = Math.floor(rawTip) // round DOWN to nearest dollar
      if (tipShare < 0) tipShare = 0
    }

    const finalNet = winningsBeforeTip - tipShare

    totalPot += potIn
    totalDealerUpfront += upfrontDealer
    totalTip += tipShare

    playerSettlements.push({
      player: gp,
      potIn: roundCents(potIn),
      upfrontDealer: roundCents(upfrontDealer),
      netBeforeTip: roundCents(netBeforeTip),
      tipShare: roundCents(tipShare),
      finalNet: roundCents(finalNet),
      name: gp.name,
      venmoHandle: gp.venmoHandle,
    })
  }

  if (tipChipsMode) totalTip = dealerTipChips
  const finalDealerTake = roundCents(totalDealerUpfront + totalTip)

  // Synthetic dealer
  const dealerSettlement = {
    player: { id: 'dealer', name: game.dealerName, initials: initials(game.dealerName), venmoHandle: game.dealerVenmoHandle },
    potIn: 0, upfrontDealer: 0, netBeforeTip: 0, tipShare: 0,
    finalNet: finalDealerTake,
    name: game.dealerName,
    venmoHandle: game.dealerVenmoHandle,
  }

  // Synthetic banker
  const sumPlayersFinal = playerSettlements.reduce((s, p) => s + p.finalNet, 0)
  const bankerNet = -(sumPlayersFinal + finalDealerTake)
  const bankerSettlement = {
    player: { id: 'banker', name: game.bankerName, initials: initials(game.bankerName), venmoHandle: game.bankerVenmoHandle },
    potIn: 0, upfrontDealer: 0, netBeforeTip: 0, tipShare: 0,
    finalNet: roundCents(bankerNet),
    name: game.bankerName,
    venmoHandle: game.bankerVenmoHandle,
  }

  // Payment instructions
  const payments = []

  // Losers → Banker
  for (const s of playerSettlements) {
    if (s.finalNet < -0.001) {
      payments.push({
        from: s,
        to: bankerSettlement,
        amount: roundCents(-s.finalNet),
        reason: 'Player pays banker',
      })
    }
  }

  // Banker → Winners
  for (const s of playerSettlements) {
    if (s.finalNet > 0.001) {
      payments.push({
        from: bankerSettlement,
        to: s,
        amount: roundCents(s.finalNet),
        reason: 'Banker pays winner',
      })
    }
  }

  // Banker → Dealer
  if (finalDealerTake > 0.001) {
    payments.push({
      from: bankerSettlement,
      to: dealerSettlement,
      amount: finalDealerTake,
      reason: 'Banker pays dealer',
    })
  }

  return {
    playerSettlements,
    dealerFeeIncluded: feeIncluded,
    tipMode: tipChipsMode ? 'chips' : 'percent',
    totalPot: roundCents(totalPot),   // total buy-ins (cash paid in)
    chipsInPlay: roundCents(totalPot - (feeIncluded ? totalDealerUpfront : 0)),
    totalDealerUpfront: roundCents(totalDealerUpfront),
    totalTipFromWinners: roundCents(totalTip),
    finalDealerTake,
    dealerSettlement,
    bankerSettlement,
    payments,
  }
}

/** Build the `game` argument for computeSettlement from the setup form state. */
export function buildSettlementGame(setup) {
  return {
    buyInAmount: parseFloat(setup.buyInAmount) || 0,
    dealerUpfrontPerPlayer: parseFloat(setup.dealerUpfrontPerPlayer) || 0,
    dealerTipPercent: (parseFloat(setup.dealerTipPercent) || 0) / 100,
    dealerName: setup.dealerName,
    dealerVenmoHandle: setup.dealerVenmoHandle,
    bankerName: setup.bankerName,
    bankerVenmoHandle: setup.bankerVenmoHandle,
    gameType: setup.gameType,
    dealerFeeIncluded: setup.dealerFeeIncluded !== false,
    tipMode: setup.tipMode === 'chips' ? 'chips' : 'percent',
    dealerTipChips: parseFloat(setup.dealerTipChips) || 0,
  }
}

/** Saved chips-mode games store 0% tip but a non-zero dealer tip total. */
export function inferTipMode(savedGame) {
  return savedGame.gameType !== 'amalfi'
    && !(savedGame.dealerTipPercent > 0)
    && savedGame.totalDealerTips > 0.001 ? 'chips' : 'percent'
}

/**
 * Games saved before the dealer fee was carved out of the buy-in charged the
 * fee on top: netBeforeTip = cashOut - buyInTotal - upfrontDealer. Detect that
 * from a saved game's stored numbers so reopening it keeps its old math.
 * Returns true for new-style (fee included) games.
 */
export function inferDealerFeeIncluded(savedGame) {
  if (!(savedGame.dealerUpfrontPerPlayer > 0)) return true
  const r = savedGame.results.find(x => x.upfrontDealer > 0) || savedGame.results[0]
  if (!r) return true
  const legacyNet = r.cashOut - r.buyInTotal - r.upfrontDealer
  return Math.abs(r.netBeforeTip - legacyNet) >= 0.02
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function fmt(n) {
  const v = Math.round((n ?? 0) * 100) / 100
  return '$' + Math.abs(v).toFixed(2)
}

export function fmtSigned(n) {
  const v = Math.round((n ?? 0) * 100) / 100
  return (v >= 0 ? '+' : '−') + '$' + Math.abs(v).toFixed(2)
}
