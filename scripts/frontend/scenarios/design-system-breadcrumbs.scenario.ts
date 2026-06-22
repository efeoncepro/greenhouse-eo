// Internal Breadcrumbs Lab verification — GreenhouseBreadcrumbs primitive.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-breadcrumbs',
  route: '/design-system/breadcrumbs',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selectors: [
      '[data-capture="breadcrumbs-default-specimen"]',
      '[data-capture="breadcrumbs-shadcn-chevrons-specimen"]',
      '[data-capture="breadcrumbs-shadcn-motion-specimen"]',
      '[data-capture="breadcrumbs-shadcn-overflow-specimen"]'
    ],
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'breadcrumbs-lab',
      fullPage: true,
      note: 'Laboratorio interno dedicado a GreenhouseBreadcrumbs, variants default/compact, chevrons con iconos, kinds semánticos y reglas de uso'
    },
    {
      kind: 'mark',
      label: 'breadcrumbs-chevrons-icons',
      clipSelector: '[data-capture="breadcrumbs-shadcn-chevrons-specimen"]',
      note: 'Port del prompt shadcn: root icon-only accesible, iconos por item y separador chevrons tokenizado'
    },
    { kind: 'sleep', ms: 300 },
    {
      kind: 'mark',
      label: 'breadcrumbs-motion-comfortable',
      clipSelector: '[data-capture="breadcrumbs-shadcn-motion-specimen"]',
      note: 'Port del prompt animado: motion subtle opt-in, iconos por item y hit area comfortable'
    },
    {
      kind: 'mark',
      label: 'breadcrumbs-overflow-closed',
      clipSelector: '[data-capture="breadcrumbs-shadcn-overflow-specimen"]',
      note: 'Port del prompt ellipsis: ancestros intermedios colapsados detrás de un trigger accesible'
    },
    {
      kind: 'scroll',
      selector: '[data-capture="breadcrumbs-shadcn-overflow-specimen"]',
      scrollBlock: 'center'
    },
    {
      kind: 'click',
      selector: '[data-capture="breadcrumbs-shadcn-overflow-specimen"] button[aria-label="More routes"]'
    },
    { kind: 'sleep', ms: 150 },
    {
      kind: 'wait',
      selector: '[data-capture="breadcrumbs-overflow-menu"]',
      timeout: 8000
    },
    {
      kind: 'mark',
      label: 'breadcrumbs-overflow-menu-open',
      clipSelector: '[data-capture="breadcrumbs-overflow-menu"]',
      note: 'Menu actionMenu canónico con Documentation, Building Your Application y Data Fetching como menuitems'
    }
  ]
}
