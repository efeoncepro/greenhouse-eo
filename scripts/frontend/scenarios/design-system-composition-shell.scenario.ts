// Lab interno del Composition Shell (TASK-1114). Captura el specimen canónico del Design System: el
// substrato de coreografía de layout recorriendo sus composiciones (single → leadPlusContext → split) con
// el morph in-place (View Transitions). Specimen de registry de la capacidad TRANSVERSAL (no de un dominio).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-composition-shell',
  route: '/design-system/composition-shell',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1000,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="composition-shell-lab"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  // TASK-1119 Slice 2 — baseline durable committeado: regresión visual del specimen del substrato en cada
  // cambio futuro. Degrada honesto a `baseline_stale` si falta el home durable. El morph live (View
  // Transitions) se enmascara: el diff fija el estado asentado de cada composición, no el frame intermedio.
  baseline: {
    surfaceId: 'design-system.composition-shell',
    maxDiffRatio: 0.02,
    maskSelectors: ['[data-capture="composition-shell-telemetry-chip"]']
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Lab interno autenticado vía GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' }
  ],
  quality: {
    allowLoading: true,
    layout: { enabled: true, includeSelector: '[data-capture="composition-shell-lab"]' },
    runtime: { failOnConsoleError: false, failOnPageError: false, failOnHydrationWarning: false, ignoreUrlPatterns: ['/_next/', 'hot-update'] },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="composition-shell-lab"]' }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="composition-shell-lab"]', timeout: 12000 },
    { kind: 'scroll', selector: '[data-capture="composition-shell-lab"]', scrollBlock: 'start' },
    { kind: 'sleep', ms: 600 },
    {
      kind: 'mark',
      label: 'composition-shell-single',
      clipSelector: '[data-capture="composition-shell-lab"]',
      note: 'Composición single: solo primary (dashboard estándar). Default.'
    },
    { kind: 'click', selector: '[data-capture="composition-shell-control-leadPlusContext"]' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'composition-shell-leadPlusContext',
      clipSelector: '[data-capture="composition-shell-lab"]',
      note: 'Composición leadPlusContext (AI Overviews): lead lidera arriba, primary condensa debajo (morph in-place).'
    },
    { kind: 'click', selector: '[data-capture="composition-shell-control-split"]' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'composition-shell-split',
      clipSelector: '[data-capture="composition-shell-lab"]',
      note: 'Composición split (list-detail): primary + aside lado a lado en expanded; stack en compact.'
    }
  ]
}
