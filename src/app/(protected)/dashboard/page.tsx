'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText, ShieldCheck, FileSignature, ClipboardList,
  Wallet, Receipt, Wrench, ArrowRight, Clock, MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DocumentStatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import type { Profile, Document, DocumentCategory, DocumentStatus } from '@/types'

const REQUIRED_DOCUMENTS: { key: DocumentCategory; label: string }[] = [
  { key: 'rg', label: 'RG' },
  { key: 'cpf', label: 'CPF' },
  { key: 'comprovante_renda', label: 'Comprovante de renda' },
  { key: 'comprovante_residencia', label: 'Comprovante de residência' },
  { key: 'ficha_cadastral', label: 'Ficha cadastral' },
]

interface Stats {
  pendingDocs: number
  totalApplicants: number
  openMaintenance: number
  boletosThisMonth: number
}

const QUICK_LINKS = [
  { href: '/documentos',     label: 'Documentos',     icon: FileText,       roles: ['owner','admin','applicant','tenant'] },
  { href: '/mensagens',      label: 'Mensagens',       icon: MessageSquare,  roles: ['owner','admin','applicant','tenant'] },
  { href: '/admin',          label: 'Administração',   icon: ShieldCheck,    roles: ['owner','admin'] },
  { href: '/contrato',       label: 'Contrato',        icon: FileSignature,  roles: ['owner','admin','tenant'] },
  { href: '/vistoria',       label: 'Vistoria',        icon: ClipboardList,  roles: ['owner','admin','tenant'] },
  { href: '/caucao',         label: 'Caução',          icon: Wallet,         roles: ['owner','admin','tenant'] },
  { href: '/boletos-contas', label: 'Boletos',         icon: Receipt,        roles: ['owner','admin','tenant'] },
  { href: '/manutencao',     label: 'Manutenção',      icon: Wrench,         roles: ['owner','admin','tenant'] },
] as const

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [myDocs, setMyDocs] = useState<Document[]>([])
  const [recentActivity, setRecentActivity] = useState<Document[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (!prof) return
      setProfile(prof as Profile)

      if (prof.role === 'applicant') {
        const { data: docs } = await supabase
          .from('documents').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
        setMyDocs((docs as Document[]) ?? [])
        return
      }

      if (prof.role === 'tenant') {
        const { data: docs } = await supabase
          .from('documents').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5)
        setMyDocs((docs as Document[]) ?? [])
      }

      if (prof.role === 'admin' || prof.role === 'owner') {
        const [pending, applicants, maintenance, boletos, activity] = await Promise.all([
          supabase.from('documents').select('id', { count: 'exact' }).in('status', ['enviado','em_analise']),
          supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'applicant'),
          supabase.from('manutencao').select('id', { count: 'exact' }).neq('status', 'concluido'),
          supabase.from('boletos').select('id', { count: 'exact' })
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          supabase.from('documents').select('*, profiles(full_name,email)')
            .order('updated_at', { ascending: false }).limit(8),
        ])

        setStats({
          pendingDocs:      pending.count ?? 0,
          totalApplicants:  applicants.count ?? 0,
          openMaintenance:  maintenance.count ?? 0,
          boletosThisMonth: boletos.count ?? 0,
        })
        setRecentActivity((activity.data as Document[]) ?? [])
      }
    }

    load()
  }, [])

  if (!profile) return null

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

    const visibleLinks = QUICK_LINKS.filter(l =>
    (l.roles as readonly string[]).includes(profile.role)
  ).map(link => ({
    ...link,
    label: link.href === '/documentos' && profile.role === 'applicant'
      ? 'Meus Documentos'
      : link.label,
  }))

  const getChecklistStatus = (category: DocumentCategory): DocumentStatus | 'pendente' => {
    const docs = myDocs.filter(doc => doc.category === category)
    if (docs.some(doc => doc.status === 'rejeitado')) return 'rejeitado'
    if (docs.some(doc => doc.status === 'em_analise')) return 'em_analise'
    if (docs.some(doc => doc.status === 'enviado')) return 'enviado'
    if (docs.some(doc => doc.status === 'aprovado')) return 'aprovado'
    return 'pendente'
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <p className="text-blue-200">{greeting()},</p>
        <h2 className="mt-0.5 text-2xl font-bold">{profile.full_name}</h2>
        <p className="mt-1 text-sm text-blue-200">
          Portal Juruá302 · Rua Piratuba, 1580 · Joinville SC
        </p>
      </div>

      {/* Stats (admin/owner only) */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Documentos pendentes', value: stats.pendingDocs,      color: 'text-amber-600' },
            { label: 'Candidatos ativos',    value: stats.totalApplicants,  color: 'text-blue-600' },
            { label: 'Manutenções abertas',  value: stats.openMaintenance,  color: 'text-red-600' },
            { label: 'Boletos este mês',     value: stats.boletosThisMonth, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{s.label}</p>
              <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div>
        <h3 className="section-title mb-3">Acesso Rápido</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <ArrowRight className="ml-auto h-4 w-4 text-gray-300" />
            </Link>
          ))}
        </div>
      </div>

      {/* Applicant: analysis status card */}
      {profile.role === 'applicant' && (
        <div>
          <h3 className="section-title mb-3">Status da Análise</h3>
          <div className="card space-y-6 p-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">Status da Análise</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Após o envio dos documentos, a administração fará a análise. Se aprovado, seu acesso será convertido para Inquilino.
              </p>
            </div>

            <div className="grid gap-3">
              {REQUIRED_DOCUMENTS.map(item => {
                const status = getChecklistStatus(item.key)
                const badgeClasses = {
                  pendente: 'bg-slate-100 text-slate-700',
                  enviado: 'bg-amber-100 text-amber-700',
                  em_analise: 'bg-blue-100 text-blue-700',
                  correcao_solicitada: 'bg-orange-100 text-orange-700',
                  aprovado: 'bg-emerald-100 text-emerald-700',
                  rejeitado: 'bg-red-100 text-red-700',
                }
                const labels: Record<string, string> = {
                  pendente: 'Pendente',
                  enviado: 'Enviado',
                  em_analise: 'Em análise',
                  correcao_solicitada: 'Correção solicitada',
                  aprovado: 'Aprovado',
                  rejeitado: 'Rejeitado',
                }
                return (
                  <div key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses[status]}`}>
                      {labels[status]}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/documentos" className="btn-primary inline-flex justify-center">
                Enviar documentos
              </Link>
              <p className="text-sm text-slate-500">
                Use este botão para enviar seus documentos obrigatórios ao setor administrativo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin/owner: recent activity */}
      {(profile.role === 'admin' || profile.role === 'owner') && recentActivity.length > 0 && (
        <div>
          <h3 className="section-title mb-3">Atividade Recente</h3>
          <div className="card divide-y divide-gray-100">
            {recentActivity.map(doc => {
              const p = doc.profiles as { full_name: string; email: string } | undefined
              return (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{doc.file_name}</p>
                    <p className="text-xs text-gray-500">{p?.full_name ?? p?.email ?? '—'}</p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <DocumentStatusBadge status={doc.status as DocumentStatus} />
                    <span className="hidden text-xs text-gray-400 sm:block">
                      {formatDateTime(doc.updated_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <Link href="/admin" className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline">
            Ir para Administração <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

    </div>
  )
}
