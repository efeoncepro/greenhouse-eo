/**
 * Artifact Composer — contrato genérico de GRADIENT RECIPES (TASK-1393 Slice 3c).
 *
 * Un gradiente no es un color: es una RECETA VISUAL del catálogo — capas ordenadas, tipo,
 * geometría, stops, alpha y tiling. La receta es DATO versionado del catálogo; sus stops sólo
 * referencian ROLES del brand pack o recipe-tokens declarados en el ledger — **nunca un HEX**.
 * Así un cambio de marca varía el pack sin alterar la geometría del deck, y un catálogo social
 * declara su propio molde sin copiar el renderer.
 *
 * El compilador es determinista y compone custom properties (`--<prefix>-recipe-<nombre>`) cuyo
 * valor COMPUTADO es idéntico al stack que reemplaza (el gate de 0 píxeles lo verifica).
 */

/**
 * Referencia de un stop:
 *   `role:<name>`   → var(--<rolePrefix>-role-<name>[-rgb])
 *   `token:<--var>` → var(<--var>[-rgb])   (recipe-tokens del ledger, ej. back-cover)
 *   `transparent`   → transparent
 */
export type RecipeStopRef = string

export interface RecipeStop {
  ref: RecipeStopRef
  /** Alpha composicional del stop (rgba). Ausente = color pleno. */
  alpha?: number
  /** Posición del stop, VERBATIM (`0%`, `.55px`, `38%`). */
  at?: string
}

export interface RecipeLayer {
  fn: 'linear-gradient' | 'radial-gradient'
  /** Preludio de geometría VERBATIM (`120deg`, `52% 60% at 100% 0%`). Ausente = sin preludio (grano). */
  geometry?: string
  stops: RecipeStop[]
  /** Position/size del layer (`0 0 / 5px 5px`) — el tiling del grano. */
  tile?: string
}

export interface GradientRecipe {
  /** Qué es esta receta y dónde se usa (documentación viva del molde). */
  description: string
  /** Un solo color pleno (lightSurface). Excluye `layers`. */
  solid?: RecipeStopRef
  /** Capas EN ORDEN (la primera se pinta encima — orden CSS de `background`). */
  layers?: RecipeLayer[]
}

export interface GradientRecipesFile {
  version: string
  recipes: Record<string, GradientRecipe>
}

export class RecipeIntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecipeIntegrityError'
  }
}

const renderRef = (ref: RecipeStopRef, rolePrefix: string, rgb: boolean): string => {
  if (ref === 'transparent') return 'transparent'

  if (ref.startsWith('role:')) {
    return `var(--${rolePrefix}-role-${ref.slice(5)}${rgb ? '-rgb' : ''})`
  }

  if (ref.startsWith('token:--')) {
    return `var(${ref.slice(6)}${rgb ? '-rgb' : ''})`
  }

  throw new RecipeIntegrityError(
    `Stop ref inválida: "${ref}". Una recipe sólo referencia role:<name>, token:--<var> o transparent — nunca un HEX.`
  )
}

const renderStop = (stop: RecipeStop, rolePrefix: string): string => {
  if (stop.ref === 'transparent' && stop.alpha !== undefined) {
    throw new RecipeIntegrityError('transparent no lleva alpha.')
  }

  const color =
    stop.alpha !== undefined
      ? `rgba(${renderRef(stop.ref, rolePrefix, true)}, ${String(stop.alpha).replace(/^0\./, '.')})`
      : renderRef(stop.ref, rolePrefix, false)

  return stop.at ? `${color} ${stop.at}` : color
}

const renderLayer = (layer: RecipeLayer, rolePrefix: string): string => {
  const stops = layer.stops.map(stop => renderStop(stop, rolePrefix)).join(', ')
  const body = layer.geometry ? `${layer.geometry}, ${stops}` : stops

  return `${layer.fn}(${body})${layer.tile ? ` ${layer.tile}` : ''}`
}

/** Compila las recipes a declaraciones de custom property (`--<prefix>-recipe-<nombre>: <stack>`). */
export const compileGradientRecipes = (
  file: GradientRecipesFile,
  options: { rolePrefix: string; recipePrefix: string }
): string[] => {
  const lines: string[] = []

  for (const [name, recipe] of Object.entries(file.recipes).sort(([a], [b]) => a.localeCompare(b))) {
    if (recipe.solid && recipe.layers) {
      throw new RecipeIntegrityError(`la recipe "${name}" declara solid Y layers — es una o la otra.`)
    }

    const value = recipe.solid
      ? renderRef(recipe.solid, options.rolePrefix, false)
      : (recipe.layers ?? []).map(layer => renderLayer(layer, options.rolePrefix)).join(', ')

    if (!value) {
      throw new RecipeIntegrityError(`la recipe "${name}" no declara solid ni layers.`)
    }

    lines.push(`  --${options.recipePrefix}-recipe-${name}: ${value};`)
  }

  return lines
}
