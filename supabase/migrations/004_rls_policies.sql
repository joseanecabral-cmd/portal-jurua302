-- ============================================================
-- Portal Juruá302 — 004: RLS e Políticas de Acesso
-- Execute APÓS 003_triggers.sql
-- ============================================================

-- ── PROFILES ───────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários leem próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins e owner leem todos os perfis"
  ON public.profiles FOR SELECT
  USING (is_admin_or_owner());

CREATE POLICY "Usuários atualizam próprio perfil (sem alterar role)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admin e owner atualiza qualquer perfil"
  ON public.profiles FOR UPDATE
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ── DOCUMENTS ──────────────────────────────────────────────

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê próprios documentos"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin/owner lê todos os documentos"
  ON public.documents FOR SELECT
  USING (is_admin_or_owner());

CREATE POLICY "Usuário insere próprios documentos"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza documentos pendentes"
  ON public.documents FOR UPDATE
  USING  (auth.uid() = user_id AND status IN ('enviado', 'correcao_solicitada'))
  WITH CHECK (auth.uid() = user_id AND status IN ('enviado', 'correcao_solicitada'));

CREATE POLICY "Admin e owner atualiza status dos documentos"
  ON public.documents FOR UPDATE
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Usuário deleta próprios documentos enviados"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id AND status IN ('enviado', 'correcao_solicitada'));

-- ── CONTRACTS ──────────────────────────────────────────────

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/owner gerencia contratos"
  ON public.contracts FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Inquilino lê contratos ativos"
  ON public.contracts FOR SELECT
  USING (has_role('tenant') AND is_active = TRUE);

-- ── VISTORIAS ──────────────────────────────────────────────

ALTER TABLE public.vistorias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vistoria_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/owner gerencia vistorias"
  ON public.vistorias FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Inquilino lê vistorias"
  ON public.vistorias FOR SELECT
  USING (has_role('tenant'));

CREATE POLICY "Admin/owner gerencia arquivos de vistoria"
  ON public.vistoria_files FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Inquilino lê arquivos de vistoria"
  ON public.vistoria_files FOR SELECT
  USING (has_role('tenant'));

-- ── CAUÇÃO ─────────────────────────────────────────────────

ALTER TABLE public.caucao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/owner gerencia caução"
  ON public.caucao FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Inquilino lê caução"
  ON public.caucao FOR SELECT
  USING (has_role('tenant'));

-- ── BOLETOS ────────────────────────────────────────────────

ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/owner gerencia boletos"
  ON public.boletos FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Inquilino lê boletos"
  ON public.boletos FOR SELECT
  USING (has_role('tenant'));

-- ── COMPROVANTES ───────────────────────────────────────────

ALTER TABLE public.comprovantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inquilino gerencia próprios comprovantes"
  ON public.comprovantes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND has_role('tenant'));

CREATE POLICY "Admin/owner lê todos os comprovantes"
  ON public.comprovantes FOR SELECT
  USING (is_admin_or_owner());

-- ── MANUAL ─────────────────────────────────────────────────

ALTER TABLE public.manual_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia itens do manual"
  ON public.manual_items FOR ALL
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

CREATE POLICY "Usuários autenticados leem manual"
  ON public.manual_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── CONDOMÍNIO ─────────────────────────────────────────────

ALTER TABLE public.condominio_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/owner gerencia docs do condomínio"
  ON public.condominio_docs FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Usuários autenticados leem docs do condomínio"
  ON public.condominio_docs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── MANUTENÇÃO ─────────────────────────────────────────────

ALTER TABLE public.manutencao       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencao_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/owner gerencia manutenção"
  ON public.manutencao FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Inquilino lê manutenção"
  ON public.manutencao FOR SELECT
  USING (has_role('tenant'));

CREATE POLICY "Admin/owner gerencia arquivos de manutenção"
  ON public.manutencao_files FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "Inquilino lê arquivos de manutenção"
  ON public.manutencao_files FOR SELECT
  USING (has_role('tenant'));
