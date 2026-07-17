// TASK-1276 — AEO Operator View · variante COMPACT (390): cockpit apilado + detalle con el canvas en
// drawer temporal "Ver detalle" (CompositionShell masterDetail) + control de estado dentro del drawer.
// Scenario hermano de `growth-aeo-operator` (desktop): el flujo compact necesita abrir el drawer, paso
// que en desktop no existe (el canvas está inline). Diseño aprobado: mockup Claude Design (vista 390).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-aeo-operator-compact',
  route: '/growth/aeo',
  viewport: { width: 390, height: 844 },
  viewports: [{ name: 'mobile', device: 'iPhone 13' }],
  initialHoldMs: 6000,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="aeo-operator-cockpit"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 20000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta interna autenticada (viewCode gestion.growth_aeo)' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    { kind: 'mark', label: '01-cockpit', clipSelector: '[data-capture="aeo-operator-cockpit"]' },

    // Detalle por-cliente (primera fila AEO).
    { kind: 'sleep', ms: 2000 },
    { kind: 'click', selector: '[data-capture="aeo-operator-cockpit"] tbody tr' },
    { kind: 'wait', selector: '[data-capture="aeo-operator-detail"]', timeout: 60000 },
    { kind: 'sleep', ms: 1500 },
    { kind: 'mark', label: '02-detail-band' },

    // El canvas del detalle vive en drawer en compact: abrir "Ver detalle" y capturar el drawer con
    // el control de estado del Plan AEO adentro.
    { kind: 'scroll', selector: '[data-capture="composition-shell-primary-drawer-trigger"]', scrollBlock: 'center' },
    { kind: 'sleep', ms: 500 },
    { kind: 'click', selector: '[data-capture="composition-shell-primary-drawer-trigger"]' },
    { kind: 'wait', selector: '[data-capture="aeo-plan-status"]', timeout: 15000 },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '03-detail-drawer-plan-status' }
  ]
}

export default scenario
