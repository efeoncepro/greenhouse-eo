// TASK-1027 — My Performance rich self-service activity dashboard.
// Captures the runtime MyPerformanceView with a rich fixed payload so the full
// enterprise dashboard is reviewable (desktop + mobile) without needing a
// collaborator that has personal ICO metrics.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1027-my-performance',
  route: '/my/performance/mockup/runtime',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 600,
  readiness: {
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'superficie self-service bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'my-performance',
      fullPage: true,
      note: 'Dashboard self-service: foco, Nexa Insights (safe mentions), KPIs ICO, tendencias, actividad, radar + CSC'
    }
  ]
}
