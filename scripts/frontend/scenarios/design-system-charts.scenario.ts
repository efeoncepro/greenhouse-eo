// Internal Charts Lab verification — GreenhouseChartCard primitive.

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'design-system-charts',
  route: '/design-system/charts',
  viewport: { width: 1280, height: 900 },
  viewports: [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'wide', width: 1600, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1500,
  finalHoldMs: 400,
  readiness: {
    absentSelectors: ['[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 400,
    timeout: 12000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'laboratorio interno bajo dashboard autenticado' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' }
  ],
  quality: {
    allowLoading: true
  },
  steps: [
    {
      kind: 'mark',
      label: 'charts-lab',
      fullPage: true,
      note: 'Laboratorio interno dedicado para GreenhouseChartCard y variants de visualizacion de datos'
    },
    {
      kind: 'mark',
      label: 'funnel-pipeline',
      clipSelector: '[data-capture="greenhouse-funnel-chart-csc-pipeline"]',
      note: 'GreenhouseFunnelChartCard — operationalPipeline/cscPipeline con rail horizontal y diagnosticos por etapa'
    },
    {
      kind: 'mark',
      label: 'funnel-primitive-anatomy',
      clipSelector: '[data-capture="funnel-primitive-anatomy"]',
      note: 'Zonas primitive del funnel: header controls, KPI strip, stage rail, segment, diagnostics grid y Nexa advisor'
    },
    { kind: 'sleep', ms: 5700 },
    {
      kind: 'mark',
      label: 'nexa-context-thinking',
      clipSelector: '[data-capture="greenhouse-funnel-chart-csc-pipeline"]',
      note: 'Nexa context line: mensajes rotativos basados en la etapa seleccionada con GreenhouseThinkingBeat antes del cambio'
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'funnel-stage-hover',
        intent: 'El hover debe abrir tooltip y reforzar el icono sin pintar una placa rectangular sobre el rail SVG',
        action: { kind: 'hover', selector: '[data-stage-id="review"]' },
        frames: [
          {
            atMs: 250,
            label: 'tooltip',
            clipSelector: '[data-capture="greenhouse-funnel-chart-csc-pipeline"]',
            note: 'Hover sobre Revisión: tooltip visible, rail sin overlay rectangular'
          }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: '[data-stage-id="review"]' },
          expected: 'El mismo stage mantiene focus visible y aria-pressed sin depender solo del hover'
        }
      }
    },
    {
      kind: 'interaction',
      interaction: {
        name: 'nexa-compact-tooltip',
        intent: 'La ayuda compacta de Nexa debe explicar la asistencia sin tapar el chart ni el input principal',
        action: { kind: 'hover', selector: '[data-capture="nexa-compact-info"]' },
        frames: [
          {
            atMs: 250,
            label: 'tooltip',
            clipSelector: '[data-capture="greenhouse-funnel-chart-csc-pipeline"]',
            note: 'Tooltip compacto de Nexa: copy breve en desktop/tablet; en mobile el icono conserva aria-label sin invadir el input'
          }
        ],
        keyboardEquivalent: {
          action: { kind: 'focus', selector: '[data-capture="nexa-compact-info"]' },
          expected: 'El tooltip tambien queda disponible por foco de teclado'
        }
      }
    }
  ]
}
