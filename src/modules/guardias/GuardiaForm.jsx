import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import Toast from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

function generarPIN() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function GuardiaForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [contracts, setContracts] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState(null)
  const [credenciales, setCredenciales] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [form, setForm] = useState({
    full_name: '', ci: '', phone: '', emergency_contact: '', contract_id: '',
  })

  useEffect(() => {
    supabase.from('contracts').select('id, client_name').eq('status', 'activo').then(({ data }) => setContracts(data || []))
    if (isEdit) {
      setLoadingData(true)
      supabase.from('guards').select('*').eq('id', id).single().then(({ data }) => {
        if (data) setForm({
          full_name: data.full_name || '', ci: data.ci || '', phone: data.phone || '',
          emergency_contact: data.emergency_contact || '', contract_id: data.contract_id || '',
        })
        setLoadingData(false)
      })
    } else {
      supabase.rpc('generate_guard_username').then(({ data }) => {
        if (data) setUsername(data)
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
        navigate('/guardias')
      } else {
        if (pin.length !== 6) {
          setError('La contrasena debe tener exactamente 6 digitos')
          setSaving(false)
          return
        }

        const finalContractId = form.contract_id || null
        const internalEmail = `${username.toLowerCase().replace('-', '')}@guardium.bo`

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: internalEmail,
          password: pin,
        })
        if (authError) throw authError

        const userId = authData.user.id
        const { error: userError } = await supabase.from('users').insert({
          id: userId, full_name: form.full_name, role: 'guardia',
          contract_id: finalContractId, phone: form.phone,
          photo_url, active: true,
        })
        if (userError) throw userError

        const { error: guardError } = await supabase.from('guards').insert({
          user_id: userId, ci: form.ci, full_name: form.full_name,
          phone: form.phone, emergency_contact: form.emergency_contact,
          contract_id: finalContractId, photo_url, active: true,
          username: username, pin_code: pin,
        })
        if (guardError) throw guardError

        setCredenciales({ username, pin, nombre: form.full_name })
      }
    } catch (err) {
      setError('Error al crear guardia: ' + err.message)
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${T.BORDER}`,
    borderRadius: T.RADIUS_SM, fontSize: 15, fontFamily: T.FONT_BODY, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }

  if (isEdit && loadingData) return <Layout><div style={{padding:40,textAlign:'center',fontFamily:"'Nunito', sans-serif",color:'#6B6B6B'}}>Cargando...</div></Layout>

  return (
    <Layout>
      <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: '0 0 24px' }}>
        {isEdit ? 'EDITAR GUARDIA' : 'NUEVO GUARDIA'}
      </h1>
      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 32, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={saving} style={{border:'none',padding:0,margin:0}}>

          {!isEdit && (
            <>
              {/* Username — solo lectura */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.TEXT_MUTED,
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Codigo de guardia
                </div>
                <input value={username} readOnly
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: `1.5px solid ${T.BORDER}`, background: T.BG,
                    fontFamily: T.FONT_DISPLAY, fontSize: 20, fontWeight: 700,
                    color: T.RED, letterSpacing: '0.1em', boxSizing: 'border-box' }} />
                <div style={{ fontSize: 11, color: T.TEXT_MUTED, marginTop: 4 }}>
                  Asignado automaticamente
                </div>
              </div>

              {/* PIN — 6 dígitos */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.TEXT_MUTED,
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Contrasena de acceso (6 digitos)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,6))}
                    placeholder="000000"
                    maxLength={6}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 10,
                      border: `1.5px solid ${T.BORDER}`, fontFamily: 'monospace',
                      fontSize: 20, letterSpacing: '0.3em', textAlign: 'center',
                      boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowPin(!showPin)}
                    style={{ padding: '10px 12px', borderRadius: 10,
                      border: `1.5px solid ${T.BORDER}`, background: 'white',
                      cursor: 'pointer', fontSize: 16 }}>
                    {showPin ? '🙈' : '👁'}
                  </button>
                  <button type="button" onClick={() => setPin(generarPIN())}
                    style={{ padding: '10px 14px', borderRadius: 10, border: 'none',
                      background: T.BLACK, color: 'white', fontFamily: T.FONT_BODY,
                      fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    🎲 Generar
                  </button>
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nombre completo *</label>
            <input style={inputStyle} value={form.full_name} onChange={e => handleChange('full_name', e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>CI {!isEdit && '*'}</label>
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

      {/* Modal de credenciales post-creación */}
      {credenciales && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: T.RADIUS, padding: 32,
            maxWidth: 400, width: '90%', boxShadow: T.SHADOW_LG,
            borderTop: `4px solid ${T.RED}` }}>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40 }}>✅</div>
              <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 22,
                color: T.BLACK, marginTop: 8 }}>
                GUARDIA CREADO
              </div>
              <div style={{ color: T.TEXT_MUTED, fontSize: 14 }}>
                {credenciales.nombre}
              </div>
            </div>

            <div style={{ background: T.BLACK, borderRadius: 12, padding: 20,
              marginBottom: 20, textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11,
                fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                CREDENCIALES DE ACCESO
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  Codigo de guardia
                </div>
                <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 32,
                  color: T.RED, letterSpacing: '0.1em' }}>
                  {credenciales.username}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  Contrasena
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 36,
                  color: 'white', letterSpacing: '0.3em', fontWeight: 700 }}>
                  {credenciales.pin}
                </div>
              </div>
            </div>

            <div style={{ color: T.TEXT_MUTED, fontSize: 13, textAlign: 'center',
              marginBottom: 20 }}>
              Entrega este codigo al guardia.<br/>
              Lo necesita para ingresar al portal desde la tablet.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button"
                onClick={() => {
                  const win = window.open('', '_blank')
                  win.document.write(`
                    <html><body style="font-family:Arial;text-align:center;padding:40px">
                      <h2>GUARDIUM - Credenciales de Acceso</h2>
                      <hr/>
                      <p><b>Guardia:</b> ${credenciales.nombre}</p>
                      <p style="font-size:24px"><b>Codigo:</b>
                        <span style="color:#C0202A;font-size:32px">
                          ${credenciales.username}
                        </span>
                      </p>
                      <p style="font-size:24px"><b>Contrasena:</b>
                        <span style="font-size:36px;font-family:monospace;
                          letter-spacing:8px">${credenciales.pin}</span>
                      </p>
                      <hr/>
                      <small>GUARDIUM Seguridad Privada</small>
                    </body></html>
                  `)
                  win.print()
                }}
                style={{ flex: 1, padding: '10px', borderRadius: 10,
                  border: `1.5px solid ${T.BORDER}`, background: 'white',
                  fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer' }}>
                🖨 Imprimir
              </button>
              <button type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Codigo: ${credenciales.username} | Contrasena: ${credenciales.pin}`
                  )
                }}
                style={{ flex: 1, padding: '10px', borderRadius: 10,
                  border: `1.5px solid ${T.BORDER}`, background: 'white',
                  fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer' }}>
                📋 Copiar
              </button>
              <button type="button"
                onClick={() => { setCredenciales(null); navigate('/guardias') }}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: T.RED, color: 'white',
                  fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
