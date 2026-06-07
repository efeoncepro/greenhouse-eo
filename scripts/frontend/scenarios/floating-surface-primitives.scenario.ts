// TASK-1033 — Greenhouse Floating Surface primitive GVC verification.
// Exercises open/close, keyboard path, role surfaces, collision near the
// viewport edge (commandPreview right-start flips left) and mobile behaviour.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'floating-surface-primitives',
  route: '/admin/design-system/floating-surfaces',
  // Escape/focus are UI-only interactions over an internal lab with no backend
  // writes — safe to capture.
  mutating: true,
  safeForCapture: true,
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    selectors: ['[data-capture="floating-surface-lab-grid"]'],
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    { kind: 'visible', selector: '[data-capture="floating-surface-evidencePeek"]', reason: 'card de la variant evidencePeek montada' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'floating-surface-lab',
      fullPage: true,
      note: 'Galería de las 6 variants oficiales con sus contratos role/interaction/focus'
    },
    // evidencePeek — click, role dialog. Open + capture the managed surface.
    { kind: 'click', selector: '#fs-anchor-evidencePeek' },
    { kind: 'sleep', ms: 450 },
    {
      kind: 'mark',
      label: 'evidence-peek-open',
      clipSelector: '[data-gh-floating-surface="evidencePeek"]',
      note: 'evidencePeek (role dialog) abierto: chips de trazabilidad + open-deeper'
    },
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 500 },
    // richTooltip — read-only, opens on keyboard focus (no focus trap).
    {
      kind: 'interaction',
      interaction: {
        name: 'rich-tooltip-keyboard',
        intent: 'richTooltip read-only debe abrirse por foco de teclado, sin focus trap',
        action: { kind: 'focus', selector: '#fs-anchor-richTooltip' },
        frames: [
          {
            atMs: 400,
            label: 'open',
            clipSelector: '[data-gh-floating-surface="richTooltip"]',
            note: 'richTooltip abierto por foco (keyboard reachable)'
          }
        ]
      }
    },
    { kind: 'press', key: 'Escape' },
    { kind: 'sleep', ms: 400 },
    // commandPreview — right-start near the right edge: flip/shift collision.
    {
      kind: 'interaction',
      interaction: {
        name: 'command-preview-collision',
        intent: 'commandPreview (right-start) cerca del borde derecho debe colisionar y reubicarse',
        action: { kind: 'focus', selector: '#fs-anchor-commandPreview' },
        frames: [
          {
            atMs: 400,
            label: 'collision',
            fullPage: true,
            note: 'commandPreview reubicado por flip/shift sin salirse del viewport'
          }
        ]
      }
    }
  ]
}
