// TASK-357 — Product Design mockup for Assigned Team enterprise command portfolio.
// Mockup only: no API calls, no writes, production /equipo remains unchanged.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'assigned-team-command-portfolio-mockup',
  route: '/equipo/mockup',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1200,
  finalHoldMs: 400,
  readiness: {
    selector: '[data-capture="assigned-team-command-portfolio-mockup"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="assigned-team-command-portfolio-mockup"]'
    },
    layout: {
      enabled: true
    },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true
    },
    enterpriseRubric: {
      enabled: true
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup vive bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="assigned-team-command-portfolio-mockup"]',
      reason: 'la superficie enterprise de Equipo asignado debe renderizar'
    },
    { kind: 'visible', selector: 'text=Equipo asignado', reason: 'el mockup debe declarar la capability principal' },
    { kind: 'visible', selector: 'text=Talento asignado', reason: 'el roster inteligente debe estar en el primer fold' }
  ],
  steps: [
    { kind: 'mark', label: 'first-fold', note: 'Hero ejecutivo, KPI strip, roster inteligente, inspector y cards de señales' },
    {
      kind: 'interaction',
      interaction: {
        name: 'talent-selection-inspector',
        intent: 'Verifica que seleccionar talento actualiza el inspector con transición y foco de contexto.',
        action: { kind: 'click', selector: 'button[aria-label="Ver dossier de Laura Méndez"]' },
        frames: [
          { label: 'selection-start', atMs: 80, clipSelector: '[data-capture="assigned-team-roster"]', note: 'Fila seleccionada recibe feedback inmediato' },
          { label: 'inspector-settled', atMs: 360, clipSelector: '[data-capture="assigned-team-inspector"]', note: 'Inspector actualizado con dossier contextual' }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: 'button[aria-label="Ver dossier de María Fernanda Ruiz"]' },
          expected: 'Cada fila del roster tiene nombre accesible y foco visible.'
        },
        reducedMotion: 'skip'
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'health-filter',
        intent: 'Verifica que el filtro de salud cambie el roster sin perder el rail de contexto.',
        action: { kind: 'click', selector: 'button:has-text("Observación")' },
        frames: [
          { label: 'filtered', atMs: 260, clipSelector: '[data-capture="assigned-team-roster"]', note: 'Roster filtrado por señales en observación' }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: 'button:has-text("Crítico")' },
          expected: 'Los filtros tienen foco visible y estado aria-pressed.'
        },
        reducedMotion: 'skip'
      }
    },
    { kind: 'mark', label: 'side-rail', note: 'Health y dossier permanecen visibles junto al roster' },
    { kind: 'scroll', selector: '[data-capture="assigned-team-intelligence-band"]', scrollBlock: 'center', scrollInline: 'nearest' },
    {
      kind: 'mark',
      label: 'intelligence-band',
      clipSelector: '[data-capture="assigned-team-intelligence-band"]',
      note: 'Capability coverage y señales bajan como banda full-width, sin columna principal vacía'
    }
  ]
}
