/**
 * TASK-1226 — Growth AI Visibility Grader · Prompt pack interpolation (Slice 4).
 *
 * Helpers PUROS para resolver los prompts de un pack contra un perfil de marca.
 * La marca/categoría se interpolan como DATO; los prompts que requieren
 * `{{competitor}}` sin competidor declarado se descartan (no se corre el literal,
 * bug p06 del spike). NUNCA inyecta PII.
 */

import { type GraderRunPromptInput } from './run-engine'
import {
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V1,
  type GrowthAiVisibilityPromptPack
} from './prompt-packs/prompt-pack-v1'

export interface PromptPackProfileVars {
  brandName: string
  category: string
  market: string
  painPoint?: string
  year?: string
  competitor?: string | null
}

const interpolate = (text: string, vars: Record<string, string>): string =>
  text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => (vars[key] != null ? vars[key] : `{{${key}}}`))

/**
 * Resuelve los prompt inputs ejecutables de un pack para un perfil. Descarta los
 * prompts con `{{competitor}}` sin competidor. `includeBrandNamed` controla si se
 * incluyen los prompts que nombran la marca (recall) — para descubrimiento puro
 * (AEO) suelen excluirse.
 */
export const resolvePromptInputs = (
  vars: PromptPackProfileVars,
  options: { pack?: GrowthAiVisibilityPromptPack; includeBrandNamed?: boolean } = {}
): GraderRunPromptInput[] => {
  const pack = options.pack ?? GROWTH_AI_VISIBILITY_PROMPT_PACK_V1
  const includeBrandNamed = options.includeBrandNamed ?? true

  const resolved: Record<string, string> = {
    brand: vars.brandName,
    category: vars.category,
    market: vars.market,
    painPoint: vars.painPoint ?? 'su visibilidad y posicionamiento de marca',
    year: vars.year ?? String(new Date().getFullYear()),
    ...(vars.competitor ? { competitor: vars.competitor } : {})
  }

  return pack.prompts
    .filter(prompt => includeBrandNamed || !prompt.namesBrand)
    .filter(prompt => !(/\{\{competitor\}\}/.test(prompt.text) && !vars.competitor))
    .map(prompt => ({
      promptId: prompt.id,
      promptText: interpolate(prompt.text, resolved),
      // TASK-1290 Slice 0 — los tags viajan con el run (el scorer los lee de acá, no del pack estático).
      family: prompt.family,
      fanOutType: prompt.fanOutType,
      intentStage: prompt.intentStage,
      namesBrand: prompt.namesBrand
    }))
}

export { GROWTH_AI_VISIBILITY_PROMPT_PACK_V1, GROWTH_AI_VISIBILITY_PROMPT_PACK_VERSION } from './prompt-packs/prompt-pack-v1'
