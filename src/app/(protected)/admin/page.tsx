'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2, XCircle, MessageSquare, UserCheck,
  ChevronDown, ChevronUp, Download, Search, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DocumentStatusBadge, RoleBadge } from '@/components/ui/StatusBadge'
import { formatBytes, formatDateTime } from '@/lib/utils'
import type { Document, DocumentCategory, DocumentStatus, Profile } from '@/types'
import { DOCUMENT_CATEGORY_LABELS } from '@/types'

const BUCKET = 'portal-jurua-files'
const REQUIRED_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'rg', 'cpf', 'comprovante_renda', 'comprovante_residencia', 'ficha_cadastral',
]

interface ApplicantGroup {
  profile: Profile
  documents: Document[]
}

export default function AdminPage() {
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [groups, setGroups] = useState<ApplicantGroup[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'applicant' | 'tenant'>('applicant')
  const [inviteMode, setInviteMode] = useState<'password' | 'email'>('password')
  const [inviteResult, setInviteResult] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [accessMessage, setAccessMessage] = useState('')
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const emailInviteUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  const isEmailInviteEnabled = Boolean(emailInviteUrl)

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMyProfile(prof as Profile)
    if (!['admin', 'owner'].includes(prof?.role ?? '')) return

    const { data: profiles } = await supabase
      .from('profiles').select('*').in('role', ['applicant', 'tenant']).order('full_name')
    const { data: docs } = await supabase
      .from('documents').select('*').order('created_at', { ascending: false })

    const g: ApplicantGroup[] = (profiles ?? []).map((p: Profile) => ({
      profile: p,
      documents: (docs ?? []).filter((d: Document) => d.user_id === p.id),
    }))

    setGroups(g)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const updateStatus = async (docId: string, status: DocumentStatus, notes?: string) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('documents').update({
      status,
      admin_notes: notes ?? null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', docId)
    setMessage(`Status atualizado para "${status}".`)
    setTimeout(() => setMessage(''), 3000)
    setLoading(false)
    load()
  }

  const getApplicantStatus = (documents: Document[]) => {
    if (documents.some(doc => doc.status === 'rejeitado')) return 'Rejeitado'
    if (REQUIRED_DOCUMENT_CATEGORIES.every(category =>
      documents.some(doc => doc.category === category && doc.status === 'aprovado')
    )) return 'Aprovado'
    if (documents.some(doc => ['enviado', 'em_analise', 'correcao_solicitada'].includes(doc.status))) {
      return 'Em análise'
    }
    return 'Pendente'
  }

  const canApproveApplicant = (documents: Document[]) =>
    REQUIRED_DOCUMENT_CATEGORIES.every(category =>
      documents.some(doc => doc.category === category && doc.status === 'aprovado')
    )

  const promoteToTenant = async (profileId: string, documents: Document[]) => {
    if (!canApproveApplicant(documents)) {
      setMessage('Não é possível aprovar como inquilino: ainda faltam documentos obrigatórios aprovados.')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    if (!confirm('Promover este candidato a Inquilino aprovado?')) return
    await supabase.from('profiles').update({ role: 'tenant' }).eq('id', profileId)
    setMessage('Usuário promovido a Inquilino.')
    setTimeout(() => setMessage(''), 3000)
    load()
  }

  const changeRole = async (profileId: string, role: string) => {
    if (!confirm(`Alterar função deste usuário para '${role}'?`)) return
    await supabase.from('profiles').update({ role }).eq('id', profileId)
    setMessage('Função atualizada.')
    setTimeout(() => setMessage(''), 3000)
    load()
  }

  const download = async (filePath: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  if (!myProfile || !['admin', 'owner'].includes(myProfile.role)) {
    return (
      <div className="card p-8 text-center text-gray-500">
        Acesso restrito a Administradores e Proprietária.
      </div>
    )
  }

  const isAdminOrOwner = ['admin', 'owner'].includes(myProfile.role)

  const filtered = groups.filter(g =>
    !search ||
    g.profile.full_name.toLowerCase().includes(search.toLowerCase()) ||
    g.profile.email.toLowerCase().includes(search.toLowerCase())
  )

  const pendingDocumentCount = filtered.reduce(
    (count, g) => count + g.documents.filter(d => ['enviado', 'em_analise', 'correcao_solicitada'].includes(d.status)).length,
    0
  )

  const inviteCandidate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setInviteResult('')
    setInviteError('')
    setTempPassword('')
    setAccessMessage('')
    setLoading(true)

    const response = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: inviteName, email: inviteEmail, role: inviteRole, mode: inviteMode }),
    })

    const data = await response.json()
    setLoading(false)

    if (!response.ok) {
      setInviteError(data.error || 'Não foi possível criar o acesso.')
      console.error('inviteCandidate error:', data)
      return
    }

    if (data.tempPassword) {
      setTempPassword(data.tempPassword)
      const msg = `Olá, segue seu acesso ao Portal Juruá302:\n\nLink: http://localhost:3002/login\nE-mail: ${inviteEmail}\nSenha temporária: ${data.tempPassword}\n\nApós entrar, altere sua senha.`
      setAccessMessage(msg)
      setInviteResult('Acesso criado com sucesso! Copie a mensagem de acesso abaixo para enviar ao usuário.')
    } else if (data.inviteByEmail) {
      setInviteResult('Convite por e-mail enviado. O usuário deverá receber um link para completar o cadastro.')
    } else {
      setInviteResult('Acesso criado com sucesso.')
    }

    setInviteName('')
    setInviteEmail('')
    setInviteRole('applicant')
    setInviteMode('password')
    load()
  }

  return (
    <div className="space-y-5">
      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar candidato..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
            <button onClick={load} className="btn-secondary">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-w-[320px]">
          <p className="mb-3 text-sm font-semibold text-slate-700">Convidar candidato</p>
          <form onSubmit={inviteCandidate} className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-700">Modo de convite</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setInviteMode('password')}
                  className={`rounded-md border px-3 py-2 text-sm ${inviteMode === 'password' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  Senha temporária
                </button>
                <button
                  type="button"
                  onClick={() => setInviteMode('email')}
                  disabled={!isEmailInviteEnabled}
                  className={`rounded-md border px-3 py-2 text-sm ${inviteMode === 'email' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'} ${!isEmailInviteEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Convite por e-mail
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {inviteMode === 'password'
                  ? 'Gera uma senha temporária visível apenas uma vez. Copie e envie manualmente ao candidato.'
                  : isEmailInviteEnabled
                    ? 'Convite por e-mail será enviado automaticamente quando houver URL pública configurada.'
                    : 'Convite por e-mail só funciona quando uma URL pública estiver configurada na Vercel.'}
              </p>
            </div>

            <div>
              <label className="label">Nome completo</label>
              <input
                type="text"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Tipo de acesso</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'applicant' | 'tenant')}
                className="input"
              >
                <option value="applicant">Candidato(a)</option>
                <option value="tenant">Inquilino(a)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading || (inviteMode === 'email' && !isEmailInviteEnabled)}
              className="btn-primary w-full justify-center"
            >
              {loading ? 'Criando…' : 'Criar acesso'}
            </button>
          </form>
          {inviteError && (
            <p className="mt-3 text-sm text-red-600">{inviteError}</p>
          )}
          {inviteResult && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-green-700 font-medium">{inviteResult}</p>
              {accessMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <p className="mb-2 font-semibold">Mensagem para copiar:</p>
                  <textarea
                    readOnly
                    value={accessMessage}
                    className="w-full h-24 rounded bg-white p-2 text-slate-900 text-xs font-mono border border-green-200"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(accessMessage)}
                    className="mt-2 w-full rounded-md bg-white px-3 py-2 text-sm text-green-700 shadow-sm hover:bg-green-100"
                  >
                    Copiar mensagem
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-500">
        {filtered.length} {filtered.length === 1 ? 'pessoa' : 'pessoas'} ·{' '}
        {pendingDocumentCount} documentos pendentes ou em análise
      </p>

      {/* Applicant list */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">Nenhum candidato encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ profile, documents }) => {
            const isOpen = expanded === profile.id
            const pending = documents.filter(d => ['enviado','em_analise'].includes(d.status)).length
            return (
              <div key={profile.id} className="card overflow-hidden">
                {/* Profile row */}
                <div
                  className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : profile.id)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{profile.full_name}</p>
                        <RoleBadge role={profile.role} />
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {getApplicantStatus(documents)}
                        </span>
                        {isAdminOrOwner && (
                          <select
                            value={profile.role}
                            onChange={e => changeRole(profile.id, e.target.value)}
                            className="ml-2 rounded border bg-white px-2 py-1 text-xs"
                          >
                            <option value="owner">owner</option>
                            <option value="admin">admin</option>
                            <option value="applicant">applicant</option>
                            <option value="tenant">tenant</option>
                          </select>
                        )}
                      </div>
                    <p className="text-sm text-gray-500">{profile.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {pending > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {pending} pendente{pending > 1 ? 's' : ''}
                      </span>
                    )}
                    {profile.role === 'applicant' && isAdminOrOwner && canApproveApplicant(documents) && (
                      <button
                        onClick={e => { e.stopPropagation(); promoteToTenant(profile.id, documents) }}
                        className="hidden items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 sm:flex"
                        title="Aprovar como inquilino"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Aprovar como inquilino
                      </button>
                    )}
                    {profile.role === 'applicant' && isAdminOrOwner && !canApproveApplicant(documents) && (
                      <span className="hidden items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 sm:flex">
                        Documentos obrigatórios ainda não aprovados
                      </span>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {/* Documents */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {documents.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-gray-400">Nenhum documento enviado.</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {documents.map(doc => (
                          <div key={doc.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <DocumentStatusBadge status={doc.status as DocumentStatus} />
                                  <span className="text-xs text-gray-500">
                                    {DOCUMENT_CATEGORY_LABELS[doc.category as keyof typeof DOCUMENT_CATEGORY_LABELS]}
                                  </span>
                                </div>
                                <p className="mt-0.5 truncate text-sm font-medium text-gray-800">{doc.file_name}</p>
                                <p className="text-xs text-gray-400">
                                  {formatBytes(doc.file_size)} · {formatDateTime(doc.created_at)}
                                </p>
                                {doc.admin_notes && (
                                  <p className="mt-1 text-xs text-amber-700">Obs: {doc.admin_notes}</p>
                                )}
                              </div>
                              <button
                                onClick={() => download(doc.file_path)}
                                className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                title="Baixar"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Actions (admin only) */}
                            {isAdminOrOwner && (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  rows={2}
                                  placeholder="Observação (opcional)"
                                  value={actionNotes[doc.id] ?? ''}
                                  onChange={e => setActionNotes(prev => ({ ...prev, [doc.id]: e.target.value }))}
                                  className="input text-xs"
                                />
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    disabled={loading || doc.status === 'aprovado'}
                                    onClick={() => updateStatus(doc.id, 'aprovado', actionNotes[doc.id])}
                                    className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-40"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                                  </button>
                                  <button
                                    disabled={loading || doc.status === 'correcao_solicitada'}
                                    onClick={() => updateStatus(doc.id, 'correcao_solicitada', actionNotes[doc.id])}
                                    className="flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" /> Solicitar Correção
                                  </button>
                                  <button
                                    disabled={loading || doc.status === 'rejeitado'}
                                    onClick={() => updateStatus(doc.id, 'rejeitado', actionNotes[doc.id])}
                                    className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Rejeitar
                                  </button>
                                  <button
                                    disabled={loading || doc.status === 'em_analise'}
                                    onClick={() => updateStatus(doc.id, 'em_analise', actionNotes[doc.id])}
                                    className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                                  >
                                    Em Análise
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mobile promote button */}
                    {profile.role === 'applicant' && isAdminOrOwner && canApproveApplicant(documents) && (
                      <div className="border-t border-gray-100 px-4 py-3 sm:hidden">
                        <button
                          onClick={() => promoteToTenant(profile.id, documents)}
                          className="btn-primary w-full justify-center"
                        >
                          <UserCheck className="h-4 w-4" />
                          Aprovar como inquilino
                        </button>
                      </div>
                    )}
                    {profile.role === 'applicant' && isAdminOrOwner && !canApproveApplicant(documents) && (
                      <div className="border-t border-gray-100 px-4 py-3 sm:hidden">
                        <span className="text-sm text-gray-500">Documentos obrigatórios ainda não aprovados.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
