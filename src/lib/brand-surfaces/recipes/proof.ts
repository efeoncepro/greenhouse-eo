/**
 * Builders de la familia PRUEBA del deck (TASK-1928): `content-focus` (el foco sobre la prueba), `content-clients` (los
 * clientes y su muro de logos), `content-partners` (los programas oficiales), `decision-risk` (cada riesgo con su
 * cobertura), `decision-case` (el caso de éxito), `decision-chart` (el gráfico), `decision-testimonial` (la cita del
 * cliente) y `decision-why-us` (el muro de cifras).
 *
 * Todo lo que pintan sale de AXIS: la voz, de las reservas y tipos del manifest; la geometría de tablas, grillas,
 * barras y columnas, de los tokens de la receta. Las CIFRAS llegan por `figures` del contrato (valor, rótulo y fuente
 * obligatoria) y la lámina imprime su fuente; una barra sale de su número. Los logos de terceros se normalizan al
 * componer (un tono, el mismo peso óptico) con la excepción tonal declarada en AXIS. El CONTENIDO propio de cada
 * lámina (las filas del riesgo, los logos, las barras, la cita) llega en el intent y lo validan este builder y el
 * contrato de slots.
 */

import { spotlightRecipe } from '@efeoncepro/axis-graphic-line'
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { resolveGraphicLineIntent } from '@efeoncepro/axis-ui-contracts'

import type { SurfaceAssetRequest } from '../types'
import { SurfacePieceError } from '../types'
import { contentOf, plateAsset, plateFrom, photoOf, reserve, selectionSlot, voiceSlots, type SurfaceManifest } from '../shared'

import { progressIndicatorLayer, type RecipeBuilder } from './deck'
import { colorVar, css, fixedPx, layerAsset, measured, n, paletteColor, svgOpen, text, topOf, typeOf, type TypeToken } from './kit'

/* ── piezas comunes ─────────────────────────────────────────────────────────────────────────────────────── */

type RecipeType = TypeToken & { color?: string; insetPx?: number; family?: string; fromChars?: number }

/** Un tipo del token de la receta (no todos llegan al manifest: los propios de la lámina se leen de la receta). */
const recipeType = (recipe: Record<string, unknown>, key: string): RecipeType =>
  measured((recipe.type as Record<string, RecipeType> | undefined)?.[key], `la tipografía «${key}» de la receta`)

const px = (type: RecipeType, what: string): number => fixedPx(type, what)

type Figure = { value: string; label: string; source: string }

/** Las cifras del contrato: exactamente las que la lámina tiene lugar para mostrar, cada una con su fuente. */
const figuresOf = (manifest: SurfaceManifest, count: number, what: string): Figure[] => {
  const figures = contentOf(manifest).figures ?? []

  if (figures.length !== count) throw new SurfacePieceError(`${what} lleva ${count} cifra${count === 1 ? '' : 's'} con su fuente (\`figures\`).`, 'invalid-intent')

  return figures
}

/** La línea de la fuente: las fuentes distintas de las cifras, en orden, una sola vez. */
const sourceLine = (figures: Figure[]): string => `Fuente: ${[...new Set(figures.map(figure => figure.source.trim()))].join(' · ')}`

/** El ítem que toma la selección (1 = el primero), validado contra los que tiene la lámina. */
const selectedOf = (intent: Record<string, unknown>, count: number, what: string): number => {
  const index = Number(intent.selected)

  if (!Number.isInteger(index) || index < 1 || index > count) throw new SurfacePieceError(`${what} (\`selected\`) va de 1 a ${count}.`, 'invalid-intent')

  return index
}

/** La selección sobre un ítem de la lámina: el delegado de AXIS más el ítem que marca el hook del catálogo. */
const itemSelection = (manifest: SurfaceManifest, item: number): Record<string, unknown> | null => {
  const selection = selectionSlot(manifest)

  return selection ? { ...selection, item } : null
}

const margin = (manifest: SurfaceManifest): number => measured(manifest.safeArea?.marginPx, 'el margen del deck')

/** La voz fija (eyebrow, pregunta y respuesta donde las midió AXIS): lo común a todas las láminas de la familia. */
const voiceFrame = (manifest: SurfaceManifest) => ({
  margin: margin(manifest),
  eyebrowTop: topOf(manifest, 'eyebrow'),
  questionTop: topOf(manifest, 'question'),
  answerTop: topOf(manifest, 'answer'),
  answerPx: fixedPx(typeOf(manifest, 'answer'), 'la respuesta')
})

const bodyFrame = (manifest: SurfaceManifest) => {
  const body = typeOf(manifest, 'body')

  return { bodyTop: topOf(manifest, 'body'), bodyPx: fixedPx(body, 'la bajada'), bodyWidth: measured(body.maxWidthPx as number | undefined, 'el ancho de la bajada') }
}

/** El interlineado y el tracking de la respuesta, cuando la receta los mide distinto del estándar. */
const answerStyle = (recipe: Record<string, unknown>, prefix: string) => {
  const answer = recipeType(recipe, 'answer')

  return {
    answerLeading: css(`${prefix}-answer-leading`, measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
    answerTracking: css(`${prefix}-answer-tracking`, Number.parseFloat(measured(answer.tracking, 'el tracking de la respuesta')), 'em')
  }
}

/** La fuente al pie (reserva `source`: dónde y de qué tamaño). */
const sourceFrame = (manifest: SurfaceManifest, recipe: Record<string, unknown>, prefix: string) => {
  const source = measured(reserve(manifest, 'source'), 'la reserva de la fuente')

  return {
    sourceLeft: css(`${prefix}-source-left`, source.inset !== undefined ? Math.round(source.inset * manifest.canvas.width) : margin(manifest)),
    sourceTop: css(`${prefix}-source-top`, topOf(manifest, 'source')),
    sourcePx: css(`${prefix}-source-px`, px(recipeType(recipe, 'source'), 'la fuente'))
  }
}

/* ── logos de terceros ──────────────────────────────────────────────────────────────────────────────────── */

type LogoTokens = {
  tone: string
  inkArea: number
  maxWidthPx: number
  maxHeightPx: number
  knockout?: boolean
  tonal?: Record<string, Record<string, string | number>>
  tonalBox?: { scaleMax: number; maxWidthPx: number; maxHeightPx: number }
}

type LogoIntent = { path?: unknown; alt?: unknown }

/** Un tinte del color: cada canal se acerca al blanco en la proporción `p`. */
const tint = (hex: string, p: number): string =>
  `#${[0, 2, 4]
    .map(i => Number.parseInt(hex.replace('#', '').slice(i, i + 2), 16))
    .map(channel => Math.round(channel + (255 - channel) * p).toString(16).padStart(2, '0'))
    .join('')}`

/**
 * Un logo de tercero normalizado (un tono, el mismo peso óptico): el archivo lo entrega el intent, el tono y el peso
 * los mide AXIS. La excepción tonal (el color principal en el tono, el secundario en un tinte) es de AXIS, por logo.
 */
const logoAsset = (logo: LogoIntent | undefined, tokens: LogoTokens, what: string): { slot: { src: string; alt: string }; asset: SurfaceAssetRequest } => {
  const file = text(logo?.path, `El archivo de ${what} (\`path\`)`)
  const alt = text(logo?.alt, `El nombre de ${what} (\`alt\`)`)
  const id = file.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')
  const ref = `asset-ref:file:${id}`
  const tone = paletteColor(tokens.tone, `el tono de ${what}`)
  const tonal = tokens.tonal?.[id]

  const recolor = tonal
    ? Object.fromEntries(Object.entries(tonal).map(([from, to]) => [from, typeof to === 'number' ? tint(tone, to) : paletteColor(to, `la excepción tonal de ${what}`)]))
    : undefined

  const box = tonal ? measured(tokens.tonalBox, `la caja de la excepción tonal de ${what}`) : undefined

  const asset: SurfaceAssetRequest = {
    ref,
    kind: 'logo',
    path: file,
    tone,
    inkArea: tokens.inkArea,
    maxWidth: tokens.maxWidthPx,
    maxHeight: tokens.maxHeightPx,
    ...(tokens.knockout ? { knockout: true } : {}),
    ...(recolor ? { recolor, recolorBox: { scaleMax: box!.scaleMax, maxWidth: box!.maxWidthPx, maxHeight: box!.maxHeightPx } } : {})
  }

  return { slot: { src: ref, alt }, asset }
}

/** La caja máxima del logo como custom properties: el normalizado ya cabe; la plantilla nunca deja crecer otro. */
const logoBox = (tokens: LogoTokens, prefix: string) => {
  const box = tokens.tonalBox
  const width = Math.max(tokens.maxWidthPx, box?.maxWidthPx ?? 0)
  const height = Math.max(tokens.maxHeightPx, box?.maxHeightPx ?? 0)

  return { logoMaxWidth: css(`${prefix}-logo-max-width`, width), logoMaxHeight: css(`${prefix}-logo-max-height`, height) }
}

const figureSlots = (figures: Figure[]) => figures.map(figure => ({ value: figure.value, label: figure.label }))

/* ── content-focus: el foco sobre la prueba ─────────────────────────────────────────────────────────────── */

type SpotlightElement = {
  outside: { grayscale: number; brightness: number; multiplyColor: string; multiplyOpacity: number }
  inside: { brightness: number; contrast: number }
  edge: { softStart: number }
}

type SpotlightPiece = { light: { cx: number; cy: number; r: number } }

/**
 * El foco de AXIS en dos capas: la foto en penumbra con su luz (la plantilla la pinta en CSS con los valores que
 * resolvió el contrato: gris, brillo, multiplicación, y el círculo de luz con su borde suave) y la órbita del foco
 * (anillo, arco y esfera), pintada por el motor de la línea gráfica como capa transparente.
 */
export const contentFocus: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const voice = voiceSlots(manifest)
  const [figure] = figuresOf(manifest, 1, '`content-focus`')
  const piece = measured((efeonceGraphicLine as unknown as { pieces: { spotlight: Record<string, SpotlightPiece> } }).pieces.spotlight.photo, 'el foco de la foto')
  const photo = plateAsset(manifest, { width, height })

  const resolved = resolveGraphicLineIntent({
    canvas: { width, height, line: intent.line as never, surface: 'dark', channel: 'screen' },
    elements: [{ kind: 'spotlight', id: 'foco', photoId: 'p', alt: photo.alt, subjectRegion: 'center' }]
  } as never) as unknown as { elements: SpotlightElement[] }

  const spot = measured(resolved.elements[0], 'el foco')
  const orbit = layerAsset(`content-focus-orbit-${intent.line}`, spotlightOrbitSvg(manifest, intent.line))
  const eyebrow = recipeType(recipe, 'eyebrow')
  const question = recipeType(recipe, 'question')
  const answer = recipeType(recipe, 'answer')
  const figureType = recipeType(recipe, 'figure')
  const label = recipeType(recipe, 'figureLabel')
  const source = recipeType(recipe, 'source')

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest),
        eyebrowPx: css('cf-eyebrow-px', px(eyebrow, 'el eyebrow')),
        eyebrowColor: colorVar('cf-eyebrow', paletteColor(measured(eyebrow.color, 'el color del eyebrow'), 'el eyebrow')),
        questionWidth: css('cf-question-width', measured(question.maxWidthPx, 'el ancho de la pregunta')),
        questionLeading: css('cf-question-leading', measured(question.lineHeight, 'el interlineado de la pregunta'), ''),
        answerLeading: css('cf-answer-leading', measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
        answerTracking: css('cf-answer-tracking', Number.parseFloat(measured(answer.tracking, 'el tracking de la respuesta')), 'em'),
        answerInset: css('cf-answer-inset', measured(answer.insetPx, 'el corrimiento óptico de la respuesta')),
        figureTop: css('cf-figure-top', topOf(manifest, 'figure')),
        figurePx: css('cf-figure-px', px(figureType, 'la cifra')),
        figureTracking: css('cf-figure-tracking', Number.parseFloat(measured(figureType.tracking, 'el tracking de la cifra')), 'em'),
        labelTop: css('cf-label-top', topOf(manifest, 'figureLabel')),
        labelPx: css('cf-label-px', px(label, 'el rótulo de la cifra')),
        labelWidth: css('cf-label-width', measured(label.maxWidthPx, 'el ancho del rótulo')),
        labelInset: css('cf-label-inset', measured(label.insetPx, 'el corrimiento del rótulo')),
        sourceTop: css('cf-source-top', topOf(manifest, 'source')),
        sourcePx: css('cf-source-px', px(source, 'la fuente')),
        sourceColor: colorVar('cf-source', paletteColor(measured(source.color, 'el color de la fuente'), 'la fuente')),
        outGray: css('cf-out-gray', spot.outside.grayscale, ''),
        outBright: css('cf-out-bright', spot.outside.brightness, ''),
        veilColor: colorVar('cf-veil', paletteColor(spot.outside.multiplyColor, 'la penumbra del foco')),
        veilOpacity: css('cf-veil-opacity', spot.outside.multiplyOpacity * 100, '%'),
        inBright: css('cf-in-bright', spot.inside.brightness, ''),
        inContrast: css('cf-in-contrast', spot.inside.contrast, ''),
        lightX: css('cf-light-x', piece.light.cx),
        lightY: css('cf-light-y', piece.light.cy),
        lightR: css('cf-light-r', piece.light.r),
        lightSoft: css('cf-light-soft', spot.edge.softStart * 100, '%')
      },
      photo: { src: photo.ref, alt: photo.alt },
      light: { src: photo.ref },
      orbit: { src: orbit.ref },
      voice,
      figure: { value: figure!.value, label: figure!.label },
      source: `Fuente: ${figure!.source}`
    },
    assets: [photo.asset, orbit.asset]
  }
}

/**
 * La órbita del foco (anillo con su aire, lámpara y esfera) sin la foto: la pinta el motor de la línea gráfica
 * (`spotlightRecipe`) y se toma sólo su grupo `spotlight-orbit`; la foto y su luz las pinta la plantilla.
 */
const spotlightOrbitSvg = (manifest: SurfaceManifest, line: string): string => {
  const painted = spotlightRecipe('photo', { photoId: 'p', photoSrc: 'about:blank', alt: 'foco', answer: 'foco', proof: 'foco', line: line as never, idPrefix: 'cf' })
  const orbit = /<g data-axis-part="spotlight-orbit">[\s\S]*?<\/g>/.exec(painted.svg)?.[0]

  if (!orbit) throw new SurfacePieceError('AXIS no pintó la órbita del foco.', 'surface-issues')

  return svgOpen(manifest) + orbit + '</svg>'
}

/* ── content-clients: los clientes y su muro de logos ───────────────────────────────────────────────────── */

type GridTokens = { columns: number; rows: number; xPx: number; yPx: number; cellWidthPx: number; cellHeightPx: number; ruleStrokePx: number }

export const contentClients: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const grid = measured(recipe.grid as GridTokens | undefined, 'la grilla de logos')
  const logos = measured(recipe.logos as LogoTokens | undefined, 'los logos de clientes')
  const stats = measured(recipe.stats as { xPx: number[] } | undefined, 'las cifras de clientes')
  const voice = voiceSlots(manifest)
  const figures = figuresOf(manifest, stats.xPx.length, '`content-clients`')
  const clients = (Array.isArray(intent.clients) ? intent.clients : []) as LogoIntent[]
  const cells = grid.columns * grid.rows

  // La última celda dice dónde operamos: los logos llenan las demás.
  if (clients.length !== cells - 1) throw new SurfacePieceError(`El muro lleva ${cells - 1} logos de clientes (\`clients\`).`, 'invalid-intent')

  const normalized = clients.map((client, i) => logoAsset(client, logos, `el logo del cliente ${i + 1}`))
  const markets = (intent.markets ?? {}) as { title?: unknown; text?: unknown }
  const stat = recipeType(recipe, 'stat')
  const statLabel = recipeType(recipe, 'statLabel')
  const marketsType = recipeType(recipe, 'markets')
  const marketsText = recipeType(recipe, 'marketsText')
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-cc')
  const question = recipeType(recipe, 'question')
  const selection = itemSelection(manifest, selectedOf(intent, figures.length, 'La cifra seleccionada'))

  const frame: Record<string, unknown> = {
    line: intent.line,
    ...voiceFrame(manifest),
    ...sourceFrame(manifest, recipe, 'cc'),
    questionWidth: css('cc-question-width', measured(question.maxWidthPx, 'el ancho de la pregunta')),
    statsTop: css('cc-stats-top', topOf(manifest, 'stats')),
    statPx: css('cc-stat-px', px(stat, 'la cifra')),
    statWght: css('cc-stat-wght', measured(stat.weight, 'el peso de la cifra'), ''),
    statLeading: css('cc-stat-leading', measured(stat.lineHeight, 'el interlineado de la cifra'), ''),
    statTracking: css('cc-stat-tracking', Number.parseFloat(measured(stat.tracking, 'el tracking de la cifra')), 'em'),
    statLabelPx: css('cc-stat-label-px', px(statLabel, 'el rótulo de la cifra')),
    statLabelGap: css('cc-stat-label-gap', measured(statLabel.gapPx, 'el aire del rótulo')),
    statLabelInset: css('cc-stat-label-inset', measured(statLabel.insetPx, 'el corrimiento del rótulo')),
    statLabelWidth: css('cc-stat-label-width', measured(statLabel.maxWidthPx, 'el ancho del rótulo')),
    gridLeft: css('cc-grid-left', grid.xPx),
    gridTop: css('cc-grid-top', grid.yPx),
    cellWidth: css('cc-cell-width', grid.cellWidthPx),
    cellHeight: css('cc-cell-height', grid.cellHeightPx),
    ruleStroke: css('cc-rule', grid.ruleStrokePx),
    marketsPx: css('cc-markets-px', px(marketsType, 'el título de los mercados')),
    marketsTextPx: css('cc-markets-text-px', px(marketsText, 'los mercados')),
    marketsGap: css('cc-markets-gap', measured(marketsText.gapPx, 'el aire de los mercados')),
    marketsInset: css('cc-markets-inset', measured(marketsText.insetPx, 'el sangrado de los mercados')),
    ...logoBox(logos, 'cc')
  }

  stats.xPx.forEach((x, i) => {
    frame[`stat${i + 1}Left`] = css(`cc-stat${i + 1}-left`, x)
  })

  return {
    slots: {
      frame,
      indicator: { src: indicator.ref },
      voice,
      stats: figureSlots(figures),
      clients: normalized.map(logo => logo.slot),
      markets: { title: text(markets.title, 'El título de los mercados (`markets.title`)'), text: text(markets.text, 'Los mercados (`markets.text`)') },
      source: sourceLine(figures),
      ...(selection ? { selection } : {})
    },
    assets: [indicator.asset, ...normalized.map(logo => logo.asset)]
  }
}

/* ── content-partners: los programas oficiales ──────────────────────────────────────────────────────────── */

type PartnerRow = { topPx: number; widthPx: number; count: number }

export const contentPartners: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const rows = measured(recipe.rows as PartnerRow[] | undefined, 'las filas de partners')
  const logos = measured(recipe.logos as LogoTokens | undefined, 'los logos de partners')
  const seal = measured(recipe.seal as { logoHeightPx: number; dividerPx: [number, number] } | undefined, 'el sello de partner')
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const partners = (Array.isArray(intent.partners) ? intent.partners : []) as LogoIntent[]
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de los partners va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('Los partners llevan su bajada (`body`).', 'invalid-intent')
  if (partners.length !== total) throw new SurfacePieceError(`Los partners son ${total} (\`partners\`).`, 'invalid-intent')

  const normalized = partners.map((partner, i) => logoAsset(partner, logos, `el logo del partner ${i + 1}`))
  const body = typeOf(manifest, 'body')
  const sealType = recipeType(recipe, 'seal')
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-cpt')
  const bodyReserve = measured(reserve(manifest, 'body'), 'la reserva de la bajada')
  const selection = itemSelection(manifest, selectedOf(intent, total, 'El partner seleccionado'))
  const question = recipeType(recipe, 'question')

  const frame: Record<string, unknown> = {
    line: intent.line,
    ...voiceFrame(manifest),
    ...answerStyle(recipe, 'cpt'),
    answerInset: css('cpt-answer-inset', measured(recipeType(recipe, 'answer').insetPx, 'el corrimiento óptico de la respuesta')),
    questionWidth: css('cpt-question-width', measured(question.maxWidthPx, 'el ancho de la pregunta')),
    bodyTop: topOf(manifest, 'body'),
    bodyPx: fixedPx(body, 'la bajada'),
    bodyWidth: measured(body.maxWidthPx as number | undefined, 'el ancho de la bajada'),
    bodyRight: css('cpt-body-right', Math.round(measured(bodyReserve.inset, 'el borde de la bajada') * manifest.canvas.width)),
    sealTop: css('cpt-seal-top', topOf(manifest, 'seal')),
    sealLogo: css('cpt-seal-logo', seal.logoHeightPx),
    sealGap: css('cpt-seal-gap', measured(sealType.gapPx, 'el aire del sello')),
    sealPx: css('cpt-seal-px', px(sealType, 'el sello')),
    dividerWidth: css('cpt-divider-width', seal.dividerPx[0]),
    dividerHeight: css('cpt-divider-height', seal.dividerPx[1]),
    ruleTop: css('cpt-rule-top', topOf(manifest, 'rule')),
    ruleStroke: css('cpt-rule', measured(recipe.ruleStrokePx as number | undefined, 'el filete de los partners')),
    ruleWidth: css('cpt-rule-width', Math.max(...rows.map(row => row.widthPx))),
    rowHeight: css('cpt-row-height', measured(recipe.rowHeightPx as number | undefined, 'el alto de las filas')),
    ...logoBox(logos, 'cpt')
  }

  rows.forEach((row, i) => {
    frame[`row${i + 1}Top`] = css(`cpt-row${i + 1}-top`, row.topPx)
    frame[`row${i + 1}Width`] = css(`cpt-row${i + 1}-width`, row.widthPx)
  })

  const slots: Record<string, unknown> = {
    frame,
    indicator: { src: indicator.ref },
    voice,
    body: content.body,
    seal: text(intent.seal, 'El sello de partner (`seal`, p. ej. «Partner oficial de»)'),
    ...(selection ? { selection } : {})
  }

  let from = 0

  rows.forEach((row, i) => {
    slots[`row${i + 1}`] = normalized.slice(from, from + row.count).map(logo => logo.slot)
    from += row.count
  })

  return { slots, assets: [indicator.asset, ...normalized.map(logo => logo.asset)] }
}

/* ── decision-risk: cada riesgo con su cobertura ────────────────────────────────────────────────────────── */

type TableTokens = { rows: number; xPx: number; topPx: number; rowHeightPx: number; rowGapPx: number; widthPx: number; riskWidthPx: number; columnGapPx: number; ruleStrokePx: number; paddingTopPx: number; secondColumnPx: number }

type RiskIntent = { risk?: unknown; name?: unknown; how?: unknown }

export const decisionRisk: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const table = measured(recipe.table as TableTokens | undefined, 'la tabla de riesgos')
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const risks = (Array.isArray(intent.risks) ? intent.risks : []) as RiskIntent[]

  if (!content.body) throw new SurfacePieceError('Los riesgos llevan su bajada (`body`).', 'invalid-intent')
  if (risks.length !== table.rows) throw new SurfacePieceError(`La tabla lleva ${table.rows} riesgos (\`risks\`).`, 'invalid-intent')

  const headers = (intent.headers ?? {}) as { risk?: unknown; how?: unknown }
  const risk = recipeType(recipe, 'risk')
  const name = recipeType(recipe, 'name')
  const how = recipeType(recipe, 'how')
  const header = recipeType(recipe, 'header')
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-dr')
  const selection = itemSelection(manifest, selectedOf(intent, table.rows, 'El riesgo seleccionado'))

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest),
        ...bodyFrame(manifest),
        headersTop: css('dr-headers-top', topOf(manifest, 'headers')),
        headerPx: css('dr-header-px', px(header, 'los encabezados')),
        secondColumn: css('dr-second-column', table.secondColumnPx),
        tableLeft: css('dr-table-left', table.xPx),
        tableTop: css('dr-table-top', table.topPx),
        tableWidth: css('dr-table-width', table.widthPx),
        rowHeight: css('dr-row-height', table.rowHeightPx - table.rowGapPx),
        rowGap: css('dr-row-gap', table.rowGapPx),
        riskWidth: css('dr-risk-width', table.riskWidthPx),
        columnGap: css('dr-column-gap', table.columnGapPx),
        ruleStroke: css('dr-rule', table.ruleStrokePx),
        rowPadTop: css('dr-row-pad-top', table.paddingTopPx),
        riskPx: css('dr-risk-px', px(risk, 'el riesgo')),
        namePx: css('dr-name-px', px(name, 'la cobertura')),
        nameTracking: css('dr-name-tracking', Number.parseFloat(measured(name.tracking, 'el tracking de la cobertura')), 'em'),
        howPx: css('dr-how-px', px(how, 'el cómo')),
        howGap: css('dr-how-gap', measured(how.gapPx, 'el aire del cómo'))
      },
      indicator: { src: indicator.ref },
      voice,
      body: content.body,
      headers: { risk: text(headers.risk, 'El encabezado del riesgo (`headers.risk`)'), how: text(headers.how, 'El encabezado de la cobertura (`headers.how`)') },
      risks: risks.map((row, i) => ({
        risk: text(row.risk, `El riesgo ${i + 1}`),
        name: text(row.name, `La cobertura del riesgo ${i + 1}`),
        how: text(row.how, `Cómo se cubre el riesgo ${i + 1}`)
      })),
      ...(selection ? { selection } : {})
    },
    assets: [indicator.asset]
  }
}

/* ── decision-case: el caso de éxito ────────────────────────────────────────────────────────────────────── */

type PanelTokens = { side: string; share: number; cornerRadiusPx: number; photoFromPx: number }

type FigureGridTokens = { columns: number; widthPx: number; rowGapPx: number; columnGapPx: number; ruleStrokePx: number; paddingTopPx: number }

export const decisionCase: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const panel = measured(recipe.panel as PanelTokens | undefined, 'el panel del caso')
  const grid = measured(recipe.figureGrid as FigureGridTokens | undefined, 'la grilla de cifras del caso')
  const max = measured((recipe.figures as { max?: number } | undefined)?.max, 'las cifras del caso')
  const logoTokens = measured(recipe.clientLogo as (LogoTokens & { gapPx: number }) | undefined, 'el logo del cliente')
  const voice = voiceSlots(manifest)
  const figures = figuresOf(manifest, max, '`decision-case`')

  if (voice.answerLead) throw new SurfacePieceError('La respuesta del caso va en una línea.', 'invalid-intent')

  const photo = plateFrom(photoOf(manifest), { width: width - panel.photoFromPx, height }, 'La foto del caso')
  const logo = logoAsset(intent.clientLogo as LogoIntent | undefined, logoTokens, 'el logo del cliente')
  const figure = recipeType(recipe, 'figure')
  const label = recipeType(recipe, 'figureLabel')
  const source = recipeType(recipe, 'source')
  const selection = itemSelection(manifest, selectedOf(intent, figures.length, 'La cifra seleccionada'))

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest),
        panelWidth: css('dc-panel-width', Math.round(panel.share * width)),
        panelRadius: css('dc-panel-radius', panel.cornerRadiusPx),
        photoLeft: css('dc-photo-left', panel.photoFromPx),
        logoGap: css('dc-logo-gap', logoTokens.gapPx),
        ...logoBox(logoTokens, 'dc'),
        figuresTop: css('dc-figures-top', topOf(manifest, 'figures')),
        figuresWidth: css('dc-figures-width', grid.widthPx),
        figuresRowGap: css('dc-figures-row-gap', grid.rowGapPx),
        figuresColumnGap: css('dc-figures-column-gap', grid.columnGapPx),
        figureRule: css('dc-figure-rule', grid.ruleStrokePx),
        figurePadTop: css('dc-figure-pad-top', grid.paddingTopPx),
        figurePx: css('dc-figure-px', px(figure, 'la cifra')),
        figureWght: css('dc-figure-wght', measured(figure.weight, 'el peso de la cifra'), ''),
        figureLeading: css('dc-figure-leading', measured(figure.lineHeight, 'el interlineado de la cifra'), ''),
        figureTracking: css('dc-figure-tracking', Number.parseFloat(measured(figure.tracking, 'el tracking de la cifra')), 'em'),
        labelPx: css('dc-label-px', px(label, 'el rótulo de la cifra')),
        labelGap: css('dc-label-gap', measured(label.gapPx, 'el aire del rótulo')),
        sourceTop: css('dc-source-top', topOf(manifest, 'source')),
        sourcePx: css('dc-source-px', px(source, 'la fuente')),
        sourceWidth: css('dc-source-width', measured(source.maxWidthPx, 'el ancho de la fuente'))
      },
      photo: { src: photo.ref, alt: photo.alt },
      voice,
      clientLogo: logo.slot,
      figures: figureSlots(figures),
      source: sourceLine(figures),
      ...(selection ? { selection } : {})
    },
    assets: [photo.asset, logo.asset]
  }
}

/* ── decision-chart: el gráfico ─────────────────────────────────────────────────────────────────────────── */

type ChartTokens = {
  xPx: number
  yPx: number
  maxWidthPx: number
  barHeightPx: number
  stepPx: number
  radiusPx: number
  valueInsetPx: number
  before: string
  after: string
  leader: { widthPx: number; strokePx: number; gapPx: number; labelGapPx: number }
  noteBelowPx: number
}

type BarIntent = { label?: unknown; value?: unknown }

export const decisionChart: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const chart = measured(recipe.chart as ChartTokens | undefined, 'el gráfico')
  const kpis = measured(recipe.kpis as { widthPx: number; ruleStrokePx: number; paddingTopPx: number } | undefined, 'las cifras del gráfico')
  const max = measured((recipe.figures as { max?: number } | undefined)?.max, 'las cifras del gráfico')
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const figures = figuresOf(manifest, max, '`decision-chart`')
  const bars = (Array.isArray(intent.bars) ? intent.bars : []) as BarIntent[]

  if (voice.answerLead) throw new SurfacePieceError('La respuesta del gráfico va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('El gráfico lleva su bajada (`body`).', 'invalid-intent')
  if (bars.length !== 2) throw new SurfacePieceError('El gráfico compara dos barras: antes y después (`bars`).', 'invalid-intent')

  // Una barra sale de su número (índice: el antes = 100): nunca se dibuja a mano.
  const values = bars.map((bar, i) => {
    const value = Number(bar.value)

    if (!Number.isFinite(value) || value <= 0 || value > 100) throw new SurfacePieceError(`La barra ${i + 1} va en índice, de 1 a 100 (\`bars[${i}].value\`).`, 'invalid-intent')

    return value
  })

  const barLabel = recipeType(recipe, 'barLabel')
  const barValue = recipeType(recipe, 'barValue')
  const annotation = recipeType(recipe, 'annotation')
  const note = recipeType(recipe, 'note')
  const kpi = recipeType(recipe, 'kpi')
  const kpiLabel = recipeType(recipe, 'kpiLabel')
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-dch')
  const selection = itemSelection(manifest, selectedOf(intent, bars.length, 'La barra seleccionada'))

  const frame: Record<string, unknown> = {
    line: intent.line,
    ...voiceFrame(manifest),
    ...bodyFrame(manifest),
    ...sourceFrame(manifest, recipe, 'dch'),
    chartLeft: css('dch-chart-left', chart.xPx),
    chartTop: css('dch-chart-top', chart.yPx),
    barHeight: css('dch-bar-height', chart.barHeightPx),
    barStep: css('dch-bar-step', chart.stepPx),
    barRadius: css('dch-bar-radius', chart.radiusPx),
    valueInset: css('dch-value-inset', chart.valueInsetPx),
    beforeColor: colorVar('dch-before', paletteColor(chart.before, 'la barra del antes')),
    afterColor: colorVar('dch-after', paletteColor(chart.after, 'la barra del después')),
    barLabelPx: css('dch-bar-label-px', px(barLabel, 'el rótulo de la barra')),
    barLabelGap: css('dch-bar-label-gap', measured(barLabel.gapPx, 'el aire del rótulo de la barra')),
    barValuePx: css('dch-bar-value-px', px(barValue, 'el valor de la barra')),
    barValueWght: css('dch-bar-value-wght', measured(barValue.weight, 'el peso del valor'), ''),
    annotationPx: css('dch-annotation-px', px(annotation, 'la anotación')),
    annotationLeft: css('dch-annotation-left', chart.xPx + (chart.maxWidthPx * values[1]!) / 100 + chart.leader.gapPx),
    leaderWidth: css('dch-leader-width', chart.leader.widthPx),
    leaderStroke: css('dch-leader-stroke', chart.leader.strokePx),
    leaderGap: css('dch-leader-gap', chart.leader.labelGapPx),
    noteTop: css('dch-note-top', chart.yPx + chart.noteBelowPx),
    notePx: css('dch-note-px', px(note, 'la nota del gráfico')),
    kpisTop: css('dch-kpis-top', topOf(manifest, 'kpis')),
    kpisWidth: css('dch-kpis-width', kpis.widthPx),
    kpisRule: css('dch-kpis-rule', kpis.ruleStrokePx),
    kpiPadTop: css('dch-kpi-pad-top', kpis.paddingTopPx),
    kpiPx: css('dch-kpi-px', px(kpi, 'la cifra')),
    kpiWght: css('dch-kpi-wght', measured(kpi.weight, 'el peso de la cifra'), ''),
    kpiLabelPx: css('dch-kpi-label-px', px(kpiLabel, 'el rótulo de la cifra')),
    kpiLabelGap: css('dch-kpi-label-gap', measured(kpiLabel.gapPx, 'el aire del rótulo'))
  }

  values.forEach((value, i) => {
    frame[`bar${i + 1}Width`] = css(`dch-bar${i + 1}-width`, (chart.maxWidthPx * value) / 100)
  })

  return {
    slots: {
      frame,
      indicator: { src: indicator.ref },
      voice,
      body: content.body,
      bars: bars.map((bar, i) => ({ label: text(bar.label, `El rótulo de la barra ${i + 1}`), value: String(values[i]) })),
      annotation: text(intent.annotation, 'La anotación del gráfico (`annotation`, p. ej. «−25 %»)'),
      note: text(intent.chartNote, 'La nota del gráfico (`chartNote`: qué mide y en qué unidad)'),
      kpis: figureSlots(figures),
      source: sourceLine(figures),
      ...(selection ? { selection } : {})
    },
    assets: [indicator.asset]
  }
}

/* ── decision-testimonial: la cita del cliente ──────────────────────────────────────────────────────────── */

type GlowTokens = { cxPx: number; cyPx: number; rPx: number; color: string; opacity: number }

/** El resplandor detrás de la cita: un radial del halo que se apaga hacia afuera. */
const glowSvg = (manifest: SurfaceManifest, glow: GlowTokens): string => {
  const { width, height } = manifest.canvas
  const color = paletteColor(glow.color, 'el resplandor')

  return (
    svgOpen(manifest) +
    `<defs><radialGradient id="dt-glow" cx="${n(glow.cxPx)}" cy="${n(glow.cyPx)}" r="${n(glow.rPx)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${color}" stop-opacity="${n(glow.opacity)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#dt-glow)"/>` +
    '</svg>'
  )
}

export const decisionTestimonial: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const glow = measured(recipe.glow as GlowTokens | undefined, 'el resplandor del testimonio')
  const proof = measured(recipe.proof as { widthPx: number; paddingPx: number; ruleStrokePx: number } | undefined, 'la prueba del testimonio')
  const max = measured((recipe.figures as { max?: number } | undefined)?.max, 'las cifras del testimonio')
  const logoTokens = measured(recipe.clientLogo as (LogoTokens & { gapPx: number; dividerPx: [number, number] }) | undefined, 'el logo del cliente')
  const voice = voiceSlots(manifest)
  const figures = figuresOf(manifest, max, '`decision-testimonial`')
  const author = (intent.author ?? {}) as { name?: unknown; role?: unknown }
  const logo = logoAsset(intent.clientLogo as LogoIntent | undefined, logoTokens, 'el logo del cliente')
  const layer = layerAsset('decision-testimonial-glow', glowSvg(manifest, glow))
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-dt')
  const mark = recipeType(recipe, 'quoteMark')
  const answer = recipeType(recipe, 'answer')
  const quote = recipeType(recipe, 'quote')
  const nameType = recipeType(recipe, 'name')
  const role = recipeType(recipe, 'role')
  const proofType = recipeType(recipe, 'proof')
  const proofLabel = recipeType(recipe, 'proofLabel')
  const source = recipeType(recipe, 'source')
  const proofReserve = measured(reserve(manifest, 'proof'), 'la reserva de la prueba')
  const selection = selectionSlot(manifest)

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest),
        ...answerStyle(recipe, 'dt'),
        answerWidth: css('dt-answer-width', measured(answer.maxWidthPx, 'el ancho de la frase')),
        markTop: css('dt-mark-top', topOf(manifest, 'quoteMark')),
        markPx: css('dt-mark-px', px(mark, 'la comilla')),
        markInset: css('dt-mark-inset', measured(mark.insetPx, 'el corrimiento de la comilla')),
        quoteTop: css('dt-quote-top', topOf(manifest, 'quote')),
        quotePx: css('dt-quote-px', px(quote, 'la cita')),
        quoteWidth: css('dt-quote-width', measured(quote.maxWidthPx, 'el ancho de la cita')),
        signatureTop: css('dt-signature-top', topOf(manifest, 'signature')),
        signatureGap: css('dt-signature-gap', logoTokens.gapPx),
        ...logoBox(logoTokens, 'dt'),
        dividerWidth: css('dt-divider-width', logoTokens.dividerPx[0]),
        dividerHeight: css('dt-divider-height', logoTokens.dividerPx[1]),
        namePx: css('dt-name-px', px(nameType, 'el nombre')),
        rolePx: css('dt-role-px', px(role, 'el cargo')),
        roleGap: css('dt-role-gap', measured(role.gapPx, 'el aire del cargo')),
        proofLeft: css('dt-proof-left', Math.round(measured(proofReserve.inset, 'el inicio de la prueba') * manifest.canvas.width)),
        proofTop: css('dt-proof-top', topOf(manifest, 'proof')),
        proofWidth: css('dt-proof-width', proof.widthPx),
        proofPad: css('dt-proof-pad', proof.paddingPx),
        proofRule: css('dt-proof-rule', proof.ruleStrokePx),
        proofPx: css('dt-proof-px', px(proofType, 'la cifra')),
        proofTracking: css('dt-proof-tracking', Number.parseFloat(measured(proofType.tracking, 'el tracking de la cifra')), 'em'),
        proofLabelPx: css('dt-proof-label-px', px(proofLabel, 'el rótulo de la cifra')),
        proofLabelGap: css('dt-proof-label-gap', measured(proofLabel.gapPx, 'el aire del rótulo')),
        sourcePx: css('dt-source-px', px(source, 'la fuente')),
        sourceGap: css('dt-source-gap', measured(source.gapPx, 'el aire de la fuente'))
      },
      glow: { src: layer.ref },
      indicator: { src: indicator.ref },
      voice,
      quote: text(intent.quote, 'La cita textual del cliente (`quote`)'),
      clientLogo: logo.slot,
      author: { name: text(author.name, 'El nombre de quien firma (`author.name`)'), role: text(author.role, 'El cargo o equipo de quien firma (`author.role`)') },
      proof: figureSlots(figures),
      source: sourceLine(figures),
      ...(selection ? { selection } : {})
    },
    assets: [layer.asset, indicator.asset, logo.asset]
  }
}

/* ── decision-why-us: el muro de cifras ─────────────────────────────────────────────────────────────────── */

type WhyGridTokens = { columns: number; rows: number; xPx: number; topPx: number; columnStepPx: number; rowStepPx: number; widthPx: number; ruleStrokePx: number; paddingTopPx: number }

export const decisionWhyUs: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const grid = measured(recipe.grid as WhyGridTokens | undefined, 'el muro de cifras')
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const figures = figuresOf(manifest, grid.columns * grid.rows, '`decision-why-us`')

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de por qué elegirnos va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('Por qué elegirnos lleva su bajada (`body`).', 'invalid-intent')

  const figure = recipeType(recipe, 'figure')
  const secondary = recipeType(recipe, 'figureSecondary')
  const label = recipeType(recipe, 'figureLabel')
  const fromChars = measured(secondary.fromChars, 'desde cuántos caracteres baja la cifra')
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-dw')
  const selection = itemSelection(manifest, selectedOf(intent, figures.length, 'La cifra seleccionada'))

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest),
        ...bodyFrame(manifest),
        ...sourceFrame(manifest, recipe, 'dw'),
        gridLeft: css('dw-grid-left', grid.xPx),
        gridTop: css('dw-grid-top', grid.topPx),
        cellWidth: css('dw-cell-width', grid.widthPx),
        columnGap: css('dw-column-gap', grid.columnStepPx - grid.widthPx),
        rowStep: css('dw-row-step', grid.rowStepPx),
        ruleStroke: css('dw-rule', grid.ruleStrokePx),
        cellPadTop: css('dw-cell-pad-top', grid.paddingTopPx),
        figurePx: css('dw-figure-px', px(figure, 'la cifra')),
        figureSecondaryPx: css('dw-figure-secondary-px', px(secondary, 'la cifra larga')),
        figureWght: css('dw-figure-wght', measured(figure.weight, 'el peso de la cifra'), ''),
        figureTracking: css('dw-figure-tracking', Number.parseFloat(measured(figure.tracking, 'el tracking de la cifra')), 'em'),
        labelPx: css('dw-label-px', px(label, 'el rótulo de la cifra')),
        labelGap: css('dw-label-gap', measured(label.gapPx, 'el aire del rótulo'))
      },
      indicator: { src: indicator.ref },
      voice,
      body: content.body,
      // La caja de la cifra se reserva a su tamaño mayor: una cifra larga baja de cuerpo, no mueve su rótulo.
      facts: figures.map(fact => ({ size: [...fact.value].length >= fromChars ? 'small' : 'large', value: fact.value, label: fact.label })),
      source: sourceLine(figures),
      ...(selection ? { selection } : {})
    },
    assets: [indicator.asset]
  }
}

export const PROOF_BUILDERS: Record<string, RecipeBuilder> = {
  'content-focus': contentFocus,
  'content-clients': contentClients,
  'content-partners': contentPartners,
  'decision-risk': decisionRisk,
  'decision-case': decisionCase,
  'decision-chart': decisionChart,
  'decision-testimonial': decisionTestimonial,
  'decision-why-us': decisionWhyUs
}
