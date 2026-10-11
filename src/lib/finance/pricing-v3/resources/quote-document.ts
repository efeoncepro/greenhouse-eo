import Decimal from 'decimal.js'
import { z } from 'zod'

import { clientPaidDirectly } from '../catalog/client'
import type { composeResourceQuote } from './composition'
import { presentPaymentSchedule } from './engagement-view'
import type { EngagementViewRejectionCode, PaymentMilestone } from './engagement-view'
import { clientSafePeriodItems } from './readiness'
import type { ClientSafeItemKind } from './readiness'

type Composition = ReturnType<typeof composeResourceQuote>

// A period net times the periods of a run, a net times a tax rate and every sum of them must be exact for any amount
// the kernel can store, as in price-split.ts and engagement-view.ts. Nothing is divided here.
const Wide = Decimal.clone({ precision: 240, rounding: Decimal.ROUND_HALF_UP })

export const QUOTE_DOCUMENT_BRIEF_VERSION = 'pricing-v3-quote-document-brief/1'
export const QUOTE_DOCUMENT_SCAFFOLD_VERSION = 'pricing-v3-quote-document-scaffold/1'

/** `version` of the A4 quote data this reading emits (template `docs/commercial/templates/cotizacion-a4`). */
export const QUOTE_DOCUMENT_DATA_VERSION = 2

// Limits of version 2 of the A4 quote data. A quote that does not fit is rejected here, by name, instead of being
// handed to the template to fail there.
const LINE_LIMIT = 40
const CLIENT_PAID_LIMIT = 8
const MILESTONE_LIMIT = 12
const QUANTITY_LIMIT = 9999
const TAX_RATE_DECIMALS = 4

const ISSUE_LIMIT = 20

/** Group of a line when the brief names none. Presentation only; a heading of the price table. */
export const QUOTE_DOCUMENT_DEFAULT_GROUPS: Record<ClientSafeItemKind, string> = {
  fee: 'Servicio',
  line: 'Servicio',
  setup: 'Puesta en marcha',
  third_party: 'Costos de terceros'
}

/** Texts of the payment calendar when the brief gives none. True of any calendar this reading can emit. */
export const QUOTE_DOCUMENT_DEFAULT_SCHEDULE_TEXTS = {
  title: 'Calendario de pagos',
  note: 'Importes netos, sin impuestos. La suma de los hitos es el valor neto de esta cotización.'
}

/** Where a rejected input is wrong and which rule it broke; never the content that was sent. */
export type QuoteDocumentIssue = { path: string; rule: string }

/**
 * Rejections of the reading. They are returned, not thrown, as in engagement-view.ts: the readers are pure and the
 * adapter that wires them maps `code` onto a registered `PricingV3Error`. A rejection of the payment calendar keeps
 * the code its own reader gave it.
 */
export type QuoteDocumentRejectionCode =
  | 'QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE'
  | 'QUOTE_DOCUMENT_BRIEF_INVALID'
  | 'QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP'
  | 'QUOTE_DOCUMENT_NOT_REPRESENTABLE'
  | 'QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE'
  | EngagementViewRejectionCode

const rejected = (code: QuoteDocumentRejectionCode, issues: QuoteDocumentIssue[] = []) => ({
  ok: false as const,
  code,
  // Bounded however long the rejected input was.
  issues: issues.slice(0, ISSUE_LIMIT)
})

// ---- document brief: everything the quote does not know ----

const hasText = (value: string) => value.trim().length > 0

/** One printed line: a name, a label, a heading. */
const line = z
  .string()
  .max(300)
  .refine(value => hasText(value) && !/[\r\n]/.test(value), 'Expected one line of text')

/** A paragraph of the document. */
const paragraph = z.string().max(2000).refine(hasText, 'Expected text')

/** A title of the template: one line, or up to three. */
const title = z.union([line, z.array(line).min(1).max(3)])

const rows = (max: number) =>
  z
    .array(z.object({ title: line, text: paragraph }).strict())
    .min(1)
    .max(max)

/**
 * The document brief. It carries the texts and the presentation choices of one document and nothing the quote
 * decides: **no amount, no currency, no tax rate and no date exist in this schema**, at any level, and every object
 * is strict, so a brief that brings one is rejected instead of being read past. The figures of the document come
 * from the frozen quote and from nowhere else.
 *
 * The text rules are the ones the template applies to version 1 of its data (which version 2 keeps), so a brief
 * that passes here is not sent back by the generator for a malformed address or an empty slot.
 */
export const quoteDocumentBriefSchema = z
  .object({
    schemaVersion: z.literal(QUOTE_DOCUMENT_BRIEF_VERSION),
    reference: line,
    // Locale the template formats amounts and dates with. Absent, the template chooses it from the currency.
    locale: z
      .string()
      .max(35)
      .refine(value => {
        try {
          return Intl.getCanonicalLocales(value).length === 1
        } catch {
          return false
        }
      }, 'Expected a BCP 47 locale')
      .optional(),
    supplier: z
      .object({
        name: line,
        taxId: line,
        contact: line,
        email: line.refine(
          value => /^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(value),
          'Expected an e-mail address'
        ),
        phone: line.refine(value => /^\+?[\d ()-]{6,}$/.test(value), 'Expected a phone number')
      })
      .strict(),
    buyer: z
      .object({
        name: line,
        unit: line,
        taxId: line,
        // The template never downloads a logo: a local file and the official source it was taken from.
        logo: z
          .object({
            path: line.refine(value => /\.(svg|png|jpe?g|webp)$/i.test(value), 'Expected a supported image file'),
            source: line.refine(value => /^https:\/\//.test(value), 'Expected an HTTPS source')
          })
          .strict()
          .nullable()
          .optional()
      })
      .strict(),
    cover: z.object({ label: line, title, subtitle: paragraph }).strict(),
    service: z.object({ name: line }).strict(),
    scope: z.object({ title, intro: paragraph, rows: rows(7) }).strict(),
    // The calendar of the work. The calendar of payments is `paymentMilestones`, below.
    schedule: z
      .object({
        title: line,
        note: paragraph,
        phases: z
          .array(z.object({ label: line, title: line, text: paragraph }).strict())
          .min(1)
          .max(3)
      })
      .strict(),
    pricing: z
      .object({
        title,
        intro: paragraph,
        summary: paragraph,
        taxNote: paragraph,
        taxLabel: line.optional(),
        // A count of months and a note, as in version 1: the template divides the totals of the document by it.
        monthly: z
          .object({ months: z.number().int().min(1).max(120), note: paragraph })
          .strict()
          .optional()
      })
      .strict(),
    conditions: z.object({ title, rows: rows(6) }).strict(),
    // Presentation of the lines, by the key the scaffold lists for each. Checked against the quote, below: the keys
    // are data of one quote, not of this schema.
    lines: z.unknown().optional(),
    // The same list `compose schedule --milestones` takes: shares of the net, never amounts. Each milestone is
    // checked by the reader of the payment calendar, whose rejections are reported as they are.
    paymentMilestones: z.array(z.unknown()).min(1).max(MILESTONE_LIMIT).optional(),
    paymentScheduleTexts: z.object({ title: line.optional(), note: paragraph.optional() }).strict().optional()
  })
  .strict()

export type QuoteDocumentBrief = z.infer<typeof quoteDocumentBriefSchema>

type LineOverride = { label?: string; detail?: string; group?: string }

const LINE_OVERRIDE_FIELDS = ['label', 'detail', 'group'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isLine = (value: unknown): value is string =>
  typeof value === 'string' && hasText(value) && value.length <= 300 && !/[\r\n]/.test(value)

/**
 * Overrides of the brief, checked against the keys of this quote. An entry is reported by its position in the map,
 * never by its key or its content: a key the quote does not have is an error, because a typo would otherwise leave
 * a line with the label nobody chose.
 */
const readOverrides = (declared: unknown, known: ReadonlySet<string>) => {
  const overrides = new Map<string, LineOverride>()
  const issues: QuoteDocumentIssue[] = []

  if (declared === undefined) return { overrides, issues }

  if (!isRecord(declared)) return { overrides, issues: [{ path: 'lines', rule: 'not_an_object' }] }

  Object.entries(declared).forEach(([key, value], index) => {
    const path = `lines.${index}`

    if (!known.has(key)) {
      issues.push({ path, rule: 'unknown_key' })

      return
    }

    if (!isRecord(value)) {
      issues.push({ path, rule: 'not_an_object' })

      return
    }

    if (Object.keys(value).some(field => !LINE_OVERRIDE_FIELDS.some(known => known === field)))
      issues.push({ path, rule: 'unknown_field' })

    const override: LineOverride = {}

    for (const field of LINE_OVERRIDE_FIELDS) {
      const text = value[field]

      if (text === undefined) continue
      if (isLine(text)) override[field] = text
      else issues.push({ path: `${path}.${field}`, rule: `invalid_${field}` })
    }

    overrides.set(key, override)
  })

  return { overrides, issues }
}

// ---- what the template can represent ----

const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf('currency'))

/**
 * Decimals the template gives a currency: the ones of ISO 4217 as the platform knows them, which is what
 * `scripts/documents/document-money.mjs` reads. Null for a currency it does not format.
 */
const documentPrecision = (currency: string) =>
  SUPPORTED_CURRENCIES.has(currency)
    ? (new Intl.NumberFormat('es-CL', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? null)
    : null

/** An amount the template takes: not negative, whole in minor units of its currency, and a safe integer there. */
const representable = (amount: Decimal, precision: number) => {
  const minor = amount.mul(new Wide(10).pow(precision))

  return amount.isFinite() && !amount.isNegative() && minor.isInteger() && minor.lte(Number.MAX_SAFE_INTEGER)
}

/** The kernel formatted every amount of a quote at the precision of its output currency; a derived one keeps it. */
const scaleOf = (money: string) => money.split('.')[1]?.length ?? 0

// ---- the lines of the document, folded over the term ----

/** «Mes 3», «Meses 1 a 2», «Meses 1, 3 y 5»: the periods of a quote are months. */
const monthsLabel = (periodIds: readonly number[]) => {
  const last = periodIds[periodIds.length - 1]

  if (periodIds.length === 1) return `Mes ${last}`

  return periodIds.every((id, index) => index === 0 || id === periodIds[index - 1] + 1)
    ? `Meses ${periodIds[0]} a ${last}`
    : `Meses ${periodIds.slice(0, -1).join(', ')} y ${last}`
}

/** Consecutive periods in which one key is charged the same net. */
type Run = { from: number; to: number; periods: number; unitNet: Decimal }

type KeyedConcept = { key: string; kind: ClientSafeItemKind; label: string; runs: Run[] }

/**
 * The client-safe items of the quote (`clientSafePeriodItems`, the one firewall), followed over the term: per key,
 * the runs of consecutive periods in which it is charged the same net. A period where a key has no net, or a net of
 * zero, is a period it is not charged in and ends its run.
 *
 * Rejected, never repaired: two rows on one key (ids are free text, so it can be written), a negative net, and an
 * amount the template cannot take in the currency of the quote.
 */
const foldClientSafeItems = (result: Composition, precision: number) => {
  const concepts = new Map<string, KeyedConcept>()
  const issues: QuoteDocumentIssue[] = []

  for (const period of clientSafePeriodItems(result)) {
    const seen = new Set<string>()

    period.items.forEach((item, index) => {
      const path = `periods.${period.periodId}.items.${index}`
      const known = concepts.get(item.key)

      if (seen.has(item.key) || (known && known.kind !== item.kind)) {
        issues.push({ path, rule: 'duplicate_key' })

        return
      }

      seen.add(item.key)

      const net = new Wide(item.net)

      if (!representable(net, precision)) {
        issues.push({ path, rule: net.isNegative() ? 'negative_net' : 'amount_not_representable' })

        return
      }

      if (net.isZero()) return

      const concept = known ?? { key: item.key, kind: item.kind, label: item.label, runs: [] }
      const open = concept.runs[concept.runs.length - 1]

      if (open && open.to === period.periodId - 1 && open.unitNet.eq(net)) {
        open.to = period.periodId
        open.periods += 1
      } else concept.runs.push({ from: period.periodId, to: period.periodId, periods: 1, unitNet: net })

      concepts.set(item.key, concept)
    })
  }

  // In the order each key first appears in the quote.
  return { concepts: [...concepts.values()], issues }
}

type DocumentLine = {
  label: string
  detail?: string
  group: string
  quantity: { value: number; unit: string }
  unitNet?: string
  net: string
}

/**
 * One line per run. A recurring concept (the fee of a managed service, a line sold by dedication) is a number of
 * months at the net of one month. A setup or a third-party cost that falls in a single period is a one-off payment
 * and carries no unit value; the same cost repeated over consecutive months is counted in months like the rest.
 *
 * A concept whose net changes over the term yields several lines, each saying which months it covers unless the
 * brief gives a detail of its own. Lines are ordered by the first appearance of their group and, inside it, of
 * their key, so that a heading of the price table is printed once.
 */
const presentLines = (concepts: KeyedConcept[], overrides: ReadonlyMap<string, LineOverride>, scale: number) => {
  const money = (value: Decimal) => value.toFixed(scale)

  const lines = concepts.flatMap(concept => {
    const override = overrides.get(concept.key)
    const recurring = concept.kind === 'fee' || concept.kind === 'line'

    return concept.runs.map(run => {
      const once = !recurring && run.periods === 1
      const months = Array.from({ length: run.periods }, (_, index) => run.from + index)
      const detail = override?.detail ?? (concept.runs.length > 1 ? monthsLabel(months) : undefined)

      return {
        key: concept.key,
        kind: concept.kind,
        net: run.unitNet.mul(run.periods),
        line: {
          label: override?.label ?? concept.label,
          ...(detail !== undefined ? { detail } : {}),
          group: override?.group ?? QUOTE_DOCUMENT_DEFAULT_GROUPS[concept.kind],
          quantity: { value: run.periods, unit: once ? 'pago único' : run.periods === 1 ? 'mes' : 'meses' },
          ...(once ? {} : { unitNet: money(run.unitNet) }),
          net: money(run.unitNet.mul(run.periods))
        } satisfies DocumentLine
      }
    })
  })

  const groups = [...new Set(lines.map(entry => entry.line.group))]

  // Stable: inside a group the order of first appearance is kept.
  return [...lines].sort((a, b) => groups.indexOf(a.line.group) - groups.indexOf(b.line.group))
}

/**
 * What the document says of the quote, before any text: currency, lines and their sum. Shared by the document and
 * by the scaffold of its brief, so the keys a brief may name are exactly the ones the document prints.
 */
const readQuote = (result: Composition) => {
  const { quote } = result
  const totals = quote.totals

  // A blocked quote has rows without amounts, or no rows at all: there is nothing to put in a document.
  if (quote.calculationStatus !== 'calculated' || !totals) return rejected('QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE')

  const precision = documentPrecision(totals.currency)

  if (precision === null)
    return rejected('QUOTE_DOCUMENT_NOT_REPRESENTABLE', [{ path: 'totals.currency', rule: 'currency_not_supported' }])

  const net = new Wide(totals.net)

  if (!representable(net, precision) || net.isZero())
    return rejected('QUOTE_DOCUMENT_NOT_REPRESENTABLE', [{ path: 'totals.net', rule: 'amount_not_representable' }])

  const folded = foldClientSafeItems(result, precision)

  if (folded.issues.length) return rejected('QUOTE_DOCUMENT_NOT_REPRESENTABLE', folded.issues)

  return { ok: true as const, totals, precision, net, scale: scaleOf(totals.net), concepts: folded.concepts }
}

/** Lines within the limits of the template and adding up to the net of the quote, to the unit, or a rejection. */
const checkLines = (lines: ReturnType<typeof presentLines>, net: Decimal) => {
  if (!lines.length) return rejected('QUOTE_DOCUMENT_NOT_REPRESENTABLE', [{ path: 'lines', rule: 'empty' }])
  if (lines.length > LINE_LIMIT)
    return rejected('QUOTE_DOCUMENT_NOT_REPRESENTABLE', [{ path: 'lines', rule: 'too_many' }])
  if (lines.some(entry => entry.line.quantity.value > QUANTITY_LIMIT))
    return rejected('QUOTE_DOCUMENT_NOT_REPRESENTABLE', [{ path: 'lines', rule: 'quantity_not_representable' }])

  // Exact, with no tolerance: a document whose lines do not add up to the quote is never emitted.
  if (!lines.reduce((sum, entry) => sum.plus(entry.net), new Wide(0)).eq(net))
    return rejected('QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP', [{ path: 'lines', rule: 'sum_differs_from_net' }])

  return null
}

type TaxOfDocument = { vatRate: number | null; taxAmount?: string; taxStatus?: 'not_applicable' }

/**
 * Tax of the document, from the treatment the quote was frozen with and the totals it produced.
 *
 * An exclusive rate is handed over with the tax the quote froze (`taxAmount`): the template prints that amount and
 * totals with it instead of computing one, so the tax and the total of the document are the ones of the quote, to
 * the unit. The two can differ by construction: the kernel rounds the tax of each period and adds them up, and the
 * tax of the whole net rounded once is another figure whenever a period net times the rate is not whole.
 *
 * The frozen tax is still held to the rate, with the guard the template applies: it may differ from the tax
 * computed once on the net (half up at the precision of the currency) by at most one minor unit per month or
 * payment the lines count (`quantityOfLines`, the sum of their quantities), which is what per-period rounding can
 * add up to. Beyond that the amount is not the tax of that rate on that net and the document is rejected, as is a
 * rate with more decimals than the template takes. A quote without a resolved tax hands over no rate and no amount.
 */
const readTax = (result: Composition, net: Decimal, precision: number, quantityOfLines: number) => {
  const totals = result.quote.totals!
  const treatment = result.quote.resolution.inputs[0]?.input.request.taxTreatment

  const inconsistent = () =>
    rejected('QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE', [{ path: 'totals.tax', rule: 'tax_inconsistent' }])

  if (!treatment) return inconsistent()

  if (treatment.kind === 'not_resolved') {
    // No rate is assumed: the template prints the tax as pending.
    if (totals.tax !== null || totals.grandTotal !== null) return inconsistent()

    return { ok: true as const, tax: { vatRate: null } satisfies TaxOfDocument }
  }

  if (totals.tax === null || totals.grandTotal === null) return inconsistent()

  const tax = new Wide(totals.tax)
  const grandTotal = new Wide(totals.grandTotal)

  if (treatment.kind === 'not_applicable') {
    if (!tax.isZero() || !grandTotal.eq(net)) return inconsistent()

    return { ok: true as const, tax: { vatRate: null, taxStatus: 'not_applicable' } satisfies TaxOfDocument }
  }

  const rate = new Wide(treatment.rate)

  if (rate.isNegative() || rate.gt(1) || rate.decimalPlaces() > TAX_RATE_DECIMALS)
    return rejected('QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE', [
      { path: 'taxTreatment.rate', rule: 'rate_not_representable' }
    ])

  if (!representable(tax, precision))
    return rejected('QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE', [{ path: 'totals.tax', rule: 'amount_not_representable' }])

  // What the template computes when it is given no amount, and how far from it the frozen tax may be.
  const computedOnce = net.mul(rate).toDecimalPlaces(precision, Wide.ROUND_HALF_UP)
  const tolerance = new Wide(10).pow(-precision).mul(quantityOfLines)

  if (tax.minus(computedOnce).abs().gt(tolerance))
    return rejected('QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE', [{ path: 'totals.tax', rule: 'tax_differs_from_rate' }])

  // The total the template prints is the net plus this amount: it must be the total the quote froze.
  if (!net.plus(tax).eq(grandTotal))
    return rejected('QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE', [
      { path: 'totals.grandTotal', rule: 'total_differs_from_document' }
    ])

  return {
    ok: true as const,
    tax: { vatRate: rate.toNumber(), taxAmount: totals.tax } satisfies TaxOfDocument
  }
}

/** Months and payments the lines count: the `N` of the tax guard, as the template adds it up. */
const quantityOf = (lines: ReturnType<typeof presentLines>) =>
  lines.reduce((total, entry) => total + entry.line.quantity.value, 0)

/**
 * Costs the brief of the quote declares as paid by the client to their supplier, as the client-shaped view of the
 * catalog gives them: concept, amount and currency as declared. They are printed apart and are in no line, no sum
 * and no conversion. The whole amount falls in each period the brief lists, so the detail says which.
 */
const readClientPaidDirectly = (result: Composition) => {
  const declared = clientPaidDirectly(result.quote.resolution.brief)
  const issues: QuoteDocumentIssue[] = []

  if (declared.length > CLIENT_PAID_LIMIT) issues.push({ path: 'clientPaidDirectly', rule: 'too_many' })

  const items = declared.map((cost, index) => {
    const precision = documentPrecision(cost.currency)
    const amount = new Wide(cost.amount)

    if (precision === null)
      issues.push({ path: `clientPaidDirectly.${index}.currency`, rule: 'currency_not_supported' })
    else if (!representable(amount, precision) || amount.isZero())
      issues.push({ path: `clientPaidDirectly.${index}.amount`, rule: 'amount_not_representable' })

    const months = [...new Set(cost.periodIds)].sort((a, b) => a - b)

    return {
      label: cost.label,
      amount: cost.amount,
      currency: cost.currency,
      detail: months.length === 1 ? monthsLabel(months) : `Importe por mes · ${monthsLabel(months)}`
    }
  })

  return issues.length ? rejected('QUOTE_DOCUMENT_NOT_REPRESENTABLE', issues) : { ok: true as const, items }
}

/** Engine that signed the quote. One contract resolves every period, so it is one name; never a guess if not. */
const engineOf = (result: Composition) =>
  [...new Set(result.quote.periods.map(period => period.result.engineVersion))].join(' + ')

/**
 * Turns a frozen composed quote into the data of its client-facing A4 document (version 2 of the data of
 * `docs/commercial/templates/cotizacion-a4`). It is a reading of the frozen result: no price, cost or status changes
 * and nothing is recalculated by the kernel.
 *
 * Two sources, kept apart:
 *
 * - **The quote** gives every figure: currency, date, the lines and their net, the tax treatment, the costs the
 *   client pays directly and, through `presentPaymentSchedule`, the amounts of a payment calendar.
 * - **The document brief** gives every text (who issues it and for whom, cover, scope, calendar of the work, texts of
 *   the price section, conditions) and the presentation of the lines (label, detail and group per key). Its schema
 *   has no amount, currency, tax rate or date, so it cannot contradict the quote.
 *
 * What a client may see is decided by one function, `clientSafePeriodItems` in readiness.ts, which the preview
 * prints period by period and this reading folds over the term. Nothing else of the result is read for a line: no
 * cost, margin, rate, supplier, policy or profile reaches the document, and a managed service is its fee, never its
 * team and hours. The keys a brief addresses lines by are never part of the data.
 *
 * The document is emitted only if it says what the quote says, to the unit:
 *
 * - the lines add up to `totals.net` (`QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP` otherwise);
 * - the tax and the total it prints are `totals.tax` and `totals.grandTotal`: an exclusive rate travels with the
 *   frozen tax as `taxAmount`, which must be the tax of that rate on that net within the rounding of its periods
 *   (`QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE` otherwise);
 * - the milestones of a payment calendar add up to `totals.net`, by `presentPaymentSchedule`;
 * - every amount is one the template can take in its currency, and the lines, the costs paid directly and the
 *   milestones are within its limits (`QUOTE_DOCUMENT_NOT_REPRESENTABLE`).
 *
 * `status` is always `draft`: a composition is a simulation under review and this reading approves nothing.
 * `source` names the calculation the data came from; the template copies it to its manifest and prints none of it.
 */
export function composeQuoteDocument(
  result: Composition,
  identity: { calculationId: string; replayDigest: string },
  brief: unknown
) {
  const read = readQuote(result)

  if (!read.ok) return read

  const parsed = quoteDocumentBriefSchema.safeParse(brief)

  // Path and rule only, as the adapter reports any schema failure: a validator message can quote what was sent.
  if (!parsed.success)
    return rejected(
      'QUOTE_DOCUMENT_BRIEF_INVALID',
      parsed.error.issues.map(issue => ({ path: issue.path.join('.'), rule: issue.code }))
    )

  const text = parsed.data
  const { overrides, issues } = readOverrides(text.lines, new Set(read.concepts.map(concept => concept.key)))

  if (text.paymentScheduleTexts && !text.paymentMilestones)
    issues.push({ path: 'paymentScheduleTexts', rule: 'requires_payment_milestones' })
  if (issues.length) return rejected('QUOTE_DOCUMENT_BRIEF_INVALID', issues)

  const lines = presentLines(read.concepts, overrides, read.scale)
  const unfit = checkLines(lines, read.net)

  if (unfit) return unfit

  const tax = readTax(result, read.net, read.precision, quantityOf(lines))

  if (!tax.ok) return tax

  const paidDirectly = readClientPaidDirectly(result)

  if (!paidDirectly.ok) return paidDirectly

  let paymentSchedule: {
    title: string
    note: string
    milestones: { label: string; when: string; net: string }[]
  } | null = null

  if (text.paymentMilestones) {
    const outcome = presentPaymentSchedule(result, identity, text.paymentMilestones as PaymentMilestone[])

    // The calendar is rejected by its own reader, with its own code; only the place is renamed to where the list
    // lives in this brief.
    if (!outcome.ok)
      return rejected(
        outcome.code,
        outcome.issues.map(issue => ({
          path: issue.path.replace(/^milestones/, 'paymentMilestones'),
          rule: issue.rule
        }))
      )

    // The calendar reader accepts a milestone with no timing; a document that asks for a payment says when.
    const untimed = outcome.reading.milestones.flatMap((milestone, index) =>
      milestone.periodId === undefined && milestone.when === undefined
        ? [{ path: `paymentMilestones.${index}`, rule: 'timing_required' }]
        : []
    )

    if (untimed.length) return rejected('QUOTE_DOCUMENT_BRIEF_INVALID', untimed)

    const milestones = outcome.reading.milestones.map(milestone => ({
      label: milestone.label,
      when: milestone.periodId !== undefined ? monthsLabel([milestone.periodId]) : (milestone.when as string),
      net: milestone.amount
    }))

    // Already guaranteed by the calendar reader; checked where the document is assembled so it cannot drift.
    if (!milestones.reduce((sum, milestone) => sum.plus(milestone.net), new Wide(0)).eq(read.net))
      return rejected('QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP', [
        { path: 'paymentSchedule.milestones', rule: 'sum_differs_from_net' }
      ])

    paymentSchedule = {
      title: text.paymentScheduleTexts?.title ?? QUOTE_DOCUMENT_DEFAULT_SCHEDULE_TEXTS.title,
      note: text.paymentScheduleTexts?.note ?? QUOTE_DOCUMENT_DEFAULT_SCHEDULE_TEXTS.note,
      milestones
    }
  }

  return {
    ok: true as const,
    reading: {
      version: QUOTE_DOCUMENT_DATA_VERSION,
      status: 'draft' as const,
      // The date of the document is the date of the quote: the brief has no date to offer.
      date: result.quote.resolution.inputs[0].input.request.quoteDate,
      reference: text.reference,
      currency: read.totals.currency,
      ...(text.locale ? { locale: text.locale } : {}),
      ...tax.tax,
      supplier: text.supplier,
      buyer: text.buyer,
      cover: text.cover,
      service: text.service,
      scope: text.scope,
      schedule: text.schedule,
      conditions: text.conditions,
      pricing: text.pricing,
      lines: lines.map(entry => entry.line),
      // The net of the quote as frozen. The template checks it against the sum of the lines once more.
      net: read.totals.net,
      ...(paidDirectly.items.length ? { clientPaidDirectly: paidDirectly.items } : {}),
      ...(paymentSchedule ? { paymentSchedule } : {}),
      source: {
        system: 'pricing-v3',
        calculationId: identity.calculationId,
        digest: identity.replayDigest,
        engineVersion: engineOf(result)
      }
    }
  }
}

export type QuoteDocumentData = Extract<ReturnType<typeof composeQuoteDocument>, { ok: true }>['reading']

/**
 * The brief of a document, ready to fill: every text slot empty and every line of the quote under its key, with the
 * label and the group it prints with when the brief says nothing. An empty slot does not pass the schema, so a
 * scaffold that was not filled is rejected and never becomes a document.
 *
 * Next to it, what the document will say of the quote whatever the brief holds: its date, currency and totals, and
 * the lines as they fold over the term. Figures are listed here for the operator who writes the texts; none of them
 * belongs in the brief.
 */
export function scaffoldQuoteDocumentBrief(
  result: Composition,
  identity: { calculationId: string; replayDigest: string }
) {
  const read = readQuote(result)

  if (!read.ok) return read

  const lines = presentLines(read.concepts, new Map(), read.scale)
  const unfit = checkLines(lines, read.net)

  if (unfit) return unfit

  const tax = readTax(result, read.net, read.precision, quantityOf(lines))

  if (!tax.ok) return tax

  const paidDirectly = readClientPaidDirectly(result)

  if (!paidDirectly.ok) return paidDirectly

  const row = { title: '', text: '' }

  return {
    ok: true as const,
    reading: {
      schemaVersion: QUOTE_DOCUMENT_SCAFFOLD_VERSION,
      binding: false as const,
      calculationId: identity.calculationId,
      replayDigest: identity.replayDigest,
      statement:
        'Scaffold of the brief of a quote document. Fill every empty text of `brief`, keep or rewrite the label and the group of each line, and run `compose document` again with it. The brief holds texts and presentation only: every amount, the currency, the tax and the date of the document come from the frozen quote, and a brief that carries one is rejected.',
      quote: {
        date: result.quote.resolution.inputs[0].input.request.quoteDate,
        currency: read.totals.currency,
        periods: result.quote.periods.length,
        net: read.totals.net,
        tax: read.totals.tax,
        grandTotal: read.totals.grandTotal,
        ...tax.tax
      },
      // As they print with no override, with the key a brief addresses each by. A key is never printed.
      lines: lines.map(entry => ({ key: entry.key, kind: entry.kind, ...entry.line })),
      ...(paidDirectly.items.length ? { clientPaidDirectly: paidDirectly.items } : {}),
      optional: {
        locale: 'BCP 47 locale the template formats with. Absent, the template chooses it from the currency.',
        'buyer.logo': '{ path, source }: a local image file and the official HTTPS source it was taken from.',
        'pricing.taxLabel': 'Name of the tax when it is not the default of the template.',
        'pricing.monthly':
          '{ months, note }: prints the monthly equivalent of the totals. A count of months, not an amount.',
        'lines.<key>.detail':
          'Second line of a concept. A concept whose net changes over the term says which months each line covers unless a detail is given.',
        paymentMilestones:
          'The list `compose schedule --milestones` takes: [{ id, label, share, periodId | when }]. Shares add up to 1; the amounts are derived from the net. Each milestone needs periodId or when.',
        paymentScheduleTexts: '{ title, note } of the payment calendar. Only with paymentMilestones.'
      },
      brief: {
        schemaVersion: QUOTE_DOCUMENT_BRIEF_VERSION,
        reference: '',
        supplier: { name: '', taxId: '', contact: '', email: '', phone: '' },
        buyer: { name: '', unit: '', taxId: '' },
        cover: { label: '', title: [''], subtitle: '' },
        service: { name: '' },
        scope: { title: [''], intro: '', rows: [row] },
        schedule: { title: '', note: '', phases: [{ label: '', title: '', text: '' }] },
        pricing: { title: [''], intro: '', summary: '', taxNote: '' },
        conditions: { title: [''], rows: [row] },
        lines: Object.fromEntries(
          read.concepts.map(concept => [
            concept.key,
            { label: concept.label, group: QUOTE_DOCUMENT_DEFAULT_GROUPS[concept.kind] }
          ])
        )
      }
    }
  }
}

export type QuoteDocumentScaffold = Extract<ReturnType<typeof scaffoldQuoteDocumentBrief>, { ok: true }>['reading']
