// TASK-1020 Slice 7 — captura honesta del panel "Delegaciones temporales".
// La delegación genérica de aprobaciones quedó NO disponible (D1): el panel ya no
// ofrece crear delegaciones; muestra un Alert informativo + lista (solo lectura) +
// revocar para limpiar las vigentes. Clip sobre la región de delegaciones.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'hr-hierarchy-delegations',
  route: '/hr/hierarchy',
  viewport: { width: 1280, height: 1100 },
  initialHoldMs: 2500,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['[data-testid="login-card"]'],
    postReadyDelayMs: 600,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la vista vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    {
      kind: 'scroll',
      selector: '[aria-labelledby="hr-hierarchy-delegations-title"]',
      scrollBlock: 'center'
    },
    { kind: 'sleep', ms: 600 },
    {
      kind: 'mark',
      label: 'delegaciones-no-disponible',
      clipSelector: '[aria-labelledby="hr-hierarchy-delegations-title"]',
      note: 'D1 — panel de delegaciones honesto: Alert "no disponible" + lista solo lectura/revocar, sin afordancia de crear'
    }
  ]
}
