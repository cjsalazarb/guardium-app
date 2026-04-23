import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'
import { useAuth } from '../../lib/auth'

function getPermitStatus(validUntil) {
  if (!validUntil) return { label: 'Sin fecha', bg: T.MUTED_BG, color: T.STEEL }
  const now = new Date()
  const expiry = new Date(validUntil)
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return { label: 'VENCIDO', bg: T.DANGER_BG, color: T.DANGER }
  if (diffDays < 7) return { label: 'POR VENCER', bg: T.WARN_BG, color: T.WARN }
  return { label: 'VIGENTE', bg: T.SUCCESS_BG, color: T.SUCCESS }
}

export default function ContratistasList() {
  const { contractId } = useAuth()
  const { id: routeContractId } = useParams()
  const location = useLocation()
  const isAdminContrato = location.pathname.startsWith('/admin/contratos/')
  const effectiveContractId = (isAdminContrato && routeContractId) ? routeContractId : null
  const [contractors, setContractors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchCI, setSearchCI] = useState('')
  const [form, setForm] = useState({
    full_name: '', company: '', ci: '', permit_type: 'obra', permit_valid_until: '',
  })

  useEffect(() => { loadContractors() }, [searchCI])

  async function loadContractors() {
    let q = supabase.from('contractors').select('*').order('entry_time', { ascending: false })
    if (effectiveContractId) q = q.eq('contract_id', effectiveContractId)
    if (searchCI.trim()) q = q.ilike('ci', `%${searchCI.trim()}%`)
    const { data } = await q
    setContractors(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    const payload = {
      full_name: form.full_name.trim(),
      company: form.company.trim() || null,
      ci: form.ci.trim() || null,
      permit_type: form.permit_type,
      permit_valid_until: form.permit_valid_until || null,
      entry_time: new Date().toISOString(),
      contract_id: contractId || null,
    }
    await supabase.from('contractors').insert(payload)
    setForm({ full_name: '', company: '', ci: '', permit_type: 'obra', permit_valid_until: '' })
    setShowForm(false)
    loadContractors()
  }

  async function registerExit(id) {
    await supabase.from('contractors').update({ exit_time: new Date().toISOString() }).eq('id', id)
    loadContractors()
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '-'
  const fmtDateOnly = (d) => d ? new Date(d).toLocaleDateString('es-BO') : '-'

  const permitTypes = [
    { value: 'obra', label: 'Obra' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'servicio', label: 'Servicio' },
    { value: 'otro', label: 'Otro' },
  ]

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${T.BORDER}`, borderRadius: T.RADIUS_SM,
    fontFamily: T.FONT_BODY, fontSize: 14, boxSizing: 'border-box', outline: 'none',
  }
  const labelStyle = { fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600, color: T.TEXT, marginBottom: 4, display: 'block' }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>CONTRATISTAS</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Control de acceso de contratistas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '12px 24px', background: T.RED, color: T.WHITE, border: 'none',
          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
        }}>
          {showForm ? 'CANCELAR' : '+ REGISTRAR CONTRATISTA'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 22, color: T.TEXT, margin: '0 0 16px' }}>REGISTRAR CONTRATISTA</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Nombre completo *</label>
              <input style={inputStyle} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Empresa</label>
              <input style={inputStyle} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>CI</label>
              <input style={inputStyle} value={form.ci} onChange={e => setForm({ ...form, ci: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Tipo de permiso</label>
              <select style={inputStyle} value={form.permit_type} onChange={e => setForm({ ...form, permit_type: e.target.value })}>
                {permitTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Vigencia del permiso</label>
              <input type="date" style={inputStyle} value={form.permit_valid_until}
                onChange={e => setForm({ ...form, permit_valid_until: e.target.value })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={{
                padding: '12px 32px', background: T.SUCCESS, color: T.WHITE, border: 'none',
                borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16, width: '100%',
              }}>REGISTRAR ENTRADA</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input placeholder="Buscar por CI..." value={searchCI}
          onChange={e => setSearchCI(e.target.value)}
          style={{ ...inputStyle, width: 300 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
      ) : (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY, fontSize: 14 }}>
            <thead>
              <tr style={{ background: T.BG, borderBottom: `2px solid ${T.BORDER}` }}>
                {['Nombre', 'Empresa', 'CI', 'Tipo permiso', 'Vigencia', 'Estado entrada', ''].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: T.TEXT, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contractors.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: T.TEXT_MUTED }}>No se encontraron contratistas</td></tr>
              ) : contractors.map(c => {
                const permit = getPermitStatus(c.permit_valid_until)
                const inside = !c.exit_time
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.BG}
                    onMouseLeave={e => e.currentTarget.style.background = T.WHITE}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.full_name}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{c.company || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{c.ci || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED, textTransform: 'capitalize' }}>{c.permit_type || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, color: T.TEXT_MUTED }}>{fmtDateOnly(c.permit_valid_until)}</span>
                        <span style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                          background: permit.bg, color: permit.color,
                        }}>{permit.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: inside ? T.SUCCESS_BG : T.MUTED_BG, color: inside ? T.SUCCESS : T.STEEL,
                      }}>
                        {inside ? 'DENTRO' : 'SALIO'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {inside && (
                        <button onClick={() => registerExit(c.id)} style={{
                          padding: '6px 16px', background: T.STEEL, color: T.WHITE, border: 'none',
                          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 12, fontWeight: 600,
                        }}>SALIDA</button>
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
