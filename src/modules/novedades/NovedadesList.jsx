import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'
import { useAuth } from '../../lib/auth'

export default function NovedadesList() {
  const { contractId } = useAuth()
  const [entries, setEntries] = useState([])
  const [contracts, setContracts] = useState([])
  const [guards, setGuards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterContract, setFilterContract] = useState('')
  const [filterGuard, setFilterGuard] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [searchText, setSearchText] = useState('')
  const [form, setForm] = useState({ content: '', guard_name: '', shift: '' })

  useEffect(() => { loadEntries(); loadContracts(); loadGuards() }, [filterContract, filterGuard, filterDate, searchText])

  async function loadContracts() {
    const { data } = await supabase.from('contracts').select('id, client_name').order('client_name')
    setContracts(data || [])
  }

  async function loadGuards() {
    const { data } = await supabase.from('guards').select('id, full_name').eq('active', true).order('full_name')
    setGuards(data || [])
  }

  async function loadEntries() {
    let q = supabase.from('log_entries').select('*, contract:contracts(client_name)').order('created_at', { ascending: false })
    if (filterContract) q = q.eq('contract_id', filterContract)
    if (filterGuard) q = q.eq('guard_name', filterGuard)
    if (filterDate) {
      q = q.gte('created_at', filterDate + 'T00:00:00')
      q = q.lte('created_at', filterDate + 'T23:59:59')
    }
    if (searchText.trim()) q = q.ilike('content', `%${searchText.trim()}%`)
    const { data } = await q
    setEntries(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.content.trim()) return
    const payload = {
      content: form.content.trim(),
      guard_name: form.guard_name.trim() || null,
      shift: form.shift.trim() || null,
      contract_id: contractId || null,
      created_at: new Date().toISOString(),
    }
    await supabase.from('log_entries').insert(payload)
    setForm({ content: '', guard_name: '', shift: '' })
    setShowForm(false)
    loadEntries()
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '-'
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '-'

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${T.BORDER}`, borderRadius: T.RADIUS_SM,
    fontFamily: T.FONT_BODY, fontSize: 14, boxSizing: 'border-box', outline: 'none',
  }
  const labelStyle = { fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600, color: T.TEXT, marginBottom: 4, display: 'block' }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>NOVEDADES</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Registro cronologico de novedades</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '12px 24px', background: T.RED, color: T.WHITE, border: 'none',
          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
        }}>
          {showForm ? 'CANCELAR' : '+ NUEVA NOVEDAD'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 22, color: T.TEXT, margin: '0 0 16px' }}>REGISTRAR NOVEDAD</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Contenido *</label>
              <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Guardia</label>
              <input style={inputStyle} value={form.guard_name} onChange={e => setForm({ ...form, guard_name: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Turno</label>
              <select style={inputStyle} value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
                <option value="">Seleccionar turno</option>
                <option value="diurno">Diurno</option>
                <option value="nocturno">Nocturno</option>
                <option value="24h">24 horas</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={{
                padding: '12px 32px', background: T.SUCCESS, color: T.WHITE, border: 'none',
                borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
              }}>REGISTRAR NOVEDAD</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input placeholder="Buscar en contenido..." value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ ...inputStyle, width: 280 }} />
        <select value={filterContract} onChange={e => setFilterContract(e.target.value)} style={{ ...inputStyle, width: 200 }}>
          <option value="">Todos los contratos</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
        </select>
        <select value={filterGuard} onChange={e => setFilterGuard(e.target.value)} style={{ ...inputStyle, width: 200 }}>
          <option value="">Todos los guardias</option>
          {guards.map(g => <option key={g.id} value={g.full_name}>{g.full_name}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inputStyle, width: 180 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>No se encontraron novedades</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {entries.map(entry => (
            <div key={entry.id} style={{
              background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 20,
              borderLeft: `4px solid ${T.RED}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: T.BG,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 14, color: T.RED,
                  }}>
                    {(entry.guard_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 14, color: T.TEXT }}>
                      {entry.guard_name || 'Sin guardia'}
                    </div>
                    <div style={{ fontFamily: T.FONT_BODY, fontSize: 12, color: T.TEXT_MUTED }}>
                      {entry.contract?.client_name || 'Sin contrato'}
                      {entry.shift && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 8, background: T.BG, fontSize: 11 }}>{entry.shift}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: T.FONT_BODY, fontSize: 12, color: T.TEXT_LIGHT }}>
                  {fmtDate(entry.created_at)}
                </div>
              </div>
              <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.TEXT, lineHeight: 1.6, paddingLeft: 52 }}>
                {entry.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
