import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Toast from '../../components/Toast'
import { T } from '../../styles/tokens'

export default function TabletPortal() {
  const navigate = useNavigate()
  const [guard, setGuard] = useState(null)
  const [currentShift, setCurrentShift] = useState(null)
  const [lastCheckin, setLastCheckin] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [modal, setModal] = useState(null)
  const [modalForm, setModalForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')
  const [error, setError] = useState(null)
  const [contract, setContract] = useState(null)
  const [guardSession, setGuardSession] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    const raw = localStorage.getItem('guardium_guard_session')
    if (!raw) { navigate('/login'); return }
    const session = JSON.parse(raw)
    const horasTranscurridas = (Date.now() - new Date(session.logged_at).getTime()) / (1000 * 60 * 60)
    if (horasTranscurridas > 12) {
      localStorage.removeItem('guardium_guard_session')
      navigate('/login')
      return
    }
    setGuardSession(session)
    loadData(session.guard_id)
    return () => stopCamera()
  }, [])

  async function loadData(guardId) {
    const { data: g, error: gErr } = await supabase.from('guards').select('*').eq('id', guardId).single()
    if (gErr) { setError('Error al cargar datos. Intente de nuevo.'); return }
    setGuard(g)
    if (g) {
      const { data: c } = await supabase.from('contracts').select('client_name').eq('id', g.contract_id).single()
      setContract(c)
      const now = new Date().toISOString()
      const { data: shift } = await supabase.from('shifts').select('*').eq('guard_id', g.id).lte('start_time', now).gte('end_time', now).single()
      setCurrentShift(shift)
      if (shift) {
        const { data: checkin } = await supabase.from('shift_checkins').select('*').eq('shift_id', shift.id).order('created_at', { ascending: false }).limit(1).single()
        setLastCheckin(checkin)
      }
    }
  }

  async function startCamera() {
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) { console.error(err) }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function captureAndCheckin() {
    setSaving(true)
    let photo_url = null
    try {
      if (videoRef.current) {
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8))
        const fileName = `checkin_${Date.now()}.jpg`
        await supabase.storage.from('checkin-photos').upload(fileName, blob)
        const { data } = supabase.storage.from('checkin-photos').getPublicUrl(fileName)
        photo_url = data.publicUrl
      }
    } catch (err) { console.error(err) }

    let lat = null, lng = null
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }))
      lat = pos.coords.latitude
      lng = pos.coords.longitude
    } catch (err) { console.error(err) }

    const type = (!lastCheckin || lastCheckin.type === 'salida') ? 'entrada' : 'salida'
    await supabase.from('shift_checkins').insert({
      shift_id: currentShift.id, type, photo_url, latitude: lat, longitude: lng,
    })

    if (type === 'entrada' && currentShift.status === 'programado') {
      await supabase.from('shifts').update({ status: 'activo' }).eq('id', currentShift.id)
    }

    stopCamera()
    setShowCamera(false)
    setConfirmMsg(type === 'entrada' ? 'ENTRADA REGISTRADA' : 'SALIDA REGISTRADA')
    setTimeout(() => { setConfirmMsg(''); loadData() }, 2000)
    setSaving(false)
  }

  async function saveModal(e) {
    e.preventDefault()
    setSaving(true)
    const base = { contract_id: guard?.contract_id }
    let result
    if (modal === 'novedad') {
      result = await supabase.from('novelty_log').insert({ ...base, guard_id: guard.id, shift_id: currentShift?.id, content: modalForm.content })
    } else if (modal === 'incidente') {
      result = await supabase.from('incident_reports').insert({ ...base, guard_id: guard.id, title: modalForm.title, description: modalForm.description, severity: modalForm.severity || 'bajo' })
    } else if (modal === 'vehiculo') {
      result = await supabase.from('vehicles').insert({ ...base, plate: modalForm.plate?.toUpperCase(), type: modalForm.type, brand: modalForm.brand, owner_name: modalForm.owner_name })
    } else if (modal === 'paquete') {
      result = await supabase.from('packages').insert({ ...base, recipient_name: modalForm.recipient_name, sender: modalForm.sender, description: modalForm.description })
    } else if (modal === 'visitante') {
      result = await supabase.from('visitors').insert({ ...base, full_name: modalForm.full_name, ci: modalForm.ci, reason: modalForm.reason, host_name: modalForm.host_name })
    } else if (modal === 'contratista') {
      result = await supabase.from('contractors').insert({ ...base, full_name: modalForm.full_name, company: modalForm.company, ci: modalForm.ci, permit_type: modalForm.permit_type })
    }
    if (result?.error) { setError('Error al registrar. Intente de nuevo.'); setSaving(false); return }
    setSaving(false)
    setModal(null)
    setModalForm({})
    setConfirmMsg('REGISTRADO')
    setTimeout(() => setConfirmMsg(''), 2000)
  }

  const isEntrada = !lastCheckin || lastCheckin.type === 'salida'
  const btnColor = isEntrada ? T.SUCCESS : T.RED

  const quickActions = [
    { icon: '📓', label: 'Novedad', key: 'novedad' },
    { icon: '🚨', label: 'Incidente', key: 'incidente' },
    { icon: '🚗', label: 'Vehiculo', key: 'vehiculo' },
    { icon: '📦', label: 'Paquete', key: 'paquete' },
    { icon: '👤', label: 'Visitante', key: 'visitante' },
    { icon: '🔧', label: 'Contratista', key: 'contratista' },
  ]

  const bigInput = { width: '100%', padding: '14px 16px', border: `1px solid ${T.BORDER}`, borderRadius: 12, fontSize: 18, fontFamily: T.FONT_BODY, boxSizing: 'border-box' }

  const modalFields = {
    novedad: [{ key: 'content', label: 'Novedad', type: 'textarea', required: true }],
    incidente: [
      { key: 'title', label: 'Titulo', required: true },
      { key: 'description', label: 'Descripcion', type: 'textarea' },
      { key: 'severity', label: 'Severidad', type: 'select', options: ['bajo', 'medio', 'alto', 'critico'] },
    ],
    vehiculo: [
      { key: 'plate', label: 'Placa', required: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['sedan', 'SUV', 'camioneta', 'moto', 'camion', 'otro'] },
      { key: 'brand', label: 'Marca' },
      { key: 'owner_name', label: 'Propietario' },
    ],
    paquete: [
      { key: 'recipient_name', label: 'Destinatario', required: true },
      { key: 'sender', label: 'Remitente' },
      { key: 'description', label: 'Descripcion' },
    ],
    visitante: [
      { key: 'full_name', label: 'Nombre', required: true },
      { key: 'ci', label: 'CI' },
      { key: 'reason', label: 'Motivo' },
      { key: 'host_name', label: 'A quien visita' },
    ],
    contratista: [
      { key: 'full_name', label: 'Nombre', required: true },
      { key: 'company', label: 'Empresa' },
      { key: 'ci', label: 'CI' },
      { key: 'permit_type', label: 'Tipo permiso', type: 'select', options: ['obra', 'mantenimiento', 'servicio', 'otro'] },
    ],
  }

  if (confirmMsg) {
    return (
      <div style={{ minHeight: '100vh', background: T.BLACK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>✓</div>
        <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.SUCCESS, letterSpacing: '0.05em' }}>{confirmMsg}</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: T.BLACK, color: T.WHITE, fontFamily: T.FONT_BODY, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Hola, {guard?.full_name || guardSession?.full_name || 'Guardia'}</div>
          <div style={{ fontSize: 14, color: T.STEEL }}>{contract?.client_name || guardSession?.contract_name || 'Sin contrato'}</div>
        </div>
        <button onClick={() => { localStorage.removeItem('guardium_guard_session'); navigate('/login') }} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: T.STEEL, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Salir</button>
      </div>

      {currentShift && (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: T.STEEL, marginBottom: 4 }}>TURNO ACTUAL</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {new Date(currentShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(currentShift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ fontSize: 13, color: T.STEEL, marginTop: 4 }}>Estado: {currentShift.status}</div>
        </div>
      )}

      {showCamera ? (
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: 400, borderRadius: 16, background: '#000' }} />
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={captureAndCheckin} disabled={saving} style={{
              padding: '16px 40px', background: btnColor, color: T.WHITE, border: 'none', borderRadius: 12,
              fontSize: 20, fontFamily: T.FONT_DISPLAY, cursor: 'pointer',
            }}>{saving ? 'PROCESANDO...' : 'CAPTURAR FOTO'}</button>
            <button onClick={() => { stopCamera(); setShowCamera(false) }} style={{
              padding: '16px 24px', background: 'rgba(255,255,255,0.1)', color: T.WHITE, border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 16,
            }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={startCamera} disabled={!currentShift} style={{
          width: '100%', padding: '28px 0', background: currentShift ? btnColor : T.STEEL, color: T.WHITE, border: 'none',
          borderRadius: 20, fontSize: 28, fontFamily: T.FONT_DISPLAY, cursor: currentShift ? 'pointer' : 'not-allowed',
          letterSpacing: '0.05em', marginBottom: 32, opacity: currentShift ? 1 : 0.5,
        }}>
          {!currentShift ? 'SIN TURNO ACTIVO' : isEntrada ? 'REGISTRAR ENTRADA' : 'REGISTRAR SALIDA'}
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {quickActions.map(a => (
          <button key={a.key} onClick={() => { setModal(a.key); setModalForm({}) }} style={{
            padding: '20px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 32 }}>{a.icon}</span>
            <span style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.WHITE, fontWeight: 600 }}>{a.label}</span>
          </button>
        ))}
      </div>

      <Toast message={error} onClose={() => setError(null)} />

      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1A1A1A', borderRadius: '24px 24px 0 0', padding: 32, width: '100%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto',
          }}>
            <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.WHITE, margin: '0 0 20px', fontSize: 24 }}>
              {modal.toUpperCase()}
            </h3>
            <form onSubmit={saveModal}>
              {(modalFields[modal] || []).map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: T.STEEL }}>{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea style={{ ...bigInput, minHeight: 100, resize: 'vertical' }} value={modalForm[f.key] || ''} onChange={e => setModalForm(p => ({ ...p, [f.key]: e.target.value }))} required={f.required} />
                  ) : f.type === 'select' ? (
                    <select style={bigInput} value={modalForm[f.key] || ''} onChange={e => setModalForm(p => ({ ...p, [f.key]: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input style={bigInput} value={modalForm[f.key] || ''} onChange={e => setModalForm(p => ({ ...p, [f.key]: e.target.value }))} required={f.required} />
                  )}
                </div>
              ))}
              <button type="submit" disabled={saving} style={{
                width: '100%', padding: '16px 0', background: T.RED, color: T.WHITE, border: 'none',
                borderRadius: 12, fontSize: 20, fontFamily: T.FONT_DISPLAY, cursor: 'pointer', marginTop: 8,
              }}>{saving ? 'GUARDANDO...' : 'REGISTRAR'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
