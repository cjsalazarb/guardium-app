import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

const statusColors = { programado: T.MUTED, activo: T.SUCCESS, completado: T.INFO, ausente: T.WARN }

function getWeekDays(offset = 0) {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay() + 1 + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export default function TurnosList() {
  const [shifts, setShifts] = useState([])
  const [contracts, setContracts] = useState([])
  const [guards, setGuards] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState('calendar')
  const [filterContract, setFilterContract] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ guard_id: '', contract_id: '', start_time: '', end_time: '' })

  const days = getWeekDays(weekOffset)
  const weekStart = days[0].toISOString()
  const weekEnd = new Date(days[6].getTime() + 24 * 60 * 60 * 1000).toISOString()

  useEffect(() => { loadData() }, [weekOffset, filterContract])

  async function loadData() {
    const [s, c, g] = await Promise.all([
      supabase.from('shifts').select('*, guard:guards(full_name)').gte('start_time', weekStart).lte('start_time', weekEnd).order('start_time'),
      supabase.from('contracts').select('id, client_name').eq('status', 'activo'),
      supabase.from('guards').select('id, full_name, contract_id').eq('active', true),
    ])
    let filtered = s.data || []
    if (filterContract) filtered = filtered.filter(x => x.contract_id === filterContract)
    setShifts(filtered)
    setContracts(c.data || [])
    setGuards(g.data || [])
  }

  async function createShift(e) {
    e.preventDefault()
    await supabase.from('shifts').insert({ ...form, status: 'programado' })
    setShowForm(false)
    setForm({ guard_id: '', contract_id: '', start_time: '', end_time: '' })
    loadData()
  }

  const inputStyle = { width: '100%', padding: '8px 12px', border: `1px solid ${T.BORDER}`, borderRadius: 6, fontSize: 14, fontFamily: T.FONT_BODY, boxSizing: 'border-box' }

  const filteredGuards = form.contract_id ? guards.filter(g => g.contract_id === form.contract_id) : guards

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>TURNOS</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Programacion semanal</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={{ ...inputStyle, width: 'auto' }} value={filterContract} onChange={e => setFilterContract(e.target.value)}>
            <option value="">Todos los contratos</option>
            {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
          </select>
          <button onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')} style={{
            padding: '8px 16px', background: T.BG, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 13,
          }}>{view === 'calendar' ? 'Vista Lista' : 'Vista Calendario'}</button>
          <button onClick={() => setShowForm(true)} style={{
            padding: '8px 20px', background: T.RED, color: T.WHITE, border: 'none', borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 14,
          }}>+ NUEVO TURNO</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: '6px 14px', background: T.WHITE, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer' }}>← Anterior</button>
        <span style={{ fontFamily: T.FONT_BODY, fontWeight: 600, color: T.TEXT }}>
          {days[0].toLocaleDateString()} — {days[6].toLocaleDateString()}
        </span>
        <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: '6px 14px', background: T.WHITE, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer' }}>Siguiente →</button>
        <button onClick={() => setWeekOffset(0)} style={{ padding: '6px 14px', background: T.BG, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Hoy</button>
      </div>

      {showForm && (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24, marginBottom: 20, maxWidth: 500 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, margin: '0 0 16px', color: T.TEXT }}>NUEVO TURNO</h3>
          <form onSubmit={createShift}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Contrato</label>
              <select style={inputStyle} value={form.contract_id} onChange={e => setForm(f => ({ ...f, contract_id: e.target.value, guard_id: '' }))} required>
                <option value="">Seleccionar</option>
                {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Guardia</label>
              <select style={inputStyle} value={form.guard_id} onChange={e => setForm(f => ({ ...f, guard_id: e.target.value }))} required>
                <option value="">Seleccionar</option>
                {filteredGuards.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Inicio</label>
                <input type="datetime-local" style={inputStyle} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Fin</label>
                <input type="datetime-local" style={inputStyle} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={{ padding: '8px 20px', background: T.RED, color: T.WHITE, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: T.FONT_DISPLAY }}>CREAR</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', background: T.BG, border: `1px solid ${T.BORDER}`, borderRadius: 6, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {view === 'calendar' ? (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map(d => (
              <div key={d.toISOString()} style={{ padding: '12px 8px', borderBottom: `1px solid ${T.BORDER}`, borderRight: `1px solid ${T.BORDER}`, background: T.BG, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <div style={{ fontSize: 18, fontFamily: T.FONT_DISPLAY, color: T.TEXT }}>{d.getDate()}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 120 }}>
            {days.map(d => {
              const dayStr = d.toISOString().split('T')[0]
              const dayShifts = shifts.filter(s => s.start_time?.startsWith(dayStr))
              return (
                <div key={dayStr} style={{ padding: 6, borderRight: `1px solid ${T.BORDER}`, minHeight: 100 }}>
                  {dayShifts.map(s => (
                    <div key={s.id} style={{
                      padding: '4px 6px', marginBottom: 4, borderRadius: 4, fontSize: 11, fontFamily: T.FONT_BODY,
                      background: statusColors[s.status] + '20', borderLeft: `3px solid ${statusColors[s.status]}`,
                    }}>
                      <div style={{ fontWeight: 600 }}>{s.guard?.full_name || '—'}</div>
                      <div style={{ color: T.TEXT_MUTED }}>
                        {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY, fontSize: 14 }}>
            <thead>
              <tr style={{ background: T.BG }}>
                {['Guardia', 'Fecha', 'Inicio', 'Fin', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: T.TEXT_MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600 }}>{s.guard?.full_name || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>{new Date(s.start_time).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 16px' }}>{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '10px 16px' }}>{new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: statusColors[s.status], background: statusColors[s.status] + '18' }}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
