import type { CaptureScenario } from '../lib/scenario'

// TASK-950 Slice 3 POST — Visual audit canonical para `/nexa/insights`.
//
// Captura el estado ready del list page (subject = agent EFEONCE_ADMIN con
// route_group internal). Empty-positive y degraded requieren ad-hoc state
// preparation que no aplica en staging baseline — se capturan iterando manual
// con stubs si el caso lo amerita.

export const scenario: CaptureScenario = {
  name: 'nexa-insights-list-page',
  route: '/nexa/insights',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 2000,
  steps: [
    { kind: 'wait', selector: 'h1', timeout: 8000 },
    { kind: 'mark', label: 'initial-ready' },
    { kind: 'sleep', ms: 400 },
    { kind: 'hover', selector: 'article[aria-label*="Observación"]' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'card-hover' },
    { kind: 'scroll', scrollY: 400 },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'scrolled' }
  ]
}
