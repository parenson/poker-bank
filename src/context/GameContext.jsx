import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { initials } from '../utils/settlement.js'

// ─── Initial State ─────────────────────────────────────────────────────────────
const initialSetup = {
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
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

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
