import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

const statusColors = {
  activo: { bg: T.SUCCESS_BG, color: T.SUCCESS },
  suspendido: { bg: T.WARN_BG, color: T.WARN },
  terminado: { bg: '#E5E7EB', color: T.STEEL },
}

export default function ContratoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [stats, setStats] = useState({ guards: 0, shifts: 0, incidents: 0 })
  const [tab, setTab] = useState('guardias')
  const [tabData, setTabData] = useState([])

  useEffect(() => {
    loadContract()
    loadStats()
  }, [id])

  useEffect(() => { loadTabData() }, [tab, id])

  async function loadContract() {
    const { data } = await supabase.from('contracts').select('*').eq('id', id).single()
    setContract(data)
  }

  async function loadStats() {
    const [g, s, i] = await Promise.all([
      supabase.from('guards').select('id', { count: 'exact', head: true }).eq('contract_id', id).eq('active', true),
      supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('contract_id', id).in('status', ['programado', 'activo']),
      supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('contract_id', id).eq('status', 'abierto'),
    ])
    setStats({ guards: g.count || 0, shifts: s.count || 0, incidents: i.count || 0 })
  }

  async function loadTabData() {
    let data = []
    if (tab === 'guardias') {
      const r = await supabase.from('guards').select('*').eq('contract_id', id).order('full_name')
      data = r.data || []
    } else if (tab === 'turnos') {
      const r = await supabase.from('shifts').select('*, guard:guards(full_name)').eq('contract_id', id).order('start_time', { ascending: false }).limit(20)
      data = r.data || []
    } else if (tab === 'incidentes') {
      const r = await supabase.from('incident_reports').select('*, guard:guards(full_name)').eq('contract_id', id).order('created_at', { ascending: false }).limit(20)
      data = r.data || []
    } else if (tab === 'facturacion') {
      const r = await supabase.from('invoices').select('*').eq('contract_id', id).order('period_year', { ascending: false }).order('period_month', { ascending: false })
      data = r.data || []
    }
    setTabData(data)
  }

  if (!contract) return <Layout><div style={{ padding: 40, textAlign: 'center', fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>Cargando...</div></Layout>

  const tabs = ['guardias', 'turnos', 'incidentes', 'facturacion']
  const sc = statusColors[contract.status] || {}

  return (
    <Layout>
      <button onClick={() => navigate('/contratos')} style={{ background: 'none', border: 'none', color: T.TEXT_MUTED, cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 14, marginBottom: 16 }}>
        ← Volver a contratos
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>{contract.client_name}</h1>
        <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: sc.bg, color: sc.color }}>{contract.status}</span>
        <span style={{ fontFamily: T.FONT_BODY, fontSize: 18, color: T.TEXT, fontWeight: 600, marginLeft: 'auto' }}>Bs. {contract.monthly_amount ? Number(contract.monthly_amount).toLocaleString() : '—'}/mes</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Guardias activos', value: stats.guards, color: T.SUCCESS },
          { label: 'Turnos esta semana', value: stats.shifts, color: T.INFO },
          { label: 'Incidentes abiertos', value: stats.incidents, color: stats.incidents > 0 ? T.RED : T.STEEL },
        ].map(s => (
          <div key={s.label} style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 20, boxShadow: T.SHADOW }}>
            <div style={{ fontSize: 32, fontFamily: T.FONT_DISPLAY, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.BORDER}` }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '14px 24px', border: 'none', cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 14, fontWeight: 600,
              background: tab === t ? T.WHITE : T.BG, color: tab === t ? T.RED : T.TEXT_MUTED,
              borderBottom: tab === t ? `2px solid ${T.RED}` : '2px solid transparent',
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ padding: 24 }}>
          {tabData.length === 0 ? (
            <p style={{ color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, textAlign: 'center', padding: 20 }}>Sin datos</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY, fontSize: 14 }}>
              <tbody>
                {tabData.map((item, i) => (
                  <tr key={item.id || i} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                    <td style={{ padding: '10px 0', color: T.TEXT }}>{item.full_name || item.title || `${item.period_month}/${item.period_year}`}</td>
                    <td style={{ padding: '10px 0', color: T.TEXT_MUTED }}>{item.ci || item.severity || (item.amount ? `Bs. ${Number(item.amount).toLocaleString()}` : '') || ''}</td>
                    <td style={{ padding: '10px 0', color: T.TEXT_MUTED }}>{item.status || (item.active !== undefined ? (item.active ? 'Activo' : 'Inactivo') : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}
