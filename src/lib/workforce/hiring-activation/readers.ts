import 'server-only'

// TASK-770 — Readers del bridge: cola merged (handoffs 356 + estado del request) y detail
// con readiness LIVE (ready_to_activate NUNCA se persiste — se computa con el resolver
// workforce canónico). Consumers: TASK-1368 (UI), Nexa por parity.

import { listInternalHireReadyForOnboarding, type InternalHireQueueItem } from '@/lib/hiring/handoff'
import { getHiringHandoffById, type HiringHandoff } from '@/lib/hiring/handoff'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveWorkforceActivationReadiness } from '@/lib/workforce/activation/readiness'
import type { WorkforceActivationReadiness } from '@/lib/workforce/activation/types'

import { isHiringActivationEnabled } from './config'
import {
  getActivationRequestByHandoffId,
  normalizeActivationRequest,
  HIRING_ACTIVATION_COLUMNS,
  type HiringActivationRequestRow,
} from './store'
import type { HiringActivationRequest } from './types'

export interface HiringActivationQueueItem extends InternalHireQueueItem {
  request: HiringActivationRequest | null
}

export interface HiringActivationQueueResult {
  enabled: boolean
  items: HiringActivationQueueItem[]
}

/**
 * Cola de activación: handoffs internal_hire aprobados (contrato 356 — 770 lo consume, no
 * lo redefine) enriquecidos con el estado del request del bridge. Doble flag: requiere
 * HIRING_ACTIVATION_ENABLED (770) y HIRING_HANDOFF_BRIDGES_ENABLED (356, dentro del reader).
 */
export const listHiringActivationQueue = async (options?: {
  limit?: number
}): Promise<HiringActivationQueueResult> => {
  if (!isHiringActivationEnabled()) {
    return { enabled: false, items: [] }
  }

  const queue = await listInternalHireReadyForOnboarding(options)

  if (!queue.enabled || queue.items.length === 0) {
    return { enabled: queue.enabled, items: [] }
  }

  const handoffIds = queue.items.map((item) => item.handoffId)

  const requestRows = await runGreenhousePostgresQuery<HiringActivationRequestRow>(
    `SELECT ${HIRING_ACTIVATION_COLUMNS} FROM greenhouse_hr.hiring_activation_request
     WHERE hiring_handoff_id = ANY($1::text[])`,
    [handoffIds],
  )

  const byHandoff = new Map(requestRows.map((row) => [row.hiring_handoff_id, normalizeActivationRequest(row)]))

  return {
    enabled: true,
    items: queue.items.map((item) => ({
      ...item,
      request: byHandoff.get(item.handoffId) ?? null,
    })),
  }
}

export interface HiringActivationDetail {
  handoff: HiringHandoff
  request: HiringActivationRequest | null

  /** Readiness LIVE del member (si existe) — fuente: resolver workforce canónico. */
  readiness: WorkforceActivationReadiness | null

  /** Derivado (nunca persistido): member listo para completar intake. */
  readyToActivate: boolean
}

export const getHiringActivationDetail = async (
  hiringHandoffId: string,
): Promise<HiringActivationDetail | null> => {
  if (!isHiringActivationEnabled()) return null

  const handoff = await getHiringHandoffById(hiringHandoffId.trim())

  if (!handoff) return null

  const request = await getActivationRequestByHandoffId(handoff.handoffId)

  let readiness: WorkforceActivationReadiness | null = null

  if (request?.memberId) {
    readiness = await resolveWorkforceActivationReadiness(request.memberId)
  }

  return {
    handoff,
    request,
    readiness,
    readyToActivate: readiness?.ready ?? false,
  }
}
