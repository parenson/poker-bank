import { supabase } from './supabase.js'

// ─── Players ──────────────────────────────────────────────────────────────────

export async function loadPlayers() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('players')
    .select()
    .order('name', { ascending: true })
  if (error) { console.error('[db] loadPlayers error:', error); return [] }
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name ?? '',
    initials: row.initials ?? '',
    venmoHandle: row.venmo_handle ?? '',
  }))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getCurrentUserId() {
  if (!supabase) return null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch (e) {
    console.warn('[db] Could not get session:', e)
    return null
  }
}

export async function upsertPlayer(player) {
  if (!supabase) return
  const userId = await getCurrentUserId()
  const row = {
    name: player.name,
    initials: player.initials,
    venmo_handle: player.venmoHandle || null,
    user_id: userId,
  }
  if (player.id && UUID_RE.test(player.id)) row.id = player.id
  const { error } = await supabase.from('players').upsert(row)
  if (error) console.error('[db] upsertPlayer error:', error)
}

export async function deletePlayer(id) {
  if (!supabase) return
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) console.error('[db] deletePlayer error:', error)
}

// ─── Games ────────────────────────────────────────────────────────────────────

export async function saveGame(game, settlement) {
  if (!supabase) return null

  const userId = await getCurrentUserId()

  if (!userId) {
    console.error('[db] saveGame: no authenticated user — cannot save')
    throw new Error('Not authenticated. Please sign in again.')
  }

  // 1) Insert game row
  const { data: inserted, error: gameErr } = await supabase
    .from('games')
    .insert({
      name: game.name,
      game_date: game.date,
      buy_in_amount: game.buyInAmount,
      dealer_upfront_per_player: game.dealerUpfrontPerPlayer,
      dealer_tip_percent: game.dealerTipPercent,
      dealer_name: game.dealerName || '',
      dealer_venmo_handle: game.dealerVenmoHandle || null,
      banker_name: game.bankerName || '',
      banker_venmo_handle: game.bankerVenmoHandle || null,
      total_pot: settlement.totalPot,
      total_dealer_upfront: settlement.totalDealerUpfront,
      total_dealer_tips: settlement.totalTipFromWinners,
      final_dealer_take: settlement.finalDealerTake,
      game_type: game.gameType ?? 'home',
      user_id: userId,
    })
    .select('id')
    .single()

  if (gameErr) {
    console.error('[db] saveGame insert error:', gameErr)
    throw new Error('Failed to save game: ' + gameErr.message)
  }

  const gameId = inserted.id
  console.log('[db] Game saved with id:', gameId, '| settlements:', settlement.playerSettlements.length)

  // 2) Insert player result rows
  if (settlement.playerSettlements.length === 0) {
    console.warn('[db] saveGame: no playerSettlements to save!')
    return gameId
  }

  const resultRows = settlement.playerSettlements.map(s => ({
    game_id: gameId,
    player_name: s.player.name || s.name || '',
    player_initials: s.player.initials || s.player.name?.slice(0, 2).toUpperCase() || '',
    player_venmo_handle: s.player.venmoHandle || s.venmoHandle || null,
    // Ensure cashOut is stored as a number
    buy_in_total: Number(s.potIn) || 0,
    upfront_dealer: Number(s.upfrontDealer) || 0,
    tip_share: Number(s.tipShare) || 0,
    cash_out: Number(s.player.cashOut) || 0,
    net_before_tip: Number(s.netBeforeTip) || 0,
    final_net: Number(s.finalNet) || 0,
    user_id: userId,
  }))

  console.log('[db] Inserting result rows:', resultRows)

  const { error: rErr } = await supabase.from('game_results').insert(resultRows)
  if (rErr) {
    console.error('[db] game_results insert error:', rErr)
    throw new Error('Game saved but player results failed: ' + rErr.message)
  }

  return gameId
}

export async function loadGames() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('games')
    .select()
    .order('game_date', { ascending: false })

  if (error) { console.error('[db] loadGames error:', error); return [] }

  const games = []
  for (const row of (data ?? [])) {
    const { data: results, error: rErr } = await supabase
      .from('game_results')
      .select()
      .eq('game_id', row.id)

    if (rErr) console.error('[db] loadGames results error for', row.id, rErr)

    games.push({
      id: row.id,
      name: row.name,
      date: row.game_date,
      buyInAmount: Number(row.buy_in_amount) || 0,
      dealerUpfrontPerPlayer: Number(row.dealer_upfront_per_player) || 0,
      dealerTipPercent: Number(row.dealer_tip_percent) || 0,
      dealerName: row.dealer_name ?? '',
      dealerVenmoHandle: row.dealer_venmo_handle ?? '',
      bankerName: row.banker_name ?? '',
      bankerVenmoHandle: row.banker_venmo_handle ?? '',
      totalPot: Number(row.total_pot) || 0,
      totalDealerUpfront: Number(row.total_dealer_upfront) || 0,
      totalDealerTips: Number(row.total_dealer_tips) || 0,
      finalDealerTake: Number(row.final_dealer_take) || 0,
      gameType: row.game_type ?? 'home',
      results: (results ?? []).map(r => ({
        name: r.player_name ?? '',
        initials: r.player_initials ?? '',
        venmoHandle: r.player_venmo_handle ?? '',
        buyInTotal: Number(r.buy_in_total) || 0,
        upfrontDealer: Number(r.upfront_dealer) || 0,
        tipShare: Number(r.tip_share) || 0,
        cashOut: Number(r.cash_out) || 0,
        netBeforeTip: Number(r.net_before_tip) || 0,
        finalNet: Number(r.final_net) || 0,
      })),
    })
  }

  console.log(`[db] Loaded ${games.length} games`)
  return games
}

export async function deleteGame(id) {
  if (!supabase) return
  const { error } = await supabase.from('games').delete().eq('id', id)
  if (error) console.error('[db] deleteGame error:', error)
}