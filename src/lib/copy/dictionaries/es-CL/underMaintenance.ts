/**
 * Microcopy es-CL: underMaintenance (página "En mantenimiento" full-page).
 *
 * Tono cálido + tranquilizador (greenhouse-ux-writing §6: la mantención es un
 * estado temporal, no un error del usuario). Tuteo es-CL, sentence case, sin
 * emoji, CTA verbo + objeto. Varias variantes se eligen una vez al entrar para
 * dar personalidad sin perder claridad (qué pasó + cómo recuperar).
 */

import type { UnderMaintenanceCopy } from '../../types'

export const underMaintenance: UnderMaintenanceCopy = {
  eyebrow: 'Mantenimiento',
  title: 'Estamos en mantenimiento',
  description: 'Estamos haciendo mejoras en Greenhouse. Volvemos en un momento — gracias por tu paciencia.',
  messages: [
    {
      title: 'Estamos en mantenimiento',
      description: 'Estamos haciendo mejoras en Greenhouse. Volvemos en un momento — gracias por tu paciencia.'
    },
    {
      title: 'Volvemos enseguida',
      description: 'Estamos afinando algunos detalles. Reintenta en unos minutos o vuelve al inicio.'
    },
    {
      title: 'Greenhouse está en una pausa breve',
      description: 'Hicimos una pausa para dejar todo mejor. Pronto vas a poder seguir donde lo dejaste.'
    },
    {
      title: 'Trabajando en mejoras',
      description: 'Esta sección está en mantenimiento por unos minutos. Reintenta o vuelve al inicio.'
    },
    {
      title: 'Estamos puliendo Greenhouse',
      description: 'Una mantención rápida para dejar todo funcionando mejor. Vuelve en unos minutos.'
    }
  ],
  cta: 'Volver al inicio',
  secondaryCta: 'Reintentar'
}
