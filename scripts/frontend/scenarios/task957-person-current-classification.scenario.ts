import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-957 Slice B — Person 360 "Estado vigente" (current work classification).
 * Captures Valentina's profile showing the contractor classification resolved
 * from the active engagement (not from contract_type). Scrolls to the
 * "Datos laborales" section where the `Estado vigente` row renders.
 */
export const scenario: CaptureScenario = {
  name: 'task957-person-current-classification',
  route: '/people/valentina-hoyos',
  viewport: { width: 1440, height: 1100 },
  initialHoldMs: 9000,
  finalHoldMs: 600,
  steps: [
    { kind: 'wait', selector: 'text=Datos laborales', timeout: 14000 },
    { kind: 'mark', label: 'top' },
    { kind: 'scroll', scrollTo: 'bottom' },
    { kind: 'sleep', ms: 1500 },
    { kind: 'scroll', scrollTo: 'top' },
    { kind: 'sleep', ms: 800 },
    { kind: 'mark', label: 'datos-laborales' }
  ]
}
