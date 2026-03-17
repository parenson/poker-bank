import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Screen, Hero, Card, Avatar, Divider, BtnGhost } from '../components/UI.jsx'
import { fmt, fmtSigned } from '../utils/settlement.js'
import { loadGames, deleteGame } from '../lib/db.js'

const GAME_TYPE_LABELS = {
  home: '🏠 Home',
  amalfi: '🌊 Amalfi',
  other: '📍 Other',
}

export default function HistoryScreen() {
  const { state, dispatch, showToast } = useGame()
  const { savedGames } = state
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (savedGames.length === 0) fetchGames()
  }, [])

  const fetchGames = async () => {
    setLoading(true)
    try {
      const games = await loadGames()
      dispatch({ type: 'SET_SAVED_GAMES', games })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this game from history?')) return
    await deleteGame(id)
    dispatch({ type: 'REMOVE_SAVED_GAME', id })
    if (selected?.id === id) setSelected(null)
    showToast('Game deleted')
  }

  if (selected) {
    return <GameDetail game={selected} onBack={() => setSelected(null)} />
  }

  return (
    <Screen>
      <Hero title="History" subtitle="All saved games" />

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--cream-dim)' }}>
          Loading…
        </div>
      )}

      {!loading && savedGames.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cream-dim)', fontSize: 14 }}>
            No saved games yet.<br />
            Complete a game and tap "Save Game" to see it here.
          </div>
        </Card>
      )}

      {savedGames.map(game => (
        <button
          key={game.id}
          onClick={() => setSelected(game)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: 12, padding: '14px 16px', marginBottom: 10,
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer', textAlign: 'left',
            transition: 'background 0.15s',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-sm)',
            background: 'rgba(201,168,76,0.12)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700, color: 'var(--gold-light)', lineHeight: 1 }}>
              {new Date(game.date).getDate()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gold-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {new Date(game.date).toLocaleString('default', { month: 'short' })}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {game.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--cream-dim)', marginTop: 2 }}>
              {GAME_TYPE_LABELS[game.gameType] || game.gameType} · {game.results.length} players · Pot {fmt(game.totalPot)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>+{fmt(game.finalDealerTake)}</div>
              <div style={{ fontSize: 11, color: 'var(--cream-dim)' }}>dealer</div>
            </div>
            <button
              onClick={e => handleDelete(game.id, e)}
              style={{
                background: 'transparent', border: 'none',
                color: 'rgba(224,82,82,0.4)', fontSize: 18,
                cursor: 'pointer', padding: '4px 6px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </button>
      ))}
    </Screen>
  )
}

// ─── Game Detail view ──────────────────────────────────────────────────────────
function GameDetail({ game, onBack }) {
  const sortedResults = [...game.results].sort((a, b) => b.finalNet - a.finalNet)

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

      <Hero
        title={game.name}
        subtitle={new Date(game.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      />

      <Card title="Game Info">
        <InfoRow label="Game type" value={GAME_TYPE_LABELS[game.gameType] || game.gameType} />
        <InfoRow label="Buy-in" value={fmt(game.buyInAmount)} />
        <InfoRow label="Dealer fee / player" value={fmt(game.dealerUpfrontPerPlayer)} />
        <InfoRow label="Dealer tip %" value={`${(game.dealerTipPercent * 100).toFixed(0)}%`} />
        <Divider />
        <InfoRow label="Total pot" value={fmt(game.totalPot)} highlight />
        <InfoRow label="Dealer upfront total" value={fmt(game.totalDealerUpfront)} />
        <InfoRow label="Total tips" value={fmt(game.totalDealerTips)} />
        <InfoRow label="Dealer total payout" value={fmt(game.finalDealerTake)} highlight />
      </Card>

      <Card title="Dealer & Banker">
        <InfoRow label="Dealer" value={`${game.dealerName}${game.dealerVenmoHandle ? ' (@' + game.dealerVenmoHandle + ')' : ''}`} />
        <InfoRow label="Banker" value={`${game.bankerName}${game.bankerVenmoHandle ? ' (@' + game.bankerVenmoHandle + ')' : ''}`} />
      </Card>

      <Card title="Final Standings">
        {sortedResults.map((r, i) => {
          const isWin = r.finalNet > 0.01
          const isLoss = r.finalNet < -0.01
          const color = isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--gold)'
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', marginBottom: 6,
              background: 'rgba(0,0,0,0.18)', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${isWin ? 'rgba(76,175,125,0.2)' : isLoss ? 'rgba(224,82,82,0.15)' : 'rgba(201,168,76,0.12)'}`,
            }}>
              <div style={{
                width: 20, fontSize: 11, fontWeight: 700,
                color: 'var(--gold-dim)', textAlign: 'center', flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <Avatar name={r.name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--cream-dim)' }}>
                  In {fmt(r.buyInTotal + r.upfrontDealer)} · Out {fmt(r.cashOut)}
                  {r.tipShare > 0 ? ` · Tip ${fmt(r.tipShare)}` : ''}
                </div>
              </div>
              <div style={{
                fontFamily: 'Cinzel, serif', fontSize: 17, fontWeight: 700, color, flexShrink: 0,
              }}>
                {fmtSigned(r.finalNet)}
              </div>
            </div>
          )
        })}
      </Card>
    </Screen>
  )
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      marginBottom: 7, fontSize: 14,
    }}>
      <span style={{ color: 'var(--cream-dim)' }}>{label}</span>
      <span style={{
        fontWeight: highlight ? 600 : 500,
        color: highlight ? 'var(--gold-light)' : 'var(--cream)',
        fontFamily: highlight ? 'Cinzel, serif' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  )
}
