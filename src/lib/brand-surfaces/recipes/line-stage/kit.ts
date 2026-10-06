/**
 * El kit de las láminas con escenario en el acento de la LÍNEA (deck Salesforce, TASK-1942): las doce recetas que el
 * operador aprobó el 2026-09-29 comparten el estilo «vivo» con el halo, la plataforma de luz y los haces en el acento de
 * la línea de la pieza (`deckLineStage`, `deckLinePlatform`, `deckLineBeam` de AXIS), el vidrio esmerilado
 * (`deckFrostedGlass`), el documento claro (`deckLineDocument`) con su reflejo, la voz a la izquierda
 * (`deckLineVoice`), la nota arriba a la derecha (`deckLineNote`) y los íconos oficiales de producto de terceros
 * (`thirdPartyProductIcon`, `@efeoncepro/axis-brand-assets` `AXIS_PARTNER_ASSETS`).
 *
 * Todo número sale del token de la receta: este kit sólo lo traduce a capas SVG y a custom properties con el prefijo
 * de la familia (`ls`). Los colores del token son nombres (`accent` = el acento de la línea, `halo`, `soft`, `white`,
 * `black`, `navy`), claves del documento (`ink`, `muted`, `rule`, `chip`, `fill`) o un HEX medido en la lámina.
 */

import { AXIS_PARTNER_ASSETS } from '@efeoncepro/axis-brand-assets'
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import { SurfacePieceError, type SurfaceAssetRequest } from '../../types'
import { reserve, type SurfaceManifest } from '../../shared'
import { accentOf, colorVar, css, layerAsset, measured, n, svgOpen } from '../kit'

const GL = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  slogan: { leadColor: { onDark: string } }
}

/** El directorio del catálogo donde `pnpm brand:tokens` copia las marcas de terceros de `axis-brand-assets`. */
export const PARTNER_ASSET_DIR = 'src/lib/artifact-composer/catalogs/graphic-line-deck/assets'

export type Stop = { at: number; color: string; opacity: number }
export type Shadow = { yPx: number; blurPx: number; color: string; opacity: number }

export type LineDocument = {
  fill: string
  ink: string
  muted: string
  rule: string
  chip: string
  shadow: Shadow
  halo: { blurPx: number; opacity: number; color?: string }
  edge: { color: string; opacity: number; px: number }
}

export type FrostedGlass = {
  fill: { color: string; opacity: number }[]
  angleDeg: number
  backdropBlurPx: number
  border: { px: number; color: string; opacity: number; inset?: boolean }
  shadow: Shadow
}

export type Reflection = { gapPx: number; fromStop: number; opacity: number }

export type LineStage = {
  halo: { rPx: number; cxPx?: number; cyPx: number; stops: Stop[] }
  floor: { fromYPx: number; color: string; opacity: number }
}

export type LinePlatform = {
  cxPx: number
  cyPx: number
  rxPx: number
  ryPx: number
  fill: { stops: Stop[] }
  ring: { color: string; opacity: number; strokePx: number }
  arc: { color: string; strokePx: number; from: [number, number]; to: [number, number]; glow: { strokePx: number; opacity: number; blurPx: number } }
}

export type LineBeam = {
  gradient: { from: { color: string; opacity: number }; to: { color: string; opacity: number } }
  strokePx: number
  glow: { strokePx: number; opacity: number; blurPx: number }
}

/** Un haz: de `from` a `to`, con el control en el punto medio y levantado `bend` sobre el extremo más alto. */
export type BeamPath = { from: [number, number]; to: [number, number]; bend: number }

const DOCUMENT_KEYS = ['fill', 'ink', 'muted', 'rule', 'chip'] as const

/**
 * Una medida fina como custom property, con 4 decimales: `css()` de `recipes/kit.ts` redondea a 2 y convierte un
 * tracking de −0,045 em en −0,04 em (la respuesta de 124 px salía 8 px más ancha).
 */
export const cssFine = (name: string, value: number, unit = 'em'): string => `--gl-${name}=${Number(value.toFixed(4))}${unit}`

/** Un color del token de la familia: nombre, clave del documento o HEX medido. */
export const lineColor = (value: string, line: string, what: string, doc?: LineDocument): string => {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  if (value === 'accent') return accentOf(line).toLowerCase()
  if (value === 'soft') return GL.slogan.leadColor.onDark.toLowerCase()
  if (value === 'white') return '#ffffff'
  if (value === 'black') return '#000000'
  if (doc && (DOCUMENT_KEYS as readonly string[]).includes(value)) return lineColor(doc[value as (typeof DOCUMENT_KEYS)[number]], line, what)

  return measured(GL.color[value], `el color «${value}» de ${what}`).toLowerCase()
}

/** El halo del acento y el piso que se oscurece: la luz de fondo del escenario. */
export const lineStageSvg = (manifest: SurfaceManifest, stage: LineStage, line: string, id: string, cx: number): string => {
  const { width, height } = manifest.canvas
  const { halo, floor } = stage
  const stops = halo.stops.map(stop => `<stop offset="${n(stop.at)}" stop-color="${lineColor(stop.color, line, 'el halo')}" stop-opacity="${n(stop.opacity)}"/>`).join('')
  const floorColor = lineColor(floor.color, line, 'el piso')

  return (
    svgOpen(manifest) +
    `<defs><radialGradient id="${id}-halo" cx="${n(cx)}" cy="${n(halo.cyPx)}" r="${n(halo.rPx)}" gradientUnits="userSpaceOnUse">${stops}</radialGradient>` +
    `<linearGradient id="${id}-floor" x1="0" y1="${n(floor.fromYPx)}" x2="0" y2="${height}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${floorColor}" stop-opacity="0"/><stop offset="1" stop-color="${floorColor}" stop-opacity="${n(floor.opacity)}"/></linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#${id}-halo)"/>` +
    `<rect y="${n(floor.fromYPx)}" width="${width}" height="${n(height - floor.fromYPx)}" fill="url(#${id}-floor)"/>` +
    '</svg>'
  )
}

/** La plataforma de luz (la única órbita de la lámina), corrida `dx` con la escena. */
export const linePlatformSvg = (manifest: SurfaceManifest, platform: LinePlatform, line: string, id: string, dx = 0): string => {
  const { rxPx: rx, ryPx: ry, cyPx: cy } = platform
  const cx = platform.cxPx + dx
  const stops = platform.fill.stops.map(stop => `<stop offset="${n(stop.at)}" stop-color="${lineColor(stop.color, line, 'la plataforma')}" stop-opacity="${n(stop.opacity)}"/>`).join('')
  const from = { x: cx + rx * platform.arc.from[0], y: cy + ry * platform.arc.from[1] }
  const to = { x: cx + rx * platform.arc.to[0], y: cy + ry * platform.arc.to[1] }
  const arc = lineColor(platform.arc.color, line, 'el arco de la plataforma')
  const path = `M ${n(from.x)} ${n(from.y)} A ${n(rx)} ${n(ry)} 0 0 0 ${n(to.x)} ${n(to.y)}`

  return (
    svgOpen(manifest) +
    `<defs><radialGradient id="${id}-pf" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${n(cy * (1 - ry / rx))}) scale(1 ${n(ry / rx)})">${stops}</radialGradient>` +
    `<filter id="${id}-pfg" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${n(platform.arc.glow.blurPx)}"/></filter></defs>` +
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="url(#${id}-pf)"/>` +
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="${lineColor(platform.ring.color, line, 'el anillo de la plataforma')}" stroke-opacity="${n(platform.ring.opacity)}" stroke-width="${n(platform.ring.strokePx)}"/>` +
    `<path d="${path}" fill="none" stroke="${arc}" stroke-width="${n(platform.arc.glow.strokePx)}" opacity="${n(platform.arc.glow.opacity)}" filter="url(#${id}-pfg)"/>` +
    `<path d="${path}" fill="none" stroke="${arc}" stroke-width="${n(platform.arc.strokePx)}" stroke-linecap="round"/>` +
    '</svg>'
  )
}

/** Los haces de luz de la escena en una sola capa, corridos `dx` con la escena. */
export const beamsSvg = (manifest: SurfaceManifest, beams: BeamPath[], beam: LineBeam, line: string, id: string, dx = 0): string => {
  const paths = beams
    .map((b, i) => {
      const [x1, y1] = [b.from[0] + dx, b.from[1]]
      const [x2, y2] = [b.to[0] + dx, b.to[1]]
      const d = `M ${n(x1)} ${n(y1)} Q ${n((x1 + x2) / 2)} ${n(Math.min(y1, y2) - b.bend)} ${n(x2)} ${n(y2)}`
      const g = `${id}-b${i}`

      return (
        `<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}">` +
        `<stop offset="0" stop-color="${lineColor(beam.gradient.from.color, line, 'el haz')}" stop-opacity="${n(beam.gradient.from.opacity)}"/>` +
        `<stop offset="1" stop-color="${lineColor(beam.gradient.to.color, line, 'el haz')}" stop-opacity="${n(beam.gradient.to.opacity)}"/></linearGradient></defs>` +
        `<path d="${d}" fill="none" stroke="url(#${g})" stroke-width="${n(beam.glow.strokePx)}" opacity="${n(beam.glow.opacity)}" filter="url(#${id}-bg)"/>` +
        `<path d="${d}" fill="none" stroke="url(#${g})" stroke-width="${n(beam.strokePx)}"/>`
      )
    })
    .join('')

  return svgOpen(manifest) + `<defs><filter id="${id}-bg"><feGaussianBlur stdDeviation="${n(beam.glow.blurPx)}"/></filter></defs>` + paths + '</svg>'
}

/** Las capas del escenario: halo + piso y plataforma. `cx` del halo: el del token salvo que la receta lo derive. */
export const stageLayers = (
  manifest: SurfaceManifest,
  recipe: Record<string, unknown>,
  line: string,
  id: string,
  opts: { dx?: number; haloCx?: number } = {}
): { stage: { ref: string; asset: SurfaceAssetRequest }; platform: { ref: string; asset: SurfaceAssetRequest } } => {
  const stage = measured(recipe.stage as LineStage | undefined, 'el escenario')
  const platform = measured(recipe.platform as LinePlatform | undefined, 'la plataforma de luz')
  const cx = opts.haloCx ?? measured(stage.halo.cxPx, 'el centro del halo')

  return {
    stage: layerAsset(`${id}-stage`, lineStageSvg(manifest, stage, line, id, cx)),
    platform: layerAsset(`${id}-platform`, linePlatformSvg(manifest, platform, line, id, opts.dx ?? 0))
  }
}

type VoiceType = { px?: number; lineHeight?: number; tracking?: string; maxWidthPx?: number; insetPx?: number }

const typeOf = (recipe: Record<string, unknown>, key: string): VoiceType =>
  measured((recipe.type as Record<string, VoiceType> | undefined)?.[key], `la tipografía «${key}» de la receta`)

const topOf = (manifest: SurfaceManifest, band: string): number =>
  Math.round(measured(reserve(manifest, band)?.fromTop, `la altura de «${band}»`) * manifest.canvas.height)

/**
 * La voz de la familia: eyebrow, pregunta con anillo, respuesta con esfera y bajada, donde las midió AXIS. Con
 * `questionLines: 2` la pregunta se compone siempre en dos líneas y la respuesta y la bajada bajan `twoLineShiftPx`
 * (así se aprobaron las once láminas con bajada); sin él, la voz queda donde la reserva la pone.
 */
export const lineVoiceFrame = (manifest: SurfaceManifest, recipe: Record<string, unknown>): Record<string, unknown> => {
  const twoLines = recipe.questionLines === 2
  const down = twoLines ? measured(recipe.twoLineShiftPx as number | undefined, 'el corrimiento de la voz en dos líneas') : 0
  const question = typeOf(recipe, 'question')
  const answer = typeOf(recipe, 'answer')
  const shadow = recipe.answerShadow as Shadow | undefined
  const hasBody = Boolean((recipe.type as Record<string, unknown>).body)

  const frame: Record<string, unknown> = {
    margin: measured(manifest.safeArea?.marginPx, 'el margen del deck'),
    eyebrowTop: topOf(manifest, 'eyebrow'),
    questionTop: topOf(manifest, 'question'),
    answerTop: topOf(manifest, 'answer') + down,
    answerPx: measured(answer.px, 'el cuerpo de la respuesta'),
    answerLeading: css('ls-answer-leading', measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
    answerTracking: cssFine('ls-answer-tracking', Number.parseFloat(measured(answer.tracking, 'el tracking de la respuesta'))),
    answerInset: css('ls-answer-inset', answer.insetPx ?? 0)
  }

  if (question.maxWidthPx !== undefined) frame.questionWidth = css('ls-question-width', question.maxWidthPx)

  if (hasBody) {
    const body = typeOf(recipe, 'body')

    frame.bodyTop = topOf(manifest, 'body') + down
    frame.bodyPx = measured(body.px, 'el cuerpo de la bajada')
    frame.bodyWidth = measured(body.maxWidthPx, 'el ancho de la bajada')
  }

  if (shadow) {
    frame.answerShadowY = css('ls-answer-shadow-y', shadow.yPx)
    frame.answerShadowBlur = css('ls-answer-shadow-blur', shadow.blurPx)
    frame.answerShadowOpacity = css('ls-answer-shadow-opacity', shadow.opacity * 100, '%')
    frame.answerShadowColor = colorVar('ls-answer-shadow', lineColor(shadow.color, '', 'la sombra de la respuesta'))
  }

  return frame
}

/** La burbuja URL con fusión de luminosidad del pie (`signature.urlBubble`). */
export const lumVars = (recipe: Record<string, unknown>) => {
  const lum = (recipe.signature as { urlBubble?: { widthPx?: number; bottomPx?: number } } | undefined)?.urlBubble

  return {
    lumWidth: css('lum-width', measured(lum?.widthPx, 'el ancho de la burbuja URL')),
    lumBottom: css('lum-bottom', measured(lum?.bottomPx, 'la altura de la burbuja URL'))
  }
}

/** El vidrio esmerilado de las fichas oscuras, como custom properties `--gl-<prefix>-glass-*`. */
export const glassVars = (glass: FrostedGlass, line: string, prefix = 'ls') => {
  const [from, to] = glass.fill

  if (!from || !to) throw new SurfacePieceError('AXIS no midió los dos tonos del vidrio.', 'invalid-intent')

  return {
    [`${prefix}GlassFrom`]: colorVar(`${prefix}-glass-from`, lineColor(from.color, line, 'el vidrio')),
    [`${prefix}GlassFromOpacity`]: css(`${prefix}-glass-from-opacity`, from.opacity * 100, '%'),
    [`${prefix}GlassTo`]: colorVar(`${prefix}-glass-to`, lineColor(to.color, line, 'el vidrio')),
    [`${prefix}GlassToOpacity`]: css(`${prefix}-glass-to-opacity`, to.opacity * 100, '%'),
    [`${prefix}GlassAngle`]: css(`${prefix}-glass-angle`, glass.angleDeg, 'deg'),
    [`${prefix}GlassBlur`]: css(`${prefix}-glass-blur`, glass.backdropBlurPx),
    [`${prefix}GlassBorder`]: css(`${prefix}-glass-border`, glass.border.px),
    [`${prefix}GlassBorderColor`]: colorVar(`${prefix}-glass-border`, lineColor(glass.border.color, line, 'el filo del vidrio')),
    [`${prefix}GlassBorderOpacity`]: css(`${prefix}-glass-border-opacity`, glass.border.opacity * 100, '%'),
    [`${prefix}GlassShadowY`]: css(`${prefix}-glass-shadow-y`, glass.shadow.yPx),
    [`${prefix}GlassShadowBlur`]: css(`${prefix}-glass-shadow-blur`, glass.shadow.blurPx),
    [`${prefix}GlassShadowColor`]: colorVar(`${prefix}-glass-shadow`, lineColor(glass.shadow.color, line, 'la sombra del vidrio')),
    [`${prefix}GlassShadowOpacity`]: css(`${prefix}-glass-shadow-opacity`, glass.shadow.opacity * 100, '%')
  }
}

/** El documento claro con su sombra profunda, su halo en el acento y su filo, como `--gl-ls-doc-*`. */
export const documentVars = (doc: LineDocument, line: string) => ({
  docFill: colorVar('ls-doc', lineColor(doc.fill, line, 'el documento')),
  docInk: colorVar('ls-doc-ink', lineColor(doc.ink, line, 'la tinta del documento')),
  docMuted: colorVar('ls-doc-muted', lineColor(doc.muted, line, 'el texto apagado del documento')),
  docRule: colorVar('ls-doc-rule', lineColor(doc.rule, line, 'el filete del documento')),
  docChip: colorVar('ls-doc-chip', lineColor(doc.chip, line, 'los chips del documento')),
  docShadowY: css('ls-doc-shadow-y', doc.shadow.yPx),
  docShadowBlur: css('ls-doc-shadow-blur', doc.shadow.blurPx),
  docShadowColor: colorVar('ls-doc-shadow', lineColor(doc.shadow.color, line, 'la sombra del documento')),
  docShadowOpacity: css('ls-doc-shadow-opacity', doc.shadow.opacity * 100, '%'),
  docHaloBlur: css('ls-doc-halo-blur', doc.halo.blurPx),
  docHaloColor: colorVar('ls-doc-halo', lineColor(doc.halo.color ?? 'halo', line, 'el halo del documento')),
  docHaloOpacity: css('ls-doc-halo-opacity', doc.halo.opacity * 100, '%'),
  docEdge: css('ls-doc-edge', doc.edge.px),
  docEdgeColor: colorVar('ls-doc-edge', lineColor(doc.edge.color, line, 'el filo del documento')),
  docEdgeOpacity: css('ls-doc-edge-opacity', doc.edge.opacity * 100, '%')
})

/** El reflejo bajo el documento (`deckReflection`). */
export const reflectionVars = (reflection: Reflection) => ({
  reflectGap: css('ls-reflect-gap', reflection.gapPx),
  reflectFrom: css('ls-reflect-from', reflection.fromStop * 100, '%'),
  reflectColor: colorVar('ls-reflect', '#ffffff'),
  reflectOpacity: css('ls-reflect-opacity', reflection.opacity * 100, '%')
})

/** La nota arriba a la derecha (`deckLineNote`): posición, cuerpo, peso y color. */
export const noteVars = (recipe: Record<string, unknown>, line: string) => {
  const note = measured(recipe.note as { rightPx: number; topPx: number; px: number; weight: number; color: string } | undefined, 'la nota de la lámina')

  return {
    noteRight: css('ls-note-right', note.rightPx),
    noteTop: css('ls-note-top', note.topPx),
    notePx: css('ls-note-px', note.px),
    noteWeight: css('ls-note-wght', note.weight, ''),
    noteColor: colorVar('ls-note', lineColor(note.color, line, 'la nota'))
  }
}

/** Un texto del intent: recortado y obligatorio. */
export const req = (value: unknown, what: string): string => {
  const trimmed = typeof value === 'string' ? value.trim() : ''

  if (!trimmed) throw new SurfacePieceError(`${what} va con texto.`, 'invalid-intent')

  return trimmed
}

/** Una lista del intent con un largo exacto. */
export const exactly = <T = unknown>(value: unknown, count: number, what: string): T[] => {
  const list = Array.isArray(value) ? (value as T[]) : []

  if (list.length !== count) throw new SurfacePieceError(`${what} lleva exactamente ${count}.`, 'invalid-intent')

  return list
}

/** Un índice 1-based dentro de 1…max. */
export const indexIn = (value: unknown, max: number, what: string): number => {
  const index = typeof value === 'number' ? value : Number.NaN

  if (!Number.isInteger(index) || index < 1 || index > max) throw new SurfacePieceError(`${what} va de 1 a ${max}.`, 'invalid-intent')

  return index
}

/**
 * Los íconos oficiales de producto que la receta admite (`thirdPartyProductIcon`), por plataforma: la línea decide el
 * kit. `revenue-hubspot` usa los seis Hubs de HubSpot (`hubspot-icon-<nombre>`, TASK-1943); cualquier otra línea, los de
 * Salesforce (`salesforce-icon-<nombre>`). Los nombres cortos del catálogo de recetas (`sales`, `service`…) apuntan a
 * `AXIS_PARTNER_ASSETS`. Se usan en su color, sin recolorear, y sólo donde se nombra el producto; cada kit está sujeto a
 * la autorización de su titular.
 */
export const PRODUCT_ICON_KITS = {
  salesforce: ['agentforce', 'sales', 'service', 'marketing', 'data-cloud', 'platform', 'slack', 'tableau'],
  hubspot: ['marketing', 'sales', 'service', 'content', 'data', 'revenue']
} as const

export type ProductIconPartner = keyof typeof PRODUCT_ICON_KITS

/** El kit de Salesforce, el de la serie original (se mantiene por compatibilidad). */
export const PRODUCT_ICONS = PRODUCT_ICON_KITS.salesforce

/** La plataforma cuyos íconos de producto lleva una línea: HubSpot en `revenue-hubspot`, Salesforce en las demás. */
export const productPartnerOf = (line: unknown): ProductIconPartner => (line === 'revenue-hubspot' ? 'hubspot' : 'salesforce')

/**
 * El ícono que una receta fija por su rol, no por el intent: los agentes, la plataforma que reconcilia y el perfil
 * unificado. En HubSpot los agentes viven en Service Hub (Customer Agent) y la base de clientes en Data Hub.
 */
export const PRODUCT_ROLE_ICONS: Record<ProductIconPartner, { agents: string; platform: string; profile: string }> = {
  salesforce: { agents: 'agentforce', platform: 'platform', profile: 'data-cloud' },
  hubspot: { agents: 'service', platform: 'data', profile: 'data' }
}

type PartnerAsset = { id: string; file: string; kind: string }

const partnerAsset = (id: string): PartnerAsset => {
  const asset = (AXIS_PARTNER_ASSETS as readonly PartnerAsset[]).find(entry => entry.id === id)

  if (!asset) throw new SurfacePieceError(`«${id}» no está en AXIS_PARTNER_ASSETS de @efeoncepro/axis-brand-assets.`, 'invalid-intent')

  return asset
}

/** Un archivo de marca de tercero de `axis-brand-assets` como asset externo (copiado al catálogo por `pnpm brand:tokens`). */
export const partnerFile = (id: string): { ref: string; asset: SurfaceAssetRequest } => {
  const asset = partnerAsset(id)
  const ref = `asset-ref:file:${asset.id}`

  return { ref, asset: { ref, kind: 'file', path: `${PARTNER_ASSET_DIR}/${asset.file}` } }
}

/** El ícono oficial de un producto (`sales`, `service`…), validado contra la lista cerrada de la receta. */
export const productIcon = (name: unknown, what: string, line?: unknown): { ref: string; asset: SurfaceAssetRequest } => {
  const partner = productPartnerOf(line)
  const kit: readonly string[] = PRODUCT_ICON_KITS[partner]

  if (typeof name !== 'string' || !kit.includes(name)) {
    throw new SurfacePieceError(`${what}: el ícono de producto es uno de ${kit.join(' · ')}.`, 'invalid-intent')
  }

  return partnerFile(`${partner}-icon-${name}`)
}

/** El ícono de un rol fijo de la receta (agentes, plataforma, perfil) en el kit de la línea. */
export const productRoleIcon = (role: keyof (typeof PRODUCT_ROLE_ICONS)[ProductIconPartner], what: string, line?: unknown) =>
  productIcon(PRODUCT_ROLE_ICONS[productPartnerOf(line)][role], what, line)

/** Junta assets sin repetir la misma referencia. */
export const uniqueAssets = (assets: SurfaceAssetRequest[]): SurfaceAssetRequest[] => {
  const seen = new Set<string>()

  return assets.filter(asset => (seen.has(asset.ref) ? false : (seen.add(asset.ref), true)))
}
