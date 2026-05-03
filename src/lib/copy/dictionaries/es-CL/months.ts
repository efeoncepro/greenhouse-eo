/**
 * TASK-265 — Microcopy es-CL: months
 *
 * Reemplaza arrays de meses duplicados en 26 archivos del codebase
 * (audit 2026-05-02). Tuples-tipados de exactamente 12 entries.
 *
 * Convención abreviada: 3 letras, primera mayúscula, sin punto final.
 */

import type { MonthsCopy } from '../../types'

export const months: MonthsCopy = {
  short: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const,
  long: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ] as const
}
