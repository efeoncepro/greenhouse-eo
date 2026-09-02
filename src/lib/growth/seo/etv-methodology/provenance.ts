/**
 * TASK-1805 — Provenance metodológica para DTOs (readers → lane → MCP → Nexa).
 *
 * Un DTO sirve UNA metodología. `availableMethodologies` existe para que un compare interno sepa qué
 * hay persistido sin disparar gasto; `comparability` y `breakpointDate` son declaraciones, no cálculos.
 */

import {
  ETV_METHODOLOGY_POLICY_VERSION,
  ETV_PROVIDER_CUTOFF_ISO,
  isEtvMethodologyEvidence,
  isEtvMethodologyVersion,
  type EtvMethodologyProvenance,
  type EtvMethodologyVersion
} from './contracts'
import { toEtvMethodologyReadState } from './policy'

export type BuildEtvMethodologyProvenanceInput = {
  /** Método que el reader sirvió (lo que pidió el selector de lectura). */
  served: EtvMethodologyVersion
  /** Valor persistido en la fila principal servida (null cuando no hubo fila para el método). */
  rowVersion?: string | null
  rowEvidence?: string | null
  rowPolicyVersion?: string | null
  /** Métodos con al menos una fila para el sujeto (DISTINCT sobre la tabla, sin filtrar por método). */
  available: readonly string[]
}

export const buildEtvMethodologyProvenance = ({
  served,
  rowVersion,
  rowEvidence,
  rowPolicyVersion,
  available
}: BuildEtvMethodologyProvenanceInput): EtvMethodologyProvenance => {
  const availableMethodologies = Array.from(new Set(available.filter(isEtvMethodologyVersion))).sort()
  const hasRow = rowVersion !== undefined && rowVersion !== null

  return {
    version: hasRow ? toEtvMethodologyReadState(rowVersion) : served,
    policyVersion: rowPolicyVersion ?? ETV_METHODOLOGY_POLICY_VERSION,
    evidence: isEtvMethodologyEvidence(rowEvidence) ? rowEvidence : 'unknown',
    availableMethodologies,
    comparability: hasRow || availableMethodologies.includes(served) ? 'single_methodology' : 'not_available_for_method',
    breakpointDate: null,
    providerCutoffAt: ETV_PROVIDER_CUTOFF_ISO
  }
}
