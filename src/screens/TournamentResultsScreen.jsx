import React, { useMemo, useState } from 'react'
import { useTournament } from '../context/TournamentContext.jsx'
import { Card, Avatar, Divider, VenmoBtn } from '../components/UI.jsx'
import { printReport } from '../utils/printReport.js'

function fmt(n) { return '$' + Math.abs(Math.round((n || 0) * 100) / 100).toFixed(2) }
function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v-20)%10] || s[v] || s[0])
}

export default function TournamentResultsScreen() {
  const { state, dispatch } = useTournament()
  const [saved, setSaved] = useState(false)

  const buyIn = parseFloat(state.buyInAmount) || 0
  const rebuyAmt = parseFloat(state.rebuyAmount) || 0
  const addonAmt = parseFloat(state.addonAmount) || 0
  const dealerFee = parseFloat(state.dealerFeePerPlayer) || 0
  const tipPct = (parseFloat(state.dealerTipPercent) || 0) / 100

  const players = state.players.filter(p => p.name)

  const totalBuyIns = players.reduce((s, p) => s + buyIn * p.buyInCount, 0)
  const totalRebuys = players.reduce((s, p) => s + rebuyAmt * p.rebuyCount, 0)
  const totalAddons = players.reduce((s, p) => s + addonAmt * p.addonCount, 0)
  const totalDealerFees = dealerFee * players.length
  const prizePool = totalBuyIns + totalRebuys + totalAddons  // dealer fees separate

  // Determine finish order
  // Eliminated players have finishPlace set; surviving players (not eliminated) get top places
  const survivingPlayers = players.filter(p => !p.eliminated)
  const eliminatedPlayers = [...players.filter(p => p.eliminated)]
    .sort((a, b) => b.finishPlace - a.finishPlace) // last out = highest place

  // Build finish order: survivors first (1st), then eliminated by finish place
  let finishOrder = []
  if (survivingPlayers.length === 1) {
    finishOrder = [{ ...survivingPlayers[0], place: 1 }, ...eliminatedPlayers.map((p, i) => ({ ...p, place: i + 2 }))]
  } else if (survivingPlayers.length === 0) {
    finishOrder = eliminatedPlayers.map((p, i) => ({ ...p, place: i + 1 }))
  } else {
    // Tournament not finished — rank survivors by chip count (unknown), just list them
    finishOrder = [
      ...survivingPlayers.map((p, i) => ({ ...p, place: i + 1 })),
      ...eliminatedPlayers.map((p, i) => ({ ...p, place: survivingPlayers.length + i + 1 }))
    ]
  }

  // Payouts
  const payouts = useMemo(() => {
    return state.payoutPlaces.map(pp => {
      const player = finishOrder.find(p => p.place === pp.place)
      const grossPayout = prizePool * (parseFloat(pp.pct) / 100)
      const tip = grossPayout * tipPct
      const netPayout = grossPayout - tip
      return {
        place: pp.place,
        pct: pp.pct,
        player: player || null,
        grossPayout,
        tip,
        netPayout,
      }
    })
  }, [state.payoutPlaces, finishOrder, prizePool, tipPct])

  const totalTips = payouts.reduce((s, p) => s + p.tip, 0)
  const dealerTotal = totalDealerFees + totalTips

  const handlePrint = () => {
    const rows = `
      <h1>Tournament Results — ${state.name}</h1>
      <p class="subtitle">${new Date(state.date).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })} · ${players.length} players · Prize pool ${fmt(prizePool)}</p>

      <div class="section">
        <div class="section-title">Prize Pool Breakdown</div>
        <table>
          <tr><td>Buy-ins (${players.length} × ${fmt(buyIn)})</td><td class="right">${fmt(totalBuyIns)}</td></tr>
          <tr><td>Rebuys</td><td class="right">${fmt(totalRebuys)}</td></tr>
          <tr><td>Add-ons</td><td class="right">${fmt(totalAddons)}</td></tr>
          <tr class="total-row"><td>Total Prize Pool</td><td class="right">${fmt(prizePool)}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Payouts</div>
        <table>
          <thead><tr><th>Place</th><th>Player</th><th class="right">Gross</th><th class="right">Tip (${state.dealerTipPercent}%)</th><th class="right">Net</th></tr></thead>
          <tbody>
            ${payouts.map(p => `<tr>
              <td>${ordinal(p.place)}</td>
              <td>${p.player?.name || 'TBD'}</td>
              <td class="right">${fmt(p.grossPayout)}</td>
              <td class="right">${fmt(p.tip)}</td>
              <td class="right win">${fmt(p.netPayout)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Dealer Payout</div>
        <table>
          <tr><td>Upfront fees (${players.length} × ${fmt(dealerFee)})</td><td class="right">${fmt(totalDealerFees)}</td></tr>
          <tr><td>Winner tips</td><td class="right">${fmt(totalTips)}</td></tr>
          <tr class="total-row"><td>Dealer Total</td><td class="right win">${fmt(dealerTotal)}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Final Standings</div>
        <table>
          <thead><tr><th>#</th><th>Player</th><th class="right">Rebuys</th><th class="right">Add-on</th><th class="right">Total In</th></tr></thead>
          <tbody>
            ${finishOrder.map(p => {
              const totalIn = buyIn * p.buyInCount + rebuyAmt * p.rebuyCount + addonAmt * p.addonCount + dealerFee
              return `<tr>
                <td>${ordinal(p.place)}</td>
                <td>${p.name}</td>
                <td class="right">${p.rebuyCount}</td>
                <td class="right">${p.addonCount > 0 ? 'Yes' : 'No'}</td>
                <td class="right">${fmt(totalIn)}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
    `
    printReport(`Tournament Results ${state.date}`, rows, `Tournament ${state.date}`)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 96px' }}>
      <div style={{ textAlign: 'center', padding: '22px 8px 10px' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 24, fontWeight: 700, color: 'var(--gold-light)', marginBottom: 4 }}>
          Tournament Results
        </div>
        <div style={{ color: 'var(--cream-dim)', fontSize: 14 }}>{state.name}</div>
      </div>

      {/* Prize pool summary */}
      <Card title="Prize Pool">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <MiniStat label="Prize Pool" value={fmt(prizePool)} gold />
          <MiniStat label="Players" value={players.length} />
          <MiniStat label="Rebuys" value={players.reduce((s,p)=>s+p.rebuyCount,0)} />
          <MiniStat label="Add-ons" value={players.filter(p=>p.addonCount>0).length} />
        </div>
        <SummaryRow label={`Buy-ins (${players.length} × ${fmt(buyIn)})`} value={fmt(totalBuyIns)} />
        {totalRebuys > 0 && <SummaryRow label="Rebuys" value={fmt(totalRebuys)} />}
        {totalAddons > 0 && <SummaryRow label="Add-ons" value={fmt(totalAddons)} />}
        <Divider />
        <SummaryRow label="Total Prize Pool" value={fmt(prizePool)} bold gold />
      </Card>

      {/* Payouts */}
      <Card title="Payouts">
        {payouts.map((p, i) => {
          const placeColors = ['var(--gold-light)', 'var(--cream-dim)', '#cd7f32']
          const placeColor = placeColors[i] || 'var(--cream-dim)'
          return (
            <div key={i} style={{
              background: i < 3 ? `rgba(201,168,76,${0.08 - i * 0.02})` : 'rgba(0,0,0,0.15)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700,
                  color: placeColor, minWidth: 36, flexShrink: 0,
                }}>
                  {ordinal(p.place)}
                </div>
                {p.player && <Avatar name={p.player.name} size={34} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{p.player?.name || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>{p.pct}% of prize pool</div>
                </div>
                <div style={{
                  fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700,
                  color: 'var(--success)',
                }}>
                  +{fmt(p.netPayout)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--cream-dim)', paddingLeft: 0, marginBottom: 8 }}>
                Gross {fmt(p.grossPayout)} − Dealer tip {fmt(p.tip)} = <strong style={{ color: 'var(--cream)' }}>{fmt(p.netPayout)}</strong>
              </div>
              {/* Venmo buttons */}
              {p.player?.venmoHandle && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <VenmoBtn txn="pay" handle={p.player.venmoHandle} amount={p.netPayout}
                    note={`${state.name} - ${ordinal(p.place)} place payout`}
                    label={`Pay ${p.player.name.split(' ')[0]}`} variant="pay" />
                </div>
              )}
            </div>
          )
        })}
      </Card>

      {/* Dealer payout */}
      <Card title="Dealer Payout">
        <SummaryRow label={`Upfront fees (${players.length} × ${fmt(dealerFee)})`} value={fmt(totalDealerFees)} />
        <SummaryRow label={`Winner tips (${state.dealerTipPercent}%)`} value={fmt(totalTips)} />
        <Divider />
        <SummaryRow label="Dealer Total" value={fmt(dealerTotal)} bold gold />
      </Card>

      {/* Final standings */}
      <Card title="Final Standings">
        {finishOrder.map((p, i) => {
          const totalIn = buyIn * p.buyInCount + rebuyAmt * p.rebuyCount + addonAmt * p.addonCount + dealerFee
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', marginBottom: 6,
              background: 'rgba(0,0,0,0.18)', borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255,255,255,0.06)',
              opacity: p.eliminated && p.place > state.payoutPlaces.length ? 0.7 : 1,
            }}>
              <div style={{ width: 28, textAlign: 'center', fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--gold-dim)', flexShrink: 0 }}>
                {ordinal(p.place)}
              </div>
              <Avatar name={p.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--cream-dim)' }}>
                  {p.rebuyCount > 0 ? `${p.rebuyCount} rebuy${p.rebuyCount !== 1 ? 's' : ''}` : 'No rebuys'}
                  {p.addonCount > 0 ? ' · Add-on ✓' : ''}
                  {' · Total in '}{fmt(totalIn)}
                </div>
              </div>
            </div>
          )
        })}
      </Card>

      <button onClick={handlePrint} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '13px 16px', marginBottom: 10,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--gold-light)', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
      }}>
        📄 Export PDF / Share
      </button>

      <button onClick={() => dispatch({ type: 'RESET' })} style={{
        width: '100%', padding: '13px',
        background: 'rgba(255,255,255,0.06)',
        color: 'var(--cream-dim)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: 8,
      }}>
        New Tournament
      </button>
      <div style={{ height: 20 }} />
    </div>
  )
}

function MiniStat({ label, value, gold }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 'var(--radius-sm)', padding: '10px 10px', border: '1px solid rgba(201,168,76,0.1)', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--cream-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: gold ? 'Cinzel, serif' : 'DM Sans, sans-serif', fontSize: gold ? 18 : 16, fontWeight: 600, color: gold ? 'var(--gold-light)' : 'var(--cream)' }}>{value}</div>
    </div>
  )
}

function SummaryRow({ label, value, bold, gold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 14 }}>
      <span style={{ color: 'var(--cream-dim)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: gold ? 'var(--gold-light)' : 'var(--cream)', fontFamily: gold ? 'Cinzel, serif' : 'inherit' }}>{value}</span>
    </div>
  )
}
