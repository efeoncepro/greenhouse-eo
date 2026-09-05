import { scenario as consent } from './task1835-runtime-consent.scenario'
import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  ...consent,
  name: 'task1835-runtime-login',
  route: '/login',
  quality: { ...consent.quality, enterpriseRubric: { ...consent.quality?.enterpriseRubric, expectedDataCaptureRegions: ['id-shell'] } },
  steps: [{ kind: 'mark', label: 'runtime-login', fullPage: true, note: 'Renderer real; credenciales y acciones del harness son ficticias.' }]
}
