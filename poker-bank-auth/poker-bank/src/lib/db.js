import { supabase } from './supabase.js'

// Supabase RLS uses the JWT from the active session automatically —
// no extra headers needed. All queries below will be filtered to the
// logged-in user's rows via the RLS policies we set on each table.

// ─── Players ──────────────────────────────────────────────────────────────────

export async function loadPlayers() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('players')
    .select()
    .order('name', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name ?? '',
    initials: row.initials ?? '',
    venmoHandle: row.venmo_handle ?? '',
  }))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function upsertPlayer(player) {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  const row = {
    name: player.name,
    initials: player.initials,
    venmo_handle: player.venmoHandle || null,
    user_id: user?.id,
  }
  if (player.id && UUID_RE.test(player.id)) row.id = player.id
  const { error } = await supabase.from('players').upsert(row)
  if (error) console.error(error)
}

export async function deletePlayer(id) {
  if (!supabase) return
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) console.error(error)
}

// ─── Games ────────────────────────────────────────────────────────────────────

export async function saveGame(game, settlement) {
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()

  const { data: inserted, error: gameErr } = await supabase
    .from('games')
    .insert({
      name: game.name,
      game_date: game.date,
      buy_in_amount: game.buyInAmount,
      dealer_upfront_per_player: game.dealerUpfrontPerPlayer,
      dealer_tip_percent: game.dealerTipPercent,
      dealer_name: game.dealerName,
      dealer_venmo_handle: game.dealerVenmoHandle || null,
      banker_name: game.bankerName,
      banker_venmo_handle: game.bankerVenmoHandle || null,
      total_pot: settlement.totalPot,
      total_dealer_upfront: settlement.totalDealerUpfront,
      total_dealer_tips: settlement.totalTipFromWinners,
      final_dealer_take: settlement.finalDealerTake,
      game_type: game.gameType ?? 'home',
      user_id: user?.id,
    })
    .select('id')
    .single()

  if (gameErr) { console.error(gameErr); return null }

  const gameId = inserted.id

  const resultRows = settlement.playerSettlements.map(s => ({
    game_id: gameId,
    player_name: s.player.name,
    player_initials: s.player.initials,
    player_venmo_handle: s.player.venmoHandle || null,
    buy_in_total: s.potIn,
    upfront_dealer: s.upfrontDealer,
    tip_share: s.tipShare,
    cash_out: s.player.cashOut,
    net_before_tip: s.netBeforeTip,
    final_net: s.finalNet,
    user_id: user?.id,
  }))

  if (resultRows.length > 0) {
    const { error: rErr } = await supabase.from('game_results').insert(resultRows)
    if (rErr) console.error(rErr)
  }

  return gameId
}

export async function loadGames() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('games')
    .select()
    .order('game_date', { ascending: false })
  if (error) { console.error(error); return [] }

  const games = []
  for (const row of (data ?? [])) {
    const { data: results } = await supabase
      .from('game_results')
      .select()
      .eq('game_id', row.id)

    games.push({
      id: row.id,
      name: row.name,
      date: row.game_date,
      buyInAmount: row.buy_in_amount,
      dealerUpfrontPerPlayer: row.dealer_upfront_per_player,
      dealerTipPercent: row.dealer_tip_percent,
      dealerName: row.dealer_name,
      dealerVenmoHandle: row.dealer_venmo_handle ?? '',
      bankerName: row.banker_name,
      bankerVenmoHandle: row.banker_venmo_handle ?? '',
      totalPot: row.total_pot,
      totalDealerUpfront: row.total_dealer_upfront,
      totalDealerTips: row.total_dealer_tips,
      finalDealerTake: row.final_dealer_take,
      gameType: row.game_type ?? 'home',
      results: (results ?? []).map(r => ({
        name: r.player_name,
        initials: r.player_initials,
        venmoHandle: r.player_venmo_handle ?? '',
        buyInTotal: r.buy_in_total,
        upfrontDealer: r.upfront_dealer,
        tipShare: r.tip_share,
        cashOut: r.cash_out,
        netBeforeTip: r.net_before_tip,
        finalNet: r.final_net,
      })),
    })
  }
  return games
}

export async function deleteGame(id) {
  if (!supabase) return
  const { error } = await supabase.from('games').delete().eq('id', id)
  if (error) console.error(error)
}
