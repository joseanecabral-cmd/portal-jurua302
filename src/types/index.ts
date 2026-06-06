export type Role = 'owner' | 'admin' | 'applicant' | 'tenant'

export type DocumentCategory =
  | 'rg'
  | 'cpf'
  | 'comprovante_renda'
  | 'comprovante_residencia'
  | 'ficha_cadastral'
  | 'outro'

export type DocumentStatus =
  | 'enviado'
  | 'em_analise'
  | 'aprovado'
  | 'correcao_solicitada'
  | 'rejeitado'

export type VistoriaType = 'entrada' | 'saida' | 'periodica'
export type VistoriaFileType = 'pdf' | 'photo' | 'video'

export type VistoriaFileCategory =
  | 'ACCESS'
  | 'LIVING_ROOM'
  | 'KITCHEN'
  | 'LAUNDRY'
  | 'BEDROOM'
  | 'BATHROOM'
  | 'BALCONY'
  | 'GARAGE'
  | 'COMPLEMENTARY'
  | 'EXISTING_DAMAGE'
  | 'INSPECTION_REPORT'
  | 'INSPECTION_RECEIPT'

export const VISTORIA_CATEGORY_LABELS: Record<VistoriaFileCategory, string> = {
  ACCESS:             'Acesso ao Imóvel',
  LIVING_ROOM:        'Sala',
  KITCHEN:            'Cozinha',
  LAUNDRY:            'Lavanderia',
  BEDROOM:            'Quarto',
  BATHROOM:           'Banheiro',
  BALCONY:            'Sacada',
  GARAGE:             'Garagem',
  COMPLEMENTARY:      'Registros Complementares',
  EXISTING_DAMAGE:    'Avarias Existentes',
  INSPECTION_REPORT:  'Laudo de Vistoria',
  INSPECTION_RECEIPT: 'Termo de Recebimento',
}

export const PHOTO_ENVIRONMENT_CATEGORIES: VistoriaFileCategory[] = [
  'ACCESS', 'LIVING_ROOM', 'KITCHEN', 'LAUNDRY', 'BEDROOM',
  'BATHROOM', 'BALCONY', 'GARAGE', 'COMPLEMENTARY', 'EXISTING_DAMAGE',
]
export type CaucaoStatus = 'pendente' | 'recebido' | 'devolvido' | 'retido'
export type BoletoType = 'aluguel' | 'condominio' | 'aluguel_condominio' | 'luz' | 'outro'
export type ManutencaoStatus = 'registrado' | 'em_andamento' | 'concluido'
export type CondominioDocType = 'regulamento' | 'comunicado' | 'outro'
export type ManutencaoFileType = 'document' | 'photo'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  phone?: string | null
  cpf?: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  category: DocumentCategory
  label?: string | null
  file_name: string
  file_path: string
  file_size?: number | null
  mime_type?: string | null
  status: DocumentStatus
  admin_notes?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email'>
}

export interface Contract {
  id: string
  title: string
  file_name: string
  file_path: string
  file_size?: number | null
  mime_type?: string | null
  valid_from?: string | null
  valid_until?: string | null
  notes?: string | null
  uploaded_by?: string | null
  is_active: boolean
  created_at: string
}

export interface Vistoria {
  id: string
  type: VistoriaType
  inspection_date: string
  inspector: string
  notes?: string | null
  uploaded_by?: string | null
  created_at: string
  updated_at: string
  vistoria_files?: VistoriaFile[]
}

export interface VistoriaFile {
  id: string
  vistoria_id: string
  file_name: string
  file_path: string
  file_type: VistoriaFileType
  file_size?: number | null
  mime_type?: string | null
  category?: string | null
  created_at: string
}

export interface Caucao {
  id: string
  value: number
  deposit_date?: string | null
  return_date?: string | null
  status: CaucaoStatus
  file_name?: string | null
  file_path?: string | null
  file_size?: number | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Boleto {
  id: string
  type: BoletoType
  reference_month: string
  due_date: string
  value?: number | null
  file_name: string
  file_path: string
  file_size?: number | null
  notes?: string | null
  uploaded_by?: string | null
  created_at: string
  comprovantes?: Comprovante[]
}

export interface Comprovante {
  id: string
  boleto_id?: string | null
  user_id: string
  file_name: string
  file_path: string
  file_size?: number | null
  notes?: string | null
  created_at: string
}

export interface ManualItem {
  id: string
  title: string
  content?: string | null
  order_index: number
  file_name?: string | null
  file_path?: string | null
  file_size?: number | null
  created_at: string
  updated_at: string
}

export interface CondominiDoc {
  id: string
  type: CondominioDocType
  title: string
  file_name: string
  file_path: string
  file_size?: number | null
  notes?: string | null
  uploaded_by?: string | null
  created_at: string
}

export interface Manutencao {
  id: string
  title: string
  description?: string | null
  date: string
  status: ManutencaoStatus
  cost?: number | null
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  manutencao_files?: ManutencaoFile[]
}

export interface ManutencaoFile {
  id: string
  manutencao_id: string
  file_name: string
  file_path: string
  file_type: ManutencaoFileType
  file_size?: number | null
  mime_type?: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  details?: Record<string, unknown> | null
  created_at: string
  profiles?: Pick<Profile, 'id' | 'full_name'>
}

// UI helpers
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  rg: 'RG (Identidade)',
  cpf: 'CPF',
  comprovante_renda: 'Comprovante de Renda',
  comprovante_residencia: 'Comprovante de Residência',
  ficha_cadastral: 'Ficha Cadastral',
  outro: 'Outro Documento',
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  enviado: 'Enviado',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  correcao_solicitada: 'Correção Solicitada',
  rejeitado: 'Rejeitado',
}

export const VISTORIA_TYPE_LABELS: Record<VistoriaType, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  periodica: 'Periódica',
}

export const CAUCAO_STATUS_LABELS: Record<CaucaoStatus, string> = {
  pendente: 'Pendente',
  recebido: 'Recebido',
  devolvido: 'Devolvido',
  retido: 'Retido',
}

export const BOLETO_TYPE_LABELS: Record<BoletoType, string> = {
  aluguel: 'Aluguel',
  condominio: 'Condomínio',
  aluguel_condominio: 'Aluguel + Condomínio',
  luz: 'Luz',
  outro: 'Outro',
}

export const MANUTENCAO_STATUS_LABELS: Record<ManutencaoStatus, string> = {
  registrado: 'Registrado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
}

export const CONDOMINIO_TYPE_LABELS: Record<CondominioDocType, string> = {
  regulamento: 'Regulamento',
  comunicado: 'Comunicado',
  outro: 'Outro',
}

export type ReciboStatus = 'gerado' | 'pago' | 'arquivado'

export interface Recibo {
  id: string
  competencia: string
  data_pagamento: string
  aluguel: number
  condominio: number
  iptu: number
  caucao: number
  outros_valores: number
  observacoes?: string | null
  total: number
  status: ReciboStatus
  pdf_path?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export const RECIBO_STATUS_LABELS: Record<ReciboStatus, string> = {
  gerado: 'Gerado',
  pago: 'Pago',
  arquivado: 'Arquivado',
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Proprietário(a)',
  admin: 'Administrador(a)',
  applicant: 'Candidato(a)',
  tenant: 'Inquilino(a)',
}
