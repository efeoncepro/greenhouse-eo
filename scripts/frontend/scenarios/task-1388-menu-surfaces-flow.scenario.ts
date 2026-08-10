// TASK-1388 — flujo interactivo de las 3 superficies (desktop).
//
// Hermano del scenario primario `task-1388-vertical-menu-restructure` (que es
// estático y dual-viewport por contrato del gate). Acá vive lo que exige
// interacción: el acordeón del rail, el dropdown del avatar y la palette ⌘K.
//
// El acordeón NO se construyó en esta task: es el `subMenuOpenBehavior='accordion'`
// default del Menu Vuexy — este scenario lo EVIDENCIA (abrir Comercial colapsa
// Finanzas). El estado abierto/cerrado canónico del chrome es la clase `ts-open`
// del root del submenú (`aria-expanded` no existe en @menu — gap del chrome,
// documentado en el scorecard).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1388-menu-surfaces-flow',
  route: '/home',

  // El único `fill` es la query del ⌘K (filtra client-side contra VIEW_REGISTRY)
  // y el único `press` es Escape: cero writes — safe por construcción.
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1440, height: 900 },
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
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura debe correr con la identidad superadmin declarada' },
    { kind: 'noErrorBoundary', reason: 'el shell del portal no debe caer en error boundary' }
  ],
  steps: [
    {
      kind: 'click',
      selector: '[data-capture="portal-vertical-nav"] a:has-text("Finanzas")',
      note: 'Expandir el dominio Finanzas'
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="portal-vertical-nav"] a:has-text("Tesorería")',
        reason: 'Finanzas expandido muestra sus secciones'
      }
    },
    {
      kind: 'mark',
      label: 'domain-open',
      clipSelector: '[data-capture="portal-vertical-nav"]',
      note: 'Dominio Finanzas expandido dentro de la zona Operación'
    },
    {
      kind: 'click',
      selector: '[data-capture="portal-vertical-nav"] a:has-text("Comercial")',
      note: 'Abrir Comercial: el acordeón debe colapsar Finanzas'
    },
    { kind: 'sleep', ms: 450 },
    {
      kind: 'assert',
      assertion: {
        kind: 'notVisible',
        selector: '[data-capture="portal-vertical-nav"] .ts-submenu-root.ts-open > a:has-text("Finanzas")',
        reason: 'acordeón: abrir Comercial colapsa Finanzas (un dominio abierto a la vez)'
      }
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="portal-vertical-nav"] .ts-submenu-root.ts-open > a:has-text("Comercial")',
        reason: 'el dominio abierto es exactamente Comercial'
      }
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="portal-vertical-nav"] a[href="/agency/sample-sprints"]',
        reason: 'Sample Sprints tiene hogar único: el dominio Comercial'
      }
    },
    {
      kind: 'mark',
      label: 'accordion-swap',
      clipSelector: '[data-capture="portal-vertical-nav"]',
      note: 'Comercial abierto (incluye sección Growth), Finanzas colapsado'
    },
    {
      kind: 'click',
      selector: '[data-capture="avatar-trigger"]',
      note: 'Abrir el dropdown del avatar'
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="avatar-dropdown"] li:has-text("Mi Perfil")',
        reason: 'el avatar es el hogar de lo personal: el bloque /my/* está presente'
      }
    },
    {
      kind: 'mark',
      label: 'avatar-dropdown',
      clipSelector: '[data-capture="avatar-dropdown"]',
      note: 'Dropdown del avatar: header de perfil clickeable + bloque Mi Ficha + salir (sin atajos admin)'
    },
    {
      kind: 'click',
      selector: '[data-capture="avatar-trigger"]',
      note: 'Cerrar el dropdown (toggle)'
    },
    {
      kind: 'click',
      selector: '.gh-cmdk-trigger',
      note: 'Abrir la palette ⌘K consolidada desde su trigger'
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="cmdk-open"]',
        reason: 'la palette ⌘K única abre como dialog modal'
      }
    },
    {
      kind: 'fill',
      selector: '[data-capture="cmdk-open"] input',
      value: 'nómina',
      note: 'Buscar por nombre (cola larga)'
    },
    { kind: 'sleep', ms: 300 },
    {
      kind: 'mark',
      label: 'cmdk-open',
      clipSelector: '[data-capture="cmdk-open"]',
      note: 'Palette ⌘K con resultados filtrados por audiencia'
    },
    { kind: 'press', key: 'Escape' },
    {
      kind: 'assert',
      assertion: {
        kind: 'notVisible',
        selector: '[data-capture="cmdk-open"]',
        reason: 'Esc cierra la palette'
      }
    }
  ]
}

export default scenario
