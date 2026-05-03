-- ═══════════════════════════════════════
-- MIGRACIÓN: RLS para tabla shifts
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════

-- Permitir UPDATE para usuarios autenticados (admin y superadmin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_update_authenticated' AND tablename = 'shifts') THEN
    CREATE POLICY "shifts_update_authenticated" ON public.shifts
    FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- Permitir DELETE para usuarios autenticados (admin y superadmin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_delete_authenticated' AND tablename = 'shifts') THEN
    CREATE POLICY "shifts_delete_authenticated" ON public.shifts
    FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Permitir INSERT para usuarios autenticados
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_insert_authenticated' AND tablename = 'shifts') THEN
    CREATE POLICY "shifts_insert_authenticated" ON public.shifts
    FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Permitir SELECT para usuarios autenticados
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_select_authenticated' AND tablename = 'shifts') THEN
    CREATE POLICY "shifts_select_authenticated" ON public.shifts
    FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
