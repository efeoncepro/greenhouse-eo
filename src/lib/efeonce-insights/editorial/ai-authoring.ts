import 'server-only'

/**
 * TASK-1845 — autoría IA ACOTADA (arquitectura §6 / ADR decisión 5). El modelo recibe
 * exclusivamente evidencia allowlisted (claims deterministas + hechos referenciados) y sólo
 * puede REESCRIBIR el texto de cada claim: no calcula KPIs, no agrega hechos, no decide
 * permisos ni publica. Límite de tokens, temperatura 0, UNA reparación como máximo; toda
 * salida se valida contra el snapshot y, si discrepa o falla, se conserva la versión
 * determinista. Cliente canónico `src/lib/ai/google-genai.ts` (nunca SDK paralelo).
 */

import { generateStructuredGemini } from '@/lib/ai/google-genai'
import { captureWithDomain } from '@/lib/observability/capture'

import type { EvidenceSnapshotContentV1 } from '../contracts/evidence'
import type { EditorialPlanV1, PlanAuthoringProvenanceV1 } from '../contracts/plan'
import { validateEditorialPlan } from './plan-validation'

export const INSIGHTS_AUTHORING_PROMPT_VERSION = 'insights-authoring-v1'
const MAX_OUTPUT_TOKENS = 2048
const MAX_REPAIRS = 1

interface RewrittenClaims {
  claims: Array<{ claimId: string; text: string }>
}

const SCHEMA = {
  type: 'object',
  properties: {
    claims: {
      type: 'array',
      items: { type: 'object', properties: { claimId: { type: 'string' }, text: { type: 'string' } }, required: ['claimId', 'text'] }
    }
  },
  required: ['claims']
}

const SYSTEM = [
  'Eres el redactor de un informe ejecutivo de Efeonce. Reescribe cada afirmación en español neutro, clara y breve.',
  'Reglas absolutas: conserva TODAS las cifras exactamente como están escritas (mismo formato, mismos separadores, mismo símbolo);',
  'no agregues cifras, porcentajes, causas, promesas ni comparaciones que no estén en el texto original; no inventes explicaciones.',
  'Devuelve exactamente un texto por claimId recibido.'
].join(' ')

const buildPrompt = (plan: EditorialPlanV1): string => {
  const claims = plan.chapters.flatMap(chapter => chapter.claims.map(claim => ({ chapter: chapter.title, claimId: claim.claimId, text: claim.text })))

  return JSON.stringify({ locale: plan.locale, claims }, null, 2)
}

const applyRewrite = (plan: EditorialPlanV1, rewritten: RewrittenClaims): EditorialPlanV1 => {
  const byId = new Map(rewritten.claims.map(claim => [claim.claimId, claim.text.trim()]))

  return {
    ...plan,
    chapters: plan.chapters.map(chapter => ({
      ...chapter,
      claims: chapter.claims.map(claim => ({ ...claim, text: byId.get(claim.claimId) || claim.text }))
    }))
  }
}

export interface AiAuthoringResult {
  plan: EditorialPlanV1
  provenance: PlanAuthoringProvenanceV1
  /** Motivo por el que se conservó la versión determinista, si aplica. */
  fallbackReason: string | null
}

export const authorPlanWithBoundedAi = async (
  deterministic: EditorialPlanV1,
  snapshot: EvidenceSnapshotContentV1,
  options: { generate?: typeof generateStructuredGemini } = {}
): Promise<AiAuthoringResult> => {
  const generate = options.generate ?? generateStructuredGemini
  const usage = { inputTokens: 0, outputTokens: 0, attempts: 0 }
  let model: string | null = null
  let lastViolations = ''

  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt += 1) {
    usage.attempts = attempt + 1

    try {
      const result = await generate<RewrittenClaims>({
        system: SYSTEM,
        prompt: attempt === 0 ? buildPrompt(deterministic) : `${buildPrompt(deterministic)}\n\nLa versión anterior fue rechazada por cambiar cifras: ${lastViolations}. Repite conservando cada cifra literal.`,
        jsonSchema: SCHEMA,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0
      })

      model = result.model
      usage.inputTokens += result.usage.inputTokens
      usage.outputTokens += result.usage.outputTokens

      const candidate = applyRewrite(deterministic, result.data)
      const violations = validateEditorialPlan(candidate, snapshot)

      if (violations.length === 0) {
        return {
          plan: candidate,
          provenance: { mode: 'ai_bounded', modelId: model, promptVersion: INSIGHTS_AUTHORING_PROMPT_VERSION, usage },
          fallbackReason: null
        }
      }

      lastViolations = violations.map(violation => violation.detail).join('; ')
    } catch (error) {
      captureWithDomain(error, 'insights', { level: 'warning', extra: { operation: 'authorPlanWithBoundedAi', attempt } })
      lastViolations = 'error del proveedor'
      break
    }
  }

  return {
    plan: deterministic,
    provenance: { mode: 'deterministic', modelId: null, promptVersion: null, usage: { ...usage, aiFallbackReason: lastViolations } },
    fallbackReason: lastViolations || 'sin cambios válidos'
  }
}
