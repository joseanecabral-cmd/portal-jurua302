-- ============================================================
-- Portal Juruá302 — 005: Storage (bucket + políticas)
-- Execute APÓS 004_rls_policies.sql
-- ============================================================

-- Cria o bucket 'portal-jurua-files' (privado, 50 MB por arquivo)
-- O bloco DO tenta setar file_size_limit e allowed_mime_types.
-- Se a versão do Supabase não suportar essas colunas, cai no
-- EXCEPTION e cria o bucket sem as restrições (configure pelo painel).
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'portal-jurua-files',
    'portal-jurua-files',
    false,
    52428800,
    ARRAY[
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
  ON CONFLICT (id) DO UPDATE SET
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('portal-jurua-files', 'portal-jurua-files', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ── POLÍTICAS DE STORAGE ───────────────────────────────────

-- Admin/owner: acesso total ao bucket
CREATE POLICY "Admin owner acesso total storage"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'portal-jurua-files' AND
    is_admin_or_owner()
  )
  WITH CHECK (
    bucket_id = 'portal-jurua-files' AND
    is_admin_or_owner()
  );

-- Candidatos/inquilinos: upload na pasta de documentos do próprio usuário
CREATE POLICY "Usuário upload documentos próprios"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portal-jurua-files' AND
    (storage.foldername(name))[1] = 'documents' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Inquilinos: upload de comprovantes de pagamento
CREATE POLICY "Inquilino upload comprovantes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portal-jurua-files' AND
    (storage.foldername(name))[1] = 'comprovantes' AND
    has_role('tenant')
  );

-- Candidatos/inquilinos: exclusão dos próprios documentos no storage
CREATE POLICY "Usuário deleta próprios documentos storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'portal-jurua-files' AND
    (storage.foldername(name))[1] = 'documents' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Candidatos/inquilinos: leitura dos próprios documentos
CREATE POLICY "Usuário lê próprios documentos storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'portal-jurua-files' AND
    (storage.foldername(name))[1] = 'documents' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Inquilinos: leitura das pastas autorizadas
CREATE POLICY "Inquilino lê arquivos autorizados"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'portal-jurua-files' AND
    (storage.foldername(name))[1] IN (
      'contracts', 'vistorias', 'boletos', 'manual',
      'condominio', 'caucao', 'manutencao'
    ) AND
    has_role('tenant')
  );

-- Inquilinos: leitura dos próprios comprovantes
CREATE POLICY "Inquilino lê próprios comprovantes storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'portal-jurua-files' AND
    (storage.foldername(name))[1] = 'comprovantes' AND
    EXISTS (
      SELECT 1 FROM public.comprovantes c
      WHERE c.user_id = auth.uid()
        AND c.file_path = name
    )
  );
