/**
 * `decision-provider-fit` (deck Salesforce, SF4, TASK-1942): «¿Salesforce o HubSpot? El que encaje.». Cuatro veredictos
 * posibles como monolitos de vidrio sobre la plataforma de luz, con alturas escalonadas; el del cliente se enciende en
 * papel, más alto, bajo un haz vertical en el acento y con el pie «Tu caso · con evidencia». Efeonce vende la decisión,
 * no la plataforma: los proveedores se nombran en texto y los íconos son Trazo de AXIS (`resolveIcon`), nunca logos.
 * La selección «Cliente» toma el veredicto encendido por ítem (`selectedVerdict`).
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['decision-provider-fit']`): la voz, el
 * escenario, la plataforma, el haz vertical, los monolitos, el rótulo «Veredicto» y el pie. El halo y el haz vertical se
 * centran en el monolito encendido (`stage.halo.cxFrom: 'lead-monolith'`): el builder los deriva de su posición. El
 * CONTENIDO llega en el intent: `verdicts` (cuatro: `glyph`, `title`, `description`), `selectedVerdict` y la `note`
 * obligatoria (el veredicto encendido es un ejemplo mientras no salga del diagnóstico real del cliente).
 */

import { SurfacePieceError } from '../../types'
import { contentOf, iconAsset, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured, n, svgOpen } from '../kit'

import {
  documentVars,
  exactly,
  glassVars,
  indexIn,
  lineColor,
  lineVoiceFrame,
  lumVars,
  noteVars,
  reflectionVars,
  req,
  stageLayers,
  uniqueAssets,
  type FrostedGlass,
  type LineDocument,
  type Reflection, cssFine } from './kit'

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; gapTopPx?: number; lineHeight?: number; text?: string; leadColor?: string; restColor?: string }

type MonolithTokens = {
  count: number
  xPx: number
  widthPx: number
  gapPx: number
  baseYPx: number
  heightPx: { rest: number[]; lead: number }
  padding: [number, number]
  radiusPx: number
  lead: { document: LineDocument; reflection: Reflection }
  rest: { glass: FrostedGlass }
  tile: {
    px: number
    radiusPx: number
    glyphPx: number
    lead: { fill: string }
    rest: { fill: { color: string; opacity: number }; border: { px: number; color: string; opacity: number } }
  }
  kicker: Text
  title: { leadPx: number; px: number; lineHeight: number; tracking: string; gapPx: number; leadColor?: string; restColor?: string }
  desc: Text
  footer: { insetPx: number; paddingTopPx: number; rule: string; px: number; weight: number; text: string; color?: string }
}

type ShaftTokens = { topHalfWidthPx: number; baseHalfWidthPx: number; gradient: { from: { color: string; opacity: number }; to: { color: string; opacity: number } } }

type VerdictIntent = { glyph?: unknown; title?: unknown; description?: unknown }

const tracking = (value: string | undefined, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`))

/** El haz vertical sobre el veredicto elegido: un trapecio del borde de arriba a la base, degradé del acento. */
const shaftSvg = (manifest: Parameters<typeof svgOpen>[0], shaft: ShaftTokens, cx: number, baseY: number, line: string): string => {
  const { topHalfWidthPx: top, baseHalfWidthPx: base, gradient } = shaft
  const stop = (at: number, s: { color: string; opacity: number }) => `<stop offset="${at}" stop-color="${lineColor(s.color, line, 'el haz vertical')}" stop-opacity="${n(s.opacity)}"/>`

  return (
    svgOpen(manifest) +
    `<defs><linearGradient id="dpf-shaft" x1="0" y1="0" x2="0" y2="1">${stop(0, gradient.from)}${stop(1, gradient.to)}</linearGradient></defs>` +
    `<path d="M ${n(cx - top)} 0 L ${n(cx + top)} 0 L ${n(cx + base)} ${n(baseY)} L ${n(cx - base)} ${n(baseY)} Z" fill="url(#dpf-shaft)"/>` +
    '</svg>'
  )
}

const iconOf = (glyph: string, line: string, size: number, label: string, what: string) => {
  try {
    return iconAsset(glyph, line, size, label)
  } catch {
    throw new SurfacePieceError(`${what}: «${glyph}» no es un ícono Trazo del catálogo de AXIS (nunca un logo de proveedor).`, 'invalid-intent')
  }
}

export const decisionProviderFit: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const mono = measured(recipe.monoliths as MonolithTokens | undefined, 'los monolitos de los veredictos')
  const shaft = measured(recipe.lightShaft as ShaftTokens | undefined, 'el haz vertical')
  const halo = (recipe.stage as { halo?: { cxFrom?: string } } | undefined)?.halo
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const doc = mono.lead.document

  if (halo?.cxFrom !== 'lead-monolith') throw new SurfacePieceError('AXIS no centró el halo en el monolito encendido (`stage.halo.cxFrom`).', 'invalid-intent')
  if (!voice.answerLead) throw new SurfacePieceError('La respuesta va en dos líneas (`voice.answer` con dos tramos).', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const note = req(content.note, 'La nota de ejemplo (`note`), obligatoria mientras el veredicto no salga del diagnóstico real,')
  const list = exactly<VerdictIntent>(intent.verdicts, mono.count, 'Los veredictos (`verdicts`)')
  const selected = indexIn(intent.selectedVerdict, mono.count, 'El veredicto encendido (`selectedVerdict`)')

  const leftOf = (i: number) => mono.xPx + i * (mono.widthPx + mono.gapPx)
  const leadCx = leftOf(selected - 1) + mono.widthPx / 2

  const monoliths = list.map((verdict, i) => {
    const where = `el veredicto ${i + 1} (\`verdicts[${i}]\`)`
    const title = req(verdict.title, `El nombre de ${where} (\`title\`)`)
    const icon = iconOf(req(verdict.glyph, `El ícono de ${where} (\`glyph\`)`), line, mono.tile.glyphPx, title, `El ícono de ${where}`)
    const lead = i + 1 === selected
    const height = lead ? mono.heightPx.lead : measured(mono.heightPx.rest[i % mono.heightPx.rest.length], `la altura del monolito ${i + 1}`)

    return {
      icon,
      slot: {
        role: lead ? 'lead' : 'rest',
        left: css('dpf-left', leftOf(i)),
        top: css('dpf-top', mono.baseYPx - height),
        height: css('dpf-height', height),
        glyph: icon.ref,
        kicker: measured(mono.kicker.text, 'el rótulo del veredicto'),
        title,
        description: req(verdict.description, `La descripción de ${where} (\`description\`)`),
        // El pie del encendido sólo vive en él: en los demás el renderer quita el campo.
        ...(lead ? { footer: measured(mono.footer.text, 'el pie del veredicto encendido') } : {})
      }
    }
  })

  const { stage, platform } = stageLayers(manifest, recipe, line, 'dpf', { haloCx: leadCx })
  const shaftLayer = layerAsset('decision-provider-fit-shaft', shaftSvg(manifest, shaft, leadCx, mono.baseYPx, line))
  const tile = mono.tile
  const tone = (value: string | undefined, what: string) => lineColor(measured(value, `el color de ${what}`), line, what, doc)

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...noteVars(recipe, line),
    ...glassVars(mono.rest.glass, line),
    ...documentVars(doc, line),
    ...reflectionVars(mono.lead.reflection),
    monoWidth: css('dpf-width', mono.widthPx),
    monoPadY: css('dpf-pad-y', mono.padding[0]),
    monoPadX: css('dpf-pad-x', mono.padding[1]),
    monoRadius: css('dpf-radius', mono.radiusPx),
    tileSize: css('dpf-tile', tile.px),
    tileRadius: css('dpf-tile-radius', tile.radiusPx),
    tileLead: colorVar('dpf-tile-lead', lineColor(tile.lead.fill, line, 'el fondo del ícono encendido', doc)),
    tileRest: colorVar('dpf-tile-rest', lineColor(tile.rest.fill.color, line, 'el fondo del ícono')),
    tileRestOpacity: css('dpf-tile-rest-opacity', tile.rest.fill.opacity * 100, '%'),
    tileBorder: css('dpf-tile-border', tile.rest.border.px),
    tileBorderColor: colorVar('dpf-tile-border', lineColor(tile.rest.border.color, line, 'el filo del ícono')),
    tileBorderOpacity: css('dpf-tile-border-opacity', tile.rest.border.opacity * 100, '%'),
    kickerPx: css('dpf-kicker-px', mono.kicker.px),
    kickerWeight: css('dpf-kicker-wght', measured(mono.kicker.weight, 'el peso del rótulo'), ''),
    kickerTracking: cssFine('dpf-kicker-tracking', tracking(mono.kicker.tracking, 'el rótulo')),
    kickerGap: css('dpf-kicker-gap', measured(mono.kicker.gapTopPx, 'el aire sobre el rótulo')),
    titlePx: css('dpf-title-px', mono.title.px),
    titleLeadPx: css('dpf-title-lead-px', mono.title.leadPx),
    titleLeading: css('dpf-title-leading', mono.title.lineHeight, ''),
    titleTracking: cssFine('dpf-title-tracking', tracking(mono.title.tracking, 'el veredicto')),
    titleGap: css('dpf-title-gap', mono.title.gapPx),
    descPx: css('dpf-desc-px', mono.desc.px),
    descWeight: css('dpf-desc-wght', measured(mono.desc.weight, 'el peso de la descripción'), ''),
    descLeading: css('dpf-desc-leading', measured(mono.desc.lineHeight, 'el interlineado de la descripción'), ''),
    descGap: css('dpf-desc-gap', measured(mono.desc.gapPx, 'el aire de la descripción')),
    footerInset: css('dpf-footer-inset', mono.footer.insetPx),
    footerPadTop: css('dpf-footer-pad-top', mono.footer.paddingTopPx),
    footerRule: colorVar('dpf-footer-rule', lineColor(mono.footer.rule, line, 'el filete del pie', doc)),
    footerPx: css('dpf-footer-px', mono.footer.px),
    footerWeight: css('dpf-footer-wght', mono.footer.weight, ''),
    footerColor: colorVar('dpf-footer', tone(mono.footer.color, 'el pie')),
    // El color de cada texto, en papel (el encendido) y en vidrio (los demás).
    kickerLead: colorVar('dpf-kicker-lead', tone(mono.kicker.leadColor, 'el rótulo encendido')),
    kickerRest: colorVar('dpf-kicker-rest', tone(mono.kicker.restColor, 'el rótulo')),
    titleLead: colorVar('dpf-title-lead', tone(mono.title.leadColor, 'el veredicto encendido')),
    titleRest: colorVar('dpf-title-rest', tone(mono.title.restColor, 'el veredicto')),
    descLead: colorVar('dpf-desc-lead', tone(mono.desc.leadColor, 'la descripción encendida')),
    descRest: colorVar('dpf-desc-rest', tone(mono.desc.restColor, 'la descripción'))
  }

  const delegate = selectionSlot(manifest)

  return {
    contentType: 'deck.decision-provider-fit',
    slots: {
      frame,
      stage: { src: stage.ref },
      shaft: { src: shaftLayer.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      note,
      verdicts: monoliths.map(m => m.slot),
      ...(delegate ? { selection: { ...delegate, item: selected } } : {})
    },
    assets: uniqueAssets([stage.asset, shaftLayer.asset, platform.asset, ...monoliths.map(m => m.icon.asset)])
  }
}
