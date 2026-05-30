import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'offboarding-fullpage-capture',
  route: '/hr/offboarding/mockup',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 500,
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 8000 },
    { kind: 'mark', label: 'first-fold' },
    { kind: 'mark', label: 'full-page', fullPage: true, note: 'Captura full-page para pantallas largas' }
  ]
}
