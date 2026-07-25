import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1555 — Globe Producer Model Selector.
 *
 * Corre contra el fixture local de Globe (`pnpm --filter @efeonce-globe/studio-web gvc:fixture`,
 * `http://127.0.0.1:4178`), que proyecta `globe.producer.fleet.list` con los estados honestos:
 * `available` (+ recomendado), `gated` (`not_promoted` — el bloqueo real de ADR-009) y `blocked`
 * (`provider_verifier_pending`, gate externo del proveedor).
 *
 *   AGENT_AUTH_BASE_URL=http://127.0.0.1:4178 pnpm fe:capture task-1555-model-selector --env=local
 *
 * La evidencia debe probar que el selector es un control denso con el isotipo real del modelo, que
 * la flota COMPLETA de la modalidad es visible (incluidos los modelos que necesitan otro modo) y que
 * nada no ejecutable se muestra como ejecutable.
 */
export const scenario: CaptureScenario = {
  name: 'task-1555-model-selector',
  route: '/producer',
  safeForCapture: true,
  mutating: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1400,
  finalHoldMs: 350,
  readiness: {
    selector: '[data-capture="producer-console"]',
    selectors: [
      '[data-capture="producer-composer"]',
      '[data-capture="producer-model-picker"][data-producer-fleet-state="ready"]',
      '[data-capture="producer-model-trigger"]',
    ],
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]'],
    waitForFonts: true,
    postReadyDelayMs: 450,
    timeout: 20000,
    note: 'El selector sólo es evidencia válida con la proyección de flota resuelta: un control en loading no prueba estados.',
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'La evidencia requiere una sesión Producer autorizada.' },
    { kind: 'noErrorBoundary', reason: 'El selector no puede capturarse sobre un error.' },
    { kind: 'visible', selector: '[data-capture="producer-model-picker"]', reason: 'El selector de modelo es la región bajo evidencia.' },
    { kind: 'visible', selector: '[data-capture="producer-model-trigger"]', reason: 'El modelo elegido debe nombrarse sin abrir el desplegable.' },
    { kind: 'notVisible', selector: '.route-picker', reason: 'El dropdown técnico anterior no puede reaparecer.' },
  ],
  quality: {
    accessibility: { enabled: true, includeSelector: '[data-capture="producer-route"]', failOnViolations: true },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="producer-composer"]',
      allowHorizontalScrollSelectors: ['.shape-preview', '.filter-row', '.preset-chip-rail'],
      minTargetSize: 24,
      failOnViolations: true,
    },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: true, failOnHttpStatus: true },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'model-picker-focus',
          startSelector: '[data-capture="producer-model-trigger"]',
          keys: ['Enter'],
          requireVisibleFocusRing: true,
        },
      ],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 4200, maxRequests: 120, maxTransferBytes: 35_000_000, maxFcpMs: 9000 },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="producer-composer"]',
      failOnViolations: true,
      placeholderTerms: ['lorem', 'fake', 'todo'],
      expectedDataCaptureRegions: ['producer-composer', 'producer-route', 'producer-model-picker', 'producer-model-trigger'],
      maxUniformCards: 8,
      maxNestedSurfaceDepth: 2,
      maxContainedSurfacesInViewport: 5,
      minHeadingScaleRatio: 1.25,
    },
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="producer-model-picker"]', timeout: 20000 },
    { kind: 'mark', label: 'producer-first-fold', note: 'El composer conserva su jerarquía: el prompt domina y el selector de modelo es un control denso.' },
    { kind: 'scroll', selector: '[data-capture="producer-route"]', scrollBlock: 'center' },
    { kind: 'sleep', ms: 200 },
    {
      kind: 'mark',
      label: 'model-picker-closed',
      clipSelector: '[data-capture="producer-route"]',
      note: 'Cerrado: isotipo real + nombre + versión + marca de recomendado, en una sola línea.',
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'model-list-states',
        action: { kind: 'click', selector: '[data-capture="producer-model-trigger"]' },
        intent: 'La lista abre con la flota completa de la modalidad y declara el estado real de cada modelo.',
        frames: [
          { label: 'list-feedback', atMs: 0, clipSelector: '[data-capture="producer-route"]' },
          { label: 'list-settled', atMs: 260, clipSelector: '[data-capture="producer-route"]' },
        ],
        keyboardEquivalent: {
          action: { kind: 'press', selector: '[data-capture="producer-model-trigger"]', key: 'Enter' },
          expected: 'El summary abre la lista y devuelve el foco al cerrarse; Escape cierra sin cambiar la elección.',
        },
        reducedMotion: 'capture',
      },
    },
    {
      kind: 'assert',
      assertion: { kind: 'visible', selector: '[data-producer-model-state="gated"]', reason: 'Próximamente (ADR-009) debe ser legible, no invisible.' },
    },
    {
      kind: 'assert',
      assertion: { kind: 'visible', selector: '[data-producer-model-state="blocked"]', reason: 'El gate externo del proveedor debe declararse, no esconderse.' },
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'unavailable-model-is-inert',
        action: { kind: 'click', selector: '[data-producer-model-state="gated"]' },
        intent: 'Un modelo no promovido es legible y anunciable, pero NO ejecutable: el click no cambia la elección.',
        frames: [{ label: 'gated-inert', atMs: 220, clipSelector: '[data-capture="producer-route"]' }],
        reducedMotion: 'capture',
      },
    },
    { kind: 'click', selector: '[role="tab"][data-modality="video"]' },
    { kind: 'wait', selector: '[data-capture="producer-model-picker"]', timeout: 12000 },
    { kind: 'scroll', selector: '[data-capture="producer-route"]', scrollBlock: 'center' },
    { kind: 'click', selector: '[data-capture="producer-model-trigger"]' },
    { kind: 'sleep', ms: 240 },
    {
      kind: 'mark',
      label: 'fleet-video-complete',
      clipSelector: '[data-capture="producer-route"]',
      note: 'Video muestra los cuatro modelos: Seedance disponible, Veo con lo que necesita, Gemini Omni y motion con su gate.',
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'cross-mode-selection',
        action: { kind: 'click', selector: '[data-producer-model-needs-mode="frames"]' },
        intent: 'Elegir un modelo que necesita otro modo cambia el modo del composer y lo deja seleccionado, en vez de ser inerte.',
        frames: [{ label: 'mode-switched', atMs: 300, clipSelector: '[data-capture="producer-composer"]' }],
        reducedMotion: 'capture',
      },
    },
    { kind: 'click', selector: '[role="tab"][data-modality="audio"]' },
    { kind: 'wait', selector: '[data-capture="producer-model-picker"]', timeout: 12000 },
    { kind: 'scroll', selector: '[data-capture="producer-route"]', scrollBlock: 'center' },
    { kind: 'click', selector: '[data-capture="producer-model-trigger"]' },
    { kind: 'sleep', ms: 240 },
    { kind: 'mark', label: 'fleet-audio-complete', clipSelector: '[data-capture="producer-route"]', note: 'Audio ofrece Seed Audio y ElevenLabs; ninguno queda inalcanzable.' },
    { kind: 'click', selector: '[role="tab"][data-modality="image"]' },
    { kind: 'wait', selector: '[data-capture="producer-model-picker"]', timeout: 12000 },
    { kind: 'scroll', selector: '#producer-title', scrollBlock: 'start' },
    { kind: 'mark', label: 'producer-full-page', fullPage: true, note: 'Composición completa desktop/mobile: el selector no introduce overflow horizontal.' },
  ],
}
