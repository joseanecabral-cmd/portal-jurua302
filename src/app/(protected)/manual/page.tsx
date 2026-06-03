'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Trash2, Plus, Edit2, Check, X, GripVertical, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/FileUpload'
import { formatBytes, formatDateTime } from '@/lib/utils'
import type { ManualItem, Profile } from '@/types'

const BUCKET = 'portal-jurua-files'

export default function ManualPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<ManualItem[]>([])
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState({ title: '', content: '' })
  const [uploaded, setUploaded] = useState<{ path: string; name: string; size: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof as Profile)
    const { data } = await supabase.from('manual_items').select('*').order('order_index')
    setItems((data as ManualItem[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const startEdit = (item?: ManualItem) => {
    if (item) {
      setEditingId(item.id)
      setForm({ title: item.title, content: item.content ?? '' })
    } else {
      setEditingId('new')
      setForm({ title: '', content: '' })
    }
    setUploaded(null)
  }

  const cancelEdit = () => { setEditingId(null); setUploaded(null) }

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Informe um título.'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      content: form.content || null,
      ...(uploaded ? { file_name: uploaded.name, file_path: uploaded.path, file_size: uploaded.size } : {}),
    }

    let err
    if (editingId === 'new') {
      const res = await supabase.from('manual_items').insert({
        ...payload,
        order_index: items.length,
      })
      err = res.error
    } else {
      const res = await supabase.from('manual_items').update(payload).eq('id', editingId)
      err = res.error
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    cancelEdit()
    load()
  }

  const handleDelete = async (item: ManualItem) => {
    if (!confirm(`Remover "${item.title}"?`)) return
    if (item.file_path) await supabase.storage.from(BUCKET).remove([item.file_path])
    await supabase.from('manual_items').delete().eq('id', item.id)
    load()
  }

  const handleDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  if (!profile) return null
  const isAdminOrOwner = ['admin', 'owner'].includes(profile.role)

  const FormBlock = ({ id }: { id: string | 'new' }) => (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
      <div>
        <label className="label">Título</label>
        <input className="input" value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Uso do Aquecedor" />
      </div>
      <div>
        <label className="label">Conteúdo (texto)</label>
        <textarea rows={4} className="input" value={form.content}
          onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
          placeholder="Orientações, instruções, cuidados..." />
      </div>
      <div>
        <label className="label">Arquivo (opcional)</label>
        <FileUpload
          folder={`manual/${id}`}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          label="Enviar documento de apoio"
          onUploaded={(path, name, size) => setUploaded({ path, name, size })}
          onError={setError}
          className="py-4"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={cancelEdit} className="btn-secondary"><X className="h-4 w-4" /> Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Check className="h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Manual criado e editado por proprietário/admin. Inquilino apenas consulta o conteúdo.
      </div>
      {isAdminOrOwner && editingId !== 'new' && (
        <div className="flex justify-end">
          <button onClick={() => startEdit()} className="btn-primary">
            <Plus className="h-4 w-4" /> Novo Item
          </button>
        </div>
      )}

      {editingId === 'new' && <FormBlock id="new" />}

      {items.length === 0 && editingId !== 'new' ? (
        <div className="card p-10 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">Manual ainda não possui conteúdo.</p>
          {isAdminOrOwner && (
            <button onClick={() => startEdit()} className="btn-primary mt-4 inline-flex">
              <Plus className="h-4 w-4" /> Adicionar primeiro item
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id}>
              {editingId === item.id ? (
                <FormBlock id={item.id} />
              ) : (
                <div className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      {item.content && (
                        <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{item.content}</p>
                      )}
                      {item.file_path && (
                        <button
                          onClick={() => handleDownload(item.file_path!)}
                          className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {item.file_name} ({formatBytes(item.file_size)})
                        </button>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        Atualizado em {formatDateTime(item.updated_at)}
                      </p>
                    </div>
                    {isAdminOrOwner && (
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => startEdit(item)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(item)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
