// TASK-1751 — Fase de gracia de la rendición del candidato (superficie pública).
//
// La fase `submit_grace` NO se alcanza navegando: exige un assessment con `started_at` ya pasado el
// `answerDeadline` y antes del `closeDeadline`. Es dato, no UI. Sembrar con:
//
//   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_seed-task-1751-gvc.ts
//
// El seed imprime el token y lo deja listo en TASK1751_GRACE_TOKEN. Al terminar, correr con --cleanup.

import type { CaptureScenario } from '../lib/scenario'

const token = process.env.TASK1751_GRACE_TOKEN ?? 'missing-task1751-grace-token'

export const scenario: CaptureScenario = {
  name: 'task1751-assessment-grace',
  route: `/assessment/${token}`,
  // El recorrido lee y envía; GVC clasifica cualquier secuencia de teclado/clic como mutating.
  mutating: true,
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 980 },
  viewports: [
    { name: 'desktop', width: 1440, height: 980 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="assessment-grace-banner"]',
    selectors: ['[data-capture="assessment-timer"]', '[data-capture="assessment-grace-banner"]'],
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 20000,
  },
  baseline: {
    surfaceId: 'hiring.assessment.submit-grace',
    requiredFrameLabels: ['grace-banner', 'grace-readonly-answer'],
    requiredRegions: [
      '[data-capture="assessment-grace-banner"]',
      '[data-capture="assessment-question"]',
    ],
    maxDiffRatio: 0.045,
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'La superficie es pública por token: un redirect a login invalida la evidencia.' },
    { kind: 'noErrorBoundary', reason: 'La fase de gracia no puede aprobarse sobre un error de aplicación.' },
    { kind: 'visible', selector: '[data-capture="assessment-grace-banner"]', reason: 'La banda es lo que explica el cambio de reglas; sin ella la pantalla vuelve a callar.' },
    { kind: 'visible', selector: '[data-capture="assessment-timer"]', reason: 'El reloj sigue contando hacia el cierre de envío, también en móvil.' },
  ],
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="assessment-question"]',
      failOnViolations: true,
    },
    layout: {
      enabled: true,
      includeSelector: 'body',
      minTargetSize: 24,
      failOnViolations: true,
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [{
        name: 'grace-readonly-answer',
        startSelector: '[data-capture="assessment-question"]',
        keys: ['Tab'],
        requireVisibleFocusRing: true,
      }],
    },
    performance: {
      enabled: true,
      severity: 'error',
      maxDomNodes: 3000,
      maxRequests: 90,
      maxTransferBytes: 25_000_000,
      maxFcpMs: 9000,
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="assessment-question"]',
      failOnViolations: true,
      placeholderTerms: ['lorem', 'fake', 'todo'],
      expectedDataCaptureRegions: [
        'assessment-timer',
        'assessment-grace-banner',
        'assessment-question',
      ],
    },
  },
  steps: [
    {
      kind: 'mark',
      label: 'grace-banner',
      fullPage: true,
      note: 'Fase de gracia: la banda declara que el tiempo de respuesta terminó, si la evaluación se puede enviar y cuántas respuestas quedaron guardadas. Con faltantes, el CTA de envío NO se renderiza.',
    },
    {
      kind: 'mark',
      label: 'grace-readonly-answer',
      clipSelector: '[data-capture="assessment-question"]',
      note: 'El campo queda en solo lectura CON señal visual propia (borde discontinuo y fondo alterno), y conserva el texto a la vista para poder copiarlo. Con `disabled` quedaba fuera del tab order y del árbol de accesibilidad.',
    },
  ],
}

export default scenario
