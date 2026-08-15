import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1715 — Application 360 · tab Documentos.
 *
 * No es `mutating`: sólo navega tabs. El POST del reveal NO se dispara — escribiría
 * una entrada de auditoría real por cada captura, contaminando el trail con accesos
 * que nunca ocurrieron. Lo que el frame prueba es lo que la task cambia: que la fila
 * del CV expone un enlace real al visor en vez de un candado decorativo.
 *
 * La postulación es una real con CV `attached`; si se reemplaza, elegir otra con
 * archivo adjunto o el frame pierde su valor probatorio.
 */
export const scenario: CaptureScenario = {
  name: 'task1715-application-documents',
  route: '/agency/hiring/applications/happ-8d653b91-da1c-4451-a02f-12c387a06cf3',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  qualityProfile: 'premium',
  initialHoldMs: 2500,
  finalHoldMs: 600,
  readiness: {
    selector: '[data-capture="hiring-application-tabs"]',
    absentSelectors: ['.MuiSkeleton-root'],
    waitForFonts: true,
    postReadyDelayMs: 600,
    timeout: 30000
  },
  quality: {
    accessibility: {
      enabled: true,
      includeSelector: '[data-capture="hiring-documents-panel"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="hiring-documents-panel"]',
      failOnViolations: true
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          // Arranca en "Ver" para que el Tab caiga en "Descargar" de la MISMA fila:
          // ambos son controles de esta task y ambos declaran anillo de foco. Partir
          // del último enlace del grupo tabulaba hacia el chrome global de Vuexy, cuya
          // falta de anillo es deuda preexistente documentada en TASK-1686 — y este
          // gate debe medir lo que esta task construye, no lo que hereda.
          name: 'cv-actions-focus',
          startSelector: '[data-capture="hiring-document-view"]',
          keys: ['Tab']
        }
      ]
    },
    performance: {
      enabled: true,
      severity: 'warning',
      maxDomNodes: 3600,
      maxRequests: 200,
      maxTransferBytes: 28_000_000,
      maxFcpMs: 15000
    },
    enterpriseRubric: {
      enabled: true,
      includeSelector: '[data-capture="hiring-documents-panel"]',
      // El panel vive dentro del canvas del tab de una vista que ya declara su
      // composición (TASK-355); no introduce una gramática de superficie propia.
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura corre con la identidad declarada' },
    { kind: 'noErrorBoundary', reason: 'el panel resuelve el reader real sin romper la vista' }
  ],
  steps: [
    { kind: 'click', selector: 'button:has-text("Documentos")' },
    { kind: 'wait', selector: '[data-capture="hiring-documents-panel"]', timeout: 10000 },
    {
      kind: 'assert',
      assertion: {
        kind: 'visible',
        selector: '[data-capture="hiring-documents-files"] a[href*="/api/assets/private/"]',
        reason: 'La fila del CV expone la descarga real del asset — no un candado'
      }
    },
    {
      kind: 'mark',
      label: 'documents-panel',
      note: 'Dos grupos: archivos/enlaces sin candado, identidad con reveal auditado'
    },
    {
      kind: 'mark',
      label: 'documents-panel-fullpage',
      fullPage: true,
      note: 'Panel completo — ninguna fila de archivo debe decir "Enmascarado"'
    },
    { kind: 'click', selector: '[data-capture="hiring-document-view"]' },
    // Se espera el DIÁLOGO, no el `iframe`: el Chromium headless del harness reporta
    // `navigator.pdfViewerEnabled === false` igual que un navegador móvil, así que acá
    // se renderiza —correctamente— el estado honesto de "tu navegador no embebe PDF"
    // con sus salidas. Exigir el iframe sería un gate atado al entorno de captura,
    // no al comportamiento del producto.
    { kind: 'wait', selector: '[data-capture="hiring-documents-viewer"]', timeout: 20000 },
    {
      kind: 'mark',
      label: 'viewer-dialog',
      note: 'El CV se lee DENTRO del portal; sin embed, el diálogo lo dice y ofrece salida'
    },
    // Se cierra antes de que corran las sondas de calidad: con el diálogo abierto, el
    // focus trap de MUI intercepta el Tab y la sonda de teclado termina midiendo un
    // centinela del trap en vez de un control real. Además deja capturada la
    // restauración de foco al botón que lo abrió.
    { kind: 'press', key: 'Escape' },
    { kind: 'mark', label: 'viewer-closed-focus-restore', note: 'Esc cierra y el foco vuelve a "Ver"' }
  ]
}
