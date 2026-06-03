'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':      'Painel',
  '/documentos':     'Documentos',
  '/admin':          'Administração',
  '/contrato':       'Contrato',
  '/vistoria':       'Vistoria',
  '/caucao':         'Caução',
  '/manual':         'Manual do Apartamento',
  '/condominio':     'Condomínio',
  '/boletos-contas': 'Boletos e Contas',
  '/manutencao':     'Manutenção',
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (!data) { router.replace('/login'); return }
      setProfile(data as Profile)
    })
  }, [router])

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }, [router])

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const pageTitle = pathname ? PAGE_TITLES[pathname] ?? 'Portal Juruá302' : 'Portal Juruá302'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — mobile (drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          role={profile.role}
          onClose={() => setSidebarOpen(false)}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Sidebar — desktop (static) */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <Sidebar role={profile.role} onSignOut={handleSignOut} />
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          profile={profile}
          pageTitle={pageTitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
