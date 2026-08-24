import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task355-hiring-application-360',
  route: '/agency/hiring/pipeline?captureApplication=queue',
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1400,
  finalHoldMs: 350,
  readiness: { selector: '[data-capture="hiring-application"]', absentSelectors: ['[data-testid="login-card"]'], waitForFonts: true, postReadyDelayMs: 400, timeout: 15000 },
  assertions: [{ kind: 'noLoginRedirect' }, { kind: 'noErrorBoundary' }],
  quality: {
    layout: { enabled: true, includeSelector: 'body', ignoreSelectors: ['.ts-vertical-nav-root', '.ts-vertical-nav-container', '.ts-vertical-nav-bg-color-container', '.bs-full', '.MuiLinearProgress-bar'], allowHorizontalScrollSelectors: ['[role="region"]', '[data-capture="hiring-application-tabs"]', '[data-capture="hiring-tabs"]'], minTargetSize: 20, failOnViolations: true },
    accessibility: { enabled: true, includeSelector: 'body', failOnViolations: false },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: false },
    enterpriseRubric: { enabled: true, includeSelector: '[data-capture="hiring-application"]' },
  },
  steps: [
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 1000 },
    { kind: 'mark', label: 'application-overview', note: 'Header candidato, PII masked y affinity advisory.' },
    { kind: 'mark', label: 'application-queue', clipSelector: '[data-capture="hiring-application-queue-navigation"]', note: 'Navegación secuencial neutral dentro de la misma vacante y etapa.' },
    { kind: 'click', selector: '[data-capture="hiring-application-queue-navigation"] button:has-text("Siguiente")' },
    { kind: 'wait', selector: '[data-capture="hiring-application-queue-navigation"][data-queue-position="2"]', timeout: 15000 },
    { kind: 'mark', label: 'application-queue-next', clipSelector: '[data-capture="hiring-application-queue-navigation"]', note: 'Siguiente cambia de postulación sin salir de la vacante ni de la etapa.' },
    { kind: 'click', selector: 'button[role="tab"]:has-text("Evaluación")' },
    { kind: 'mark', label: 'application-assessment', clipSelector: '[data-capture="hiring-application-panel-assessment"]', note: 'Assessment real o estado degradado honesto.' },
    { kind: 'click', selector: 'button[role="tab"]:has-text("Documentos")' },
    { kind: 'mark', label: 'application-documents', clipSelector: '[data-capture="hiring-application-panel-documents"]', note: 'Documentos con PII masked y dependencia 1362 explícita.' },
    { kind: 'click', selector: 'button[role="tab"]:has-text("Decisión")' },
    { kind: 'mark', label: 'application-decision', clipSelector: '[data-capture="hiring-application-panel-decision"]', note: 'Decisión estructurada, humana y defendible.' },
    // TASK-1737 — el tab "Actividad" se convirtió en el Expediente real (timeline persistido).
    { kind: 'click', selector: 'button[role="tab"]:has-text("Expediente")' },
    { kind: 'mark', label: 'application-expediente', clipSelector: '[data-capture="hiring-application-panel-expediente"]', note: 'Expediente: timeline append-only de notas + eventos.' },
    {
      kind: 'interaction',
      interaction: {
        name: 'application-to-pipeline-context-return',
        intent: 'Verificar la continuidad espacial Application 360 → tarjeta del pipeline sin perder vacante ni foco.',
        action: { kind: 'click', selector: 'a[data-parent-return="true"]' },
        frames: [
          { label: 'departure', atMs: 20, note: 'La pestaña Pipeline inicia el retorno contextual.' },
          { label: 'route-pending', atMs: 3000, note: 'La vista de origen permanece estable mientras resuelve el reader de destino.' },
          { label: 'shared-element', atMs: 6200, note: 'El hero y la tarjeta comparten identidad visual al montar el destino.' },
          { label: 'settled', atMs: 7000, note: 'El pipeline de la vacante exacta queda estable y listo para recuperar foco.' },
        ],
      },
    },
    { kind: 'wait', selector: '[data-capture="hiring-pipeline-board"]', timeout: 15000 },
    { kind: 'mark', label: 'pipeline-context-return', note: 'Retorno al pipeline de la vacante exacta; la tarjeta recupera foco sin filtrar el tablero.' },
  ],
}
