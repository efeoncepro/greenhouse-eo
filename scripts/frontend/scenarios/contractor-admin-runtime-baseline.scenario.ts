import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'contractor-admin-runtime-baseline',
  route: '/hr/contractors',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 600,
  baseline: {
    surfaceId: 'hr.contractors',
    baselineName: 'contractor-admin-workbench-mockup',
    approvedMockupCaptureDir: '.captures/<approved-contractor-admin-workbench>'
  },
  readiness: {
    selector: 'h4',
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    timeout: 10000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'runtime contractor workbench is an authenticated HR route' },
    { kind: 'noErrorBoundary', reason: 'runtime contractor workbench should not capture app error' }
  ],
  steps: [
    { kind: 'mark', label: 'runtime-first-fold', note: 'Runtime final comparable contra mockup aprobado TASK-796' },
    { kind: 'scroll', scrollTo: 'bottom' },
    { kind: 'mark', label: 'runtime-full-page', fullPage: true, note: 'Auditoria full-page runtime para baseline mockup -> runtime' }
  ]
}
