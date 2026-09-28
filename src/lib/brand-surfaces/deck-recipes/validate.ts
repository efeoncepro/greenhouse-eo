/**
 * `validateDeckPlan(plan)`: el plan de deck contra el catálogo de recetas aprobado (TASK-1929).
 *
 * Dos capas, una regla en un solo lugar:
 * 1. **Piso de AXIS.** Si el documento es `proposal` o `brochure`, arma el documento con la página de AXIS de cada receta
 *    (su intent de ejemplo, sin lo que el documento propaga) y lo valida `resolveSurfaceDocument`: portada primero y
 *    cierre al final en un brochure, página de servicio, línea del marco, navegación y la foto que alterna entre portada
 *    y cierre. Sus issues llegan con `source: 'axis'` y el código de AXIS tal cual.
 * 2. **Reglas del catálogo** que AXIS no conoce: recetas por id, documentos, parejas portada ↔ cierre, variantes,
 *    plates, slots y ritmo. Si AXIS ya reportó lo mismo sobre la misma lámina, el código del catálogo no se agrega.
 *
 * Es pura y determinista: no lee archivos, no llama a la red y no escribe. Isomórfica (sin `server-only`).
 */

import { resolveSurfaceDocument } from '@efeoncepro/axis-ui-contracts'

import { getDeckRecipe, isAxisFamily, roleOf } from './catalog'
import { AXIS_EQUIVALENT, DECK_PLAN_ISSUE_CODES, type DeckPlanIssueCode } from './issues'
import {
  DECK_DOCUMENT_KINDS,
  type DeckPlan,
  type DeckPlanIssue,
  type DeckPlanSlide,
  type DeckPlanValidation,
  type DeckRecipe,
  type DeckRecipeSlot
} from './types'

/** Los documentos que AXIS valida como documento. */
const AXIS_DOCUMENTS = new Set(['proposal', 'brochure'])

/** La línea del marco cuando el plan no la declara (la de la familia general del brochure). */
const DEFAULT_LINE = 'growth'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Un plan que nombra plantilla o `contentType` en vez de receta. */
const namesTemplate = (slide: Record<string, unknown>): boolean => {
  if ('template' in slide || 'contentType' in slide) return true

  const id = slide.recipeId

  return typeof id === 'string' && (id.startsWith('deck.') || /^[A-Z]/.test(id))
}

/** El texto visible de un valor rico: sin marcas de negrita ni etiquetas. */
const visibleText = (value: string): string => value.replace(/\*\*/g, '').replace(/<[^>]+>/g, '')

/** Las líneas de un texto rico: salto de línea o `<br>`. */
const linesOf = (value: string): string[] => value.split(/\n|<br\s*\/?>/i)

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)

const STRING_TYPES = new Set(['text', 'richText', 'enum', 'date'])
const SCALAR_TYPES = new Set(['number', 'money', 'metric'])

/** El tipo del valor contra el tipo del slot; `null` si calza. */
const typeProblem = (slot: DeckRecipeSlot, value: unknown): string | null => {
  if (STRING_TYPES.has(slot.type) && typeof value !== 'string') return `se esperaba texto (${slot.type})`
  if (slot.type === 'list' && !Array.isArray(value)) return 'se esperaba una lista'
  // Una cifra va sola o en lista: la lámina aprobada de un caso lleva cuatro (`decision-case.stats`), la de un
  // testimonio tres (TASK-1930 liga cada una desde su hecho).
  const isScalar = (item: unknown) => typeof item === 'string' || typeof item === 'number' || isObject(item)

  if (slot.type === 'metric' && Array.isArray(value)) return value.every(isScalar) ? null : 'se esperaba una cifra o una lista de cifras'
  if (SCALAR_TYPES.has(slot.type) && !isScalar(value)) return `se esperaba un valor (${slot.type})`

  return null
}

/** El tramo más largo del valor según el tipo del slot: por línea en texto rico, por ítem en listas. */
const longestRun = (slot: DeckRecipeSlot, value: unknown): number => {
  if (slot.type === 'richText' && typeof value === 'string') return Math.max(0, ...linesOf(value).map(line => visibleText(line).trim().length))
  if ((slot.type === 'list' || slot.type === 'metric') && Array.isArray(value)) return Math.max(0, ...value.filter(item => typeof item === 'string').map(item => (item as string).length))
  if (typeof value === 'string') return value.length
  if (typeof value === 'number') return String(value).length

  return 0
}

/** Una cifra es un objeto con `value`; sin `source` no respalda nada. Cuenta las que faltan en el valor o en su lista. */
const figuresWithoutSource = (value: unknown): number => {
  const items = Array.isArray(value) ? value : [value]

  return items.filter(item => isObject(item) && 'value' in item && isEmpty(item.source)).length
}

/** Un id del catálogo o una familia de AXIS (por ejemplo `proposal-cinematic`) contra una receta del plan. */
const refersTo = (ref: string, recipe: DeckRecipe): boolean => ref === recipe.id || (isAxisFamily(ref) && recipe.axis?.recipe === ref)

interface ResolvedSlide {
  index: number
  slide: DeckPlanSlide
  recipe: DeckRecipe
}

/** La navegación de cada lámina que la lleva: la del plan o, si no la trae, la del orden de sus secciones. */
const progressOf = (resolved: ResolvedSlide[]): Map<number, { sections: number; current: number }> => {
  const sections = Math.max(1, resolved.filter(entry => entry.recipe.axis?.role === 'section').length)
  const progress = new Map<number, { sections: number; current: number }>()
  let current = 0

  for (const entry of resolved) {
    if (entry.recipe.axis?.role === 'section') current += 1
    if (entry.slide.progress) progress.set(entry.index, entry.slide.progress)
    else if (entry.recipe.axis?.progress) progress.set(entry.index, { sections, current: Math.min(current, sections) })
  }

  return progress
}

/** El piso de AXIS: el documento armado con las páginas de ejemplo de cada receta, en el orden del plan. */
const axisFloor = (plan: DeckPlan, resolved: ResolvedSlide[]): DeckPlanIssue[] => {
  const progress = progressOf(resolved)
  const coverLine = resolved.find(entry => roleOf(entry.recipe) === 'cover')?.recipe.axis?.page?.line

  const pages = resolved.map(entry => {
    const page: Record<string, unknown> = { ...(entry.recipe.axis!.page ?? {}) }
    const role = roleOf(entry.recipe)

    // El marco toma la línea del documento; una página de servicio conserva la suya.
    if (role === 'cover' || role === 'close') delete page.line
    if (progress.has(entry.index)) page.progress = progress.get(entry.index)

    return page
  })

  const manifest = resolveSurfaceDocument({
    surface: 'deck',
    format: '16x9',
    use: plan.document,
    line: plan.line ?? (typeof coverLine === 'string' ? coverLine : DEFAULT_LINE),
    pages
  } as never) as unknown as { issues?: { code: string; path?: string }[] }

  return (manifest.issues ?? []).map(issue => {
    const pageMatch = /^page\[(\d+)\]:(.+)$/.exec(issue.code)
    const pathMatch = /^pages\[(\d+)\]/.exec(issue.path ?? '')
    const index = pageMatch ? Number(pageMatch[1]) : pathMatch ? Number(pathMatch[1]) : undefined
    const entry = index === undefined ? undefined : resolved[index]

    return {
      code: pageMatch ? pageMatch[2]! : issue.code,
      severity: 'error' as const,
      source: 'axis' as const,
      ...(entry ? { slideIndex: entry.index, recipeId: entry.recipe.id } : {}),
      detail: `AXIS: ${issue.code}${issue.path ? ` (${issue.path})` : ''}`
    }
  })
}

export const validateDeckPlan = (plan: DeckPlan): DeckPlanValidation => {
  const issues: DeckPlanIssue[] = []

  const add = (code: DeckPlanIssueCode, detail: string, at?: { index: number; recipeId?: string; slot?: string }) =>
    issues.push({
      code,
      severity: DECK_PLAN_ISSUE_CODES[code],
      source: 'catalog',
      ...(at ? { slideIndex: at.index, ...(at.recipeId ? { recipeId: at.recipeId } : {}), ...(at.slot ? { slot: at.slot } : {}) } : {}),
      detail
    })

  // 0. La forma del plan.
  if (!isObject(plan) || !(DECK_DOCUMENT_KINDS as readonly string[]).includes(String(plan.document))) {
    add('plan-invalid', `El plan declara \`document\` (uno de ${DECK_DOCUMENT_KINDS.join(', ')}).`)

    return { ok: false, issues }
  }

  if (!Array.isArray(plan.slides) || plan.slides.length === 0) {
    add('plan-invalid', 'El plan lleva al menos una lámina en `slides`.')

    return { ok: false, issues }
  }

  // 1. Cada lámina, a su receta.
  const resolved: ResolvedSlide[] = []

  plan.slides.forEach((slide, index) => {
    if (!isObject(slide) || typeof slide.recipeId !== 'string' || slide.recipeId.trim() === '') {
      add('plan-invalid', 'Cada lámina nombra su receta en `recipeId`.', { index })

      return
    }

    if (namesTemplate(slide as unknown as Record<string, unknown>)) {
      add('template-named-instead-of-recipe', `«${slide.recipeId}» no es una receta: el plan nombra recetas del catálogo, nunca plantillas ni contentType.`, { index })

      return
    }

    if (slide.slots !== undefined && !isObject(slide.slots)) {
      add('plan-invalid', '`slots` es un objeto por nombre de slot.', { index, recipeId: slide.recipeId })

      return
    }

    const recipe = getDeckRecipe(slide.recipeId)

    if (!recipe) {
      add(
        'recipe-unknown',
        isAxisFamily(slide.recipeId)
          ? `«${slide.recipeId}» es una familia de AXIS, no una receta del catálogo: elige una de sus recetas.`
          : `«${slide.recipeId}» no está en el catálogo de recetas.`,
        { index, recipeId: slide.recipeId }
      )

      return
    }

    resolved.push({ index, slide, recipe })
  })

  const unresolved = resolved.length !== plan.slides.length

  // 2. El piso de AXIS (propuesta y brochure), sólo si todas las láminas resolvieron a una receta con página de AXIS.
  const runsFloor = AXIS_DOCUMENTS.has(plan.document) && !unresolved && resolved.every(entry => entry.recipe.axis?.page)
  const axisIssues = runsFloor ? axisFloor(plan, resolved) : []

  issues.push(...axisIssues)

  const axisSaid = (code: DeckPlanIssueCode, index?: number) =>
    (AXIS_EQUIVALENT[code] ?? []).some(axisCode => axisIssues.some(issue => issue.code === axisCode && (index === undefined || issue.slideIndex === index)))

  // 3. Recetas y documento.
  for (const { index, recipe } of resolved) {
    if (!recipe.documents.includes(plan.document) && !axisSaid('recipe-not-for-document', index)) {
      add('recipe-not-for-document', `«${recipe.id}» no va en un ${plan.document} (documentos: ${recipe.documents.join(', ')}).`, { index, recipeId: recipe.id })
    }

    // También la portada y el cierre clásicos de AXIS: el plan los admite en pitch y QBR, pero el composer no tiene
    // plantilla para ellos, así que ese deck todavía no se compone de punta a punta.
    if (!recipe.template) {
      add('recipe-without-template', `«${recipe.id}» no tiene plantilla en el composer todavía: la lámina no se compone con \`pnpm brand:compose\`.`, { index, recipeId: recipe.id })
    }

    // Toda la familia `next-steps` (los próximos pasos y el mapa del diagnóstico) supone un diagnóstico por hacer.
    if (recipe.family === 'next-steps' && plan.document === 'proposal' && plan.diagnosisDone === true) {
      add('next-steps-after-diagnosis', `«${recipe.name}» no va en una propuesta cuyo diagnóstico ya se hizo.`, { index, recipeId: recipe.id })
    }
  }

  // 4. El marco: una portada al inicio y un cierre al final, y la pareja aprobada.
  const covers = resolved.filter(entry => roleOf(entry.recipe) === 'cover')
  const closes = resolved.filter(entry => roleOf(entry.recipe) === 'close')

  if (covers.length > 1) add('frame-count', 'El deck lleva una sola portada.', { index: covers[1]!.index, recipeId: covers[1]!.recipe.id })
  if (closes.length > 1) add('frame-count', 'El deck lleva un solo cierre (y el eslogan, una sola vez).', { index: closes[1]!.index, recipeId: closes[1]!.recipe.id })

  const [cover] = covers
  const [close] = closes

  if (cover && cover.index !== 0 && !axisSaid('frame-order')) {
    add('frame-order', 'La portada va primero.', { index: cover.index, recipeId: cover.recipe.id })
  }

  if (close && close.index !== plan.slides.length - 1 && !axisSaid('frame-order')) {
    add('frame-order', 'El cierre va al final.', { index: close.index, recipeId: close.recipe.id })
  }

  if (cover && close && cover.recipe.pairs.coverClose.length + close.recipe.pairs.coverClose.length > 0) {
    const paired = cover.recipe.pairs.coverClose.some(ref => refersTo(ref, close.recipe)) || close.recipe.pairs.coverClose.some(ref => refersTo(ref, cover.recipe))

    if (!paired) {
      add(
        'pair-cover-close-mismatch',
        `«${close.recipe.id}» no es pareja aprobada de «${cover.recipe.id}» (parejas: ${cover.recipe.pairs.coverClose.join(', ') || 'ninguna'}).`,
        { index: close.index, recipeId: close.recipe.id }
      )
    }
  }

  // 5. Variantes, secuencias, ritmo y plates.
  const platesSeen = new Map<string, string>()

  resolved.forEach((entry, position) => {
    const earlier = resolved.slice(0, position)
    const role = roleOf(entry.recipe)

    // Dos variantes de la misma lámina son alternativas: se elige una y nunca van juntas en el deck, seguidas o no
    // (decisión del operador 2026-09-28, TASK-1934). Dos portadas o dos cierres ya los rechaza `frame-count`.
    const framePair = (other: ResolvedSlide) => role !== null && role === roleOf(other.recipe) && (role === 'cover' || role === 'close')
    const isVariant = (other: ResolvedSlide) => other.recipe.pairs.variant.some(ref => refersTo(ref, entry.recipe)) || entry.recipe.pairs.variant.some(ref => refersTo(ref, other.recipe))
    const alternative = earlier.find(other => !framePair(other) && isVariant(other))

    if (alternative) {
      add(
        'variant-both-in-deck',
        `«${entry.recipe.id}» es variante de «${alternative.recipe.id}» (lámina ${alternative.index + 1}): son alternativas, el deck lleva una sola.`,
        { index: entry.index, recipeId: entry.recipe.id }
      )
    }

    const previous = resolved[position - 1]

    if (
      previous &&
      previous.index === entry.index - 1 &&
      entry.recipe.axis?.recipe === 'section-split' &&
      previous.recipe.axis?.recipe === 'section-split' &&
      (entry.recipe.axis.layout ?? 'corner-top') === (previous.recipe.axis.layout ?? 'corner-top')
    ) {
      add('section-split-corner-adjacent', 'Dos secciones partidas seguidas con la misma esquina.', { index: entry.index, recipeId: entry.recipe.id })
    }

    // Un aviso por tramo: en la tercera lámina de papel seguida, no en cada una de las que siguen.
    const run = resolved.slice(Math.max(0, position - 3), position + 1)
    const paper = (item?: ResolvedSlide) => item?.recipe.axis?.theme === 'light'
    const contiguous = (items: ResolvedSlide[]) => items.every((item, at) => at === 0 || item.index === items[at - 1]!.index + 1)
    const lastThree = run.slice(-3)
    const startsRun = run.length < 4 || !paper(run[0]) || !contiguous(run)

    if (lastThree.length === 3 && lastThree.every(item => paper(item)) && contiguous(lastThree) && startsRun) {
      add('rhythm-paper-run', 'Tres láminas de papel seguidas: intercala una oscura o con foto.', { index: entry.index, recipeId: entry.recipe.id })
    }

    const plate = entry.slide.plateRef ?? entry.recipe.photo.plate

    if (plate) {
      const first = platesSeen.get(plate)

      if (first) add('plate-repeated', `El plate de «${entry.recipe.id}» ya lo usa «${first}»: un plate no se repite en un deck.`, { index: entry.index, recipeId: entry.recipe.id })
      else platesSeen.set(plate, entry.recipe.id)
    }
  })

  // 6. Los slots de las láminas que ya traen contenido.
  for (const { index, slide, recipe } of resolved) {
    if (!slide.slots) continue

    const byName = new Map(recipe.slots.map(slot => [slot.name, slot]))

    for (const name of Object.keys(slide.slots)) {
      if (!byName.has(name)) add('slot-unknown', `«${recipe.id}» no tiene el slot «${name}».`, { index, recipeId: recipe.id, slot: name })
    }

    for (const slot of recipe.slots) {
      const value = slide.slots[slot.name]

      if (isEmpty(value)) {
        if (slot.required) add('slot-required-missing', `Falta «${slot.name}», obligatorio en «${recipe.id}».`, { index, recipeId: recipe.id, slot: slot.name })

        continue
      }

      const problem = typeProblem(slot, value)

      if (problem) {
        add('slot-type-invalid', `«${slot.name}»: ${problem}.`, { index, recipeId: recipe.id, slot: slot.name })

        continue
      }

      // Una cifra (objeto con `value`) viaja con su fuente; en una lista, cada ítem.
      if (figuresWithoutSource(value) > 0) {
        add('figure-source-missing', `«${slot.name}» trae una cifra sin fuente: cada cifra lleva \`source\` con el documento que la respalda.`, { index, recipeId: recipe.id, slot: slot.name })
      }

      const length = longestRun(slot, value)

      if (slot.maxChars !== null && length > slot.maxChars) {
        add(
          'slot-over-max-chars',
          `«${slot.name}» mide ${length} caracteres y la lámina aprobada admite ${slot.maxChars}${slot.type === 'richText' ? ' por línea' : slot.type === 'list' ? ' por ítem' : ''}.`,
          { index, recipeId: recipe.id, slot: slot.name }
        )
      }
    }
  }

  return { ok: !issues.some(issue => issue.severity === 'error'), issues }
}
