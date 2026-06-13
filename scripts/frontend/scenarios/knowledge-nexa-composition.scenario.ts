// GAP A (mockup) — Nexa "composición con host": una superficie de Knowledge que entra en modo
// conversacional SIN hacer desaparecer el host (estilo AI Mode / AI Overviews). Verifica el morph
// in-place (View Transitions) + la persistencia del host bajo la respuesta protagonista.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'knowledge-nexa-composition',
  route: '/knowledge/mockup/nexa-composition',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 1024 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 900,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="nexa-composition-page"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'Mockup interno autenticado vía GVC local actor.' },
    { kind: 'noErrorBoundary', reason: 'La captura no debe caer a error boundary.' }
  ],
  quality: {
    allowLoading: true,
    layout: { enabled: true, includeSelector: '[data-capture="nexa-composition-page"]' },
    runtime: { failOnConsoleError: false, failOnPageError: false, failOnHydrationWarning: false, ignoreUrlPatterns: ['/_next/', 'hot-update'] },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="nexa-composition-page"]' }
  },
  steps: [
    {
      kind: 'mark',
      label: 'composition-host',
      fullPage: true,
      note: 'Modo host: composer con Nexa adentro + lista de documentos del corpus (sin respuesta aún).'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'composition-enter-conversational',
        intent: 'El submit transforma la superficie en conversacional: la respuesta se inyecta como protagonista y el host persiste/reflowea debajo (morph View Transitions).',
        action: { kind: 'click', selector: 'button[aria-label="Preguntar"]' },
        frames: [
          { label: 'composition-morph-300ms', atMs: 300, fullPage: true },
          { label: 'composition-conversational-1200ms', atMs: 1200, fullPage: true }
        ]
      }
    },
    { kind: 'sleep', ms: 800 },
    {
      kind: 'mark',
      label: 'composition-conversational-settled',
      fullPage: true,
      note: 'Modo conversacional: respuesta protagonista arriba con citas + el host (documentos) condensado y vivo abajo.'
    }
  ]
}
