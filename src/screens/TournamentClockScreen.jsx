import React, { useEffect, useRef, useState } from 'react'
import { useTournament } from '../context/TournamentContext.jsx'
import { useGame } from '../context/GameContext.jsx'
import { Card, Avatar, Divider } from '../components/UI.jsx'
import { getCurrentLevelIndex } from '../utils/blindStructure.js'

function pad(n) { return String(n).padStart(2, '0') }
function fmtChips(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}
function fmtBlind(n) { return fmtChips(n) }
function fmtMoney(n) { return '$' + Math.round(n).toLocaleString() }

export default function TournamentClockScreen() {
  const { state, dispatch } = useTournament()
  const { dispatch: gameDispatch } = useGame()
  const tickRef = useRef(null)
  const [now, setNow] = useState(Date.now())
  const [showBlindSheet, setShowBlindSheet] = useState(false)
  const [elimPlayerIdx, setElimPlayerIdx] = useState(null)

  // Tick every second
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  // Compute elapsed seconds
  const elapsedSeconds = state.clockRunning
    ? state.elapsedSeconds + Math.floor((now - state.clockStartedAt) / 1000)
    : state.elapsedSeconds

  const elapsedMinutes = elapsedSeconds / 60
  const levels = state.blindLevels
  const totalMinutes = levels.reduce((s, l) => s + l.durationMinutes, 0)

  const levelIdx = getCurrentLevelIndex(levels, elapsedMinutes)
  const currentLevel = levels[levelIdx] || levels[levels.length - 1]
  const nextLevel = levels[levelIdx + 1] || null

  // Seconds remaining in current level
  const levelStartSec = currentLevel ? currentLevel.startMinute * 60 : 0
  const levelDurSec = currentLevel ? currentLevel.durationMinutes * 60 : 0
  const secsIntoLevel = elapsedSeconds - levelStartSec
  const secsLeft = Math.max(0, levelDurSec - secsIntoLevel)
  const minsLeft = Math.floor(secsLeft / 60)
  const secsLeftMod = secsLeft % 60

  // Is tourney over?
  const tourneyOver = elapsedMinutes >= totalMinutes

  const activePlayers = state.players.filter(p => !p.eliminated)
  const playersRemaining = activePlayers.length || state.playersRemaining

  const handleStartStop = () => {
    if (state.clockRunning) {
      dispatch({ type: 'PAUSE_CLOCK' })
    } else {
      dispatch({ type: 'START_CLOCK', now: Date.now() })
    }
  }

  const handleEliminate = (player) => {
    const place = playersRemaining
    dispatch({ type: 'ELIMINATE_PLAYER', id: player.id, place })
    setElimPlayerIdx(null)
    if (playersRemaining - 1 <= 1) {
      dispatch({ type: 'PAUSE_CLOCK' })
    }
  }

  const progressPct = Math.min(100, (elapsedMinutes / totalMinutes) * 100)
  const levelProgressPct = Math.min(100, (secsIntoLevel / levelDurSec) * 100)

  // Color for time remaining
  const timeColor = secsLeft < 60 ? 'var(--danger)' : secsLeft < 180 ? 'var(--warning)' : 'var(--cream)'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 96px' }}>

      {/* Main clock card */}
      <div style={{
        background: 'rgba(0,0,0,0.35)', border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius)', padding: '20px 16px', marginTop: 16, marginBottom: 14,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'var(--gold-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          Level {currentLevel?.level} of {levels.length}
        </div>

        {/* Big timer */}
        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 64, fontWeight: 700,
          color: timeColor,
          lineHeight: 1, marginBottom: 8,
          letterSpacing: '0.04em',
          textShadow: secsLeft < 60 ? '0 0 20px rgba(224,82,82,0.4)' : 'none',
          transition: 'color 0.5s',
        }}>
          {pad(minsLeft)}:{pad(secsLeftMod)}
        </div>

        {/* Level progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 4, margin: '0 auto 16px', maxWidth: 300 }}>
          <div style={{ width: `${levelProgressPct}%`, height: '100%', background: 'var(--gold)', borderRadius: 4, transition: 'width 1s linear' }} />
        </div>

        {/* Current blinds */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 4 }}>Current Blinds</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 26, fontWeight: 700, color: 'var(--gold-light)' }}>
            {fmtBlind(currentLevel?.smallBlind)} / {fmtBlind(currentLevel?.bigBlind)}
            {currentLevel?.ante > 0 && (
              <span style={{ fontSize: 16, color: 'var(--gold-dim)', marginLeft: 8 }}>
                Ante: {fmtBlind(currentLevel.ante)}
              </span>
            )}
          </div>
        </div>

        {/* Next blinds */}
        {nextLevel && (
          <div style={{
            background: 'rgba(201,168,76,0.08)', borderRadius: 'var(--radius-sm)',
            padding: '8px 16px', marginBottom: 12, display: 'inline-block',
          }}>
            <div style={{ fontSize: 11, color: 'var(--gold-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Next Level {nextLevel.level}
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: 'var(--cream-dim)', marginTop: 2 }}>
              {fmtBlind(nextLevel.smallBlind)} / {fmtBlind(nextLevel.bigBlind)}
              {nextLevel.ante > 0 && <span style={{ fontSize: 13, marginLeft: 6 }}>+ Ante {fmtBlind(nextLevel.ante)}</span>}
            </div>
          </div>
        )}

        {/* Players remaining */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>Players Remaining</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 32, fontWeight: 700, color: 'var(--cream)' }}>
            {playersRemaining}
          </div>
        </div>

        {/* Overall progress */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--cream-dim)', marginBottom: 4 }}>
            Tournament progress · {Math.floor(elapsedMinutes)}m elapsed of {totalMinutes}m
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, maxWidth: 300, margin: '0 auto' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: 'rgba(201,168,76,0.5)', borderRadius: 4, transition: 'width 1s' }} />
          </div>
        </div>

        {/* Control buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleStartStop} style={{
            padding: '12px 28px',
            background: state.clockRunning ? 'rgba(224,82,82,0.15)' : 'linear-gradient(135deg, var(--gold) 0%, #b8903e 100%)',
            color: state.clockRunning ? 'var(--danger)' : 'var(--felt)',
            border: state.clockRunning ? '1px solid rgba(224,82,82,0.4)' : 'none',
            borderRadius: 'var(--radius-sm)', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em',
          }}>
            {state.clockRunning ? '⏸ Pause' : '▶ Start'}
          </button>
          <button onClick={() => setShowBlindSheet(s => !s)} style={{
            padding: '12px 20px',
            background: 'rgba(201,168,76,0.1)',
            color: 'var(--gold-light)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
            📋 Blind Sheet
          </button>
        </div>
      </div>

      {/* Blind structure sheet */}
      {showBlindSheet && (
        <Card title="Blind Structure">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Lvl', 'Small', 'Big', 'Ante', 'Time'].map(h => (
                    <th key={h} style={{
                      padding: '6px 8px', textAlign: 'center', fontSize: 11,
                      color: 'var(--cream-dim)', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '1px solid rgba(201,168,76,0.15)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {levels.map((l, i) => {
                  const isActive = i === levelIdx
                  const isPast = i < levelIdx
                  return (
                    <tr key={i} style={{
                      background: isActive ? 'rgba(201,168,76,0.12)' : 'transparent',
                      opacity: isPast ? 0.45 : 1,
                    }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'Cinzel, serif', fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--gold-light)' : 'var(--cream)' }}>{l.level}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--cream)' }}>{fmtBlind(l.smallBlind)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--cream)', fontWeight: isActive ? 600 : 400 }}>{fmtBlind(l.bigBlind)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: l.ante > 0 ? 'var(--gold)' : 'var(--cream-dim)' }}>{l.ante > 0 ? fmtBlind(l.ante) : '—'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--cream-dim)' }}>{l.durationMinutes}m</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Player elimination tracker */}
      {state.players.filter(p => p.name).length > 0 && (
        <Card title="Eliminate Player">
          <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 10 }}>
            Tap a player when they bust out to record their finish position.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {state.players.filter(p => p.name).map(p => (
              <button
                key={p.id}
                onClick={() => !p.eliminated && setElimPlayerIdx(p.id === elimPlayerIdx ? null : p.id)}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                  background: p.eliminated ? 'rgba(224,82,82,0.08)' : elimPlayerIdx === p.id ? 'rgba(224,82,82,0.2)' : 'rgba(0,0,0,0.2)',
                  border: p.eliminated ? '1px solid rgba(224,82,82,0.2)' : elimPlayerIdx === p.id ? '1px solid rgba(224,82,82,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: p.eliminated ? 'rgba(224,82,82,0.5)' : 'var(--cream)',
                  fontSize: 13, fontWeight: 600, cursor: p.eliminated ? 'default' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  textDecoration: p.eliminated ? 'line-through' : 'none',
                }}
              >
                {p.name}
                {p.eliminated && p.finishPlace && <span style={{ marginLeft: 6, fontSize: 11 }}>({ordinal(p.finishPlace)})</span>}
              </button>
            ))}
          </div>
          {elimPlayerIdx && (
            <div style={{
              marginTop: 12, padding: '12px 14px',
              background: 'rgba(224,82,82,0.1)', borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(224,82,82,0.3)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--cream)', marginBottom: 8 }}>
                Eliminate <strong>{state.players.find(p => p.id === elimPlayerIdx)?.name}</strong> in {ordinal(playersRemaining)} place?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleEliminate(state.players.find(p => p.id === elimPlayerIdx))} style={{
                  flex: 1, padding: '10px', background: 'var(--danger)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600,
                  fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}>
                  ✓ Confirm Bust Out
                </button>
                <button onClick={() => setElimPlayerIdx(null)} style={{
                  padding: '10px 16px', background: 'transparent', color: 'var(--cream-dim)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-sm)',
                  fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Finish button */}
      <button
        onClick={() => gameDispatch({ type: 'SET_SCREEN', screen: 'tournament_results' })}
        style={{
          width: '100%', padding: '15px',
          background: 'linear-gradient(135deg, var(--gold) 0%, #b8903e 100%)',
          color: 'var(--felt)', border: 'none', borderRadius: 'var(--radius)',
          fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
          letterSpacing: '0.06em', cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(201,168,76,0.28)', marginTop: 8,
        }}>
        End Tournament & Calculate Payouts →
      </button>
      <div style={{ height: 20 }} />
    </div>
  )
}

function ordinal(n) {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
