// Internal NexaProvenanceTrace Lab verification (TASK-1103) — grounding canónico de Nexa.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-nexa-provenance',
  route: '/design-system/nexa-provenance',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="nexa-provenance-lab"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true,
    layout: {
      enabled: true,
      includeSelector: '[data-capture="nexa-provenance-lab"]',
      // El label sr-only del paso activo (variant expandable) es visuallyHidden por diseño.
      ignoreSelectors: ['[data-gvc-ignore-layout="true"]']
    },
    runtime: {
      failOnConsoleError: false,
      failOnPageError: false,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="nexa-provenance-lab"]'
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'nexa-provenance-lab-fullpage',
      fullPage: true,
      note: 'Lab de NexaProvenanceTrace: variants inline / expandable / panel + kinds.'
    },
    {
      kind: 'mark',
      label: 'nexa-provenance-inline',
      clipSelector: '[data-capture="nexa-provenance-trace-inline"]',
      note: 'Variant inline: trust cue compacto (success/warning/info) — asienta confianza sin robar protagonismo.'
    },
    {
      kind: 'mark',
      label: 'nexa-provenance-expandable',
      clipSelector: '[data-capture="nexa-provenance-trace-expandable"]',
      note: 'Variant expandable: razonamiento progresivo (done/active/pending) + shimmer del footprint.'
    },
    {
      kind: 'mark',
      label: 'nexa-provenance-panel',
      clipSelector: '[data-capture="nexa-provenance-trace"][data-variant="panel"]',
      note: 'Variant panel: evidencia bajo demanda (compone NexaEvidencePanel read-only).'
    }
  ]
}
