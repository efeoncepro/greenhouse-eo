import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'nexa-floating-hover-glow',
  route: '/design-system/nexa-brand',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1200,
  assertions: [
    { kind: 'noLoginRedirect', reason: 'design system route requires authenticated agent session' },
    { kind: 'noErrorBoundary', reason: 'hover glow evidence should not capture an app error' }
  ],
  steps: [
    { kind: 'wait', selector: '[data-capture="nexa-floating-trigger"]', timeout: 8000 },
    {
      kind: 'mark',
      label: 'idle',
      note: 'FAB sin hover: no debe mostrar spectrum beam persistente.'
    },
    { kind: 'hover', selector: '[data-capture="nexa-floating-trigger"]' },
    { kind: 'sleep', ms: 320 },
    {
      kind: 'mark',
      label: 'hover-glow',
      note: 'Hover/focus affordance: spectrum beam brand aparece detrás del FAB.'
    },
    { kind: 'hover', selector: '[data-capture="nexa-brand-primary-specimen"]' },
    { kind: 'sleep', ms: 850 },
    {
      kind: 'mark',
      label: 'after-hover-fade',
      note: 'Mouse fuera: el spectrum beam debe apagarse con fade, sin quedar pegado.'
    }
  ]
}
