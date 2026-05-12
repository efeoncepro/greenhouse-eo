/**
 * TASK-265 — Microcopy es-CL: aria-labels
 *
 * aria-labels comunes para a11y. Audit 2026-05-02 reveló 405 instancias
 * hardcoded — el caso dominante. Cubrimos los más frecuentes; los
 * específicos de dominio quedan inline pero pasan por skill
 * greenhouse-ux-writing.
 *
 * Convención: descripción funcional clara, sin "botón" / "click" en el
 * label (los SR ya lo anuncian por el role).
 */

import type { AriaCopy } from '../../types'

export const aria: AriaCopy = {
  closeDialog: 'Cerrar diálogo',
  closeDrawer: 'Cerrar panel',
  closeMenu: 'Cerrar menú',
  openMenu: 'Abrir menú',
  openSettings: 'Abrir configuración',
  toggleSidebar: 'Alternar barra lateral',
  navigateBack: 'Volver',
  navigateForward: 'Avanzar',
  selectRow: 'Seleccionar fila',
  expandRow: 'Expandir fila',
  collapseRow: 'Contraer fila',
  sortAscending: 'Ordenar ascendente',
  sortDescending: 'Ordenar descendente',
  searchInput: 'Campo de búsqueda',
  filterInput: 'Campo de filtro',
  paginationPrev: 'Página anterior',
  paginationNext: 'Página siguiente',
  paginationFirst: 'Primera página',
  paginationLast: 'Última página',
  previousMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  rowActions: 'Acciones de fila',
  moreActions: 'Más acciones',
  notifications: 'Notificaciones',
  userMenu: 'Menú de usuario',
  language: 'Idioma',
  theme: 'Tema',
  paymentOrderTabs: 'Pestañas de órdenes de pago',
  paymentObligationFilters: 'Filtros de obligaciones',
  breadcrumb: 'Ruta de navegación',
  dismissHelper: 'Ocultar ayuda contextual'
}
