/**
 * Sintetizador de payloads mínimos válidos desde un contrato de slots.
 *
 * Nació dentro de `__tests__/template-composability.test.ts` (la 3ª bug class: "tener contrato ≠ ser
 * componible") y se extrajo como módulo porque tiene DOS consumers que deben derivar el MISMO payload:
 *
 *   1. El guard de composability (CI): sintetiza y llena las 25 para probar que el catálogo no miente.
 *   2. El gate visual (`pnpm composer:visual-gate`, TASK-1393 Slice 0): renderiza las 25 con el mismo
 *      payload sintético y las diffea a 0 píxeles contra el baseline congelado.
 *
 * Si el probe del test y el del baseline divergieran, el gate visual compararía láminas distintas y
 * mentiría. Un solo sintetizador, dos consumers.
 *
 * Determinismo: NO usa `Date.now()`, `Math.random()` ni estado externo — el mismo contrato produce
 * siempre el mismo payload. Es la condición para que el diff a 0 píxeles sea un gate y no una lotería.
 */

import type { SlotContract, TemplateContract } from './contracts'

/** Genera el valor sintético más chico que el contrato acepta. */
export const synthesizeSlotValue = (slot: SlotContract): unknown => {
  const constraints = slot.constraints ?? {}
  const clamp = (max: number | undefined, text: string) => (max ? text.slice(0, Math.min(text.length, max)) : text)

  const fieldValue = (field: Record<string, unknown>, fallback: string): unknown => {
    if (field.type === 'array') {
      const constraints = (field.constraints ?? {}) as { minItems?: number }
      const item = field.item as { shape?: Record<string, Record<string, unknown>> } | undefined
      const count = constraints.minItems ?? 1

      return Array.from({ length: count }, () => objectFrom(item?.shape))
    }

    // `values` viene en DOS formas según el contrato: array (`['lead','strategy']` en los campos de
    // item) u objeto clave→etiqueta (`{combined: 'Propuesta…'}` en los slots enum). Confundirlas
    // devuelve el ÍNDICE en vez del valor — y el resolver revienta con un `"0"` que no conoce.
    if (Array.isArray(field.values)) return field.values[0]
    if (field.values && typeof field.values === 'object') return Object.keys(field.values as object)[0]
    if (Array.isArray(field.enum)) return field.enum[0]

    // Un label cuantificado que declara depender de valuePct debe representar exactamente ese mismo
    // valor. El probe no puede usar el placeholder "value": activaría correctamente el guard
    // anti-fabricación de ChartSplit.
    if (Array.isArray(field.requires) && field.requires.includes('valuePct')) return '1%'
    if (field.format === 'NN%') return '10%'

    // `isProposed` es booleano-como-string: el resolver sólo conoce 'true' | 'false'.
    if (field.resolver === 'pricing-option-tone') return false

    // Los resolvers de GEOMETRÍA derivan del dato (es lo que impide que una lámina mienta), así que
    // el probe tiene que darles un NÚMERO válido — no el texto de relleno.
    const GEOMETRY_RESOLVERS = [
      'timeline-phase-span',
      'timeline-milestone-position',
      'chart-bar-geometry',
      'case-study-before-after-bar-scale',
      // La escalera de madurez deriva TODO del score: el ancho de la barra, la severidad y el
      // "usted está aquí". Un score de texto la aborta — correctamente.
      'maturity-rung-geometry'
    ]

    if (typeof field.resolver === 'string' && GEOMETRY_RESOLVERS.includes(field.resolver)) return '1'

    // Un resolver de geometría deriva de los campos VECINOS del item (`beforeValue`/`afterValue`, el
    // eje del timeline). Si el probe les diera texto, el resolver no podría calcular y abortaría —
    // correctamente: una barra sin dato es una barra que miente. El probe tiene que darle números.
    if (/(?:^at$|Value$|Unit$|Pct$)/.test(fallback)) return '10'

    return clamp(field.maxCharacters as number | undefined, fallback)
  }

  const objectFrom = (shape: Record<string, Record<string, unknown>> | undefined): Record<string, unknown> => {
    const out: Record<string, unknown> = {}

    for (const [name, field] of Object.entries(shape ?? {})) out[name] = fieldValue(field, name)

    return out
  }

  switch (slot.type) {
    case 'string':
    case 'rich-string':
      return clamp(constraints.maxCharacters, 'Texto')

    case 'enum':
      return Array.isArray(slot.values) ? slot.values[0] : Object.keys(slot.values ?? {})[0]

    case 'asset':
    case 'asset-ref':
    case 'fixed-asset':
      return { src: 'assets/url-lum.svg' }

    case 'object':
      return objectFrom((slot as unknown as { shape?: Record<string, Record<string, unknown>> }).shape)

    case 'array': {
      const count = constraints.minItems ?? 1
      const shape = slot.item?.shape as Record<string, Record<string, unknown>> | undefined

      const items = Array.from({ length: count }, () =>
        shape ? objectFrom(shape) : clamp(constraints.maxCharactersPerItem, 'Item')
      )

      // ChartSplit exige exactamente una serie destacada: el probe debe ejercer la geometría válida,
      // no inventar un payload que ningún autor podría aprobar.
      if (slot.resolver === 'chart-bar-geometry' && shape && items.length > 0) {
        ;(items[items.length - 1] as Record<string, unknown>).highlight = 'sky'
      }

      return items
    }

    case 'paired-array': {
      const count = constraints.minItems ?? 1
      const item = slot.item as unknown as { left?: { shape?: never }; right?: { shape?: never } } | undefined

      return Array.from({ length: count }, () => ({
        left: objectFrom(item?.left?.shape),
        right: objectFrom(item?.right?.shape)
      }))
    }

    default:
      return 'X'
  }
}

/**
 * Sintetiza los slots de un AUTOR para una plantilla completa: omite lo que la plantilla posee
 * (`fixed-*`) — si el probe los sintetizara, estaría probando un contrato que ningún deck real
 * escribe.
 */
export const synthesizeProbeSlots = (contract: TemplateContract): Record<string, unknown> => {
  const slots: Record<string, unknown> = {}

  for (const [slotName, slotContract] of Object.entries(contract.slots)) {
    if (slotContract.type.startsWith('fixed-')) continue

    slots[slotName] = synthesizeSlotValue(slotContract)
  }

  return slots
}
