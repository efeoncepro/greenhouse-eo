import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** Existing renderer, fictional A/B DTO; no auth or commands. */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1844-multi-org-consent',
  route: '/consent/multi-org-v2',
  assertions: [...consent.assertions ?? [], { kind: 'visible', selector: '[data-capture="id-multi-org-authority"]', reason: 'La clase dinámica debe ser visible antes de autorizar.' }],
  steps: [{ kind: 'mark', label: 'multi-org-consent-v2', fullPage: true, note: 'Permiso de lectura dinámico y organizaciones vigentes A/B; fixture visual, sin emisión.' }]
}
