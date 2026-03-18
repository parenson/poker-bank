import React, { useState, useEffect, useMemo } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Screen, Hero, Card, Avatar, Divider } from '../components/UI.jsx'
import { fmt, fmtSigned } from '../utils/settlement.js'
import { loadGames } from '../lib/db.js'

export default function LeaderboardScreen({ onBack }) {
  const { state, dispatch } = useGame()
  const [games, setGames] = useState(state.savedGames)
  const [loading, setLoading] = useState(false)
  const [includeHome, setIncludeHome] = useState(true)
  const [includeAmalfi, setIncludeAmalfi] = useState(true)

  useEffect(() => {
    if (state.savedGames.length === 0) {
      setLoading(true)
      loadGames().then(g => {
        dispatch({ type: 'SET_SAVED_GAMES', games: g })
        setGames(g)
        setLoading(false)
      })
    } else {
      setGames(state.savedGames)
    }
  }, [state.savedGames])

  const entries = useMemo(() => {
    const filtered = games.filter(g => {
      if (g.gameType === 'amalfi') return includeAmalfi
      return includeHome
    })

    const totals = {}
    const meta = {}

    for (const g of filtered) {
      for (const r of g.results) {
        const key = `${r.name.toLowerCase()}|${r.initials.toLowerCase()}`
        if (!totals[key]) {
          totals[key] = 0
          meta[key] = { name: r.name, initials: r.initials, venmoHandle: r.venmoHandle, games: 0 }
        }
        totals[key] += r.netBeforeTip
        meta[key].games += 1
      }
    }

    return Object.entries(totals)
      .map(([key, total]) => ({ ...meta[key], total }))
      .sort((a, b) => b.total - a.total)
  }, [games, includeHome, includeAmalfi])

  return (
    <Screen>
      <div style={{ padding: '14px 0 0' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--cream-dim)', fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'DM Sans, sans-serif', padding: 0, marginBottom: 8,
          }}
        >
          ← Back to History
        </button>
      </div>

      <Hero title="Leaderboard" subtitle="All-time standings across saved games" />

      {/* Filter chips */}
      <Card>
        <div style={{ display: 'flex', gap: 8 }}>
          <FilterChip label="🏠 Home" active={includeHome} onToggle={() => setIncludeHome(v => !v)} />
          <FilterChip label="🌊 Amalfi" active={includeAmalfi} onToggle={() => setIncludeAmalfi(v => !v)} />
        </div>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--cream-dim)' }}>Loading…</div>
      )}

      {!loading && entries.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cream-dim)', fontSize: 14 }}>
            No games recorded for the selected types.
          </div>
        </Card>
      )}

      {!loading && entries.length > 0 && (
        <Card title="Rankings">
          {entries.map((e, i) => {
            const isWin  = e.total > 0.01
            const isLoss = e.total < -0.01
            const color       = isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--gold)'
            const bgColor     = isWin ? 'rgba(76,175,125,0.07)'  : isLoss ? 'rgba(224,82,82,0.07)'  : 'rgba(201,168,76,0.05)'
            const borderColor = isWin ? 'rgba(76,175,125,0.25)'  : isLoss ? 'rgba(224,82,82,0.2)'   : 'rgba(201,168,76,0.18)'

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 13px', marginBottom: 8,
                background: bgColor, borderRadius: 'var(--radius-sm)',
                border: `1px solid ${borderColor}`,
              }}>
                {/* Rank badge */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: i === 0 ? 'rgba(201,168,76,0.3)' : i === 1 ? 'rgba(255,255,255,0.1)' : i === 2 ? 'rgba(180,100,40,0.2)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
                  color: i === 0 ? 'var(--gold-light)' : 'var(--cream-dim)',
                }}>
                  {i + 1}
                </div>
                <Avatar name={e.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>
                    {e.games} game{e.games !== 1 ? 's' : ''}
                    {e.venmoHandle ? ` · @${e.venmoHandle}` : ''}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700, color, flexShrink: 0,
                }}>
                  {fmtSigned(e.total)}
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </Screen>
  )
}

function FilterChip({ label, active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        flex: 1, padding: '9px 10px',
        background: active ? 'rgba(201,168,76,0.18)' : 'var(--input-bg)',
        border: active ? '1px solid var(--gold)' : '1px solid rgba(201,168,76,0.2)',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--gold-light)' : 'var(--cream-dim)',
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}
