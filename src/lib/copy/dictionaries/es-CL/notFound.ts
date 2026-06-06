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
  eyebrow: 'Página no encontrada',
  title: 'Esta página se nos perdió',
  description: 'No encontramos lo que buscas. El enlace puede estar roto o la página cambió de lugar.',
  messages: [
    {
      title: 'Esta página se nos perdió',
      description: 'No encontramos lo que buscas. El enlace puede estar roto o la página cambió de lugar.'
    },
    {
      title: 'Este enlace ya no vive aquí',
      description: 'La ruta no responde con una página disponible. Vuelve al inicio o prueba volver atrás.'
    },
    {
      title: 'No encontramos esta ruta',
      description: 'Puede que el enlace esté incompleto, haya expirado o la página se haya movido.'
    },
    {
      title: 'La página cambió de lugar',
      description: 'No pudimos abrir este destino. Puedes volver al inicio para retomar el camino.'
    },
    {
      title: 'Este camino no tiene salida',
      description: 'La dirección no apunta a una página activa. Vuelve atrás o regresa al inicio.'
    }
  ],
  cta: 'Volver al inicio',
  secondaryCta: 'Volver atrás'
}
