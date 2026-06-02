import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'contractor-closure-drawer-mockup',
  route: '/hr/contractors/closure/mockup',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1600,
  finalHoldMs: 500,
  readiness: {
    selector: 'h4',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    timeout: 12000
  },
  assertions: [{ kind: 'noLoginRedirect', reason: 'mockup route is authenticated (dashboard group)' }],
  steps: [
    // Default state = with_blockers (richest surface: alert + blockers + ack + advisory + form + actions).
    { kind: 'mark', label: 'closure-with-blockers', clipSelector: '.MuiDrawer-paper', note: 'Drawer cierre — con bloqueadores' },
    // No-blockers state.
    { kind: 'click', selector: '[data-capture-toggle="no_blockers"]' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'closure-no-blockers', clipSelector: '.MuiDrawer-paper', note: 'Drawer cierre — sin bloqueadores' },
    // Closed state.
    { kind: 'click', selector: '[data-capture-toggle="closed"]' },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'closure-closed', clipSelector: '.MuiDrawer-paper', note: 'Drawer cierre — cerrado' }
  ]
}
