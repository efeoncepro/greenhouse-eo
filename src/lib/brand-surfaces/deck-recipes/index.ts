/**
 * El plan de deck de «La órbita» contra el catálogo de recetas aprobado (TASK-1929).
 *
 * Esta entrada es pura e isomórfica: catálogo de runtime, tipos, códigos y `validateDeckPlan`. La propuesta del
 * agente (`proposeDeckPlan`) es `server-only` porque llama al cliente LLM canónico: se importa desde
 * `@/lib/brand-surfaces/deck-recipes/propose`.
 */

export { deckRecipeCatalog, getDeckRecipe, isAxisFamily, listDeckRecipes, roleOf } from './catalog'
export { AXIS_EQUIVALENT, DECK_PLAN_ISSUE_CODES, type DeckPlanIssueCode } from './issues'
export * from './types'
export { validateDeckPlan } from './validate'
