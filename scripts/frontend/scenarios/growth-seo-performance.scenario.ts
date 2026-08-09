// TASK-1307 — pantalla ancla del módulo SEO: la evolución en el tiempo de un conjunto.
//
// Cubre el camino poblado con Grupo Berel: keywords trackeadas por rank capture, así que
// la lectura sale de DataForSEO (◑ estimado) y el chart pinta el eje de posición INVERTIDO.
//
// ⚠️ NO se usa `fullPage`: al capturarlo Playwright redimensiona el viewport y los charts
// que miden su contenedor (ECharts en el hero, Recharts en los sparklines de fila) quedan
// con tamaño 0 — la evidencia saldría con las cards vacías y parecería un bug de producto
// que no existe. Se cubre con el frame del viewport real + clips por región `data-capture`.

import type { CaptureScenario } from '../lib/scenario'

/** Grupo Berel — el Space con GSC conectado y serie de rank materializada en dev/staging. */
const BEREL_SPACE_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

/** Keywords reales con seguimiento activo (verificadas contra PG en el sanity del reader). */
const KEYWORDS = ['berel', 'pintura berel', 'berel pinturas'].map(encodeURIComponent).join(',')

export const scenario: CaptureScenario = {
  name: 'growth-seo-performance',
  route: `/admin/growth/seo/performance?space=${BEREL_SPACE_ID}&keywords=${KEYWORDS}&metric=position&device=desktop&range=90`,
  viewport: { width: 1440, height: 900 },
  // `premium`: la pantalla ancla del módulo se cierra con el gate completo — axe
  // bloqueante scopeado a la surface, rubric enterprise, keyboard probes y evidencia de
  // reduced-motion, en desktop Y 390px dentro del mismo scenario.
  qualityProfile: 'premium',
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 600,
  readiness: {
    // El canvas, no la Card: ECharts entra lazy (dynamic ssr:false) y la Card existe
    // ANTES de que el chart pinte — esperar la Card capturaba un lienzo vacío.
    selector: '[data-capture="seo-performance-chart"] canvas',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 1200,
    timeout: 30000
  },
  quality: {
    accessibility: {
      enabled: true,
      // Scopeado a la surface propia: el shell del dashboard (nav, floating triggers)
      // tiene sus hallazgos portal-wide y se audita en su propio dueño.
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
          // El toggle del fallback tabular: alcanzable, con focus ring, y NO navega.
          name: 'chart-table-toggle',
          startSelector: '[data-capture="seo-performance-chart"] button',
          keys: ['Enter'],
          requireVisibleFocusRing: true
        },
        {
          // El selector de set es el primer control del orden de foco (deuda declarada
          // del concepto C: gana en interacción lo que cede en jerarquía visual).
          name: 'set-selector-focus',
          startSelector: '[data-capture="seo-performance-set"] input',
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
      // El invariante de la pantalla, dicho con palabras y no sólo con la geometría del eje.
      selector: 'text=Más abajo en el número es mejor',
      reason: 'la inversión de la posición se declara VISIBLE, no sólo en el aria-label'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-performance-table"]',
      reason: 'la tabla es el fallback tabular obligatorio de la serie'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-performance-set"]',
      reason: 'el selector de set no puede perderse tras la banda KPI (deuda del concepto C)'
    }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'default',
      note: 'Conjunto de 3 keywords: banda KPI + chart hero con Y invertido + tabla de detalle'
    },
    {
      kind: 'mark',
      label: 'set-selector',
      clipSelector: '[data-capture="seo-performance-set"]',
      note: 'Chips removibles del set vigente; ◑ marca las que tienen posición exacta'
    },
    {
      kind: 'mark',
      label: 'kpi-band',
      clipSelector: '[data-capture="seo-performance-kpis"]',
      note: 'Δ30d con semántica invertida: bajar de número pinta verde con flecha abajo'
    },
    {
      kind: 'mark',
      label: 'chart',
      clipSelector: '[data-capture="seo-performance-chart"]',
      note: 'Y invertido (1 arriba), meta top-3, dataZoom, last-value labels, leyenda por forma'
    },
    {
      kind: 'mark',
      label: 'table',
      clipSelector: '[data-capture="seo-performance-table"]',
      note: '7 columnas ordenables + sparkline por fila; sin dato dice "Pendiente", nunca 0'
    },
    { kind: 'click', selector: 'button:has-text("Ver tabla de datos")' },
    { kind: 'sleep', ms: 500 },
    {
      kind: 'mark',
      label: 'chart-table-fallback',
      clipSelector: '[data-capture="seo-performance-chart"]',
      note: 'Fallback tabular del chart: la serie se puede leer sin ver el gráfico'
    }
  ]
}
