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
      failOnViolations: true
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
          name: 'base-nav-focus',
          startSelector: '[data-capture="portal-vertical-nav"] a[href="/campanas"]',
          keys: ['Tab'],
          requireVisibleFocusRing: true
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
      includeSelector: '[data-capture="portal-vertical-nav"]'
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
