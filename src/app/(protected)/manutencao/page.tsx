'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Download, Trash2, Plus, ChevronDown, ChevronUp,
  Wrench, FileText, Image as ImageIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/FileUpload'
import { ManutencaoStatusBadge } from '@/components/ui/StatusBadge'
import { formatBytes, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { Manutencao, ManutencaoFile, ManutencaoStatus, Profile } from '@/types'
import { MANUTENCAO_STATUS_LABELS } from '@/types'

const BUCKET = 'portal-jurua-files'

export default function ManutencaoPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<Manutencao[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', date: new Date().toISOString().split('T')[0],
    status: 'registrado' as ManutencaoStatus, cost: '', notes: '',
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof as Profile)
    const { data } = await supabase
      .from('manutencao').select('*, manutencao_files(*)')
      .order('date', { ascending: false })
    setItems((data as Manutencao[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Informe o título.'); return }
    if (!form.date) { setError('Informe a data.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      date: form.date,
      status: isAdminOrOwner ? form.status : 'registrado',
      cost: isAdminOrOwner ? (form.cost ? parseFloat(form.cost) : null) : null,
      notes: form.notes || null,
      created_by: user?.id,
    }
    let err
    if (editingId) {
      const res = await supabase.from('manutencao').update(payload).eq('id', editingId)
      err = res.error
    } else {
      const res = await supabase.from('manutencao').insert(payload)
      err = res.error
    }
    if (err) { setError(err.message); return }
    setShowForm(false)
    setEditingId(null)
    setForm({ title: '', description: '', date: new Date().toISOString().split('T')[0], status: 'registrado', cost: '', notes: '' })
    setSuccess(editingId ? 'Registro atualizado.' : 'Manutenção registrada.')
    setTimeout(() => setSuccess(''), 3000)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este registro de manutenção?')) return
    const item = items.find(i => i.id === id)
    if (item?.manutencao_files?.length) {
      await supabase.storage.from(BUCKET).remove(item.manutencao_files.map(f => f.file_path))
      await supabase.from('manutencao_files').delete().eq('manutencao_id', id)
    }
    await supabase.from('manutencao').delete().eq('id', id)
    load()
  }

  const handleFileUploaded = async (
    manutencaoId: string,
    fileType: 'document' | 'photo',
    path: string,
    fileName: string,
    size: number
  ) => {
    await supabase.from('manutencao_files').insert({
      manutencao_id: manutencaoId,
      file_name: fileName,
      file_path: path,
      file_type: fileType,
      file_size: size,
    })
    load()
  }

  const handleDeleteFile = async (file: ManutencaoFile) => {
    if (!confirm(`Remover "${file.file_name}"?`)) return
    await supabase.storage.from(BUCKET).remove([file.file_path])
    await supabase.from('manutencao_files').delete().eq('id', file.id)
    load()
  }

  const handleDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  const startEdit = (item: Manutencao) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description ?? '',
      date: item.date,
      status: item.status as ManutencaoStatus,
      cost: item.cost ? String(item.cost) : '',
      notes: item.notes ?? '',
    })
    setShowForm(true)
  }

  if (!profile) return null
  const isTenant = profile.role === 'tenant'
  const isAdminOrOwner = ['admin', 'owner'].includes(profile.role)

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Inquilino pode abrir solicitação de manutenção. Proprietário/admin acompanha, atualiza status e anexa documentos ou fotos.
      </div>

      {(isAdminOrOwner || isTenant) && !showForm && (
        <div className="flex justify-end">
          <button onClick={() => { setShowForm(true); setEditingId(null) }} className="btn-primary">
            <Plus className="h-4 w-4" /> {isTenant ? 'Abrir Solicitação' : 'Registrar Manutenção'}
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (isAdminOrOwner || isTenant) && (
        <div className="card p-5 space-y-4">
          <h3 className="section-title">{editingId ? 'Editar Registro' : 'Nova Manutenção'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Título</label>
              <input className="input" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Troca da torneira da cozinha" />
            </div>
            <div>
              <label className="label">Data</label>
              <input type="date" className="input" value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            {isAdminOrOwner && (
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as ManutencaoStatus }))}>
                  {Object.entries(MANUTENCAO_STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            )}
            {isAdminOrOwner && (
              <div>
                <label className="label">Custo (R$)</label>
                <input type="number" step="0.01" min="0" className="input" value={form.cost}
                  onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="Opcional" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label">Descrição</label>
              <textarea rows={3} className="input" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descreva o problema e o serviço realizado..." />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações adicionais</label>
              <textarea rows={2} className="input" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary">
              {editingId ? 'Atualizar' : 'Registrar'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <Wrench className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">Nenhum registro de manutenção.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const isOpen = expanded === item.id
            const files = item.manutencao_files ?? []
            return (
              <div key={item.id} className="card overflow-hidden">
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Wrench className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{item.title}</span>
                      <ManutencaoStatusBadge status={item.status as ManutencaoStatus} />
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(item.date)}
                      {item.cost && ` · ${formatCurrency(item.cost)}`}
                      {files.length > 0 && ` · ${files.length} arquivo${files.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdminOrOwner && (
                      <>
                        <button onClick={e => { e.stopPropagation(); startEdit(item) }}
                          className="rounded p-1.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                          Editar
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {item.description && (
                      <p className="text-sm text-gray-700 whitespace-pre-line">{item.description}</p>
                    )}
                    {item.notes && (
                      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{item.notes}</p>
                    )}

                    {/* File uploads for owner/admin */}
                    {isAdminOrOwner && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label">Enviar Documento</label>
                          <FileUpload
                            folder={`manutencao/${item.id}/document`}
                            accept=".pdf,.doc,.docx"
                            label="Nota fiscal, orçamento..."
                            onUploaded={(path, name, size) => handleFileUploaded(item.id, 'document', path, name, size)}
                            onError={setError}
                            className="py-4"
                          />
                        </div>
                        <div>
                          <label className="label">Enviar Foto</label>
                          <FileUpload
                            folder={`manutencao/${item.id}/photo`}
                            accept=".jpg,.jpeg,.png,.heic,.webp"
                            label="Foto antes/depois"
                            onUploaded={(path, name, size) => handleFileUploaded(item.id, 'photo', path, name, size)}
                            onError={setError}
                            className="py-4"
                          />
                        </div>
                      </div>
                    )}

                    {/* Files */}
                    {files.length > 0 && (
                      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {files.map(f => (
                          <li key={f.id} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {f.file_type === 'photo'
                                ? <ImageIcon className="h-4 w-4 shrink-0 text-blue-400" />
                                : <FileText className="h-4 w-4 shrink-0 text-red-400" />}
                              <span className="truncate text-sm text-gray-700">{f.file_name}</span>
                              <span className="text-xs text-gray-400 shrink-0">{formatBytes(f.file_size)}</span>
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              <button onClick={() => handleDownload(f.file_path)}
                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                                <Download className="h-4 w-4" />
                              </button>
                              {isAdminOrOwner && (
                                <button onClick={() => handleDeleteFile(f)}
                                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="text-xs text-gray-400">
                      Registrado em {formatDateTime(item.created_at)}
                      {item.updated_at !== item.created_at && ` · Atualizado em ${formatDateTime(item.updated_at)}`}
                    </p>
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
