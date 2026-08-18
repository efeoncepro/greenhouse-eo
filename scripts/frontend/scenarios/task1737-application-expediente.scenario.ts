import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1737 — Application 360 · tab Expediente (consumer UI del Evaluation Dossier).
 *
 * La ruta entra por `?tab=activity` A PROPÓSITO: probar el alias de deep-link es parte
 * del contrato (los links guardados no se rompen) — si el alias falla, el primer `wait`
 * del panel Expediente falla y la captura muere loud.
 *
 * No es `mutating`: sólo navega y captura. Ni el composer ni el carril propose/confirm
 * se DISPARAN acá — escribirían notas/propuestas reales en el expediente auditado.
 *
 * Cobertura pendiente de seed determinista (declarada en la task, NO cubierta por este
 * archivo hasta ejecutar la secuencia de staging del Rollout Plan):
 * - `proposal-panel` / `proposal-edit` / `reject-dialog`: requieren una propuesta
 *   `proposed` vigente (flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED` ON en staging).
 * - `blind-lock`: requiere una SEGUNDA sesión con persona evaluadora cuyo
 *   interviewer_scorecard propio esté abierto (la ceguera es del reader; el assert
 *   correcto es sobre el payload/DOM de ESA sesión, no de la superadmin).
 */
export const scenario: CaptureScenario = {
  name: 'task1737-application-expediente',
  route: '/agency/hiring/applications/happ-8d653b91-da1c-4451-a02f-12c387a06cf3?tab=activity',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  qualityProfile: 'premium',
  initialHoldMs: 2500,
  finalHoldMs: 600,
  readiness: {
    selector: '[data-capture="hiring-application-tabs"]',
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
          // Del cuerpo del composer hacia adelante: contador descrito por aria-describedby
          // y CTA "Agregar nota" con anillo de foco — ambos controles de esta task.
          name: 'composer-focus',
          startSelector: '#expediente-composer-body textarea, #expediente-composer-body',
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
      // El tab vive dentro del canvas de una vista que ya declara su composición
      // (TASK-355); no introduce una gramática de superficie propia.
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura corre con la identidad declarada' },
    { kind: 'noErrorBoundary', reason: 'el tab resuelve el reader real sin romper la vista' },
    {
      kind: 'visible',
      selector: 'button[role="tab"][data-application-tab="expediente"]',
      reason: 'el tab se llama Expediente y ?tab=activity resolvió a él (alias de deep-link)'
    }
  ],
  steps: [
    // El alias ?tab=activity debe aterrizar DIRECTO en el Expediente (sin click).
    { kind: 'wait', selector: '[data-capture="hiring-expediente-tab"]', timeout: 10000 },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="hiring-expediente-timeline"]',
        reason: 'el timeline persistido renderiza (notas + eventos de etapa, no el activity sintético)'
      }
    },
    {
      kind: 'mark',
      label: 'expediente-full',
      fullPage: true,
      note: 'Tab completo: header + estado del carril IA + composer + timeline'
    },
    {
      kind: 'mark',
      label: 'expediente-timeline',
      clipSelector: '[data-capture="hiring-expediente-timeline"]',
      note: 'Notas con chips de kind/source intercaladas con eventos ligeros de etapa'
    },
    {
      kind: 'mark',
      label: 'composer',
      clipSelector: '[data-capture="hiring-expediente-composer"]',
      note: 'Composer tipado con contador {count}/8000 — sin optimistic UI'
    }
  ]
}
