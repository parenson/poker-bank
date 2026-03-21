import React, { useEffect } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { useTournament } from '../context/TournamentContext.jsx'
import { Screen, Hero, Card, Field, Row, PrefixInput, Divider } from '../components/UI.jsx'
import { generateBlindStructure } from '../utils/blindStructure.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}

function defaultGameName(gameType, dateStr) {
  const d = fmtDate(dateStr)
  if (gameType === 'amalfi')     return `Amalfi - ${d}`
  if (gameType === 'tournament') return `Tournament - ${d}`
  return `Home Game - ${d}`
}

const GAME_TYPES = [
  { value: 'home',       label: '🏠 Home Game' },
  { value: 'amalfi',     label: '🌊 Amalfi' },
  { value: 'tournament', label: '🏆 Tournament' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SetupScreen() {
  const { state: gameState, dispatch: gameDispatch } = useGame()
  const { state: tState, dispatch: tDispatch }       = useTournament()
  const s = gameState.setup
  const isTournament = s.gameType === 'tournament'
  const isAmalfi     = s.gameType === 'amalfi'

  const setGame = (key, value) => gameDispatch({ type: 'SET_SETUP', payload: { [key]: value } })
  const setT    = (payload)    => tDispatch({ type: 'SET', payload })

  // ── Auto name & defaults on mount
  useEffect(() => {
    const updates = {}
    if (!s.name) updates.name = defaultGameName(s.gameType, s.date)
    if (!s.buyInAmount && s.gameType === 'home')             updates.buyInAmount = '100'
    if (!s.dealerUpfrontPerPlayer && s.gameType === 'home')  updates.dealerUpfrontPerPlayer = '25'
    if (Object.keys(updates).length > 0) gameDispatch({ type: 'SET_SETUP', payload: updates })

    if (!tState.name) tDispatch({ type: 'SET', payload: { name: defaultGameName('tournament', s.date), date: s.date } })
  }, [])

  // ── Game type switch
  const handleGameTypeChange = (newType) => {
    const prev = s.gameType
    const currentDefault = defaultGameName(prev, s.date)
    const updates = { gameType: newType }

    // Auto-rename if still using auto-generated name
    if (!s.name || s.name === currentDefault) {
      updates.name = defaultGameName(newType, s.date)
    }

    if (newType === 'home') {
      if (!s.buyInAmount) updates.buyInAmount = '100'
      if (!s.dealerUpfrontPerPlayer) updates.dealerUpfrontPerPlayer = '25'
    }
    if (newType === 'amalfi') {
      updates.dealerName = ''
      updates.dealerVenmoHandle = ''
      updates.dealerUpfrontPerPlayer = '0'
      updates.dealerTipPercent = '0'
    }
    if (newType === 'tournament') {
      // Sync tournament name/date with current date
      const tDefault = defaultGameName('tournament', s.date)
      if (!tState.name || tState.name.startsWith('Tournament -')) {
        tDispatch({ type: 'SET', payload: { name: tDefault, date: s.date } })
      }
    }
    gameDispatch({ type: 'SET_SETUP', payload: updates })
  }

  // ── Date change — update both game and tournament names
  const handleDateChange = (newDate) => {
    const updates = { date: newDate }
    const currentDefault = defaultGameName(s.gameType, s.date)
    if (!s.name || s.name === currentDefault) {
      updates.name = defaultGameName(s.gameType, newDate)
    }
    gameDispatch({ type: 'SET_SETUP', payload: updates })

    const tDefault = defaultGameName('tournament', tState.date)
    if (!tState.name || tState.name === tDefault) {
      tDispatch({ type: 'SET', payload: { name: defaultGameName('tournament', newDate), date: newDate } })
    } else {
      tDispatch({ type: 'SET', payload: { date: newDate } })
    }
  }

  // ── Tournament payout helpers
  const totalPct = tState.payoutPlaces.reduce((s, p) => s + parseFloat(p.pct || 0), 0)
  const pctOk    = Math.abs(totalPct - 100) < 0.01

  const addPayoutPlace = () => tDispatch({
    type: 'SET_PAYOUT_PLACES',
    places: [...tState.payoutPlaces, { place: tState.payoutPlaces.length + 1, pct: 0 }]
  })
  const removePayoutPlace = (i) => tDispatch({
    type: 'SET_PAYOUT_PLACES',
    places: tState.payoutPlaces.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, place: idx + 1 }))
  })
  const updatePayoutPct = (i, val) => tDispatch({
    type: 'SET_PAYOUT_PLACES',
    places: tState.payoutPlaces.map((p, idx) => idx === i ? { ...p, pct: val } : p)
  })

  // ── Next handlers
  const handleCashNext = () => {
    if (!s.buyInAmount || parseFloat(s.buyInAmount) <= 0) { alert('Please enter a valid buy-in amount.'); return }
    if (!isAmalfi && !s.dealerName.trim()) { alert('Please enter a dealer name.'); return }
    if (!s.bankerName.trim()) { alert('Please enter a banker name.'); return }
    gameDispatch({ type: 'SET_SCREEN', screen: 'players' })
  }

  const handleTournamentNext = () => {
    const totalMin = (parseFloat(tState.durationHours) || 0) * 60 + (parseFloat(tState.durationMinutes) || 0)
    if (totalMin < 30) { alert('Please set a duration of at least 30 minutes.'); return }
    if (!parseFloat(tState.startingChips)) { alert('Please enter starting chip count.'); return }
    if (!parseFloat(tState.buyInAmount)) { alert('Please enter a buy-in amount.'); return }
    if (!pctOk) { alert('Payout percentages must total 100%.'); return }

    const { levels, roundMinutes } = generateBlindStructure({
      totalMinutes: totalMin,
      startingChips: parseFloat(tState.startingChips),
      roundMinutes: tState.roundMinutes ? parseFloat(tState.roundMinutes) : undefined,
    })
    tDispatch({ type: 'SET_BLIND_LEVELS', levels, roundMinutes })
    tDispatch({ type: 'SET', payload: { playersRemaining: 0 } })
    // Navigate via main game screen router
    gameDispatch({ type: 'SET_SCREEN', screen: 'tournament_players' })
  }

  // ── Game type selector (shared by all modes)
  const GameTypeSelector = (
    <Field label="Game Type" style={{ marginTop: 2 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {GAME_TYPES.map(gt => (
          <button
            key={gt.value}
            onClick={() => handleGameTypeChange(gt.value)}
            style={{
              flex: 1, padding: '12px 4px',
              background: s.gameType === gt.value ? 'rgba(201,168,76,0.18)' : 'var(--input-bg)',
              border: s.gameType === gt.value ? '1px solid var(--gold)' : '1px solid rgba(201,168,76,0.2)',
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
  )

  // ══════════════════════════════════════════════
  // TOURNAMENT LAYOUT
  // ══════════════════════════════════════════════
  if (isTournament) {
    return (
      <Screen>
        <Hero title="Tournament Setup" subtitle="Structure, payouts, and dealer configuration" />

        {/* Game Info */}
        <Card title="Game Info">
          <Row>
            <Field label="Tournament Name" style={{ flex: 1.4 }}>
              <input type="text" maxLength={40} value={tState.name}
                onChange={e => setT({ name: e.target.value })} />
            </Field>
            <Field label="Date" style={{ flex: 1 }}>
              <input type="date" value={tState.date}
                onChange={e => handleDateChange(e.target.value)} />
            </Field>
          </Row>
          {GameTypeSelector}
          <Field label="Start Time (optional)" style={{ marginTop: 2 }}>
            <input type="time" value={tState.startTime}
              onChange={e => setT({ startTime: e.target.value })} />
          </Field>
        </Card>

        {/* Duration */}
        <Card title="Duration & Rounds">
          <Row>
            <Field label="Hours" style={{ flex: 1 }}>
              <input type="number" placeholder="4" min="0" max="24" inputMode="numeric"
                value={tState.durationHours} onChange={e => setT({ durationHours: e.target.value })} />
            </Field>
            <Field label="Minutes" style={{ flex: 1 }}>
              <input type="number" placeholder="0" min="0" max="59" inputMode="numeric"
                value={tState.durationMinutes} onChange={e => setT({ durationMinutes: e.target.value })} />
            </Field>
            <Field label="Round Len (blank=auto)" style={{ flex: 1 }}>
              <PrefixInput suffix="m" type="number" placeholder="auto" min="5" max="60" inputMode="numeric"
                value={tState.roundMinutes} onChange={e => setT({ roundMinutes: e.target.value })} />
            </Field>
          </Row>
        </Card>

        {/* Chip structure */}
        <Card title="Chip Structure">
          <Row>
            <Field label="Starting Chips" style={{ flex: 1 }}>
              <input type="number" placeholder="10000" inputMode="numeric"
                value={tState.startingChips} onChange={e => setT({ startingChips: e.target.value })} />
            </Field>
            <Field label="Rebuy Chips" style={{ flex: 1 }}>
              <input type="number" placeholder="10000" inputMode="numeric"
                value={tState.rebuyChips} onChange={e => setT({ rebuyChips: e.target.value })} />
            </Field>
          </Row>
          <Row>
            <Field label="Add-on Chips" style={{ flex: 1 }}>
              <input type="number" placeholder="15000" inputMode="numeric"
                value={tState.addonChips} onChange={e => setT({ addonChips: e.target.value })} />
            </Field>
            <Field label="Rebuys through Level" style={{ flex: 1 }}>
              <input type="number" placeholder="4" min="1" inputMode="numeric"
                value={tState.rebuyLevels} onChange={e => setT({ rebuyLevels: e.target.value })} />
            </Field>
          </Row>
        </Card>

        {/* Buy-in amounts */}
        <Card title="Buy-In & Fees">
          <Row>
            <Field label="Buy-In" style={{ flex: 1 }}>
              <PrefixInput prefix="$" type="number" placeholder="100" inputMode="decimal"
                value={tState.buyInAmount} onChange={e => setT({ buyInAmount: e.target.value })} />
            </Field>
            <Field label="Dealer Fee / Player" style={{ flex: 1 }}>
              <PrefixInput prefix="$" type="number" placeholder="20" inputMode="decimal"
                value={tState.dealerFeePerPlayer} onChange={e => setT({ dealerFeePerPlayer: e.target.value })} />
            </Field>
          </Row>
          <Row>
            <Field label="Rebuy Amount" style={{ flex: 1 }}>
              <PrefixInput prefix="$" type="number" placeholder="100" inputMode="decimal"
                value={tState.rebuyAmount} onChange={e => setT({ rebuyAmount: e.target.value })} />
            </Field>
            <Field label="Add-on Amount" style={{ flex: 1 }}>
              <PrefixInput prefix="$" type="number" placeholder="50" inputMode="decimal"
                value={tState.addonAmount} onChange={e => setT({ addonAmount: e.target.value })} />
            </Field>
          </Row>
          <Field label="Dealer Tip % from winners">
            <PrefixInput suffix="%" type="number" placeholder="10" inputMode="decimal"
              value={tState.dealerTipPercent} onChange={e => setT({ dealerTipPercent: e.target.value })} />
          </Field>
        </Card>

        {/* Payouts */}
        <Card title="Payout Structure">
          <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 12 }}>
            Percentage of the prize pool per finishing place. Must total 100%.
          </p>
          {tState.payoutPlaces.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? 'rgba(201,168,76,0.25)' : i === 1 ? 'rgba(200,200,200,0.1)' : 'rgba(180,100,40,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
                color: i === 0 ? 'var(--gold-light)' : 'var(--cream-dim)',
              }}>
                {p.place}
              </div>
              <Field style={{ flex: 1, marginBottom: 0 }}>
                <PrefixInput suffix="%" type="number" placeholder="0" min="0" max="100" inputMode="decimal"
                  value={p.pct} onChange={e => updatePayoutPct(i, e.target.value)} />
              </Field>
              {tState.payoutPlaces.length > 1 && (
                <button onClick={() => removePayoutPlace(i)} style={{
                  background: 'rgba(224,82,82,0.12)', color: 'var(--danger)',
                  border: '1px solid rgba(224,82,82,0.28)', borderRadius: 6,
                  padding: '5px 10px', fontSize: 16, cursor: 'pointer',
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
            marginTop: 10, fontSize: 13, textAlign: 'right', fontWeight: 600,
            color: pctOk ? 'var(--success)' : 'var(--danger)',
          }}>
            Total: {totalPct.toFixed(1)}% {pctOk ? '✓' : '— must equal 100%'}
          </div>
        </Card>

        <button
          onClick={handleTournamentNext}
          disabled={!pctOk}
          style={{
            width: '100%', padding: '15px 20px', marginTop: 8,
            background: pctOk ? 'linear-gradient(135deg, var(--gold) 0%, #b8903e 100%)' : 'rgba(201,168,76,0.25)',
            color: 'var(--felt)', border: 'none', borderRadius: 'var(--radius)',
            fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
            letterSpacing: '0.06em', cursor: pctOk ? 'pointer' : 'not-allowed',
            boxShadow: pctOk ? '0 4px 18px rgba(201,168,76,0.28)' : 'none',
          }}>
          Add Players →
        </button>
        <div style={{ height: 20 }} />
      </Screen>
    )
  }

  // ══════════════════════════════════════════════
  // CASH GAME LAYOUT (Home / Amalfi)
  // ══════════════════════════════════════════════
  return (
    <Screen>
      <Hero
        title="Game Setup"
        subtitle={isAmalfi ? 'Configure buy-in and banker' : 'Configure buy-in, dealer, and banker'}
      />

      <Card title="Game Info">
        <Row>
          <Field label="Game Name" style={{ flex: 1.4 }}>
            <input type="text" placeholder="Game name" maxLength={40} value={s.name}
              onChange={e => setGame('name', e.target.value)} />
          </Field>
          <Field label="Date" style={{ flex: 1 }}>
            <input type="date" value={s.date} onChange={e => handleDateChange(e.target.value)} />
          </Field>
        </Row>
        {GameTypeSelector}
      </Card>

      <Card title={isAmalfi ? 'Buy-In' : 'Buy-In & Tip'}>
        <Row>
          <Field label="Buy-In Amount" style={{ flex: 1 }}>
            <PrefixInput prefix="$" type="number" placeholder="100" inputMode="decimal"
              value={s.buyInAmount} onChange={e => setGame('buyInAmount', e.target.value)} />
          </Field>
          {!isAmalfi && (
            <Field label="Dealer Fee / Player" style={{ flex: 1 }}>
              <PrefixInput prefix="$" type="number" placeholder="25" inputMode="decimal"
                value={s.dealerUpfrontPerPlayer} onChange={e => setGame('dealerUpfrontPerPlayer', e.target.value)} />
            </Field>
          )}
        </Row>
        {!isAmalfi && (
          <Field label="Dealer Tip % (from net winners ≥ $20, rounded down)">
            <PrefixInput suffix="%" type="number" placeholder="10" inputMode="decimal"
              value={s.dealerTipPercent} onChange={e => setGame('dealerTipPercent', e.target.value)} />
          </Field>
        )}
      </Card>

      {!isAmalfi && (
        <Card title="Dealer">
          <Row>
            <Field label="Name" style={{ flex: 1 }}>
              <input type="text" placeholder="Dealer name" maxLength={30} value={s.dealerName}
                onChange={e => setGame('dealerName', e.target.value)} />
            </Field>
            <Field label="Venmo Handle" style={{ flex: 1 }}>
              <PrefixInput prefix="@" type="text" placeholder="venmo-user" maxLength={30}
                value={s.dealerVenmoHandle} onChange={e => setGame('dealerVenmoHandle', e.target.value)} />
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
            <input type="text" placeholder="Banker name" maxLength={30} value={s.bankerName}
              onChange={e => setGame('bankerName', e.target.value)} />
          </Field>
          <Field label="Venmo Handle" style={{ flex: 1 }}>
            <PrefixInput prefix="@" type="text" placeholder="venmo-user" maxLength={30}
              value={s.bankerVenmoHandle} onChange={e => setGame('bankerVenmoHandle', e.target.value)} />
          </Field>
        </Row>
      </Card>

      <button
        onClick={handleCashNext}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '15px 20px', marginTop: 8,
          background: 'linear-gradient(135deg, var(--gold) 0%, #b8903e 100%)',
          color: 'var(--felt)', border: 'none', borderRadius: 'var(--radius)',
          fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
          letterSpacing: '0.06em', cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(201,168,76,0.28)',
        }}>
        Add Players →
      </button>
    </Screen>
  )
}
