-- ============================================================
-- Portal Juruá302 — 003: Triggers
-- Execute APÓS 002_tables.sql
-- ============================================================

-- updated_at automático por tabela
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vistorias_updated_at
  BEFORE UPDATE ON public.vistorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER caucao_updated_at
  BEFORE UPDATE ON public.caucao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER manual_items_updated_at
  BEFORE UPDATE ON public.manual_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER manutencao_updated_at
  BEFORE UPDATE ON public.manutencao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cria perfil automaticamente ao registrar novo usuário no Auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
