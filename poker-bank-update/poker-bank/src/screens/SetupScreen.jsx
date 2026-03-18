import React, { useEffect } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Screen, Hero, Card, Field, Row, PrefixInput, BtnPrimary } from '../components/UI.jsx'

const GAME_TYPES = [
  { value: 'home',   label: '🏠 Home Game' },
  { value: 'amalfi', label: '🌊 Amalfi' },
]

// Build default game name from type + date string (mm/dd/yyyy)
function defaultGameName(gameType, dateStr) {
  const [y, m, d] = dateStr.split('-')
  const formatted = `${m}/${d}/${y}`
  return gameType === 'amalfi' ? `Amalfi - ${formatted}` : `Home Game - ${formatted}`
}

export default function SetupScreen() {
  const { state, dispatch } = useGame()
  const s = state.setup
  const isAmalfi = s.gameType === 'amalfi'

  const set = (key, value) => dispatch({ type: 'SET_SETUP', payload: { [key]: value } })

  // When game type changes, update the default name and toggle defaults
  const handleGameTypeChange = (newType) => {
    const updates = { gameType: newType }
    // Auto-update name only if it's still the auto-generated default
    const currentDefault = defaultGameName(s.gameType, s.date)
    if (!s.name || s.name === currentDefault) {
      updates.name = defaultGameName(newType, s.date)
    }
    // Apply Home Game defaults when switching to home
    if (newType === 'home') {
      if (!s.buyInAmount) updates.buyInAmount = '100'
      if (!s.dealerUpfrontPerPlayer) updates.dealerUpfrontPerPlayer = '25'
    }
    // Clear dealer fields for Amalfi
    if (newType === 'amalfi') {
      updates.dealerName = ''
      updates.dealerVenmoHandle = ''
      updates.dealerUpfrontPerPlayer = '0'
      updates.dealerTipPercent = '0'
    }
    dispatch({ type: 'SET_SETUP', payload: updates })
  }

  // When date changes, also update the auto name
  const handleDateChange = (newDate) => {
    const updates = { date: newDate }
    const currentDefault = defaultGameName(s.gameType, s.date)
    if (!s.name || s.name === currentDefault) {
      updates.name = defaultGameName(s.gameType, newDate)
    }
    dispatch({ type: 'SET_SETUP', payload: updates })
  }

  // Set initial defaults on first render if empty
  useEffect(() => {
    const updates = {}
    if (!s.name) updates.name = defaultGameName(s.gameType, s.date)
    if (!s.buyInAmount && s.gameType === 'home') updates.buyInAmount = '100'
    if (!s.dealerUpfrontPerPlayer && s.gameType === 'home') updates.dealerUpfrontPerPlayer = '25'
    if (Object.keys(updates).length > 0) dispatch({ type: 'SET_SETUP', payload: updates })
  }, [])

  const handleNext = () => {
    if (!s.buyInAmount || parseFloat(s.buyInAmount) <= 0) {
      alert('Please enter a valid buy-in amount.')
      return
    }
    if (!isAmalfi && !s.dealerName.trim()) {
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
      <Hero
        title="Game Setup"
        subtitle={isAmalfi ? 'Configure buy-in and banker' : 'Configure buy-in, dealer, and banker'}
      />

      <Card title="Game Info">
        <Row>
          <Field label="Game Name" style={{ flex: 1.4 }}>
            <input
              type="text" placeholder="Game name" maxLength={40}
              value={s.name}
              onChange={e => set('name', e.target.value)}
            />
          </Field>
          <Field label="Date" style={{ flex: 1 }}>
            <input
              type="date" value={s.date}
              onChange={e => handleDateChange(e.target.value)}
            />
          </Field>
        </Row>
        <Field label="Game Type" style={{ marginTop: 2 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {GAME_TYPES.map(gt => (
              <button
                key={gt.value}
                onClick={() => handleGameTypeChange(gt.value)}
                style={{
                  flex: 1, padding: '12px 6px',
                  background: s.gameType === gt.value
                    ? 'rgba(201,168,76,0.18)'
                    : 'var(--input-bg)',
                  border: s.gameType === gt.value
                    ? '1px solid var(--gold)'
                    : '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  color: s.gameType === gt.value ? 'var(--gold-light)' : 'var(--cream-dim)',
                  fontSize: 14, fontWeight: 500,
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

      <Card title={isAmalfi ? 'Buy-In' : 'Buy-In & Tip'}>
        <Row>
          <Field label="Buy-In Amount" style={{ flex: 1 }}>
            <PrefixInput
              prefix="$" type="number" placeholder="100" inputMode="decimal"
              value={s.buyInAmount}
              onChange={e => set('buyInAmount', e.target.value)}
            />
          </Field>
          {!isAmalfi && (
            <Field label="Dealer Fee / Player" style={{ flex: 1 }}>
              <PrefixInput
                prefix="$" type="number" placeholder="25" inputMode="decimal"
                value={s.dealerUpfrontPerPlayer}
                onChange={e => set('dealerUpfrontPerPlayer', e.target.value)}
              />
            </Field>
          )}
        </Row>
        {!isAmalfi && (
          <Field label="Dealer Tip % (from net winners ≥ $20, rounded down)">
            <PrefixInput
              suffix="%" type="number" placeholder="10" inputMode="decimal"
              value={s.dealerTipPercent}
              onChange={e => set('dealerTipPercent', e.target.value)}
            />
          </Field>
        )}
      </Card>

      {!isAmalfi && (
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
      )}

      <Card title="Banker">
        <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 12 }}>
          {isAmalfi
            ? 'The banker collects from losers and pays out winners.'
            : 'The banker collects from losers and pays out winners & dealer.'}
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
