import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

export default function ContratoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [admins, setAdmins] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_name: '', address: '', start_date: '', end_date: '',
    monthly_amount: '', status: 'activo', admin_id: '',
  })

  useEffect(() => {
    supabase.from('users').select('id, full_name').eq('role', 'admin').then(({ data }) => setAdmins(data || []))
    if (isEdit) {
      supabase.from('contracts').select('*').eq('id', id).single().then(({ data }) => {
        if (data) setForm({
          client_name: data.client_name || '', address: data.address || '',
          start_date: data.start_date || '', end_date: data.end_date || '',
          monthly_amount: data.monthly_amount || '', status: data.status || 'activo',
          admin_id: data.admin_id || '',
        })
      })
    }
  }, [id, isEdit])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      monthly_amount: form.monthly_amount ? Number(form.monthly_amount) : null,
      admin_id: form.admin_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }
    if (isEdit) {
      await supabase.from('contracts').update(payload).eq('id', id)
    } else {
      await supabase.from('contracts').insert(payload)
    }
    setSaving(false)
    navigate('/contratos')
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${T.BORDER}`,
    borderRadius: T.RADIUS_SM, fontSize: 15, fontFamily: T.FONT_BODY,
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle = { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }

  return (
    <Layout>
      <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: '0 0 24px' }}>
        {isEdit ? 'EDITAR CONTRATO' : 'NUEVO CONTRATO'}
      </h1>
      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 32, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Cliente *</label>
            <input style={inputStyle} value={form.client_name} onChange={e => handleChange('client_name', e.target.value)} required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Direccion</label>
            <input style={inputStyle} value={form.address} onChange={e => handleChange('address', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Fecha inicio</label>
              <input type="date" style={inputStyle} value={form.start_date} onChange={e => handleChange('start_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Fecha fin</label>
              <input type="date" style={inputStyle} value={form.end_date} onChange={e => handleChange('end_date', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Monto mensual (Bs.)</label>
            <input type="number" step="0.01" style={inputStyle} value={form.monthly_amount} onChange={e => handleChange('monthly_amount', e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Estado</label>
            <select style={inputStyle} value={form.status} onChange={e => handleChange('status', e.target.value)}>
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
              <option value="terminado">Terminado</option>
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Administrador</label>
            <select style={inputStyle} value={form.admin_id} onChange={e => handleChange('admin_id', e.target.value)}>
              <option value="">Sin asignar</option>
              {admins.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={saving} style={{
              padding: '12px 32px', background: T.RED, color: T.WHITE, border: 'none',
              borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
            }}>
              {saving ? 'GUARDANDO...' : 'GUARDAR'}
            </button>
            <button type="button" onClick={() => navigate('/contratos')} style={{
              padding: '12px 32px', background: T.BG, color: T.TEXT, border: `1px solid ${T.BORDER}`,
              borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 15,
            }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
