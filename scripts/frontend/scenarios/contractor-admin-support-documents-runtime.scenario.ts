import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'contractor-admin-support-documents-runtime',
  route: '/hr/contractors',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 600,
  readiness: {
    selector: 'h4',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'runtime contractor workbench is an authenticated HR route' },
    { kind: 'noErrorBoundary', reason: 'runtime contractor workbench should not capture app error' }
  ],
  steps: [
    { kind: 'click', selector: 'button:has-text("Abrir")' },
    { kind: 'wait', selector: 'button:has-text("Revisar envío")', timeout: 8000 },
    { kind: 'click', selector: 'button:has-text("Revisar envío")' },
    { kind: 'wait', selector: '[data-capture="admin-review-decision-drawer"]', timeout: 8000 },
    { kind: 'wait', selector: '[data-capture="contractor-support-documents-admin"]', timeout: 8000 },
    { kind: 'wait', selector: 'text=BOLETA MAYO - EFEONCE.pdf', timeout: 8000 },
    {
      kind: 'mark',
      label: 'admin-support-documents-panel',
      clipSelector: '[data-capture="contractor-support-documents-admin"]',
      note: 'Panel admin/HR de boletas y evidencia del caso contractor'
    },
    {
      kind: 'click',
      selector: '[data-capture="contractor-support-document-row"]:has-text("BOLETA MAYO - EFEONCE.pdf") button:has-text("Abrir visor")'
    },
    { kind: 'wait', selector: '[data-capture="contractor-support-document-viewer-content"] canvas', timeout: 12000 },
    {
      kind: 'mark',
      label: 'admin-support-document-viewer',
      note: 'Visor admin inline usando el endpoint privado de assets'
    },
    {
      kind: 'mark',
      label: 'admin-review-drawer-with-support-documents',
      fullPage: true,
      note: 'Drawer de revisión admin con soportes visibles antes de aprobar/disputar/rechazar'
    }
  ]
}
