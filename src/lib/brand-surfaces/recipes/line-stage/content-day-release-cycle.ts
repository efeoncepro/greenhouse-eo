/**
 * `content-day-release-cycle` (deck Salesforce, SF14, TASK-1942): «¿Cómo trabajamos contigo? Sin sorpresas.». El release
 * en revisión al centro, en papel y con su reflejo, sobre la plataforma de luz: cabecera (release y producto, con el ícono
 * oficial del producto), el ciclo fijo Sandbox → Pruebas → Tu aprobación → Producción con el estado de cada paso, el
 * video que explica el cambio y la fila con la herramienta del video y el botón «Aprobar release». Alrededor, cuatro
 * herramientas del día a día con su isotipo oficial en una ficha blanca, cada una con su haz a la tarjeta. La selección
 * «Cliente» toma el botón de aprobación (`bottom-start`).
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['content-day-release-cycle']`). La interfaz
 * es genérica: sólo los isotipos son reales. El CONTENIDO llega en el intent: `release` (`kicker`, `title`, `icon`,
 * `currentStep` 1–4, `videoTool`, `videoDuration`, `presenterInitials`, `videoCaption`, `approveCta`) y `tools` (cuatro:
 * `tool`, `kicker`, `label`). `tool` es un isotipo del catálogo (`teams`, `notion`, `loom`, `slack`, `microsoft-365`) o
 * el ícono oficial de un producto de Salesforce (`sf-icon:<producto>`, p. ej. `sf-icon:platform` para el sandbox).
 */

import { SurfacePieceError, type SurfaceAssetRequest } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured } from '../kit'

import {
  beamsSvg,
  documentVars,
  exactly,
  indexIn,
  lineColor,
  lineVoiceFrame,
  lumVars,
  productIcon,
  reflectionVars,
  req,
  stageLayers,
  uniqueAssets,
  type LineBeam,
  type LineDocument,
  type Reflection,
  type Shadow
} from './kit'

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; gapTopPx?: number; color?: string; family?: string; lineHeight?: number; uppercase?: boolean }

type Ring = { px: number; color: string }

type ReleaseTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  document: LineDocument
  reflection: Reflection
  kicker: Text
  title: Text
  icon: { px: number }
  headerGapBottomPx: number
  steps: {
    labels: string[]
    gapPx: number
    gapBottomPx: number
    dot: {
      px: number
      glyphPx: number
      glyphWeight: number
      done: { fill: string; color: string; glyph: string }
      now: { fill: string; ring: Ring; glyph: string }
      todo: { fill: string; ring: Ring }
    }
    label: { px: number; weight: number; gapPx: number; todoColor: string }
  }
  video: {
    heightPx: number
    radiusPx: number
    gradient: { angleDeg: number; from: string; to: string }
    screen: {
      insetXPx: number
      topPx: number
      heightPx: number
      radiusPx: number
      fill: { color: string; opacity: number }
      border: { px: number; color: string; opacity: number }
      bars: { insetXPx: number; firstTopPx: number; gapPx: number; heightPx: number; radiusPx: number; color: string; widthsOfScreen: number[]; opacities: number[] }
    }
    play: { px: number; glyphPx: number; fill: string; glyph: string; centerTopOfHeight: number; shadow: Shadow }
    author: { px: number; fill: string; ring: Ring; initials: Text; endPx: number; bottomPx: number }
    duration: { px: number; weight: number; padding: [number, number]; radiusPx: number; insetStartPx: number; bottomPx: number; color: string; fill: { color: string; opacity: number } }
  }
  footer: {
    gapTopPx: number
    gapPx: number
    tool: { iconPx: number; gapPx: number; text: Text }
    cta: { padding: [number, number]; radiusPx: number; fill: string; color: string; px: number; weight: number; text: string }
  }
}

type ToolsTokens = {
  max: number
  widthPx: number
  tile: { px: number; radiusPx: number; fill: string; shadow: Shadow; edge: { px: number; color: string; opacity: number } }
  iconPx: Record<string, number> & { default: number }
  kicker: Text
  label: Text
  positions: [number, number][]
  beams: { from: [number, number]; to: [number, number]; bendPx: number }[]
}

type ReleaseIntent = {
  kicker?: unknown
  title?: unknown
  icon?: unknown
  currentStep?: unknown
  videoTool?: unknown
  videoDuration?: unknown
  presenterInitials?: unknown
  videoCaption?: unknown
  approveCta?: unknown
}

type ToolIntent = { tool?: unknown; kicker?: unknown; label?: unknown }

/**
 * Los isotipos de herramientas de trabajo del catálogo (`deck-axis/assets/tools/<id>-isotype.svg`), oficiales y en su
 * color. Sólo herramientas que la cuenta usa de verdad; una herramienta nueva se da de alta acá con su archivo.
 */
export const TOOL_ISOTYPES = ['teams', 'notion', 'loom', 'slack', 'microsoft-365'] as const

const TOOL_DIR = 'src/lib/artifact-composer/catalogs/deck-axis/assets/tools'

/** El isotipo de una herramienta de trabajo del catálogo, validado contra la lista cerrada. */
export const toolIsotype = (name: unknown, what: string): { ref: string; asset: SurfaceAssetRequest } => {
  if (typeof name !== 'string' || !(TOOL_ISOTYPES as readonly string[]).includes(name)) {
    throw new SurfacePieceError(`${what}: la herramienta es una de ${TOOL_ISOTYPES.join(' · ')}.`, 'invalid-intent')
  }

  const ref = `asset-ref:file:tool-${name}`

  return { ref, asset: { ref, kind: 'file', path: `${TOOL_DIR}/${name}-isotype.svg` } }
}

/**
 * Una herramienta del intent: un isotipo del catálogo, `sf-icon:<producto>` (ícono oficial de Salesforce) o
 * `hs-icon:<hub>` (ícono oficial de un Hub de HubSpot, TASK-1943).
 */
const toolMark = (value: unknown, what: string): { key: string; ref: string; asset: SurfaceAssetRequest } => {
  if (typeof value === 'string' && value.startsWith('sf-icon:')) {
    const product = value.slice('sf-icon:'.length)

    return { key: product, ...productIcon(product, what) }
  }

  if (typeof value === 'string' && value.startsWith('hs-icon:')) {
    const hub = value.slice('hs-icon:'.length)

    return { key: `hubspot-${hub}`, ...productIcon(hub, what, 'revenue-hubspot') }
  }

  return { key: String(value), ...toolIsotype(value, what) }
}

/**
 * El tracking del token (en em) como px del cuerpo: `css()` redondea a dos decimales y −0,015 em saldría −0,01 em; en px
 * (−0,015 × 22 = −0,33 px) el valor de AXIS llega entero.
 */
export const trackingPx = (name: string, text: Text, what: string): string =>
  css(name, Number.parseFloat(measured(text.tracking, `el tracking de ${what}`)) * text.px)

const STATES = ['done', 'now', 'todo'] as const

/** El largo de la respuesta en dos líneas del catálogo de recetas: 16 caracteres entre las dos (hasta 9 por línea). */
export const ANSWER_MAX_CHARS = 16

/** La respuesta de las láminas con respuesta de 150 px: siempre en dos líneas y dentro de su largo total. */
export const twoLineAnswer = (voice: Record<string, string>, what: string): void => {
  if (!voice.answerLead) throw new SurfacePieceError(`La respuesta de «${what}» va en dos líneas.`, 'invalid-intent')

  if (`${voice.answerLead} ${voice.answer}`.length > ANSWER_MAX_CHARS) {
    throw new SurfacePieceError(`La respuesta de «${what}» va en ${ANSWER_MAX_CHARS} caracteres entre las dos líneas.`, 'invalid-intent')
  }
}

export const contentDayReleaseCycle: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const release = measured(recipe.release as ReleaseTokens | undefined, 'el release')
  const tools = measured(recipe.tools as ToolsTokens | undefined, 'las herramientas')
  const beam = measured(recipe.beam as LineBeam | undefined, 'el haz de luz')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const doc = release.document
  const { steps, video, footer } = release

  twoLineAnswer(voice, 'el ciclo del release')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const r = (intent.release ?? {}) as ReleaseIntent
  const current = indexIn(r.currentStep, steps.labels.length, 'El paso actual del ciclo (`release.currentStep`)')
  const icon = productIcon(r.icon, 'El producto del release (`release.icon`)', line)
  const videoTool = toolIsotype(r.videoTool, 'La herramienta del video (`release.videoTool`)')
  const duration = req(r.videoDuration, 'La duración del video (`release.videoDuration`)')

  if (!/^\d{1,2}:[0-5]\d$/.test(duration)) throw new SurfacePieceError('La duración del video va en m:ss (`release.videoDuration`).', 'invalid-intent')

  const list = exactly<ToolIntent>(intent.tools, tools.max, 'Las herramientas (`tools`)')
  const marks = list.map((tool, i) => toolMark(tool.tool, `La herramienta ${i + 1} (\`tools[${i}].tool\`)`))

  const { stage, platform } = stageLayers(manifest, recipe, line, 'crc')

  const beams = layerAsset(
    'content-day-release-cycle-beams',
    beamsSvg(
      manifest,
      tools.beams.map(b => ({ from: b.from, to: b.to, bend: b.bendPx })),
      beam,
      line,
      'crc'
    )
  )

  const color = (value: string, what: string) => lineColor(value, line, what, doc)
  const { dot } = steps

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...documentVars(doc, line),
    ...reflectionVars(release.reflection),
    // El release
    releaseLeft: css('crc-release-left', release.xPx),
    releaseTop: css('crc-release-top', release.yPx),
    releaseWidth: css('crc-release-width', release.widthPx),
    releasePadTop: css('crc-release-pad-top', release.padding[0]),
    releasePadX: css('crc-release-pad-x', release.padding[1]),
    releasePadBottom: css('crc-release-pad-bottom', release.padding[2]),
    releaseRadius: css('crc-release-radius', release.radiusPx),
    kickerPx: css('crc-kicker-px', release.kicker.px),
    kickerWeight: css('crc-kicker-wght', measured(release.kicker.weight, 'el peso del rótulo del release'), ''),
    kickerTracking: trackingPx('crc-kicker-tracking', release.kicker, 'el rótulo del release'),
    kickerColor: colorVar('crc-kicker', color(measured(release.kicker.color, 'el color del rótulo del release'), 'el rótulo del release')),
    titlePx: css('crc-title-px', release.title.px),
    titleTracking: trackingPx('crc-title-tracking', release.title, 'el título del release'),
    titleGap: css('crc-title-gap', measured(release.title.gapPx, 'el aire del título del release')),
    iconPx: css('crc-icon-px', release.icon.px),
    headGapBottom: css('crc-head-gap-bottom', release.headerGapBottomPx),
    // El ciclo
    stepsGap: css('crc-steps-gap', steps.gapPx),
    stepsGapBottom: css('crc-steps-gap-bottom', steps.gapBottomPx),
    dotPx: css('crc-dot-px', dot.px),
    dotGlyphPx: css('crc-dot-glyph-px', dot.glyphPx),
    dotGlyphWeight: css('crc-dot-glyph-wght', dot.glyphWeight, ''),
    doneFill: colorVar('crc-done-fill', color(dot.done.fill, 'el paso hecho')),
    doneGlyph: colorVar('crc-done-glyph', color(dot.done.color, 'la marca del paso hecho')),
    nowFill: colorVar('crc-now-fill', color(dot.now.fill, 'el paso actual')),
    nowRing: css('crc-now-ring', dot.now.ring.px),
    nowRingColor: colorVar('crc-now-ring', color(dot.now.ring.color, 'el contorno del paso actual')),
    todoFill: colorVar('crc-todo-fill', color(dot.todo.fill, 'el paso pendiente')),
    todoRing: css('crc-todo-ring', dot.todo.ring.px),
    todoRingColor: colorVar('crc-todo-ring', color(dot.todo.ring.color, 'el contorno del paso pendiente')),
    stepLabelPx: css('crc-step-label-px', steps.label.px),
    stepLabelWeight: css('crc-step-label-wght', steps.label.weight, ''),
    stepLabelGap: css('crc-step-label-gap', steps.label.gapPx),
    stepTodoColor: colorVar('crc-step-todo', color(steps.label.todoColor, 'el paso pendiente')),
    // El video
    videoHeight: css('crc-video-height', video.heightPx),
    videoRadius: css('crc-video-radius', video.radiusPx),
    videoAngle: css('crc-video-angle', video.gradient.angleDeg, 'deg'),
    videoFrom: colorVar('crc-video-from', color(video.gradient.from, 'el video')),
    videoTo: colorVar('crc-video-to', color(video.gradient.to, 'el video')),
    screenInsetX: css('crc-screen-inset-x', video.screen.insetXPx),
    screenTop: css('crc-screen-top', video.screen.topPx),
    screenHeight: css('crc-screen-height', video.screen.heightPx),
    screenRadius: css('crc-screen-radius', video.screen.radiusPx),
    screenFill: colorVar('crc-screen-fill', color(video.screen.fill.color, 'la pantalla del video')),
    screenFillOpacity: css('crc-screen-fill-opacity', video.screen.fill.opacity * 100, '%'),
    screenBorder: css('crc-screen-border', video.screen.border.px),
    screenBorderColor: colorVar('crc-screen-border', color(video.screen.border.color, 'el filo de la pantalla')),
    screenBorderOpacity: css('crc-screen-border-opacity', video.screen.border.opacity * 100, '%'),
    barInsetX: css('crc-bar-inset-x', video.screen.bars.insetXPx),
    barFirstTop: css('crc-bar-first-top', video.screen.bars.firstTopPx),
    barGap: css('crc-bar-gap', video.screen.bars.gapPx),
    barHeight: css('crc-bar-height', video.screen.bars.heightPx),
    barRadius: css('crc-bar-radius', video.screen.bars.radiusPx),
    barColor: colorVar('crc-bar', color(video.screen.bars.color, 'las barras de la pantalla')),
    ...Object.fromEntries(
      [0, 1, 2].flatMap(i => [
        [`bar${i + 1}Width`, css(`crc-bar-${i + 1}-width`, measured(video.screen.bars.widthsOfScreen[i], `el ancho de la barra ${i + 1}`) * 100, '%')],
        [`bar${i + 1}Opacity`, css(`crc-bar-${i + 1}-opacity`, measured(video.screen.bars.opacities[i], `la opacidad de la barra ${i + 1}`) * 100, '%')]
      ])
    ),
    playPx: css('crc-play-px', video.play.px),
    playTop: css('crc-play-top', video.play.centerTopOfHeight * 100, '%'),
    playShadowY: css('crc-play-shadow-y', video.play.shadow.yPx),
    playShadowBlur: css('crc-play-shadow-blur', video.play.shadow.blurPx),
    playShadowColor: colorVar('crc-play-shadow', color(video.play.shadow.color, 'la sombra de reproducir')),
    playShadowOpacity: css('crc-play-shadow-opacity', video.play.shadow.opacity * 100, '%'),
    playGlyphPx: css('crc-play-glyph-px', video.play.glyphPx),
    playFill: colorVar('crc-play-fill', color(video.play.fill, 'el botón de reproducir')),
    playGlyph: colorVar('crc-play-glyph', color(video.play.glyph, 'el triángulo de reproducir')),
    authorPx: css('crc-author-px', video.author.px),
    authorFill: colorVar('crc-author-fill', color(video.author.fill, 'el presentador')),
    authorRing: css('crc-author-ring', video.author.ring.px),
    authorRingColor: colorVar('crc-author-ring', color(video.author.ring.color, 'el contorno del presentador')),
    authorEnd: css('crc-author-end', video.author.endPx),
    authorBottom: css('crc-author-bottom', video.author.bottomPx),
    initialsPx: css('crc-initials-px', video.author.initials.px),
    initialsColor: colorVar('crc-initials', color(measured(video.author.initials.color, 'el color de las iniciales'), 'las iniciales')),
    durationPx: css('crc-duration-px', video.duration.px),
    durationWeight: css('crc-duration-wght', video.duration.weight, ''),
    durationPadY: css('crc-duration-pad-y', video.duration.padding[0]),
    durationPadX: css('crc-duration-pad-x', video.duration.padding[1]),
    durationRadius: css('crc-duration-radius', video.duration.radiusPx),
    durationStart: css('crc-duration-start', video.duration.insetStartPx),
    durationBottom: css('crc-duration-bottom', video.duration.bottomPx),
    durationColor: colorVar('crc-duration', color(video.duration.color, 'el texto de la duración')),
    durationFill: colorVar('crc-duration-fill', color(video.duration.fill.color, 'la duración')),
    durationFillOpacity: css('crc-duration-fill-opacity', video.duration.fill.opacity * 100, '%'),
    // La fila de aprobación
    footerGap: css('crc-footer-gap', footer.gapTopPx),
    footerItemsGap: css('crc-footer-items-gap', footer.gapPx),
    toolIconPx: css('crc-tool-icon-px', footer.tool.iconPx),
    toolGap: css('crc-tool-gap', footer.tool.gapPx),
    captionPx: css('crc-caption-px', footer.tool.text.px),
    captionWeight: css('crc-caption-wght', measured(footer.tool.text.weight, 'el peso del texto del video'), ''),
    ctaPadY: css('crc-cta-pad-y', footer.cta.padding[0]),
    ctaPadX: css('crc-cta-pad-x', footer.cta.padding[1]),
    ctaRadius: css('crc-cta-radius', footer.cta.radiusPx),
    ctaFill: colorVar('crc-cta-fill', color(footer.cta.fill, 'el botón de aprobación')),
    ctaColor: colorVar('crc-cta', color(footer.cta.color, 'el texto del botón de aprobación')),
    ctaPx: css('crc-cta-px', footer.cta.px),
    ctaWeight: css('crc-cta-wght', footer.cta.weight, ''),
    // Las herramientas
    toolWidth: css('crc-tool-width', tools.widthPx),
    tilePx: css('crc-tile-px', tools.tile.px),
    tileRadius: css('crc-tile-radius', tools.tile.radiusPx),
    tileFill: colorVar('crc-tile-fill', lineColor(tools.tile.fill, line, 'la ficha de la herramienta')),
    tileShadowY: css('crc-tile-shadow-y', tools.tile.shadow.yPx),
    tileShadowBlur: css('crc-tile-shadow-blur', tools.tile.shadow.blurPx),
    tileShadowColor: colorVar('crc-tile-shadow', lineColor(tools.tile.shadow.color, line, 'la sombra de la ficha')),
    tileShadowOpacity: css('crc-tile-shadow-opacity', tools.tile.shadow.opacity * 100, '%'),
    tileEdge: css('crc-tile-edge', tools.tile.edge.px),
    tileEdgeColor: colorVar('crc-tile-edge', lineColor(tools.tile.edge.color, line, 'el filo de la ficha')),
    tileEdgeOpacity: css('crc-tile-edge-opacity', tools.tile.edge.opacity * 100, '%'),
    toolKickerPx: css('crc-tool-kicker-px', tools.kicker.px),
    toolKickerWeight: css('crc-tool-kicker-wght', measured(tools.kicker.weight, 'el peso del rótulo de la herramienta'), ''),
    toolKickerTracking: trackingPx('crc-tool-kicker-tracking', tools.kicker, 'el rótulo de la herramienta'),
    toolKickerGap: css('crc-tool-kicker-gap', measured(tools.kicker.gapTopPx, 'el aire del rótulo de la herramienta')),
    toolKickerColor: colorVar('crc-tool-kicker', lineColor(measured(tools.kicker.color, 'el color del rótulo de la herramienta'), line, 'el rótulo de la herramienta')),
    toolLabelPx: css('crc-tool-label-px', tools.label.px),
    toolLabelLeading: css('crc-tool-label-leading', measured(tools.label.lineHeight, 'el interlineado de la herramienta'), ''),
    toolLabelTracking: trackingPx('crc-tool-label-tracking', tools.label, 'la herramienta'),
    toolLabelGap: css('crc-tool-label-gap', measured(tools.label.gapPx, 'el aire de la herramienta')),
    toolLabelColor: colorVar('crc-tool-label', lineColor(measured(tools.label.color, 'el color de la herramienta'), line, 'la herramienta'))
  }

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.content-day-release-cycle',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      beams: { src: beams.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      release: {
        kicker: req(r.kicker, 'El rótulo del release (`release.kicker`)'),
        title: req(r.title, 'El título del release (`release.title`)'),
        icon: icon.ref
      },
      // El ciclo es fijo (AXIS); el intent sólo dice en qué paso va: los anteriores hechos, el actual y los pendientes.
      steps: steps.labels.map((label, i) => {
        const state = STATES[i + 1 < current ? 0 : i + 1 === current ? 1 : 2]
        const glyph = state === 'done' ? dot.done.glyph : state === 'now' ? dot.now.glyph : null

        return { label, state, ...(glyph ? { glyph } : {}) }
      }),
      video: {
        duration,
        initials: req(r.presenterInitials, 'Las iniciales del presentador (`release.presenterInitials`)')
      },
      approval: {
        tool: videoTool.ref,
        caption: req(r.videoCaption, 'El texto del video (`release.videoCaption`)'),
        cta: req(r.approveCta, 'El botón de aprobación (`release.approveCta`)')
      },
      tools: list.map((tool, i) => {
        const [x, y] = measured(tools.positions[i], `la posición de la herramienta ${i + 1}`)

        return {
          icon: marks[i]!.ref,
          kicker: req(tool.kicker, `El rótulo de la herramienta ${i + 1} (\`tools[${i}].kicker\`)`),
          label: req(tool.label, `La herramienta ${i + 1} (\`tools[${i}].label\`)`),
          left: css('crc-left', x),
          top: css('crc-top', y),
          iconPx: css('crc-mark-px', tools.iconPx[marks[i]!.key] ?? tools.iconPx.default)
        }
      }),
      ...(selection ? { selection } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, beams.asset, icon.asset, videoTool.asset, ...marks.map(mark => mark.asset)])
  }
}
