'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, ShieldCheck, FileSignature,
  ClipboardList, Wallet, BookOpen, Building2,
  Receipt, Wrench, MessageSquare, LogOut, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: Role[]
}

const NAV: NavItem[] = [
  { href: '/dashboard',      label: 'Painel',          icon: LayoutDashboard, roles: ['owner','admin','applicant','tenant'] },
  { href: '/documentos',     label: 'Documentos',      icon: FileText,        roles: ['owner','admin','applicant','tenant'] },
  { href: '/mensagens',      label: 'Mensagens',       icon: MessageSquare,   roles: ['owner','admin','applicant','tenant'] },
  { href: '/admin',          label: 'Administração',   icon: ShieldCheck,     roles: ['owner','admin'] },
  { href: '/contrato',       label: 'Contrato',        icon: FileSignature,   roles: ['owner','admin','tenant'] },
  { href: '/vistoria',       label: 'Vistoria',        icon: ClipboardList,   roles: ['owner','admin','tenant'] },
  { href: '/caucao',         label: 'Caução',          icon: Wallet,          roles: ['owner','admin','tenant'] },
  { href: '/manual',         label: 'Manual',          icon: BookOpen,        roles: ['owner','admin','tenant'] },
  { href: '/condominio',     label: 'Condomínio',      icon: Building2,       roles: ['owner','admin','tenant'] },
  { href: '/boletos-contas', label: 'Boletos e Contas',icon: Receipt,         roles: ['owner','admin','tenant'] },
  { href: '/manutencao',     label: 'Manutenção',      icon: Wrench,          roles: ['owner','admin','tenant'] },
]

interface SidebarProps {
  role: Role
  onClose?: () => void
  onSignOut: () => void
}

export function Sidebar({ role, onClose, onSignOut }: SidebarProps) {
  const pathname = usePathname() ?? ''
  const items = NAV.filter(n => n.roles.includes(role)).map(item => ({
    ...item,
    label: item.href === '/documentos' && role === 'applicant' ? 'Meus Documentos' : item.label,
  }))

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Portal</p>
          <h1 className="text-lg font-bold text-white">Portal Juruá302</h1>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mx-4 mb-4 border-t border-slate-700" />

      {/* Address */}
      <div className="px-5 pb-4">
        <p className="text-xs leading-relaxed text-slate-500">
          Rua Piratuba, 1580<br />
          Portal Juruá302 · Bom Retiro<br />
          Joinville – SC
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </div>
  )
}
