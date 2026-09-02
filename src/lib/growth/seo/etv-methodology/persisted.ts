/**
 * TASK-1805 — Forma PERSISTIDA de la metodología (lo que viaja del builder de request al writer).
 *
 * Los writers exigen este objeto en su input (tipo requerido, no opcional): un productor que
 * olvide la metodología no compila. Es la contraparte TS del CHECK de consistencia en la base:
 * `explicit_request` ⇔ `requestedAt` + `policyVersion` presentes.
 */

import type { EtvHistoricalCalculationBasis, EtvMethodologyEvidence, EtvMethodologyVersion } from './contracts'
import type { EtvMethodologyRequest } from './policy'
import { resolveEtvHistoricalCalculationBasis } from './policy'

export type PersistedEtvMethodology = {
  version: EtvMethodologyVersion
  evidence: Extract<EtvMethodologyEvidence, 'explicit_request'>
  requestedAt: string
  policyVersion: string
  /** Sólo improved histórico; null para legacy y para capturas del mes corriente no históricas. */
  historicalBasis: EtvHistoricalCalculationBasis | null
}

/**
 * Traduce la selección de la policy a lo que se persiste. `captureMonth` (YYYY-MM o YYYY-MM-DD)
 * sólo aplica a productores históricos: deriva la base de cálculo del mes capturado.
 */
export const toPersistedEtvMethodology = (
  request: EtvMethodologyRequest,
  options: { captureMonth?: string | null } = {}
): PersistedEtvMethodology => ({
  version: request.requested,
  evidence: 'explicit_request',
  requestedAt: request.requestedAt,
  policyVersion: request.policyVersion,
  historicalBasis: options.captureMonth ? resolveEtvHistoricalCalculationBasis(request.requested, options.captureMonth) : null
})
