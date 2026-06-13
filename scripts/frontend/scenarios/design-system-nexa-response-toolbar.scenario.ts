// Internal NexaResponseToolbar Lab verification (TASK-1104) — chrome de confianza canónico de Nexa.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-nexa-response-toolbar',
  route: '/design-system/nexa-response-toolbar',
  // El voto del specimen es estado local del Lab (no toca DB); seguro para capturar.
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="nexa-response-toolbar-lab"]',
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
      includeSelector: '[data-capture="nexa-response-toolbar-lab"]',
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
      includeSelector: '[data-capture="nexa-response-toolbar-lab"]'
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'nexa-response-toolbar-lab-fullpage',
      fullPage: true,
      note: 'Lab de NexaResponseToolbar: variants embedded / floating / docked + kinds.'
    },
    {
      kind: 'mark',
      label: 'nexa-response-toolbar-embedded',
      clipSelector: '[data-capture="nexa-response-toolbar"][data-variant="embedded"]',
      note: 'Variant embedded: prompt + feedback a la izquierda, copiar/compartir/regenerar a la derecha, hairline superior. Default del NexaAnswersCanvas.'
    },
    {
      kind: 'mark',
      label: 'nexa-response-toolbar-floating',
      clipSelector: '[data-capture="nexa-response-toolbar"][data-variant="floating"]',
      note: 'Variant floating: solo-ícono, alineada a la derecha, sin prompt — para timelines densos.'
    },
    {
      kind: 'mark',
      label: 'nexa-response-toolbar-docked',
      clipSelector: '[data-capture="nexa-response-toolbar"][data-variant="docked"]',
      note: 'Variant docked: barra fija de surface (ancho completo, fondo paper, borde superior).'
    },
    {
      kind: 'interaction',
      interaction: {
        // El voto colapsa el cluster a un acuse (el botón se reemplaza), así que la operabilidad por
        // teclado se prueba como path PRIMARIO (press Enter sobre el botón enfocado) — más riguroso, sin warning.
        name: 'vote-toolbar-helpful',
        intent: 'Votar "Sí, me sirvió" por teclado (focus + Enter) colapsa el feedback a un acuse, como en AI Overview.',
        action: { kind: 'press', selector: '[data-capture="nexa-response-toolbar-helpful"]', key: 'Enter' },
        frames: [
          {
            label: 'nexa-response-toolbar-feedback-ack',
            atMs: 300,
            clipSelector: '[data-capture="nexa-response-toolbar"][data-variant="embedded"]',
            note: 'Tras votar: el cluster de feedback colapsa a "¡Gracias por tu feedback!".'
          }
        ]
      }
    }
  ]
}
