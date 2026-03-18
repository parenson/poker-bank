import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

// Credential Management API helpers
const credMgmtSupported = () =>
  typeof window !== 'undefined' &&
  window.PasswordCredential !== undefined &&
  navigator.credentials !== undefined

async function saveCredentials(email, password) {
  if (!credMgmtSupported()) return
  try {
    const cred = new window.PasswordCredential({ id: email, password })
    await navigator.credentials.store(cred)
  } catch (e) {
    // Silently fail — not critical
    console.warn('Could not save credentials:', e)
  }
}

async function getSavedCredentials() {
  if (!credMgmtSupported()) return null
  try {
    const cred = await navigator.credentials.get({
      password: true,
      mediation: 'optional', // shows Face ID prompt if credentials saved
    })
    return cred // { id: email, password } or null
  } catch (e) {
    console.warn('Could not retrieve credentials:', e)
    return null
  }
}

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasSavedCreds, setHasSavedCreds] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  // On mount, silently check if saved credentials exist (mediation: 'silent')
  useEffect(() => {
    async function checkSaved() {
      if (!credMgmtSupported()) return
      try {
        const cred = await navigator.credentials.get({
          password: true,
          mediation: 'silent', // no UI — just checks if creds are saved
        })
        if (cred) {
          setHasSavedCreds(true)
          // Auto-sign-in silently on return visits
          await doSignIn(cred.id, cred.password, false)
        }
      } catch {
        // No saved creds or user hasn't saved yet
      }
    }
    checkSaved()
  }, [])

  const doSignIn = async (em, pw, saveCreds = true) => {
    setError('')
    setLoading(true)
    try {
      await signIn(em, pw)
      // Save to keychain (triggers "Save Password?" on iOS, protected by Face ID)
      if (saveCreds) await saveCredentials(em, pw)
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
      setBiometricLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    await doSignIn(email.trim(), password, true)
  }

  const handleFaceID = async () => {
    setBiometricLoading(true)
    setError('')
    const cred = await getSavedCredentials()
    if (!cred) {
      setBiometricLoading(false)
      setHasSavedCreds(false)
      setError('No saved credentials found. Please sign in with email and password first.')
      return
    }
    await doSignIn(cred.id, cred.password, false)
  }

  const faceIdSupported = credMgmtSupported()

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      background: 'var(--felt)',
      position: 'relative',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(201,168,76,0.09) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: 32, fontWeight: 700,
            color: 'var(--gold-light)', letterSpacing: '0.04em', marginBottom: 6,
          }}>
            ♠ Poker Bank
          </div>
          <div style={{ fontSize: 14, color: 'var(--cream-dim)' }}>
            Sign in to continue
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius)',
          padding: '28px 24px',
        }}>

          {/* Face ID button — shown prominently when creds are saved */}
          {faceIdSupported && hasSavedCreds && (
            <>
              <button
                onClick={handleFaceID}
                disabled={biometricLoading}
                style={{
                  width: '100%', padding: '16px',
                  background: biometricLoading
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--cream)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 16, fontWeight: 600,
                  cursor: biometricLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 12, marginBottom: 20,
                  transition: 'all 0.15s',
                }}
              >
                {/* Face ID icon (Apple-style) */}
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="8" height="3" rx="1.5" fill="var(--cream)" opacity="0.9"/>
                  <rect x="19" y="1" width="8" height="3" rx="1.5" fill="var(--cream)" opacity="0.9"/>
                  <rect x="1" y="24" width="8" height="3" rx="1.5" fill="var(--cream)" opacity="0.9"/>
                  <rect x="19" y="24" width="8" height="3" rx="1.5" fill="var(--cream)" opacity="0.9"/>
                  <circle cx="10" cy="11" r="1.5" fill="var(--cream)" opacity="0.9"/>
                  <circle cx="18" cy="11" r="1.5" fill="var(--cream)" opacity="0.9"/>
                  <line x1="14" y1="10" x2="14" y2="15" stroke="var(--cream)" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
                  <path d="M9.5 18.5 C10.5 20.5 13 21.5 14 21.5 C15 21.5 17.5 20.5 18.5 18.5" stroke="var(--cream)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9"/>
                </svg>
                {biometricLoading ? 'Authenticating…' : 'Sign in with Face ID'}
              </button>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
              }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>or use password</div>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              </div>
            </>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 500,
              color: 'var(--cream-dim)', marginBottom: 5, letterSpacing: '0.03em',
            }}>
              Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoComplete="username"
              inputMode="email"
              style={{ width: '100%' }}
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 500,
              color: 'var(--cream-dim)', marginBottom: 5, letterSpacing: '0.03em',
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoComplete="current-password"
              style={{ width: '100%' }}
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(224,82,82,0.12)',
              border: '1px solid rgba(224,82,82,0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}

          {/* Sign In button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '15px',
              background: loading
                ? 'rgba(201,168,76,0.4)'
                : 'linear-gradient(135deg, var(--gold) 0%, #b8903e 100%)',
              color: 'var(--felt)', border: 'none',
              borderRadius: 'var(--radius)',
              fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
              boxShadow: loading ? 'none' : '0 4px 18px rgba(201,168,76,0.28)',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {/* Face ID hint for first-time users */}
          {faceIdSupported && !hasSavedCreds && (
            <p style={{
              textAlign: 'center', fontSize: 12,
              color: 'var(--cream-dim)', marginTop: 14, opacity: 0.65,
            }}>
              After signing in, iOS will offer to save your credentials for Face ID on future visits.
            </p>
          )}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 20,
          fontSize: 12, color: 'var(--cream-dim)', opacity: 0.4,
        }}>
          Private app · Authorized users only
        </div>
      </div>
    </div>
  )
}
