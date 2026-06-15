import 'server-only'

import { GH_NEXA } from '@/lib/copy/nexa'
import { listLeaveRequestsFromPostgres } from '@/lib/hr-core/postgres-leave-store'
import { readMemberMetrics } from '@/lib/ico-engine/read-metrics'

import type { NexaSuggestedPrompt } from './suggested-prompts-contract'
import type { ResolveDataAwareSuggestedPromptsInput } from './suggested-prompts-data-aware'

// TASK-1141/1144 — Resolver SERVER-ONLY del contexto `personal` (Mi espacio). Arranca los prompts
// de Nexa desde lo del PROPIO colaborador: pendientes (vacaciones/aprobaciones) + su performance
// (métricas ICO). Anti-oracle trivial: usa SIEMPRE el `memberId` de la SESIÓN (`subject.memberId`),
// NUNCA el `entityId` que mandó el cliente. Allowlist categórica: el texto lleva categoría + un
// `{count}`, NUNCA montos crudos ni PII. Reusa readers canónicos (`listLeaveRequestsFromPostgres`,
// `readMemberMetrics`) — cero SQL nuevo. Cada reader degrada INDEPENDIENTE (allSettled): si el ICO
// (BigQuery) falla, las vacaciones siguen.
//
// La señal de PAGO (liquidación del mes) queda como follow-up: necesita un reader de "liquidación
// exportada del período actual" (query validada) — el reader de histórico no distingue recencia.

const COPY = GH_NEXA.floating.data_aware_prompts

const MAX_PERSONAL_PROMPTS = 4

// Estados de una solicitud de vacaciones que cuentan como "en curso" para el colaborador.
const OWN_PENDING_LEAVE_STATUSES = new Set(['pending_supervisor', 'pending_hr', 'draft'])

export interface PersonalFacts {
  /** Solicitudes de vacaciones propias en curso (pendientes de aprobación). */
  ownPendingLeave: number
  /** Aprobaciones del equipo esperando al colaborador (si es supervisor). */
  approvalsPending: number
  /** Entregables atrasados del colaborador este mes (ICO). */
  overdueTasks: number
  /** El colaborador tiene actividad ICO este mes (para el starter de desempeño). */
  hasIcoActivity: boolean
}

/**
 * Mapper PURO (sin IO): lo del colaborador → prompts de "gancho". Allowlist categórica. Interpola
 * `{count}` con el número real; NUNCA un monto. Orden por valor: atrasos (atención) > desempeño
 * (positivo) > aprobaciones del equipo > vacaciones propias. Corta a 4.
 */
export const buildPersonalPrompts = (facts: PersonalFacts): NexaSuggestedPrompt[] => {
  const out: NexaSuggestedPrompt[] = []

  const push = (templateKey: keyof typeof COPY, hint: NexaSuggestedPrompt['hint'], count?: number): void => {
    const template = COPY[templateKey]

    if (!template) return

    const text = count == null ? template : template.replace(/\{count\}/g, String(count))

    if (text && !out.some(prompt => prompt.text === text)) out.push({ text, hint })
  }

  // 1. Entregables atrasados (performance que necesita atención).
  if (facts.overdueTasks > 0) push('personal_overdue_tasks', 'anomaly', facts.overdueTasks)

  // 2. Starter de desempeño cuando hay actividad ICO pero sin atrasos puntuales.
  if (facts.overdueTasks === 0 && facts.hasIcoActivity) push('personal_performance_review', 'kpi')

  // 3. Aprobaciones del equipo esperando (si es supervisor) — desbloquea a otros.
  if (facts.approvalsPending > 0) push('personal_approvals_pending', 'pending', facts.approvalsPending)

  // 4. Vacaciones propias en curso.
  if (facts.ownPendingLeave > 0) push('personal_leave_pending', 'pending', facts.ownPendingLeave)

  return out.slice(0, MAX_PERSONAL_PROMPTS)
}

const currentPeriod = (): { year: number; month: number } => {
  const now = new Date()

  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/**
 * Orquesta la lectura de lo del propio colaborador. Sin `tenant`/`memberId` de sesión → `[]`
 * (degrada a Tier 1/1.5). NUNCA usa `input.entityId` (lo manda el cliente) — solo el
 * `subject.memberId` server-side. Las 3 fuentes corren con `allSettled`: una caída no tumba las
 * otras (el ICO en BigQuery es la más probable de degradar). El composer captura cualquier throw.
 */
export const resolvePersonalPrompts = async (
  input: ResolveDataAwareSuggestedPromptsInput
): Promise<NexaSuggestedPrompt[]> => {
  const tenant = input.tenant
  const memberId = input.subject.memberId

  // Sin identidad de colaborador en sesión no hay nada personal que mostrar.
  if (!tenant || !memberId) return []

  const { year, month } = currentPeriod()

  const [leaveResult, metricsResult] = await Promise.allSettled([
    listLeaveRequestsFromPostgres({ tenant }),
    readMemberMetrics(memberId, year, month)
  ])

  // Vacaciones propias + aprobaciones del equipo.
  let ownPendingLeave = 0
  let approvalsPending = 0

  if (leaveResult.status === 'fulfilled') {
    ownPendingLeave = leaveResult.value.requests.filter(
      request => request.memberId === memberId && OWN_PENDING_LEAVE_STATUSES.has(request.status)
    ).length
    approvalsPending = leaveResult.value.summary.pendingSupervisor
  }

  // Performance / métricas ICO del mes.
  let overdueTasks = 0
  let hasIcoActivity = false

  if (metricsResult.status === 'fulfilled' && metricsResult.value) {
    overdueTasks = metricsResult.value.context.overdueTasks
    hasIcoActivity = metricsResult.value.context.totalTasks > 0
  }

  return buildPersonalPrompts({ ownPendingLeave, approvalsPending, overdueTasks, hasIcoActivity })
}
