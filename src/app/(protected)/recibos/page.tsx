'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, FilePlus, Pencil, RefreshCw, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import type { Recibo, ReciboStatus } from '@/types'
import { RECIBO_STATUS_LABELS } from '@/types'

const BUCKET = 'portal-jurua-files'

// ── helpers ───────────────────────────────────────────────────────────────────

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function toNum(s: string) {
  return parseFloat(s.replace(',', '.')) || 0
}

function dataBR(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function StatusBadge({ status }: { status: ReciboStatus }) {
  const cls: Record<ReciboStatus, string> = {
    gerado:    'bg-blue-100 text-blue-700',
    pago:      'bg-green-100 text-green-700',
    arquivado: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls[status]}`}>
      {RECIBO_STATUS_LABELS[status]}
    </span>
  )
}

// ── estado do formulário ──────────────────────────────────────────────────────

const EMPTY: FormState = {
  competencia: '', data_pagamento: '',
  aluguel: '', condominio: '', iptu: '', caucao: '', outros_valores: '',
  observacoes: '', status: 'gerado',
}

type FormState = {
  competencia: string
  data_pagamento: string
  aluguel: string
  condominio: string
  iptu: string
  caucao: string
  outros_valores: string
  observacoes: string
  status: ReciboStatus
}

function fromRecibo(r: Recibo): FormState {
  return {
    competencia:    r.competencia,
    data_pagamento: r.data_pagamento,
    aluguel:        String(r.aluguel),
    condominio:     String(r.condominio),
    iptu:           String(r.iptu),
    caucao:         String(r.caucao),
    outros_valores: String(r.outros_valores),
    observacoes:    r.observacoes ?? '',
    status:         r.status,
  }
}

function calcTotal(f: FormState) {
  return toNum(f.aluguel) + toNum(f.condominio) + toNum(f.iptu) +
    toNum(f.caucao) + toNum(f.outros_valores)
}

// ── view admin ────────────────────────────────────────────────────────────────

function AdminView({
  recibos, onReload,
}: {
  recibos: Recibo[]
  onReload: () => void
}) {
  const supabase = createClient()
  const [form, setForm]       = useState<FormState>(EMPTY)
  const [editId, setEditId]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')

  const flash = (text: string) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 4000)
  }

  const set = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const startEdit = (r: Recibo) => {
    setEditId(r.id)
    setForm(fromRecibo(r))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => { setEditId(null); setForm(EMPTY) }

  const total = calcTotal(form)

  const handleGenerate = async () => {
    if (!form.competencia.trim() || !form.data_pagamento) {
      flash('Competencia e data de pagamento sao obrigatorios.')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      competencia:    form.competencia.trim(),
      data_pagamento: form.data_pagamento,
      aluguel:        toNum(form.aluguel),
      condominio:     toNum(form.condominio),
      iptu:           toNum(form.iptu),
      caucao:         toNum(form.caucao),
      outros_valores: toNum(form.outros_valores),
      observacoes:    form.observacoes.trim() || null,
      total,
      status:         form.status,
    }

    // 1. Salvar registro e obter o ID
    let reciboId = editId
    if (reciboId) {
      const { error } = await supabase.from('recibos').update(payload).eq('id', reciboId)
      if (error) { flash('Erro ao salvar: ' + error.message); setLoading(false); return }
    } else {
      const { data, error } = await supabase
        .from('recibos')
        .insert([{ ...payload, created_by: user?.id }])
        .select('id')
        .single()
      if (error || !data) { flash('Erro ao criar: ' + (error?.message ?? '')); setLoading(false); return }
      reciboId = data.id as string
    }

    // 2. Gerar PDF e salvar no Storage
    try {
      const { gerarReciboPDF } = await import('@/lib/pdf/gerarRecibo')
      const blob = await gerarReciboPDF({ ...payload, id: reciboId! } as Recibo)

      const pdfPath = `recibos/${reciboId}/recibo.pdf`
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(pdfPath, blob, { contentType: 'application/pdf', upsert: true })

      if (uploadErr) {
        flash('Recibo salvo, mas erro no upload do PDF: ' + uploadErr.message)
      } else {
        await supabase.from('recibos').update({ pdf_path: pdfPath }).eq('id', reciboId!)
        flash('Recibo gerado e salvo com sucesso!')
      }
    } catch (err) {
      console.error(err)
      flash('Recibo salvo, mas falha ao gerar o PDF.')
    }

    setLoading(false)
    setEditId(null)
    setForm(EMPTY)
    onReload()
  }

  const download = async (r: Recibo) => {
    if (!r.pdf_path) { flash('PDF ainda nao gerado para este recibo.'); return }
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.pdf_path, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  const isError = msg.toLowerCase().startsWith('erro') || msg.toLowerCase().startsWith('recibo salvo, mas')

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-lg p-3 text-sm ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg}
        </div>
      )}

      {/* Formulário */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {editId ? 'Editar Recibo' : 'Novo Recibo'}
          </h2>
          {editId && (
            <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1 text-xs">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Competencia *</label>
            <input
              type="text"
              placeholder="Ex.: Junho/2026"
              value={form.competencia}
              onChange={e => set('competencia', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Data de pagamento *</label>
            <input
              type="date"
              value={form.data_pagamento}
              onChange={e => set('data_pagamento', e.target.value)}
              className="input"
            />
          </div>

          {(
            [
              ['aluguel',        'Aluguel (R$)'],
              ['condominio',     'Condominio (R$)'],
              ['iptu',           'IPTU (R$)'],
              ['caucao',         'Caucao (R$)'],
              ['outros_valores', 'Outros valores (R$)'],
            ] as [keyof FormState, string][]
          ).map(([field, label]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form[field]}
                onChange={e => set(field, e.target.value)}
                className="input"
              />
            </div>
          ))}

          <div>
            <label className="label">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value as ReciboStatus)}
              className="input"
            >
              {(Object.entries(RECIBO_STATUS_LABELS) as [ReciboStatus, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Observacoes</label>
          <textarea
            rows={3}
            placeholder="Observacoes opcionais..."
            value={form.observacoes}
            onChange={e => set('observacoes', e.target.value)}
            className="input resize-none"
          />
        </div>

        {/* Total calculado */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <span className="text-sm text-gray-500">Total calculado:&nbsp;</span>
          <span className="text-xl font-bold text-gray-900">{brl(total)}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            disabled={loading}
            onClick={handleGenerate}
            className="btn-primary"
          >
            <FilePlus className="h-4 w-4" />
            {loading ? 'Gerando...' : 'Gerar Recibo PDF'}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Recibos emitidos</h2>
          <button onClick={onReload} className="btn-secondary">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {recibos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            Nenhum recibo emitido ainda.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recibos.map(r => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{r.competencia}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {brl(r.total)} &middot; Pagto: {dataBR(r.data_pagamento)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDateTime(r.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => startEdit(r)}
                    className="flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  {r.pdf_path && (
                    <button
                      onClick={() => download(r)}
                      className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── view inquilina ────────────────────────────────────────────────────────────

function TenantView({ recibos }: { recibos: Recibo[] }) {
  const supabase = createClient()

  const download = async (r: Recibo) => {
    if (!r.pdf_path) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.pdf_path, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  if (recibos.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-gray-400">
        Nenhum recibo disponivel ainda.
      </div>
    )
  }

  return (
    <div className="card overflow-hidden divide-y divide-gray-50">
      {recibos.map(r => (
        <div key={r.id} className="flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-gray-900">{r.competencia}</p>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {brl(r.total)} &middot; Pagto: {dataBR(r.data_pagamento)}
            </p>
            <p className="text-xs text-gray-400">{formatDateTime(r.created_at)}</p>
          </div>
          {r.pdf_path && (
            <button
              onClick={() => download(r)}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-4 w-4" /> Baixar PDF
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── página principal ──────────────────────────────────────────────────────────

export default function RecibosPage() {
  const supabase = createClient()
  const [role, setRole]       = useState<string | null>(null)
  const [recibos, setRecibos] = useState<Recibo[]>([])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setRole(prof?.role ?? '')
    const { data } = await supabase
      .from('recibos')
      .select('*')
      .order('created_at', { ascending: false })
    setRecibos((data as Recibo[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  if (role === null) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (['admin', 'owner'].includes(role)) {
    return <AdminView recibos={recibos} onReload={load} />
  }

  if (role === 'tenant') {
    return <TenantView recibos={recibos} />
  }

  return (
    <div className="card p-8 text-center text-gray-500">
      Acesso nao autorizado.
    </div>
  )
}
