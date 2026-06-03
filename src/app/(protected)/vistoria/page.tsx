'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Download, Trash2, Plus, ChevronDown, ChevronUp,
  FileText, Image, Video, ClipboardList,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/FileUpload'
import { formatBytes, formatDate, formatDateTime } from '@/lib/utils'
import type { Vistoria, VistoriaFile, VistoriaType, Profile } from '@/types'
import { VISTORIA_TYPE_LABELS } from '@/types'

const BUCKET = 'portal-jurua-files'

export default function VistoriaPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vistorias, setVistorias] = useState<Vistoria[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<{
    type: VistoriaType; inspection_date: string; inspector: string; notes: string
  }>({ type: 'entrada', inspection_date: '', inspector: 'Josimar Cabral', notes: '' })
  const [newVistoriaId, setNewVistoriaId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof as Profile)

    const { data: vs } = await supabase
      .from('vistorias').select('*, vistoria_files(*)').order('inspection_date', { ascending: false })
    setVistorias((vs as Vistoria[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleCreateVistoria = async () => {
    if (!form.inspection_date) { setError('Informe a data da vistoria.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase.from('vistorias').insert({
      ...form,
      inspector: form.inspector || 'Josimar Cabral',
      uploaded_by: user?.id,
    }).select().single()
    if (err) { setError(err.message); return }
    setNewVistoriaId(data.id)
    setExpanded(data.id)
    setSuccess('Vistoria criada. Agora envie os arquivos.')
    setTimeout(() => setSuccess(''), 3000)
    load()
  }

  const handleFileUploaded = async (
    vistoriaId: string,
    fileType: 'pdf' | 'photo' | 'video',
    path: string,
    fileName: string,
    size: number
  ) => {
    await supabase.from('vistoria_files').insert({
      vistoria_id: vistoriaId,
      file_name: fileName,
      file_path: path,
      file_type: fileType,
      file_size: size,
    })
    load()
  }

  const handleDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60)
    if (data) window.open(data.signedUrl, '_blank')
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
      await supabase.from('vistoria_files').delete().eq('vistoria_id', id)
    }
    await supabase.from('vistorias').delete().eq('id', id)
    load()
  }

  if (!profile) return null
  const isAdminOrOwner = ['admin', 'owner'].includes(profile.role)

  const fileIcon = (type: string) => {
    if (type === 'pdf') return <FileText className="h-4 w-4 text-red-500" />
    if (type === 'photo') return <Image className="h-4 w-4 text-blue-500" />
    return <Video className="h-4 w-4 text-purple-500" />
  }

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Owner/admin cria vistoria com laudos, fotos e vídeos. Inquilino apenas visualiza e baixa os arquivos.
      </div>

      {isAdminOrOwner && !showForm && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Nova Vistoria
          </button>
        </div>
      )}

      {/* New vistoria form */}
      {showForm && isAdminOrOwner && (
        <div className="card p-5 space-y-4">
          <h3 className="section-title">Nova Vistoria</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as VistoriaType }))}>
                {Object.entries(VISTORIA_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Data da Vistoria</label>
              <input type="date" className="input" value={form.inspection_date}
                onChange={e => setForm(p => ({ ...p, inspection_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Responsável</label>
              <input className="input" value={form.inspector}
                onChange={e => setForm(p => ({ ...p, inspector: e.target.value }))} />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Observações</label>
              <textarea rows={3} className="input" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Condições gerais, observações importantes..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setNewVistoriaId(null) }} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreateVistoria} className="btn-primary">Criar e Enviar Arquivos</button>
          </div>
        </div>
      )}

      {/* Vistoria list */}
      {vistorias.length === 0 ? (
        <div className="card p-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">Nenhuma vistoria registrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vistorias.map(v => {
            const isOpen = expanded === v.id
            const files = v.vistoria_files ?? []
            return (
              <div key={v.id} className="card overflow-hidden">
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
                      <button onClick={e => { e.stopPropagation(); handleDeleteVistoria(v.id) }}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {v.notes && (
                      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{v.notes}</p>
                    )}

                    {/* Upload areas for owner/admin */}
                    {isAdminOrOwner && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(['pdf', 'photo', 'video'] as const).map(ft => (
                          <div key={ft}>
                            <p className="label capitalize">{ft === 'pdf' ? 'Laudo PDF' : ft === 'photo' ? 'Fotografias' : 'Vídeos'}</p>
                            <FileUpload
                              folder={`vistorias/${v.id}/${ft}`}
                              accept={ft === 'pdf' ? '.pdf' : ft === 'photo' ? '.jpg,.jpeg,.png,.heic,.webp' : '.mp4,.mov,.avi,.mkv'}
                              label={`Enviar ${ft === 'pdf' ? 'PDF' : ft === 'photo' ? 'foto' : 'vídeo'}`}
                              onUploaded={(path, name, size) => handleFileUploaded(v.id, ft, path, name, size)}
                              onError={setError}
                              className="py-4"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* File list */}
                    {files.length > 0 ? (
                      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {files.map(f => (
                          <li key={f.id} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {fileIcon(f.file_type)}
                              <span className="truncate text-sm text-gray-700">{f.file_name}</span>
                              <span className="shrink-0 text-xs text-gray-400">{formatBytes(f.file_size)}</span>
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              <button onClick={() => handleDownload(f.file_path)}
                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Baixar">
                                <Download className="h-4 w-4" />
                              </button>
                              {isAdminOrOwner && (
                                <button onClick={() => handleDeleteFile(f)}
                                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Remover">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400">Nenhum arquivo enviado ainda.</p>
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
