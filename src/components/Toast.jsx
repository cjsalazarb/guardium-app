import { T } from '../styles/tokens'

export default function Toast({ message, onClose }) {
  if (!message) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: T.RED, color: T.WHITE,
      padding: '12px 20px', borderRadius: T.RADIUS_SM,
      fontFamily: T.FONT_BODY, fontWeight: 700,
      boxShadow: T.SHADOW_LG, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 12,
      maxWidth: 420, fontSize: 14,
    }}>
      <span>⚠️ {message}</span>
      <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</span>
    </div>
  )
}
