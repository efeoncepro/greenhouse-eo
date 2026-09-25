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

/**
 * TASK-1888 — con el contrato editorial v2 el modelo reescribe además la lectura por figura («Lo que significa» y
 * «Próximo paso»). Mismas reglas; el prompt sube de versión porque cambia lo que recibe. Presupuesto un poco mayor
 * porque hay más textos, con el mismo límite de reparaciones y el mismo fallback determinista.
 */
export const INSIGHTS_AUTHORING_PROMPT_VERSION_V2 = 'insights-authoring-v2'
const MAX_OUTPUT_TOKENS = 2048
const MAX_OUTPUT_TOKENS_V2 = 3072
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

/** TASK-1888 — mismas reglas + la lectura por figura, que tampoco admite causas ni pasos que el texto no diga. */
const SYSTEM_V2 = [
  SYSTEM,
  'Algunas afirmaciones son la lectura de una figura («Lo que significa» y «Próximo paso»): mantenlas factuales y breves;',
  'un próximo paso sólo puede nombrar lo que el texto original ya nombra.'
].join(' ')

const isV2 = (plan: EditorialPlanV1): boolean => plan.chapters.some(chapter => chapter.readings !== undefined)

const buildPrompt = (plan: EditorialPlanV1): string => {
  const claims = plan.chapters.flatMap(chapter => [
    ...chapter.claims.map(claim => ({ chapter: chapter.title, claimId: claim.claimId, text: claim.text })),
    // TASK-1888 — la lectura por figura también se reescribe; nunca la cifra principal ni las líneas de alcance.
    ...(chapter.readings ?? []).flatMap(reading => [reading.conclusion, reading.meaning, reading.nextStep].filter((claim): claim is NonNullable<typeof claim> => Boolean(claim)).map(claim => ({ chapter: chapter.title, claimId: claim.claimId, text: claim.text })))
  ])

  return JSON.stringify({ locale: plan.locale, claims }, null, 2)
}

const applyRewrite = (plan: EditorialPlanV1, rewritten: RewrittenClaims): EditorialPlanV1 => {
  const byId = new Map(rewritten.claims.map(claim => [claim.claimId, claim.text.trim()]))
  const rewrite = <T extends { claimId: string; text: string }>(claim: T): T => ({ ...claim, text: byId.get(claim.claimId) || claim.text })

  return {
    ...plan,
    chapters: plan.chapters.map(chapter => ({
      ...chapter,
      claims: chapter.claims.map(rewrite),
      ...(chapter.readings
        ? {
            readings: chapter.readings.map(reading => ({
              ...reading,
              ...(reading.conclusion ? { conclusion: rewrite(reading.conclusion) } : {}),
              ...(reading.meaning ? { meaning: rewrite(reading.meaning) } : {}),
              nextStep: reading.nextStep ? rewrite(reading.nextStep) : null
            }))
          }
        : {})
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
  const v2 = isV2(deterministic)
  const promptVersion = v2 ? INSIGHTS_AUTHORING_PROMPT_VERSION_V2 : INSIGHTS_AUTHORING_PROMPT_VERSION
  let model: string | null = null
  let lastViolations = ''

  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt += 1) {
    usage.attempts = attempt + 1

    try {
      const result = await generate<RewrittenClaims>({
        system: v2 ? SYSTEM_V2 : SYSTEM,
        prompt: attempt === 0 ? buildPrompt(deterministic) : `${buildPrompt(deterministic)}\n\nLa versión anterior fue rechazada por cambiar cifras: ${lastViolations}. Repite conservando cada cifra literal.`,
        jsonSchema: SCHEMA,
        maxOutputTokens: v2 ? MAX_OUTPUT_TOKENS_V2 : MAX_OUTPUT_TOKENS,
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
          provenance: { mode: 'ai_bounded', modelId: model, promptVersion, usage },
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
