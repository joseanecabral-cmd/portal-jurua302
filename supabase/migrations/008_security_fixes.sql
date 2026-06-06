-- ============================================================
-- Portal Juruá302 — 008: Correções de Segurança
-- Execute no SQL Editor do Supabase após 007_recibos.sql
--
-- Problemas corrigidos:
--   1. manual_items: owner não conseguia gerenciar (has_role('admin') excluía owner)
--   2. manual_items: candidatos (applicants) podiam ler metadados
--   3. condominio_docs: candidatos podiam ler metadados
-- ============================================================

-- ── 1. manual_items: owner passa a poder gerenciar ──────────

DROP POLICY IF EXISTS "Admin gerencia itens do manual" ON public.manual_items;

CREATE POLICY "Admin e owner gerencia itens do manual"
  ON public.manual_items FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ── 2. manual_items: leitura restrita a tenant/admin/owner ──
-- Candidatos não aprovados não devem acessar conteúdo do imóvel.

DROP POLICY IF EXISTS "Usuários autenticados leem manual" ON public.manual_items;

CREATE POLICY "Tenant admin owner leem manual"
  ON public.manual_items FOR SELECT
  USING (is_admin_or_owner() OR has_role('tenant'));

-- ── 3. condominio_docs: leitura restrita a tenant/admin/owner

DROP POLICY IF EXISTS "Usuários autenticados leem docs do condomínio" ON public.condominio_docs;

CREATE POLICY "Tenant admin owner leem condominio"
  ON public.condominio_docs FOR SELECT
  USING (is_admin_or_owner() OR has_role('tenant'));
