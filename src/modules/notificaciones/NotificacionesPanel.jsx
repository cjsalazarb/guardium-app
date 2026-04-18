import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { T } from '../../styles/tokens'

const TYPE_ICONS = {
  incidente: '\u{1F6A8}',
  novedad: '\u{1F4D3}',
  turno: '\u{1F553}',
  factura: '\u{1F4B0}',
  sistema: '\u{2699}\uFE0F',
  alerta: '\u{26A0}\uFE0F',
  visitante: '\u{1F6B6}',
}

function timeAgo(date) {
  if (!date) return ''
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`
  return new Date(date).toLocaleDateString('es-BO')
}

export default function NotificacionesPanel({ isOpen, onClose }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id && isOpen) {
      loadNotifications()

      const channel = supabase.channel(`notif-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, payload => {
          setNotifications(prev => [payload.new, ...prev])
        })
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
  }, [user?.id, isOpen])

  async function loadNotifications() {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
  }

  async function markAsRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    if (!user?.id) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          zIndex: 998, transition: 'opacity 0.2s',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '100vw',
        background: T.WHITE, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 999, display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.25s ease-out',
        fontFamily: T.FONT_BODY,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: `1px solid ${T.BORDER}`,
        }}>
          <div>
            <h2 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 24, color: T.TEXT, margin: 0 }}>NOTIFICACIONES</h2>
            {unreadCount > 0 && (
              <span style={{ fontSize: 12, color: T.TEXT_MUTED }}>{unreadCount} sin leer</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none', border: 'none', color: T.RED,
                  fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', padding: '6px 10px',
                }}
              >
                Marcar todo leido
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: T.BG, border: 'none', borderRadius: '50%',
                width: 36, height: 36, fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.TEXT_MUTED,
              }}
            >
              {'\u2715'}
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED }}>Cargando...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u{1F514}'}</div>
              No tienes notificaciones
            </div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markAsRead(n.id)}
              style={{
                padding: '14px 24px', display: 'flex', gap: 12, alignItems: 'flex-start',
                borderBottom: `1px solid ${T.BORDER}`,
                background: n.read ? T.WHITE : T.INFO_BG,
                cursor: n.read ? 'default' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <span style={{
                fontSize: 20, width: 36, height: 36, borderRadius: '50%',
                background: n.read ? T.BG : T.WHITE,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {TYPE_ICONS[n.type] || TYPE_ICONS.sistema}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: n.read ? 400 : 700, color: T.TEXT,
                  marginBottom: 2, lineHeight: 1.3,
                }}>
                  {n.title}
                </div>
                {n.body && (
                  <div style={{
                    fontSize: 13, color: T.TEXT_MUTED, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: 11, color: T.TEXT_LIGHT, marginTop: 4 }}>
                  {timeAgo(n.created_at)}
                </div>
              </div>
              {!n.read && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: T.RED,
                  flexShrink: 0, marginTop: 6,
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

// Bell icon component with unread count badge
export function NotificationBell({ onClick }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user?.id) {
      loadCount()

      const channel = supabase.channel(`bell-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => setUnreadCount(prev => prev + 1))
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => loadCount())
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
  }, [user?.id])

  async function loadCount() {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setUnreadCount(count || 0)
  }

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', background: 'none', border: 'none',
        cursor: 'pointer', padding: 8, fontSize: 22, lineHeight: 1,
        color: T.TEXT,
      }}
    >
      {'\u{1F514}'}
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          background: T.RED, color: T.WHITE,
          fontSize: 10, fontWeight: 800, fontFamily: T.FONT_BODY,
          minWidth: 18, height: 18, borderRadius: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', lineHeight: 1,
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
