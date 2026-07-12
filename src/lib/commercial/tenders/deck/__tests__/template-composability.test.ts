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

const registry: { templates: RegistryEntry[] } = JSON.parse(await fs.readFile(path.join(DIR, 'registry.json'), 'utf8'))

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
  ChartSplit:
    'el callout `.gap` sólo existe en la 3ª fila del prototipo y no tiene resolver de geometría: de dónde sale su posición es una DECISIÓN DE DISEÑO (¿contra qué se mide la brecha?), no un fix mecánico. TASK-1394.'
}

describe('componibilidad del catálogo', () => {
  it('el inventario de plantillas rotas está declarado (no se esconde)', () => {
    // Si esto sorprende a alguien: el catálogo declaraba "25/25 con contrato ✅" y la doc decía que
    // el composer podía llenarlas todas. No era cierto — se descubrió componiendo la primera oferta
    // real (SKY, 2026-07-12), a tres días de entregar.
    expect(Object.keys(KNOWN_BROKEN).length).toBeLessThanOrEqual(1)
  })

  it.each(registry.templates.map(t => [t.name, t] as const))(
    '%s — se puede llenar sin quedarse con el copy del prototipo',
    async (_name, entry) => {
      const contract: TemplateContract = JSON.parse(await fs.readFile(path.join(DIR, entry.slotsRef), 'utf8'))

      const slots: Record<string, unknown> = {}

      for (const [slotName, slotContract] of Object.entries(contract.slots)) {
        // El probe se pone en los zapatos del AUTOR: no sintetiza lo que la plantilla posee
        // (`fixed-*`) ni la evidencia que nunca se pinta. Si lo hiciera, estaría probando un contrato
        // que ningún deck real escribe.
        if (slotContract.type.startsWith('fixed-')) continue

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

          // La firma usa `mix-blend-mode: luminosity`, y **un blend se mezcla con el backdrop de su
          // contexto de apilamiento**. En un split, no basta que viva dentro de `.slide`: si queda
          // como hermana del panel oscuro, su backdrop efectivo sigue siendo el canvas claro y se
          // pinta gris/plana. Debe vivir DENTRO del panel que pinta el degradado.
          //
          // Bug real (deck SKY): 10 de las 25 la tenían fuera. Se detectó MIRANDO el PDF —en unas
          // láminas la firma se fundía y en otras no—. No era del renderer ni del formato: era DÓNDE
          // vivía la burbuja en el DOM. Este guard lo vuelve imposible.
          const signaturePrimitive = await page.evaluate(() => {
            const bubble = document.querySelector('.deck-url-bubble')

            if (!bubble) return null

            return {
              placement: bubble.closest('[data-template]') ? 'inside' : 'outside',
              backdrop: bubble.closest('[data-url-bubble-backdrop]') ? 'owner' : 'missing',
              blend: window.getComputedStyle(bubble).mixBlendMode
            }
          })

          // HighlightWave es la excepción de composición: su campo claro no admite una firma.
          if (signaturePrimitive === null) {
            expect(entry.name, `${entry.name}: toda plantilla salvo HighlightWave usa URL Bubble.`).toBe(
              'HighlightWave'
            )

return
          }

          expect(
            signaturePrimitive.placement,
            `${entry.name}: URL Bubble está FUERA del canvas de plantilla → mix-blend-mode se queda sin backdrop y se pinta plana. Muévela dentro de [data-template].`
          ).not.toBe('outside')
          expect(
            signaturePrimitive.blend,
            `${entry.name}: URL Bubble debe conservar mix-blend-mode: luminosity; no cambies el color del SVG para compensar un blend ausente.`
          ).toBe('luminosity')
          expect(
            signaturePrimitive.backdrop,
            `${entry.name}: URL Bubble no declara un dueño de backdrop. Conserva SVG gris + opacity .72 + luminosity y anida el nodo en [data-url-bubble-backdrop] que realmente pinta su fondo.`
          ).toBe('owner')

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
