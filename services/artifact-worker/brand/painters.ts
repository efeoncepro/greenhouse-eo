/**
 * Pintores de la selección colaborativa y del CTA de «La órbita» (TASK-1921; antes vivían en el CLI de TASK-1919). El
 * motor no puede importarlos (son del adaptador de Greenhouse sobre `efeonce.collaboration-selection`), así que el
 * catálogo los recibe por `createCatalog(options)`. Viven en el worker (la composition root): `src/**` no puede
 * cargar catálogos (ISSUE-177). Los usan el consumer de marca, `pnpm brand:compose` y el gate visual: una sola
 * implementación.
 */

import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'

import type { ArtifactCatalog } from '@/lib/artifact-composer'
import { createGlitchCarouselCatalog, createGlitchOverlaysCatalog, createGlitchStillsCatalog } from '@/lib/artifact-composer/catalogs/glitch'
import { createCatalog as createGraphicLineDeck } from '@/lib/artifact-composer/catalogs/graphic-line-deck'
import { createCatalog as createGraphicLineOverlays } from '@/lib/artifact-composer/catalogs/graphic-line-overlays'
import type { GraphicLineCtaPainter } from '@/lib/artifact-composer/catalogs/graphic-line-shared/cta-hook'
import type { GraphicLineSelectionPainter } from '@/lib/artifact-composer/catalogs/graphic-line-shared/selection-hook'
import { createCatalog as createGraphicLineStills } from '@/lib/artifact-composer/catalogs/graphic-line-stills'
import { renderCollaborationSelection } from '@/lib/creative/axis-advertising.mjs'

/** La pintura canónica de la selección: mismo contrato y mismo adaptador que las piezas con CTA. */
export const greenhouseSelectionPainter: GraphicLineSelectionPainter = request => {
  const manifest = resolveCollaborationSelectionIntent({
    targetId: 'answer',
    targetKind: request.targetKind,
    variant: request.variant ?? 'eight-handles',
    padding: request.padding ?? 'standard',
    overlay: request.overlay ?? (request.targetKind === 'text' ? 'subtle' : 'none'),
    cursors: [
      {
        id: 'collaborator',
        kind: 'collaborator',
        targetId: 'answer',
        anchor: request.anchor,
        action: 'select',
        label: request.label,
        participantKind: request.participantKind
      },
      // Otros colaboradores sobre el mismo objetivo (la fuerza híbrida): cada uno con su ancla y su acción.
      ...(request.extraCursors ?? []).map((cursor, index) => ({
        id: `collaborator-${index + 2}`,
        kind: 'collaborator',
        targetId: 'answer',
        anchor: cursor.anchor,
        action: cursor.action,
        label: cursor.label,
        participantKind: cursor.participantKind
      }))
    ]
  } as never)

  // El color de un participante sólo cuando la receta lo midió; el resto sigue el orden de la paleta del renderer.
  const participantColors: Record<string, string> = {}

  if (request.color) participantColors.collaborator = request.color
  ;(request.extraCursors ?? []).forEach((cursor, index) => {
    if (cursor.color) participantColors[`collaborator-${index + 2}`] = cursor.color
  })

  const painted = renderCollaborationSelection({
    manifest,
    targetBounds: request.bounds,
    canvas: request.canvas,
    measureLabel: (label: string, size: number) => label.length * size * 0.62,
    presentation: { collaboratorScale: request.scale, participantColors }
  }) as { underlay: string; overlay: string; evidence: { withinCanvas: boolean } }

  return { underlay: painted.underlay, overlay: painted.overlay, withinCanvas: painted.evidence.withinCanvas }
}

/** El CTA canónico: grupo con corchetes abiertos y el cursor local en `end-center`. */
export const greenhouseCtaPainter: GraphicLineCtaPainter = request => {
  const frame = request.frame ?? { variant: 'open-brackets', targetKind: 'group', padding: 'compact' }

  const manifest = resolveCollaborationSelectionIntent({
    targetId: 'cta',
    targetKind: frame.targetKind,
    variant: frame.variant,
    padding: frame.padding,
    overlay: 'none',
    cursors: [{ id: 'local', kind: 'local', targetId: 'cta', anchor: 'end-center', action: 'select' }]
  } as never)

  const painted = renderCollaborationSelection({
    manifest,
    targetBounds: request.bounds,
    canvas: request.canvas,
    measureLabel: (label: string, size: number) => label.length * size * 0.62,
    presentation: { localCursorScale: request.cursorScale }
  }) as unknown as {
    overlay: string
    bounds: { top: number; height: number; bottom?: number }
    evidence: { withinCanvas: boolean; cursorEvidence: { bounds: { top: number; height: number; bottom?: number } }[] }
  }

  const bottomOf = (b: { top: number; height: number; bottom?: number }) => b.bottom ?? b.top + b.height
  const bottom = Math.max(bottomOf(painted.bounds), ...painted.evidence.cursorEvidence.map(c => bottomOf(c.bounds)))

  return { overlay: painted.overlay, bottom, withinCanvas: painted.evidence.withinCanvas }
}

/** Los seis catálogos de marca que el render gobernado conoce, por nombre (los de La órbita reciben los pintores). */
export const BRAND_RENDER_CATALOG_FACTORIES = {
  'graphic-line-deck': () => createGraphicLineDeck({ selectionPainter: greenhouseSelectionPainter, ctaPainter: greenhouseCtaPainter }),
  'graphic-line-stills': () => createGraphicLineStills({ selectionPainter: greenhouseSelectionPainter, ctaPainter: greenhouseCtaPainter }),
  'graphic-line-overlays': () => createGraphicLineOverlays({ selectionPainter: greenhouseSelectionPainter, ctaPainter: greenhouseCtaPainter }),
  'glitch-carousel': () => createGlitchCarouselCatalog(),
  'glitch-stills': () => createGlitchStillsCatalog(),
  'glitch-overlays': () => createGlitchOverlaysCatalog()
} as const satisfies Record<string, () => ArtifactCatalog>

export type BrandRenderCatalogName = keyof typeof BRAND_RENDER_CATALOG_FACTORIES

export const isBrandRenderCatalogName = (name: string): name is BrandRenderCatalogName => Object.hasOwn(BRAND_RENDER_CATALOG_FACTORIES, name)
