import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1835 — El momento IRREVERSIBLE del alta del segundo factor: secreto, QR, diez códigos de
 * respaldo y la casilla de confirmación. Es la única pantalla del emisor donde una persona ve datos
 * que no volverá a ver nunca, y hasta 2026-09-06 era la única sin mirar: la sección se revela por
 * POST y el harness sólo servía GET, así que el fixture capturaba el botón previo y nada más.
 */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-enroll-secrets',
  route: '/step-up/enroll',
  quality: {
    ...consent.quality,
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell'] }
  },
  steps: [
    { kind: 'click', selector: '[data-step-enroll]' },
    { kind: 'wait', selector: '[data-step-backups]', timeout: 10000 },
    {
      kind: 'mark',
      label: 'runtime-enroll-secrets',
      fullPage: true,
      note: 'Secreto, códigos y confirmación FICTICIOS servidos por el harness; no hay enrolamiento real.'
    }
  ]
}
