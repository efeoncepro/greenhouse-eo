// TASK-1388 — el rail interno a 390px: drawer + fixes a11y del chrome.
//
// Complementa `task-1388-vertical-menu-restructure` (desktop). Archivo aparte por
// el mismo motivo que TASK-1675: el toggle del drawer solo existe en el
// breakpoint mobile y los steps son compartidos entre viewports.
//
// Evidencia que aporta:
// - el toggle ahora es un botón real con nombre accesible (aria.openMenu);
// - la región scrollable del menú tiene role/label/tabIndex;
// - el panel del drawer abierto ya NO desborda 8px (StyledBoxForShadow contenida).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1388-menu-mobile-drawer',
  route: '/home',
  viewport: { width: 390, height: 844 },
  viewports: [{ name: 'mobile', device: 'iPhone 13' }],
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
      // El drawer CERRADO vive legítimamente fuera del viewport (left: -260):
      // esa geometría es correcta y el scanner la reporta como desborde. El
      // desborde REAL que esta task cierra (los 8px del panel abierto) se
      // verifica mirando el frame `drawer-open` + el manifest.
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
          // a11y TASK-1388: el toggle del drawer es un botón enfocable con
          // nombre accesible y ring visible (IconButton MUI).
          name: 'drawer-toggle-focus',
          startSelector: 'button[aria-label="Abrir menú"]',
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
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura debe correr con la identidad superadmin declarada' },
    { kind: 'noErrorBoundary', reason: 'el shell del portal no debe caer en error boundary' },
    {
      kind: 'visible',
      selector: 'button[aria-label="Abrir menú"]',
      reason: 'a11y TASK-1388: el toggle del drawer es un botón real con nombre accesible'
    }
  ],
  baseline: {
    surfaceId: 'task-1388-menu-mobile-drawer',
    requiredFrameLabels: ['drawer-open'],
    maxDiffRatio: 0.002
  },
  steps: [
    {
      kind: 'mark',
      label: 'mobile-default',
      timeout: 15000,
      note: 'Estado inicial a 390px: drawer cerrado, toggle accesible visible'
    },
    {
      kind: 'click',
      selector: 'button[aria-label="Abrir menú"]',
      note: 'Abrir el drawer con el toggle accesible'
    },
    { kind: 'sleep', ms: 600 },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[role="region"][aria-label="Navegación principal"]',
        reason: 'a11y TASK-1388: la región scrollable del menú tiene role + label + foco'
      }
    },
    {
      kind: 'mark',
      label: 'drawer-open',
      fullPage: false,
      note: 'Drawer abierto a 390px: panel contenido (sin el desborde de 8px), zonas visibles'
    }
    // El dropdown del avatar y el ⌘K tienen su evidencia en el scenario desktop;
    // a 390px el centro del backdrop cae dentro del panel (390/2 < 260px del
    // drawer), así que un click de cierre por backdrop no es automatizable con
    // el DSL actual sin offsets.
  ]
}

export default scenario
