import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** TASK-1835 — Fixture del harness real (`pnpm auth-server:dev-ui`, 127.0.0.1:19036). */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-rate-limited',
  route: '/error/rate-limited',
  quality: {
    ...consent.quality,
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell', 'id-status', 'id-actions'] }
  },
  steps: [{ kind: 'mark', label: 'runtime-rate-limited', fullPage: true, note: 'Demasiados intentos: espera sugerida y salida.' }]
}
