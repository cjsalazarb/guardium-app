import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { T } from '../styles/tokens'
import { useAuth } from '../lib/auth'
import NotificacionesPanel from '../modules/notificaciones/NotificacionesPanel'

const menuItems = [
  { icon: '🏠', label: 'Dashboard',      path: '/dashboard' },
  { icon: '📋', label: 'Contratos',      path: '/contratos' },
  { icon: '👮', label: 'Guardias',       path: '/guardias' },
  { icon: '⏰', label: 'Turnos',         path: '/turnos' },
  { icon: '💼', label: 'Propuestas',     path: '/propuestas' },
  { icon: '💳', label: 'Facturación',    path: '/facturacion' },
  { icon: '🚨', label: 'Incidentes',     path: '/incidentes' },
  { icon: '📓', label: 'Novedades',      path: '/novedades' },
  { icon: '👥', label: 'Visitantes',     path: '/visitantes' },
  { icon: '🔧', label: 'Contratistas',   path: '/contratistas' },
  { icon: '🚗', label: 'Vehículos',      path: '/vehiculos' },
  { icon: '📦', label: 'Paquetes',       path: '/paquetes' },
]

const bottomItems = [
  { icon: '🔔', label: 'Notificaciones', action: 'notifications' },
  { icon: '⚙️', label: 'Configuración',  path: '/configuracion' },
  { icon: '🚪', label: 'Salir',          action: 'signout' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, signOut } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)

  const isActive = (path) => path && location.pathname.startsWith(path)

  // Admin sees their dashboard as home
  const effectiveMenuItems = role === 'admin'
    ? [{ icon: '\uD83C\uDFE0', label: 'Mis Contratos', path: '/admin/dashboard' }, ...menuItems.filter(m => m.path !== '/dashboard')]
    : menuItems

  const handleClick = (item) => {
    if (item.action === 'signout') return signOut()
    if (item.action === 'notifications') return setNotifOpen(true)
    if (item.path) navigate(item.path)
  }

  const renderItem = (item, i) => {
    const active = isActive(item.path)
    return (
      <div
        key={item.path || item.action || i}
        onClick={() => handleClick(item)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderRadius: 10,
          cursor: 'pointer',
          width: '100%',
          transition: 'all 0.18s',
          background: active ? T.RED : 'transparent',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = '#2C2C2C'
            e.currentTarget.querySelector('.sidebar-label').style.color = '#FFFFFF'
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.querySelector('.sidebar-label').style.color = '#A8A8A8'
          }
        }}
      >
        <span style={{ fontSize: 18, width: 28, flexShrink: 0, textAlign: 'center' }}>{item.icon}</span>
        <span className="sidebar-label" style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 13,
          fontWeight: 700,
          color: active ? '#FFFFFF' : '#A8A8A8',
          whiteSpace: 'nowrap',
        }}>{item.label}</span>
      </div>
    )
  }

  return (
    <div style={{
      width: 220,
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      background: T.BLACK,
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 16,
      zIndex: 100,
      overflowY: 'auto',
    }}>
      {/* Logo + nombre */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 16px 20px 16px',
        borderBottom: '1px solid #2a2a2a',
        marginBottom: 8,
      }}>
        <svg width="32" height="36" viewBox="0 0 36 40" fill="none">
          <path d="M18 0L36 8V20C36 31.05 27.72 37.08 18 40C8.28 37.08 0 31.05 0 20V8L18 0Z" fill={T.RED} />
          <path d="M18 4L32 10.5V20C32 29 25 34.5 18 37C11 34.5 4 29 4 20V10.5L18 4Z" fill={T.BLACK} />
          <text x="18" y="25" textAnchor="middle" fill={T.RED} fontFamily={T.FONT_DISPLAY} fontSize="14" fontWeight="bold">G</text>
        </svg>
        <span style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 20,
          color: 'white',
          letterSpacing: '0.05em',
        }}>GUARDIUM</span>
      </div>

      {/* Navigation modules */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 8px', gap: 2 }}>
        {effectiveMenuItems.map(renderItem)}
      </div>

      {/* Bottom items */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '0 8px', gap: 2, borderTop: '1px solid #2a2a2a', paddingTop: 8 }}>
        {bottomItems.map(renderItem)}
      </div>

      <NotificacionesPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
