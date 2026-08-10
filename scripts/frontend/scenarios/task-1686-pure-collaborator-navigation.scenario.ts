// TASK-1686 — navegación del colaborador puro: scenario PRIMARIO (gate).
//
// Persona: `agent-collaborator@greenhouse.efeonce.org` (routeGroups=['my'],
// rol `collaborator` — 27 vistas, CERO `cliente.*`). Con cualquier otra
// identidad la captura diagnosticaría como defecto lo que es proyección por
// audiencia. NUNCA el superadmin.
//
// Qué evidencia: el rail del colaborador es su índice personal (/my + Mi
// Ficha, sin rutas ni secciones cliente, sin heading "Mi Cuenta" vacío), el
// avatar es identidad + Mi Perfil + salir (sin shortcuts cliente), y el ⌘K
// solo ofrece destinos de su audiencia. Dual-viewport por contrato del gate;
// todos los steps son viewport-agnósticos (avatar y ⌘K viven en la topbar,
// visible en ambos). El drawer mobile vive en
// `task-1686-pure-collaborator-mobile-drawer` (el toggle solo existe a 390px).

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'task-1686-pure-collaborator-navigation',
  route: '/my',

  // El único step gated es `press Escape` para cerrar la palette ANTES de los
  // probes de teclado (si queda abierta, su focus trap se traga el Tab de los
  // probes). Cero writes — safe por construcción.
  mutating: true,
  safeForCapture: true,
  requiresStorageState: '.auth/storageState.local-collaborator.json',
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
      // En mobile el rail vive legítimamente fuera del viewport (drawer
      // cerrado, left:-260) y el scanner lo reporta como desborde — geometría
      // correcta, no defecto (mismo racional que TASK-1388/1675).
      failOnViolations: false
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,

      // `/api/my/dashboard` responde 422 canónico (`member_identity_not_linked`)
      // para la persona agente, que NO tiene fila en team_members POR DISEÑO
      // (contrato documentado en tests/e2e/smoke/my-payment-profile.spec.ts).
      // Es un estado diseñado de esa identidad, no un defecto de la superficie.
      ignoreUrlPatterns: ['/_next/', 'hot-update', '/api/my/dashboard'],
      ignoreConsolePatterns: ['status of 422']
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          // El focus ring del rail (TASK-1388) también cubre al colaborador.
          name: 'collaborator-rail-focus-ring',
          startSelector: '[data-capture="portal-vertical-nav"] a[href="/my"]',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        },
        {
          // TASK-1686 (a11y) — el trigger del avatar es un botón real
          // enfocable con ring visible.
          name: 'avatar-trigger-focus',
          startSelector: '[data-capture="avatar-trigger"]',
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
      // Chrome de layout, no superficie de contenido (Composition Shell: no aplica).
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura debe correr con la identidad collaborator declarada, no la del agente por defecto' },
    { kind: 'noErrorBoundary', reason: 'el shell del portal no debe caer en error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/my"]',
      reason: 'el rail del colaborador abre con su home personal'
    },
    {
      kind: 'visible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/my/profile"]',
      reason: 'Mi Ficha vive en el rail del colaborador (guardrail TASK-1388: su rail ES su contenido)'
    },
    {
      kind: 'notVisible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/proyectos"]',
      reason: 'cero rutas cliente en el rail del colaborador (TASK-1686)'
    },
    {
      kind: 'notVisible',
      selector: '[data-capture="portal-vertical-nav"] a[href="/updates"]',
      reason: 'las colecciones de Mi Cuenta cliente no se construyen para el colaborador'
    }
  ],
  baseline: {
    surfaceId: 'task-1686-pure-collaborator-navigation',
    requiredFrameLabels: ['collaborator-rail'],
    maxDiffRatio: 0.002
  },
  steps: [
    {
      kind: 'mark',
      label: 'collaborator-rail',
      timeout: 15000,
      clipSelector: '[data-capture="portal-vertical-nav"]',
      note: 'Rail del colaborador puro: /my + Mi Ficha, sin rutas/secciones cliente ni heading vacío'
    },
    {
      kind: 'click',
      selector: '[data-capture="avatar-trigger"]',
      note: 'Abrir el dropdown del avatar (botón semántico)'
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="avatar-dropdown"] li:has-text("Mi Perfil")',
        reason: 'el avatar del colaborador ofrece Mi Perfil'
      }
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'notVisible',
        selector: '[data-capture="avatar-dropdown"] li:has-text("Proyectos")',
        reason: 'cero shortcuts cliente en el avatar del colaborador (antes se renderizaban sin gating)'
      }
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'notVisible',
        selector: '[data-capture="avatar-dropdown"] li:has-text("Mis Asignaciones")',
        reason: 'sin espejo de las 13 hojas: el rail es el índice personal'
      }
    },
    {
      kind: 'mark',
      label: 'collaborator-avatar',
      clipSelector: '[data-capture="avatar-dropdown"]',
      note: 'Avatar del colaborador: identidad + Mi Perfil + salir'
    },
    {
      kind: 'click',
      selector: '[data-capture="avatar-trigger"]',
      note: 'Cerrar el dropdown (toggle)'
    },
    {
      kind: 'click',
      selector: '.gh-cmdk-trigger',
      note: 'Abrir la palette ⌘K'
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="cmdk-open"]',
        reason: 'la palette única abre para el colaborador'
      }
    },
    {
      kind: 'assert',
      assertion: {
        kind: 'notVisible',
        selector: '[data-capture="cmdk-open"] [cmdk-item]:has-text("Proyectos")',
        reason: 'el ⌘K filtra por audiencia: cero destinos cliente para el colaborador'
      }
    },
    { kind: 'sleep', ms: 300 },
    {
      kind: 'mark',
      label: 'collaborator-cmdk',
      clipSelector: '[data-capture="cmdk-open"]',
      note: 'Palette ⌘K del colaborador: solo destinos de su audiencia (mi_ficha + plataforma concedida)'
    },
    { kind: 'press', key: 'Escape' },
    {
      kind: 'assert',
      assertion: {
        kind: 'notVisible',
        selector: '[data-capture="cmdk-open"]',
        reason: 'Esc cierra la palette (y deja el foco libre para los probes de teclado)'
      }
    }
  ]
}

export default scenario
