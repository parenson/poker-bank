import React from 'react'
import { initials as makeInitials } from '../utils/settlement.js'

const styles = {
  // ── Layout
  screen: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px 96px',
    animation: 'fadeUp 0.24s ease both',
  },
  sectionHero: {
    textAlign: 'center',
    padding: '22px 8px 10px',
  },
  heroTitle: {
    fontFamily: 'Cinzel, serif',
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--gold-light)',
    letterSpacing: '0.03em',
    marginBottom: 4,
  },
  heroSub: {
    color: 'var(--cream-dim)',
    fontSize: 14,
  },

  // ── Card
  card: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius)',
    padding: '18px 16px',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'Cinzel, serif',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--gold)',
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  cardTitleBar: {
    width: 3, height: 13,
    background: 'var(--gold)',
    borderRadius: 2,
    flexShrink: 0,
  },

  // ── Buttons
  btnPrimary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '15px 20px',
    background: 'linear-gradient(135deg, var(--gold) 0%, #b8903e 100%)',
    color: 'var(--felt)', border: 'none',
    borderRadius: 'var(--radius)',
    fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 700,
    letterSpacing: '0.06em', cursor: 'pointer',
    transition: 'opacity 0.15s, transform 0.1s',
    boxShadow: '0 4px 18px rgba(201,168,76,0.28)',
    marginTop: 8,
  },
  btnSecondary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '12px 16px',
    background: 'rgba(201,168,76,0.10)',
    color: 'var(--gold-light)', border: '1px solid rgba(201,168,76,0.3)',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'background 0.15s',
    marginTop: 6,
  },
  btnDashed: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '11px 16px',
    background: 'transparent',
    color: 'var(--gold)', border: '1px dashed rgba(201,168,76,0.4)',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', transition: 'background 0.15s',
  },
  btnGhost: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'transparent', border: 'none',
    color: 'var(--cream-dim)', fontSize: 14,
    cursor: 'pointer', padding: '6px 0',
    fontFamily: 'DM Sans, sans-serif',
  },
  btnDanger: {
    background: 'rgba(224,82,82,0.12)',
    color: 'var(--danger)',
    border: '1px solid rgba(224,82,82,0.28)',
    borderRadius: 'var(--radius-xs)',
    padding: '6px 11px', fontSize: 18, lineHeight: 1,
    cursor: 'pointer',
  },

  // ── Field
  fieldGroup: { marginBottom: 13 },
  label: {
    display: 'block', fontSize: 12, fontWeight: 500,
    color: 'var(--cream-dim)', marginBottom: 5, letterSpacing: '0.03em',
  },
  row: { display: 'flex', gap: 10 },
  prefixWrap: { position: 'relative' },
  prefix: {
    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--gold)', fontSize: 14, fontWeight: 600, pointerEvents: 'none',
    zIndex: 1,
  },
  suffixWrap: { position: 'relative' },
  suffix: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--gold)', fontSize: 13, pointerEvents: 'none',
  },
  prefixInput: { paddingLeft: 24 },
  suffixInput: { paddingRight: 32 },
}

// ── Card wrapper
export function Card({ title, children, style }) {
  return (
    <div style={{ ...styles.card, ...style }}>
      {title && (
        <div style={styles.cardTitle}>
          <div style={styles.cardTitleBar} />
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Screen wrapper
export function Screen({ children }) {
  return <div style={styles.screen}>{children}</div>
}

// ── Section hero
export function Hero({ title, subtitle }) {
  return (
    <div style={styles.sectionHero}>
      <h2 style={styles.heroTitle}>{title}</h2>
      {subtitle && <p style={styles.heroSub}>{subtitle}</p>}
    </div>
  )
}

// ── Buttons
export function BtnPrimary({ children, onClick, disabled, style }) {
  return (
    <button
      style={{ ...styles.btnPrimary, ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}), ...style }}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {children}
    </button>
  )
}
export function BtnSecondary({ children, onClick, style }) {
  return <button style={{ ...styles.btnSecondary, ...style }} onClick={onClick}>{children}</button>
}
export function BtnDashed({ children, onClick }) {
  return <button style={styles.btnDashed} onClick={onClick}>{children}</button>
}
export function BtnGhost({ children, onClick }) {
  return <button style={styles.btnGhost} onClick={onClick}>{children}</button>
}
export function BtnDanger({ children, onClick }) {
  return <button style={styles.btnDanger} onClick={onClick}>{children}</button>
}

// ── Field + label
export function Field({ label, children, style }) {
  return (
    <div style={{ ...styles.fieldGroup, ...style }}>
      {label && <label style={styles.label}>{label}</label>}
      {children}
    </div>
  )
}

// ── Row layout
export function Row({ children, gap = 10 }) {
  return <div style={{ ...styles.row, gap }}>{children}</div>
}

// ── Prefix / suffix wrapped input
export function PrefixInput({ prefix, suffix, inputStyle, ...props }) {
  if (prefix) {
    return (
      <div style={styles.prefixWrap}>
        <span style={styles.prefix}>{prefix}</span>
        <input style={{ ...styles.prefixInput, ...inputStyle }} {...props} />
      </div>
    )
  }
  if (suffix) {
    return (
      <div style={styles.suffixWrap}>
        <span style={styles.suffix}>{suffix}</span>
        <input style={{ ...styles.suffixInput, ...inputStyle }} {...props} />
      </div>
    )
  }
  return <input {...props} />
}

// ── Avatar
export function Avatar({ name = '', size = 40, style }) {
  const text = name ? makeInitials(name) : '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--felt-light)', border: '2px solid var(--gold-dim)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cinzel, serif', fontSize: size * 0.34, fontWeight: 700,
      color: 'var(--gold-light)', flexShrink: 0,
      ...style,
    }}>
      {text}
    </div>
  )
}

// ── Divider
export function Divider({ style }) {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(201,168,76,0.13)', margin: '14px 0', ...style }} />
}

// ── Venmo button
export function VenmoBtn({ txn, handle, amount, note, label, variant = 'pay' }) {
  if (!handle) return null
  const colors = variant === 'request' ? '#c94040' : '#3d95ce'
  const handleClick = () => {
    const encoded = encodeURIComponent(note || 'Poker')
    const deepLink = `venmo://paycharge?txn=${txn}&recipients=${handle}&amount=${amount.toFixed(2)}&note=${encoded}`
    const fallback = `https://account.venmo.com/pay?recipients=${handle}&amount=${amount.toFixed(2)}&note=${encoded}`
    window.location.href = deepLink
    setTimeout(() => window.open(fallback, '_blank'), 1300)
  }
  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: colors, color: '#fff', border: 'none',
        borderRadius: 8, padding: '8px 13px',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif',
        transition: 'opacity 0.15s',
      }}
      onMouseDown={e => e.currentTarget.style.opacity = '0.8'}
      onMouseUp={e => e.currentTarget.style.opacity = '1'}
      onTouchStart={e => e.currentTarget.style.opacity = '0.8'}
      onTouchEnd={e => e.currentTarget.style.opacity = '1'}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.5 2.5c.7 1 1 2 1 3.2 0 4-3.4 9.2-6.2 12.8H6.8L4.5 3.7l5.3-.5 1.3 10.3c1.2-2 2.7-5.2 2.7-7.3 0-1.2-.2-2-.5-2.7z"/>
      </svg>
      {label}
    </button>
  )
}

// ── Toast
export function Toast({ message }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%',
      transform: `translateX(-50%) translateY(${message ? 0 : 20}px)`,
      background: 'rgba(10,28,18,0.92)',
      color: 'var(--cream)',
      padding: '9px 20px', borderRadius: 30, fontSize: 14,
      border: '1px solid rgba(201,168,76,0.3)',
      opacity: message ? 1 : 0,
      transition: 'all 0.28s ease',
      pointerEvents: 'none', zIndex: 9999,
      whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}

export { styles }
