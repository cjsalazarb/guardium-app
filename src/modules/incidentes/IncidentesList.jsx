import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'
import { useAuth } from '../../lib/auth'

const SEVERITY_COLORS = {
  bajo: { bg: '#F1F5F9', color: '#94A3B8' },
  medio: { bg: '#FEF3C7', color: '#F59E0B' },
  alto: { bg: '#FFF7ED', color: '#F97316' },
  critico: { bg: '#FEE2E2', color: '#EF4444' },
}

const STATUS_FLOW = { abierto: 'en_revision', en_revision: 'cerrado' }
const STATUS_LABELS = { abierto: 'Abierto', en_revision: 'En revision', cerrado: 'Cerrado' }

export default function IncidentesList() {
  const { contractId } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [filterContract, setFilterContract] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', severity: 'medio', guard_name: '', location: '',
  })

  useEffect(() => { loadIncidents(); loadContracts() }, [filterContract, filterSeverity, filterStatus, filterDate])

  async function loadContracts() {
    const { data } = await supabase.from('contracts').select('id, client_name').order('client_name')
    setContracts(data || [])
  }

  async function loadIncidents() {
    let q = supabase.from('incidents').select('*, contract:contracts(client_name)').order('created_at', { ascending: false })
    if (filterContract) q = q.eq('contract_id', filterContract)
    if (filterSeverity) q = q.eq('severity', filterSeverity)
    if (filterStatus) q = q.eq('status', filterStatus)
    if (filterDate) {
      q = q.gte('created_at', filterDate + 'T00:00:00')
      q = q.lte('created_at', filterDate + 'T23:59:59')
    }
    const { data } = await q
    setIncidents(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      severity: form.severity,
      guard_name: form.guard_name.trim() || null,
      location: form.location.trim() || null,
      status: 'abierto',
      contract_id: contractId || null,
      created_at: new Date().toISOString(),
    }
    await supabase.from('incidents').insert(payload)
    setForm({ title: '', description: '', severity: 'medio', guard_name: '', location: '' })
    setShowForm(false)
    loadIncidents()
  }

  async function advanceStatus(incident) {
    const next = STATUS_FLOW[incident.status]
    if (!next) return
    const updates = { status: next }
    if (next === 'cerrado') updates.closed_at = new Date().toISOString()
    await supabase.from('incidents').update(updates).eq('id', incident.id)
    loadIncidents()
  }

  const selected = incidents.find(i => i.id === selectedId)
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
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>INCIDENTES</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Registro de incidentes de seguridad</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '12px 24px', background: T.RED, color: T.WHITE, border: 'none',
          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
        }}>
          {showForm ? 'CANCELAR' : '+ NUEVO INCIDENTE'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 22, color: T.TEXT, margin: '0 0 16px' }}>REGISTRAR INCIDENTE</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Titulo *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Descripcion</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Severidad</label>
              <select style={inputStyle} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
                <option value="critico">Critico</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Guardia reportante</label>
              <input style={inputStyle} value={form.guard_name} onChange={e => setForm({ ...form, guard_name: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Ubicacion</label>
              <input style={inputStyle} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={{
                padding: '12px 32px', background: T.SUCCESS, color: T.WHITE, border: 'none',
                borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
              }}>REGISTRAR INCIDENTE</button>
            </div>
          </form>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setSelectedId(null)}>
          <div style={{
            background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW_LG,
            padding: 32, maxWidth: 600, width: '90%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h2 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 28, color: T.TEXT, margin: 0 }}>{selected.title}</h2>
              <button onClick={() => setSelectedId(null)} style={{
                background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: T.TEXT_MUTED,
              }}>x</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{
                padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                background: (SEVERITY_COLORS[selected.severity] || SEVERITY_COLORS.medio).bg,
                color: (SEVERITY_COLORS[selected.severity] || SEVERITY_COLORS.medio).color,
                textTransform: 'uppercase',
              }}>{selected.severity}</span>
              <span style={{
                padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                background: selected.status === 'cerrado' ? T.SUCCESS_BG : selected.status === 'en_revision' ? T.WARN_BG : T.INFO_BG,
                color: selected.status === 'cerrado' ? T.SUCCESS : selected.status === 'en_revision' ? T.WARN : T.INFO,
                textTransform: 'uppercase',
              }}>{STATUS_LABELS[selected.status]}</span>
            </div>
            <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.TEXT, lineHeight: 1.6, marginBottom: 16 }}>
              {selected.description || 'Sin descripcion'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, marginBottom: 20 }}>
              <div><strong>Contrato:</strong> {selected.contract?.client_name || '-'}</div>
              <div><strong>Guardia:</strong> {selected.guard_name || '-'}</div>
              <div><strong>Ubicacion:</strong> {selected.location || '-'}</div>
              <div><strong>Fecha:</strong> {fmtDate(selected.created_at)}</div>
            </div>
            {STATUS_FLOW[selected.status] && (
              <button onClick={() => { advanceStatus(selected); setSelectedId(null) }} style={{
                padding: '10px 24px', background: T.RED, color: T.WHITE, border: 'none',
                borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 15,
              }}>CAMBIAR A {STATUS_LABELS[STATUS_FLOW[selected.status]].toUpperCase()}</button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterContract} onChange={e => setFilterContract(e.target.value)} style={{ ...inputStyle, width: 200 }}>
          <option value="">Todos los contratos</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">Todas las severidades</option>
          <option value="bajo">Bajo</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
          <option value="critico">Critico</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">Todos los estados</option>
          <option value="abierto">Abierto</option>
          <option value="en_revision">En revision</option>
          <option value="cerrado">Cerrado</option>
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inputStyle, width: 180 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
      ) : (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY, fontSize: 14 }}>
            <thead>
              <tr style={{ background: T.BG, borderBottom: `2px solid ${T.BORDER}` }}>
                {['Titulo', 'Contrato', 'Guardia', 'Severidad', 'Estado', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: T.TEXT, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: T.TEXT_MUTED }}>No se encontraron incidentes</td></tr>
              ) : incidents.map(i => {
                const sc = SEVERITY_COLORS[i.severity] || SEVERITY_COLORS.medio
                return (
                  <tr key={i.id} style={{ borderBottom: `1px solid ${T.BORDER}`, cursor: 'pointer' }}
                    onClick={() => setSelectedId(i.id)}
                    onMouseEnter={e => e.currentTarget.style.background = T.BG}
                    onMouseLeave={e => e.currentTarget.style.background = T.WHITE}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{i.title}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{i.contract?.client_name || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{i.guard_name || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: sc.bg, color: sc.color, textTransform: 'uppercase',
                      }}>{i.severity}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: i.status === 'cerrado' ? T.SUCCESS_BG : i.status === 'en_revision' ? T.WARN_BG : T.INFO_BG,
                        color: i.status === 'cerrado' ? T.SUCCESS : i.status === 'en_revision' ? T.WARN : T.INFO,
                        textTransform: 'uppercase',
                      }}>{STATUS_LABELS[i.status] || i.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>{fmtDate(i.created_at)}</td>
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
