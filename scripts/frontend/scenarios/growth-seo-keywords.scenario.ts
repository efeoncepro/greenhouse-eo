// TASK-1308 — Oportunidades de keywords (nodo S3 del master flow EPIC-022).
//
// Cubre el camino poblado con Grupo Berel: el striking-distance sale del GSC materializado
// (TASK-1302), así que todo lo que se ve está MEDIDO — el chip "estimado" queda apagado a
// propósito porque el enriquecimiento de mercado (TASK-1300) todavía no aterriza.
//
// ⚠️ NO se usa `fullPage`: al capturarlo Playwright redimensiona el viewport y los charts
// que miden su contenedor (el scatter ECharts) quedan con tamaño 0 — la evidencia saldría
// con la card vacía y parecería un bug de producto que no existe. Se cubre con el frame del
// viewport real + clips por región `data-capture`.

import type { CaptureScenario } from '../lib/scenario'

/** Grupo Berel — el Space con GSC conectado y serie materializada en dev/staging. */
const BEREL_SPACE_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

export const scenario: CaptureScenario = {
  name: 'growth-seo-keywords',
  route: `/admin/growth/seo/keywords?space=${BEREL_SPACE_ID}&window=28`,
  viewport: { width: 1440, height: 900 },
  // `premium`: axe bloqueante scopeado a la surface, rubric enterprise, probes de teclado y
  // evidencia de reduced-motion, en desktop Y 390px dentro del mismo scenario.
  qualityProfile: 'premium',
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 600,
  readiness: {
    // El canvas, no la Card: ECharts entra lazy (dynamic ssr:false) y la Card existe ANTES
    // de que el chart pinte — esperar la Card capturaría un lienzo vacío.
    selector: '[data-capture="seo-keywords-map"] canvas',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 1200,
    timeout: 30000
  },
  quality: {
    accessibility: {
      enabled: true,
      // Scopeado a la surface propia: el shell del dashboard tiene sus hallazgos
      // portal-wide y se audita en su propio dueño.
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
          // El buscador de keyword: primer control del bloque de filtros.
          name: 'keyword-search-focus',
          startSelector: '[data-capture="seo-keywords-filters"] input',
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
      // Dev server sin caché de compilación: el primer paint puede tardar; en prod el
      // presupuesto real lo gobierna el bundle lazy de ECharts (sólo esta ruta lo paga).
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
      selector: '[data-capture="seo-keywords-table"]',
      reason: 'la tabla es el fallback de accesibilidad PERMANENTE del scatter, no un toggle'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-keywords-verdict"]',
      reason: 'la banda de veredicto es el primer objeto con peso del fold: dice qué significan los datos antes de dibujarlos'
    },
    {
      kind: 'visible',
      // La degradación honesta del enriquecimiento, ahora al pie del mapa y no en un banner.
      selector: '[data-capture="seo-keywords-degraded"]',
      reason: 'volumen/dificultad ausentes se NOMBRAN; nunca se pintan en 0'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-keywords-filters"]',
      reason: 'los filtros no pueden perderse debajo del mapa'
    }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'default',
      note: 'Mapa de oportunidad + filtros + tabla densa con la acción recomendada por fila'
    },
    {
      kind: 'mark',
      label: 'verdict',
      clipSelector: '[data-capture="seo-keywords-verdict"]',
      note: 'Lectura dominante redactada desde el reparto real + segmentos que son leyenda y filtro a la vez'
    },
    {
      kind: 'mark',
      label: 'map',
      clipSelector: '[data-capture="seo-keywords-map"]',
      note: 'X posición (izquierda = más cerca de la primera plana), Y impresiones log, tamaño = clics incrementales, forma = acción'
    },
    {
      kind: 'mark',
      label: 'filters',
      clipSelector: '[data-capture="seo-keywords-filters"]',
      note: 'Búsqueda + acción + posición, con el cupo del set monitoreado a la vista'
    },
    {
      kind: 'mark',
      label: 'table',
      clipSelector: '[data-capture="seo-keywords-table"]',
      note: 'Acción en TEXTO (contrato color-independiente) + "Sin dato de mercado", nunca 0'
    },
    {
      kind: 'mark',
      label: 'degraded',
      clipSelector: '[data-capture="seo-keywords-degraded"]',
      note: 'Degradación honesta: el enriquecimiento de mercado se nombra en vez de dejar columnas mudas'
    }
  ]
}
