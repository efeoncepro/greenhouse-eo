import type { ThemeColor } from '@core/types'
import type { HrLeaveRequestStatus, HrAttendanceStatus } from '@/types/hr-core'
import { CONTRACT_LABELS } from '@/types/hr-contracts'

// ── Leave request status ────────────────────────────────────────────

type StatusConfig = {
  label: string
  color: ThemeColor | 'default'
  icon: string
}

export const leaveStatusConfig: Record<HrLeaveRequestStatus, StatusConfig> = {
  pending_supervisor: { label: 'Supervisor', color: 'warning', icon: 'tabler-user-question' },
  pending_hr: { label: 'HR', color: 'info', icon: 'tabler-clock-pause' },
  approved: { label: 'Aprobada', color: 'success', icon: 'tabler-circle-check' },
  rejected: { label: 'Rechazada', color: 'error', icon: 'tabler-circle-x' },
  cancelled: { label: 'Cancelada', color: 'secondary', icon: 'tabler-ban' }
}

// ── Attendance status ───────────────────────────────────────────────

export const attendanceStatusConfig: Record<HrAttendanceStatus, StatusConfig> = {
  present: { label: 'Presente', color: 'success', icon: 'tabler-check' },
  late: { label: 'Tardanza', color: 'warning', icon: 'tabler-clock' },
  absent: { label: 'Ausente', color: 'error', icon: 'tabler-x' },
  excused: { label: 'Justificada', color: 'info', icon: 'tabler-notes' },
  holiday: { label: 'Feriado', color: 'primary', icon: 'tabler-flag' }
}

// ── Leave type ──────────────────────────────────────────────────────

export const leaveTypeConfig: Record<string, { label: string; color: ThemeColor; icon: string }> = {
  vacation: { label: 'Vacaciones', color: 'success', icon: 'tabler-beach' },
  personal: { label: 'Personal', color: 'info', icon: 'tabler-user' },
  medical: { label: 'Médico', color: 'error', icon: 'tabler-heartbeat' },
  unpaid: { label: 'Sin goce', color: 'secondary', icon: 'tabler-coin-off' }
}

export const getLeaveTypeConfig = (code: string) =>
  leaveTypeConfig[code] ?? { label: code, color: 'secondary' as ThemeColor, icon: 'tabler-calendar' }

// ── Job level labels ────────────────────────────────────────────────

export const jobLevelLabel: Record<string, string> = {
  junior: 'Junior',
  semi_senior: 'Semi Senior',
  senior: 'Senior',
  lead: 'Lead',
  manager: 'Manager',
  director: 'Director'
}

// ── Employment type labels ──────────────────────────────────────────

export const employmentTypeLabel: Record<string, string> = {
  full_time: 'Tiempo completo',
  part_time: 'Medio tiempo',
  contractor: 'Contratista'
}

export const contractTypeLabel: Record<string, string> = Object.fromEntries(
  Object.entries(CONTRACT_LABELS).map(([key, value]) => [key, value.label])
)

export const payrollViaLabel: Record<string, string> = {
  internal: 'Greenhouse',
  deel: 'Deel'
}

// ── Health system labels ────────────────────────────────────────────

export const healthSystemLabel: Record<string, string> = {
  fonasa: 'Fonasa',
  isapre: 'Isapre',
  none: 'Sin sistema'
}

// ── Date formatting ─────────────────────────────────────────────────

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

export const formatDateRange = (start: string, end: string): string => {
  return `${formatDate(start)} — ${formatDate(end)}`
}

// ── Misc ────────────────────────────────────────────────────────────

export const todayISO = () => {
  const d = new Date()

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const mondayThisWeekISO = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)

  d.setDate(diff)

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
