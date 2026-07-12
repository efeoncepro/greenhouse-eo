import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { SlideSpec, SlotContract, TemplateContract } from '../contracts'
import { fillSlide } from '../render'

const DIR = path.join(process.cwd(), 'docs/architecture/tender-deck-composer-prototypes')

/**
 * Este test existe porque "la plantilla tiene su `slots.json`" **NO** significa "el composer la puede
 * llenar".
 *
 * Bug class real (2026-07-12, componiendo el deck de SKY): el catálogo se declaraba **25/25 con
 * contrato ✅** y la doc decía "el composer las puede llenar todas". Al componer una oferta real —la
 * primera que usó más de 6 plantillas— **7 de 25 reventaron**: HTML sin los `data-slot-field` que su
 * propio contrato declara, selectores que no matchean el DOM, y tipos de slot que el filler ni
 * conoce. Nadie lo sabía porque **nadie las había ejercitado**.
 *
 * El fail-closed del filler hizo su trabajo (abortó en vez de imprimir el copy del prototipo), pero
 * lo hizo **en la cara del operador, a tres días de entregar una licitación**. Este test mueve ese
 * descubrimiento al CI: si una plantilla no es componible, se sabe acá, no en el bid.
 *
 * Cómo funciona: sintetiza un payload MÍNIMO VÁLIDO desde el propio contrato (respetando enums,
 * `minItems` y `maxCharacters`) e intenta llenar la plantilla. No juzga estética — sólo responde
 * **"¿se puede llenar sin mentir?"**.
 */

/** Genera el valor sintético más chico que el contrato acepta. */
const synthesize = (slot: SlotContract): unknown => {
  const constraints = slot.constraints ?? {}
  const clamp = (max: number | undefined, text: string) => (max ? text.slice(0, Math.min(text.length, max)) : text)

  const fieldValue = (field: Record<string, unknown>, fallback: string): unknown => {
    // `values` viene en DOS formas según el contrato: array (`['lead','strategy']` en los campos de
    // item) u objeto clave→etiqueta (`{combined: 'Propuesta…'}` en los slots enum). Confundirlas
    // devuelve el ÍNDICE en vez del valor — y el resolver revienta con un `"0"` que no conoce.
    if (Array.isArray(field.values)) return field.values[0]
    if (field.values && typeof field.values === 'object') return Object.keys(field.values as object)[0]
    if (Array.isArray(field.enum)) return field.enum[0]
    if (field.format === 'NN%') return '10%'
    // `isProposed` es booleano-como-string: el resolver sólo conoce 'true' | 'false'.
    if (field.resolver === 'pricing-option-tone') return false

    // Los resolvers de GEOMETRÍA derivan del dato (es lo que impide que una lámina mienta), así que
    // el probe tiene que darles un NÚMERO válido — no el texto de relleno.
    const GEOMETRY_RESOLVERS = [
      'timeline-phase-span',
      'timeline-milestone-position',
      'chart-bar-geometry',
      'case-study-before-after-bar-scale'
    ]

    if (typeof field.resolver === 'string' && GEOMETRY_RESOLVERS.includes(field.resolver)) return '1'

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
      return Object.keys(slot.values ?? {})[0]

    case 'asset':
    case 'asset-ref':
    case 'fixed-asset':
      return { src: 'assets/url-lum.svg' }

    case 'object':
      return objectFrom((slot as unknown as { shape?: Record<string, Record<string, unknown>> }).shape)

    case 'array': {
      const count = constraints.minItems ?? 1
      const shape = slot.item?.shape as Record<string, Record<string, unknown>> | undefined

      return Array.from({ length: count }, () =>
        shape ? objectFrom(shape) : clamp(constraints.maxCharactersPerItem, 'Item')
      )
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

interface RegistryEntry {
  name: string
  prototype: string
  slotsRef: string
  contentTypes: string[]
}

const registry: { templates: RegistryEntry[] } = JSON.parse(
  await fs.readFile(path.join(DIR, 'registry.json'), 'utf8')
)

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

/**
 * Plantillas que HOY no son componibles, con su causa. **No es una excusa: es el inventario.**
 *
 * La lista es un contrato de dos vías — el test falla si:
 *   (a) una plantilla sana se rompe (regresión), **o**
 *   (b) una de éstas se arregla y nadie la saca de acá (la lista mentiría).
 *
 * Se vacía en **TASK-1394**. Mientras tenga entradas, el catálogo **NO** es "25/25 componible".
 */
const KNOWN_BROKEN: Record<string, string> = {
  BackCoverFull: 'declara tipos `fixed-social-set` / `fixed-contact-set` que no existen en SlotType',
  ChartSplit: 'el `.refline` es el primer hijo del slot → el filler lo clona como fila (falta `data-slot-items`)',
  ComparisonSplit: 'HTML sin ningún `data-slot-field`; `paired-array` no está implementado en el filler',
  DualListSplit: 'HTML sin `data-slot-field` en los items (`lead` / `body`)',
  QuoteSplit: 'los selectores del contrato no matchean el DOM; `sourceRef` apunta al selector de `mode`',
  CaseStudySplit: 'falta el ancla `data-slot-field="evidenceRef"` en el HTML'
}

describe('componibilidad del catálogo', () => {
  it('el inventario de plantillas rotas está declarado (no se esconde)', () => {
    // Si esto sorprende a alguien: el catálogo declaraba "25/25 con contrato ✅" y la doc decía que
    // el composer podía llenarlas todas. No era cierto — se descubrió componiendo la primera oferta
    // real (SKY, 2026-07-12), a tres días de entregar.
    expect(Object.keys(KNOWN_BROKEN).length).toBeLessThanOrEqual(6)
  })

  it.each(registry.templates.map(t => [t.name, t] as const))(
    '%s — se puede llenar sin quedarse con el copy del prototipo',
    async (_name, entry) => {
      const contract: TemplateContract = JSON.parse(await fs.readFile(path.join(DIR, entry.slotsRef), 'utf8'))

      const slots: Record<string, unknown> = {}

      for (const [slotName, slotContract] of Object.entries(contract.slots)) {
        slots[slotName] = synthesize(slotContract)
      }

      const page = await browser.newPage({ viewport: contract.viewport })

      try {
        const slide = {
          slideId: 'composability-probe',
          contentType: entry.contentTypes[0],
          template: entry.name,
          slots
        } as unknown as SlideSpec

        const fill = fillSlide(page, path.join(DIR, entry.prototype), slide, contract)
        const reason = KNOWN_BROKEN[entry.name]

        if (reason === undefined) {
          // Si la plantilla no es componible, `fillSlide` ABORTA — y ese throw es el fallo del test.
          await expect(fill).resolves.not.toThrow()

          return
        }

        // Rota conocida: se exige que SIGA rota. Si alguien la arregla, este test falla y lo obliga a
        // sacarla de `KNOWN_BROKEN` — así la lista nunca miente sobre el estado del catálogo.
        await expect(fill, `${entry.name} ya es componible: sácala de KNOWN_BROKEN (${reason})`).rejects.toThrow()
      } finally {
        await page.close()
      }
    },
    60_000
  )
})
