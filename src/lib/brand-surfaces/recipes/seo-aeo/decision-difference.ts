/**
 * `decision-difference` (TASK-1934): «¿Qué nos hace distintos? Lo puedes ver». Dos tarjetas enfrentadas en
 * perspectiva sobre el escenario del estilo «vivo»: atrás, girada, la alternativa genérica en vidrio oscuro con sus
 * promesas tachadas; al frente, en papel, el método de Efeonce con sus checks en el acento, y el disco «vs» entre
 * ambas. Al pie, la franja de la objeción del equipo propio con sus tres pilares. La voz «viva» a la izquierda y la
 * burbuja URL en luminosidad. Referencia: DeckDiferencia (MD1-diferencia).
 *
 * Toda medida, color y peso sale de `efeonceGraphicLine.surfaces.deck.recipes['decision-difference']` (`comparison`,
 * `ownTeam`, `stage`); el contenido (títulos, las cinco filas en pares alineados y los tres pilares) llega en el
 * intent. Los íconos de las filas (la X de la alternativa y el check de Efeonce) se dibujan como SVG con el tamaño,
 * el trazo y los colores de `comparison.*.mark`.
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import { SurfacePieceError } from '../../types'
import { contentOf, voiceSlots } from '../../shared'

import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { liveVoiceFrame } from '../sections'
import { colorVar, css, layerAsset, measured, n, paletteColor, stageSvg, text, type StageTokens } from '../kit'

type Edge = { px: number; color: string; opacity?: number }
type Shadow = { yPx: number; blurPx: number; color: string; opacity: number }

type CardTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  rotateYDeg: number
  origin: 'start' | 'end'
  opacity?: number
  angleDeg?: number
  fill: string | [string, string]
  border: Edge
  glow: { blurPx: number; opacity: number }
  kicker: { color: string }
  title: { px: number; color: string }
  row: { px: number; weight: number; lineHeight: number; paddingYPx: number; rule: Edge; color: string; strike?: { color: string; opacity: number } }
  mark: { px: number; strokePx: number; color?: string; fill?: string; check?: string; glyph?: { from?: number; to?: number; points?: [number, number][] } }
}

type ComparisonTokens = {
  perspectivePx: number
  rows: number
  alternative: CardTokens
  efeonce: CardTokens
  shadow: Shadow
  kicker: { px: number; weight: number; tracking: string; uppercase: boolean }
  title: { lineHeight: number; tracking: string; gapTopPx: number; gapBottomPx: number; family: string }
  rowGapPx: number
  vs: { xPx: number; yPx: number; px: number; fill: string; ring: Edge; glow: { blurPx: number; opacity: number }; text: { px: number; family: string; color: string } }
}

type OwnTeamTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number]
  radiusPx: number
  gapPx: number
  angleDeg: number
  fill: [string, string]
  border: Edge
  shadow: Shadow
  kicker: { px: number; weight: number; tracking: string; uppercase: boolean; color: string }
  title: { px: number; tracking: string; gapPx: number; family: string }
  pillar: {
    count: number
    rule: Edge
    paddingStartPx: number
    title: { px: number; weight: number }
    desc: { px: number; weight: number; lineHeight: number; gapPx: number; color: string }
  }
}

type SideIntent = { kicker?: unknown; title?: unknown }
type RowIntent = { alternative?: unknown; efeonce?: unknown }
type PillarIntent = { title?: unknown; description?: unknown }

const SOFT_ON_DARK = (efeonceGraphicLine as unknown as { slogan: { leadColor: { onDark: string } } }).slogan.leadColor.onDark

type DocumentTable = Record<string, unknown>

/**
 * Los colores del documento claro (`ink`, `muted`, `rule`, `chip`, `fill`) viven en `glass.document` de la propia
 * receta — nunca un HEX escrito aquí. `soft` es el gris de la voz sobre oscuro. El resto, la paleta de la línea o un
 * HEX medido por AXIS.
 */
const DOCUMENT_KEYS = ['ink', 'muted', 'rule', 'chip', 'fill']

const toneOf =
  (document: DocumentTable | undefined) =>
  (value: string, what: string): string => {
    if (value === 'soft') return paletteColor(SOFT_ON_DARK, what)

    if (DOCUMENT_KEYS.includes(value)) {
      return paletteColor(measured(document?.[value] as string | undefined, `el color «${value}» del documento de la receta`), what)
    }

    return paletteColor(value, what)
  }

type Tone = ReturnType<typeof toneOf>

const pct = (opacity: number): number => opacity * 100

const trackingEm = (value: string, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`))

/** Una fracción del cuadro del ícono (el glifo lo mide AXIS en fracciones de su propio cuadro). */
const at = (box: number, fraction: number): string => n(box * fraction)

/** La X de la alternativa: un círculo de trazo con su aspa (`mark.glyph.from`→`to`), en el gris y el trazo de AXIS. */
const crossMarkSvg = (mark: CardTokens['mark'], tone: Tone): string => {
  const size = mark.px
  const stroke = tone(measured(mark.color, 'el color de la X'), 'la X de la alternativa')
  const r = size / 2 - mark.strokePx / 2
  const from = measured(mark.glyph?.from, 'el inicio del aspa de la X')
  const to = measured(mark.glyph?.to, 'el final del aspa de la X')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(size)} ${n(size)}" width="${n(size)}" height="${n(size)}" aria-hidden="true" focusable="false">` +
    `<circle cx="${n(size / 2)}" cy="${n(size / 2)}" r="${n(r)}" fill="none" stroke="${stroke}" stroke-width="${n(mark.strokePx)}"/>` +
    `<path d="M${at(size, from)} ${at(size, from)}L${at(size, to)} ${at(size, to)}M${at(size, to)} ${at(size, from)}L${at(size, from)} ${at(size, to)}" fill="none" stroke="${stroke}" stroke-width="${n(mark.strokePx)}" stroke-linecap="round"/>` +
    '</svg>'
  )
}

/** El check de Efeonce: el disco en el acento con el visto (`mark.glyph.points`) en oscuro, al trazo de AXIS. */
const checkMarkSvg = (mark: CardTokens['mark'], tone: Tone): string => {
  const size = mark.px
  const points = measured(mark.glyph?.points, 'los puntos del visto del check')

  if (points.length < 2) throw new SurfacePieceError('AXIS midió el visto del check con menos de dos puntos.', 'invalid-intent')

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${at(size, x)} ${at(size, y)}`).join('')
  const fill = tone(measured(mark.fill, 'el disco del check'), 'el check de Efeonce')
  const check = tone(measured(mark.check, 'el visto del check'), 'el check de Efeonce')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(size)} ${n(size)}" width="${n(size)}" height="${n(size)}" aria-hidden="true" focusable="false">` +
    `<circle cx="${n(size / 2)}" cy="${n(size / 2)}" r="${n(size / 2)}" fill="${fill}"/>` +
    `<path d="${path}" fill="none" stroke="${check}" stroke-width="${n(mark.strokePx)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    '</svg>'
  )
}

/** Las variables de una tarjeta de la comparación (`alt` o `ef`): posición, giro, relleno, filete, texto y filas. */
const cardVars = (card: CardTokens, key: 'alt' | 'ef', what: string, tone: Tone): Record<string, string> => {
  const vars: Record<string, string> = {
    [`${key}Left`]: css(`df-${key}-left`, card.xPx),
    [`${key}Top`]: css(`df-${key}-top`, card.yPx),
    [`${key}Width`]: css(`df-${key}-width`, card.widthPx),
    [`${key}PadTop`]: css(`df-${key}-pad-top`, card.padding[0]),
    [`${key}PadX`]: css(`df-${key}-pad-x`, card.padding[1]),
    [`${key}PadBottom`]: css(`df-${key}-pad-bottom`, card.padding[2]),
    [`${key}Radius`]: css(`df-${key}-radius`, card.radiusPx),
    [`${key}Rotate`]: css(`df-${key}-rotate`, card.rotateYDeg, 'deg'),
    [`${key}Origin`]: css(`df-${key}-origin`, card.origin === 'end' ? 100 : 0, '%'),
    [`${key}Opacity`]: css(`df-${key}-opacity`, pct(card.opacity ?? 1), '%'),
    [`${key}Border`]: css(`df-${key}-border`, card.border.px),
    [`${key}BorderColor`]: colorVar(`df-${key}-border`, tone(card.border.color, `el filete de ${what}`)),
    [`${key}BorderOpacity`]: css(`df-${key}-border-opacity`, pct(card.border.opacity ?? 1), '%'),
    [`${key}GlowBlur`]: css(`df-${key}-glow-blur`, card.glow.blurPx),
    [`${key}GlowOpacity`]: css(`df-${key}-glow-opacity`, pct(card.glow.opacity), '%'),
    [`${key}KickerColor`]: colorVar(`df-${key}-kicker`, tone(card.kicker.color, `el rótulo de ${what}`)),
    [`${key}TitlePx`]: css(`df-${key}-title-px`, card.title.px),
    [`${key}TitleColor`]: colorVar(`df-${key}-title`, tone(card.title.color, `el título de ${what}`)),
    [`${key}RowPx`]: css(`df-${key}-row-px`, card.row.px),
    [`${key}RowWeight`]: css(`df-${key}-row-weight`, card.row.weight, ''),
    [`${key}RowLeading`]: css(`df-${key}-row-leading`, card.row.lineHeight, ''),
    [`${key}RowPadY`]: css(`df-${key}-row-pad-y`, card.row.paddingYPx),
    [`${key}RowColor`]: colorVar(`df-${key}-row`, tone(card.row.color, `las filas de ${what}`)),
    [`${key}RuleWidth`]: css(`df-${key}-rule`, card.row.rule.px),
    [`${key}RuleColor`]: colorVar(`df-${key}-rule`, tone(card.row.rule.color, `el filete de las filas de ${what}`)),
    [`${key}RuleOpacity`]: css(`df-${key}-rule-opacity`, pct(card.row.rule.opacity ?? 1), '%'),
    [`${key}MarkPx`]: css(`df-${key}-mark-px`, card.mark.px)
  }

  if (Array.isArray(card.fill)) {
    vars[`${key}FillFrom`] = colorVar(`df-${key}-fill-from`, tone(card.fill[0], what))
    vars[`${key}FillTo`] = colorVar(`df-${key}-fill-to`, tone(card.fill[1], what))
    vars[`${key}Angle`] = css(`df-${key}-angle`, measured(card.angleDeg, `el ángulo del relleno de ${what}`), 'deg')
  } else {
    // Un relleno liso: el degradado va de un color al mismo, con el ángulo neutro.
    vars[`${key}FillFrom`] = colorVar(`df-${key}-fill-from`, tone(card.fill, what))
    vars[`${key}FillTo`] = colorVar(`df-${key}-fill-to`, tone(card.fill, what))
    vars[`${key}Angle`] = css(`df-${key}-angle`, card.angleDeg ?? 0, 'deg')
  }

  if (card.row.strike) {
    vars[`${key}StrikeColor`] = colorVar(`df-${key}-strike`, tone(card.row.strike.color, `el tachado de ${what}`))
    vars[`${key}StrikeOpacity`] = css(`df-${key}-strike-opacity`, pct(card.row.strike.opacity), '%')
  }

  return vars
}

export const decisionDifference: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const comparison = measured(recipe.comparison as ComparisonTokens | undefined, 'la comparación')
  const own = measured(recipe.ownTeam as OwnTeamTokens | undefined, 'la franja del equipo propio')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const tone = toneOf(measured((recipe.glass as { document?: DocumentTable } | undefined)?.document, 'el documento de la receta (`glass.document`)'))
  const answerShadow = measured(recipe.answerShadow as { color?: string } | undefined, 'la sombra de la respuesta')

  if (!content.body) throw new SurfacePieceError('La diferencia lleva su bajada (`body`).', 'invalid-intent')

  const alternative = (intent.alternative ?? {}) as SideIntent
  const efeonce = (intent.efeonce ?? {}) as SideIntent
  const ownTeam = (intent.ownTeam ?? {}) as SideIntent & { pillars?: unknown }
  const rows = (Array.isArray(intent.rows) ? intent.rows : []) as RowIntent[]
  const pillars = (Array.isArray(ownTeam.pillars) ? ownTeam.pillars : []) as PillarIntent[]

  if (rows.length !== comparison.rows) {
    throw new SurfacePieceError(`La comparación va en ${comparison.rows} filas alineadas (\`rows\`).`, 'invalid-intent')
  }

  if (pillars.length !== own.pillar.count) {
    throw new SurfacePieceError(`La franja del equipo propio lleva ${own.pillar.count} pilares (\`ownTeam.pillars\`).`, 'invalid-intent')
  }

  const stage = layerAsset('decision-difference-stage', stageSvg(manifest, measured(recipe.stage as StageTokens | undefined, 'el escenario'), 'df'))
  const cross = layerAsset('decision-difference-cross', crossMarkSvg(comparison.alternative.mark, tone))
  const check = layerAsset('decision-difference-check', checkMarkSvg(comparison.efeonce.mark, tone))
  const lum = (recipe.signature as { urlBubble?: { widthPx?: number; bottomPx?: number } } | undefined)?.urlBubble
  const { vs } = comparison

  const frame: Record<string, unknown> = {
    line: intent.line,
    ...liveVoiceFrame(manifest, recipe, voice.question ?? '', 'df'),
    answerShadowColor: colorVar('df-answer-shadow', tone(measured(answerShadow.color, 'el color de la sombra de la respuesta'), 'la sombra de la respuesta')),
    perspective: css('df-perspective', comparison.perspectivePx),
    ...cardVars(comparison.alternative, 'alt', 'la alternativa', tone),
    ...cardVars(comparison.efeonce, 'ef', 'Efeonce', tone),
    shadowY: css('df-shadow-y', comparison.shadow.yPx),
    shadowBlur: css('df-shadow-blur', comparison.shadow.blurPx),
    shadowColor: colorVar('df-shadow', tone(comparison.shadow.color, 'la sombra de las tarjetas')),
    shadowOpacity: css('df-shadow-opacity', pct(comparison.shadow.opacity), '%'),
    haloColor: colorVar('df-halo', tone('halo', 'el halo')),
    kickerPx: css('df-kicker-px', comparison.kicker.px),
    kickerWeight: css('df-kicker-weight', comparison.kicker.weight, ''),
    kickerTracking: css('df-kicker-tracking', trackingEm(comparison.kicker.tracking, 'los rótulos'), 'em'),
    titleLeading: css('df-title-leading', comparison.title.lineHeight, ''),
    titleTracking: css('df-title-tracking', trackingEm(comparison.title.tracking, 'los títulos'), 'em'),
    titleGapTop: css('df-title-gap-top', comparison.title.gapTopPx),
    titleGapBottom: css('df-title-gap-bottom', comparison.title.gapBottomPx),
    rowGap: css('df-row-gap', comparison.rowGapPx),
    vsLeft: css('df-vs-left', vs.xPx),
    vsTop: css('df-vs-top', vs.yPx),
    vsSize: css('df-vs-size', vs.px),
    vsFill: colorVar('df-vs-fill', tone(vs.fill, 'el disco «vs»')),
    vsRing: css('df-vs-ring', vs.ring.px),
    vsRingColor: colorVar('df-vs-ring', tone(vs.ring.color, 'el anillo del «vs»')),
    vsGlowBlur: css('df-vs-glow-blur', vs.glow.blurPx),
    vsGlowOpacity: css('df-vs-glow-opacity', pct(vs.glow.opacity), '%'),
    vsTextPx: css('df-vs-text-px', vs.text.px),
    vsTextColor: colorVar('df-vs-text', tone(vs.text.color, 'el texto del «vs»')),
    ownLeft: css('df-own-left', own.xPx),
    ownTop: css('df-own-top', own.yPx),
    ownWidth: css('df-own-width', own.widthPx),
    ownPadY: css('df-own-pad-y', own.padding[0]),
    ownPadX: css('df-own-pad-x', own.padding[1]),
    ownRadius: css('df-own-radius', own.radiusPx),
    ownGap: css('df-own-gap', own.gapPx),
    ownAngle: css('df-own-angle', own.angleDeg, 'deg'),
    ownFillFrom: colorVar('df-own-fill-from', tone(own.fill[0], 'la franja del equipo propio')),
    ownFillTo: colorVar('df-own-fill-to', tone(own.fill[1], 'la franja del equipo propio')),
    ownBorder: css('df-own-border', own.border.px),
    ownBorderColor: colorVar('df-own-border', tone(own.border.color, 'el filete de la franja')),
    ownBorderOpacity: css('df-own-border-opacity', pct(own.border.opacity ?? 1), '%'),
    ownShadowY: css('df-own-shadow-y', own.shadow.yPx),
    ownShadowBlur: css('df-own-shadow-blur', own.shadow.blurPx),
    ownShadowColor: colorVar('df-own-shadow', tone(own.shadow.color, 'la sombra de la franja')),
    ownShadowOpacity: css('df-own-shadow-opacity', pct(own.shadow.opacity), '%'),
    ownKickerPx: css('df-own-kicker-px', own.kicker.px),
    ownKickerWeight: css('df-own-kicker-weight', own.kicker.weight, ''),
    ownKickerTracking: css('df-own-kicker-tracking', trackingEm(own.kicker.tracking, 'el rótulo de la franja'), 'em'),
    ownKickerColor: colorVar('df-own-kicker', tone(own.kicker.color, 'el rótulo de la franja')),
    ownTitlePx: css('df-own-title-px', own.title.px),
    ownTitleTracking: css('df-own-title-tracking', trackingEm(own.title.tracking, 'el título de la franja'), 'em'),
    ownTitleGap: css('df-own-title-gap', own.title.gapPx),
    pillarRule: css('df-pillar-rule', own.pillar.rule.px),
    pillarRuleColor: colorVar('df-pillar-rule', tone(own.pillar.rule.color, 'el filete de los pilares')),
    pillarRuleOpacity: css('df-pillar-rule-opacity', pct(own.pillar.rule.opacity ?? 1), '%'),
    pillarPadStart: css('df-pillar-pad-start', own.pillar.paddingStartPx),
    pillarTitlePx: css('df-pillar-title-px', own.pillar.title.px),
    pillarTitleWeight: css('df-pillar-title-weight', own.pillar.title.weight, ''),
    pillarDescPx: css('df-pillar-desc-px', own.pillar.desc.px),
    pillarDescWeight: css('df-pillar-desc-weight', own.pillar.desc.weight, ''),
    pillarDescLeading: css('df-pillar-desc-leading', own.pillar.desc.lineHeight, ''),
    pillarDescGap: css('df-pillar-desc-gap', own.pillar.desc.gapPx),
    pillarDescColor: colorVar('df-pillar-desc', tone(own.pillar.desc.color, 'la bajada de los pilares')),
    lumWidth: css('lum-width', measured(lum?.widthPx, 'la burbuja en luminosidad')),
    lumBottom: css('lum-bottom', measured(lum?.bottomPx, 'la burbuja en luminosidad'))
  }

  return {
    contentType: 'deck.decision-difference',
    slots: {
      frame,
      stage: { src: stage.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      alternative: {
        kicker: text(alternative.kicker, 'El rótulo de la alternativa (`alternative.kicker`)'),
        title: text(alternative.title, 'El título de la alternativa (`alternative.title`)')
      },
      alternativeRows: rows.map((row, i) => ({ mark: cross.ref, text: text(row.alternative, `La promesa ${i + 1} de la alternativa (\`rows[${i}].alternative\`)`) })),
      efeonce: {
        kicker: text(efeonce.kicker, 'El rótulo de Efeonce (`efeonce.kicker`)'),
        title: text(efeonce.title, 'El título de Efeonce (`efeonce.title`)')
      },
      efeonceRows: rows.map((row, i) => ({ mark: check.ref, text: text(row.efeonce, `La respuesta ${i + 1} de Efeonce (\`rows[${i}].efeonce\`)`) })),
      versus: text(intent.versus, 'El disco entre las tarjetas (`versus`)'),
      ownTeam: {
        kicker: text(ownTeam.kicker, 'El rótulo de la franja del equipo propio (`ownTeam.kicker`)'),
        title: text(ownTeam.title, 'El título de la franja del equipo propio (`ownTeam.title`)')
      },
      pillars: pillars.map((pillar, i) => ({
        title: text(pillar.title, `El título del pilar ${i + 1} (\`ownTeam.pillars[${i}].title\`)`),
        description: text(pillar.description, `La bajada del pilar ${i + 1} (\`ownTeam.pillars[${i}].description\`)`)
      }))
    },
    assets: [stage.asset, cross.asset, check.asset]
  }
}
