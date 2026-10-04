/**
 * TASK-1990/1996 — glifos Trazo de las métricas en las páginas de cifras, comparación y metas (A4 y deck). La plantilla
 * trae el set completo (`.m-<clave>`, trazos en reposo de `STROKE_GLYPHS` de @efeoncepro/axis-graphic-line; un test compara
 * cada trazo con el paquete instalado) y el resolver deja sólo el pedido. Sin clave, el nodo se quita. Clave desconocida: falla
 * cerrado. La clave la decide el dominio (`metricGlyphOf`); un test cruza las dos listas.
 */
import type { FieldEffect } from '../../resolver-contract'

export const CATALOG_METRIC_GLYPH_KEYS = [
  'clic',
  'impresion',
  'ctr',
  'posicion',
  'keyword',
  'visita',
  'ia',
  'cita',
  'enlace',
  'competencia',
  'medicion',
  'reloj',
  'checklist',
  'reunion',
  'assets',
  'social',
  'prensa',
  'web'
] as const

export const metricGlyphEffects = (value: string): FieldEffect[] | null => {
  // El motor llama al resolver con `String(valor)`: un campo ausente llega como 'undefined' o 'null'.
  if (value === 'undefined' || value === 'null' || value.trim() === '') return [{ selector: ':field', remove: true }]

  if (!(CATALOG_METRIC_GLYPH_KEYS as readonly string[]).includes(value)) return null

  return CATALOG_METRIC_GLYPH_KEYS.filter(key => key !== value).map(key => ({ selector: `.m-${key}`, remove: true }))
}
