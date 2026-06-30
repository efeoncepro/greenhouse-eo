/**
 * TASK-1249 — Growth AI Visibility Grader · Prompt pack registry.
 *
 * Resuelve un pack por su versión. Default de runtime = V1 (los snapshots públicos
 * ya emitidos siguen siendo reproducibles); V2 es opt-in vía `promptPackVersion`
 * explícito hasta que un eval real (baseline + regresión) + sign-off lo promuevan
 * a default. Una versión EXPLÍCITA desconocida lanza — nunca se falsea la
 * provenance tuple cayendo a otro pack en silencio.
 */

import {
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V1,
  GROWTH_AI_VISIBILITY_PROMPT_PACK_VERSION,
  type GrowthAiVisibilityPromptPack
} from './prompt-pack-v1'
import {
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V2,
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V2_VERSION
} from './prompt-pack-v2'

export const GROWTH_AI_VISIBILITY_PROMPT_PACKS: Record<string, GrowthAiVisibilityPromptPack> = {
  [GROWTH_AI_VISIBILITY_PROMPT_PACK_VERSION]: GROWTH_AI_VISIBILITY_PROMPT_PACK_V1,
  [GROWTH_AI_VISIBILITY_PROMPT_PACK_V2_VERSION]: GROWTH_AI_VISIBILITY_PROMPT_PACK_V2
}

/** Default de runtime. V1 hasta que V2 pase el gate de eval real + sign-off. */
export const GROWTH_AI_VISIBILITY_DEFAULT_PROMPT_PACK_VERSION = GROWTH_AI_VISIBILITY_PROMPT_PACK_VERSION

/** Resuelve el pack por versión. `null`/`undefined` → default; versión desconocida → throw. */
export const resolvePromptPack = (version?: string | null): GrowthAiVisibilityPromptPack => {
  if (version == null) {
    return GROWTH_AI_VISIBILITY_PROMPT_PACKS[GROWTH_AI_VISIBILITY_DEFAULT_PROMPT_PACK_VERSION]
  }

  const pack = GROWTH_AI_VISIBILITY_PROMPT_PACKS[version]

  if (!pack) {
    throw new Error(`Unknown AI Visibility prompt pack version: ${version}`)
  }

  return pack
}
