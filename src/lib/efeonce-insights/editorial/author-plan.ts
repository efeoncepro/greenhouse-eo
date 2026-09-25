import 'server-only'

/**
 * TASK-1845 — punto de entrada de autoría: plan determinista siempre; IA acotada sólo con
 * `INSIGHTS_AUTHORING_AI_ENABLED=true`, y aun así el resultado se valida contra el snapshot
 * antes de aceptarse. El plan devuelto es el que se congela; el replay usa el congelado.
 */

import type { EvidenceSnapshotContentV1 } from '../contracts/evidence'
import type { EditorialPlanV1, PlanAuthoringProvenanceV1, PlanCoverV1 } from '../contracts/plan'
import type { InsightModule } from '../contracts/request'
import { InsightsEvidenceRejectedError } from '../errors'
import { isInsightsAuthoringAiEnabled } from '../flags'
import { authorPlanWithBoundedAi } from './ai-authoring'
import { buildDeterministicPlan } from './deterministic-planner'
import { validateEditorialPlan } from './plan-validation'

export interface AuthorEditorialPlanInput {
  snapshot: EvidenceSnapshotContentV1
  modules: InsightModule[]
  locale: string
  env?: NodeJS.ProcessEnv
  /** TASK-1888 — contrato editorial v2; el caller lo lee del flag para decidir también la evidencia. */
  editorialV2?: boolean
  /** TASK-1888 — portada resuelta a sellar (sólo con v2). */
  cover?: PlanCoverV1 | null
}

export interface AuthoredEditorialPlan {
  plan: EditorialPlanV1
  provenance: PlanAuthoringProvenanceV1
}

export const authorEditorialPlan = async (input: AuthorEditorialPlanInput): Promise<AuthoredEditorialPlan> => {
  const deterministic = buildDeterministicPlan(input.snapshot, { modules: input.modules, locale: input.locale, editorialV2: input.editorialV2, cover: input.cover })
  const violations = validateEditorialPlan(deterministic, input.snapshot)

  if (violations.length > 0) {
    // El planner determinista es nuestro: una discrepancia aquí es un bug, no un dato.
    throw new InsightsEvidenceRejectedError('El plan determinista no pasa la validación de cifras', { violations })
  }

  if (!isInsightsAuthoringAiEnabled(input.env)) {
    return { plan: deterministic, provenance: { mode: 'deterministic', modelId: null, promptVersion: null, usage: {} } }
  }

  const authored = await authorPlanWithBoundedAi(deterministic, input.snapshot)

  return { plan: authored.plan, provenance: authored.provenance }
}
