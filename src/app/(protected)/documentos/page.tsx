'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Trash2, RefreshCw, Upload, AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/FileUpload'
import { DocumentStatusBadge } from '@/components/ui/StatusBadge'
import { formatBytes, formatDateTime } from '@/lib/utils'
import type { Document, DocumentCategory, DocumentStatus, Profile } from '@/types'
import { DOCUMENT_CATEGORY_LABELS } from '@/types'

const CATEGORIES: DocumentCategory[] = [
  'rg', 'cpf', 'comprovante_renda', 'comprovante_residencia', 'ficha_cadastral', 'outro',
]

const BUCKET = 'portal-jurua-files'

export default function DocumentosPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState<DocumentCategory | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof as Profile)
    const { data: docs } = await supabase
      .from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setDocuments((docs as Document[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const docForCategory = (cat: DocumentCategory) =>
    documents.filter(d => d.category === cat).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  const handleUploaded = async (
    cat: DocumentCategory,
    path: string,
    fileName: string,
    size: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: insertErr } = await supabase.from('documents').insert({
      user_id: user.id,
      category: cat,
      file_name: fileName,
      file_path: path,
      file_size: size,
      status: 'enviado',
    })

    if (insertErr) { setError(insertErr.message); return }

    setSuccess('Documento enviado com sucesso!')
    setUploading(null)
    setTimeout(() => setSuccess(''), 3000)
    load()
  }

  const handleDownload = async (doc: Document) => {
    const { data, error: signErr } = await supabase.storage
      .from(BUCKET).createSignedUrl(doc.file_path, 60)
    if (signErr || !data) { setError('Não foi possível baixar o arquivo.'); return }
    window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Remover "${doc.file_name}"?`)) return
    if (!['enviado', 'correcao_solicitada'].includes(doc.status)) {
      setError('Somente documentos com status "Enviado" ou "Correção Solicitada" podem ser removidos.')
      return
    }
    await supabase.storage.from(BUCKET).remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    load()
  }

  if (!profile) return null

  const isApplicantOrTenant = profile.role === 'applicant' || profile.role === 'tenant'
  const canUpload = isApplicantOrTenant

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {canUpload && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <strong>Instruções:</strong> Envie seus documentos pessoais. O proprietário/admin analisará, aprovando ou solicitando correção. Substitua o arquivo se for pedido.
        </div>
      )}

      <div className="space-y-4">
        {CATEGORIES.map(cat => {
          const docs = docForCategory(cat)
          const latestDoc = docs[0]
          const isExpanded = uploading === cat

          return (
            <div key={cat} className="card overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-800">
                    {DOCUMENT_CATEGORY_LABELS[cat]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {latestDoc && <DocumentStatusBadge status={latestDoc.status as DocumentStatus} />}
                  {canUpload && (
                    <button
                      onClick={() => setUploading(isExpanded ? null : cat)}
                      className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      {isExpanded ? (
                        <>Cancelar</>
                      ) : (
                        <><Upload className="h-3 w-3" /> {latestDoc ? 'Substituir documento' : 'Enviar documento'}</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Upload area */}
              {isExpanded && canUpload && (
                <div className="border-b border-gray-100 p-4">
                  <FileUpload
                    folder={`documents/${profile.id}/${cat}`}
                    accept=".pdf,.jpg,.jpeg,.png"
                    label="Clique ou arraste o arquivo (PDF, JPG ou PNG)"
                    onUploaded={(path, name, size) => handleUploaded(cat, path, name, size)}
                    onError={setError}
                  />
                </div>
              )}

              {/* Existing docs */}
              {docs.length > 0 ? (
                <ul className="divide-y divide-gray-50">
                  {docs.map(doc => (
                    <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{doc.file_name}</p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(doc.file_size)} · {formatDateTime(doc.created_at)}
                        </p>
                        {doc.admin_notes && (
                          <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                            <strong>Observação:</strong> {doc.admin_notes}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex shrink-0 items-center gap-2">
                        <DocumentStatusBadge status={doc.status as DocumentStatus} />
                        <button
                          onClick={() => handleDownload(doc)}
                          title="Baixar"
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        {canUpload && ['enviado', 'correcao_solicitada'].includes(doc.status) && (
                          <button
                            onClick={() => handleDelete(doc)}
                            title="Remover"
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-4 text-sm text-gray-400">
                  Nenhum documento enviado.
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={load}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Atualizar
      </button>
    </div>
  )
}
