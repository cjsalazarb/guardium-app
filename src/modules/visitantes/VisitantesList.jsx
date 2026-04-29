import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'
import { useAuth } from '../../lib/auth'

export default function VisitantesList() {
  const { contractId } = useAuth()
  const { id: routeContractId } = useParams()
  const location = useLocation()
  const isAdminContrato = location.pathname.startsWith('/admin/contratos/')
  const effectiveContractId = (isAdminContrato && routeContractId) ? routeContractId : null
  const [visitors, setVisitors] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterContract, setFilterContract] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState({ full_name: '', ci: '', reason: '', host_name: '' })

  useEffect(() => { loadVisitors(); loadContracts() }, [filterContract, filterDate, filterStatus, effectiveContractId])

  async function loadContracts() {
    const { data } = await supabase.from('contracts').select('id, client_name').order('client_name')
    setContracts(data || [])
  }

  async function loadVisitors() {
    let q = supabase.from('visitors').select('*, contract:contracts(client_name)').order('entry_time', { ascending: false })
    if (effectiveContractId) q = q.eq('contract_id', effectiveContractId)
    else if (filterContract) q = q.eq('contract_id', filterContract)
    if (filterDate) {
      q = q.gte('entry_time', filterDate + 'T00:00:00')
      q = q.lte('entry_time', filterDate + 'T23:59:59')
    }
    if (filterStatus === 'dentro') q = q.is('exit_time', null)
    if (filterStatus === 'fuera') q = q.not('exit_time', 'is', null)
    const { data } = await q
    setVisitors(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    const payload = {
      full_name: form.full_name.trim(),
      ci: form.ci.trim() || null,
      reason: form.reason.trim() || null,
      host_name: form.host_name.trim() || null,
      entry_time: new Date().toISOString(),
      contract_id: effectiveContractId || contractId || null,
    }
    await supabase.from('visitors').insert(payload)
    setForm({ full_name: '', ci: '', reason: '', host_name: '' })
    setShowForm(false)
    loadVisitors()
  }

  async function registerExit(id) {
    await supabase.from('visitors').update({ exit_time: new Date().toISOString() }).eq('id', id)
    loadVisitors()
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
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>VISITANTES</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Control de ingreso y salida</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '12px 24px', background: T.RED, color: T.WHITE, border: 'none',
          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
        }}>
          {showForm ? 'CANCELAR' : '+ REGISTRAR ENTRADA'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 22, color: T.TEXT, margin: '0 0 16px' }}>REGISTRAR VISITANTE</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Nombre completo *</label>
              <input style={inputStyle} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>CI</label>
              <input style={inputStyle} value={form.ci} onChange={e => setForm({ ...form, ci: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Motivo</label>
              <input style={inputStyle} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Anfitrion</label>
              <input style={inputStyle} value={form.host_name} onChange={e => setForm({ ...form, host_name: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={{
                padding: '12px 32px', background: T.SUCCESS, color: T.WHITE, border: 'none',
                borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
              }}>REGISTRAR ENTRADA</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {!isAdminContrato && (
          <select value={filterContract} onChange={e => setFilterContract(e.target.value)} style={{ ...inputStyle, width: 200 }}>
            <option value="">Todos los contratos</option>
            {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
          </select>
        )}
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inputStyle, width: 180 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">Todos</option>
          <option value="dentro">Dentro</option>
          <option value="fuera">Salio</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
      ) : (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY, fontSize: 14 }}>
            <thead>
              <tr style={{ background: T.BG, borderBottom: `2px solid ${T.BORDER}` }}>
                {['Nombre', 'CI', 'Motivo', 'Anfitrion', 'Entrada', 'Salida', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: T.TEXT, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visitors.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: T.TEXT_MUTED }}>No se encontraron visitantes</td></tr>
              ) : visitors.map(v => {
                const inside = !v.exit_time
                return (
                  <tr key={v.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.BG}
                    onMouseLeave={e => e.currentTarget.style.background = T.WHITE}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{v.full_name}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{v.ci || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{v.reason || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{v.host_name || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>{fmtDate(v.entry_time)}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>{fmtDate(v.exit_time)}</td>
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
                        <button onClick={() => registerExit(v.id)} style={{
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
