import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { T } from '../styles/tokens'
import { useAuth } from '../lib/auth'
import { NotificationBell } from '../modules/notificaciones/NotificacionesPanel'
import NotificacionesPanel from '../modules/notificaciones/NotificacionesPanel'

const modules = [
  { icon: '\u{1F3E0}', label: 'Dashboard', path: '/dashboard' },
  { icon: '\u{1F4CB}', label: 'Contratos', path: '/contratos' },
  { icon: '\u{1F46E}', label: 'Guardias', path: '/guardias' },
  { icon: '\u23F0', label: 'Turnos', path: '/turnos' },
  { icon: '\u{1F465}', label: 'Visitantes', path: '/visitantes' },
  { icon: '\u{1F697}', label: 'Vehiculos', path: '/vehiculos' },
  { icon: '\u{1F4E6}', label: 'Paquetes', path: '/paquetes' },
  { icon: '\u{1F6A8}', label: 'Incidentes', path: '/incidentes' },
  { icon: '\u{1F4D3}', label: 'Novedades', path: '/novedades' },
  { icon: '\u{1F527}', label: 'Contratistas', path: '/contratistas' },
  { icon: '\u{1F4BC}', label: 'Propuestas', path: '/propuestas' },
  { icon: '\u{1F4B3}', label: 'Facturacion', path: '/facturacion' },
]

const bottomItems = [
  { icon: '\u2699\uFE0F', label: 'Config', path: '/configuracion' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)

  const isActive = (path) => location.pathname.startsWith(path)

  const renderItem = (item) => {
    const active = isActive(item.path)
    return (
      <div
        key={item.path}
        onClick={() => navigate(item.path)}
        title={item.label}
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: T.RADIUS_SM,
          background: active ? T.RED : 'transparent',
          color: active ? T.WHITE : T.STEEL,
          fontSize: 22,
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: 4,
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = T.BLACK_SOFT
            e.currentTarget.style.color = '#ccc'
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = T.STEEL
          }
        }}
      >
        {item.icon}
      </div>
    )
  }

  return (
    <div style={{
      width: 68,
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      background: T.BLACK,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 16,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 24 }}>
        <svg width="36" height="40" viewBox="0 0 36 40" fill="none">
          <path d="M18 0L36 8V20C36 31.05 27.72 37.08 18 40C8.28 37.08 0 31.05 0 20V8L18 0Z" fill={T.RED} />
          <path d="M18 4L32 10.5V20C32 29 25 34.5 18 37C11 34.5 4 29 4 20V10.5L18 4Z" fill={T.BLACK} />
          <text x="18" y="25" textAnchor="middle" fill={T.RED} fontFamily={T.FONT_DISPLAY} fontSize="14" fontWeight="bold">G</text>
        </svg>
      </div>

      {/* Navigation modules */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {modules.map(renderItem)}
      </div>

      {/* Bottom items */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div onClick={() => setNotifOpen(true)} title="Notificaciones" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
          <NotificationBell />
        </div>
        {bottomItems.map(renderItem)}
        <div
          onClick={signOut}
          title="Salir"
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: T.RADIUS_SM,
            color: T.STEEL,
            fontSize: 22,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.BLACK_SOFT
            e.currentTarget.style.color = '#ccc'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = T.STEEL
          }}
        >
          {'\u{1F6AA}'}
        </div>
      </div>
      <NotificacionesPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
