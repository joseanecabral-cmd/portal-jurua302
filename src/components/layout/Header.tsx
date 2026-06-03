'use client'

import { Menu } from 'lucide-react'
import { RoleBadge } from '@/components/ui/StatusBadge'
import type { Profile } from '@/types'

interface HeaderProps {
  profile: Profile
  pageTitle: string
  onMenuClick: () => void
}

export function Header({ profile, pageTitle, onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h2 className="flex-1 text-lg font-semibold text-gray-900">{pageTitle}</h2>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-gray-900 leading-tight">{profile.full_name}</p>
          <p className="text-xs text-gray-500 leading-tight">{profile.email}</p>
        </div>
        <RoleBadge role={profile.role} />
      </div>
    </header>
  )
}
