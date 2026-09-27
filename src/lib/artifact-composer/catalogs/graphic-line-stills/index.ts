/**
 * Catálogo `graphic-line-stills` — piezas fijas de «La órbita» en web (hero de escritorio y teléfono), DOOH
 * (caminero) y motion (storyboard y el último cuadro del loop, que es su estático de respaldo). Un PNG por
 * pieza; cada plantilla declara su propio lienzo en su `*.slots.json` (TASK-1919).
 *
 * Sólo tiene plantilla una receta APROBADA. El video no se compone aquí: la animación la produce el
 * pipeline de motion (`orbit:video`) y este catálogo entrega los cuadros fijos de la pieza.
 *
 * La selección colaborativa y el CTA (grupo con corchetes y cursor local) necesitan medir el DOM ya lleno: son
 * layout hooks y su pintura la INYECTA el consumidor (el adaptador de Greenhouse), porque el motor no importa
 * paquetes. La hoja del cuadro a cuadro tiene su propio hook (copia la toma a sus cuadros y selecciona dentro
 * de cada uno).
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArtifactCatalog, CatalogLayoutHook } from '../../catalog'
import { axisPackDir } from '../../brand-packs/axis'
import type { ResolverRegistry } from '../../resolver-contract'
import { makeCtaHook } from '../graphic-line-shared/cta-hook'
import type { GraphicLineCatalogOptions } from '../graphic-line-shared/options'
import { graphicLineResolvers } from '../graphic-line-shared/resolvers'
import { makeSelectionHook } from '../graphic-line-shared/selection-hook'
import { makeStoryboardHook } from './storyboard-hooks'

export const graphicLineStillsCatalogDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * El CTA de la web en cada plantilla: escala del cursor local y aire entre el cursor y el descriptor (fracción del
 * ancho). Espejo de `efeonceGraphicLine.surfaces.web.cta` de @efeoncepro/axis-tokens —el catálogo no importa
 * paquetes—; `src/lib/brand-surfaces/__tests__/stills-recipes.test.ts` falla si se separan.
 *   - escritorio: `desktop.localCursorScale` (1,1) y `desktop.descriptor.belowCursorPx` (22) sobre 1440;
 *   - teléfono: `phone.localCursorScaleOfWidth` × ancho y `phone.descriptor.belowCursorOfWidth` (0,04).
 */
export const STILLS_CTA_OPTIONS: Record<string, { cursorScale: number; descriptorGapOfWidth: number }> = {
  HeroLens: { cursorScale: 1.1, descriptorGapOfWidth: 22 / 1440 },
  HeroBleed: { cursorScale: 1.1, descriptorGapOfWidth: 22 / 1440 },
  HeroUniformTablet: { cursorScale: 1.1, descriptorGapOfWidth: 22 / 1440 },
  HeroMobileNative360: { cursorScale: 360 / 380, descriptorGapOfWidth: 0.04 },
  HeroMobileNative390: { cursorScale: 390 / 380, descriptorGapOfWidth: 0.04 },
  HeroMobileNative430: { cursorScale: 430 / 380, descriptorGapOfWidth: 0.04 }
}

/** Plantillas con selección colaborativa sobre la respuesta y sin CTA. */
const SELECTION_ONLY = ['LoopLensReveal'] as const

/** Las escenas de un cuadro de la hoja: cada una enciende sus capas (`gl-sb-kind-*` en el molde). */
export const STORYBOARD_KINDS = ['orbit', 'lens', 'overshoot', 'voice', 'reveal', 'endcard'] as const

const STORYBOARD_KIND_CLASSES = STORYBOARD_KINDS.map(kind => `gl-sb-kind-${kind}`)

const stillsResolvers = (): ResolverRegistry => ({
  ...graphicLineResolvers(),

  // La escena de un cuadro de la hoja: una clase en el cuadro. Una escena desconocida falla cerrada.
  'gl-sb-kind': {
    known: [...STORYBOARD_KINDS],
    build: value =>
      (STORYBOARD_KINDS as readonly string[]).includes(value)
        ? [{ selector: ':self', toneClass: `gl-sb-kind-${value}`, toneGroup: STORYBOARD_KIND_CLASSES }]
        : null
  }
})

export const createCatalog = (options: GraphicLineCatalogOptions = {}): ArtifactCatalog => {
  const selectionHook = makeSelectionHook(options.selectionPainter)
  const layoutHooks: Record<string, CatalogLayoutHook> = {}

  for (const [template, ctaOptions] of Object.entries(STILLS_CTA_OPTIONS)) {
    const ctaHook = makeCtaHook(options.ctaPainter, ctaOptions)

    // Primero la selección (mide la respuesta) y después el CTA (mide el botón y baja el descriptor).
    layoutHooks[template] = async (page, slide, deckPlan) => {
      await selectionHook(page, slide, deckPlan)
      await ctaHook(page, slide, deckPlan)
    }
  }

  for (const template of SELECTION_ONLY) layoutHooks[template] = selectionHook

  layoutHooks.MotionStoryboard = makeStoryboardHook(options.selectionPainter)

  return {
    name: 'graphic-line-stills',
    ownerOrgId: 'efeonce',
    templatesDir: graphicLineStillsCatalogDir,
    outputTarget: 'png-set',
    resolvers: stillsResolvers(),
    layoutHooks,
    brand: {
      packName: 'axis',
      compiledFiles: ['deck-fonts.css', 'graphic-line-tokens.css'],
      fontsManifestPath: path.join(axisPackDir, 'fonts.json'),
      packExtensions: ['graphic-line']
    }
  }
}

/** El catálogo sin painters: sirve para resolver planes y para piezas sin selección ni CTA. */
export const graphicLineStillsCatalog = createCatalog()
