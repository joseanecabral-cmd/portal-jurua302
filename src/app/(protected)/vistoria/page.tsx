'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Download, Trash2, Plus, ChevronDown, ChevronUp,
  FileText, Video, ClipboardList, X, Camera, Upload,
  Image as ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/FileUpload'
import { formatBytes, formatDate, formatDateTime } from '@/lib/utils'
import type {
  Vistoria, VistoriaFile, VistoriaFileCategory, VistoriaType, Profile,
} from '@/types'
import {
  VISTORIA_TYPE_LABELS,
  VISTORIA_CATEGORY_LABELS,
  PHOTO_ENVIRONMENT_CATEGORIES,
} from '@/types'

const BUCKET = 'portal-jurua-files'
type TabKey = 'laudo' | 'fotos' | 'videos' | 'termo'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'laudo',  label: 'Laudo de Vistoria'    },
  { key: 'fotos',  label: 'Acervo Fotográfico'   },
  { key: 'videos', label: 'Vídeos'               },
  { key: 'termo',  label: 'Termo de Recebimento' },
]

// ── Sub-componente: Laudo e Termo (PDFs) ──────────────────────────────────────

interface PdfSectionProps {
  files: VistoriaFile[]
  folder: string
  isAdmin: boolean
  label: string
  onUpload: (path: string, name: string, size: number) => void
  onDownload: (path: string) => void
  onDelete:   (file: VistoriaFile) => void
  onError:    (msg: string) => void
}

function PdfSection({ files, folder, isAdmin, label, onUpload, onDownload, onDelete, onError }: PdfSectionProps) {
  return (
    <div className="space-y-4">
      {isAdmin && (
        <div>
          <p className="label mb-2">{label}</p>
          <FileUpload
            folder={folder}
            accept=".pdf"
            label="Clique ou arraste o PDF"
            onUploaded={onUpload}
            onError={onError}
            className="py-4"
          />
        </div>
      )}

      {files.length > 0 ? (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {files.map(f => (
            <li key={f.id} className="flex items-center justify-between px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-red-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{f.file_name}</p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(f.file_size)} · {formatDateTime(f.created_at)}
                  </p>
                </div>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-1">
                <button
                  onClick={() => onDownload(f.file_path)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => onDelete(f)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-gray-400">Nenhum arquivo nesta seção ainda.</p>
      )}
    </div>
  )
}

// ── Sub-componente: Vídeos ────────────────────────────────────────────────────

interface VideoSectionProps {
  files: VistoriaFile[]
  vistoriaId: string
  isAdmin: boolean
  onUpload:   (path: string, name: string, size: number) => void
  onDownload: (path: string) => void
  onDelete:   (file: VistoriaFile) => void
  onError:    (msg: string) => void
}

function VideoSection({ files, vistoriaId, isAdmin, onUpload, onDownload, onDelete, onError }: VideoSectionProps) {
  return (
    <div className="space-y-4">
      {isAdmin && (
        <div>
          <p className="label mb-2">Vídeos da Vistoria</p>
          <FileUpload
            folder={`vistorias/${vistoriaId}/video`}
            accept=".mp4,.mov,.avi,.mkv"
            label="Clique ou arraste o vídeo"
            onUploaded={onUpload}
            onError={onError}
            className="py-4"
          />
        </div>
      )}

      {files.length > 0 ? (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {files.map(f => (
            <li key={f.id} className="flex items-center justify-between px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Video className="h-4 w-4 shrink-0 text-purple-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{f.file_name}</p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(f.file_size)} · {formatDateTime(f.created_at)}
                  </p>
                </div>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-1">
                <button
                  onClick={() => onDownload(f.file_path)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => onDelete(f)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-gray-400">Nenhum vídeo enviado ainda.</p>
      )}
    </div>
  )
}

// ── Sub-componente: Acervo Fotográfico ────────────────────────────────────────

interface AcervoProps {
  files: VistoriaFile[]
  vistoriaId: string
  isAdmin: boolean
  expandedEnv: string | null
  setExpandedEnv: (key: string | null) => void
  uploadTarget: { vistoriaId: string; category: string } | null
  setUploadTarget: (t: { vistoriaId: string; category: string } | null) => void
  onUpload:   (path: string, name: string, size: number, category: string) => void
  onLightbox: (file: VistoriaFile) => void
  onDownload: (path: string) => void
  onDelete:   (file: VistoriaFile) => void
  onError:    (msg: string) => void
}

function AcervoFotografico({
  files, vistoriaId, isAdmin,
  expandedEnv, setExpandedEnv,
  uploadTarget, setUploadTarget,
  onUpload, onLightbox, onDownload, onDelete, onError,
}: AcervoProps) {
  const envKey  = (cat: string) => `${vistoriaId}:${cat}`
  const isOpen  = (cat: string) => expandedEnv === envKey(cat)
  const isUp    = (cat: string) =>
    uploadTarget?.vistoriaId === vistoriaId && uploadTarget.category === cat

  const byCategory = PHOTO_ENVIRONMENT_CATEGORIES.reduce<Record<string, VistoriaFile[]>>(
    (acc, cat) => { acc[cat] = files.filter(f => f.category === cat); return acc },
    {}
  )
  const uncategorized = files.filter(
    f => !f.category || !PHOTO_ENVIRONMENT_CATEGORIES.includes(f.category as VistoriaFileCategory)
  )

  return (
    <div className="space-y-4">
      {/* Environment grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PHOTO_ENVIRONMENT_CATEGORIES.map(cat => {
          const count = byCategory[cat].length
          const open  = isOpen(cat)
          return (
            <button
              key={cat}
              onClick={() => setExpandedEnv(open ? null : envKey(cat))}
              className={`rounded-xl border-2 p-3 text-left transition-colors ${
                open
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <Camera className={`mb-1.5 h-5 w-5 ${open ? 'text-blue-600' : 'text-gray-300'}`} />
              <p className="text-xs font-semibold leading-tight text-gray-700">
                {VISTORIA_CATEGORY_LABELS[cat as VistoriaFileCategory]}
              </p>
              <p className={`mt-1 text-xl font-bold ${count > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                {count}
              </p>
              <p className="text-xs text-gray-400">{count === 1 ? 'foto' : 'fotos'}</p>
            </button>
          )
        })}
      </div>

      {/* Expanded environment section */}
      {PHOTO_ENVIRONMENT_CATEGORIES.map(cat => {
        if (!isOpen(cat)) return null
        const catFiles = byCategory[cat]
        return (
          <div key={`${cat}-panel`} className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-gray-800">
                {VISTORIA_CATEGORY_LABELS[cat as VistoriaFileCategory]}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {catFiles.length} {catFiles.length === 1 ? 'foto' : 'fotos'}
                </span>
              </h4>
              <div className="flex items-center gap-2">
                {isAdmin && !isUp(cat) && (
                  <button
                    onClick={() => setUploadTarget({ vistoriaId, category: cat })}
                    className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    <Upload className="h-3.5 w-3.5" /> Adicionar fotos
                  </button>
                )}
                <button
                  onClick={() => setExpandedEnv(null)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Upload area */}
            {isAdmin && isUp(cat) && (
              <div className="mb-4 space-y-2">
                <FileUpload
                  folder={`vistorias/${vistoriaId}/photo/${cat}`}
                  accept=".jpg,.jpeg,.png,.heic,.webp"
                  label="Clique ou arraste as fotos"
                  onUploaded={(path, name, size) => onUpload(path, name, size, cat)}
                  onError={onError}
                  className="py-4"
                />
                <button
                  onClick={() => setUploadTarget(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancelar upload
                </button>
              </div>
            )}

            {/* Photo grid */}
            {catFiles.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {catFiles.map(f => (
                  <div
                    key={f.id}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                  >
                    <button
                      onClick={() => onLightbox(f)}
                      className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 transition-colors hover:bg-blue-100"
                      title="Ampliar foto"
                    >
                      <ImageIcon className="h-8 w-8 text-gray-300 group-hover:text-blue-400" />
                      <p className="w-full truncate text-center text-xs text-gray-500">{f.file_name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(f.file_size)}</p>
                    </button>
                    <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={e => { e.stopPropagation(); onDownload(f.file_path) }}
                        className="rounded bg-white/90 p-1 text-gray-700 shadow hover:bg-white"
                        title="Baixar"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={e => { e.stopPropagation(); onDelete(f) }}
                          className="rounded bg-white/90 p-1 text-red-500 shadow hover:bg-white"
                          title="Remover"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">
                Nenhuma foto neste ambiente ainda.
              </p>
            )}
          </div>
        )
      })}

      {/* Fotos sem categoria (compatibilidade com uploads anteriores) */}
      {uncategorized.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-sm font-medium text-amber-800">
            Fotos sem ambiente definido ({uncategorized.length})
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {uncategorized.map(f => (
              <div
                key={f.id}
                className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
              >
                <button
                  onClick={() => onLightbox(f)}
                  className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 hover:bg-amber-100"
                >
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                  <p className="w-full truncate text-center text-xs text-gray-500">{f.file_name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(f.file_size)}</p>
                </button>
                <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={e => { e.stopPropagation(); onDownload(f.file_path) }}
                    className="rounded bg-white/90 p-1 text-gray-700 shadow"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(f) }}
                      className="rounded bg-white/90 p-1 text-red-500 shadow"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && !isAdmin && (
        <p className="py-6 text-center text-sm text-gray-400">
          Nenhuma foto disponível ainda.
        </p>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function VistoriaPage() {
  const [profile,       setProfile]       = useState<Profile | null>(null)
  const [vistorias,     setVistorias]     = useState<Vistoria[]>([])
  const [expanded,      setExpanded]      = useState<string | null>(null)
  const [tabMap,        setTabMap]        = useState<Record<string, TabKey>>({})
  const [expandedEnv,   setExpandedEnv]   = useState<string | null>(null)
  const [uploadTarget,  setUploadTarget]  = useState<{ vistoriaId: string; category: string } | null>(null)
  const [lightbox,      setLightbox]      = useState<{ url: string; name: string } | null>(null)
  const [showForm,      setShowForm]      = useState(false)
  const [form,          setForm]          = useState<{
    type: VistoriaType; inspection_date: string; inspector: string; notes: string
  }>({ type: 'entrada', inspection_date: '', inspector: 'Josimar Cabral', notes: '' })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof as Profile)
    const { data: vs } = await supabase
      .from('vistorias')
      .select('*, vistoria_files(*)')
      .order('inspection_date', { ascending: false })
    setVistorias((vs as Vistoria[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const getTab = (vid: string): TabKey => tabMap[vid] ?? 'laudo'
  const setTab = (vid: string, tab: TabKey) =>
    setTabMap(prev => ({ ...prev, [vid]: tab }))

  const handleCreateVistoria = async () => {
    if (!form.inspection_date) { setError('Informe a data da vistoria.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase.from('vistorias').insert({
      ...form,
      inspector:   form.inspector || 'Josimar Cabral',
      uploaded_by: user?.id,
    }).select().single()
    if (err) { setError(err.message); return }
    setExpanded(data.id)
    setShowForm(false)
    setSuccess('Vistoria criada com sucesso. Envie os arquivos nas abas abaixo.')
    setTimeout(() => setSuccess(''), 4000)
    load()
  }

  const handleFileUploaded = async (
    vistoriaId: string,
    fileType: 'pdf' | 'photo' | 'video',
    path: string,
    fileName: string,
    size: number,
    category?: string,
  ) => {
    await supabase.from('vistoria_files').insert({
      vistoria_id: vistoriaId,
      file_name:   fileName,
      file_path:   path,
      file_type:   fileType,
      file_size:   size,
      category:    category ?? null,
    })
    setUploadTarget(null)
    load()
  }

  const handleDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  const openLightbox = async (file: VistoriaFile) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(file.file_path, 300)
    if (data) setLightbox({ url: data.signedUrl, name: file.file_name })
  }

  const handleDeleteFile = async (file: VistoriaFile) => {
    if (!confirm(`Remover "${file.file_name}"?`)) return
    await supabase.storage.from(BUCKET).remove([file.file_path])
    await supabase.from('vistoria_files').delete().eq('id', file.id)
    load()
  }

  const handleDeleteVistoria = async (id: string) => {
    if (!confirm('Remover esta vistoria e todos os seus arquivos?')) return
    const v = vistorias.find(x => x.id === id)
    if (v?.vistoria_files?.length) {
      await supabase.storage.from(BUCKET).remove(v.vistoria_files.map(f => f.file_path))
    }
    await supabase.from('vistorias').delete().eq('id', id)
    load()
  }

  // Distribui arquivos por aba
  const tabFiles = (files: VistoriaFile[], tab: TabKey): VistoriaFile[] => {
    switch (tab) {
      case 'laudo':  return files.filter(f => f.file_type === 'pdf' && f.category !== 'INSPECTION_RECEIPT')
      case 'fotos':  return files.filter(f => f.file_type === 'photo')
      case 'videos': return files.filter(f => f.file_type === 'video')
      case 'termo':  return files.filter(f => f.category === 'INSPECTION_RECEIPT')
    }
  }

  if (!profile) return null
  const isAdminOrOwner = ['admin', 'owner'].includes(profile.role)

  return (
    <div className="space-y-5">
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.name}
            className="max-h-[90vh] max-w-[90vw] rounded object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
            {lightbox.name}
          </p>
        </div>
      )}

      {error   && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        {isAdminOrOwner
          ? 'Crie vistorias e organize os arquivos por seção: Laudo, Acervo Fotográfico por ambiente, Vídeos e Termo de Recebimento. Inquilinas visualizam e baixam.'
          : 'Visualize os registros de vistoria e baixe os arquivos disponibilizados pelo administrador.'}
      </div>

      {isAdminOrOwner && !showForm && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Nova Vistoria
          </button>
        </div>
      )}

      {/* Formulário de criação */}
      {showForm && isAdminOrOwner && (
        <div className="card space-y-4 p-5">
          <h3 className="section-title">Nova Vistoria</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as VistoriaType }))}
              >
                {Object.entries(VISTORIA_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Data da Vistoria</label>
              <input
                type="date"
                className="input"
                value={form.inspection_date}
                onChange={e => setForm(p => ({ ...p, inspection_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Responsável</label>
              <input
                className="input"
                value={form.inspector}
                onChange={e => setForm(p => ({ ...p, inspector: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Observações</label>
              <textarea
                rows={3}
                className="input"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Condições gerais, observações importantes..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreateVistoria} className="btn-primary">Criar Vistoria</button>
          </div>
        </div>
      )}

      {/* Lista de vistorias */}
      {vistorias.length === 0 ? (
        <div className="card p-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">Nenhuma vistoria registrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vistorias.map(v => {
            const isOpen = expanded === v.id
            const files  = v.vistoria_files ?? []
            const tab    = getTab(v.id)

            return (
              <div key={v.id} className="card overflow-hidden">
                {/* Cabeçalho da vistoria */}
                <div
                  className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : v.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        Vistoria de {VISTORIA_TYPE_LABELS[v.type]}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {files.length} arquivo{files.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(v.inspection_date)} · {v.inspector}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdminOrOwner && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteVistoria(v.id) }}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Remover vistoria"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {isOpen
                      ? <ChevronUp   className="h-4 w-4 text-gray-400" />
                      : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {v.notes && (
                      <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-600">
                        {v.notes}
                      </p>
                    )}

                    {/* Abas */}
                    <div className="flex overflow-x-auto border-b border-gray-100 bg-white">
                      {TABS.map(t => {
                        const count = tabFiles(files, t.key).length
                        return (
                          <button
                            key={t.key}
                            onClick={() => setTab(v.id, t.key)}
                            className={`flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                              tab === t.key
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            {t.label}
                            {count > 0 && (
                              <span className={`rounded-full px-1.5 py-px text-xs ${
                                tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Conteúdo da aba */}
                    <div className="p-4">
                      {tab === 'laudo' && (
                        <PdfSection
                          files={tabFiles(files, 'laudo')}
                          folder={`vistorias/${v.id}/pdf`}
                          isAdmin={isAdminOrOwner}
                          label="Laudo de Vistoria (PDF)"
                          onUpload={(path, name, size) =>
                            handleFileUploaded(v.id, 'pdf', path, name, size, 'INSPECTION_REPORT')}
                          onDownload={handleDownload}
                          onDelete={handleDeleteFile}
                          onError={setError}
                        />
                      )}

                      {tab === 'fotos' && (
                        <AcervoFotografico
                          files={tabFiles(files, 'fotos')}
                          vistoriaId={v.id}
                          isAdmin={isAdminOrOwner}
                          expandedEnv={expandedEnv}
                          setExpandedEnv={setExpandedEnv}
                          uploadTarget={uploadTarget}
                          setUploadTarget={setUploadTarget}
                          onUpload={(path, name, size, cat) =>
                            handleFileUploaded(v.id, 'photo', path, name, size, cat)}
                          onLightbox={openLightbox}
                          onDownload={handleDownload}
                          onDelete={handleDeleteFile}
                          onError={setError}
                        />
                      )}

                      {tab === 'videos' && (
                        <VideoSection
                          files={tabFiles(files, 'videos')}
                          vistoriaId={v.id}
                          isAdmin={isAdminOrOwner}
                          onUpload={(path, name, size) =>
                            handleFileUploaded(v.id, 'video', path, name, size)}
                          onDownload={handleDownload}
                          onDelete={handleDeleteFile}
                          onError={setError}
                        />
                      )}

                      {tab === 'termo' && (
                        <PdfSection
                          files={tabFiles(files, 'termo')}
                          folder={`vistorias/${v.id}/termo`}
                          isAdmin={isAdminOrOwner}
                          label="Termo de Recebimento da Vistoria (PDF)"
                          onUpload={(path, name, size) =>
                            handleFileUploaded(v.id, 'pdf', path, name, size, 'INSPECTION_RECEIPT')}
                          onDownload={handleDownload}
                          onDelete={handleDeleteFile}
                          onError={setError}
                        />
                      )}
                    </div>
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
