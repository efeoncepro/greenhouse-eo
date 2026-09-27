/**
 * Resolvers de los catálogos de Glitch (TASK-1923). Traducen un valor del plan a atributos del DOM; nunca inventan
 * valores de diseño (esos vienen de `glitch-tokens.css`).
 */

import type { ResolverRegistry } from '../../resolver-contract'

const EXTERNAL = 'asset-ref:'

const lensPx = (value: string, prop: 'left' | 'top') => {
  const n = Number(value)

  return Number.isFinite(n) && n >= 0 && n <= 1920 ? [{ selector: ':self', styleProp: prop, styleValue: `${n}px` }] : null
}

export const glitchResolvers = (): ResolverRegistry => ({
  /** Foto materializada por el CLI (duotono y tamaño exacto): `asset-ref:photo:<id>`. */
  'gx-photo-ref': {
    known: ['asset-ref:photo:<id>'],
    build: (value) => (value.startsWith(`${EXTERNAL}photo:`) ? [{ selector: ':field', attr: 'src', value }] : null)
  },
  /** Avance n/8: enciende los n primeros segmentos (la geometría sale del dato, nunca del ejemplo). */
  'gx-progress': {
    known: ['1', '2', '3', '4', '5', '6', '7', '8'],
    build: (value) => {
      const n = Number(value)

      if (!Number.isInteger(n) || n < 1 || n > 8) return null

      return Array.from({ length: n }, (_, i) => ({ selector: `.gx-seg:nth-of-type(${i + 1})`, toneClass: 'is-on' }))
    }
  },
  /** Centro de la lente en px del lienzo: lo deriva el mapper de la región del detalle (nunca una coordenada a mano). */
  'gx-lens-x': { known: ['<px>'], build: (value) => lensPx(value, 'left') },
  'gx-lens-y': { known: ['<px>'], build: (value) => lensPx(value, 'top') },
  /** Texto alternativo de la foto, sobre la misma imagen que lleva el `src`. */
  'gx-alt': {
    known: ['<texto alternativo>'],
    build: (value) => (value.trim().length > 0 ? [{ selector: '[data-slot-field="src"]', attr: 'alt', value }] : null)
  }
})
