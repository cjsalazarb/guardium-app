import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import Toast from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

const TABS = [
  { key: 'guardias', label: 'Guardias' },
  { key: 'turnos', label: 'Turnos' },
  { key: 'novedades', label: 'Novedades' },
  { key: 'visitantes', label: 'Visitantes' },
  { key: 'contratistas', label: 'Contratistas' },
  { key: 'vehiculos', label: 'Vehiculos' },
  { key: 'paquetes', label: 'Paquetes' },
  { key: 'incidentes', label: 'Incidentes' },
  { key: 'facturacion', label: 'Facturacion' },
]

const STATUS_FLOW = { abierto: 'en_revision', en_revision: 'cerrado' }

export default function AdminContratoDetalle() {
  const { id: contractId } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [kpis, setKpis] = useState({ guards: 0, shiftsToday: 0, openIncidents: 0 })
  const [activeTab, setActiveTab] = useState('guardias')
  const [tabData, setTabData] = useState([])
  const [tabLoading, setTabLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({})
  const [guards, setGuards] = useState([])

  useEffect(() => { loadContract() }, [contractId])
  useEffect(() => { loadTabData() }, [activeTab, contractId])

  async function loadContract() {
    const [cRes, gRes, sRes, iRes] = await Promise.all([
      supabase.from('contracts').select('*').eq('id', contractId).single(),
      supabase.from('guards').select('id', { count: 'exact', head: true }).eq('contract_id', contractId).eq('active', true),
      supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('contract_id', contractId).gte('start_time', new Date().toISOString().slice(0, 10) + 'T00:00:00'),
      supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('contract_id', contractId).eq('status', 'abierto'),
    ])
    if (cRes.data) setContract(cRes.data)
    setKpis({ guards: gRes.count || 0, shiftsToday: sRes.count || 0, openIncidents: iRes.count || 0 })
    // Load guards for forms
    const { data: gData } = await supabase.from('guards').select('id, full_name').eq('contract_id', contractId).eq('active', true)
    setGuards(gData || [])
    setLoading(false)
  }

  async function loadTabData() {
    setTabLoading(true)
    setShowForm(false)
    let query
    switch (activeTab) {
      case 'guardias':
        query = supabase.from('guards').select('*').eq('contract_id', contractId).order('full_name'); break
      case 'turnos':
        query = supabase.from('shifts').select('*, guard:guards(full_name)').eq('contract_id', contractId).order('start_time', { ascending: false }).limit(50); break
      case 'novedades':
        query = supabase.from('novelty_log').select('*, guard:guards(full_name)').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(50); break
      case 'visitantes':
        query = supabase.from('visitor_log').select('*').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(50); break
      case 'contratistas':
        query = supabase.from('contractor_log').select('*').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(50); break
      case 'vehiculos':
        query = supabase.from('vehicle_log').select('*').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(50); break
      case 'paquetes':
        query = supabase.from('package_log').select('*').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(50); break
      case 'incidentes':
        query = supabase.from('incident_reports').select('*, guard:guards(full_name)').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(50); break
      case 'facturacion':
        query = supabase.from('invoices').select('*').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(50); break
      default:
        setTabData([]); setTabLoading(false); return
    }
    const { data } = await query
    setTabData(data || [])
    setTabLoading(false)
  }

  function openCreate() {
    const defaults = {
      guardias: { full_name: '', ci: '', phone: '', active: true },
      turnos: { guard_id: '', start_date: '', end_date: '', start_hour: '06:00', end_hour: '18:00' },
      incidentes: { title: '', description: '', severity: 'medio', guard_name: '', location: '' },
      novedades: { content: '', guard_id: '' },
      visitantes: { full_name: '', ci: '', company: '', reason: '' },
      contratistas: { full_name: '', ci: '', company: '', reason: '' },
      vehiculos: { plate: '', driver_name: '', type: 'auto', reason: '' },
      paquetes: { description: '', sender: '', recipient: '' },
    }
    setForm(defaults[activeTab] || {})
    setShowForm(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    let tableName, payload
    switch (activeTab) {
      case 'guardias':
        tableName = 'guards'
        payload = { ...form, contract_id: contractId }
        break
      case 'turnos': {
        tableName = 'shifts'
        const turnos = []
        const current = new Date(form.start_date + 'T00:00:00')
        const end = new Date((form.end_date || form.start_date) + 'T00:00:00')
        while (current <= end) {
          const day = current.toISOString().split('T')[0]
          turnos.push({ guard_id: form.guard_id, contract_id: contractId, start_time: `${day}T${form.start_hour}:00`, end_time: `${day}T${form.end_hour}:00`, status: 'programado' })
          current.setDate(current.getDate() + 1)
        }
        const { error: tErr } = await supabase.from('shifts').insert(turnos)
        if (tErr) { setError('Error al crear turnos: ' + tErr.message); return }
        setShowForm(false); loadTabData(); return
      }
      case 'incidentes':
        tableName = 'incident_reports'
        payload = { ...form, contract_id: contractId, status: 'abierto' }
        break
      case 'novedades':
        tableName = 'novelty_log'
        payload = { content: form.content, guard_id: form.guard_id, contract_id: contractId }
        break
      case 'visitantes':
        tableName = 'visitor_log'
        payload = { ...form, contract_id: contractId, status: 'dentro' }
        break
      case 'contratistas':
        tableName = 'contractor_log'
        payload = { ...form, contract_id: contractId, status: 'dentro' }
        break
      case 'vehiculos':
        tableName = 'vehicle_log'
        payload = { ...form, contract_id: contractId, status: 'dentro' }
        break
      case 'paquetes':
        tableName = 'package_log'
        payload = { ...form, contract_id: contractId, status: 'pendiente' }
        break
      default: return
    }
    const { error: dbErr } = await supabase.from(tableName).insert(payload)
    if (dbErr) { setError('Error al crear: ' + dbErr.message); return }
    setShowForm(false)
    loadTabData()
    loadContract()
  }

  async function handleDelete(table, id) {
    const { error: dbErr } = await supabase.from(table).delete().eq('id', id)
    if (dbErr) { setError('Error al eliminar: ' + dbErr.message); return }
    loadTabData()
    loadContract()
  }

  async function advanceStatus(id, currentStatus) {
    const next = STATUS_FLOW[currentStatus]
    if (!next) return
    const { error: dbErr } = await supabase.from('incident_reports').update({ status: next }).eq('id', id)
    if (dbErr) { setError('Error al actualizar estado.'); return }
    loadTabData()
    loadContract()
  }

  const cellStyle = { padding: '10px 16px', fontSize: 13, fontFamily: T.FONT_BODY }
  const thStyle = { ...cellStyle, fontWeight: 600, color: T.TEXT_MUTED, textAlign: 'left', background: T.BG }
  const inputStyle = { width: '100%', padding: '8px 12px', border: `1px solid ${T.BORDER}`, borderRadius: 6, fontSize: 14, fontFamily: T.FONT_BODY, boxSizing: 'border-box' }
  const formLabel = { display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }

  const createLabels = { guardias: 'Guardia', turnos: 'Turno', incidentes: 'Incidente', novedades: 'Novedad', visitantes: 'Visitante', contratistas: 'Contratista', vehiculos: 'Vehiculo', paquetes: 'Paquete' }
  const canCreate = ['guardias', 'turnos', 'incidentes', 'novedades', 'visitantes', 'contratistas', 'vehiculos', 'paquetes'].includes(activeTab)
  const tableMap = { guardias: 'guards', turnos: 'shifts', incidentes: 'incident_reports', novedades: 'novelty_log', visitantes: 'visitor_log', contratistas: 'contractor_log', vehiculos: 'vehicle_log', paquetes: 'package_log', facturacion: 'invoices' }

  function renderForm() {
    if (!showForm) return null
    return (
      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24, marginBottom: 16 }}>
        <h4 style={{ fontFamily: T.FONT_DISPLAY, margin: '0 0 16px', color: T.TEXT }}>NUEVO {(createLabels[activeTab] || '').toUpperCase()}</h4>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {activeTab === 'guardias' && <>
              <div><label style={formLabel}>Nombre completo *</label><input style={inputStyle} value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
              <div><label style={formLabel}>CI</label><input style={inputStyle} value={form.ci || ''} onChange={e => setForm(f => ({ ...f, ci: e.target.value }))} /></div>
              <div><label style={formLabel}>Telefono</label><input style={inputStyle} value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </>}
            {activeTab === 'turnos' && <>
              <div><label style={formLabel}>Guardia *</label><select style={inputStyle} value={form.guard_id || ''} onChange={e => setForm(f => ({ ...f, guard_id: e.target.value }))} required><option value="">Seleccionar</option>{guards.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}</select></div>
              <div />
              <div><label style={formLabel}>Fecha inicio *</label><input type="date" style={inputStyle} value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: f.end_date || e.target.value }))} required /></div>
              <div><label style={formLabel}>Fecha fin *</label><input type="date" style={inputStyle} value={form.end_date || ''} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required /></div>
              <div><label style={formLabel}>Hora entrada</label><input type="time" style={inputStyle} value={form.start_hour || '06:00'} onChange={e => setForm(f => ({ ...f, start_hour: e.target.value }))} required /></div>
              <div><label style={formLabel}>Hora salida</label><input type="time" style={inputStyle} value={form.end_hour || '18:00'} onChange={e => setForm(f => ({ ...f, end_hour: e.target.value }))} required /></div>
            </>}
            {activeTab === 'incidentes' && <>
              <div><label style={formLabel}>Titulo *</label><input style={inputStyle} value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
              <div><label style={formLabel}>Severidad</label><select style={inputStyle} value={form.severity || 'medio'} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}><option value="bajo">Bajo</option><option value="medio">Medio</option><option value="alto">Alto</option><option value="critico">Critico</option></select></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={formLabel}>Descripcion</label><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </>}
            {activeTab === 'novedades' && <>
              <div><label style={formLabel}>Guardia *</label><select style={inputStyle} value={form.guard_id || ''} onChange={e => setForm(f => ({ ...f, guard_id: e.target.value }))} required><option value="">Seleccionar</option>{guards.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}</select></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={formLabel}>Contenido *</label><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.content || ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required /></div>
            </>}
            {['visitantes', 'contratistas'].includes(activeTab) && <>
              <div><label style={formLabel}>Nombre *</label><input style={inputStyle} value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
              <div><label style={formLabel}>CI</label><input style={inputStyle} value={form.ci || ''} onChange={e => setForm(f => ({ ...f, ci: e.target.value }))} /></div>
              <div><label style={formLabel}>Empresa</label><input style={inputStyle} value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
              <div><label style={formLabel}>Motivo</label><input style={inputStyle} value={form.reason || ''} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
            </>}
            {activeTab === 'vehiculos' && <>
              <div><label style={formLabel}>Placa *</label><input style={inputStyle} value={form.plate || ''} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} required /></div>
              <div><label style={formLabel}>Conductor</label><input style={inputStyle} value={form.driver_name || ''} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} /></div>
              <div><label style={formLabel}>Motivo</label><input style={inputStyle} value={form.reason || ''} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
            </>}
            {activeTab === 'paquetes' && <>
              <div><label style={formLabel}>Descripcion *</label><input style={inputStyle} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required /></div>
              <div><label style={formLabel}>Remitente</label><input style={inputStyle} value={form.sender || ''} onChange={e => setForm(f => ({ ...f, sender: e.target.value }))} /></div>
              <div><label style={formLabel}>Destinatario</label><input style={inputStyle} value={form.recipient || ''} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))} /></div>
            </>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '8px 20px', background: T.RED, color: T.WHITE, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: T.FONT_DISPLAY }}>CREAR</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', background: T.BG, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </form>
      </div>
    )
  }

  function renderTabContent() {
    if (tabLoading) return <div style={{ padding: 30, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
    if (tabData.length === 0) return <div style={{ padding: 30, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Sin registros</div>
    const delBtn = (table, id) => (
      <button onClick={() => handleDelete(table, id)} style={{ padding: '4px 10px', background: 'none', border: `1px solid ${T.DANGER}`, borderRadius: 4, cursor: 'pointer', fontSize: 11, color: T.DANGER }}>Eliminar</button>
    )

    switch (activeTab) {
      case 'guardias':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Nombre', 'CI', 'Telefono', 'Estado', 'Acciones'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>{tabData.map(g => (
              <tr key={g.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{g.full_name}</td>
                <td style={cellStyle}>{g.ci || '-'}</td>
                <td style={cellStyle}>{g.phone || '-'}</td>
                <td style={cellStyle}><span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: g.active ? T.SUCCESS_BG : T.MUTED_BG, color: g.active ? T.SUCCESS : T.MUTED }}>{g.active ? 'Activo' : 'Inactivo'}</span></td>
                <td style={cellStyle}>{delBtn('guards', g.id)}</td>
              </tr>
            ))}</tbody>
          </table>
        )
      case 'turnos':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Guardia', 'Inicio', 'Fin', 'Estado', 'Acciones'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>{tabData.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{s.guard?.full_name || '-'}</td>
                <td style={cellStyle}>{s.start_time ? new Date(s.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                <td style={cellStyle}>{s.end_time ? new Date(s.end_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                <td style={cellStyle}><span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: T.MUTED_BG, color: T.MUTED }}>{s.status}</span></td>
                <td style={cellStyle}>{delBtn('shifts', s.id)}</td>
              </tr>
            ))}</tbody>
          </table>
        )
      case 'incidentes':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Titulo', 'Severidad', 'Estado', 'Fecha', 'Acciones'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>{tabData.map(i => (
              <tr key={i.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{i.title}</td>
                <td style={cellStyle}>{i.severity}</td>
                <td style={cellStyle}>{i.status}</td>
                <td style={cellStyle}>{i.created_at ? new Date(i.created_at).toLocaleDateString() : '-'}</td>
                <td style={cellStyle}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {STATUS_FLOW[i.status] && <button onClick={() => advanceStatus(i.id, i.status)} style={{ padding: '4px 10px', background: T.INFO_BG, border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: T.INFO }}>Avanzar</button>}
                    {delBtn('incident_reports', i.id)}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )
      default:
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Registro', 'Fecha', 'Acciones'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>{tabData.map((r, idx) => (
              <tr key={r.id || idx} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{r.full_name || r.plate || r.description || r.content?.slice(0, 60) || r.guard?.full_name || r.invoice_number || '-'}</td>
                <td style={cellStyle}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                <td style={cellStyle}>{tableMap[activeTab] && r.id ? delBtn(tableMap[activeTab], r.id) : null}</td>
              </tr>
            ))}</tbody>
          </table>
        )
    }
  }

  if (loading) return <Layout><div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando contrato...</div></Layout>
  if (!contract) return <Layout><div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Contrato no encontrado</div></Layout>

  return (
    <Layout>
      {/* Header */}
      <button onClick={() => navigate('/admin/dashboard')} style={{
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.FONT_BODY,
        fontSize: 14, color: T.TEXT_MUTED, padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
      }}>{'\u2190'} Volver a mis contratos</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>{contract.client_name}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span style={{ padding: '4px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: contract.status === 'activo' ? T.SUCCESS_BG : T.MUTED_BG, color: contract.status === 'activo' ? T.SUCCESS : T.MUTED }}>{contract.status}</span>
            {contract.monthly_amount && <span style={{ padding: '4px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: T.INFO_BG, color: T.INFO }}>Bs. {Number(contract.monthly_amount).toLocaleString('es-BO')}/mes</span>}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Guardias activos', value: kpis.guards, color: T.SUCCESS },
          { label: 'Turnos hoy', value: kpis.shiftsToday, color: T.INFO },
          { label: 'Incidentes abiertos', value: kpis.openIncidents, color: kpis.openIncidents > 0 ? T.RED : T.STEEL },
        ].map(k => (
          <div key={k.label} style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 20, boxShadow: T.SHADOW }}>
            <div style={{ fontSize: 32, fontFamily: T.FONT_DISPLAY, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 13, fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `2px solid ${T.BORDER}`, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                color: activeTab === tab.key ? T.RED : T.TEXT_MUTED,
                borderBottom: activeTab === tab.key ? `2px solid ${T.RED}` : '2px solid transparent',
                marginBottom: -2,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action bar */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.TEXT, fontFamily: T.FONT_BODY }}>{tabData.length} registros</span>
          {canCreate && (
            <button onClick={openCreate} style={{
              padding: '8px 16px', background: T.RED, color: T.WHITE, border: 'none',
              borderRadius: 6, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 13,
            }}>+ NUEVO {(createLabels[activeTab] || '').toUpperCase()}</button>
          )}
        </div>

        {renderForm()}
        {renderTabContent()}
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </Layout>
  )
}
