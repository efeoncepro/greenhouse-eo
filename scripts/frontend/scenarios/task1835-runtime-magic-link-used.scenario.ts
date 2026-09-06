import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** TASK-1835 — Fixture del harness real (`pnpm auth-server:dev-ui`, 127.0.0.1:19036). */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-magic-link-used',
  route: '/magic-link/used',
  quality: {
    ...consent.quality,
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell', 'id-status', 'id-actions'] }
  },
  steps: [{ kind: 'mark', label: 'runtime-magic-link-used', fullPage: true, note: 'Enlace ya usado: mismo título que vencido e inválido.' }]
}
