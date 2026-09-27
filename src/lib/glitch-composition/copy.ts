/**
 * Copy fijo de las piezas de Glitch que viaja en el plan (no en las plantillas). Español neutro; sólo Glitch.
 */

import type { GLITCH_SECTIONS } from './manifest'

/** Sección de la noticia como se pinta («MARKETING + IA»: el «+ IA» lo pone la plantilla). */
export const GLITCH_SECTION_LABEL: Record<(typeof GLITCH_SECTIONS)[number], string> = {
  marketing: 'Marketing',
  creatividad: 'Creatividad',
  tecnologia: 'Tecnología'
}

/** Nota de la suscripción en la contraportada. */
export const GLITCH_BACK_NOTE = 'Cada lunes en tu correo, gratis.<br>El enlace, en el primer comentario.'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** «30 sep» desde una fecha ISO (sin zona horaria: la fecha es dato, no instante). */
export const glitchShortDate = (iso: string): string => {
  const [, month, day] = iso.split('-').map(Number)

  return `${day} ${MONTHS[month - 1]}`
}

/** Parte un remate en «todo menos la última palabra» y «la última palabra» (la manzana se pega a la última). */
export const splitLastWord = (text: string): { lead: string; last: string } => {
  const trimmed = text.trim()
  const i = trimmed.lastIndexOf(' ')

  return i < 0 ? { lead: '', last: trimmed } : { lead: trimmed.slice(0, i), last: trimmed.slice(i + 1) }
}
