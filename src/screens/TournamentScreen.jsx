import React from 'react'
import { TournamentProvider, useTournament } from '../context/TournamentContext.jsx'
import TournamentSetupScreen   from './TournamentSetupScreen.jsx'
import TournamentPlayersScreen from './TournamentPlayersScreen.jsx'
import TournamentClockScreen   from './TournamentClockScreen.jsx'
import TournamentResultsScreen from './TournamentResultsScreen.jsx'

function TournamentRouter({ onBack }) {
  const { state, dispatch } = useTournament()

  const STEPS = ['setup', 'players', 'clock', 'results']
  const stepIdx = STEPS.indexOf(state.screen)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Mini step indicator */}
      {state.screen !== 'results' && (
        <div style={{
          display: 'flex', gap: 4, padding: '10px 16px 0',
          flexShrink: 0,
        }}>
          {['Setup', 'Players', 'Clock', 'Results'].map((label, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= stepIdx ? 'var(--gold)' : 'rgba(201,168,76,0.2)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {state.screen === 'setup'   && <TournamentSetupScreen onBack={onBack} />}
        {state.screen === 'players' && <TournamentPlayersScreen />}
        {state.screen === 'clock'   && <TournamentClockScreen />}
        {state.screen === 'results' && <TournamentResultsScreen />}
      </div>
    </div>
  )
}

export default function TournamentScreen({ onBack }) {
  return (
    <TournamentProvider>
      <TournamentRouter onBack={onBack} />
    </TournamentProvider>
  )
}
