import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'contractor-admin-workbench',
  route: '/hr/contractors/mockup',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 600,
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 8000 },
    { kind: 'mark', label: 'initial-queue', note: 'Primer fold del workbench HR contractor' },
    { kind: 'scroll', selector: '[data-capture="contractor-timeline"]', scrollBlock: 'center' },
    { kind: 'sleep', ms: 300 },
    {
      kind: 'mark',
      label: 'timeline-section',
      clipSelector: '[data-capture="contractor-timeline"]',
      note: 'Timeline scrolleado por selector: conectores deben ser lineas finas, no bloques'
    }
  ]
}
