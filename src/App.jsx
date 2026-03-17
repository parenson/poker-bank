import React, { useEffect } from 'react'
import { GameProvider, useGame } from './context/GameContext.jsx'
import Header from './components/Header.jsx'
import { Toast } from './components/UI.jsx'

import SetupScreen   from './screens/SetupScreen.jsx'
import PlayersScreen from './screens/PlayersScreen.jsx'
import RebuysScreen  from './screens/RebuysScreen.jsx'
import CashOutScreen from './screens/CashOutScreen.jsx'
import ResultsScreen from './screens/ResultsScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'

function AppInner() {
  const { state, dispatch } = useGame()
  const { screen, toast } = state

  // Load saved players + games from Supabase on first mount
  useEffect(() => {
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
  }, [])

  const screens = {
    setup:   <SetupScreen />,
    players: <PlayersScreen />,
    rebuys:  <RebuysScreen />,
    cashout: <CashOutScreen />,
    results: <ResultsScreen />,
    history: <HistoryScreen />,
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', overflow: 'hidden',
    }}>
      <Header />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {screens[screen] ?? <SetupScreen />}
      </div>
      <Toast message={toast} />
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  )
}
