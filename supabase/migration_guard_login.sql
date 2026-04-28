-- ═══════════════════════════════════════
-- MIGRACIÓN: Login de guardias sin email
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════

-- 1. Agregar columnas username y pin_code a guards
ALTER TABLE public.guards
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS pin_code TEXT;

-- 2. Función para generar el próximo username disponible (GRD-001, GRD-002, etc.)
CREATE OR REPLACE FUNCTION generate_guard_username()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(username FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.guards
  WHERE username LIKE 'GRD-%';
  RETURN 'GRD-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
