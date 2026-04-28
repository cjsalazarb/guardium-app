-- ═══════════════════════════════════════
-- MIGRACIÓN: Tabla whatsapp_sessions
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  guard_id UUID REFERENCES public.guards(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id),
  state TEXT DEFAULT 'idle',
  context JSONB DEFAULT '{}',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '12 hours',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: permitir acceso desde Edge Functions (service role)
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_sessions_service" ON public.whatsapp_sessions
FOR ALL USING (true);
