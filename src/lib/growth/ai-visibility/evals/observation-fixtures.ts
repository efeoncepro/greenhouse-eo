/**
 * TASK-1227 — Growth AI Visibility · Observation fixtures (Slice 1).
 *
 * `ProviderObservation` representativas (shape de TASK-1226) que alimentan los
 * tests del normalizer/scoring/gates. Reflejan escenarios reales del spike
 * (golden-set.v1.json): ausencia en descubrimiento, recall preciso, colisión de
 * entidad, trust sin reseñas. NO contienen PII; los excerpts son cortos.
 */

import { sha256Hex } from '../observation'
import { type GrowthAiVisibilityProviderObservation } from '../contracts'

const base = (
  over: Partial<GrowthAiVisibilityProviderObservation> & {
    observationId: string
    promptId: string
    provider: GrowthAiVisibilityProviderObservation['provider']
  }
): GrowthAiVisibilityProviderObservation => ({
  runId: 'run-fixture',
  model: `${over.provider}-fixture`,
  status: 'succeeded',
  answerTextHash: over.answerExcerpt ? sha256Hex(over.answerExcerpt) : null,
  answerExcerpt: null,
  citations: [],
  usage: { input_tokens: 1000, output_tokens: 200 },
  latencyMs: 4200,
  providerRequestHash: sha256Hex(`${over.provider}:${over.promptId}`),
  rawEvidencePointer: null,
  errorCode: null,
  providerPolicyVersion: 'policy.v1',
  promptPackVersion: 'prompt-pack.v1',
  createdAt: '2026-06-24T00:00:00.000Z',
  ...over
})

/** Discovery: Efeonce ausente, competidor Cebra presente (OpenAI). → brandMentioned no. */
export const FIXTURE_DISCOVERY_ABSENT: GrowthAiVisibilityProviderObservation = base({
  observationId: 'obs-fx-discovery-absent',
  promptId: 'p03',
  provider: 'openai',
  answerExcerpt: 'Entre las mejores agencias de marketing en Chile destacan Cebra y otras; no se menciona Efeonce.',
  citations: [{ url: 'https://www.cebra.cl/', domain: 'cebra.cl', sourceType: 'earned' }]
})

/** Recall preciso: Efeonce descrita con su posicionamiento real (OpenAI). → brandMentioned yes, cita propia. */
export const FIXTURE_RECALL_ACCURATE: GrowthAiVisibilityProviderObservation = base({
  observationId: 'obs-fx-recall-accurate',
  promptId: 'p14',
  provider: 'openai',
  answerExcerpt: 'Efeonce es un Growth Operating System con metodología Nested Loops para empresas.',
  citations: [{ url: 'https://efeoncepro.com/', domain: 'efeoncepro.com', sourceType: 'owned' }]
})

/** Colisión de entidad: mezcla efeoncepro.com (agencia) con f11.es (foto, España). → ambiguous. */
export const FIXTURE_ENTITY_COLLISION: GrowthAiVisibilityProviderObservation = base({
  observationId: 'obs-fx-entity-collision',
  promptId: 'p08',
  provider: 'anthropic',
  answerExcerpt: 'Existen dos Efeonce: una agencia de marketing en LATAM y un estudio de fotografía en España.',
  citations: [
    { url: 'https://efeoncepro.com/', domain: 'efeoncepro.com', sourceType: 'owned' },
    { url: 'https://f11.es/', domain: 'f11.es', sourceType: 'unknown' }
  ]
})

/** Provider que se saltó (flag/secret ausente) → no produce evidencia. */
export const FIXTURE_SKIPPED: GrowthAiVisibilityProviderObservation = base({
  observationId: 'obs-fx-skipped',
  promptId: 'p03',
  provider: 'gemini',
  status: 'skipped',
  errorCode: 'provider_disabled'
})

/** Set completo para tests de cobertura/score (3 succeeded + 1 skipped). */
export const OBSERVATION_FIXTURE_SET: GrowthAiVisibilityProviderObservation[] = [
  FIXTURE_DISCOVERY_ABSENT,
  FIXTURE_RECALL_ACCURATE,
  FIXTURE_ENTITY_COLLISION,
  FIXTURE_SKIPPED
]
