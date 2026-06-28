// TASK-1248 — AI Visibility client report (Split Workbench, concepto C) GVC verification.
// Targets the mockup harness (real workbench fed by the canonical SAMPLE_CLIENT_REPORT fixture) so the
// capture is deterministic and data-independent — the real route /growth/ai-visibility/report is
// client-scoped and renders the empty state without a per-org grader run. Clipped marks keep the long
// workbench legible without the fixed dashboard sidebar. Verifies the masterDetail composition (navigator
// split on desktop, detail drawer on mobile) in a real enterprise surface, desktop + 390px.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-ai-visibility-client-report',
  route: '/aeo/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 3500,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="client-ai-visibility-report"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  // En desktop el clip de `composition-shell` muestra el split completo (navigator + detail canvas rico).
  // En compact el detail vive en drawer, así que el mismo clip muestra el navigator + trigger (sin fallo).
  steps: [
    { kind: 'mark', label: '01-summary', clipSelector: '[data-capture="client-ai-visibility-overview"]' },
    { kind: 'scroll', selector: '[data-capture="composition-shell"]', scrollBlock: 'start' },
    { kind: 'mark', label: '02-workbench', clipSelector: '[data-capture="composition-shell"]' }
  ]
}

export default scenario
