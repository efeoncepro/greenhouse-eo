/**
 * Resolvers de los catálogos de Glitch (TASK-1923). Traducen un valor del plan a atributos del DOM; nunca inventan
 * valores de diseño (esos vienen de `glitch-tokens.css`).
 */

import type { ResolverRegistry } from '../../resolver-contract'

const EXTERNAL = 'asset-ref:'

export const glitchResolvers = (): ResolverRegistry => ({
  /** Foto materializada por el CLI (duotono y tamaño exacto): `asset-ref:photo:<id>`. */
  'gx-photo-ref': {
    known: ['asset-ref:photo:<id>'],
    build: (value) => (value.startsWith(`${EXTERNAL}photo:`) ? [{ selector: ':field', attr: 'src', value }] : null)
  },
  /** Texto alternativo de la foto, sobre la misma imagen que lleva el `src`. */
  'gx-alt': {
    known: ['<texto alternativo>'],
    build: (value) => (value.trim().length > 0 ? [{ selector: '[data-slot-field="src"]', attr: 'alt', value }] : null)
  }
})
