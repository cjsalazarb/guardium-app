import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import Layout from '../components/Layout'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { T } from '../styles/tokens'

export default function Dashboard() {
  const { user } = useAuth()
  const [kpis, setKpis] = useState({ contracts: 0, totalContracts: 0, guards: 0, incidents: 0, hasCritical: false, pendingAmount: 0 })
  const [shiftData, setShiftData] = useState([])
  const [incidentData, setIncidentData] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [recentCheckins, setRecentCheckins] = useState([])
  const [criticalAlert, setCriticalAlert] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAll()
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shift_checkins' }, () => loadAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incident_reports' }, () => loadAll())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadAll() {
    const [contracts, totalContracts, guards, incidents, criticals, invoices] = await Promise.all([
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'activo'),
      supabase.from('contracts').select('id', { count: 'exact', head: true }),
      supabase.from('guards').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('status', 'abierto'),
      supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('status', 'abierto').eq('severity', 'critico'),
      supabase.from('invoices').select('amount').eq('status', 'pendiente'),
    ])
    if (contracts.error || guards.error || incidents.error || invoices.error) { setError('Error al cargar datos. Intente de nuevo.'); return }
    const pendingAmount = (invoices.data || []).reduce((sum, i) => sum + Number(i.amount || 0), 0)
    const hasCritical = (criticals.count || 0) > 0
    setCriticalAlert(hasCritical)
    setKpis({ contracts: contracts.count || 0, totalContracts: totalContracts.count || 0, guards: guards.count || 0, incidents: incidents.count || 0, hasCritical, pendingAmount })

    // Shift data last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: shifts } = await supabase.from('shifts').select('status, start_time').gte('start_time', thirtyDaysAgo)
    const shiftByWeek = {}
    ;(shifts || []).forEach(s => {
      const week = `Sem ${Math.ceil((new Date(s.start_time).getDate()) / 7)}`
      if (!shiftByWeek[week]) shiftByWeek[week] = { name: week, completados: 0, ausentes: 0 }
      if (s.status === 'completado') shiftByWeek[week].completados++
      if (s.status === 'ausente') shiftByWeek[week].ausentes++
    })
    setShiftData(Object.values(shiftByWeek))

    // Incidents by severity
    const { data: allIncidents } = await supabase.from('incident_reports').select('severity')
    const sevCount = {}
    ;(allIncidents || []).forEach(i => { sevCount[i.severity] = (sevCount[i.severity] || 0) + 1 })
    setIncidentData(Object.entries(sevCount).map(([name, value]) => ({ name, value })))

    // Revenue last 6 months
    const { data: inv } = await supabase.from('invoices').select('amount, period_month, period_year, status')
    const revByMonth = {}
    ;(inv || []).forEach(i => {
      const key = `${i.period_year}-${String(i.period_month).padStart(2, '0')}`
      if (!revByMonth[key]) revByMonth[key] = { name: key, total: 0 }
      if (i.status === 'pagado') revByMonth[key].total += Number(i.amount || 0)
    })
    setRevenueData(Object.values(revByMonth).sort((a, b) => a.name.localeCompare(b.name)).slice(-6))

    // Recent activity
    const { data: novelties } = await supabase.from('novelty_log').select('content, created_at, guard:guards(full_name)').order('created_at', { ascending: false }).limit(5)
    const { data: recentInc } = await supabase.from('incident_reports').select('title, severity, created_at, guard:guards(full_name)').order('created_at', { ascending: false }).limit(5)
    const activity = [
      ...(novelties || []).map(n => ({ type: '📓', text: n.content?.slice(0, 60), by: n.guard?.full_name, time: n.created_at })),
      ...(recentInc || []).map(i => ({ type: '🚨', text: `[${i.severity}] ${i.title}`, by: i.guard?.full_name, time: i.created_at })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
    setRecentActivity(activity)

    const { data: checkins } = await supabase.from('shift_checkins').select('type, photo_url, created_at, shift:shifts(guard:guards(full_name), contract:contracts(client_name))').order('created_at', { ascending: false }).limit(5)
    setRecentCheckins(checkins || [])
  }

  const sevColors = { bajo: T.STEEL, medio: '#F59E0B', alto: '#F97316', critico: '#EF4444' }

  return (
    <Layout>
      {criticalAlert && (
        <div style={{ background: '#EF4444', borderRadius: T.RADIUS_SM, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ fontFamily: T.FONT_BODY, color: T.WHITE, fontWeight: 600 }}>Hay incidentes criticos abiertos que requieren atencion inmediata</span>
        </div>
      )}

      <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: '0 0 8px' }}>DASHBOARD</h1>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 16, color: T.TEXT_MUTED, margin: '0 0 24px' }}>
        Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}. Panel de control GUARDIUM.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        {[
          { label: 'Contratos activos', value: `${kpis.contracts}/${kpis.totalContracts}`, color: T.RED },
          { label: 'Guardias activos', value: kpis.guards, color: T.SUCCESS },
          { label: 'Incidentes abiertos', value: kpis.incidents, color: kpis.hasCritical ? '#EF4444' : T.WARN },
          { label: 'Facturacion pendiente', value: `Bs. ${kpis.pendingAmount.toLocaleString()}`, color: T.INFO },
        ].map(k => (
          <div key={k.label} style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW }}>
            <div style={{ fontSize: 36, fontFamily: T.FONT_DISPLAY, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 14, fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 32 }}>
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 16px' }}>TURNOS: COMPLETADOS VS AUSENCIAS (30D)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={shiftData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} />
              <XAxis dataKey="name" style={{ fontFamily: T.FONT_BODY, fontSize: 12 }} />
              <YAxis style={{ fontFamily: T.FONT_BODY, fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completados" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ausentes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 16px' }}>INCIDENTES POR SEVERIDAD</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={incidentData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {incidentData.map(entry => <Cell key={entry.name} fill={sevColors[entry.name] || T.STEEL} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW, marginBottom: 32 }}>
        <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 16px' }}>INGRESOS MENSUALES (6M)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} />
            <XAxis dataKey="name" style={{ fontFamily: T.FONT_BODY, fontSize: 12 }} />
            <YAxis style={{ fontFamily: T.FONT_BODY, fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke={T.RED} strokeWidth={2} dot={{ fill: T.RED }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 16px' }}>ACTIVIDAD RECIENTE</h3>
          {recentActivity.length === 0 ? (
            <p style={{ color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Sin actividad reciente</p>
          ) : recentActivity.map((a, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < recentActivity.length - 1 ? `1px solid ${T.BORDER}` : 'none', fontFamily: T.FONT_BODY, fontSize: 13 }}>
              <span>{a.type} </span>
              <span style={{ color: T.TEXT }}>{a.text}</span>
              <div style={{ color: T.TEXT_LIGHT, fontSize: 11, marginTop: 2 }}>{a.by} — {a.time ? new Date(a.time).toLocaleString() : ''}</div>
            </div>
          ))}
        </div>
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 24, boxShadow: T.SHADOW }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 16px' }}>ULTIMOS CHECK-INS</h3>
          {recentCheckins.length === 0 ? (
            <p style={{ color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Sin check-ins recientes</p>
          ) : recentCheckins.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < recentCheckins.length - 1 ? `1px solid ${T.BORDER}` : 'none' }}>
              {c.photo_url ? (
                <img src={c.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📷</div>
              )}
              <div style={{ flex: 1, fontFamily: T.FONT_BODY, fontSize: 13 }}>
                <div style={{ color: T.TEXT, fontWeight: 600 }}>{c.shift?.guard?.full_name || '—'}</div>
                <div style={{ color: T.TEXT_LIGHT, fontSize: 11 }}>{c.shift?.contract?.client_name || ''} — {c.type}</div>
              </div>
              <div style={{ fontFamily: T.FONT_BODY, fontSize: 11, color: T.TEXT_LIGHT }}>{c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
            </div>
          ))}
        </div>
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </Layout>
  )
}
