import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import Toast from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

const statusColors = {
  borrador:        { bg: T.MUTED_BG, color: T.MUTED },
  enviada:         { bg: T.INFO_BG, color: T.INFO },
  en_negociacion:  { bg: T.WARN_BG, color: T.WARN },
  aceptada:        { bg: T.SUCCESS_BG, color: T.SUCCESS },
  rechazada:       { bg: T.DANGER_BG, color: T.DANGER },
  sin_respuesta:   { bg: T.ORANGE_BG, color: T.ORANGE },
}

const statusLabels = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  en_negociacion: 'En negociacion',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  sin_respuesta: 'Sin respuesta',
}

export default function PropuestasList() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProposals()
  }, [])

  async function loadProposals() {
    const { data, error: dbErr } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false })
    if (dbErr) { setError('Error al cargar propuestas. Intente de nuevo.'); setLoading(false); return }
    setProposals(data || [])
    setLoading(false)
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>PROPUESTAS</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Gestion de propuestas comerciales</p>
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

      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
        ) : proposals.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>No hay propuestas registradas</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY }}>
            <thead>
              <tr style={{ background: T.BG, borderBottom: `1px solid ${T.BORDER}` }}>
                {['Cliente', 'Titulo', 'Fecha', 'Valida hasta', 'Total (Bs.)', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: T.TEXT_MUTED, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => (
                <tr
                  key={p.id}
                  style={{ borderBottom: `1px solid ${T.BORDER}`, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.BG}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => navigate(`/propuestas/${p.id}`)}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: T.TEXT }}>{p.client_name}</td>
                  <td style={{ padding: '14px 16px', color: T.TEXT }}>{p.title || '—'}</td>
                  <td style={{ padding: '14px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>
                    {p.valid_until ? new Date(p.valid_until).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                    Bs. {p.total_monthly ? Number(p.total_monthly).toLocaleString('es-BO', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: statusColors[p.status]?.bg || T.MUTED_BG,
                      color: statusColors[p.status]?.color || T.MUTED,
                    }}>
                      {statusLabels[p.status] || p.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/propuestas/${p.id}/editar`) }}
                      style={{ padding: '6px 12px', background: T.BG, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, color: T.TEXT }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </Layout>
  )
}
