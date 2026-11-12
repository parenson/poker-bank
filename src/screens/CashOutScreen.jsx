import React, { useMemo } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Screen, Hero, Card, Field, PrefixInput, BtnPrimary, Avatar, Divider } from '../components/UI.jsx'
import { fmt, computeSettlement, buildSettlementGame } from '../utils/settlement.js'

export default function CashOutScreen() {
  const { state, dispatch } = useGame()
  const { players, setup } = state
  const buyIn = parseFloat(setup.buyInAmount) || 0

  const isAmalfi = setup.gameType === 'amalfi'
  const feeIncluded = setup.dealerFeeIncluded !== false
  const feePerPlayer = isAmalfi ? 0 : (parseFloat(setup.dealerUpfrontPerPlayer) || 0)

  // Total buy-ins: all the cash the players put in (first buy-in + full-price rebuys).
  const totalIn = useMemo(() =>
    players.reduce((s, p) => s + buyIn * (1 + (p.rebuyCount ?? 0)), 0),
    [players, buyIn]
  )

  // The dealer fee comes out of the first buy-in, so it isn't in chips.
  const dealerFees = feePerPlayer * players.length
  const chipsIn = feeIncluded ? totalIn - dealerFees : totalIn

  const totalOut = useMemo(() =>
    players.reduce((s, p) => s + (parseFloat(p.cashOut) || 0), 0),
    [players]
  )

  // Chips mode: tips handed to the dealer are chips that also have to be accounted for.
  const tipChipsMode = !isAmalfi && setup.tipMode === 'chips'
  const tipChips = tipChipsMode ? (parseFloat(setup.dealerTipChips) || 0) : 0

  const diff = chipsIn - totalOut - tipChips
  const balanced = Math.abs(diff) < 0.50

  // Live preview of the dealer's settlement (fees + tips) at the current counts.
  const preview = useMemo(
    () => computeSettlement(buildSettlementGame(setup), players),
    [players, setup]
  )
  const playersAfterTips = preview.playerSettlements.reduce(
    (s, ps) => s + (parseFloat(ps.player.cashOut) || 0) - ps.tipShare, 0
  )

  const handleNext = () => {
    if (!balanced) {
      alert(`Chip totals don't balance.

Chips in play: ${fmt(chipsIn)}
Chips counted out: ${fmt(totalOut)}${tipChipsMode ? `
Dealer tip chips: ${fmt(tipChips)}` : ''}
Difference: ${fmt(Math.abs(diff))} ${diff > 0 ? 'under' : 'over'}`)
      return
    }

    const settlement = computeSettlement(buildSettlementGame(setup), players)
    dispatch({ type: 'SET_SETTLEMENT', settlement })
    dispatch({ type: 'SET_SCREEN', screen: 'results' })
  }

  return (
    <Screen>
      <Hero title="Cash Out" subtitle="Enter each player's final chip count" />

      <Card title="Chip Counts">
        {players.map((p, i) => {
          const totalInPlayer = buyIn * (1 + (p.rebuyCount ?? 0))
          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.18)', borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(201,168,76,0.1)',
                marginBottom: i < players.length - 1 ? 8 : 0,
              }}
            >
              <Avatar name={p.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>
                  Bought in for {fmt(totalInPlayer)}
                </div>
              </div>
              <div style={{ width: 110 }}>
                <PrefixInput
                  prefix="$"
                  type="number" placeholder="0" inputMode="decimal" min="0"
                  value={p.cashOut}
                  onChange={e => dispatch({ type: 'SET_CASHOUT', id: p.id, value: e.target.value })}
                  inputStyle={{ textAlign: 'right', paddingRight: 10, paddingLeft: 22, fontSize: 15 }}
                />
              </div>
            </div>
          )
        })}
      </Card>

      {tipChipsMode && (
        <Card title="Dealer Tip Chips">
          <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 12 }}>
            Value of the chips players handed the dealer as tips. They count toward the chip balance and are paid to the dealer.
          </p>
          <PrefixInput
            prefix="$" type="number" placeholder="0" inputMode="decimal" min="0"
            value={setup.dealerTipChips}
            onChange={e => dispatch({ type: 'SET_SETUP', payload: { dealerTipChips: e.target.value } })}
            inputStyle={{ textAlign: 'right', paddingRight: 10, paddingLeft: 22, fontSize: 15 }}
          />
        </Card>
      )}

      {/* Balance checker */}
      <Card title="Chip Balance Check">
        <BalanceRow label="Total buy-ins (all players)" value={fmt(totalIn)} color="var(--gold-light)" />
        {feeIncluded && dealerFees > 0 && (
          <BalanceRow label={`Less dealer fees (${players.length} × ${fmt(feePerPlayer)})`} value={`− ${fmt(dealerFees)}`} />
        )}
        <BalanceRow label="Chips in play" value={fmt(chipsIn)} />
        <BalanceRow label={tipChipsMode ? 'Chips counted out (players)' : 'Chips counted out'} value={fmt(totalOut)} />
        {tipChipsMode && <BalanceRow label="Dealer tip chips" value={fmt(tipChips)} />}
        <Divider />
        <BalanceRow
          label="Difference"
          value={balanced ? '✓ Balanced' : `${fmt(Math.abs(diff))} ${diff > 0 ? 'under' : 'over'}`}
          color={balanced ? 'var(--success)' : 'var(--danger)'}
          bold
        />
      </Card>

      {/* Dealer settlement: fees + tips, so everything adds back up to total buy-ins */}
      {!isAmalfi && (dealerFees > 0 || preview.totalTipFromWinners > 0) && (
        <Card title="Dealer Settlement">
          <BalanceRow label={`Dealer fees (${players.length} × ${fmt(feePerPlayer)})`} value={fmt(preview.totalDealerUpfront)} />
          <BalanceRow label={tipChipsMode ? 'Tips (chips from players)' : 'Tips from winners'} value={fmt(preview.totalTipFromWinners)} />
          <Divider />
          <BalanceRow label="Dealer total" value={fmt(preview.finalDealerTake)} color="var(--gold-light)" bold />
          {feeIncluded && (
            <>
              <div style={{ height: 8 }} />
              <BalanceRow label="Player balances (after tips)" value={fmt(playersAfterTips)} />
              <BalanceRow label="+ Dealer total" value={fmt(preview.finalDealerTake)} />
              <Divider />
              <BalanceRow
                label="= Total buy-ins"
                value={fmt(playersAfterTips + preview.finalDealerTake)}
                color={balanced ? 'var(--success)' : 'var(--danger)'}
                bold
              />
            </>
          )}
        </Card>
      )}

      <BtnPrimary onClick={handleNext} disabled={!balanced}>
        Calculate Results →
      </BtnPrimary>

      {!balanced && (
        <p style={{
          textAlign: 'center', fontSize: 13, color: 'var(--danger)',
          marginTop: 8, padding: '0 8px',
        }}>
          Chips must balance before proceeding
        </p>
      )}
    </Screen>
  )
}

function BalanceRow({ label, value, color, bold }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      marginBottom: 8, fontSize: 14,
    }}>
      <span style={{ color: 'var(--cream-dim)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 600, color: color || 'var(--cream)' }}>{value}</span>
    </div>
  )
}
