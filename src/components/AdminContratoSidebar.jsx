import { useNavigate, useLocation } from 'react-router-dom'
import { T } from '../styles/tokens'
import { useAuth } from '../lib/auth'

const moduleItems = [
  { icon: '\uD83C\uDFE0', label: 'Dashboard', key: 'dashboard' },
  { icon: '\uD83D\uDC6E', label: 'Guardias', key: 'guardias' },
  { icon: '\u23F0', label: 'Turnos', key: 'turnos' },
  { icon: '\uD83D\uDCD3', label: 'Novedades', key: 'novedades' },
  { icon: '\uD83D\uDEB6', label: 'Visitantes', key: 'visitantes' },
  { icon: '\uD83D\uDD27', label: 'Contratistas', key: 'contratistas' },
  { icon: '\uD83D\uDE97', label: 'Vehiculos', key: 'vehiculos' },
  { icon: '\uD83D\uDCE6', label: 'Paquetes', key: 'paquetes' },
  { icon: '\uD83D\uDEA8', label: 'Incidentes', key: 'incidentes' },
  { icon: '\uD83D\uDCB3', label: 'Facturacion', key: 'facturacion' },
]

export default function AdminContratoSidebar({ contractId, contractName }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()

  const basePath = `/admin/contratos/${contractId}`
  const isActive = (key) => {
    if (key === 'dashboard') return location.pathname === `${basePath}/dashboard`
    return location.pathname === `${basePath}/${key}`
  }

  return (
    <div style={{
      width: 220, position: 'fixed', left: 0, top: 0, bottom: 0,
      background: T.BLACK, display: 'flex', flexDirection: 'column',
      paddingBottom: 16, zIndex: 100, overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 12px' }}>
        <svg width="28" height="32" viewBox="0 0 36 40" fill="none">
          <path d="M18 0L36 8V20C36 31.05 27.72 37.08 18 40C8.28 37.08 0 31.05 0 20V8L18 0Z" fill={T.RED} />
          <path d="M18 4L32 10.5V20C32 29 25 34.5 18 37C11 34.5 4 29 4 20V10.5L18 4Z" fill={T.BLACK} />
          <text x="18" y="25" textAnchor="middle" fill={T.RED} fontFamily="Bebas Neue" fontSize="14" fontWeight="bold">G</text>
        </svg>
        <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, color: 'white', letterSpacing: '0.05em' }}>GUARDIUM</span>
      </div>

      {/* Back link */}
      <div
        onClick={() => navigate('/admin/contratos')}
        style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontFamily: T.FONT_BODY, color: '#A8A8A8', display: 'flex', alignItems: 'center', gap: 6 }}
        onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
        onMouseLeave={e => e.currentTarget.style.color = '#A8A8A8'}
      >
        {'\u2190'} Mis contratos
      </div>

      {/* Contract name */}
      <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid #2a2a2a', marginBottom: 8 }}>
        <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 14, color: T.RED, letterSpacing: '0.03em' }}>{contractName || 'Contrato'}</div>
      </div>

      {/* Module items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 8px', gap: 2 }}>
        {moduleItems.map(item => {
          const active = isActive(item.key)
          return (
            <div
              key={item.key}
              onClick={() => navigate(`${basePath}/${item.key}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                transition: 'all 0.18s',
                background: active ? T.RED : 'transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#2C2C2C' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 18, width: 28, flexShrink: 0, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: active ? '#FFF' : '#A8A8A8', whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>
          )
        })}
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '0 8px', gap: 2, borderTop: '1px solid #2a2a2a', paddingTop: 8 }}>
        <div onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#2C2C2C'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{'\uD83D\uDEAA'}</span>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: '#A8A8A8' }}>Salir</span>
        </div>
      </div>
    </div>
  )
}
