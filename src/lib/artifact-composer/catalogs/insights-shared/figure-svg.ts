/**
 * Geometría de las figuras premium de Insights (TASK-1889 Slice 4): columnas agrupadas y líneas.
 *
 * Son funciones PURAS que devuelven el marcado SVG de la figura a partir del dato del slot; el hook de
 * la plantilla (`figure-hooks.ts`) sólo lo inserta. Ninguna medida sale de la mano de un autor: el alto
 * de una columna y el punto de una línea se calculan de la MISMA cifra impresa que se lee al lado
 * (`parsePrintedNumber`), así figura y etiqueta no pueden decir cosas distintas. Una cifra ilegible
 * falla cerrado: una figura con un hueco inventado es fabricación gráfica.
 *
 * El color no vive acá: el SVG sólo lleva clases (`fig-*`) y cada catálogo las pinta con sus roles del
 * brand pack (`report-editorial.css`, `deck-editorial.css`). Así la geometría es una sola para el
 * informe A4 y la lámina 16:9, y ningún HEX entra por código.
 */

import { parsePrintedNumber } from '../../bar-figure'

export class FigureDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FigureDataError'
  }
}

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Coordenada con un decimal, sin ceros de relleno: el SVG del canvas escribe `179.8`, no `179.80`. */
const n = (value: number): string => String(Math.round(value * 10) / 10)

/**
 * Eje «redondo» de cero a un tope que contiene el máximo: el paso más fino de {1, 2, 2,5, 5}·10ᵏ que
 * deja a lo más `maxIntervals` intervalos. 29 → tope 30, paso 10 (el canvas). Las barras nacen en cero.
 */
export const niceAxis = (max: number, maxIntervals = 4): { top: number; step: number } => {
  if (!(max > 0)) return { top: 1, step: 1 }

  const magnitude = 10 ** Math.floor(Math.log10(max / maxIntervals))

  for (const base of [1, 2, 2.5, 5, 10, 20]) {
    const step = base * magnitude

    if (Math.ceil(max / step) <= maxIntervals) return { top: Math.ceil(max / step) * step, step }
  }

  return { top: max, step: max }
}

/**
 * Corta una etiqueta en a lo más tres líneas por palabra para el ancho del grupo (≈ 0,56 em por carácter en
 * Geist). Una palabra que no cabe ni sola en una línea, o un texto que no cabe en tres, falla cerrado: el SVG
 * no se desborda ni recorta en silencio.
 */
export const wrapLabel = (text: string, width: number, fontSize: number): string[] => {
  const perLine = Math.max(4, Math.floor(width / (fontSize * 0.56)))
  const lines: string[] = []
  let line = ''

  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.length > perLine) throw new FigureDataError(`La etiqueta «${text}» tiene una palabra que no cabe en su grupo.`)

    const next = line ? `${line} ${word}` : word

    if (next.length <= perLine) line = next
    else {
      lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)

  if (lines.length > 3) throw new FigureDataError(`La etiqueta «${text}» no cabe en tres líneas de su grupo.`)

  return lines
}

const tickLabel = (value: number): string => (Number.isInteger(value) ? String(value) : String(value).replace('.', ','))

// ─── Columnas agrupadas ─────────────────────────────────────────────────────────────────────────────

export interface ColumnGroupInput {
  label: string
  /** Cifra impresa del período (la misma que se lee sobre la columna). */
  current: string
  /** Cifra impresa del período anterior; sin ella, el grupo es una sola columna. */
  prior?: string
  /** Variación impresa bajo el grupo («+3», «−2»), con su dirección. */
  delta?: string
  direction?: 'up' | 'down' | 'flat'
  /** Mejor o peor según la dirección de la métrica; sin él se lee como el canvas (subir = mejor). */
  tone?: 'better' | 'worse' | 'neutral'
}

export interface ColumnBandInput {
  /** Primer y último grupo (base 0) de la franja resaltada. */
  from: number
  to: number
  label: string
}

export interface ColumnOpportunityInput {
  group: number
  label: string
}

export interface ColumnsBox {
  width: number
  height: number
  plotLeft: number
  plotTop: number
  plotBottom: number
  tickX: number
  barWidth: number
  barGap: number
  dimensionY: number
  deltaY: number
  /** Cuerpo de la cifra del período / del anterior / de la dimensión / de la variación / de los rótulos. */
  fonts: { current: number; prior: number; dimension: number; delta: number; tick: number; label: number }
  /** Ajustes ópticos del lienzo: cuánto sobresale la franja, dónde van rótulos, marcas y cifras. */
  optics: {
    display?: { width: number; height: number }
    bandPad: number
    bandLabelDy: number
    tickDy: number
    valueGap: number
    opportunity: { dotDx: number; dotDy: number; dotR: number; labelDx: number; labelDy: number }
  }
}

/** Caja del informe A4 (canvas `Premium-Agrupadas`). */
export const REPORT_COLUMNS_BOX: ColumnsBox = {
  width: 658,
  height: 296,
  plotLeft: 44,
  plotTop: 16,
  plotBottom: 250,
  tickX: 34,
  barWidth: 46,
  barGap: 8,
  dimensionY: 270,
  deltaY: 289,
  fonts: { current: 13, prior: 11, dimension: 12, delta: 11, tick: 10, label: 9 },
  optics: { bandPad: 4, bandLabelDy: 12, tickDy: 3, valueGap: 7, opportunity: { dotDx: 15.2, dotDy: 13, dotR: 3.5, labelDx: 23.2, labelDy: 16.2 } }
}

/** Caja de la lámina 16:9 (canvas `Deck-Agrupadas`): mismo eje, cuerpos mayores para proyectar. */
export const DECK_COLUMNS_BOX: ColumnsBox = {
  ...REPORT_COLUMNS_BOX,
  dimensionY: 272,
  deltaY: 292,
  fonts: { current: 15, prior: 12.5, dimension: 13.5, delta: 12, tick: 11.5, label: 10 },
  optics: {
    display: { width: 660, height: 297 },
    bandPad: 0,
    bandLabelDy: 13,
    tickDy: 4,
    valueGap: 8,
    opportunity: { dotDx: 15.2, dotDy: 12, dotR: 4, labelDx: 24.2, labelDy: 16 }
  }
}

const printed = (value: string | undefined, where: string): number => {
  const parsed = parsePrintedNumber(value)

  if (parsed === null) throw new FigureDataError(`${where}: «${value ?? ''}» no es una cifra legible; la columna no se dibuja inventada.`)

  if (parsed < 0) throw new FigureDataError(`${where}: una columna nace en cero y no admite «${value}».`)

  return parsed
}

export const groupedColumnsSvg = (
  groups: readonly ColumnGroupInput[],
  box: ColumnsBox,
  options: { band?: ColumnBandInput | null; opportunity?: ColumnOpportunityInput | null; ariaLabel: string }
): string => {
  if (groups.length < 2) throw new FigureDataError('Columnas agrupadas: una figura necesita al menos dos grupos.')

  const paired = groups.some(group => group.prior !== undefined)

  if (paired && groups.some(group => group.prior === undefined)) {
    throw new FigureDataError('Columnas agrupadas: o todos los grupos traen el período anterior o ninguno.')
  }

  const values = groups.flatMap((group, index) => [
    printed(group.current, `grupo ${index + 1}`),
    ...(paired ? [printed(group.prior, `grupo ${index + 1} (anterior)`)] : [])
  ])

  const { top, step } = niceAxis(Math.max(...values))
  const plotHeight = box.plotBottom - box.plotTop
  const slot = (box.width - box.plotLeft) / groups.length
  const center = (index: number) => box.plotLeft + slot * (index + 0.5)
  const y = (value: number) => box.plotBottom - (value / top) * plotHeight
  const pairWidth = paired ? box.barWidth * 2 + box.barGap : box.barWidth
  const out: string[] = []
  const labelLines = groups.map(group => wrapLabel(group.label, slot - 8, box.fonts.dimension))
  const lineHeight = Math.round(box.fonts.dimension * 1.25)
  // Cada línea extra de etiqueta hace crecer la figura: nada se monta sobre la variación.
  const extra = (Math.max(...labelLines.map(lines => lines.length)) - 1) * lineHeight
  const height = box.height + extra

  const display = box.optics.display ?? { width: box.width, height: box.height }

  out.push(`<svg class="fig-columns" width="${display.width}" height="${display.height + extra}" viewBox="0 0 ${box.width} ${height}" role="img" aria-label="${esc(options.ariaLabel)}">`)

  if (options.band) {
    const { from, to, label } = options.band

    if (!(from >= 0 && to >= from && to < groups.length)) throw new FigureDataError('Columnas agrupadas: la franja resaltada apunta fuera de los grupos.')

    const x1 = box.plotLeft + slot * from
    const x2 = box.plotLeft + slot * (to + 1)

    out.push(`<rect class="fig-band" x="${n(x1)}" y="${n(box.plotTop - 4)}" width="${n(x2 - x1)}" height="${n(plotHeight + 4 + box.optics.bandPad)}"></rect>`)
    out.push(`<text class="fig-band-label" x="${n(x1 + 8)}" y="${n(box.plotTop + box.optics.bandLabelDy)}" font-size="${box.fonts.label}">${esc(label.toUpperCase())}</text>`)
  }

  const ticks: string[] = []

  for (let value = top; value >= 0; value -= step) {
    const ty = y(value)

    if (value > 0) ticks.push(`<line class="fig-grid" x1="${box.plotLeft}" x2="${box.width}" y1="${n(ty)}" y2="${n(ty)}"></line>`)
    ticks.push(`<text class="fig-tick" x="${box.tickX}" y="${n(ty + box.optics.tickDy)}" font-size="${box.fonts.tick}">${tickLabel(value)}</text>`)
  }

  out.push(`<g text-anchor="end">${ticks.join('')}</g>`)

  if (options.opportunity) {
    const { group, label } = options.opportunity

    if (!(group >= 0 && group < groups.length)) throw new FigureDataError('Columnas agrupadas: la oportunidad apunta fuera de los grupos.')

    const c = center(group)
    const half = pairWidth / 2 + 8

    out.push(`<rect class="fig-opportunity" x="${n(c - half)}" y="${n(box.plotTop + 24)}" width="${n(half * 2)}" height="${n(plotHeight - 24)}" rx="6"></rect>`)
    const o = box.optics.opportunity

    out.push(`<circle class="fig-opportunity-dot" cx="${n(c - half + o.dotDx)}" cy="${n(box.plotTop + o.dotDy)}" r="${o.dotR}"></circle>`)
    out.push(`<text class="fig-band-label fig-opportunity-label" x="${n(c - half + o.labelDx)}" y="${n(box.plotTop + o.labelDy)}" font-size="${box.fonts.label}">${esc(label.toUpperCase())}</text>`)
  }

  const labels: string[] = []

  groups.forEach((group, index) => {
    const c = center(index)

    const bars = paired
      ? [
          { value: values[index * 2]!, x: c - pairWidth / 2, cls: 'fig-current', text: group.current, font: box.fonts.current },
          { value: values[index * 2 + 1]!, x: c - pairWidth / 2 + box.barWidth + box.barGap, cls: 'fig-prior', text: group.prior!, font: box.fonts.prior }
        ]
      : [{ value: values[index]!, x: c - box.barWidth / 2, cls: 'fig-current', text: group.current, font: box.fonts.current }]

    for (const bar of bars) {
      const barTop = y(bar.value)

      out.push(`<rect class="${bar.cls}" x="${n(bar.x)}" y="${n(barTop)}" width="${box.barWidth}" height="${n(box.plotBottom - barTop)}" rx="3"></rect>`)
      labels.push(`<text class="${bar.cls}-value" x="${n(bar.x + box.barWidth / 2)}" y="${n(barTop - box.optics.valueGap)}" font-size="${bar.font}">${esc(bar.text)}</text>`)
    }

    const lines = labelLines[index]!

    labels.push(
      `<text class="fig-dimension" x="${n(c)}" y="${box.dimensionY}" font-size="${box.fonts.dimension}">` +
        lines.map((line, k) => (k === 0 ? esc(line) : `<tspan x="${n(c)}" dy="${lineHeight}">${esc(line)}</tspan>`)).join('') +
        '</text>'
    )

    if (group.delta) {
      const mark = group.direction === 'up' ? '▲ ' : group.direction === 'down' ? '▼ ' : ''

      const better = group.tone ? group.tone === 'better' : group.direction === 'up'

      labels.push(`<text class="fig-delta${better ? '' : ' fig-delta--plain'}" x="${n(c)}" y="${box.deltaY + extra}" font-size="${box.fonts.delta}">${mark}${esc(group.delta)}</text>`)
    }
  })

  out.push(`<line class="fig-baseline" x1="${box.plotLeft}" x2="${box.width}" y1="${box.plotBottom}" y2="${box.plotBottom}"></line>`)
  out.push(`<g text-anchor="middle">${labels.join('')}</g>`)
  out.push('</svg>')

  return out.join('')
}

// ─── Líneas ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * Rol de una serie, distinguible en escala de grises (canvas `Premium-Lineas`): `primary` = trazo grueso
 * con punto final; `reference` = discontinua (el período anterior, otra dimensión); `detail` = trazo fino
 * translúcido (el dato diario bajo la media). A lo más una de cada rol por figura.
 */
export type LineRole = 'primary' | 'reference' | 'detail'

export interface LineSeriesInput {
  label: string
  role: LineRole
  /** Cifra impresa de cada punto del eje X; `null` = sin dato (un hueco, nunca cero). */
  values: Array<string | null>
  /** Cifra al final de la línea («46»); sólo `primary` y `reference`. */
  endLabel?: string
}

export interface LineAnnotationsInput {
  /** Franja resaltada sobre puntos del eje X (base 0, inclusive). */
  band?: { from: number; to: number; label: string } | null
  /** Rótulo del primer punto de la línea principal («37»). */
  startLabel?: string | null
  /** Diferencia al cierre entre la principal y la referencia («+10 por día»). */
  endDelta?: string | null
  /** Sombrea el área entre la principal y la referencia donde ambas tienen dato. */
  fillBetween?: boolean
}

export interface LinesBox {
  width: number
  height: number
  plotLeft: number
  plotRight: number
  plotTop: number
  plotBottom: number
  tickX: number
  xLabelY: number
  fonts: { tick: number; label: number; endPrimary: number; endReference: number; delta: number; start: number }
  /**
   * Ajustes ópticos del lienzo. `area`: `between` sombrea entre principal y referencia (A4);
   * `under` degrada la principal hasta la base (lámina proyectada, más contraste sobre navy).
   */
  optics: {
    display?: { width: number; height: number }
    bandLabelDy: number
    tickDy: number
    area: 'between' | 'under'
    radii: { halo: number; end: number; start: number }
    endDx: number
    endPrimaryDy: number
    endReferenceDy: number
    startDy: number
  }
}

/** Caja del informe A4 (canvas `Premium-Lineas`). */
export const REPORT_LINES_BOX: LinesBox = {
  width: 658,
  height: 262,
  plotLeft: 36,
  plotRight: 612,
  plotTop: 12,
  plotBottom: 236,
  tickX: 28,
  xLabelY: 254,
  fonts: { tick: 10, label: 9, endPrimary: 14, endReference: 12, delta: 10, start: 11 },
  optics: { bandLabelDy: 16, tickDy: 3, area: 'between', radii: { halo: 10, end: 4, start: 3.2 }, endDx: 8, endPrimaryDy: 4.2, endReferenceDy: 3.9, startDy: 11.3 }
}

/** Caja de la lámina 16:9 (canvas `Deck-Lineas`): mismo eje, trazos y cifras mayores. */
export const DECK_LINES_BOX: LinesBox = {
  ...REPORT_LINES_BOX,
  xLabelY: 256,
  fonts: { tick: 11.5, label: 10, endPrimary: 18, endReference: 14, delta: 12, start: 13 },
  optics: {
    display: { width: 660, height: 263 },
    bandLabelDy: 17,
    tickDy: 4,
    area: 'under',
    radii: { halo: 12, end: 5, start: 4 },
    endDx: 12,
    endPrimaryDy: 5.2,
    endReferenceDy: 4.9,
    startDy: 12.3
  }
}

type Point = { i: number; x: number; y: number }

export const lineChartSvg = (
  series: readonly LineSeriesInput[],
  xLabels: ReadonlyArray<{ index: number; label: string }>,
  box: LinesBox,
  annotations: LineAnnotationsInput & { ariaLabel: string }
): string => {
  if (series.length === 0 || series.length > 3) throw new FigureDataError('Líneas: una figura lleva de una a tres series.')

  const roles = series.map(s => s.role)

  if (new Set(roles).size !== roles.length) throw new FigureDataError('Líneas: dos series con el mismo rol no se distinguen en gris.')

  const count = series[0]!.values.length

  if (count < 2 || series.some(s => s.values.length !== count)) throw new FigureDataError('Líneas: todas las series alinean sus puntos con el mismo eje X.')

  const parsed = series.map(s =>
    s.values.map((raw, index) => {
      if (raw === null) return null

      const value = parsePrintedNumber(raw)

      if (value === null) throw new FigureDataError(`Líneas: «${raw}» (${s.label}, punto ${index + 1}) no es una cifra legible.`)

      return value
    })
  )

  const all = parsed.flat().filter((v): v is number => v !== null)

  if (all.some(v => v < 0)) throw new FigureDataError('Líneas: el eje nace en cero y no admite valores negativos.')

  const { top, step } = niceAxis(Math.max(...all), 3)
  const plotHeight = box.plotBottom - box.plotTop
  const x = (i: number) => box.plotLeft + ((box.plotRight - box.plotLeft) * i) / (count - 1)
  const y = (v: number) => box.plotBottom - (v / top) * plotHeight
  const pts = parsed.map(values => values.flatMap((v, i): Point[] => (v === null ? [] : [{ i, x: x(i), y: y(v) }])))
  const f = (value: number) => value.toFixed(1)

  const pathOf = (points: Point[]): string => {
    // Un hueco corta la línea: cada tramo continuo es un subcamino (nunca se une a través del hueco).
    const parts: string[] = []

    points.forEach((p, k) => {
      const joined = k > 0 && points[k - 1]!.i === p.i - 1

      parts.push(`${joined ? 'L' : 'M'} ${f(p.x)} ${f(p.y)}`)
    })

    return parts.join(' ')
  }

  const byRole = (role: LineRole) => {
    const index = series.findIndex(s => s.role === role)

    return index < 0 ? null : { spec: series[index]!, points: pts[index]! }
  }

  const primary = byRole('primary')
  const reference = byRole('reference')
  const detail = byRole('detail')
  const out: string[] = []

  const o = box.optics
  const display = o.display ?? { width: box.width, height: box.height }

  out.push(`<svg class="fig-lines" width="${display.width}" height="${display.height}" viewBox="0 0 ${box.width} ${box.height}" role="img" aria-label="${esc(annotations.ariaLabel)}">`)

  if (o.area === 'under' && annotations.fillBetween) {
    out.push('<defs><linearGradient id="figAreaUnder" x1="0" y1="0" x2="0" y2="1"><stop class="fig-area-stop" offset="0" stop-opacity="0.3"></stop><stop class="fig-area-stop" offset="1" stop-opacity="0"></stop></linearGradient></defs>')
  }

  if (annotations.band) {
    const { from, to, label } = annotations.band

    if (!(from >= 0 && to > from && to < count)) throw new FigureDataError('Líneas: la franja resaltada apunta fuera del eje.')

    out.push(`<rect class="fig-band" x="${n(x(from))}" y="${box.plotTop}" width="${n(x(to) - x(from))}" height="${plotHeight}"></rect>`)
    out.push(`<text class="fig-band-label" x="${n(x(from) + 8)}" y="${box.plotTop + o.bandLabelDy}" font-size="${box.fonts.label}">${esc(label.toUpperCase())}</text>`)
  }

  const ticks: string[] = []

  for (let value = top; value >= 0; value -= step) {
    const ty = y(value)

    if (value > 0) ticks.push(`<line class="fig-grid" x1="${box.plotLeft}" x2="${box.plotRight}" y1="${n(ty)}" y2="${n(ty)}"></line>`)
    ticks.push(`<text class="fig-tick" x="${box.tickX}" y="${n(ty + o.tickDy)}" font-size="${box.fonts.tick}">${tickLabel(value)}</text>`)
  }

  out.push(`<g text-anchor="end">${ticks.join('')}</g>`)

  if (annotations.fillBetween && o.area === 'under' && primary && primary.points.length >= 2) {
    const first = primary.points[0]!
    const last = primary.points.at(-1)!

    out.push(`<path class="fig-area fig-area--under" d="${pathOf(primary.points)} L ${n(last.x)} ${box.plotBottom} L ${n(first.x)} ${box.plotBottom} Z"></path>`)
  }

  if (annotations.fillBetween && o.area === 'between' && primary && reference) {
    const shared = primary.points.filter(p => reference.points.some(r => r.i === p.i))
    const back = [...shared].reverse().map(p => reference.points.find(r => r.i === p.i)!)

    if (shared.length >= 2) {
      out.push(`<path class="fig-area" d="${[...shared, ...back].map((p, k) => `${k === 0 ? 'M' : 'L'} ${f(p.x)} ${f(p.y)}`).join(' ')} Z"></path>`)
    }
  }

  if (detail) out.push(`<path class="fig-line fig-line--detail" d="${pathOf(detail.points)}"></path>`)

  if (reference) out.push(`<path class="fig-line fig-line--reference" d="${pathOf(reference.points)}"></path>`)

  const primaryEnd = primary?.points.at(-1)
  const primaryStart = primary?.points[0]

  if (primary && primaryEnd) {
    out.push(`<circle class="fig-halo" cx="${n(primaryEnd.x)}" cy="${n(primaryEnd.y)}" r="${o.radii.halo}"></circle>`)
    out.push(`<path class="fig-line fig-line--primary" d="${pathOf(primary.points)}"></path>`)
    out.push(`<circle class="fig-end-dot" cx="${n(primaryEnd.x)}" cy="${n(primaryEnd.y)}" r="${o.radii.end}"></circle>`)

    if (annotations.startLabel && primaryStart) {
      out.push(`<circle class="fig-start-dot" cx="${n(primaryStart.x)}" cy="${n(primaryStart.y)}" r="${o.radii.start}"></circle>`)
    }
  }

  out.push(`<line class="fig-baseline" x1="${box.plotLeft}" x2="${box.plotRight}" y1="${box.plotBottom}" y2="${box.plotBottom}"></line>`)

  const labels: string[] = []
  const referenceEnd = reference?.points.at(-1)

  if (primary?.spec.endLabel && primaryEnd) {
    labels.push(`<text class="fig-end fig-end--primary" x="${n(primaryEnd.x + o.endDx)}" y="${n(primaryEnd.y + o.endPrimaryDy)}" font-size="${box.fonts.endPrimary}">${esc(primary.spec.endLabel)}</text>`)
  }

  if (reference?.spec.endLabel && referenceEnd) {
    labels.push(`<text class="fig-end fig-end--reference" x="${n(referenceEnd.x + o.endDx)}" y="${n(referenceEnd.y + o.endReferenceDy)}" font-size="${box.fonts.endReference}">${esc(reference.spec.endLabel)}</text>`)
  }

  if (annotations.endDelta && primaryEnd && referenceEnd) {
    labels.push(`<text class="fig-end-delta" x="${n(primaryEnd.x - 24)}" y="${n((primaryEnd.y + referenceEnd.y) / 2 + 6)}" text-anchor="end" font-size="${box.fonts.delta}">${esc(annotations.endDelta)}</text>`)
  }

  if (annotations.startLabel && primaryStart) {
    labels.push(`<text class="fig-start" x="${n(primaryStart.x)}" y="${n(primaryStart.y - o.startDy)}" text-anchor="middle" font-size="${box.fonts.start}">${esc(annotations.startLabel)}</text>`)
  }

  const xs = xLabels.map(label => {
    if (!(label.index >= 0 && label.index < count)) throw new FigureDataError('Líneas: una etiqueta del eje X apunta fuera del eje.')

    return `<text x="${n(x(label.index))}" y="${box.xLabelY}">${esc(label.label)}</text>`
  })

  out.push(`<g class="fig-labels">${labels.join('')}<g class="fig-xlabels" font-size="${box.fonts.tick}" text-anchor="middle">${xs.join('')}</g></g>`)
  out.push('</svg>')

  return out.join('')
}
