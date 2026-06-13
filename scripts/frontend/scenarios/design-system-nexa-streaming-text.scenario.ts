// Internal NexaStreamingText Lab verification (TASK-1105) — revelado progresivo canónico de Nexa.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-nexa-streaming-text',
  route: '/design-system/nexa-streaming-text',
  // El specimen `stream` consume un generador fake local (sin DB); seguro para capturar.
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1400,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="nexa-streaming-text-lab"]',
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
      includeSelector: '[data-capture="nexa-streaming-text-lab"]',
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
      includeSelector: '[data-capture="nexa-streaming-text-lab"]'
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'nexa-streaming-text-lab-fullpage',
      fullPage: true,
      note: 'Lab de NexaStreamingText: value (revelando 60% / asentado) + stream + modos.'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'replay-stream',
        intent: 'Reproducir el stream para ver los chunks llegando con caret (modo stream del provider).',
        action: { kind: 'click', selector: '[data-capture="nexa-streaming-text-replay"]' },
        frames: [
          {
            label: 'nexa-streaming-text-stream-arriving',
            atMs: 500,
            clipSelector: '[data-capture="nexa-streaming-text-stream-specimen"]',
            note: 'Mid-stream: los primeros chunks revelados + caret final.'
          },
          {
            label: 'nexa-streaming-text-stream-settled',
            atMs: 2600,
            clipSelector: '[data-capture="nexa-streaming-text-stream-specimen"]',
            note: 'Stream asentado: texto completo, sin caret (aria-busy off).'
          }
        ]
      }
    }
  ]
}
