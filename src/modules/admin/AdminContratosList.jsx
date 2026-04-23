import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { T } from '../../styles/tokens'

export default function AdminContratosList() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadContracts() }, [])

  async function loadContracts() {
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .order('client_name')
    if (!data) { setLoading(false); return }

    // Load stats for each contract
    const enriched = await Promise.all(data.map(async c => {
      const [g, s, i] = await Promise.all([
        supabase.from('guards').select('id', { count: 'exact', head: true }).eq('contract_id', c.id).eq('active', true),
        supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('contract_id', c.id).gte('start_time', new Date().toISOString().slice(0, 10) + 'T00:00:00'),
        supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('contract_id', c.id).eq('status', 'abierto'),
      ])
      return { ...c, _guards: g.count || 0, _shiftsToday: s.count || 0, _openIncidents: i.count || 0 }
    }))
    setContracts(enriched)
    setLoading(false)
  }

  const content = (
    <>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: role === 'superadmin' ? 0 : '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>MIS CONTRATOS</h1>
            <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0', fontSize: 15 }}>Selecciona un contrato para administrar</p>
          </div>
          <button onClick={() => navigate('/contratos/nuevo')} style={{
            padding: '12px 24px', background: T.RED, color: T.WHITE, border: 'none',
            borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 14,
          }}>+ NUEVO CONTRATO</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando contratos...</div>
        ) : contracts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>No hay contratos registrados</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {contracts.map(c => {
              const hasAlerts = c._openIncidents > 0
              return (
                <div key={c.id} style={{
                  background: hasAlerts ? '#FFF5F5' : T.WHITE,
                  borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${hasAlerts ? T.RED : T.BORDER}`,
                  padding: 24, transition: 'all 0.18s', cursor: 'pointer',
                }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
                   onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
                   onClick={() => navigate(`/admin/contratos/${c.id}/dashboard`)}
                >
                  <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 20, color: T.TEXT, marginBottom: 4 }}>{c.client_name}</div>
                  <div style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.TEXT_MUTED, marginBottom: 16 }}>{c.address || c.client_address || ''}</div>

                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    {[
                      { label: 'GUARDIAS', value: c._guards },
                      { label: 'TURNOS HOY', value: c._shiftsToday },
                      { label: '/MES', value: c.monthly_amount ? `Bs.${Number(c.monthly_amount).toLocaleString('es-BO')}` : '-' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 22, color: T.TEXT }}>{s.value}</div>
                        <div style={{ fontFamily: T.FONT_BODY, fontSize: 10, color: T.TEXT_MUTED, letterSpacing: '0.05em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {hasAlerts && (
                    <div style={{ padding: '6px 10px', borderRadius: 8, background: '#FEE2E2', marginBottom: 12, fontSize: 12, fontFamily: T.FONT_BODY, color: T.RED, fontWeight: 600 }}>
                      {c._openIncidents} incidente{c._openIncidents > 1 ? 's' : ''} abierto{c._openIncidents > 1 ? 's' : ''}
                    </div>
                  )}

                  <button onClick={e => { e.stopPropagation(); navigate(`/admin/contratos/${c.id}/dashboard`) }} style={{
                    width: '100%', padding: '10px 0', background: T.RED, color: T.WHITE, border: 'none',
                    borderRadius: 8, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 14, letterSpacing: '0.04em',
                  }}>ENTRAR {'\u2192'}</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )

  if (role === 'superadmin') {
    return <Layout>{content}</Layout>
  }

  return (
    <div style={{ minHeight: '100vh', background: T.BG }}>
      {/* Header for admin (no sidebar) */}
      <div style={{ background: T.WHITE, borderBottom: `1px solid ${T.BORDER}`, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="32" viewBox="0 0 36 40" fill="none">
            <path d="M18 0L36 8V20C36 31.05 27.72 37.08 18 40C8.28 37.08 0 31.05 0 20V8L18 0Z" fill={T.RED} />
            <path d="M18 4L32 10.5V20C32 29 25 34.5 18 37C11 34.5 4 29 4 20V10.5L18 4Z" fill={T.BLACK} />
            <text x="18" y="25" textAnchor="middle" fill={T.RED} fontFamily="Bebas Neue" fontSize="14" fontWeight="bold">G</text>
          </svg>
          <span style={{ fontFamily: T.FONT_DISPLAY, fontSize: 20, color: T.TEXT, letterSpacing: '0.05em' }}>GUARDIUM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.TEXT_MUTED }}>{user?.full_name || ''}</span>
          <button onClick={signOut} style={{ padding: '6px 16px', background: T.BG, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: T.FONT_BODY, color: T.TEXT }}>Cerrar sesion</button>
        </div>
      </div>
      <div style={{ padding: '32px 24px' }}>{content}</div>
    </div>
  )
}
