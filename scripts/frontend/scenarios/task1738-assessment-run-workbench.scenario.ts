import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1738 — Workbench de revisión del run de scoring IA (Application 360 · tab Evaluación).
 *
 * PRERREQUISITOS para correr este scenario (declarados en la task):
 * 1. Integración de `AssessmentAiRunEntry` en la card del assessment de
 *    `Application360View.tsx` (pendiente — el archivo lo posee TASK-1737 en vuelo;
 *    ver Handoff TASK-1738). Sin la entrada, el workbench no es alcanzable.
 * 2. Seed determinista en el ambiente target: un assessment con run `awaiting_review`
 *    con 2 `mandatory_review` (1 resuelta) + 1 `quality_sample` sin resolver +
 *    4 `batch_eligible` + 1 `abstained`. Reemplazar `<applicationId>` y `<assessmentId>`
 *    del route por los IDs reales del seed.
 * 3. Variantes stale (digest divergente) y flag OFF se capturan re-corriendo el scenario
 *    con el seed/env correspondiente (`HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED`).
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
  route: '/agency/hiring/applications/<applicationId>?tab=assessment',
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
    timeout: 10000,
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta autenticada del Hiring Desk' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe ser un error de app' },
  ],
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
