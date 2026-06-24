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

import { extractCitationDomain } from '../observation'
import { getGraderProfile, getGraderRun, getRunObservations } from '../store'
import { normalizeObservation } from '../normalization/normalizer'
import { enrichFindingWithLlm } from '../normalization/llm-extraction'
import { type NormalizedFinding } from '../normalization/contracts'
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

  const findings: NormalizedFinding[] = []

  for (const observation of observations) {
    const deterministic = normalizeObservation(observation, {
      subjectBrand: profile.brandName,
      subjectDomain,
      competitorsDeclared: profile.competitorsDeclared
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

    const raw = computeGraderScore(input.runId, findings)
    const status = resolveScoreStatus(raw, findings)

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
