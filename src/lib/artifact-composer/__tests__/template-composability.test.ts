import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '../contracts'
import { fillSlide } from '../render'
import { synthesizeSlotValue } from '../synthesize'

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
 *
 * El sintetizador vive en `../synthesize` porque el gate visual (`pnpm composer:visual-gate`,
 * TASK-1393 Slice 0) renderiza las 25 con EL MISMO payload sintético: si el probe del test y el del
 * baseline divergieran, el gate compararía láminas distintas y mentiría.
 */
const synthesize = synthesizeSlotValue

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
 * Está vacía desde **TASK-1394**: el catálogo sólo puede declararse "25/25 componible" cuando cada
 * plantilla llena su contrato real. El caso condicional se conserva para que una futura rotura pueda
 * declararse temporalmente y el guard obligue a retirarla cuando se arregle.
 */
const KNOWN_BROKEN: Record<string, string> = {}

describe('componibilidad del catálogo', () => {
  it('el inventario de plantillas rotas está declarado (no se esconde)', () => {
    expect(Object.keys(KNOWN_BROKEN)).toHaveLength(0)
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
