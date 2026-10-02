/**
 * Validadores semánticos transversales de los catálogos de Glitch (TASK-1923). Deterministas: reciben el plan y el
 * snapshot del registry, nunca consultan base, red ni reloj.
 *
 * Los tres catálogos comparten una carpeta y un `registry.json`, así que el motor resolvería cualquier plantilla en
 * cualquiera de ellos: `glitch.catalog-membership@1` lo impide con el campo `catalogs` del registry, y
 * `glitch.piece-approval@1` hace que una pieza en PROPUESTA falle cerrada aunque un plan la pida a mano (el mapper
 * aplica la misma regla antes, con `piece-not-approved`).
 */

import type { CatalogSemanticValidator, CatalogSemanticViolation } from '../../catalog'
import type { DeckRegistry } from '../../selector'

export type GlitchCatalogKey = 'carousel' | 'stills' | 'overlays'

/** Campos de datos de Glitch en cada entrada del registry (el motor los ignora; los leen estos validadores). */
export interface GlitchRegistryFields {
  approval: 'approved' | 'proposed'
  catalogs: GlitchCatalogKey[]
  sphere: 'apple' | 'lens' | 'none'
  surfaceTone: 'dark' | 'light'
  /** Id de la pieza en `glitchLine.pieces` (AXIS), o `null` si la pieza aún no tiene estado en el token. */
  piece: string | null
}

type GlitchTemplate = DeckRegistry['templates'][number] & Partial<GlitchRegistryFields>

export const glitchTemplateOf = (registry: DeckRegistry, name: string): GlitchTemplate | undefined =>
  (registry.templates as GlitchTemplate[]).find((t) => t.name === name)

export const catalogMembershipValidator = (catalog: GlitchCatalogKey): CatalogSemanticValidator => ({
  name: 'glitch.catalog-membership',
  version: '1.0.0',
  validate: (plan, { registry }) =>
    plan.slides.flatMap((slide): CatalogSemanticViolation[] => {
      const template = glitchTemplateOf(registry, slide.template)

      return template?.catalogs?.includes(catalog)
        ? []
        : [
            {
              code: 'glitch.catalog-membership',
              slideId: slide.slideId,
              message: `La plantilla ${slide.template} no pertenece al catálogo glitch-${catalog}.`
            }
          ]
    })
})

export const pieceApprovalValidator: CatalogSemanticValidator = {
  name: 'glitch.piece-approval',
  version: '1.0.0',
  validate: (plan, { registry }) =>
    plan.slides.flatMap((slide): CatalogSemanticViolation[] =>
      glitchTemplateOf(registry, slide.template)?.approval === 'approved'
        ? []
        : [
            {
              code: 'glitch.piece-approval',
              slideId: slide.slideId,
              message: `La plantilla ${slide.template} está en PROPUESTA: no se compone como canon hasta que el operador la apruebe.`
            }
          ]
    )
}
