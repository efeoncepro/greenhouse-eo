/**
 * El kit compartido de los builders de las familias del deck (TASK-1928): leer una medida de AXIS sin inventarla,
 * escribirla como custom property, resolver un color del token (nombre de la paleta o HEX medido) y pintar las capas
 * que varias familias comparten (el escenario del estilo «vivo»). Nada aquí decide copy ni geometría de una receta.
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import type { SurfaceAssetRequest } from '../types'
import { SurfacePieceError } from '../types'
import { ofHeight, reserve, type SurfaceManifest } from '../shared'

export const GL = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  lines: { key: string; accentOnDark: string }[]
}

export type Pt = { x: number; y: number }

/** Una medida que AXIS debe traer: si falta, la plantilla no la inventa. */
export const measured = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) throw new SurfacePieceError(`AXIS no midió ${what}.`, 'invalid-intent')

  return value
}

export const n = (value: number): string => String(Math.round(value * 100) / 100)

/** Una medida como custom property para el resolver `gl-css` (`--gl-<nombre>=<número><unidad>`). */
export const css = (name: string, value: number, unit = 'px'): string => `--gl-${name}=${n(value)}${unit}`

/** Un color medido como custom property para el resolver `gl-color` (`--gl-<nombre>-color=#rrggbb`). */
export const colorVar = (name: string, hex: string): string => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new SurfacePieceError(`El color «${name}» no es un HEX medido por AXIS.`, 'invalid-intent')

  return `--gl-${name}-color=${hex.toLowerCase()}`
}

/** Un color del token: un nombre de la paleta de la línea gráfica, `white`, o un HEX medido en la lámina aprobada. */
export const paletteColor = (value: string, what: string): string => {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  if (value === 'white') return '#ffffff'

  return measured(GL.color[value], `el color «${value}» de ${what}`)
}

export const accentOf = (line: string): string =>
  measured(GL.lines.find(entry => entry.key === line)?.accentOnDark, `el acento de la línea «${line}»`)

export const topOf = (manifest: SurfaceManifest, band: string): number =>
  ofHeight(manifest, measured(reserve(manifest, band)?.fromTop, `la altura de «${band}»`))

export type TypeToken = { px?: number | [number, number]; lineHeight?: number; tracking?: string; maxWidthPx?: number; weight?: number; gapPx?: number }

export const typeOf = (manifest: SurfaceManifest, voice: string): TypeToken =>
  measured((manifest.type as Record<string, TypeToken> | undefined)?.[voice], `la tipografía de «${voice}»`)

export const fixedPx = (type: TypeToken, what: string): number => {
  if (typeof type.px !== 'number') throw new SurfacePieceError(`AXIS no fijó el tamaño de ${what}.`, 'invalid-intent')

  return type.px
}

export const svgOpen = (manifest: SurfaceManifest): string => {
  const { width, height } = manifest.canvas

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false">`
}

export const layerAsset = (id: string, svg: string): { ref: string; asset: SurfaceAssetRequest } => {
  const ref = `asset-ref:layer:${id}`

  return { ref, asset: { ref, kind: 'svg', svg } }
}

/** Un texto obligatorio del intent, recortado; vacío falla cerrado. */
export const text = (value: unknown, what: string): string => {
  const trimmed = typeof value === 'string' ? value.trim() : ''

  if (!trimmed) throw new SurfacePieceError(`${what} va con texto.`, 'invalid-intent')

  return trimmed
}

export type Stop = { at: number; color: string; opacity: number }

export type StageTokens = {
  halo: { cxPx: number; cyPx: number; rPx: number; stops: Stop[] }
  floor: { fromYPx: number; color: string; opacity: number }
}

/** El escenario del estilo «vivo»: un halo radial y el piso que se oscurece hacia abajo. */
export const stageSvg = (manifest: SurfaceManifest, stage: StageTokens, idPrefix = 'dp'): string => {
  const { width, height } = manifest.canvas
  const { halo, floor } = stage

  const haloStops = halo.stops
    .map(stop => `<stop offset="${n(stop.at)}" stop-color="${paletteColor(stop.color, 'el halo del escenario')}" stop-opacity="${n(stop.opacity)}"/>`)
    .join('')

  return (
    svgOpen(manifest) +
    `<defs><radialGradient id="${idPrefix}-halo" cx="${n(halo.cxPx)}" cy="${n(halo.cyPx)}" r="${n(halo.rPx)}" gradientUnits="userSpaceOnUse">${haloStops}</radialGradient>` +
    `<linearGradient id="${idPrefix}-floor" x1="0" y1="${n(floor.fromYPx)}" x2="0" y2="${height}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${paletteColor(floor.color, 'el piso')}" stop-opacity="0"/><stop offset="1" stop-color="${paletteColor(floor.color, 'el piso')}" stop-opacity="${n(floor.opacity)}"/></linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#${idPrefix}-halo)"/>` +
    `<rect y="${n(floor.fromYPx)}" width="${width}" height="${n(height - floor.fromYPx)}" fill="url(#${idPrefix}-floor)"/>` +
    '</svg>'
  )
}
