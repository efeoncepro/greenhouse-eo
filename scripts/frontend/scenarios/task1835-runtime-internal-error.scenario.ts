import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

/** The fixture intentionally retains the real HTTP 400; browser verification asserts that status. */
export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-internal-error',
  route: '/internal-error',
  quality: {
    ...consent.quality,
    runtime: {
      ...consent.quality?.runtime,
      ignoreUrlPatterns: ['^http://127\\.0\\.0\\.1:19036/internal-error$'],
      ignoreConsolePatterns: ['^Failed to load resource: the server responded with a status of 400 \\(Bad Request\\)$']
    },
    enterpriseRubric: {
      ...consent.quality?.enterpriseRubric,
      expectedDataCaptureRegions: ['id-shell', 'auth-internal-login-error']
    }
  },
  steps: [
    {
      kind: 'mark',
      label: 'runtime-internal-error',
      fullPage: true,
      note: 'Real failure renderer, fictional upstream rejection, HTTP 400 preserved; no authentication.'
    }
  ]
}
