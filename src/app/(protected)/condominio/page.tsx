'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Trash2, Plus, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/FileUpload'
import { formatBytes, formatDateTime } from '@/lib/utils'
import type { CondominiDoc, CondominioDocType, Profile } from '@/types'
import { CONDOMINIO_TYPE_LABELS } from '@/types'

const BUCKET = 'portal-jurua-files'
const TYPES: CondominioDocType[] = ['regulamento', 'comunicado', 'outro']

export default function CondominioPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [docs, setDocs] = useState<CondominiDoc[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'comunicado' as CondominioDocType, title: '', notes: '' })
  const [uploaded, setUploaded] = useState<{ path: string; name: string; size: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof as Profile)
    const { data } = await supabase
      .from('condominio_docs').select('*').order('created_at', { ascending: false })
    setDocs((data as CondominiDoc[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!uploaded) { setError('Selecione um arquivo.'); return }
    if (!form.title.trim()) { setError('Informe um título.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('condominio_docs').insert({
      type: form.type,
      title: form.title.trim(),
      notes: form.notes || null,
      file_name: uploaded.name,
      file_path: uploaded.path,
      file_size: uploaded.size,
      uploaded_by: user?.id,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowForm(false)
    setUploaded(null)
    setForm({ type: 'comunicado', title: '', notes: '' })
    load()
  }

  const handleDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (doc: CondominiDoc) => {
    if (!confirm(`Remover "${doc.title}"?`)) return
    await supabase.storage.from(BUCKET).remove([doc.file_path])
    await supabase.from('condominio_docs').delete().eq('id', doc.id)
    load()
  }

  if (!profile) return null
  const isAdmin = profile.role === 'admin'

  const grouped = TYPES.reduce<Record<CondominioDocType, CondominiDoc[]>>(
    (acc, t) => ({ ...acc, [t]: docs.filter(d => d.type === t) }),
    { regulamento: [], comunicado: [], outro: [] }
  )

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {isAdmin && !showForm && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Enviar Documento
          </button>
        </div>
      )}

      {showForm && isAdmin && (
        <div className="card p-5 space-y-4">
          <h3 className="section-title">Novo Documento do Condomínio</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as CondominioDocType }))}>
                {TYPES.map(t => <option key={t} value={t}>{CONDOMINIO_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Título</label>
              <input className="input" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Comunicado Assembleia Maio 2025" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações (opcional)</label>
              <textarea rows={2} className="input" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <FileUpload
            folder="condominio"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            label="Enviar arquivo do condomínio"
            onUploaded={(path, name, size) => setUploaded({ path, name, size })}
            onError={setError}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setUploaded(null) }} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !uploaded} className="btn-primary">
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 && !showForm ? (
        <div className="card p-10 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">Nenhum documento do condomínio disponível.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {TYPES.map(type => (
            grouped[type].length > 0 && (
              <div key={type}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {CONDOMINIO_TYPE_LABELS[type]}
                </h3>
                <div className="card divide-y divide-gray-100">
                  {grouped[type].map(doc => (
                    <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-400">
                          {doc.file_name} · {formatBytes(doc.file_size)} · {formatDateTime(doc.created_at)}
                        </p>
                        {doc.notes && <p className="text-xs text-gray-500 mt-0.5">{doc.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-4 shrink-0">
                        <button onClick={() => handleDownload(doc.file_path)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Baixar">
                          <Download className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(doc)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Remover">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}
