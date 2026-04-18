import { useNavigate } from 'react-router-dom'
import { T } from '../styles/tokens'

export default function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: T.PRIMARY,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: T.FONT_BODY,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
        <h1 style={{
          fontFamily: T.FONT_DISPLAY,
          fontSize: 48,
          color: T.WHITE,
          margin: '0 0 8px 0',
        }}>
          ACCESO DENEGADO
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 16,
          margin: '0 0 32px 0',
        }}>
          No tienes permisos para acceder a esta seccion.
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '12px 32px',
            background: T.ACCENT,
            color: T.BLACK,
            fontFamily: T.FONT_DISPLAY,
            fontSize: 18,
            fontWeight: 'bold',
            border: 'none',
            borderRadius: T.RADIUS_SM,
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          VOLVER AL LOGIN
        </button>
      </div>
    </div>
  )
}
