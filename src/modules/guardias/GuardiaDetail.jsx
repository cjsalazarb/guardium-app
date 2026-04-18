import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

export default function GuardiaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [guard, setGuard] = useState(null)
  const [shifts, setShifts] = useState([])
  const [stats, setStats] = useState({ total: 0, completed: 0, absent: 0, incidents: 0 })

  useEffect(() => {
    loadGuard()
    loadShifts()
    loadStats()
  }, [id])

  async function loadGuard() {
    const { data } = await supabase.from('guards').select('*, contract:contracts(client_name)').eq('id', id).single()
    setGuard(data)
  }

  async function loadShifts() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('shifts').select('*').eq('guard_id', id).gte('start_time', thirtyDaysAgo).order('start_time', { ascending: false })
    setShifts(data || [])
  }

  async function loadStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: allShifts } = await supabase.from('shifts').select('status').eq('guard_id', id).gte('start_time', thirtyDaysAgo)
    const s = allShifts || []
    const completed = s.filter(x => x.status === 'completado').length
    const absent = s.filter(x => x.status === 'ausente').length
    const { count } = await supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('guard_id', id)
    setStats({ total: s.length, completed, absent, incidents: count || 0 })
  }

  if (!guard) return <Layout><div style={{ padding: 40, textAlign: 'center', fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>Cargando...</div></Layout>

  const puntualidad = stats.total > 0 ? Math.round(((stats.total - stats.absent) / stats.total) * 100) : 100

  return (
    <Layout>
      <button onClick={() => navigate('/guardias')} style={{ background: 'none', border: 'none', color: T.TEXT_MUTED, cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 14, marginBottom: 16 }}>
        ← Volver a guardias
      </button>

      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 32, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: T.BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, overflow: 'hidden' }}>
            {guard.photo_url ? <img src={guard.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👮'}
          </div>
          <div>
            <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 32, color: T.TEXT, margin: 0 }}>{guard.full_name}</h1>
            <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>CI: {guard.ci} | {guard.contract?.client_name || 'Sin contrato'}</p>
            <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '2px 0 0', fontSize: 13 }}>Tel: {guard.phone || '—'} | Emergencia: {guard.emergency_contact || '—'}</p>
          </div>
          <span style={{
            marginLeft: 'auto', padding: '4px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: guard.active ? T.SUCCESS_BG : T.MUTED_BG, color: guard.active ? T.SUCCESS : T.STEEL,
          }}>{guard.active ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Puntualidad', value: `${puntualidad}%`, color: puntualidad >= 80 ? T.SUCCESS : T.WARN },
          { label: 'Turnos (30d)', value: stats.total, color: T.INFO },
          { label: 'Ausencias', value: stats.absent, color: stats.absent > 0 ? T.RED : T.STEEL },
          { label: 'Incidentes', value: stats.incidents, color: T.WARN },
        ].map(s => (
          <div key={s.label} style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 20, boxShadow: T.SHADOW }}>
            <div style={{ fontSize: 28, fontFamily: T.FONT_DISPLAY, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.BORDER}` }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: 0 }}>HISTORIAL TURNOS (30 DIAS)</h3>
        </div>
        {shifts.length === 0 ? (
          <p style={{ padding: 24, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, textAlign: 'center' }}>Sin turnos registrados</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY, fontSize: 14 }}>
            <thead>
              <tr style={{ background: T.BG }}>
                {['Fecha', 'Inicio', 'Fin', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: T.TEXT_MUTED, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => {
                const statusCol = { programado: T.STEEL, activo: T.SUCCESS, completado: T.INFO, ausente: T.WARN }
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                    <td style={{ padding: '10px 16px' }}>{new Date(s.start_time).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 16px' }}>{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '10px 16px' }}>{new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: statusCol[s.status] || T.STEEL, background: T.BG }}>{s.status}</span>
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
