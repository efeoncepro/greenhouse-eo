import 'server-only'

import { GH_NEXA } from '@/lib/copy/nexa'
import { listLeaveRequestsFromPostgres } from '@/lib/hr-core/postgres-leave-store'

import type { NexaSuggestedPrompt } from './suggested-prompts-contract'
import type { ResolveDataAwareSuggestedPromptsInput } from './suggested-prompts-data-aware'

// TASK-1141 — Resolver SERVER-ONLY del contexto `personal` (Mi espacio). Arranca los prompts de
// Nexa desde los pendientes del PROPIO colaborador. Anti-oracle trivial: usa SIEMPRE el `memberId`
// de la SESIÓN (`subject.memberId`), NUNCA el `entityId` que mandó el cliente → un usuario no puede
// pedir los pendientes de otro. Allowlist categórica: el texto lleva la categoría + un `{count}`,
// NUNCA montos crudos ni PII. Reusa el reader canónico `listLeaveRequestsFromPostgres` (cero SQL
// nuevo) — devuelve las solicitudes propias + `summary.pendingSupervisor` (las que debe aprobar).

const COPY = GH_NEXA.floating.data_aware_prompts

const MAX_PERSONAL_PROMPTS = 4

// Estados de una solicitud de vacaciones que cuentan como "en curso" para el colaborador.
const OWN_PENDING_LEAVE_STATUSES = new Set(['pending_supervisor', 'pending_hr', 'draft'])

export interface PersonalFacts {
  /** Solicitudes de vacaciones propias en curso (pendientes de aprobación). */
  ownPendingLeave: number
  /** Aprobaciones del equipo esperando al colaborador (si es supervisor). */
  approvalsPending: number
}

/**
 * Mapper PURO (sin IO): pendientes del colaborador → prompts de "gancho". Allowlist categórica.
 * Interpola `{count}` con el número real; NUNCA un monto. Orden por valor (aprobaciones del equipo
 * primero — bloquean a otros — luego lo propio). Corta a 4.
 */
export const buildPersonalPrompts = (facts: PersonalFacts): NexaSuggestedPrompt[] => {
  const out: NexaSuggestedPrompt[] = []

  const push = (templateKey: keyof typeof COPY, hint: NexaSuggestedPrompt['hint'], count?: number): void => {
    const template = COPY[templateKey]

    if (!template) return

    const text = count == null ? template : template.replace(/\{count\}/g, String(count))

    if (text && !out.some(prompt => prompt.text === text)) out.push({ text, hint })
  }

  // 1. Aprobaciones del equipo esperando (si es supervisor) — desbloquea a otros.
  if (facts.approvalsPending > 0) push('personal_approvals_pending', 'pending', facts.approvalsPending)

  // 2. Vacaciones propias en curso.
  if (facts.ownPendingLeave > 0) push('personal_leave_pending', 'pending', facts.ownPendingLeave)

  return out.slice(0, MAX_PERSONAL_PROMPTS)
}

/**
 * Orquesta la lectura de pendientes del propio colaborador. Sin `tenant`/`memberId` de sesión →
 * `[]` (degrada a Tier 1/1.5). NUNCA usa `input.entityId` (lo manda el cliente) — solo el
 * `subject.memberId` server-side. Puede lanzar; el composer captura + degrada.
 */
export const resolvePersonalPrompts = async (
  input: ResolveDataAwareSuggestedPromptsInput
): Promise<NexaSuggestedPrompt[]> => {
  const tenant = input.tenant
  const memberId = input.subject.memberId

  // Sin identidad de colaborador en sesión no hay pendientes personales que mostrar.
  if (!tenant || !memberId) return []

  const leave = await listLeaveRequestsFromPostgres({ tenant })

  const ownPendingLeave = leave.requests.filter(
    request => request.memberId === memberId && OWN_PENDING_LEAVE_STATUSES.has(request.status)
  ).length

  return buildPersonalPrompts({
    ownPendingLeave,
    approvalsPending: leave.summary.pendingSupervisor
  })
}
