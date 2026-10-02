/**
 * `method-surround-cycle` (TASK-1934): «¿Cómo se sostiene? En ciclo.» El método Surround Discovery como un ciclo sobre
 * la órbita tendida en perspectiva, que ES el loop y es la única órbita de la lámina (sin plataforma aparte).
 *
 * La capa del loop (relleno radial, anillo, tramo encendido desde la estación 1 con su brillo, las flechas de sentido y
 * la esfera con su halo al final del tramo) la pinta este builder desde el token `loop` de AXIS. Las cuatro estaciones
 * (Medir, Crear, Distribuir, Optimizar) se ubican en `stations.atRad` sobre la elipse: su ícono 3D descansa sobre el
 * nodo y su tarjeta de vidrio va desplazada (`stations.cards`), fuera de la elipse; la primera lleva el rótulo de
 * inicio y el borde destacado. «Tu marca» va al centro (`core`). Todo valor sale del token de la receta; el contenido
 * (estaciones, íconos, centro, rótulo de inicio) llega en el intent. Referencia: DeckCicloSurround (MX3-ciclo).
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import type { SurfaceAssetRequest } from '../../types'
import { SurfacePieceError } from '../../types'
import { contentOf, voiceSlots, type SurfaceManifest } from '../../shared'

import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured, n, paletteColor, stageSvg, svgOpen, text, type StageTokens, type Stop } from '../kit'
import { liveVoiceFrame } from '../sections'

type Shadow = { yPx: number; blurPx: number; color: string; opacity: number }
type Glow = { blurPx: number; opacity: number }

type LoopTokens = {
  cxPx: number
  cyPx: number
  rxPx: number
  ryPx: number
  fill: { stops: Stop[] }
  ring: { color: string; opacity: number; strokePx: number }
  lit: { fromRad: number; litRad: number; color: string; strokePx: number; glow: { strokePx: number; opacity: number; blurPx: number } }
  sphere: { radiusPx: number; glow: { radiusPx: number; blurPx: number } }
  arrows: { atRad: number[]; widthPx: number; halfHeightPx: number; tipOffsetPx: number; strokePx: number; color: string; opacity: number }
}

type StationsTokens = {
  count: number
  atRad: number[]
  icon: { leadPx: number; px: number; liftRatio: number; shadow: Shadow }
  cards: { dxPx: number; dyPx: number; widthPx: number; descMaxChars: number }[]
  card: {
    padding: [number, number, number]
    radiusPx: number
    angleDeg: number
    fill: { lead: [string, string]; rest: [string, string] }
    border: { lead: { px: number; color: string; opacity: number }; rest: { px: number; color: string; opacity: number } }
    shadow: Shadow
    glow: { color: string; lead: Glow; rest: Glow }
  }
  kicker: { px: number; weight: number; tracking: string; uppercase: boolean; leadColor: string; color: string; startColor: string }
  title: { px: number; lineHeight: number; tracking: string; gapPx: number; family: string }
  desc: { px: number; weight: number; lineHeight: number; gapPx: number; color: string }
}

type CoreTokens = {
  widthPx: number
  liftPx: number
  title: { px: number; lineHeight: number; tracking: string; family: string; glow: Glow & { color: string } }
  caption: { px: number; weight: number; gapPx: number; color: string }
}

type StationIntent = { icon?: unknown; title?: unknown; description?: unknown }

/** El gris suave de la voz sobre oscuro: el `soft` de los tokens de la receta. */
const SOFT_ON_DARK = (efeonceGraphicLine as unknown as { slogan: { leadColor: { onDark: string } } }).slogan.leadColor.onDark

/** Un color del token de la receta: `soft` es el gris suave de la voz; el resto, la paleta, `white` o un HEX medido. */
const tone = (value: string, what: string): string => (value === 'soft' ? SOFT_ON_DARK : paletteColor(value, what))

const em = (value: string, what: string): number => {
  const parsed = Number.parseFloat(value)

  if (!Number.isFinite(parsed) || !value.trim().endsWith('em')) throw new SurfacePieceError(`AXIS no midió ${what} en em.`, 'invalid-intent')

  return parsed
}

/** La familia de un título del ciclo: la de la respuesta (Bricolage), como en la lámina aprobada. */
const answerFamily = (family: string, what: string): void => {
  if (family !== 'answer') throw new SurfacePieceError(`La plantilla sólo pinta ${what} en la familia de la respuesta.`, 'invalid-intent')
}

/** El punto de la elipse del loop en un ángulo (radianes, 0 a la derecha, creciendo en sentido horario). */
const pointAt = (loop: LoopTokens, rad: number) => ({ x: loop.cxPx + loop.rxPx * Math.cos(rad), y: loop.cyPx + loop.ryPx * Math.sin(rad) })

/**
 * La órbita del ciclo, en UNA capa: el relleno radial tendido, el anillo, el tramo encendido desde la estación 1 (con
 * su brillo), las flechas de sentido a mitad de cada tramo y la esfera con su halo en la punta del tramo.
 */
const loopSvg = (manifest: SurfaceManifest, loop: LoopTokens): string => {
  const { cxPx: cx, cyPx: cy, rxPx: rx, ryPx: ry } = loop

  const stops = loop.fill.stops
    .map(stop => `<stop offset="${n(stop.at)}" stop-color="${paletteColor(stop.color, 'el relleno del ciclo')}" stop-opacity="${n(stop.opacity)}"/>`)
    .join('')

  const litColor = paletteColor(loop.lit.color, 'el tramo encendido')
  const from = pointAt(loop, loop.lit.fromRad)
  const to = pointAt(loop, loop.lit.fromRad + loop.lit.litRad)
  const large = loop.lit.litRad > Math.PI ? 1 : 0
  const lit = `M ${n(from.x)} ${n(from.y)} A ${n(rx)} ${n(ry)} 0 ${large} 1 ${n(to.x)} ${n(to.y)}`
  const arrowColor = paletteColor(loop.arrows.color, 'las flechas del ciclo')
  // La punta de la flecha va `tipOffsetPx` por delante del punto de la elipse; la cola, el resto del ancho por detrás.
  const tip = loop.arrows.tipOffsetPx
  const tail = tip - loop.arrows.widthPx
  const h = loop.arrows.halfHeightPx

  // Cada flecha apunta en el sentido del ciclo: la tangente de la elipse en su ángulo.
  const arrows = loop.arrows.atRad
    .map(rad => {
      const p = pointAt(loop, rad)
      const angle = (Math.atan2(ry * Math.cos(rad), -rx * Math.sin(rad)) * 180) / Math.PI

      return (
        `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(angle)})">` +
        `<path d="M ${n(tail)} ${n(-h)} L ${n(tip)} 0 L ${n(tail)} ${n(h)}" fill="none" stroke="${arrowColor}" stroke-width="${n(loop.arrows.strokePx)}" stroke-linecap="round" stroke-linejoin="round" opacity="${n(loop.arrows.opacity)}"/></g>`
      )
    })
    .join('')

  return (
    svgOpen(manifest) +
    `<defs><radialGradient id="sur-fill" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${n(cy * (1 - ry / rx))}) scale(1 ${n(ry / rx)})">${stops}</radialGradient>` +
    `<filter id="sur-lit-glow"><feGaussianBlur stdDeviation="${n(loop.lit.glow.blurPx)}"/></filter>` +
    `<filter id="sur-sphere-glow"><feGaussianBlur stdDeviation="${n(loop.sphere.glow.blurPx)}"/></filter></defs>` +
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="url(#sur-fill)"/>` +
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="${paletteColor(loop.ring.color, 'el anillo del ciclo')}" stroke-opacity="${n(loop.ring.opacity)}" stroke-width="${n(loop.ring.strokePx)}"/>` +
    `<path d="${lit}" fill="none" stroke="${litColor}" stroke-width="${n(loop.lit.glow.strokePx)}" opacity="${n(loop.lit.glow.opacity)}" filter="url(#sur-lit-glow)"/>` +
    `<path d="${lit}" fill="none" stroke="${litColor}" stroke-width="${n(loop.lit.strokePx)}" stroke-linecap="round"/>` +
    arrows +
    `<circle cx="${n(to.x)}" cy="${n(to.y)}" r="${n(loop.sphere.glow.radiusPx)}" fill="${litColor}" filter="url(#sur-sphere-glow)"/>` +
    `<circle cx="${n(to.x)}" cy="${n(to.y)}" r="${n(loop.sphere.radiusPx)}" fill="${litColor}"/>` +
    '</svg>'
  )
}

export const methodSurroundCycle: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const loop = measured(recipe.loop as LoopTokens | undefined, 'el loop del ciclo')
  const stations = measured(recipe.stations as StationsTokens | undefined, 'las estaciones del ciclo')
  const core = measured(recipe.core as CoreTokens | undefined, 'el centro del ciclo')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (voice.answerLead) throw new SurfacePieceError('La respuesta del ciclo va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('El ciclo lleva su bajada (`body`).', 'invalid-intent')

  const items = (Array.isArray(intent.stations) ? intent.stations : []) as StationIntent[]

  if (stations.atRad.length !== stations.count || stations.cards.length !== stations.count) {
    throw new SurfacePieceError('AXIS no midió un ángulo y una tarjeta por estación.', 'invalid-intent')
  }

  if (items.length !== stations.count) throw new SurfacePieceError(`El ciclo lleva siempre ${stations.count} estaciones (\`stations\`).`, 'invalid-intent')

  if (!stations.kicker.uppercase) throw new SurfacePieceError('La plantilla pinta el rótulo de la estación en mayúsculas.', 'invalid-intent')

  answerFamily(stations.title.family, 'el título de la estación')
  answerFamily(core.title.family, 'el centro del ciclo')

  const startLabel = text(intent.startLabel, 'El rótulo de la estación 1 (`startLabel`, p. ej. «Empieza aquí»)')
  const centre = (intent.core ?? {}) as { title?: unknown; caption?: unknown }
  const caption = typeof centre.caption === 'string' && centre.caption.trim() ? centre.caption.trim() : null
  const stage = layerAsset('method-surround-cycle-stage', stageSvg(manifest, measured(recipe.stage as StageTokens | undefined, 'el escenario'), 'sur'))
  const orbit = layerAsset('method-surround-cycle-loop', loopSvg(manifest, loop))
  const assets: SurfaceAssetRequest[] = [stage.asset, orbit.asset]
  const { card, kicker, title, desc, icon } = stations

  const stationSlots = items.map((station, i) => {
    const lead = i === 0
    const node = pointAt(loop, stations.atRad[i]!)
    const size = lead ? icon.leadPx : icon.px
    const box = stations.cards[i]!
    const file = text(station.icon, `El ícono de la estación ${i + 1} (\`stations[${i}].icon\`)`)
    const description = text(station.description, `La descripción de la estación ${i + 1}`)

    if ([...description].length > box.descMaxChars) {
      throw new SurfacePieceError(`La descripción de la estación ${i + 1} supera los ${box.descMaxChars} caracteres de su tarjeta.`, 'invalid-intent')
    }

    const ref = `asset-ref:file:${file.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')}`

    if (!assets.some(asset => asset.ref === ref)) assets.push({ ref, kind: 'file', path: file })

    return {
      role: lead ? 'lead' : 'rest',
      iconLeft: css('sur-icon-left', node.x - size / 2),
      iconTop: css('sur-icon-top', node.y - size * icon.liftRatio),
      iconSize: css('sur-icon-size', size),
      cardLeft: css('sur-card-left', node.x + box.dxPx),
      cardTop: css('sur-card-top', node.y + box.dyPx),
      cardWidth: css('sur-card-width', box.widthPx),
      src: ref,
      number: String(i + 1).padStart(2, '0'),
      ...(lead ? { start: startLabel } : {}),
      title: text(station.title, `El título de la estación ${i + 1}`),
      description
    }
  })

  const lum = (recipe.signature as { urlBubble?: { widthPx?: number; bottomPx?: number } } | undefined)?.urlBubble
  const answerShadow = measured(recipe.answerShadow as { color?: string } | undefined, 'la sombra de la respuesta')

  return {
    contentType: 'deck.method-surround-cycle',
    slots: {
      frame: {
        line: intent.line,
        ...liveVoiceFrame(manifest, recipe, voice.question ?? '', 'sur'),
        lumWidth: css('lum-width', measured(lum?.widthPx, 'la burbuja en luminosidad')),
        lumBottom: css('lum-bottom', measured(lum?.bottomPx, 'la burbuja en luminosidad')),
        answerShadowColor: colorVar('sur-answer-shadow', tone(measured(answerShadow.color, 'el color de la sombra de la respuesta'), 'la sombra de la respuesta')),
        cardGlowColor: colorVar('sur-card-glow', tone(card.glow.color, 'el brillo de las tarjetas')),
        coreGlowColor: colorVar('sur-core-glow', tone(core.title.glow.color, 'el brillo del centro')),
        coreLeft: css('sur-core-left', loop.cxPx - core.widthPx / 2),
        coreTop: css('sur-core-top', loop.cyPx - core.liftPx),
        coreWidth: css('sur-core-width', core.widthPx),
        coreTitlePx: css('sur-core-title-px', core.title.px),
        coreTitleLeading: css('sur-core-title-leading', core.title.lineHeight, ''),
        coreTitleTracking: css('sur-core-title-tracking', em(core.title.tracking, 'el tracking del centro'), 'em'),
        coreGlowBlur: css('sur-core-glow-blur', core.title.glow.blurPx),
        coreGlowOpacity: css('sur-core-glow-opacity', core.title.glow.opacity * 100, '%'),
        coreCaptionPx: css('sur-core-caption-px', core.caption.px),
        coreCaptionWght: css('sur-core-caption-wght', core.caption.weight, ''),
        coreCaptionGap: css('sur-core-caption-gap', core.caption.gapPx),
        coreCaptionColor: colorVar('sur-core-caption', tone(core.caption.color, 'la nota del centro')),
        iconShadowY: css('sur-icon-shadow-y', icon.shadow.yPx),
        iconShadowBlur: css('sur-icon-shadow-blur', icon.shadow.blurPx),
        iconShadowColor: colorVar('sur-icon-shadow', tone(icon.shadow.color, 'la sombra de los íconos')),
        iconShadowOpacity: css('sur-icon-shadow-opacity', icon.shadow.opacity * 100, '%'),
        cardPadTop: css('sur-card-pad-top', card.padding[0]),
        cardPadX: css('sur-card-pad-x', card.padding[1]),
        cardPadBottom: css('sur-card-pad-bottom', card.padding[2]),
        cardRadius: css('sur-card-radius', card.radiusPx),
        cardAngle: css('sur-card-angle', card.angleDeg, 'deg'),
        leadFillFrom: colorVar('sur-lead-from', tone(card.fill.lead[0], 'la tarjeta de inicio')),
        leadFillTo: colorVar('sur-lead-to', tone(card.fill.lead[1], 'la tarjeta de inicio')),
        restFillFrom: colorVar('sur-rest-from', tone(card.fill.rest[0], 'las tarjetas')),
        restFillTo: colorVar('sur-rest-to', tone(card.fill.rest[1], 'las tarjetas')),
        leadBorder: css('sur-lead-border', card.border.lead.px),
        leadBorderColor: colorVar('sur-lead-border', tone(card.border.lead.color, 'el borde de la tarjeta de inicio')),
        leadBorderOpacity: css('sur-lead-border-opacity', card.border.lead.opacity * 100, '%'),
        restBorder: css('sur-rest-border', card.border.rest.px),
        restBorderColor: colorVar('sur-rest-border', tone(card.border.rest.color, 'el borde de las tarjetas')),
        restBorderOpacity: css('sur-rest-border-opacity', card.border.rest.opacity * 100, '%'),
        shadowY: css('sur-shadow-y', card.shadow.yPx),
        shadowBlur: css('sur-shadow-blur', card.shadow.blurPx),
        shadowColor: colorVar('sur-shadow', tone(card.shadow.color, 'la sombra de las tarjetas')),
        shadowOpacity: css('sur-shadow-opacity', card.shadow.opacity * 100, '%'),
        leadGlowBlur: css('sur-lead-glow-blur', card.glow.lead.blurPx),
        leadGlowOpacity: css('sur-lead-glow-opacity', card.glow.lead.opacity * 100, '%'),
        restGlowBlur: css('sur-rest-glow-blur', card.glow.rest.blurPx),
        restGlowOpacity: css('sur-rest-glow-opacity', card.glow.rest.opacity * 100, '%'),
        kickerPx: css('sur-kicker-px', kicker.px),
        kickerWght: css('sur-kicker-wght', kicker.weight, ''),
        kickerTracking: css('sur-kicker-tracking', em(kicker.tracking, 'el tracking del rótulo'), 'em'),
        kickerLeadColor: colorVar('sur-kicker-lead', tone(kicker.leadColor, 'el rótulo de inicio')),
        kickerColor: colorVar('sur-kicker', tone(kicker.color, 'el rótulo de las estaciones')),
        kickerStartColor: colorVar('sur-kicker-start', tone(kicker.startColor, 'el rótulo «Empieza aquí»')),
        titlePx: css('sur-title-px', title.px),
        titleLeading: css('sur-title-leading', title.lineHeight, ''),
        titleTracking: css('sur-title-tracking', em(title.tracking, 'el tracking del título'), 'em'),
        titleGap: css('sur-title-gap', title.gapPx),
        descPx: css('sur-desc-px', desc.px),
        descWght: css('sur-desc-wght', desc.weight, ''),
        descLeading: css('sur-desc-leading', desc.lineHeight, ''),
        descGap: css('sur-desc-gap', desc.gapPx),
        descColor: colorVar('sur-desc', tone(desc.color, 'la descripción de las estaciones'))
      },
      stage: { src: stage.ref },
      loop: { src: orbit.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      stations: stationSlots,
      core: {
        title: text(centre.title, 'El centro del ciclo (`core.title`)'),
        ...(caption ? { caption } : {})
      }
    },
    assets
  }
}
