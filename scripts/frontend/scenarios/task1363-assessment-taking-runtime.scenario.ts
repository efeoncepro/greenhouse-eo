// TASK-1363 — Assessment taking runtime fidelity (candidate surface).
// Requires TASK1363_CANDIDATE_TOKEN to point to a disposable candidate_test token.

import type { CaptureScenario } from '../lib/scenario'

const token = process.env.TASK1363_CANDIDATE_TOKEN ?? 'missing-task1363-candidate-token'

export const scenario: CaptureScenario = {
  name: 'task1363-assessment-taking-runtime',
  route: `/assessment/${token}`,
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 980 },
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="assessment-instructions"]',
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 300,
    timeout: 15000,
  },
  assertions: [
    { kind: 'noErrorBoundary', reason: 'La evaluación pública debe renderizar sin boundary.' },
    { kind: 'visible', selector: '[data-capture="assessment-instructions"]', reason: 'Debe iniciar con instrucciones, consentimiento y secciones.' },
  ],
  quality: {
    layout: { enabled: true, includeSelector: 'body', failOnViolations: false },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: false,
      ignoreUrlPatterns: ['/_next/', 'hot-update'],
      ignoreConsolePatterns: ['JWT_SESSION_ERROR', 'next-auth'],
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="assessment-instructions"]',
      expectedDataCaptureRegions: ['assessment-instructions'],
    },
  },
  steps: [
    {
      kind: 'mark',
      label: 'candidate-instructions',
      fullPage: true,
      note: 'Instrucciones candidate-facing: header público, secciones, adaptación, consentimiento y CTA bloqueado hasta consentir.',
    },
    { kind: 'click', selector: '[data-capture="assessment-instructions"] input[type="checkbox"]' },
    { kind: 'click', selector: '[data-capture="assessment-start"]' },
    {
      kind: 'mark',
      label: 'candidate-start-loading',
      fullPage: true,
      note: 'CTA en estado de inicio/carga mientras se prepara el timer y la primera pregunta.',
    },
    { kind: 'wait', selector: '[data-capture="assessment-question"]', timeout: 15000 },
    {
      kind: 'mark',
      label: 'candidate-question-with-timer',
      fullPage: true,
      note: 'Wizard de pregunta: progreso, stepper, timer con role=timer, autosave status y navegación.',
    },
    { kind: 'fill', selector: '[data-capture="assessment-question"] textarea', value: 'Priorizaria claridad, trazabilidad y una iteracion medible: entenderia el contexto, explicaria tradeoffs y documentaria la decision para que el equipo pueda auditar el criterio.' },
    {
      kind: 'mark',
      label: 'candidate-autosave-feedback-start',
      clipSelector: '[data-capture="assessment-question"]',
      note: 'Respuesta escrita; se debe percibir estado de guardado sin bloquear el flujo.',
    },
    { kind: 'sleep', ms: 3200 },
    {
      kind: 'mark',
      label: 'candidate-autosave-feedback-settled',
      clipSelector: '[data-capture="assessment-question"]',
      note: 'Autosave asentado: la UI debe volver a estado guardado/estable.',
    },
    { kind: 'click', selector: '[data-capture="assessment-next"]' },
    { kind: 'wait', selector: '[data-capture="assessment-question"]', timeout: 8000 },
    { kind: 'sleep', ms: 240 },
    {
      kind: 'mark',
      label: 'candidate-next-section',
      fullPage: true,
      note: 'Microinteracción de avance: stepper/progreso actualizados y nueva pregunta visible.',
    },
  ],
}
