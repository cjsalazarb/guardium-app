-- FIX: Políticas RLS para UPDATE/DELETE en proposals y proposal_items
-- Ejecutar en Supabase SQL Editor si el guardado en modo edit falla con error de permisos

-- Permitir UPDATE en proposals para superadmin y admin
CREATE POLICY "proposals_update" ON public.proposals
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('superadmin', 'admin')
  )
);

-- Permitir UPDATE en proposal_items para superadmin y admin
CREATE POLICY "proposal_items_update" ON public.proposal_items
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('superadmin', 'admin')
  )
);

-- Permitir DELETE en proposal_items para superadmin y admin
CREATE POLICY "proposal_items_delete" ON public.proposal_items
FOR DELETE USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('superadmin', 'admin')
  )
);
