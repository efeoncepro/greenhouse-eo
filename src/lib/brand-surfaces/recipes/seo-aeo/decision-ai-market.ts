/**
 * `decision-ai-market` (TASK-1934): el contexto de mercado. «¿Dónde busca tu cliente? En la IA.»: tres monolitos de
 * vidrio en perspectiva sobre la plataforma de luz, una cifra por fuente; el del centro, adelante (lead). La voz «viva»
 * a la izquierda y la burbuja URL en luminosidad al pie. Referencia: DeckMercadoIA (MX2-mercado).
 *
 * Todo lo que pinta sale de AXIS: la voz, de las reservas y tipos de la receta (`liveVoiceFrame`); el escenario, la
 * plataforma y los monolitos, de `stage`, `platform` y `monoliths` del token. Las CIFRAS llegan por `figures` del
 * contrato (valor, rótulo y fuente; AXIS rechaza una cifra sin fuente con `figure-source-required` antes de llegar
 * aquí); el detalle, el año y el archivo del logo de la fuente son propios de la lámina y viajan en el mismo ítem del
 * intent. La fuente se imprime SIEMPRE: el logo del tercero normalizado por el compositor (un tono, el mismo peso
 * óptico) o, sin logo, un wordmark tipográfico con el texto de `source`.
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import type { SurfaceAssetRequest } from '../../types'
import { SurfacePieceError } from '../../types'
import { contentOf, voiceSlots } from '../../shared'

import { platformSvg, type PlatformTokens } from '../close'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured, paletteColor, stageSvg, text, type StageTokens } from '../kit'
import { liveVoiceFrame } from '../sections'

type Monolith = { cxPx: number; topPx: number; widthPx: number; heightPx: number; rotateYDeg: number; z: number; lead?: boolean }
type Border = { px: number; color: string; opacity: number }
type Glow = { blurPx: number; opacity: number }

type MonolithTokens = {
  perspectivePx: number
  originPx: [number, number]
  items: Monolith[]
  padding: { lead: [number, number]; side: [number, number] }
  radiusPx: number
  angleDeg: number
  fill: { lead: [string, string]; side: [string, string] }
  border: { lead: Border; side: Border }
  shadow: { yPx: number; blurPx: number; color: string; opacity: number }
  glow: { lead: Glow; side: Glow }
  reflection: { gapPx: number; fromStop: number; opacity: number }
  value: { leadPx: number; px: number; longPx: number; longFromChars: number; lineHeight: number; tracking: string; leadColor: string; color: string }
  label: { leadPx: number; px: number; lineHeight: number; tracking: string; gapPx: number; family: string }
  detail: { leadPx: number; px: number; weight: number; lineHeight: number; gapPx: number; color: string }
  footer: { paddingTopPx: number; rule: Border; year: { px: number; weight: number; color: string } }
  source: {
    logoHeightPx: number
    tone: string
    /** El área de tinta común de los logos y su caja máxima (la altura es `logoHeightPx`). */
    inkArea: number
    maxWidthPx: number
    wordmark: { px: number; weight: number; tracking: string; color: string }
  }
}

/** Lo que la lámina agrega a cada cifra del contrato: el detalle, el año y, si la fuente tiene logo, su archivo. */
type FigureExtra = { detail?: unknown; year?: unknown; sourceLogo?: unknown }

/** El gris suave de la voz sobre oscuro (`slogan.leadColor.onDark`): lo que el token llama `soft`. */
const SOFT_ON_DARK = (efeonceGraphicLine as unknown as { slogan: { leadColor: { onDark: string } } }).slogan.leadColor.onDark

const tone = (value: string, what: string): string => (value === 'soft' ? SOFT_ON_DARK : paletteColor(value, what))

const em = (value: string, what: string): number => Number.parseFloat(measured(value, what))

export const decisionAiMarket: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const mono = measured(recipe.monoliths as MonolithTokens | undefined, 'los monolitos del mercado')
  const max = measured((recipe.figures as { max?: number } | undefined)?.max, 'las cifras del mercado')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (!content.body) throw new SurfacePieceError('El contexto de mercado lleva su bajada (`body`).', 'invalid-intent')
  if (mono.items.length !== max) throw new SurfacePieceError(`AXIS mide ${mono.items.length} monolitos y ${max} cifras: no coinciden.`, 'invalid-intent')

  const figures = content.figures ?? []
  const extras = (Array.isArray(intent.figures) ? intent.figures : []) as FigureExtra[]

  if (figures.length !== max || extras.length !== max) {
    throw new SurfacePieceError(`El contexto de mercado lleva exactamente ${max} cifras, cada una con su fuente (\`figures\`).`, 'invalid-intent')
  }

  if (mono.label.family !== 'answer') throw new SurfacePieceError(`La familia «${mono.label.family}» del rótulo no es una voz del deck.`, 'invalid-intent')

  const stage = layerAsset('decision-ai-market-stage', stageSvg(manifest, measured(recipe.stage as StageTokens | undefined, 'el escenario'), 'am'))
  const platform = layerAsset('decision-ai-market-platform', platformSvg(manifest, measured(recipe.platform as PlatformTokens | undefined, 'la plataforma'), 'am'))
  const lum = measured((recipe.signature as { urlBubble?: { widthPx?: number; bottomPx?: number } } | undefined)?.urlBubble, 'la burbuja en luminosidad')
  const assets: SurfaceAssetRequest[] = [stage.asset, platform.asset]
  const logos = new Map<string, string>()
  const answerShadow = measured(recipe.answerShadow as { color?: string } | undefined, 'la sombra de la respuesta')

  const items = figures.map((figure, i) => {
    const card = mono.items[i]!
    const extra = extras[i]!
    const source = text(figure.source, `La fuente de la cifra ${i + 1} (\`figures[${i}].source\`)`)
    const value = text(figure.value, `La cifra ${i + 1} (\`figures[${i}].value\`)`)
    const logoFile = extra.sourceLogo === undefined ? null : text(extra.sourceLogo, `El logo de la fuente ${i + 1} (\`figures[${i}].sourceLogo\`)`)

    const item: Record<string, string> = {
      role: card.lead ? 'lead' : 'rest',
      size: [...value].length >= mono.value.longFromChars ? 'small' : 'large',
      left: css('am-left', card.cxPx - card.widthPx / 2),
      top: css('am-top', card.topPx),
      width: css('am-width', card.widthPx),
      height: css('am-height', card.heightPx),
      rotate: css('am-rotate', card.rotateYDeg, 'deg'),
      z: css('am-z', card.z, ''),
      value,
      label: text(figure.label, `El titular de la cifra ${i + 1} (\`figures[${i}].label\`)`),
      detail: text(extra.detail, `El detalle de la cifra ${i + 1} (\`figures[${i}].detail\`)`),
      year: text(extra.year, `El año de la fuente ${i + 1} (\`figures[${i}].year\`)`)
    }

    if (!logoFile) return { ...item, wordmark: source }

    // El logo del tercero: un tono claro y el mismo peso óptico que los demás, normalizado por quien compone.
    const ref = `asset-ref:file:${logoFile.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')}`

    if (!logos.has(ref)) {
      logos.set(ref, logoFile)
      assets.push({
        ref,
        kind: 'logo',
        path: logoFile,
        tone: paletteColor(mono.source.tone, 'el tono de los logos de las fuentes'),
        inkArea: measured(mono.source.inkArea, 'el área de tinta de los logos de las fuentes (`monoliths.source.inkArea`)'),
        maxWidth: measured(mono.source.maxWidthPx, 'el ancho máximo de los logos de las fuentes (`monoliths.source.maxWidthPx`)'),
        maxHeight: mono.source.logoHeightPx
      })
    }

    return { ...item, logo: [{ src: ref, alt: source }] }
  })

  const { lead, side } = mono.padding

  return {
    contentType: 'deck.decision-ai-market',
    slots: {
      frame: {
        line: intent.line,
        ...liveVoiceFrame(manifest, recipe, voice.question ?? '', 'am'),
        answerShadowColor: colorVar('am-answer-shadow', paletteColor(measured(answerShadow.color, 'el color de la sombra de la respuesta'), 'la sombra de la respuesta')),
        perspective: css('am-perspective', mono.perspectivePx),
        originX: css('am-origin-x', mono.originPx[0]),
        originY: css('am-origin-y', mono.originPx[1]),
        radius: css('am-radius', mono.radiusPx),
        angle: css('am-angle', mono.angleDeg, 'deg'),
        leadFillFrom: colorVar('am-lead-from', paletteColor(mono.fill.lead[0], 'el monolito al frente')),
        leadFillTo: colorVar('am-lead-to', paletteColor(mono.fill.lead[1], 'el monolito al frente')),
        sideFillFrom: colorVar('am-side-from', paletteColor(mono.fill.side[0], 'los monolitos laterales')),
        sideFillTo: colorVar('am-side-to', paletteColor(mono.fill.side[1], 'los monolitos laterales')),
        leadPadY: css('am-lead-pad-y', lead[0]),
        leadPadX: css('am-lead-pad-x', lead[1]),
        sidePadY: css('am-side-pad-y', side[0]),
        sidePadX: css('am-side-pad-x', side[1]),
        leadBorder: css('am-lead-border', mono.border.lead.px),
        leadBorderColor: colorVar('am-lead-border', paletteColor(mono.border.lead.color, 'el filete del monolito al frente')),
        leadBorderOpacity: css('am-lead-border-opacity', mono.border.lead.opacity * 100, '%'),
        sideBorder: css('am-side-border', mono.border.side.px),
        sideBorderColor: colorVar('am-side-border', paletteColor(mono.border.side.color, 'el filete de los laterales')),
        sideBorderOpacity: css('am-side-border-opacity', mono.border.side.opacity * 100, '%'),
        shadowY: css('am-shadow-y', mono.shadow.yPx),
        shadowBlur: css('am-shadow-blur', mono.shadow.blurPx),
        shadowColor: colorVar('am-shadow', paletteColor(mono.shadow.color, 'la sombra de los monolitos')),
        shadowOpacity: css('am-shadow-opacity', mono.shadow.opacity * 100, '%'),
        haloColor: colorVar('am-halo', paletteColor('halo', 'el halo')),
        leadGlowBlur: css('am-lead-glow-blur', mono.glow.lead.blurPx),
        leadGlowOpacity: css('am-lead-glow-opacity', mono.glow.lead.opacity * 100, '%'),
        sideGlowBlur: css('am-side-glow-blur', mono.glow.side.blurPx),
        sideGlowOpacity: css('am-side-glow-opacity', mono.glow.side.opacity * 100, '%'),
        reflectGap: css('am-reflect-gap', mono.reflection.gapPx),
        reflectFrom: css('am-reflect-from', mono.reflection.fromStop * 100, '%'),
        reflectOpacity: css('am-reflect-opacity', mono.reflection.opacity * 100, '%'),
        valueLeadPx: css('am-value-lead-px', mono.value.leadPx),
        valuePx: css('am-value-px', mono.value.px),
        valueLongPx: css('am-value-long-px', mono.value.longPx),
        valueLeading: css('am-value-leading', mono.value.lineHeight, ''),
        valueTracking: css('am-value-tracking', em(mono.value.tracking, 'el tracking de la cifra'), 'em'),
        valueLeadColor: colorVar('am-value-lead', paletteColor(mono.value.leadColor, 'la cifra al frente')),
        valueColor: colorVar('am-value', paletteColor(mono.value.color, 'las cifras laterales')),
        labelLeadPx: css('am-label-lead-px', mono.label.leadPx),
        labelPx: css('am-label-px', mono.label.px),
        labelLeading: css('am-label-leading', mono.label.lineHeight, ''),
        labelTracking: css('am-label-tracking', em(mono.label.tracking, 'el tracking del titular'), 'em'),
        labelGap: css('am-label-gap', mono.label.gapPx),
        detailLeadPx: css('am-detail-lead-px', mono.detail.leadPx),
        detailPx: css('am-detail-px', mono.detail.px),
        detailWeight: css('am-detail-weight', mono.detail.weight, ''),
        detailLeading: css('am-detail-leading', mono.detail.lineHeight, ''),
        detailGap: css('am-detail-gap', mono.detail.gapPx),
        detailColor: colorVar('am-detail', paletteColor(mono.detail.color, 'el detalle de la cifra')),
        footerPadTop: css('am-footer-pad-top', mono.footer.paddingTopPx),
        rule: css('am-rule', mono.footer.rule.px),
        ruleColor: colorVar('am-rule', paletteColor(mono.footer.rule.color, 'el filete de la fuente')),
        ruleOpacity: css('am-rule-opacity', mono.footer.rule.opacity * 100, '%'),
        yearPx: css('am-year-px', mono.footer.year.px),
        yearWeight: css('am-year-weight', mono.footer.year.weight, ''),
        yearColor: colorVar('am-year', tone(mono.footer.year.color, 'el año de la fuente')),
        logoHeight: css('am-logo-height', mono.source.logoHeightPx),
        wordmarkPx: css('am-wordmark-px', mono.source.wordmark.px),
        wordmarkWeight: css('am-wordmark-weight', mono.source.wordmark.weight, ''),
        wordmarkTracking: css('am-wordmark-tracking', em(mono.source.wordmark.tracking, 'el tracking del wordmark'), 'em'),
        wordmarkColor: colorVar('am-wordmark', paletteColor(mono.source.wordmark.color, 'el wordmark de la fuente')),
        lumWidth: css('lum-width', measured(lum.widthPx, 'el ancho de la burbuja en luminosidad')),
        lumBottom: css('lum-bottom', measured(lum.bottomPx, 'el pie de la burbuja en luminosidad'))
      },
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      figures: items
    },
    assets
  }
}
