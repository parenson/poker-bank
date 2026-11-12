import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { initials, computeSettlement, buildSettlementGame } from '../utils/settlement.js'
import { TOURNAMENT_STORAGE_KEY } from './TournamentContext.jsx'

// ─── Initial State ─────────────────────────────────────────────────────────────
// Dealer fee is part of the buy-in (carved out of the first buy-in) for new
// games; reopened legacy games set this to false (fee charged on top).
const initialSetup = {
  venmoNote: '',            // description on Venmo links; blank = default ('Amalfi' / 'Poker')
  dealerFeeIncluded: true,
  tipMode: 'percent',       // 'percent' = % of winners' profit, 'chips' = players hand chips to the dealer
  dealerTipChips: '',       // value of tip chips the dealer holds (chips mode), entered at cash out
  name: '',
  date: new Date().toISOString().split('T')[0],
  gameType: 'home',
  buyInAmount: '',
  dealerUpfrontPerPlayer: '',
  dealerTipPercent: '10',
  dealerName: '',
  dealerVenmoHandle: '',
  bankerName: '',
  bankerVenmoHandle: '',
}

const INITIAL_STATE = {
  screen: 'setup',          // 'setup' | 'players' | 'rebuys' | 'cashout' | 'results' | 'history'
  setup: initialSetup,
  players: [],              // [{ id, name, initials, venmoHandle, buyInCount, rebuyCount, cashOut }]
  savedPlayers: [],         // from Supabase
  settlement: null,         // computed GameSettlement
  savedGames: [],           // from Supabase
  toast: null,
  editingGameId: null,      // set when reopened from history; saving updates this record instead of inserting a new one
}

// ─── Persistence ──────────────────────────────────────────────────────────────
// The in-progress game is mirrored to localStorage so a mobile browser killing
// the page mid-game doesn't lose it.
export const GAME_STORAGE_KEY = 'pokerbank.game.v1'

function loadInitialState() {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY)
    if (!raw) return INITIAL_STATE
    const p = JSON.parse(raw)
    if (!p || p.v !== 1 || !Array.isArray(p.players)) return INITIAL_STATE

    const setup = { ...initialSetup, ...p.setup }
    let screen = p.screen || 'setup'
    // Tournament screens only make sense if the tournament state was restored too.
    if (screen.startsWith('tournament') && !localStorage.getItem(TOURNAMENT_STORAGE_KEY)) {
      screen = 'setup'
    }
    // Recompute rather than trusting a stored settlement.
    const settlement = p.hadSettlement && p.players.length > 0
      ? computeSettlement(buildSettlementGame(setup), p.players)
      : null

    return {
      ...INITIAL_STATE,
      screen,
      setup,
      players: p.players,
      settlement,
      editingGameId: p.editingGameId ?? null,
    }
  } catch (e) {
    console.warn('[PokerBank] Could not restore saved game state:', e)
    return INITIAL_STATE
  }
}

function persistState(state) {
  try {
    // Only keep a game that has actually been started (has players), so an
    // untouched setup screen doesn't carry a stale date into a later day.
    if (state.players.length === 0 && !state.editingGameId) {
      localStorage.removeItem(GAME_STORAGE_KEY)
      return
    }
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
      v: 1,
      screen: state.screen,
      setup: state.setup,
      players: state.players,
      hadSettlement: !!state.settlement,
      editingGameId: state.editingGameId,
    }))
  } catch (e) {
    // Storage unavailable/full (e.g. private mode) — the app still works.
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen }

    case 'SET_SETUP':
      return { ...state, setup: { ...state.setup, ...action.payload } }

    case 'SET_PLAYERS':
      return { ...state, players: action.players }

    case 'ADD_PLAYER': {
      const p = action.player
      return { ...state, players: [...state.players, p] }
    }

    case 'UPDATE_PLAYER': {
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.id ? { ...p, ...action.payload } : p
        ),
      }
    }

    case 'REMOVE_PLAYER':
      return { ...state, players: state.players.filter(p => p.id !== action.id) }

    case 'SET_REBUY': {
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.id
            ? { ...p, rebuyCount: Math.max(0, (p.rebuyCount ?? 0) + action.delta) }
            : p
        ),
      }
    }

    case 'SET_CASHOUT': {
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.id ? { ...p, cashOut: action.value } : p
        ),
      }
    }

    case 'SET_SETTLEMENT':
      return { ...state, settlement: action.settlement }

    // Remember the id of a just-saved game so further saves update it
    // instead of inserting a duplicate.
    case 'SET_EDITING_GAME':
      return { ...state, editingGameId: action.id }

    // Reopen a saved game (from history) into editable state. `settlement`
    // is optional — pass it to jump straight to the results screen.
    case 'LOAD_GAME_FOR_EDIT':
      return {
        ...state,
        setup: action.setup,
        players: action.players,
        settlement: action.settlement ?? null,
        editingGameId: action.gameId,
      }

    case 'SET_SAVED_PLAYERS':
      return { ...state, savedPlayers: action.players }

    case 'SET_SAVED_GAMES':
      return { ...state, savedGames: action.games }

    case 'REMOVE_SAVED_GAME':
      return { ...state, savedGames: state.savedGames.filter(g => g.id !== action.id) }

    case 'SHOW_TOAST':
      return { ...state, toast: action.message }

    case 'CLEAR_TOAST':
      return { ...state, toast: null }

    case 'RESET_GAME':
      return {
        ...INITIAL_STATE,
        savedPlayers: state.savedPlayers,
        savedGames: state.savedGames,
      }

    default:
      return state
  }
}

// ─── Context & Hook ────────────────────────────────────────────────────────────
const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState)

  useEffect(() => {
    persistState(state)
  }, [state.screen, state.setup, state.players, state.settlement, state.editingGameId])

  const showToast = useCallback((message) => {
    dispatch({ type: 'SHOW_TOAST', message })
    setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 2600)
  }, [])

  const addBlankPlayer = useCallback(() => {
    dispatch({
      type: 'ADD_PLAYER',
      player: {
        id: 'p_' + Date.now(),
        name: '',
        initials: '',
        venmoHandle: '',
        buyInCount: 1,
        rebuyCount: 0,
        cashOut: '',
      },
    })
  }, [])

  const addSavedPlayer = useCallback((saved) => {
    dispatch({
      type: 'ADD_PLAYER',
      player: {
        ...saved,
        id: 'p_' + Date.now() + '_' + saved.id,
        buyInCount: 1,
        rebuyCount: 0,
        cashOut: '',
      },
    })
  }, [])

  const updatePlayer = useCallback((id, payload) => {
    if (payload.name !== undefined) {
      payload.initials = initials(payload.name)
    }
    dispatch({ type: 'UPDATE_PLAYER', id, payload })
  }, [])

  return (
    <GameContext.Provider value={{ state, dispatch, showToast, addBlankPlayer, addSavedPlayer, updatePlayer }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
