import { cn } from '@/lib/utils'
import type {
  DocumentStatus,
  CaucaoStatus,
  ManutencaoStatus,
  Role,
} from '@/types'
import { ROLE_LABELS } from '@/types'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-gray-100  text-gray-700',
  success:  'bg-green-100 text-green-700',
  warning:  'bg-amber-100 text-amber-700',
  error:    'bg-red-100   text-red-700',
  info:     'bg-blue-100  text-blue-700',
  purple:   'bg-purple-100 text-purple-700',
}

function Badge({ label, variant = 'default', className }: {
  label: string
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      variantClasses[variant],
      className
    )}>
      {label}
    </span>
  )
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, { label: string; variant: BadgeVariant }> = {
    enviado:             { label: 'Enviado',             variant: 'info'    },
    em_analise:          { label: 'Em Análise',          variant: 'warning' },
    aprovado:            { label: 'Aprovado',            variant: 'success' },
    correcao_solicitada: { label: 'Correção Solicitada', variant: 'purple'  },
    rejeitado:           { label: 'Rejeitado',           variant: 'error'   },
  }
  const { label, variant } = map[status]
  return <Badge label={label} variant={variant} />
}

export function CaucaoStatusBadge({ status }: { status: CaucaoStatus }) {
  const map: Record<CaucaoStatus, { label: string; variant: BadgeVariant }> = {
    pendente:  { label: 'Pendente',  variant: 'warning' },
    recebido:  { label: 'Recebido',  variant: 'success' },
    devolvido: { label: 'Devolvido', variant: 'info'    },
    retido:    { label: 'Retido',    variant: 'error'   },
  }
  const { label, variant } = map[status]
  return <Badge label={label} variant={variant} />
}

export function ManutencaoStatusBadge({ status }: { status: ManutencaoStatus }) {
  const map: Record<ManutencaoStatus, { label: string; variant: BadgeVariant }> = {
    registrado:   { label: 'Registrado',   variant: 'default' },
    em_andamento: { label: 'Em Andamento', variant: 'warning' },
    concluido:    { label: 'Concluído',    variant: 'success' },
  }
  const { label, variant } = map[status]
  return <Badge label={label} variant={variant} />
}

export function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, { label: string; variant: BadgeVariant }> = {
    owner:     { label: ROLE_LABELS.owner,     variant: 'purple'  },
    admin:     { label: ROLE_LABELS.admin,     variant: 'info'    },
    tenant:    { label: ROLE_LABELS.tenant,    variant: 'success' },
    applicant: { label: ROLE_LABELS.applicant, variant: 'warning' },
  }
  const { label, variant } = map[role]
  return <Badge label={label} variant={variant} />
}
