import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
const TWILIO_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER') ?? ''

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// ── Helpers ──────────────────────────────────────────

async function sendWhatsApp(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: TWILIO_NUMBER,
      To: to,
      Body: body,
    }),
  })
}

async function getSession(phone: string) {
  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone_number', phone)
    .single()
  return data
}

async function upsertSession(phone: string, updates: Record<string, unknown>) {
  const existing = await getSession(phone)
  if (existing) {
    await supabase
      .from('whatsapp_sessions')
      .update({ ...updates, last_activity: new Date().toISOString() })
      .eq('phone_number', phone)
  } else {
    await supabase
      .from('whatsapp_sessions')
      .insert({ phone_number: phone, ...updates, last_activity: new Date().toISOString() })
  }
}

async function resetSession(phone: string) {
  await supabase
    .from('whatsapp_sessions')
    .update({ state: 'idle', guard_id: null, contract_id: null, context: {}, expires_at: new Date().toISOString() })
    .eq('phone_number', phone)
}

function menuPrincipal(guardName: string, contractName: string, turnoInfo: string): string {
  return `✅ Bienvenido *${guardName}*
📋 Contrato: ${contractName}
${turnoInfo}

¿Que deseas registrar?
1️⃣ Check-in entrada
2️⃣ Check-out salida
3️⃣ Novedad
4️⃣ Incidente
5️⃣ Visitante
6️⃣ Vehiculo
0️⃣ Cerrar sesion`
}

async function getCurrentShift(guardId: string) {
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('shifts')
    .select('*')
    .eq('guard_id', guardId)
    .lte('start_time', now)
    .gte('end_time', now)
    .single()
  return data
}

// ── State Machine ────────────────────────────────────

async function procesarMensaje(from: string, body: string, mediaUrl: string | null) {
  const session = await getSession(from)
  const msg = body.trim()

  // Session expired or no session
  if (!session || new Date(session.expires_at) < new Date()) {
    if (session) await resetSession(from)
    await upsertSession(from, { state: 'awaiting_username', context: {} })
    return 'Bienvenido a *GUARDIUM* 🛡️\nIngresa tu codigo de guardia (ej: GRD-001):'
  }

  const state = session.state
  const ctx = session.context || {}

  // ── AWAITING USERNAME ──
  if (state === 'idle' || state === 'awaiting_username') {
    const username = msg.toUpperCase()
    await upsertSession(from, { state: 'awaiting_pin', context: { username } })
    return `Codigo: *${username}*\nIngresa tu contrasena (6 digitos):`
  }

  // ── AWAITING PIN ──
  if (state === 'awaiting_pin') {
    const { data: guard } = await supabase
      .from('guards')
      .select('id, full_name, username, pin_code, contract_id, active, contracts(client_name)')
      .eq('username', ctx.username)
      .single()

    if (!guard || String(guard.pin_code).trim() !== msg.trim()) {
      await upsertSession(from, { state: 'awaiting_username', context: {} })
      return '❌ Codigo o contrasena incorrectos.\nIngresa tu codigo de guardia:'
    }
    if (!guard.active) {
      await resetSession(from)
      return '❌ Tu cuenta esta inactiva. Contacta al administrador.'
    }

    const shift = await getCurrentShift(guard.id)
    const turnoInfo = shift
      ? `⏰ Turno: ${new Date(shift.start_time).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} - ${new Date(shift.end_time).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} (${shift.status})`
      : '⚠️ Sin turno activo'

    await upsertSession(from, {
      state: 'authenticated',
      guard_id: guard.id,
      contract_id: guard.contract_id,
      context: { guard_name: guard.full_name, contract_name: guard.contracts?.client_name || 'Sin contrato' },
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    })

    return menuPrincipal(guard.full_name, guard.contracts?.client_name || 'Sin contrato', turnoInfo)
  }

  // ── AUTHENTICATED — MENU PRINCIPAL ──
  if (state === 'authenticated') {
    switch (msg) {
      case '1': { // Check-in entrada
        const shift = await getCurrentShift(session.guard_id)
        if (!shift) return '⚠️ No tienes turno activo en este momento.\n\n' + menuPrincipal(ctx.guard_name, ctx.contract_name, '⚠️ Sin turno activo')

        await supabase.from('shift_checkins').insert({
          shift_id: shift.id, type: 'entrada', source: 'whatsapp',
        })
        if (shift.status === 'programado') {
          await supabase.from('shifts').update({ status: 'activo' }).eq('id', shift.id)
        }
        const hora = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
        return `✅ *ENTRADA REGISTRADA*\n📍 Hora: ${hora}\nTu turno termina a las ${new Date(shift.end_time).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}\n\nEscribe un numero del menu para continuar.`
      }
      case '2': { // Check-out salida
        const shift = await getCurrentShift(session.guard_id)
        if (!shift) return '⚠️ No tienes turno activo.\n\n' + menuPrincipal(ctx.guard_name, ctx.contract_name, '⚠️ Sin turno activo')

        await supabase.from('shift_checkins').insert({
          shift_id: shift.id, type: 'salida', source: 'whatsapp',
        })
        const hora = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
        return `✅ *SALIDA REGISTRADA*\n📍 Hora: ${hora}\n\nEscribe un numero del menu para continuar.`
      }
      case '3': // Novedad
        await upsertSession(from, { state: 'awaiting_novedad', context: ctx })
        return '📓 Escribe la novedad:'
      case '4': // Incidente
        await upsertSession(from, { state: 'awaiting_incidente_desc', context: ctx })
        return '🚨 Describe el incidente:'
      case '5': // Visitante
        await upsertSession(from, { state: 'awaiting_visitante_nombre', context: ctx })
        return '👤 Nombre del visitante:'
      case '6': // Vehiculo
        await upsertSession(from, { state: 'awaiting_vehiculo_placa', context: ctx })
        return '🚗 Placa del vehiculo:'
      case '0': // Cerrar sesion
        await resetSession(from)
        return '👋 Sesion cerrada. Escribe *Hola* para iniciar de nuevo.'
      default:
        return menuPrincipal(ctx.guard_name, ctx.contract_name, '')
    }
  }

  // ── NOVEDAD ──
  if (state === 'awaiting_novedad') {
    const shift = await getCurrentShift(session.guard_id)
    await supabase.from('novelty_log').insert({
      guard_id: session.guard_id,
      contract_id: session.contract_id,
      shift_id: shift?.id || null,
      content: msg,
      source: 'whatsapp',
    })
    await upsertSession(from, { state: 'authenticated', context: ctx })
    const hora = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
    return `✅ *Novedad registrada*\n📍 Hora: ${hora}\n\nEscribe un numero del menu para continuar.`
  }

  // ── INCIDENTE ──
  if (state === 'awaiting_incidente_desc') {
    await upsertSession(from, { state: 'awaiting_incidente_severity', context: { ...ctx, incidente_desc: msg } })
    return `¿Cual es la severidad?\n1 - Bajo\n2 - Medio\n3 - Alto\n4 - CRITICO`
  }

  if (state === 'awaiting_incidente_severity') {
    const severityMap: Record<string, string> = { '1': 'bajo', '2': 'medio', '3': 'alto', '4': 'critico' }
    const severity = severityMap[msg] || 'bajo'

    // Upload photo if media was sent
    let photo_url = null
    if (mediaUrl) {
      try {
        const res = await fetch(mediaUrl, {
          headers: { 'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`) },
        })
        const blob = await res.blob()
        const fileName = `incident_wa_${Date.now()}.jpg`
        await supabase.storage.from('incident-photos').upload(fileName, blob)
        const { data } = supabase.storage.from('incident-photos').getPublicUrl(fileName)
        photo_url = data.publicUrl
      } catch (e) { console.error('Error uploading photo:', e) }
    }

    await supabase.from('incident_reports').insert({
      guard_id: session.guard_id,
      contract_id: session.contract_id,
      title: ctx.incidente_desc?.slice(0, 100) || 'Incidente WhatsApp',
      description: ctx.incidente_desc,
      severity,
      photo_url,
      source: 'whatsapp',
    })

    await upsertSession(from, { state: 'authenticated', context: { guard_name: ctx.guard_name, contract_name: ctx.contract_name } })
    return `✅ *Incidente ${severity.toUpperCase()} registrado*\n${photo_url ? '📷 Foto adjunta\n' : ''}Se notifico al administrador.\n\nEscribe un numero del menu para continuar.`
  }

  // ── VISITANTE ──
  if (state === 'awaiting_visitante_nombre') {
    await upsertSession(from, { state: 'awaiting_visitante_ci', context: { ...ctx, visitante_nombre: msg } })
    return 'CI del visitante (o escribe "no"):'
  }

  if (state === 'awaiting_visitante_ci') {
    await upsertSession(from, { state: 'awaiting_visitante_host', context: { ...ctx, visitante_ci: msg === 'no' ? null : msg } })
    return '¿A quien visita?'
  }

  if (state === 'awaiting_visitante_host') {
    await supabase.from('visitors').insert({
      full_name: ctx.visitante_nombre,
      ci: ctx.visitante_ci,
      host_name: msg,
      contract_id: session.contract_id,
      source: 'whatsapp',
    })
    await upsertSession(from, { state: 'authenticated', context: { guard_name: ctx.guard_name, contract_name: ctx.contract_name } })
    const hora = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
    return `✅ *Visitante registrado*\n👤 ${ctx.visitante_nombre}\n📍 Entrada: ${hora}\n\nEscribe un numero del menu para continuar.`
  }

  // ── VEHICULO ──
  if (state === 'awaiting_vehiculo_placa') {
    await supabase.from('vehicles').insert({
      plate: msg.toUpperCase(),
      contract_id: session.contract_id,
      source: 'whatsapp',
    })
    await upsertSession(from, { state: 'authenticated', context: { guard_name: ctx.guard_name, contract_name: ctx.contract_name } })
    const hora = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
    return `✅ *Vehiculo registrado*\n🚗 Placa: ${msg.toUpperCase()}\n📍 Entrada: ${hora}\n\nEscribe un numero del menu para continuar.`
  }

  // Fallback
  await upsertSession(from, { state: 'awaiting_username', context: {} })
  return 'Bienvenido a *GUARDIUM* 🛡️\nIngresa tu codigo de guardia (ej: GRD-001):'
}

// ── HTTP Handler ─────────────────────────────────────

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    // Twilio sends form-urlencoded
    const formData = await req.formData()
    const from = formData.get('From') as string       // whatsapp:+591...
    const body = formData.get('Body') as string || ''
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')
    const mediaUrl = numMedia > 0 ? formData.get('MediaUrl0') as string : null

    const reply = await procesarMensaje(from, body, mediaUrl)
    await sendWhatsApp(from, reply)

    // Twilio expects TwiML or empty 200
    return new Response('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('WhatsApp bot error:', err)
    return new Response('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
})
