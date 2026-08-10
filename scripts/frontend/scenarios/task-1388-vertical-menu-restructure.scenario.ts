// TASK-1388 — reequilibrio de la navegación interna: scenario PRIMARIO (gate).
//
// Persona: agente superadmin por defecto (`agent@greenhouse.efeonce.org`) — ve el
// árbol completo, que es exactamente lo que este rediseño reparte: rail en 3 zonas
// (Operación · Administración · Recursos), lo personal `/my/*` rehomed al avatar y
// UNA sola palette ⌘K.
//
// Este archivo es el que referencia el wireframe y valida `ui:visual-gate`: por
// contrato del gate es dual-viewport (desktop 1440 + mobile iPhone 13) y sus steps
// son viewport-agnósticos (a 390px el rail vive en el drawer CERRADO — mismo
// racional que TASK-1675). Las interacciones viven en dos scenarios hermanos:
//   - `task-1388-menu-surfaces-flow` — acordeón + avatar dropdown + ⌘K (desktop).
//   - `task-1388-menu-mobile-drawer` — drawer abierto + fixes a11y (mobile).
//
// Marker del rail: se reusa `portal-vertical-nav` (existente en Navigation.tsx)
// en lugar de crear un `sidebar-internal` duplicado para la misma región.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1388-vertical-menu-restructure',
  route: '/home',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  qualityProfile: 'premium',
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: '[data-capture="portal-vertical-nav"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 30000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="portal-vertical-nav"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="portal-vertical-nav"]',
      // En la variante mobile el rail vive legítimamente fuera del viewport
      // (drawer cerrado, left:-260) y el scanner lo reporta como desborde: es
      // la geometría correcta, no un defecto. El desborde REAL que esta task
      // cierra (8px del panel abierto) se verifica en
      // `task-1388-menu-mobile-drawer` (0 findings en su frame drawer-open).
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
          // TASK-1388 cierra el hallazgo `client-portal-menu-focus-ring`
          // (TASK-1675): ahora todo ítem del rail muestra anillo de foco al
          // tabular, así que el probe lo EXIGE (el flag vuelve a true).
          name: 'rail-item-focus-ring',
          startSelector: '[data-capture="portal-vertical-nav"] a[href="/home"]',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 4200,
      maxRequests: 200,
      maxTransferBytes: 28_000_000,
      maxFcpMs: 15000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="portal-vertical-nav"]',
      // El sidebar es chrome de layout, no superficie de contenido (la task
      // declara `Composition Shell: no aplica`).
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura debe correr con la identidad superadmin declarada' },
    { kind: 'noErrorBoundary', reason: 'el shell del portal no debe caer en error boundary' },
    {
      kind: 'notVisible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/my/profile"]',
      reason: 'rehome TASK-1388: las hojas /my/* ya no viven en el rail interno — su superficie es el avatar'
    },
    {
      kind: 'visible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/home"]',
      reason: 'Home permanece pineado arriba del rail'
    }
  ],
  baseline: {
    surfaceId: 'task-1388-vertical-menu-restructure',
    requiredFrameLabels: ['sidebar-default'],
    maxDiffRatio: 0.002
  },
  steps: [
    {
      kind: 'mark',
      label: 'sidebar-default',
      timeout: 15000,
      clipSelector: '[data-capture="portal-vertical-nav"]',
      note: 'Rail interno en 3 zonas con dominios colapsados (desktop: rail fijo; mobile: contenido del drawer)'
    }
  ]
}

export default scenario
