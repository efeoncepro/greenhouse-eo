/**
 * Validadores semánticos de los catálogos de Marketing con Manzanitas (TASK-1939). Deterministas: reciben el plan y el
 * snapshot del registry, nunca consultan base, red ni reloj.
 *
 * Los dos catálogos comparten una carpeta y un `registry.json`: `manzanitas.catalog-membership@1` impide componer una
 * plantilla en el catálogo que no le toca, `manzanitas.piece-approval@1` hace que una plantilla sin aprobar falle
 * cerrada y `manzanitas.single-line@1` exige una sola línea del tema en todo el plan (un solo selector).
 */

import type { CatalogSemanticValidator, CatalogSemanticViolation } from '../../catalog'
import type { DeckRegistry } from '../../selector'

export type ManzanitasCatalogKey = 'carousel' | 'stills'

/** Campos de Marketing con Manzanitas en cada entrada del registry (el motor los ignora; los leen estos validadores). */
export interface ManzanitasRegistryFields {
  approval: 'approved' | 'proposed'
  catalogs: ManzanitasCatalogKey[]
  /** Ids de pieza en `manzanitasRegister.pieces` (AXIS) que pinta la plantilla. */
  pieces: string[]
}

type ManzanitasTemplate = DeckRegistry['templates'][number] & Partial<ManzanitasRegistryFields>

export const manzanitasTemplateOf = (registry: DeckRegistry, name: string): ManzanitasTemplate | undefined =>
  (registry.templates as ManzanitasTemplate[]).find((t) => t.name === name)

export const catalogMembershipValidator = (catalog: ManzanitasCatalogKey): CatalogSemanticValidator => ({
  name: 'manzanitas.catalog-membership',
  version: '1.0.0',
  validate: (plan, { registry }) =>
    plan.slides.flatMap((slide): CatalogSemanticViolation[] =>
      manzanitasTemplateOf(registry, slide.template)?.catalogs?.includes(catalog)
        ? []
        : [{ code: 'manzanitas.catalog-membership', slideId: slide.slideId, message: `La plantilla ${slide.template} no pertenece al catálogo manzanitas-${catalog}.` }]
    )
})

export const pieceApprovalValidator: CatalogSemanticValidator = {
  name: 'manzanitas.piece-approval',
  version: '1.0.0',
  validate: (plan, { registry }) =>
    plan.slides.flatMap((slide): CatalogSemanticViolation[] =>
      manzanitasTemplateOf(registry, slide.template)?.approval === 'approved'
        ? []
        : [{ code: 'manzanitas.piece-approval', slideId: slide.slideId, message: `La plantilla ${slide.template} no está aprobada: no se compone como canon.` }]
    )
}

export const singleLineValidator: CatalogSemanticValidator = {
  name: 'manzanitas.single-line',
  version: '1.0.0',
  validate: (plan) => {
    const lines = new Set(plan.slides.map((slide) => (slide.slots.theme as { line?: string } | undefined)?.line))

    return lines.size <= 1
      ? []
      : [{ code: 'manzanitas.single-line', message: `Una pieza lleva una sola línea del tema: el plan trae ${[...lines].join(', ')}.` }]
  }
}
