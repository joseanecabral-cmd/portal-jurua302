'use server'

import { redirect } from 'next/navigation'
import createAdminClient from '@/lib/supabase/admin'

async function ownerExists() {
  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles').select('id').eq('role', 'owner').limit(1)
  if (error) throw error
  return (data ?? []).length > 0
}

export default async function SetupPage() {
  const exists = await ownerExists()
  if (exists) {
    // If owner exists, block access — redirect to login
    redirect('/login')
  }

  // Render a simple client-side form to create the first owner
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow">
          <h1 className="mb-4 text-xl font-semibold">Configurar Portal — Primeiro acesso</h1>
          <p className="mb-4 text-sm text-gray-600">Crie o usuário Owner (Proprietário(a)) para administrar o portal.</p>

          <form action="/api/setup" method="post" className="space-y-4">
            <div>
              <label className="label">Nome completo</label>
              <input name="full_name" required className="input" />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input name="email" type="email" required className="input" />
            </div>
            <div>
              <label className="label">Senha</label>
              <input name="password" type="password" required className="input" />
            </div>

            <button type="submit" className="btn-primary w-full">Criar Proprietário(a)</button>
          </form>

          <p className="mt-4 text-sm text-gray-500">Após criar a Owner, este caminho será bloqueado.</p>
        </div>
      </div>
    </main>
  )
}
