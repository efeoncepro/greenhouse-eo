/**
 * Microcopy es-CL: notFound (página 404 full-page).
 *
 * Tono calmado (skill greenhouse-ux-writing §6 — error permanente): primera
 * persona plural, sentence case, sin emoji, CTA verbo + objeto. El "404" es
 * el código HTTP y vive en el componente, no acá.
 */

import type { NotFoundCopy } from '../../types'

export const notFound: NotFoundCopy = {
  title: 'Página no encontrada',
  description: 'No encontramos la página que buscas. Es posible que el enlace esté roto o que la página se haya movido.',
  cta: 'Volver al inicio',
  secondaryCta: 'Volver atrás'
}
