// TASK-1022 — Collaborator Viewer del Workforce Contracting Studio (/my/contracts).
// Vista del colaborador: estado honesto, bilingüe, solo lectura, acciones de firma locked.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'my-contracting-collaborator',
  route: '/my/contracts',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1000,
  finalHoldMs: 300,
  readiness: {
    selector: '[data-capture="my-contracting-documents"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 12000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="my-contracting-documents"]'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'runtime vive bajo (dashboard) autenticado' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe capturar un error boundary' },
    { kind: 'visible', selector: 'text=Mis contratos', reason: 'título del colaborador' }
  ],
  steps: [{ kind: 'mark', label: 'my-contracts', note: 'Mis contratos: estado honesto (empty zero-state cuando no hay documentos)' }]
}
