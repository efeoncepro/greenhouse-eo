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
          // El ítem nuevo entra en el orden natural de tabulación y muestra el
          // mismo anillo de foco que sus vecinos: si necesitara manejo propio,
          // dejaría de ser "un MenuItem más".
          name: 'module-item-focus',
          startSelector: '[data-capture="portal-vertical-nav"] a[href="/growth/seo"]',
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
