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
  eyebrow: 'Acceso restringido',
  title: 'Necesitas una llave para esto',
  description:
    'Tu sesión está activa, pero esta vista requiere permisos adicionales. Si esperabas entrar, solicita acceso al administrador.',
  messages: [
    {
      title: 'Necesitas una llave para esto',
      status: 'Sesión activa. Permiso pendiente.',
      detail: 'Esta vista requiere permisos adicionales.',
      recovery: 'Si esperabas entrar, solicita acceso al administrador.'
    },
    {
      title: 'Esta puerta pide permisos',
      status: 'Estás dentro de Greenhouse.',
      detail: 'Esta sección está reservada para otro rol o alcance.',
      recovery: 'Vuelve al inicio o pide acceso.'
    },
    {
      title: 'Tu pase no cubre esta vista',
      status: 'La ruta existe.',
      detail: 'Tu perfil todavía no tiene autorización para abrirla.',
      recovery: 'Si corresponde, el administrador puede habilitarla.'
    },
    {
      title: 'Aquí falta una autorización',
      status: 'Greenhouse protegió esta pantalla.',
      detail: 'La información requiere un permiso específico.',
      recovery: 'Puedes volver atrás o solicitar el permiso correcto.'
    },
    {
      title: 'Zona con acceso controlado',
      status: 'Esta vista necesita una llave adicional.',
      detail: 'El acceso depende de tu rol y alcance.',
      recovery: 'Si venías por trabajo, pide que revisen tu rol.'
    }
  ],
  cta: 'Volver al inicio',
  secondaryCta: 'Volver atrás'
}
