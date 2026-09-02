// TASK-1665 — Lente `Descubrir` de Keywords (sub-lente del nodo S3 del master flow EPIC-022).
//
// ⚠️ NO se usa `fullPage`: al capturarlo Playwright redimensiona el viewport, y además un
// screenshot de página completa ESCONDE el overflow horizontal —que es justo lo que hay que
// medir a 390px—. Se mide el DOM (`scrollWidth === clientWidth`) y se capturan markers.
//
// La corrida real gasta presupuesto del proveedor, así que este scenario NO la dispara: captura
// el builder, su preview de costo y el estado honesto de "todavía no hay corrida". Los estados
// async (`queued`/`running`/`partial`) se capturan con fixtures controladas en el slice que los
// implementa — nunca llamando a DataForSEO desde una captura.

import type { CaptureScenario } from '../lib/scenario'

/** Grupo Berel — el Space con módulo SEO contratado y sitio configurado en dev/staging. */
const BEREL_SPACE_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'

/** Corrida `succeeded` de **334 candidatos** con `source_kind='gsc_queries'` (TASK-1693, 2026-08-30).
 * Reemplaza a la de 50: con 50 = el tamaño de página, `nextCursor` era null y la afordancia de
 * paginación no se podía ver en ningún frame. */
const BEREL_DISCOVERY_RUN = 'seokdr-761a9689-fbb1-4af3-8744-940a5d3e9190'

export const scenario: CaptureScenario = {
  name: 'growth-seo-keyword-discovery',
  /**
   * TASK-1693 — se ancla la corrida ya materializada del Space.
   *
   * Sin `discoveryRun` la lente cae en la última corrida, que puede ser la de 10 candidatos y
   * dejaría sin capturar los filtros y el conteo honesto. El escenario NO dispara una corrida
   * (gasta): captura sobre lo ya comprado.
   */
  route: `/admin/growth/seo/keywords?space=${BEREL_SPACE_ID}&view=discovery&discoveryRun=${BEREL_DISCOVERY_RUN}`,
  viewport: { width: 1440, height: 900 },
  qualityProfile: 'premium',
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 600,
  readiness: {
    selector: '[data-capture="seo-keyword-discovery-builder"]',
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]'],
    waitForFonts: true,
    postReadyDelayMs: 800,
    timeout: 30000
  },
  quality: {
    accessibility: { enabled: true, includeSelector: '[data-capture="composition-shell"]', failOnViolations: true },
    layout: { enabled: true, includeSelector: 'main', failOnViolations: false },
    runtime: {
      failOnConsoleError: true,
      failOnPageError: true,
      failOnHydrationWarning: true,
      failOnHttpStatus: true,
      ignoreUrlPatterns: ['/_next/', 'hot-update']
    },
    keyboard: {
      enabled: true,
      failOnViolations: true,
      reducedMotionCheck: true,
      probes: [
        {
          // TASK-1693 — el anillo de foco del selector de fuente se HEREDA de `selectionGroupSx`;
          // esta sonda verifica que la herencia ocurrió y no quedó un grupo sin señal de teclado.
          name: 'discovery-source-focus',
          startSelector: '[data-capture="seo-keyword-discovery-builder"] button',
          keys: ['Tab'],
          requireVisibleFocusRing: true
        },
        {
          name: 'discovery-seeds-focus',
          startSelector: '[data-capture="seo-keyword-discovery-builder"] textarea',
          keys: ['Tab'],
          requireVisibleFocusRing: true
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
    enterpriseRubric: { enabled: true, includeSelector: 'main' }
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta admin interna: la sesión agente debe sostenerse' },
    { kind: 'noErrorBoundary', reason: 'la captura no debe ser un error boundary' },
    {
      kind: 'visible',
      selector: '[data-capture="seo-keyword-discovery-builder"]',
      reason: 'el builder es la superficie de comando: sin él no hay pregunta que hacer'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-keyword-discovery-cost"]',
      reason: 'el costo tiene que estar en el fold: confirmar un gasto sin verlo es el riesgo #1 de la pantalla'
    },
    {
      kind: 'visible',
      selector: '[data-capture="seo-keywords-lens-tabs"]',
      reason: 'la lente activa debe ser legible; un tab recortado a 390px es condición de parada'
    },

    // ── TASK-1693 ────────────────────────────────────────────────────────────────────────
    {
      kind: 'visible',
      selector: '[data-capture="seo-keyword-discovery-filters"]',
      reason:
        'los filtros son la mitad del canvas de decisión: sin ellos el operador sólo puede mirar el orden que le dieron'
    }
  ],
  steps: [
    { kind: 'mark', label: 'default', note: 'first fold completo con el builder vacío y su motivo de CTA' },
    {
      kind: 'mark',
      label: 'builder',
      clipSelector: '[data-capture="seo-keyword-discovery-builder"]',
      note: 'seeds, métodos, alcance y mercado heredado'
    },
    {
      kind: 'mark',
      label: 'cost',
      clipSelector: '[data-capture="seo-keyword-discovery-cost"]',
      note: 'banda de costo: llamadas, filas, estimado, cupo y la consecuencia async'
    },
    {
      kind: 'mark',
      label: 'results',
      clipSelector: '[data-capture="seo-keyword-discovery-results"]',
      note: 'canvas con la corrida materializada y su conteo honesto'
    },

    // ── TASK-1693 — fuentes de seed y filtros ────────────────────────────────────────────
    {
      kind: 'mark',
      label: 'seed-sources',
      clipSelector: '[data-capture="seo-keyword-discovery-builder"]',
      note: 'selector de fuente: las cuatro con su ayuda visible, y la elegida marcada'
    },
    {
      // TASK-1693 — frame dedicado a la afordancia. Sin `clipSelector` propio queda perdida al pie
      // de una tabla de cientos de filas y no sirve como evidencia de que existe.
      kind: 'mark',
      label: 'pagination',
      clipSelector: '[data-capture="seo-keyword-discovery-pagination"]',
      note: 'acción secundaria (outlined) que dice el tamaño real de la página siguiente'
    },
    {
      kind: 'mark',
      label: 'filters',
      clipSelector: '[data-capture="seo-keyword-discovery-filters"]',
      note: 'barra de filtros en desktop; a 390px es el botón Filtros (N) que abre drawer'
    },

    // ── Slice 4 — drawer de candidato ────────────────────────────────────────────────────
    //
    // ⚠️ Estos pasos SÓLO producen frames cuando la corrida del Space ya materializó
    // candidatos; sin candidatos no hay trigger `Detalles` que abrir. El `wait` acotado es
    // deliberado: si no hay fila, el scenario NO debe romper —el estado "sin corrida" es
    // legítimo y ya quedó capturado arriba— pero tampoco debe fingir que capturó el drawer.
    // Lo que nunca puede pasar inadvertido es un drawer que abre y no restaura el foco.
    {
      kind: 'wait',
      // `:visible` NO es cosmético. El trigger existe dos veces por candidato —una en la tabla
      // `md+` y otra en la card `xs`—, porque ambas proyecciones se alternan por CSS y no por
      // `useMediaQuery` (cambiar el árbol React por ancho reintrodujo mismatch de hidratación en
      // esta superficie). Sin el filtro, a 390px el selector engancha el botón de la tabla oculta
      // y la captura espera para siempre por algo que nunca va a ser visible.
      // `nth=1` y no el primero: en el Space de referencia la fila 1 es una keyword YA seguida,
      // y ese caso oculta las dos acciones de gasto (regla "no duplicate CTA"). El candidato
      // `Nuevo` es a la vez el estado dominante y el de mayor riesgo — es donde viven "Declarar
      // objetivo" y "Seguir oportunidad", que comprometen gasto recurrente. La evidencia del
      // caso "Ya seguido" se conserva aparte, en el dossier de la corrida del 2026-08-15.
      selector:
        '[data-capture="seo-keyword-discovery-results"] button[aria-controls="seo-keyword-discovery-candidate-panel"]:visible >> nth=1',
      // 12 s y no 4: con 4 s la espera del `nth=1` corría contra el render de la tabla y el
      // scenario falló de forma intermitente en desktop. Un gate que falla a veces por timing
      // enseña a reintentarlo hasta que pase, que es la forma más rápida de volverlo decorativo.
      timeout: 12000,
      note: 'trigger Detalles de la primera fila; ausente si la corrida aún no materializó candidatos'
    },
    {
      kind: 'click',
      // `:visible` NO es cosmético. El trigger existe dos veces por candidato —una en la tabla
      // `md+` y otra en la card `xs`—, porque ambas proyecciones se alternan por CSS y no por
      // `useMediaQuery` (cambiar el árbol React por ancho reintrodujo mismatch de hidratación en
      // esta superficie). Sin el filtro, a 390px el selector engancha el botón de la tabla oculta
      // y la captura espera para siempre por algo que nunca va a ser visible.
      // `nth=1` y no el primero: en el Space de referencia la fila 1 es una keyword YA seguida,
      // y ese caso oculta las dos acciones de gasto (regla "no duplicate CTA"). El candidato
      // `Nuevo` es a la vez el estado dominante y el de mayor riesgo — es donde viven "Declarar
      // objetivo" y "Seguir oportunidad", que comprometen gasto recurrente. La evidencia del
      // caso "Ya seguido" se conserva aparte, en el dossier de la corrida del 2026-08-15.
      selector:
        '[data-capture="seo-keyword-discovery-results"] button[aria-controls="seo-keyword-discovery-candidate-panel"]:visible >> nth=1',
      note: 'abre el detalle por BOTÓN, no por click de fila: la acción tiene que ser alcanzable por teclado'
    },
    {
      kind: 'mark',
      label: 'candidate-drawer',
      clipSelector: '[data-capture="seo-keyword-discovery-candidate-drawer"]',
      note: 'procedencia, ◑ estimado, ● medido, advertencia y acciones gobernadas con su consecuencia'
    },
    // Las acciones son el ítem 8 del contenido del drawer: quedan BAJO EL FOLD a propósito, para
    // que nadie comprometa gasto antes de leer procedencia y datos. Por eso hay que ir a buscarlas
    // — un frame que sólo muestre la parte visible no prueba que existan ni cómo se ven.
    {
      kind: 'scroll',
      selector: '[data-capture="seo-keyword-discovery-candidate-actions"]',
      scrollBlock: 'center',
      note: 'baja hasta las acciones dentro del propio drawer'
    },
    {
      kind: 'mark',
      label: 'candidate-actions',
      clipSelector: '[data-capture="seo-keyword-discovery-candidate-actions"]',
      note: 'cada acción con su consecuencia escrita; read-only no renderiza CTA de gasto'
    },
    {
      kind: 'press',
      key: 'Escape',
      note: 'sin confirmación abierta, Escape cierra el drawer y el foco vuelve al trigger'
    },
    {
      kind: 'mark',
      label: 'drawer-focus-restore',
      note: 'evidencia del foco restaurado en la fila que abrió el detalle'
    }
  ]
}
