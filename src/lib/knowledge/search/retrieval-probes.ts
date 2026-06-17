/**
 * TASK-1136/1151 — probes de evaluación que el golden set NO cubre (fixtures puros).
 *
 * Los consumen el shadow eval (TASK-1136, in-memory) y la validación de runtime
 * (TASK-1151, vía `searchKnowledge` con el híbrido ON). Dos clases:
 *  - PARAPHRASE: preguntas SIN el vocabulario léxico del corpus → miden recall de
 *    paráfrasis (donde el vector recupera lo que el FTS pierde por léxico).
 *  - OFF-CORPUS: preguntas fuera del corpus → miden que el híbrido NO rompa el no-answer.
 */

import type { KnowledgeSearchMode } from './types'

export interface ParaphraseProbe {
  id: string
  query: string
  mode: KnowledgeSearchMode
  /** Substring de título del doc del dominio correcto (case-insensitive). */
  expectAnyTitleIncludes: string
}

export const KNOWLEDGE_PARAPHRASE_PROBES: ParaphraseProbe[] = [
  { id: 'p-rpa-synonym', query: '¿qué quiere decir cuando un entregable vuelve con cambios del cliente varias veces?', mode: 'agentic', expectAnyTitleIncludes: 'ICO' },
  { id: 'p-finiquito-layman', query: '¿cómo le pago lo que le corresponde a alguien que deja de trabajar con nosotros?', mode: 'agentic', expectAnyTitleIncludes: 'Finiquitos' },
  { id: 'p-conciliacion-layman', query: '¿cómo cuadro lo que dice el banco con lo que tengo registrado?', mode: 'agentic', expectAnyTitleIncludes: 'onciliación' },
  { id: 'p-scim-layman', query: '¿cómo se crean solos los usuarios cuando alguien entra a la empresa?', mode: 'agentic', expectAnyTitleIncludes: 'SCIM' },
  { id: 'p-portal-layman', query: '¿qué alcanza a mirar la gente de la marca cuando entra a su panel?', mode: 'agentic', expectAnyTitleIncludes: 'Portal Cliente' },
  { id: 'p-honorarios-layman', query: '¿por qué a un freelance no le descuentan jubilación ni salud?', mode: 'agentic', expectAnyTitleIncludes: 'Payroll' },
  { id: 'p-account360-layman', query: '¿dónde veo todo junto de una cuenta de cliente?', mode: 'agentic', expectAnyTitleIncludes: 'Account 360' },
  { id: 'p-integration-layman', query: '¿cómo me doy cuenta si una conexión externa dejó de andar?', mode: 'agentic', expectAnyTitleIncludes: 'Integraciones' }
]

export interface OffCorpusProbe {
  id: string
  query: string
  mode: KnowledgeSearchMode
}

export const KNOWLEDGE_OFF_CORPUS_PROBES: OffCorpusProbe[] = [
  { id: 'o-saturno', query: 'cuántos anillos tiene el planeta Saturno', mode: 'agentic' },
  { id: 'o-receta', query: 'receta para preparar un ceviche peruano tradicional', mode: 'agentic' },
  { id: 'o-futbol', query: 'quién ganó el mundial de fútbol en 1986', mode: 'agentic' },
  { id: 'o-clima', query: 'cuál es la temperatura promedio en la Antártida en invierno', mode: 'agentic' }
]
