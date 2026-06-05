// TASK-1016 — Product Design mockup for the Organization Operations Workbench.
// Mockup only: no writes, no API calls, production /agency/organizations remains unchanged.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'organization-list-enterprise-mockup',
  route: '/agency/organizations/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="organization-list-enterprise-mockup"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' },
    { kind: 'visible', selector: '[data-capture="organization-list-enterprise-mockup"]', reason: 'el workbench debe renderizar la superficie operacional' },
    { kind: 'visible', selector: 'text=Abrir Workspace', reason: 'el rail contextual debe ofrecer la accion principal' }
  ],
  steps: [
    { kind: 'mark', label: 'first-fold', note: 'Workbench list-detail: header, signal strip, filters, organization list and context rail' },
    { kind: 'click', selector: 'button[aria-label="Vista matriz"]' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'matrix-mode', note: 'Secondary matrix mode for bulk comparison, not the default experience' },
    { kind: 'click', selector: 'button[aria-label="Vista workbench"]' },
    { kind: 'click', selector: 'button[aria-label="Sin Space: 3 organizaciones"]' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'filtered-risk', note: 'Operational filter keeps risk-focused accounts visible' }
  ]
}
