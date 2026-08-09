// TASK-1307 — la pantalla ancla SIN conjunto elegido.
//
// Es la PRIMERA pantalla real de la superficie, no un caso de borde: nadie llega con un
// `?keywords=` ya puesto la primera vez. Vive en un scenario propio porque el estado se
// define por la AUSENCIA de parámetros — meterlo como paso del scenario poblado obligaría
// a renavegar a mitad del run y el frame quedaría atado al orden de los pasos.
//
// Lo que verifica: que el vacío inicial se lea como una invitación a elegir (no como un
// error), y que el selector siga presente y usable — el riesgo declarado del concepto
// visual aprobado es justamente que la banda de KPI le robe protagonismo al selector.

import type { CaptureScenario } from '../lib/scenario'

const BEREL_SPACE_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

export const scenario: CaptureScenario = {
  name: 'growth-seo-performance-empty',
  route: `/admin/growth/seo/performance?space=${BEREL_SPACE_ID}`,
  viewport: { width: 1440, height: 900 },
  qualityProfile: 'standard',
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="seo-performance-empty-noset"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 700,
    timeout: 30000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta admin interna: la sesión agente debe sostenerse' },
    { kind: 'noErrorBoundary', reason: 'un vacío inicial NO es un error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="seo-performance-set"]',
      reason: 'el selector tiene que estar a la vista: es la acción que resuelve este vacío'
    }
  ],
  steps: [
    {
      kind: 'mark',
      label: 'empty-noset',
      note: 'Estado inicial legítimo: invita a elegir, sin ceros fantasma ni tono de error'
    }
  ]
}
