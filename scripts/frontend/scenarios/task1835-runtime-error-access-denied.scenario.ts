import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** TASK-1835 — Fixture del harness real (`pnpm auth-server:dev-ui`, 127.0.0.1:19036). */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-error-access-denied',
  route: '/error/access-denied',
  quality: {
    ...consent.quality,
    /**
     * Pantalla terminal: por contrato no tiene ningún control (`page-contract.test.ts` la declara
     * `terminal` y afirma que no lleva `<button>`). El probe tabula desde el título hacia la nada y
     * reporta «sin focus ring»: mide un control que no existe. Si alguien le agrega uno, ese test
     * de contrato se pone rojo antes que esta captura. `reducedMotionCheck` se conserva.
     */
    keyboard: {
      ...consent.quality?.keyboard,
      probes: [{ name: 'decision-focus', startSelector: '#page-title', keys: ['Tab'], requireVisibleFocusRing: false }]
    },
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell', 'id-status'] }
  },
  steps: [{ kind: 'mark', label: 'runtime-error-access-denied', fullPage: true, note: 'Sin organización vinculada: se explica y se dice a quién pedirle acceso.' }]
}
