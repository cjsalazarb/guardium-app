import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import AdminContratoSidebar from '../../components/AdminContratoSidebar'
import Toast from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

function timeAgo(date) {
  if (!date) return ''
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'hace unos segundos'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

export default function AdminContratoDashboard() {
  const { id: contractId } = useParams()
  const [contract, setContract] = useState(null)
  const [kpis, setKpis] = useState({ guards: 0, shiftsToday: 0, openIncidents: 0, lastCheckin: null })
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (contractId) { loadAll() }
  }, [contractId])

  async function loadAll() {
    const today = new Date().toISOString().slice(0, 10)

    const [cRes, gRes, sRes, iRes, checkRes] = await Promise.all([
      supabase.from('contracts').select('*').eq('id', contractId).single(),
      supabase.from('guards').select('id', { count: 'exact', head: true }).eq('contract_id', contractId).eq('active', true),
      supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('contract_id', contractId).gte('start_time', today + 'T00:00:00'),
      supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('contract_id', contractId).eq('status', 'abierto'),
      supabase.from('shift_checkins').select('created_at, type, shift:shifts(guard:guards(full_name), contract_id)').order('created_at', { ascending: false }).limit(20),
    ])

    if (cRes.data) setContract(cRes.data)
    const filteredCheckin = (checkRes.data || []).find(c => c.shift?.contract_id === contractId)

    setKpis({
      guards: gRes.count || 0,
      shiftsToday: sRes.count || 0,
      openIncidents: iRes.count || 0,
      lastCheckin: filteredCheckin || null,
    })

    // Activity feed
    const [novelties, incidents] = await Promise.all([
      supabase.from('novelty_log').select('id, content, created_at, guard:guards(full_name)').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(5),
      supabase.from('incident_reports').select('id, title, severity, created_at, guard:guards(full_name)').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(5),
    ])

    const items = [
      ...(novelties.data || []).map(n => ({ icon: '\uD83D\uDCD3', text: n.content?.slice(0, 80) || 'Novedad', by: n.guard?.full_name, time: n.created_at })),
      ...(incidents.data || []).map(i => ({ icon: '\uD83D\uDEA8', text: `[${i.severity}] ${i.title}`, by: i.guard?.full_name, time: i.created_at })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
    setActivity(items)
    setLoading(false)
  }

  const kpiCards = [
    { label: 'Guardias activos', value: kpis.guards, color: T.SUCCESS },
    { label: 'Turnos hoy', value: kpis.shiftsToday, color: T.INFO },
    { label: 'Incidentes abiertos', value: kpis.openIncidents, color: kpis.openIncidents > 0 ? T.RED : T.STEEL },
    { label: 'Ultimo check-in', value: kpis.lastCheckin ? timeAgo(kpis.lastCheckin.created_at) : 'Sin datos', color: T.ACCENT },
  ]

  if (loading) {
    return (
      <div>
        <AdminContratoSidebar contractId={contractId} contractName="..." />
        <div style={{ marginLeft: 220, padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div>
      <AdminContratoSidebar contractId={contractId} contractName={contract?.client_name} />

      <div style={{ marginLeft: 220, minHeight: '100vh', background: T.BG, padding: '24px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>{contract?.client_name}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <span style={{ padding: '4px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: contract?.status === 'activo' ? T.SUCCESS_BG : T.MUTED_BG, color: contract?.status === 'activo' ? T.SUCCESS : T.MUTED }}>{contract?.status}</span>
            <span style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.TEXT_MUTED }}>{contract?.address || ''}</span>
            <span style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.TEXT_MUTED }}>{'\u2022'} {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {kpiCards.map(k => (
            <div key={k.label} style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 20, boxShadow: T.SHADOW }}>
              <div style={{ fontSize: 32, fontFamily: T.FONT_DISPLAY, color: k.color, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 13, fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Alert banner */}
        {kpis.openIncidents > 0 && (
          <div style={{ background: '#FEE2E2', borderRadius: T.RADIUS_SM, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, fontFamily: T.FONT_BODY, fontSize: 14, color: T.RED, fontWeight: 600, border: `1px solid #FECACA` }}>
            {'\uD83D\uDEA8'} {kpis.openIncidents} incidente{kpis.openIncidents > 1 ? 's' : ''} abierto{kpis.openIncidents > 1 ? 's' : ''} requiere{kpis.openIncidents === 1 ? '' : 'n'} atencion
          </div>
        )}

        {/* Last checkin */}
        {kpis.lastCheckin && (
          <div style={{ background: T.INFO_BG, borderRadius: T.RADIUS_SM, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, fontFamily: T.FONT_BODY, fontSize: 14 }}>
            <span>{'\u2705'}</span>
            <span style={{ color: T.INFO }}>Ultimo check-in: <strong>{kpis.lastCheckin.shift?.guard?.full_name || '-'}</strong> ({kpis.lastCheckin.type}) — {timeAgo(kpis.lastCheckin.created_at)}</span>
          </div>
        )}

        {/* Activity Feed */}
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 16px', fontSize: 22 }}>ACTIVIDAD RECIENTE</h3>
          {activity.length === 0 ? (
            <p style={{ color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Sin actividad reciente</p>
          ) : activity.map((a, i) => (
            <div key={i} style={{
              padding: '10px 0', borderBottom: i < activity.length - 1 ? `1px solid ${T.BORDER}` : 'none',
              fontFamily: T.FONT_BODY, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.TEXT }}>{a.text}</div>
                <div style={{ color: T.TEXT_MUTED, fontSize: 11, marginTop: 2 }}>{a.by || 'Sistema'} — {timeAgo(a.time)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </div>
  )
}
