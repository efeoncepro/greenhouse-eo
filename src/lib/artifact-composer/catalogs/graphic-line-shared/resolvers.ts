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
