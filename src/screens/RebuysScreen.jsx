import React, { useMemo } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Screen, Hero, Card, BtnPrimary, Avatar, Divider } from '../components/UI.jsx'
import { fmt } from '../utils/settlement.js'

export default function RebuysScreen() {
  const { state, dispatch } = useGame()
  const { players, setup } = state
  const buyIn = parseFloat(setup.buyInAmount) || 0

  const stats = useMemo(() => {
    const totalRebuys = players.reduce((s, p) => s + (p.rebuyCount ?? 0), 0)
    const totalPot = players.reduce((s, p) => s + buyIn * (1 + (p.rebuyCount ?? 0)), 0)
    const dealerFees = parseFloat(setup.dealerUpfrontPerPlayer || 0) * players.length
    return { totalRebuys, totalPot, dealerFees }
  }, [players, buyIn, setup])

  const handleNext = () => {
    dispatch({ type: 'SET_SCREEN', screen: 'cashout' })
  }

  return (
    <Screen>
      <Hero title="Rebuys" subtitle="Track rebuys as the game progresses" />

      <Card title="Players">
        {players.map((p, i) => (
          <RebuyRow
            key={p.id}
            player={p}
            buyIn={buyIn}
            onDelta={(delta) => dispatch({ type: 'SET_REBUY', id: p.id, delta })}
            style={{ marginBottom: i < players.length - 1 ? 8 : 0 }}
          />
        ))}
      </Card>

      <Card title="Running Totals">
        <StatRow label="Players" value={players.length} />
        <StatRow label="Total rebuys" value={stats.totalRebuys} />
        <Divider />
        <StatRow label="Total pot" value={fmt(stats.totalPot)} highlight />
        {stats.dealerFees > 0 && (
          <StatRow label="Dealer fees collected" value={fmt(stats.dealerFees)} />
        )}
      </Card>

      <BtnPrimary onClick={handleNext}>Proceed to Cash Out →</BtnPrimary>
    </Screen>
  )
}

function RebuyRow({ player, buyIn, onDelta, style }) {
  const rebuys = player.rebuyCount ?? 0
  const totalIn = buyIn * (1 + rebuys)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 12px',
      background: 'rgba(0,0,0,0.18)', borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(201,168,76,0.1)',
      ...style,
    }}>
      <Avatar name={player.name} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{player.name}</div>
        <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>
          {rebuys > 0 ? `${rebuys} rebuy${rebuys !== 1 ? 's' : ''} · ` : ''}
          Total in: {fmt(totalIn)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <RebuyBtn label="−" onClick={() => onDelta(-1)} disabled={rebuys === 0} />
        <div style={{
          minWidth: 42, textAlign: 'center',
          fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 600,
          color: rebuys > 0 ? 'var(--gold-light)' : 'var(--cream-dim)',
        }}>
          {rebuys}
        </div>
        <RebuyBtn label="+" onClick={() => onDelta(1)} />
      </div>
    </div>
  )
}

function RebuyBtn({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 38, height: 38, borderRadius: '50%',
        background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(201,168,76,0.12)',
        border: '1px solid rgba(201,168,76,0.25)',
        color: disabled ? 'rgba(201,168,76,0.3)' : 'var(--gold)',
        fontSize: 22, fontWeight: 300, lineHeight: 1,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
      }}
      onTouchStart={e => !disabled && (e.currentTarget.style.background = 'rgba(201,168,76,0.25)')}
      onTouchEnd={e => !disabled && (e.currentTarget.style.background = 'rgba(201,168,76,0.12)')}
    >
      {label}
    </button>
  )
}

function StatRow({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 8, fontSize: 14,
    }}>
      <span style={{ color: 'var(--cream-dim)' }}>{label}</span>
      <span style={{
        fontWeight: 600,
        color: highlight ? 'var(--gold-light)' : 'var(--cream)',
        fontFamily: highlight ? 'Cinzel, serif' : 'inherit',
        fontSize: highlight ? 16 : 14,
      }}>
        {value}
      </span>
    </div>
  )
}
