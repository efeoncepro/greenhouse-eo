// TASK-1087 — Contrato PURO (cliente + servidor) de los prompts sugeridos data-aware. Vive en su
// propio módulo (sin `import 'server-only'`) para que el hook cliente del panel pueda consumir los
// TIPOS sin arrastrar el composer server-only al bundle (clase de bug Turbopack server-only). El
// composer (`suggested-prompts-data-aware.ts`, server-only) y la ruta importan desde acá.

import type { NexaPromptContextKey } from './suggested-prompts'

/** Contrato versionado del endpoint de prompts sugeridos. Bumpear a `.v2` ante cambio breaking. */
export const NEXA_SUGGESTED_PROMPTS_CONTRACT_VERSION = 'nexa-suggested-prompts.v1' as const

/** Categoría de la señal que originó el prompt (driver de ícono/estilo en la UI; opcional). */
export type NexaSuggestedPromptHint = 'anomaly' | 'pending' | 'risk' | 'kpi'

export interface NexaSuggestedPrompt {
  text: string
  hint?: NexaSuggestedPromptHint
  /** Id de la entidad (forward-compat: WebMCP / tools de Nexa resuelven el detalle). */
  entityRef?: string
}

export type NexaSuggestedPromptsSource = 'data_aware' | 'template_fallback'

export interface NexaSuggestedPromptsPayload {
  contractVersion: typeof NEXA_SUGGESTED_PROMPTS_CONTRACT_VERSION
  context: NexaPromptContextKey
  entityName?: string
  prompts: NexaSuggestedPrompt[]
  /** `data_aware` = hay señales reales; `template_fallback` = el panel debe usar Tier 1/1.5. */
  source: NexaSuggestedPromptsSource
}
