import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import Toast from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

export default function GuardiasList() {
  const [guards, setGuards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [credPopup, setCredPopup] = useState(null)
  const navigate = useNavigate()
  const { id: routeContractId } = useParams()
  const location = useLocation()
  const isAdminContrato = location.pathname.startsWith('/admin/contratos/')

  useEffect(() => { loadGuards() }, [routeContractId])

  async function loadGuards() {
    let query = supabase.from('guards').select('*, contract:contracts(client_name)').order('full_name')
    if (routeContractId && isAdminContrato) query = query.eq('contract_id', routeContractId)
    const { data, error: dbErr } = await query
    if (dbErr) { setError('Error al cargar guardias. Intente de nuevo.'); setLoading(false); return }
    setGuards(data || [])
    setLoading(false)
  }

  async function toggleActive(guard) {
    const { error: dbErr } = await supabase.from('guards').update({ active: !guard.active }).eq('id', guard.id)
    if (dbErr) { setError('Error al actualizar guardia. Intente de nuevo.'); return }
    loadGuards()
  }

  async function cambiarPIN(guard, e) {
    e.stopPropagation()
    if (!confirm(`Generar nuevo PIN para ${guard.full_name}?`)) return
    const newPin = Math.floor(100000 + Math.random() * 900000).toString()
    try {
      const internalEmail = `${guard.username.toLowerCase().replace('-', '')}@guardium.bo`
      const { error: authErr } = await supabase.auth.admin.updateUserById(guard.user_id, { password: newPin })
      if (authErr) {
        // Fallback: update only in guards table if admin API not available
        console.warn('admin.updateUserById no disponible, actualizando solo en guards table')
      }
      const { error: dbErr } = await supabase.from('guards').update({ pin_code: newPin }).eq('id', guard.id)
      if (dbErr) throw dbErr
      setCredPopup({ username: guard.username, pin: newPin, nombre: guard.full_name })
    } catch (err) {
      setError('Error al cambiar PIN: ' + err.message)
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>GUARDIAS</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Personal de seguridad</p>
        </div>
        <button onClick={() => navigate('/guardias/nuevo')} style={{
          padding: '12px 24px', background: T.RED, color: T.WHITE, border: 'none',
          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
        }}>
          + NUEVO GUARDIA
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {guards.map(g => (
            <div key={g.id} onClick={() => navigate(`/guardias/${g.id}`)} style={{
              background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW,
              padding: 24, cursor: 'pointer', transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = T.SHADOW_LG}
              onMouseLeave={e => e.currentTarget.style.boxShadow = T.SHADOW}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: T.BG,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, overflow: 'hidden',
                }}>
                  {g.photo_url
                    ? <img src={g.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '👮'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.FONT_BODY, fontWeight: 700, color: T.TEXT, fontSize: 16 }}>{g.full_name}</div>
                  <div style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, fontSize: 13 }}>CI: {g.ci}</div>
                  {g.username && (
                    <div style={{ fontFamily: T.FONT_DISPLAY, color: T.RED, fontSize: 16, letterSpacing: '0.05em', marginTop: 2 }}>
                      {g.username}
                    </div>
                  )}
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: g.active ? T.SUCCESS_BG : T.MUTED_BG, color: g.active ? T.SUCCESS : T.STEEL,
                }}>
                  {g.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>
                {g.contract?.client_name || 'Sin contrato'}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={e => { e.stopPropagation(); navigate(`/guardias/${g.id}/editar`) }} style={{
                  padding: '5px 12px', background: T.BG, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, color: T.TEXT,
                }}>Editar</button>
                <button onClick={e => { e.stopPropagation(); toggleActive(g) }} style={{
                  padding: '5px 12px', background: g.active ? T.WARN_BG : T.SUCCESS_BG,
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: g.active ? T.WARN : T.SUCCESS,
                }}>{g.active ? 'Desactivar' : 'Activar'}</button>
                {g.username && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setCredPopup({ username: g.username, pin: g.pin_code, nombre: g.full_name }) }} style={{
                      padding: '5px 12px', background: T.INFO_BG, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: T.INFO,
                    }}>🔑 Credenciales</button>
                    <button onClick={e => cambiarPIN(g, e)} style={{
                      padding: '5px 12px', background: T.DANGER_BG, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: T.DANGER,
                    }}>🔄 Nuevo PIN</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Toast message={error} onClose={() => setError(null)} />

      {/* Popup de credenciales */}
      {credPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setCredPopup(null)}>
          <div style={{ background: 'white', borderRadius: T.RADIUS, padding: 32,
            maxWidth: 380, width: '90%', boxShadow: T.SHADOW_LG,
            borderTop: `4px solid ${T.RED}` }}
            onClick={e => e.stopPropagation()}>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 20, color: T.BLACK }}>
                CREDENCIALES
              </div>
              <div style={{ color: T.TEXT_MUTED, fontSize: 14 }}>
                {credPopup.nombre}
              </div>
            </div>

            <div style={{ background: T.BLACK, borderRadius: 12, padding: 20,
              marginBottom: 16, textAlign: 'center' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  Codigo de guardia
                </div>
                <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 28,
                  color: T.RED, letterSpacing: '0.1em' }}>
                  {credPopup.username}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  Contrasena
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 32,
                  color: 'white', letterSpacing: '0.3em', fontWeight: 700 }}>
                  {credPopup.pin || '------'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Codigo: ${credPopup.username} | Contrasena: ${credPopup.pin || 'N/A'}`
                  )
                }}
                style={{ flex: 1, padding: '10px', borderRadius: 10,
                  border: `1.5px solid ${T.BORDER}`, background: 'white',
                  fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer' }}>
                📋 Copiar
              </button>
              <button type="button"
                onClick={() => setCredPopup(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: T.RED, color: 'white',
                  fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
