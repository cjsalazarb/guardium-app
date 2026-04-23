import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { T } from '../styles/tokens'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
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
        else if (profile?.role === 'admin') navigate('/admin/dashboard')
        else if (profile?.role === 'guardia') navigate('/tablet')
        else navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.PRIMARY,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: T.FONT_BODY,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Patron geometrico sutil */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(30deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%),
          linear-gradient(150deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%),
          linear-gradient(30deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%),
          linear-gradient(150deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%),
          linear-gradient(60deg, rgba(255,255,255,0.02) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,0.02) 75%),
          linear-gradient(60deg, rgba(255,255,255,0.02) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,0.02) 75%)
        `,
        backgroundSize: '80px 140px',
        backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo escudo */}
        <div style={{ marginBottom: 16 }}>
          <svg width="60" height="68" viewBox="0 0 36 40" fill="none">
            <path d="M18 0L36 8V20C36 31.05 27.72 37.08 18 40C8.28 37.08 0 31.05 0 20V8L18 0Z" fill={T.ACCENT} />
            <path d="M18 4L32 10.5V20C32 29 25 34.5 18 37C11 34.5 4 29 4 20V10.5L18 4Z" fill={T.PRIMARY} />
            <text x="18" y="26" textAnchor="middle" fill={T.ACCENT} fontFamily={T.FONT_DISPLAY} fontSize="16" fontWeight="bold">G</text>
          </svg>
        </div>

        {/* Titulo */}
        <h1 style={{
          fontFamily: T.FONT_DISPLAY,
          fontSize: 72,
          fontWeight: 'bold',
          color: T.WHITE,
          margin: 0,
          letterSpacing: '0.05em',
          lineHeight: 1,
        }}>
          GUARDIUM
        </h1>

        {/* Subtitulo */}
        <p style={{
          fontFamily: T.FONT_DISPLAY,
          fontSize: 28,
          color: T.ACCENT,
          margin: '4px 0 0 0',
          letterSpacing: '0.15em',
        }}>
          SEGURIDAD PRIVADA
        </p>

        {/* Separador */}
        <div style={{
          width: '100%',
          height: 1,
          background: 'rgba(255,255,255,0.15)',
          margin: '32px 0',
        }} />

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: T.RADIUS_SM,
              color: T.WHITE,
              fontSize: 16,
              fontFamily: T.FONT_BODY,
              outline: 'none',
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: T.RADIUS_SM,
              color: T.WHITE,
              fontSize: 16,
              fontFamily: T.FONT_BODY,
              outline: 'none',
              marginBottom: 20,
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.2)',
              border: '1px solid rgba(220,38,38,0.5)',
              borderRadius: T.RADIUS_SM,
              padding: '10px 14px',
              color: '#fca5a5',
              fontSize: 14,
              marginBottom: 16,
              fontFamily: T.FONT_BODY,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 0',
              background: loading ? '#d97706' : T.ACCENT,
              color: T.BLACK,
              fontFamily: T.FONT_DISPLAY,
              fontSize: 20,
              fontWeight: 'bold',
              letterSpacing: '0.05em',
              border: 'none',
              borderRadius: T.RADIUS_SM,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#d97706' }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = T.ACCENT }}
          >
            {loading ? 'INGRESANDO...' : 'INGRESAR'}
          </button>
        </form>
      </div>
    </div>
  )
}
