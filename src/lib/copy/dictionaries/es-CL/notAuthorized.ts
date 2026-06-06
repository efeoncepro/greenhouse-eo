/**
 * Microcopy es-CL: notAuthorized (página 401 full-page).
 *
 * Surface genérico para usuario autenticado sin permiso (distinto del rechazo
 * SSO de /auth/access-denied). Tono calmado (skill greenhouse-ux-writing §6 —
 * error permanente): primera persona, sentence case, sin emoji, CTA verbo +
 * objeto. El "401" es el código HTTP y vive en el componente, no acá.
 */

import type { NotAuthorizedCopy } from '../../types'

export const notAuthorized: NotAuthorizedCopy = {
  title: 'No tienes autorización',
  description: 'No tienes permiso para acceder a esta página. Si crees que es un error, contacta a tu administrador.',
  cta: 'Volver al inicio'
}
