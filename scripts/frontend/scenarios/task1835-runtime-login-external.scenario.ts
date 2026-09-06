import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** TASK-1835 — Fixture del harness real (`pnpm auth-server:dev-ui`, 127.0.0.1:19036). */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-login-external',
  route: '/login/external',
  quality: {
    ...consent.quality,
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell', 'id-passkey', 'id-form'] }
  },
  steps: [{ kind: 'mark', label: 'runtime-login-external', fullPage: true, note: 'Carril externo sin entrada corporativa: passkey y enlace por correo.' }]
}
