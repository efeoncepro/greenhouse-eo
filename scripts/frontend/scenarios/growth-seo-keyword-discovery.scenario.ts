// TASK-1665 — Lente `Descubrir` de Keywords (sub-lente del nodo S3 del master flow EPIC-022).
//
// ⚠️ NO se usa `fullPage`: al capturarlo Playwright redimensiona el viewport, y además un
// screenshot de página completa ESCONDE el overflow horizontal —que es justo lo que hay que
// medir a 390px—. Se mide el DOM (`scrollWidth === clientWidth`) y se capturan markers.
//
// La corrida real gasta presupuesto del proveedor, así que este scenario NO la dispara: captura
// el builder, su preview de costo y el estado honesto de "todavía no hay corrida". Los estados
// async (`queued`/`running`/`partial`) se capturan con fixtures controladas en el slice que los
// implementa — nunca llamando a DataForSEO desde una captura.

import type { CaptureScenario } from '../lib/scenario'

/** Grupo Berel — el Space con módulo SEO contratado y sitio configurado en dev/staging. */
const BEREL_SPACE_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

export const scenario: CaptureScenario = {
  name: 'growth-seo-keyword-discovery',
  route: `/admin/growth/seo/keywords?space=${BEREL_SPACE_ID}&view=discovery`,
  viewport: { width: 1440, height: 900 },
  qualityProfile: 'premium',
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 600,
  readiness: {
    selector: '[data-capture="seo-keyword-discovery-builder"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 30000
  },
  quality: {
    accessibility: { enabled: true, includeSelector: '[data-capture="composition-shell"]', failOnViolations: true },
    layout: { enabled: true, includeSelector: 'main', failOnViolations: false },
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
          name: 'discovery-seeds-focus',
          startSelector: '[data-capture="seo-keyword-discovery-builder"] textarea',
          keys: ['Tab'],
          requireVisibleFocusRing: true
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
    enterpriseRubric: { enabled: true, includeSelector: 'main' }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta admin interna: la sesión agente debe sostenerse' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="seo-keyword-discovery-builder"]',
      reason: 'el builder es la superficie de comando: sin él no hay pregunta que hacer'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-keyword-discovery-cost"]',
      reason: 'el costo tiene que estar en el fold: confirmar un gasto sin verlo es el riesgo #1 de la pantalla'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-keywords-lens-tabs"]',
      reason: 'la lente activa debe ser legible; un tab recortado a 390px es condición de parada'
    }
  ],
  steps: [
    { kind: 'mark', label: 'default', note: 'first fold completo con el builder vacío y su motivo de CTA' },
    {
      kind: 'mark',
      label: 'builder',
      clipSelector: '[data-capture="seo-keyword-discovery-builder"]',
      note: 'seeds, métodos, alcance y mercado heredado'
    },
    {
      kind: 'mark',
      label: 'cost',
      clipSelector: '[data-capture="seo-keyword-discovery-cost"]',
      note: 'banda de costo: llamadas, filas, estimado, cupo y la consecuencia async'
    },
    {
      kind: 'mark',
      label: 'results',
      clipSelector: '[data-capture="seo-keyword-discovery-results"]',
      note: 'estado honesto de "todavía no hay corrida", no una tabla vacía'
    }
  ]
}
