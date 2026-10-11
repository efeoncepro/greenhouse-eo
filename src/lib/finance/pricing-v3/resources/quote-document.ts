import Decimal from 'decimal.js'
import { z } from 'zod'

import { clientPaidDirectly } from '../catalog/client'
import type { composeResourceQuote } from './composition'
import { presentPaymentSchedule } from './engagement-view'
import type { EngagementViewRejectionCode, PaymentMilestone } from './engagement-view'
import { clientSafePeriodItems, clientSafeWaivedItems } from './readiness'
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
const OPTION_LIMIT = 8
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

/**
 * Texts of the block of optional add-ons when the brief gives none. True of any block this reading can emit; the
 * template states on its own that the options are outside the quote, its net and its total.
 */
export const QUOTE_DOCUMENT_DEFAULT_OPTIONS_TEXTS = {
  title: 'Opciones adicionales',
  note: 'Cada opción se contrata por separado y sólo si se solicita.'
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
  | 'QUOTE_DOCUMENT_OPTION_INVALID'
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
    // are data of one quote, not of this schema. Besides its texts, a line the quote waives completely may be marked
    // `courtesy: true` to be printed with its reference value: a choice of presentation, never a figure.
    lines: z.unknown().optional(),
    // Name, detail and unit of each optional add-on, by the key its frozen quote was passed under. Checked against
    // the options of the run, below: like the keys of the lines, they are data of one run and not of this schema.
    // The price of an option comes from its own frozen quote; this block has no place for one.
    options: z.unknown().optional(),
    optionsTexts: z.object({ title: line.optional(), note: paragraph.optional() }).strict().optional(),
    // The same list `compose schedule --milestones` takes: shares of the net, never amounts. Each milestone is
    // checked by the reader of the payment calendar, whose rejections are reported as they are.
    paymentMilestones: z.array(z.unknown()).min(1).max(MILESTONE_LIMIT).optional(),
    paymentScheduleTexts: z.object({ title: line.optional(), note: paragraph.optional() }).strict().optional()
  })
  .strict()

export type QuoteDocumentBrief = z.infer<typeof quoteDocumentBriefSchema>

type LineOverride = { label?: string; detail?: string; group?: string; courtesy?: boolean }

const LINE_TEXT_FIELDS = ['label', 'detail', 'group'] as const
const LINE_OVERRIDE_FIELDS: readonly string[] = [...LINE_TEXT_FIELDS, 'courtesy']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isLine = (value: unknown): value is string =>
  typeof value === 'string' && hasText(value) && value.length <= 300 && !/[\r\n]/.test(value)

/**
 * Overrides of the brief, checked against the keys of this quote. An entry is reported by its position in the map,
 * never by its key or its content: a key the quote does not have is an error, because a typo would otherwise leave
 * a line with the label nobody chose.
 *
 * `charged` are the keys the quote charges for and `waived` the ones it waives completely and charges nowhere. A
 * waived key exists for a brief only to be marked `courtesy: true`: without the mark its line prints nothing, so
 * there is nothing to dress and the key is as unknown as before the mark existed. The mark on a key the quote
 * charges for is rejected: a line with a net is never presented as a courtesy.
 */
const readOverrides = (declared: unknown, charged: ReadonlySet<string>, waived: ReadonlySet<string>) => {
  const overrides = new Map<string, LineOverride>()
  const issues: QuoteDocumentIssue[] = []

  if (declared === undefined) return { overrides, issues }

  if (!isRecord(declared)) return { overrides, issues: [{ path: 'lines', rule: 'not_an_object' }] }

  Object.entries(declared).forEach(([key, value], index) => {
    const path = `lines.${index}`
    const marked = isRecord(value) && value.courtesy === true

    if (!charged.has(key) && !(waived.has(key) && marked)) {
      issues.push({ path, rule: 'unknown_key' })

      return
    }

    if (!isRecord(value)) {
      issues.push({ path, rule: 'not_an_object' })

      return
    }

    if (Object.keys(value).some(field => !LINE_OVERRIDE_FIELDS.includes(field)))
      issues.push({ path, rule: 'unknown_field' })

    const override: LineOverride = {}

    for (const field of LINE_TEXT_FIELDS) {
      const text = value[field]

      if (text === undefined) continue
      if (isLine(text)) override[field] = text
      else issues.push({ path: `${path}.${field}`, rule: `invalid_${field}` })
    }

    if (value.courtesy !== undefined) {
      if (typeof value.courtesy !== 'boolean') issues.push({ path: `${path}.courtesy`, rule: 'invalid_courtesy' })
      else if (value.courtesy && charged.has(key)) issues.push({ path: `${path}.courtesy`, rule: 'line_is_charged' })
      else override.courtesy = value.courtesy
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

/**
 * Where a concept first appears in the quote: the ordinal of the period and the place among its client-safe items.
 * Concepts are printed in this order, which for the concepts a quote charges for is the order they first appear in.
 */
type Rank = readonly [period: number, position: number]

type KeyedConcept = { key: string; kind: ClientSafeItemKind; label: string; rank: Rank; runs: Run[] }

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

  clientSafePeriodItems(result).forEach((period, ordinal) => {
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

      const concept = known ?? {
        key: item.key,
        kind: item.kind,
        label: item.label,
        rank: [ordinal, index] as const,
        runs: []
      }

      const open = concept.runs[concept.runs.length - 1]

      if (open && open.to === period.periodId - 1 && open.unitNet.eq(net)) {
        open.to = period.periodId
        open.periods += 1
      } else concept.runs.push({ from: period.periodId, to: period.periodId, periods: 1, unitNet: net })

      concepts.set(item.key, concept)
    })
  })

  // In the order each key first appears in the quote.
  return { concepts: [...concepts.values()], issues }
}

/** Consecutive periods in which one key is waived, and what it would have been charged for over them. */
type WaivedRun = { from: number; to: number; periods: number; reference: Decimal }

type WaivedConcept = {
  key: string
  kind: ClientSafeItemKind
  label: string
  rank: Rank
  runs: WaivedRun[]
  /** False when a reference value is not an amount the template takes in the currency of the quote. */
  representable: boolean
}

/**
 * The items the quote waives completely (`clientSafeWaivedItems`, the one place a reference value comes from),
 * followed over the term: per key, the runs of consecutive periods it is waived in, each with the sum of what it
 * would have been charged for. A key the quote charges for in any period is not a courtesy and is left out: its
 * lines are the ones `foldClientSafeItems` gives, as before.
 *
 * Nothing here is printed unless the brief marks the key, and a quote with nothing waived yields an empty list.
 */
const foldWaivedItems = (result: Composition, precision: number, charged: ReadonlySet<string>) => {
  const concepts = new Map<string, WaivedConcept>()

  clientSafeWaivedItems(result).forEach((period, ordinal) => {
    for (const item of period.items) {
      if (charged.has(item.key)) continue

      const reference = new Wide(item.referenceNet)

      const concept = concepts.get(item.key) ?? {
        key: item.key,
        kind: item.kind,
        label: item.label,
        rank: [ordinal, item.position] as const,
        runs: [],
        representable: true
      }

      const open = concept.runs[concept.runs.length - 1]

      if (!representable(reference, precision) || reference.isZero()) concept.representable = false

      if (open && open.to === period.periodId - 1) {
        open.to = period.periodId
        open.periods += 1
        open.reference = open.reference.plus(reference)
      } else concept.runs.push({ from: period.periodId, to: period.periodId, periods: 1, reference })

      concepts.set(item.key, concept)
    }
  })

  return [...concepts.values()].map(concept => ({
    ...concept,
    representable: concept.representable && concept.runs.every(run => representable(run.reference, precision))
  }))
}

type DocumentLine = {
  label: string
  detail?: string
  group: string
  quantity: { value: number; unit: string }
  unitNet?: string
  net: string
  /** Only on a courtesy: what the line would have been charged for. Its net is zero and it has no unit value. */
  referenceNet?: string
}

/** A line of the document with what the reading keeps of it: its key and kind, never printed, and its exact net. */
type LineEntry = { key: string; kind: ClientSafeItemKind; courtesy: boolean; net: Decimal; line: DocumentLine }

/** Months a run covers, and how a line counts them: a one-off payment or a number of months. */
const quantityOfRun = (kind: ClientSafeItemKind, run: { from: number; periods: number }) => {
  const once = kind !== 'fee' && kind !== 'line' && run.periods === 1

  return {
    once,
    months: Array.from({ length: run.periods }, (_, index) => run.from + index),
    quantity: { value: run.periods, unit: once ? 'pago único' : run.periods === 1 ? 'mes' : 'meses' }
  }
}

/**
 * One line per run. A recurring concept (the fee of a managed service, a line sold by dedication) is a number of
 * months at the net of one month. A setup or a third-party cost that falls in a single period is a one-off payment
 * and carries no unit value; the same cost repeated over consecutive months is counted in months like the rest.
 *
 * A concept whose net changes over the term yields several lines, each saying which months it covers unless the
 * brief gives a detail of its own. Lines are ordered by the first appearance of their group and, inside it, of
 * their key, so that a heading of the price table is printed once.
 *
 * `courtesies` are the concepts the quote waives completely and the brief marked: each run is a line with a net of
 * zero, no unit value and `referenceNet`, the sum of what its months would have been charged for. It is counted like
 * the line it replaces and sits where that line would be; it adds nothing to any sum.
 */
const presentLines = (
  concepts: KeyedConcept[],
  courtesies: WaivedConcept[],
  overrides: ReadonlyMap<string, LineOverride>,
  scale: number
) => {
  const money = (value: Decimal) => value.toFixed(scale)

  const charged = concepts.map(concept => {
    const override = overrides.get(concept.key)

    return {
      rank: concept.rank,
      lines: concept.runs.map((run): LineEntry => {
        const { once, months, quantity } = quantityOfRun(concept.kind, run)
        const detail = override?.detail ?? (concept.runs.length > 1 ? monthsLabel(months) : undefined)

        return {
          key: concept.key,
          kind: concept.kind,
          courtesy: false,
          net: run.unitNet.mul(run.periods),
          line: {
            label: override?.label ?? concept.label,
            ...(detail !== undefined ? { detail } : {}),
            group: override?.group ?? QUOTE_DOCUMENT_DEFAULT_GROUPS[concept.kind],
            quantity,
            ...(once ? {} : { unitNet: money(run.unitNet) }),
            net: money(run.unitNet.mul(run.periods))
          }
        }
      })
    }
  })

  const waived = courtesies.map(concept => {
    const override = overrides.get(concept.key)

    return {
      rank: concept.rank,
      lines: concept.runs.map((run): LineEntry => {
        const { months, quantity } = quantityOfRun(concept.kind, run)
        const detail = override?.detail ?? (concept.runs.length > 1 ? monthsLabel(months) : undefined)

        return {
          key: concept.key,
          kind: concept.kind,
          courtesy: true,
          net: new Wide(0),
          line: {
            label: override?.label ?? concept.label,
            ...(detail !== undefined ? { detail } : {}),
            group: override?.group ?? QUOTE_DOCUMENT_DEFAULT_GROUPS[concept.kind],
            quantity,
            net: money(new Wide(0)),
            referenceNet: money(run.reference)
          }
        }
      })
    }
  })

  // A courtesy takes the place its line would have if it were charged: before whatever is listed at that place.
  // With no courtesy this is the order of `concepts`, untouched (the sort is stable).
  const lines = [...waived, ...charged]
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1])
    .flatMap(concept => concept.lines)

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

  return {
    ok: true as const,
    totals,
    precision,
    net,
    scale: scaleOf(totals.net),
    concepts: folded.concepts,
    // What the quote waives completely. Empty for a quote that waives nothing; printed only where a brief asks.
    waived: foldWaivedItems(result, precision, new Set(folded.concepts.map(concept => concept.key)))
  }
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

/**
 * Months and payments the charged lines count: the `N` of the tax guard. A courtesy has no net and no tax to round,
 * so it lends the guard nothing: the bound is never looser than the one the template applies to the same lines.
 */
const quantityOf = (lines: ReturnType<typeof presentLines>) =>
  lines.reduce((total, entry) => total + (entry.courtesy ? 0 : entry.line.quantity.value), 0)

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

type Identity = { calculationId: string; replayDigest: string }

/**
 * An optional add-on of a document: the frozen quote of the option alone, already verified by replay like the quote
 * of the document, under the key the document brief names it by. The key is never printed.
 */
export type QuoteDocumentOption = { key: string; result: Composition; identity: Identity }

const OPTION_KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/

/**
 * The price of each optional add-on, from its own frozen quote and from nothing else: the net of one of its periods.
 * An option is shown as one amount and a unit («al mes», «por campaña»), so it is accepted only when that amount
 * says all there is to say of it:
 *
 * - it is calculated, in the currency of the quote of the document, and its net is an amount the template takes;
 * - every period has the same net, and the net of the option is that amount times its periods;
 * - it declares no cost the client pays a supplier directly, which the one amount would leave out;
 * - it is another quote than the one of the document and than every other option.
 *
 * An option is reported by its position in the list it was passed in, never by its key. Nothing of it reaches the
 * lines, the net, the tax or the total of the document: only its price, in a block of its own.
 */
const readOptions = (options: readonly QuoteDocumentOption[], base: Identity, currency: string, precision: number) => {
  const issues: QuoteDocumentIssue[] = []

  if (options.length > OPTION_LIMIT) issues.push({ path: 'options', rule: 'too_many' })

  const read = options.map((option, index) => {
    const path = `options.${index}`
    const issue = (rule: string) => void issues.push({ path, rule })
    const { quote } = option.result
    const totals = quote.totals

    if (!OPTION_KEY.test(option.key)) issue('invalid_key')
    else if (options.findIndex(other => other.key === option.key) !== index) issue('duplicate_key')

    if (option.identity.calculationId === base.calculationId) issue('same_as_quote')
    else if (options.findIndex(other => other.identity.calculationId === option.identity.calculationId) !== index)
      issue('duplicate_option')

    if (quote.calculationStatus !== 'calculated' || !totals || quote.periods.some(period => !period.result.totals)) {
      issue('not_calculated')

      return null
    }

    if (totals.currency !== currency) issue('currency_differs_from_quote')

    const nets = quote.periods.map(period => new Wide(period.result.totals!.net))
    const [net] = nets

    if (!net || nets.some(other => !other.eq(net))) {
      issue('net_differs_between_periods')

      return null
    }

    if (!net.mul(nets.length).eq(totals.net)) issue('periods_differ_from_net')
    if (!representable(net, precision) || net.isZero()) issue('amount_not_representable')
    if (clientPaidDirectly(quote.resolution.brief).length) issue('client_pays_costs_directly')

    return {
      key: option.key,
      // As the kernel froze it for a period of the option, at the precision of the shared currency.
      net: quote.periods[0].result.totals!.net,
      periods: nets.length,
      calculationId: option.identity.calculationId,
      replayDigest: option.identity.replayDigest
    }
  })

  return issues.length
    ? rejected('QUOTE_DOCUMENT_OPTION_INVALID', issues)
    : { ok: true as const, options: read.filter(option => option !== null) }
}

type OptionText = { label: string; detail?: string; unit: string }

const OPTION_TEXT_FIELDS = ['label', 'detail', 'unit'] as const

/**
 * Name, detail and unit of each option, as the brief gives them, checked against the options of the run: the brief
 * names exactly the options passed, no more and no fewer, so no option is printed with a text nobody wrote and none
 * that was priced is silently left out. An entry is reported by its position in the map, never by its key.
 */
const readOptionTexts = (declared: unknown, passed: readonly string[]) => {
  const texts = new Map<string, OptionText>()
  const issues: QuoteDocumentIssue[] = []

  if (declared === undefined)
    return { texts, issues: passed.length ? [{ path: 'options', rule: 'option_not_named' }] : issues }

  if (!isRecord(declared)) return { texts, issues: [{ path: 'options', rule: 'not_an_object' }] }

  const named = Object.keys(declared)

  Object.entries(declared).forEach(([key, value], index) => {
    const path = `options.${index}`

    if (!passed.includes(key)) {
      issues.push({ path, rule: 'unknown_key' })

      return
    }

    if (!isRecord(value)) {
      issues.push({ path, rule: 'not_an_object' })

      return
    }

    if (Object.keys(value).some(field => !OPTION_TEXT_FIELDS.some(known => known === field)))
      issues.push({ path, rule: 'unknown_field' })

    for (const field of OPTION_TEXT_FIELDS) {
      const text = value[field]

      if (text === undefined ? field !== 'detail' : !isLine(text))
        issues.push({ path: `${path}.${field}`, rule: text === undefined ? `missing_${field}` : `invalid_${field}` })
    }

    texts.set(key, {
      label: value.label as string,
      ...(value.detail !== undefined ? { detail: value.detail as string } : {}),
      unit: value.unit as string
    })
  })

  if (passed.some(key => !named.includes(key))) issues.push({ path: 'options', rule: 'option_not_named' })

  return { texts, issues }
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
 * Two things are added to that view, each only where the operator asks for it and each from a frozen quote:
 *
 * - **A courtesy.** A line the quote waives completely prints nothing. When the brief marks its key
 *   `courtesy: true`, it is printed with a net of zero and `referenceNet`, what it would have been charged for
 *   (`clientSafeWaivedItems` in readiness.ts, the one place that figure comes from). A mark on a line the quote
 *   charges for is rejected, and a courtesy adds nothing to the net, the tax or the total.
 * - **Optional add-ons.** Each of `options` is the frozen quote of one option alone, verified like the quote of the
 *   document. Its price is the net of one of its periods and is printed in a block of its own, with the name and
 *   the unit the brief gives it; the brief names exactly the options passed. Nothing of an option reaches the lines,
 *   the net, the tax or the total, and `source` records the calculation each price came from.
 *
 * The document is emitted only if it says what the quote says, to the unit:
 *
 * - the lines add up to `totals.net` (`QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP` otherwise);
 * - the tax and the total it prints are `totals.tax` and `totals.grandTotal`: an exclusive rate travels with the
 *   frozen tax as `taxAmount`, which must be the tax of that rate on that net within the rounding of its periods
 *   (`QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE` otherwise);
 * - the milestones of a payment calendar add up to `totals.net`, by `presentPaymentSchedule`;
 * - every amount is one the template can take in its currency, and the lines, the costs paid directly and the
 *   milestones are within its limits (`QUOTE_DOCUMENT_NOT_REPRESENTABLE`);
 * - every option is one amount that says all of it: calculated, in the currency of the quote, the same net in every
 *   period and no cost the client pays apart (`QUOTE_DOCUMENT_OPTION_INVALID` otherwise).
 *
 * `status` is always `draft`: a composition is a simulation under review and this reading approves nothing.
 * `source` names the calculation the data came from; the template copies it to its manifest and prints none of it.
 */
export function composeQuoteDocument(
  result: Composition,
  identity: Identity,
  brief: unknown,
  options: readonly QuoteDocumentOption[] = []
) {
  const read = readQuote(result)

  if (!read.ok) return read

  const priced = readOptions(options, identity, read.totals.currency, read.precision)

  if (!priced.ok) return priced

  const parsed = quoteDocumentBriefSchema.safeParse(brief)

  // Path and rule only, as the adapter reports any schema failure: a validator message can quote what was sent.
  if (!parsed.success)
    return rejected(
      'QUOTE_DOCUMENT_BRIEF_INVALID',
      parsed.error.issues.map(issue => ({ path: issue.path.join('.'), rule: issue.code }))
    )

  const text = parsed.data

  const { overrides, issues } = readOverrides(
    text.lines,
    new Set(read.concepts.map(concept => concept.key)),
    new Set(read.waived.map(concept => concept.key))
  )

  const optionTexts = readOptionTexts(
    text.options,
    priced.options.map(option => option.key)
  )

  issues.push(...optionTexts.issues)

  if (text.paymentScheduleTexts && !text.paymentMilestones)
    issues.push({ path: 'paymentScheduleTexts', rule: 'requires_payment_milestones' })
  if (text.optionsTexts && !priced.options.length) issues.push({ path: 'optionsTexts', rule: 'requires_options' })
  if (issues.length) return rejected('QUOTE_DOCUMENT_BRIEF_INVALID', issues)

  // The courtesies the brief asked for, one by one. A reference value the template cannot take is a fault of the
  // quote, named by the place its key has in the brief.
  const courtesies = read.waived.filter(concept => overrides.get(concept.key)?.courtesy)
  const unfitCourtesy = courtesies.find(concept => !concept.representable)

  if (unfitCourtesy)
    return rejected('QUOTE_DOCUMENT_NOT_REPRESENTABLE', [
      {
        path: `lines.${Object.keys(text.lines as Record<string, unknown>).indexOf(unfitCourtesy.key)}.courtesy`,
        rule: 'reference_not_representable'
      }
    ])

  const lines = presentLines(read.concepts, courtesies, overrides, read.scale)
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

  // In the order the brief names them: the order of a block is a choice of presentation.
  const optionItems = [...optionTexts.texts].map(([key, named]) => ({
    option: priced.options.find(option => option.key === key)!,
    text: named
  }))

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
      ...(optionItems.length
        ? {
            options: {
              title: text.optionsTexts?.title ?? QUOTE_DOCUMENT_DEFAULT_OPTIONS_TEXTS.title,
              note: text.optionsTexts?.note ?? QUOTE_DOCUMENT_DEFAULT_OPTIONS_TEXTS.note,
              items: optionItems.map(({ option, text: named }) => ({
                label: named.label,
                ...(named.detail !== undefined ? { detail: named.detail } : {}),
                net: option.net,
                unit: named.unit
              }))
            }
          }
        : {}),
      source: {
        system: 'pricing-v3',
        calculationId: identity.calculationId,
        digest: identity.replayDigest,
        engineVersion: engineOf(result),
        // The quote each option was priced by, in the order the options are printed. Flat texts, as the template
        // takes its `source`; the keys of the brief are never part of the data.
        ...Object.fromEntries(
          optionItems.flatMap(({ option }, index) => [
            [`option${index + 1}CalculationId`, option.calculationId],
            [`option${index + 1}Digest`, option.replayDigest]
          ])
        )
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
 *
 * Two lists appear only when there is something to list: `waived`, the lines the quote waives completely with the
 * reference value each would print if the brief marked it `courtesy: true` (none is in the brief of the scaffold: a
 * courtesy is asked for, never assumed); and `options`, the options passed with the run and the price of each, which
 * the brief of the scaffold names with a label and a unit to fill.
 */
export function scaffoldQuoteDocumentBrief(
  result: Composition,
  identity: Identity,
  options: readonly QuoteDocumentOption[] = []
) {
  const read = readQuote(result)

  if (!read.ok) return read

  const priced = readOptions(options, identity, read.totals.currency, read.precision)

  if (!priced.ok) return priced

  const lines = presentLines(read.concepts, [], new Map(), read.scale)

  // What the quote waives completely, as each would print if the brief marked it. Listed for the operator to choose;
  // a key that is not marked prints nothing, and none of these is in the lines or in any sum.
  const waived = presentLines(
    [],
    read.waived.filter(concept => concept.representable),
    new Map(),
    read.scale
  )

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
      ...(waived.length ? { waived: waived.map(entry => ({ key: entry.key, kind: entry.kind, ...entry.line })) } : {}),
      ...(paidDirectly.items.length ? { clientPaidDirectly: paidDirectly.items } : {}),
      // The options passed with this run and the price of each, from its own frozen quote: the net of one period.
      ...(priced.options.length
        ? {
            options: priced.options.map(option => ({
              key: option.key,
              net: option.net,
              currency: read.totals.currency,
              periods: option.periods,
              calculationId: option.calculationId
            }))
          }
        : {}),
      optional: {
        locale: 'BCP 47 locale the template formats with. Absent, the template chooses it from the currency.',
        'buyer.logo': '{ path, source }: a local image file and the official HTTPS source it was taken from.',
        'pricing.taxLabel': 'Name of the tax when it is not the default of the template.',
        'pricing.monthly':
          '{ months, note }: prints the monthly equivalent of the totals. A count of months, not an amount.',
        'lines.<key>.detail':
          'Second line of a concept. A concept whose net changes over the term says which months each line covers unless a detail is given.',
        'lines.<key>.courtesy':
          'true prints a line the quote waives completely as a courtesy: net zero and its reference value. Only for the keys listed under `waived`, with their label, detail and group like any line; a waived key that is not marked prints nothing.',
        options:
          '{ <key>: { label, unit, detail? } } for each option passed with `--option <key>=<artifact.json>`: its name, the unit its price is read in («al mes», «por campaña») and an optional second line. Exactly the options passed; the price of each is the net of one period of its own frozen quote.',
        optionsTexts: '{ title, note } of the block of options. Only with options.',
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
        ),
        ...(priced.options.length
          ? { options: Object.fromEntries(priced.options.map(option => [option.key, { label: '', unit: '' }])) }
          : {})
      }
    }
  }
}

export type QuoteDocumentScaffold = Extract<ReturnType<typeof scaffoldQuoteDocumentBrief>, { ok: true }>['reading']
