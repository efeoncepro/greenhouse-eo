/**
 * Builders de las recetas APROBADAS de web, DOOH y motion (catálogo `graphic-line-stills`, PNG por formato).
 * Ver `deck.ts` para el contrato de un builder.
 */

import type { RecipeBuilder } from './deck'

export const STILL_BUILDERS: Record<'web' | 'dooh' | 'motion', Record<string, RecipeBuilder>> = {
  web: {},
  dooh: {},
  motion: {}
}
