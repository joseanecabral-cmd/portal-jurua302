'use client'

import { MessageSquare } from 'lucide-react'

export default function MessagesPage() {
  return (
    <main className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">Mensagens</p>
            <p className="text-sm text-slate-500">Aqui você verá as comunicações do portal.</p>
          </div>
        </div>
      </div>

      <div className="card p-8 text-center text-slate-600">
        <p className="text-lg font-semibold text-slate-900">Nenhuma mensagem disponível</p>
        <p className="mt-2 text-sm text-slate-500">
          Este espaço está reservado para comunicações entre candidatos, inquilinos e administração.
        </p>
      </div>
    </main>
  )
}
