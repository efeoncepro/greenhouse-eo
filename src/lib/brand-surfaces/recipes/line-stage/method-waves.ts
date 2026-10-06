/**
 * `method-waves` (deck Salesforce, SF10, TASK-1942): «¿Cómo se suma un agente? Por olas.». Cuatro escalones de vidrio que
 * suben de izquierda a derecha sobre una línea de base, del blueprint a la operación híbrida; la trayectoria de luz del
 * acento une sus cimas y termina en la esfera (la única órbita: esta lámina no lleva plataforma). El escalón por donde se
 * empieza va en papel con la sombra profunda y es el objeto de la selección «Cliente», por ítem (`selectedStep`). Sobre
 * la esfera puede ir el ícono oficial del producto (`topMark`, opcional y sujeto a la autorización escrita de Salesforce).
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['method-waves']`): la voz, el halo, la línea
 * de base, los escalones (posición, alturas, vidrio y papel, tipografía y colores en reposo y elegido), la trayectoria
 * con su esfera y el ícono de la cima. El CONTENIDO llega en el intent: `steps` (cuatro escalones con la forma de paso de
 * AXIS: `kicker`, `name`, `desc`; el número 01–04 lo pone el builder), `selectedStep` y, opcional, `topMark`.
 */

import { SurfacePieceError } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured, n, svgOpen } from '../kit'

import {
  cssFine,
  documentVars,
  exactly,
  glassVars,
  indexIn,
  lineColor,
  lineStageSvg,
  lineVoiceFrame,
  lumVars,
  productIcon,
  req,
  uniqueAssets,
  type FrostedGlass,
  type LineDocument,
  type LineStage
} from './kit'

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; lineHeight?: number; color: string; selectedColor: string; numbered?: boolean }

type StepTokens = {
  count: number
  xPx: number
  widthPx: number
  gapPx: number
  baseYPx: number
  heightsPx: number[]
  baseline: { extendPx: number; strokePx: number; color: string; opacity: number }
  padding: [number, number]
  radiusPx: number
  glass: FrostedGlass
  selected: { document: LineDocument }
  number: Text
  kicker: Text
  title: Text
  desc: Text
}

type TrajectoryTokens = {
  aboveTopPx: number
  color: string
  strokePx: number
  glow: { strokePx: number; opacity: number; blurPx: number }
  sphere: { rPx: number; glowRPx: number }
}

type StepIntent = { kicker?: unknown; name?: unknown; desc?: unknown }

const tracking = (value: string | undefined, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`))

const step = (index: number): string => String(index).padStart(2, '0')

/** La línea de base y la trayectoria con su esfera: la única órbita de la lámina, en una capa bajo los escalones. */
const trajectorySvg = (
  manifest: Parameters<typeof svgOpen>[0],
  steps: StepTokens,
  path: TrajectoryTokens,
  peaks: [number, number][],
  line: string
): string => {
  const { baseline } = steps
  const left = steps.xPx - baseline.extendPx
  const right = steps.xPx + steps.count * steps.widthPx + (steps.count - 1) * steps.gapPx + baseline.extendPx
  const accent = lineColor(path.color, line, 'la trayectoria')
  const d = `M ${peaks.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L ')}`
  const [ex, ey] = peaks[peaks.length - 1]!

  return (
    svgOpen(manifest) +
    `<defs><filter id="mwv-glow"><feGaussianBlur stdDeviation="${n(path.glow.blurPx)}"/></filter></defs>` +
    `<line x1="${n(left)}" y1="${n(steps.baseYPx)}" x2="${n(right)}" y2="${n(steps.baseYPx)}" stroke="${lineColor(baseline.color, line, 'la línea de base')}" stroke-opacity="${n(baseline.opacity)}" stroke-width="${n(baseline.strokePx)}"/>` +
    `<path d="${d}" fill="none" stroke="${accent}" stroke-width="${n(path.glow.strokePx)}" opacity="${n(path.glow.opacity)}" filter="url(#mwv-glow)" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${accent}" stroke-width="${n(path.strokePx)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${n(ex)}" cy="${n(ey)}" r="${n(path.sphere.glowRPx)}" fill="${accent}" filter="url(#mwv-glow)"/>` +
    `<circle cx="${n(ex)}" cy="${n(ey)}" r="${n(path.sphere.rPx)}" fill="${accent}"/>` +
    '</svg>'
  )
}

export const methodWaves: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const steps = measured(recipe.steps as StepTokens | undefined, 'los escalones')
  const path = measured(recipe.trajectory as TrajectoryTokens | undefined, 'la trayectoria')
  const top = measured(recipe.topMark as { px: number; aboveSphereCenterPx: number } | undefined, 'el ícono de la cima')
  const stage = measured(recipe.stage as LineStage | undefined, 'el escenario')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const doc = steps.selected.document

  if (recipe.orbit !== 'trajectory') throw new SurfacePieceError('AXIS no declaró la trayectoria como la órbita de la lámina.', 'invalid-intent')
  if (!voice.answerLead) throw new SurfacePieceError('La respuesta va en dos líneas (`voice.answer` con dos tramos).', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  // Los escalones son los `steps` del intent: desde AXIS 0.3.34 (delta (r)) la receta declara su anatomía de pasos
  // (tarjetas sin ícono, un layout de cuatro) y el resolver los valida como los demás pasos medidos.
  const list = exactly<StepIntent>(intent.steps, steps.count, 'Los escalones (`steps`)')
  const selected = indexIn(intent.selectedStep, steps.count, 'El escalón por donde se empieza (`selectedStep`)')
  // El ícono de la cima es opcional: sólo el oficial del producto (nunca un Trazo), sujeto a la autorización de Salesforce.
  const mark = intent.topMark === undefined || intent.topMark === null ? null : productIcon(intent.topMark, 'El ícono de la cima (`topMark`)', line)

  const leftOf = (i: number) => steps.xPx + i * (steps.widthPx + steps.gapPx)
  const heightOf = (i: number) => measured(steps.heightsPx[i], `la altura del escalón ${i + 1}`)
  const peaks = list.map((_, i) => [leftOf(i) + steps.widthPx / 2, steps.baseYPx - heightOf(i) - path.aboveTopPx] as [number, number])
  const [ex, ey] = peaks[peaks.length - 1]!

  const halo = layerAsset('mwv-stage', lineStageSvg(manifest, stage, line, 'mwv', measured(stage.halo.cxPx, 'el centro del halo')))
  const trajectory = layerAsset('method-waves-trajectory', trajectorySvg(manifest, steps, path, peaks, line))

  const tone = (value: string, what: string) => lineColor(value, line, what, doc)
  const { number, kicker, title, desc } = steps

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...glassVars(steps.glass, line),
    ...documentVars(doc, line),
    stepWidth: css('mwv-width', steps.widthPx),
    stepPadY: css('mwv-pad-y', steps.padding[0]),
    stepPadX: css('mwv-pad-x', steps.padding[1]),
    stepRadius: css('mwv-radius', steps.radiusPx),
    numberPx: css('mwv-number-px', number.px),
    numberColor: colorVar('mwv-number', tone(number.color, 'el número')),
    numberSelected: colorVar('mwv-number-selected', tone(number.selectedColor, 'el número elegido')),
    kickerPx: css('mwv-kicker-px', kicker.px),
    kickerWeight: css('mwv-kicker-wght', measured(kicker.weight, 'el peso del rótulo'), ''),
    kickerTracking: cssFine('mwv-kicker-tracking', tracking(kicker.tracking, 'el rótulo')),
    kickerGap: css('mwv-kicker-gap', measured(kicker.gapPx, 'el aire del rótulo')),
    kickerColor: colorVar('mwv-kicker', tone(kicker.color, 'el rótulo')),
    kickerSelected: colorVar('mwv-kicker-selected', tone(kicker.selectedColor, 'el rótulo elegido')),
    titlePx: css('mwv-title-px', title.px),
    titleLeading: css('mwv-title-leading', measured(title.lineHeight, 'el interlineado del título'), ''),
    titleTracking: cssFine('mwv-title-tracking', tracking(title.tracking, 'el título')),
    titleGap: css('mwv-title-gap', measured(title.gapPx, 'el aire del título')),
    titleColor: colorVar('mwv-title', tone(title.color, 'el título')),
    titleSelected: colorVar('mwv-title-selected', tone(title.selectedColor, 'el título elegido')),
    descPx: css('mwv-desc-px', desc.px),
    descWeight: css('mwv-desc-wght', measured(desc.weight, 'el peso de la descripción'), ''),
    descLeading: css('mwv-desc-leading', measured(desc.lineHeight, 'el interlineado de la descripción'), ''),
    descGap: css('mwv-desc-gap', measured(desc.gapPx, 'el aire de la descripción')),
    descColor: colorVar('mwv-desc', tone(desc.color, 'la descripción')),
    descSelected: colorVar('mwv-desc-selected', tone(desc.selectedColor, 'la descripción elegida'))
  }

  const delegate = selectionSlot(manifest)

  return {
    contentType: 'deck.method-waves',
    slots: {
      frame,
      stage: { src: halo.ref },
      trajectory: { src: trajectory.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      steps: list.map((item, i) => {
        const where = `el escalón ${i + 1} (\`steps[${i}]\`)`

        return {
          role: i + 1 === selected ? 'lead' : 'rest',
          left: css('mwv-left', leftOf(i)),
          top: css('mwv-top', steps.baseYPx - heightOf(i)),
          height: css('mwv-height', heightOf(i)),
          number: number.numbered ? step(i + 1) : String(i + 1),
          kicker: req(item.kicker, `El rótulo de ${where} (\`kicker\`)`),
          title: req(item.name, `El título de ${where} (\`name\`)`),
          description: req(item.desc, `La descripción de ${where} (\`desc\`)`)
        }
      }),
      ...(mark
        ? {
            topMark: {
              src: mark.ref,
              left: css('mwv-mark-left', ex - top.px / 2),
              top: css('mwv-mark-top', ey - top.aboveSphereCenterPx),
              size: css('mwv-mark', top.px)
            }
          }
        : {}),
      ...(delegate ? { selection: { ...delegate, item: selected } } : {})
    },
    assets: uniqueAssets([halo.asset, trajectory.asset, ...(mark ? [mark.asset] : [])])
  }
}
