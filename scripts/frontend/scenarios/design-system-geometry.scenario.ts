// Internal Geometry Lab verification — spacing and radius token foundations.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-geometry',
  route: '/design-system/geometry',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
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
      label: 'geometry-lab',
      fullPage: true,
      note: 'Spacing/radius lab: AXIS Gap & Padding, Border Radius, round y extension Greenhouse xxl/display'
    }
  ]
}
