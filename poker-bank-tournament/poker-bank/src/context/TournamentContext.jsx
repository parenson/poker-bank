import React, { createContext, useContext, useReducer } from 'react'

const INITIAL = {
  // Setup
  name: '',
  date: new Date().toISOString().split('T')[0],
  gameType: 'tournament',

  // Structure
  startingChips: '10000',
  rebuyChips: '10000',
  addonChips: '15000',
  buyInAmount: '100',
  rebuyAmount: '100',
  addonAmount: '50',
  dealerFeePerPlayer: '20',
  dealerTipPercent: '10',

  // Duration
  durationHours: '4',
  durationMinutes: '0',
  roundMinutes: '',      // blank = auto-calculate
  startTime: '',         // HH:MM, optional

  // Rebuys
  rebuyLevels: '4',      // rebuys allowed through level N
  addonAtBreak: true,    // add-on available once at the break after rebuy period

  // Payouts
  payoutPlaces: [
    { place: 1, pct: 50 },
    { place: 2, pct: 30 },
    { place: 3, pct: 20 },
  ],

  // Generated blind structure (after setup confirmed)
  blindLevels: [],
  roundMinutesCalc: 20,

  // Live clock state
  clockRunning: false,
  clockStartedAt: null,   // Date.now() when clock was last started
  elapsedSeconds: 0,      // accumulated seconds before last pause
  playersRemaining: 0,

  // Players
  players: [],            // [{ id, name, initials, venmoHandle, buyInCount, rebuyCount, addonCount, cashOut, eliminated, finishPlace }]

  // Settlement
  settlement: null,

  // Screen within tournament flow
  screen: 'setup',        // 'setup' | 'players' | 'clock' | 'results'
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET': return { ...state, ...action.payload }
    case 'SET_SCREEN': return { ...state, screen: action.screen }

    case 'SET_BLIND_LEVELS':
      return { ...state, blindLevels: action.levels, roundMinutesCalc: action.roundMinutes }

    case 'ADD_PLAYER':
      return { ...state, players: [...state.players, action.player] }
    case 'UPDATE_PLAYER':
      return { ...state, players: state.players.map(p => p.id === action.id ? { ...p, ...action.payload } : p) }
    case 'REMOVE_PLAYER':
      return { ...state, players: state.players.filter(p => p.id !== action.id) }

    case 'SET_REBUY':
      return {
        ...state,
        players: state.players.map(p => p.id === action.id
          ? { ...p, rebuyCount: Math.max(0, p.rebuyCount + action.delta) } : p)
      }
    case 'SET_ADDON':
      return {
        ...state,
        players: state.players.map(p => p.id === action.id
          ? { ...p, addonCount: p.addonCount === 0 ? 1 : 0 } : p) // toggle — max 1
      }
    case 'ELIMINATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p => p.id === action.id
          ? { ...p, eliminated: true, finishPlace: action.place } : p)
      }
    case 'SET_PLAYERS_REMAINING':
      return { ...state, playersRemaining: action.count }

    case 'START_CLOCK':
      return { ...state, clockRunning: true, clockStartedAt: action.now }
    case 'PAUSE_CLOCK':
      return {
        ...state,
        clockRunning: false,
        elapsedSeconds: state.elapsedSeconds + Math.floor((Date.now() - state.clockStartedAt) / 1000),
        clockStartedAt: null,
      }
    case 'RESET_CLOCK':
      return { ...state, clockRunning: false, clockStartedAt: null, elapsedSeconds: 0 }

    case 'SET_SETTLEMENT':
      return { ...state, settlement: action.settlement }

    case 'RESET':
      return { ...INITIAL, date: new Date().toISOString().split('T')[0] }

    case 'SET_PAYOUT_PLACES':
      return { ...state, payoutPlaces: action.places }

    default: return state
  }
}

const TournamentContext = createContext(null)

export function TournamentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  return <TournamentContext.Provider value={{ state, dispatch }}>{children}</TournamentContext.Provider>
}

export function useTournament() {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider')
  return ctx
}
