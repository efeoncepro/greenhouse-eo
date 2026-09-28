/**
 * Paridad de slots receta ↔ plantilla (TASK-1928). Cada receta del catálogo de láminas
 * (`docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json`) declara sus slots con tipo,
 * obligatoriedad y largo máximo; `recipe-map.json` dice en qué campo del `slots.json` de su plantilla vive cada uno
 * (`slots`). Este test sostiene que el contrato de la plantilla es el de la receta: ningún slot de la receta queda sin
 * campo, el tipo es compatible, lo obligatorio sigue obligatorio y el largo máximo es el mismo (en una plantilla que
 * comparten varias recetas manda el mayor). Dos formas de campo compuesto: `a+b` (la respuesta en dos líneas: la suma
 * alcanza el largo de la receta) y `#composite` (el campo imprime más que el slot, p. ej. «Fuente: …»: alcanza).
 * Las recetas anteriores a TASK-1928 declaran `slots: null` (su contrato sale del manifest de AXIS).
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const REPO = path.resolve(__dirname, '../../../..')
const CATALOG = path.join(REPO, 'src/lib/artifact-composer/catalogs/graphic-line-deck')

interface RecipeSlot {
  name: string
  type: string
  required?: boolean
  maxChars?: number
}

interface Field {
  type?: string
  required?: boolean
  maxCharacters?: number
  resolver?: string
  consumer?: string
  constraints?: { maxCharacters?: number }
  shape?: Record<string, Field>
  item?: { shape: Record<string, Field> }
}

const read = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T

const recipes = new Map(
  read<{ recipes: { id: string; slots: RecipeSlot[] }[] }>(path.join(REPO, 'docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json')).recipes.map(r => [r.id, r])
)

const map = read<{ recipes: Record<string, { contentType: string | null; slots: Record<string, string> | null }> }>(path.join(CATALOG, 'recipe-map.json'))
const registry = read<{ selector: { map: Record<string, string> }; templates: { name: string; slotsRef: string }[] }>(path.join(CATALOG, 'registry.json'))

const slotsOf = (contentType: string): Record<string, Field> => {
  const template = registry.selector.map[contentType]!
  const entry = registry.templates.find(t => t.name === template)!

  return read<{ slots: Record<string, Field> }>(path.join(CATALOG, entry.slotsRef)).slots
}

/** El campo que nombra una ruta (`slot`, `slot.campo` o `slot[].campo`). */
const fieldAt = (slots: Record<string, Field>, route: string): Field | undefined => {
  const [, slot, field] = /^([A-Za-z0-9]+)(?:\[\])?(?:\.([A-Za-z0-9]+))?$/.exec(route) ?? []
  const node = slots[slot ?? '']

  if (!node || !field) return node

  return (node.type === 'array' ? node.item?.shape : node.shape)?.[field]
}

/** El largo máximo de un campo: el suyo, o el mayor de los campos de texto que contiene (listas y objetos). */
const capOf = (field: Field): number | undefined => {
  if (field.maxCharacters !== undefined) return field.maxCharacters
  if (field.constraints?.maxCharacters !== undefined) return field.constraints.maxCharacters

  const shape = field.type === 'array' ? field.item?.shape : field.shape

  const caps = Object.values(shape ?? {})
    .filter(f => !f.resolver && f.consumer !== 'validation-only')
    .map(capOf)
    .filter((cap): cap is number => cap !== undefined)

  return caps.length > 0 ? Math.max(...caps) : undefined
}

const requiredOf = (field: Field): boolean => field.required === true

/** Qué forma de campo acepta cada tipo de slot de receta. */
const COMPATIBLE: Record<string, (field: Field) => boolean> = {
  text: f => ['string', 'rich-string', undefined].includes(f.type),
  richText: f => ['string', 'rich-string'].includes(f.type ?? ''),
  list: f => f.type === 'array' || f.type === 'object' || f.type === 'string',
  metric: f => f.type === 'array' || f.type === 'object' || f.type === 'string',
  money: f => f.type === undefined || f.type === 'string',
  image: f => f.type === 'object' || f.type === 'array',
  logo: f => f.type === 'object' || f.type === 'array',
  person: f => f.type === 'array' || f.type === 'object',
  section: f => f.type === 'object',
  enum: () => true,
  number: () => true,
  date: () => true
}

const mapped = Object.entries(map.recipes).filter(([, entry]) => entry.slots !== null)

/** En una plantilla que comparten varias recetas, el largo del campo es el mayor que piden. */
const sharedCap = new Map<string, number>()

for (const [id, entry] of mapped) {
  for (const slot of recipes.get(id)?.slots ?? []) {
    const route = entry.slots![slot.name]

    if (!route || route.includes('+') || route.includes('#') || slot.maxChars === undefined || !['text', 'richText', 'list', 'metric'].includes(slot.type)) continue

    const key = `${registry.selector.map[entry.contentType!]}:${route}`

    sharedCap.set(key, Math.max(sharedCap.get(key) ?? 0, slot.maxChars))
  }
}

describe('paridad de slots receta ↔ plantilla', () => {
  it('las 38 recetas de TASK-1928 declaran su mapa de slots', () => {
    expect(mapped.length).toBeGreaterThanOrEqual(38)
  })

  it.each(mapped)('%s: cada slot de la receta vive en un campo compatible de su plantilla', (id, entry) => {
    const recipe = recipes.get(id)

    expect(recipe, `${id} no está en el catálogo de recetas`).toBeDefined()

    const slots = slotsOf(entry.contentType!)
    const names = recipe!.slots.map(slot => slot.name)

    expect(Object.keys(entry.slots!).sort(), `${id}: el mapa no cubre exactamente los slots de la receta`).toEqual([...names].sort())

    for (const slot of recipe!.slots) {
      const [route, marker] = entry.slots![slot.name]!.split('#')
      const parts = route!.split('+')
      const found = parts.map(part => fieldAt(slots, part))
      const where = `${id}.${slot.name} → ${entry.slots![slot.name]}`

      found.forEach((field, i) => expect(field, `${where}: la plantilla no tiene «${parts[i]}»`).toBeDefined())

      const fields = found as Field[]

      expect(COMPATIBLE[slot.type]?.(fields.at(-1)!), `${where}: tipo ${slot.type} incompatible con ${fields.at(-1)!.type}`).toBe(true)

      if (slot.required) expect(fields.some(requiredOf), `${where}: la receta lo exige y la plantilla no`).toBe(true)

      if (slot.maxChars === undefined || !['text', 'richText', 'list', 'metric'].includes(slot.type)) continue

      const caps = fields.map(capOf)

      if (parts.length > 1 || marker === 'composite') {
        const total = caps.reduce<number>((sum, cap) => sum + (cap ?? 0), 0)

        expect(total, `${where}: el campo compuesto no alcanza los ${slot.maxChars} caracteres de la receta`).toBeGreaterThanOrEqual(slot.maxChars)
      } else {
        const expected = sharedCap.get(`${registry.selector.map[entry.contentType!]}:${route}`)

        expect(caps[0], `${where}: el largo de la plantilla no es el de la receta`).toBe(expected)
      }
    }
  })
})
