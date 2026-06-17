import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1153 — GVC del cockpit de Roadmap (/roadmap).
 *
 * Captura: vista default (header + summary + filtros + board de 7 lanes),
 * inspector abierto sobre una card, y la variante mobile 390px. Verifica que NO
 * hay error boundary, NO hay redirect a login (acceso interno) y que la página
 * no desborda horizontalmente (el scroll vive dentro del board).
 */
export const scenario: CaptureScenario = {
  name: 'roadmap-cockpit',
  route: '/roadmap',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1600,
  finalHoldMs: 500,
  assertions: [
    { kind: 'noErrorBoundary' },
    { kind: 'noLoginRedirect' },
    { kind: 'visible', selector: '[data-capture="roadmap-shell"]' },
    { kind: 'visible', selector: '[data-capture="roadmap-board"]' }
  ],
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  steps: [
    { kind: 'wait', selector: '[data-capture="roadmap-shell"]', timeout: 12000 },
    { kind: 'wait', selector: '[data-capture="roadmap-board"]', timeout: 12000 },
    { kind: 'mark', label: 'roadmap-default', note: 'Cockpit default above-the-fold: header, summary, filtros y board de 7 lanes' },
    { kind: 'mark', label: 'roadmap-summary', clipSelector: '[data-capture="roadmap-summary"]', note: '7 KPI tiles del backlog' },
    { kind: 'mark', label: 'roadmap-filters', clipSelector: '[data-capture="roadmap-filters"]', note: 'Toolbar de filtros: pills por kind + búsqueda + selects' },
    { kind: 'scroll', selector: '[data-capture="roadmap-board"]', scrollBlock: 'center', scrollInline: 'nearest' },
    { kind: 'mark', label: 'roadmap-board-cards', clipSelector: '[data-capture="roadmap-board"]', note: 'Cards operativas del backlog con ID, estado, dominio y affordance de apertura' },
    { kind: 'click', selector: '[aria-label="Abrir detalle de TASK-025"]', timeout: 8000 },
    { kind: 'wait', selector: '[data-capture="roadmap-inspector"]', timeout: 8000 },
    { kind: 'sleep', ms: 350 },
    { kind: 'mark', label: 'roadmap-inspector', note: 'Inspector abierto sobre un work item seleccionado' },
    { kind: 'click', selector: '[data-capture="roadmap-open-task"]', timeout: 8000 },
    { kind: 'wait', selector: '[data-capture="roadmap-task-drawer"]', timeout: 8000 },
    { kind: 'wait', selector: '[data-capture="roadmap-task-markdown"]', timeout: 12000 },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'roadmap-task-drawer', clipSelector: '[data-capture="roadmap-task-drawer"]', note: 'Drawer "Abrir task" con el Markdown renderizado (headings, listas, code, tablas)' }
  ]
}
