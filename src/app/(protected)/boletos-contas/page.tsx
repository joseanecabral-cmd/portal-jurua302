'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Download, Trash2, Plus, Receipt, ChevronDown, ChevronUp,
  Upload, AlertCircle, Calendar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/FileUpload'
import { formatBytes, formatCurrency, formatDate, formatDateTime, formatReferenceMonth } from '@/lib/utils'
import type { Boleto, BoletoType, Comprovante, Profile } from '@/types'
import { BOLETO_TYPE_LABELS } from '@/types'

const BUCKET = 'portal-jurua-files'
const BOLETO_TYPES: BoletoType[] = ['aluguel', 'condominio', 'aluguel_condominio', 'luz', 'outro']

export default function BoletosContasPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [boletos, setBoletos] = useState<(Boleto & { comprovantes: Comprovante[] })[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'aluguel' as BoletoType,
    reference_month: '',
    due_date: '',
    value: '',
    notes: '',
  })
  const [uploaded, setUploaded] = useState<{ path: string; name: string; size: number } | null>(null)
  const [comprovUploads, setComprovUploads] = useState<Record<string, { path: string; name: string; size: number }>>({})
  const [comprovNotes, setComprovNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof as Profile)
    const { data: bols } = await supabase
      .from('boletos').select('*').order('due_date', { ascending: false })
    const { data: comps } = await supabase
      .from('comprovantes').select('*').order('created_at', { ascending: false })

    const result = (bols ?? []).map((b: Boleto) => ({
      ...b,
      comprovantes: (comps ?? []).filter((c: Comprovante) => c.boleto_id === b.id),
    }))
    setBoletos(result)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSaveBoleto = async () => {
    if (!uploaded) { setError('Selecione o arquivo do boleto.'); return }
    if (!form.reference_month || !form.due_date) { setError('Preencha mês de referência e vencimento.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('boletos').insert({
      type: form.type,
      reference_month: form.reference_month,
      due_date: form.due_date,
      value: form.value ? parseFloat(form.value) : null,
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
    setForm({ type: 'aluguel', reference_month: '', due_date: '', value: '', notes: '' })
    setSuccess('Boleto enviado.')
    setTimeout(() => setSuccess(''), 3000)
    load()
  }

  const handleSendComprovante = async (boletoId: string, userId: string) => {
    const up = comprovUploads[boletoId]
    if (!up) { setError('Selecione o comprovante.'); return }
    const { error: err } = await supabase.from('comprovantes').insert({
      boleto_id: boletoId,
      user_id: userId,
      file_name: up.name,
      file_path: up.path,
      file_size: up.size,
      notes: comprovNotes[boletoId] || null,
    })
    if (err) { setError(err.message); return }
    setComprovUploads(p => { const n = { ...p }; delete n[boletoId]; return n })
    setComprovNotes(p => { const n = { ...p }; delete n[boletoId]; return n })
    setSuccess('Comprovante enviado.')
    setTimeout(() => setSuccess(''), 3000)
    load()
  }

  const handleDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  const handleDeleteBoleto = async (boleto: Boleto) => {
    if (!confirm(`Remover boleto de ${BOLETO_TYPE_LABELS[boleto.type]}?`)) return
    await supabase.storage.from(BUCKET).remove([boleto.file_path])
    await supabase.from('boletos').delete().eq('id', boleto.id)
    load()
  }

  if (!profile) return null
  const isTenant = profile.role === 'tenant'
  const isAdminOrOwner = ['admin', 'owner'].includes(profile.role)

  const isDue = (dueDate: string) => new Date(dueDate) < new Date()

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}
      {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Proprietário/admin adiciona boletos e contas de aluguel, condomínio e luz. Inquilino apenas visualiza e baixa. Caso queira, envie o comprovante de pagamento abaixo.
      </div>

      {isAdminOrOwner && !showForm && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Enviar Boleto / Conta
          </button>
        </div>
      )}

      {/* Upload form */}
      {showForm && isAdminOrOwner && (
        <div className="card p-5 space-y-4">
          <h3 className="section-title">Novo Boleto / Conta</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as BoletoType }))}>
                {BOLETO_TYPES.map(t => <option key={t} value={t}>{BOLETO_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Mês de Referência</label>
              <input type="month" className="input" value={form.reference_month}
                onChange={e => setForm(p => ({ ...p, reference_month: e.target.value }))} />
            </div>
            <div>
              <label className="label">Vencimento</label>
              <input type="date" className="input" value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input type="number" step="0.01" min="0" className="input" value={form.value}
                onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <input className="input" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <FileUpload
            folder="boletos"
            accept=".pdf,.jpg,.jpeg,.png"
            label="Enviar boleto ou conta (PDF ou imagem)"
            onUploaded={(path, name, size) => setUploaded({ path, name, size })}
            onError={setError}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setUploaded(null) }} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveBoleto} disabled={saving || !uploaded} className="btn-primary">
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Boleto list */}
      {boletos.length === 0 ? (
        <div className="card p-10 text-center">
          <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">Nenhum boleto disponível.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boletos.map(b => {
            const isOpen = expanded === b.id
            const overdue = isDue(b.due_date) && b.comprovantes.length === 0
            return (
              <div key={b.id} className={`card overflow-hidden ${overdue && isTenant ? 'border-red-200' : ''}`}>
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${overdue && isTenant ? 'bg-red-100' : 'bg-blue-50'}`}>
                    <Receipt className={`h-4 w-4 ${overdue && isTenant ? 'text-red-500' : 'text-blue-500'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{BOLETO_TYPE_LABELS[b.type]}</span>
                      <span className="text-sm text-gray-500">{formatReferenceMonth(b.reference_month)}</span>
                      {b.value && (
                        <span className="font-semibold text-gray-800">{formatCurrency(b.value)}</span>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      Vencimento: {formatDate(b.due_date)}
                      {overdue && isTenant && (
                        <span className="ml-1 font-medium text-red-600">· VENCIDO</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.comprovantes.length > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Pago
                      </span>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDownload(b.file_path) }}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Baixar boleto">
                      <Download className="h-4 w-4" />
                    </button>
                    {isAdminOrOwner && (
                      <button onClick={e => { e.stopPropagation(); handleDeleteBoleto(b) }}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    {b.notes && <p className="text-sm text-gray-600">{b.notes}</p>}

                    {/* Comprovantes list */}
                    {b.comprovantes.length > 0 && (
                      <div>
                        <p className="label">Comprovantes enviados</p>
                        <ul className="space-y-1">
                          {b.comprovantes.map(c => (
                            <li key={c.id} className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-green-800">{c.file_name}</p>
                                <p className="text-xs text-green-600">
                                  {formatBytes(c.file_size)} · {formatDateTime(c.created_at)}
                                </p>
                                {c.notes && <p className="text-xs text-green-700">{c.notes}</p>}
                              </div>
                              <button onClick={() => handleDownload(c.file_path)}
                                className="rounded p-1.5 text-green-500 hover:bg-green-100">
                                <Download className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Upload comprovante (tenant) */}
                    {isTenant && (
                      <div className="space-y-2">
                        <p className="label">Enviar Comprovante de Pagamento</p>
                        <FileUpload
                          folder={`comprovantes/${b.id}`}
                          accept=".pdf,.jpg,.jpeg,.png"
                          label="Enviar comprovante"
                          onUploaded={(path, name, size) =>
                            setComprovUploads(p => ({ ...p, [b.id]: { path, name, size } }))}
                          onError={setError}
                          className="py-4"
                        />
                        {comprovUploads[b.id] && (
                          <>
                            <textarea
                              rows={2}
                              placeholder="Observação (opcional)"
                              className="input text-sm"
                              value={comprovNotes[b.id] ?? ''}
                              onChange={e => setComprovNotes(p => ({ ...p, [b.id]: e.target.value }))}
                            />
                            <button
                              onClick={async () => {
                                const { data: { user } } = await supabase.auth.getUser()
                                if (user) handleSendComprovante(b.id, user.id)
                              }}
                              className="btn-primary"
                            >
                              <Upload className="h-4 w-4" /> Confirmar Envio
                            </button>
                          </>
                        )}
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
