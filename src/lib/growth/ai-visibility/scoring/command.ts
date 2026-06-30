import 'server-only'

/**
 * TASK-1227 — Growth AI Visibility · Scoring command (Slice 4, server-only).
 *
 * `scoreGraderRun` es el primitive canónico (Full API parity): carga las
 * observations de un run (TASK-1226), las normaliza (determinista + hook LLM
 * opcional), persiste findings, computa y persiste el score. Idempotente:
 * recomputar el mismo run + score_version reemplaza (no duplica). NO expone ruta
 * pública (consumido por endpoint admin interno + futuros report/Nexa).
 */

import { captureWithDomain } from '@/lib/observability/capture'

import { buildBrandTruth, detectBrandInaccuracies } from '../accuracy'
import { extractCitationDomain } from '../observation'
import { getGraderProfile, getGraderRun, getRunObservations, type GraderExecutionPrompt } from '../store'
import { normalizeObservation } from '../normalization/normalizer'
import { enrichFindingWithLlm } from '../normalization/llm-extraction'
import { type NormalizedFinding } from '../normalization/contracts'
import {
  isPromptFamily,
  isPromptFanOutType,
  isPromptIntentStage,
  type PromptTag,
  type PromptTagCatalog
} from '../prompt-packs/tag-vocabulary'
import { computeGraderScore, type PersistedGraderScore } from './engine'
import { resolveScoreStatus } from '../review-gates/gates'
import { getGraderScore, getNormalizedFindings, upsertGraderScore, upsertNormalizedFindings } from './store'

export class GraderScoringError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GraderScoringError'
    this.code = code
  }
}

export interface ScoreGraderRunResult {
  score: PersistedGraderScore
  findings: NormalizedFinding[]
}

/**
 * TASK-1290 Slice 0 — Catálogo de tags (promptId → tags) del set RESUELTO del run, construido
 * desde `execution_prompts`. Una entrada sólo si el prompt persistió tags bien formados (enums
 * cerrados); los runs legacy (sin tags) producen un catálogo vacío y el normalizer/scorer caen
 * al pack estático v1 (no-regresión). El catálogo es la fuente de los tags, NO el pack estático.
 */
const buildPromptTagCatalog = (executionPrompts: GraderExecutionPrompt[] | undefined): PromptTagCatalog => {
  const catalog: PromptTagCatalog = new Map()

  for (const prompt of executionPrompts ?? []) {
    if (
      isPromptFamily(prompt.family) &&
      isPromptFanOutType(prompt.fanOutType) &&
      isPromptIntentStage(prompt.intentStage) &&
      typeof prompt.namesBrand === 'boolean'
    ) {
      const tag: PromptTag = {
        family: prompt.family,
        fanOutType: prompt.fanOutType,
        intentStage: prompt.intentStage,
        namesBrand: prompt.namesBrand
      }

      catalog.set(prompt.promptId, tag)
    }
  }

  return catalog
}

/**
 * Normaliza + puntúa un run. `recompute=false` (default) devuelve el score
 * existente si ya hay uno para el score_version vigente (idempotencia barata).
 */
export const scoreGraderRun = async (input: {
  runId: string
  recompute?: boolean
}): Promise<ScoreGraderRunResult> => {
  const run = await getGraderRun(input.runId)

  if (!run) {
    throw new GraderScoringError('run_not_found', 'El run no existe.')
  }

  const profile = await getGraderProfile(run.profileId)

  if (!profile) {
    throw new GraderScoringError('profile_not_found', 'El perfil del run no existe.')
  }

  const subjectDomain = profile.websiteUrl ? extractCitationDomain(profile.websiteUrl) : null

  const observations = await getRunObservations(input.runId)

  // TASK-1290 Slice 0 — tags del set del run (no del pack estático); legacy → catálogo vacío → fallback.
  const promptTagCatalog = buildPromptTagCatalog(run.executionPrompts)

  const findings: NormalizedFinding[] = []

  for (const observation of observations) {
    const deterministic = normalizeObservation(observation, {
      subjectBrand: profile.brandName,
      subjectDomain,
      competitorsDeclared: profile.competitorsDeclared,
      promptTags: promptTagCatalog.get(observation.promptId) ?? null
    })

    // Hook LLM aislado (flag OFF por defecto → devuelve el determinista intacto).
    const enriched = await enrichFindingWithLlm(deterministic, observation, {
      subjectBrand: profile.brandName,
      subjectDomain
    })

    findings.push(enriched)
  }

  try {
    await upsertNormalizedFindings(findings)

    const raw = computeGraderScore(input.runId, findings, promptTagCatalog)

    // Detector de exactitud de marca (TASK-1238): contrasta los findings contra la
    // verdad declarada; una inexactitud probable escala el gate a review_required.
    // Determinista — ningún LLM asigna el veredicto.
    const accuracyFindings = detectBrandInaccuracies(
      findings,
      buildBrandTruth({
        brandName: profile.brandName,
        category: profile.category,
        competitorsDeclared: profile.competitorsDeclared
      })
    )

    const status = resolveScoreStatus(raw, findings, accuracyFindings)

    const score = await upsertGraderScore({
      ...raw,
      scoreStatus: status.scoreStatus,
      autoReleasable: status.autoReleasable,
      reviewReasons: status.reviewReasons
    })

    return { score, findings }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_scoring_command' },
      extra: { runId: input.runId }
    })

    throw new GraderScoringError('scoring_failed', 'No fue posible puntuar el run.')
  }
}

/** Lectura del score persistido + sus findings (reader del primitive de parity). */
export const readGraderScore = async (
  runId: string,
  scoreVersion?: string
): Promise<{ score: PersistedGraderScore | null; findings: NormalizedFinding[] }> => ({
  score: await getGraderScore(runId, scoreVersion),
  findings: await getNormalizedFindings(runId)
})
