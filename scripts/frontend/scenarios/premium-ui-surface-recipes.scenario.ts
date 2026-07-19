import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'premium-ui-surface-recipes',
  route: '/design-system/surface-recipes',
  safeForCapture: true,
  qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1000,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="recipe-workbench"]',
    selectors: [
      '[data-capture="recipe-workbench-header"]',
      '[data-capture="recipe-workbench-signals"]',
      '[data-capture="recipe-workbench-inventory"]'
    ],
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 15000
  },
  baseline: {
    surfaceId: 'design-system.surface-recipes',
    requiredFrameLabels: ['workbench-first-fold', 'workbench-full-page', 'report-first-fold', 'settings-first-fold'],
    requiredRegions: ['[data-surface-recipe]'],
    maxDiffRatio: 0.035
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'El Lab interno debe capturarse con actor GVC autenticado.' },
    { kind: 'noErrorBoundary', reason: 'La evidencia premium no puede contener un error boundary.' },
    { kind: 'visible', selector: '[data-surface-recipe="operationalWorkbench"]', reason: 'El workbench inicial debe renderizar.' }
  ],
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-surface-recipe]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: 'main',
      failOnViolations: true
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'recipe-tabs',
          startSelector: '[data-capture="recipe-tab-workbench"]',
          keys: ['Tab', 'Tab'],
          requireVisibleFocusRing: true
        },
        {
          name: 'settings-selection',
          startSelector: '[data-capture="recipe-settings-option-intent"] button',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'error',
      maxDomNodes: 6500,
      maxRequests: 120,
      maxTransferBytes: 30_000_000,
      maxFcpMs: 9000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: 'main',
      failOnViolations: true,
      placeholderTerms: ['lorem', 'placeholder', 'fake', 'todo'],
      requireSurfaceRecipeMarker: true,
      maxUniformCards: 4,
      maxNestedSurfaceDepth: 2,
      maxContainedSurfacesInViewport: 3,
      minHeadingScaleRatio: 1.25
    }
  },
  steps: [
    { kind: 'wait', selector: '[data-capture="recipe-workbench"]', timeout: 15000 },
    { kind: 'scroll', selector: '[data-surface-recipe="operationalWorkbench"]', scrollBlock: 'start', scrollY: -120 },
    { kind: 'mark', label: 'workbench-first-fold', note: 'Contexto, señales, inventario y detalle comparten una jerarquía operativa.' },
    {
      kind: 'interaction',
      interaction: {
        name: 'workbench-causal-selection',
        action: { kind: 'click', selector: '[data-capture="recipe-workbench-row-retention"] button' },
        intent: 'La selección debe actualizar hero, evidencia, recomendación y command bar; no solo el estilo de la fila.',
        frames: [
          { label: 'workbench-selection-feedback', atMs: 0, fullPage: true, note: 'Acknowledgement inmediato del cambio de selección.' },
          { label: 'workbench-selection-settled', atMs: 350, fullPage: true, note: 'Contenido causal asentado después de la transición tokenizada.' }
        ],
        keyboardEquivalent: {
          action: { kind: 'press', selector: '[data-capture="recipe-workbench-row-retention"] button', key: 'Enter' },
          expected: 'La misma activación queda seleccionada y el detalle asociado permanece disponible.'
        },
        reducedMotion: 'capture'
      }
    },
    { kind: 'mark', label: 'workbench-full-page', fullPage: true, note: 'Workbench completo; en compact el detalle vive en el drawer canónico del Composition Shell.' },
    { kind: 'scroll', scrollTo: 'top' },
    { kind: 'click', selector: '[data-capture="recipe-tab-report"]' },
    { kind: 'sleep', ms: 500 },
    { kind: 'scroll', selector: '[data-surface-recipe="analytics-report"]', scrollBlock: 'start', scrollY: -120 },
    { kind: 'mark', label: 'report-first-fold', note: 'Narrativa ejecutiva, señal protagonista y evidencia desigual.' },
    { kind: 'mark', label: 'report-full-page', fullPage: true, note: 'Reporte completo con narrativa, evidencia y lectura contextual.' },
    { kind: 'click', selector: '[data-capture="recipe-tab-settings"]' },
    { kind: 'sleep', ms: 500 },
    { kind: 'scroll', selector: '[data-surface-recipe="settings-flow"]', scrollBlock: 'start', scrollY: -120 },
    { kind: 'mark', label: 'settings-first-fold', note: 'Flujo focal con impacto y command bar gobernada.' },
    {
      kind: 'interaction',
      interaction: {
        name: 'settings-impact-recalculation',
        action: { kind: 'click', selector: '[data-capture="recipe-settings-option-fit"] button' },
        intent: 'Cambiar la señal principal debe recalcular el impacto, mantener contexto y anunciar el nuevo resultado.',
        frames: [
          { label: 'settings-impact-feedback', atMs: 0, fullPage: true, note: 'La selección acusa recibo sin bloquear el flujo.' },
          { label: 'settings-impact-settled', atMs: 350, fullPage: true, note: 'Métricas y explicación corresponden a la nueva señal.' }
        ],
        keyboardEquivalent: {
          action: { kind: 'press', selector: '[data-capture="recipe-settings-option-fit"] button', key: 'Enter' },
          expected: 'La opción queda seleccionada y el impacto recalculado se anuncia en la región live.'
        },
        reducedMotion: 'capture'
      }
    },
    { kind: 'mark', label: 'settings-full-page', fullPage: true, note: 'Configuración completa y responsive.' }
  ]
}
