'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Edit2, Check, X, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/FileUpload'
import { CaucaoStatusBadge } from '@/components/ui/StatusBadge'
import { formatBytes, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { Caucao, CaucaoStatus, Profile } from '@/types'
import { CAUCAO_STATUS_LABELS } from '@/types'

const BUCKET = 'portal-jurua-files'

export default function CaucaoPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [caucao, setCaucao] = useState<Caucao | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    value: '', deposit_date: '', return_date: '',
    status: 'pendente' as CaucaoStatus, notes: '',
  })
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
    const { data } = await supabase.from('caucao').select('*').order('created_at').limit(1).maybeSingle()
    if (data) {
      setCaucao(data as Caucao)
      setForm({
        value: String(data.value),
        deposit_date: data.deposit_date ?? '',
        return_date: data.return_date ?? '',
        status: data.status as CaucaoStatus,
        notes: data.notes ?? '',
      })
    } else {
      setEditing(true) // no record yet — show form
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.value || isNaN(parseFloat(form.value))) {
      setError('Informe um valor válido.'); return
    }
    setSaving(true)
    const payload = {
      value: parseFloat(form.value),
      deposit_date: form.deposit_date || null,
      return_date: form.return_date || null,
      status: form.status,
      notes: form.notes || null,
      ...(uploaded ? { file_name: uploaded.name, file_path: uploaded.path, file_size: uploaded.size } : {}),
    }

    let err
    if (caucao) {
      const res = await supabase.from('caucao').update(payload).eq('id', caucao.id)
      err = res.error
    } else {
      const res = await supabase.from('caucao').insert(payload)
      err = res.error
    }

    setSaving(false)
    if (err) { setError(err.message); return }

    setSuccess('Caução salva com sucesso.')
    setEditing(false)
    setUploaded(null)
    setTimeout(() => setSuccess(''), 3000)
    load()
  }

  const handleDownload = async () => {
    if (!caucao?.file_path) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caucao.file_path, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  if (!profile) return null
  const isAdmin = profile.role === 'admin'

  return (
    <div className="space-y-5 max-w-xl">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {/* View mode */}
      {caucao && !editing ? (
        <div className="card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-500" />
              <h3 className="section-title">Caução</h3>
            </div>
            {isAdmin && (
              <button onClick={() => setEditing(true)} className="btn-secondary text-xs py-1.5 px-3">
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Valor</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(caucao.value)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</p>
              <div className="mt-1"><CaucaoStatusBadge status={caucao.status as CaucaoStatus} /></div>
            </div>
            {caucao.deposit_date && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Data do Depósito</p>
                <p className="text-sm text-gray-800">{formatDate(caucao.deposit_date)}</p>
              </div>
            )}
            {caucao.return_date && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Data de Devolução</p>
                <p className="text-sm text-gray-800">{formatDate(caucao.return_date)}</p>
              </div>
            )}
          </div>

          {caucao.notes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Observações</p>
              <p className="mt-1 text-sm text-gray-700">{caucao.notes}</p>
            </div>
          )}

          {caucao.file_path && (
            <button onClick={handleDownload} className="btn-secondary w-full justify-center">
              <Download className="h-4 w-4" />
              Baixar Comprovante ({formatBytes(caucao.file_size)})
            </button>
          )}

          <p className="text-xs text-gray-400">Atualizado em {formatDateTime(caucao.updated_at)}</p>
        </div>
      ) : null}

      {/* Edit / create form */}
      {(editing || !caucao) && isAdmin && (
        <div className="card p-5 space-y-4">
          <h3 className="section-title">{caucao ? 'Editar Caução' : 'Registrar Caução'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Valor (R$)</label>
              <input type="number" step="0.01" min="0" className="input" value={form.value}
                onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder="3000.00" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value as CaucaoStatus }))}>
                {Object.entries(CAUCAO_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Data do Depósito</label>
              <input type="date" className="input" value={form.deposit_date}
                onChange={e => setForm(p => ({ ...p, deposit_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Data de Devolução</label>
              <input type="date" className="input" value={form.return_date}
                onChange={e => setForm(p => ({ ...p, return_date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea rows={2} className="input" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Comprovante (opcional)</label>
            <FileUpload
              folder="caucao"
              accept=".pdf,.jpg,.jpeg,.png"
              label="Enviar comprovante"
              onUploaded={(path, name, size) => setUploaded({ path, name, size })}
              onError={setError}
            />
          </div>
          <div className="flex justify-end gap-2">
            {caucao && (
              <button onClick={() => { setEditing(false); setUploaded(null) }} className="btn-secondary">
                <X className="h-4 w-4" /> Cancelar
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <Check className="h-4 w-4" />
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* No record yet for non-admin */}
      {!caucao && !isAdmin && (
        <div className="card p-10 text-center">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">Nenhum registro de caução disponível.</p>
        </div>
      )}
    </div>
  )
}
