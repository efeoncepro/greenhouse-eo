// TASK-1309 — Auditoría del sitio (nodo S4 del master flow EPIC-022).
//
// Cubre el camino poblado con Grupo Berel, que tiene un `seo_site_audit_runs`
// materializado de verdad (0 críticos / avisos / menores repartidos en varios checks).
//
// ⚠️ Este scenario NO es `mutating`: recorre la lista y abre el drill, que son
// navegaciones por query param. NUNCA debe clickear `[data-capture="seo-audit-run"]`
// ("Correr auditoría") — ese botón encola un crawl OnPage real y le gasta presupuesto al
// cliente. Una captura no puede ser el motivo de un cargo al proveedor.
//
// ⚠️ NO se usa `fullPage`: al capturarlo Playwright redimensiona el viewport y todo lo
// que mide su contenedor queda en tamaño 0 — la evidencia saldría con cards vacías que
// parecen un bug de producto inexistente (lección de TASK-1306/1308). Se cubre con el
// frame del viewport real + clips por región `data-capture`.

import type { CaptureScenario } from '../lib/scenario'

/** Grupo Berel — el Space con site audit materializado en dev/staging. */
const BEREL_SPACE_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

export const scenario: CaptureScenario = {
  name: 'growth-seo-audit',
  route: `/admin/growth/seo/audit?space=${BEREL_SPACE_ID}`,
  viewport: { width: 1440, height: 900 },
  // `premium`: axe bloqueante scopeado a la surface, rubric enterprise, probes de teclado
  // y evidencia de reduced-motion, en desktop Y 390px dentro del mismo scenario.
  qualityProfile: 'premium',
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1600,
  finalHoldMs: 600,
  readiness: {
    // La lista de issues es lo último que depende de datos: si está, el reporte llegó.
    selector: '[data-capture="seo-audit-issues"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 30000
  },
  quality: {
    accessibility: {
      // Scopeado a la surface propia: el shell del dashboard tiene sus hallazgos
      // portal-wide y se audita en su propio dueño.
      enabled: true,
      includeSelector: '[data-capture="composition-shell"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: 'main',
      failOnViolations: false
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
          // El gauge no es focusable (es `role=img`): el primer control real de la lista
          // es el disparador del drill, y es el que tiene que mostrar anillo de foco.
          name: 'issue-drill-focus',
          startSelector: '[data-capture="seo-audit-issues"]',
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
      // Dev server sin caché de compilación: el primer paint puede tardar.
      maxFcpMs: 15000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: 'main'
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta admin interna: la sesión agente debe sostenerse' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="seo-audit-health"]',
      reason: 'la salud es el primer objeto con peso del fold: dice si el sitio está sano antes de listar nada'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-audit-issues"]',
      reason: 'la lista priorizada ES la respuesta a "qué ataco primero"; sin ella la pantalla no decide nada'
    }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'default',
      note: 'Salud (gauge + conteos por severidad + páginas) con freshness explícito, y la lista priorizada debajo'
    },
    {
      kind: 'mark',
      label: 'health',
      clipSelector: '[data-capture="seo-audit-health"]',
      note: 'Arco SVG determinista (no radialBar Apex, que mide 0 en contenedor fluido). El número va como texto, no sólo en el gauge'
    },
    {
      kind: 'mark',
      label: 'issues',
      clipSelector: '[data-capture="seo-audit-issues"]',
      note: 'Lista, NO tabla plana: severidad con icono + PALABRA + color, páginas afectadas y esfuerzo declarado como estimación'
    },
    {
      // Abre el primer grupo de la lista — el más prioritario según el orden.
      kind: 'click',
      selector: '[data-capture="seo-audit-issues"] button'
    },
    { kind: 'sleep', ms: 3000 },
    {
      kind: 'mark',
      label: 'drill',
      clipSelector: '[data-capture="seo-audit-drill"]',
      note: 'Drill in-flow por ?issueGroup=: URLs afectadas del grupo, con el foco puesto en su encabezado'
    }
  ]
}
