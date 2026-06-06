/**
 * Microcopy es-CL: notAuthorized (página 401 full-page).
 *
 * Surface genérico para usuario autenticado sin permiso (distinto del rechazo
 * SSO de /auth/access-denied). Tono creativo + funcional (directiva operador):
 * con personalidad pero claro (qué pasó + cómo salir). Tuteo es-CL, sentence
 * case, sin emoji, CTA verbo + objeto. El "401" es el código HTTP y vive en el
 * componente, no acá.
 */

import type { NotAuthorizedCopy } from '../../types'

export const notAuthorized: NotAuthorizedCopy = {
  title: 'Necesitas una llave para esto',
  description: 'Esta sección está fuera de tu alcance por ahora. Si crees que es un error, habla con tu administrador.',
  cta: 'Volver al inicio'
}
