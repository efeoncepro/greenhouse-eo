// Lab interno del Adaptive Card density contract (TASK-1115). Captura el specimen canónico del Design
// System: el mismo card (MetricSummaryCard + MetricTrendCard) a tres anchos (full/condensed/peek) con
// `density='auto'`, verificando la condensación honesta (versión real más chica, nunca clip; el value nunca
// desaparece). Capacidad hermana del Composition Shell — el seam es la container query.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-card-density',
  route: '/design-system/card-density',
  mutating: false,
  safeForCapture: true,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 900,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="card-density-lab"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 15000
  },
  baseline: {
    surfaceId: 'design-system.card-density',
    maxDiffRatio: 0.02
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Lab interno autenticado vía GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' }
  ],
  quality: {
    allowLoading: true,
    layout: { enabled: true, includeSelector: '[data-capture="card-density-lab"]' },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="card-density-lab"]' }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="card-density-lab"]', timeout: 12000 },
    { kind: 'scroll', selector: '[data-capture="card-density-lab"]', scrollBlock: 'start' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'card-density-full-condensed-peek',
      clipSelector: '[data-capture="card-density-lab"]',
      note: 'MetricSummaryCard + MetricTrendCard a full/condensed/peek. Condensación honesta: el value nunca desaparece, nunca clip.'
    },
    // The Seam (La Costura) — las dos capacidades jugando dentro de un shell real.
    { kind: 'scroll', selector: '[data-capture="the-seam-section"]', scrollBlock: 'start' },
    { kind: 'sleep', ms: 400 },
    { kind: 'click', selector: '[data-capture="the-seam-control-single"]' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'the-seam-single',
      clipSelector: '[data-capture="the-seam-section"]',
      note: 'The Seam · single: el primary es ancho → las cards (density=auto) están en modo full.'
    },
    { kind: 'click', selector: '[data-capture="the-seam-control-split"]' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'the-seam-split',
      clipSelector: '[data-capture="the-seam-section"]',
      note: 'The Seam · split: el primary se estrecha (aparece el aside) → las MISMAS cards condensan solas. La costura es el ancho.'
    }
  ]
}
