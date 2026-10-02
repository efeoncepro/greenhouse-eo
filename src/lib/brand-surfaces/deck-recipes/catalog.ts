/**
 * El catálogo de recetas del deck en runtime (TASK-1929). Lee el artefacto generado `catalog.generated.json` —nunca el
 * JSON aprobado de `docs/` con `fs`— y lo expone tipado. Lo escribe y lo verifica `pnpm brand:deck-recipes`.
 */

import generated from './catalog.generated.json'
import type { DeckDocumentKind, DeckRecipe, DeckRecipeCatalog } from './types'

export const deckRecipeCatalog = generated as unknown as DeckRecipeCatalog

const byId = new Map(deckRecipeCatalog.recipes.map(recipe => [recipe.id, recipe]))

/**
 * Las familias de AXIS que el catálogo acepta como lámina de un deck que no es propuesta ni brochure: la portada y el
 * cierre clásicos (reemplazados en brochure y propuesta el 2026-09-27, vigentes en pitch y QBR).
 */
const CLASSIC_FRAMES: Record<string, { role: 'cover' | 'close'; documents: DeckDocumentKind[] }> = {
  'cover-classic': { role: 'cover', documents: ['pitch', 'qbr'] },
  'close-classic': { role: 'close', documents: ['pitch', 'qbr'] }
}

/** La receta del catálogo con ese id, o la portada/cierre clásicos de AXIS como receta sin plantilla de catálogo. */
export const getDeckRecipe = (id: string): DeckRecipe | null => {
  const recipe = byId.get(id)

  if (recipe) return recipe

  const classic = CLASSIC_FRAMES[id]

  if (!classic || !Object.hasOwn(deckRecipeCatalog.axisRecipeFamilies, id)) return null

  return {
    id,
    name: deckRecipeCatalog.axisRecipeFamilies[id]!,
    family: classic.role,
    documents: classic.documents,
    surface: 'dark',
    photo: { uses: false, plate: null },
    pairs: { coverClose: [], variant: [], sequence: [] },
    slots: [],
    template: null,
    axis: { recipe: id, layout: null, role: classic.role, theme: null, uses: [], progress: false, page: null }
  }
}

export const listDeckRecipes = (document?: DeckDocumentKind): DeckRecipe[] =>
  deckRecipeCatalog.recipes.filter(recipe => !document || recipe.documents.includes(document))

/** ¿Es una familia de AXIS (no una receta)? Un plan no la puede nombrar como lámina, salvo los marcos clásicos. */
export const isAxisFamily = (id: string): boolean => Object.hasOwn(deckRecipeCatalog.axisRecipeFamilies, id)

/** El papel de la lámina en el documento: portada, cierre u otra. */
export const roleOf = (recipe: DeckRecipe): string | null => recipe.axis?.role ?? (recipe.family === 'cover' || recipe.family === 'close' ? recipe.family : null)
