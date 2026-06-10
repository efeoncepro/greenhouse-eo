/**
 * AXIS Figma file constants — UNIVERSAL module (TASK-1072).
 *
 * ⚠️ Source of truth para `AXIS_FILE_KEY` / `AXIS_FILE_NAME` / `buildFigmaNodeUrl`.
 * Vive acá (sin `'use client'` ni `'server-only'`) porque lo consumen AMBOS lados:
 * el componente cliente `GreenhouseFigmaNodeButton` y el código server (store command,
 * preview API). Importar un valor desde un módulo `'use client'` hacia código server
 * en el bundle de Vercel lo convierte en una referencia de cliente (no el string),
 * rompiendo comparaciones como `fileKey === AXIS_FILE_KEY` server-side. Mismo principio
 * que `src/lib/design-tokens/*` (data runtime-agnóstica compartida UI + worker/PDF).
 */

/** AXIS master file (Figma). Allowlist canónica del Design System. */
export const AXIS_FILE_KEY = 'yyMksCoijfMaIoYplXKZaR'

/** AXIS file name slug usado en la URL de Figma (encodeado). */
export const AXIS_FILE_NAME = 'Design-System-%7C-Vuexy-%3E-AXIS'

/** Build the canonical AXIS Figma node URL. The URL form uses `-`, not `:`. */
export const buildFigmaNodeUrl = (nodeId: string, fileKey = AXIS_FILE_KEY, fileName = AXIS_FILE_NAME): string => {
  const urlNode = nodeId.trim().replace(/:/g, '-')

  return `https://www.figma.com/design/${fileKey}/${fileName}?node-id=${urlNode}&m=dev`
}
