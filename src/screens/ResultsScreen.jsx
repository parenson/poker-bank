import React, { useState } from 'react'
import { useGame } from '../context/GameContext.jsx'
import {
  Screen, Hero, Card, Avatar, Divider, BtnPrimary, BtnSecondary, VenmoBtn
} from '../components/UI.jsx'
import { fmt, fmtSigned } from '../utils/settlement.js'
import { saveGame } from '../lib/db.js'

export default function ResultsScreen() {
  const { state, dispatch, showToast } = useGame()
  const { settlement, setup, players } = state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!settlement) {
    return (
      <Screen>
        <Hero title="Results" subtitle="No results yet — complete cash out first" />
      </Screen>
    )
  }

  const { playerSettlements, totalPot, totalDealerUpfront, totalTipFromWinners, finalDealerTake, payments } = settlement
  const sorted = [...playerSettlements].sort((a, b) => b.finalNet - a.finalNet)
  const tipPct = parseFloat(setup.dealerTipPercent) || 0

  const handleSave = async () => {
    if (saved || saving) return
    setSaving(true)
    try {
      const game = {
        name: setup.name || `Game ${new Date(setup.date).toLocaleDateString()}`,
        date: setup.date,
        gameType: setup.gameType,
        buyInAmount: parseFloat(setup.buyInAmount) || 0,
        dealerUpfrontPerPlayer: parseFloat(setup.dealerUpfrontPerPlayer) || 0,
        dealerTipPercent: (parseFloat(setup.dealerTipPercent) || 0) / 100,
        dealerName: setup.dealerName,
        dealerVenmoHandle: setup.dealerVenmoHandle,
        bankerName: setup.bankerName,
        bankerVenmoHandle: setup.bankerVenmoHandle,
      }
      await saveGame(game, settlement)
      // Refresh history
      const { loadGames } = await import('../lib/db.js')
      const games = await loadGames()
      dispatch({ type: 'SET_SAVED_GAMES', games })
      setSaved(true)
      showToast('Game saved to history')
    } catch (e) {
      console.error(e)
      showToast('Error saving game')
    } finally {
      setSaving(false)
    }
  }

  const handleNewGame = () => {
    dispatch({ type: 'RESET_GAME' })
  }

  // Separate payment types
  const loserPayments = payments.filter(p => p.reason === 'Player pays banker')
  const winnerPayments = payments.filter(p => p.reason === 'Banker pays winner')
  const dealerPayment = payments.find(p => p.reason === 'Banker pays dealer')

  return (
    <Screen>
      <Hero
        title="Results"
        subtitle={setup.name || new Date(setup.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      />

      {/* Summary stats */}
      <Card title="Game Summary">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatCard label="Total Pot" value={fmt(totalPot)} />
          <StatCard label="Players" value={players.length} />
          <StatCard label="Dealer Tips" value={fmt(totalTipFromWinners)} />
          <StatCard label="Dealer Total" value={fmt(finalDealerTake)} highlight />
        </div>
      </Card>

      {/* Player standings */}
      <Card title="Standings">
        {sorted.map((s, i) => (
          <PlayerResult key={s.player.id} settlement={s} rank={i + 1} tipPct={tipPct} />
        ))}
      </Card>

      {/* Banker flow — losers pay banker */}
      {loserPayments.length > 0 && (
        <Card title={`Losers → ${setup.bankerName || 'Banker'}`}>
          <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 12 }}>
            Each loser pays the banker their net loss.
          </p>
          {loserPayments.map((p, i) => (
            <PaymentRow key={i} payment={p} note="Poker loss" />
          ))}
        </Card>
      )}

      {/* Banker flow — banker pays winners */}
      {winnerPayments.length > 0 && (
        <Card title={`${setup.bankerName || 'Banker'} → Winners`}>
          <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 12 }}>
            Banker pays each winner their net take-home.
          </p>
          {winnerPayments.map((p, i) => (
            <PaymentRow key={i} payment={p} note="Poker winnings" reverse />
          ))}
        </Card>
      )}

      {/* Dealer payout */}
      {dealerPayment && (
        <Card title={`${setup.bankerName || 'Banker'} → ${setup.dealerName || 'Dealer'}`}>
          <DealerPayoutRow
            payment={dealerPayment}
            upfront={totalDealerUpfront}
            tips={totalTipFromWinners}
            total={finalDealerTake}
            tipPct={tipPct}
            playerCount={players.length}
          />
        </Card>
      )}

      {/* Actions */}
      <BtnPrimary onClick={handleSave} disabled={saving || saved} style={{ marginTop: 16 }}>
        {saved ? '✓ Saved to History' : saving ? 'Saving…' : 'Save Game'}
      </BtnPrimary>
      <BtnSecondary onClick={handleNewGame} style={{ marginTop: 8 }}>
        New Game
      </BtnSecondary>
    </Screen>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, highlight }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)',
      padding: '11px 13px', border: '1px solid rgba(201,168,76,0.12)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: 'var(--cream-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 600,
        color: highlight ? 'var(--gold-light)' : 'var(--cream)',
      }}>
        {value}
      </div>
    </div>
  )
}

function PlayerResult({ settlement: s, rank, tipPct }) {
  const [open, setOpen] = useState(false)
  const net = s.finalNet
  const isWin = net > 0.01
  const isLoss = net < -0.01
  const color = isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--gold)'
  const bgColor = isWin ? 'rgba(76,175,125,0.07)' : isLoss ? 'rgba(224,82,82,0.07)' : 'rgba(201,168,76,0.05)'
  const borderColor = isWin ? 'rgba(76,175,125,0.25)' : isLoss ? 'rgba(224,82,82,0.2)' : 'rgba(201,168,76,0.18)'

  return (
    <div style={{
      background: bgColor, borderRadius: 'var(--radius-sm)',
      border: `1px solid ${borderColor}`,
      marginBottom: 8, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(201,168,76,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--gold-dim)',
          flexShrink: 0,
        }}>
          {rank}
        </div>
        <Avatar name={s.player.name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--cream)' }}>{s.player.name}</div>
          <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>
            In {fmt(s.potIn + s.upfrontDealer)} · Out {fmt(s.player.cashOut || 0)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700, color,
          }}>
            {fmtSigned(net)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--cream-dim)' }}>{open ? '▲' : '▼'}</div>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <DetailRow label="Pot in (buy-ins + rebuys)" value={fmt(s.potIn)} />
          <DetailRow label={`Upfront dealer fee`} value={`− ${fmt(s.upfrontDealer)}`} />
          <DetailRow label="Chips cashed out" value={fmt(s.player.cashOut || 0)} />
          <Divider style={{ margin: '8px 0' }} />
          <DetailRow label="Winnings before tip" value={fmtSigned(s.netBeforeTip)} />
          {s.tipShare > 0 && (
            <DetailRow
              label={`Dealer tip (${tipPct}% of ${fmt(s.netBeforeTip)}, rounded down)`}
              value={`− ${fmt(s.tipShare)}`}
              muted
            />
          )}
          {s.netBeforeTip > 0 && s.netBeforeTip < 20 && (
            <div style={{ fontSize: 11, color: 'var(--cream-dim)', fontStyle: 'italic', marginTop: 4 }}>
              No tip — winnings under $20 threshold
            </div>
          )}
          <Divider style={{ margin: '8px 0' }} />
          <DetailRow label="Final net" value={fmtSigned(net)} bold color={color} />
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, bold, color, muted }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      marginBottom: 5, gap: 8,
    }}>
      <span style={{ fontSize: 13, color: muted ? 'var(--cream-dim)' : 'var(--cream-dim)', flex: 1 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: bold ? 700 : 500,
        color: color || 'var(--cream)', flexShrink: 0,
      }}>
        {value}
      </span>
    </div>
  )
}

function PaymentRow({ payment: p, note, reverse }) {
  const fromHandle = p.from.venmoHandle
  const toHandle = p.to.venmoHandle

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', marginBottom: 8,
      background: 'rgba(0,0,0,0.18)', borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Avatar name={p.from.name} size={28} />
          <span style={{ fontSize: 13, color: 'var(--cream-dim)' }}>→</span>
          <Avatar name={p.to.name} size={28} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--cream)' }}>{p.from.name}</span>
            <span style={{ fontSize: 13, color: 'var(--cream-dim)' }}> pays </span>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--cream)' }}>{p.to.name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 0 }}>
          {/* From person pays To person — show pay button for the "from" person */}
          {toHandle && (
            <VenmoBtn
              txn="pay"
              handle={toHandle}
              amount={p.amount}
              note={note}
              label={`Pay @${toHandle}`}
              variant="pay"
            />
          )}
          {/* Request button — charge the "from" person */}
          {fromHandle && (
            <VenmoBtn
              txn="charge"
              handle={fromHandle}
              amount={p.amount}
              note={note}
              label={`Request @${fromHandle}`}
              variant="request"
            />
          )}
        </div>
      </div>
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700,
        color: 'var(--gold-light)', marginLeft: 12, flexShrink: 0,
      }}>
        {fmt(p.amount)}
      </div>
    </div>
  )
}

function DealerPayoutRow({ payment: p, upfront, tips, total, tipPct, playerCount }) {
  const bankerHandle = p.from.venmoHandle
  const dealerHandle = p.to.venmoHandle

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 12,
      }}>
        <Avatar name={p.to.name} size={42} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{p.to.name}</div>
          {dealerHandle && <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>@{dealerHandle}</div>}
        </div>
        <div style={{
          fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: 'var(--success)',
        }}>
          +{fmt(total)}
        </div>
      </div>

      <Divider />
      <DetailRow label={`Upfront fees (${playerCount} players × ${fmt(upfront / playerCount)})`} value={fmt(upfront)} />
      <DetailRow label={`Winner tips (${tipPct}% rounded down)`} value={fmt(tips)} />
      <Divider style={{ margin: '8px 0' }} />
      <DetailRow label="Dealer total from banker" value={fmt(total)} bold color="var(--success)" />

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {dealerHandle && (
          <VenmoBtn
            txn="pay"
            handle={dealerHandle}
            amount={total}
            note="Poker dealer payout"
            label={`Pay dealer @${dealerHandle}`}
            variant="pay"
          />
        )}
        {bankerHandle && (
          <VenmoBtn
            txn="charge"
            handle={bankerHandle}
            amount={total}
            note="Poker dealer payout"
            label={`Request from @${bankerHandle}`}
            variant="request"
          />
        )}
      </div>
    </div>
  )
}
