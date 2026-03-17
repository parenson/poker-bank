import React, { useMemo } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Screen, Hero, Card, Field, PrefixInput, BtnPrimary, Avatar, Divider } from '../components/UI.jsx'
import { fmt } from '../utils/settlement.js'
import { computeSettlement } from '../utils/settlement.js'

export default function CashOutScreen() {
  const { state, dispatch } = useGame()
  const { players, setup } = state
  const buyIn = parseFloat(setup.buyInAmount) || 0

  const totalIn = useMemo(() =>
    players.reduce((s, p) => s + buyIn * (1 + (p.rebuyCount ?? 0)), 0),
    [players, buyIn]
  )

  const totalOut = useMemo(() =>
    players.reduce((s, p) => s + (parseFloat(p.cashOut) || 0), 0),
    [players]
  )

  const diff = totalIn - totalOut
  const balanced = Math.abs(diff) < 0.50

  const handleNext = () => {
    if (!balanced) {
      alert(`Chip totals don't balance.\n\nTotal in: ${fmt(totalIn)}\nTotal out: ${fmt(totalOut)}\nDifference: ${fmt(Math.abs(diff))} ${diff > 0 ? 'under' : 'over'}`)
      return
    }

    // Compute settlement
    const game = {
      buyInAmount: buyIn,
      dealerUpfrontPerPlayer: parseFloat(setup.dealerUpfrontPerPlayer) || 0,
      dealerTipPercent: (parseFloat(setup.dealerTipPercent) || 0) / 100,
      dealerName: setup.dealerName,
      dealerVenmoHandle: setup.dealerVenmoHandle,
      bankerName: setup.bankerName,
      bankerVenmoHandle: setup.bankerVenmoHandle,
      gameType: setup.gameType,
    }

    const settlement = computeSettlement(game, players)
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

      {/* Balance checker */}
      <Card title="Chip Balance Check">
        <BalanceRow label="Total chips in game" value={fmt(totalIn)} color="var(--gold-light)" />
        <BalanceRow label="Total chips counted out" value={fmt(totalOut)} />
        <Divider />
        <BalanceRow
          label="Difference"
          value={balanced ? '✓ Balanced' : `${fmt(Math.abs(diff))} ${diff > 0 ? 'under' : 'over'}`}
          color={balanced ? 'var(--success)' : 'var(--danger)'}
          bold
        />
      </Card>

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
