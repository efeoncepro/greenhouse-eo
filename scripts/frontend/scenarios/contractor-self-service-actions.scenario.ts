import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'contractor-self-service-actions',
  route: '/my/contractor/mockup?drawer=composer',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1800,
  finalHoldMs: 600,
  steps: [
    { kind: 'wait', selector: '[data-capture="contractor-submission-composer"]', timeout: 8000 },
    {
      kind: 'mark',
      label: 'submission-composer',
      note: 'Drawer contractor para preparar envio: periodo, monto, boleta/evidencia y confirmacion'
    },
    {
      kind: 'mark',
      label: 'submission-composer-fullpage',
      fullPage: true,
      note: 'Captura larga para validar que el drawer no corta acciones ni uploader'
    }
  ]
}
