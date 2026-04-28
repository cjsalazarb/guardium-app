-- ═══════════════════════════════════════
-- MIGRACIÓN: RLS para tabla guards
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════

-- Permitir SELECT público (necesario para login de guardias sin auth)
CREATE POLICY "guards_public_read" ON public.guards
FOR SELECT USING (true);

-- Permitir DELETE solo para admin y superadmin
CREATE POLICY "guards_delete_admin" ON public.guards
FOR DELETE USING (
  auth.uid() IN (
    SELECT id FROM public.users
    WHERE role IN ('superadmin', 'admin')
  )
);
