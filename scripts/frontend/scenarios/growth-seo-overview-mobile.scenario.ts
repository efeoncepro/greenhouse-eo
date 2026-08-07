// TASK-1306 — SEO Overview en 390px.
//
// Lo que se verifica acá y no en desktop: que el cockpit denso (4 KPIs + curva + 3 cards
// de sidebar) APILE sin producir scroll horizontal de página. El contrato de contención
// dice `scrollWidth == clientWidth`: si el chart o los chips de severidad desbordan, la
// página entera se arrastra en horizontal y el cockpit deja de ser usable en móvil.

import type { CaptureScenario } from '../lib/scenario'

const BEREL_SPACE_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

export const scenario: CaptureScenario = {
  name: 'growth-seo-overview-mobile',
  route: `/admin/growth/seo?space=${BEREL_SPACE_ID}`,
  viewport: { width: 390, height: 844 },
  viewports: [{ name: 'mobile', device: 'iPhone 13' }],
  // `standard`: activa los guards de layout (overflow de página, texto cortado,
  // targets chicos) — el contrato de contención se verifica, no se mira a ojo.
  qualityProfile: 'standard',
  initialHoldMs: 1500,
  finalHoldMs: 600,
  readiness: {
    selector: '[data-capture="seo-overview-kpis"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 900,
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
      note: 'KPIs apilados en 390px sin scroll horizontal de página'
    },
    { kind: 'scroll', selector: '[data-capture="seo-overview-sidebar"]' },
    { kind: 'sleep', ms: 600 },
    {
      kind: 'mark',
      label: 'mobile-sidebar',
      note: 'Salud, movers y cruce AEO apilados al final del stack móvil'
    }
  ]
}
