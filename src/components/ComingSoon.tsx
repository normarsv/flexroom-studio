'use client'

import { useState, useEffect } from 'react'
import { BRAND } from '@/lib/constants'

function useCountdown(launchDate: string) {
  const target = launchDate
    ? new Date(launchDate).getTime()
    : Date.now() + 1000 * 60 * 60 * 24 * 30

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  let diff = Math.max(0, target - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24)); diff -= days * 1000 * 60 * 60 * 24
  const hours = Math.floor(diff / (1000 * 60 * 60)); diff -= hours * 1000 * 60 * 60
  const mins = Math.floor(diff / (1000 * 60)); diff -= mins * 1000 * 60
  const secs = Math.floor(diff / 1000)

  return [
    { value: String(days).padStart(2, '0'), label: 'Días' },
    { value: String(hours).padStart(2, '0'), label: 'Hrs' },
    { value: String(mins).padStart(2, '0'), label: 'Min' },
    { value: String(secs).padStart(2, '0'), label: 'Seg' },
  ]
}

export default function ComingSoon({ launchDate, password }: { launchDate: string; password: string }) {
  const countdown = useCountdown(launchDate)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [showLogin, setShowLogin] = useState(false)
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {}
    setSubmitted(true)
    setSubmitting(false)
  }

  function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loginPassword === password) {
      document.cookie = 'preview_access=1; path=/'
      window.location.href = '/es'
    } else {
      setLoginError(true)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Archivo+Black&family=Poppins:wght@400;500;600&display=swap');
        @keyframes float1 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(20px,-30px) rotate(8deg); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(-25px,25px) rotate(-6deg); } }
      `}</style>

      <div style={{
        width: '100%', minHeight: '100vh',
        background: 'linear-gradient(135deg, #F4EF71 0%, #E9E48A 35%, #C8C8C8 100%)',
        fontFamily: "'Poppins', sans-serif",
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px', boxSizing: 'border-box',
      }}>

        {/* Floating shapes */}
        <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'rgba(134,134,134,0.16)', top: -120, left: -140, animation: 'float1 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', bottom: -100, right: -80, animation: 'float2 16s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: 24, background: 'rgba(134,134,134,0.14)', transform: 'rotate(20deg)', top: 60, right: '12%', animation: 'float2 11s ease-in-out infinite' }} />

        {/* Preview access button */}
        <button
          onClick={() => { setShowLogin(true); setLoginError(false); setLoginPassword('') }}
          style={{ position: 'absolute', top: 20, right: 24, zIndex: 2, background: 'rgba(58,58,58,0.7)', color: '#F4EF71', border: 'none', borderRadius: 999, padding: '8px 16px', fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.03em' }}
        >
          Preview access
        </button>

        {/* Login modal */}
        {showLogin && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <form onSubmit={handleLoginSubmit} style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: '#3A3A3A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Acceso anticipado</div>
              <input
                type="password"
                autoFocus
                placeholder="Contraseña"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(false) }}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #ddd', fontSize: 15, fontFamily: "'Poppins', sans-serif", outline: 'none' }}
              />
              {loginError && <div style={{ fontSize: 13, color: '#c0392b' }}>Contraseña incorrecta.</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowLogin(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#3A3A3A', fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#3A3A3A', color: '#F4EF71', fontFamily: "'Poppins', sans-serif", fontWeight: 600, cursor: 'pointer' }}>Entrar</button>
              </div>
            </form>
          </div>
        )}

        {/* Main content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 28 }}>

            <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 'clamp(48px, 8vw, 84px)', letterSpacing: '-0.02em', color: '#3A3A3A', lineHeight: 1 }}>
              Flexroom
            </div>

            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(22px, 3.2vw, 34px)', color: '#868686', textTransform: 'uppercase', letterSpacing: '0.04em', maxWidth: 600 }}>
              Tu espacio, tu energía
            </div>

            <div style={{ width: 64, height: 4, background: '#868686', borderRadius: 2, margin: '4px 0' }} />

            <div style={{ fontSize: 18, color: '#5a5a5a', maxWidth: 520, lineHeight: 1.6 }}>
              Estamos preparando un nuevo espacio lleno de energía, dinamismo y flexibilidad. Muy pronto abrimos las puertas.
            </div>

            {/* Countdown */}
            <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {countdown.map((u) => (
                <div key={u.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(6px)', borderRadius: 16, padding: '16px 20px', minWidth: 76 }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: '#3A3A3A', lineHeight: 1 }}>{u.value}</div>
                  <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#868686', marginTop: 6 }}>{u.label}</div>
                </div>
              ))}
            </div>

            {/* Email form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, marginTop: 20, width: '100%', maxWidth: 440, flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitted}
                style={{ flex: 1, minWidth: 220, padding: '16px 20px', borderRadius: 999, border: 'none', fontSize: 16, fontFamily: "'Poppins', sans-serif", background: 'rgba(255,255,255,0.85)', color: '#3A3A3A', outline: 'none' }}
              />
              <button
                type="submit"
                disabled={submitted || submitting}
                style={{ padding: '16px 32px', borderRadius: 999, border: 'none', background: '#3A3A3A', color: '#F4EF71', fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, cursor: submitted ? 'default' : 'pointer', opacity: submitted ? 0.7 : 1 }}
              >
                {submitting ? '...' : 'Avísame'}
              </button>
            </form>

            {submitted && (
              <div style={{ fontSize: 14, color: '#3A3A3A', fontWeight: 500 }}>¡Gracias! Te avisaremos en cuanto abramos.</div>
            )}

            {/* Social links */}
            <div style={{ display: 'flex', gap: 18, marginTop: 24 }}>
              <a href={BRAND.instagram} target="_blank" rel="noopener noreferrer" style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(58,58,58,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4EF71" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
              </a>
            </div>

          </div>

      </div>
    </>
  )
}

