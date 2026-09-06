import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** TASK-1835 — Fixture del harness real (`pnpm auth-server:dev-ui`, 127.0.0.1:19036). */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-step-up-required',
  route: '/error/step-up-required',
  quality: {
    ...consent.quality,
    /** Pantalla terminal: sin control que enfocar (ver `page-contract.test.ts`). */
    keyboard: {
      ...consent.quality?.keyboard,
      probes: [{ name: 'decision-focus', startSelector: '#page-title', keys: ['Tab'], requireVisibleFocusRing: false }]
    },
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell', 'id-actions'] }
  },
  steps: [{ kind: 'mark', label: 'runtime-step-up-required', fullPage: true, note: 'Aviso de verificación adicional con su salida.' }]
}
