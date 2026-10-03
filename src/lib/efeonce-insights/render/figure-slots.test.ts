/**
 * TASK-1889 Slice 5 — reglas de página de figura que salieron de ediciones REALES (Berel/Sky, 2026-09-25).
 */

import { describe, expect, it } from 'vitest'

import { buildFigureSlides, FIGURE_CAPACITY } from './figure-slots'

const fact = (factId: string, value: number, metricId: string, channelId?: string) =>
  [factId, { factId, value, unit: 'count', label: metricId, metricId, evidenceRef: `ev-${factId}`, ...(channelId ? { channelId } : {}) }] as const

const grouped = (channels: Array<string | null>) => ({
  specVersion: 'chart_spec_v1', chartId: 'c', family: 'bar_grouped', relation: 'comparison', title: 'Figura', unit: 'count',
  dimensionLabels: ['A', 'B'], dimensionChannelIds: channels, references: [], scale: { kind: 'linear', baseline: 0 }, tabularEquivalent: { columns: [], rows: [] },
  series: [
    { seriesId: 'p', label: 'Período anterior', factIds: ['p1', 'p2'], unit: 'count' },
    { seriesId: 'c', label: 'Período', factIds: ['c1', 'c2'], unit: 'count' }
  ]
}) as never

const byId = new Map([fact('c1', 9377, 'clicks'), fact('p1', 10662, 'clicks'), fact('c2', 512113, 'impressions'), fact('p2', 566297, 'impressions')]) as never

describe('qué página recibe una figura agrupada', () => {
  it('métricas que comparten canal (SEO: todas `google`) van a comparación, cada una en su escala', () => {
    // Caso real Berel: en un eje común, 9.377 clics contra 512.113 impresiones quedaba invisible.
    const [slide] = buildFigureSlides(grouped(['google', 'google']), byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.kind).toBe('comparison')
  })

  it('canales distintos (un motor por dimensión) van a columnas sobre un eje', () => {
    const [slide] = buildFigureSlides(grouped(['chatgpt', 'gemini']), byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.kind).toBe('columns')
  })
})

describe('texto de la página de figura con datos reales (revisión de TASK-1846 sobre Berel y Sky)', () => {
  const withMethod = new Map([
    ['c1', { factId: 'c1', value: 9377, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e', method: { name: 'gsc_window_aggregate' } }],
    ['p1', { factId: 'p1', value: 10662, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e', method: { name: 'gsc_window_aggregate' } }],
    ['c2', { factId: 'c2', value: 1, unit: 'count', label: 'Pos', metricId: 'page_one_keywords', evidenceRef: 'e', method: { name: 'dataforseo_serp_rank' } }],
    ['p2', { factId: 'p2', value: 2, unit: 'count', label: 'Pos', metricId: 'page_one_keywords', evidenceRef: 'e', method: { name: 'dataforseo_serp_rank' } }]
  ]) as never

  const claim = { claimId: 'k', text: 'Clics orgánicos: 9.377 (período anterior 10.662, variación −12,1 %).', factIds: ['c1', 'p1'] }

  it('la fuente es la de los hechos que la figura dibuja, legible y sin repetir', () => {
    const [slide] = buildFigureSlides(grouped([null, null]), withMethod, undefined, [claim], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.sourceText).toBe('Google Search Console · Posiciones en buscadores')
  })

  it('«Lo que significa» que repite la conclusión no se dibuja', () => {
    const reading = { chartId: 'c', meaning: { ...claim, claimId: 'm' }, nextStep: null }
    const [slide] = buildFigureSlides(grouped([null, null]), withMethod, reading as never, [claim], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.conclusion).toBe(claim.text)
    expect(slide!.closing).toEqual([])
  })
})

describe('metas', () => {
  const facts = new Map([
    ['ftr', { factId: 'ftr', value: 90.9, unit: 'percent', label: 'FTR', metricId: 'ftr', evidenceRef: 'e' }],
    ['ftr-prev', { factId: 'ftr-prev', value: 96.5, unit: 'percent', label: 'FTR', metricId: 'ftr', evidenceRef: 'e' }],
    ['ftr-target', { factId: 'ftr-target', value: 80, unit: 'percent', label: 'Meta FTR', metricId: 'target.ftr', evidenceRef: 'e', role: 'reference' }]
  ]) as never

  const chart = {
    specVersion: 'chart_spec_v1', chartId: 'b', family: 'bullet', relation: 'target', title: 'FTR', unit: 'percent', series: [], dimensionLabels: ['Sky'],
    references: [], scale: { kind: 'linear', baseline: 0 }, tabularEquivalent: { columns: [], rows: [] },
    data: { kind: 'bullet', direction: 'higher_is_better', items: [{ itemId: 'i', label: 'Sky', valueFactId: 'ftr', targetFactId: 'ftr-target' }] }
  } as never

  const comparison = { claimId: 'cmp', text: 'FTR: 90,9 % (período anterior 96,5 %, variación −5,6 pp).', factIds: ['ftr', 'ftr-prev'] }
  const againstTarget = { claimId: 'tgt', text: 'Sky: 90,9 %, sobre la meta de 80,0 %.', factIds: ['ftr', 'ftr-target'] }

  it('una métrica en % se lee contra la meta en pp, no como «114 %»', () => {
    const [slide] = buildFigureSlides(chart, facts, undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect((slide!.body.bulletRows as Array<{ pct: string }>)[0]!.pct).toBe('10,9 pp')
  })

  it('sin lectura, la conclusión es la afirmación que cita la meta, no la comparación de períodos', () => {
    const [slide] = buildFigureSlides(chart, facts, undefined, [comparison, againstTarget], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.conclusion).toBe(againstTarget.text)
  })
})

describe('predicado compartido con el planner', () => {
  it('hasFigurePage es el mismo criterio del render: familia sin página o sin hechos ⇒ false', async () => {
    const { hasFigurePage } = await import('./figure-slots')

    expect(hasFigurePage(grouped([null, null]), byId)).toBe(true)
    expect(hasFigurePage({ ...(grouped([null, null]) as object), family: 'pie' } as never, byId)).toBe(false)
    expect(hasFigurePage(grouped([null, null]), new Map() as never)).toBe(false)
  })
})

describe('bajada', () => {
  it('no repite el hecho principal de la conclusión con otras palabras (caso Berel clics)', () => {
    const facts = new Map([
      ['c1', { factId: 'c1', value: 9377, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e' }],
      ['p1', { factId: 'p1', value: 10662, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e' }],
      ['c2', { factId: 'c2', value: 5, unit: 'count', label: 'Imp', metricId: 'impressions', evidenceRef: 'e' }],
      ['p2', { factId: 'p2', value: 6, unit: 'count', label: 'Imp', metricId: 'impressions', evidenceRef: 'e' }]
    ]) as never

    const reading = { chartId: 'c', conclusion: { claimId: 'k', text: 'Los clics bajaron de 10.662 a 9.377 (−12,1 %).', factIds: ['c1', 'p1'] }, nextStep: null }
    const sameFact = { claimId: 'a', text: 'Clics orgánicos: 9.377 (período anterior 10.662).', factIds: ['c1', 'p1'] }
    const other = { claimId: 'b', text: 'Impresiones: 5 (período anterior 6).', factIds: ['c2', 'p2'] }

    const [withOther] = buildFigureSlides(grouped([null, null]), facts, reading as never, [sameFact, other], 'es-CL', FIGURE_CAPACITY.report)
    const [alone] = buildFigureSlides(grouped([null, null]), facts, reading as never, [sameFact], 'es-CL', FIGURE_CAPACITY.report)

    expect(withOther!.lead).toBe(other.text)
    expect(alone!.lead).toBeNull()
  })
})

describe('empates (caso Berel: cuatro motores con 2 de 6)', () => {
  const engines = ['gemini', 'aio', 'chatgpt', 'perplexity']

  const entries: Array<[string, Record<string, unknown>]> = [
    ...engines.map((id): [string, Record<string, unknown>] => [id, { factId: id, value: 2, unit: 'count', label: `Presencia en ${id}`, metricId: 'presence', evidenceRef: 'e' }]),
    ['clicks', { factId: 'clicks', value: 10, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e', comparisonFactId: 'clicks-prev' }],
    ['clicks-prev', { factId: 'clicks-prev', value: 12, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e' }]
  ]

  const facts = new Map(entries) as never

  const chart = {
    specVersion: 'chart_spec_v1', chartId: 'chart.aeo.count', family: 'bar', relation: 'comparison', title: 'Presencia por motor', unit: 'count',
    dimensionLabels: engines, dimensionChannelIds: ['gemini', 'google_ai_overview', 'chatgpt', 'perplexity'], references: [],
    scale: { kind: 'linear', baseline: 0 }, tabularEquivalent: { columns: [], rows: [] },
    series: [{ seriesId: 's', label: 'Período', factIds: engines, unit: 'count' }]
  } as never

  const tie = { claimId: 'chart.aeo.count.conclusion', text: 'Todos los motores mencionan la marca en 2 de 6.', factIds: engines }

  it('el título de una esencial de empate es el de la figura, no el del primer motor', async () => {
    const { essentialTitleOf } = await import('./figure-slots')

    expect(essentialTitleOf(tie, facts, [chart])).toBe('Presencia por motor')
    // Un solo hecho con su período anterior sigue titulándose con su métrica.
    expect(essentialTitleOf({ claimId: 'k', text: 'Clics…', factIds: ['clicks', 'clicks-prev'] }, facts, [chart])).toBe('Clics')
  })

  it('la bajada no repite un miembro del empate', () => {
    const member = { claimId: 'm', text: 'Presencia en Google AI Overview: 2 de 6.', factIds: ['aio'] }
    const [slide] = buildFigureSlides(chart, facts, { chartId: 'chart.aeo.count', conclusion: tie, nextStep: null } as never, [member], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.conclusion).toBe(tie.text)
    expect(slide!.lead).toBeNull()
  })
})

describe('nombre común de un empate (una sola función para esencial y cifra)', () => {
  it('usa el nombre de la familia de métrica; sin él, el título de la figura sin su unidad', async () => {
    const { groupNameOf } = await import('./figure-slots')
    const fact = (factId: string, metricId: string) => ({ factId, value: 2, unit: 'count', label: factId, metricId, evidenceRef: 'e' }) as never

    const chart = (title: string) => ({ chartId: 'c', title, series: [{ factIds: ['a', 'b'] }] }) as never

    // Caso Berel: la presencia por motor tiene nombre de familia.
    expect(groupNameOf([fact('a', 'presence.gemini'), fact('b', 'presence.chatgpt')], [chart('Motores de respuesta · Cantidad')])).toBe('Presencia por motor')
    // Sin nombre de familia: nunca «· Cantidad» ni «(0 a 100)».
    expect(groupNameOf([fact('a', 'otra.a'), fact('b', 'otra.b')], [chart('Motores de respuesta · Cantidad')])).toBe('Motores de respuesta')
    expect(groupNameOf([fact('a', 'otra.a'), fact('b', 'otra.b')], [chart('Puntaje de visibilidad (0 a 100)')])).toBe('Puntaje de visibilidad')
  })
})

describe('una sola regla de variación: triángulo = valor, tono = mejor o peor', () => {
  const f = (over: Record<string, unknown>) => ({ module: 'ico', metricId: 'm', unit: 'ratio', ...over }) as never

  it('posición: #5,8 → #6,6 sube el número y es peor (caso Berel)', async () => {
    const { trendOf } = await import('./figure-slots')
    const position = f({ module: 'seo', metricId: 'avg_position', unit: 'position' })

    expect(trendOf(6.6, 5.8, position, [])).toMatchObject({ direction: 'up', tone: 'worse', value: 'up:worse' })
    expect(trendOf(5.8, 6.6, position, []).value).toBe('down:better')
  })

  // Forma REAL de los hechos del adapter ICO (ico-adapter.ts `targetFacts`): el hecho de valor es `rpa`/`otd`/`ftr` y
  // sus referencias son `target.<métrica>`/`band.<métrica>` con la métrica en `dimension.metric`. Un fixture que
  // compartiera `metricId` pasaba por construcción mientras Sky salía neutro (revisión de 1846, 2026-09-25).
  const reference = (kind: 'target' | 'band', metric: string, direction: string) =>
    f({ metricId: `${kind}.${metric}`, role: 'reference', dimension: { metric, direction } })

  const icoReferences = [
    reference('target', 'rpa', 'lower_is_better'), reference('band', 'rpa', 'lower_is_better'),
    reference('target', 'otd', 'higher_is_better'), reference('band', 'otd', 'higher_is_better'),
    reference('target', 'ftr', 'higher_is_better'), reference('band', 'ftr', 'higher_is_better')
  ]

  it('Sky con las referencias ICO reales: RpA ▼ mejor, OTD ▲ mejor, FTR ▼ peor', async () => {
    const { trendOf } = await import('./figure-slots')

    expect(trendOf(1.33, 1.44, f({ metricId: 'rpa' }), icoReferences).value).toBe('down:better')
    expect(trendOf(92.1, 90.3, f({ metricId: 'otd', unit: 'percent' }), icoReferences).value).toBe('up:better')
    expect(trendOf(80.2, 85.8, f({ metricId: 'ftr', unit: 'percent' }), icoReferences).value).toBe('down:worse')
  })

  it('la dirección que declara el propio hecho manda sobre la inferida', async () => {
    const { trendOf } = await import('./figure-slots')
    const own = f({ metricId: 'rpa', dimension: { direction: 'lower_is_better' } })

    expect(trendOf(1.33, 1.44, own, []).value).toBe('down:better')
  })

  it('sin dirección declarada, tono neutro (nunca adivinado); sin cambio, plano', async () => {
    const { trendOf } = await import('./figure-slots')

    expect(trendOf(9377, 10662, f({ metricId: 'delivered.completed', unit: 'count' }), []).value).toBe('down:neutral')
    // Con dirección declarada por métrica (TASK-1974), los clics que bajan son peor.
    expect(trendOf(9377, 10662, f({ metricId: 'clicks', unit: 'count' }), []).value).toBe('down:worse')
    expect(trendOf(3, 3, f({}), []).value).toBe('flat:neutral')
  })
})

// ─── TASK-1975 — figuras del criterio con página PDF ─────────────────────────────────────────────

describe('TASK-1975 — cascada, waffle, dona, apiladas y cifras', () => {
  const spec = (overrides: Record<string, unknown>) => ({
    specVersion: 'chart_spec_v1', chartId: 'chart.x', relation: 'composition', title: 'Figura', unit: 'count', series: [],
    dimensionLabels: [], references: [], scale: { kind: 'linear', baseline: 0 }, tabularEquivalent: { columns: [], rows: [] },
    ...overrides
  }) as never

  const facts = (entries: Array<[string, number | null, string?]>) =>
    new Map(entries.map(([factId, value, unit]) => [factId, { factId, value, unit: unit ?? 'count', label: factId, metricId: factId, module: 'seo', evidenceRef: 'e' }])) as never

  const waterfall = (steps: Array<[string, boolean]>) =>
    spec({ chartId: 'chart.seo.drivers.query', family: 'waterfall', relation: 'decomposition', data: { kind: 'waterfall', steps: steps.map(([factId, isTotal]) => ({ stepId: factId, label: factId, factId, isTotal })) } })

  it('cascada que cuadra: totales, pasos con signo y leyenda con «Restó» sólo si algo restó', async () => {
    const { hasFigurePage } = await import('./figure-slots')
    const chart = waterfall([['julio', true], ['servicios', false], ['home', false], ['agosto', true]])
    const byId = facts([['julio', 1102], ['servicios', 96], ['home', -23], ['agosto', 1175]])
    const [slide] = buildFigureSlides(chart, byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.kind).toBe('waterfall')
    expect(slide!.keyFigure).toBe('+73')
    expect((slide!.body as { waterfallSteps: unknown[] }).waterfallSteps).toEqual([
      { label: 'julio', value: '1.102', kind: 'start' },
      { label: 'servicios', value: '+96', kind: 'add' },
      { label: 'home', value: '−23', kind: 'remove' },
      { label: 'agosto', value: '1.175', kind: 'end' }
    ])
    expect((slide!.body as { legend: { removed?: string } }).legend.removed).toBe('Restó')
    expect(hasFigurePage(chart, byId)).toBe(true)
  })

  it('una cascada que no cuadra se rechaza con causa (caso Berel alterado)', () => {
    const chart = waterfall([['julio', true], ['servicios', false], ['home', false], ['agosto', true]])

    expect(() => buildFigureSlides(chart, facts([['julio', 1102], ['servicios', 96], ['home', -23], ['agosto', 1290]]), undefined, [], 'es-CL', FIGURE_CAPACITY.report))
      .toThrow(/no cuadra: 1\.102 \+ 96 − 23 ≠ 1\.290/)
  })

  it('una cascada con más pasos que la capacidad no se emite (nunca se pagina)', () => {
    const steps: Array<[string, boolean]> = [['a', true], ...Array.from({ length: 7 }, (_, i) => [`s${i}`, false] as [string, boolean]), ['z', true]]
    const byId = facts([['a', 10], ...Array.from({ length: 7 }, (_, i) => [`s${i}`, 1] as [string, number]), ['z', 17]])

    expect(buildFigureSlides(waterfall(steps), byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)).toHaveLength(1)
    expect(buildFigureSlides(waterfall(steps), byId, undefined, [], 'es-CL', FIGURE_CAPACITY.deck)).toEqual([])
  })

  const waffle = (ids: string[], totalFactId: string | null = null) =>
    spec({ chartId: 'chart.aeo.waffle.sentiment', family: 'waffle', data: { kind: 'waffle', parts: ids.map(id => ({ partId: id, label: id, factId: id })), totalFactId } })

  it('waffle de 8 respuestas: cuentas por parte y nota de qué es un cuadro', () => {
    const [slide] = buildFigureSlides(waffle(['positivas', 'neutras']), facts([['positivas', 5], ['neutras', 3]]), undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.body).toMatchObject({ waffleParts: [{ label: 'positivas', count: '5' }, { label: 'neutras', count: '3' }], note: { text: 'Cada cuadro es una unidad; el total es 8.' } })
  })

  it('waffle de más de 100 unidades, con conteos no enteros o con más de 4 partes no se emite; total declarado que no cuadra se rechaza', () => {
    expect(buildFigureSlides(waffle(['a', 'b']), facts([['a', 80], ['b', 21]]), undefined, [], 'es-CL', FIGURE_CAPACITY.report)).toEqual([])
    expect(buildFigureSlides(waffle(['a', 'b']), facts([['a', 1.5], ['b', 2]]), undefined, [], 'es-CL', FIGURE_CAPACITY.report)).toEqual([])
    expect(buildFigureSlides(waffle(['a', 'b', 'c', 'd', 'e']), facts([['a', 1], ['b', 1], ['c', 1], ['d', 1], ['e', 1]]), undefined, [], 'es-CL', FIGURE_CAPACITY.report)).toEqual([])
    expect(() => buildFigureSlides(waffle(['a', 'b'], 't'), facts([['a', 5], ['b', 3], ['t', 9]]), undefined, [], 'es-CL', FIGURE_CAPACITY.report)).toThrow(/no suma su total/)
  })

  const donut = (ids: string[]) =>
    spec({ chartId: 'chart.aeo.donut.ai-source', family: 'donut', dimensionLabels: ids, series: [{ seriesId: 'parts', label: 'p', factIds: ids, unit: 'count' }] })

  it('dona: participación por restos mayores que suma 100; centro = total sin tarjeta, parte principal con tarjeta', () => {
    const byId = facts([['chatgpt', 19], ['gemini', 12], ['otros', 19], ['ai_sessions', 50]])
    const [plain] = buildFigureSlides(donut(['chatgpt', 'gemini', 'otros']), byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect((plain!.body as { donutParts: Array<{ share: string }> }).donutParts.map(part => part.share)).toEqual(['38 %', '24 %', '38 %'])
    expect((plain!.body as { donutCenter: unknown }).donutCenter).toEqual({ value: '50', label: 'en total' })

    const [carded] = buildFigureSlides(donut(['chatgpt', 'gemini', 'otros']), byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report, { statFactIds: new Set(['ai_sessions']) })

    expect((carded!.body as { donutCenter: unknown }).donutCenter).toEqual({ value: '38 %', label: 'chatgpt' })
  })

  it('dona: una parte con valor que redondea a 0 se lee «<1 %», nunca «0 %» (caso real Berel 2026-09)', () => {
    const byId = facts([['chatgpt', 1648], ['gemini', 30], ['otros', 8]])
    const [slide] = buildFigureSlides(donut(['chatgpt', 'gemini', 'otros']), byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect((slide!.body as { donutParts: Array<{ share: string }> }).donutParts.map(part => part.share)).toEqual(['98 %', '2 %', '<1 %'])
  })

  it('una dona con 1 parte o con más de 3 no se emite', () => {
    expect(buildFigureSlides(donut(['a']), facts([['a', 3]]), undefined, [], 'es-CL', FIGURE_CAPACITY.report)).toEqual([])
    expect(buildFigureSlides(donut(['a', 'b', 'c', 'd']), facts([['a', 1], ['b', 1], ['c', 1], ['d', 1]]), undefined, [], 'es-CL', FIGURE_CAPACITY.report)).toEqual([])
  })

  it('apiladas: segmento base abajo, total por período, participación base y anotación de la variación base', () => {
    const chart = spec({
      chartId: 'chart.seo.stacked.site-engagement', family: 'bar_stacked', dimensionLabels: ['agosto de 2026', 'septiembre de 2026'],
      series: [
        { seriesId: 'engaged', label: 'Con interacción', factIds: ['e0', 'e1'], unit: 'count' },
        { seriesId: 'unengaged', label: 'Sin interacción', factIds: ['u0', 'u1'], unit: 'count' }
      ]
    })

    const [slide] = buildFigureSlides(chart, facts([['e0', 530], ['u0', 490], ['e1', 772], ['u1', 512]]), undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.keyFigure).toBe('772')
    expect((slide!.body as { stackedPeriods: unknown }).stackedPeriods).toEqual([
      { label: 'agosto de 2026', segments: ['530', '490'], total: '1.020', baseShare: '52 % con interacción' },
      { label: 'septiembre de 2026', segments: ['772', '512'], total: '1.284', baseShare: '60 % con interacción' }
    ])
    expect((slide!.body as { stackedAnnotation: { direction: string } }).stackedAnnotation.direction).toBe('up')
  })

  it('cifras: sin cifra principal; valor, prefijo y sufijo separados; «Menor es mejor» invierte el tono; sin dato es «—», nunca 0', async () => {
    const { buildStatSlides } = await import('./figure-slots')

    const byId = new Map([
      ['pos', { factId: 'pos', value: 6.9, unit: 'position', label: 'Posición', metricId: 'position', module: 'seo', evidenceRef: 'e', comparisonFactId: 'pos.prev', window: { start: '2026-09-01', endExclusive: '2026-10-01' } }],
      ['pos.prev', { factId: 'pos.prev', value: 5.7, unit: 'position', label: 'Posición', metricId: 'position', module: 'seo', evidenceRef: 'e', window: { start: '2026-08-01', endExclusive: '2026-09-01' } }],
      ['etv', { factId: 'etv', value: null, unit: 'count', label: 'Tráfico', metricId: 'organic_etv', module: 'seo', evidenceRef: 'e', window: { start: '2026-09-01', endExclusive: '2026-10-01' } }]
    ]) as never

    const stat = {
      figureId: 'stats.seo', question: 'value_change', title: 'Cifras del período',
      note: { claimId: 'n', text: 'El tráfico estimado se calcula con la posición y el volumen.', factIds: [] },
      items: [
        { itemId: 'pos', label: 'Posición media', factId: 'pos', comparisonFactId: 'pos.prev', direction: 'lower_is_better', estimated: false },
        { itemId: 'etv', label: 'Tráfico estimado', factId: 'etv', comparisonFactId: null, direction: 'higher_is_better', estimated: true }
      ]
    } as never

    const [slide] = buildStatSlides(stat, byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)
    const items = (slide!.body as { statItems: Array<Record<string, string>> }).statItems

    expect(slide!.keyFigure).toBeNull()
    // La nota es una afirmación del plan: se imprime su texto, nunca el objeto.
    expect((slide!.body as { note: { text: string } }).note.text).toBe('El tráfico estimado se calcula con la posición y el volumen.')
    expect(items[0]).toMatchObject({ name: 'Posición media', prefix: '#', value: '6,9', trend: 'up:worse', lowerIsBetter: 'Menor es mejor' })
    expect(items[0]!.versus).toMatch(/^vs <strong>#5,7<\/strong> en /)
    expect(items[1]).toMatchObject({ name: 'Tráfico estimado', estimated: 'Estimado', value: '—' })
    expect(items[1]!.noData).toMatch(/^Sin dato en /)
  })

  it('un nombre de cifra de más de 3 palabras se rechaza con causa, nunca se trunca', async () => {
    const { buildStatSlides } = await import('./figure-slots')
    const byId = new Map([['c', { factId: 'c', value: 3, unit: 'count', label: 'c', metricId: 'clicks', module: 'seo', evidenceRef: 'e' }]]) as never
    const stat = { figureId: 's', question: 'value_change', title: 't', items: [{ itemId: 'c', label: 'Tráfico orgánico estimado mensual', factId: 'c', comparisonFactId: null, direction: null, estimated: false }] } as never

    expect(() => buildStatSlides(stat, byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)).toThrow(/4 palabras/)
  })
})

