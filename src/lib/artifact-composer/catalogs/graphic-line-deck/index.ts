/**
 * Catálogo `graphic-line-deck` — láminas 16:9 de «La órbita» para decks de marca propia Efeonce (TASK-1919).
 *
 * Existe porque la línea gráfica se compone por SUPERFICIE (contrato `efeonce.surface-composition` de AXIS)
 * y el deck es una de ellas. No vive en `deck-axis`: ése es el catálogo de las ofertas a comité, con su
 * molde, sus presupuestos de slot y el baseline del deck SKY; mezclar ahí el fondo Efeonce, la voz con
 * esfera y las fotos de cine degradaría lo que ese catálogo protege.
 *
 * Sólo tiene plantilla una receta APROBADA por el operador (hoy: proposal-cinematic, proposal-service,
 * section-classic, section-split, content-measure, triptych y method-staircase, además del marco de TASK-1927).
 * `proposal-cinematic` tiene una plantilla por composición (`service`, `hero`, `lines`; contrato 0.1.2): la de
 * `service` no cambia. El contentType es `deck.<receta>[.<layout>]` y lo
 * deriva `src/lib/brand-surfaces` desde el manifest de AXIS: un autor nunca elige plantilla.
 *
 * La selección colaborativa necesita medir el DOM ya lleno, así que es un layout hook; su pintura la
 * INYECTA el consumidor (el adaptador de Greenhouse), porque el motor no importa paquetes.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArtifactCatalog, CatalogLayoutHook } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import { graphicLineResolvers } from '../graphic-line-shared/resolvers'
import type { GraphicLineCatalogOptions } from '../graphic-line-shared/options'
import { makeCtaHook } from '../graphic-line-shared/cta-hook'
import { makeSelectionHook } from '../graphic-line-shared/selection-hook'

export const graphicLineDeckCatalogDir = path.dirname(fileURLToPath(import.meta.url))

/** Plantillas que pueden llevar selección colaborativa sobre la respuesta. */
const TEMPLATES_WITH_SELECTION = [
  'ProposalCinematic',
  'ProposalCinematicHero',
  'ProposalCinematicLines',
  // La propuesta sobria: la selección toma la primera tarjeta (por dónde se empieza).
  'ProposalService',
  // La fuerza híbrida: dos cursores sobre la respuesta, o dos selecciones medidas en la foto (TASK-1928).
  'MethodHybridWorkforce',
  'MethodHybridWorkforceScene',
  // Portadas de propuesta: la selección toma el logo del cliente.
  'CoverProposalOrbit',
  'CoverProposalDawn',
  // El testimonio: la selección toma la frase del cliente (la respuesta).
  'DecisionTestimonial'
] as const

/**
 * La contraportada de brochure sin foto lleva el cursor del LECTOR sobre la respuesta (corchetes abiertos): es el
 * mismo CTA canónico de las piezas con llamada a la acción, sin descriptor. El anillo del puntaje lo lleva sobre su
 * botón, con el descriptor bajo el cursor (su escala y su aire llegan en el slot `cta`, medidos por AXIS).
 */
const TEMPLATES_WITH_READER_CURSOR = ['CloseBrochure', 'MethodScoreRing', 'DecisionNextSteps', 'ContentPricingLive'] as const

/**
 * En la escalera del método (sus dos composiciones) la selección toma un NIVEL (`selection.level`, 1 = el de abajo),
 * no la respuesta. El nivel es un item del array `levels`, así que la plantilla no puede marcarlo de antemano: este
 * hook marca la fila `[data-gl-level-row]` de ese nivel como objetivo y delega en el hook canónico de la selección, que la mide y la pinta.
 */
const levelSelectionHook =
  (selectionHook: CatalogLayoutHook): CatalogLayoutHook =>
  async (page, slide, deckPlan) => {
    const selection = slide.slots.selection as { level?: unknown; item?: unknown } | null | undefined

    if (selection) {
      // Un nivel de la escalera (`level`) o un ítem de una lista (`item`: el plan recomendado de la cotización).
      const byItem = selection.item !== undefined
      const index = Number(byItem ? selection.item : selection.level) - 1

      const marked = await page.evaluate(
        ({ index, selector }) => {
          const row = document.querySelectorAll(selector)[index]

          if (!row) return false

          row.setAttribute('data-gl-selection-target', '')

          return true
        },
        { index, selector: byItem ? '[data-gl-select-item]' : '[data-gl-level-row]' }
      )

      if (!marked) throw new Error(`[${slide.slideId}] la selección pide el ${byItem ? 'ítem' : 'nivel'} ${index + 1} y la lámina no lo tiene.`)
    }

    await selectionHook(page, slide, deckPlan)
  }

export const createCatalog = (options: GraphicLineCatalogOptions = {}): ArtifactCatalog => {
  const selectionHook = makeSelectionHook(options.selectionPainter)
  const layoutHooks: Record<string, CatalogLayoutHook> = {}

  for (const template of TEMPLATES_WITH_SELECTION) layoutHooks[template] = selectionHook

  for (const template of TEMPLATES_WITH_READER_CURSOR) {
    layoutHooks[template] = makeCtaHook(options.ctaPainter, { cursorScale: 1, descriptorGapOfWidth: 0 })
  }

  layoutHooks.MethodStaircase = levelSelectionHook(selectionHook)
  layoutHooks.MethodStaircaseFlat = levelSelectionHook(selectionHook)
  layoutHooks.ContentPricing = levelSelectionHook(selectionHook)
  layoutHooks.ContentPricingStage = levelSelectionHook(selectionHook)

  // La familia Prueba (TASK-1928): la selección toma un ítem de la lámina (`selection.item`): la cifra, el logo, la fila
  // del riesgo o la barra que se elige.
  for (const template of ['ContentClients', 'ContentPartners', 'DecisionRisk', 'DecisionCase', 'DecisionChart', 'DecisionWhyUs']) {
    layoutHooks[template] = levelSelectionHook(selectionHook)
  }

  return {
    name: 'graphic-line-deck',
    ownerOrgId: 'efeonce',
    templatesDir: graphicLineDeckCatalogDir,
    outputTarget: 'pdf-merged',
    resolvers: graphicLineResolvers(),
    layoutHooks,
    brand: {
      packName: 'axis',
      compiledFiles: ['deck-fonts.css', 'graphic-line-tokens.css'],
      fontsManifestPath: path.join(axisPackDir, 'fonts.json'),
      packExtensions: ['graphic-line']
    }
  }
}

/** El catálogo sin painter: sirve para resolver planes y para láminas sin selección. */
export const graphicLineDeckCatalog = createCatalog()
