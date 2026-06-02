import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'contractor-admin-review-decision',
  route: '/hr/contractors/mockup?scenario=disputed&drawer=review&decision=dispute',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 600,
  steps: [
    { kind: 'wait', selector: '[data-capture="admin-review-decision-drawer"]', timeout: 8000 },
    {
      kind: 'mark',
      label: 'review-decision-drawer',
      note: 'Drawer admin para aprobar, disputar o rechazar con checklist y motivo visible'
    },
    {
      kind: 'mark',
      label: 'review-decision-fullpage',
      fullPage: true,
      note: 'Captura larga para validar decision drawer completo y acciones'
    }
  ]
}
