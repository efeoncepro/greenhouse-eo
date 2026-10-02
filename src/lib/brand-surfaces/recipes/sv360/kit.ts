/**
 * El kit de las seis láminas nativas del deck SEO/AEO (Search Visibility 360, TASK-1949): la familia de marcas, los
 * servicios con maquetas, el informe vivo, el PPT del comité, las industrias y los mercados. El operador las aprobó el
 * 2026-09-30 en el estilo «vivo» del deck (plataforma de luz, fichas de vidrio en perspectiva, una sola sombra profunda en
 * la protagonista y haces de luz) y en el fondo de producto (`productInk`).
 *
 * La voz, la firma y el lugar del lockup salen del contrato de AXIS (0.3.40 publica las seis recetas: reservas, tipos,
 * `signature` y `productMark`; `lineVoiceFrame`). El escenario, la plataforma, los haces, las columnas de luz y la paleta
 * de las maquetas se midieron en las láminas aprobadas (`ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/native/`)
 * y AXIS todavía no los publica, así que viven aquí:
 * TODO AXIS TASK-1949 — pasan a `efeonceGraphicLine.surfaces.deck.recipes.<receta>` (`stage`, `platform`, `beams`,
 * `pillars`, `palette`, `plate`) y los builders los leen del token. La geometría fina de cada maqueta (px) vive en el
 * bloque de la receta en `graphic-line.css`, con el mismo TODO.
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import { SurfacePieceError, type SurfaceAssetRequest } from '../../types'
import { reserve, type SurfaceManifest } from '../../shared'
import { colorVar, layerAsset, measured, n, svgOpen } from '../kit'
import { lineColor, linePlatformSvg, lineStageSvg, lineVoiceFrame, lumVars, req, type LinePlatform, type LineStage } from '../line-stage/kit'

const GL = efeonceGraphicLine as unknown as { color: Record<string, string> }

/**
 * La paleta de las maquetas (HEX medidos en `render-src/native/*.html`; nombre de la paleta de AXIS donde existe).
 * TODO AXIS TASK-1949: `palette` de cada receta.
 */
export const SV360_PALETTE = {
  bg: 'productInk',
  soft: '#cfe4fa',
  muted: '#c9d6e2',
  halo: 'halo',
  teal: '#1f9e94',
  tealDark: 'tealDark',
  shadow: '#000610',
  cardFrom: '#10304b',
  cardTo: '#081c30',
  heroFrom: '#12385a',
  heroCardFrom: '#134066',
  heroCardTo: '#0a2640',
  chip: '#163f60',
  miniFrom: '#12344f',
  miniHeroFrom: '#0f4a6e',
  slideFrom: '#0f3556',
  slideBack: '#0a2138',
  slideMid: '#0c2640',
  docTo: '#f3f6fa',
  docInk: 'navy',
  docMuted: '#5b6b82',
  docPanel: '#eef3f9',
  docBar: '#d3dce8',
  docDash: '#8a9bb3',
  docNote: '#e8f2fd',
  labelBg: '#041028',
  city: '#9fd7ff',
  spaceBg: '#020716'
} as const

export type Sv360Color = keyof typeof SV360_PALETTE

/** Un color de la paleta en HEX: el nombre de AXIS resuelto o el HEX medido. */
export const svColor = (key: Sv360Color): string => {
  const value = SV360_PALETTE[key]

  return /^#/.test(value) ? value : measured(GL.color[value], `el color «${value}» de la paleta`).toLowerCase()
}

/** Las custom properties de la paleta que usa una lámina (`--gl-sv-<clave>-color`). */
export const paletteVars = (keys: readonly Sv360Color[]): Record<string, string> =>
  Object.fromEntries(keys.map(key => [`sv${key[0]!.toUpperCase()}${key.slice(1)}`, colorVar(`sv-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, svColor(key))]))

/**
 * La voz y la firma de la lámina, donde las midió AXIS (`lineVoiceFrame` + `lumVars` del estilo «vivo»). La familia de
 * marcas no pinta eyebrow en la voz (su eyebrow es el rótulo de la columna derecha, que ubica la plantilla): con
 * `eyebrowInVoice: false` el marco no lo lleva, lo declare o no la reserva de AXIS.
 */
export const sv360Frame = (
  manifest: SurfaceManifest,
  recipe: Record<string, unknown>,
  line: string,
  colors: readonly Sv360Color[],
  { eyebrowInVoice = true }: { eyebrowInVoice?: boolean } = {}
): Record<string, unknown> => {
  const reserved = reserve(manifest, 'eyebrow') !== undefined
  const voice = lineVoiceFrame(reserved ? manifest : { ...manifest, reserves: [...(manifest.reserves ?? []), { band: 'eyebrow', fromTop: 0 }] }, recipe)

  if (!eyebrowInVoice) delete voice.eyebrowTop

  return { line, ...voice, ...lumVars(recipe), ...paletteVars(colors) }
}

/** El halo y el piso del estilo «vivo» del deck SEO/AEO: el halo del Lab y el verde agua. */
export const sv360Stage = (cxPx: number, cyPx: number): LineStage => ({
  halo: {
    rPx: 900,
    cxPx,
    cyPx,
    stops: [
      { at: 0, color: 'halo', opacity: 0.3 },
      { at: 0.35, color: '#1f9e94', opacity: 0.11 },
      { at: 1, color: '#1f9e94', opacity: 0 }
    ]
  },
  floor: { fromYPx: 778, color: '#000814', opacity: 0.55 }
})

/** La plataforma de luz: anillo en el halo y arco en el verde agua. `from`/`to` son fracciones del radio (x, y). */
export const sv360Platform = (cxPx: number, cyPx: number, rxPx: number, ryPx: number, from: [number, number], to: [number, number]): LinePlatform => ({
  cxPx,
  cyPx,
  rxPx,
  ryPx,
  fill: {
    stops: [
      { at: 0, color: 'halo', opacity: 0.3 },
      { at: 0.7, color: '#1f9e94', opacity: 0.06 },
      { at: 1, color: '#1f9e94', opacity: 0 }
    ]
  },
  ring: { color: 'halo', opacity: 0.55, strokePx: 3 },
  arc: { color: '#1f9e94', strokePx: 6, from, to, glow: { strokePx: 14, opacity: 0.45, blurPx: 9 } }
})

/** Las capas del escenario (y la plataforma, si la lámina la lleva). */
export const sv360Layers = (
  manifest: SurfaceManifest,
  line: string,
  id: string,
  stage: LineStage,
  platform?: LinePlatform
): { stage: { ref: string; asset: SurfaceAssetRequest }; platform: { ref: string; asset: SurfaceAssetRequest } | null } => ({
  stage: layerAsset(`${id}-stage`, lineStageSvg(manifest, stage, line, id, measured(stage.halo.cxPx, 'el centro del halo'))),
  platform: platform ? layerAsset(`${id}-platform`, linePlatformSvg(manifest, platform, line, id)) : null
})

/** Columnas de luz verticales que suben de la plataforma (industrias): rectángulos con degradé y desenfoque. */
export type LightColumns = {
  color: string
  opacity: [number, number]
  blurPx: number
  columns: { xPx: number; yPx: number; widthPx: number; heightPx: number; opacity: number }[]
}

export const lightColumnsSvg = (manifest: SurfaceManifest, columns: LightColumns, line: string, id: string): string => {
  const color = lineColor(columns.color, line, 'las columnas de luz')

  return (
    svgOpen(manifest) +
    `<defs><linearGradient id="${id}-col" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${color}" stop-opacity="${n(columns.opacity[0])}"/><stop offset="1" stop-color="${color}" stop-opacity="${n(columns.opacity[1])}"/></linearGradient>` +
    `<filter id="${id}-colb"><feGaussianBlur stdDeviation="${n(columns.blurPx)}"/></filter></defs>` +
    `<g filter="url(#${id}-colb)">` +
    columns.columns
      .map(c => `<rect x="${n(c.xPx)}" y="${n(c.yPx)}" width="${n(c.widthPx)}" height="${n(c.heightPx)}" fill="url(#${id}-col)"${c.opacity === 1 ? '' : ` opacity="${n(c.opacity)}"`}/>`)
      .join('') +
    '</g></svg>'
  )
}

/** Haces que bajan de un punto y se abren hacia N destinos (el informe vivo → sus formatos). */
export type FanBeams = {
  fromPx: [number, number]
  toYPx: number
  toXPx: number[]
  bendYPx: number
  color: string
  opacity: [number, number]
  strokePx: number
  glow: { strokePx: number; opacity: number; blurPx: number }
}

export const fanBeamsSvg = (manifest: SurfaceManifest, beams: FanBeams, line: string, id: string): string => {
  const color = lineColor(beams.color, line, 'los haces')
  const [x0, y0] = beams.fromPx

  const paths = beams.toXPx
    .map(x => (x === x0 ? `<path d="M ${n(x0)} ${n(y0)} L ${n(x)} ${n(beams.toYPx)}"/>` : `<path d="M ${n(x0)} ${n(y0)} C ${n(x0)} ${n(beams.bendYPx)} ${n(x)} ${n(beams.bendYPx)} ${n(x)} ${n(beams.toYPx)}"/>`))
    .join('')

  return (
    svgOpen(manifest) +
    `<defs><linearGradient id="${id}-fan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="${n(beams.opacity[0])}"/><stop offset="1" stop-color="${color}" stop-opacity="${n(beams.opacity[1])}"/></linearGradient>` +
    `<filter id="${id}-fanb"><feGaussianBlur stdDeviation="${n(beams.glow.blurPx)}"/></filter></defs>` +
    `<g fill="none" stroke="url(#${id}-fan)" stroke-linecap="round">` +
    `<g stroke-width="${n(beams.glow.strokePx)}" opacity="${n(beams.glow.opacity)}" filter="url(#${id}-fanb)">${paths}</g>` +
    `<g stroke-width="${n(beams.strokePx)}">${paths}</g>` +
    '</g></svg>'
  )
}

/** Una lista del intent con un largo exacto. */
export const listOf = <T = Record<string, unknown>>(value: unknown, count: number, what: string): T[] => {
  const list = Array.isArray(value) ? (value as T[]) : []

  if (list.length !== count) throw new SurfacePieceError(`${what} lleva exactamente ${count}.`, 'invalid-intent')

  return list
}

/** Una lista de textos con un largo exacto; cada texto, obligatorio. */
export const strings = (value: unknown, count: number, what: string): string[] =>
  listOf<unknown>(value, count, what).map((item, i) => req(item, `${what}, el ${i + 1},`))
