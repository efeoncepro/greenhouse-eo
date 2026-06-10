// Brand color system proposal (direction D) — full page visual review. Proposal only.
import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'brand-color-system',
  route: '/design-system/mockup/brand-color-system',
  viewport: { width: 1280, height: 900 },
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: { allowLoading: true },
  steps: [
    { kind: 'mark', label: 'color-system-full', fullPage: true, note: 'Propuesta completa: header, a11y, ramps, semánticas, pops, aplicaciones, gobernanza' }
  ]
}
