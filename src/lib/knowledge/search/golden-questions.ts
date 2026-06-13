/**
 * TASK-1083 Slice 3 — Golden questions (fixtures TS versionadas, pure).
 *
 * El set de evaluación de retrieval vive en el repo (revisable, corre en CI vía el
 * structural test; el eval harness real corre contra el corpus con PG). Cada caso
 * declara la expectativa: fuente correcta, fuente equivocada (mustNotReturn),
 * no-answer honesto y escalación sensible (agentic excluye agent_excluded/restricted).
 *
 * Matchean por substring de título (estable) — no por anchor frágil. Anclados al
 * corpus piloto TASK-1082 (11 docs). El approver del set por dominio quedó diferido
 * por TASK-1080; este set cubre los 11 docs ingeridos como baseline.
 */

import type { KnowledgeSearchConfidence, KnowledgeSearchMode } from './types'

export interface KnowledgeGoldenQuestion {
  id: string
  description: string
  query: string
  mode: KnowledgeSearchMode
  /** Algún chunk retornado tiene este substring en el título (case-insensitive). */
  expectAnyTitleIncludes?: string
  /** Ningún chunk retornado tiene este substring (wrong-source / agent_excluded). */
  mustNotReturnTitleIncludes?: string
  /** confidence === 'none' y cero chunks (no-answer honesto). */
  expectNoAnswer?: boolean
  /** confidence >= este nivel. */
  expectMinConfidence?: KnowledgeSearchConfidence
  /** deniedOrFilteredCount >= n (escalación sensible en modo agentic). */
  expectDeniedAtLeast?: number
}

export const KNOWLEDGE_CONFIDENCE_RANK: Record<KnowledgeSearchConfidence, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3
}

export const KNOWLEDGE_GOLDEN_QUESTIONS: KnowledgeGoldenQuestion[] = [
  // ── Fuente correcta (human) ───────────────────────────────────────────────
  {
    id: 'payroll-period-human',
    description: 'Humano: el doc de períodos de nómina (agent_excluded) SÍ es visible.',
    query: '¿cómo creo un período de nómina?',
    mode: 'human',
    expectAnyTitleIncludes: 'nómina',
    expectMinConfidence: 'medium'
  },
  {
    id: 'efeonce-greenhouse-nexa',
    description: 'Fuente correcta: diferencia entre Efeonce, Greenhouse y Nexa.',
    query: '¿cuál es la diferencia entre Efeonce, Greenhouse y Nexa?',
    mode: 'human',
    expectAnyTitleIncludes: 'Diferencia',
    expectMinConfidence: 'medium'
  },
  {
    id: 'notion-client-connect',
    description: 'Fuente correcta: conectar el Notion de un cliente.',
    query: '¿cómo conecto el Notion de un cliente?',
    mode: 'human',
    expectAnyTitleIncludes: 'Notion',
    expectMinConfidence: 'medium'
  },
  {
    id: 'roles-access',
    description: 'Fuente correcta: roles y acceso básicos.',
    query: '¿qué roles y accesos existen en Greenhouse?',
    mode: 'human',
    expectAnyTitleIncludes: 'Roles y acceso',
    expectMinConfidence: 'medium'
  },
  {
    id: 'shortcuts',
    description: 'Fuente correcta: accesos rápidos / atajos.',
    query: '¿cómo uso los accesos rápidos?',
    mode: 'human',
    expectAnyTitleIncludes: 'Accesos rápidos',
    expectMinConfidence: 'medium'
  },

  // ── Fuente correcta (agentic) ─────────────────────────────────────────────
  {
    id: 'ico-glossary-agentic',
    description: 'Agentic: el glosario ICO (agent_allowed) responde RpA/OTD/FTR.',
    query: '¿qué significan RpA, OTD y FTR?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Glosario ICO',
    expectMinConfidence: 'medium'
  },

  // ── Escalación sensible: agentic NUNCA retorna el doc agent_excluded ───────
  {
    id: 'payroll-period-agentic-excluded',
    description: 'Agentic: el doc de nómina (agent_excluded) NUNCA se retorna; cuenta como denegado.',
    query: '¿cómo creo un período de nómina?',
    mode: 'agentic',
    mustNotReturnTitleIncludes: 'nómina',
    expectDeniedAtLeast: 1
  },

  // ── Wrong-source guard ────────────────────────────────────────────────────
  {
    id: 'ico-not-payroll',
    description: 'Wrong-source: una pregunta de métricas ICO no debe citar el doc de nómina.',
    query: '¿qué métricas operativas mide el motor ICO?',
    mode: 'human',
    expectAnyTitleIncludes: 'ICO',
    mustNotReturnTitleIncludes: 'nómina'
  },

  // ── No-answer honesto (off-corpus) ────────────────────────────────────────
  {
    id: 'no-answer-sushi',
    description: 'No-answer: pregunta fuera del corpus operativo → confidence none.',
    query: 'receta para preparar sushi de salmón fresco',
    mode: 'human',
    expectNoAnswer: true
  },
  {
    id: 'no-answer-astronomy',
    description: 'No-answer: pregunta fuera del corpus operativo → confidence none.',
    query: 'cuántas lunas tiene el planeta Júpiter',
    mode: 'human',
    expectNoAnswer: true
  }
]
