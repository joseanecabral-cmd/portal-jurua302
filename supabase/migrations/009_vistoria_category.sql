-- ============================================================
-- Portal Juruá302 — 009: Categoria de arquivos de vistoria
-- Execute no SQL Editor do Supabase após 008_security_fixes.sql
--
-- Adiciona coluna category em vistoria_files para organizar
-- fotos por ambiente (Sala, Cozinha, Quarto, etc.) e distinguir
-- Laudo de Vistoria do Termo de Recebimento.
-- A coluna é nullable para compatibilidade com arquivos já existentes.
-- ============================================================

ALTER TABLE public.vistoria_files
  ADD COLUMN IF NOT EXISTS category TEXT;
