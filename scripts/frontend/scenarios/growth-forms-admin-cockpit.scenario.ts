import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1232 — GVC del cockpit interno Growth Forms (/admin/growth/forms).
 *
 * Captura: command center default, summary, tabla operativa, sidecar inspector,
 * composer y mobile 390px. La tabla mantiene scroll horizontal contenido; la
 * página no debe generar overflow horizontal.
 */
export const scenario: CaptureScenario = {
  name: 'growth-forms-admin-cockpit',
  route: '/admin/growth/forms',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 600,
  assertions: [
    { kind: 'noErrorBoundary' },
    { kind: 'noLoginRedirect' },
    { kind: 'visible', selector: '[data-capture="growth-forms-shell"]' },
    { kind: 'visible', selector: '[data-capture="growth-forms-command-center"]' },
  ],
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  steps: [
    { kind: 'wait', selector: '[data-capture="growth-forms-shell"]', timeout: 15000 },
    { kind: 'wait', selector: '[data-capture="growth-forms-command-center"]', timeout: 15000 },
    { kind: 'mark', label: 'growth-forms-default', note: 'Cockpit default: breadcrumbs, header, KPI strip, table and inspector sidecar' },
    { kind: 'mark', label: 'growth-forms-summary', clipSelector: '[data-capture="growth-forms-summary"]', note: 'Six operational KPI tiles' },
    { kind: 'mark', label: 'growth-forms-table', clipSelector: '[data-capture="growth-forms-command-center"]', note: 'Dense forms table with governed status and signals' },
    { kind: 'mark', label: 'growth-forms-inspector', clipSelector: '[data-capture="growth-forms-inspector"]', note: 'Adaptive sidecar inspector with readiness, destinations, surfaces and submissions' },
    { kind: 'click', selector: '[data-capture="growth-forms-new-draft-sidecar"]', timeout: 8000 },
    { kind: 'sleep', ms: 450 },
    { kind: 'mark', label: 'growth-forms-composer', clipSelector: '[data-capture="growth-forms-sidecar-panel"]', note: 'Composer variant with starter governed form payload' },
  ],
}
