import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** TASK-1835 — Fixture del harness real (`pnpm auth-server:dev-ui`, 127.0.0.1:19036). */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-consent-multiple',
  route: '/consent/multiple',
  quality: {
    ...consent.quality,
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell', 'id-client', 'id-scopes'] }
  },
  steps: [{ kind: 'mark', label: 'runtime-consent-multiple', fullPage: true, note: 'Dos organizaciones resueltas: la persona ve a cuáles alcanza el permiso.' }]
}
