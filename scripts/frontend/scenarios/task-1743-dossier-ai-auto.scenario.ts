import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1743 — evidencia read-only del borrador automático en Expediente.
 *
 * Lucero es únicamente el canary con fuentes completas; el runtime que produce
 * la propuesta está registrado por eventos y aplica a cualquier applicationId
 * elegible. La captura no genera, confirma ni rechaza contenido.
 */
export const scenario: CaptureScenario = {
  name: 'task-1743-dossier-ai-auto',
  route: '/agency/hiring/applications/happ-031318c2-02ce-4623-8ada-6970cf4a8fb4?tab=activity',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  qualityProfile: 'premium',
  initialHoldMs: 2500,
  finalHoldMs: 600,
  readiness: {
    selector: '[data-capture="hiring-expediente-proposal"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 30000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="hiring-expediente-tab"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="hiring-expediente-tab"]',
      failOnViolations: true
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          name: 'proposal-actions-focus',
          startSelector: '[data-capture="hiring-expediente-proposal"] button',
          keys: ['Tab']
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 3600,
      maxRequests: 200,
      maxTransferBytes: 28_000_000,
      maxFcpMs: 15000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="hiring-expediente-tab"]',
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura corre con la identidad operadora declarada' },
    { kind: 'noErrorBoundary', reason: 'el expediente resuelve la propuesta automática sin romper la vista' },
    {
      kind: 'visible',
      selector: '[data-capture="hiring-expediente-proposal"]',
      reason: 'el borrador automático vigente está disponible para revisión del operador'
    }
  ],
  steps: [
    { kind: 'wait', selector: '[data-capture="hiring-expediente-proposal"]', timeout: 15000 },
    {
      kind: 'mark',
      label: 'dossier-auto-full',
      fullPage: true,
      note: 'Expediente operator-only con propuesta automática vigente'
    },
    {
      kind: 'mark',
      label: 'dossier-auto-proposal',
      clipSelector: '[data-capture="hiring-expediente-proposal"]',
      note: 'Borrador estructurado generado desde CV listo y assessment corregido'
    }
  ]
}
