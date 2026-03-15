import type { ThemeColor } from '@core/types'
import type {
  ToolCategory,
  CostModel,
  LicenseStatus,
  AccessLevel,
  WalletStatus,
  BalanceHealth,
  LedgerEntryType,
  ReloadReason
} from '@/types/ai-tools'

// ── Status config type ──────────────────────────────────────────

type StatusConfig = {
  label: string
  color: ThemeColor | 'default'
  icon: string
}

// ── Tool category ───────────────────────────────────────────────

export const toolCategoryConfig: Record<ToolCategory, StatusConfig> = {
  gen_visual: { label: 'Visual generativo', color: 'primary', icon: 'tabler-photo-ai' },
  gen_video: { label: 'Video generativo', color: 'warning', icon: 'tabler-video' },
  gen_text: { label: 'Texto generativo', color: 'info', icon: 'tabler-message-chatbot' },
  gen_audio: { label: 'Audio generativo', color: 'success', icon: 'tabler-volume' },
  ai_suite: { label: 'Suite AI', color: 'primary', icon: 'tabler-sparkles' },
  creative_production: { label: 'Producción creativa', color: 'error', icon: 'tabler-palette' },
  collaboration: { label: 'Colaboración', color: 'info', icon: 'tabler-users-group' },
  analytics: { label: 'Analytics', color: 'success', icon: 'tabler-chart-dots' },
  crm: { label: 'CRM', color: 'warning', icon: 'tabler-address-book' },
  infrastructure: { label: 'Infraestructura', color: 'secondary', icon: 'tabler-server' }
}

// ── Cost model ──────────────────────────────────────────────────

export const costModelConfig: Record<CostModel, StatusConfig> = {
  subscription: { label: 'Suscripción', color: 'primary', icon: 'tabler-calendar-repeat' },
  per_credit: { label: 'Por crédito', color: 'warning', icon: 'tabler-coins' },
  hybrid: { label: 'Híbrido', color: 'info', icon: 'tabler-arrows-exchange' },
  free_tier: { label: 'Free tier', color: 'success', icon: 'tabler-gift' },
  included: { label: 'Incluido', color: 'secondary', icon: 'tabler-check' }
}

// ── License status ──────────────────────────────────────────────

export const licenseStatusConfig: Record<LicenseStatus, StatusConfig> = {
  active: { label: 'Activa', color: 'success', icon: 'tabler-check' },
  pending: { label: 'Pendiente', color: 'warning', icon: 'tabler-clock' },
  suspended: { label: 'Suspendida', color: 'error', icon: 'tabler-ban' },
  expired: { label: 'Expirada', color: 'secondary', icon: 'tabler-clock-x' },
  revoked: { label: 'Revocada', color: 'error', icon: 'tabler-x' }
}

// ── Access level ────────────────────────────────────────────────

export const accessLevelConfig: Record<AccessLevel, StatusConfig> = {
  full: { label: 'Completo', color: 'success', icon: 'tabler-shield-check' },
  limited: { label: 'Limitado', color: 'warning', icon: 'tabler-shield-half' },
  trial: { label: 'Trial', color: 'info', icon: 'tabler-test-pipe' },
  viewer: { label: 'Viewer', color: 'secondary', icon: 'tabler-eye' }
}

// ── Wallet status ───────────────────────────────────────────────

export const walletStatusConfig: Record<WalletStatus, StatusConfig> = {
  active: { label: 'Activo', color: 'success', icon: 'tabler-check' },
  depleted: { label: 'Agotado', color: 'error', icon: 'tabler-alert-circle' },
  expired: { label: 'Expirado', color: 'secondary', icon: 'tabler-clock-x' },
  suspended: { label: 'Suspendido', color: 'warning', icon: 'tabler-ban' }
}

// ── Balance health (semaphore) ──────────────────────────────────

export const balanceHealthConfig: Record<BalanceHealth, StatusConfig> = {
  healthy: { label: 'Óptimo', color: 'success', icon: 'tabler-check' },
  warning: { label: 'Atención', color: 'warning', icon: 'tabler-alert-triangle' },
  critical: { label: 'Crítico', color: 'error', icon: 'tabler-alert-circle' },
  depleted: { label: 'Agotado', color: 'secondary', icon: 'tabler-x' }
}

// ── Ledger entry type ───────────────────────────────────────────

export const ledgerEntryTypeConfig: Record<LedgerEntryType, StatusConfig> = {
  debit: { label: 'Débito', color: 'error', icon: 'tabler-arrow-down' },
  credit: { label: 'Crédito', color: 'success', icon: 'tabler-arrow-up' },
  reserve: { label: 'Reserva', color: 'warning', icon: 'tabler-lock' },
  release: { label: 'Liberación', color: 'info', icon: 'tabler-lock-open' },
  adjustment: { label: 'Ajuste', color: 'warning', icon: 'tabler-adjustments' }
}

// ── Reload reason ───────────────────────────────────────────────

export const reloadReasonLabel: Record<ReloadReason, string> = {
  initial_allocation: 'Asignación inicial',
  monthly_renewal: 'Renovación mensual',
  purchase: 'Compra',
  bonus: 'Bonificación',
  rollover: 'Rollover',
  manual_adjustment: 'Ajuste manual'
}

// ── Wallet scope label ──────────────────────────────────────────

export const walletScopeLabel: Record<string, string> = {
  client: 'Cliente',
  pool: 'Pool interno'
}

// ── Formatting ──────────────────────────────────────────────────

export const formatCreditAmount = (amount: number, entryType?: LedgerEntryType): string => {
  const sign = entryType === 'debit' ? '-' : entryType === 'credit' ? '+' : ''

  return `${sign}${amount}`
}

export const formatCost = (amount: number | null, currency: string | null): string => {
  if (amount == null) return '—'

  return `${currency ?? 'USD'} ${amount.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatDate = (date: string | null): string => {
  if (!date) return '—'

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

export const formatTimestamp = (ts: string | null): string => {
  if (!ts) return '—'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(ts))
}
