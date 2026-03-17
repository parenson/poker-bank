import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('[PokerBank] Supabase env vars not set — history/players will not persist.')
}

export const supabase = url && key ? createClient(url, key) : null
