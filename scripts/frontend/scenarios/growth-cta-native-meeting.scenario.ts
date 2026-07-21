import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-cta-native-meeting',
  route: '/design-system/native-meeting-scheduler',
  mutating: true,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  readiness: {
    selector: '[data-capture="growth-cta-meeting-launcher"] .ghc-primary',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    timeout: 15000,
  },
  baseline: {
    surfaceId: 'growth.cta-native-meeting',
    requiredFrameLabels: ['compact-launcher', 'adaptive-task-surface', 'selection-preserved'],
    requiredRegions: ['[data-capture="growth-cta-scheduler-seam"]'],
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'El preview requiere la sesión GVC autenticada.' },
    { kind: 'noErrorBoundary', reason: 'El seam CTA → scheduler no puede degradar a error boundary.' },
    { kind: 'visible', selector: '[data-capture="growth-cta-meeting-launcher"] .ghc-primary', reason: 'El launcher debe permanecer compacto antes de activar.' },
  ],
  quality: {
    accessibility: { enabled: true, includeSelector: ':is([data-capture="growth-cta-scheduler-seam"], dialog.ghc-meeting-surface[open])', failOnViolations: true },
    layout: { enabled: true, includeSelector: ':is([data-capture="growth-cta-scheduler-seam"], dialog.ghc-meeting-surface[open])', minTargetSize: 44, failOnViolations: true },
    runtime: {
      failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: true, failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update'],
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [{
        name: 'open-native-meeting-surface',
        startSelector: '[data-capture="growth-cta-meeting-launcher"] .ghc-primary',
        keys: ['Enter'],
        expectedFocusSelector: '.ghc-meeting-heading',
        expectedVisibleSelector: 'dialog.ghc-meeting-surface[open]',
        requireVisibleFocusRing: true,
      }],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 2800, maxRequests: 100, maxTransferBytes: 25_000_000, maxFcpMs: 6000 },
  },
  steps: [
    { kind: 'mark', label: 'compact-launcher', clipSelector: '[data-capture="growth-cta-scheduler-seam"]', note: 'El CTA conserva dimensiones editoriales y no consulta disponibilidad todavía.' },
    { kind: 'click', selector: '[data-capture="growth-cta-meeting-launcher"] .ghc-primary' },
    { kind: 'wait', selector: 'dialog.ghc-meeting-surface[open] [data-capture="meeting-calendar"]', timeout: 10000 },
    { kind: 'mark', label: 'adaptive-task-surface', clipSelector: 'dialog.ghc-meeting-surface', note: 'Mismo shell: dialog bounded en desktop y full-screen guided en móvil.' },
    { kind: 'click', selector: 'dialog.ghc-meeting-surface button.ghm-calendar-day' },
    { kind: 'click', selector: 'dialog.ghc-meeting-surface .ghm-slot' },
    { kind: 'click', selector: 'dialog.ghc-meeting-surface .ghc-meeting-close' },
    { kind: 'click', selector: '[data-capture="growth-cta-meeting-launcher"] .ghc-primary' },
    { kind: 'wait', selector: 'dialog.ghc-meeting-surface[open] .ghm-slot[aria-pressed="true"]', timeout: 5000 },
    { kind: 'mark', label: 'selection-preserved', clipSelector: 'dialog.ghc-meeting-surface', note: 'Cerrar/reabrir preserva fecha, horario, controller e idempotencia en memoria.' },
  ],
}
