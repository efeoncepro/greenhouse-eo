import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'contractor-payments-readiness',
  route: '/finance/contractor-payments',
  viewport: { width: 1440, height: 1200 },
  initialHoldMs: 1800,
  finalHoldMs: 600,
  readiness: {
    selector: 'text=Preparación (readiness)',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'finance contractor payments is an authenticated route' },
    { kind: 'noErrorBoundary', reason: 'readiness panel should not render an app error' }
  ],
  steps: [
    { kind: 'wait', selector: 'text=Preparación (readiness)', timeout: 12000 },
    { kind: 'wait', selector: 'text=Listo para enviar a Finanzas. Sin bloqueos.', timeout: 12000 },
    { kind: 'scroll', selector: 'text=Preparación (readiness)', scrollBlock: 'center' },
    {
      kind: 'mark',
      label: 'readiness-resolved-fullpage',
      fullPage: true,
      note: 'Finance contractor payable readiness resolves the active payment profile before send-to-finance.'
    }
  ]
}
