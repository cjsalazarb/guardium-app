import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import Toast from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { T } from '../../styles/tokens'

const TABS = [
  { key: 'guardias', label: 'Guardias', icon: '\uD83D\uDC6E' },
  { key: 'turnos', label: 'Turnos', icon: '\u23F0' },
  { key: 'incidentes', label: 'Incidentes', icon: '\uD83D\uDEA8' },
  { key: 'novedades', label: 'Novedades', icon: '\uD83D\uDCD3' },
  { key: 'visitantes', label: 'Visitantes', icon: '\uD83D\uDEB6' },
  { key: 'vehiculos', label: 'Vehiculos', icon: '\uD83D\uDE97' },
  { key: 'paquetes', label: 'Paquetes', icon: '\uD83D\uDCE6' },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [activeTab, setActiveTab] = useState('guardias')
  const [tabData, setTabData] = useState([])
  const [tabLoading, setTabLoading] = useState(false)
  const [filterContract, setFilterContract] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadContracts() }, [])
  useEffect(() => { loadTabData() }, [activeTab, filterContract])

  async function loadContracts() {
    const { data, error: dbErr } = await supabase
      .from('contracts')
      .select('*, guards:guards(id)')
      .order('client_name')
    if (dbErr) { setError('Error al cargar contratos.'); setLoading(false); return }
    setContracts(data || [])
    setLoading(false)
  }

  async function loadTabData() {
    setTabLoading(true)
    let query
    switch (activeTab) {
      case 'guardias':
        query = supabase.from('guards').select('*, contract:contracts(client_name)').order('full_name')
        if (filterContract) query = query.eq('contract_id', filterContract)
        break
      case 'turnos':
        query = supabase.from('shifts').select('*, guard:guards(full_name), contract:contracts(client_name)').order('start_time', { ascending: false }).limit(50)
        if (filterContract) query = query.eq('contract_id', filterContract)
        break
      case 'incidentes':
        query = supabase.from('incident_reports').select('*, guard:guards(full_name), contract:contracts(client_name)').order('created_at', { ascending: false }).limit(50)
        if (filterContract) query = query.eq('contract_id', filterContract)
        break
      case 'novedades':
        query = supabase.from('novelty_log').select('*, guard:guards(full_name), contract:contracts(client_name)').order('created_at', { ascending: false }).limit(50)
        if (filterContract) query = query.eq('contract_id', filterContract)
        break
      case 'visitantes':
        query = supabase.from('visitor_log').select('*, contract:contracts(client_name)').order('created_at', { ascending: false }).limit(50)
        if (filterContract) query = query.eq('contract_id', filterContract)
        break
      case 'vehiculos':
        query = supabase.from('vehicle_log').select('*, contract:contracts(client_name)').order('created_at', { ascending: false }).limit(50)
        if (filterContract) query = query.eq('contract_id', filterContract)
        break
      case 'paquetes':
        query = supabase.from('package_log').select('*, contract:contracts(client_name)').order('created_at', { ascending: false }).limit(50)
        if (filterContract) query = query.eq('contract_id', filterContract)
        break
      default:
        setTabData([])
        setTabLoading(false)
        return
    }
    const { data } = await query
    setTabData(data || [])
    setTabLoading(false)
  }

  const cellStyle = { padding: '10px 16px', fontSize: 13, fontFamily: T.FONT_BODY }
  const thStyle = { ...cellStyle, fontWeight: 600, color: T.TEXT_MUTED, textAlign: 'left', background: T.BG }

  function renderTabTable() {
    if (tabLoading) return <div style={{ padding: 30, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
    if (tabData.length === 0) return <div style={{ padding: 30, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Sin registros</div>

    switch (activeTab) {
      case 'guardias':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Nombre', 'CI', 'Contrato', 'Estado'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>{tabData.map(g => (
              <tr key={g.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{g.full_name}</td>
                <td style={cellStyle}>{g.ci || '-'}</td>
                <td style={cellStyle}>{g.contract?.client_name || '-'}</td>
                <td style={cellStyle}>
                  <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: g.active ? T.SUCCESS_BG : T.MUTED_BG, color: g.active ? T.SUCCESS : T.MUTED }}>
                    {g.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )
      case 'turnos':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Guardia', 'Contrato', 'Inicio', 'Fin', 'Estado'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>{tabData.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{s.guard?.full_name || '-'}</td>
                <td style={cellStyle}>{s.contract?.client_name || '-'}</td>
                <td style={cellStyle}>{s.start_time ? new Date(s.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                <td style={cellStyle}>{s.end_time ? new Date(s.end_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                <td style={cellStyle}><span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: T.MUTED_BG, color: T.MUTED }}>{s.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )
      case 'incidentes':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Titulo', 'Contrato', 'Guardia', 'Severidad', 'Estado', 'Fecha'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>{tabData.map(i => (
              <tr key={i.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{i.title}</td>
                <td style={cellStyle}>{i.contract?.client_name || '-'}</td>
                <td style={cellStyle}>{i.guard?.full_name || '-'}</td>
                <td style={cellStyle}><span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{i.severity}</span></td>
                <td style={cellStyle}>{i.status}</td>
                <td style={cellStyle}>{i.created_at ? new Date(i.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}</tbody>
          </table>
        )
      default:
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Registro', 'Contrato', 'Fecha'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>{tabData.map((r, idx) => (
              <tr key={r.id || idx} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{r.full_name || r.plate || r.description || r.content?.slice(0, 60) || r.guard?.full_name || '-'}</td>
                <td style={cellStyle}>{r.contract?.client_name || '-'}</td>
                <td style={cellStyle}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}</tbody>
          </table>
        )
    }
  }

  if (loading) return <Layout><div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div></Layout>

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>MIS CONTRATOS</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>
            Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}. Vista global de todos tus contratos.
          </p>
        </div>
        <button onClick={() => navigate('/contratos/nuevo')} style={{
          padding: '12px 24px', background: T.RED, color: T.WHITE, border: 'none',
          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 14,
        }}>+ NUEVO CONTRATO</button>
      </div>

      {/* Contract Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {contracts.map(c => (
          <div
            key={c.id}
            onClick={() => navigate(`/admin/contratos/${c.id}`)}
            style={{
              background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW,
              cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.15s',
              border: `1px solid ${T.BORDER}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = T.SHADOW; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, marginBottom: 8 }}>{c.client_name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                background: c.status === 'activo' ? T.SUCCESS_BG : T.MUTED_BG,
                color: c.status === 'activo' ? T.SUCCESS : T.MUTED,
              }}>{c.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.FONT_BODY, fontSize: 13, color: T.TEXT_MUTED }}>
              <span>{c.guards?.length || 0} guardias</span>
              {c.monthly_amount && <span>Bs. {Number(c.monthly_amount).toLocaleString('es-BO')}/mes</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Global Tabs (read-only) */}
      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `2px solid ${T.BORDER}`, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                color: activeTab === tab.key ? T.RED : T.TEXT_MUTED,
                borderBottom: activeTab === tab.key ? `2px solid ${T.RED}` : '2px solid transparent',
                marginBottom: -2,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Filtrar por contrato:</span>
          <select
            value={filterContract}
            onChange={e => setFilterContract(e.target.value)}
            style={{ padding: '6px 12px', border: `1px solid ${T.BORDER}`, borderRadius: 6, fontSize: 13, fontFamily: T.FONT_BODY }}
          >
            <option value="">Todos los contratos</option>
            {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
          </select>
          <span style={{ fontSize: 11, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, marginLeft: 'auto' }}>Solo lectura — para editar, entre a un contrato</span>
        </div>

        {/* Tab content */}
        {renderTabTable()}
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </Layout>
  )
}
