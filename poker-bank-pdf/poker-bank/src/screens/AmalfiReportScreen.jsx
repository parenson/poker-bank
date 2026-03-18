import React, { useState, useEffect, useMemo } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { Screen, Hero, Card, Avatar, Divider } from '../components/UI.jsx'
import { fmt, fmtSigned } from '../utils/settlement.js'
import { loadGames } from '../lib/db.js'
import { printReport } from '../utils/printReport.js'

export default function AmalfiReportScreen({ onBack }) {
  const { state, dispatch } = useGame()
  const [allGames, setAllGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(null)
  const [expandedPlayers, setExpandedPlayers] = useState(new Set())

  useEffect(() => {
    const source = state.savedGames.length > 0
      ? Promise.resolve(state.savedGames)
      : loadGames()
    source.then(games => {
      if (state.savedGames.length === 0) dispatch({ type: 'SET_SAVED_GAMES', games })
      const amalfi = games
        .filter(g => g.gameType === 'amalfi')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      setAllGames(amalfi)
      const years = [...new Set(amalfi.map(g => new Date(g.date).getFullYear()))].sort()
      if (years.length > 0) setSelectedYear(years[years.length - 1])
      setLoading(false)
    })
  }, [])

  const years = useMemo(() =>
    [...new Set(allGames.map(g => new Date(g.date).getFullYear()))].sort(),
    [allGames]
  )

  const summaries = useMemo(() => {
    if (!selectedYear) return []
    const yearGames = allGames.filter(g => new Date(g.date).getFullYear() === selectedYear)
    const byPlayer = {}
    for (const g of yearGames) {
      for (const r of g.results) {
        const key = `${r.name.toLowerCase()}|${r.initials.toLowerCase()}`
        if (!byPlayer[key]) {
          byPlayer[key] = { name: r.name, initials: r.initials, venmoHandle: r.venmoHandle, lines: [] }
        }
        byPlayer[key].lines.push({
          gameName: g.name,
          date: new Date(g.date),
          buyInTotal: r.buyInTotal,
          cashOut: r.cashOut,
          net: r.finalNet,
        })
      }
    }
    return Object.values(byPlayer)
      .map(p => ({
        ...p,
        lines: [...p.lines].sort((a, b) => a.date - b.date),
        totalNet: p.lines.reduce((s, l) => s + l.net, 0),
        totalBuyIns: p.lines.reduce((s, l) => s + l.buyInTotal, 0),
        totalCashOut: p.lines.reduce((s, l) => s + l.cashOut, 0),
      }))
      .sort((a, b) => b.totalNet - a.totalNet)
  }, [allGames, selectedYear])

  const togglePlayer = (key) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const grandTotals = useMemo(() => ({
    net: summaries.reduce((s, p) => s + p.totalNet, 0),
    buyIns: summaries.reduce((s, p) => s + p.totalBuyIns, 0),
    cashOut: summaries.reduce((s, p) => s + p.totalCashOut, 0),
    games: allGames.filter(g => selectedYear && new Date(g.date).getFullYear() === selectedYear).length,
  }), [summaries, allGames, selectedYear])

  const handlePrint = () => {
    const playerSections = summaries.map((p, i) => {
      const netCls = p.totalNet > 0.01 ? 'win' : p.totalNet < -0.01 ? 'loss' : 'even'
      const gameRows = p.lines.map(line => {
        const mm = String(line.date.getMonth() + 1).padStart(2, '0')
        const dd = String(line.date.getDate()).padStart(2, '0')
        const lineCls = line.net > 0.01 ? 'win' : line.net < -0.01 ? 'loss' : ''
        return `<tr>
          <td>${mm}/${dd} · ${line.gameName}</td>
          <td class="right">$${line.buyInTotal.toFixed(0)}</td>
          <td class="right">$${line.cashOut.toFixed(0)}</td>
          <td class="right ${lineCls}">${line.net >= 0 ? '+' : '−'}$${Math.abs(line.net).toFixed(0)}</td>
        </tr>`
      }).join('')

      return `
        <div class="section">
          <div class="section-title">${i + 1}. ${p.name}${p.venmoHandle ? ` (@${p.venmoHandle})` : ''}</div>
          <p style="font-size:11px;color:#666;margin-bottom:6px">
            ${p.lines.length} games &nbsp;·&nbsp; Buy-ins: $${p.totalBuyIns.toFixed(0)} &nbsp;·&nbsp; 
            Cash out: $${p.totalCashOut.toFixed(0)} &nbsp;·&nbsp; 
            Net: <span class="${netCls}">${p.totalNet >= 0 ? '+' : '−'}$${Math.abs(p.totalNet).toFixed(0)}</span>
          </p>
          <table>
            <thead>
              <tr>
                <th>Game</th>
                <th class="right">Buy-in</th>
                <th class="right">Cash Out</th>
                <th class="right">Net</th>
              </tr>
            </thead>
            <tbody>
              ${gameRows}
              <tr class="total-row">
                <td>Total</td>
                <td class="right">$${p.totalBuyIns.toFixed(0)}</td>
                <td class="right">$${p.totalCashOut.toFixed(0)}</td>
                <td class="right ${netCls}">${p.totalNet >= 0 ? '+' : '−'}$${Math.abs(p.totalNet).toFixed(0)}</td>
              </tr>
            </tbody>
          </table>
        </div>`
    }).join('')

    const html = `
      <h1>Amalfi Annual Report — ${selectedYear}</h1>
      <p class="subtitle">${grandTotals.games} games · ${summaries.length} players · Total buy-ins: $${grandTotals.buyIns.toFixed(0)}</p>

      <div class="section">
        <div class="section-title">Standings Summary</div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Player</th>
              <th class="right">Games</th>
              <th class="right">Buy-ins</th>
              <th class="right">Cash Out</th>
              <th class="right">Net</th>
            </tr>
          </thead>
          <tbody>
            ${summaries.map((p, i) => {
              const cls = p.totalNet > 0.01 ? 'win' : p.totalNet < -0.01 ? 'loss' : 'even'
              return `<tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td class="right">${p.lines.length}</td>
                <td class="right">$${p.totalBuyIns.toFixed(0)}</td>
                <td class="right">$${p.totalCashOut.toFixed(0)}</td>
                <td class="right ${cls}">${p.totalNet >= 0 ? '+' : '−'}$${Math.abs(p.totalNet).toFixed(0)}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>

      ${playerSections}
    `
    printReport(`Amalfi Annual Report ${selectedYear}`, html)
  }

  return (
    <Screen>
      <div style={{ padding: '14px 0 0' }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none',
          color: 'var(--cream-dim)', fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'DM Sans, sans-serif', padding: 0, marginBottom: 8,
        }}>
          ← Back to History
        </button>
      </div>

      <Hero title="Amalfi Annual Report" subtitle="Per-player yearly performance" />

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--cream-dim)' }}>Loading…</div>
      )}
      {!loading && allGames.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cream-dim)', fontSize: 14 }}>
            No Amalfi games recorded yet.
          </div>
        </Card>
      )}

      {!loading && allGames.length > 0 && (
        <>
          {/* Year selector */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--cream-dim)', flexShrink: 0 }}>Year</span>
              <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                {years.map(y => (
                  <button key={y} onClick={() => { setSelectedYear(y); setExpandedPlayers(new Set()) }}
                    style={{
                      flex: 1, padding: '9px 10px',
                      background: selectedYear === y ? 'rgba(201,168,76,0.18)' : 'var(--input-bg)',
                      border: selectedYear === y ? '1px solid var(--gold)' : '1px solid rgba(201,168,76,0.2)',
                      borderRadius: 'var(--radius-sm)',
                      color: selectedYear === y ? 'var(--gold-light)' : 'var(--cream-dim)',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'Cinzel, serif', transition: 'all 0.15s',
                    }}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Season summary */}
          {summaries.length > 0 && (
            <Card title={`${selectedYear} Season Summary`}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <MiniStat label="Games" value={grandTotals.games} />
                <MiniStat label="Players" value={summaries.length} />
                <MiniStat label="Buy-ins" value={fmt(grandTotals.buyIns)} small />
                <MiniStat label="Cash Out" value={fmt(grandTotals.cashOut)} small />
              </div>
            </Card>
          )}

          {summaries.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--cream-dim)', fontSize: 14 }}>
                No Amalfi games for {selectedYear}.
              </div>
            </Card>
          ) : (
            <>
              <Card title="Player Standings">
                {summaries.map((p, i) => {
                  const key = `${p.name}|${p.initials}`
                  const expanded = expandedPlayers.has(key)
                  const isWin  = p.totalNet > 0.01
                  const isLoss = p.totalNet < -0.01
                  const color       = isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--gold)'
                  const bgColor     = isWin ? 'rgba(76,175,125,0.07)'  : isLoss ? 'rgba(224,82,82,0.07)'  : 'rgba(201,168,76,0.05)'
                  const borderColor = isWin ? 'rgba(76,175,125,0.25)'  : isLoss ? 'rgba(224,82,82,0.2)'   : 'rgba(201,168,76,0.18)'

                  return (
                    <div key={key} style={{
                      background: bgColor, borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${borderColor}`, marginBottom: 8, overflow: 'hidden',
                    }}>
                      <button onClick={() => togglePlayer(key)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 13px', background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: i === 0 ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700,
                          color: i === 0 ? 'var(--gold-light)' : 'var(--cream-dim)',
                        }}>
                          {i + 1}
                        </div>
                        <Avatar name={p.name} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--cream)' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>
                            {p.lines.length} game{p.lines.length !== 1 ? 's' : ''} · {fmt(p.totalBuyIns)} in · {fmt(p.totalCashOut)} out
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700, color }}>{fmtSigned(p.totalNet)}</div>
                          <div style={{ fontSize: 11, color: 'var(--cream-dim)' }}>{expanded ? '▲' : '▼'}</div>
                        </div>
                      </button>

                      {expanded && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4px 0 8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 68px 68px 68px', padding: '4px 13px 6px', gap: 4 }}>
                            {['Game', 'Buy-in', 'Cash Out', 'Net'].map((h, hi) => (
                              <div key={h} style={{ fontSize: 11, color: 'var(--cream-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: hi > 0 ? 'right' : 'left' }}>{h}</div>
                            ))}
                          </div>
                          <Divider style={{ margin: '0 13px 4px' }} />
                          {p.lines.map((line, li) => {
                            const mm = String(line.date.getMonth() + 1).padStart(2, '0')
                            const dd = String(line.date.getDate()).padStart(2, '0')
                            const lineColor = line.net > 0.01 ? 'var(--success)' : line.net < -0.01 ? 'var(--danger)' : 'var(--cream-dim)'
                            return (
                              <div key={li} style={{
                                display: 'grid', gridTemplateColumns: '1fr 68px 68px 68px',
                                padding: '5px 13px', gap: 4,
                                background: li % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.1)',
                              }}>
                                <div style={{ fontSize: 13, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ color: 'var(--cream-dim)', fontSize: 12 }}>{mm}/{dd} · </span>
                                  {line.gameName}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--cream)', textAlign: 'right' }}>${line.buyInTotal.toFixed(0)}</div>
                                <div style={{ fontSize: 13, color: 'var(--cream)', textAlign: 'right' }}>${line.cashOut.toFixed(0)}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: lineColor, textAlign: 'right' }}>
                                  {line.net >= 0 ? '+' : '−'}${Math.abs(line.net).toFixed(0)}
                                </div>
                              </div>
                            )
                          })}
                          <Divider style={{ margin: '6px 13px 4px' }} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 68px 68px 68px', padding: '5px 13px', gap: 4 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', textAlign: 'right' }}>${p.totalBuyIns.toFixed(0)}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', textAlign: 'right' }}>${p.totalCashOut.toFixed(0)}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color, textAlign: 'right', fontFamily: 'Cinzel, serif' }}>
                              {p.totalNet >= 0 ? '+' : '−'}${Math.abs(p.totalNet).toFixed(0)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </Card>

              {/* PDF button */}
              <button onClick={handlePrint} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '13px 16px', marginBottom: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--gold-light)', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}>
                📄 Export as PDF / Share
              </button>
            </>
          )}
        </>
      )}
    </Screen>
  )
}

function MiniStat({ label, value, small }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
      padding: '10px 8px', border: '1px solid rgba(201,168,76,0.1)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: 'var(--cream-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: small ? 'DM Sans, sans-serif' : 'Cinzel, serif', fontSize: small ? 13 : 18, fontWeight: 600, color: 'var(--gold-light)' }}>
        {value}
      </div>
    </div>
  )
}
