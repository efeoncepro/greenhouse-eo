/**
 * Plan del informe «Proyección del Blog SKY» (noviembre 2026) para el catálogo A4 premium.
 *
 *   python3 -I outputs/sky-blog-proyeccion-2026-11/modelo/proyeccion.py
 *   pnpm exec tsx scripts/seo/sky-blog-projection-report.ts [salida.json]
 *   pnpm report:compose <salida.json> --out <dir> --asset org-logo:sky=<logo-negativo.svg>
 *
 * Responde el pedido de Pilar Romero en el kickoff del 02-11-2026: cuándo vuelve el blog a su mejor nivel
 * en tráfico y en «repago», y cómo aporta a la conversión. Las cifras salen del modelo
 * (`outputs/sky-blog-proyeccion-2026-11/modelo/`), de GA4 (`…/ga4/`) y del valor publicitario (`…/valor/`);
 * los folios y el índice se calculan del orden de las páginas.
 */

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

import {
  EFEONCE_CONTACT,
  EFEONCE_LEGAL_NAME_FALLBACK,
  EFEONCE_OPERATING_MARKETS,
  EFEONCE_TAX_ID_FALLBACK
} from '@/config/efeonce-brand'

type Slots = Record<string, unknown>
type Page = { slideId: string; contentType: string; slots: Slots; body?: boolean }
type Row = Record<string, string>

const ROOT = path.resolve('outputs/sky-blog-proyeccion-2026-11')
const CLIENT = 'SKY Airline'
const PERIOD = 'Datos a octubre de 2026'
const EDITION = 'SEO · Proyección del Blog SKY · Noviembre 2026'
const SIGNATURE = 'Recomendación de Efeonce'

// ─── Datos ──────────────────────────────────────────────────────────────────────────────────────────────────

const readCsv = (file: string): Row[] => {
  const [header, ...lines] = fs.readFileSync(path.join(ROOT, file), 'utf8').trim().split('\n')
  const keys = header!.split(',')

  return lines.map(line => Object.fromEntries(line.split(',').map((value, i) => [keys[i]!, value])))
}

const MODEL = JSON.parse(fs.readFileSync(path.join(ROOT, 'modelo/resumen_modelo.json'), 'utf8')) as {
  R_media_2026: number
  caida_interanual_octubre_2026: number
  honorario_usd_mes: number
  usd_clp: number
  valor_por_visita_usd: [number, number]
}

const SERIE = JSON.parse(fs.readFileSync(path.join(ROOT, 'modelo/serie_ga4.json'), 'utf8')) as { sessions: number[] }
const PROJ = readCsv('modelo/proyeccion_mensual.csv')
const CLICKS = readCsv('ga4/blog_link_clicks_by_domain_monthly.csv')

const n = (key: string, mes: string) => Number(PROJ.find(row => row.mes === mes)![key])
const mid = (mes: string) => (n('estructural_bajo_visitas', mes) + n('estructural_alto_visitas', mes)) / 2

const [VPV_LOW, VPV_HIGH] = MODEL.valor_por_visita_usd
const FEE = MODEL.honorario_usd_mes

/** Miles con separador de punto: 64511 → «64.500» (redondeo a centenas para cifras estimadas). */
const est = (value: number) => (Math.round(value / 100) * 100).toLocaleString('es-CL')

/** Miles con un decimal y coma, para las figuras. */
const thousands = (value: number | null) => (value === null ? null : (value / 1000).toFixed(1).replace('.', ','))

/** Rango de valor en miles de dólares: «19–30». */
const valueRange = (visits: number) => `${Math.round((visits * VPV_LOW) / 1000)}–${Math.round((visits * VPV_HIGH) / 1000)}`

/** Rango de cobertura del honorario: «6–10». */
const coverage = (visits: number) => `${Math.round((visits * VPV_LOW) / FEE)}–${Math.round((visits * VPV_HIGH) / FEE)}`

const pct = (value: number) => `${Math.round(value * 100)}\u00a0%`

const footer = () => ({
  footerEdition: EDITION,
  footerContact: { address: EFEONCE_CONTACT.addressDisplay, phone: EFEONCE_CONTACT.phones[0].display }
})

const running = (section: string) => ({ clientName: CLIENT, runningSection: section, runningPeriod: PERIOD })

const closing = (measure: string, action: string, labels = ['Lo que significa', 'Próximo paso']) => [
  { kind: 'measure', label: labels[0], text: measure },
  { kind: 'action', label: labels[1], text: action, signature: SIGNATURE }
]

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Serie larga de la figura: ene-2025 (índice 0) a oct-2028 (índice 45).
const OBS_FROM_2025 = SERIE.sessions.slice(12) // ene-2025 … oct-2026
const LAST_OBS = OBS_FROM_2025.length - 1 // oct-2026
const LABEL_AT = (index: number) => `${MONTHS[index % 12]}-${String(25 + Math.floor(index / 12))}`
const SPAN = 46

const REF_BY_MONTH = Object.fromEntries(
  PROJ.slice(0, 12).map(row => [row.mes.split('-')[0]!, Number(row.referencia_previa_migracion)])
)

const trendSeries = () => {
  const observed: Array<number | null> = []
  const structural: Array<number | null> = []
  const reference: Array<number | null> = []

  for (let i = 0; i < SPAN; i++) {
    const mes = LABEL_AT(i)

    observed.push(i <= LAST_OBS ? OBS_FROM_2025[i]! : null)
    structural.push(i < LAST_OBS ? null : i === LAST_OBS ? OBS_FROM_2025[i]! : mid(mes))
    reference.push(REF_BY_MONTH[MONTHS[i % 12]!]!)
  }

  return {
    lineSeries: [
      { label: 'Visitas orgánicas', role: 'primary', values: observed.map(thousands), endLabel: `${Math.round(OBS_FROM_2025[LAST_OBS]! / 1000)}k` },
      { label: 'Nivel previo a la migración', role: 'reference', values: reference.map(thousands) },
      { label: 'Estructural, punto medio', role: 'detail', values: structural.map(thousands), endLabel: `${Math.round(mid('oct-28') / 1000)}k` }
    ],
    lineXLabels: Array.from({ length: SPAN }, (_, index) => ({ index, label: `${MONTHS[index % 12]} ${25 + Math.floor(index / 12)}` })).filter(
      ({ index }) => index % 4 === 0
    ),
    lineAnnotations: {
      bands: [{ from: 27, to: 34, label: 'Recupera autoridad' }],
      events: [
        { index: 9, label: 'Migración' },
        { index: 26, label: 'skyairline.com/blog' }
      ],
      pointLabels: [
        { index: 0, label: '208k' },
        { index: 12, label: '68k' },
      ]
    }
  }
}

// Clics del blog hacia skyairline.com: series válida desde noviembre 2025 (antes eran enlaces internos).
const clickRows = CLICKS.filter(row => row.month >= '2025-11' && row.coverage === 'full')
const clicksTo = (row: Row) => Number(row['clicks_to_skyairline.com']) + Number(row['clicks_to_flights.skyairline.com'])
const sessionsAll = readCsv('ga4/blog_sessions_all_channels_monthly.csv')

const per100 = (month: string) => {
  const clicks = clicksTo(CLICKS.find(row => row.month === month)!)
  const sessions = Number(sessionsAll.find(row => row.month === month)!.sessions_all_channels_dedup)

  return Math.round((100 * clicks) / sessions)
}

const PER100 = clickRows.map(row => per100(row.month))
const PER100_MIN = Math.min(...PER100)
const PER100_MAX = Math.max(...PER100)

// Personas que vieron el blog y compraron ese mismo mes (embudo cerrado de usuarios de GA4, todos los países).
const BUYERS = readCsv('ga4/conversion_funnel_blog_users_then_purchase_monthly.csv').filter(
  row => row.funnel === 'user-blog' && row.country === 'TOTAL' && row.month >= '2025-01'
)

const buyersIn = (from: string, to: string) => BUYERS.filter(row => row.month >= from && row.month <= to)

const avgBuyers = (from: string, to: string) => {
  const rows = buyersIn(from, to)

  return rows.reduce((sum, row) => sum + Number(row.users_then_purchased), 0) / rows.length
}

const round50 = (value: number) => (Math.round(value / 50) * 50).toLocaleString('es-CL')
const BUYERS_PRE = avgBuyers('2025-01', '2025-09')
const BUYERS_2026 = avgBuyers('2026-01', '2026-10')

const rateRange = (from: string, to: string) => {
  const rates = buyersIn(from, to).map(row => Number(row.blog_viewer_purchase_rate) * 100)
  const f = (v: number) => v.toFixed(1).replace('.', ',')

  return `${f(Math.min(...rates))} y ${f(Math.max(...rates))}`
}

// Compra en la misma visita al entrar por el blog, contra el sitio (octubre 2026).
const LANDING = readCsv('ga4/conversion_blog_landing_vs_site_monthly.csv').find(row => row.month === '2026-10')!
const pct1 = (value: number) => `${(value * 100).toFixed(value < 0.01 ? 2 : 1).replace('.', ',')}\u00a0%`

// ─── Páginas ────────────────────────────────────────────────────────────────────────────────────────────────

const pages: Page[] = []
const ref = (slideId: string) => `@@ref:${slideId}@@`
const add = (page: Page) => pages.push(page)

const J27 = 'ene-27'
const J28 = 'ene-28'
const JUL27 = 'jul-27'
const JUL28 = 'jul-28'

add({
  slideId: 'portada',
  contentType: 'report-cover',
  slots: {
    editionLabel: 'Proyección SEO · Noviembre 2026',
    productLabel: 'SEO',
    eyebrow: 'Lectura de Efeonce',
    reportTitle: 'Cuándo vuelve el blog a su mejor nivel',
    reportSubtitle: 'Tráfico orgánico y valor publicitario de blog.skyairline.com a 24 meses, y su aporte a la venta.',
    preparedFor: { label: 'Preparado para', logo: 'asset-ref:org-logo:sky' },
    confidentialityLine: 'Confidencial · Versión 1 · 6 de noviembre de 2026'
  }
})

add({ slideId: 'indice', contentType: 'report-index', body: true, slots: {} })

add({
  slideId: 'resumen',
  contentType: 'report-summary',
  body: true,
  slots: {
    ...running('Resumen ejecutivo'),
    eyebrow: 'Resumen ejecutivo',
    thesis: 'El blog vuelve a su nivel previo a la migración hacia fines de 2027 si regresa a skyairline.com/blog',
    thesisLead: `En 2026 cada mes recibió el ${pct(MODEL.R_media_2026)} de las visitas del mismo mes de 2025. Los arreglos técnicos y el contenido llevan enero de 2027 al nivel del año anterior; volver a la dirección de skyairline.com es lo que acerca el blog al 100\u00a0%. Sin ese cambio, el techo es la mitad.`,
    essentialsLabel: 'Lo esencial',
    essentials: [
      {
        figure: pct(MODEL.R_media_2026),
        title: 'Lo que hoy recibe el blog.',
        detail: 'Cada mes de 2026 tuvo <strong>cerca de un tercio de las visitas del mismo mes de 2025</strong>, antes de migrar.',
        folio: ref('que-es-volver')
      },
      {
        figure: `~${Math.round(n('base_visitas', J27) / 1000)}k`,
        title: 'Enero de 2027 como el año anterior.',
        detail: `Si la configuración SEO y el cierre de Azure entran antes del 20 de noviembre. <strong>Si se corren a diciembre, ~${Math.round(55146 / 1000)}k.</strong>`,
        folio: ref('escenarios')
      },
      {
        figure: 'Nov 2027',
        title: 'El nivel previo a la migración.',
        detail: 'Con skyairline.com/blog desde marzo de 2027, el blog llega <strong>entre el 75\u00a0% y el 95\u00a0% del nivel de 2025</strong>.',
        folio: ref('hitos')
      },
      {
        figure: '2028',
        title: 'El repago de antes de migrar.',
        detail: `US$ 28.000–45.000 al mes en un mes normal <strong>desde mediados de 2028</strong>; en enero de 2028, entre US$ ${valueRange(mid(J28))} mil.`,
        folio: ref('valor')
      },
      {
        figure: `~${round50(BUYERS_2026)}`,
        title: 'Lectores que compran cada mes.',
        detail: `Leyeron el blog y compraron ese mismo mes en 2026. <strong>Antes de migrar eran unas ${round50(BUYERS_PRE)}.</strong>`,
        folio: ref('conversion')
      }
    ],
    decision: {
      label: 'Para decidir con SKY',
      text: 'La fecha del proxy inverso con TI fija el calendario: cada mes de atraso corre en un mes la vuelta al nivel previo. Y los arreglos técnicos de noviembre deciden el resultado de enero.',
      signature: SIGNATURE
    },
    ...footer()
  }
})

add({
  slideId: 'que-es-volver',
  contentType: 'report-narrative',
  body: true,
  slots: {
    ...running('Qué significa volver'),
    eyebrow: 'Qué significa volver',
    assertion: 'Hay dos «mejores niveles»: el del blog antes de migrar y el de 2024, antes de las respuestas de IA',
    lead: 'Elegimos como meta el primero. Es el que el blog puede recuperar con lo que está en manos de SKY y de Efeonce, y el que corresponde al repago de antes.',
    paragraphs: [
      'Enero de 2025 trajo <strong>208.099 visitas orgánicas</strong> y 2024 promedió unas 168.000 al mes. Desde marzo de 2025 Google responde con IA muchas búsquedas de viaje en español, y el blog empezó a caer antes de migrar: −17\u00a0% en marzo y −48\u00a0% en agosto contra el año anterior.',
      'La meta es el <strong>nivel previo a la migración</strong>: cada mes de 2025, de enero a septiembre, ya con respuestas de IA. En agosto de 2025 ese tráfico valía entre US$ 28.000 y 45.000 al mes en publicidad. Ese es el repago de antes.',
      `En 2026 cada mes recibió entre el 31\u00a0% y el 38\u00a0% de las visitas del mismo mes de 2025; en promedio, el ${pct(MODEL.R_media_2026)}. Llamamos a esa cifra <strong>tasa de recuperación</strong>. El 100\u00a0% es volver al nivel previo con su estacionalidad: unas 208.000 visitas en enero y unas 95.000 en un mes de invierno.`,
      'El nivel de 2024 no es una meta realista dentro de los 24 meses del servicio. Las respuestas de IA se quedaron con parte de los clics de las búsquedas generales, y eso afecta a todo el mercado.'
    ],
    pullQuote: { text: 'La meta es volver al blog de 2025 antes de migrar, no al de 2024.', source: 'Lectura de Efeonce' },
    evidence: {
      label: 'Evidencia',
      items: [
        { folio: ref('trayectoria'), text: 'Trayectoria a 24 meses' },
        { folio: ref('escenarios'), text: 'Tres escenarios' },
        { folio: ref('hitos'), text: 'Cuándo llega cada hito' }
      ]
    },
    closing: closing(
      'Medimos la recuperación como la fracción del mismo mes de 2025 que recibe el blog: hoy un tercio.',
      'Reportar cada mes la tasa de recuperación junto con las visitas, para que la estacionalidad no confunda.'
    ),
    ...footer()
  }
})

add({
  slideId: 'trayectoria',
  contentType: 'report-figure-trend',
  body: true,
  slots: {
    ...running('Proyección a 24 meses'),
    eyebrow: { icon: 'trend', label: 'Visitas orgánicas por mes' },
    keyFigure: '85\u00a0%',
    keyCaption: 'del nivel previo a la migración en noviembre de 2027 <strong>(banda del 75\u00a0% al 95\u00a0%)</strong>, con skyairline.com/blog',
    conclusion: 'Con la autoridad de skyairline.com, el blog vuelve cerca del nivel de 2025 en unos ocho meses',
    lead: 'Observado hasta octubre de 2026 y, desde ahí, el escenario estructural en su punto medio. La línea discontinua repite cada año el nivel previo a la migración.',
    figureTitle: 'Visitas orgánicas al blog, en miles',
    lineLegend: [
      { role: 'primary', label: 'Visitas orgánicas' },
      { role: 'reference', label: 'Nivel previo a migrar' },
      { role: 'detail', label: 'Estructural, punto medio' }
    ],
    ...trendSeries(),
    note: { text: 'Octubre de 2026 cerrado: 24.351 visitas, ' + pct(MODEL.caida_interanual_octubre_2026).replace('-', '−') + ' contra octubre de 2025.' },
    provenance: [
      { label: 'Unidad', text: 'Sesiones de búsqueda orgánica por mes, en miles' },
      { label: 'Fuente', text: 'GA4 de SKY; proyección de Efeonce desde noviembre de 2026' },
      { label: 'Cobertura', text: 'Enero de 2025 a octubre de 2028' }
    ],
    closing: closing(
      'Lo técnico se ve entre cuatro y ocho semanas después; recuperar la autoridad de un dominio toma de seis a nueve meses.',
      'Agendar con TI la vuelta a skyairline.com/blog este mes para que el proxy inverso funcione en marzo de 2027.'
    ),
    ...footer()
  }
})

const scenarioValue = (key: string, mes: string) => est(key === 'mid' ? mid(mes) : n(key, mes))

add({
  slideId: 'escenarios',
  contentType: 'report-scenarios',
  body: true,
  slots: {
    ...running('Proyección a 24 meses'),
    eyebrow: { icon: 'trend', label: 'Tres escenarios' },
    keyFigure: `${Math.round(n('estructural_bajo_visitas', J28) / 1000)}–${Math.round(n('estructural_alto_visitas', J28) / 1000)}k`,
    keyCaption: 'visitas en enero de 2028 en el escenario estructural <strong>(enero de 2025: 208.099)</strong>',
    conclusion: 'Sin volver a skyairline.com/blog, el blog se queda cerca de la mitad del nivel previo',
    lead: 'Enero y julio de 2027 y 2028 contra el mismo mes antes de migrar. Estimaciones, no un compromiso.',
    figureTitle: 'Visitas orgánicas por mes, por escenario',
    referenceLegend: 'Nivel previo a la migración',
    scenarioChart: {
      periods: ['Ene 2027', 'Jul 2027', 'Ene 2028', 'Jul 2028'],
      reference: {
        label: 'Antes de migrar',
        values: [J27, JUL27, J28, JUL28].map(mes => est(Number(PROJ.find(row => row.mes === mes)!.referencia_previa_migracion)))
      },
      series: [
        { role: 'low', values: [J27, JUL27, J28, JUL28].map(mes => scenarioValue('sin_intervenir_visitas', mes)) },
        { role: 'base', values: [J27, JUL27, J28, JUL28].map(mes => scenarioValue('base_visitas', mes)) },
        { role: 'high', values: [J27, JUL27, J28, JUL28].map(mes => scenarioValue('mid', mes)) }
      ]
    },
    note: { text: 'Estructural en su punto medio; su banda va del 75\u00a0% al 95\u00a0% del nivel previo desde noviembre de 2027.' },
    scenarios: [
      { role: 'low', name: 'Sin intervenir', outcome: `~${Math.round(n('sin_intervenir_visitas', J28) / 1000)}k en enero de 2028`, assumption: `Sigue ${pct(MODEL.caida_interanual_octubre_2026).replace('-', '−')} contra el año anterior en 2027 y −20\u00a0% en 2028.` },
      { role: 'base', name: 'Base', outcome: `~${Math.round(n('base_visitas', J28) / 1000)}k en enero de 2028`, assumption: 'Arreglos técnicos y lote editorial; el blog sigue en blog.skyairline.com.' },
      { role: 'high', name: 'Estructural', outcome: `${Math.round(n('estructural_bajo_visitas', J28) / 1000)}–${Math.round(n('estructural_alto_visitas', J28) / 1000)}k en enero de 2028`, assumption: 'Lo anterior más skyairline.com/blog desde marzo de 2027.' }
    ],
    provenance: [
      { label: 'Unidad', text: 'Sesiones de búsqueda orgánica por mes' },
      { label: 'Fuente', text: 'Estimación de Efeonce sobre GA4' },
      { label: 'Cobertura', text: 'Referencia: mismo mes de 2025' }
    ],
    closing: closing(
      'La diferencia entre base y estructural es la autoridad de skyairline.com.',
      'Revisar los escenarios con el cierre de diciembre y cuando TI fije el proxy.'
    ),
    ...footer()
  }
})

add({
  slideId: 'hitos',
  contentType: 'report-table',
  body: true,
  slots: {
    ...running('Proyección a 24 meses'),
    eyebrow: 'Cuándo llega cada hito',
    heroFigure: 'Mar 2027',
    heroText: 'es la fecha supuesta del proxy inverso: <strong>cada mes de atraso corre los hitos un mes</strong>',
    tableTitle: 'El repago de antes vuelve con el escenario estructural; la base llega a la mitad',
    lead: 'Mes en que se alcanza cada nivel. Tasa de recuperación: visitas del mes ÷ el mismo mes de 2025, antes de migrar.',
    boardTitle: 'Hitos por escenario',
    barMode: 'none',
    tableColumns: [{ label: '#' }, { label: 'Hito' }, { label: 'Base' }, { label: 'Estructural' }],
    tableRows: [
      { entity: 'Enero como el año anterior (~65k)', valueA: 'ene 2027', valueB: 'ene 2027' },
      { entity: 'Mitad del nivel previo a migrar', valueA: 'oct 2028', valueB: 'may–jun 2027' },
      { entity: 'Tres cuartos del nivel previo', valueA: 'después de 2028', valueB: 'sep–nov 2027' },
      { entity: 'Nivel previo a migrar (90\u00a0% o más)', valueA: 'después de 2028', valueB: 'desde nov 2027' },
      { entity: 'Enero de 2028', valueA: `~${Math.round(n('base_visitas', J28) / 1000)}k`, valueB: `${Math.round(n('estructural_bajo_visitas', J28) / 1000)}–${Math.round(n('estructural_alto_visitas', J28) / 1000)}k` },
      { entity: 'Repago de antes en un mes normal', valueA: 'después de 2028', valueB: 'mediados 2028' },
      { entity: 'Valor de 7 veces el honorario', valueA: 'sólo en enero', valueB: 'desde jul 2027' }
    ],
    source: { label: 'Fuente', text: 'Modelo de Efeonce sobre GA4, 2024 a 2026' },
    coverage: { label: 'Cobertura', text: 'Estructural: banda baja a alta' },
    closing: closing(
      'Los hitos del escenario estructural dependen de una sola decisión técnica; los de la base, del ritmo editorial.',
      'Fijar con TI la fecha del proxy inverso y medir cada mes la tasa de recuperación contra estos hitos.'
    ),
    ...footer()
  }
})

add({
  slideId: 'valor',
  contentType: 'report-figure-stat',
  body: true,
  slots: {
    ...running('Valor y repago'),
    eyebrow: { icon: 'target', label: 'Valor en publicidad y repago' },
    conclusion: 'El repago de antes vuelve cuando vuelve el nivel previo a la migración',
    lead: `Valor publicitario equivalente por mes y veces que cubre el honorario del servicio (CLP 3.000.000 netos, unos US$ ${est(FEE)} a ${Math.round(MODEL.usd_clp)} pesos por dólar).`,
    figureTitle: 'Valor del tráfico orgánico, en miles de dólares al mes',
    statItems: [
      { metricIcon: 'clic', name: 'Hoy', context: 'septiembre 2026 · 2 a 5 veces el honorario', value: '6–16', suffix: 'k' },
      { metricIcon: 'clic', name: 'Antes de migrar', context: 'agosto 2025 · 9 a 15 veces el honorario', value: '28–45', suffix: 'k' },
      { metricIcon: 'posicion', name: 'Enero 2027, base', context: `${coverage(n('base_visitas', J27))} veces el honorario`, value: valueRange(n('base_visitas', J27)), suffix: 'k' },
      { metricIcon: 'posicion', name: 'Julio 2027, estructural', context: `${coverage(mid(JUL27))} veces el honorario`, value: valueRange(mid(JUL27)), suffix: 'k' },
      { metricIcon: 'posicion', name: 'Julio 2028, estructural', context: `${coverage(mid(JUL28))} veces el honorario`, value: valueRange(mid(JUL28)), suffix: 'k' },
      { metricIcon: 'reloj', name: 'Julio 2028, base', context: `${coverage(n('base_visitas', JUL28))} veces el honorario`, value: valueRange(n('base_visitas', JUL28)), suffix: 'k' }
    ],
    note: { text: 'Costo de comprar esos clics en Google Ads, con el valor por visita de agosto de 2025. No es ahorro ni retorno.' },
    provenance: [
      { label: 'Unidad', text: 'Miles de dólares al mes; veces el honorario mensual' },
      { label: 'Fuente', text: 'Semrush y Search Console × costo por clic; modelo de Efeonce' },
      { label: 'Cobertura', text: 'Chile y Perú; búsquedas sin detalle, extrapoladas' }
    ],
    closing: closing(
      'El valor sigue a las visitas: el repago de 9 a 15 veces vuelve con el nivel previo, no antes.',
      'Reportar cada mes el valor y su cobertura del honorario, separando búsquedas de marca y de destinos.'
    ),
    ...footer()
  }
})

add({ slideId: 'keywords', contentType: 'report-table', body: true, slots: {} }) // se completa con el desglose de `valor/`

add({
  slideId: 'conversion',
  contentType: 'report-figure-trend',
  body: true,
  slots: {
    ...running('Aporte a la venta'),
    eyebrow: { icon: 'link', label: 'Del blog a la compra' },
    keyFigure: `~${round50(BUYERS_2026)}`,
    keyCaption: `personas al mes leyeron el blog y compraron ese mismo mes en 2026; <strong>unas ${round50(BUYERS_PRE)} antes de migrar</strong>`,
    conclusion: 'Quien lee el blog sigue comprando igual: lo que bajó es la cantidad de lectores',
    lead: `Personas que vieron el blog y compraron en SKY el mismo mes. De ellas compró entre el ${rateRange('2026-01', '2026-10')}\u00a0% en 2026, y entre el ${rateRange('2025-01', '2025-09')}\u00a0% antes de migrar.`,
    figureTitle: 'Lectores del blog que compraron ese mes, en miles',
    lineLegend: [{ role: 'primary', label: 'Lectores que compraron' }],
    lineSeries: [
      {
        label: 'Lectores del blog que compraron',
        role: 'primary',
        values: BUYERS.map(row => thousands(Number(row.users_then_purchased))),
        endLabel: BUYERS.at(-1)!.users_then_purchased
      }
    ],
    lineXLabels: BUYERS.map((row, index) => ({ index, label: `${MONTHS[Number(row.month.slice(5)) - 1]} ${row.month.slice(2, 4)}` })).filter(
      ({ index }) => index % 3 === 0
    ),
    lineAnnotations: {
      events: [{ index: BUYERS.findIndex(row => row.month === '2025-09'), label: 'Migración' }],
      pointLabels: ['2025-01', '2026-01'].map(month => {
        const index = BUYERS.findIndex(row => row.month === month)

        return { index, label: `${thousands(Number(BUYERS[index]!.users_then_purchased))}k` }
      })
    },
    note: { text: 'Coinciden en el mes; no es atribución. GA4 de SKY registra las compras sin monto: no hay ingresos.' },
    provenance: [
      { label: 'Unidad', text: 'Personas por mes que vieron el blog y luego compraron, en miles' },
      { label: 'Fuente', text: 'GA4 de SKY, embudo de usuarios del blog a la compra' },
      { label: 'Cobertura', text: 'Mismo navegador y con cookies aceptadas: es un piso' }
    ],
    closing: closing(
      `Por cada 100 visitas el blog envía de ${PER100_MIN} a ${PER100_MAX} clics a skyairline.com. Quien entra por el blog compra en esa visita el ${pct1(Number(LANDING.blog_landing_purchase_session_rate))} de las veces; el sitio, el ${pct1(Number(LANDING.site_purchase_session_rate))}: llega antes de decidir.`,
      'Recuperar lectores es recuperar compradores. Con el tráfico previo a la migración, serían de nuevo unas ' + round50(BUYERS_PRE) + ' personas al mes.'
    ),
    ...footer()
  }
})

const PLAN_COLUMNS = { number: '#', action: 'Acción', metric: 'Qué mide', weeks: ['N', 'D', 'E', 'F'] }

add({
  slideId: 'medir-venta',
  contentType: 'report-plan',
  body: true,
  slots: {
    ...running('Aporte a la venta'),
    eyebrow: 'Cómo medir la venta',
    heroFigure: '4',
    heroText: 'pasos para medir el aporte del blog en compras y en ingresos',
    title: 'GA4 ya une al lector con la compra: faltan el monto y el detalle por artículo',
    lead: 'Ninguno requiere contenido nuevo. El primero lo hace el equipo Digital de SKY.',
    columns: PLAN_COLUMNS,
    actions: [
      { title: 'Monto en el evento de compra', detail: 'Hoy GA4 registra cada compra sin su valor: sin él no hay ingresos por blog, artículo ni país.', evidence: 'Digital SKY', impactLabel: 'Impacto', impact: '3', effortLabel: 'Esfuerzo', effort: '1', metric: 'Ingresos con paso por el blog', metricNote: 'desde que se active', weeks: '1-2' },
      { title: 'Evento de clic a ruta como evento clave', detail: 'Cada clic a una ruta desde un artículo, con su destino, contado como evento clave.', evidence: 'GA4 de SKY', impactLabel: 'Impacto', impact: '2', effortLabel: 'Esfuerzo', effort: '1', metric: 'Clics a ruta por artículo', metricNote: 'y por destino', weeks: '2' },
      { title: 'UTM en los banners de ruta', detail: 'Cada banner con su origen, para separar su aporte del de los enlaces del texto.', evidence: 'Acordado en kickoff', impactLabel: 'Impacto', impact: '2', effortLabel: 'Esfuerzo', effort: '1', metric: 'Aporte de cada banner', metricNote: 'desde la primera publicación', weeks: '2-3' },
      { title: 'Cuadro mensual de aporte a la venta', detail: 'Lectores que compran, tasa de compra, clics a skyairline.com y valor publicitario.', evidence: 'Reporte mensual', impactLabel: 'Impacto', impact: '3', effortLabel: 'Esfuerzo', effort: '2', metric: 'Un mismo cuadro cada mes', metricNote: 'desde el cierre de diciembre', weeks: '3-4' }
    ],
    closing: closing(
      'Con el monto de la compra, el aporte del blog se mide en ingresos y no sólo en personas.',
      'Un contacto de Digital para el monto de la compra y el clic a ruta, y acceso de lectura a GA4 para una cuenta de servicio de Efeonce.',
      ['Cómo lo mediremos', 'Qué necesitamos de ustedes']
    ),
    ...footer()
  }
})

add({
  slideId: 'limites',
  contentType: 'report-limits',
  body: true,
  slots: {
    ...running('Límites y método'),
    eyebrow: 'Límites y método',
    heroFigure: '4',
    heroText: 'supuestos que mueven las fechas de esta proyección',
    assertion: 'Una proyección, <strong>no un compromiso</strong>',
    lead: 'Las fechas se revisan con cada cierre mensual y cuando cambie alguno de estos supuestos.',
    limits: [
      { subject: 'Arreglos técnicos', cause: 'Se suponen en producción antes del 20 de noviembre; al 5 de noviembre aún no lo están.' },
      { subject: 'Vuelta a skyairline.com/blog', cause: 'Se supone en marzo de 2027; depende de TI y del proxy inverso.' },
      { subject: 'Respuestas de IA', cause: 'Se supone que Google no amplía mucho más su uso en búsquedas de viaje; si lo hace, las fechas se corren.' },
      { subject: 'Compras', cause: 'GA4 cuenta personas y compras, no ingresos, y pierde a quien cambia de dispositivo o rechaza cookies.' }
    ],
    methodologyLabel: 'Cómo se hizo',
    methodology: [
      'GA4 de SKY: sesiones de búsqueda orgánica del blog en sus dos direcciones, enero 2024 a octubre 2026.',
      'Tasa de recuperación: visitas del mes ÷ el mismo mes de 2025, antes de migrar.',
      'Cada escenario es una trayectoria de esa tasa con supuestos explícitos.',
      'Valor: visitas × valor por visita de agosto de 2025, en un rango bajo y alto.',
      'Las visitas de Analytics y los clics de Search Console miden cosas distintas y no se suman.'
    ],
    ...footer()
  }
})

add({
  slideId: 'contraportada',
  contentType: 'report-back-cover',
  slots: {
    editionLabel: EDITION,
    contact: {
      email: EFEONCE_CONTACT.email,
      phonePrimary: EFEONCE_CONTACT.phones[0].display,
      phoneSecondary: EFEONCE_CONTACT.phones[1].display,
      address: EFEONCE_CONTACT.addressDisplay
    },
    marketsLine: EFEONCE_OPERATING_MARKETS.join(' · '),
    legalLine: `${EFEONCE_LEGAL_NAME_FALLBACK} · RUT ${EFEONCE_TAX_ID_FALLBACK} · Documento confidencial para uso exclusivo de SKY Airline · Proyección al 6 de noviembre de 2026`
  }
})

// ─── Desglose de búsquedas (se completa desde `valor/keywords_report.json`) ────────────────────────────────

const KEYWORDS_FILE = path.join(ROOT, 'valor/keywords_report.json')

if (fs.existsSync(KEYWORDS_FILE)) {
  const keywords = JSON.parse(fs.readFileSync(KEYWORDS_FILE, 'utf8')) as { slots: Slots }

  pages.find(page => page.slideId === 'keywords')!.slots = { ...running('Valor y repago'), ...keywords.slots, ...footer() }
} else {
  pages.splice(pages.findIndex(page => page.slideId === 'keywords'), 1)
}

// ─── Folios e índice ────────────────────────────────────────────────────────────────────────────────────────

const total = pages.length
const pad = (value: number) => String(value).padStart(2, '0')
const folioOf = (slideId: string) => pad(pages.findIndex(page => page.slideId === slideId) + 1)

pages.forEach((page, index) => {
  if (page.body) page.slots.folio = { page: pad(index + 1), total: pad(total) }
})

pages.find(page => page.slideId === 'indice')!.slots = {
  ...running('Contenido'),
  eyebrow: 'Contenido',
  title: 'Qué encontrará en este informe',
  titleColumn: 'Sección',
  pageColumn: 'Página',
  entries: [
    { mark: 'R', title: 'Resumen ejecutivo', folio: folioOf('resumen') },
    { mark: '01', title: 'Qué significa volver', folio: folioOf('que-es-volver') },
    { mark: '02', title: 'Proyección a 24 meses', folio: folioOf('trayectoria') },
    { mark: '03', title: 'Valor y repago', folio: folioOf('valor') },
    { mark: '04', title: 'Aporte a la venta', folio: folioOf('conversion') },
    { mark: 'L', title: 'Límites y método', folio: folioOf('limites') }
  ],
  folio: { page: folioOf('indice'), total: pad(total) },
  ...footer()
}

const plan = {
  tenderId: 'efeonce-sky-proyeccion-blog-2026-11',
  slides: pages.map(({ slideId, contentType, slots }) => ({ slideId, contentType, slots }))
}

const serialized = JSON.stringify(plan, null, 2).replace(/@@ref:([a-z0-9-]+)@@/g, (_match, slideId: string) => {
  if (!pages.some(page => page.slideId === slideId)) throw new Error(`Referencia a una página inexistente: ${slideId}`)

  return `p. ${folioOf(slideId)}`
})

const out = path.resolve(process.argv[2] ?? 'outputs/sky-blog-proyeccion-2026-11/informe/sky-blog-proyeccion.plan.json')

const main = async () => {
  await fsp.mkdir(path.dirname(out), { recursive: true })
  await fsp.writeFile(out, `${serialized}\n`, 'utf8')
  console.log(`plan: ${pages.length} páginas → ${out}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
