import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { to, nombre, password, loginUrl } = await req.json()

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="background: #1A1A1A; padding: 24px; text-align: center;">
        <h1 style="color: white; font-size: 28px; margin: 0; letter-spacing: 3px;">GUARDIUM</h1>
        <p style="color: #C0202A; margin: 4px 0; font-weight: bold;">SEGURIDAD PRIVADA</p>
      </div>
      <div style="padding: 32px; background: #f9f9f9;">
        <h2 style="color: #1A1A1A;">Bienvenido al sistema, ${nombre}</h2>
        <p style="color: #555;">Se ha creado tu cuenta de acceso al portal de guardias GUARDIUM. Tus credenciales son:</p>
        <div style="background: white; border-left: 4px solid #C0202A; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 8px 0; color: #333;"><strong>Usuario (email):</strong></p>
          <p style="margin: 0 0 16px 0; color: #1A1A1A; font-size: 15px;">${to}</p>
          <p style="margin: 8px 0; color: #333;"><strong>Contrasena temporal:</strong></p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #C0202A; letter-spacing: 4px;">${password}</p>
        </div>
        <p style="color: #888; font-size: 13px;">Por seguridad, cambia tu contrasena despues de iniciar sesion por primera vez.</p>
        <a href="${loginUrl}" style="display: block; background: #C0202A; color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 24px;">
          Ingresar al Portal GUARDIUM
        </a>
      </div>
      <div style="background: #1A1A1A; padding: 16px; text-align: center;">
        <p style="color: #555; font-size: 12px; margin: 0;">GUARDIUM Seguridad Privada — Sistema de Gestion Operativa</p>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GUARDIUM <onboarding@resend.dev>',
        to: [to],
        subject: 'Tus credenciales de acceso — GUARDIUM Seguridad Privada',
        html: emailHtml,
      }),
    })
    const data = await res.json()
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
