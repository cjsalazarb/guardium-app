import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'
import { useAuth } from '../../lib/auth'

export default function VehiculosList() {
  const { contractId } = useAuth()
  const { id: routeContractId } = useParams()
  const location = useLocation()
  const isAdminContrato = location.pathname.startsWith('/admin/contratos/')
  const effectiveContractId = (isAdminContrato && routeContractId) ? routeContractId : null
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchPlate, setSearchPlate] = useState('')
  const [form, setForm] = useState({ plate: '', type: 'sedan', brand: '', owner_name: '', notes: '' })

  useEffect(() => { loadVehicles() }, [searchPlate, effectiveContractId])

  async function loadVehicles() {
    let q = supabase.from('vehicles').select('*').order('entry_time', { ascending: false })
    if (effectiveContractId) q = q.eq('contract_id', effectiveContractId)
    if (searchPlate.trim()) q = q.ilike('plate', `%${searchPlate.trim()}%`)
    const { data } = await q
    setVehicles(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.plate.trim()) return
    const payload = {
      plate: form.plate.trim().toUpperCase(),
      type: form.type,
      brand: form.brand.trim() || null,
      owner_name: form.owner_name.trim() || null,
      notes: form.notes.trim() || null,
      entry_time: new Date().toISOString(),
      contract_id: effectiveContractId || contractId || null,
    }
    await supabase.from('vehicles').insert(payload)
    setForm({ plate: '', type: 'sedan', brand: '', owner_name: '', notes: '' })
    setShowForm(false)
    loadVehicles()
  }

  async function registerExit(id) {
    await supabase.from('vehicles').update({ exit_time: new Date().toISOString() }).eq('id', id)
    loadVehicles()
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '-'

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${T.BORDER}`, borderRadius: T.RADIUS_SM,
    fontFamily: T.FONT_BODY, fontSize: 14, boxSizing: 'border-box', outline: 'none',
  }
  const labelStyle = { fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600, color: T.TEXT, marginBottom: 4, display: 'block' }

  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'SUV', label: 'SUV' },
    { value: 'camioneta', label: 'Camioneta' },
    { value: 'moto', label: 'Moto' },
    { value: 'camion', label: 'Camion' },
    { value: 'otro', label: 'Otro' },
  ]

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>VEHICULOS</h1>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Control vehicular</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '12px 24px', background: T.RED, color: T.WHITE, border: 'none',
          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
        }}>
          {showForm ? 'CANCELAR' : '+ REGISTRAR VEHICULO'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 22, color: T.TEXT, margin: '0 0 16px' }}>REGISTRAR ENTRADA</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Placa *</label>
              <input style={{ ...inputStyle, textTransform: 'uppercase' }} value={form.plate}
                onChange={e => setForm({ ...form, plate: e.target.value.toUpperCase() })} required />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {vehicleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Marca</label>
              <input style={inputStyle} value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Propietario</label>
              <input style={inputStyle} value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
            </div>
            <div style={{ gridColumn: '2 / -1' }}>
              <label style={labelStyle}>Notas</label>
              <input style={inputStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={{
                padding: '12px 32px', background: T.SUCCESS, color: T.WHITE, border: 'none',
                borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
              }}>REGISTRAR ENTRADA</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input placeholder="Buscar por placa..." value={searchPlate}
          onChange={e => setSearchPlate(e.target.value)}
          style={{ ...inputStyle, width: 300, textTransform: 'uppercase' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>Cargando...</div>
      ) : (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.FONT_BODY, fontSize: 14 }}>
            <thead>
              <tr style={{ background: T.BG, borderBottom: `2px solid ${T.BORDER}` }}>
                {['Placa', 'Tipo', 'Marca', 'Propietario', 'Entrada', 'Salida', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: T.TEXT, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: T.TEXT_MUTED }}>No se encontraron vehiculos</td></tr>
              ) : vehicles.map(v => {
                const inside = !v.exit_time
                return (
                  <tr key={v.id} style={{ borderBottom: `1px solid ${T.BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.BG}
                    onMouseLeave={e => e.currentTarget.style.background = T.WHITE}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: T.FONT_DISPLAY, fontSize: 16, letterSpacing: 1 }}>{v.plate}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED, textTransform: 'capitalize' }}>{v.type || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{v.brand || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED }}>{v.owner_name || '-'}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>{fmtDate(v.entry_time)}</td>
                    <td style={{ padding: '12px 16px', color: T.TEXT_MUTED, fontSize: 13 }}>{fmtDate(v.exit_time)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: inside ? T.SUCCESS_BG : T.MUTED_BG, color: inside ? T.SUCCESS : T.STEEL,
                      }}>
                        {inside ? 'DENTRO' : 'SALIO'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {inside && (
                        <button onClick={() => registerExit(v.id)} style={{
                          padding: '6px 16px', background: T.STEEL, color: T.WHITE, border: 'none',
                          borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 12, fontWeight: 600,
                        }}>SALIDA</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
