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
//     generator is the real consumer of the data; nothing here asserts what its code says;
//   - for the reference value of a courtesy, the same demand quoted without the waiver: what a waived line «would
//     have been charged for» is what the kernel charges for it when nothing waives it;
//   - for the price of an option, the period totals of the option's own frozen artifact;
//   - for a combined line, the client-safe items again: its net is what the firewall charges for the keys it names,
//     added over the term, and every other line is the one the same quote prints with no combination;
//   - for the tax and the total of a payment milestone, `presentPaymentSchedule` and the totals the quote froze.
//
// Quotes over several periods are composed in memory from the frozen inputs of the two committed examples, with the
// demand edited where an operator would edit it. Where the reading must reject a result the kernel cannot produce
// (lines that do not add up, two rows on one key), a frozen result is copied and edited: the reader takes any
// result of that shape and is the last check before a document exists. Nothing is written under data/.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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
  QUOTE_DOCUMENT_DEFAULT_OPTIONS_TEXTS,
  QUOTE_DOCUMENT_DEFAULT_SCHEDULE_TEXTS,
  QUOTE_DOCUMENT_SCAFFOLD_VERSION,
  composeQuoteDocument,
  scaffoldQuoteDocumentBrief
} from '../resources/quote-document'
import type { QuoteDocumentData, QuoteDocumentOption } from '../resources/quote-document'
import {
  clientSafePeriodItems,
  clientSafeWaivedItems,
  compositionPreviewMarkdown,
  projectCompositionPreview
} from '../resources/readiness'

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
// The example of a courtesy and of optional add-ons: the three-month designer with its start-up waived, and the
// frozen quote of each option alone. Its document needs the options, so it is read by cases of its own.
const COURTESY = `${OPERATING}/designer-startup-courtesy`
const SERVICE = `${OPERATING}/service`
// The example of a price printed as what it is: a managed service of three months as one programme price, with two
// payment milestones and their tax. It is another document of the artifact of the add-on example, so its artifact
// does not carry its name and it is read by cases of its own.
const PROGRAMME = `${OPERATING}/managed-addon-increment.programme-price`
const PROGRAMME_ARTIFACT = `${OPERATING}/managed-addon-increment.artifact.json`
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
 * A programme of twelve months with a supplier re-invoiced every month at a net that is not a multiple of anything:
 * the kernel rounds the tax of each of the twelve months, and their sum is several units away from the tax of the
 * whole net rounded once.
 */
const twelveMonthsTaxRoundedByMonth = calculated(
  recompose(MANAGED, demand => {
    over(demand, 12)
    demand.brief.thirdPartyCosts!.find(cost => cost.costId === 'tp-media')!.periodIds = Array.from(
      { length: 12 },
      (_, index) => index + 1
    )
    demand.brief.taxTreatment = exclusive('0.19')
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

// ---- quotes that waive something, each next to the same demand quoted without the waiver ----

type Adjustment = NonNullable<Demand['brief']['adjustments']>[number]

/** The rows of `billing` class of `lineIds` at an agreed net of zero: the explicit way a quote waives them. */
const waived = (billing: 'setup' | 'third_party', lineIds: string[]): Adjustment[] => [
  { adjustmentId: 'waiver-under-test', kind: 'agreed_net', amount: '0', billing, lineIds, reason: 'Declared.' }
]

/** The committed example: three months with IVA and the start-up of its line waived by an agreed net of zero. */
const startupWaived = frozen(`${COURTESY}.artifact.json`).semantic.result

const startupCharged = calculated(
  recompose(COURTESY, demand => {
    demand.brief.adjustments = []
  })
)

/** A team sold by lines over three months with its first line given away whole, by a discount of its full rate. */
const lineWaived = calculated(
  recompose(MANAGED, demand => {
    over(demand, 3)
    demand.commercialUnit = 'role_capacity'
    demand.brief.adjustments = [
      {
        adjustmentId: 'waiver-under-test',
        kind: 'discount',
        rate: '1',
        lineIds: [demand.brief.lines[0].lineId],
        reason: 'Declared.'
      }
    ]
  })
)

/** A managed service whose setup (two rows, one item of the firewall) is waived: the firewall stops listing it. */
const serviceSetupWaived = calculated(
  recompose(SERVICE, demand => {
    demand.brief.adjustments = waived(
      'setup',
      demand.brief.lines.map(line => line.lineId)
    )
  })
)

const serviceSetupCharged = frozen(`${SERVICE}.artifact.json`).semantic.result

/** A managed service that absorbs the first of its re-invoiced costs. */
const supplierWaived = calculated(
  recompose(MANAGED, demand => {
    demand.brief.adjustments = waived('third_party', ['tp-production'])
  })
)

const dollarsStartupWaived = calculated(
  recompose(DESIGNER, demand => {
    demand.brief.outputCurrency = 'USD'
    demand.brief.adjustments = waived('setup', ['design'])
  })
)

/** [name, the quote that waives, the same demand without the waiver, the keys of the firewall it waives] */
const WAIVERS = [
  ['a start-up, by an agreed net of zero', startupWaived, startupCharged, ['design:setup']],
  ['a whole line, by a discount of its full rate', lineWaived, linesThreeMonths, ['primary']],
  ['the setup of a managed service', serviceSetupWaived, serviceSetupCharged, ['setup']],
  ['a re-invoiced cost the service absorbs', supplierWaived, managed, ['third_party:tp-production']],
  ['a start-up in dollars', dollarsStartupWaived, designerInDollars, ['design:setup']]
] as const

// ---- options: the frozen quote of each alone, as the CLI hands them over ----

/** A frozen quote as an option of a document, under `key`. Its identity is the one of its artifact. */
const optionFrom = (key: string, path: string): QuoteDocumentOption => {
  const artifact = frozen(path)

  return { key, result: artifact.semantic.result, identity: artifact }
}

const copywriter = optionFrom('copywriter', `${COURTESY}.option-copywriter.artifact.json`)
const motion = optionFrom('motion', `${COURTESY}.option-motion.artifact.json`)
const OPTIONS = [copywriter, motion]

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

/** The texts of the two options of the example, by key. No digit: a figure can only come from a frozen quote. */
const optionTexts = (): Json => ({
  copywriter: { label: 'Redacción creativa', unit: 'al mes' },
  motion: { label: 'Edición de video', detail: 'Una persona durante la campaña.', unit: 'por campaña' }
})

const document = (result: Composition, brief: unknown = texts(), options: QuoteDocumentOption[] = []) =>
  composeQuoteDocument(result, IDENTITY, brief, options)

const emitted = (
  result: Composition,
  brief: unknown = texts(),
  options: QuoteDocumentOption[] = []
): QuoteDocumentData => {
  const outcome = document(result, brief, options)

  if (!outcome.ok) throw new Error(`document rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

  return outcome.reading
}

const scaffold = (result: Composition, options: QuoteDocumentOption[] = []) => {
  const outcome = scaffoldQuoteDocumentBrief(result, IDENTITY, options)

  if (!outcome.ok) throw new Error(`scaffold rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

  return outcome.reading
}

const rejection = (result: Composition, brief: unknown = texts(), options: QuoteDocumentOption[] = []) => {
  const outcome = document(result, brief, options)

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

/** The tax of the whole net of a quote, rounded once: what a reader computes from the rate with no amount given. */
const taxRoundedOnce = (result: Composition, rate: string) =>
  new D(totalsOf(result).net)
    .mul(rate)
    .toDecimalPlaces(totalsOf(result).net.split('.')[1]?.length ?? 0, D.ROUND_HALF_UP)

/** The same quote with its frozen tax set to `tax`, and its total with it: a result no kernel run produces. */
const withTax = (result: Composition, tax: Decimal) => {
  const edited = clone(result)
  const totals = edited.quote.totals!
  const scale = totals.net.split('.')[1]?.length ?? 0

  totals.tax = tax.toFixed(scale)
  totals.grandTotal = new D(totals.net).plus(totals.tax).toFixed(scale)

  return edited
}

/** The same quote with its frozen tax moved by `units` of the currency, and its total with it. */
const withTaxMovedBy = (result: Composition, units: number) => withTax(result, new D(totalsOf(result).tax!).plus(units))

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
      expect(data).not.toHaveProperty('taxPeriods')
    } else {
      expect(data.taxAmount).toBe(totals.tax)
      // With the frozen tax, the periods it was rounded over: the ones of the quote.
      expect(data.taxPeriods).toBe(artifact.semantic.result.quote.periods.length)
    }
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
  it('not resolved: no rate and no amount are assumed', () => {
    expect(totalsOf(designer).tax).toBeNull()
    expect(emitted(designer).vatRate).toBeNull()
    expect(emitted(designer)).not.toHaveProperty('taxAmount')
    expect(emitted(designer)).not.toHaveProperty('taxPeriods')
    expect(emitted(designer)).not.toHaveProperty('taxStatus')
  })

  it('exclusive: the rate, and with it the tax the quote froze', () => {
    const result = designerWithTax('0.19')
    const totals = totalsOf(result)
    const data = emitted(result)

    expect(data.vatRate).toBe(0.19)
    expect(data.taxAmount).toBe(totals.tax)
    // The periods of the quote: one, whatever its two lines count.
    expect(result.quote.periods.length).toBe(1)
    expect(data.taxPeriods).toBe(1)
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
    expect(data.taxPeriods).toBe(3)
    expect(data.taxAmount).not.toBe(roundedOnce.toFixed(0))
    expect(new D(data.net).plus(data.taxAmount!).toFixed()).toBe(totals.grandTotal)
    expect(scaffold(taxRoundedByMonth).quote).toMatchObject({ vatRate: 0.19, taxAmount: totals.tax })
  })

  it('the frozen tax is held to the rate: one unit per period of the quote, and no more', () => {
    // [the quote, its rate]: one period with two lines, three periods with four units of lines, and two periods
    // with a month off between them.
    const cases = [
      [designerWithTax('0.19'), 1],
      [frozen(`${THREE_MONTHS}.artifact.json`).semantic.result, 3],
      [
        calculated(
          recompose(DESIGNER, demand => {
            withoutCreditTools(demand)
            over(demand, 3)
            demand.brief.lines[0].activePeriods = [1, 3]
            demand.allocations = demand.allocations.filter(allocation => allocation.periodId !== 2)
            demand.brief.taxTreatment = exclusive('0.19')
          })
        ),
        2
      ]
    ] as const

    for (const [result, periods] of cases) {
      const once = taxRoundedOnce(result, '0.19')

      // Premise: the bound is the periods of the quote, which is not what its lines happen to count.
      expect(result.quote.periods.length).toBe(periods)
      expect(scaffold(result).lines.reduce((total, line) => total + line.quantity.value, 0)).not.toBe(periods)

      for (const units of [periods, -periods]) {
        const data = emitted(withTax(result, once.plus(units)))

        expect(data.taxAmount).toBe(once.plus(units).toFixed(0))
        expect(data.taxPeriods).toBe(periods)
      }

      for (const units of [periods + 1, -(periods + 1)]) {
        const edited = withTax(result, once.plus(units))
        const outcome = rejection(edited)

        expect(outcome.code).toBe('QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE')
        expect(outcome.issues).toEqual([{ path: 'totals.tax', rule: 'tax_differs_from_rate' }])
        expect(scaffoldQuoteDocumentBrief(edited, IDENTITY)).toMatchObject({ ok: false, code: outcome.code })
      }
    }
  })

  it('a quote of more periods than the template counts a tax over is rejected', () => {
    const periodsOf = (count: number) => {
      const edited = clone(designerWithTax('0.19'))
      const [period] = edited.quote.periods
      const totals = edited.quote.totals!

      // One period repeated, with totals that follow: only the count of periods is under test.
      edited.quote.periods = Array.from({ length: count }, (_, index) => ({ ...period, periodId: index + 1 }))
      totals.net = new D(period.result.totals!.net).mul(count).toFixed(0)
      totals.tax = new D(period.result.totals!.tax!).mul(count).toFixed(0)
      totals.grandTotal = new D(totals.net).plus(totals.tax).toFixed(0)

      return edited
    }

    expect(emitted(periodsOf(120)).taxPeriods).toBe(120)
    expect(rejection(periodsOf(121))).toMatchObject({
      code: 'QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE',
      issues: [{ path: 'periods', rule: 'too_many' }]
    })
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

  it('with an exclusive rate each milestone carries its part of the frozen tax and its total', () => {
    // Three months whose tax the kernel rounded month by month: the tax of the quote is not the one of its net
    // rounded once, so a milestone tax computed here from the rate would not add up to it.
    const totals = totalsOf(taxRoundedByMonth)
    const reading = presentPaymentSchedule(taxRoundedByMonth, IDENTITY, list)

    if (!reading.ok) throw new Error('schedule rejected')

    const data = emitted(taxRoundedByMonth, { ...texts(), paymentMilestones: list })
    const milestones = data.paymentSchedule!.milestones

    expect(milestones).toEqual(
      reading.reading.milestones.map((milestone, index) => ({
        label: list[index].label,
        when: index === 1 ? 'Mes 2' : list[index].when,
        net: milestone.amount,
        tax: milestone.tax,
        total: milestone.total
      }))
    )

    // What a reader adds up from the table is what the quote froze: its net, its tax and its grand total.
    expect(sum(milestones.map(milestone => milestone.net)).toFixed()).toBe(new D(totals.net).toFixed())
    expect(sum(milestones.map(milestone => milestone.tax!)).toFixed()).toBe(new D(totals.tax!).toFixed())
    expect(sum(milestones.map(milestone => milestone.total!)).toFixed()).toBe(new D(totals.grandTotal!).toFixed())
    for (const milestone of milestones)
      expect(new D(milestone.net).plus(milestone.tax!).toFixed()).toBe(new D(milestone.total!).toFixed())
    expect(data.taxAmount).toBe(totals.tax)

    // The default note says the amounts carry no tax: it is not printed over a table that states it, and nothing
    // takes its place. A note of the brief is printed as written.
    expect(data.paymentSchedule).toEqual({ title: QUOTE_DOCUMENT_DEFAULT_SCHEDULE_TEXTS.title, milestones })
    expect(
      emitted(taxRoundedByMonth, {
        ...texts(),
        paymentMilestones: list,
        paymentScheduleTexts: { note: 'Cada hito se factura al cumplirse.' }
      }).paymentSchedule
    ).toEqual({
      title: QUOTE_DOCUMENT_DEFAULT_SCHEDULE_TEXTS.title,
      note: 'Cada hito se factura al cumplirse.',
      milestones
    })
  })

  it('without a resolved tax, or with one that does not apply, a milestone is its net', () => {
    const two: PaymentMilestone[] = [
      { id: 'a', label: 'Anticipo', share: '0.5', when: 'A la aceptación' },
      { id: 'b', label: 'Saldo', share: '0.5', when: 'Al cierre' }
    ]

    for (const result of [designer, designerTaxNotApplicable]) {
      const reading = presentPaymentSchedule(result, IDENTITY, two)

      if (!reading.ok) throw new Error('schedule rejected')

      const data = emitted(result, { ...texts(), paymentMilestones: two })

      // The document prints no tax amount for this quote, so a payment states none either.
      expect(data).not.toHaveProperty('taxAmount')
      expect(data.paymentSchedule).toEqual({
        ...QUOTE_DOCUMENT_DEFAULT_SCHEDULE_TEXTS,
        milestones: reading.reading.milestones.map(milestone => ({
          label: milestone.label,
          when: milestone.when,
          net: milestone.amount
        }))
      })
    }
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
    'taxPeriods',
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

  const LINE_KEYS = ['label', 'detail', 'group', 'quantity', 'unitNet', 'net']

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
    for (const line of data.lines) expect(Object.keys(line).every(key => LINE_KEYS.includes(key))).toBe(true)
    for (const item of data.clientPaidDirectly ?? [])
      expect(Object.keys(item)).toEqual(['label', 'amount', 'currency', 'detail'])
    // A milestone is a net; with the tax of the quote resolved to a rate, also its part of that tax and its total.
    for (const milestone of data.paymentSchedule!.milestones)
      expect(Object.keys(milestone)).toEqual(
        totalsOf(result).tax === null ? ['label', 'when', 'net'] : ['label', 'when', 'net', 'tax', 'total']
      )
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

  it('with a courtesy and options: one figure more per marked line and one per option, and nothing internal', () => {
    const brief = {
      ...texts(),
      lines: { 'design:setup': { courtesy: true } },
      options: optionTexts(),
      paymentMilestones: milestones
    }

    const data = emitted(startupWaived, brief, OPTIONS)

    // The two additions to the contract, and only them.
    expect(Object.keys(data).filter(key => !CONTRACT_KEYS.includes(key))).toEqual(['options'])
    expect(Object.keys(data.options!)).toEqual(['title', 'note', 'items'])
    for (const item of data.options!.items)
      expect(Object.keys(item).every(key => ['label', 'detail', 'net', 'unit'].includes(key))).toBe(true)
    expect(data.lines.flatMap(line => Object.keys(line)).filter(key => !LINE_KEYS.includes(key))).toEqual([
      'referenceNet'
    ])
    for (const key of keysOf({ lines: data.lines, options: data.options, source: data.source }))
      expect(key).not.toMatch(/cost|margin|rate|supplier|policy|profile|floor|markup|key|kind|discount|adjust/i)

    // Every figure the two additions print is one the frozen quotes expose on purpose: the price the waived row
    // had, and the net of a period of each option. Nothing else of the three results is in the data.
    const exposed = [
      ...clientSafeWaivedItems(startupWaived).flatMap(period => period.items.map(item => item.referenceNet)),
      ...OPTIONS.map(option => option.result.quote.periods[0].result.totals!.net)
    ]

    const values = leaves(data)
    const printed = JSON.stringify(data)

    for (const result of [startupWaived, ...OPTIONS.map(option => option.result)]) {
      const internals = internalsOf(result)

      expect(internals.amounts.length).toBeGreaterThan(3)
      for (const amount of internals.amounts.filter(amount => !exposed.includes(amount)))
        expect(values, 'the data holds an internal amount').not.toContain(amount)
      for (const internal of internals.names) expect(printed, 'the data holds an internal name').not.toContain(internal)
    }

    // The reason of the waiver and the adjustment itself stay in the quote.
    for (const adjustment of startupWaived.quote.resolution.brief!.adjustments ?? []) {
      expect(printed).not.toContain(adjustment.reason)
      expect(printed).not.toContain(adjustment.adjustmentId)
    }
  })

  it('with keys combined and milestones with their tax: sums of what the firewall exposes, and nothing internal', () => {
    const result = taxRoundedByMonth
    const keys = [...chargedByKey(result).keys()]
    const supplierKeys = keys.filter(key => key !== 'fee')

    // Premise: a fee and re-invoiced supplier costs, whose keys carry the ids of those costs.
    expect(keys).toContain('fee')
    expect(supplierKeys.length).toBeGreaterThan(1)

    const data = emitted(result, {
      ...texts(),
      combine: [
        { keys: ['fee'], label: 'Programa', unit: 'programa' },
        { keys: supplierKeys, label: 'Producción y medios', unit: 'campaña' }
      ],
      paymentMilestones: milestones
    })

    // The contract of the data is the one it had: a combined line is a line, with fewer keys than a folded one.
    expect(Object.keys(data).every(key => CONTRACT_KEYS.includes(key))).toBe(true)
    expect(data.lines.map(line => Object.keys(line))).toEqual([
      ['label', 'group', 'quantity', 'net'],
      ['label', 'group', 'quantity', 'net']
    ])
    for (const milestone of data.paymentSchedule!.milestones)
      expect(Object.keys(milestone)).toEqual(['label', 'when', 'net', 'tax', 'total'])
    for (const key of keysOf({ lines: data.lines, paymentSchedule: data.paymentSchedule, source: data.source }))
      expect(key).not.toMatch(/cost|margin|rate|supplier|policy|profile|floor|markup|key|kind|combine/i)

    // Each net is a sum of nets the firewall exposes; no cost, margin or name of the result is in the data, and
    // neither are the keys the brief named the lines by.
    const charged = chargedByKey(result)
    const netOf = (names: string[]) => sum(names.flatMap(key => charged.get(key)!.map(period => period.net))).toFixed(0)

    expect(data.lines.map(line => line.net)).toEqual([netOf(['fee']), netOf(supplierKeys)])

    const internals = internalsOf(result)
    const values = leaves(data)
    const printed = JSON.stringify(data)

    expect(internals.amounts.length).toBeGreaterThan(3)
    for (const amount of internals.amounts) expect(values, 'the data holds an internal amount').not.toContain(amount)
    for (const internal of internals.names) expect(printed, 'the data holds an internal name').not.toContain(internal)
    for (const key of supplierKeys) expect(printed).not.toContain(key)
    expect(printed).not.toMatch(/third_party|ECG-|allocation:/)
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

describe('what a quote waives, and what it would have charged for it (clientSafeWaivedItems)', () => {
  /** Per key, the periods it is waived in and the reference value of each. */
  const waivedByKey = (result: Composition) => {
    const byKey = new Map<string, { periodId: number; net: string }[]>()

    for (const period of clientSafeWaivedItems(result))
      for (const item of period.items)
        byKey.set(item.key, [...(byKey.get(item.key) ?? []), { periodId: period.periodId, net: item.referenceNet }])

    return byKey
  }

  it('the committed example: the start-up row is zero through its adjustment and keeps the price it had', () => {
    const artifact = frozen(`${COURTESY}.artifact.json`)
    const setup = rowsOf(startupWaived).filter(row => row.kind === 'setup')

    // Premise, from the frozen demand and the kernel row: an agreed net of zero on the setup, a net of zero, and
    // the whole price of the row taken off as discount.
    expect(artifact.semantic.demand.brief.adjustments).toMatchObject([
      { kind: 'agreed_net', amount: '0', billing: 'setup', lineIds: ['design'] }
    ])
    expect(setup.length).toBe(1)
    expect(setup[0].net).toBe('0')
    expect(new D(setup[0].undiscountedPrice).gt(0)).toBe(true)
    expect(setup[0].discount).toBe(setup[0].undiscountedPrice)

    expect(clientSafeWaivedItems(startupWaived)).toEqual([
      {
        periodId: 1,
        items: [
          {
            key: 'design:setup',
            kind: 'setup',
            label: 'Implementación inicial',
            position: 1,
            referenceNet: setup[0].undiscountedPrice
          }
        ]
      },
      { periodId: 2, items: [] },
      { periodId: 3, items: [] }
    ])
  })

  it.each(WAIVERS)(
    '%s: the reference is what the same demand is charged for it without the waiver',
    (_, waiver, twin, keys) => {
      const references = waivedByKey(waiver)
      const charged = chargedByKey(twin)

      expect([...references.keys()]).toEqual([...keys])

      for (const key of keys) {
        // The verifier is another calculation of the kernel: the demand with no adjustment charges exactly this.
        expect(charged.get(key)?.length).toBeGreaterThan(0)
        expect(references.get(key)).toEqual(charged.get(key))
        // And the quote that waives it charges nothing for it, anywhere.
        expect(chargedByKey(waiver).has(key)).toBe(false)
      }

      // Nothing else of the two quotes differs for a client: every other key is charged the same.
      for (const [key, periods] of chargedByKey(waiver)) expect(periods).toEqual(charged.get(key))
    }
  )

  const everyQuote: [string, Composition][] = [
    ...corpus.map(path => [path, frozen(path).semantic.result] as [string, Composition]),
    ...WAIVERS.map(([name, waiver]) => [name, waiver] as [string, Composition]),
    ['managed service over three months', managedSuppliersOverTheTerm],
    ['the same team sold by lines', linesThreeMonths]
  ]

  it.each(everyQuote)(
    '%s: an entry names its concept as the firewall does, and nothing else of its rows',
    (_, result) => {
      const firewall = clientSafePeriodItems(result)
      const reading = clientSafeWaivedItems(result)
      const zero = new D(0).toFixed(totalsOf(result).net.split('.')[1]?.length ?? 0)

      expect(reading.map(period => period.periodId)).toEqual(firewall.map(period => period.periodId))

      // A quote with no row at zero waives nothing: the list is empty for almost every quote.
      if (!rowsOf(result).some(row => new D(row.net).isZero()))
        expect(reading.flatMap(period => period.items)).toEqual([])

      reading.forEach((period, index) => {
        expect(new Set(period.items.map(item => item.key)).size).toBe(period.items.length)

        for (const item of period.items) {
          expect(Object.keys(item)).toEqual(['key', 'kind', 'label', 'position', 'referenceNet'])
          expect(new D(item.referenceNet).gt(0)).toBe(true)

          const listed = firewall[index].items.some(other => other.key === item.key)

          // Where the firewall lists the item, it is that item: same key, kind and label, at that place, at zero.
          if (listed)
            expect(firewall[index].items[item.position]).toEqual({
              key: item.key,
              kind: item.kind,
              label: item.label,
              net: zero
            })
          // It only leaves out the setup of a managed service that charges none: it would follow the fee.
          else {
            expect(result.commercialUnit).toBe('managed_service')
            expect(item).toMatchObject({ key: 'setup', kind: 'setup', position: 1 })
            expect(firewall[index].items[0].key).toBe('fee')
          }
        }
      })
    }
  )

  it('the committed corpus holds quotes that waive something and many that do not', () => {
    const waiving = corpus.filter(path =>
      clientSafeWaivedItems(frozen(path).semantic.result).some(period => period.items.length)
    )

    expect(waiving).toContain(`${COURTESY}.artifact.json`)
    expect(corpus.length - waiving.length).toBeGreaterThan(5)
  })

  it('a zero no adjustment explains, a row with no price and a setup waived in part are not waivers', () => {
    // The net of a row moved to zero by hand: nothing of the quote says it was given away.
    const unexplained = clone(linesThreeMonths)
    const row = unexplained.quote.periods[1].result.lines[0]

    unexplained.quote.periods[1].result.totals!.net = new D(unexplained.quote.periods[1].result.totals!.net)
      .minus(row.net)
      .toFixed(0)
    unexplained.quote.totals!.net = new D(unexplained.quote.totals!.net).minus(row.net).toFixed(0)
    row.net = '0'
    expect(clientSafeWaivedItems(unexplained).flatMap(period => period.items)).toEqual([])

    // A row that never had a price: zero before and after, with nothing waived.
    const priceless = clone(startupWaived)
    const setup = priceless.quote.periods[0].result.lines.find(line => line.kind === 'setup')!

    setup.undiscountedPrice = '0'
    setup.discount = '0'
    expect(clientSafeWaivedItems(priceless).flatMap(period => period.items)).toEqual([])

    // One of the two setup rows of a managed service waived: its setup is still charged, for the other one.
    const inPart = calculated(
      recompose(SERVICE, demand => {
        demand.brief.adjustments = waived('setup', [demand.brief.lines[0].lineId])
      })
    )

    expect(chargedByKey(inPart).has('setup')).toBe(true)
    expect(clientSafeWaivedItems(inPart).flatMap(period => period.items)).toEqual([])

    expect(() => clientSafeWaivedItems(blocked)).toThrow('PREVIEW_REQUIRES_CALCULATED_SIMULATION')
  })

  it('the firewall and the preview say of a waived quote what they said before the reference existed', () => {
    // The start-up at zero is an item of the firewall with no other figure; the reference is in neither reading.
    const reference = clientSafeWaivedItems(startupWaived)[0].items[0].referenceNet

    expect(clientSafePeriodItems(startupWaived)[0].items).toEqual([
      { key: 'design', kind: 'line', label: rowsOf(startupWaived)[0].label, net: rowsOf(startupWaived)[0].net },
      { key: 'design:setup', kind: 'setup', label: 'Implementación inicial', net: '0' }
    ])
    expect(leaves(clientSafePeriodItems(startupWaived))).not.toContain(reference)
    expect(leaves(projectCompositionPreview(startupWaived))).not.toContain(reference)
    expect(compositionPreviewMarkdown(startupWaived)).not.toContain(reference)
  })
})

describe('a courtesy is printed only where the brief asks, with the reference value of the quote', () => {
  const courtesy = (key: string, extra: Json = {}): Json => ({
    ...texts(),
    lines: { [key]: { courtesy: true, ...extra } }
  })

  const referenceOf = (result: Composition, key: string) =>
    sum(
      clientSafeWaivedItems(result)
        .flatMap(period => period.items)
        .filter(item => item.key === key)
        .map(item => item.referenceNet)
    )

  it.each(WAIVERS)(
    '%s: unmarked it prints nothing; marked, a line at zero with its reference',
    (_, waiver, twin, keys) => {
      const [key] = keys
      const plain = emitted(waiver)
      const marked = emitted(waiver, courtesy(key))
      const added = marked.lines.filter(line => line.referenceNet !== undefined)
      const zero = new D(0).toFixed(totalsOf(waiver).net.split('.')[1]?.length ?? 0)

      // Unmarked: the document of today. No line for the waived key and no reference anywhere.
      expect(JSON.stringify(plain)).not.toContain('referenceNet')
      expectLinesFaithful(waiver)

      // Marked: the same lines plus one, which adds nothing to any figure of the document.
      expect(marked.lines.filter(line => line.referenceNet === undefined)).toEqual(plain.lines)
      expect({ ...marked, lines: plain.lines }).toEqual(plain)
      expect(added.length).toBe(1)
      expect(added[0].net).toBe(zero)
      expect(added[0]).not.toHaveProperty('unitNet')
      expect(sum(marked.lines.map(line => line.net)).toFixed()).toBe(new D(totalsOf(waiver).net).toFixed())

      // The reference is what the demand without the waiver charges for that key over the term, at the same scale.
      const unwaived = chargedByKey(twin).get(key)!

      expect(added[0].referenceNet).toBe(
        sum(unwaived.map(period => period.net)).toFixed(zero.split('.')[1]?.length ?? 0)
      )
      expect(added[0].referenceNet).toBe(referenceOf(waiver, key).toFixed(zero.split('.')[1]?.length ?? 0))
      // Counted like the line it stands for: the months it is waived in, or one payment.
      expect(added[0].quantity.value).toBe(unwaived.length)
    }
  )

  it('the example: the start-up as a one-off courtesy, in the group and at the place of a charged start-up', () => {
    const data = emitted(startupWaived, courtesy('design:setup', { label: 'Puesta en marcha', detail: 'Cortesía' }))
    const charged = emitted(startupCharged)

    expect(data.lines[1]).toEqual({
      label: 'Puesta en marcha',
      detail: 'Cortesía',
      group: QUOTE_DOCUMENT_DEFAULT_GROUPS.setup,
      quantity: { value: 1, unit: 'pago único' },
      net: '0',
      // What the start-up line of the same demand reads when nothing waives it.
      referenceNet: charged.lines[1].net
    })
    expect(charged.lines[1]).toMatchObject({ group: 'Puesta en marcha', quantity: { value: 1, unit: 'pago único' } })
    expect(data.lines[0]).toEqual(charged.lines[0])
    // The tax and the total stay the ones of the quote that waives: lower than the ones of the quote that charges.
    expect(data.net).toBe(totalsOf(startupWaived).net)
    expect(data.taxAmount).toBe(totalsOf(startupWaived).tax)
    expect(new D(charged.net).minus(data.net).toFixed()).toBe(data.lines[1].referenceNet)
  })

  it('a courtesy sits where its line would be if it were charged', () => {
    // The first line of the team, given away over three months: first of its group, counted in months.
    const team = emitted(lineWaived, courtesy('primary'))
    const teamCharged = emitted(linesThreeMonths)

    expect(team.lines.map(line => line.label)).toEqual(teamCharged.lines.map(line => line.label))
    expect(team.lines[0]).toMatchObject({ quantity: { value: 3, unit: 'meses' }, net: '0' })
    expect(team.lines[0].referenceNet).toBe(teamCharged.lines[0].net)

    // The first of the re-invoiced costs: before the other two, as the quote lists them.
    const service = emitted(supplierWaived, courtesy('third_party:tp-production'))

    expect(service.lines.map(line => line.label)).toEqual(emitted(managed).lines.map(line => line.label))
    expect(service.lines[1]).toMatchObject({ quantity: { value: 1, unit: 'pago único' }, net: '0' })

    // The setup of a managed service is not an item of the firewall when it is zero: it follows the fee, ahead of
    // the re-invoiced costs, as a charged setup does. A setup row waived whole is added to the frozen example.
    const withSetup = clone(managed)
    const [period] = withSetup.quote.periods
    const model = period.result.lines.find(row => row.kind === 'monthly')!

    period.result.lines = [
      ...period.result.lines,
      {
        ...model,
        lineId: `${model.parentLineId}:1:setup`,
        kind: 'setup',
        undiscountedPrice: '100000',
        discount: '100000',
        net: '0'
      }
    ] as typeof period.result.lines

    expect(emitted(withSetup, courtesy('setup')).lines.map(line => line.group)).toEqual([
      'Servicio',
      'Puesta en marcha',
      'Costos de terceros',
      'Costos de terceros',
      'Costos de terceros'
    ])
  })

  it('a mark is a boolean on a line the quote waives completely; anything else is rejected', () => {
    const cases: [Json, { path: string; rule: string }][] = [
      // A line with a net is never presented as a courtesy.
      [{ design: { courtesy: true } }, { path: 'lines.0.courtesy', rule: 'line_is_charged' }],
      [{ 'design:setup': { courtesy: 'yes' } }, { path: 'lines.0', rule: 'unknown_key' }],
      [{ design: { courtesy: 'yes' } }, { path: 'lines.0.courtesy', rule: 'invalid_courtesy' }],
      // Unmarked, a waived key is the unknown key it was before the mark existed: its line prints nothing.
      [{ 'design:setup': { label: 'Puesta en marcha' } }, { path: 'lines.0', rule: 'unknown_key' }],
      [{ 'design:setup': { courtesy: false } }, { path: 'lines.0', rule: 'unknown_key' }],
      [{ 'not-a-key': { courtesy: true } }, { path: 'lines.0', rule: 'unknown_key' }],
      // The mark brings no figure with it.
      [{ 'design:setup': { courtesy: true, referenceNet: '1' } }, { path: 'lines.0', rule: 'unknown_field' }]
    ]

    for (const [lines, issue] of cases) {
      const outcome = rejection(startupWaived, { ...texts(), lines })

      expect(outcome.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
      expect(outcome.issues).toEqual([issue])
    }

    // `false` on a line the quote charges for is the line of today.
    expect(emitted(startupWaived, { ...texts(), lines: { design: { courtesy: false } } })).toEqual(
      emitted(startupWaived)
    )
    // A quote that waives nothing has no key to mark.
    expect(rejection(designer, courtesy('design:setup')).issues).toEqual([
      { path: 'lines.0.courtesy', rule: 'line_is_charged' }
    ])
  })

  it('a reference value the template cannot take is a fault of the quote, named where the brief asked for it', () => {
    const fraction = clone(startupWaived)
    const setup = fraction.quote.periods[0].result.lines.find(line => line.kind === 'setup')!

    setup.undiscountedPrice = '320000.5'
    setup.discount = '320000.5'

    expect(rejection(fraction, courtesy('design:setup'))).toMatchObject({
      code: 'QUOTE_DOCUMENT_NOT_REPRESENTABLE',
      issues: [{ path: 'lines.0.courtesy', rule: 'reference_not_representable' }]
    })
    // Unasked, it changes nothing: the document and the scaffold of today, which lists no courtesy to choose.
    expect(emitted(fraction)).toEqual(emitted(startupWaived))
    expect(scaffold(fraction)).not.toHaveProperty('waived')
  })

  it('the scaffold lists what the quote waives, apart from the lines and out of the brief', () => {
    const reading = scaffold(startupWaived)

    expect(reading.waived).toEqual([
      {
        key: 'design:setup',
        kind: 'setup',
        label: 'Implementación inicial',
        group: QUOTE_DOCUMENT_DEFAULT_GROUPS.setup,
        quantity: { value: 1, unit: 'pago único' },
        net: '0',
        referenceNet: emitted(startupCharged).lines[1].net
      }
    ])
    // The lines and the brief are the ones of the quote with nothing marked: a courtesy is asked for, not assumed.
    expect(reading.lines.map(line => line.key)).toEqual(['design'])
    expect(Object.keys(reading.brief.lines)).toEqual(['design'])
    expect(emitted(startupWaived, { ...texts(), lines: reading.brief.lines })).toEqual(emitted(startupWaived))
    // As listed is as printed once the key is marked.
    expect(emitted(startupWaived, courtesy('design:setup')).lines[1]).toEqual(
      (({ key, kind, ...line }) => (void key, void kind, line))(reading.waived![0])
    )

    // A quote that waives nothing has no such list.
    for (const result of [designer, managed, linesThreeMonths]) expect(scaffold(result)).not.toHaveProperty('waived')
  })

  it('a courtesy lends the tax guard nothing: the frozen tax is held to the periods of the quote', () => {
    const totals = totalsOf(startupWaived)
    const periods = startupWaived.quote.periods.length
    const printed = emitted(startupWaived, courtesy('design:setup'))

    // Premise: three periods, and lines that count a fourth unit once the courtesy is printed.
    expect(periods).toBe(3)
    expect(printed.lines.reduce((count, line) => count + line.quantity.value, 0)).toBe(4)
    expect(printed.taxPeriods).toBe(3)
    expect(taxRoundedOnce(startupWaived, '0.19').toFixed(0)).toBe(totals.tax)

    // With the courtesy printed or not, the bound is the same three units.
    for (const brief of [texts(), courtesy('design:setup')]) {
      expect(emitted(withTaxMovedBy(startupWaived, periods), brief).taxAmount).toBe(
        new D(totals.tax!).plus(periods).toFixed(0)
      )
      expect(rejection(withTaxMovedBy(startupWaived, periods + 1), brief)).toMatchObject({
        code: 'QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE',
        issues: [{ path: 'totals.tax', rule: 'tax_differs_from_rate' }]
      })
    }
  })
})

describe('optional add-ons: each priced by its own frozen quote, printed apart, outside every figure of the quote', () => {
  const named = (options: unknown = optionTexts(), extra: Json = {}): Json => ({ ...texts(), options, ...extra })

  const periodNets = (option: QuoteDocumentOption) =>
    option.result.quote.periods.map(period => period.result.totals!.net)

  it('the price of an option is the net of one of its periods, as its own artifact froze it', () => {
    const data = emitted(startupWaived, named(), OPTIONS)

    // Premise, from the frozen artifacts: three equal months for one option and a single month for the other.
    expect(periodNets(copywriter).length).toBe(3)
    expect(new Set(periodNets(copywriter)).size).toBe(1)
    expect(new D(periodNets(copywriter)[0]).mul(3).toFixed()).toBe(new D(totalsOf(copywriter.result).net).toFixed())
    expect(periodNets(motion)).toEqual([totalsOf(motion.result).net])

    expect(data.options).toEqual({
      ...QUOTE_DOCUMENT_DEFAULT_OPTIONS_TEXTS,
      items: [
        { label: 'Redacción creativa', net: periodNets(copywriter)[0], unit: 'al mes' },
        {
          label: 'Edición de video',
          detail: 'Una persona durante la campaña.',
          net: periodNets(motion)[0],
          unit: 'por campaña'
        }
      ]
    })
    // Each price is traced to the calculation it came from, in the order printed; a key is never part of the data.
    expect(data.source).toEqual({
      system: 'pricing-v3',
      calculationId: IDENTITY.calculationId,
      digest: IDENTITY.replayDigest,
      engineVersion: startupWaived.quote.periods[0].result.engineVersion,
      option1CalculationId: copywriter.identity.calculationId,
      option1Digest: copywriter.identity.replayDigest,
      option2CalculationId: motion.identity.calculationId,
      option2Digest: motion.identity.replayDigest
    })
    expect(JSON.stringify(data)).not.toMatch(/"copywriter"|"motion"/)
  })

  it('nothing of an option enters the lines, the net, the tax or the total of the quote', () => {
    const without = emitted(startupWaived)
    const { options, source, ...quote } = emitted(startupWaived, named(), OPTIONS)
    const { source: plainSource, ...plain } = without

    expect(options).toBeDefined()
    expect(quote).toEqual(plain)
    expect(source).toMatchObject(plainSource)
    // And the sum a reader could be tempted to make is not the net of anything in the document.
    expect(leaves(quote)).not.toContain(new D(without.net).plus(periodNets(copywriter)[0]).toFixed(0))
  })

  it('the block follows the order and the texts of the brief', () => {
    const reordered = emitted(
      startupWaived,
      named(
        { motion: optionTexts().motion, copywriter: optionTexts().copywriter },
        { optionsTexts: { title: 'Servicios opcionales', note: 'Se acuerdan por separado.' } }
      ),
      OPTIONS
    )

    expect(reordered.options).toMatchObject({ title: 'Servicios opcionales', note: 'Se acuerdan por separado.' })
    expect(reordered.options!.items.map(item => item.net)).toEqual([periodNets(motion)[0], periodNets(copywriter)[0]])
    expect(reordered.source).toMatchObject({
      option1CalculationId: motion.identity.calculationId,
      option2CalculationId: copywriter.identity.calculationId
    })
    // Whatever the order of the flags that passed them.
    expect(emitted(startupWaived, named(), [motion, copywriter]).options).toEqual(
      emitted(startupWaived, named(), OPTIONS).options
    )
  })

  it('an option is one amount that says all of it, or it is rejected by its place in the list', () => {
    const as = (key: string, result: Composition, calculationId = `composition-${key}`): QuoteDocumentOption => ({
      key,
      result,
      identity: { calculationId, replayDigest: `digest-${key}` }
    })

    const zeroNet = clone(motion.result)

    zeroNet.quote.totals!.net = '0'
    zeroNet.quote.periods[0].result.totals!.net = '0'

    const periodsMoved = clone(copywriter.result)

    periodsMoved.quote.totals!.net = new D(periodsMoved.quote.totals!.net).plus(1).toFixed(0)

    const cases: [string, QuoteDocumentOption[], { path: string; rule: string }[]][] = [
      ['a quote that did not calculate', [as('a', blocked)], [{ path: 'options.0', rule: 'not_calculated' }]],
      // The designer in dollars against a quote in pesos: no conversion happens in a document.
      [
        'another currency',
        [copywriter, as('b', designerInDollars)],
        [{ path: 'options.1', rule: 'currency_differs_from_quote' }]
      ],
      // Three months with a start-up in the first: «al mes» would be true of two of them.
      [
        'a net that changes over its periods',
        [as('a', startupCharged)],
        [{ path: 'options.0', rule: 'net_differs_between_periods' }]
      ],
      // The managed example declares a cost its client pays a supplier directly: one amount would leave it out.
      ['a cost the client pays apart', [as('a', managed)], [{ path: 'options.0', rule: 'client_pays_costs_directly' }]],
      ['a net of zero', [as('a', zeroNet)], [{ path: 'options.0', rule: 'amount_not_representable' }]],
      [
        'periods that do not add up to its net',
        [as('a', periodsMoved)],
        [{ path: 'options.0', rule: 'periods_differ_from_net' }]
      ],
      [
        'the quote of the document itself',
        [as('a', motion.result, IDENTITY.calculationId)],
        [{ path: 'options.0', rule: 'same_as_quote' }]
      ],
      [
        'one quote passed twice',
        [motion, { ...motion, key: 'again' }],
        [{ path: 'options.1', rule: 'duplicate_option' }]
      ],
      [
        'one key for two options',
        [motion, { ...copywriter, key: 'motion' }],
        [{ path: 'options.1', rule: 'duplicate_key' }]
      ],
      ['a key that is not a name', [{ ...motion, key: 'dos palabras' }], [{ path: 'options.0', rule: 'invalid_key' }]],
      [
        'more options than a document takes',
        Array.from({ length: 9 }, (_, index) => as(`o${index}`, motion.result)),
        [{ path: 'options', rule: 'too_many' }]
      ]
    ]

    for (const [name, options, issues] of cases) {
      // The brief names whatever was passed, so only the option is at fault.
      const brief = named(Object.fromEntries(options.map(option => [option.key, { label: 'Opción', unit: 'al mes' }])))
      const outcome = rejection(startupWaived, brief, options)

      expect(outcome.code, name).toBe('QUOTE_DOCUMENT_OPTION_INVALID')
      expect(outcome.issues, name).toEqual(issues)
      // The scaffold lists no price for an option the document would refuse.
      expect(scaffoldQuoteDocumentBrief(startupWaived, IDENTITY, options), name).toMatchObject({
        ok: false,
        code: 'QUOTE_DOCUMENT_OPTION_INVALID'
      })
    }
  })

  it('the brief names exactly the options passed, with a label and a unit and no figure', () => {
    const texts2 = optionTexts() as Record<string, Json>

    const cases: [Json, QuoteDocumentOption[], { path: string; rule: string }[]][] = [
      // Passed and not named: it would be priced and silently left out.
      [texts(), OPTIONS, [{ path: 'options', rule: 'option_not_named' }]],
      [named({ copywriter: texts2.copywriter }), OPTIONS, [{ path: 'options', rule: 'option_not_named' }]],
      // Named and not passed: there is no frozen quote to price it.
      [named(), [copywriter], [{ path: 'options.1', rule: 'unknown_key' }]],
      [
        named(),
        [],
        [
          { path: 'options.0', rule: 'unknown_key' },
          { path: 'options.1', rule: 'unknown_key' }
        ]
      ],
      [named(['copywriter']), OPTIONS, [{ path: 'options', rule: 'not_an_object' }]],
      [named({ ...texts2, motion: 'Video' }), OPTIONS, [{ path: 'options.1', rule: 'not_an_object' }]],
      [named({ ...texts2, motion: { label: 'Video' } }), OPTIONS, [{ path: 'options.1.unit', rule: 'missing_unit' }]],
      [named({ ...texts2, motion: { unit: 'al mes' } }), OPTIONS, [{ path: 'options.1.label', rule: 'missing_label' }]],
      [
        named({ ...texts2, motion: { label: 'Video', unit: 'al mes', detail: 'Uno\nDos' } }),
        OPTIONS,
        [{ path: 'options.1.detail', rule: 'invalid_detail' }]
      ],
      // The price of an option is not the brief's to give.
      [
        named({ ...texts2, motion: { label: 'Video', unit: 'al mes', net: '1000' } }),
        OPTIONS,
        [{ path: 'options.1', rule: 'unknown_field' }]
      ],
      [{ ...texts(), optionsTexts: { title: 'Opciones' } }, [], [{ path: 'optionsTexts', rule: 'requires_options' }]]
    ]

    for (const [brief, options, issues] of cases) {
      const outcome = rejection(startupWaived, brief, options)

      expect(outcome.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
      expect(outcome.issues).toEqual(issues)
    }

    expect(rejection(startupWaived, { ...texts(), optionsTexts: { title: 'Opciones', net: '1' } }).issues).toEqual([
      { path: 'optionsTexts', rule: 'unrecognized_keys' }
    ])
  })

  it('the scaffold lists the options passed with the price of each, and names them in the brief to fill', () => {
    const reading = scaffold(startupWaived, OPTIONS)

    expect(reading.options).toEqual([
      {
        key: 'copywriter',
        net: periodNets(copywriter)[0],
        currency: 'CLP',
        periods: 3,
        calculationId: copywriter.identity.calculationId
      },
      {
        key: 'motion',
        net: periodNets(motion)[0],
        currency: 'CLP',
        periods: 1,
        calculationId: motion.identity.calculationId
      }
    ])
    expect(reading.brief.options).toEqual({ copywriter: { label: '', unit: '' }, motion: { label: '', unit: '' } })
    // Unfilled, it is rejected; filled, it is the document.
    expect(rejection(startupWaived, { ...texts(), options: reading.brief.options }, OPTIONS).code).toBe(
      'QUOTE_DOCUMENT_BRIEF_INVALID'
    )

    // Without options the scaffold has neither key: it is the scaffold of before.
    const plain = scaffold(startupWaived)

    expect(plain).not.toHaveProperty('options')
    expect(plain.brief).not.toHaveProperty('options')
    expect({ ...reading, options: undefined, brief: { ...reading.brief, options: undefined } }).toEqual({
      ...plain,
      options: undefined,
      brief: { ...plain.brief, options: undefined }
    })
  })

  it('the committed example: brief, artifacts and data in step, with the courtesy and both options', () => {
    const artifact = frozen(`${COURTESY}.artifact.json`)

    const outcome = composeQuoteDocument(
      artifact.semantic.result,
      artifact,
      read(`${COURTESY}.document-brief.json`),
      OPTIONS
    )

    if (!outcome.ok) throw new Error(`document rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

    expect(clone(outcome.reading)).toEqual(read(`${COURTESY}.document.json`))

    const data = outcome.reading
    const totals = totalsOf(artifact.semantic.result)

    expect(data.net).toBe(totals.net)
    expect(data.taxAmount).toBe(totals.tax)
    expect(data.lines.map(line => [line.net, line.referenceNet])).toEqual([
      [totals.net, undefined],
      ['0', emitted(startupCharged).lines[1].net]
    ])
    expect(data.options!.items.map(item => item.net)).toEqual([periodNets(copywriter)[0], periodNets(motion)[0]])
    expect(data.source).toMatchObject({ calculationId: artifact.calculationId, digest: artifact.replayDigest })
    // The buyer of an example is invented.
    expect(data.buyer.name).toBe('Cliente de ejemplo')
  })
})

describe('a price printed as what it is: keys combined into one line', () => {
  /** What the firewall charges for `keys`, added over the whole term: the verifier of the net of a combined line. */
  const chargedFor = (result: Composition, keys: string[]) =>
    sum(keys.flatMap(key => (chargedByKey(result).get(key) ?? []).map(period => period.net)))

  const combining = (entries: unknown, more: Json = {}): Json => ({ ...texts(), ...more, combine: entries })

  /** The lines a quote prints with no brief, without the keys the scaffold lists them by. */
  const foldedLines = (result: Composition) =>
    scaffold(result).lines.map(({ key, kind, ...line }) => (void kind, { key, line }))

  const threeMonthsWithTax = frozen(`${THREE_MONTHS}.artifact.json`).semantic.result

  it('two keys of a quote sold by lines: one line, a quantity of one, no unit value and the exact sum', () => {
    const rows = rowsOf(threeMonthsWithTax)

    // Premise, from the kernel rows: three monthly rows and one setup row, and nothing else.
    expect(rows.map(row => row.kind).sort()).toEqual(['monthly', 'monthly', 'monthly', 'setup'])

    const data = emitted(
      threeMonthsWithTax,
      combining([{ keys: ['design', 'design:setup'], label: 'Diseño visual, todo incluido', unit: 'servicio' }])
    )

    expect(data.lines).toEqual([
      {
        label: 'Diseño visual, todo incluido',
        group: 'Servicio',
        quantity: { value: 1, unit: 'servicio' },
        net: sum(rows.map(row => row.net)).toFixed(0)
      }
    ])
    expect(data.lines[0].net).toBe(totalsOf(threeMonthsWithTax).net)

    // A combination moves the lines and nothing else: net, tax, total and every text are the ones of the quote.
    expect({ ...data, lines: undefined }).toEqual({ ...emitted(threeMonthsWithTax), lines: undefined })
    expect(data.taxAmount).toBe(totalsOf(threeMonthsWithTax).tax)
  })

  it('one key alone: a fee printed as a programme price, and every other line as it was', () => {
    const plain = emitted(managedSuppliersOverTheTerm)
    const fees = clientSafePeriodItems(managedSuppliersOverTheTerm).map(period => period.items[0])

    // Premise: three months of fee, which fold into «3 meses» when nothing is combined.
    expect(fees.map(item => item.key)).toEqual(['fee', 'fee', 'fee'])
    expect(plain.lines[0]).toMatchObject({ quantity: { value: 3, unit: 'meses' } })

    const data = emitted(
      managedSuppliersOverTheTerm,
      combining([{ keys: ['fee'], label: 'Programa de contenidos', detail: 'Equipo y reportes', unit: 'programa' }])
    )

    expect(data.lines[0]).toEqual({
      label: 'Programa de contenidos',
      detail: 'Equipo y reportes',
      group: 'Servicio',
      quantity: { value: 1, unit: 'programa' },
      net: sum(fees.map(item => item.net)).toFixed(0)
    })
    expect(data.lines.slice(1)).toEqual(plain.lines.slice(1))
    expect(sum(data.lines.map(line => line.net)).toFixed()).toBe(
      new D(totalsOf(managedSuppliersOverTheTerm).net).toFixed()
    )
  })

  it('a net that changes over the term, or a month off, is still one sum', () => {
    const fees = clientSafePeriodItems(managedFeeChanges).map(period => period.items[0].net)

    // Premise: folded, this fee is two lines, because its net changes in the third month.
    expect(emitted(managedFeeChanges).lines.filter(line => line.group === 'Servicio').length).toBe(2)
    expect(new Set(fees).size).toBe(2)

    const changing = emitted(managedFeeChanges, combining([{ keys: ['fee'], label: 'Programa', unit: 'programa' }]))

    expect(changing.lines.filter(line => line.group === 'Servicio')).toEqual([
      { label: 'Programa', group: 'Servicio', quantity: { value: 1, unit: 'programa' }, net: sum(fees).toFixed(0) }
    ])

    // Months 1 and 3 only: the line has no months to name and its net is the two of them.
    const monthly = rowsOf(designerWithGap).filter(row => row.kind === 'monthly')
    const withGap = emitted(designerWithGap, combining([{ keys: ['design'], label: 'Diseño', unit: 'servicio' }]))

    expect(monthly.map(row => row.month)).toEqual([1, 3])
    expect(withGap.lines.filter(line => line.label === 'Diseño')).toEqual([
      {
        label: 'Diseño',
        group: 'Servicio',
        quantity: { value: 1, unit: 'servicio' },
        net: sum(monthly.map(row => row.net)).toFixed(0)
      }
    ])
  })

  it.each(corpus)('%s: each key combined alone, and all of them together, say what the firewall charges', path => {
    const result = frozen(path).semantic.result
    const folded = foldedLines(result)
    const keys = [...chargedByKey(result).keys()]
    const scale = totalsOf(result).net.split('.')[1]?.length ?? 0

    expect(keys.length).toBeGreaterThan(0)

    for (const key of keys) {
      const data = emitted(result, combining([{ keys: [key], label: 'Línea combinada', unit: 'programa' }]))
      const first = folded.findIndex(entry => entry.key === key)

      // The lines of the key give way to one line, where the first of them was; every other line is untouched.
      expect(data.lines).toEqual(
        folded.flatMap((entry, index) =>
          entry.key !== key
            ? [entry.line]
            : index === first
              ? [
                  {
                    label: 'Línea combinada',
                    group: entry.line.group,
                    quantity: { value: 1, unit: 'programa' },
                    net: chargedFor(result, [key]).toFixed(scale)
                  }
                ]
              : []
        )
      )
    }

    const whole = emitted(result, combining([{ keys, label: 'Precio del programa', unit: 'programa' }]))

    expect(whole.lines.length).toBe(1)
    expect(whole.lines[0]).toMatchObject({ quantity: { value: 1, unit: 'programa' }, net: totalsOf(result).net })
    expect(whole.lines[0]).not.toHaveProperty('unitNet')
    expect(chargedFor(result, keys).toFixed()).toBe(new D(totalsOf(result).net).toFixed())
  })

  it('amounts keep the decimals the kernel gave the currency', () => {
    const data = emitted(
      designerInDollars,
      combining([{ keys: ['design:setup', 'design'], label: 'Design', unit: 'servicio' }])
    )

    expect(totalsOf(designerInDollars).net).toMatch(/\.\d{2}$/)
    expect(data.lines.map(line => line.net)).toEqual([totalsOf(designerInDollars).net])
  })

  it('the line sits where the first of its keys appears, under the group of the first key listed or its own', () => {
    const plain = emitted(managed)
    const [fee, production, talent, media] = plain.lines

    // Premise: the fee and three supplier costs, in two groups.
    expect(plain.lines.map(line => line.group)).toEqual([
      'Servicio',
      'Costos de terceros',
      'Costos de terceros',
      'Costos de terceros'
    ])
    expect(talent.label).toBe(rowsOf(managed).find(row => row.parentLineId === 'tp-talent')!.label)

    const net = new D(fee.net).plus(talent.net).toFixed(0)
    const line = { label: 'Servicio y locución', quantity: { value: 1, unit: 'servicio' }, net }
    const entry = { label: 'Servicio y locución', unit: 'servicio' }

    // The fee is the first item of the quote: the line takes its place whichever key is written first.
    expect(emitted(managed, combining([{ ...entry, keys: ['fee', 'third_party:tp-talent'] }])).lines).toEqual([
      { ...line, group: 'Servicio' },
      production,
      media
    ])
    expect(emitted(managed, combining([{ ...entry, keys: ['third_party:tp-talent', 'fee'] }])).lines).toEqual([
      { ...line, group: 'Costos de terceros' },
      production,
      media
    ])
    expect(
      emitted(managed, combining([{ ...entry, keys: ['third_party:tp-talent', 'fee'], group: 'Programa' }])).lines
    ).toEqual([{ ...line, group: 'Programa' }, production, media])

    // Two supplier costs as one line, where the first of them was; the fee keeps its months.
    const suppliers = emitted(
      managed,
      combining([{ keys: ['third_party:tp-media', 'third_party:tp-production'], label: 'Campaña', unit: 'campaña' }])
    )

    expect(suppliers.lines).toEqual([
      fee,
      {
        label: 'Campaña',
        group: 'Costos de terceros',
        quantity: { value: 1, unit: 'campaña' },
        net: new D(production.net).plus(media.net).toFixed(0)
      },
      talent
    ])
  })

  it('a key is printed once: unknown, waived, repeated or also dressed in `lines`, it is rejected by position', () => {
    const sentinel = `leak-probe-${process.pid}`
    const entry = { label: 'Diseño', unit: 'servicio' }

    // Premise: the example charges for `design` and waives `design:setup` completely.
    expect([...chargedByKey(startupWaived).keys()]).toEqual(['design'])
    expect(clientSafeWaivedItems(startupWaived)[0].items.map(item => item.key)).toEqual(['design:setup'])

    const cases: [Json, { path: string; rule: string }[]][] = [
      [combining([{ ...entry, keys: [sentinel] }]), [{ path: 'combine.0.keys.0', rule: 'unknown_key' }]],
      // A waived key has no net to add: listed, it would pass for part of the price.
      [
        combining([{ ...entry, keys: ['design', 'design:setup'] }]),
        [{ path: 'combine.0.keys.1', rule: 'key_not_charged' }]
      ],
      // Marked as a courtesy or not: a courtesy is printed by its own line, never inside another.
      [
        combining([{ ...entry, keys: ['design', 'design:setup'] }], { lines: { 'design:setup': { courtesy: true } } }),
        [{ path: 'combine.0.keys.1', rule: 'key_not_charged' }]
      ],
      [combining([{ ...entry, keys: ['design', 'design'] }]), [{ path: 'combine.0.keys.1', rule: 'duplicate_key' }]],
      [
        combining([
          { ...entry, keys: ['design'] },
          { ...entry, keys: ['design'] }
        ]),
        [{ path: 'combine.1.keys.0', rule: 'duplicate_key' }]
      ],
      // A combined key has no line of its own: a label for it in `lines` would be dropped without a word.
      [
        combining([{ ...entry, keys: ['design'] }], { lines: { design: { label: 'Diseñador' } } }),
        [{ path: 'lines.0', rule: 'key_is_combined' }]
      ]
    ]

    for (const [brief, issues] of cases) {
      const outcome = rejection(startupWaived, brief)

      expect(outcome.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
      expect(outcome.issues).toEqual(issues)
      expect(JSON.stringify(outcome)).not.toContain(sentinel)
    }

    // The scaffold lists every key under `lines`: a brief that combines one takes it out of there.
    const { brief } = scaffold(managed)
    const keys = Object.keys(brief.lines)

    expect(
      rejection(managed, combining([{ keys, label: 'Programa', unit: 'programa' }], { lines: brief.lines })).issues
    ).toEqual(keys.map((_, index) => ({ path: `lines.${index}`, rule: 'key_is_combined' })))
    expect(brief).not.toHaveProperty('combine')
  })

  it('a combination names keys and texts; anything else is rejected, naming where', () => {
    const entry = { keys: ['fee'], label: 'Programa', unit: 'programa' }

    const cases: [unknown, { path: string; rule: string }][] = [
      [{ fee: entry }, { path: 'combine', rule: 'not_an_array' }],
      [[], { path: 'combine', rule: 'empty' }],
      [Array.from({ length: 41 }, () => entry), { path: 'combine', rule: 'too_many' }],
      [['fee'], { path: 'combine.0', rule: 'not_an_object' }],
      // No figure has a place in it: the net of the line is the one the quote froze.
      [[{ ...entry, net: '1000' }], { path: 'combine.0', rule: 'unknown_field' }],
      [[{ ...entry, unitNet: '1000' }], { path: 'combine.0', rule: 'unknown_field' }],
      [[{ ...entry, quantity: { value: 3, unit: 'meses' } }], { path: 'combine.0', rule: 'unknown_field' }],
      [[{ ...entry, courtesy: true }], { path: 'combine.0', rule: 'unknown_field' }],
      [[{ ...entry, keys: 'fee' }], { path: 'combine.0.keys', rule: 'invalid_keys' }],
      [[{ ...entry, keys: [] }], { path: 'combine.0.keys', rule: 'invalid_keys' }],
      [[{ ...entry, keys: [1] }], { path: 'combine.0.keys.0', rule: 'invalid_key' }],
      [[{ keys: ['fee'], unit: 'programa' }], { path: 'combine.0.label', rule: 'missing_label' }],
      [[{ ...entry, label: '   ' }], { path: 'combine.0.label', rule: 'invalid_label' }],
      [[{ keys: ['fee'], label: 'Programa' }], { path: 'combine.0.unit', rule: 'missing_unit' }],
      [[{ ...entry, unit: 5 }], { path: 'combine.0.unit', rule: 'invalid_unit' }],
      [[{ ...entry, detail: 'Uno\nDos' }], { path: 'combine.0.detail', rule: 'invalid_detail' }],
      [[{ ...entry, group: '' }], { path: 'combine.0.group', rule: 'invalid_group' }]
    ]

    for (const [combine, issue] of cases) {
      const outcome = rejection(managed, combining(combine))

      expect(outcome.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
      expect(outcome.issues).toContainEqual(issue)
    }

    // Premise of the cases above: the entry they break is one the reading takes.
    expect(emitted(managed, combining([entry])).lines[0]).toMatchObject({
      label: 'Programa',
      net: emitted(managed).lines[0].net
    })
  })

  it('how the lines are printed never changes whether the tax is accepted', () => {
    const totals = totalsOf(threeMonthsWithTax)
    const whole = combining([{ keys: ['design', 'design:setup'], label: 'Diseño', unit: 'servicio' }])

    // Premise: three periods; the frozen tax is the one of the rate on the net; folded, the lines count four units
    // (three months and a payment) and combined they count one.
    expect(threeMonthsWithTax.quote.periods.length).toBe(3)
    expect(taxRoundedOnce(threeMonthsWithTax, '0.19').toFixed(0)).toBe(totals.tax)
    expect(emitted(threeMonthsWithTax).lines.map(line => line.quantity.value)).toEqual([3, 1])
    expect(emitted(threeMonthsWithTax, whole).lines.map(line => line.quantity.value)).toEqual([1])

    // Up to one unit per period, either way, with the same tax and the same count of periods in the data.
    for (const units of [1, 2, 3, -3])
      for (const brief of [texts(), whole])
        expect(emitted(withTaxMovedBy(threeMonthsWithTax, units), brief)).toMatchObject({
          taxAmount: new D(totals.tax!).plus(units).toFixed(0),
          taxPeriods: 3
        })

    // And beyond it neither: a fault of the quote, never of the way its lines are printed.
    for (const units of [4, -4])
      for (const brief of [texts(), whole])
        expect(rejection(withTaxMovedBy(threeMonthsWithTax, units), brief)).toMatchObject({
          code: 'QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE',
          issues: [{ path: 'totals.tax', rule: 'tax_differs_from_rate' }]
        })
  })

  it('a programme of twelve months with its tax rounded month by month is one line', () => {
    const result = twelveMonthsTaxRoundedByMonth
    const totals = totalsOf(result)
    const once = taxRoundedOnce(result, '0.19')
    const gap = once.minus(totals.tax!).abs()
    const keys = [...chargedByKey(result).keys()]
    const whole = combining([{ keys, label: 'Programa anual', unit: 'programa' }])

    // Premise, from the kernel: twelve periods, a tax that is the sum of the twelve it rounded, and more than one
    // unit away from the tax of the whole net. One line could not carry that gap if lines were what counted.
    expect(result.quote.periods.length).toBe(12)
    expect(sum(result.quote.periods.map(period => period.result.totals!.tax!)).toFixed()).toBe(totals.tax)
    expect(gap.gt(1) && gap.lte(12)).toBe(true)

    const data = emitted(result, whole)

    expect(data.lines).toEqual([
      { label: 'Programa anual', group: 'Servicio', quantity: { value: 1, unit: 'programa' }, net: totals.net }
    ])
    expect(data).toMatchObject({ vatRate: 0.19, taxAmount: totals.tax, taxPeriods: 12 })
    expect(new D(data.net).plus(data.taxAmount!).toFixed()).toBe(totals.grandTotal)

    // The same tax, folded by months: the presentation moved the lines and nothing else.
    expect({ ...data, lines: undefined }).toEqual({ ...emitted(result), lines: undefined })

    // A tax beyond the count of periods is still rejected, combined or not.
    for (const units of [12, -12]) expect(emitted(withTax(result, once.plus(units)), whole).taxPeriods).toBe(12)

    for (const units of [13, -13])
      for (const brief of [texts(), whole])
        expect(rejection(withTax(result, once.plus(units)), brief)).toMatchObject({
          code: 'QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE',
          issues: [{ path: 'totals.tax', rule: 'tax_differs_from_rate' }]
        })
  })

  it('the committed example: a managed service of three months as one programme price, each payment with its tax', () => {
    const artifact = frozen(PROGRAMME_ARTIFACT)
    const result = artifact.semantic.result
    const totals = totalsOf(result)
    const brief = read(`${PROGRAMME}.document-brief.json`)
    const outcome = composeQuoteDocument(result, artifact, brief)

    if (!outcome.ok) throw new Error(`document rejected: ${outcome.code} ${JSON.stringify(outcome.issues)}`)

    // The example files are kept in step with the reading: a change of either shows here.
    expect(clone(outcome.reading)).toEqual(read(`${PROGRAMME}.document.json`))

    const data = outcome.reading
    const fees = clientSafePeriodItems(result).map(period => period.items)

    // Premise, from the firewall: three months, each of them one fee.
    expect(fees.map(items => items.map(item => item.key))).toEqual([['fee'], ['fee'], ['fee']])

    expect(data.lines.map(({ label, detail, ...figures }) => (void label, void detail, figures))).toEqual([
      {
        group: 'Servicio',
        quantity: { value: 1, unit: 'programa' },
        net: sum(fees.map(items => items[0].net)).toFixed(0)
      }
    ])
    expect(data.net).toBe(totals.net)
    expect(data.taxAmount).toBe(totals.tax)

    const schedule = presentPaymentSchedule(result, artifact, brief.paymentMilestones)

    if (!schedule.ok) throw new Error('schedule rejected')

    expect(data.paymentSchedule!.milestones.map(({ net, tax, total }) => ({ net, tax, total }))).toEqual(
      schedule.reading.milestones.map(milestone => ({
        net: milestone.amount,
        tax: milestone.tax,
        total: milestone.total
      }))
    )
    expect(sum(data.paymentSchedule!.milestones.map(milestone => milestone.total!)).toFixed()).toBe(
      new D(totals.grandTotal!).toFixed()
    )

    // It says nothing it has no reason to say: no area of the buyer, no note of the calendar of the work.
    expect(data.buyer).toEqual({ name: 'Cliente de ejemplo', taxId: brief.buyer.taxId, logo: null })
    expect(data.schedule).not.toHaveProperty('note')
    expect(data.cover.netLabel).toBe(brief.cover.netLabel)
    expect(data.source).toMatchObject({ calculationId: artifact.calculationId, digest: artifact.replayDigest })
  })
})

describe('a text that would only state the obvious is optional', () => {
  const lean = (): Json => {
    const { buyer, schedule, ...rest } = texts() as { buyer: Json; schedule: Json } & Json
    const { unit, ...buyerWithoutUnit } = buyer
    const { note, ...scheduleWithoutNote } = schedule

    // Premise: the two texts are in the brief the other cases use.
    expect([unit, note]).toEqual(['Equipo de marketing', 'Nota.'])

    return { ...rest, buyer: buyerWithoutUnit, schedule: scheduleWithoutNote }
  }

  it('the area of the buyer and the note of the calendar of the work: absent, the data has neither', () => {
    const data = emitted(managedThreeMonths, lean())
    const full = emitted(managedThreeMonths)

    expect(data.buyer).toEqual({ name: 'Cliente de ejemplo', taxId: 'Identificación por confirmar' })
    expect(data.schedule).toEqual({
      title: 'Calendario',
      phases: [{ label: 'Inicio', title: 'Fase', text: 'Descripción.' }]
    })

    // Nothing else of the document depends on them.
    expect({ ...data, buyer: undefined, schedule: undefined }).toEqual({
      ...full,
      buyer: undefined,
      schedule: undefined
    })
    expect(full.buyer.unit).toBe('Equipo de marketing')
    expect(full.schedule.note).toBe('Nota.')
  })

  it('the label of the net on the cover is a text of the brief, and no figure rides on it', () => {
    const cover = texts().cover as Json
    const data = emitted(managed, { ...texts(), cover: { ...cover, netLabel: 'Valor neto del proyecto' } })

    expect(data.cover).toEqual({ ...cover, netLabel: 'Valor neto del proyecto' })
    expect(emitted(managed).cover).toEqual(cover)
    expect({ ...data, cover: undefined }).toEqual({ ...emitted(managed), cover: undefined })

    expect(rejection(managed, { ...texts(), cover: { ...cover, net: '1000' } }).issues).toEqual([
      { path: 'cover', rule: 'unrecognized_keys' }
    ])
  })

  it('present, each is a text like any other: empty or malformed is rejected', () => {
    const base = texts() as { buyer: Json; schedule: Json; cover: Json } & Json

    const cases: [Json, { path: string; rule: string }][] = [
      [{ buyer: { ...base.buyer, unit: '   ' } }, { path: 'buyer.unit', rule: 'custom' }],
      [{ schedule: { ...base.schedule, note: '' } }, { path: 'schedule.note', rule: 'custom' }],
      [{ cover: { ...base.cover, netLabel: 'Uno\nDos' } }, { path: 'cover.netLabel', rule: 'custom' }],
      [{ cover: { ...base.cover, netLabel: 1000 } }, { path: 'cover.netLabel', rule: 'invalid_type' }]
    ]

    for (const [change, issue] of cases) {
      const outcome = rejection(managed, { ...texts(), ...change })

      expect(outcome.code).toBe('QUOTE_DOCUMENT_BRIEF_INVALID')
      expect(outcome.issues).toContainEqual(issue)
    }
  })

  it('the scaffold leaves no empty slot for them: what is not asked for is not filled in', () => {
    const { brief } = scaffold(managed)

    expect(brief.buyer).toEqual({ name: '', taxId: '' })
    expect(brief.cover).toEqual({ label: '', title: [''], subtitle: '' })
    expect(brief.schedule).toEqual({ title: '', phases: [{ label: '', title: '', text: '' }] })

    // Filled with the texts it does ask for, and nothing else, it is a document.
    expect(emitted(managed, { ...lean(), lines: brief.lines }).lines).toEqual(emitted(managed).lines)
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

  /** The template takes the data as the CLI writes it and computes from it the totals the quote froze. */
  const expectTotalsOfTheQuote = async (result: Composition, data: QuoteDocumentData) => {
    const { validateQuote, quoteAmounts } = await template()
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
  }

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
    await expectTotalsOfTheQuote(result, emitted(result, brief))
  })

  // The two additions of the data: a courtesy line (`referenceNet`) and the block of options. The template adds
  // neither to the subtotal, so the totals it computes are still the ones of the quote.
  const courtesyOf = (key: string): Json => ({ ...texts(), lines: { [key]: { courtesy: true } } })

  const additions: [string, Composition, Json, QuoteDocumentOption[]][] = [
    ['a start-up given as a courtesy', startupWaived, courtesyOf('design:setup'), []],
    ['a courtesy in dollars', dollarsStartupWaived, courtesyOf('design:setup'), []],
    ['a line given away over three months', lineWaived, courtesyOf('primary'), []],
    ['the setup of a managed service as a courtesy', serviceSetupWaived, courtesyOf('setup'), []],
    ['a re-invoiced cost the service absorbs', supplierWaived, courtesyOf('third_party:tp-production'), []],
    ['optional add-ons', startupWaived, { ...texts(), options: optionTexts() }, OPTIONS],
    [
      'a courtesy, optional add-ons and a payment calendar',
      startupWaived,
      { ...courtesyOf('design:setup'), options: optionTexts(), paymentMilestones: milestones },
      OPTIONS
    ]
  ]

  it.each(additions)(
    '%s: the template accepts the data and computes the totals of the quote',
    async (_, result, brief, options) => {
      const data = emitted(result, brief, options)

      // Premise: the data does carry what the case is about.
      expect(data.lines.some(line => line.referenceNet !== undefined) || data.options !== undefined).toBe(true)
      await expectTotalsOfTheQuote(result, data)
    }
  )

  // A price printed as what it is: one line for several keys, or for one. The template is given no unit value and
  // holds the frozen tax to one unit of rounding per line it counts, which is the guard the reading applied.
  const whole = (result: Composition): Json => ({
    ...texts(),
    combine: [{ keys: [...chargedByKey(result).keys()], label: 'Precio del programa', unit: 'programa' }]
  })

  const feeAsProgramme: Json = { ...texts(), combine: [{ keys: ['fee'], label: 'Programa', unit: 'programa' }] }

  it.each([
    ['one line for a quote sold by lines', designerThreeMonths, whole(designerThreeMonths)],
    ['one line for the three-month example with IVA', frozen(`${THREE_MONTHS}.artifact.json`).semantic.result, null],
    ['one line for a quote whose tax was rounded month by month', taxRoundedByMonth, whole(taxRoundedByMonth)],
    ['a fee as a programme price next to its supplier costs', managedSuppliersOverTheTerm, feeAsProgramme],
    ['a fee that changes over the term as one price', managedFeeChanges, feeAsProgramme],
    ['one line in dollars', designerInDollars, whole(designerInDollars)]
  ] as const)('%s: the template accepts the data and computes the totals of the quote', async (_, result, brief) => {
    const data = emitted(result, brief ?? whole(result))

    // Premise: the data does carry a combined line, a quantity of one with no unit value.
    expect(data.lines.some(line => line.quantity.unit === 'programa' && line.unitNet === undefined)).toBe(true)
    await expectTotalsOfTheQuote(result, data)
  })

  // Keys of version 2 that the reading emits and the template takes: the tax and the total of each payment
  // milestone, a document with no area of the buyer and no note of the calendar of the work, and the label of the
  // net on the cover.
  const withoutOptionalTexts = (): Json => {
    const { buyer, schedule } = texts() as { buyer: Json; schedule: Json }

    return {
      ...texts(),
      buyer: { name: buyer.name, taxId: buyer.taxId },
      schedule: { title: schedule.title, phases: schedule.phases }
    }
  }

  it.each([
    ['milestones with their tax', taxRoundedByMonth, { ...texts(), paymentMilestones: milestones }],
    [
      'a combined line and milestones with their tax',
      frozen(`${THREE_MONTHS}.artifact.json`).semantic.result,
      { ...whole(frozen(`${THREE_MONTHS}.artifact.json`).semantic.result), paymentMilestones: milestones }
    ],
    ['no area of the buyer and no note of the calendar of the work', managed, withoutOptionalTexts()],
    [
      'a label of the net on the cover',
      designerWithTax('0.19'),
      { ...texts(), cover: { ...(texts().cover as Json), netLabel: 'Valor neto del proyecto' } }
    ],
    [
      'all of them at once',
      taxRoundedByMonth,
      {
        ...withoutOptionalTexts(),
        cover: { ...(texts().cover as Json), netLabel: 'Valor neto del programa' },
        combine: [{ keys: ['fee'], label: 'Programa', unit: 'programa' }],
        paymentMilestones: milestones
      }
    ]
  ] as const)('%s: the template accepts the data and computes the totals of the quote', async (_, result, brief) => {
    const data = emitted(result, brief)

    // Premise: the data does carry what the case is about.
    expect(
      data.paymentSchedule?.milestones.every(
        milestone => milestone.tax !== undefined && milestone.total !== undefined
      ) ||
        data.buyer.unit === undefined ||
        data.cover.netLabel !== undefined
    ).toBe(true)
    await expectTotalsOfTheQuote(result, data)
  })

  // The bound of the tax is the count of periods the data carries (`taxPeriods`), for the reading and for the
  // template alike: a line that prints several months as one price is accepted with the gap its months add up to.
  it.each([2, 3, -3])(
    'a combined line with a tax %i units from the tax of its net: the template accepts the data',
    async units => {
      const result = withTaxMovedBy(frozen(`${THREE_MONTHS}.artifact.json`).semantic.result, units)
      const data = emitted(result, whole(result))

      // Premise: three periods printed as one line, and a tax that is not the one of the rate on the net.
      expect(data.lines.map(line => line.quantity.value)).toEqual([1])
      expect(data.taxPeriods).toBe(3)
      expect(taxRoundedOnce(result, '0.19').minus(data.taxAmount!).abs().toFixed()).toBe(String(Math.abs(units)))
      await expectTotalsOfTheQuote(result, data)
    }
  )

  it('twelve months as one programme line, with the tax the kernel rounded month by month and its milestones', async () => {
    const result = twelveMonthsTaxRoundedByMonth
    const data = emitted(result, { ...whole(result), paymentMilestones: milestones })

    expect(data.lines.map(line => line.quantity)).toEqual([{ value: 1, unit: 'programa' }])
    expect(taxRoundedOnce(result, '0.19').minus(data.taxAmount!).abs().gt(1)).toBe(true)
    expect(data.paymentSchedule!.milestones.every(milestone => milestone.tax !== undefined)).toBe(true)
    await expectTotalsOfTheQuote(result, data)
  })

  it('the template holds the tax to the same count of periods: one unit more and it refuses the data', async () => {
    const { validateQuote, quoteAmounts } = await template()
    const three = frozen(`${THREE_MONTHS}.artifact.json`).semantic.result
    const taken = (data: unknown) => () => (validateQuote(data), quoteAmounts(data))

    // The furthest tax the reading emits for three periods, printed as one line.
    const accepted = JSON.parse(JSON.stringify(emitted(withTaxMovedBy(three, 3), whole(three))))

    expect(taken(accepted)).not.toThrow()
    // What the reading refuses to emit (`tax_differs_from_rate`), handed to the template anyway.
    expect(rejection(withTaxMovedBy(three, 4), whole(three)).code).toBe('QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE')
    expect(taken({ ...accepted, taxAmount: new D(accepted.taxAmount).plus(1).toFixed(0) })).toThrow()
    // And why the reading always sends the count: without it the template counts the units of the lines, one here.
    expect(taken({ ...accepted, taxPeriods: undefined })).toThrow()
  })

  it('the committed example of a programme price is accepted by the template as committed', async () => {
    const { validateQuote, quoteAmounts } = await template()
    const data = read(`${PROGRAMME}.document.json`)
    const totals = totalsOf(frozen(PROGRAMME_ARTIFACT).semantic.result)

    expect(() => validateQuote(data)).not.toThrow()

    const amounts = quoteAmounts(data)

    expect(new D(amounts.net).toFixed()).toBe(new D(totals.net).toFixed())
    expect(new D(amounts.vat!).toFixed()).toBe(new D(totals.tax!).toFixed())
    expect(new D(amounts.total!).toFixed()).toBe(new D(totals.grandTotal!).toFixed())
  })

  it.each([...EXAMPLES, COURTESY])('%s.document.json is accepted by the template as committed', async example => {
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

  const optionFlags = ['copywriter', 'motion'].flatMap(key => [
    '--option',
    `${key}=${COURTESY}.option-${key}.artifact.json`
  ])

  it('with options: the scaffold lists them with their price, and the brief of the example yields its data', () => {
    const artifact = frozen(`${COURTESY}.artifact.json`)
    const expected = scaffoldQuoteDocumentBrief(artifact.semantic.result, artifact, OPTIONS)

    if (!expected.ok) throw new Error('scaffold rejected')

    const scaffolded = cli('compose', 'document', '--input', `${COURTESY}.artifact.json`, ...optionFlags)

    expect(scaffolded.status).toBe(2)
    expect(JSON.parse(scaffolded.stdout)).toEqual(clone(expected.reading))
    expect(JSON.parse(scaffolded.stdout).waived.map((line: Json) => line.key)).toEqual(['design:setup'])

    const out = join(dir, 'courtesy-and-options.json')

    const run = cli(
      'compose',
      'document',
      '--input',
      `${COURTESY}.artifact.json`,
      '--brief',
      `${COURTESY}.document-brief.json`,
      ...optionFlags,
      '--out',
      out
    )

    expect(run.status).toBe(3)
    // The committed example is what the command prints, to the byte, and what it writes.
    expect(run.stdout).toBe(readFileSync(`${COURTESY}.document.json`, 'utf8'))
    expect(readFileSync(out, 'utf8')).toBe(run.stdout)
  })

  it('an option is `key=artifact`, read and verified like the quote; a rejection names the flag', () => {
    const base = ['compose', 'document', '--input', `${COURTESY}.artifact.json`]

    const report = (...args: string[]) => {
      const run = cli(...base, ...args)

      expect(run.status).toBe(1)
      expect(run.stdout).toBe('')

      return JSON.parse(run.stderr).error
    }

    const motionFile = `${COURTESY}.option-motion.artifact.json`

    // Not `key=path`, a key that is not a name, and one key twice.
    for (const malformed of [
      [motionFile],
      ['=x.json'],
      ['dos palabras=x.json'],
      [`a=${motionFile}`, `a=${motionFile}`]
    ])
      expect(report(...malformed.flatMap(value => ['--option', value]))).toMatchObject({
        code: 'INVALID_ARGUMENT',
        option: 'option'
      })

    expect(report('--option', `a=${join(dir, 'missing.artifact.json')}`)).toMatchObject({
      code: 'INPUT_NOT_FOUND',
      option: 'option'
    })
    // A document brief is not a frozen quote: the replay check of an option is the one of `--input`.
    expect(report('--option', `a=${COURTESY}.document-brief.json`).option).toBe('option')

    // The quote of the document passed as its own option, and a brief that names an option nobody passed.
    expect(report('--option', `a=${COURTESY}.artifact.json`)).toEqual({
      code: 'QUOTE_DOCUMENT_OPTION_INVALID',
      message: expect.any(String),
      option: 'option',
      issues: [{ path: 'options.0', rule: 'same_as_quote' }]
    })
    expect(report('--brief', `${COURTESY}.document-brief.json`, '--option', `motion=${motionFile}`)).toMatchObject({
      code: 'QUOTE_DOCUMENT_BRIEF_INVALID',
      option: 'brief',
      issues: [{ path: 'options.0', rule: 'unknown_key' }]
    })

    // Only the document takes options.
    expect(
      JSON.parse(
        cli('compose', 'preview', '--input', `${COURTESY}.artifact.json`, '--option', `a=${motionFile}`).stderr
      ).error
    ).toMatchObject({ code: 'INVALID_ARGUMENT', option: 'option' })
  })

  it('a combined line and milestones with their tax: the committed example is what the command prints', () => {
    const base = ['compose', 'document', '--input', PROGRAMME_ARTIFACT]
    const run = cli(...base, '--brief', `${PROGRAMME}.document-brief.json`)

    expect(run.status).toBe(3)
    expect(run.stdout).toBe(readFileSync(`${PROGRAMME}.document.json`, 'utf8'))

    // The same brief with a label for the key it combines: a fault of the brief, corrected under --brief.
    const dressed = join(dir, 'combined-and-dressed.json')

    writeFileSync(
      dressed,
      print({ ...read(`${PROGRAMME}.document-brief.json`), lines: { fee: { label: 'Fee mensual' } } })
    )

    const rejected = cli(...base, '--brief', dressed)

    expect(rejected.status).toBe(1)
    expect(rejected.stdout).toBe('')
    expect(JSON.parse(rejected.stderr).error).toMatchObject({
      code: 'QUOTE_DOCUMENT_BRIEF_INVALID',
      option: 'brief',
      issues: [{ path: 'lines.0', rule: 'key_is_combined' }]
    })
  })

  it('is listed in the usage the tool prints', () => {
    const usage = JSON.parse(cli('help').stdout)

    expect(usage.operations.compose).toContain(
      'document --input artifact.json [--brief document-brief.json] [--out data.json]'
    )
    expect(usage.operations.compose).toContain('[--option key=option.artifact.json]...')
    // The entries the usage must keep. It may say more: what a brief can ask of the lines and of the payment
    // calendar is explained there by whoever owns the tool.
    expect(Object.keys(usage.quoteDocument)).toEqual(
      expect.arrayContaining(['command', 'withoutBrief', 'brief', 'options', 'courtesy'])
    )
  })
})
