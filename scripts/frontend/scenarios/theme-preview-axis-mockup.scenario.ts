// Live-theme verification — AXIS semantic palette on real MUI components (TASK-1034).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'theme-preview-axis-mockup',
  route: '/admin/theme-preview/mockup',
  viewport: { width: 1280, height: 900 },
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [{ kind: 'mark', label: 'theme-preview-full', fullPage: true, note: 'Alerts/Buttons/Chips reales con palette AXIS' }]
}
