/**
 * Tipos del plan de deck de «La órbita» contra el catálogo de recetas aprobado (TASK-1929).
 *
 * Un plan nombra RECETAS del catálogo (`EFEONCE_DECK_SLIDE_RECIPES_V1.json`) por id, nunca plantillas ni
 * `contentType`: la plantilla la deriva el mapper de `src/lib/brand-surfaces`. Los tipos del catálogo describen el
 * artefacto generado `catalog.generated.json` (lo escribe `pnpm brand:deck-recipes`).
 */

/** Los documentos del catálogo. AXIS valida como documento sólo `proposal` y `brochure`. */
export const DECK_DOCUMENT_KINDS = ['proposal', 'brochure', 'pitch', 'qbr'] as const

export type DeckDocumentKind = (typeof DECK_DOCUMENT_KINDS)[number]

export type DeckRecipeSlotType =
  | 'text'
  | 'richText'
  | 'list'
  | 'image'
  | 'enum'
  | 'section'
  | 'metric'
  | 'logo'
  | 'number'
  | 'money'
  | 'person'
  | 'date'

export interface DeckRecipeSlot {
  name: string
  type: DeckRecipeSlotType
  required: boolean
  /** Largo máximo medido en la lámina aprobada; en `richText` es por línea y en `list`, por ítem. */
  maxChars: number | null
}

/** La receta como la lee el runtime: sólo campos estructurados, nunca las notas en prosa. */
export interface DeckRecipe {
  id: string
  name: string
  family: string
  documents: DeckDocumentKind[]
  surface: string
  photo: { uses: boolean; plate: string | null }
  pairs: { coverClose: string[]; variant: string[]; sequence: string[] }
  slots: DeckRecipeSlot[]
  /** El `contentType` de su plantilla en `graphic-line-deck`, o `null` si todavía no tiene. */
  template: string | null
  /** La receta de AXIS que la compone y la página de su intent de ejemplo, sin lo que propaga el documento. */
  axis: {
    recipe: string
    layout: string | null
    role: string | null
    theme: string | null
    uses: string[]
    progress: boolean
    page: Record<string, unknown> | null
  } | null
}

export interface DeckRecipeCatalog {
  schema: 'efeonce.deck-recipes.runtime.v1'
  source: { schema: string; version: string; approvedAt: string }
  axisRecipeFamilies: Record<string, string>
  recipes: DeckRecipe[]
}

/** Una lámina del plan: una receta del catálogo y, si ya se escribió, su contenido por slot. */
export interface DeckPlanSlide {
  recipeId: string
  /** Contenido por nombre de slot de la receta. Sin `slots`, la lámina es un esqueleto y no se validan sus slots. */
  slots?: Record<string, unknown>
  /** Plate distinto al de la receta (TASK-1931 lo servirá por `assetId`); sin él, cuenta el plate de la receta. */
  plateRef?: string
  /** La navegación de la lámina; sin ella, el validador la deriva del orden de las secciones del plan. */
  progress?: { sections: number; current: number }
  /** Para qué está la lámina en el deck (lo escribe quien propone; no se valida). */
  purpose?: string
}

export interface DeckPlan {
  document: DeckDocumentKind
  /** La línea de servicio del marco (AXIS: `growth`, `brand`, `engine`, `voice`, `revenue`). */
  line?: string
  /** En una propuesta, el diagnóstico ya se hizo: «próximos pasos» deja de tener sentido. */
  diagnosisDone?: boolean
  slides: DeckPlanSlide[]
}

export type DeckPlanIssueSeverity = 'error' | 'warning'

/** De dónde sale el issue: el piso de documento de AXIS o una regla del catálogo. */
export type DeckPlanIssueSource = 'axis' | 'catalog'

export interface DeckPlanIssue {
  code: string
  severity: DeckPlanIssueSeverity
  source: DeckPlanIssueSource
  slideIndex?: number
  recipeId?: string
  slot?: string
  detail: string
}

export interface DeckPlanValidation {
  ok: boolean
  issues: DeckPlanIssue[]
}
