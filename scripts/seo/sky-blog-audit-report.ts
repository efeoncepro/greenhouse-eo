/**
 * Plan del informe «Auditoría SEO del Blog SKY» (corte 21-10-2026) para el catálogo A4 premium.
 *
 *   pnpm exec tsx scripts/seo/sky-blog-audit-report.ts [salida.json]
 *   pnpm report:compose <salida.json> --out <dir> --asset org-logo:sky=<logo-negativo.svg>
 *
 * Cada cifra sale de la auditoría consolidada (docs/audits/growth/2026-10-23-sky-blog-seo-audit-consolidada.md) y
 * su evidencia en `.captures/sky-blog-seo-audit-2026-10-23/`. El contacto institucional se lee del SSOT de marca;
 * los folios y el índice se calculan del orden de las páginas, nunca a mano.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import {
  EFEONCE_CONTACT,
  EFEONCE_LEGAL_NAME_FALLBACK,
  EFEONCE_OPERATING_MARKETS,
  EFEONCE_TAX_ID_FALLBACK
} from '@/config/efeonce-brand'

type Slots = Record<string, unknown>
type Page = { slideId: string; contentType: string; slots: Slots; body?: boolean }

const CLIENT = 'SKY Airline'
const PERIOD = 'Datos al 21 de octubre de 2026'
const EDITION = 'SEO · Auditoría del Blog SKY · Octubre 2026'
const SIGNATURE = 'Recomendación de Efeonce'

const footer = () => ({
  footerEdition: EDITION,
  footerContact: { address: EFEONCE_CONTACT.addressDisplay, phone: EFEONCE_CONTACT.phones[0].display }
})

const running = (section: string) => ({ clientName: CLIENT, runningSection: section, runningPeriod: PERIOD })

const closing = (measure: string, action: string, labels = ['Lo que significa', 'Próximo paso']) => [
  { kind: 'measure', label: labels[0], text: measure },
  { kind: 'action', label: labels[1], text: action, signature: SIGNATURE }
]

// ─── Datos (GA4 Organic Search en el blog, sesiones por mes) ────────────────────────────────────────────────────

/** Ene-2024 a sep-2026. Octubre 2026 es parcial (1–21) y no entra en la serie mensual. */
const GA4_MONTHLY = [
  152090, 152039, 140238, 132550, 144911, 223915, 195707, 185754, 183788, 186079, 157911, 158689,
  208099, 157403, 116320, 94468, 94104, 99430, 110878, 95710, 75506, 42585, 43973, 49543,
  67940, 56922, 42331, 32491, 35033, 35978, 33959, 29768, 28954
]

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Miles con un decimal y coma: la figura imprime y mide la misma cifra. */
const thousands = (value: number) => (value / 1000).toFixed(1).replace('.', ',')

const trendSeries = () => {
  const fromIndex = 12 // ene-2025
  const current = GA4_MONTHLY.slice(fromIndex)
  const prior = current.map((_, i) => GA4_MONTHLY[fromIndex + i - 12]!)

  return {
    lineSeries: [
      { label: 'Visitas orgánicas', role: 'primary', values: current.map(thousands), endLabel: '29k' },
      { label: 'Mismo mes del año anterior', role: 'reference', values: prior.map(thousands), endLabel: '76k' }
    ],
    lineXLabels: current
      .map((_, i) => ({ index: i, label: `${MONTHS[(i % 12)]} ${i < 12 ? '25' : '26'}` }))
      .filter(({ index }) => index % 3 === 0),
    lineAnnotations: {
      bands: [
        { from: 2, to: 8, label: 'Antes de migrar' },
        { from: 14, to: 20, label: 'Caída 2026', tone: 'alert' }
      ],
      events: [{ index: 9, label: 'Migración' }],
      pointLabels: [
        { index: 0, label: '208k' },
        { index: 8, label: '76k' },
        { index: 9, label: '43k', placement: 'below' },
        { index: 12, label: '68k' }
      ]
    }
  }
}

// ─── Páginas ────────────────────────────────────────────────────────────────────────────────────────────────

const pages: Page[] = []

/** Referencia a otra página: se resuelve a su folio real cuando el orden está completo. */
const ref = (slideId: string) => `@@ref:${slideId}@@`
const add = (page: Page) => pages.push(page)

add({
  slideId: 'portada',
  contentType: 'report-cover',
  slots: {
    editionLabel: 'Auditoría SEO · Octubre 2026',
    productLabel: 'SEO',
    eyebrow: 'Lectura de Efeonce',
    reportTitle: 'Por qué cayó el tráfico y cómo recuperarlo',
    reportSubtitle: 'Diagnóstico del canal orgánico de blog.skyairline.com, escenarios de noviembre a enero y plan de 90 días.',
    preparedFor: { label: 'Preparado para', logo: 'asset-ref:org-logo:sky' },
    confidentialityLine: 'Confidencial · Versión 1 · 23 de octubre de 2026'
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
    thesis: 'El blog no fue penalizado: perdió su configuración SEO, su dominio y posiciones. Todo eso se puede reparar.',
    thesisLead:
      'La caída de 80.000 a 40.000 visitas que vivieron tras la migración es real, pero empezó seis meses antes y todavía no se detiene. Las redirecciones funcionan; lo que se perdió fue la configuración que le explica cada artículo a Google, la autoridad del dominio principal y las posiciones en Perú.',
    essentialsLabel: 'Lo esencial',
    essentials: [
      {
        figure: '−36 %',
        title: 'El tráfico sigue cayendo.',
        detail: 'Del 1 al 21 de octubre llegaron <strong>18.669 visitas orgánicas</strong>, contra 28.994 en el mismo tramo de 2025.',
        folio: ref('tendencia')
      },
      {
        figure: '97 %',
        title: 'Las redirecciones están bien hechas.',
        detail: 'Las direcciones antiguas llevan al mismo artículo con un solo salto. <strong>No hay rastro de una penalización.</strong>',
        folio: ref('sin-penalizacion')
      },
      {
        figure: '0 de 1.700',
        title: 'Ningún artículo conserva su configuración SEO.',
        detail: 'Antes de migrar cada artículo tenía descripción, datos estructurados y autor. <strong>El complemento que los generaba no se migró.</strong>',
        folio: ref('hallazgos-criticos')
      },
      {
        figure: '387 → 98',
        title: 'Perú perdió los primeros lugares.',
        detail: 'Búsquedas en el top 3 de Google Perú. Los artículos siguen publicados: <strong>el contenido existe, perdió posición.</strong>',
        folio: ref('peru-rankings')
      },
      {
        figure: '9',
        title: 'Artículos de Perú borrados desde el 15 de octubre.',
        detail: 'Entre ellos la Catedral de Tacna, tercera en Google. <strong>Se pueden restaurar esta semana.</strong>',
        folio: ref('peru-alerta')
      }
    ],
    decision: {
      label: 'Para decidir en la reunión',
      text: `Aprobar el plan de 90 días (${ref('plan-1')}) y cuatro acciones de esta semana: restaurar los artículos de Perú, exportar el Search Console anterior, revisar acciones manuales y enviar el mapa del sitio.`,
      signature: SIGNATURE
    },
    ...footer()
  }
})

add({
  slideId: 'capitulo-01',
  contentType: 'report-chapter',
  slots: {
    chapterLabel: 'Capítulo 01',
    productLabel: 'SEO',
    chapterNumeral: '01',
    runningLabel: 'Auditoría del Blog SKY',
    chapterTitle: 'Qué pasó con el tráfico',
    chapterLead: 'La caída tiene tres etapas: empezó antes de migrar, se profundizó con la migración y siguió en 2026. Ninguna es una penalización.',
    contents: { label: 'En este capítulo', entries: [] }
  }
})

add({
  slideId: 'tendencia',
  contentType: 'report-figure-trend',
  body: true,
  slots: {
    chapterTab: '01',
    ...running('01 · Qué pasó con el tráfico'),
    eyebrow: { icon: 'trend', label: 'Visitas orgánicas por mes' },
    keyFigure: '−86 %',
    keyCaption: 'visitas orgánicas al blog entre enero de 2025 y septiembre de 2026 <strong>(de 208.099 a 28.954)</strong>',
    conclusion: 'La caída empezó seis meses antes de la migración y todavía no se detiene',
    lead: 'La migración de septiembre de 2025 fue el golpe más brusco, pero no el único. La línea discontinua muestra el mismo mes del año anterior.',
    figureTitle: 'Visitas orgánicas al blog, en miles',
    lineLegend: [
      { role: 'primary', label: 'Visitas orgánicas' },
      { role: 'reference', label: 'Mismo mes, año anterior' }
    ],
    ...trendSeries(),
    note: { text: 'Octubre de 2026 está incompleto y queda fuera de la serie: del 1 al 21 suma 18.669 visitas.' },
    provenance: [
      { label: 'Unidad', text: 'Sesiones de búsqueda orgánica por mes, en miles' },
      { label: 'Fuente', text: 'Google Analytics 4 de SKY, blog y su dirección anterior' },
      { label: 'Cobertura', text: 'Enero de 2024 a septiembre de 2026, meses completos' }
    ],
    closing: closing(
      'Antes de migrar el blog ya había perdido dos tercios de sus visitas. La migración restó otro 44 % en un mes, y en 2026 la caída siguió.',
      'Medir la recuperación contra el mismo mes del año anterior, nunca contra septiembre: enero sube por temporada aunque no se haga nada.'
    ),
    ...footer()
  }
})

add({
  slideId: 'cascada-2026',
  contentType: 'report-figure-waterfall',
  body: true,
  slots: {
    chapterTab: '01',
    ...running('01 · Qué pasó con el tráfico'),
    eyebrow: { icon: 'steps', label: 'Qué explica la caída de 2026' },
    keyFigure: '−58 %',
    keyCaption: 'clics diarios desde Google entre enero–febrero y agosto–septiembre de 2026 <strong>(de 2.354 a 984)</strong>',
    conclusion: 'Las guías de equipaje y políticas explican más de la mitad de la caída de 2026',
    lead: 'Treinta artículos de servicio concentran la pérdida en volumen; los de destinos perdieron más en proporción, por posición.',
    figureTitle: 'Clics diarios desde Google, por tipo de artículo',
    legend: { prior: 'Enero–febrero', removed: 'Pérdida', current: 'Agosto–septiembre' },
    waterfallSteps: [
      { label: 'Enero–febrero 2026', value: '2.354', kind: 'start' },
      { label: 'Equipaje y políticas de SKY', value: '−771', kind: 'remove' },
      { label: 'Destinos internacionales', value: '−220', kind: 'remove' },
      { label: 'Destinos de Chile', value: '−186', kind: 'remove' },
      { label: 'Consejos, empleo y Perú', value: '−193', kind: 'remove' },
      { label: 'Agosto–septiembre 2026', value: '984', kind: 'end' }
    ],
    note: { text: 'Enero y febrero son temporada alta de verano: una parte de la diferencia es estacional.' },
    provenance: [
      { label: 'Unidad', text: 'Clics por día, promedio de cada bimestre' },
      { label: 'Fuente', text: 'Google Search Console, propiedad blog.skyairline.com' },
      { label: 'Cobertura', text: 'Todas las páginas del blog, sumadas por página' }
    ],
    closing: closing(
      'La caída de 2026 no es pareja: equipaje pierde volumen con posición estable y los destinos pierden posición. Piden respuestas distintas.',
      'Unificar las guías de equipaje y check-in con el Centro de Ayuda como fuente, y recuperar posición en destinos con consolidación y enlaces.'
    ),
    ...footer()
  }
})

add({
  slideId: 'marca-vs-generica',
  contentType: 'report-figure-comparison',
  body: true,
  slots: {
    chapterTab: '01',
    ...running('01 · Qué pasó con el tráfico'),
    eyebrow: { icon: 'search', label: 'Marca y búsquedas generales' },
    keyFigure: '−73 %',
    keyCaption: 'clics diarios desde búsquedas que no nombran a SKY <strong>(de 432 a 115)</strong>',
    conclusion: 'Las búsquedas generales perdieron posición; las de marca, clics con la misma visibilidad',
    lead: 'Enero–febrero contra agosto–septiembre de 2026. Marca: búsquedas que nombran a SKY.',
    figureTitle: 'Búsquedas de marca y generales, por día',
    legend: { current: 'Agosto–septiembre', prior: 'Enero–febrero' },
    metrics: [
      { metricIcon: 'clic', name: 'Clics generales', unit: 'clics por día', current: '115', prior: '432', direction: 'down:worse', delta: '−73 %' },
      { metricIcon: 'posicion', name: 'Posición en generales', unit: 'lugar en Google', current: '9,1', prior: '6,3', direction: 'up:worse', delta: '+2,8' },
      { metricIcon: 'clic', name: 'Clics de marca', unit: 'clics por día', current: '189', prior: '384', direction: 'down:worse', delta: '−51 %' },
      { metricIcon: 'ctr', name: 'Tasa de clic de marca', unit: 'porcentaje', current: '7,3 %', prior: '17,0 %', direction: 'down:worse', delta: '−9,7 pp' }
    ],
    note: { text: 'Entre 62 % y 70 % de los clics llegan desde búsquedas que Google no detalla; estas cifras cubren las visibles.' },
    provenance: [
      { label: 'Unidad', text: 'Promedio diario de cada bimestre' },
      { label: 'Fuente', text: 'Google Search Console, propiedad blog.skyairline.com' },
      { label: 'Cobertura', text: 'Búsquedas con consulta visible' }
    ],
    closing: closing(
      'En marca, el blog sigue apareciendo pero recibe menos clics: Google responde antes con su propia información.',
      'Guías de servicio que respondan directo y citen el Centro de Ayuda; recuperar posición en búsquedas generales.'
    ),
    ...footer()
  }
})

add({
  slideId: 'sin-penalizacion',
  contentType: 'report-narrative',
  body: true,
  slots: {
    ...running('01 · Qué pasó con el tráfico'),
    eyebrow: 'Lo que no pasó',
    assertion: 'No hay una penalización de Google: la migración redirigió bien y dejó atrás otras cosas',
    lead: 'La explicación de que Google castigó el cambio de dominio no se sostiene con los datos. Saberlo cambia el plan: no hay que esperar un perdón, hay que reparar.',
    paragraphs: [
      'Revisamos 110 direcciones antiguas del blog tomadas del archivo histórico de internet. <strong>El 97 % llega al artículo correcto con una redirección permanente</strong>, y ninguna lleva a la portada ni usa redirecciones temporales.',
      'Tampoco hay contenido inyectado, enlaces ocultos ni páginas distintas para Google y para las personas. Revisamos las 1.700 publicaciones y comparamos lo que reciben el buscador y un navegador.',
      'Lo que sí cambió el 26 y 27 de septiembre de 2025 fue todo lo demás: el blog dejó la dirección del sitio principal, perdió el complemento que configuraba cada artículo para Google y quedó una copia pública en otro servidor.',
      'La caída que empezó en marzo de 2025 coincide con la llegada de las respuestas de IA de Google a las búsquedas en español, que contestan sin que la persona haga clic. Ese cambio afecta a todo el mercado y no se revierte.'
    ],
    pullQuote: { text: 'No hay que esperar un perdón de Google: hay que reparar lo que la migración dejó atrás.', source: 'Lectura de Efeonce' },
    evidence: {
      label: 'Evidencia',
      items: [
        { folio: ref('tendencia'), text: 'Tres etapas de la caída' },
        { folio: ref('hallazgos-criticos'), text: 'Lo que la migración dejó atrás' },
        { folio: ref('lo-que-google-ve'), text: 'Lo que Google ve hoy' }
      ]
    },
    closing: closing(
      'Lo perdido en la migración se repara con configuración y servidor; el cambio de las respuestas de IA se aborda con contenido que responda mejor.',
      'Empezar por lo que afecta a los 1.700 artículos a la vez y medir cada corrección contra el mismo mes del año anterior.'
    ),
    ...footer()
  }
})

add({
  slideId: 'capitulo-02',
  contentType: 'report-chapter',
  slots: {
    chapterLabel: 'Capítulo 02',
    productLabel: 'SEO',
    chapterNumeral: '02',
    runningLabel: 'Auditoría del Blog SKY',
    chapterTitle: 'Qué se rompió en la migración',
    chapterLead: 'Diez hallazgos técnicos, verificados el 23 de octubre. Los dos primeros afectan a los 1.700 artículos a la vez.',
    contents: { label: 'En este capítulo', entries: [] }
  }
})

add({
  slideId: 'hallazgos-criticos',
  contentType: 'report-findings',
  body: true,
  slots: {
    ...running('02 · Qué se rompió en la migración'),
    eyebrow: 'Hallazgos técnicos',
    heroFigure: '5',
    heroText: 'hallazgos que afectan a todo el blog a la vez',
    title: 'La migración movió los artículos, pero no lo que le explica cada uno a Google',
    lead: 'Ordenados por severidad. Cada corrección se verifica en el sitio publicado.',
    columns: { severity: 'Severidad', finding: 'Hallazgo', owner: 'Evidencia y responsable' },
    findings: [
      {
        severity: 'critical',
        severityLabel: 'Crítico',
        title: 'Se perdió la configuración SEO de los 1.700 artículos',
        detail: 'Antes de migrar, All in One SEO generaba descripción, datos estructurados, migas y autor. <strong>Hoy no hay complemento SEO</strong> y ningún artículo los tiene.',
        evidence: `Evidencia ${ref('lo-que-google-ve')}`,
        ownerLabel: 'Responsable',
        owner: 'WordPress de SKY + Efeonce'
      },
      {
        severity: 'critical',
        severityLabel: 'Crítico',
        title: 'Existe una copia completa del blog en el servidor de Azure',
        detail: 'Responde a Google, se declara original y no tiene bloqueo: <strong>compite con el blog real</strong> por las mismas búsquedas.',
        evidence: 'Verificado 23-10',
        ownerLabel: 'Responsable',
        owner: 'TI de SKY'
      },
      {
        severity: 'high',
        severityLabel: 'Alto',
        title: 'El blog quedó separado de la autoridad del dominio principal',
        detail: 'skyairline.com recibe enlaces de 7.316 sitios; blog.skyairline.com, de 262. <strong>Cuatro años de autoridad quedaron del otro lado.</strong>',
        evidence: `Evidencia ${ref('lo-que-google-ve')}`,
        ownerLabel: 'Responsable',
        owner: 'TI y Marketing de SKY'
      },
      {
        severity: 'high',
        severityLabel: 'Alto',
        title: 'Google no tiene un mapa del sitio',
        detail: 'El blog no publica robots.txt y Search Console no tiene ningún mapa del sitio enviado. Además, el mapa incluye 14 plantillas de prueba.',
        evidence: 'Verificado 23-10',
        ownerLabel: 'Responsable',
        owner: 'TI de SKY + Efeonce'
      },
      {
        severity: 'high',
        severityLabel: 'Alto',
        title: 'El 63 % de los artículos no se alcanza navegando',
        detail: 'Las categorías cargan más artículos con un botón que Google no sigue: <strong>sólo 636 de 1.700</strong> se descubren por enlaces internos.',
        evidence: `Evidencia ${ref('lo-que-google-ve')}`,
        ownerLabel: 'Responsable',
        owner: 'WordPress de SKY + Efeonce'
      }
    ],
    closing: closing(
      'Son correcciones de plantilla y servidor: una sola intervención mejora los 1.700 artículos.',
      'Reinstalar la configuración SEO y cerrar la copia de Azure en noviembre, antes de cualquier artículo nuevo.'
    ),
    ...footer()
  }
})

add({
  slideId: 'lo-que-google-ve',
  contentType: 'report-figure-stat',
  body: true,
  slots: {
    chapterTab: '02',
    ...running('02 · Qué se rompió en la migración'),
    eyebrow: { icon: 'numbers', label: 'Lo que Google ve hoy' },
    conclusion: 'El blog llega a Google sin descripción, sin autor y con dos tercios de sus artículos escondidos',
    lead: 'Seis señales del estado técnico, medidas el 23 de octubre sobre el sitio publicado.',
    figureTitle: 'Estado técnico de blog.skyairline.com',
    statItems: [
      { metricIcon: 'keyword', name: 'Con descripción', context: 'de 1.700 publicados', value: '0', unitLabel: 'artículos' },
      { metricIcon: 'visita', name: 'Alcanzables navegando', context: '636 de 1.700 artículos', value: '37', suffix: '%' },
      { metricIcon: 'cita', name: 'Sitios que lo enlazan', context: 'contra 7.316 de skyairline.com', value: '262', unitLabel: 'dominios' },
      { metricIcon: 'posicion', name: 'Carga en celular', context: 'contenido principal, conexión móvil simulada', value: '6–20', suffix: 's' },
      { metricIcon: 'clic', name: 'Botones de compra rotos', context: 'se muestran como código', value: '68', unitLabel: 'artículos' },
      { metricIcon: 'impresion', name: 'Enlaces antiguos', context: 'con dos o tres saltos', value: '3.052', unitLabel: 'enlaces' }
    ],
    note: { text: 'La carga en celular es una medición de laboratorio; Google no publicó datos de usuarios reales para el blog.' },
    provenance: [
      { label: 'Unidad', text: 'Conteos sobre el sitio publicado' },
      { label: 'Fuente', text: 'Revisión directa del sitio, Semrush y archivo histórico' },
      { label: 'Cobertura', text: '1.700 artículos; enlaces externos al 23-10' }
    ],
    closing: closing(
      'Nada de esto exige reescribir contenido: son configuración, plantilla y enlaces.',
      'Corregir primero lo que toca a todos los artículos; después, el contenido artículo por artículo.'
    ),
    ...footer()
  }
})

add({
  slideId: 'hallazgos-contenido',
  contentType: 'report-findings',
  body: true,
  slots: {
    ...running('02 · Qué se rompió en la migración'),
    eyebrow: 'Hallazgos técnicos',
    heroFigure: '5',
    heroText: 'hallazgos que se corrigen por grupos de artículos',
    title: 'Errores, duplicados y botones que no llevan a comprar',
    lead: 'Menos urgentes que los anteriores, pero cada uno resta visitas o ventas todos los días.',
    columns: { severity: 'Severidad', finding: 'Hallazgo', owner: 'Evidencia y responsable' },
    findings: [
      {
        severity: 'high',
        severityLabel: 'Alto',
        title: 'Artículos con tráfico que hoy dan error y no redirigen',
        detail: 'La guía larga de cambio de vuelo tuvo <strong>4.748 clics en noviembre y diciembre de 2025</strong> y hoy no existe; su contenido vive en otra dirección sin redirección.',
        evidence: 'Verificado 23-10',
        ownerLabel: 'Responsable',
        owner: 'WordPress de SKY'
      },
      {
        severity: 'medium',
        severityLabel: 'Medio',
        title: 'Artículos que compiten entre sí por la misma búsqueda',
        detail: '41 grupos con 217 artículos: tres de check-in, tres de cambio de vuelo, seis de Tacna, siete de Machu Picchu. Google reparte la señal entre todos.',
        evidence: 'Revisión 23-10',
        ownerLabel: 'Responsable',
        owner: 'Efeonce + Natalia'
      },
      {
        severity: 'medium',
        severityLabel: 'Medio',
        title: 'Botones de compra rotos o ausentes',
        detail: '68 artículos muestran el código del botón como texto y el 17 % de las guías de destino no enlaza a la ruta de SKY.',
        evidence: `Evidencia ${ref('lo-que-google-ve')}`,
        ownerLabel: 'Responsable',
        owner: 'WordPress de SKY + Efeonce'
      },
      {
        severity: 'medium',
        severityLabel: 'Medio',
        title: 'Lento en celular',
        detail: 'Imágenes sin optimizar, ninguna carga diferida y una pantalla de carga del tema retrasan el contenido principal.',
        evidence: `Evidencia ${ref('lo-que-google-ve')}`,
        ownerLabel: 'Responsable',
        owner: 'WordPress de SKY'
      },
      {
        severity: 'low',
        severityLabel: 'Bajo',
        title: 'Datos del sitio expuestos al público',
        detail: 'Se pueden listar los usuarios del WordPress y hay servicios abiertos que conviene cerrar. 1.411 artículos aparecen firmados por «administrador».',
        evidence: 'Verificado 23-10',
        ownerLabel: 'Responsable',
        owner: 'TI de SKY'
      }
    ],
    closing: closing(
      'Redirigir y consolidar devuelve la señal que hoy se reparte; los botones conectan el blog con la venta.',
      'Mapa de redirecciones en noviembre; consolidación de duplicados entre diciembre y enero.'
    ),
    ...footer()
  }
})

add({
  slideId: 'capitulo-03',
  contentType: 'report-chapter',
  slots: {
    chapterLabel: 'Capítulo 03',
    productLabel: 'SEO',
    chapterNumeral: '03',
    runningLabel: 'Auditoría del Blog SKY',
    chapterTitle: 'Perú y el contenido',
    chapterLead: 'Perú es la mayor pérdida en rankings. No falta contenido: hay 241 artículos de Perú que perdieron posición y nueve que se borraron este mes.',
    contents: { label: 'En este capítulo', entries: [] }
  }
})

add({
  slideId: 'peru-alerta',
  contentType: 'report-findings',
  body: true,
  slots: {
    ...running('03 · Perú y el contenido'),
    eyebrow: 'Perú',
    heroFigure: '3',
    heroText: 'hallazgos sobre el contenido de Perú',
    title: 'El contenido de Perú existe; lo que falta es posición, orden y cuidado',
    lead: 'Antes de escribir artículos nuevos conviene recuperar los que ya tienen historia en Google.',
    alert: {
      label: 'Urgente',
      title: 'Nueve artículos de Perú se borraron después del 15 de octubre',
      text: 'Estaban publicados el 15 de octubre y hoy responden error, sin redirección. Hay que confirmar quién tiene acceso al WordPress y restaurarlos: la papelera los conserva 30 días.',
      items: [
        'catedral-de-tacna',
        'mercado-central-de-tacna',
        'como-llegar-a-ayacucho',
        'viajes-cusco',
        'volcan-chachani',
        'viajar-a-peru',
        'verano-en-peru',
        'mejor-comida-peruana',
        'musica-tipica-peruana'
      ]
    },
    columns: { severity: 'Severidad', finding: 'Hallazgo', owner: 'Evidencia y responsable' },
    findings: [
      {
        severity: 'high',
        severityLabel: 'Alto',
        title: 'Las guías de Perú que más visitas traían perdieron posición',
        detail: 'Trujillo pasó de unas <strong>5.300 visitas estimadas al mes a 241</strong>; Juliaca, de 3.400 a 88. Siguen publicadas.',
        evidence: `Evidencia ${ref('peru-rankings')}`,
        ownerLabel: 'Responsable',
        owner: 'Efeonce'
      },
      {
        severity: 'medium',
        severityLabel: 'Medio',
        title: 'Varias guías compiten por el mismo destino',
        detail: 'Seis artículos de Tacna, cinco de Tarapoto y siete de Machu Picchu. Uno fuerte por intención rinde más que varios débiles.',
        evidence: 'Revisión 23-10',
        ownerLabel: 'Responsable',
        owner: 'Efeonce + Natalia'
      },
      {
        severity: 'medium',
        severityLabel: 'Medio',
        title: 'Hay brechas reales en rutas que SKY opera',
        detail: 'Ayacucho quedó sin artículos; Cajamarca, Chiclayo y sus alrededores, Arequipa y Juliaca–Puno tienen poco contenido para su demanda.',
        evidence: `Evidencia ${ref('peru-cobertura')}`,
        ownerLabel: 'Responsable',
        owner: 'Efeonce + Natalia'
      }
    ],
    closing: closing(
      'La prioridad de Perú se cumple primero recuperando lo que ya rankeaba; las brechas reales se cubren después.',
      'Restaurar los nueve artículos esta semana y consolidar Tacna, Tarapoto y Machu Picchu en diciembre.'
    ),
    ...footer()
  }
})

add({
  slideId: 'peru-rankings',
  contentType: 'report-figure-comparison',
  body: true,
  slots: {
    chapterTab: '03',
    ...running('03 · Perú y el contenido'),
    eyebrow: { icon: 'search', label: 'Posiciones en Google Perú' },
    keyFigure: '−75 %',
    keyCaption: 'búsquedas en las que el blog aparece en el top 3 de Google Perú <strong>(de 387 a 98)</strong>',
    conclusion: 'Perú perdió tres de cada cuatro primeros lugares y no se recuperó como Chile',
    lead: 'Septiembre de 2025, antes de migrar, contra septiembre de 2026. Chile recuperó volumen hacia febrero; Perú no.',
    figureTitle: 'Visibilidad estimada del blog en Google Perú',
    legend: { current: 'Septiembre 2026', prior: 'Septiembre 2025' },
    metrics: [
      { metricIcon: 'posicion', name: 'Búsquedas en el top 3', unit: 'palabras clave', current: '98', prior: '387', direction: 'down:worse', delta: '−75 %' },
      { metricIcon: 'visita', name: 'Visitas desde Perú', unit: 'estimadas al mes', current: '6.749', prior: '51.284', direction: 'down:worse', delta: '−87 %' },
      { metricIcon: 'visita', name: 'Guía de Trujillo', unit: 'visitas al mes', current: '241', prior: '5.328', direction: 'down:worse', delta: '−95 %' },
      { metricIcon: 'visita', name: 'Guía de Juliaca', unit: 'visitas al mes', current: '88', prior: '3.436', direction: 'down:worse', delta: '−97 %' }
    ],
    note: { text: 'Estimaciones de Semrush para Perú; las guías de Trujillo y Juliaca comparan agosto de 2025 con hoy.' },
    provenance: [
      { label: 'Unidad', text: 'Palabras clave y visitas estimadas' },
      { label: 'Fuente', text: 'Semrush, base Perú, blog anterior y actual' },
      { label: 'Cobertura', text: 'Top 100 de Google Perú' }
    ],
    closing: closing(
      'La pérdida de Perú está en posiciones, no en cantidad de artículos.',
      'Refrescar y consolidar las guías con historia antes de abrir destinos nuevos.'
    ),
    ...footer()
  }
})

add({
  slideId: 'peru-cobertura',
  contentType: 'report-table',
  body: true,
  slots: {
    ...running('03 · Perú y el contenido'),
    eyebrow: 'Cobertura por destino',
    heroFigure: '17',
    heroText: 'destinos de Perú que SKY opera hoy; <strong>Ayacucho no tiene ningún artículo</strong>',
    tableTitle: 'Lima concentra los clics; varios destinos operados casi no traen visitas',
    lead: 'Nueve de los 17 destinos: los que más clics traen y los que casi no traen. Agosto y septiembre de 2026.',
    boardTitle: 'Destinos de Perú operados por SKY',
    legend: { label: 'Clics de Google' },
    tableColumns: [{ label: '#' }, { label: 'Destino' }, { label: 'Clics ago–sep' }, { label: 'Artículos' }],
    tableRows: [
      { entity: 'Lima', valueA: '634', valueB: '45' },
      { entity: 'Tumbes', valueA: '150', valueB: '5' },
      { entity: 'Tacna', valueA: '145', valueB: '12' },
      { entity: 'Cajamarca', valueA: '59', valueB: '3' },
      { entity: 'Cusco', valueA: '40', valueB: '14' },
      { entity: 'Ayacucho', valueA: '26', valueB: '0' },
      { entity: 'Chiclayo', valueA: '19', valueB: '6' },
      { entity: 'Trujillo', valueA: '16', valueB: '9' },
      { entity: 'Arequipa', valueA: '6', valueB: '5' }
    ],
    barScaleMax: '634',
    source: { label: 'Fuente', text: 'Google Search Console del blog y rutas publicadas por SKY al 23-10' },
    coverage: { label: 'Cobertura', text: 'Consultas visibles; Ayacucho, antes de que se borrara su artículo. Juliaca: 5 clics.' },
    closing: closing(
      'Cusco y Arequipa tienen artículos pero casi no traen visitas: es un problema de posición y de intención, no de cantidad.',
      'Priorizar Tacna, Ayacucho, Arequipa, Cusco y Juliaca–Puno en el plan editorial de diciembre y enero.'
    ),
    ...footer()
  }
})

add({
  slideId: 'capitulo-04',
  contentType: 'report-chapter',
  slots: {
    chapterLabel: 'Capítulo 04',
    productLabel: 'SEO',
    chapterNumeral: '04',
    runningLabel: 'Auditoría del Blog SKY',
    chapterTitle: 'Cuánto vale y qué hacemos',
    chapterLead: 'El valor del tráfico en publicidad, lo que se puede esperar de noviembre a enero y el plan de 90 días.',
    contents: { label: 'En este capítulo', entries: [] }
  }
})

add({
  slideId: 'valor-publicitario',
  contentType: 'report-figure-stat',
  body: true,
  slots: {
    chapterTab: '04',
    ...running('04 · Cuánto vale y qué hacemos'),
    eyebrow: { icon: 'target', label: 'Valor en publicidad' },
    conclusion: 'El blog genera hoy entre 6.000 y 16.000 dólares al mes en clics que no hay que comprar',
    lead: 'Es lo que costaría comprar en Google Ads los mismos clics que hoy llegan gratis desde la búsqueda orgánica, en Chile y Perú.',
    figureTitle: 'Valor mensual del tráfico orgánico, en dólares',
    statItems: [
      { metricIcon: 'clic', name: 'Hoy', context: 'US$ al mes, septiembre de 2026, Chile y Perú', value: '6–16', suffix: 'k' },
      { metricIcon: 'clic', name: 'Antes de migrar', context: 'US$ al mes, agosto de 2025, Chile y Perú', value: '28–45', suffix: 'k' },
      { metricIcon: 'posicion', name: 'Lo que dejó de generar', context: 'US$ al mes, antes de migrar contra hoy', value: '22–29', suffix: 'k' },
      { metricIcon: 'cita', name: 'Búsquedas de marca', context: 'equipaje, check-in y SKY Plus', value: '71', suffix: '%', unitLabel: 'del valor' },
      { metricIcon: 'visita', name: 'Destinos y consejos', context: 'búsquedas que no nombran a SKY', value: '29', suffix: '%', unitLabel: 'del valor' },
      { metricIcon: 'clic', name: 'Clics de septiembre', context: 'desde Google, base del cálculo', value: '26.631', unitLabel: 'clics' }
    ],
    note: { text: 'El extremo bajo es la estimación de Semrush; el alto aplica el costo por clic de las búsquedas de SKY a todos los clics.' },
    provenance: [
      { label: 'Unidad', text: 'Dólares por mes, costo por clic de cada país' },
      { label: 'Fuente', text: 'Semrush y Google Search Console × costo por clic' },
      { label: 'Cobertura', text: 'Chile y Perú; búsquedas sin detalle, extrapoladas' }
    ],
    closing: closing(
      'Es un rango orientativo, no un ahorro contable ni un retorno: dice cuánto costaría reemplazar el tráfico con publicidad.',
      'Reportarlo cada mes separando marca de destinos, con el mismo método, para leer su evolución.'
    ),
    ...footer()
  }
})

add({
  slideId: 'escenarios',
  contentType: 'report-scenarios',
  body: true,
  slots: {
    chapterTab: '04',
    ...running('04 · Cuánto vale y qué hacemos'),
    eyebrow: { icon: 'trend', label: 'Qué esperar de noviembre a enero' },
    keyFigure: '~65k',
    keyCaption: 'visitas orgánicas en enero de 2027 en el escenario base <strong>(enero de 2026: 67.940)</strong>',
    conclusion: 'Con el plan, la meta realista es volver al nivel del año anterior hacia enero',
    lead: 'Sin intervenir, enero quedaría cerca de 44.000. Son estimaciones para alinear expectativas, no un compromiso.',
    figureTitle: 'Visitas orgánicas por mes, por escenario',
    referenceLegend: 'Mismo mes del año anterior',
    scenarioChart: {
      periods: ['Nov 2026', 'Dic 2026', 'Ene 2027'],
      reference: { label: 'Año anterior', values: ['44.000', '49.500', '67.900'] },
      series: [
        { role: 'low', values: ['28.000', '32.000', '44.000'] },
        { role: 'base', values: ['44.000', '48.000', '65.000'] },
        { role: 'high', values: ['48.000', '55.000', '72.000'] }
      ]
    },
    note: { text: 'Las columnas son estimaciones; sólo la línea discontinua es un dato observado.' },
    scenarios: [
      { role: 'low', name: 'Sin intervenir', outcome: '~44.000 en enero', assumption: 'Sigue la tendencia actual de −35 % contra el año anterior.' },
      { role: 'base', name: 'Base', outcome: '~65.000 en enero', assumption: 'Correcciones técnicas en noviembre, temporada y guías de equipaje unificadas.' },
      { role: 'high', name: 'Estructural', outcome: '~75.000 al mes en 2027', assumption: 'Lo anterior más consolidación y volver a skyairline.com/blog en el primer trimestre.' }
    ],
    provenance: [
      { label: 'Unidad', text: 'Sesiones de búsqueda orgánica por mes' },
      { label: 'Fuente', text: 'Estimación de Efeonce sobre GA4 y Search Console' },
      { label: 'Cobertura', text: 'Referencia: noviembre 2025 a enero 2026' }
    ],
    closing: closing(
      'Lo técnico suele verse entre cuatro y ocho semanas después; las consolidaciones, en dos o tres meses.',
      'Medir contra el año anterior y revisar el escenario al cierre de diciembre.'
    ),
    ...footer()
  }
})

const PLAN_COLUMNS = { number: '#', action: 'Acción', metric: 'Resultado esperado', weeks: ['O', 'N', 'D', 'E'] }

add({
  slideId: 'plan-1',
  contentType: 'report-plan',
  body: true,
  slots: {
    ...running('Plan de 90 días'),
    eyebrow: 'Plan de 90 días',
    heroFigure: '10',
    heroText: 'acciones de octubre (O) a enero (E), en dos páginas',
    title: 'Primero lo urgente y lo que mejora todo el blog a la vez',
    lead: 'Las cinco primeras acciones no requieren escribir contenido: son restauración, configuración y servidor.',
    columns: PLAN_COLUMNS,
    actions: [
      { title: 'Restaurar los nueve artículos de Perú', detail: 'Confirmar quién tiene acceso y recuperarlos desde la papelera.', evidence: `Evidencia ${ref('peru-alerta')}`, impactLabel: 'Impacto', impact: '3', effortLabel: 'Esfuerzo', effort: '1', metric: '9 artículos en línea', metricNote: 'con su posición previa', weeks: '1' },
      { title: 'Exportar el Search Console anterior a migrar', detail: 'Google guarda 16 meses: esa historia vence entre noviembre y enero.', evidence: `Límites ${ref('limites')}`, impactLabel: 'Impacto', impact: '2', effortLabel: 'Esfuerzo', effort: '1', metric: 'Historia preservada', metricNote: 'julio a septiembre 2025', weeks: '1' },
      { title: 'Reinstalar la configuración SEO', detail: 'Descripciones, datos estructurados y autores en los 1.700 artículos.', evidence: `Evidencia ${ref('hallazgos-criticos')}`, impactLabel: 'Impacto', impact: '3', effortLabel: 'Esfuerzo', effort: '2', metric: '1.700 artículos', metricNote: 'con descripción y autor', weeks: '2' },
      { title: 'Cerrar la copia en Azure y enviar el mapa del sitio', detail: 'Restringir el origen, publicar robots.txt y registrar el mapa.', evidence: `Evidencia ${ref('hallazgos-criticos')}`, impactLabel: 'Impacto', impact: '3', effortLabel: 'Esfuerzo', effort: '1', metric: 'Una sola versión', metricNote: 'visible para Google', weeks: '2' },
      { title: 'Navidad y Año Nuevo antes del 15 de noviembre', detail: 'Año Nuevo en Santiago trajo 2.156 clics en 2025; más las cenas de Navidad.', evidence: 'Plan editorial', impactLabel: 'Impacto', impact: '2', effortLabel: 'Esfuerzo', effort: '2', metric: '+3.000 clics', metricNote: 'en diciembre, como 2025', weeks: '2' }
    ],
    closing: closing(
      'Contra el mismo mes del año anterior, con cortes a 28 y 56 días de cada cambio.',
      'Acceso de administrador a WordPress, el Search Console de skyairline.com y un contacto de TI.',
      ['Cómo lo mediremos', 'Qué necesitamos de ustedes']
    ),
    ...footer()
  }
})

add({
  slideId: 'plan-2',
  contentType: 'report-plan',
  body: true,
  slots: {
    ...running('Plan de 90 días'),
    eyebrow: 'Plan de 90 días',
    heroFigure: '10',
    heroText: 'acciones de octubre (O) a enero (E), en dos páginas',
    title: 'Después, el contenido: consolidar, recuperar Perú y conectar con la venta',
    lead: 'Con la base técnica corregida, cada artículo trabajado rinde más.',
    columns: PLAN_COLUMNS,
    actions: [
      { title: 'Redirigir artículos con error y limpiar enlaces', detail: 'Redirecciones al equivalente y 3.052 enlaces a su dirección final.', evidence: `Evidencia ${ref('hallazgos-contenido')}`, impactLabel: 'Impacto', impact: '2', effortLabel: 'Esfuerzo', effort: '2', metric: '0 errores con tráfico', metricNote: 'y enlaces de un salto', weeks: '2' },
      { title: 'Unificar las guías de equipaje y check-in', detail: 'Una guía por intención, con el Centro de Ayuda como fuente.', evidence: `Evidencia ${ref('cascada-2026')}`, impactLabel: 'Impacto', impact: '3', effortLabel: 'Esfuerzo', effort: '2', metric: 'Primer lugar', metricNote: 'en «sky equipaje»', weeks: '2-3' },
      { title: 'Botón de compra por destino', detail: 'Enlace a la ruta de SKY en cada guía y fin del código visible.', evidence: `Evidencia ${ref('hallazgos-contenido')}`, impactLabel: 'Impacto', impact: '2', effortLabel: 'Esfuerzo', effort: '1', metric: '1.126 guías', metricNote: 'enlazadas a su ruta', weeks: '2-3' },
      { title: 'Consolidar los artículos que compiten entre sí', detail: '41 grupos, 217 artículos: uno fuerte por intención.', evidence: `Evidencia ${ref('hallazgos-contenido')}`, impactLabel: 'Impacto', impact: '3', effortLabel: 'Esfuerzo', effort: '3', metric: '~170 redirecciones', metricNote: 'sin perder tráfico', weeks: '3-4' },
      { title: 'Recuperar Perú y cubrir alrededores de aeropuertos', detail: 'Tacna, Ayacucho, Arequipa y Puno; Arica–Putre y Chiclayo–Sipán.', evidence: `Evidencia ${ref('peru-rankings')}`, impactLabel: 'Impacto', impact: '3', effortLabel: 'Esfuerzo', effort: '3', metric: 'Top 3 de Perú', metricNote: 'de 98 hacia 200', weeks: '3-4' }
    ],
    closing: closing(
      'Cada artículo trabajado se mide a 28 y 56 días contra su propio punto de partida.',
      'Aprobar títulos y reseñas antes de redactar; decidir con TI la vuelta a skyairline.com/blog.',
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
    heroText: 'puntos que no pudimos verificar y que necesitamos cerrar con SKY',
    assertion: 'Lo que esta auditoría <strong>no puede afirmar</strong> todavía',
    lead: 'Ninguno cambia el diagnóstico, pero algunos afinan el plan.',
    limits: [
      { subject: 'Acciones manuales y seguridad', cause: 'Se revisan en la interfaz de Search Console: lo haremos con su acceso esta semana.' },
      { subject: 'Historia antes de la migración', cause: 'La propiedad de Search Console de skyairline.com no está disponible para nosotros y vence entre noviembre y enero.' },
      { subject: 'Indexación de la copia en Azure', cause: 'Sabemos que Google puede verla; confirmar si la indexó requiere el acceso de TI o de Search Console.' },
      { subject: 'Velocidad con usuarios reales', cause: 'Google no publicó datos de campo para el blog; la medición es de laboratorio.' }
    ],
    methodologyLabel: 'Cómo se hizo',
    methodology: [
      'Google Analytics 4 y Search Console de SKY, con datos al 21 de octubre de 2026.',
      'Semrush para Chile y Perú, antes y después de la migración.',
      'Resultados de Google en vivo del 23 de octubre para búsquedas clave.',
      'Revisión de las 1.700 publicaciones y de 110 direcciones antiguas del archivo histórico.',
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
    legalLine: `${EFEONCE_LEGAL_NAME_FALLBACK} · RUT ${EFEONCE_TAX_ID_FALLBACK} · Documento confidencial para uso exclusivo de SKY Airline · Cifras al 21 de octubre de 2026`
  }
})

// ─── Folios, índice y contenidos de capítulo (derivados del orden) ────────────────────────────────────────────

const total = pages.length
const pad = (value: number) => String(value).padStart(2, '0')
const folioOf = (slideId: string) => pad(pages.findIndex(page => page.slideId === slideId) + 1)

pages.forEach((page, index) => {
  if (page.body) page.slots.folio = { page: pad(index + 1), total: pad(total) }
  if (page.contentType === 'report-chapter') page.slots.pageFolio = pad(index + 1)
})

const chapterEntries: Record<string, Array<[string, string]>> = {
  'capitulo-01': [
    ['Tres etapas de la caída', 'tendencia'],
    ['Qué explica la caída de 2026', 'cascada-2026'],
    ['Marca y búsquedas generales', 'marca-vs-generica'],
    ['Por qué no es una penalización', 'sin-penalizacion']
  ],
  'capitulo-02': [
    ['Lo que afecta a todo el blog', 'hallazgos-criticos'],
    ['Lo que Google ve hoy', 'lo-que-google-ve'],
    ['Errores, duplicados y botones', 'hallazgos-contenido']
  ],
  'capitulo-03': [
    ['Artículos borrados y hallazgos de Perú', 'peru-alerta'],
    ['Posiciones en Google Perú', 'peru-rankings'],
    ['Cobertura por destino', 'peru-cobertura']
  ],
  'capitulo-04': [
    ['Valor en publicidad', 'valor-publicitario'],
    ['Escenarios de noviembre a enero', 'escenarios'],
    ['Plan de 90 días', 'plan-1']
  ]
}

for (const [chapterId, entries] of Object.entries(chapterEntries)) {
  const chapter = pages.find(page => page.slideId === chapterId)!

  ;(chapter.slots.contents as { entries: unknown[] }).entries = entries.map(([title, slideId]) => ({ title, folio: folioOf(slideId) }))
}

const index = pages.find(page => page.slideId === 'indice')!

index.slots = {
  ...running('Contenido'),
  eyebrow: 'Contenido',
  title: 'Qué encontrará en este informe',
  titleColumn: 'Sección',
  pageColumn: 'Página',
  entries: [
    { mark: 'R', title: 'Resumen ejecutivo', folio: folioOf('resumen') },
    { mark: '01', title: 'Qué pasó con el tráfico', folio: folioOf('capitulo-01') },
    { mark: '02', title: 'Qué se rompió en la migración', folio: folioOf('capitulo-02') },
    { mark: '03', title: 'Perú y el contenido', folio: folioOf('capitulo-03') },
    { mark: '04', title: 'Cuánto vale y qué hacemos', folio: folioOf('capitulo-04') },
    { mark: 'P', title: 'Plan de 90 días', folio: folioOf('plan-1') },
    { mark: 'L', title: 'Límites y método', folio: folioOf('limites') }
  ],
  folio: { page: folioOf('indice'), total: pad(total) },
  ...footer()
}

const plan = {
  tenderId: 'efeonce-sky-auditoria-seo-blog-2026-10',
  slides: pages.map(({ slideId, contentType, slots }) => ({ slideId, contentType, slots }))
}

const serialized = JSON.stringify(plan, null, 2).replace(/@@ref:([a-z0-9-]+)@@/g, (_match, slideId: string) => {
  if (!pages.some(page => page.slideId === slideId)) throw new Error(`Referencia a una página inexistente: ${slideId}`)

  return `p. ${folioOf(slideId)}`
})

const out = path.resolve(process.argv[2] ?? 'outputs/sky-blog-seo-audit-2026-10-23/informe/sky-blog-audit.plan.json')

const main = async () => {
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, `${serialized}\n`, 'utf8')
  console.log(`plan: ${pages.length} páginas → ${out}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
