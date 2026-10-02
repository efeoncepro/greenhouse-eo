/**
 * `method-eeat` (TASK-1934): ¿por qué te citaría la IA? Porque confía. Cuatro tarjetas de vidrio con las letras de
 * E-E-A-T sobre la plataforma de luz, la cuarta (Confianza) más alta y destacada, todas con su reflejo en el piso; arriba,
 * el medidor en dos columnas con el peso de E-E-A-T en el SEO clásico y en la IA. La voz «viva» a la izquierda y la
 * burbuja URL en luminosidad al pie. Referencia aprobada: DeckEEAT (MD2-eeat).
 *
 * Todo lo que pinta sale de AXIS (`surfaces.deck.recipes['method-eeat']`): la voz, de las reservas y tipos del token
 * (`liveVoiceFrame`); el escenario y la plataforma, de `stage` y `platform`; las tarjetas, de `letters`; el medidor, de
 * `meter`. El largo de cada barra sale del `fill` de su ítem (`bars-from-values`), nunca de un ancho fijo. El contenido
 * (las cuatro letras, las dos lecturas del medidor y sus rótulos) llega en el intent.
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import { SurfacePieceError } from '../../types'
import { contentOf, voiceSlots } from '../../shared'

import { platformSvg, type PlatformTokens } from '../close'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured, paletteColor, stageSvg, text, type StageTokens } from '../kit'
import { liveVoiceFrame } from '../sections'

/** El gris suave sobre oscuro (`slogan.leadColor.onDark`): el nombre `soft` de los tokens de la receta. */
const SOFT_ON_DARK = (efeonceGraphicLine as unknown as { slogan: { leadColor: { onDark: string } } }).slogan.leadColor.onDark

/** Un color del token de la receta: `soft`, un nombre de la paleta, `white` o un HEX medido. */
const tone = (value: string, what: string): string => (value === 'soft' ? SOFT_ON_DARK : paletteColor(value, what))

type Rgba = { color: string; opacity: number }
type Box = { topPx: number; heightPx: number }

type LettersTokens = {
  count: number
  xPx: number
  widthPx: number
  gapPx: number
  rest: Box
  lead: Box & { index: number }
  padding: [number, number, number]
  radiusPx: number
  angleDeg: number
  fill: { lead: [string, string]; rest: [string, string] }
  border: { lead: Rgba & { px: number }; rest: Rgba & { px: number } }
  shadow: Rgba & { yPx: number; blurPx: number }
  glow: { lead: { blurPx: number; opacity: number }; rest: { blurPx: number; opacity: number } }
  reflection: { gapPx: number; fromStop: number; opacity: number }
  letter: { px: number; lineHeight: number; tracking: string; family: string; leadColor: string; color: string }
  name: { px: number; tracking: string; gapPx: number; family: string; color: string }
  desc: { px: number; weight: number; lineHeight: number; gapPx: number; color: string }
  footer: {
    paddingTopPx: number
    rule: Rgba & { px: number }
    kicker: { px: number; weight: number; tracking: string; leadColor: string; color: string }
    builtWith: { px: number; weight: number; lineHeight: number; gapPx: number; color: string }
    deliverable: { px: number; weight: number; gapPx: number; color: string }
  }
}

type MeterTokens = {
  topPx: number
  gapPx: number
  label: { px: number; weight: number; color: string }
  value: { weight: number; color: string; leadColor: string }
  bar: {
    heightPx: number
    gapTopPx: number
    track: Rgba
    fill: { lead: string; rest: string }
    glow: Rgba & { blurPx: number }
  }
}

type LetterIntent = { letter?: unknown; name?: unknown; description?: unknown; builtWith?: unknown; deliverable?: unknown }
type MeterIntent = { label?: unknown; value?: unknown; fill?: unknown }

/** Las lecturas del medidor: la del SEO clásico y, al final, la de la IA (en el acento, con brillo). */
const METER_READINGS = 2

/** Las letras de E-E-A-T, en su orden: la receta nunca las reordena ni omite una. */
const EEAT = 'EEAT'

const em = (value: string, what: string): number => Number.parseFloat(measured(value, what))

/** Una letra que AXIS debe declarar con la familia de la respuesta (Bricolage): la plantilla no conoce otra. */
const answerFamily = (family: string, what: string): void => {
  if (family !== 'answer') throw new SurfacePieceError(`AXIS midió ${what} con una familia que la plantilla no pinta («${family}»).`, 'invalid-intent')
}

/** El largo de una barra: una fracción del ancho de su columna, sólo entre 0 y 1 (`bars-from-values`). */
const fillOf = (value: unknown, i: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new SurfacePieceError(`El medidor ${i + 1} lleva su \`fill\` entre 0 y 1 (el largo de la barra sale de ese valor).`, 'invalid-intent')
  }

  return value
}

export const methodEeat: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const letters = measured(recipe.letters as LettersTokens | undefined, 'las letras de E-E-A-T')
  const meter = measured(recipe.meter as MeterTokens | undefined, 'el medidor de E-E-A-T')
  const answerShadow = measured(recipe.answerShadow as { color?: string } | undefined, 'la sombra de la respuesta')
  const lum = measured((recipe.signature as { urlBubble?: { widthPx?: number; bottomPx?: number } } | undefined)?.urlBubble, 'la burbuja en luminosidad')
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)

  if (!content.body) throw new SurfacePieceError('E-E-A-T lleva su bajada (`body`).', 'invalid-intent')
  if (!voice.answerLead) throw new SurfacePieceError('La respuesta de E-E-A-T va en dos líneas («Porque» / «confía»).', 'invalid-intent')

  answerFamily(letters.letter.family, 'la letra')
  answerFamily(letters.name.family, 'el nombre de la letra')

  const cards = (Array.isArray(intent.letters) ? intent.letters : []) as LetterIntent[]
  const readings = (Array.isArray(intent.meter) ? intent.meter : []) as MeterIntent[]

  if (cards.length !== letters.count) throw new SurfacePieceError(`E-E-A-T va en ${letters.count} letras (\`letters\`).`, 'invalid-intent')
  if (readings.length !== METER_READINGS) throw new SurfacePieceError(`El medidor lleva ${METER_READINGS} lecturas (\`meter\`): la del SEO clásico y la de la IA.`, 'invalid-intent')

  const kicker = text(intent.builtWithLabel, 'El rótulo del pie de cada letra (`builtWithLabel`, p. ej. «Lo construimos con»)')
  const topic = text(intent.meterTopic, 'El tema del medidor (`meterTopic`, p. ej. «Peso de E-E-A-T»)')

  const items = cards.map((card, i) => {
    const lead = i === letters.lead.index
    const box = lead ? letters.lead : letters.rest

    return {
      role: lead ? 'lead' : 'rest',
      left: css('ee-card-left', letters.xPx + i * (letters.widthPx + letters.gapPx)),
      top: css('ee-card-top', box.topPx),
      height: css('ee-card-height', box.heightPx),
      letter: text(card.letter, `La letra ${i + 1}`),
      name: text(card.name, `El nombre de la letra ${i + 1}`),
      description: text(card.description, `Qué significa la letra ${i + 1}`),
      kicker,
      builtWith: text(card.builtWith, `Con qué construimos la letra ${i + 1} (\`builtWith\`)`),
      deliverable: text(card.deliverable, `El entregable de la letra ${i + 1} (\`deliverable\`)`)
    }
  })

  if (items.map(item => item.letter.toUpperCase()).join('') !== EEAT) {
    throw new SurfacePieceError('Las cuatro letras van siempre en orden E-E-A-T.', 'invalid-intent')
  }

  const bars = readings.map((reading, i) => ({
    role: i === readings.length - 1 ? 'lead' : 'rest',
    fill: css('ee-fill', fillOf(reading.fill, i) * 100, '%'),
    topic: `${topic} ·`,
    label: text(reading.label, `El rótulo del medidor ${i + 1}`),
    value: text(reading.value, `La lectura del medidor ${i + 1}`)
  }))

  const stage = layerAsset('method-eeat-stage', stageSvg(manifest, measured(recipe.stage as StageTokens | undefined, 'el escenario'), 'ee'))
  const platform = layerAsset('method-eeat-platform', platformSvg(manifest, measured(recipe.platform as PlatformTokens | undefined, 'la plataforma'), 'ee'))
  const { footer } = letters
  const [padTop, padX, padBottom] = letters.padding

  return {
    contentType: 'deck.method-eeat',
    slots: {
      frame: {
        line: intent.line,
        ...liveVoiceFrame(manifest, recipe, voice.question ?? '', 'ee'),
        answerShadowColor: colorVar('ee-answer-shadow', tone(measured(answerShadow.color, 'el color de la sombra de la respuesta'), 'la sombra de la respuesta')),
        cardWidth: css('ee-card-width', letters.widthPx),
        cardPadTop: css('ee-card-pad-top', padTop),
        cardPadX: css('ee-card-pad-x', padX),
        cardPadBottom: css('ee-card-pad-bottom', padBottom),
        cardRadius: css('ee-card-radius', letters.radiusPx),
        cardAngle: css('ee-card-angle', letters.angleDeg, 'deg'),
        leadFrom: colorVar('ee-lead-from', tone(letters.fill.lead[0], 'la letra destacada')),
        leadTo: colorVar('ee-lead-to', tone(letters.fill.lead[1], 'la letra destacada')),
        restFrom: colorVar('ee-rest-from', tone(letters.fill.rest[0], 'las letras')),
        restTo: colorVar('ee-rest-to', tone(letters.fill.rest[1], 'las letras')),
        leadBorder: css('ee-lead-border', letters.border.lead.px),
        leadBorderColor: colorVar('ee-lead-border', tone(letters.border.lead.color, 'el filete de la letra destacada')),
        leadBorderOpacity: css('ee-lead-border-opacity', letters.border.lead.opacity * 100, '%'),
        restBorder: css('ee-rest-border', letters.border.rest.px),
        restBorderColor: colorVar('ee-rest-border', tone(letters.border.rest.color, 'el filete de las letras')),
        restBorderOpacity: css('ee-rest-border-opacity', letters.border.rest.opacity * 100, '%'),
        shadowY: css('ee-shadow-y', letters.shadow.yPx),
        shadowBlur: css('ee-shadow-blur', letters.shadow.blurPx),
        shadowColor: colorVar('ee-shadow', tone(letters.shadow.color, 'la sombra de las letras')),
        shadowOpacity: css('ee-shadow-opacity', letters.shadow.opacity * 100, '%'),
        haloColor: colorVar('ee-halo', tone('halo', 'el brillo de las letras')),
        leadGlowBlur: css('ee-lead-glow-blur', letters.glow.lead.blurPx),
        leadGlowOpacity: css('ee-lead-glow-opacity', letters.glow.lead.opacity * 100, '%'),
        restGlowBlur: css('ee-rest-glow-blur', letters.glow.rest.blurPx),
        restGlowOpacity: css('ee-rest-glow-opacity', letters.glow.rest.opacity * 100, '%'),
        reflectGap: css('ee-reflect-gap', letters.reflection.gapPx),
        reflectFrom: css('ee-reflect-from', letters.reflection.fromStop * 100, '%'),
        reflectOpacity: css('ee-reflect-opacity', letters.reflection.opacity * 100, '%'),
        letterPx: css('ee-letter-px', letters.letter.px),
        letterLeading: css('ee-letter-leading', letters.letter.lineHeight, ''),
        letterTracking: css('ee-letter-tracking', em(letters.letter.tracking, 'el tracking de la letra'), 'em'),
        letterLeadColor: colorVar('ee-letter-lead', tone(letters.letter.leadColor, 'la letra destacada')),
        letterColor: colorVar('ee-letter', tone(letters.letter.color, 'las letras')),
        namePx: css('ee-name-px', letters.name.px),
        nameTracking: css('ee-name-tracking', em(letters.name.tracking, 'el tracking del nombre'), 'em'),
        nameGap: css('ee-name-gap', letters.name.gapPx),
        nameColor: colorVar('ee-name', tone(letters.name.color, 'el nombre de la letra')),
        descPx: css('ee-desc-px', letters.desc.px),
        descWeight: css('ee-desc-wght', letters.desc.weight, ''),
        descLeading: css('ee-desc-leading', letters.desc.lineHeight, ''),
        descGap: css('ee-desc-gap', letters.desc.gapPx),
        descColor: colorVar('ee-desc', tone(letters.desc.color, 'la descripción de la letra')),
        footerPad: css('ee-footer-pad', footer.paddingTopPx),
        ruleWidth: css('ee-rule', footer.rule.px),
        ruleColor: colorVar('ee-rule', tone(footer.rule.color, 'el filete del pie')),
        ruleOpacity: css('ee-rule-opacity', footer.rule.opacity * 100, '%'),
        kickerPx: css('ee-kicker-px', footer.kicker.px),
        kickerWeight: css('ee-kicker-wght', footer.kicker.weight, ''),
        kickerTracking: css('ee-kicker-tracking', em(footer.kicker.tracking, 'el tracking del rótulo del pie'), 'em'),
        kickerLeadColor: colorVar('ee-kicker-lead', tone(footer.kicker.leadColor, 'el rótulo de la letra destacada')),
        kickerColor: colorVar('ee-kicker', tone(footer.kicker.color, 'el rótulo del pie')),
        builtPx: css('ee-built-px', footer.builtWith.px),
        builtWeight: css('ee-built-wght', footer.builtWith.weight, ''),
        builtLeading: css('ee-built-leading', footer.builtWith.lineHeight, ''),
        builtGap: css('ee-built-gap', footer.builtWith.gapPx),
        builtColor: colorVar('ee-built', tone(footer.builtWith.color, 'con qué la construimos')),
        deliverablePx: css('ee-deliverable-px', footer.deliverable.px),
        deliverableWeight: css('ee-deliverable-wght', footer.deliverable.weight, ''),
        deliverableGap: css('ee-deliverable-gap', footer.deliverable.gapPx),
        deliverableColor: colorVar('ee-deliverable', tone(footer.deliverable.color, 'el entregable')),
        meterLeft: css('ee-meter-left', letters.xPx),
        meterTop: css('ee-meter-top', meter.topPx),
        meterWidth: css('ee-meter-width', letters.count * letters.widthPx + (letters.count - 1) * letters.gapPx),
        meterGap: css('ee-meter-gap', meter.gapPx),
        meterLabelPx: css('ee-meter-label-px', meter.label.px),
        meterLabelWeight: css('ee-meter-label-wght', meter.label.weight, ''),
        meterLabelColor: colorVar('ee-meter-label', tone(meter.label.color, 'el rótulo del medidor')),
        meterValueWeight: css('ee-meter-value-wght', meter.value.weight, ''),
        meterValueColor: colorVar('ee-meter-value', tone(meter.value.color, 'la lectura del medidor')),
        meterValueLeadColor: colorVar('ee-meter-value-lead', tone(meter.value.leadColor, 'la lectura de la IA')),
        barHeight: css('ee-bar-height', meter.bar.heightPx),
        barGap: css('ee-bar-gap', meter.bar.gapTopPx),
        trackColor: colorVar('ee-track', tone(meter.bar.track.color, 'el riel del medidor')),
        trackOpacity: css('ee-track-opacity', meter.bar.track.opacity * 100, '%'),
        barLeadColor: colorVar('ee-bar-lead', tone(meter.bar.fill.lead, 'la barra de la IA')),
        barRestColor: colorVar('ee-bar-rest', tone(meter.bar.fill.rest, 'la barra del SEO clásico')),
        barGlowBlur: css('ee-bar-glow-blur', meter.bar.glow.blurPx),
        barGlowColor: colorVar('ee-bar-glow', tone(meter.bar.glow.color, 'el brillo de la barra')),
        barGlowOpacity: css('ee-bar-glow-opacity', meter.bar.glow.opacity * 100, '%'),
        lumWidth: css('lum-width', measured(lum.widthPx, 'el ancho de la burbuja en luminosidad')),
        lumBottom: css('lum-bottom', measured(lum.bottomPx, 'el pie de la burbuja en luminosidad'))
      },
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      meter: bars,
      letters: items
    },
    assets: [stage.asset, platform.asset]
  }
}
