// TASK-1675 — evidencia mobile del menú module-driven, con el drawer ABIERTO.
//
// Es un escenario aparte y no un viewport más de `client-portal-menu-with-module`
// por una razón medida: a 390px el sidebar vive en `left: -260`, fuera del
// viewport, hasta que alguien lo abre. Capturarlo sin abrirlo produce ocho
// hallazgos de "elemento fuera del viewport horizontal" que no son un defecto del
// producto sino del escenario — está midiendo un panel oculto. Y como los `steps`
// son compartidos entre variantes, no hay forma de abrir el drawer sólo en mobile
// dentro del mismo archivo.
//
// Lo que prueba: que el ítem del módulo existe también en el drawer, en la misma
// posición relativa, y que abrirlo no introduce scroll horizontal.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'client-portal-menu-mobile-drawer',
  route: '/home',
  requiresStorageState: '.auth/storageState.local-berel-client.json',
  // Abre el drawer del nav. No escribe backend ni dispara commands.
  mutating: true,
  safeForCapture: true,
  viewport: { width: 390, height: 844 },
  viewports: [{ name: 'mobile', device: 'iPhone 13' }],
  qualityProfile: 'premium',
  initialHoldMs: 1200,
  finalHoldMs: 500,
  readiness: {
    selector: 'main',
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
      // Los hallazgos quedan REGISTRADOS en el manifest; lo que no hacen es
      // bloquear una task que tiene prohibido tocar el chrome. Con el drawer
      // abierto quedan dos, y ninguno lo introduce el ítem de módulo:
      //   1. `layout_scroll_region_unlabeled` — a 390px el `ScrollWrapper` del menú
      //      es un `div` con `overflow-y-auto` sin role, label ni `tabIndex`, así
      //      que un usuario de teclado no puede alcanzar la región scrollable.
      //      Existe desde antes y afecta al menú entero, cliente e interno.
      //   2. Desborde horizontal de 8px del propio panel (`left: -8`).
      // Dueño de los dos: `client-portal-menu-focus-ring` (a11y del chrome del
      // menú lateral). Al cerrarse, esto vuelve a `true`.
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
          // Ver el motivo de `requireVisibleFocusRing: false` en
          // `client-portal-menu-with-module`: deuda global del chrome, con dueño.
          name: 'module-item-focus-mobile',
          startSelector: '[data-capture="portal-vertical-nav"] a[href="/growth/seo"]',
          keys: ['Tab'],
          requireVisibleFocusRing: false
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 3600,
      maxRequests: 200,
      maxTransferBytes: 28_000_000,
      maxFcpMs: 15000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="portal-vertical-nav"]',
      // Chrome de layout, no superficie de contenido — ver el escenario par.
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura debe correr con la identidad declarada' },
    { kind: 'noErrorBoundary', reason: 'el shell del portal no debe caer en error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/growth/seo"]',
      reason: 'el ítem del módulo también existe en el drawer, no sólo en desktop'
    }
  ],
  baseline: {
    surfaceId: 'client-portal-menu-mobile-drawer',
    requiredFrameLabels: ['menu-with-module-mobile'],
    maxDiffRatio: 0.002
  },
  steps: [
    // El toggle del drawer es un `<i class="tabler-menu-2">` del navbar: sólo se
    // renderiza cuando se alcanzó el breakpoint mobile.
    { kind: 'click', selector: 'i.tabler-menu-2' },
    { kind: 'sleep', ms: 600 },
    { kind: 'wait', selector: '[data-capture="portal-vertical-nav"] a[href="/growth/seo"]', timeout: 15000 },
    {
      kind: 'mark',
      label: 'menu-with-module-mobile',
      timeout: 15000,
      clipSelector: '[data-capture="portal-vertical-nav"]',
      note: 'Drawer del nav abierto a 390px con el ítem SEO en su misma posición relativa'
    }
  ]
}

export default scenario
