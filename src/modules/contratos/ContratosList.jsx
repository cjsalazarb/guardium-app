import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

const statusColors = {
  activo: { bg: T.SUCCESS_BG, color: T.SUCCESS },
  suspendido: { bg: T.WARN_BG, color: T.WARN },
  terminado: { bg: T.MUTED_BG, color: T.STEEL },
}

export default function ContratosList() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadContracts()
  }, [])

  async function loadContracts() {
    const { data } = await supabase
      .from('contracts')
      .select('*, admin:users!contracts_admin_id_fkey(full_name)')
      .order('created_at', { ascending: false })
    setContracts(data || [])
    setLoading(false)
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>CONTRATOS</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Gestion de contratos de seguridad</p>
        </div>
        <button
          onClick={() => navigate('/contratos/nuevo')}
          style={{
            padding: '12px 24px', background: T.RED, color: T.WHITE,
            border: 'none', borderRadius: T.RADIUS_SM, cursor: 'pointer',
            fontFamily: T.FONT_DISPLAY, fontSize: 16, letterSpacing: '0.05em',
          }}
        >
          + NUEVO CONTRATO
        </button>
      </div>

      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
        ) : contracts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>No hay contratos registrados</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY }}>
            <thead>
              <tr style={{ background: T.BG, borderBottom: `1px solid ${T.BORDER}` }}>
                {['Cliente', 'Direccion', 'Periodo', 'Monto/mes (Bs.)', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: T.TEXT_MUTED, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr
                  key={c.id}
                  style={{ borderBottom: `1px solid ${T.BORDER}`, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.BG}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => navigate(`/contratos/${c.id}`)}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: T.TEXT }}>{c.client_name}</td>
                  <td style={{ padding: '14px 16px', color: T.TEXT_MUTED }}>{c.address || '—'}</td>
                  <td style={{ padding: '14px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>
                    {c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'} — {c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>Bs. {c.monthly_amount ? Number(c.monthly_amount).toLocaleString() : '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: statusColors[c.status]?.bg, color: statusColors[c.status]?.color,
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/contratos/${c.id}/editar`) }}
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
    </Layout>
  )
}
