import React from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Screen, Hero, Card, Field, Row, PrefixInput, BtnPrimary } from '../components/UI.jsx'

const GAME_TYPES = [
  { value: 'home', label: '🏠 Home Game' },
  { value: 'amalfi', label: '🌊 Amalfi' },
  { value: 'other', label: '📍 Other' },
]

export default function SetupScreen() {
  const { state, dispatch } = useGame()
  const s = state.setup

  const set = (key, value) => dispatch({ type: 'SET_SETUP', payload: { [key]: value } })

  const handleNext = () => {
    if (!s.buyInAmount || parseFloat(s.buyInAmount) <= 0) {
      alert('Please enter a valid buy-in amount.')
      return
    }
    if (!s.dealerName.trim()) {
      alert('Please enter a dealer name.')
      return
    }
    if (!s.bankerName.trim()) {
      alert('Please enter a banker name.')
      return
    }
    dispatch({ type: 'SET_SCREEN', screen: 'players' })
  }

  return (
    <Screen>
      <Hero title="Game Setup" subtitle="Configure buy-in, dealer, and banker" />

      <Card title="Game Info">
        <Row>
          <Field label="Game Name" style={{ flex: 1.4 }}>
            <input
              type="text" placeholder="Friday Night Poker" maxLength={40}
              value={s.name}
              onChange={e => set('name', e.target.value)}
            />
          </Field>
          <Field label="Date" style={{ flex: 1 }}>
            <input
              type="date" value={s.date}
              onChange={e => set('date', e.target.value)}
            />
          </Field>
        </Row>
        <Field label="Game Type" style={{ marginTop: 2 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {GAME_TYPES.map(gt => (
              <button
                key={gt.value}
                onClick={() => set('gameType', gt.value)}
                style={{
                  flex: 1, padding: '10px 6px',
                  background: s.gameType === gt.value
                    ? 'rgba(201,168,76,0.18)'
                    : 'var(--input-bg)',
                  border: s.gameType === gt.value
                    ? '1px solid var(--gold)'
                    : '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  color: s.gameType === gt.value ? 'var(--gold-light)' : 'var(--cream-dim)',
                  fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {gt.label}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card title="Buy-In & Tip">
        <Row>
          <Field label="Buy-In Amount" style={{ flex: 1 }}>
            <PrefixInput
              prefix="$" type="number" placeholder="50" inputMode="decimal"
              value={s.buyInAmount}
              onChange={e => set('buyInAmount', e.target.value)}
            />
          </Field>
          <Field label="Dealer Fee / Player" style={{ flex: 1 }}>
            <PrefixInput
              prefix="$" type="number" placeholder="5" inputMode="decimal"
              value={s.dealerUpfrontPerPlayer}
              onChange={e => set('dealerUpfrontPerPlayer', e.target.value)}
            />
          </Field>
        </Row>
        <Field label="Dealer Tip % (from net winners ≥ $20, rounded down)">
          <PrefixInput
            suffix="%" type="number" placeholder="10" inputMode="decimal"
            value={s.dealerTipPercent}
            onChange={e => set('dealerTipPercent', e.target.value)}
          />
        </Field>
      </Card>

      <Card title="Dealer">
        <Row>
          <Field label="Name" style={{ flex: 1 }}>
            <input
              type="text" placeholder="Dealer name" maxLength={30}
              value={s.dealerName}
              onChange={e => set('dealerName', e.target.value)}
            />
          </Field>
          <Field label="Venmo Handle" style={{ flex: 1 }}>
            <PrefixInput
              prefix="@" type="text" placeholder="venmo-user" maxLength={30}
              value={s.dealerVenmoHandle}
              onChange={e => set('dealerVenmoHandle', e.target.value)}
            />
          </Field>
        </Row>
      </Card>

      <Card title="Banker">
        <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 12 }}>
          The banker collects from losers and pays out winners &amp; dealer.
        </p>
        <Row>
          <Field label="Name" style={{ flex: 1 }}>
            <input
              type="text" placeholder="Banker name" maxLength={30}
              value={s.bankerName}
              onChange={e => set('bankerName', e.target.value)}
            />
          </Field>
          <Field label="Venmo Handle" style={{ flex: 1 }}>
            <PrefixInput
              prefix="@" type="text" placeholder="venmo-user" maxLength={30}
              value={s.bankerVenmoHandle}
              onChange={e => set('bankerVenmoHandle', e.target.value)}
            />
          </Field>
        </Row>
      </Card>

      <BtnPrimary onClick={handleNext}>Add Players →</BtnPrimary>
    </Screen>
  )
}
