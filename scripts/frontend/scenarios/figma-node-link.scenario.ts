// Figma node link affordance (TASK-1072) — inline editor over GreenhouseFloatingSurface.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'figma-node-link',
  route: '/design-system/figma-link/mockup',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1400,
  finalHoldMs: 400,
  readiness: {
    selectors: ['[data-capture="figma-link-mockup"]'],
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 500,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'mockup interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'toolbars',
      clipSelector: '[data-capture="figma-link-toolbars"]',
      note: 'Matriz de capability/nodo: diseñador sin nodo, diseñador con nodo, colaborador sin capability'
    },
    {
      kind: 'mark',
      label: 'live-popover',
      clipSelector: '[data-capture="figma-link-live"]',
      note: 'Popover abierto real anclado al “+” rotado (FloatingSurface inlineEditor)'
    },
    {
      kind: 'mark',
      label: 'states',
      clipSelector: '[data-capture="figma-link-states"]',
      note: 'Estados del editor: idle, válido+preview, vinculando, inválido, archivo distinto, cambiar nodo, error'
    }
  ]
}
