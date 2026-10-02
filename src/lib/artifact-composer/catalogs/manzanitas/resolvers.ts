/**
 * Resolvers de los catálogos de Marketing con Manzanitas (TASK-1939). Traducen un valor del plan a atributos del DOM;
 * nunca inventan valores de diseño (esos vienen de `manzanitas-tokens.css`) ni archivos (sólo los que `pnpm
 * manzanitas:tokens` dejó en `assets/`, precoloreados por línea).
 */

import fs from 'node:fs'
import path from 'node:path'

import type { FieldEffect, ResolverRegistry } from '../../resolver-contract'
import { MANZANITAS_LINES, manzanitasCatalogDir } from './brand'

const EXTERNAL = 'asset-ref:'
const TONES = ['paper', 'navy'] as const
const ASSET_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Un archivo del catálogo por su nombre base; si no existe, el resolver no sabe qué hacer (falla cerrado). */
const assetEffect = (selector: string, value: string): FieldEffect[] | null => {
  if (!ASSET_NAME.test(value)) return null
  if (!fs.existsSync(path.join(manzanitasCatalogDir, 'assets', `${value}.svg`))) return null

  return [{ selector, attr: 'src', value: `assets/${value}.svg` }]
}

const refEffect = (kind: 'photo' | 'lens' | 'orbit') => (value: string): FieldEffect[] | null =>
  value.startsWith(`${EXTERNAL}${kind}:`) ? [{ selector: ':field', attr: 'src', value }] : null

export const manzanitasResolvers = (): ResolverRegistry => ({
  /** La línea del tema: un solo selector que cambia el acento de toda la pieza. */
  'mcm-line': {
    known: [...MANZANITAS_LINES],
    build: (value) =>
      (MANZANITAS_LINES as readonly string[]).includes(value)
        ? [{ selector: ':self', toneClass: `mcm-line-${value}`, toneGroup: MANZANITAS_LINES.map((l) => `mcm-line-${l}`) }]
        : null
  },
  /** La superficie: papel o navy (decide la tinta y cuál de los dos acentos de la línea se usa). */
  'mcm-tone': {
    known: [...TONES],
    build: (value) =>
      (TONES as readonly string[]).includes(value) ? [{ selector: ':self', toneClass: `mcm-tone-${value}`, toneGroup: TONES.map((t) => `mcm-tone-${t}`) }] : null
  },
  'mcm-masthead': { known: ['manzanitas-logo-<tono>-<línea>', 'manzanitas-wordmark-<tono>'], build: (value) => assetEffect('[data-mcm-masthead]', value) },
  'mcm-signature': { known: ['efeonce-logo-positive', 'efeonce-logo-negative'], build: (value) => assetEffect('[data-mcm-signature]', value) },
  'mcm-apple': { known: ['manzanitas-apple-<tono>-<línea>'], build: (value) => assetEffect('[data-mcm-apple]', value) },
  /** «Desliza»: en su sitio fijo; `none` la quita (última lámina, pieza suelta). */
  'mcm-swipe': {
    known: ['swipe-<estado>-<tono>-<línea>', 'none'],
    build: (value) => (value === 'none' ? [{ selector: '[data-mcm-swipe]', remove: true }] : assetEffect('[data-mcm-swipe]', value))
  },
  /** El aire antes de la esfera según la última letra de la respuesta (`efeonceGraphicLine.sphere.opticalGapEm`). */
  'mcm-sphere-gap': {
    known: ['<em entre -0.1 y 0.1>'],
    build: (value) => {
      const n = Number(value)

      return Number.isFinite(n) && n >= -0.1 && n <= 0.1 ? [{ selector: ':self', styleProp: '--mcm-sphere-gap', styleValue: `${n}em` }] : null
    }
  },
  /** Foto materializada por el comando (tamaño exacto del lienzo): `asset-ref:photo:<id>`. */
  'mcm-photo-ref': { known: ['asset-ref:photo:<id>'], build: refEffect('photo') },
  /** La Lente de La órbita (receta `post`) con la foto adentro: `asset-ref:lens:<id>`. */
  'mcm-lens-ref': { known: ['asset-ref:lens:<id>'], build: refEffect('lens') },
  /** La órbita del paso, calculada con `@efeoncepro/axis-graphic-line`: `asset-ref:orbit:<id>`. */
  'mcm-orbit-ref': { known: ['asset-ref:orbit:<id>'], build: refEffect('orbit') },
  'mcm-alt': {
    known: ['<texto alternativo>'],
    build: (value) => (value.trim().length > 0 ? [{ selector: '[data-slot-field="src"]', attr: 'alt', value }] : null)
  },
  /** Las diez manzanas del dato: las primeras N en el acento de la línea (sobre papel), el resto en el neutro. */
  'mcm-apples-count': {
    known: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    build: (value, ctx) => {
      const n = Number(value)
      const line = (ctx.slots.theme as { line?: string } | undefined)?.line

      if (!Number.isInteger(n) || n < 0 || n > 10 || !line || !(MANZANITAS_LINES as readonly string[]).includes(line)) return null

      return Array.from({ length: 10 }, (_, i): FieldEffect => ({
        selector: `[data-mcm-apple-unit="${i + 1}"]`,
        attr: 'src',
        value: i < n ? `assets/manzanitas-apple-paper-${line}.svg` : 'assets/manzanitas-apple-neutral-paper.svg'
      }))
    }
  },
  'mcm-aria-label': {
    known: ['<descripción>'],
    build: (value) => (value.trim().length > 0 ? [{ selector: ':self', attr: 'aria-label', value }] : null)
  },
  /** El numeral de un punto o de un paso sale del orden, nunca de un dato que el autor escriba. */
  'mcm-ordinal': {
    known: ['<derivado del índice>'],
    build: (_value, ctx) => [{ selector: ':field', value: String(ctx.index + 1), asText: true }]
  }
})
