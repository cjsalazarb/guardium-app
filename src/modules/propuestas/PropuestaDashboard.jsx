import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const STATUS_COLORS = {
  borrador: T.MUTED,
  enviada: T.INFO,
  en_negociacion: T.WARN,
  aceptada: T.SUCCESS,
  rechazada: T.DANGER,
  sin_respuesta: T.ORANGE,
}

const STATUS_LABELS = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  en_negociacion: 'En negociacion',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  sin_respuesta: 'Sin respuesta',
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function PropuestaDashboard() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('proposals').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProposals(data || []); setLoading(false) })
  }, [])

  /* ---------- KPIs ---------- */
  const kpis = useMemo(() => {
    const sent = proposals.filter(p => p.status !== 'borrador')
    const accepted = proposals.filter(p => p.status === 'aceptada')
    const rejected = proposals.filter(p => p.status === 'rechazada')
    const noResponse = proposals.filter(p => {
      if (!['enviada', 'sin_respuesta'].includes(p.status)) return false
      return daysSince(p.created_at) > 7
    })
    const inNeg = proposals.filter(p => p.status === 'en_negociacion')
    const totalValue = sent.reduce((s, p) => s + (Number(p.total_monthly) || 0), 0)
    const acceptedValue = accepted.reduce((s, p) => s + (Number(p.total_monthly) || 0), 0)
    const inNegValue = inNeg.reduce((s, p) => s + (Number(p.total_monthly) || 0), 0)
    const conversionPct = sent.length ? ((accepted.length / sent.length) * 100).toFixed(1) : '0.0'
    const rejectedPct = sent.length ? ((rejected.length / sent.length) * 100).toFixed(1) : '0.0'

    return {
      sentCount: sent.length, totalValue,
      acceptedCount: accepted.length, acceptedValue, conversionPct,
      rejectedCount: rejected.length, rejectedPct,
      noResponseCount: noResponse.length,
      inNegCount: inNeg.length, inNegValue,
    }
  }, [proposals])

  /* ---------- CHART DATA ---------- */
  const donutData = useMemo(() => {
    const counts = {}
    proposals.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status, value: count, color: STATUS_COLORS[status] || T.MUTED,
    }))
  }, [proposals])

  const barData = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' })
      const sent = proposals.filter(p => p.status !== 'borrador' && p.created_at?.startsWith(key)).length
      const accepted = proposals.filter(p => p.status === 'aceptada' && p.created_at?.startsWith(key)).length
      months.push({ name: label, enviadas: sent, aceptadas: accepted })
    }
    return months
  }, [proposals])

  const lineData = useMemo(() => {
    const accepted = proposals
      .filter(p => p.status === 'aceptada' && p.created_at)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    let cum = 0
    return accepted.map(p => {
      cum += Number(p.total_monthly) || 0
      return { date: new Date(p.created_at).toLocaleDateString('es-BO', { month: 'short', day: 'numeric' }), value: cum }
    })
  }, [proposals])

  /* ---------- LAST 10 TABLE ---------- */
  const last10 = useMemo(() => proposals.slice(0, 10), [proposals])

  const fmt = (n) => Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  /* ---------- STYLES ---------- */
  const kpiCard = (accent) => ({
    background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW,
    padding: '20px 24px', borderLeft: `4px solid ${accent}`, flex: 1, minWidth: 160,
  })

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando dashboard...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>DASHBOARD PROPUESTAS</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Resumen y metricas comerciales</p>
        </div>
        <button
          onClick={() => navigate('/propuestas/nueva')}
          style={{
            padding: '12px 24px', background: T.RED, color: T.WHITE,
            border: 'none', borderRadius: T.RADIUS_SM, cursor: 'pointer',
            fontFamily: T.FONT_DISPLAY, fontSize: 16, letterSpacing: '0.05em',
          }}
        >
          + NUEVA PROPUESTA
        </button>
      </div>

      {/* ==================== KPIs ==================== */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={kpiCard(T.INFO)}>
          <div style={{ fontSize: 12, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, fontWeight: 600, marginBottom: 4 }}>ENVIADAS</div>
          <div style={{ fontSize: 28, fontFamily: T.FONT_DISPLAY, color: T.TEXT }}>{kpis.sentCount}</div>
          <div style={{ fontSize: 12, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Valor total: Bs. {fmt(kpis.totalValue)}</div>
        </div>
        <div style={kpiCard(T.SUCCESS)}>
          <div style={{ fontSize: 12, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, fontWeight: 600, marginBottom: 4 }}>ACEPTADAS</div>
          <div style={{ fontSize: 28, fontFamily: T.FONT_DISPLAY, color: T.TEXT }}>{kpis.acceptedCount}</div>
          <div style={{ fontSize: 12, color: T.SUCCESS, fontFamily: T.FONT_BODY, fontWeight: 600 }}>Conversion: {kpis.conversionPct}%</div>
        </div>
        <div style={kpiCard(T.DANGER)}>
          <div style={{ fontSize: 12, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, fontWeight: 600, marginBottom: 4 }}>RECHAZADAS</div>
          <div style={{ fontSize: 28, fontFamily: T.FONT_DISPLAY, color: T.TEXT }}>{kpis.rejectedCount}</div>
          <div style={{ fontSize: 12, color: T.DANGER, fontFamily: T.FONT_BODY, fontWeight: 600 }}>{kpis.rejectedPct}%</div>
        </div>
        <div style={kpiCard(T.ORANGE)}>
          <div style={{ fontSize: 12, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, fontWeight: 600, marginBottom: 4 }}>SIN RESPUESTA &gt;7d</div>
          <div style={{ fontSize: 28, fontFamily: T.FONT_DISPLAY, color: kpis.noResponseCount > 0 ? T.ORANGE : T.TEXT }}>{kpis.noResponseCount}</div>
        </div>
        <div style={kpiCard(T.WARN)}>
          <div style={{ fontSize: 12, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, fontWeight: 600, marginBottom: 4 }}>EN NEGOCIACION</div>
          <div style={{ fontSize: 28, fontFamily: T.FONT_DISPLAY, color: T.TEXT }}>{kpis.inNegCount}</div>
          <div style={{ fontSize: 12, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Potencial: Bs. {fmt(kpis.inNegValue)}</div>
        </div>
      </div>

      {/* ==================== CHARTS ==================== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Donut by status */}
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: '0 0 16px', letterSpacing: '0.04em' }}>POR ESTADO</h3>
          {donutData.length === 0 ? (
            <div style={{ textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, padding: 40 }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}`, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {donutData.map((d, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        {/* Bar: sent vs accepted last 6 months */}
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: '0 0 16px', letterSpacing: '0.04em' }}>ENVIADAS vs ACEPTADAS (6M)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: T.FONT_BODY }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="enviadas" fill={T.INFO} radius={[4, 4, 0, 0]} />
              <Bar dataKey="aceptadas" fill={T.SUCCESS} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line: cumulative accepted value */}
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: '0 0 16px', letterSpacing: '0.04em' }}>VALOR ACUMULADO ACEPTADAS</h3>
          {lineData.length === 0 ? (
            <div style={{ textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, padding: 40 }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: T.FONT_BODY }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`Bs. ${fmt(v)}`, 'Acumulado']} />
                <Line type="monotone" dataKey="value" stroke={T.PRIMARY} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ==================== LAST 10 TABLE ==================== */}
      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.BORDER}` }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: 0, letterSpacing: '0.04em' }}>ULTIMAS 10 PROPUESTAS</h3>
        </div>
        {last10.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>No hay propuestas</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY }}>
            <thead>
              <tr style={{ background: T.BG, borderBottom: `1px solid ${T.BORDER}` }}>
                {['Cliente', 'Titulo', 'Valor mensual (Bs.)', 'Estado', 'Dias desde envio'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: T.TEXT_MUTED, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {last10.map(p => {
                const days = daysSince(p.created_at)
                const isNoResponse = ['enviada', 'sin_respuesta'].includes(p.status) && days > 7
                const isRejectedRecent = p.status === 'rechazada' && days <= 7
                let rowBg = 'transparent'
                if (isNoResponse) rowBg = T.WARN_BG
                if (isRejectedRecent) rowBg = T.DANGER_BG

                return (
                  <tr
                    key={p.id}
                    style={{ borderBottom: `1px solid ${T.BORDER}`, cursor: 'pointer', background: rowBg, transition: 'background 0.15s' }}
                    onMouseEnter={e => { if (!isNoResponse && !isRejectedRecent) e.currentTarget.style.background = T.BG }}
                    onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
                    onClick={() => navigate(`/propuestas/${p.id}`)}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: T.TEXT }}>{p.client_name}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT }}>{p.title || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>Bs. {p.total_monthly ? fmt(p.total_monthly) : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: `${STATUS_COLORS[p.status] || T.MUTED}20`,
                        color: STATUS_COLORS[p.status] || T.MUTED,
                      }}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px 16px', fontSize: 13,
                      color: isNoResponse ? T.ORANGE : isRejectedRecent ? T.DANGER : T.TEXT_MUTED,
                      fontWeight: isNoResponse || isRejectedRecent ? 700 : 400,
                    }}>
                      {days !== null ? `${days}d` : '—'}
                      {isNoResponse && ' (!)'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
