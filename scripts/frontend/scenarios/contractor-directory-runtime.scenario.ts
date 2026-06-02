import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'contractor-directory-runtime',
  route: '/hr/contractors',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 2000,
  finalHoldMs: 600,
  readiness: {
    selector: 'h4',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    timeout: 12000
  },
  assertions: [{ kind: 'noLoginRedirect', reason: 'workbench HR autenticado' }],
  steps: [
    { kind: 'mark', label: 'workbench-cola', note: 'Default: cola de revisión (puede estar vacía)' },
    { kind: 'click', selector: '[data-capture-tab="directory"]' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'directorio-con-valentina', note: 'Directorio: todos los engagements (Valentina activa visible)' }
  ]
}
