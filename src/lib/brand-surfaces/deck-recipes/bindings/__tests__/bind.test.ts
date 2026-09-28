import { describe, expect, it } from 'vitest'

import type { DeckPlan } from '../../types'
import { bindDeckSlotsWith } from '../core'
import { MONEY_PLACEHOLDER } from '../binders/money'
import { LOGO_WALL_MIN, SAMPLE_MARKS } from '../map'
import type { DeckBindingEvidence, DeckBindingSources, DeckSlotFact, SlotBinding } from '../types'

const evidence = (id: string, extra: Partial<DeckBindingEvidence> = {}): DeckBindingEvidence => ({
  evidenceId: id,
  classification: 'measured',
  audience: 'client_facing',
  locator: `caso publicado ${id}`,
  method: 'métricas de entrega',
  asOf: '2026-08-01T00:00:00.000Z',
  sourceAssetId: null,
  ...extra
})

const attested = (id: string, extra: Partial<DeckBindingEvidence> = {}) =>
  evidence(id, { classification: 'attested', sourceAssetId: `asset-doc-${id}`, ...extra })

const sources = (facts: DeckSlotFact[], extra: Partial<DeckBindingSources> = {}): DeckBindingSources => ({
  audience: 'client_facing',
  proposal: {
    proposalId: 'prop-1',
    clientOrganizationId: 'org-cliente',
    evidence: [
      evidence('prev-m1'),
      evidence('prev-m2', { asOf: '2026-07-01T00:00:00.000Z' }),
      evidence('prev-m3'),
      evidence('prev-m4'),
      evidence('prev-internal', { audience: 'internal' }),
      evidence('prev-illustrative', { classification: 'illustrative' }),
      attested('prev-a1'),
      attested('prev-a2'),
      attested('prev-a3'),
      attested('prev-a4'),
      attested('prev-no-doc', { sourceAssetId: null })
    ]
  },
  clientLogo: { logoAssetId: 'asset-logo', logoOnDarkAssetId: 'asset-logo-dark' },
  intentAssets: {},
  facts,
  ...extra
})

const slide = (recipeId: string, slots: Record<string, unknown> = {}) => ({ recipeId, slots })
const plan = (...slides: ReturnType<typeof slide>[]): DeckPlan => ({ document: 'proposal', slides })

const traceOf = (bindings: SlotBinding[], slot: string, slideIndex = 0) =>
  bindings.find(entry => entry.slot === slot && entry.slideIndex === slideIndex)

const figure = (factId: string, recipeId: string, slotName: string, evidenceRef: string, value = '+25 %', extra: Partial<DeckSlotFact> = {}): DeckSlotFact =>
  ({ kind: 'figure', factId, target: { recipeId, slot: slotName }, value, label: 'etiqueta', evidenceRef, ...extra }) as DeckSlotFact

describe('client-logo — Account 360', () => {
  it('liga la variante para fondo oscuro en una portada oscura', () => {
    const result = bindDeckSlotsWith(plan(slide('cover-proposal-orbit', { clientName: 'Sky' })), sources([]))

    expect(result.plan.slides[0]!.slots!.clientLogo).toEqual({ assetId: 'asset-logo-dark', alt: 'Sky', variant: 'on-dark' })
    expect(traceOf(result.bindings, 'clientLogo')).toMatchObject({ status: 'bound', source: 'account-360' })
  })

  it('una portada oscura sin variante oscura queda sin ligar y no compone', () => {
    const result = bindDeckSlotsWith(
      plan(slide('cover-proposal-orbit', { clientLogo: 'logo-a-mano.svg' })),
      sources([], { clientLogo: { logoAssetId: 'asset-logo', logoOnDarkAssetId: null } })
    )

    expect(traceOf(result.bindings, 'clientLogo')).toMatchObject({ status: 'unbound', reason: 'no-on-dark-logo' })
    expect(result.plan.slides[0]!.slots!.clientLogo).toBeUndefined()
    expect(result.issues.some(entry => entry.code === 'slot-required-missing' && entry.slot === 'clientLogo')).toBe(true)
    expect(result.ok).toBe(false)
  })

  it('sin logo en Account 360 queda `no-logo`; fuera de una propuesta, `no-proposal`', () => {
    const noLogo = bindDeckSlotsWith(plan(slide('cover-proposal-dawn')), sources([], { clientLogo: null }))
    const brand = bindDeckSlotsWith(plan(slide('cover-proposal-dawn')), sources([], { proposal: null, clientLogo: null }))

    expect(traceOf(noLogo.bindings, 'clientLogo')?.reason).toBe('no-logo')
    expect(traceOf(brand.bindings, 'clientLogo')?.reason).toBe('no-proposal')
  })
})

describe('metric — cifras con evidencia medida', () => {
  it('liga valor, etiqueta, fuente visible (locator) y fecha desde el hecho', () => {
    const facts = [
      figure('f1', 'decision-why-us', 'facts', 'prev-m1', '+90'),
      figure('f2', 'decision-why-us', 'facts', 'prev-m2', '5'),
      figure('f3', 'decision-why-us', 'facts', 'prev-m3', '+10'),
      figure('f4', 'decision-why-us', 'facts', 'prev-m4', '1'),
      figure('f5', 'decision-why-us', 'facts', 'prev-m1', 'En vivo'),
      figure('f6', 'decision-why-us', 'facts', 'prev-m2', 'Revenue')
    ]

    const result = bindDeckSlotsWith(plan(slide('decision-why-us')), sources(facts))
    const values = result.plan.slides[0]!.slots!.facts as { value: string; source: string }[]

    expect(values.map(entry => entry.value)).toEqual(['+90', '5', '+10', '1', 'En vivo', 'Revenue'])
    expect(values[0]!.source).toBe('caso publicado prev-m1')
    expect(traceOf(result.bindings, 'facts')).toMatchObject({ status: 'bound', source: 'proposal-evidence', asOf: '2026-07-01T00:00:00.000Z' })
    expect(traceOf(result.bindings, 'source')).toMatchObject({ status: 'bound' })
    expect(result.plan.slides[0]!.slots!.source).toContain('caso publicado prev-m1')
  })

  it('nunca liga una cifra desde el texto del plan: sin hecho, el valor del plan se quita', () => {
    const result = bindDeckSlotsWith(
      plan(slide('content-focus', { proof: '62 %', source: 'lo dijo el modelo' }), slide('content-pricing', { amounts: '$1.200.000' })),
      sources([])
    )

    expect(result.plan.slides[0]!.slots!.proof).toBeUndefined()
    expect(result.plan.slides[0]!.slots!.source).toBeUndefined()
    expect(traceOf(result.bindings, 'proof')).toMatchObject({ status: 'unbound', reason: 'no-evidence' })
    expect(result.plan.slides[1]!.slots!.amounts).toBe(MONEY_PLACEHOLDER)
  })

  it('una evidencia ilustrativa o sin fuente nunca liga una cifra real', () => {
    const result = bindDeckSlotsWith(plan(slide('content-focus')), sources([figure('f1', 'content-focus', 'proof', 'prev-illustrative')]))

    expect(traceOf(result.bindings, 'proof')).toMatchObject({ status: 'unbound', reason: 'no-evidence' })
  })

  it('el arco de medida exige una proporción entre 0 y 1', () => {
    const ok = bindDeckSlotsWith(plan(slide('content-measure')), sources([figure('f1', 'content-measure', 'measure', 'prev-m1', '62 %', { numericValue: 0.62 })]))
    const bad = bindDeckSlotsWith(plan(slide('content-measure')), sources([figure('f1', 'content-measure', 'measure', 'prev-m1', '62 %', { numericValue: 62 })]))

    expect(ok.plan.slides[0]!.slots!.measure).toMatchObject({ value: 0.62, source: 'caso publicado prev-m1' })
    expect(traceOf(bad.bindings, 'measure')?.reason).toBe('no-evidence')
  })

  it('las barras se ligan y la diferencia se calcula de sus valores', () => {
    const facts = [
      figure('b1', 'decision-chart', 'bars', 'prev-m1', 'Antes', { numericValue: 100 }),
      figure('b2', 'decision-chart', 'bars', 'prev-m1', 'Con Efeonce', { numericValue: 75 })
    ]

    const result = bindDeckSlotsWith(plan(slide('decision-chart', { annotation: '−99 %' })), sources(facts))

    expect(result.plan.slides[0]!.slots!.annotation).toBe('−25 %')
    expect(traceOf(result.bindings, 'annotation')).toMatchObject({ status: 'bound', binder: 'metric-delta' })
  })

  it('más hechos de los que la lámina admite no se recortan: el slot queda sin ligar', () => {
    const facts = [figure('f1', 'content-focus', 'proof', 'prev-m1'), figure('f2', 'content-focus', 'proof', 'prev-m2')]
    const result = bindDeckSlotsWith(plan(slide('content-focus')), sources(facts))

    expect(traceOf(result.bindings, 'proof')?.reason).toBe('too-many-facts')
  })
})

describe('audiencia fail-closed', () => {
  it('un deck para el cliente con evidencia interna no compone y reporta `internal-evidence`', () => {
    const result = bindDeckSlotsWith(plan(slide('content-focus')), sources([figure('f1', 'content-focus', 'proof', 'prev-internal')]))

    expect(traceOf(result.bindings, 'proof')).toMatchObject({ status: 'unbound', reason: 'internal-evidence' })
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'binding-internal-evidence', severity: 'error', source: 'binding' }))
    expect(result.ok).toBe(false)
  })

  it('en un deck interno la evidencia interna sí liga', () => {
    const result = bindDeckSlotsWith(plan(slide('content-focus')), sources([figure('f1', 'content-focus', 'proof', 'prev-internal')], { audience: 'internal' }))

    expect(traceOf(result.bindings, 'proof')?.status).toBe('bound')
  })

  it('una evidencia que no es de la propuesta rechaza el deck', () => {
    const result = bindDeckSlotsWith(plan(slide('content-focus')), sources([figure('f1', 'content-focus', 'proof', 'prev-inventada')]))

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'binding-evidence-unknown', severity: 'error' }))
    expect(result.ok).toBe(false)
  })
})

describe('prueba de terceros — sólo con autorización registrada', () => {
  const logo = (factId: string, recipeId: string, slotName: string, evidenceRef: string): DeckSlotFact => ({
    kind: 'logo',
    factId,
    target: { recipeId, slot: slotName },
    name: `Cliente ${factId}`,
    logoAssetId: `asset-${factId}`,
    evidenceRef
  })

  it('el muro liga logos con evidencia attested y documento, y omite los que no la tienen', () => {
    const facts = Array.from({ length: LOGO_WALL_MIN }, (_, index) => logo(`l${index}`, 'content-clients', 'logos', `prev-a${(index % 4) + 1}`))
    const withBad = [...facts.slice(0, LOGO_WALL_MIN - 1), logo('sin-doc', 'content-clients', 'logos', 'prev-no-doc')]

    const full = bindDeckSlotsWith(plan(slide('content-clients')), sources(facts))
    const short = bindDeckSlotsWith(plan(slide('content-clients')), sources(withBad))

    expect((full.plan.slides[0]!.slots!.logos as unknown[]).length).toBe(LOGO_WALL_MIN)
    expect(traceOf(full.bindings, 'logos')).toMatchObject({ status: 'bound', source: 'proposal-evidence' })
    expect(traceOf(short.bindings, 'logos')).toMatchObject({ status: 'unbound', reason: 'below-minimum' })
  })

  it('una cifra medida no autoriza el logo de un tercero', () => {
    const result = bindDeckSlotsWith(plan(slide('decision-case')), sources([logo('sky', 'decision-case', 'clientLogo', 'prev-m1')]))

    expect(traceOf(result.bindings, 'clientLogo')).toMatchObject({ status: 'unbound', reason: 'no-authorization' })
  })

  it('el testimonio liga cita y autor desde el hecho; la frase destacada debe estar en la cita', () => {
    const quote: DeckSlotFact = {
      kind: 'quote',
      factId: 'q1',
      target: { recipeId: 'decision-testimonial' },
      quote: '«Hemos podido agilizar mucho la carga de trabajo.»',
      authorName: 'Adriana Contreras',
      authorRole: 'Team SKY',
      evidenceRef: 'prev-a1'
    }

    const kept = bindDeckSlotsWith(plan(slide('decision-testimonial', { keyPhrase: 'agilizar mucho la carga', fullQuote: 'inventada' })), sources([quote]))
    const invented = bindDeckSlotsWith(plan(slide('decision-testimonial', { keyPhrase: 'cambió nuestra vida' })), sources([quote]))

    expect(kept.plan.slides[0]!.slots!.fullQuote).toBe('«Hemos podido agilizar mucho la carga de trabajo.»')
    expect(kept.plan.slides[0]!.slots!.author).toBe('Adriana Contreras · Team SKY')
    expect(traceOf(kept.bindings, 'keyPhrase')?.status).toBe('bound')
    expect(traceOf(invented.bindings, 'keyPhrase')).toMatchObject({ status: 'unbound', reason: 'not-in-quote' })
    expect(invented.plan.slides[0]!.slots!.keyPhrase).toBeUndefined()
  })

  it('sin autorización el testimonio no liga', () => {
    const result = bindDeckSlotsWith(plan(slide('decision-testimonial', { fullQuote: 'una cita del modelo' })), sources([]))

    expect(traceOf(result.bindings, 'fullQuote')).toMatchObject({ status: 'unbound', reason: 'no-authorization' })
    expect(result.plan.slides[0]!.slots!.fullQuote).toBeUndefined()
  })

  it('la foto de un caso sólo si es real y está en la evidencia: la de ejemplo nunca se liga', () => {
    const example = bindDeckSlotsWith(plan(slide('decision-case', { photo: 'ai-generations/2026-09-26_deck-triptico-v2/plates/T2-crea.png' })), sources([]))

    const real = bindDeckSlotsWith(
      plan(slide('decision-case')),
      sources([{ kind: 'photo', factId: 'p1', target: { recipeId: 'decision-case', slot: 'photo' }, photoAssetId: 'asset-foto-real', alt: 'El equipo de Sky', evidenceRef: 'prev-a2' }])
    )

    expect(traceOf(example.bindings, 'photo')).toMatchObject({ status: 'unbound', reason: 'no-real-photo' })
    expect(example.plan.slides[0]!.slots!.photo).toBeUndefined()
    expect(real.plan.slides[0]!.slots!.photo).toEqual({ assetId: 'asset-foto-real', alt: 'El equipo de Sky' })
  })

  it('fuera de una propuesta no hay autorización de terceros', () => {
    const result = bindDeckSlotsWith(plan(slide('decision-case')), sources([logo('sky', 'decision-case', 'clientLogo', 'asset-doc')], { proposal: null, intentAssets: { 'asset-doc': { asOf: '2026-01-01' } } }))

    expect(traceOf(result.bindings, 'clientLogo')?.reason).toBe('no-authorization')
  })
})

describe('money y team — esperan sus hechos (TASK-1417, TASK-1418)', () => {
  it('sin cotización congelada todo monto es [MONTO]', () => {
    const result = bindDeckSlotsWith(plan(slide('content-pricing-live', { total: 'CLP 3.500.000', lineItems: ['Greenhouse Pro · Dashboard · [MONTO] / mes'] })), sources([]))

    expect(result.plan.slides[0]!.slots!.total).toBe(MONEY_PLACEHOLDER)
    expect(result.plan.slides[0]!.slots!.lineItems).toEqual(['Greenhouse Pro · Dashboard · [MONTO] / mes'])
    expect(traceOf(result.bindings, 'total')).toMatchObject({ status: 'unbound', reason: 'no-frozen-quote' })
  })

  it('una línea con un monto escrito se quita', () => {
    const result = bindDeckSlotsWith(plan(slide('content-pricing-live', { lineItems: ['Greenhouse Pro · $1.200.000 / mes'] })), sources([]))

    expect(result.plan.slides[0]!.slots!.lineItems).toBeUndefined()
  })

  it('el equipo no se inventa: sin roster queda sin ligar y sin fotos', () => {
    const result = bindDeckSlotsWith(plan(slide('content-team', { lead: 'Julio · Responsable de Cuenta', team: ['Andrés · SEO'] })), sources([]))

    expect(traceOf(result.bindings, 'lead')).toMatchObject({ status: 'unbound', reason: 'no-roster-facts' })
    expect(result.plan.slides[0]!.slots!.lead).toBeUndefined()
    expect(result.plan.slides[0]!.slots!.team).toBeUndefined()
  })
})

describe('láminas de muestra SEO/AEO (TASK-1934)', () => {
  it('por defecto conservan la muestra y ponen la marca aprobada si falta', () => {
    const result = bindDeckSlotsWith(plan(slide('decision-diagnosis-map', { reportTitle: 'Tu marca · Chile' })), sources([]))

    expect(result.plan.slides[0]!.slots!.reportTitle).toBe('Tu marca · Chile')
    expect(result.plan.slides[0]!.slots!.sampleMark).toBe(SAMPLE_MARKS['decision-diagnosis-map'])
    expect(traceOf(result.bindings, 'sampleMark')).toMatchObject({ reason: 'illustrative-sample', dataOrigin: 'illustrative' })
  })

  it('con datos del cliente y su evidencia la marca se retira; sin evidencia nunca', () => {
    const values = {
      clientName: 'Sky Airline',
      clientDescription: 'Aerolínea chilena',
      competitorsToday: ['A', 'B', 'C'],
      competitorsWithAeo: ['A', 'B'],
      loadedCostClp: 999
    }

    const fact = (evidenceRef: string): DeckSlotFact => ({ kind: 'sample-data', factId: 's1', target: { recipeId: 'decision-ai-answer' }, values, evidenceRef })

    const client = bindDeckSlotsWith(plan(slide('decision-ai-answer', { illustrativeMark: 'Ejemplo ilustrativo', clientName: 'Tu marca' })), sources([fact('prev-m1')]))
    const invented = bindDeckSlotsWith(plan(slide('decision-ai-answer', { illustrativeMark: 'Ejemplo ilustrativo' })), sources([fact('prev-illustrative')]))

    expect(client.plan.slides[0]!.slots!.illustrativeMark).toBeUndefined()
    expect(client.plan.slides[0]!.slots!.clientName).toBe('Sky Airline')
    expect(traceOf(client.bindings, 'illustrativeMark')).toMatchObject({ status: 'bound', dataOrigin: 'client', evidenceRef: 'prev-m1' })
    expect(JSON.stringify(client.plan)).not.toContain('loadedCost')
    expect(traceOf(invented.bindings, 'illustrativeMark')?.status).toBe('unbound')
    expect(invented.plan.slides[0]!.slots!.illustrativeMark).toBe('Ejemplo ilustrativo')
    expect(invented.plan.slides[0]!.slots!.clientName).toBeUndefined()
    expect(invented.ok).toBe(false)
  })
})

describe('fuera de una propuesta', () => {
  it('una cifra liga con un asset de respaldo verificado y su fuente visible', () => {
    const fact = figure('f1', 'content-focus', 'proof', 'asset-reporte', '62 %', { sourceLabel: 'Informe anual Efeonce 2026' })
    const result = bindDeckSlotsWith(plan(slide('content-focus')), sources([fact], { proposal: null, clientLogo: null, intentAssets: { 'asset-reporte': { asOf: '2026-03-01' } } }))

    expect(traceOf(result.bindings, 'proof')).toMatchObject({ status: 'bound', source: 'intent', evidenceRef: 'asset-reporte' })
    expect(result.plan.slides[0]!.slots!.proof).toMatchObject({ value: '62 %', source: 'Informe anual Efeonce 2026' })
  })

  it('un asset que no existe es un error', () => {
    const result = bindDeckSlotsWith(plan(slide('content-focus')), sources([figure('f1', 'content-focus', 'proof', 'asset-fantasma', '62 %', { sourceLabel: 'x' })], { proposal: null }))

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'binding-evidence-unknown' }))
  })
})

describe('anti-leak: ningún costo, margen ni dato personal extra llega a la lámina', () => {
  it('sólo campos permitidos de cada hecho viajan al plan y al rastro', () => {
    const leaky = {
      loadedCostClp: 4_200_000,
      marginPct: 0.38,
      salaryClp: 2_000_000,
      email: 'persona@cliente.cl',
      rut: '11.111.111-1'
    }

    const facts = [
      { ...figure('f1', 'content-focus', 'proof', 'prev-m1'), ...leaky },
      { kind: 'quote', factId: 'q1', target: { recipeId: 'decision-testimonial' }, quote: '«Cita.»', authorName: 'Ana', authorRole: 'Marketing', evidenceRef: 'prev-a1', ...leaky },
      { kind: 'photo', factId: 'p1', target: { recipeId: 'decision-case', slot: 'photo' }, photoAssetId: 'asset-f', alt: 'Foto', evidenceRef: 'prev-a1', ...leaky }
    ] as unknown as DeckSlotFact[]

    const result = bindDeckSlotsWith(plan(slide('content-focus'), slide('decision-testimonial'), slide('decision-case')), sources(facts))
    const serialized = JSON.stringify({ plan: result.plan, bindings: result.bindings })

    for (const needle of ['loadedCost', 'margin', 'salary', 'persona@cliente.cl', '11.111.111-1', '4200000', '0.38']) {
      expect(serialized).not.toContain(needle)
    }
  })
})

describe('determinismo y esqueletos', () => {
  it('el mismo plan con las mismas fuentes da el mismo resultado', () => {
    const input = plan(slide('content-focus'), slide('cover-proposal-orbit'))
    const facts = [figure('f1', 'content-focus', 'proof', 'prev-m1')]

    expect(bindDeckSlotsWith(input, sources(facts))).toEqual(bindDeckSlotsWith(input, sources(facts)))
  })

  it('una lámina esqueleto sólo recibe rastro y sigue siendo esqueleto', () => {
    const result = bindDeckSlotsWith({ document: 'proposal', slides: [{ recipeId: 'content-focus' }] }, sources([figure('f1', 'content-focus', 'proof', 'prev-m1')]))

    expect(result.plan.slides[0]!.slots).toBeUndefined()
    expect(traceOf(result.bindings, 'proof')?.status).toBe('bound')
  })

  it('un hecho que ninguna lámina liga se avisa', () => {
    const result = bindDeckSlotsWith(plan(slide('content-focus')), sources([figure('f1', 'decision-why-us', 'facts', 'prev-m1')]))

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'binding-fact-unused', severity: 'warning' }))
  })
})
