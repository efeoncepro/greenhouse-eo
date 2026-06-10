// Internal Breadcrumbs Lab verification — GreenhouseBreadcrumbs primitive.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-breadcrumbs',
  route: '/admin/design-system/breadcrumbs',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selectors: ['[data-capture="breadcrumbs-default-specimen"]'],
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'breadcrumbs-lab',
      fullPage: true,
      note: 'Laboratorio interno dedicado a GreenhouseBreadcrumbs, variants default/compact, kinds semánticos y reglas de uso'
    }
  ]
}
