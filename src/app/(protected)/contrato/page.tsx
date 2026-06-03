'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Trash2, FileSignature, Calendar, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/FileUpload'
import { formatBytes, formatDate, formatDateTime } from '@/lib/utils'
import type { Contract, Profile } from '@/types'

const BUCKET = 'portal-jurua-files'

export default function ContratoPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({ title: 'Contrato de Locação', valid_from: '', valid_until: '', notes: '' })
  const [uploaded, setUploaded] = useState<{ path: string; name: string; size: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof as Profile)
    const { data } = await supabase.from('contracts').select('*').order('created_at', { ascending: false })
    setContracts((data as Contract[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!uploaded) { setError('Selecione um arquivo.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('contracts').insert({
      title: form.title,
      file_name: uploaded.name,
      file_path: uploaded.path,
      file_size: uploaded.size,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      notes: form.notes || null,
      uploaded_by: user?.id,
      is_active: true,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('Contrato enviado.')
    setShowUpload(false)
    setUploaded(null)
    setForm({ title: 'Contrato de Locação', valid_from: '', valid_until: '', notes: '' })
    setTimeout(() => setSuccess(''), 3000)
    load()
  }

  const handleDownload = async (c: Contract) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(c.file_path, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (c: Contract) => {
    if (!confirm(`Remover "${c.title}"?`)) return
    await supabase.storage.from(BUCKET).remove([c.file_path])
    await supabase.from('contracts').delete().eq('id', c.id)
    load()
  }

  const handleToggleActive = async (c: Contract) => {
    await supabase.from('contracts').update({ is_active: !c.is_active }).eq('id', c.id)
    load()
  }

  if (!profile) return null
  const isAdminOrOwner = ['admin', 'owner'].includes(profile.role)

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Somente proprietário/admin pode enviar ou atualizar o contrato. Inquilino apenas consulta e baixa os arquivos.
      </div>

      {isAdminOrOwner && (
        <div className="flex justify-end">
          <button onClick={() => setShowUpload(v => !v)} className="btn-primary">
            <FileSignature className="h-4 w-4" />
            {showUpload ? 'Cancelar' : 'Enviar Contrato'}
          </button>
        </div>
      )}

      {/* Upload form */}
      {showUpload && isAdminOrOwner && (
        <div className="card p-5 space-y-4">
          <h3 className="section-title">Novo Contrato</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Título</label>
              <input
                className="input"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Início da vigência</label>
              <input type="date" className="input" value={form.valid_from}
                onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fim da vigência</label>
              <input type="date" className="input" value={form.valid_until}
                onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea rows={2} className="input" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <FileUpload
            folder="contracts"
            accept=".pdf,.doc,.docx"
            label="Arraste o contrato (PDF ou Word)"
            onUploaded={(path, name, size) => setUploaded({ path, name, size })}
            onError={setError}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowUpload(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !uploaded} className="btn-primary">
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Contract list */}
      {contracts.length === 0 ? (
        <div className="card p-10 text-center">
          <FileSignature className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">Nenhum contrato disponível.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => (
            <div key={c.id} className={`card p-4 ${!c.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-4 w-4 shrink-0 text-blue-500" />
                    <h4 className="font-semibold text-gray-900">{c.title}</h4>
                    {!c.is_active && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {c.file_name} · {formatBytes(c.file_size)}
                  </p>
                  {(c.valid_from || c.valid_until) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {c.valid_from ? formatDate(c.valid_from) : '—'} até {c.valid_until ? formatDate(c.valid_until) : '—'}
                    </p>
                  )}
                  {c.notes && <p className="mt-1 text-xs text-gray-500">{c.notes}</p>}
                  <p className="mt-1 text-xs text-gray-400">Enviado em {formatDateTime(c.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => handleDownload(c)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Baixar">
                    <Download className="h-4 w-4" />
                  </button>
                  {isAdminOrOwner && (
                    <>
                      <button onClick={() => handleToggleActive(c)}
                        className="rounded p-1.5 text-xs text-gray-500 hover:bg-gray-100">
                        {c.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => handleDelete(c)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Remover">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
