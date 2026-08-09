// TASK-1675 — el menú del portal cliente con un módulo contratado.
//
// Persona: `agent-berel-client@greenhouse.efeonce.org` (Grupo Berel,
// `org-32333527-…`), la única organización del entorno con el assignment
// `seo_v2` vigente. Con cualquier otra identidad el ítem no existe y la captura
// diagnosticaría como defecto lo que es aislamiento per-organización.
//
// El criterio de éxito es inusual y hay que leerlo así: el after debe ser el
// menú de siempre **más una fila**. Cualquier otro píxel que cambie es un
// defecto, no una mejora — por eso el baseline es la defensa real acá, y no la
// inspección visual.
//
// Su par negativo es `client-portal-menu-without-module`. Capturar sólo éste
// demostraría que el ítem aparece, no que aparece únicamente a quien corresponde.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'client-portal-menu-with-module',
  route: '/home',
  requiresStorageState: '.auth/storageState.local-berel-client.json',
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
          // El ítem nuevo entra en el orden natural de tabulación, igual que sus
          // vecinos: si necesitara manejo de foco propio, dejaría de ser "un
          // MenuItem más".
          //
          // `requireVisibleFocusRing: false` documenta un hallazgo real y NO lo
          // disculpa: NINGÚN ítem del menú tiene anillo de foco (outline/box-shadow)
          // — el estado enfocado se comunica sólo con un cambio de fondo tenue.
          // Verificado como preexistente y global con el escenario negativo, cuyo
          // probe parte de `/campanas` (un ítem base de siempre) y produce el mismo
          // hallazgo. Es deuda del chrome Vuexy, y esta task tiene prohibido
          // tocarlo: su criterio de aceptación visual es "el menú de hoy más una
          // fila". Dueño: `client-portal-menu-focus-ring`. Cuando se arregle, este
          // flag vuelve a `true` en los dos escenarios.
          name: 'module-item-focus',
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
      // El sidebar es chrome de layout, no una superficie de contenido: la propia
      // task declara `Composition Shell: no aplica`. Exigirle el marcador
      // `data-surface-recipe` es un error de categoría — bloquearía por no declarar
      // una gramática de composición que esta región no debe tener.
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura debe correr con la identidad declarada, no con la del agente por defecto' },
    { kind: 'noErrorBoundary', reason: 'el shell del portal no debe caer en error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/growth/seo"]',
      reason: 'Berel tiene el módulo SEO contratado: el ítem debe estar en su menú'
    },
    {
      kind: 'notVisible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/growth/seo/report"]',
      reason: 'el informe es ruta hija — se alcanza por el CTA del dashboard, nunca como ítem propio'
    },
    {
      kind: 'visible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/campanas"]',
      reason: 'la lista base queda intacta: el merge es aditivo'
    }
  ],
  baseline: {
    surfaceId: 'client-portal-menu-with-module',
    requiredFrameLabels: ['menu-with-module'],
    maxDiffRatio: 0.002
  },
  steps: [
    {
      kind: 'mark',
      label: 'menu-with-module',
      timeout: 15000,
      clipSelector: '[data-capture="portal-vertical-nav"]',
      note: 'Menú del cliente con el ítem SEO compuesto desde module_assignments, entre Campañas y Mi Cuenta'
    }
  ]
}

export default scenario
