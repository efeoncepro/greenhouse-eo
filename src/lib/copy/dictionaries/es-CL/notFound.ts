/**
 * Microcopy es-CL: notFound (página 404 full-page).
 *
 * Tono creativo + funcional (directiva operador): con personalidad pero sin
 * perder claridad (qué pasó + cómo salir). Tuteo es-CL, sentence case, sin
 * emoji, CTA verbo + objeto. El "404" es el código HTTP y vive en el
 * componente, no acá.
 */

import type { NotFoundCopy } from '../../types'

export const notFound: NotFoundCopy = {
  title: 'Esta página se nos perdió',
  description: 'No encontramos lo que buscas. El enlace puede estar roto o la página cambió de lugar.',
  cta: 'Volver al inicio',
  secondaryCta: 'Volver atrás'
}
