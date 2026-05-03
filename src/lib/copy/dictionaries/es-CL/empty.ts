/**
 * TASK-265 — Microcopy es-CL: empty states
 *
 * Empty states canónicos siguiendo skill greenhouse-ux-writing §7
 * (firstUse, noResults, error). Audit 2026-05-02 reveló 31 instancias
 * inline.
 */

import type { EmptyCopy } from '../../types'

export const empty: EmptyCopy = {
  noData: 'Sin datos',
  noResults: 'Sin resultados',
  noItems: 'No hay elementos',
  emptyList: 'La lista está vacía',
  searchEmpty: 'No encontramos resultados para tu búsqueda',
  filterEmpty: 'No hay resultados con estos filtros',
  firstUseTitle: 'Aún no hay nada por aquí',
  firstUseHint: 'Empieza creando tu primer registro',
  errorLoadingTitle: 'No pudimos cargar la información',
  errorLoadingHint: 'Reintenta o contacta a soporte si el problema persiste'
}
