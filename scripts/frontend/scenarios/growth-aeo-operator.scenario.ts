// TASK-1276 — AEO Operator View (cockpit + detalle + control de status) GVC verification.
// Targets the REAL routes (/growth/aeo → click primera fila AEO → detalle) con data real del ambiente
// (orgs con módulo ai_visibility_v1 y run reportable). Nodos S8/S9/S7 del EPIC-020. El picker (S10) se
// captura abriéndolo desde el CTA del header; el composer de envío (S11) queda gateado por flag OFF y
// se verifica su CTA deshabilitado con hint honesto en la banda del detalle.
// Diseño aprobado: mockup Claude Design "AEO Operator View" (proyecto f146e98a).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'growth-aeo-operator',
  route: '/growth/aeo',
  // Desktop-only: en compact el detail canvas vive en drawer (CompositionShell) y el flujo del drawer
  // requiere steps propios → scenario hermano `growth-aeo-operator-compact` (iPhone 13).
  viewport: { width: 1440, height: 900 },
  viewports: [{ name: 'desktop', width: 1440, height: 900 }],
  // Hold largo: la página es grande y en dev la hidratación puede demorar — los clicks pre-hidratación
  // se pierden silenciosamente (React aún no montó los handlers).
  initialHoldMs: 6000,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="aeo-operator-cockpit"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 20000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta interna autenticada (viewCode gestion.growth_aeo)' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    // S8 — cockpit cross-cliente (KPIs + tabla con score/tier/último run + targets cross-sell).
    // clipSelector (no fullPage): con el sidebar fixed el fullPage sale ilegible.
    { kind: 'mark', label: '01-cockpit', clipSelector: '[data-capture="aeo-operator-cockpit"]' },

    // S10 — subject picker agrupado por motion (abre desde el CTA del header).
    { kind: 'sleep', ms: 2000 },
    { kind: 'click', selector: '[data-capture="aeo-run-header-cta"]' },
    { kind: 'wait', selector: '[aria-label="Cerrar el selector de target"]', timeout: 10000 },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: '02-picker' },
    { kind: 'click', selector: '[aria-label="Cerrar el selector de target"]' },
    { kind: 'sleep', ms: 800 },

    // S9 — detalle operador: click en la primera fila AEO de la tabla (navega a /growth/aeo/[id]).
    { kind: 'click', selector: '[data-capture="aeo-operator-cockpit"] tbody tr' },
    { kind: 'wait', selector: '[data-capture="aeo-operator-detail"]', timeout: 60000 },
    { kind: 'sleep', ms: 1500 },
    { kind: 'mark', label: '03-detail-band', clipSelector: '[data-capture="aeo-operator-detail"]' },

    // S7 — control de estado del Plan AEO: el foco default ya es una recomendación; el control vive
    // en el detail canvas (data-capture aeo-plan-status).
    { kind: 'scroll', selector: '[data-capture="aeo-plan-status"]', scrollBlock: 'center' },
    { kind: 'sleep', ms: 600 },
    { kind: 'mark', label: '04-plan-status', clipSelector: '[data-capture="composition-shell"]' }
  ]
}

export default scenario
