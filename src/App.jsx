import React, { useEffect } from 'react'
import { GameProvider, useGame } from './context/GameContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { TournamentProvider } from './context/TournamentContext.jsx'
import Header from './components/Header.jsx'
import { Toast } from './components/UI.jsx'
import LoginScreen from './screens/LoginScreen.jsx'

import SetupScreen             from './screens/SetupScreen.jsx'
import PlayersScreen           from './screens/PlayersScreen.jsx'
import RebuysScreen            from './screens/RebuysScreen.jsx'
import CashOutScreen           from './screens/CashOutScreen.jsx'
import ResultsScreen           from './screens/ResultsScreen.jsx'
import HistoryScreen           from './screens/HistoryScreen.jsx'
import TournamentPlayersScreen from './screens/TournamentPlayersScreen.jsx'
import TournamentClockScreen   from './screens/TournamentClockScreen.jsx'
import TournamentResultsScreen from './screens/TournamentResultsScreen.jsx'

// Tournament sub-screens that hide the bottom nav tab bar
const TOURNAMENT_SCREENS = new Set(['tournament_players', 'tournament_clock', 'tournament_results'])

function AppInner() {
  const { state, dispatch } = useGame()
  const { session, loading, signOut } = useAuth()
  const { screen, toast } = state

  // Load saved data from Supabase once authenticated
  useEffect(() => {
    if (!session) return
    async function init() {
      try {
        const { loadPlayers, loadGames } = await import('./lib/db.js')
        const [players, games] = await Promise.all([loadPlayers(), loadGames()])
        dispatch({ type: 'SET_SAVED_PLAYERS', players })
        dispatch({ type: 'SET_SAVED_GAMES', games })
      } catch (e) {
        console.warn('[PokerBank] Could not load from Supabase:', e.message)
      }
    }
    init()
  }, [session])

  // Show splash while checking session
  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--felt)',
      }}>
        <div style={{
          fontFamily: 'Cinzel, serif', fontSize: 22,
          color: 'var(--gold-light)', letterSpacing: '0.04em', opacity: 0.7,
        }}>
          ♠ Poker Bank
        </div>
      </div>
    )
  }

  if (!session) return <LoginScreen />

  const screens = {
    setup:               <SetupScreen />,
    players:             <PlayersScreen />,
    rebuys:              <RebuysScreen />,
    cashout:             <CashOutScreen />,
    results:             <ResultsScreen />,
    history:             <HistoryScreen />,
    // Tournament sub-screens — navigated into from SetupScreen
    tournament_players:  <TournamentPlayersScreen />,
    tournament_clock:    <TournamentClockScreen />,
    tournament_results:  <TournamentResultsScreen />,
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', overflow: 'hidden',
    }}>
      <Header onSignOut={signOut} />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {screens[screen] ?? <SetupScreen />}
      </div>
      <Toast message={toast} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <GameProvider>
          <AppInner />
        </GameProvider>
      </TournamentProvider>
    </AuthProvider>
  )
}
