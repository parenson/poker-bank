import React, { useState } from 'react'
import { useTournament } from '../context/TournamentContext.jsx'
import { useGame } from '../context/GameContext.jsx'
import { Screen, Hero, Card, Field, Row, PrefixInput, Avatar, Divider } from '../components/UI.jsx'
import { initials } from '../utils/settlement.js'

function fmt(n) { return '$' + (Math.round((n || 0) * 100) / 100).toFixed(2) }

export default function TournamentPlayersScreen() {
  const { state, dispatch } = useTournament()
  const { state: gameState, dispatch: gameDispatch } = useGame()
  const [showRoster, setShowRoster] = useState(false)
  const { savedPlayers } = gameState

  const addBlank = () => {
    dispatch({
      type: 'ADD_PLAYER',
      player: {
        id: 'tp_' + Date.now(),
        name: '', initials: '', venmoHandle: '',
        buyInCount: 1, rebuyCount: 0, addonCount: 0,
        cashOut: 0, eliminated: false, finishPlace: null,
      }
    })
  }

  const addSaved = (sp) => {
    dispatch({
      type: 'ADD_PLAYER',
      player: {
        id: 'tp_' + Date.now() + '_' + sp.id,
        name: sp.name, initials: sp.initials, venmoHandle: sp.venmoHandle,
        buyInCount: 1, rebuyCount: 0, addonCount: 0,
        cashOut: 0, eliminated: false, finishPlace: null,
        _savedId: sp.id,
      }
    })
  }

  const alreadyAdded = new Set(state.players.map(p => p._savedId).filter(Boolean))

  const buyIn = parseFloat(state.buyInAmount) || 0
  const rebuyAmt = parseFloat(state.rebuyAmount) || 0
  const addonAmt = parseFloat(state.addonAmount) || 0
  const dealerFee = parseFloat(state.dealerFeePerPlayer) || 0

  const totalPot = state.players.reduce((s, p) =>
    s + buyIn * p.buyInCount + rebuyAmt * p.rebuyCount + addonAmt * p.addonCount, 0)
  const totalDealerFees = dealerFee * state.players.length

  const handleNext = () => {
    const valid = state.players.filter(p => p.name.trim())
    if (valid.length < 2) { alert('Add at least 2 players.'); return }
    dispatch({ type: 'SET', payload: { players: valid, playersRemaining: valid.length } })
    gameDispatch({ type: 'SET_SCREEN', screen: 'tournament_clock' })
  }

  return (
    <Screen>
      <Hero title="Players" subtitle="Add players and track rebuys / add-ons" />

      {/* Saved roster */}
      {savedPlayers.length > 0 && (
        <Card title="Saved Roster">
          <button onClick={() => setShowRoster(r => !r)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'transparent', border: 'none', color: 'var(--cream)',
            cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
            padding: 0, marginBottom: showRoster ? 12 : 0,
          }}>
            <span style={{ color: 'var(--cream-dim)' }}>{savedPlayers.length} saved players</span>
            <span style={{ color: 'var(--gold)', fontSize: 12 }}>{showRoster ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showRoster && savedPlayers.map(sp => {
            const added = alreadyAdded.has(sp.id)
            return (
              <div key={sp.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(201,168,76,0.1)', marginBottom: 6,
              }}>
                <Avatar name={sp.name} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{sp.name}</div>
                  {sp.venmoHandle && <div style={{ fontSize: 11, color: 'var(--cream-dim)' }}>@{sp.venmoHandle}</div>}
                </div>
                <button onClick={() => { if (!added) addSaved(sp) }} style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: added ? 'default' : 'pointer',
                  background: added ? 'rgba(76,175,125,0.15)' : 'rgba(201,168,76,0.15)',
                  color: added ? 'var(--success)' : 'var(--gold)',
                  border: added ? '1px solid rgba(76,175,125,0.3)' : '1px solid rgba(201,168,76,0.3)',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  {added ? '✓' : '+ Add'}
                </button>
              </div>
            )
          })}
        </Card>
      )}

      {/* Player list */}
      <Card title={`Table (${state.players.filter(p => p.name).length} players)`}>
        {state.players.map((p, i) => (
          <PlayerRow key={p.id} player={p}
            onUpdate={(payload) => {
              if (payload.name !== undefined) payload.initials = initials(payload.name)
              dispatch({ type: 'UPDATE_PLAYER', id: p.id, payload })
            }}
            onRemove={() => dispatch({ type: 'REMOVE_PLAYER', id: p.id })}
            onRebuy={(delta) => dispatch({ type: 'SET_REBUY', id: p.id, delta })}
            onAddon={() => dispatch({ type: 'SET_ADDON', id: p.id })}
            rebuyLevels={parseInt(state.rebuyLevels) || 4}
            style={{ marginBottom: i < state.players.length - 1 ? 10 : 0 }}
          />
        ))}
        <button onClick={addBlank} style={{
          width: '100%', padding: '10px', background: 'transparent',
          border: '1px dashed rgba(201,168,76,0.35)', borderRadius: 'var(--radius-sm)',
          color: 'var(--gold)', fontSize: 14, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', marginTop: state.players.length > 0 ? 10 : 0,
        }}>
          + Add Player
        </button>
      </Card>

      {/* Running totals */}
      <Card title="Prize Pool">
        <StatRow label="Players" value={state.players.length} />
        <StatRow label="Total rebuys" value={state.players.reduce((s, p) => s + p.rebuyCount, 0)} />
        <StatRow label="Add-ons taken" value={state.players.reduce((s, p) => s + p.addonCount, 0)} />
        <Divider />
        <StatRow label="Prize pool" value={fmt(totalPot)} gold />
        <StatRow label="Dealer fees" value={fmt(totalDealerFees)} />
      </Card>

      <button onClick={handleNext} disabled={state.players.filter(p => p.name).length < 2}
        style={{
          width: '100%', padding: '15px 20px',
          background: 'linear-gradient(135deg, var(--gold) 0%, #b8903e 100%)',
          color: 'var(--felt)', border: 'none', borderRadius: 'var(--radius)',
          fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
          letterSpacing: '0.06em', cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(201,168,76,0.28)', marginTop: 8,
          opacity: state.players.filter(p => p.name).length < 2 ? 0.4 : 1,
        }}>
        Start Tournament →
      </button>
      <div style={{ height: 20 }} />
    </Screen>
  )
}

function PlayerRow({ player, onUpdate, onRemove, onRebuy, onAddon, rebuyLevels, style }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(201,168,76,0.12)', padding: '10px 12px', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={player.name || '?'} size={36} />
        <div style={{ flex: 1 }}>
          <Row>
            <Field style={{ flex: 1.2, marginBottom: 0 }}>
              <input type="text" placeholder="Name" maxLength={20} value={player.name}
                onChange={e => onUpdate({ name: e.target.value })}
                style={{ fontSize: 14, padding: '7px 9px' }} />
            </Field>
            <Field style={{ flex: 1, marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--gold)', fontSize: 13, pointerEvents: 'none' }}>@</span>
                <input type="text" placeholder="venmo" maxLength={30} value={player.venmoHandle}
                  onChange={e => onUpdate({ venmoHandle: e.target.value })}
                  style={{ fontSize: 14, padding: '7px 9px', paddingLeft: 20 }} />
              </div>
            </Field>
          </Row>
        </div>
        <button onClick={onRemove} style={{
          background: 'rgba(224,82,82,0.12)', color: 'var(--danger)',
          border: '1px solid rgba(224,82,82,0.28)', borderRadius: 6,
          padding: '5px 10px', fontSize: 16, cursor: 'pointer',
        }}>×</button>
      </div>

      {/* Rebuy / Add-on controls */}
      {player.name && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {/* Rebuys */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
            padding: '5px 10px', flex: 1,
          }}>
            <span style={{ fontSize: 12, color: 'var(--cream-dim)', flex: 1 }}>Rebuys</span>
            <button onClick={() => onRebuy(-1)} disabled={player.rebuyCount === 0} style={miniBtn(player.rebuyCount === 0)}>−</button>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 600, color: 'var(--gold-light)', minWidth: 20, textAlign: 'center' }}>
              {player.rebuyCount}
            </span>
            <button onClick={() => onRebuy(1)} style={miniBtn(false)}>+</button>
          </div>
          {/* Add-on toggle */}
          <button
            onClick={onAddon}
            style={{
              flex: 1, padding: '5px 10px',
              background: player.addonCount > 0 ? 'rgba(76,175,125,0.15)' : 'rgba(0,0,0,0.2)',
              border: player.addonCount > 0 ? '1px solid rgba(76,175,125,0.4)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-sm)',
              color: player.addonCount > 0 ? 'var(--success)' : 'var(--cream-dim)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}>
            {player.addonCount > 0 ? '✓ Add-on taken' : 'Add-on'}
          </button>
        </div>
      )}
    </div>
  )
}

function miniBtn(disabled) {
  return {
    width: 26, height: 26, borderRadius: '50%',
    background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(201,168,76,0.15)',
    border: '1px solid rgba(201,168,76,0.25)',
    color: disabled ? 'rgba(201,168,76,0.25)' : 'var(--gold)',
    fontSize: 18, fontWeight: 300, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
  }
}

function StatRow({ label, value, gold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 14 }}>
      <span style={{ color: 'var(--cream-dim)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: gold ? 'var(--gold-light)' : 'var(--cream)', fontFamily: gold ? 'Cinzel, serif' : 'inherit' }}>
        {value}
      </span>
    </div>
  )
}
