-- ============================================================
-- Portal Juruá302 — 002: Tabelas
-- Execute APÓS 001_functions.sql
-- ============================================================

-- ── PROFILES ───────────────────────────────────────────────

CREATE TABLE public.profiles (
  id          UUID        REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  role        TEXT        NOT NULL DEFAULT 'applicant'
              CHECK (role IN ('owner', 'admin', 'applicant', 'tenant')),
  phone       TEXT,
  cpf         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DOCUMENTS ──────────────────────────────────────────────

CREATE TABLE public.documents (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category    TEXT        NOT NULL
              CHECK (category IN ('rg','cpf','comprovante_renda','comprovante_residencia','ficha_cadastral','outro')),
  label       TEXT,
  file_name   TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,
  file_size   BIGINT,
  mime_type   TEXT,
  status      TEXT        NOT NULL DEFAULT 'enviado'
              CHECK (status IN ('enviado','em_analise','aprovado','correcao_solicitada','rejeitado')),
  admin_notes TEXT,
  reviewed_by UUID        REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CONTRACTS ──────────────────────────────────────────────

CREATE TABLE public.contracts (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL DEFAULT 'Contrato de Locação',
  file_name   TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,
  file_size   BIGINT,
  mime_type   TEXT,
  valid_from  DATE,
  valid_until DATE,
  notes       TEXT,
  uploaded_by UUID        REFERENCES public.profiles(id),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── VISTORIAS ──────────────────────────────────────────────

CREATE TABLE public.vistorias (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type            TEXT        NOT NULL
                  CHECK (type IN ('entrada', 'saida', 'periodica')),
  inspection_date DATE        NOT NULL,
  inspector       TEXT        NOT NULL DEFAULT 'Josimar Cabral',
  notes           TEXT,
  uploaded_by     UUID        REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.vistoria_files (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  vistoria_id UUID        NOT NULL REFERENCES public.vistorias(id) ON DELETE CASCADE,
  file_name   TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,
  file_type   TEXT        NOT NULL CHECK (file_type IN ('pdf', 'photo', 'video')),
  file_size   BIGINT,
  mime_type   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CAUÇÃO ─────────────────────────────────────────────────

CREATE TABLE public.caucao (
  id           UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  value        DECIMAL(10, 2) NOT NULL,
  deposit_date DATE,
  return_date  DATE,
  status       TEXT           NOT NULL DEFAULT 'pendente'
               CHECK (status IN ('pendente', 'recebido', 'devolvido', 'retido')),
  file_name    TEXT,
  file_path    TEXT,
  file_size    BIGINT,
  notes        TEXT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── BOLETOS ────────────────────────────────────────────────

CREATE TABLE public.boletos (
  id              UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  type            TEXT           NOT NULL
                  CHECK (type IN ('aluguel','condominio','aluguel_condominio','luz','outro')),
  reference_month TEXT           NOT NULL,
  due_date        DATE           NOT NULL,
  value           DECIMAL(10, 2),
  file_name       TEXT           NOT NULL,
  file_path       TEXT           NOT NULL,
  file_size       BIGINT,
  notes           TEXT,
  uploaded_by     UUID           REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── COMPROVANTES ───────────────────────────────────────────

CREATE TABLE public.comprovantes (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  boleto_id  UUID        REFERENCES public.boletos(id) ON DELETE SET NULL,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name  TEXT        NOT NULL,
  file_path  TEXT        NOT NULL,
  file_size  BIGINT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── MANUAL ─────────────────────────────────────────────────

CREATE TABLE public.manual_items (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  content     TEXT,
  order_index INTEGER     NOT NULL DEFAULT 0,
  file_name   TEXT,
  file_path   TEXT,
  file_size   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CONDOMÍNIO ─────────────────────────────────────────────

CREATE TABLE public.condominio_docs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type        TEXT        NOT NULL DEFAULT 'outro'
              CHECK (type IN ('regulamento', 'comunicado', 'outro')),
  title       TEXT        NOT NULL,
  file_name   TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,
  file_size   BIGINT,
  notes       TEXT,
  uploaded_by UUID        REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── MANUTENÇÃO ─────────────────────────────────────────────

CREATE TABLE public.manutencao (
  id          UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT           NOT NULL,
  description TEXT,
  date        DATE           NOT NULL,
  status      TEXT           NOT NULL DEFAULT 'registrado'
              CHECK (status IN ('registrado', 'em_andamento', 'concluido')),
  cost        DECIMAL(10, 2),
  notes       TEXT,
  created_by  UUID           REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE public.manutencao_files (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  manutencao_id  UUID        NOT NULL REFERENCES public.manutencao(id) ON DELETE CASCADE,
  file_name      TEXT        NOT NULL,
  file_path      TEXT        NOT NULL,
  file_type      TEXT        NOT NULL CHECK (file_type IN ('document', 'photo')),
  file_size      BIGINT,
  mime_type      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
