// Quote document: the reading that turns a frozen composed quote into the data of its client-facing A4 document
// (resources/quote-document.ts, version 2 of the data of docs/commercial/templates/cotizacion-a4).
//
// The reading derives from the frozen result and recalculates no price, so its verifiers are other things than
// itself, and no expected amount comes from a previous run of it:
//
//   - the frozen result: rows, totals and tax treatment as the kernel and the resolution wrote them;
//   - the client-safe items (`clientSafePeriodItems`), which are also what the preview prints: a document line is
//     those items followed over the term, so every line is reconciled with them key by key;
//   - `presentPaymentSchedule` for the amounts of a payment calendar and `clientPaidDirectly` for the costs the
//     client pays their supplier;
//   - the template itself: `validateQuote` and `quoteAmounts` of scripts/documents/render-cotizacion-a4.mjs are run
//     on the emitted data, and the net, tax and total they compute are compared with the totals of the quote. That
//     generator is the real consumer of the data; nothing here asserts what its code says.
//
// Quotes over several periods are composed in memory from the frozen inputs of the two committed examples, with the
// demand edited where an operator would edit it. Where the reading must reject a result the kernel cannot produce
// (lines that do not add up, two rows on one key), a frozen result is copied and edited: the reader takes any
// result of that shape and is the last check before a document exists. Nothing is written under data/.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import Decimal from 'decimal.js'
import { afterAll, describe, expect, it } from 'vitest'

import { COMPOSITION_VERSION, replayResourceComposition } from '../adapters/resource-composition'
import { clientPaidDirectly } from '../catalog/client'
import { PRICING_V3_DOMAIN_ERROR_CODES } from '../errors'
import { composeResourceQuote } from '../resources/composition'
import { presentPaymentSchedule } from '../resources/engagement-view'
import type { PaymentMilestone } from '../resources/engagement-view'
import {
  QUOTE_DOCUMENT_BRIEF_VERSION,
  QUOTE_DOCUMENT_DEFAULT_GROUPS,
  QUOTE_DOCUMENT_DEFAULT_SCHEDULE_TEXTS,
  QUOTE_DOCUMENT_SCAFFOLD_VERSION,
  composeQuoteDocument,
  scaffoldQuoteDocumentBrief
} from '../resources/quote-document'
import type { QuoteDocumentData } from '../resources/quote-document'
import { clientSafePeriodItems, compositionPreviewMarkdown, projectCompositionPreview } from '../resources/readiness'

type Composition = ReturnType<typeof composeResourceQuote>
type Artifact = ReturnType<typeof replayResourceComposition>
type Demand = Artifact['semantic']['demand']
type Json = Record<string, unknown>

const D = Decimal.clone({ precision: 120, rounding: Decimal.ROUND_HALF_UP })
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const root = resolve('.')
const sum = (values: (string | Decimal)[]) => values.reduce<Decimal>((total, value) => total.plus(value), new D(0))
const print = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

const OPERATING = 'data/pricing/v3-operating'
const DESIGNER = `${OPERATING}/designer-on-demand`
const MANAGED = `${OPERATING}/managed-on-demand-third-party`
const THREE_MONTHS = `${OPERATING}/designer-three-months-iva`
const EXAMPLES = [DESIGNER, MANAGED, THREE_MONTHS]
const IDENTITY = { calculationId: 'composition-under-test', replayDigest: 'digest-under-test' }

const artifacts = new Map<string, Artifact>()

/** Every artifact enters through the same replay check the CLI applies. */
const frozen = (path: string) => {
  const artifact = artifacts.get(path) ?? replayResourceComposition(read(path))

  artifacts.set(path, artifact)

  return artifact
}

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.artifact.json') ? [path] : []
  })

// Every committed composition artifact, plus the agreed-net quote kept with its prospect (read only).
const corpus = [
  ...walk(resolve(root, 'data/pricing')).map(path => relative(root, path)),
  'docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json'
]
  .filter(path => read(path).artifactVersion === COMPOSITION_VERSION)
  .sort()

/** A composition from the frozen inputs of an example with its demand edited where an operator would edit it. */
const recompose = (example: string, edit: (demand: Demand) => void) => {
  const { catalog, policy, credits, demand } = frozen(`${example}.artifact.json`).semantic
  const edited = clone(demand)

  edit(edited)

  return composeResourceQuote(catalog, policy, credits, edited)
}

const calculated = (result: Composition) => {
  expect(result.quote.calculationStatus).toBe('calculated')

  return result
}

/** The same demand over `periods` months: every allocation repeated in each. */
const over = (demand: Demand, periods: number) => {
  const one = demand.allocations

  demand.brief.periods = periods
  demand.allocations = Array.from({ length: periods }, (_, index) =>
    one.map(allocation => ({ ...allocation, periodId: index + 1 }))
  ).flat()
}

/**
 * The designer without its AI credit tools. A credit budget is tied to the calendar month of its period, so the
 * frozen one cannot simply be repeated over a term; the line, its seats and its setup are what these cases follow.
 */
const withoutCreditTools = (demand: Demand) => {
  demand.work = demand.work.map(({ aiSelectionReason, ...work }) => {
    void aiSelectionReason

    return { ...work, aiToolIds: [], creditDemand: [] }
  })
  demand.creditBudgets = []
  demand.fxRecordIds = demand.fxRecordIds.filter(id => id !== 'fx:EUR:USD')
}

const TAX_SOURCE = {
  reference: 'tax-policy-declared-for-the-test',
  effectiveFrom: '2026-01-01',
  effectiveUntil: '9999-12-31',
  status: 'confirmed' as const
}

const exclusive = (rate: string) => ({
  kind: 'exclusive' as const,
  rate,
  policyRef: 'tax-under-test',
  source: TAX_SOURCE
})

// ---- quotes the cases read ----

const designer = frozen(`${DESIGNER}.artifact.json`).semantic.result
const managed = frozen(`${MANAGED}.artifact.json`).semantic.result

/** Designer sold by its line over three months: one monthly row per month and a setup row in the first. */
const designerThreeMonths = calculated(
  recompose(DESIGNER, demand => {
    withoutCreditTools(demand)
    over(demand, 3)
  })
)

/** Designer active in months 1 and 3 only: the quote has no period 2. */
const designerWithGap = calculated(
  recompose(DESIGNER, demand => {
    withoutCreditTools(demand)
    over(demand, 3)
    demand.brief.lines[0].activePeriods = [1, 3]
    demand.allocations = demand.allocations.filter(allocation => allocation.periodId !== 2)
  })
)

/** The managed service over three months, with its third-party costs and the cost the client pays in the first. */
const managedThreeMonths = calculated(recompose(MANAGED, demand => over(demand, 3)))

/** The same team and suppliers sold by lines instead of as one service. */
const linesThreeMonths = calculated(
  recompose(MANAGED, demand => {
    over(demand, 3)
    demand.commercialUnit = 'role_capacity'
  })
)

/** A dedication that drops in the third month: the fee of the service changes there. */
const managedFeeChanges = calculated(
  recompose(MANAGED, demand => {
    over(demand, 3)
    demand.brief.lines[1].dedicationByPeriod = [{ periodId: 3, dedication: { unit: 'fte', value: '0.5' } }]
  })
)

/** Suppliers on different months: media in months 1 and 2, talent in month 2, the client's own cost every month. */
const managedSuppliersOverTheTerm = calculated(
  recompose(MANAGED, demand => {
    over(demand, 3)

    const costs = demand.brief.thirdPartyCosts!

    costs.find(cost => cost.costId === 'tp-media')!.periodIds = [1, 2]
    costs.find(cost => cost.costId === 'tp-talent')!.periodIds = [2]
    costs.find(cost => cost.costId === 'tp-stock')!.periodIds = [1, 2, 3]
  })
)

const designerWithTax = (rate: string) =>
  calculated(
    recompose(DESIGNER, demand => {
      demand.brief.taxTreatment = exclusive(rate)
    })
  )

/**
 * Three months with a supplier re-invoiced at a net that is not a multiple of anything: the kernel rounds the tax of
 * each month and adds them up, and the three roundings are not the rounding of the term.
 */
const taxRoundedByMonth = calculated(
  recompose(MANAGED, demand => {
    over(demand, 3)
    demand.brief.thirdPartyCosts!.find(cost => cost.costId === 'tp-media')!.periodIds = [1, 2, 3]
    demand.brief.taxTreatment = exclusive('0.19')
  })
)

const designerTaxNotApplicable = calculated(
  recompose(DESIGNER, demand => {
    demand.brief.taxTreatment = { kind: 'not_applicable', reason: 'Declared for the test.' }
  })
)

const designerInDollars = calculated(
  recompose(DESIGNER, demand => {
    demand.brief.outputCurrency = 'USD'
  })
)

const blocked = recompose(DESIGNER, demand => {
  demand.allocations = []
})

// ---- briefs ----

// No digit in any text: a figure found in the emitted data can only have come from the quote.
const texts = (): Json => ({
  schemaVersion: QUOTE_DOCUMENT_BRIEF_VERSION,
  reference: 'Borrador · Prueba',
  supplier: {
    name: 'Emisor de prueba SpA',
    taxId: 'Identificación del emisor',
    contact: 'Equipo comercial',
    email: 'comercial@example.com',
    phone: '+56 2 2000 0000'
  },
  buyer: { name: 'Cliente de ejemplo', unit: 'Equipo de marketing', taxId: 'Identificación por confirmar' },
  cover: { label: 'Borrador · Sin validez comercial', title: ['Título', 'de prueba.'], subtitle: 'Subtítulo.' },
  service: { name: 'Servicio de prueba' },
  scope: { title: 'Alcance', intro: 'Introducción.', rows: [{ title: 'Entrega', text: 'Descripción.' }] },
  schedule: { title: 'Calendario', note: 'Nota.', phases: [{ label: 'Inicio', title: 'Fase', text: 'Descripción.' }] },
  pricing: { title: 'Precio', intro: 'Introducción.', summary: 'Resumen.', taxNote: 'Nota de impuestos.' },
  conditions: { title: 'Condiciones', rows: [{ title: 'Plazo', text: 'Descripción.' }] }
})

const document = (result: Composition, brief: unknown = texts()) => composeQuoteDocument(result, IDENTITY, brief)

const emitted = (result: Composition, brief: unknown = texts()): QuoteDocumentData => {
  const outcome = document(result, brief)

  if (!outcome.ok) throw new Error(`document rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

  return outcome.reading
}

const scaffold = (result: Composition) => {
  const outcome = scaffoldQuoteDocumentBrief(result, IDENTITY)

  if (!outcome.ok) throw new Error(`scaffold rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

  return outcome.reading
}

const rejection = (result: Composition, brief: unknown = texts()) => {
  const outcome = document(result, brief)

  if (outcome.ok) throw new Error('document accepted')

  // Every rejection names a place and a rule, never content.
  for (const issue of outcome.issues) {
    expect(Object.keys(issue).sort()).toEqual(['path', 'rule'])
    expect(issue.path).toMatch(/^[\w.]*$/)
    expect(issue.rule).toMatch(/^[a-z_]+$/)
  }

  return outcome
}

const totalsOf = (result: Composition) => result.quote.totals!

/** Rows of the kernel with the month of the quote each belongs to (a period is calculated on its own, as period 1). */
const rowsOf = (result: Composition) =>
  result.quote.periods.flatMap(period => period.result.lines.map(row => ({ ...row, month: period.periodId })))

/** Per key of the firewall, the periods it is charged in and what it is charged there. */
const chargedByKey = (result: Composition) => {
  const charged = new Map<string, { periodId: number; net: string }[]>()

  for (const period of clientSafePeriodItems(result))
    for (const item of period.items)
      if (!new D(item.net).isZero())
        charged.set(item.key, [...(charged.get(item.key) ?? []), { periodId: period.periodId, net: item.net }])

  return charged
}

/**
 * What must hold of the lines of any document, read against the frozen result and the client-safe items: they add
 * up to the net of the quote, each one multiplies out, and per key they are exactly what the firewall charges.
 */
const expectLinesFaithful = (result: Composition) => {
  const { lines } = scaffold(result)
  const charged = chargedByKey(result)

  expect(sum(lines.map(line => line.net)).toFixed()).toBe(new D(totalsOf(result).net).toFixed())
  expect(new Set(lines.map(line => line.key))).toEqual(new Set(charged.keys()))

  for (const line of lines) {
    expect(Number.isInteger(line.quantity.value) && line.quantity.value >= 1).toBe(true)
    expect(new D(line.net).gt(0)).toBe(true)

    if (line.unitNet !== undefined)
      expect(new D(line.unitNet).mul(line.quantity.value).toFixed()).toBe(new D(line.net).toFixed())
    else expect(line.quantity).toEqual({ value: 1, unit: 'pago único' })

    if (line.quantity.unit !== 'pago único')
      expect(line.quantity.unit).toBe(line.quantity.value === 1 ? 'mes' : 'meses')
  }

  for (const [key, periods] of charged) {
    const own = lines.filter(line => line.key === key)

    // The lines of a key cover its charged months, one net per month, and nothing else.
    expect(sum(own.map(line => line.net)).toFixed()).toBe(sum(periods.map(period => period.net)).toFixed())
    expect(own.reduce((months, line) => months + line.quantity.value, 0)).toBe(periods.length)
    expect(
      own.flatMap(line => (line.unitNet === undefined ? [line.net] : Array(line.quantity.value).fill(line.unitNet)))
    ).toEqual(periods.map(period => period.net))
  }
}

const leaves = (value: unknown): string[] =>
  value !== null && typeof value === 'object' ? Object.values(value).flatMap(leaves) : [String(value)]

const keysOf = (value: unknown): string[] =>
  value !== null && typeof value === 'object'
    ? [...(Array.isArray(value) ? [] : Object.keys(value)), ...Object.values(value).flatMap(keysOf)]
    : []

describe('the frozen examples and the files committed next to them', () => {
  it.each(EXAMPLES)('%s: the committed brief yields the committed data, from the committed artifact', example => {
    const artifact = frozen(`${example}.artifact.json`)
    const outcome = composeQuoteDocument(artifact.semantic.result, artifact, read(`${example}.document-brief.json`))

    if (!outcome.ok) throw new Error(`document rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

    // The example files are kept in step with the reading: a change of either shows here.
    expect(outcome.reading).toEqual(read(`${example}.document.json`))

    const data = outcome.reading
    const totals = totalsOf(artifact.semantic.result)

    expect(data).toMatchObject({
      version: 2,
      status: 'draft',
      date: artifact.semantic.demand.brief.quoteDate,
      currency: totals.currency,
      net: totals.net,
      source: {
        system: 'pricing-v3',
        calculationId: artifact.calculationId,
        digest: artifact.replayDigest,
        engineVersion: artifact.semantic.result.quote.periods[0].result.engineVersion
      }
    })
    expect(sum(data.lines.map(line => line.net)).toFixed()).toBe(new D(totals.net).toFixed())
    expect(data).not.toHaveProperty('taxStatus')

    // The two single-month examples were frozen without a resolved tax, and their documents assume no rate; the
    // three-month one carries the tax the quote froze.
    if (totals.tax === null) {
      expect(data.vatRate).toBeNull()
      expect(data).not.toHaveProperty('taxAmount')
    } else expect(data.taxAmount).toBe(totals.tax)
  })

  it('designer for three months with IVA: the months folded, the start-up once, and the tax and total of the quote', () => {
    const artifact = frozen(`${THREE_MONTHS}.artifact.json`)
    const result = artifact.semantic.result
    const totals = totalsOf(result)
    const monthly = rowsOf(result).filter(row => row.kind === 'monthly')
    const setup = rowsOf(result).filter(row => row.kind === 'setup')
    const data = read(`${THREE_MONTHS}.document.json`) as QuoteDocumentData

    // Premise, from the frozen artifact: three months at one net, one setup row, an exclusive rate of 19 %.
    expect(monthly.map(row => row.month)).toEqual([1, 2, 3])
    expect(new Set(monthly.map(row => row.net)).size).toBe(1)
    expect(setup.map(row => row.month)).toEqual([1])
    expect(artifact.semantic.demand.brief.taxTreatment).toMatchObject({ kind: 'exclusive', rate: '0.19' })

    expect(data.lines.map(({ label, detail, ...figures }) => (void label, void detail, figures))).toEqual([
      {
        group: 'Servicio',
        quantity: { value: 3, unit: 'meses' },
        unitNet: monthly[0].net,
        net: sum(monthly.map(row => row.net)).toFixed(0)
      },
      { group: 'Puesta en marcha', quantity: { value: 1, unit: 'pago único' }, net: setup[0].net }
    ])
    expect(data.currency).toBe('CLP')
    expect(data.vatRate).toBe(0.19)
    expect(data.taxAmount).toBe(totals.tax)
    // The total a reader adds up from the document is the grand total of the quote.
    expect(new D(data.net).plus(data.taxAmount!).toFixed()).toBe(new D(totals.grandTotal!).toFixed())
  })

  it('designer: a line of one month at the net of its monthly row, and its setup as a one-off', () => {
    const [monthly, setup] = rowsOf(designer)
    const data = emitted(designer)

    expect([monthly.kind, setup.kind]).toEqual(['monthly', 'setup'])
    expect(data.lines).toEqual([
      {
        label: monthly.label,
        group: QUOTE_DOCUMENT_DEFAULT_GROUPS.line,
        quantity: { value: 1, unit: 'mes' },
        unitNet: monthly.net,
        net: monthly.net
      },
      {
        label: 'Implementación inicial',
        group: QUOTE_DOCUMENT_DEFAULT_GROUPS.setup,
        quantity: { value: 1, unit: 'pago único' },
        net: setup.net
      }
    ])
    expect(data).not.toHaveProperty('clientPaidDirectly')
    expect(data).not.toHaveProperty('paymentSchedule')
  })

  it('managed service: one fee, each re-invoiced cost by its concept, and the cost the client pays apart', () => {
    const totals = totalsOf(managed)
    const suppliers = rowsOf(managed).filter(row => row.kind === 'third_party')
    const data = emitted(managed)

    // Own work, from the totals the kernel froze: the net of the quote without its re-invoiced third-party rows.
    const thirdPartyNet = (totals as { thirdPartyNet?: string }).thirdPartyNet

    expect(thirdPartyNet).toBeDefined()

    const ownWork = new D(totals.net).minus(thirdPartyNet!).toFixed(0)

    expect(suppliers.length).toBe(3)
    expect(data.lines).toEqual([
      {
        label: 'Servicio gestionado — fee del periodo',
        group: QUOTE_DOCUMENT_DEFAULT_GROUPS.fee,
        quantity: { value: 1, unit: 'mes' },
        // Own work: the net of the quote without what its suppliers are re-invoiced for.
        unitNet: ownWork,
        net: ownWork
      },
      ...suppliers.map(row => ({
        label: row.label,
        group: QUOTE_DOCUMENT_DEFAULT_GROUPS.third_party,
        quantity: { value: 1, unit: 'pago único' },
        net: row.net
      }))
    ])

    // As the client-shaped view of the catalog lists it, with the month it falls in as detail.
    const paid = clientPaidDirectly(managed.quote.resolution.brief)

    expect(paid.length).toBe(1)
    expect(data.clientPaidDirectly).toEqual(
      paid.map(cost => ({ label: cost.label, amount: cost.amount, currency: cost.currency, detail: 'Mes 1' }))
    )
    // Outside every line: its amount is in no sum of the document.
    expect(leaves(data.lines)).not.toContain(paid[0].amount)
  })
})

describe('lines are the client-safe items of the quote, followed over the term', () => {
  it.each(corpus)('%s: lines add up to the net and reconcile with the firewall key by key', path => {
    expectLinesFaithful(frozen(path).semantic.result)
  })

  it.each([
    ['designer over three months', designerThreeMonths],
    ['designer with a month off', designerWithGap],
    ['managed service over three months', managedThreeMonths],
    ['the same team sold by lines', linesThreeMonths],
    ['a fee that changes in the third month', managedFeeChanges],
    ['suppliers on different months', managedSuppliersOverTheTerm],
    ['a quote in dollars', designerInDollars]
  ] as const)('%s: lines add up to the net and reconcile with the firewall key by key', (_, result) => {
    expectLinesFaithful(result)
  })

  it('equal periods fold into one line: a number of months at the net of one month', () => {
    const monthly = rowsOf(designerThreeMonths).filter(row => row.kind === 'monthly')
    const [line, setup] = emitted(designerThreeMonths).lines

    // Premise, read from the kernel rows: three months at one net.
    expect(monthly.map(row => row.month)).toEqual([1, 2, 3])
    expect(new Set(monthly.map(row => row.net)).size).toBe(1)

    expect(line).toEqual({
      label: monthly[0].label,
      group: 'Servicio',
      quantity: { value: 3, unit: 'meses' },
      unitNet: monthly[0].net,
      net: sum(monthly.map(row => row.net)).toFixed(0)
    })
    // The setup falls in the first month only: a one-off with no unit value.
    expect(setup).toEqual({
      label: 'Implementación inicial',
      group: 'Puesta en marcha',
      quantity: { value: 1, unit: 'pago único' },
      net: rowsOf(designerThreeMonths).find(row => row.kind === 'setup')!.net
    })
  })

  it('a managed service over a term is one fee line, never its team', () => {
    const data = emitted(managedThreeMonths)
    const fee = data.lines[0]
    const feeOfPeriod = clientSafePeriodItems(managedThreeMonths).map(period => period.items[0].net)

    expect(new Set(feeOfPeriod).size).toBe(1)
    expect(fee).toMatchObject({ quantity: { value: 3, unit: 'meses' }, unitNet: feeOfPeriod[0] })
    expect(data.lines.filter(line => line.group === 'Servicio')).toEqual([fee])

    // Not one role of the team, by name or by the net of its row.
    const team = rowsOf(managedThreeMonths).filter(row => row.kind === 'monthly')
    const printed = JSON.stringify(data)

    expect(team.length).toBe(18)
    for (const row of team) expect(printed).not.toContain(row.label)
    for (const net of team.map(row => row.net)) expect(leaves(data)).not.toContain(net)
  })

  it('a net that changes over the term yields one line per run, each saying its months', () => {
    const fees = clientSafePeriodItems(managedFeeChanges).map(period => period.items[0].net)
    const lines = emitted(managedFeeChanges).lines.filter(line => line.group === 'Servicio')

    // Premise: months 1 and 2 at one fee, month 3 at another.
    expect(fees[0]).toBe(fees[1])
    expect(fees[2]).not.toBe(fees[1])

    expect(lines).toEqual([
      {
        label: 'Servicio gestionado — fee del periodo',
        detail: 'Meses 1 a 2',
        group: 'Servicio',
        quantity: { value: 2, unit: 'meses' },
        unitNet: fees[0],
        net: new D(fees[0]).mul(2).toFixed(0)
      },
      {
        label: 'Servicio gestionado — fee del periodo',
        detail: 'Mes 3',
        group: 'Servicio',
        quantity: { value: 1, unit: 'mes' },
        unitNet: fees[2],
        net: fees[2]
      }
    ])

    // A detail of the brief takes the place of the automatic one, on every line of the key.
    const described = emitted(managedFeeChanges, { ...texts(), lines: { fee: { detail: 'Según el plan acordado' } } })

    expect(described.lines.filter(line => line.group === 'Servicio').map(line => line.detail)).toEqual([
      'Según el plan acordado',
      'Según el plan acordado'
    ])
  })

  it('a month off ends a run: the months before and after it are separate lines', () => {
    expect(designerWithGap.quote.periods.map(period => period.periodId)).toEqual([1, 3])

    const lines = emitted(designerWithGap).lines.filter(line => line.group === 'Servicio')

    expect(lines.map(line => [line.detail, line.quantity])).toEqual([
      ['Mes 1', { value: 1, unit: 'mes' }],
      ['Mes 3', { value: 1, unit: 'mes' }]
    ])
  })

  it('a third-party cost is a one-off in a single month and counted in months when it repeats', () => {
    const rows = rowsOf(managedSuppliersOverTheTerm).filter(row => row.kind === 'third_party')
    const of = (costId: string) => rows.filter(row => row.parentLineId === costId)
    const lines = emitted(managedSuppliersOverTheTerm).lines.filter(line => line.group === 'Costos de terceros')

    expect(of('tp-media').map(row => row.month)).toEqual([1, 2])
    expect(of('tp-talent').map(row => row.month)).toEqual([2])

    // In the order each concept first appears in the quote: production and media in month 1, talent in month 2.
    expect(lines).toEqual([
      {
        label: of('tp-production')[0].label,
        group: 'Costos de terceros',
        quantity: { value: 1, unit: 'pago único' },
        net: of('tp-production')[0].net
      },
      {
        label: of('tp-media')[0].label,
        group: 'Costos de terceros',
        quantity: { value: 2, unit: 'meses' },
        unitNet: of('tp-media')[0].net,
        net: sum(of('tp-media').map(row => row.net)).toFixed(0)
      },
      {
        label: of('tp-talent')[0].label,
        group: 'Costos de terceros',
        quantity: { value: 1, unit: 'pago único' },
        net: of('tp-talent')[0].net
      }
    ])
  })

  it('a cost the client pays every month says so, and stays out of every line', () => {
    const [paid] = clientPaidDirectly(managedSuppliersOverTheTerm.quote.resolution.brief)
    const data = emitted(managedSuppliersOverTheTerm)

    expect(paid.periodIds).toEqual([1, 2, 3])
    expect(data.clientPaidDirectly).toEqual([
      { label: paid.label, amount: paid.amount, currency: paid.currency, detail: 'Importe por mes · Meses 1 a 3' }
    ])
    expect(sum(data.lines.map(line => line.net)).toFixed()).toBe(
      new D(totalsOf(managedSuppliersOverTheTerm).net).toFixed()
    )
  })

  it('a net of zero in a month is a month the concept is not charged in', () => {
    const edited = clone(linesThreeMonths)
    const period = edited.quote.periods[1]
    const row = period.result.lines[0]
    const taken = row.net

    // Month 2 of the first line is given away: the row keeps its place and loses its net, and so do the totals.
    row.net = '0'
    period.result.totals!.net = new D(period.result.totals!.net).minus(taken).toFixed(0)
    edited.quote.totals!.net = new D(edited.quote.totals!.net).minus(taken).toFixed(0)

    const lines = emitted(edited).lines.filter(line => line.label === row.label && line.unitNet === taken)

    expect(lines.map(line => [line.detail, line.quantity.value])).toEqual([
      ['Mes 1', 1],
      ['Mes 3', 1]
    ])
    expectLinesFaithful(edited)
  })

  it('amounts keep the decimals the kernel gave the currency', () => {
    const data = emitted(designerInDollars)

    expect(data.currency).toBe('USD')
    expect(totalsOf(designerInDollars).net).toMatch(/\.\d{2}$/)
    for (const line of data.lines) expect(line.net).toMatch(/^\d+\.\d{2}$/)
    expect(data.net).toBe(totalsOf(designerInDollars).net)
  })
})

describe('presentation of the lines is the brief’s, by key', () => {
  it('default groups, and lines ordered so that each group is printed once', () => {
    const defaults = emitted(linesThreeMonths).lines.map(line => line.group)

    expect([...new Set(defaults)]).toEqual(['Servicio', 'Costos de terceros'])

    const { brief } = scaffold(linesThreeMonths)
    const keys = Object.keys(brief.lines)

    // The third and the last line of the team move to a group of their own.
    const regrouped = emitted(linesThreeMonths, {
      ...texts(),
      lines: { [keys[2]]: { group: 'Dirección' }, [keys[5]]: { group: 'Dirección' } }
    })

    const groups = regrouped.lines.map(line => line.group)

    expect([...new Set(groups)]).toEqual(['Servicio', 'Dirección', 'Costos de terceros'])
    // Contiguous: a group never comes back once another one started.
    expect(groups.filter((group, index) => index === 0 || group !== groups[index - 1])).toEqual([...new Set(groups)])
    // Inside a group, the order of the quote.
    expect(regrouped.lines.filter(line => line.group === 'Dirección').map(line => line.label)).toEqual([
      brief.lines[keys[2]].label,
      brief.lines[keys[5]].label
    ])
    // Regrouping moves no figure.
    expect(sum(regrouped.lines.map(line => line.net)).toFixed()).toBe(new D(totalsOf(linesThreeMonths).net).toFixed())
  })

  it('label, detail and group of a key are replaced; the figures of the line are not', () => {
    const plain = emitted(managed)

    const dressed = emitted(managed, {
      ...texts(),
      lines: { fee: { label: 'Servicio de comunidad', detail: 'Gestión y reportes', group: 'Operación' } }
    })

    expect(dressed.lines[0]).toEqual({
      ...plain.lines[0],
      label: 'Servicio de comunidad',
      detail: 'Gestión y reportes',
      group: 'Operación'
    })
    expect(dressed.lines.slice(1)).toEqual(plain.lines.slice(1))
  })

  it('the scaffold lists every key with the label and group it prints with, and is rejected until it is filled', () => {
    for (const result of [designer, managed, managedSuppliersOverTheTerm]) {
      const reading = scaffold(result)

      expect(reading.schemaVersion).toBe(QUOTE_DOCUMENT_SCAFFOLD_VERSION)
      expect(reading).toMatchObject({ binding: false, ...IDENTITY })
      expect(Object.keys(reading.brief.lines)).toEqual([...chargedByKey(result).keys()])
      expect(reading.quote).toMatchObject({
        currency: totalsOf(result).currency,
        net: totalsOf(result).net,
        tax: totalsOf(result).tax,
        grandTotal: totalsOf(result).grandTotal
      })

      // Empty slots do not pass: a scaffold nobody filled never becomes a document.
      expect(rejection(result, reading.brief).code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')

      // Filled with texts and with its lines untouched, it is the document the scaffold announced.
      const filled = emitted(result, { ...texts(), lines: reading.brief.lines })

      expect(filled.lines).toEqual(reading.lines.map(({ key, kind, ...line }) => (void key, void kind, line)))
      expect(filled.lines).toEqual(emitted(result).lines)
    }
  })
})

describe('the brief carries texts, never figures', () => {
  it.each([
    ['net', '1000'],
    ['currency', 'USD'],
    ['vatRate', 0.19],
    ['taxStatus', 'not_applicable'],
    ['date', '2026-01-01'],
    ['status', 'example'],
    ['clientPaidDirectly', []],
    ['paymentSchedule', { milestones: [] }],
    ['source', { system: 'other' }],
    ['presentation', { currency: 'USD' }]
  ])('a brief that brings `%s` is rejected', (key, value) => {
    const outcome = rejection(managed, { ...texts(), [key]: value })

    expect(outcome.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
    expect(outcome.issues).toEqual([{ path: '', rule: 'unrecognized_keys' }])
  })

  it('an amount cannot hide inside a block either: every level is strict', () => {
    const inPricing = rejection(managed, { ...texts(), pricing: { ...(texts().pricing as Json), net: '1000' } })
    const inService = rejection(managed, { ...texts(), service: { name: 'Servicio', detail: 'Detalle', amount: '1' } })
    const inLine = rejection(managed, { ...texts(), lines: { fee: { label: 'Servicio', net: '1000' } } })

    const inRow = rejection(managed, {
      ...texts(),
      conditions: { title: 'Condiciones', rows: [{ title: 'Plazo', text: 'Texto.', amount: '1' }] }
    })

    expect(inPricing.issues).toEqual([{ path: 'pricing', rule: 'unrecognized_keys' }])
    expect(inService.issues).toEqual([{ path: 'service', rule: 'unrecognized_keys' }])
    expect(inLine.issues).toEqual([{ path: 'lines.0', rule: 'unknown_field' }])
    expect(inRow.issues).toEqual([{ path: 'conditions.rows.0', rule: 'unrecognized_keys' }])
    for (const outcome of [inPricing, inService, inLine, inRow])
      expect(outcome.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
  })

  it('a line key the quote does not have is an error, reported by position and never by name', () => {
    const sentinel = `leak-probe-${process.pid}`

    const outcome = rejection(managed, {
      ...texts(),
      lines: { fee: { label: 'Servicio' }, [sentinel]: { label: sentinel }, setup: { label: 'Puesta en marcha' } }
    })

    expect(outcome.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
    // The managed example has no setup: `setup` is as unknown as a typo.
    expect(outcome.issues).toEqual([
      { path: 'lines.1', rule: 'unknown_key' },
      { path: 'lines.2', rule: 'unknown_key' }
    ])
    expect(JSON.stringify(outcome)).not.toContain(sentinel)
  })

  it('rejects malformed texts and presentation, naming where', () => {
    const cases: [Json, { path: string; rule: string }][] = [
      [{ reference: '   ' }, { path: 'reference', rule: 'custom' }],
      [{ schemaVersion: 'pricing-v3-quote-document-brief/2' }, { path: 'schemaVersion', rule: 'invalid_literal' }],
      [
        { supplier: { ...(texts().supplier as Json), email: 'not an address' } },
        { path: 'supplier.email', rule: 'custom' }
      ],
      [
        { cover: { label: 'Borrador', title: ['a', 'b', 'c', 'd'], subtitle: 'Texto.' } },
        { path: 'cover.title', rule: 'too_big' }
      ],
      [{ scope: { title: 'Alcance', intro: 'Texto.', rows: [] } }, { path: 'scope.rows', rule: 'too_small' }],
      [
        { pricing: { ...(texts().pricing as Json), monthly: { months: 0, note: 'Nota.' } } },
        { path: 'pricing.monthly.months', rule: 'too_small' }
      ],
      [{ locale: 'not a locale' }, { path: 'locale', rule: 'custom' }],
      [{ lines: ['fee'] }, { path: 'lines', rule: 'not_an_object' }],
      [{ lines: { fee: 'Servicio' } }, { path: 'lines.0', rule: 'not_an_object' }],
      [{ lines: { fee: { label: '' } } }, { path: 'lines.0.label', rule: 'invalid_label' }],
      [{ lines: { fee: { group: 'Uno\nDos' } } }, { path: 'lines.0.group', rule: 'invalid_group' }],
      [
        { paymentScheduleTexts: { title: 'Pagos' } },
        { path: 'paymentScheduleTexts', rule: 'requires_payment_milestones' }
      ]
    ]

    for (const [change, issue] of cases) {
      const outcome = rejection(managed, { ...texts(), ...change })

      expect(outcome.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
      expect(outcome.issues).toContainEqual(issue)
    }

    expect(rejection(managed, null).code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
    expect(rejection(managed, []).code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
  })

  it('texts and optional blocks of the brief reach the data as written', () => {
    const brief = {
      ...texts(),
      locale: 'es-CL',
      buyer: { ...(texts().buyer as Json), logo: { path: 'logos/cliente.svg', source: 'https://example.com/marca' } },
      pricing: { ...(texts().pricing as Json), taxLabel: 'Impuesto', monthly: { months: 3, note: 'Referencia.' } }
    }

    const data = emitted(managedThreeMonths, brief)

    for (const block of [
      'reference',
      'locale',
      'supplier',
      'buyer',
      'cover',
      'service',
      'scope',
      'schedule',
      'pricing',
      'conditions'
    ] as const)
      expect(data[block]).toEqual(brief[block as keyof typeof brief])
  })
})

describe('tax and total are the ones the quote froze', () => {
  /** Months and payments the lines of a document count: the `N` of the tax guard. */
  const quantityOfLines = (result: Composition) =>
    scaffold(result).lines.reduce((total, line) => total + line.quantity.value, 0)

  /** The same quote with its frozen tax moved by `units` of the currency, and its total with it. */
  const withTaxMovedBy = (result: Composition, units: number) => {
    const edited = clone(result)
    const totals = edited.quote.totals!

    totals.tax = new D(totals.tax!).plus(units).toFixed(0)
    totals.grandTotal = new D(totals.net).plus(totals.tax).toFixed(0)

    return edited
  }

  it('not resolved: no rate and no amount are assumed', () => {
    expect(totalsOf(designer).tax).toBeNull()
    expect(emitted(designer).vatRate).toBeNull()
    expect(emitted(designer)).not.toHaveProperty('taxAmount')
    expect(emitted(designer)).not.toHaveProperty('taxStatus')
  })

  it('exclusive: the rate, and with it the tax the quote froze', () => {
    const result = designerWithTax('0.19')
    const totals = totalsOf(result)
    const data = emitted(result)

    expect(data.vatRate).toBe(0.19)
    expect(data.taxAmount).toBe(totals.tax)
    expect(data).not.toHaveProperty('taxStatus')
    expect(new D(data.net).plus(data.taxAmount!).toFixed()).toBe(totals.grandTotal)
  })

  it('exclusive with a rate of four decimals passes and one of five is rejected', () => {
    const fourDecimals = designerWithTax('0.1925')

    expect(emitted(fourDecimals)).toMatchObject({ vatRate: 0.1925, taxAmount: totalsOf(fourDecimals).tax })

    const outcome = rejection(designerWithTax('0.19123'))

    expect(outcome.code).toBe('QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE')
    expect(outcome.issues).toEqual([{ path: 'taxTreatment.rate', rule: 'rate_not_representable' }])
  })

  it('a tax rounded month by month is the tax of the document, not the one of the term rounded once', () => {
    const totals = totalsOf(taxRoundedByMonth)
    const roundedOnce = new D(totals.net).mul('0.19').toDecimalPlaces(0, D.ROUND_HALF_UP)

    // Premise: the quote is consistent with itself and is one peso away from the tax of its whole net.
    expect(sum(taxRoundedByMonth.quote.periods.map(period => period.result.totals!.tax!)).toFixed()).toBe(totals.tax)
    expect(new D(totals.net).plus(totals.tax!).toFixed()).toBe(totals.grandTotal)
    expect(roundedOnce.minus(totals.tax!).abs().toFixed()).toBe('1')

    const data = emitted(taxRoundedByMonth)

    expect(data.vatRate).toBe(0.19)
    expect(data.taxAmount).toBe(totals.tax)
    expect(data.taxAmount).not.toBe(roundedOnce.toFixed(0))
    expect(new D(data.net).plus(data.taxAmount!).toFixed()).toBe(totals.grandTotal)
    expect(scaffold(taxRoundedByMonth).quote).toMatchObject({ vatRate: 0.19, taxAmount: totals.tax })
  })

  it('the frozen tax is held to the rate: one unit per month or payment of the lines, and no more', () => {
    const result = designerWithTax('0.19')
    const totals = totalsOf(result)
    const allowed = quantityOfLines(result)

    // Premise: this quote is taxed once on its net, so its tax is exactly the one of the rate.
    expect(new D(totals.net).mul('0.19').toDecimalPlaces(0, D.ROUND_HALF_UP).toFixed()).toBe(totals.tax)
    expect(allowed).toBe(2)

    for (const units of [allowed, -allowed])
      expect(emitted(withTaxMovedBy(result, units)).taxAmount).toBe(new D(totals.tax!).plus(units).toFixed(0))

    for (const units of [allowed + 1, -(allowed + 1)]) {
      const outcome = rejection(withTaxMovedBy(result, units))

      expect(outcome.code).toBe('QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE')
      expect(outcome.issues).toEqual([{ path: 'totals.tax', rule: 'tax_differs_from_rate' }])
      expect(scaffoldQuoteDocumentBrief(withTaxMovedBy(result, units), IDENTITY)).toMatchObject({
        ok: false,
        code: outcome.code
      })
    }
  })

  it('a total that is not the net plus the frozen tax is rejected', () => {
    const edited = clone(designerWithTax('0.19'))

    edited.quote.totals!.grandTotal = new D(edited.quote.totals!.grandTotal!).plus(1).toFixed(0)

    expect(rejection(edited)).toMatchObject({
      code: 'QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE',
      issues: [{ path: 'totals.grandTotal', rule: 'total_differs_from_document' }]
    })
  })

  it('not applicable: declared as such, with no rate and no amount', () => {
    const totals = totalsOf(designerTaxNotApplicable)
    const data = emitted(designerTaxNotApplicable)

    expect(new D(totals.tax!).isZero()).toBe(true)
    expect(totals.grandTotal).toBe(totals.net)
    expect(data.vatRate).toBeNull()
    expect(data.taxStatus).toBe('not_applicable')
    expect(data).not.toHaveProperty('taxAmount')
  })

  it('totals that contradict the frozen treatment are rejected', () => {
    const edited = clone(designerTaxNotApplicable)

    edited.quote.totals!.tax = '1'

    expect(rejection(edited)).toMatchObject({
      code: 'QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE',
      issues: [{ path: 'totals.tax', rule: 'tax_inconsistent' }]
    })
  })
})

describe('payment calendar: the amounts are the ones of the schedule reader', () => {
  const list: PaymentMilestone[] = [
    { id: 'advance', label: 'Anticipo', share: '0.5', when: 'A la aceptación' },
    { id: 'second', label: 'Segundo pago', share: '0.3', periodId: 2 },
    { id: 'closing', label: 'Cierre', share: '0.2', when: 'Al cierre' }
  ]

  it('milestones carry the amounts `presentPaymentSchedule` gives and add up to the net', () => {
    const data = emitted(managedThreeMonths, { ...texts(), paymentMilestones: list })
    const reading = presentPaymentSchedule(managedThreeMonths, IDENTITY, list)

    if (!reading.ok) throw new Error('schedule rejected')

    expect(data.paymentSchedule).toEqual({
      ...QUOTE_DOCUMENT_DEFAULT_SCHEDULE_TEXTS,
      milestones: [
        { label: 'Anticipo', when: 'A la aceptación', net: reading.reading.milestones[0].amount },
        { label: 'Segundo pago', when: 'Mes 2', net: reading.reading.milestones[1].amount },
        { label: 'Cierre', when: 'Al cierre', net: reading.reading.milestones[2].amount }
      ]
    })
    expect(sum(data.paymentSchedule!.milestones.map(milestone => milestone.net)).toFixed()).toBe(
      new D(totalsOf(managedThreeMonths).net).toFixed()
    )

    const titled = emitted(managedThreeMonths, {
      ...texts(),
      paymentMilestones: list,
      paymentScheduleTexts: { title: 'Hitos de pago', note: 'Cada hito se factura al cumplirse.' }
    })

    expect(titled.paymentSchedule).toMatchObject({ title: 'Hitos de pago', note: 'Cada hito se factura al cumplirse.' })
    expect(titled.paymentSchedule!.milestones).toEqual(data.paymentSchedule!.milestones)
  })

  it('a rejection of the schedule reader is reported as its own, under the place the list has in the brief', () => {
    const short = rejection(managed, { ...texts(), paymentMilestones: [{ ...list[0], share: '0.4' }, { ...list[2] }] })

    expect(short.code).toBe('SCHEDULE_MILESTONES_INVALID')
    expect(short.issues).toEqual([{ path: 'paymentMilestones', rule: 'shares_must_sum_to_one' }])

    const withAmount = rejection(managed, { ...texts(), paymentMilestones: [{ ...list[0], share: '1', amount: '5' }] })

    expect(withAmount.code).toBe('SCHEDULE_MILESTONES_INVALID')
    expect(withAmount.issues).toEqual([{ path: 'paymentMilestones.0', rule: 'unknown_field' }])
  })

  it('a milestone says when, and a document takes at most twelve', () => {
    const untimed = rejection(managed, {
      ...texts(),
      paymentMilestones: [
        { id: 'a', label: 'Anticipo', share: '0.5', when: 'A la aceptación' },
        { id: 'b', label: 'Saldo', share: '0.5' }
      ]
    })

    expect(untimed.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
    expect(untimed.issues).toEqual([{ path: 'paymentMilestones.1', rule: 'timing_required' }])

    const many = Array.from({ length: 13 }, (_, index) => ({
      id: `m${index}`,
      label: 'Pago',
      share: '0.1',
      when: 'Al mes'
    }))

    const tooMany = rejection(managed, { ...texts(), paymentMilestones: many })

    expect(tooMany.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
    expect(tooMany.issues).toEqual([{ path: 'paymentMilestones', rule: 'too_big' }])
  })
})

describe('a document that would not say what the quote says is never emitted', () => {
  it('a quote that is not calculated has no document and no scaffold', () => {
    expect(blocked.quote.calculationStatus).not.toBe('calculated')
    expect(rejection(blocked)).toMatchObject({ code: 'QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE', issues: [] })
    expect(scaffoldQuoteDocumentBrief(blocked, IDENTITY)).toMatchObject({
      ok: false,
      code: 'QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE'
    })
  })

  it('lines that do not add up to the net of the quote are rejected', () => {
    const totalsMoved = clone(managedThreeMonths)

    totalsMoved.quote.totals!.net = new D(totalsMoved.quote.totals!.net).plus(1).toFixed(0)

    const rowMoved = clone(linesThreeMonths)

    rowMoved.quote.periods[2].result.lines[0].net = new D(rowMoved.quote.periods[2].result.lines[0].net)
      .plus(10000)
      .toFixed(0)

    for (const edited of [totalsMoved, rowMoved]) {
      expect(rejection(edited)).toMatchObject({
        code: 'QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP',
        issues: [{ path: 'lines', rule: 'sum_differs_from_net' }]
      })
      expect(scaffoldQuoteDocumentBrief(edited, IDENTITY)).toMatchObject({
        ok: false,
        code: 'QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP'
      })
    }
  })

  it('two rows on one key, a negative item and an unknown currency are rejected by name', () => {
    const sameKey = clone(linesThreeMonths)

    sameKey.quote.periods[0].result.lines[1].parentLineId = sameKey.quote.periods[0].result.lines[0].parentLineId
    expect(rejection(sameKey)).toMatchObject({
      code: 'QUOTE_DOCUMENT_NOT_REPRESENTABLE',
      issues: [{ path: 'periods.1.items.1', rule: 'duplicate_key' }]
    })

    // A supplier row above the net of its period leaves a fee under zero.
    const negativeFee = clone(managed)
    const supplier = negativeFee.quote.periods[0].result.lines.find(row => row.kind === 'third_party')!

    supplier.net = new D(negativeFee.quote.periods[0].result.totals!.net).plus(1).toFixed(0)
    expect(rejection(negativeFee)).toMatchObject({
      code: 'QUOTE_DOCUMENT_NOT_REPRESENTABLE',
      issues: [{ path: 'periods.1.items.0', rule: 'negative_net' }]
    })

    const unknownCurrency = clone(designer)

    unknownCurrency.quote.totals!.currency = 'XXQ'
    expect(rejection(unknownCurrency)).toMatchObject({
      code: 'QUOTE_DOCUMENT_NOT_REPRESENTABLE',
      issues: [{ path: 'totals.currency', rule: 'currency_not_supported' }]
    })

    // More decimals than the currency has: the template would refuse the amount.
    const fractionOfAPeso = clone(designer)

    fractionOfAPeso.quote.periods[0].result.lines[0].net = '2470000.5'
    expect(rejection(fractionOfAPeso)).toMatchObject({
      code: 'QUOTE_DOCUMENT_NOT_REPRESENTABLE',
      issues: [{ path: 'periods.1.items.0', rule: 'amount_not_representable' }]
    })
  })

  it('more lines, or more costs paid directly, than the template takes are rejected', () => {
    const manyLines = clone(linesThreeMonths)
    const [first] = manyLines.quote.periods
    const template = first.result.lines[0]

    first.result.lines = Array.from({ length: 41 }, (_, index) => ({
      ...template,
      parentLineId: `line-${index}`,
      net: '10000'
    }))
    first.result.totals!.net = '410000'
    manyLines.quote.periods = [first]
    manyLines.quote.totals!.net = '410000'
    expect(rejection(manyLines)).toMatchObject({
      code: 'QUOTE_DOCUMENT_NOT_REPRESENTABLE',
      issues: [{ path: 'lines', rule: 'too_many' }]
    })

    const manyPaid = clone(managed)
    const brief = manyPaid.quote.resolution.brief!
    const direct = brief.thirdPartyCosts!.find(cost => cost.settlement === 'client_direct')!

    brief.thirdPartyCosts = Array.from({ length: 9 }, (_, index) => ({ ...direct, costId: `direct-${index}` }))
    expect(rejection(manyPaid)).toMatchObject({
      code: 'QUOTE_DOCUMENT_NOT_REPRESENTABLE',
      issues: [{ path: 'clientPaidDirectly', rule: 'too_many' }]
    })

    const strangeCurrency = clone(managed)

    strangeCurrency.quote.resolution.brief!.thirdPartyCosts!.find(
      cost => cost.settlement === 'client_direct'
    )!.currency = 'XXQ'
    expect(rejection(strangeCurrency)).toMatchObject({
      code: 'QUOTE_DOCUMENT_NOT_REPRESENTABLE',
      issues: [{ path: 'clientPaidDirectly.0.currency', rule: 'currency_not_supported' }]
    })
  })

  it('every rejection code of the reading is registered', () => {
    for (const code of [
      'QUOTE_DOCUMENT_BRIEF_INVALID',
      'QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP',
      'QUOTE_DOCUMENT_NOT_REPRESENTABLE',
      'QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE',
      'QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE'
    ])
      expect(PRICING_V3_DOMAIN_ERROR_CODES).toContain(code)
  })
})

describe('nothing the client-safe view does not expose reaches the document', () => {
  const CONTRACT_KEYS = [
    'version',
    'status',
    'date',
    'reference',
    'currency',
    'locale',
    'vatRate',
    'taxAmount',
    'taxStatus',
    'supplier',
    'buyer',
    'cover',
    'service',
    'scope',
    'schedule',
    'conditions',
    'pricing',
    'lines',
    'net',
    'clientPaidDirectly',
    'paymentSchedule',
    'source'
  ]

  /** Everything of a result that is internal: what things cost, what they earn, who is paid and under which rule. */
  const internalsOf = (result: Composition) => {
    const amounts = new Set<string>()
    const names = new Set<string>()
    const totals = totalsOf(result) as unknown as Record<string, string | null>

    for (const key of [
      'cost',
      'marginAmount',
      'marginRate',
      'cashCommitment',
      'thirdPartyCost',
      'contingencyReserve',
      'contingencyBase',
      'ownWorkMarginRate'
    ])
      if (totals[key]) amounts.add(totals[key] as string)

    for (const period of result.quote.periods)
      for (const row of period.result.lines) {
        // `floorNet` and `minimumMargin` exist from contract 1.1.0 on; a row of an earlier one has neither.
        const floor = row as { floorNet?: string | null; minimumMargin?: string | null }

        for (const value of [row.cost, row.marginAmount, floor.floorNet, floor.minimumMargin])
          if (value) amounts.add(value)
        for (const component of row.components)
          for (const value of [component.cost, component.price]) amounts.add(value)
      }

    const brief = result.quote.resolution.brief!

    for (const cost of brief.thirdPartyCosts ?? []) {
      names.add(cost.supplier)
      names.add(cost.category)
      names.add(cost.costId)
      if (cost.evidence) names.add(cost.evidence.reference)
      // What the supplier charges. A cost the client pays directly is declared to them and is printed.
      if (cost.settlement === 'reinvoiced') amounts.add(cost.amount)
    }

    for (const line of brief.lines) {
      names.add(line.profile)
      names.add(line.allocationPolicyId)
      if (line.kitId) names.add(line.kitId)
    }

    for (const binding of result.quote.resolution.bindings) names.add(binding.record.recordId)

    // A net the firewall exposes is printed by right even where a cost happens to equal it (a cost passed on at
    // cost). The trivial amounts say nothing.
    for (const period of clientSafePeriodItems(result)) for (const item of period.items) amounts.delete(item.net)
    for (const trivial of ['0', '1', '0.00', '1.00']) amounts.delete(trivial)

    return { amounts: [...amounts], names: [...names] }
  }

  const milestones: PaymentMilestone[] = [
    { id: 'a', label: 'Anticipo', share: '0.5', when: 'A la aceptación' },
    { id: 'b', label: 'Saldo', share: '0.5', when: 'Al cierre' }
  ]

  it.each([
    ['designer', designer],
    ['managed service with suppliers', managed],
    ['managed service over three months', managedSuppliersOverTheTerm],
    ['the same team sold by lines', linesThreeMonths],
    ['a quote with tax', designerWithTax('0.19')]
  ] as const)('%s: no internal key, amount or name, in the data or in the scaffold', (_, result) => {
    const data = emitted(result, { ...texts(), paymentMilestones: milestones })
    const internals = internalsOf(result)

    // Premise: the result does hold what must not leave it.
    expect(internals.amounts.length).toBeGreaterThan(3)
    expect(internals.names.length).toBeGreaterThan(2)

    // Only the keys of the data contract, at the top and in every block the quote fills.
    expect(Object.keys(data).every(key => CONTRACT_KEYS.includes(key))).toBe(true)
    for (const line of data.lines)
      expect(
        Object.keys(line).every(key => ['label', 'detail', 'group', 'quantity', 'unitNet', 'net'].includes(key))
      ).toBe(true)
    for (const item of data.clientPaidDirectly ?? [])
      expect(Object.keys(item)).toEqual(['label', 'amount', 'currency', 'detail'])
    for (const milestone of data.paymentSchedule!.milestones)
      expect(Object.keys(milestone)).toEqual(['label', 'when', 'net'])
    expect(Object.keys(data.source)).toEqual(['system', 'calculationId', 'digest', 'engineVersion'])

    // `supplier` is the issuer of the document, written by the brief; `vatRate` is the tax of the quote. Beyond
    // those two, no key speaks of cost, margin, rate, supplier, policy, profile or floor.
    const quoteGiven = {
      lines: data.lines,
      clientPaidDirectly: data.clientPaidDirectly,
      paymentSchedule: data.paymentSchedule,
      source: data.source
    }

    expect(data.supplier).toEqual(texts().supplier)
    for (const key of keysOf(quoteGiven))
      expect(key).not.toMatch(/cost|margin|rate|supplier|policy|profile|floor|markup|key|kind/i)
    expect(
      Object.keys(data)
        .filter(key => /cost|margin|rate|supplier|policy|profile|floor/i.test(key))
        .sort()
    ).toEqual(['supplier', 'vatRate'])

    for (const [name, output] of [
      ['data', data],
      ['scaffold', scaffold(result)]
    ] as const) {
      const values = leaves(output)
      const printed = JSON.stringify(output)

      for (const amount of internals.amounts) expect(values, `${name} holds an internal amount`).not.toContain(amount)

      // The scaffold lists the keys a brief addresses lines by, which derive from the ids of lines and costs; the
      // data never does.
      for (const internal of internals.names)
        if (name === 'data' || !Object.keys(scaffold(result).brief.lines).some(key => key.includes(internal)))
          expect(printed, `${name} holds an internal name`).not.toContain(internal)
    }

    expect(JSON.stringify(data)).not.toMatch(/third_party|ECG-|allocation:/)
  })

  it('the preview is the same firewall, printed by concept and net, and did not move', () => {
    for (const path of corpus) {
      const result = frozen(path).semantic.result
      const preview = projectCompositionPreview(result)
      const items = clientSafePeriodItems(result)

      expect(Object.keys(preview.periods[0])).toEqual(['periodId', 'currency', 'items', 'net'])
      expect(preview.periods.map(period => period.items)).toEqual(
        items.map(period => period.items.map(item => ({ label: item.label, net: item.net })))
      )
      for (const period of preview.periods)
        for (const item of period.items) expect(Object.keys(item)).toEqual(['label', 'net'])

      // Keys are unique in a period and no key or kind is printed by the preview.
      for (const period of items) expect(new Set(period.items.map(item => item.key)).size).toBe(period.items.length)
      expect(JSON.stringify(preview) + compositionPreviewMarkdown(result)).not.toMatch(/"key"|"kind"|third_party:/)
    }

    // The previews committed before the firewall was given a name are reproduced byte for byte.
    for (const name of ['designer', 'service'])
      expect(print(projectCompositionPreview(frozen(`${OPERATING}/${name}.artifact.json`).semantic.result))).toBe(
        readFileSync(`${OPERATING}/${name}.preview.json`, 'utf8')
      )
  })

  it('keys name the same concept in every period and say what kind it is', () => {
    expect(
      clientSafePeriodItems(managedSuppliersOverTheTerm).map(period => period.items.map(item => [item.key, item.kind]))
    ).toEqual([
      [
        ['fee', 'fee'],
        ['third_party:tp-production', 'third_party'],
        ['third_party:tp-media', 'third_party']
      ],
      [
        ['fee', 'fee'],
        ['third_party:tp-talent', 'third_party'],
        ['third_party:tp-media', 'third_party']
      ],
      [['fee', 'fee']]
    ])
    expect(
      clientSafePeriodItems(designerThreeMonths).map(period => period.items.map(item => [item.key, item.kind]))
    ).toEqual([
      [
        ['design', 'line'],
        ['design:setup', 'setup']
      ],
      [['design', 'line']],
      [['design', 'line']]
    ])
    // A managed service with a setup row: `setup`, once, whatever rows it came from.
    expect(
      clientSafePeriodItems(frozen(`${OPERATING}/service.artifact.json`).semantic.result)[0].items.map(item => item.key)
    ).toEqual(['fee', 'setup'])
  })
})

// The generator of the A4 quote is the consumer of the data. It is loaded by path at run time, so this module does
// not become part of the typed program of the kernel: only the two functions the data must satisfy are named.
type Template = {
  validateQuote: (data: unknown) => unknown
  quoteAmounts: (data: unknown) => { net: number; vat: number | null; total: number | null }
}

describe('conformance with the A4 quote template (scripts/documents/render-cotizacion-a4.mjs)', () => {
  const template = (): Promise<Template> =>
    import(/* @vite-ignore */ pathToFileURL(resolve(root, 'scripts/documents/render-cotizacion-a4.mjs')).href)

  const milestones: PaymentMilestone[] = [
    { id: 'a', label: 'Anticipo', share: '0.5', when: 'A la aceptación' },
    { id: 'b', label: 'Saldo', share: '0.5', periodId: 1 }
  ]

  it.each([
    ['designer (tax not resolved)', designer, texts()],
    ['managed service with suppliers and a payment calendar', managed, { ...texts(), paymentMilestones: milestones }],
    ['managed service over three months', managedSuppliersOverTheTerm, { ...texts(), paymentMilestones: milestones }],
    ['the same team sold by lines', linesThreeMonths, texts()],
    ['a fee that changes in the third month', managedFeeChanges, texts()],
    ['designer with a month off', designerWithGap, texts()],
    ['exclusive tax', designerWithTax('0.19'), texts()],
    ['exclusive tax of four decimals', designerWithTax('0.1925'), texts()],
    ['exclusive tax rounded month by month', taxRoundedByMonth, texts()],
    ['the three-month example with IVA', frozen(`${THREE_MONTHS}.artifact.json`).semantic.result, texts()],
    ['tax not applicable', designerTaxNotApplicable, texts()],
    [
      'a quote in dollars',
      designerInDollars,
      { ...texts(), pricing: { ...(texts().pricing as Json), monthly: { months: 1, note: 'Referencia.' } } }
    ]
  ] as const)('%s: the template accepts the data and computes the totals of the quote', async (_, result, brief) => {
    const { validateQuote, quoteAmounts } = await template()
    const data = emitted(result, brief)
    const totals = totalsOf(result)

    // JSON as the CLI writes it: what the generator reads from a file.
    const read = JSON.parse(JSON.stringify(data))

    expect(() => validateQuote(read)).not.toThrow()

    const amounts = quoteAmounts(read)

    // Net, tax and grand total of the quote, for every tax kind: pending stays unknown (null), a tax that does not
    // apply is zero with the total equal to the net, and an exclusive rate prints the tax the quote froze.
    expect(new D(amounts.net).toFixed()).toBe(new D(totals.net).toFixed())

    if (totals.tax === null) {
      expect(totals.grandTotal).toBeNull()
      expect(amounts.vat).toBeNull()
      expect(amounts.total).toBeNull()
    } else {
      expect(amounts.vat).not.toBeNull()
      expect(amounts.total).not.toBeNull()
      expect(new D(amounts.vat!).toFixed()).toBe(new D(totals.tax).toFixed())
      expect(new D(amounts.total!).toFixed()).toBe(new D(totals.grandTotal!).toFixed())
    }
  })

  it.each(EXAMPLES)('%s.document.json is accepted by the template as committed', async example => {
    const { validateQuote, quoteAmounts } = await template()
    const data = read(`${example}.document.json`)
    const totals = totalsOf(frozen(`${example}.artifact.json`).semantic.result)

    expect(() => validateQuote(data)).not.toThrow()

    const amounts = quoteAmounts(data)

    expect(new D(amounts.net).toFixed()).toBe(new D(totals.net).toFixed())
    expect(amounts.vat === null ? null : new D(amounts.vat).toFixed()).toBe(
      totals.tax === null ? null : new D(totals.tax).toFixed()
    )
    expect(amounts.total === null ? null : new D(amounts.total).toFixed()).toBe(
      totals.grandTotal === null ? null : new D(totals.grandTotal).toFixed()
    )
  })
})

describe('compose document (CLI)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-quote-document-'))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const cli = (...args: string[]) =>
    spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

  it('without a brief it prints the scaffold and exits 2; --out keeps the brief alone', () => {
    const out = join(dir, 'brief.json')
    const run = cli('compose', 'document', '--input', `${MANAGED}.artifact.json`, '--out', out)
    const artifact = frozen(`${MANAGED}.artifact.json`)
    const expected = scaffoldQuoteDocumentBrief(artifact.semantic.result, artifact)

    if (!expected.ok) throw new Error('scaffold rejected')

    expect(run.status).toBe(2)
    expect(JSON.parse(run.stdout)).toEqual(clone(expected.reading))
    expect(read(out)).toEqual(clone(expected.reading.brief))
  })

  it('with a brief it prints and writes the data of the document and exits 3', () => {
    const out = join(dir, 'data.json')

    const run = cli(
      'compose',
      'document',
      '--input',
      `${MANAGED}.artifact.json`,
      '--brief',
      `${MANAGED}.document-brief.json`,
      '--out',
      out
    )

    expect(run.status).toBe(3)
    // The committed example is what the command prints, to the byte, and what it writes.
    expect(run.stdout).toBe(readFileSync(`${MANAGED}.document.json`, 'utf8'))
    expect(readFileSync(out, 'utf8')).toBe(run.stdout)
  })

  it('a rejection exits 1 with the code of the reading and the option to correct', () => {
    const brief = join(dir, 'with-amount.json')

    const run = cli(
      'compose',
      'document',
      '--input',
      `${DESIGNER}.artifact.json`,
      '--brief',
      `${MANAGED}.document-brief.json`
    )

    const report = JSON.parse(run.stderr)

    // The brief of another quote: its line keys are not the ones of this one.
    expect(run.status).toBe(1)
    expect(run.stdout).toBe('')
    expect(report.error).toMatchObject({ code: 'QUOTE_DOCUMENT_BRIEF_INVALID', option: 'brief' })
    expect(report.error.issues).toEqual([
      { path: 'lines.0', rule: 'unknown_key' },
      { path: 'lines.1', rule: 'unknown_key' }
    ])

    expect(cli('compose', 'document', '--brief', brief).status).toBe(1)
    expect(
      JSON.parse(cli('compose', 'document', '--input', `${DESIGNER}.artifact.json`, '--milestones', brief).stderr).error
    ).toMatchObject({
      code: 'INVALID_ARGUMENT',
      option: 'milestones'
    })
  })

  it('is listed in the usage the tool prints', () => {
    const usage = JSON.parse(cli('help').stdout)

    expect(usage.operations.compose).toContain(
      'document --input artifact.json [--brief document-brief.json] [--out data.json]'
    )
  })
})
