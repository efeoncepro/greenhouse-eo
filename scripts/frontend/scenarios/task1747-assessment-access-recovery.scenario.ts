import type { CaptureScenario } from '../lib/scenario'

/**
 * TASK-1747 — Application 360 · tab Evaluación, cluster de recuperación de acceso.
 *
 * Cubre el consumer que reemplazó al enlace efímero: la pantalla ya NO muestra ninguna credencial
 * (el incidente del 2026-08-19 fue exactamente eso — mostraba un enlace que el correo al candidato
 * invalidaba 2,5 minutos después). Lo que se captura es el cluster que ofrece la ACCIÓN.
 *
 * NO es `mutating`: navega y captura. El diálogo de recuperación se abre pero **nunca se
 * confirma** — confirmar emitiría una credencial real contra una candidata real, rotando su acceso
 * y consumiendo su cuota de 24 horas.
 *
 * La candidatura elegida tiene su test en `scored`, así que el cluster captura la rama BLOQUEADA
 * con su causa —"el test ya se rindió, no hay acceso que recuperar"—, que es justo lo que este
 * slice vino a arreglar: antes todos los bloqueos caían en el mismo mensaje genérico.
 *
 * Cobertura que este archivo NO puede dar sin seed determinista, declarada para que nadie la dé por
 * hecha: la revelación única del enlace exige una emisión real, y el estado `provider_blocked`
 * exige una dirección con rebote registrado. Ambos se verifican en la secuencia de staging del
 * Rollout Plan, no acá.
 */
export const scenario: CaptureScenario = {
  name: 'task1747-assessment-access-recovery',
  route: '/agency/hiring/applications/happ-c4440fa8-e643-4814-aaad-5bf475c9e7bf?tab=assessment',
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
      includeSelector: '[data-capture="assessment-scorecard"]',
      failOnViolations: true
    },
    layout: {
      enabled: true,
      includeSelector: '[data-capture="assessment-scorecard"]',
      failOnViolations: true
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          // Ancla en el CONTROL de la tarjeta que precede al cluster, y declara qué debe seguir
          // visible: sin `expectedVisibleSelector` el check de `reduced-motion` NO se ejecuta
          // (`keyboard-gate.ts` lo exige), y el escenario declaraba una cobertura que nunca corrió.
          name: 'recovery-cluster-focus',
          startSelector: '[data-capture="assessment-scorecard"] button',
          expectedVisibleSelector: '[data-capture="assessment-access-recovery"]',
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
      includeSelector: '[data-capture="assessment-scorecard"]',
      // El tab vive dentro del canvas que ya declara su composición (TASK-355).
      requireSurfaceRecipeMarker: false
    }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'la captura corre con la identidad declarada' },
    { kind: 'noErrorBoundary', reason: 'el tab resuelve los readers reales sin romper la vista' },
    {
      // El enlace del incidente era `${origin}/assessment/<token>` pintado en un Typography y en un
      // `Button component='a'`. El selector apunta a ESA forma —cualquier ancla hacia la superficie
      // del candidato— porque una aserción sobre el path nuevo no habría atrapado el bug que esta
      // task existe para cerrar. La garantía de que la credencial no viaja en NINGUNA forma la
      // sostiene el gate de fuente `assessment-credential-source-gate.test.ts`, no una captura:
      // un selector sólo prueba lo que se renderizó en la rama capturada.
      kind: 'notVisible',
      selector: 'a[href*="/assessment/"]',
      reason: 'ninguna ancla lleva a la superficie del candidato: es la forma exacta del incidente'
    }
  ],
  steps: [
    { kind: 'wait', selector: '[data-capture="assessment-scorecard"]', timeout: 10000 },
    {
      kind: 'mark',
      label: 'assessment-tab-full',
      fullPage: true,
      note: 'Tab completo: tarjeta del test con su estado, run de IA y cluster de recuperación'
    },
    {
      kind: 'mark',
      label: 'recovery-cluster',
      clipSelector: '[data-capture="assessment-access-recovery"]',
      note: 'Cluster: acción disponible con cuota, o la causa exacta del bloqueo con su remedio'
    }
  ]
}
