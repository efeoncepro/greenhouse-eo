import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** TASK-1835 — Fixture del harness real (`pnpm auth-server:dev-ui`, 127.0.0.1:19036). */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-magic-link-confirm',
  route: '/magic-link/confirm',
  quality: {
    ...consent.quality,
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell'] }
  },
  steps: [{ kind: 'mark', label: 'runtime-magic-link-confirm', fullPage: true, note: 'Página intermedia: el GET no consume el enlace, lo consume el POST.' }]
}
