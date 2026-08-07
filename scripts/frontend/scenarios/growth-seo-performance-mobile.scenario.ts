// TASK-1307 — pantalla ancla en 390px.
//
// Lo que se verifica acá y no en desktop: que la superficie más densa del módulo (banda de
// 4 KPI + chart hero + tabla de 7 columnas con sparkline) APILE sin producir scroll
// horizontal de PÁGINA. El contrato de contención dice `scrollWidth == clientWidth`: la
// tabla densa tiene que arrastrarse dentro del scroll interno de `DataTableShell`, no
// empujar el documento — si empuja, la pantalla deja de ser usable en móvil.

import type { CaptureScenario } from '../lib/scenario'

const BEREL_SPACE_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

const KEYWORDS = ['berel', 'pintura berel', 'berel pinturas'].map(encodeURIComponent).join(',')

export const scenario: CaptureScenario = {
  name: 'growth-seo-performance-mobile',
  route: `/admin/growth/seo/performance?space=${BEREL_SPACE_ID}&keywords=${KEYWORDS}&metric=position&device=mobile&range=90`,
  viewport: { width: 390, height: 844 },
  viewports: [{ name: 'mobile', device: 'iPhone 13' }],
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
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'mobile-top',
      note: 'Toolbar, tabs, selector y banda KPI apilados en 390px sin scroll horizontal'
    },
    { kind: 'scroll', selector: '[data-capture="seo-performance-chart"]' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'mobile-chart',
      note: 'El chart condensa ejes y leyenda; el dataZoom sigue alcanzable'
    },
    { kind: 'scroll', selector: '[data-capture="seo-performance-table"]' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'mobile-table',
      note: 'Tabla densa con scroll INTERNO: se arrastra sola, no empuja la página'
    }
  ]
}
