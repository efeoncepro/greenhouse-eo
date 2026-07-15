/**
 * Catálogo `deck-axis` — la TABLA de resolvers del deck (TASK-1393 Slice 2).
 *
 * Un `resolver` traduce un valor SEMÁNTICO del slot (`kind: "visibility"`) a una decisión de
 * PRESENTACIÓN (qué ícono Solar pintar). Es una tabla, no un juicio: por eso vive en el lado
 * determinista, y no en el chapter-author.
 *
 * El chapter-author dice QUÉ es cada cosa; el deck decide CÓMO se ve. Si el autor pudiera elegir el
 * ícono, dos láminas del mismo tipo terminarían con iconografías distintas — justo la incoherencia
 * que el molde existe para evitar.
 *
 * Vive en el CATÁLOGO, no en el motor: `stat-goal-icon` o `four-pillars` son semántica del deck
 * AXIS. El motor sólo conoce el contrato (`ResolverRegistry`) y el dispatch fail-closed
 * (`resolveFieldDirective` en `resolver-contract.ts`). Un carrusel declara su propia tabla sin
 * tocar el motor.
 */

import type { FieldEffect, ResolverRegistry } from '../../resolver-contract'
import { solarIconPath } from './solar-icons'


const SOLAR = (name: string) => `assets/solar/${name}-bold.svg`

/**
 * Umbrales de la escalera de madurez. Son los MISMOS que `severityFromScore` del informe de AI
 * Visibility (`report-artifact/model.ts`): la escalera del deck y la del informe tienen que decir
 * lo mismo del mismo número, o la propuesta se contradice con su propio anexo.
 */
const OPTIMAL_THRESHOLD = 70
const ATTENTION_THRESHOLD = 45

const SEVERITY_LABEL: Record<'optimo' | 'atencion' | 'critico', string> = {
  optimo: 'Óptimo',
  atencion: 'Atención',
  critico: 'Crítico'
}

/**
 * `stat-goal-icon` — los 5 peldaños de la escalera Be X → su ícono.
 *
 * El mapa refleja el HTML de `StatSplit`, que ya trae un ícono por goal. Acá se hace explícito y
 * gobernable: el ícono lo decide el `kind`, no el orden en que el autor escribió la lista.
 */
const STAT_GOAL_ICON: Record<string, string> = {
  visibility: SOLAR('target'),
  citability: SOLAR('ranking'),
  coherence: SOLAR('shield-check'),
  learning: SOLAR('soundwave'),
  growth: SOLAR('chart-2')
}

/**
 * `four-pillars-icon-and-tone` — cada frente del método define DOS cosas: su ícono y su tono.
 *
 * El tono es la clase del `<article class="pillar ai|data|method|human">`, que el CSS de la
 * plantilla usa para colorear. Los íconos son los que el prototipo ya trae por pilar — no se
 * inventan acá, se leen del HTML canónico.
 */
const FOUR_PILLARS = ['ai', 'data', 'method', 'human'] as const

const FOUR_PILLAR_ICON: Record<string, string> = {
  ai: SOLAR('cpu'),
  data: SOLAR('chart-square'),
  method: SOLAR('book-2'),
  human: SOLAR('users-group-rounded')
}

/**
 * Íconos de las plantillas que usan `<svg><path>` inline (no `<img src>`): acá va el NOMBRE del
 * ícono Solar; el resolver le pide su path a `solar-icons.ts`.
 */
const TEAM_ROLE_ICON: Record<string, string> = {
  lead: 'star',
  strategy: 'target',
  content: 'pen-new-square',
  technical: 'settings',
  data: 'chart-2'
}

const METRICS_KPI_ICON: Record<string, string> = {
  visibility: 'target',
  engines: 'cpu',
  authority: 'ranking',
  gap: 'chart-2'
}

const CARD_GRID_ICON: Record<string, string> = {
  search: 'magnifer',
  conversation: 'chat-square',
  authoring: 'pen-new-square',
  data: 'database',
  measurement: 'chart-square',
  governance: 'shield-check'
}

const DAILY_WORKFLOW_TONES = ['done', 'active', 'next'] as const
const CONTENT_ANATOMY_CHECK_TONES = ['ready', 'review', 'evidence'] as const
const CONTENT_ANATOMY_LAYER_TONES = ['research', 'reader', 'machine'] as const

const CONTENT_ANATOMY_CLUSTER_WIDTH: Record<string, string> = {
  high: '92%',
  medium: '72%',
  focused: '56%'
}

type ToolLogoPlate = 'light' | 'dark' | 'brand-dark'

const TOOL_LOGO: Record<string, { src: string; label: string; plate: ToolLogoPlate; accentRgb?: string }> = {
  notion: { src: 'assets/tools/notion-isotype.svg', label: 'Notion', plate: 'light' },
  frameio: { src: 'assets/tools/frameio-isotype.svg', label: 'Frame.io', plate: 'light' },
  'adobe-illustrator': {
    src: 'assets/tools/adobe-illustrator-isotype.svg',
    label: 'Adobe Illustrator',
    plate: 'brand-dark',
    accentRgb: '255, 154, 0'
  },
  'adobe-photoshop': { src: 'assets/tools/adobe-photoshop-isotype.svg', label: 'Adobe Photoshop', plate: 'dark' },
  'adobe-premiere-pro': {
    src: 'assets/tools/adobe-premiere-isotype.svg',
    label: 'Adobe Premiere Pro',
    plate: 'dark'
  },
  'adobe-after-effects': {
    src: 'assets/tools/adobe-after-effects-isotype.svg',
    label: 'Adobe After Effects',
    plate: 'dark'
  },
  'adobe-express': { src: 'assets/tools/adobe-express-isotype.svg', label: 'Adobe Express', plate: 'dark' },
  'microsoft-365': { src: 'assets/tools/microsoft-365-isotype.svg', label: 'Microsoft 365', plate: 'light' },
  semrush: { src: 'assets/tools/semrush-isotype.svg', label: 'Semrush', plate: 'dark' },
  ahrefs: { src: 'assets/tools/ahrefs-isotype.svg', label: 'Ahrefs', plate: 'light' },
  'brand-visibility-grader': {
    src: 'assets/tools/brand-visibility-grader-isotype.svg',
    label: 'Brand Visibility Grader',
    plate: 'dark'
  },
  'screaming-frog': { src: 'assets/tools/screaming-frog-isotype.svg', label: 'Screaming Frog', plate: 'light' },
  shutterstock: { src: 'assets/tools/shutterstock-isotype.svg', label: 'Shutterstock', plate: 'light' },
  'adobe-stock': { src: 'assets/tools/adobe-isotype.svg', label: 'Adobe Stock', plate: 'light' },
  'envato-elements': { src: 'assets/tools/envato-isotype.svg', label: 'Envato Elements', plate: 'dark' },
  'adobe-firefly': { src: 'assets/tools/adobe-firefly-isotype.svg', label: 'Adobe Firefly', plate: 'dark' },
  higgsfield: { src: 'assets/tools/higgsfield-isotype.svg', label: 'Higgsfield', plate: 'dark' },
  magnific: { src: 'assets/tools/magnific-isotype.svg', label: 'Magnific', plate: 'light' },
  'microsoft-teams': { src: 'assets/tools/teams-isotype.svg', label: 'Microsoft Teams', plate: 'light' },
  slack: { src: 'assets/tools/slack-isotype.svg', label: 'Slack', plate: 'light' }
}


export const deckAxisResolvers: ResolverRegistry = {
  'stat-goal-icon': {
    known: Object.keys(STAT_GOAL_ICON),
    build: value => {
      const icon = STAT_GOAL_ICON[value]

      return icon ? [{ selector: '.goal-icon', attr: 'src', value: icon }] : null
    }
  },

  'four-pillars-icon-and-tone': {
    known: Object.keys(FOUR_PILLAR_ICON),
    build: value => {
      const icon = FOUR_PILLAR_ICON[value]

      if (!icon) return null

      return [
        { selector: '.icon-stage img', attr: 'src', value: icon },
        // El tono vive en la clase del propio `<article class="pillar …">`.
        { selector: ':self', toneClass: value, toneGroup: [...FOUR_PILLARS] }
      ]
    }
  },

  /**
   * `pricing-option-tone` — `isProposed` NO es un texto: marca cuál plan es el propuesto, y eso se
   * pinta con la clase `.is-proposed`. Escribirlo como copy dejaría un "true" impreso en la lámina
   * de la oferta económica.
   */
  'pricing-option-tone': {
    known: ['true', 'false'],
    build: value => {
      if (value !== 'true' && value !== 'false') return null

      return value === 'true'
        ? [{ selector: ':self', toneClass: 'is-proposed' }]
        : // El blueprint puede venir del plan destacado: hay que QUITARLE la clase, si no todos
          // los planes salen marcados como "el propuesto".
          [{ selector: ':self', toneGroup: ['is-proposed'] }]
    }
  },

  /**
   * `legend-layer-tone` — el punto de la leyenda NO es contenido: su opacidad **codifica la
   * profundidad de la capa** (outer → middle → core). El prototipo lo trae hardcodeado inline en
   * cada `.dot`, así que si el filler sólo clonara el blueprint, **los tres puntos saldrían del tono
   * más pálido** y la leyenda dejaría de significar algo. El tono sale de la capa, o no sale.
   */
  'legend-layer-tone': {
    known: ['outer', 'middle', 'core'],
    build: value => {
      const TEAL = '54,200,191'

      const background =
        value === 'outer'
          ? `rgba(${TEAL},.30)`
          : value === 'middle'
            ? `rgba(${TEAL},.60)`
            : value === 'core'
              ? `rgb(${TEAL})`
              : null

      if (background === null) return null

      return [{ selector: '.dot', styleProp: 'background', styleValue: background }]
    }
  },

  // ── Fotos REALES del squad ───────────────────────────────────────────────────────────────────
  //
  // GUARDRAIL DURO DEL DOMINIO (materializa el `personaAssetContract` pre-declarado en
  // quote-split/narrative-split): la clave resuelve a `assets/squad/squad-<nombre>.png` por
  // allowlist CERRADA. Un nombre fuera de la lista → `UnknownResolverValueError` — una cara
  // generada por IA no puede entrar ni por error de autor, porque su archivo no existe en la
  // allowlist. Presentar una cara fabricada como parte del equipo es tergiversación.

  'squad-person': {
    known: ['andres', 'daniela', 'humberly', 'julio', 'luis', 'maria-fernanda', 'melkin', 'valentina'],
    build: value =>
      ['andres', 'daniela', 'humberly', 'julio', 'luis', 'maria-fernanda', 'melkin', 'valentina'].includes(value)
        ? [{ selector: '.photo img', attr: 'src', value: `assets/squad/squad-${value}.png` }]
        : null
  },

  /**
   * `dual-concept-icon` — el glifo de cada columna de DualTextSplit deja de ser chrome fijo (• / ✓):
   * el autor declara la SEMÁNTICA de la columna y el catálogo pinta el Solar correspondiente.
   * (Caso fuente: «LA CARRERA DEL BUSCADOR» salía con un bullet genérico — el ícono no decía nada.)
   */
  'dual-concept-icon': {
    known: ['search', 'ai', 'data', 'users', 'target'],
    build: value => {
      // Campo OPCIONAL: ausente (el filler planifica los derivados aunque no vengan y el valor
      // llega como "undefined") → no-op y queda el glifo neutro del prototipo. Un valor real
      // fuera del mapa sigue siendo UnknownResolverValueError: el typo no degrada en silencio.
      if (value === 'undefined' || value === '') return []

      const DUAL_CONCEPT_ICON: Record<string, string> = {
        search: 'magnifer',
        ai: 'cpu',
        data: 'chart-2',
        users: 'users-group-rounded',
        target: 'target'
      }

      const icon = DUAL_CONCEPT_ICON[value]

      return icon ? [{ selector: '.cicon svg path', attr: 'd', value: solarIconPath(icon) }] : null
    }
  },

  // ── Íconos SVG inline ────────────────────────────────────────────────────────────────────────
  // Estas plantillas no usan `<img src>` sino `<svg><path d="…">`: hay que reescribir el `d`.

  'team-role-icon': {
    known: Object.keys(TEAM_ROLE_ICON),
    build: value => {
      const icon = TEAM_ROLE_ICON[value]

      return icon ? [{ selector: '.av svg path', attr: 'd', value: solarIconPath(icon) }] : null
    }
  },

  'metrics-kpi-icon': {
    known: Object.keys(METRICS_KPI_ICON),
    build: value => {
      const icon = METRICS_KPI_ICON[value]

      return icon ? [{ selector: '.ic svg path', attr: 'd', value: solarIconPath(icon) }] : null
    }
  },

  'card-grid-capability-icon': {
    known: Object.keys(CARD_GRID_ICON),
    build: value => {
      const icon = CARD_GRID_ICON[value]

      return icon ? [{ selector: '.ic svg path', attr: 'd', value: solarIconPath(icon) }] : null
    }
  },

  /**
   * `tool-logo-asset` — el autor declara la herramienta por clave cerrada; el catálogo pinta el
   * isotipo/asset aprobado. No hay fallback a ícono genérico: una marca nueva exige asset nuevo.
   */
  'tool-logo-asset': {
    known: Object.keys(TOOL_LOGO),
    build: value => {
      const tool = TOOL_LOGO[value]

      return tool
        ? [
            { selector: ':field', attr: 'src', value: tool.src },
            { selector: ':field', attr: 'alt', value: tool.label },
            { selector: ':field', attr: 'data-tool', value },
            { selector: '.logo-mark', attr: 'data-logo-plate', value: tool.plate },
            ...(tool.accentRgb
              ? [{ selector: '.logo-mark', styleProp: '--tool-logo-accent-rgb', styleValue: tool.accentRgb }]
              : [])
          ]
        : null
    }
  },

  /**
   * `daily-workflow-step-tone` — el estado del ciclo es dato del DeckPlan; la plantilla decide
   * cómo distinguir lo completado, el trabajo activo y lo que sigue. Nunca se autoran clases CSS.
   */
  'daily-workflow-step-tone': {
    known: [...DAILY_WORKFLOW_TONES],
    build: value =>
      DAILY_WORKFLOW_TONES.includes(value as (typeof DAILY_WORKFLOW_TONES)[number])
        ? [{ selector: ':self', toneClass: value, toneGroup: [...DAILY_WORKFLOW_TONES] }]
        : null
  },

  /** Intensidad visual derivada del cluster; el autor declara prioridad, nunca porcentaje CSS. */
  'content-anatomy-cluster-strength': {
    known: Object.keys(CONTENT_ANATOMY_CLUSTER_WIDTH),
    build: value => {
      const width = CONTENT_ANATOMY_CLUSTER_WIDTH[value]

      return width ? [{ selector: ':field', styleProp: '--cluster-width', styleValue: width }] : null
    }
  },

  /** Estado del QA técnico dentro del inspector machine-readable. */
  'content-anatomy-check-tone': {
    known: [...CONTENT_ANATOMY_CHECK_TONES],
    build: value =>
      CONTENT_ANATOMY_CHECK_TONES.includes(value as (typeof CONTENT_ANATOMY_CHECK_TONES)[number])
        ? [{ selector: ':self', toneClass: value, toneGroup: [...CONTENT_ANATOMY_CHECK_TONES] }]
        : null
  },

  /** Las tres capas conservan semántica y tono aunque cambie su copy visible. */
  'content-anatomy-layer-tone': {
    known: [...CONTENT_ANATOMY_LAYER_TONES],
    build: value =>
      CONTENT_ANATOMY_LAYER_TONES.includes(value as (typeof CONTENT_ANATOMY_LAYER_TONES)[number])
        ? [{ selector: ':self', toneClass: value, toneGroup: [...CONTENT_ANATOMY_LAYER_TONES] }]
        : null
  },

  // ── Ordinales: chrome derivado, no dato autorable ────────────────────────────────────────────
  // El número de un capítulo/fase sale de su POSICIÓN. Si el autor lo escribiera a mano, un deck
  // reordenado quedaría con la numeración vieja y se contradiría solo.

  'ordinal-number': {
    known: ['<derivado del índice>'],
    build: (_value, ctx) => [{ selector: ':field', value: String(ctx.index + 1).padStart(2, '0'), asText: true }]
  },

  'timeline-phase-ordinal': {
    known: ['<derivado del índice>'],
    build: (_value, ctx) => [{ selector: '.n', value: String(ctx.index + 1).padStart(2, '0'), asText: true }]
  },

  // ── Escalera de madurez: el SCORE es la única verdad ─────────────────────────────────────────
  //
  // Todo lo demás de un peldaño —el ancho de su barra, su severidad, y cuál es el "usted está
  // aquí"— se DERIVA del score. Nada de eso es autorable, y no es celo: es la misma bug class que
  // ya nos costó caro tres veces. Si el autor pudiera rotular la severidad, una lámina podría
  // decir "óptimo" sobre un 37. Eso no es un bug de layout: es **fabricación** — el evaluador ve
  // una fortaleza que no existe. Y si pudiera marcar el peldaño destacado, dos podrían reclamar
  // ser "el próximo" (exactamente lo que pasó con los dos planes marcados como "el propuesto").

  'maturity-rung-geometry': {
    known: ['<derivado del score>'],
    build: (value, ctx) => {
      const score = toNumber(value)

      if (score === null) {
        throw new Error(
          'maturity-rung-geometry requiere un score numérico: no se puede dibujar un peldaño sin dato.'
        )
      }

      if (score < 0 || score > 100) {
        throw new Error(`maturity-rung-geometry recibió un score fuera de rango (0-100): ${score}.`)
      }

      const rungs = Array.isArray(ctx.slots.rungs) ? (ctx.slots.rungs as Record<string, unknown>[]) : []
      const scores = rungs.map(rung => toNumber(rung.score))

      if (scores.some(entry => entry === null)) {
        throw new Error(
          'maturity-rung-geometry: un peldaño sin score rompe la escalera entera — el "usted está aquí" se deriva de TODOS.'
        )
      }

      // El "usted está aquí" es el PRIMER peldaño no-óptimo desde abajo. Es la única marca de la
      // lámina, y es lo que convierte un boletín de notas en un alcance: la escalera es
      // acumulativa, así que el trabajo empieza abajo, no en el peor score.
      const firstBelowOptimal = (scores as number[]).findIndex(entry => entry < OPTIMAL_THRESHOLD)
      const isNext = firstBelowOptimal === ctx.index

      // La barra sale del dato. El prototipo trae anchos a mano; si el composer sólo cambiara el
      // número, un 8 se seguiría dibujando con el ancho del ejemplo.
      const MIN_PCT = 1.5 // un 0 tiene que verse como una raya, no como la nada

      // ⚠️ `data-next` se escribe SIEMPRE, con 'true' o 'false'. Nunca "sólo cuando aplica": el
      // prototipo trae un peldaño marcado, y un atributo que no se sobreescribe deja la marca del
      // EJEMPLO sobre un peldaño real. La lámina saldría destacando el peldaño equivocado — y
      // pareciendo terminada.
      return [
        { selector: '.fill', styleProp: 'width', styleValue: `${Math.max(MIN_PCT, score)}%` },
        { selector: ':field', value: String(Math.round(score)), asText: true },
        { selector: ':self', attr: 'data-next', value: isNext ? 'true' : 'false' }
      ]
    }
  },

  'maturity-rung-severity': {
    known: ['<derivado del score: >=70 óptimo · >=45 atención · <45 crítico>'],
    build: (_value, ctx) => {
      const score = toNumber(ctx.item.score)

      if (score === null) {
        throw new Error('maturity-rung-severity requiere el score del peldaño; la severidad no es autorable.')
      }

      const severity =
        score >= OPTIMAL_THRESHOLD ? 'optimo' : score >= ATTENTION_THRESHOLD ? 'atencion' : 'critico'

      return [
        { selector: ':field', value: SEVERITY_LABEL[severity], asText: true },
        { selector: ':self', attr: 'data-severity', value: severity }
      ]
    }
  },

  'section-number': {
    known: ['<derivado del orden de la sección>'],
    build: value => [{ selector: ':field', value: String(value).padStart(2, '0'), asText: true }]
  },

  'chapter-anchor': {
    // No es texto: alimenta el `href` del capítulo. Se emite como SENTINEL `https://deck.internal/<id>`
    // porque Chromium sólo imprime anotaciones /Link para URLs absolutas (un `#ancla` cuyo destino
    // vive en OTRA lámina no emite nada — cada lámina se imprime como documento propio). El merge
    // (`mergeSlidePdfs`) convierte el sentinel en una anotación GoTo a la PÁGINA REAL del slideId,
    // y si el destino no existe en el plan, la DESCARTA: el sentinel jamás llega al PDF entregado.
    known: ['<slideId destino>'],
    build: value => [{ selector: ':self', attr: 'href', value: `https://deck.internal/${value}` }]
  },

  // ── Geometría: lo que impide que la lámina MIENTA ────────────────────────────────────────────

  /**
   * `case-study-before-after-bar-scale` — las dos barras se derivan de los valores REALES.
   *
   * El prototipo trae `height:74px` y `height:234px` fijas. Si el composer sólo cambiara los
   * números, un "de 12 a 14" se seguiría dibujando como el salto gigante del ejemplo. Eso no es un
   * bug de layout en una oferta: es **fabricación gráfica** — el evaluador ve una mejora que no
   * ocurrió. La barra mayor toma el alto máximo y la otra escala proporcionalmente.
   */
  'case-study-before-after-bar-scale': {
    known: ['<derivado de beforeValue/afterValue>'],
    build: (_value, ctx) => {
      const before = toNumber(ctx.item.beforeValue)
      const after = toNumber(ctx.item.afterValue)

      if (before === null || after === null) return null

      const max = Math.max(before, after)

      if (max <= 0) return null

      const MAX_PX = 234
      const MIN_PX = 12 // una barra de 0 igual debe verse: una raya, no la nada

      const height = (value: number) => `${Math.max(MIN_PX, Math.round((value / max) * MAX_PX))}px`

      return [
        { selector: '.barcol.before .bar', styleProp: 'height', styleValue: height(before) },
        { selector: '.barcol.after .bar', styleProp: 'height', styleValue: height(after) }
      ]
    }
  },

  /**
   * `chart-bar-geometry` — el ancho de cada barra sale de su valor.
   *
   * Mismo principio: las barras del prototipo son `width:88%|48%|32%` a mano. La serie mayor cae
   * sobre la refline (88%) y el resto escala contra ella.
   */
  'chart-bar-geometry': {
    known: ['<derivado de valuePct>'],
    build: (_value, ctx) => {
      const series = Array.isArray(ctx.slots.series) ? (ctx.slots.series as Record<string, unknown>[]) : []
      const values = series.map(item => toNumber(item.valuePct))

      if (values.some(value => value === null)) {
        throw new Error('chart-bar-geometry requiere valuePct numérico en cada serie; no se puede dibujar una barra sin dato.')
      }

      const max = Math.max(...(values as number[]), 0)
      const own = toNumber(ctx.item.valuePct)
      const printed = toNumber(ctx.item.value)
      const highlighted = series.filter(item => item.highlight === 'sky')

      if (own === null || max <= 0) return null

      if (printed === null || Math.abs(printed - own) > 0.001) {
        throw new Error(
          `chart-bar-geometry detectó value inconsistente: "${String(ctx.item.value)}" no representa valuePct=${own}. ` +
            'La etiqueta y la barra deben afirmar el mismo dato.'
        )
      }

      if (highlighted.length !== 1) {
        throw new Error(
          `chart-bar-geometry requiere exactamente una serie destacada (highlight="sky"); recibió ${highlighted.length}.`
        )
      }

      if (ctx.item.highlight !== 'sky' && ctx.item.highlight !== 'muted') {
        throw new Error(`chart-bar-geometry no conoce el tono "${String(ctx.item.highlight)}".`)
      }

      const REFLINE_PCT = 88
      const width = Math.round((own / max) * REFLINE_PCT)
      const isHighlighted = ctx.item.highlight === 'sky'
      const highlightedValue = toNumber(highlighted[0]!.valuePct)

      if (highlightedValue === null) {
        throw new Error('chart-bar-geometry no puede derivar la brecha: la serie destacada no tiene valuePct numérico.')
      }

      const highlightedWidth = Math.round((highlightedValue / max) * REFLINE_PCT)
      const gapWidth = REFLINE_PCT - highlightedWidth
      const pointDelta = max - highlightedValue
      const pointLabel = Number.isInteger(pointDelta) ? String(pointDelta) : pointDelta.toFixed(1).replace('.', ',')

      const effects: FieldEffect[] = [
        { selector: ':self', toneGroup: ['sky'], ...(isHighlighted ? { toneClass: 'sky' } : {}) },
        { selector: '.fill', toneClass: isHighlighted ? 'sky' : 'muted', toneGroup: ['sky', 'muted'] },
        { selector: '.fill', styleProp: 'width', styleValue: `${width}%` }
      ]

      if (isHighlighted && gapWidth > 0) {
        effects.push(
          { selector: '.gap', styleProp: 'left', styleValue: `${highlightedWidth}%` },
          { selector: '.gap', styleProp: 'width', styleValue: `${gapWidth}%` },
          { selector: '.gap .glabel', asText: true, value: `+${pointLabel} pts a cerrar` }
        )
      } else {
        effects.push({ selector: '.gap', remove: true })
      }

      return effects
    }
  },

  /**
   * `timeline-phase-span` — la barra de la fase se posiciona por sus unidades reales.
   *
   * Una fase que va del mes 2 al 4 debe dibujarse ahí. Con la geometría del prototipo, un plan de 8
   * meses se seguiría viendo como el de 6 del ejemplo: el cronograma diría una cosa y la barra otra.
   */
  'timeline-phase-span': {
    known: ['<derivado de startUnit/endUnit>'],
    build: (_value, ctx) => {
      const axis = Array.isArray(ctx.slots.timeAxis) ? ctx.slots.timeAxis : []
      const units = axis.length

      const start = toNumber(ctx.item.startUnit)
      const end = toNumber(ctx.item.endUnit)

      if (units <= 0 || start === null || end === null || end < start) return null

      const unit = 100 / units
      const left = (start - 1) * unit
      const width = (end - start + 1) * unit

      return [
        { selector: '.bar', styleProp: 'left', styleValue: `${left.toFixed(2)}%` },
        { selector: '.bar', styleProp: 'width', styleValue: `${width.toFixed(2)}%` }
      ]
    }
  },

  'timeline-phase-bar-kind': {
    known: ['work', 'continuous'],
    build: value => {
      if (value !== 'work' && value !== 'continuous') return null

      return value === 'continuous'
        ? [{ selector: '.bar', toneClass: 'cont', toneGroup: ['cont'] }]
        : [{ selector: '.bar', toneGroup: ['cont'] }]
    }
  },

  'timeline-milestone-position': {
    known: ['<derivado de la unidad del hito>'],
    build: (value, ctx) => {
      const axis = Array.isArray(ctx.slots.timeAxis) ? ctx.slots.timeAxis : []
      const units = axis.length
      const at = toNumber(value)

      if (units <= 0 || at === null) return null

      // El hito se ancla al FIN de su unidad (un hito "en el mes 2" cae al cerrar el mes 2).
      const left = (at / units) * 100

      // El rombo va SIEMPRE en su posición real —no se miente sobre la fecha—, pero la etiqueta se
      // ancla HACIA ADENTRO cuando el hito cae en un extremo. Un hito en la última unidad cae al
      // 100% del eje y su label, centrado y `nowrap`, se partiría contra el borde del lienzo. (El
      // prototipo esquivaba esto a mano: sus ejemplos usan 16%, 50% y 91%, nunca 100%.)
      const EDGE = 12
      const anchor = left >= 100 - EDGE ? 'at-end' : left <= EDGE ? 'at-start' : null

      return [
        { selector: ':self', styleProp: 'left', styleValue: `${left.toFixed(2)}%` },
        // El grupo se limpia SIEMPRE: el blueprint puede traer el anclaje de otro hito.
        { selector: ':self', toneGroup: ['at-start', 'at-end'], ...(anchor ? { toneClass: anchor } : {}) }
      ]
    }
  }
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    // Tolera "1.234", "45%", "$ 1.200" — el dato manda, no su formato de presentación.
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
    const parsed = Number.parseFloat(cleaned)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}
