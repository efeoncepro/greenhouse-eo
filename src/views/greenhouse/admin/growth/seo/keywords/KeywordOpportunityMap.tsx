'use client'

import { useMemo } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { EChartsOption } from 'echarts'

import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { formatInteger } from '@/lib/format'
import type { KeywordOpportunity } from '@/lib/growth/seo/contracts'
import AppECharts from '@/libs/styles/AppECharts'
import { resolveChartColor } from '@/libs/styles/resolveApexColor'

import { KEYWORD_ACTION_ORDER, resolveKeywordAction, type KeywordAction } from './keyword-opportunity-action'

/**
 * TASK-1308 — el mapa de oportunidad (§10.4).
 *
 * ═══ POR QUÉ LOS EJES NO SON LOS QUE PEDÍA EL WIREFRAME ═══
 *
 * El wireframe pedía X = dificultad, Y = volumen, color = intención. **Ninguna de las tres
 * existe**: `readKeywordOpportunities` devuelve `searchVolume: null`, `difficulty: null` y
 * `market: 'unavailable'` (el enriquecimiento DataForSEO Labs es TASK-1300 y no aterrizó), y
 * el contrato no tiene campo de intención. Pintarlos habría dado un lienzo vacío o, peor,
 * datos inventados.
 *
 * Los ejes que SÍ están medidos son además los metodológicamente correctos: la skill
 * `seo-aeo` (§02, método verificado contra la API real) lista *"priorizar por volumen
 * estimado de un tercero teniendo el GSC propio, donde la demanda ya está medida"* como un
 * ERROR. Las impresiones de Search Console son demanda medida de TU SERP, con tu país, tu
 * dispositivo y tu mezcla real de queries — mejor dato que un volumen promedio de mercado.
 *
 * 🎯 Y por eso el volumen/dificultad de mercado, cuando TASK-1300 aterrice, NO serán un eje:
 * serán una COLUMNA y un FILTRO. Los ejes medidos son correctos con o sin ese dato, así que
 * el contrato de esta pantalla no se rompe cuando llegue — `searchVolume`/`difficulty` ya
 * existen como `number | null` y la tabla los pinta honestos hoy y reales mañana.
 *
 * ⚠️ CANIBALIZACIÓN ES OTRA ACCIÓN, NO OTRO COLOR. Una query con más de una página no se
 * optimiza: se consolida. Tiene su propia serie, su propia forma y su propio verbo — no un
 * chip decorativo sobre una "oportunidad" que en realidad es otro trabajo.
 */

/** Posición a la que apunta el score del reader (la que define la ganancia estimada). */
const TARGET_POSITION = 5

/** Borde de la primera plana: hasta acá es "fruta madura". */
const FIRST_PAGE_EDGE = 10

/** Rango del striking-distance que el reader ya acota. */
const AXIS_MIN_POSITION = 8
const AXIS_MAX_POSITION = 20

/** Diámetro del punto en px. Área ∝ ganancia, que es como el ojo lee el tamaño. */
const MIN_SYMBOL = 10
const MAX_SYMBOL = 42

export interface KeywordOpportunityMapProps {
  opportunities: KeywordOpportunity[]
  /** Umbral de impresiones que el reader aplicó (percentil de la propia org). */
  impressionsThreshold: number
}

interface MapPoint {
  value: [number, number]
  keyword: string
  impressions: number
  clicks: number
  gain: number
  competingPages: number
}

const KeywordOpportunityMap = ({ opportunities, impressionsThreshold }: KeywordOpportunityMapProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()
  const copy = GH_GROWTH_SEO_KEYWORDS

  const axisInk = resolveChartColor(theme.palette.text.secondary, '#6B6876')
  const gridInk = resolveChartColor(theme.palette.divider, '#DBDBDB')
  const paperInk = resolveChartColor(theme.palette.background.paper, '#FFFFFF')
  const inkPrimary = resolveChartColor(theme.palette.text.primary, '#2F2B3D')

  /**
   * Paleta + FORMA por acción. El color solo no basta (WCAG 1.4.1) y acá la distinción es
   * load-bearing: "empujar" y "consolidar" son trabajos distintos. Cada acción tiene color,
   * símbolo y etiqueta, y la tabla de abajo repite la etiqueta en texto.
   */
  const actionStyle: Record<KeywordAction, { color: string; symbol: string; label: string }> = useMemo(
    () => ({
      quickWin: {
        color: resolveChartColor(theme.palette.success.main, '#28A745'),
        symbol: 'circle',
        label: copy.action.quickWin
      },
      striking: {
        color: resolveChartColor(theme.palette.info.main, '#2F6FEB'),
        symbol: 'triangle',
        label: copy.action.striking
      },
      cannibalized: {
        color: resolveChartColor(theme.palette.warning.dark, '#B26A00'),
        symbol: 'diamond',
        label: copy.action.cannibalized
      }
    }),
    [
      theme.palette.success.main,
      theme.palette.info.main,
      theme.palette.warning.dark,
      copy.action.quickWin,
      copy.action.striking,
      copy.action.cannibalized
    ]
  )

  const maxGain = useMemo(
    () => Math.max(1, ...opportunities.map(opportunity => opportunity.estimatedClickGain)),
    [opportunities]
  )

  const grouped = useMemo(() => {
    const buckets: Record<KeywordAction, MapPoint[]> = { quickWin: [], striking: [], cannibalized: [] }

    for (const opportunity of opportunities) {
      buckets[resolveKeywordAction(opportunity)].push({
        // El eje Y es logarítmico y `0` no existe en log: un piso de 1 mantiene el punto
        // visible en vez de descartarlo en silencio (una keyword con 0 impresiones no
        // llegaría acá, pero el piso hace imposible el hueco fantasma).
        value: [opportunity.position, Math.max(1, opportunity.impressions)],
        keyword: opportunity.keyword,
        impressions: opportunity.impressions,
        clicks: opportunity.clicks,
        gain: opportunity.estimatedClickGain,
        competingPages: opportunity.competingPages
      })
    }

    return buckets
  }, [opportunities])

  const option = useMemo<EChartsOption>(() => {
    const series = KEYWORD_ACTION_ORDER.filter(action => grouped[action].length > 0).map((action, index) => {
      const style = actionStyle[action]

      return {
        name: style.label,
        type: 'scatter' as const,
        data: grouped[action],
        symbol: style.symbol,
        // Área ∝ ganancia: el ojo compara áreas, no radios. Con radio lineal una keyword
        // del doble de ganancia se vería cuatro veces más grande.
        symbolSize: (point: unknown) => {
          const gain = (point as MapPoint | undefined)?.gain ?? 0
          const ratio = Math.sqrt(Math.max(0, gain) / maxGain)

          return MIN_SYMBOL + ratio * (MAX_SYMBOL - MIN_SYMBOL)
        },
        itemStyle: { color: style.color, opacity: 0.78, borderColor: paperInk, borderWidth: 1 },
        emphasis: { focus: 'series' as const, itemStyle: { opacity: 1 } },
        // Bajo movimiento reducido el estado final se renderiza directo (WCAG 2.3.3).
        animation: !prefersReduced,
        animationDuration: 400,
        // La zona sombreada va UNA sola vez (en la primera serie): repetirla por serie
        // apilaría opacidades y el sombreado quedaría más oscuro donde hay más acciones.
        ...(index === 0
          ? {
              markArea: {
                silent: true,
                itemStyle: {
                  color: resolveChartColor(theme.palette.success.light, '#D7F0DD'),
                  opacity: 0.18
                },
                label: {
                  show: true,
                  // `insideBottom`, no `insideTop`: arriba la etiqueta se solapaba con el
                  // tick superior del eje Y (hallazgo del GVC, visible en 390px).
                  position: 'insideBottom' as const,
                  formatter: copy.map.quickWinLabel,
                  color: axisInk,
                  fontSize: 11,
                  distance: 8
                },
                data: [[{ xAxis: AXIS_MIN_POSITION }, { xAxis: FIRST_PAGE_EDGE }]]
              },
              markLine: {
                silent: true,
                symbol: 'none' as const,
                lineStyle: { color: gridInk, type: 'dashed' as const, width: 1.5 },
                label: {
                  formatter: copy.map.quickWinLabel,
                  position: 'end' as const,
                  color: axisInk,
                  fontSize: 11,
                  show: false
                },
                data: [{ xAxis: FIRST_PAGE_EDGE }]
              }
            }
          : {})
      }
    })

    return {
      grid: { left: 8, right: 24, top: 24, bottom: 48, containLabel: true },
      tooltip: {
        // `item` y no `axis`: cada punto ES una keyword distinta; un tooltip de eje
        // mostraría juntas keywords que sólo comparten la posición.
        trigger: 'item',
        backgroundColor: paperInk,
        borderColor: gridInk,
        textStyle: { color: inkPrimary, fontSize: 12 },
        formatter: (params: unknown) => {
          const point = (params as { data?: MapPoint }).data

          if (!point) return ''

          const rows = [
            `<strong>${point.keyword}</strong>`,
            `${copy.table.colPosition}: ${point.value[0].toFixed(1)}`,
            `${copy.table.colImpressions}: ${formatInteger(point.impressions)}`,
            `${copy.table.colClicks}: ${formatInteger(point.clicks)}`,
            point.gain > 0 ? copy.table.gainUnit.replace('{value}', formatInteger(point.gain)) : copy.table.noGain
          ]

          // La canibalización se nombra en el tooltip: es la diferencia entre "empujar" y
          // "consolidar", y perderla ahí haría que el punto se leyera como una más.
          if (point.competingPages > 1) {
            rows.push(copy.table.competingPages.replace('{count}', String(point.competingPages)))
          }

          return rows.join('<br/>')
        }
      },
      // Sin leyenda de ECharts: la leyenda de este chart es la de FORMA que se renderiza
      // arriba en HTML, que es la que nombra el símbolo de cada acción.
      legend: { show: false },
      xAxis: {
        type: 'value',
        name: copy.map.axisX,
        nameLocation: 'middle' as const,
        nameGap: 30,
        nameTextStyle: { color: axisInk, fontSize: 11 },
        // Rango FIJO al striking-distance que el reader acota: un auto-scale haría que la
        // frontera de la primera plana se moviera de lugar entre Spaces, y esa frontera es
        // justo la lectura que la pantalla existe para dar.
        min: AXIS_MIN_POSITION,
        max: AXIS_MAX_POSITION,
        interval: 2,
        axisLine: { lineStyle: { color: gridInk } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: gridInk, type: 'dashed' } },
        axisLabel: { color: axisInk, fontSize: 11 }
      },
      yAxis: {
        // Logarítmico: la distribución de impresiones es long-tail y en escala lineal el
        // 90% de las keywords se apilaría contra el eje, ilegible.
        type: 'log',
        logBase: 10,
        name: copy.map.axisY,
        nameLocation: 'end' as const,
        nameGap: 12,
        nameTextStyle: { color: axisInk, fontSize: 11, align: 'left' as const },
        // ⚠️ SIN `min` fijo, a propósito. Anclarlo en 1 parecía la contraparte prudente del
        // piso `Math.max(1, impressions)` de los datos, pero en un eje LOGARÍTMICO fija dos
        // décadas enteras (1→100) que ninguna oportunidad puede ocupar: el reader ya filtra
        // por un umbral de impresiones muy superior. El GVC lo mostró crudo — con Berel
        // (89–1377 impresiones) el 55% del alto del chart quedaba vacío y los 50 puntos
        // aplastados en una banda. El auto-scale de ECharts sobre datos ya acotados por el
        // umbral usa el alto completo. El piso se queda en los DATOS, que es donde protege
        // de un `log(0)`; el eje no necesita repetirlo.
        splitLine: { lineStyle: { color: gridInk, type: 'dashed' } },
        axisLabel: {
          color: axisInk,
          fontSize: 11,
          formatter: (value: number) => formatInteger(value)
        }
      },
      series
    } as EChartsOption
  }, [
    grouped,
    actionStyle,
    maxGain,
    prefersReduced,
    axisInk,
    gridInk,
    paperInk,
    inkPrimary,
    theme.palette.success.light,
    copy.map.axisX,
    copy.map.axisY,
    copy.map.quickWinLabel,
    copy.table.colPosition,
    copy.table.colImpressions,
    copy.table.colClicks,
    copy.table.competingPages,
    copy.table.gainUnit,
    copy.table.noGain
  ])

  const ariaLabel = copy.map.aria.replace('{count}', String(opportunities.length))

  return (
    <Card data-capture='seo-keywords-map'>
      <CardContent>
        <Stack spacing={4}>
          <Stack spacing={1}>
            <Typography variant='h5' component='h2'>
              {copy.map.title}
            </Typography>
            {/* La orientación de los ejes, dicha con palabras — no sólo en la geometría. */}
            <Typography variant='body2' color='text.secondary'>
              {copy.map.subtitle}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {copy.map.coverage
                .replace('{count}', String(opportunities.length))
                .replace('{threshold}', formatInteger(impressionsThreshold))}
            </Typography>
          </Stack>

          {/* Leyenda de FORMA + ACCIÓN: el color solo no sobrevive en monocromo (WCAG
              1.4.1), y acá lo que distingue no es una severidad sino QUÉ HAY QUE HACER. */}
          <Stack direction='row' spacing={4} flexWrap='wrap' useFlexGap aria-label={copy.action.label}>
            {KEYWORD_ACTION_ORDER.filter(action => grouped[action].length > 0).map(action => {
              const style = actionStyle[action]

              const hint =
                action === 'quickWin'
                  ? copy.action.quickWinHint
                  : action === 'striking'
                    ? copy.action.strikingHint
                    : copy.action.cannibalizedHint

              return (
                <Tooltip key={action} title={hint}>
                  <Stack direction='row' spacing={1.5} alignItems='center'>
                    <Box
                      aria-hidden='true'
                      sx={{
                        inlineSize: 12,
                        blockSize: 12,
                        backgroundColor: style.color,
                        // La forma del marcador, replicada en HTML: círculo, triángulo y
                        // rombo se distinguen sin color.
                        clipPath:
                          action === 'striking'
                            ? 'polygon(50% 0%, 100% 100%, 0% 100%)'
                            : action === 'cannibalized'
                              ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                              : undefined,
                        borderRadius: action === 'quickWin' ? '50%' : 0
                      }}
                    />
                    <Typography variant='caption' color='text.secondary'>
                      {style.label} · {grouped[action].length}
                    </Typography>
                  </Stack>
                </Tooltip>
              )
            })}
          </Stack>

          <Box role='img' aria-label={ariaLabel}>
            <AppECharts option={option} height={380} />
          </Box>

          <Stack spacing={0.5}>
            {/* Qué significa el tamaño: sin decirlo, la burbuja grande se lee como
                "importante" sin que nadie sepa por qué. */}
            <Typography variant='caption' color='text.secondary'>
              {copy.map.bubbleHint}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {copy.map.zoomHint}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default KeywordOpportunityMap

/** Objetivo de posición del score, expuesto para que la tabla lo nombre igual. */
export { TARGET_POSITION, FIRST_PAGE_EDGE }
