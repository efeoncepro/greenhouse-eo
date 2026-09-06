import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** TASK-1835 — Fixture del harness real (`pnpm auth-server:dev-ui`, 127.0.0.1:19036). */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-invitation-confirm',
  route: '/invitation/confirm',
  quality: {
    ...consent.quality,
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell'] }
  },
  steps: [{ kind: 'mark', label: 'runtime-invitation-confirm', fullPage: true, note: 'Aceptar la invitación no abre sesión: envía un enlace al correo.' }]
}
