import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'globe-creative-producer',
  route: '/producer',
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  initialHoldMs: 1200,
  finalHoldMs: 350,
  readiness: {
    selector: '[data-capture="producer-console"]',
    selectors: ['[data-capture="producer-composer"]', '[data-capture="producer-prompt-bar"]', '[data-capture="producer-feed"]'],
    absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]'],
    waitForFonts: true,
    postReadyDelayMs: 450,
    timeout: 20000,
    note: 'El Producer debe estar hidratado y con sus tres regiones source-led antes de capturar.',
  },
  baseline: {
    surfaceId: 'globe.creative-producer-surface',
    requiredFrameLabels: ['producer-first-fold', 'credits-rich-panel-credits-feedback', 'credits-rich-panel-credits-settled', 'composer-reactive-light-composer-light-feedback', 'composer-reactive-light-composer-light-settled', 'composer-edit-mode-light-edit-mode-feedback', 'composer-edit-mode-light-edit-mode-settled', 'producer-full-page'],
    requiredRegions: ['[data-capture="producer-composer"]', '[data-capture="producer-feed"]', '[data-capture="producer-estimate"]'],
    maskSelectors: ['[data-producer-credit-free]'],
    maxDiffRatio: 0.08,
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'La evidencia requiere una sesión humana Producer autorizada.' },
    { kind: 'noErrorBoundary', reason: 'La superficie aprobada no puede capturarse sobre un error.' },
    { kind: 'visible', selector: '[data-capture="producer-composer"]', reason: 'El composer es la región primaria aprobada.' },
    { kind: 'visible', selector: '[data-capture="producer-feed"]', reason: 'La biblioteca editorial debe permanecer en la composición.' },
  ],
  quality: {
    accessibility: { enabled: true, includeSelector: '[data-capture="producer-console"]', failOnViolations: true },
    layout: { enabled: true, includeSelector: '[data-capture="producer-console"]', allowHorizontalScrollSelectors: ['.shape-preview', '.filter-row', '.preset-chip-rail'], minTargetSize: 24, failOnViolations: true },
    runtime: { failOnConsoleError: true, failOnPageError: true, failOnHydrationWarning: true, failOnHttpStatus: true },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        { name: 'prompt-light-focus', startSelector: '#producer-prompt', keys: ['Tab'], requireVisibleFocusRing: true },
        { name: 'modality-roving-tabs', startSelector: '[role="tab"][data-modality="image"]', keys: ['ArrowRight'], expectedFocusSelector: '[role="tab"][data-modality="video"]', requireVisibleFocusRing: true },
      ],
    },
    performance: { enabled: true, severity: 'error', maxDomNodes: 4200, maxRequests: 120, maxTransferBytes: 35_000_000, maxFcpMs: 9000 },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="producer-console"]',
      failOnViolations: true,
      placeholderTerms: ['lorem', 'fake', 'todo'],
      expectedDataCaptureRegions: ['producer-console', 'producer-composer', 'producer-prompt-bar', 'producer-feed', 'producer-estimate'],
      maxUniformCards: 4,
      maxNestedSurfaceDepth: 2,
      maxContainedSurfacesInViewport: 5,
      minHeadingScaleRatio: 1.25,
    },
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="producer-composer"]', timeout: 20000 },
    { kind: 'mark', label: 'producer-first-fold', note: 'Composer, estimate y biblioteca comparten el primer fold aprobado.' },
    {
      kind: 'interaction',
      interaction: {
        name: 'credits-rich-panel',
        action: { kind: 'click', selector: '[data-capture="producer-budget"] summary' },
        intent: 'El menú aprobado conserva anillo, desglose, uso mensual, presupuesto de proyecto, reservas y fence con datos del ledger.',
        frames: [
          { label: 'credits-feedback', atMs: 0, clipSelector: '[data-capture="producer-budget"]' },
          { label: 'credits-settled', atMs: 240, clipSelector: '[data-capture="producer-budget"]' },
        ],
        keyboardEquivalent: { action: { kind: 'press', selector: '[data-capture="producer-budget"] summary', key: 'Enter' }, expected: 'El summary actualiza aria-expanded y Escape cierra el panel devolviendo el foco.' },
        reducedMotion: 'capture',
      },
    },
    { kind: 'click', selector: '[data-capture="producer-budget"] summary', note: 'Cierra créditos antes de validar la iluminación del composer.' },
    {
      kind: 'interaction',
      interaction: {
        name: 'composer-reactive-light',
        action: { kind: 'hover', selector: '[data-capture="producer-composer"]' },
        intent: 'La iluminación azul debe seguir el puntero y revelar profundidad sin tapar contenido.',
        frames: [
          { label: 'composer-light-feedback', atMs: 40, clipSelector: '[data-capture="producer-composer"]' },
          { label: 'composer-light-settled', atMs: 240, clipSelector: '[data-capture="producer-composer"]' },
        ],
        keyboardEquivalent: { action: { kind: 'focus', selector: '#producer-prompt' }, expected: 'El foco conserva el lenguaje de luz y un focus ring inequívoco.' },
        reducedMotion: 'capture',
      },
    },
    { kind: 'click', selector: '[role="tab"][data-modality="video"]' },
    {
      kind: 'interaction',
      interaction: {
        name: 'composer-edit-mode-light',
        action: { kind: 'click', selector: '[data-producer-intent="mode-edit"]' },
        intent: 'Editar debe cambiar el modo efectivo y mantener el halo como señal causal del asset fuente requerido.',
        frames: [
          { label: 'edit-mode-feedback', atMs: 0, clipSelector: '[data-capture="producer-composer"]' },
          { label: 'edit-mode-settled', atMs: 260, clipSelector: '[data-capture="producer-composer"]' },
        ],
        keyboardEquivalent: { action: { kind: 'press', selector: '[data-producer-intent="mode-edit"]', key: 'Enter' }, expected: 'El botón queda aria-pressed y el composer anuncia que necesita una referencia elegible.' },
        reducedMotion: 'capture',
      },
    },
    { kind: 'click', selector: '#producer-title', note: 'Limpia el foco residual sin mutar estado antes de la evidencia full-page.' },
    { kind: 'mark', label: 'producer-full-page', fullPage: true, note: 'Composición completa desktop/mobile sin overflow horizontal accidental.' },
  ],
}
