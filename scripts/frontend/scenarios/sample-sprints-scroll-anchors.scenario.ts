import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'sample-sprints-scroll-anchors',
  route: '/agency/sample-sprints/mockup',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 500,
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 8000 },
    { kind: 'mark', label: 'top' },
    { kind: 'scroll', scrollTo: 'bottom' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'bottom' },
    { kind: 'scroll', scrollTo: 'top' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'back-to-top' }
  ]
}
