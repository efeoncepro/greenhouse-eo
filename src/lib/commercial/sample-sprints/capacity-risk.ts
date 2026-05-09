import 'server-only'

import { getMemberCapacityForPeriod } from './capacity-checker'
import type {
  SampleSprintRuntimeCapacityRisk,
  SampleSprintRuntimeTeamMember
} from './runtime-projection-types'

/**
 * TASK-835 — Evalúa capacity risk para un Sample Sprint a partir de su team
 * proyectado y sus fechas operativas.
 *
 * Reglas canónicas:
 *  - Si no hay team con `proposedFte > 0`, retornar `null` (no se puede evaluar).
 *  - Si no hay `startDate` y `targetEndDate`, retornar `null` (no hay ventana).
 *  - Por cada miembro proyectado, llamar `getMemberCapacityForPeriod` y
 *    evaluar si `proposedFte + allocatedFte > totalFte` (overcommit).
 *  - severity:
 *      • critical = ≥1 miembro overcommit por > 0.25 FTE
 *      • warning  = ≥1 miembro overcommit ≤ 0.25 FTE
 *      • ok       = ningún miembro overcommit
 *  - Una excepción por miembro es no-blocking: marca ese miembro overcommit
 *    pero el resto se evalúa.
 *  - Si TODOS los lookups fallan, retornar null + degraded `capacity_unresolvable`
 *    (decisión de la projection, no de este helper).
 */

export interface ResolveCapacityRiskInput {
  team: readonly SampleSprintRuntimeTeamMember[]
  startDate: string | null
  targetEndDate: string | null
}

export interface ResolveCapacityRiskOutput {
  capacityRisk: SampleSprintRuntimeCapacityRisk | null
  /** True cuando todos los lookups individuales fallaron — la projection eleva a degraded. */
  allLookupsFailed: boolean
}

const SEVERITY_THRESHOLD_CRITICAL = 0.25

export const resolveCapacityRiskForSprint = async (
  input: ResolveCapacityRiskInput
): Promise<ResolveCapacityRiskOutput> => {
  const { team, startDate, targetEndDate } = input

  if (!Array.isArray(team) || team.length === 0) return { capacityRisk: null, allLookupsFailed: false }

  if (!startDate || !targetEndDate) return { capacityRisk: null, allLookupsFailed: false }

  const evaluable = team.filter(member => Number.isFinite(member.proposedFte) && member.proposedFte > 0 && !member.unresolved)

  if (evaluable.length === 0) return { capacityRisk: null, allLookupsFailed: false }

  const lookups = await Promise.allSettled(
    evaluable.map(member => getMemberCapacityForPeriod(member.memberId, startDate, targetEndDate))
  )

  const allFailed = lookups.every(result => result.status === 'rejected')

  if (allFailed) return { capacityRisk: null, allLookupsFailed: true }

  const overcommittedMemberIds: string[] = []
  let maxOvercommit = 0

  lookups.forEach((result, idx) => {
    const member = evaluable[idx]!

    if (result.status !== 'fulfilled') {
      // Skip individual failures — best-effort.
      return
    }

    const capacity = result.value
    const projectedTotal = capacity.allocatedFte + member.proposedFte
    const overcommit = projectedTotal - capacity.totalFte

    if (overcommit > 0) {
      overcommittedMemberIds.push(member.memberId)

      if (overcommit > maxOvercommit) maxOvercommit = overcommit
    }
  })

  if (overcommittedMemberIds.length === 0) {
    return {
      capacityRisk: {
        severity: 'ok',
        overcommittedMemberIds: [],
        summary: 'Capacidad disponible para todos los miembros propuestos.'
      },
      allLookupsFailed: false
    }
  }

  const severity = maxOvercommit > SEVERITY_THRESHOLD_CRITICAL ? 'critical' : 'warning'

  return {
    capacityRisk: {
      severity,
      overcommittedMemberIds,
      summary: severity === 'critical'
        ? `${overcommittedMemberIds.length} miembro(s) sobre asignados — revisar antes de aprobar.`
        : `${overcommittedMemberIds.length} miembro(s) cerca del límite — verificar disponibilidad.`
    },
    allLookupsFailed: false
  }
}
