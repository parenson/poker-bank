import React from 'react'
import { useGame } from '../context/GameContext.jsx'

const TABS = [
  { id: 'setup',   label: 'Setup',    icon: '⚙' },
  { id: 'players', label: 'Players',  icon: '♠' },
  { id: 'rebuys',  label: 'Rebuys',   icon: '↺' },
  { id: 'cashout', label: 'Cash Out', icon: '♦' },
  { id: 'results', label: 'Results',  icon: '★' },
  { id: 'history', label: 'History',  icon: '⏱' },
]

// Tournament sub-screens map to their labels for the header badge
const TOURNAMENT_LABELS = {
  tournament_players: 'Players',
  tournament_clock:   'Clock',
  tournament_results: 'Results',
}

export default function Header({ onSignOut }) {
  const { state, dispatch } = useGame()
  const current = state.screen

  return (
    <>
      {/* Top bar */}
      <div style={{
        background: 'rgba(8,24,14,0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(201,168,76,0.18)',
        padding: '12px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 20, fontWeight: 700,
          color: 'var(--gold-light)',
          letterSpacing: '0.04em',
        }}>
          ♠ Poker Bank
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12, fontWeight: 500,
            color: 'var(--gold-dim)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {TOURNAMENT_LABELS[current] || TABS.find(t => t.id === current)?.label}
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              title="Sign out"
              style={{
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 6, padding: '4px 10px',
                color: 'var(--cream-dim)', fontSize: 12,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(8,24,14,0.92)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(201,168,76,0.15)',
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}>
        {TABS.map(tab => {
          const active = tab.id === current
          return (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_SCREEN', screen: tab.id })}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '10px 4px 8px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                borderTop: active ? '2px solid var(--gold)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                fontSize: 18, lineHeight: 1,
                color: active ? 'var(--gold-light)' : 'var(--cream-dim)',
                marginBottom: 3,
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: active ? 'var(--gold-light)' : 'var(--cream-dim)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
