import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'
import { useAuth } from '../../lib/auth'

const STATUS_COLORS = {
  recibido: { bg: T.INFO_BG, color: T.INFO },
  entregado: { bg: T.SUCCESS_BG, color: T.SUCCESS },
  devuelto: { bg: '#E5E7EB', color: T.STEEL },
}

export default function PaquetesList() {
  const { contractId } = useAuth()
  const { id: routeContractId } = useParams()
  const location = useLocation()
  const isAdminContrato = location.pathname.startsWith('/admin/contratos/')
  const effectiveContractId = (isAdminContrato && routeContractId) ? routeContractId : null
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ recipient_name: '', sender: '', description: '' })

  useEffect(() => { loadPackages() }, [effectiveContractId])

  async function loadPackages() {
    let q = supabase.from('packages').select('*').order('received_at', { ascending: false })
    if (effectiveContractId) q = q.eq('contract_id', effectiveContractId)
    const { data } = await q
    setPackages(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.recipient_name.trim()) return
    const payload = {
      recipient_name: form.recipient_name.trim(),
      sender: form.sender.trim() || null,
      description: form.description.trim() || null,
      received_at: new Date().toISOString(),
      status: 'recibido',
      contract_id: contractId || null,
    }
    await supabase.from('packages').insert(payload)
    setForm({ recipient_name: '', sender: '', description: '' })
    setShowForm(false)
    loadPackages()
  }

  async function deliverPackage(id) {
    await supabase.from('packages').update({ status: 'entregado', delivered_at: new Date().toISOString() }).eq('id', id)
    loadPackages()
  }

  async function returnPackage(id) {
    await supabase.from('packages').update({ status: 'devuelto', delivered_at: new Date().toISOString() }).eq('id', id)
    loadPackages()
  }

  function isOverdue(pkg) {
    if (pkg.status !== 'recibido') return false
    const received = new Date(pkg.received_at)
    const now = new Date()
    return (now - received) > 48 * 60 * 60 * 1000
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '-'

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${T.BORDER}`, borderRadius: T.RADIUS_SM,
    fontFamily: T.FONT_BODY, fontSize: 14, boxSizing: 'border-box', outline: 'none',
  }
  const labelStyle = { fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600, color: T.TEXT, marginBottom: 4, display: 'block' }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>PAQUETES</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Control de paqueteria</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '12px 24px', background: T.RED, color: T.WHITE, border: 'none',
          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
        }}>
          {showForm ? 'CANCELAR' : '+ REGISTRAR PAQUETE'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 22, color: T.TEXT, margin: '0 0 16px' }}>REGISTRAR PAQUETE</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Destinatario *</label>
              <input style={inputStyle} value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Remitente</label>
              <input style={inputStyle} value={form.sender} onChange={e => setForm({ ...form, sender: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Descripcion</label>
              <input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={{
                padding: '12px 32px', background: T.SUCCESS, color: T.WHITE, border: 'none',
                borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
              }}>REGISTRAR PAQUETE</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
      ) : (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY, fontSize: 14 }}>
            <thead>
              <tr style={{ background: T.BG, borderBottom: `2px solid ${T.BORDER}` }}>
                {['Destinatario', 'Remitente', 'Descripcion', 'Estado', 'Recibido', 'Entregado', ''].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: T.TEXT, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: T.TEXT_MUTED }}>No se encontraron paquetes</td></tr>
              ) : packages.map(p => {
                const sc = STATUS_COLORS[p.status] || STATUS_COLORS.devuelto
                const overdue = isOverdue(p)
                return (
                  <tr key={p.id} style={{
                    borderBottom: `1px solid ${T.BORDER}`,
                    background: overdue ? T.WARN_BG : T.WHITE,
                  }}
                    onMouseEnter={e => { if (!overdue) e.currentTarget.style.background = T.BG }}
                    onMouseLeave={e => e.currentTarget.style.background = overdue ? T.WARN_BG : T.WHITE}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {p.recipient_name}
                      {overdue && (
                        <div style={{ fontSize: 11, color: T.WARN, fontWeight: 700, marginTop: 2 }}>
                          +48h sin entregar
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{p.sender || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{p.description || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: sc.bg, color: sc.color, textTransform: 'uppercase',
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>{fmtDate(p.received_at)}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>{fmtDate(p.delivered_at)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {p.status === 'recibido' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => deliverPackage(p.id)} style={{
                            padding: '6px 14px', background: T.SUCCESS, color: T.WHITE, border: 'none',
                            borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 12, fontWeight: 600,
                          }}>ENTREGAR</button>
                          <button onClick={() => returnPackage(p.id)} style={{
                            padding: '6px 14px', background: T.STEEL, color: T.WHITE, border: 'none',
                            borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 12, fontWeight: 600,
                          }}>DEVOLVER</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
