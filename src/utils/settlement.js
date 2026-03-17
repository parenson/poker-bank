/**
 * settlement.js
 * Exact port of settlement.dart logic.
 *
 * Tip rules (match Flutter app exactly):
 *   - winnings = cashOut - (potIn + upfrontDealer)
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

  const playerSettlements = []
  let totalPot = 0
  let totalDealerUpfront = 0
  let totalTip = 0

  for (const gp of players) {
    const totalBuyInCount = gp.buyInCount + gp.rebuyCount
    const potIn = buyInAmount * totalBuyInCount
    const upfrontDealer = dealerUpfrontPerPlayer
    const cashOut = gp.cashOut ?? 0

    const baseCost = potIn + upfrontDealer
    const winningsBeforeTip = cashOut - baseCost
    const netBeforeTip = winningsBeforeTip

    let tipShare = 0
    if (winningsBeforeTip >= 20) {
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
    totalPot: roundCents(totalPot),
    totalDealerUpfront: roundCents(totalDealerUpfront),
    totalTipFromWinners: roundCents(totalTip),
    finalDealerTake,
    dealerSettlement,
    bankerSettlement,
    payments,
  }
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
