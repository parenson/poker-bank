import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    // Don't leave this user's in-progress game on the device for the next sign-in.
    try {
      localStorage.removeItem('pokerbank.game.v1')
      localStorage.removeItem('pokerbank.tournament.v1')
    } catch (e) { /* storage unavailable */ }
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
