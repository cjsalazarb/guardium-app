import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import Toast from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

export default function GuardiaForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [contracts, setContracts] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState(null)
  const [tempPassword, setTempPassword] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [form, setForm] = useState({
    full_name: '', ci: '', phone: '', emergency_contact: '', contract_id: '', email: '',
  })

  useEffect(() => {
    supabase.from('contracts').select('id, client_name').eq('status', 'activo').then(({ data }) => setContracts(data || []))
    if (isEdit) {
      setLoadingData(true)
      supabase.from('guards').select('*').eq('id', id).single().then(({ data }) => {
        if (data) setForm({
          full_name: data.full_name || '', ci: data.ci || '', phone: data.phone || '',
          emergency_contact: data.emergency_contact || '', contract_id: data.contract_id || '', email: '',
        })
        setLoadingData(false)
      })
    }
  }, [id, isEdit])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let photo_url = null
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}.${ext}`
        const { data: uploadData } = await supabase.storage.from('guard-photos').upload(fileName, photoFile)
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('guard-photos').getPublicUrl(fileName)
          photo_url = urlData.publicUrl
        }
      }

      if (isEdit) {
        const payload = { full_name: form.full_name, ci: form.ci, phone: form.phone, emergency_contact: form.emergency_contact, contract_id: form.contract_id || null }
        if (photo_url) payload.photo_url = photo_url
        const { error: dbError } = await supabase.from('guards').update(payload).eq('id', id)
        if (dbError) throw dbError
      } else {
        const password = Math.random().toString(36).slice(-8) + 'A1!'
        const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password })
        if (authError) throw authError

        const userId = authData.user.id
        const { error: userError } = await supabase.from('users').insert({
          id: userId, full_name: form.full_name, role: 'guardia',
          contract_id: form.contract_id || null, phone: form.phone,
          photo_url, active: true,
        })
        if (userError) throw userError
        const { error: guardError } = await supabase.from('guards').insert({
          user_id: userId, ci: form.ci, full_name: form.full_name,
          phone: form.phone, emergency_contact: form.emergency_contact,
          contract_id: form.contract_id || null, photo_url, active: true,
        })
        if (guardError) throw guardError
        setTempPassword(password)
        setSaving(false)
        return
      }
      navigate('/guardias')
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${T.BORDER}`,
    borderRadius: T.RADIUS_SM, fontSize: 15, fontFamily: T.FONT_BODY, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }

  if (isEdit && loadingData) return <Layout><div style={{padding:40,textAlign:'center',fontFamily:"'Nunito', sans-serif",color:'#6B6B6B'}}>Cargando...</div></Layout>

  if (tempPassword) {
    return (
      <Layout>
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 32, maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 8px' }}>GUARDIA CREADO</h2>
          <p style={{ fontFamily: T.FONT_BODY, color: T.TEXT_MUTED, marginBottom: 24 }}>Comparte estas credenciales con el guardia:</p>
          <div style={{ background: T.BG, borderRadius: T.RADIUS_SM, padding: 20, textAlign: 'left', fontFamily: 'monospace', fontSize: 14 }}>
            <div><strong>Email:</strong> {form.email}</div>
            <div><strong>Password:</strong> {tempPassword}</div>
          </div>
          <button onClick={() => navigate('/guardias')} style={{
            marginTop: 24, padding: '12px 32px', background: T.RED, color: T.WHITE, border: 'none',
            borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
          }}>IR A GUARDIAS</button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: '0 0 24px' }}>
        {isEdit ? 'EDITAR GUARDIA' : 'NUEVO GUARDIA'}
      </h1>
      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 32, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={saving} style={{border:'none',padding:0,margin:0}}>
          {!isEdit && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email *</label>
              <input type="email" style={inputStyle} value={form.email} onChange={e => handleChange('email', e.target.value)} required />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nombre completo *</label>
            <input style={inputStyle} value={form.full_name} onChange={e => handleChange('full_name', e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>CI *</label>
              <input style={inputStyle} value={form.ci} onChange={e => handleChange('ci', e.target.value)} required={!isEdit} />
            </div>
            <div>
              <label style={labelStyle}>Telefono</label>
              <input style={inputStyle} value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Contacto de emergencia</label>
            <input style={inputStyle} value={form.emergency_contact} onChange={e => handleChange('emergency_contact', e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Contrato asignado</label>
            <select style={inputStyle} value={form.contract_id} onChange={e => handleChange('contract_id', e.target.value)}>
              <option value="">Sin asignar</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Foto</label>
            <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} style={{ fontFamily: T.FONT_BODY }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={saving} style={{
              padding: '12px 32px', background: T.RED, color: T.WHITE, border: 'none',
              borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16,
            }}>{saving ? 'GUARDANDO...' : 'GUARDAR'}</button>
            <button type="button" onClick={() => navigate('/guardias')} style={{
              padding: '12px 32px', background: T.BG, color: T.TEXT, border: `1px solid ${T.BORDER}`,
              borderRadius: T.RADIUS_SM, cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 15,
            }}>Cancelar</button>
          </div>
          </fieldset>
        </form>
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </Layout>
  )
}
