import type { NexaProviderKey } from '@/config/nexa-models'

/**
 * TASK-1091 — Router interno de provider de Nexa. PURO (sin server-only, sin env, sin
 * IO): clasifica la intención del turno y elige el provider primario + la cadena de
 * failover. El orquestador (`nexa-service.ts`) resuelve los flags/modelos concretos y
 * consume estas funciones; mantenerlo puro lo hace testeable y determinístico.
 *
 * Heurística V1 (conservadora): las preguntas de proceso/política/definición ("cómo se
 * hace X", "qué es Y", "cuál es la política de Z") se benefician de grounding + citas →
 * Anthropic (cuando el retrieval de knowledge está activo). El resto (operativo en vivo,
 * conversacional) → Gemini (rápido/económico). Es una preferencia, no un gate: con el
 * router OFF nada de esto corre y Nexa usa siempre Gemini.
 */

export type NexaIntent = 'knowledge' | 'operational' | 'general'

// Datos operativos en vivo tienen sus propios tools (check_payroll, get_otd, etc.) y se
// resuelven mejor con el modelo rápido. Estas señales mantienen el turno en Gemini aun
// si el texto roza un patrón de conocimiento.
const OPERATIONAL_INTENT_PATTERNS: RegExp[] = [
  /\bn[óo]mina\b/i,
  /\botd\b/i,
  /\bcapacidad\b/i,
  /\bfacturas?\b/i,
  /\bpor cobrar\b/i,
  /\bcorreos?\b/i,
  /\bemails?\b/i,
  /\bcu[áa]nto (gan|pag|fact|deb)/i
]

// Señales de pregunta sobre documentación/proceso/definición (es-CL).
const KNOWLEDGE_INTENT_PATTERNS: RegExp[] = [
  /\bc[óo]mo\s+(se|funciona|hago|se hace|configur|cre|activ|conect)/i,
  /\bqu[ée]\s+es\b/i,
  /\bpol[íi]tica/i,
  /\bprocedimiento/i,
  /\bproceso\b/i,
  /\bgu[íi]a\b/i,
  /\bmanual\b/i,
  /\brunbook/i,
  /\bdefinici[óo]n/i,
  /\bsignifica\b/i,
  /\bdocumentaci[óo]n/i,
  /\bpasos?\b/i,
  /\bdiferencia entre\b/i,
  /\bpara qu[ée] sirve\b/i,
  /\breglas?\b/i
]

/** Clasifica la intención del prompt. Operativo gana sobre conocimiento (tiene tools dedicados). */
export const classifyNexaIntent = (prompt: string): NexaIntent => {
  const text = prompt.trim()

  if (!text) {
    return 'general'
  }

  if (OPERATIONAL_INTENT_PATTERNS.some(pattern => pattern.test(text))) {
    return 'operational'
  }

  if (KNOWLEDGE_INTENT_PATTERNS.some(pattern => pattern.test(text))) {
    return 'knowledge'
  }

  return 'general'
}

/** Provider primario por intención. Anthropic solo para conocimiento con retrieval activo. */
export const routeNexaProviderKey = ({
  intent,
  knowledgeRetrievalEnabled
}: {
  intent: NexaIntent
  knowledgeRetrievalEnabled: boolean
}): NexaProviderKey => (intent === 'knowledge' && knowledgeRetrievalEnabled ? 'anthropic' : 'google')

/** Cadena de failover: primario primero, el otro provider como respaldo. */
export const nexaProviderFailoverChain = (primary: NexaProviderKey): NexaProviderKey[] =>
  primary === 'anthropic' ? ['anthropic', 'google'] : ['google', 'anthropic']
