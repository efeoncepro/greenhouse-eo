// TASK-1686 — el rail del colaborador puro a 390px (drawer abierto).
//
// Complementa `task-1686-pure-collaborator-navigation` (primario, estático):
// el toggle del drawer solo existe en el breakpoint mobile, así que abrirlo es
// un scenario aparte (mismo racional que TASK-1388/1675). Evidencia: el drawer
// del colaborador muestra /my + Mi Ficha SIN rutas cliente, contenido al borde
// (fix 8px de TASK-1388) y con la región scrollable accesible.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1686-pure-collaborator-mobile-drawer',
  route: '/my',
  requiresStorageState: '.auth/storageState.local-collaborator.json',
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
      // El drawer CERRADO vive fuera del viewport (left:-260) por diseño; el
      // desborde real (8px del panel abierto) quedó cerrado en TASK-1388 y se
      // verifica mirando el frame drawer-open + su manifest.
      failOnViolations: false
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,

      // Mismo contrato que el scenario primario: 422 canónico de la persona
      // agente sin member enlazado (estado diseñado, no defecto).
      ignoreUrlPatterns: ['/_next/', 'hot-update', '/api/my/dashboard'],
      ignoreConsolePatterns: ['status of 422']
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
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
    { kind: 'noLoginRedirect', reason: 'la captura debe correr con la identidad collaborator declarada' },
    { kind: 'noErrorBoundary', reason: 'el shell del portal no debe caer en error boundary' },
    {
      kind: 'visible',
      selector: 'button[aria-label="Abrir menú"]',
      reason: 'el toggle accesible del drawer (TASK-1388) está presente para el colaborador'
    },
    {
      kind: 'notVisible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/proyectos"]',
      reason: 'cero rutas cliente en el drawer del colaborador'
    }
  ],
  baseline: {
    surfaceId: 'task-1686-pure-collaborator-mobile-drawer',
    requiredFrameLabels: ['drawer-open'],
    maxDiffRatio: 0.002
  },
  steps: [
    {
      kind: 'mark',
      label: 'mobile-default',
      timeout: 15000,
      note: 'Estado inicial del colaborador a 390px: drawer cerrado, toggle accesible visible'
    },
    {
      kind: 'click',
      selector: 'button[aria-label="Abrir menú"]',
      note: 'Abrir el drawer'
    },
    { kind: 'sleep', ms: 600 },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[role="region"][aria-label="Navegación principal"]',
        reason: 'la región scrollable del menú sigue accesible por teclado (TASK-1388)'
      }
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="portal-vertical-nav"] a[href="/my/profile"]',
        reason: 'el drawer del colaborador muestra su Mi Ficha'
      }
    },
    {
      kind: 'mark',
      label: 'drawer-open',
      note: 'Drawer del colaborador abierto: /my + Mi Ficha, contenido al borde, sin rutas cliente'
    }
  ]
}

export default scenario
