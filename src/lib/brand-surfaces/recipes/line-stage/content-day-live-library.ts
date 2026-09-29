/**
 * `content-day-live-library` (deck Salesforce, SF15, TASK-1942): «¿Cómo aprende tu equipo? A su ritmo.». La biblioteca
 * de tutoriales en video por rol, grabados sobre la org del cliente, abierta en perspectiva sobre la plataforma de luz:
 * cabecera con el isotipo de la herramienta, la marca de datos de muestra, cuatro videos (miniatura con el ícono oficial
 * del producto, reproducir y duración; el rol y el título) y tres cifras. Sin selección.
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['content-day-live-library']`); las claves de
 * color del documento (`chip`, `muted`, `rule`) se resuelven con el documento propio de la biblioteca (`library.document`). La
 * interfaz es genérica: sólo los isotipos son reales. El CONTENIDO llega en el intent: `library` (`tool` opcional
 * —la herramienta sólo si la cuenta la usa—, `kicker`, `title`), `videos` (cuatro: `icon`, `role`, `title`, `duration`),
 * `stats` (tres: `value`, `label`) y la marca de muestra (`sampleMark`), obligatoria con datos de muestra (`dataOrigin`
 * `illustrative`, el default) y opcional con datos del cliente y su evidencia (`evidenceRef`).
 */

import { SurfacePieceError } from '../../types'
import { contentOf, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, measured } from '../kit'

import { toolIsotype, trackingPx, twoLineAnswer } from './content-day-release-cycle'
import {
  documentVars,
  exactly,
  lineColor,
  lineVoiceFrame,
  lumVars,
  productIcon,
  req,
  stageLayers,
  uniqueAssets,
  type LineDocument,
  type Shadow
} from './kit'

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; gapTopPx?: number; gapBottomPx?: number; insetXPx?: number; color?: string; family?: string; lineHeight?: number; uppercase?: boolean }

type Border = { px: number; color: string }

type LibraryTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number]
  radiusPx: number
  fill: string
  document: LineDocument
  perspectivePx: number
  rotateYDeg: number
  rotateXDeg: number
  origin: string
  header: { toolIconPx: number; gapPx: number; gapBottomPx: number; kicker: Text; title: Text }
  mark: { padding: [number, number]; radiusPx: number; fill: string; border: Border } & Text
  videos: {
    count: number
    gapPx: number
    card: { padding: number; radiusPx: number; fill: string; shadow: Shadow }
    thumb: {
      heightPx: number
      radiusPx: number
      gradient: { angleDeg: number; to: string; fromByRole: string[] }
      icon: { px: number; insetPx: number }
      play: { px: number; glyphPx: number; fill: string; glyph: string }
      duration: { px: number; weight: number; padding: [number, number]; radiusPx: number; insetPx: number; color: string; fill: { color: string; opacity: number } }
    }
    role: Text
    title: Text
  }
  stats: { count: number; gapPx: number; gapTopPx: number; padding: [number, number]; radiusPx: number; fill: string; border: Border; value: Text; label: Text }
}

type LibraryIntent = { tool?: unknown; kicker?: unknown; title?: unknown }
type VideoIntent = { icon?: unknown; role?: unknown; title?: unknown; duration?: unknown }
type StatIntent = { value?: unknown; label?: unknown }

/** `illustrative-data-marked`: la marca de muestra, obligatoria salvo con datos del cliente y su evidencia. */
const sampleMarkOf = (intent: Record<string, unknown>): string | null => {
  const origin = intent.dataOrigin ?? 'illustrative'

  if (origin !== 'illustrative' && origin !== 'client') {
    throw new SurfacePieceError('El origen de los datos (`dataOrigin`) es `illustrative` o `client`.', 'invalid-intent')
  }

  const mark = typeof intent.sampleMark === 'string' ? intent.sampleMark.trim() : ''

  if (origin === 'illustrative') {
    if (!mark) throw new SurfacePieceError('Con datos de muestra, la biblioteca lleva su marca visible (`sampleMark`, «Datos de muestra»).', 'invalid-intent')

    return mark
  }

  req(intent.evidenceRef, 'Con datos del cliente, la evidencia de esos datos (`evidenceRef`)')

  return mark || null
}

export const contentDayLiveLibrary: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const library = measured(recipe.library as LibraryTokens | undefined, 'la biblioteca')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const { header, mark, videos, stats } = library
  const { thumb } = videos

  twoLineAnswer(voice, 'la biblioteca')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')
  if (library.origin !== 'start') throw new SurfacePieceError('AXIS abre la biblioteca desde su borde inicial (`origin: start`).', 'surface-issues')

  // La biblioteca es su propio documento (papel suave sobre el chip): el fondo es una clave del mismo documento.
  const own = measured(library.document, 'el documento de la biblioteca')
  const doc: LineDocument = { ...own, fill: lineColor(own.fill, line, 'la biblioteca', own) }
  const color = (value: string, what: string) => lineColor(value, line, what, doc)

  const l = (intent.library ?? {}) as LibraryIntent
  const tool = l.tool === undefined ? null : toolIsotype(l.tool, 'La herramienta de la biblioteca (`library.tool`)')
  const sampleMark = sampleMarkOf(intent)
  const list = exactly<VideoIntent>(intent.videos, videos.count, 'Los videos (`videos`)')
  const icons = list.map((video, i) => productIcon(video.icon, `El video ${i + 1} (\`videos[${i}].icon\`)`))
  const figures = exactly<StatIntent>(intent.stats, stats.count, 'Las cifras (`stats`)')

  const { stage, platform } = stageLayers(manifest, recipe, line, 'cll')

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...documentVars(doc, line),
    // La biblioteca
    libraryLeft: css('cll-library-left', library.xPx),
    libraryTop: css('cll-library-top', library.yPx),
    libraryWidth: css('cll-library-width', library.widthPx),
    libraryPadY: css('cll-library-pad-y', library.padding[0]),
    libraryPadX: css('cll-library-pad-x', library.padding[1]),
    libraryRadius: css('cll-library-radius', library.radiusPx),
    libraryPerspective: css('cll-library-perspective', library.perspectivePx),
    libraryRotateY: css('cll-library-rotate-y', library.rotateYDeg, 'deg'),
    libraryRotateX: css('cll-library-rotate-x', library.rotateXDeg, 'deg'),
    // La cabecera
    headerToolPx: css('cll-tool-px', header.toolIconPx),
    headerGap: css('cll-header-gap', header.gapPx),
    headerGapBottom: css('cll-header-gap-bottom', header.gapBottomPx),
    kickerPx: css('cll-kicker-px', header.kicker.px),
    kickerWeight: css('cll-kicker-wght', measured(header.kicker.weight, 'el peso del rótulo de la biblioteca'), ''),
    kickerTracking: trackingPx('cll-kicker-tracking', header.kicker, 'el rótulo de la biblioteca'),
    kickerColor: colorVar('cll-kicker', color(measured(header.kicker.color, 'el color del rótulo'), 'el rótulo de la biblioteca')),
    titlePx: css('cll-title-px', header.title.px),
    titleTracking: trackingPx('cll-title-tracking', header.title, 'el título de la biblioteca'),
    titleGap: css('cll-title-gap', measured(header.title.gapPx, 'el aire del título de la biblioteca')),
    // La marca de muestra
    markPadY: css('cll-mark-pad-y', mark.padding[0]),
    markPadX: css('cll-mark-pad-x', mark.padding[1]),
    markRadius: css('cll-mark-radius', mark.radiusPx),
    markFill: colorVar('cll-mark-fill', color(mark.fill, 'la marca de muestra')),
    markBorder: css('cll-mark-border', mark.border.px),
    markBorderColor: colorVar('cll-mark-border', color(mark.border.color, 'el filete de la marca de muestra')),
    markPx: css('cll-mark-px', mark.px),
    markWeight: css('cll-mark-wght', measured(mark.weight, 'el peso de la marca de muestra'), ''),
    markTracking: trackingPx('cll-mark-tracking', mark, 'la marca de muestra'),
    markColor: colorVar('cll-mark', color(measured(mark.color, 'el color de la marca de muestra'), 'la marca de muestra')),
    // Los videos
    videoCount: css('cll-videos', videos.count, ''),
    videosGap: css('cll-videos-gap', videos.gapPx),
    cardPad: css('cll-card-pad', videos.card.padding),
    cardRadius: css('cll-card-radius', videos.card.radiusPx),
    cardFill: colorVar('cll-card-fill', color(videos.card.fill, 'la tarjeta del video')),
    cardShadowY: css('cll-card-shadow-y', videos.card.shadow.yPx),
    cardShadowBlur: css('cll-card-shadow-blur', videos.card.shadow.blurPx),
    cardShadowColor: colorVar('cll-card-shadow', color(videos.card.shadow.color, 'la sombra de la tarjeta')),
    cardShadowOpacity: css('cll-card-shadow-opacity', videos.card.shadow.opacity * 100, '%'),
    thumbHeight: css('cll-thumb-height', thumb.heightPx),
    thumbRadius: css('cll-thumb-radius', thumb.radiusPx),
    thumbAngle: css('cll-thumb-angle', thumb.gradient.angleDeg, 'deg'),
    thumbTo: colorVar('cll-thumb-to', color(thumb.gradient.to, 'la miniatura')),
    thumbIconPx: css('cll-thumb-icon-px', thumb.icon.px),
    thumbIconInset: css('cll-thumb-icon-inset', thumb.icon.insetPx),
    playPx: css('cll-play-px', thumb.play.px),
    playGlyphPx: css('cll-play-glyph-px', thumb.play.glyphPx),
    playFill: colorVar('cll-play-fill', color(thumb.play.fill, 'el botón de reproducir')),
    playGlyph: colorVar('cll-play-glyph', color(thumb.play.glyph, 'el triángulo de reproducir')),
    durationPx: css('cll-duration-px', thumb.duration.px),
    durationWeight: css('cll-duration-wght', thumb.duration.weight, ''),
    durationPadY: css('cll-duration-pad-y', thumb.duration.padding[0]),
    durationPadX: css('cll-duration-pad-x', thumb.duration.padding[1]),
    durationRadius: css('cll-duration-radius', thumb.duration.radiusPx),
    durationInset: css('cll-duration-inset', thumb.duration.insetPx),
    durationFill: colorVar('cll-duration-fill', color(thumb.duration.fill.color, 'la duración')),
    durationFillOpacity: css('cll-duration-fill-opacity', thumb.duration.fill.opacity * 100, '%'),
    durationColor: colorVar('cll-duration', color(thumb.duration.color, 'el texto de la duración')),
    rolePx: css('cll-role-px', videos.role.px),
    roleWeight: css('cll-role-wght', measured(videos.role.weight, 'el peso del rol'), ''),
    roleTracking: trackingPx('cll-role-tracking', videos.role, 'el rol'),
    roleGap: css('cll-role-gap', measured(videos.role.gapTopPx, 'el aire del rol')),
    roleInsetX: css('cll-role-inset-x', measured(videos.role.insetXPx, 'la sangría del rol')),
    roleColor: colorVar('cll-role', color(measured(videos.role.color, 'el color del rol'), 'el rol')),
    videoTitlePx: css('cll-video-title-px', videos.title.px),
    videoTitleWeight: css('cll-video-title-wght', measured(videos.title.weight, 'el peso del título del video'), ''),
    videoTitleLeading: css('cll-video-title-leading', measured(videos.title.lineHeight, 'el interlineado del título del video'), ''),
    videoTitleGap: css('cll-video-title-gap', measured(videos.title.gapPx, 'el aire del título del video')),
    videoTitleInsetX: css('cll-video-title-inset-x', measured(videos.title.insetXPx, 'la sangría del título del video')),
    videoTitleGapBottom: css('cll-video-title-gap-bottom', measured(videos.title.gapBottomPx, 'el aire bajo el título del video')),
    // Las cifras
    statsGap: css('cll-stats-gap', stats.gapPx),
    statsGapTop: css('cll-stats-gap-top', stats.gapTopPx),
    statPadY: css('cll-stat-pad-y', stats.padding[0]),
    statPadX: css('cll-stat-pad-x', stats.padding[1]),
    statRadius: css('cll-stat-radius', stats.radiusPx),
    statFill: colorVar('cll-stat-fill', color(stats.fill, 'la cifra')),
    statBorder: css('cll-stat-border', stats.border.px),
    statBorderColor: colorVar('cll-stat-border', color(stats.border.color, 'el filete de la cifra')),
    statValuePx: css('cll-stat-value-px', stats.value.px),
    statLabelPx: css('cll-stat-label-px', stats.label.px),
    statLabelWeight: css('cll-stat-label-wght', measured(stats.label.weight, 'el peso de la etiqueta de la cifra'), ''),
    statLabelGap: css('cll-stat-label-gap', measured(stats.label.gapPx, 'el aire de la etiqueta de la cifra')),
    statLabelColor: colorVar('cll-stat-label', color(measured(stats.label.color, 'el color de la etiqueta de la cifra'), 'la etiqueta de la cifra'))
  }

  return {
    contentType: 'deck.content-day-live-library',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      ...(tool ? { libraryTool: { src: tool.ref } } : {}),
      library: {
        kicker: req(l.kicker, 'El rótulo de la biblioteca (`library.kicker`)'),
        title: req(l.title, 'El título de la biblioteca (`library.title`)')
      },
      ...(sampleMark ? { sampleMark } : {}),
      videos: list.map((video, i) => {
        const duration = req(video.duration, `La duración del video ${i + 1} (\`videos[${i}].duration\`)`)

        if (!/^\d{1,2}:[0-5]\d$/.test(duration)) throw new SurfacePieceError(`La duración del video ${i + 1} va en m:ss (\`videos[${i}].duration\`).`, 'invalid-intent')

        return {
          icon: icons[i]!.ref,
          from: colorVar('cll-thumb-from', color(measured(thumb.gradient.fromByRole[i], `el tono de la miniatura ${i + 1}`), 'la miniatura')),
          duration,
          role: req(video.role, `El rol del video ${i + 1} (\`videos[${i}].role\`)`),
          title: req(video.title, `El título del video ${i + 1} (\`videos[${i}].title\`)`)
        }
      }),
      stats: figures.map((stat, i) => ({
        value: req(stat.value, `La cifra ${i + 1} (\`stats[${i}].value\`)`),
        label: req(stat.label, `La etiqueta de la cifra ${i + 1} (\`stats[${i}].label\`)`)
      }))
    },
    assets: uniqueAssets([stage.asset, platform.asset, ...(tool ? [tool.asset] : []), ...icons.map(icon => icon.asset)])
  }
}
