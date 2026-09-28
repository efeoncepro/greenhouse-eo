/**
 * Resolvers compartidos de los catálogos de «La órbita» (`graphic-line-deck`, `graphic-line-stills`).
 *
 * La línea gráfica se compone por SUPERFICIE: el contrato `efeonce.surface-composition` de AXIS resuelve
 * formato, papel, receta, escala de voces, reservas y firma, y el consumidor (`src/lib/brand-surfaces`)
 * traduce ese manifest a slots. Estos resolvers son la mitad del catálogo de esa traducción: convierten
 * valores SEMÁNTICOS del plan (qué línea, qué respuesta, qué medidas resolvió AXIS) en presentación.
 *
 * Tres reglas que viven acá y no en cada plantilla:
 *   - El fondo es SIEMPRE el de Efeonce; la línea de servicio sólo aporta el acento (`gl-line`).
 *   - La esfera cierra la respuesta con el aire óptico de su última letra (`gl-answer`), como
 *     `answerSphere` de `@efeoncepro/axis-graphic-line`; nunca es viñeta ni adorno.
 *   - Las medidas llegan del manifest de AXIS (`gl-px`, `gl-share`); una plantilla nunca las inventa.
 *
 * Los valores de marca (acentos, esfera) salen de `graphic-line-tokens.json`, que GENERA
 * `pnpm brand:tokens` desde `@efeoncepro/axis-tokens`. El motor no importa paquetes de AXIS: el
 * catálogo consume su snapshot compilado, y el test de sincronía detecta el drift.
 */

import type { FieldEffect, ResolverRegistry } from '../../resolver-contract'
import tokens from './graphic-line-tokens.json'

interface GraphicLineTokensSnapshot {
  lines: { key: string; accentOnDark: string; accentOnLight: string }[]
  sphere: { diameterEm: number; defaultGapEm: number; opticalGapEm: Record<string, number> }
}

const snapshot = tokens as unknown as GraphicLineTokensSnapshot

export const GRAPHIC_LINE_KEYS = snapshot.lines.map(line => line.key)

const LINE_CLASSES = GRAPHIC_LINE_KEYS.map(key => `gl-line-${key}`)

/** El aire entre la última letra y la esfera: mismo cálculo que `answerSphere` de AXIS. */
export const sphereGapEm = (text: string): number => {
  const last = text.trim().slice(-1).toLowerCase()

  return snapshot.sphere.opticalGapEm[last] ?? snapshot.sphere.defaultGapEm
}

const toPx = (value: string): number | null => {
  const n = Number(value)

  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Una medida en px que resolvió AXIS, escrita como custom property en la raíz del objeto. */
const pxVar =
  (cssVar: string) =>
  (value: string): FieldEffect[] | null => {
    const px = toPx(value)

    return px === null ? null : [{ selector: ':self', styleProp: cssVar, styleValue: `${px}px` }]
  }

const shareVar =
  (cssVar: string) =>
  (value: string): FieldEffect[] | null => {
    const n = Number(value)

    return Number.isFinite(n) && n >= 0 && n <= 1 ? [{ selector: ':self', styleProp: cssVar, styleValue: String(n) }] : null
  }

/** Campo de `layout` → custom property. La lista es cerrada: una medida nueva se declara acá. */
export const GRAPHIC_LINE_LAYOUT_VARS = {
  margin: '--gl-margin',
  eyebrowTop: '--gl-eyebrow-top',
  questionTop: '--gl-question-top',
  answerTop: '--gl-answer-top',
  answerPx: '--gl-answer-px',
  bodyTop: '--gl-body-top',
  bodyPx: '--gl-body-px',
  bodyWidth: '--gl-body-width',
  proofTop: '--gl-proof-top',
  stepsTop: '--gl-steps-top',
  stepsGap: '--gl-steps-gap',
  stepWidth: '--gl-step-width',
  iconPx: '--gl-icon-px',
  kickerPx: '--gl-kicker-px',
  stepNamePx: '--gl-step-name-px'
} as const

export const GRAPHIC_LINE_SHARE_VARS = {
  textShare: '--gl-text-share',
  subjectShare: '--gl-subject-share'
} as const

export const graphicLineResolvers = (): ResolverRegistry => {
  const registry: ResolverRegistry = {
    // La línea de servicio: una clase de tono en la raíz. El fondo no cambia (decisión 2026-09-26).
    'gl-line': {
      known: GRAPHIC_LINE_KEYS,
      build: value =>
        GRAPHIC_LINE_KEYS.includes(value)
          ? [{ selector: ':self', toneClass: `gl-line-${value}`, toneGroup: LINE_CLASSES }]
          : null
    },

    // La respuesta: el texto en su campo y la esfera con el aire de la última letra. Es un solo
    // resolver para que la esfera no pueda quedar separada de la palabra que cierra.
    'gl-answer': {
      known: ['<la última línea de la respuesta>'],
      build: value => {
        const text = value.trim()

        if (!text) return null

        return [
          { selector: ':field', value: text, asText: true },
          { selector: '[data-gl-part="sphere"]', styleProp: 'margin-left', styleValue: `${sphereGapEm(text)}em` }
        ]
      }
    },

    // Cómo se reparten los pasos: en fila (hasta 3) o en columnas con el ícono arriba (4).
    'gl-steps-layout': {
      known: ['inline', 'columns'],
      build: value =>
        value === 'inline' || value === 'columns'
          ? [{ selector: ':self', toneClass: `gl-steps-${value}`, toneGroup: ['gl-steps-inline', 'gl-steps-columns'] }]
          : null
    },

    // La composición de la sección partida (contrato 0.1.2): dónde va el panel de papel y cuál es su esquina curva.
    // Es una decisión de AXIS (`manifest.layout`); la plantilla sólo sabe pintar las tres aprobadas.
    'gl-split-layout': {
      known: ['corner-top', 'corner-bottom', 'panel-end'],
      build: value =>
        ['corner-top', 'corner-bottom', 'panel-end'].includes(value)
          ? [{ selector: ':self', toneClass: `gl-ss-${value}`, toneGroup: ['gl-ss-corner-top', 'gl-ss-corner-bottom', 'gl-ss-panel-end'] }]
          : null
    },

    // La parada actual de un plan (TASK-1928, `decision-plan`): la ficha encendida. La plantilla pinta hasta tres.
    'gl-current-stop': {
      known: ['1', '2', '3'],
      build: value =>
        ['1', '2', '3'].includes(value.trim())
          ? [{ selector: ':self', toneClass: `gl-current-${value.trim()}`, toneGroup: ['gl-current-1', 'gl-current-2', 'gl-current-3'] }]
          : null
    },

    // De qué lado del punto va un rótulo (TASK-1928, el anillo del puntaje): `start` crece a la derecha, `end` a la
    // izquierda.
    'gl-label-side': {
      known: ['start', 'end'],
      build: value =>
        ['start', 'end'].includes(value.trim())
          ? [{ selector: ':self', toneClass: `gl-side-${value.trim()}`, toneGroup: ['gl-side-start', 'gl-side-end'] }]
          : null
    },

    // El día elegido en la agenda del diagnóstico (TASK-1928, `decision-next-steps`).
    'gl-chosen-day': {
      known: ['1', '2', '3', '4', '5'],
      build: value =>
        ['1', '2', '3', '4', '5'].includes(value.trim())
          ? [{ selector: ':self', toneClass: `gl-day-${value.trim()}`, toneGroup: ['gl-day-1', 'gl-day-2', 'gl-day-3', 'gl-day-4', 'gl-day-5'] }]
          : null
    },

    // La hora elegida en la agenda del diagnóstico (TASK-1928, `decision-next-steps`).
    'gl-chosen-time': {
      known: ['1', '2', '3', '4'],
      build: value =>
        ['1', '2', '3', '4'].includes(value.trim())
          ? [{ selector: ':self', toneClass: `gl-time-${value.trim()}`, toneGroup: ['gl-time-1', 'gl-time-2', 'gl-time-3', 'gl-time-4'] }]
          : null
    },

    // El plan recomendado de una cotización (TASK-1928, `content-pricing`): sale de la grilla o va al frente.
    'gl-recommended': {
      known: ['1', '2', '3'],
      build: value =>
        ['1', '2', '3'].includes(value.trim())
          ? [{ selector: ':self', toneClass: `gl-rec-${value.trim()}`, toneGroup: ['gl-rec-1', 'gl-rec-2', 'gl-rec-3'] }]
          : null
    },

    // Texto alternativo de la foto: describe la escena, nunca transcribe el copy de la lámina.
    'gl-alt': {
      known: ['<descripción de la escena>'],
      build: value => (value.trim() ? [{ selector: 'img', attr: 'alt', value: value.trim() }] : null)
    },

    // Ícono de un paso: el consumidor lo resolvió con `resolveIcon` de AXIS y lo entrega como asset
    // externo (`asset-ref:icon:<glyph>-<line>`). El resolver sólo valida la referencia.
    'gl-icon-ref': {
      known: ['asset-ref:icon:<glyph>-<line>'],
      build: value =>
        value.startsWith('asset-ref:icon:') ? [{ selector: ':field', attr: 'src', value }] : null
    },

    // Una capa gráfica ya pintada por AXIS (órbita, lente, arco de medida, progreso) como SVG externo
    // (`asset-ref:layer:<id>`). La geometría la resolvió el paquete de la línea gráfica, no la plantilla.
    'gl-layer-ref': {
      known: ['asset-ref:layer:<id>'],
      build: value =>
        value.startsWith('asset-ref:layer:') ? [{ selector: ':field', attr: 'src', value }] : null
    },

    // Una custom property `--gl-*` con su valor, cuando la receta necesita una medida que no está en la lista
    // cerrada de `gl-px-*` (el centro y el radio de una lente, el ancho de una columna). Sólo acepta nombres
    // `--gl-` y valores numéricos con unidad: nunca un color ni una familia.
    'gl-css': {
      known: ['--gl-<nombre>=<número>(px|em|%|deg)?'],
      build: value => {
        const match = /^(--gl-[a-z0-9-]+)=(-?\d+(?:\.\d+)?(?:px|em|%|deg)?)$/.exec(value.trim())

        return match ? [{ selector: ':self', styleProp: match[1]!, styleValue: match[2]! }] : null
      }
    },

    // Un color que resolvió AXIS para un texto de la receta (`manifest.type.<voz>.color`), como custom property
    // `--gl-<nombre>-color`. El valor lo entrega el builder desde el manifest: la plantilla nunca lo escribe. Sólo HEX
    // completos y sólo nombres que terminan en `-color`.
    'gl-color': {
      known: ['--gl-<nombre>-color=#rrggbb'],
      build: value => {
        const match = /^(--gl-[a-z0-9-]+-color)=(#[0-9a-fA-F]{6})$/.exec(value.trim())

        return match ? [{ selector: ':self', styleProp: match[1]!, styleValue: match[2]!.toLowerCase() }] : null
      }
    },

    // Un tramo del eslogan: peso, itálica y color como los resolvió AXIS (`content.slogan.runs`). El eslogan oficial
    // tiene tres tramos con pesos distintos; la plantilla no los conoce, sólo los pinta.
    'gl-slogan-run': {
      known: ['<peso> <italic|normal> #rrggbb'],
      build: value => {
        const match = /^([1-9]00) (italic|normal) (#[0-9a-fA-F]{6})$/.exec(value.trim())

        if (!match) return null

        return [
          { selector: ':self', styleProp: 'font-weight', styleValue: match[1]! },
          { selector: ':self', styleProp: 'font-style', styleValue: match[2]! },
          { selector: ':self', styleProp: 'color', styleValue: match[3]!.toLowerCase() }
        ]
      }
    },

    // El fondo de una portada o contraportada: una foto de cine a sangre (plate) o la órbita de luz que pintó el
    // builder desde los tokens de AXIS (capa). Siempre un asset externo.
    'gl-backdrop-ref': {
      known: ['asset-ref:plate:<id>', 'asset-ref:layer:<id>'],
      build: value =>
        value.startsWith('asset-ref:plate:') || value.startsWith('asset-ref:layer:') ? [{ selector: ':field', attr: 'src', value }] : null
    },

    // El texto alternativo del fondo: describe la escena de la foto; una órbita es decorativa y va vacío.
    'gl-backdrop-alt': {
      known: ['<descripción de la escena>', ''],
      build: value => [{ selector: 'img', attr: 'alt', value: value.trim() }]
    },

    // Un archivo que entrega quien compone tal cual (el logo de un cliente), como asset externo.
    'gl-file-ref': {
      known: ['asset-ref:file:<id>'],
      build: value => (value.startsWith('asset-ref:file:') ? [{ selector: ':field', attr: 'src', value }] : null)
    },

    // La foto de la pieza: un plate aprobado, entregado como asset externo (`asset-ref:plate:<id>`).
    'gl-plate-ref': {
      known: ['asset-ref:plate:<id>'],
      build: value =>
        value.startsWith('asset-ref:plate:') ? [{ selector: ':field', attr: 'src', value }] : null
    }
  }

  for (const [field, cssVar] of Object.entries(GRAPHIC_LINE_LAYOUT_VARS)) {
    registry[`gl-px-${field}`] = { known: ['<px resuelto por AXIS>'], build: pxVar(cssVar) }
  }

  for (const [field, cssVar] of Object.entries(GRAPHIC_LINE_SHARE_VARS)) {
    registry[`gl-share-${field}`] = { known: ['<fracción 0–1 resuelta por AXIS>'], build: shareVar(cssVar) }
  }

  return registry
}
