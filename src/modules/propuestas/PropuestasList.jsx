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
  const [expanded, setExpanded] = useState({})
  const [historyRows, setHistoryRows] = useState({})
  const [prevTotals, setPrevTotals] = useState({})
  const navigate = useNavigate()

  useEffect(() => { loadProposals() }, [])

  async function loadProposals() {
    // 1. Cargar propuestas más recientes
    const { data, error: dbErr } = await supabase
      .from('proposals')
      .select('*')
      .or('is_latest.eq.true,is_latest.is.null')
      .order('created_at', { ascending: false })
    if (dbErr) { setError('Error al cargar propuestas. Intente de nuevo.'); setLoading(false); return }
    setProposals(data || [])

    // 2. Cargar totales de versiones anteriores para calcular variación
    const versioned = (data || []).filter(p => (p.version || 1) > 1)
    if (versioned.length > 0) {
      const rootIds = [...new Set(versioned.map(p => p.parent_proposal_id).filter(Boolean))]
      if (rootIds.length > 0) {
        const { data: prevVersions } = await supabase
          .from('proposals')
          .select('id, parent_proposal_id, version, total_amount')
          .eq('is_latest', false)
          .order('version', { ascending: false })
        if (prevVersions) {
          // Para cada propuesta latest, encontrar la versión inmediatamente anterior
          const map = {}
          versioned.forEach(p => {
            const rootId = p.parent_proposal_id || p.id
            const prev = prevVersions.find(pv => {
              const pvRoot = pv.parent_proposal_id || pv.id
              return pvRoot === rootId && pv.version === (p.version || 1) - 1
            })
            if (prev && prev.total_amount != null) {
              map[p.id] = Number(prev.total_amount)
            }
          })
          setPrevTotals(map)
        }
      }
    }

    setLoading(false)
  }

  async function toggleExpand(p) {
    const pid = p.id
    if (expanded[pid]) {
      setExpanded(prev => ({ ...prev, [pid]: false }))
      return
    }
    const rootId = p.parent_proposal_id || p.id
    // Cargar TODAS las versiones para calcular variación entre cada una
    const { data: allVersions } = await supabase
      .from('proposals')
      .select('*')
      .or(`parent_proposal_id.eq.${rootId},id.eq.${rootId}`)
      .order('version', { ascending: true })
    if (!allVersions) { setExpanded(prev => ({ ...prev, [pid]: true })); return }

    // Calcular variación de cada versión vs la anterior
    const withVariation = allVersions.map((v, i) => {
      if (i === 0) return { ...v, _variacion: null }
      const prev = allVersions[i - 1]
      const prevAmt = Number(prev.total_amount) || 0
      const curAmt = Number(v.total_amount) || 0
      if (!prevAmt) return { ...v, _variacion: null }
      return { ...v, _variacion: ((curAmt - prevAmt) / prevAmt) * 100 }
    })

    // Solo históricas (sin la latest), orden desc
    const historicas = withVariation.filter(v => !v.is_latest).reverse()
    setHistoryRows(prev => ({ ...prev, [pid]: historicas }))
    setExpanded(prev => ({ ...prev, [pid]: true }))
  }

  function renderVariationBadge(pct) {
    if (pct == null) return <span style={{ color: T.TEXT_MUTED }}>{'\u2014'}</span>
    if (Math.abs(pct) < 0.01) return <span style={{ color: T.TEXT_MUTED, fontSize: 13 }}>= Sin cambio</span>
    if (pct > 0) return <span style={{ color: '#16A34A', fontWeight: 600, fontSize: 13 }}>{'\u2191'} +{pct.toFixed(1)}%</span>
    return <span style={{ color: '#DC2626', fontWeight: 600, fontSize: 13 }}>{'\u2193'} {pct.toFixed(1)}%</span>
  }

  function getVariationPct(p) {
    const version = p.version || 1
    if (version <= 1) return null
    const prevTotal = prevTotals[p.id]
    if (prevTotal == null || prevTotal === 0) return null
    const currentTotal = Number(p.total_amount) || 0
    return ((currentTotal - prevTotal) / prevTotal) * 100
  }

  function renderRow(p, { isHistory = false } = {}) {
    const hasVersions = (p.version || 1) > 1 || p.parent_proposal_id
    const isExp = expanded[p.id]

    return (
      <tr
        key={p.id}
        style={{
          borderBottom: `1px solid ${T.BORDER}`,
          cursor: 'pointer',
          transition: 'background 0.15s',
          background: isHistory ? '#F9FAFB' : 'transparent',
        }}
        onMouseEnter={e => e.currentTarget.style.background = isHistory ? '#F0F2F5' : T.BG}
        onMouseLeave={e => e.currentTarget.style.background = isHistory ? '#F9FAFB' : 'transparent'}
        onClick={() => navigate(`/propuestas/${p.id}`)}
      >
        <td style={{ padding: '14px 16px', fontWeight: 600, color: isHistory ? T.TEXT_MUTED : T.TEXT }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isHistory && hasVersions ? (
              <button
                onClick={e => { e.stopPropagation(); toggleExpand(p) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, padding: '2px 4px', color: T.TEXT_MUTED, lineHeight: 1,
                }}
              >
                {isExp ? '\u25BC' : '\u25B6'}
              </button>
            ) : !isHistory ? (
              <span style={{ width: 20 }} />
            ) : null}
            {isHistory && <span style={{ color: T.TEXT_MUTED, marginLeft: 28, fontSize: 13 }}>{'\u21B3'}</span>}
            {p.client_name}
          </span>
        </td>
        <td style={{ padding: '14px 16px', color: isHistory ? T.TEXT_MUTED : T.TEXT }}>{p.title || '\u2014'}</td>
        <td style={{ padding: '14px 16px' }}>
          {p.is_latest ? (
            <span style={{
              padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              background: T.SUCCESS_BG, color: T.SUCCESS,
            }}>
              v{p.version || 1} Ultima
            </span>
          ) : (
            <span style={{
              padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              background: T.MUTED_BG, color: T.MUTED,
            }}>
              v{p.version || 1}
            </span>
          )}
        </td>
        <td style={{ padding: '14px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>
          {p.created_at ? new Date(p.created_at).toLocaleDateString() : '\u2014'}
        </td>
        <td style={{ padding: '14px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>
          {p.valid_until ? new Date(p.valid_until).toLocaleDateString() : '\u2014'}
        </td>
        <td style={{ padding: '14px 16px', fontWeight: 600 }}>
          Bs. {p.total_amount ? Number(p.total_amount).toLocaleString('es-BO', { minimumFractionDigits: 2 }) : '\u2014'}
        </td>
        <td style={{ padding: '14px 16px' }}>
          {renderVariationBadge(isHistory ? p._variacion : getVariationPct(p))}
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
          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            {(p.is_latest || p.is_latest === null) && (
              <button
                onClick={() => navigate(`/propuestas/${p.id}/editar`)}
                style={{ padding: '6px 12px', background: T.BG, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, color: T.TEXT }}
              >
                Editar
              </button>
            )}
            {isHistory && (
              <button
                onClick={() => navigate(`/propuestas/${p.id}`)}
                style={{ padding: '6px 12px', background: T.BG, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, color: T.TEXT }}
              >
                Ver
              </button>
            )}
          </div>
        </td>
      </tr>
    )
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
                {['Cliente', 'Titulo', 'Version', 'Fecha', 'Valida hasta', 'Total (Bs.)', 'Variacion', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: T.TEXT_MUTED, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => {
                const rows = [renderRow(p)]
                if (expanded[p.id] && historyRows[p.id]) {
                  historyRows[p.id].forEach(h => rows.push(renderRow(h, { isHistory: true })))
                }
                return rows
              })}
            </tbody>
          </table>
        )}
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </Layout>
  )
}
