/**
 * `content-report-formats` (deck SEO/AEO, TASK-1949): «¿Cómo te llega? Como la necesites.». La edición mensual de Efeonce
 * Insights como informe VIVO en interfaz blanca (coherente con las demás UI del deck): cabecera con la píldora «En vivo»,
 * tres KPIs con su variación, la curva de seis meses contra el promedio del sector, el ranking de quién aparece en las
 * respuestas y la lectura del mes escrita por la IA. Del informe bajan haces de luz a los cinco formatos en que llega;
 * uno va destacado.
 *
 * El CONTENIDO llega en el intent con los nombres del catálogo de recetas: `reportLabel`, `kpis` ×3 (`label`, `value`,
 * `delta`), `trendTitle`, `rankingTitle`, `ranking` ×4 (`name`, `share` 0–100; la primera es la marca del cliente y la
 * barra más larga), `reading`, `formats` ×5 (`icon`: mail · web-mobile · presentation · pdf · deck; `title`, `detail`) y
 * `highlightedFormat` (1–5). La píldora «En vivo», la leyenda de la curva y el rótulo «La lectura del mes» los pone la
 * plantilla. Las cifras son de maqueta y la lámina no promete un formato que no esté vivo.
 */

import { contentOf, iconAsset, voiceSlots } from '../../shared'
import { SurfacePieceError } from '../../types'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { css, layerAsset } from '../kit'
import { indexIn, req, uniqueAssets } from '../line-stage/kit'
import { productMarkSlot, recipeProductMarkPlacement } from '../product-mark'

import { fanBeamsSvg, listOf, sv360Frame, sv360Layers, sv360Stage, type FanBeams } from './kit'

/** TODO AXIS TASK-1949: `content-report-formats.stage` y `.beams` (medidos en `native/Insights-Llega.html`). */
const STAGE = sv360Stage(1310, 400)

const BEAMS: FanBeams = {
  fromPx: [1310, 690],
  toYPx: 780,
  toXPx: [952, 1131, 1310, 1489, 1668],
  bendYPx: 730,
  color: 'halo',
  opacity: [0.85, 0],
  strokePx: 2.5,
  glow: { strokePx: 8, opacity: 0.45, blurPx: 4 }
}

/**
 * El ícono de cada formato del catálogo, como glifo Trazo de AXIS en reposo a 40 px: el catálogo nunca dibuja un ícono.
 * TODO AXIS TASK-1949: la lámina aprobada los dibujó a mano en el acento suave; con Trazo van en la tinta del glifo.
 */
const FORMAT_GLYPHS: Record<string, string> = {
  mail: 'correo',
  'web-mobile': 'web',
  presentation: 'presentacion',
  pdf: 'contrato',
  deck: 'informe'
}

const FORMAT_ICON_PX = 40

type Obj = Record<string, unknown>

export const contentReportFormats: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)

  if (!content.body) throw new SurfacePieceError('La lámina del informe lleva su bajada (`body`).', 'invalid-intent')

  const ranking = listOf<Obj>(intent.ranking, 4, 'Las filas del ranking (`ranking`)').map((row, i) => {
    const share = row.share

    if (typeof share !== 'number' || !Number.isInteger(share) || share < 0 || share > 100) {
      throw new SurfacePieceError(`La participación de la fila ${i + 1} (\`ranking[${i}].share\`) es un porcentaje entero de 0 a 100.`, 'invalid-intent')
    }

    return { name: req(row.name, `La fila ${i + 1} del ranking (\`ranking[${i}].name\`)`), share }
  })

  const top = ranking[0]!.share

  if (top === 0 || ranking.some(row => row.share > top)) throw new SurfacePieceError('La primera fila del ranking es la marca del cliente y lleva la barra más larga.', 'invalid-intent')

  const formats = listOf<Obj>(intent.formats, 5, 'Los formatos (`formats`)')
  const highlighted = indexIn(intent.highlightedFormat, formats.length, 'El formato destacado (`highlightedFormat`)')

  const icons = formats.map((format, i) => {
    const glyph = FORMAT_GLYPHS[String(format.icon)]

    if (!glyph) throw new SurfacePieceError(`El ícono del formato ${i + 1} (\`formats[${i}].icon\`) es uno de ${Object.keys(FORMAT_GLYPHS).join(' · ')}.`, 'invalid-intent')

    return iconAsset(glyph, line, FORMAT_ICON_PX, req(format.title, `El formato ${i + 1} (\`formats[${i}].title\`)`))
  })

  const { stage } = sv360Layers(manifest, line, 'srf', STAGE)
  const beams = layerAsset('srf-beams', fanBeamsSvg(manifest, BEAMS, line, 'srf'))
  const mark = productMarkSlot(intent.productMark, recipeProductMarkPlacement(recipe))

  const frame = sv360Frame(manifest, recipe, line, [
    'bg', 'soft', 'muted', 'halo', 'tealDark', 'shadow', 'cardTo', 'miniFrom', 'miniHeroFrom', 'heroCardTo',
    'docTo', 'docInk', 'docMuted', 'docPanel', 'docBar', 'docDash', 'docNote'
  ])

  return {
    contentType: 'deck.content-report-formats',
    slots: {
      frame,
      stage: { src: stage.ref },
      beams: { src: beams.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      report: {
        label: req(intent.reportLabel, 'La cabecera del informe (`reportLabel`)'),
        trendTitle: req(intent.trendTitle, 'El título de la curva (`trendTitle`)'),
        rankingTitle: req(intent.rankingTitle, 'El título del ranking (`rankingTitle`)'),
        reading: req(intent.reading, 'La lectura del mes (`reading`)')
      },
      kpis: listOf<Obj>(intent.kpis, 3, 'Los KPIs del informe (`kpis`)').map((kpi, i) => ({
        label: req(kpi.label, `El KPI ${i + 1} (\`kpis[${i}].label\`)`),
        value: req(kpi.value, `La cifra del KPI ${i + 1} (\`kpis[${i}].value\`)`),
        delta: req(kpi.delta, `La variación del KPI ${i + 1} (\`kpis[${i}].delta\`)`)
      })),
      ranking: ranking.map((row, i) => ({
        name: row.name,
        share: `${row.share}%`,
        bar: css('srf-bar', (row.share / top) * 100, '%'),
        role: i === 0 ? 'lead' : 'rest'
      })),
      formats: formats.map((format, i) => ({
        icon: icons[i]!.ref,
        title: req(format.title, `El formato ${i + 1} (\`formats[${i}].title\`)`),
        detail: req(format.detail, `El formato ${i + 1} (\`formats[${i}].detail\`)`),
        role: i + 1 === highlighted ? 'lead' : 'rest'
      })),
      ...(mark ? { productMark: mark.slot } : {})
    },
    assets: uniqueAssets([stage.asset, beams.asset, ...icons.map(icon => icon.asset), ...(mark ? [mark.asset] : [])])
  }
}
