import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'contractor-dispute-response',
  route: '/my/contractor/mockup?scenario=disputed&drawer=dispute',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 600,
  steps: [
    { kind: 'wait', selector: '[data-capture="contractor-dispute-response"]', timeout: 8000 },
    {
      kind: 'mark',
      label: 'dispute-response',
      note: 'Drawer contractor para responder observacion con evidencia corregida'
    },
    {
      kind: 'mark',
      label: 'dispute-response-fullpage',
      fullPage: true,
      note: 'Captura larga para validar recovery flow y CTA final'
    }
  ]
}
