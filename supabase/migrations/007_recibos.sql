-- ============================================================
-- Portal Juruá302 — 007: Módulo de Recibos de Locação
-- Execute no SQL Editor do Supabase após 006_fix_rls_owner.sql
-- ============================================================

-- ── TABELA ─────────────────────────────────────────────────

CREATE TABLE public.recibos (
  id             UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  competencia    TEXT           NOT NULL,
  data_pagamento DATE           NOT NULL,
  aluguel        DECIMAL(10,2)  NOT NULL DEFAULT 0,
  condominio     DECIMAL(10,2)  NOT NULL DEFAULT 0,
  iptu           DECIMAL(10,2)  NOT NULL DEFAULT 0,
  caucao         DECIMAL(10,2)  NOT NULL DEFAULT 0,
  outros_valores DECIMAL(10,2)  NOT NULL DEFAULT 0,
  observacoes    TEXT,
  total          DECIMAL(10,2)  NOT NULL DEFAULT 0,
  status         TEXT           NOT NULL DEFAULT 'gerado'
                 CHECK (status IN ('gerado', 'pago', 'arquivado')),
  pdf_path       TEXT,
  created_by     UUID           REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_recibos_updated_at
  BEFORE UPDATE ON public.recibos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ────────────────────────────────────────────────────

ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e owner gerencia recibos"
  ON public.recibos FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Inquilino le recibos"
  ON public.recibos FOR SELECT
  USING (has_role('tenant'));

-- ── STORAGE: inquilinas leem PDFs de recibos ───────────────

CREATE POLICY "Inquilino le recibos storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'portal-jurua-files' AND
    (storage.foldername(name))[1] = 'recibos' AND
    has_role('tenant')
  );
