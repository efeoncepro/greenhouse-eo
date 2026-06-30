/**
 * TASK-1249 — Growth AI Visibility Grader · Prompt pack V2 (additive sobre V1).
 *
 * Espejo tipado de `docs/architecture/growth/ai-visibility/prompt-pack.v2.json`.
 * V1 queda INTACTO y reproducible (snapshots públicos previos no cambian); V2 es
 * opt-in vía `promptPackVersion: 'prompt-pack.v2'`. Cambio único vs V1:
 *
 *  - **p12**: V1 decía «…para una marca grande (aerolínea o banca) en {{market}}.»
 *    El paréntesis nombraba sectores → contaminaba los controles del brand-set
 *    (LATAM Airlines / Banco de Chile aparecían por el sector mencionado, no por
 *    presencia genuina — calibración §4.bis). V2 lo neutraliza a «…una marca
 *    grande (enterprise) en {{market}}.» para que el control mida señal real.
 *
 * p06 (bug `{{competitor}}` literal del spike §7) NO requiere cambio de texto: lo
 * resuelve `resolvePromptInputs`, que descarta el prompt cuando no hay competidor.
 * El resto de prompts es idéntico a V1 (diff mínimo y trazable). Pack inmutable.
 */

import {
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V1,
  type GrowthAiVisibilityPromptPack
} from './prompt-pack-v1'

export const GROWTH_AI_VISIBILITY_PROMPT_PACK_V2_VERSION = 'prompt-pack.v2'

export const GROWTH_AI_VISIBILITY_PROMPT_PACK_V2: GrowthAiVisibilityPromptPack = {
  ...GROWTH_AI_VISIBILITY_PROMPT_PACK_V1,
  version: GROWTH_AI_VISIBILITY_PROMPT_PACK_V2_VERSION,
  prompts: GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.map(prompt =>
    prompt.id === 'p12'
      ? { ...prompt, text: 'Agencia enterprise de {{category}} para una marca grande (enterprise) en {{market}}.' }
      : prompt
  )
}
