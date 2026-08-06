// TASK-1306 — SEO Overview cockpit (EPIC-022 · S1 del master UI flow).
//
// Cubre el camino poblado: Space con Search Console conectado y datos materializados
// (Grupo Berel). Los estados vacíos/denegados viven en scenarios propios porque dependen
// de OTRO Space (Efeonce, sin conexión) — forzarlos en el mismo run obligaría a mutar
// datos, y un scenario de captura nunca debe escribir.
//
// `fullPage` porque el cockpit no cabe en 900px de alto: sin él la evidencia cortaría el
// sidebar (salud/movers/cruce AEO), que es justo donde vive la degradación honesta.

import type { CaptureScenario } from '../lib/scenario'

/** Grupo Berel — el Space con GSC conectado y serie materializada en dev/staging. */
const BEREL_SPACE_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

export const scenario: CaptureScenario = {
  name: 'growth-seo-overview',
  route: `/admin/growth/seo?space=${BEREL_SPACE_ID}`,
  viewport: { width: 1440, height: 900 },
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
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    {
      kind: 'visible',
      selector: 'text=Medido · GSC',
      reason: 'la leyenda medido/estimado es persistente (contrato de honestidad §10.5)'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-overview-sidebar"]',
      reason: 'salud + movers + cruce AEO deben renderizar (o degradar), nunca desaparecer'
    }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'default-full',
      fullPage: true,
      note: 'Cockpit poblado: KPIs norte + curva de visibilidad + sidebar de salud/movers/AEO'
    },
    {
      kind: 'mark',
      label: 'kpis',
      clipSelector: '[data-capture="seo-overview-kpis"]',
      note: 'Posición promedio con semántica invertida (bajar de número = mejorar)'
    },
    {
      kind: 'mark',
      label: 'sidebar',
      clipSelector: '[data-capture="seo-overview-sidebar"]',
      note: 'Cada región degrada por separado: "Pendiente: {razón}", nunca un cero fabricado'
    },
    { kind: 'click', selector: 'button:has-text("Ver tabla de datos")' },
    { kind: 'sleep', ms: 400 },
    {
      kind: 'mark',
      label: 'evolution-table-fallback',
      clipSelector: '[data-capture="seo-overview-evolution"]',
      note: 'Fallback tabular del chart: la serie se puede leer sin ver el gráfico'
    }
  ]
}
