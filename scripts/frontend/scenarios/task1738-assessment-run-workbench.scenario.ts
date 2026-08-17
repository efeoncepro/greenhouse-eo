import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1738 — Workbench de revisión del run de scoring IA (Application 360 · tab Evaluación).
 *
 * PRERREQUISITOS para correr este scenario:
 * 1. Integración de `AssessmentAiRunEntry` en la card del assessment de
 *    `Application360View.tsx` — HECHA (commit `a533d10dd`).
 * 2. Seed en el ambiente target: un assessment con run `awaiting_review` con items en
 *    varias clases de riesgo. El route apunta al seed sintético de local
 *    (candidato `qa.seed.task1738@efeonce.test`, run con 11 `mandatory_review` +
 *    2 `quality_sample` + 1 `batch_eligible`); en otro ambiente hay que reemplazar el
 *    `applicationId` por el del seed correspondiente.
 * 3. Los flags del run (`HIRING_ASSESSMENT_AI_ENABLED`,
 *    `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED`, `..._RUN_CONFIRM_ENABLED`,
 *    `..._EXCEPTION_POLICY_ENABLED`) deben estar ON en el runtime capturado; la variante
 *    flag OFF se captura re-corriendo el scenario con `..._RUN_CONFIRM_ENABLED` apagado.
 *
 * Assertions clave del contrato (wireframe/flow TASK-1738):
 * - El item de muestra ciega NO contiene score/rationale de propuesta en el DOM
 *   (ceguera estructural del reader, verificada acá sobre HTML).
 * - El CTA "Confirmar run" está disabled con `aria-describedby` mientras hay gates.
 * - Cero strings del namespace `scoringRun` en la ruta pública `/assessment/[token]`
 *   (probe anti-leak separada del Rollout Plan).
 */
export const scenario: CaptureScenario = {
  name: 'task1738-assessment-run-workbench',
  route: '/agency/hiring/applications/happ-f9246102-11ed-46db-9803-da9b4ded0410?tab=assessment',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  qualityProfile: 'premium',
  initialHoldMs: 1800,
  finalHoldMs: 600,
  mutating: true,
  safeForCapture: true,
  readiness: {
    selector: '[data-capture="assessment-run-entry"]',
    absentSelectors: ['[data-testid="login-card"]', '.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 200,
    timeout: 25000,
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta autenticada del Hiring Desk' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe ser un error de app' },
  ],
  quality: {
    accessibility: {
      enabled: true,
      // El workbench es un Dialog portaleado FUERA de la card: auditar solo la card dejaría
      // la superficie real de esta task sin auditar (hallazgo del primer GVC).
      includeSelector: '[data-capture="assessment-scorecard"], [role="dialog"]',
      failOnViolations: true,
    },
    layout: {
      enabled: true,
      includeSelector: 'main',
      failOnViolations: true,
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update'],
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          // Abrir el workbench desde la entrada de la card y cerrarlo con Escape:
          // el foco debe volver al disparador (contrato de focus restore del flow).
          name: 'run-entry-open-close',
          startSelector: '[data-capture="assessment-run-entry"] button',
          keys: ['Enter', 'Escape'],
          requireVisibleFocusRing: true,
        },
      ],
    },
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="assessment-run-entry"]', timeout: 10000 },
    {
      kind: 'mark',
      label: 'run-entry',
      clipSelector: '[data-capture="assessment-run-entry"]',
      note: 'Entrada en la card del assessment: chip Run IA + excepciones + abrir revisión',
    },
    { kind: 'click', selector: 'text=Abrir revisión del run' },
    { kind: 'wait', selector: '[data-capture="assessment-run-workbench"]', timeout: 10000 },
    {
      kind: 'mark',
      label: 'run-coverage',
      clipSelector: '[data-capture="assessment-run-coverage"]',
      note: 'REGION 1 — cobertura honesta: contadores de pendientes/devoluciones/cierres',
    },
    { kind: 'scroll', selector: '[data-capture="assessment-run-blind-item"]' },
    {
      kind: 'mark',
      label: 'blind-sample-item',
      clipSelector: '[data-capture="assessment-run-blind-item"]',
      note: 'Item de muestra ciega: SIN bloque de propuesta en el DOM (ceguera estructural)',
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'notVisible',
        selector: '[data-capture="assessment-run-blind-item"] >> text=Puntaje propuesto',
        reason: 'la propuesta de la muestra ciega no puede existir en el DOM antes de resolver',
      },
    },
    { kind: 'click', selector: 'text=Ver propuesta IA (queda registrado)' },
    { kind: 'wait', selector: 'text=Viste esta propuesta antes de puntuar', timeout: 5000 },
    // El `Collapse` anima altura: sin este settle la marca capturaba la propuesta a medio
    // desplegar (rationale cortado a mitad de frase). Hallazgo del primer GVC real.
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'proposal-revealed',
      note: 'Propuesta expandida con caption de registro (sawProposalBeforeScoring=true)',
    },
    { kind: 'scroll', selector: '[data-capture="assessment-run-confirm"]' },
    {
      kind: 'mark',
      label: 'confirm-gates-open',
      clipSelector: '[data-capture="assessment-run-confirm"]',
      note: 'CTA Confirmar run disabled con causas por gate visibles (aria-describedby)',
    },
    { kind: 'press', selector: 'body', key: 'Escape' },
    { kind: 'sleep', ms: 400 },
    {
      kind: 'mark',
      label: 'focus-restored',
      clipSelector: '[data-capture="assessment-run-entry"]',
      note: 'Esc cierra el workbench y el foco vuelve a "Abrir revisión del run"',
    },
  ],
}
