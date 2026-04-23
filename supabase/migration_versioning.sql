-- ============================================================
-- GUARDIUM — Migración: Sistema de versionado de propuestas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columnas de versionado
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_proposal_id UUID REFERENCES public.proposals(id),
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

-- 2. Marcar todas las propuestas existentes como v1 y latest
UPDATE public.proposals
SET version = 1, is_latest = true
WHERE version IS NULL;
