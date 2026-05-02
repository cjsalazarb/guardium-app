import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const LK = {
  BG: '#0a0a0a',
  RED: '#cc0000',
  RED_HOVER: '#e60000',
  RED_ACTIVE: '#aa0000',
  WHITE: '#ffffff',
  MUTED: '#666666',
  INPUT_BG: 'rgba(255,255,255,0.04)',
  INPUT_BORDER: 'rgba(255,255,255,0.10)',
  INPUT_FOCUS: 'rgba(180,0,0,0.60)',
  CARD_BG: 'rgba(15,15,15,0.95)',
  CARD_BORDER: 'rgba(180,0,0,0.35)',
  FONT_DISPLAY: "'Rajdhani', sans-serif",
  FONT_BODY: "'Barlow', sans-serif",
}

const cornerSize = 16
const cornerStyle = (pos) => {
  const base = { position: 'absolute', width: cornerSize, height: cornerSize }
  const border = `2px solid ${LK.RED}`
  if (pos === 'tl') return { ...base, top: 8, left: 8, borderTop: border, borderLeft: border }
  if (pos === 'tr') return { ...base, top: 8, right: 8, borderTop: border, borderRight: border }
  if (pos === 'bl') return { ...base, bottom: 8, left: 8, borderBottom: border, borderLeft: border }
  return { ...base, bottom: 8, right: 8, borderBottom: border, borderRight: border }
}

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export default function Login() {
  const [loginMode, setLoginMode] = useState('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [guardCode, setGuardCode] = useState('')
  const [guardPin, setGuardPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, contract_id')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'superadmin') navigate('/dashboard')
        else if (profile?.role === 'admin') navigate('/admin/contratos')
        else if (profile?.role === 'guardia') navigate('/tablet')
        else navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  const handleGuardiaSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const codigoLimpio = guardCode.trim().toUpperCase()
      console.log('Buscando guardia:', codigoLimpio, 'PIN:', guardPin)

      // Paso 1: buscar por username solamente
      const { data: guard, error: findError } = await supabase
        .from('guards')
        .select('id, full_name, username, pin_code, contract_id, active, contracts(client_name)')
        .eq('username', codigoLimpio)
        .single()

      console.log('Guardia encontrado:', guard, 'Error:', findError)

      if (findError || !guard) {
        throw new Error('Codigo de guardia no encontrado')
      }
      // Paso 2: comparar PIN manualmente
      if (String(guard.pin_code).trim() !== String(guardPin).trim()) {
        throw new Error('Contrasena incorrecta')
      }
      if (!guard.active) {
        throw new Error('Guardia inactivo — contacte al administrador')
      }

      localStorage.setItem('guardium_guard_session', JSON.stringify({
        type: 'guardia',
        guard_id: guard.id,
        full_name: guard.full_name,
        username: guard.username,
        contract_id: guard.contract_id,
        contract_name: guard.contracts?.client_name,
        logged_at: new Date().toISOString(),
      }))

      navigate('/tablet')
    } catch (err) {
      console.error('Login error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputBase = {
    width: '100%',
    padding: '12px 14px 12px 40px',
    background: LK.INPUT_BG,
    border: `1px solid ${LK.INPUT_BORDER}`,
    borderRadius: 3,
    color: LK.WHITE,
    fontSize: 14,
    fontFamily: LK.FONT_BODY,
    fontWeight: 400,
    outline: 'none',
    marginBottom: 12,
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s',
  }

  const handleFocus = (e) => {
    e.target.style.borderColor = LK.INPUT_FOCUS
    e.target.style.background = 'rgba(255,255,255,0.06)'
  }
  const handleBlur = (e) => {
    e.target.style.borderColor = LK.INPUT_BORDER
    e.target.style.background = LK.INPUT_BG
  }

  const inputWrapper = { position: 'relative', width: '100%' }
  const iconPos = {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: LK.WHITE, pointerEvents: 'none', display: 'flex', marginTop: -6,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: LK.BG,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: LK.FONT_BODY,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Tactical grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg, rgba(180,0,0,0.07) 0px, transparent 1px, transparent 40px),
          repeating-linear-gradient(90deg, rgba(180,0,0,0.07) 0px, transparent 1px, transparent 40px)
        `,
        pointerEvents: 'none',
      }} />

      {/* Radial red glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle, rgba(160,0,0,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 380,
        margin: '0 24px',
        background: LK.CARD_BG,
        border: `1px solid ${LK.CARD_BORDER}`,
        borderRadius: 4,
        position: 'relative',
        zIndex: 1,
        padding: '40px 32px 28px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #cc0000, transparent)',
          borderRadius: '4px 4px 0 0',
        }} />

        {/* Corner brackets */}
        <div style={cornerStyle('tl')} />
        <div style={cornerStyle('tr')} />
        <div style={cornerStyle('bl')} />
        <div style={cornerStyle('br')} />

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <h1 style={{
            fontFamily: LK.FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 700,
            color: LK.WHITE,
            margin: 0,
            letterSpacing: 4,
            lineHeight: 1,
          }}>
            GUARDIUM
          </h1>
        </div>

        {/* Subtitle */}
        <p style={{
          fontFamily: LK.FONT_BODY,
          fontSize: 10,
          fontWeight: 500,
          color: LK.RED,
          margin: '6px 0 0 0',
          letterSpacing: 4,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          SEGURIDAD PRIVADA
        </p>

        {/* Separator */}
        <div style={{
          width: '100%',
          height: 1,
          background: 'rgba(255,255,255,0.05)',
          margin: '24px 0 20px',
        }} />

        {/* Tabs Admin / Guardia */}
        <div style={{
          display: 'flex',
          width: '100%',
          marginBottom: 24,
          border: '1px solid rgba(180,0,0,0.3)',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          {['admin', 'guardia'].map(mode => (
            <button key={mode} type="button"
              onClick={() => { setLoginMode(mode); setError('') }}
              style={{
                flex: 1,
                padding: '9px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: LK.FONT_BODY,
                fontWeight: 500,
                fontSize: 12,
                letterSpacing: 2,
                textTransform: 'uppercase',
                background: loginMode === mode ? LK.RED : 'transparent',
                color: loginMode === mode ? LK.WHITE : LK.MUTED,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (loginMode !== mode) e.currentTarget.style.background = 'rgba(180,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                if (loginMode !== mode) e.currentTarget.style.background = 'transparent'
              }}
            >
              {mode === 'admin' ? 'ADMIN' : 'GUARDIA'}
            </button>
          ))}
        </div>

        {/* Admin form */}
        {loginMode === 'admin' && (
          <form onSubmit={handleAdminSubmit} style={{ width: '100%' }}>
            <div style={inputWrapper}>
              <div style={iconPos}><UserIcon /></div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ ...inputBase, '::placeholder': { color: '#444' } }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div style={inputWrapper}>
              <div style={iconPos}><LockIcon /></div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...inputBase, marginBottom: 20 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(220,38,38,0.15)',
                border: '1px solid rgba(220,38,38,0.4)',
                borderRadius: 3,
                padding: '10px 14px',
                color: '#fca5a5',
                fontSize: 13,
                marginBottom: 16,
                fontFamily: LK.FONT_BODY,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 0',
                background: loading ? LK.RED_ACTIVE : LK.RED,
                color: LK.WHITE,
                fontFamily: LK.FONT_DISPLAY,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: 3,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, transform 0.1s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = LK.RED_HOVER }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = LK.RED }}
              onMouseDown={(e) => { if (!loading) { e.currentTarget.style.background = LK.RED_ACTIVE; e.currentTarget.style.transform = 'scale(0.99)' } }}
              onMouseUp={(e) => { if (!loading) { e.currentTarget.style.background = LK.RED_HOVER; e.currentTarget.style.transform = 'scale(1)' } }}
            >
              {loading ? 'INGRESANDO...' : 'INGRESAR'}
            </button>
          </form>
        )}

        {/* Guardia form */}
        {loginMode === 'guardia' && (
          <form onSubmit={handleGuardiaSubmit} style={{ width: '100%' }}>
            <div style={inputWrapper}>
              <div style={iconPos}><UserIcon /></div>
              <input
                type="text"
                placeholder="Codigo de guardia (ej: GRD-001)"
                value={guardCode}
                onChange={(e) => setGuardCode(e.target.value.toUpperCase())}
                required
                style={{ ...inputBase, fontFamily: LK.FONT_DISPLAY, fontSize: 16, letterSpacing: 2, textAlign: 'center', paddingLeft: 40 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div style={inputWrapper}>
              <div style={iconPos}><LockIcon /></div>
              <input
                type="password"
                placeholder="Contrasena (6 digitos)"
                value={guardPin}
                onChange={(e) => setGuardPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                style={{ ...inputBase, fontFamily: 'monospace', fontSize: 18, letterSpacing: '0.3em', textAlign: 'center', marginBottom: 20, paddingLeft: 40 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(220,38,38,0.15)',
                border: '1px solid rgba(220,38,38,0.4)',
                borderRadius: 3,
                padding: '10px 14px',
                color: '#fca5a5',
                fontSize: 13,
                marginBottom: 16,
                fontFamily: LK.FONT_BODY,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 0',
                background: loading ? LK.RED_ACTIVE : LK.RED,
                color: LK.WHITE,
                fontFamily: LK.FONT_DISPLAY,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: 3,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, transform 0.1s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = LK.RED_HOVER }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = LK.RED }}
              onMouseDown={(e) => { if (!loading) { e.currentTarget.style.background = LK.RED_ACTIVE; e.currentTarget.style.transform = 'scale(0.99)' } }}
              onMouseUp={(e) => { if (!loading) { e.currentTarget.style.background = LK.RED_HOVER; e.currentTarget.style.transform = 'scale(1)' } }}
            >
              {loading ? 'INGRESANDO...' : 'INGRESAR AL PORTAL'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={{
          width: '100%',
          height: 1,
          background: 'rgba(255,255,255,0.05)',
          margin: '24px 0 16px',
        }} />
        <p style={{
          fontFamily: LK.FONT_BODY,
          fontSize: 11,
          color: '#333',
          letterSpacing: 1,
          textTransform: 'uppercase',
          textAlign: 'center',
          margin: 0,
        }}>
          Sistema de Seguridad &bull; Acceso Autorizado
        </p>
      </div>

      {/* Global placeholder color override */}
      <style>{`
        input::placeholder { color: #444 !important; }
      `}</style>
    </div>
  )
}
