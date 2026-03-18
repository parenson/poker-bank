import React, { useState } from 'react'
import { useGame } from '../context/GameContext.jsx'
import {
  Screen, Hero, Card, Field, Row, PrefixInput,
  BtnPrimary, BtnDashed, BtnDanger, BtnGhost, Avatar, Divider
} from '../components/UI.jsx'
import { upsertPlayer } from '../lib/db.js'
import { initials } from '../utils/settlement.js'

export default function PlayersScreen() {
  const { state, dispatch, showToast, addBlankPlayer, addSavedPlayer, updatePlayer } = useGame()
  const { players, savedPlayers } = state
  const [showRoster, setShowRoster] = useState(false)

  const handleSavePlayer = async (p) => {
    if (!p.name.trim()) return
    const toSave = {
      id: p._savedId || p.id,
      name: p.name,
      initials: initials(p.name),
      venmoHandle: p.venmoHandle || '',
    }
    await upsertPlayer(toSave)
    // Refresh saved players
    const { loadPlayers } = await import('../lib/db.js')
    const updated = await loadPlayers()
    dispatch({ type: 'SET_SAVED_PLAYERS', players: updated })
    showToast(`${p.name} saved to roster`)
  }

  const alreadyAdded = new Set(players.map(p => p._savedId).filter(Boolean))

  const handleNext = () => {
    const valid = players.filter(p => p.name.trim())
    if (valid.length < 2) {
      alert('Add at least 2 players to continue.')
      return
    }
    dispatch({ type: 'SET_PLAYERS', players: valid })
    dispatch({ type: 'SET_SCREEN', screen: 'rebuys' })
  }

  return (
    <Screen>
      <Hero title="Players" subtitle="Add everyone in tonight's game" />

      {/* Saved Roster */}
      {savedPlayers.length > 0 && (
        <Card title="Saved Roster">
          <button
            onClick={() => setShowRoster(r => !r)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'transparent', border: 'none', color: 'var(--cream)', cursor: 'pointer',
              fontSize: 14, fontFamily: 'DM Sans, sans-serif', padding: 0, marginBottom: showRoster ? 12 : 0,
            }}
          >
            <span style={{ color: 'var(--cream-dim)' }}>{savedPlayers.length} saved players</span>
            <span style={{ color: 'var(--gold)', fontSize: 12 }}>{showRoster ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showRoster && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {savedPlayers.map(sp => {
                const added = alreadyAdded.has(sp.id)
                return (
                  <div key={sp.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(201,168,76,0.12)',
                  }}>
                    <Avatar name={sp.name} size={34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sp.name}</div>
                      {sp.venmoHandle && <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>@{sp.venmoHandle}</div>}
                    </div>
                    <button
                      onClick={() => {
                        if (!added) {
                          addSavedPlayer({ ...sp, _savedId: sp.id })
                        }
                      }}
                      style={{
                        padding: '6px 14px', borderRadius: 'var(--radius-xs)',
                        fontSize: 13, fontWeight: 600, cursor: added ? 'default' : 'pointer',
                        background: added ? 'rgba(76,175,125,0.15)' : 'rgba(201,168,76,0.15)',
                        color: added ? 'var(--success)' : 'var(--gold)',
                        border: added ? '1px solid rgba(76,175,125,0.3)' : '1px solid rgba(201,168,76,0.3)',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      {added ? '✓ Added' : '+ Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Current players */}
      <Card title={`Tonight's Table (${players.filter(p => p.name).length})`}>
        {players.length === 0 && (
          <p style={{ color: 'var(--cream-dim)', fontSize: 14, textAlign: 'center', padding: '8px 0' }}>
            No players added yet
          </p>
        )}
        {players.map((p, i) => (
          <PlayerRow
            key={p.id}
            player={p}
            onUpdate={(payload) => updatePlayer(p.id, payload)}
            onRemove={() => dispatch({ type: 'REMOVE_PLAYER', id: p.id })}
            onSave={() => handleSavePlayer(p)}
            style={{ marginBottom: i < players.length - 1 ? 10 : 0 }}
          />
        ))}
        <BtnDashed onClick={addBlankPlayer} style={{ marginTop: players.length > 0 ? 10 : 0 }}>
          + Add Player
        </BtnDashed>
      </Card>

      <BtnPrimary onClick={handleNext} disabled={players.filter(p => p.name.trim()).length < 2}>
        Start Game →
      </BtnPrimary>
    </Screen>
  )
}

function PlayerRow({ player, onUpdate, onRemove, onSave, style }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(201,168,76,0.12)',
      padding: '10px 12px', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={player.name || '?'} size={38} />
        <div style={{ flex: 1 }}>
          <Row>
            <Field style={{ flex: 1.2, marginBottom: 0 }}>
              <input
                type="text" placeholder="Player name" maxLength={20}
                value={player.name}
                onChange={e => onUpdate({ name: e.target.value })}
                style={{ fontSize: 14, padding: '8px 10px' }}
              />
            </Field>
            <Field style={{ flex: 1, marginBottom: 0 }}>
              <PrefixInput
                prefix="@" type="text" placeholder="venmo" maxLength={30}
                value={player.venmoHandle}
                onChange={e => onUpdate({ venmoHandle: e.target.value })}
                inputStyle={{ fontSize: 14, padding: '8px 10px', paddingLeft: 22 }}
              />
            </Field>
          </Row>
        </div>
        <BtnDanger onClick={onRemove}>×</BtnDanger>
      </div>
      {player.name && (
        <button
          onClick={onSave}
          style={{
            marginTop: 7, fontSize: 11, color: 'var(--gold-dim)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', padding: 0,
            textDecoration: 'underline',
          }}
        >
          Save to roster
        </button>
      )}
    </div>
  )
}
