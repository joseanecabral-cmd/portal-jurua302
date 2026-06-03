-- ============================================================
-- Portal Juruá302 — 006: Corrige políticas RLS para incluir 'owner'
-- Execute no SQL Editor do Supabase após 005_storage.sql
--
-- Problema corrigido: as políticas de UPDATE em profiles e documents
-- usavam has_role('admin'), que bloqueia silenciosamente o role 'owner'.
-- A função correta é is_admin_or_owner(), já usada nas políticas de SELECT.
-- ============================================================

-- ── PROFILES ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin atualiza qualquer perfil" ON public.profiles;

CREATE POLICY "Admin e owner atualiza qualquer perfil"
  ON public.profiles FOR UPDATE
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ── DOCUMENTS ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin atualiza status dos documentos" ON public.documents;

CREATE POLICY "Admin e owner atualiza status dos documentos"
  ON public.documents FOR UPDATE
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());
