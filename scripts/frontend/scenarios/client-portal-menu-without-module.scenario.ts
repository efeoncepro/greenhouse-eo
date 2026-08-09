// TASK-1675 — el menú del portal cliente SIN el módulo contratado.
//
// Es el par negativo de `client-portal-menu-with-module`, y no es opcional: la
// captura feliz demuestra que el ítem aparece, no que aparece *sólo a quien
// corresponde*. Esa segunda mitad es la que hace del menú algo confiable.
//
// Persona: `agent-client@greenhouse.efeonce.org`, el cliente sin módulos SEO.
// Alcance honesto de lo que prueba: esta identidad no tiene `organizationId`, así
// que el guard del layout ni siquiera llega al resolver. Demuestra la ausencia
// del ítem y que el menú base queda intacto, pero NO distingue "organización sin
// el módulo" de "usuario sin organización". Ese caso —una organización con
// portal y sin el assignment— lo cubre el unit test de `VerticalMenu`, que
// renderiza con la lista de módulos vacía y verifica que `/growth/seo` no
// aparece. Cuando exista una persona agente de una organización cliente sin SEO,
// esta captura debería moverse a ella.
//
// El scenario es un archivo aparte y no un segundo paso del anterior porque
// `requiresStorageState` se resuelve antes de crear el contexto del navegador:
// una corrida tiene una sola identidad.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'client-portal-menu-without-module',
  route: '/home',
  requiresStorageState: '.auth/storageState.local-client.json',
  // La variante mobile captura el drawer CERRADO, que es el estado inicial real a
  // 390px: el menú no invade el contenido hasta que el usuario lo abre. La
  // evidencia del drawer ABIERTO —donde se verifica que el ítem está y en qué
  // posición— vive en `client-portal-menu-mobile-drawer`, que necesita un paso de
  // apertura y por eso es un archivo aparte: los `steps` son compartidos entre
  // variantes y el toggle sólo existe en el breakpoint mobile.
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
      // Los hallazgos quedan REGISTRADOS en el manifest; lo que no hacen es
      // bloquear. En la variante mobile el nav está legítimamente fuera del
      // viewport (`left: -260`, drawer cerrado) y el gate lo reporta como desborde
      // horizontal — es la geometría correcta del drawer, no un defecto. Los
      // hallazgos de a11y del chrome que aparecen con el drawer abierto tienen
      // dueño: `client-portal-menu-focus-ring`.
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
          // Este probe es además el CONTROL del hallazgo de foco: parte de un ítem
          // base de siempre (`/campanas`) y produce exactamente el mismo resultado
          // que el del ítem de módulo, lo que prueba que la ausencia de anillo de
          // foco es deuda global del chrome Vuexy y no algo que introduzca
          // TASK-1675. Dueño: `client-portal-menu-focus-ring`.
          name: 'base-nav-focus',
          startSelector: '[data-capture="portal-vertical-nav"] a[href="/campanas"]',
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
      kind: 'notVisible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/growth/seo"]',
      reason: 'sin el módulo el ítem no existe — es la prueba del aislamiento per-organización'
    },
    {
      kind: 'visible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/campanas"]',
      reason: 'el menú de quien no tiene módulos queda exactamente como estaba'
    }
  ],
  baseline: {
    surfaceId: 'client-portal-menu-without-module',
    requiredFrameLabels: ['menu-without-module'],
    maxDiffRatio: 0.002
  },
  steps: [
    {
      kind: 'mark',
      label: 'menu-without-module',
      timeout: 15000,
      clipSelector: '[data-capture="portal-vertical-nav"]',
      note: 'Menú del cliente sin módulos contratados: idéntico al de siempre, sin cartel ni upsell'
    }
  ]
}

export default scenario
