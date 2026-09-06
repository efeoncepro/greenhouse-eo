import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** TASK-1835 — Fixture del harness real (`pnpm auth-server:dev-ui`, 127.0.0.1:19036). */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-login-invalid-email',
  route: '/login/invalid-email',
  quality: {
    ...consent.quality,
    /** El fixture conserva el 400 real de `POST /auth/magic-link/request` con correo inválido:
     *  servirlo como 200 mediría una página que producción no emite. Mismo trato que internal-error. */
    runtime: {
      ...consent.quality?.runtime,
      ignoreUrlPatterns: ['^http://127\\.0\\.0\\.1:19036/login/invalid-email$'],
      ignoreConsolePatterns: ['^Failed to load resource: the server responded with a status of 400 \\(Bad Request\\)$']
    },
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell', 'id-status', 'id-form'] }
  },
  steps: [{ kind: 'mark', label: 'runtime-login-invalid-email', fullPage: true, note: 'Error inline del correo, con el foco recuperable en el campo.' }]
}
