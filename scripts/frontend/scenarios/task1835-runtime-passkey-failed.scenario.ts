import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1835 — Estado `passkey_failed`: sólo existe en cliente, así que ningún render del servidor lo
 * produce. El harness responde 405 a `/auth/passkeys/authenticate/*` (sólo permite POST en las dos fixtures del alta), de modo que la ceremonia falla por
 * el mismo carril que en producción y el aviso aparece CON su reintento — distinto del mensaje de
 * dispositivo no compatible, que retira el botón.
 */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-passkey-failed',
  route: '/login',
  quality: {
    ...consent.quality,
    runtime: {
      ...consent.quality?.runtime,
      ignoreUrlPatterns: ['^http://127\\.0\\.0\\.1:19036/auth/passkeys/authenticate/start$'],
      ignoreConsolePatterns: ['^Failed to load resource: the server responded with a status of 405 \\(Method Not Allowed\\)$']
    },
    enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell', 'id-passkey'] }
  },
  steps: [
    { kind: 'click', selector: '[data-login-passkey]' },
    { kind: 'wait', selector: '[data-login-status]', timeout: 10000 },
    { kind: 'mark', label: 'runtime-passkey-failed', fullPage: true, note: 'La ceremonia falla en el harness; el aviso conserva el reintento.' }
  ]
}
