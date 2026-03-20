import React, { useEffect } from 'react'
import { useTournament } from '../context/TournamentContext.jsx'
import { Screen, Hero, Card, Field, Row, PrefixInput, Divider } from '../components/UI.jsx'
import { generateBlindStructure } from '../utils/blindStructure.js'

function defaultName(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `Tournament - ${m}/${d}/${y}`
}

export default function TournamentSetupScreen({ onBack }) {
  const { state, dispatch } = useTournament()
  const set = (payload) => dispatch({ type: 'SET', payload })

  // Auto-set name when date changes
  useEffect(() => {
    if (!state.name || state.name.startsWith('Tournament -')) {
      set({ name: defaultName(state.date) })
    }
  }, [state.date])

  useEffect(() => {
    if (!state.name) set({ name: defaultName(state.date) })
  }, [])

  const handleNext = () => {
    const totalMin = (parseFloat(state.durationHours) || 0) * 60 + (parseFloat(state.durationMinutes) || 0)
    if (totalMin < 30) { alert('Please set a tournament duration of at least 30 minutes.'); return }
    if (!parseFloat(state.startingChips)) { alert('Please enter starting chip count.'); return }
    if (!parseFloat(state.buyInAmount)) { alert('Please enter a buy-in amount.'); return }

    const { levels, roundMinutes } = generateBlindStructure({
      totalMinutes: totalMin,
      startingChips: parseFloat(state.startingChips),
      roundMinutes: state.roundMinutes ? parseFloat(state.roundMinutes) : undefined,
    })
    dispatch({ type: 'SET_BLIND_LEVELS', levels, roundMinutes })
    dispatch({ type: 'SET', payload: { playersRemaining: 0 } })
    dispatch({ type: 'SET_SCREEN', screen: 'players' })
  }

  const totalPct = state.payoutPlaces.reduce((s, p) => s + parseFloat(p.pct || 0), 0)
  const pctOk = Math.abs(totalPct - 100) < 0.01

  const addPayoutPlace = () => {
    dispatch({
      type: 'SET_PAYOUT_PLACES',
      places: [...state.payoutPlaces, { place: state.payoutPlaces.length + 1, pct: 0 }]
    })
  }
  const removePayoutPlace = (i) => {
    const updated = state.payoutPlaces.filter((_, idx) => idx !== i)
      .map((p, idx) => ({ ...p, place: idx + 1 }))
    dispatch({ type: 'SET_PAYOUT_PLACES', places: updated })
  }
  const updatePayoutPct = (i, val) => {
    const updated = state.payoutPlaces.map((p, idx) => idx === i ? { ...p, pct: val } : p)
    dispatch({ type: 'SET_PAYOUT_PLACES', places: updated })
  }

  return (
    <Screen>
      {onBack && (
        <div style={{ padding: '14px 0 0' }}>
          <button onClick={onBack} style={{
            background: 'transparent', border: 'none', color: 'var(--cream-dim)',
            fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: 6, fontFamily: 'DM Sans, sans-serif', padding: 0, marginBottom: 8,
          }}>← Back</button>
        </div>
      )}
      <Hero title="Tournament Setup" subtitle="Configure structure, payouts, and dealer" />

      {/* Game info */}
      <Card title="Game Info">
        <Row>
          <Field label="Tournament Name" style={{ flex: 1.4 }}>
            <input type="text" maxLength={40} value={state.name}
              onChange={e => set({ name: e.target.value })} />
          </Field>
          <Field label="Date" style={{ flex: 1 }}>
            <input type="date" value={state.date}
              onChange={e => set({ date: e.target.value })} />
          </Field>
        </Row>
        <Field label="Start Time (optional)">
          <input type="time" value={state.startTime}
            onChange={e => set({ startTime: e.target.value })} />
        </Field>
      </Card>

      {/* Duration */}
      <Card title="Duration & Round Length">
        <Row>
          <Field label="Hours" style={{ flex: 1 }}>
            <input type="number" placeholder="4" min="0" max="24" inputMode="numeric"
              value={state.durationHours} onChange={e => set({ durationHours: e.target.value })} />
          </Field>
          <Field label="Minutes" style={{ flex: 1 }}>
            <input type="number" placeholder="0" min="0" max="59" inputMode="numeric"
              value={state.durationMinutes} onChange={e => set({ durationMinutes: e.target.value })} />
          </Field>
        </Row>
        <Field label="Round Length (min) — leave blank to auto-calculate">
          <PrefixInput suffix="min" type="number" placeholder="auto" min="5" max="60" inputMode="numeric"
            value={state.roundMinutes} onChange={e => set({ roundMinutes: e.target.value })} />
        </Field>
      </Card>

      {/* Chip structure */}
      <Card title="Chip Structure">
        <Row>
          <Field label="Starting Chips" style={{ flex: 1 }}>
            <input type="number" placeholder="10000" inputMode="numeric"
              value={state.startingChips} onChange={e => set({ startingChips: e.target.value })} />
          </Field>
          <Field label="Rebuy Chips" style={{ flex: 1 }}>
            <input type="number" placeholder="10000" inputMode="numeric"
              value={state.rebuyChips} onChange={e => set({ rebuyChips: e.target.value })} />
          </Field>
        </Row>
        <Row>
          <Field label="Add-on Chips" style={{ flex: 1 }}>
            <input type="number" placeholder="15000" inputMode="numeric"
              value={state.addonChips} onChange={e => set({ addonChips: e.target.value })} />
          </Field>
          <Field label="Rebuys through Level" style={{ flex: 1 }}>
            <input type="number" placeholder="4" min="1" max="20" inputMode="numeric"
              value={state.rebuyLevels} onChange={e => set({ rebuyLevels: e.target.value })} />
          </Field>
        </Row>
      </Card>

      {/* Buy-in amounts */}
      <Card title="Buy-in & Fees">
        <Row>
          <Field label="Buy-in" style={{ flex: 1 }}>
            <PrefixInput prefix="$" type="number" placeholder="100" inputMode="decimal"
              value={state.buyInAmount} onChange={e => set({ buyInAmount: e.target.value })} />
          </Field>
          <Field label="Dealer Fee / Player" style={{ flex: 1 }}>
            <PrefixInput prefix="$" type="number" placeholder="20" inputMode="decimal"
              value={state.dealerFeePerPlayer} onChange={e => set({ dealerFeePerPlayer: e.target.value })} />
          </Field>
        </Row>
        <Row>
          <Field label="Rebuy Amount" style={{ flex: 1 }}>
            <PrefixInput prefix="$" type="number" placeholder="100" inputMode="decimal"
              value={state.rebuyAmount} onChange={e => set({ rebuyAmount: e.target.value })} />
          </Field>
          <Field label="Add-on Amount" style={{ flex: 1 }}>
            <PrefixInput prefix="$" type="number" placeholder="50" inputMode="decimal"
              value={state.addonAmount} onChange={e => set({ addonAmount: e.target.value })} />
          </Field>
        </Row>
        <Field label="Dealer Tip % from winners">
          <PrefixInput suffix="%" type="number" placeholder="10" inputMode="decimal"
            value={state.dealerTipPercent} onChange={e => set({ dealerTipPercent: e.target.value })} />
        </Field>
      </Card>

      {/* Payouts */}
      <Card title="Payout Structure">
        <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 12 }}>
          Define percentage of the prize pool for each place. Must total 100%.
        </p>
        {state.payoutPlaces.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: i === 0 ? 'rgba(201,168,76,0.25)' : i === 1 ? 'rgba(200,200,200,0.1)' : 'rgba(180,100,40,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
              color: i === 0 ? 'var(--gold-light)' : 'var(--cream-dim)',
              flexShrink: 0,
            }}>
              {p.place}
            </div>
            <Field style={{ flex: 1, marginBottom: 0 }}>
              <PrefixInput suffix="%" type="number" placeholder="0" min="0" max="100" inputMode="decimal"
                value={p.pct}
                onChange={e => updatePayoutPct(i, e.target.value)} />
            </Field>
            {state.payoutPlaces.length > 1 && (
              <button onClick={() => removePayoutPlace(i)} style={{
                background: 'rgba(224,82,82,0.12)', color: 'var(--danger)',
                border: '1px solid rgba(224,82,82,0.28)', borderRadius: 6,
                padding: '6px 11px', fontSize: 16, cursor: 'pointer',
              }}>×</button>
            )}
          </div>
        ))}
        <button onClick={addPayoutPlace} style={{
          width: '100%', padding: '10px', background: 'transparent',
          border: '1px dashed rgba(201,168,76,0.35)', borderRadius: 'var(--radius-sm)',
          color: 'var(--gold)', fontSize: 13, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', marginTop: 4,
        }}>
          + Add Place
        </button>
        <div style={{
          marginTop: 10, fontSize: 13, textAlign: 'right',
          color: pctOk ? 'var(--success)' : 'var(--danger)',
          fontWeight: 600,
        }}>
          Total: {totalPct.toFixed(1)}% {pctOk ? '✓' : '— must equal 100%'}
        </div>
      </Card>

      <button
        onClick={handleNext}
        disabled={!pctOk}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '15px 20px',
          background: pctOk
            ? 'linear-gradient(135deg, var(--gold) 0%, #b8903e 100%)'
            : 'rgba(201,168,76,0.25)',
          color: 'var(--felt)', border: 'none', borderRadius: 'var(--radius)',
          fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
          letterSpacing: '0.06em', cursor: pctOk ? 'pointer' : 'not-allowed',
          boxShadow: pctOk ? '0 4px 18px rgba(201,168,76,0.28)' : 'none',
          marginTop: 8,
        }}>
        Add Players →
      </button>
      <div style={{ height: 20 }} />
    </Screen>
  )
}
