/**
 * Los códigos del validador del plan de deck (TASK-1929). Una regla vive en UN solo lugar: lo que AXIS valida del
 * documento (`resolveSurfaceDocument`) llega con `source: 'axis'` y su código tal cual; aquí están sólo las reglas del
 * catálogo que AXIS no conoce.
 *
 * Reglas del catálogo que NO tienen código propio, porque otra regla ya las cubre:
 * - la alternancia foto ↔ sin foto entre portada y cierre: la valida AXIS (`frame-photo-must-alternate`);
 * - el eslogan en la portada: ninguna portada del catálogo tiene slot de eslogan (`slot-unknown` lo rechaza);
 * - el eslogan dos veces: el eslogan va sólo en el cierre y un deck tiene un cierre (`frame-count`);
 * - el mensaje de cierre y las familias que un documento excluye: los declara `documents` de cada receta
 *   (`recipe-not-for-document`);
 * - el orden de una secuencia: `pairsWith` con `sequence` dice qué láminas van juntas, no en qué orden (medido
 *   2026-09-28: `proposal-cinematic-nexa-lines` lista la portada como secuencia), así que no hay regla de orden.
 */

import type { DeckPlanIssueSeverity } from './types'

export const DECK_PLAN_ISSUE_CODES = {
  'plan-invalid': 'error',
  'template-named-instead-of-recipe': 'error',
  'recipe-unknown': 'error',
  'recipe-not-for-document': 'error',
  'frame-count': 'error',
  'frame-order': 'error',
  'pair-cover-close-mismatch': 'error',
  'next-steps-after-diagnosis': 'error',
  'variant-both-in-deck': 'error',
  'figure-source-missing': 'error',
  'plate-repeated': 'error',
  'slot-unknown': 'error',
  'slot-type-invalid': 'error',
  'slot-required-missing': 'error',
  'slot-over-max-chars': 'error',
  'recipe-without-template': 'warning',
  'section-split-corner-adjacent': 'warning',
  'rhythm-paper-run': 'warning'
} as const satisfies Record<string, DeckPlanIssueSeverity>

export type DeckPlanIssueCode = keyof typeof DECK_PLAN_ISSUE_CODES

/**
 * Códigos del catálogo que AXIS también podría emitir para la MISMA lámina, con el código de AXIS equivalente. Si AXIS
 * ya lo emitió, el del catálogo no se agrega: una regla, una voz.
 */
export const AXIS_EQUIVALENT: Partial<Record<DeckPlanIssueCode, readonly string[]>> = {
  'recipe-not-for-document': ['use-not-for-recipe'],
  'frame-order': ['brochure-cover-first', 'brochure-close-last']
}
