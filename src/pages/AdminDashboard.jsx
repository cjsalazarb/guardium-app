import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { T } from '../styles/tokens'

function timeAgo(date) {
  if (!date) return ''
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'hace unos segundos'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

export default function AdminDashboard() {
  const { user, contractId } = useAuth()
  const [kpis, setKpis] = useState({
    guardsActive: 0, guardsTotal: 0, currentShift: null,
    openIncidents: 0, todayNovelties: 0, lastCheckin: null,
  })
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (contractId) {
      loadKpis()
      loadActivity()

      const channel = supabase.channel(`admin-rt-${contractId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'novelty_log', filter: `contract_id=eq.${contractId}` }, () => { loadKpis(); loadActivity() })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incident_reports', filter: `contract_id=eq.${contractId}` }, () => { loadKpis(); loadActivity() })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shift_checkins' }, () => { loadKpis(); loadActivity() })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `contract_id=eq.${contractId}` }, () => { loadKpis() })
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
  }, [contractId])

  async function loadKpis() {
    const today = new Date().toISOString().slice(0, 10)

    const [activeGuards, totalGuards, currentShift, openInc, todayNov, lastCheck] = await Promise.all([
      supabase.from('guards').select('id', { count: 'exact', head: true }).eq('contract_id', contractId).eq('active', true),
      supabase.from('guards').select('id', { count: 'exact', head: true }).eq('contract_id', contractId),
      supabase.from('shifts').select('*, guard:guards(full_name)').eq('contract_id', contractId).eq('status', 'en_curso').limit(1).maybeSingle(),
      supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('contract_id', contractId).eq('status', 'abierto'),
      supabase.from('novelty_log').select('id', { count: 'exact', head: true }).eq('contract_id', contractId).gte('created_at', today + 'T00:00:00'),
      supabase.from('shift_checkins').select('created_at, type, shift:shifts(guard:guards(full_name), contract_id)').order('created_at', { ascending: false }).limit(20),
    ])

    const filteredCheckin = (lastCheck.data || []).find(c => c.shift?.contract_id === contractId)

    setKpis({
      guardsActive: activeGuards.count || 0,
      guardsTotal: totalGuards.count || 0,
      currentShift: currentShift.data || null,
      openIncidents: openInc.count || 0,
      todayNovelties: todayNov.count || 0,
      lastCheckin: filteredCheckin || null,
    })
    setLoading(false)
  }

  async function loadActivity() {
    const [novelties, incidents, checkins] = await Promise.all([
      supabase.from('novelty_log').select('id, content, created_at, guard:guards(full_name)').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(5),
      supabase.from('incident_reports').select('id, title, severity, created_at, guard:guards(full_name)').eq('contract_id', contractId).order('created_at', { ascending: false }).limit(5),
      supabase.from('shift_checkins').select('id, type, created_at, shift:shifts(guard:guards(full_name), contract_id)').order('created_at', { ascending: false }).limit(10),
    ])

    const filteredCheckins = (checkins.data || []).filter(c => c.shift?.contract_id === contractId).slice(0, 5)

    const items = [
      ...(novelties.data || []).map(n => ({ icon: '\u{1F4D3}', text: n.content?.slice(0, 80) || 'Novedad registrada', by: n.guard?.full_name, time: n.created_at })),
      ...(incidents.data || []).map(i => ({ icon: '\u{1F6A8}', text: `[${i.severity}] ${i.title}`, by: i.guard?.full_name, time: i.created_at })),
      ...filteredCheckins.map(c => ({ icon: '\u{1F4F7}', text: `Check-in ${c.type}`, by: c.shift?.guard?.full_name, time: c.created_at })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15)

    setActivity(items)
  }

  const kpiCards = [
    { label: 'Guardias activos', value: `${kpis.guardsActive}/${kpis.guardsTotal}`, color: T.SUCCESS },
    { label: 'Turno en curso', value: kpis.currentShift ? kpis.currentShift.guard?.full_name || 'Si' : 'Ninguno', color: T.INFO },
    { label: 'Incidentes abiertos', value: kpis.openIncidents, color: kpis.openIncidents > 0 ? T.RED : T.STEEL },
    { label: 'Novedades hoy', value: kpis.todayNovelties, color: T.ACCENT },
  ]

  const quickLinks = [
    { label: 'Turnos de hoy', path: '/turnos', icon: '\u{1F553}' },
    { label: 'Novedades', path: '/novedades', icon: '\u{1F4D3}' },
    { label: 'Incidentes pendientes', path: '/incidentes', icon: '\u{1F6A8}' },
    { label: 'Visitantes activos', path: '/visitantes', icon: '\u{1F6B6}' },
  ]

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>
          Cargando dashboard...
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: '0 0 8px' }}>MI CONTRATO</h1>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 16, color: T.TEXT_MUTED, margin: '0 0 24px' }}>
        Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}. Panel de administracion de tu contrato.
      </p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        {kpiCards.map(k => (
          <div key={k.label} style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW }}>
            <div style={{ fontSize: 36, fontFamily: T.FONT_DISPLAY, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 14, fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Last checkin banner */}
      {kpis.lastCheckin && (
        <div style={{ background: T.INFO_BG, borderRadius: T.RADIUS_SM, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, fontFamily: T.FONT_BODY }}>
          <span style={{ fontSize: 18 }}>{'\u2705'}</span>
          <span style={{ color: T.INFO, fontSize: 14 }}>
            Ultimo check-in: <strong>{kpis.lastCheckin.shift?.guard?.full_name || '—'}</strong> ({kpis.lastCheckin.type}) — {timeAgo(kpis.lastCheckin.created_at)}
          </span>
        </div>
      )}

      {/* Quick Access */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 16px', fontSize: 22 }}>ACCESO RAPIDO</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {quickLinks.map(link => (
            <a
              key={link.path}
              href={link.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: T.WHITE, borderRadius: T.RADIUS_SM, padding: '16px 20px',
                boxShadow: T.SHADOW, textDecoration: 'none',
                fontFamily: T.FONT_BODY, fontSize: 15, color: T.TEXT, fontWeight: 600,
                border: `1px solid ${T.BORDER}`, cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
            >
              <span style={{ fontSize: 22 }}>{link.icon}</span>
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW }}>
        <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 16px', fontSize: 22 }}>ACTIVIDAD RECIENTE</h3>
        {activity.length === 0 ? (
          <p style={{ color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Sin actividad reciente</p>
        ) : activity.map((a, i) => (
          <div key={i} style={{
            padding: '10px 0',
            borderBottom: i < activity.length - 1 ? `1px solid ${T.BORDER}` : 'none',
            fontFamily: T.FONT_BODY, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.TEXT }}>{a.text}</div>
              <div style={{ color: T.TEXT_LIGHT, fontSize: 11, marginTop: 2 }}>
                {a.by || 'Sistema'} — {timeAgo(a.time)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
