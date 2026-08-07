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
  // `standard`: activa los guards de layout (overflow de página, texto cortado, targets
  // chicos) — el contrato de contención se verifica, no se mira a ojo.
  qualityProfile: 'standard',
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
