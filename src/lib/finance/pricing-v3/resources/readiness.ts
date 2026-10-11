import Decimal from 'decimal.js'

import { clientPaidDirectly } from '../catalog/client'
import { describeEngagementForm, describeMarketFactor } from '../catalog/explain'
import { PricingV3Error } from '../errors'
import { PRICING_V3_THIRD_PARTY_BILLING } from '../schemas'
import type { composeResourceQuote } from './composition'
import { estimateExposure, linesBelowPolicyFloor } from './summary'

type Composition = ReturnType<typeof composeResourceQuote>

// Generic references, never approved: the margin a quote is held against before anyone has decided its policy.
const PROPOSED_MARGIN_TARGET = '0.40'
const PROPOSED_MARGIN_FLOOR = '0.35'

/** Economic evidence gaps are separate from mathematical completion and never grant commercial authority. */
export function assessCompositionReadiness(result: Composition) {
  const gaps: { code: string; path: string; owner: string; action: string }[] = []
  const gap = (code: string, path: string, owner: string, action: string) => gaps.push({ code, path, owner, action })

  gap(
    'COMMERCIAL_APPROVAL_REQUIRED',
    'quote',
    'Commercial/Finance',
    'Review scope, complete costs, terms and the selling policy before issuing a quote.'
  )
  if (result.quote.calculationStatus !== 'calculated')
    result.quote.diagnostics.forEach(d =>
      gap(d.code, d.path, 'Agent/Operations', d.detail ?? 'Complete the indicated input.')
    )

  for (const b of result.quote.resolution.bindings) {
    if (b.record.kind === 'cost' && (b.record.source.status !== 'confirmed' || !b.record.value.localization))
      gap(
        'HUMAN_COST_EVIDENCE_REQUIRED',
        b.lineId,
        'People/Finance',
        'Validate localized compensation and its cost coverages; the historical value remains a reference.'
      )
    if (b.record.kind === 'resource' && /TEST ONLY|NOT MEASURED|trial/i.test(b.record.value.label))
      gap(
        'PROVISION_COST_EVIDENCE_REQUIRED',
        b.lineId,
        'Operations/Finance',
        'Measure Assurance, operations and onboarding activities and cost.'
      )
  }

  for (const a of result.attributions) {
    gap(
      'RESOURCE_ACCESS_AND_CAPACITY_REQUIRED',
      `${a.periodId}:${a.toolId}`,
      'Operations',
      'Verify actual subscriptions, named-user access or permitted shared capacity; a price reference alone does not prove access or reserve inventory.'
    )
    if (a.resource.source.status !== 'confirmed')
      gap(
        'TOOL_COST_EVIDENCE_REVIEW',
        `${a.periodId}:${a.toolId}`,
        'Operations/Finance',
        'Confirm source, plan, billing, term and access. Public/operator/historical references remain distinguishable.'
      )
    if (/simulat|hypothet|prototype|example/i.test(a.reason))
      gap(
        'ALLOCATION_EVIDENCE_REQUIRED',
        `${a.periodId}:${a.toolId}`,
        'Operations',
        'Replace the simulated denominator and assignments with declared operational capacity.'
      )
    if (a.consumerIds.some(id => id.startsWith('planned-')))
      gap(
        'USER_ASSIGNMENT_REQUIRED',
        `${a.periodId}:${a.toolId}`,
        'Operations',
        'Confirm stable user IDs and licensed access.'
      )
  }

  if (result.quote.totals?.tax === null)
    gap(
      'TAX_AND_ENTITY_REQUIRED',
      'quote',
      'Finance',
      'Resolve contractual entity, currency and applicable tax treatment.'
    )
  if (result.commercialUnit === 'managed_service')
    gap(
      'SERVICE_SCOPE_AND_DELIVERY_REQUIRED',
      'commercialUnit',
      'Practice/Commercial',
      'Validate deliverables, acceptance, capacity, responsibilities, limits and continuity; internal role cost is not a service contract.'
    )

  // Third-party costs of the engagement (contract 1.4.0), read from the brief the quote froze: the supplier, the
  // evidence and the costs the client pays directly never leave it. A brief of an earlier contract declares none.
  const brief = result.quote.resolution.brief
  const declaredCosts = brief?.thirdPartyCosts ?? []
  let reinvoicedCosts = 0

  for (const cost of declaredCosts) {
    if (cost.settlement !== 'reinvoiced') continue

    reinvoicedCosts += 1

    if (cost.evidence.status !== 'confirmed')
      gap(
        'THIRD_PARTY_COST_EVIDENCE_REQUIRED',
        `thirdPartyCosts.${cost.costId}.evidence`,
        'Commercial/Finance',
        'The amount of this re-invoiced cost rests on evidence that is not confirmed. Obtain the quote of the supplier with its reference, date and validity: an estimated amount keeps the quote under review and a pending one withholds the calculation.'
      )
    if (brief && cost.currency !== brief.outputCurrency)
      gap(
        'THIRD_PARTY_FX_EXPOSURE',
        `thirdPartyCosts.${cost.costId}.currency`,
        'Finance/Commercial',
        `The supplier charges in ${cost.currency} and the quote is in ${brief.outputCurrency}. The row was converted with the FX frozen in the quote, and the supplier is paid at the FX of the day it is paid. Agree a readjustment clause or carry an explicit FX buffer before issuing.`
      )
  }

  if (declaredCosts.length)
    gap(
      'THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED',
      'thirdPartyCosts',
      'Practice/Commercial',
      'Validate each third-party cost before issuing: what it covers, who contracts and pays the supplier, the payment terms of the supplier against those of the client, usage rights and what a cancellation costs. A re-invoiced amount is not a supplier contract, and a cost the client pays directly is outside every total of this quote.'
    )

  // One tax treatment per quote: the kernel applies an exclusive rate to the whole net, third-party rows included.
  if (reinvoicedCosts && brief?.taxTreatment.kind === 'exclusive')
    gap(
      'THIRD_PARTY_TAX_TREATMENT_REVIEW',
      'taxTreatment',
      'Finance',
      'The exclusive tax rate of the quote was applied to its whole net, the re-invoiced third-party rows included. Confirm that each of them carries the tax treatment of the service: media, talent or a foreign supplier may not.'
    )

  // The reserve leaves a quote only through a declared waiver. Whether there was one to waive is read from what
  // resolution selected, so a quote that is not calculated says it too.
  const totals = result.quote.totals
  const reserveSelected = result.quote.resolution.bindings.some(b => b.record.kind === 'contingency_reserve')

  if (brief?.contingency?.kind === 'waived' && reserveSelected)
    gap(
      'CONTINGENCY_RESERVE_WAIVED',
      'contingency',
      'Commercial/Finance',
      `The brief waives the contingency reserve of this quote (reason in brief.contingency.reason)${
        totals && 'contingencyReserveWaived' in totals
          ? `: ${totals.contingencyReserveWaived} ${totals.currency} of cost were left out`
          : ''
      }. Neither the price nor the floor of a row covers an overrun. Approve the waiver or restore the reserve.`
    )

  // The floor verdict is the kernel's (MARGIN_BELOW_FLOOR per line); readiness only turns it into an owned decision.
  const belowPolicyFloor = linesBelowPolicyFloor(result)
  const marketFactor = describeMarketFactor(result.quote.resolution)
  const engagementForm = describeEngagementForm(result.quote.resolution)

  // A third-party row is judged on the floor of the price rule of its category, which is another record than a
  // pricing policy and usually another number: the gap says which rule it is.
  const categoryRule = (costId: string | null) => {
    const record = result.quote.resolution.bindings.find(
      b => b.lineId === costId && b.record.kind === 'third_party_policy'
    )?.record

    return record?.kind === 'third_party_policy'
      ? `category ${record.value.category}, record ${record.recordId} revision ${record.revision}, minimum margin ${record.value.minimumMargin}`
      : 'the third_party_policy record selected for it'
  }

  for (const line of belowPolicyFloor)
    gap(
      'MARGIN_BELOW_POLICY_FLOOR',
      `periods.${line.periodId}.result.lines.${line.lineId}`,
      'Commercial/Finance',
      line.kind === PRICING_V3_THIRD_PARTY_BILLING
        ? `The price of this re-invoiced third-party cost is under the margin floor of the price rule of its category (${categoryRule(line.parentLineId)}), not of a pricing policy. Decide: raise its price, have the client pay the supplier directly or approve an exception. The system does not raise the price.`
        : 'The price of this line is under the margin floor of the selected pricing policy. Decide: raise the price, change the scope or approve an exception. The system does not raise the price.'
    )

  // The ranking is the summary's (`estimateExposure`); readiness only points at where the evidence matters most.
  const exposure = estimateExposure(result)

  // Null when the quote sells no own work at a net above zero: there is no margin of own work to hold to a floor.
  const ownWorkRate = totals && 'ownWorkMarginRate' in totals ? (totals.ownWorkMarginRate ?? null) : undefined
  const heldAgainstFloor = ownWorkRate !== undefined ? ownWorkRate : (totals?.marginRate ?? null)

  return {
    calculationStatus: result.quote.calculationStatus,
    commercialStatus: 'requires_review',
    binding: false,
    gaps: gaps.filter((g, i) => gaps.findIndex(x => x.code === g.code && x.path === g.path) === i),
    // Evidence gaps above all read alike; this is the order to close the cost ones in, largest cost first.
    costEvidencePriority: exposure
      ? {
          currency: exposure.currency,
          estimatedCost: exposure.estimatedCost,
          confirmedCost: exposure.confirmedCost,
          estimatedShareOfCost: exposure.estimatedShareOfCost,
          confirmFirst: exposure.costInputs.slice(0, 5)
        }
      : null,
    margin: totals
      ? {
          // The real margin of the whole quote, third-party rows included.
          modeledRate: totals.marginRate,
          // From contract 1.4.0: the margin of the quote without its third-party rows. A cost re-invoiced at or near
          // cost dilutes `modeledRate` and not this one, so the generic floor below is read on it. Absent for a
          // quote of an earlier contract, which has no third-party row and one margin.
          ...(ownWorkRate !== undefined ? { ownWorkRate, proposedFloorReadOn: 'ownWorkRate' as const } : {}),
          proposedTarget: PROPOSED_MARGIN_TARGET,
          proposedFloor: PROPOSED_MARGIN_FLOOR,
          approved: false,
          belowProposedFloor:
            heldAgainstFloor === null ? null : new Decimal(heldAgainstFloor).lt(PROPOSED_MARGIN_FLOOR),
          // Per-line floors of the pricing policy actually selected, as judged by the kernel. Independent of the
          // generic proposals above, which stay unapproved references. With a market factor whose floor follows the
          // base market, `modeledRate` (the real margin) can sit under the policy minimum with no line flagged. The
          // form of the engagement moves the net and never the floor: a ratio under 1 can be why a line is flagged.
          // A third-party row is listed here on the floor of its category, never on the floor of a pricing policy.
          policyFloor: {
            source: 'kernel:MARGIN_BELOW_FLOOR',
            ...(marketFactor ? { marketFactor } : {}),
            ...(engagementForm ? { engagementForm } : {}),
            linesBelowFloor: belowPolicyFloor
          }
        }
      : null
  }
}

/** What a client-safe item is: the fee of a managed service, a commercial line, a setup or a re-invoiced cost. */
export type ClientSafeItemKind = 'fee' | 'line' | 'setup' | 'third_party'

/**
 * The one firewall between a composed quote and anything a client reads. Per period, the items a client may see:
 * a concept and its final net (after commercial rounding, discount and uplift), and nothing else of the row it came
 * from. No cost, margin, rate, supplier, policy or profile. A managed service is one fee, never its team and hours.
 *
 * Every presentation of a quote to a client is built on this function and adds no figure of its own: the preview
 * below prints `label` and `net` as they are, and the quote document (`quote-document.ts`) folds the same items
 * over the term.
 *
 * `key` and `kind` exist for those presentations and are never printed. `key` names the same thing in every period
 * it appears in, so a presentation can follow it over the term; it derives from kernel identifiers only:
 * a managed service has `fee`, `setup` and `third_party:<costId>`; a quote sold by lines has the id of each line
 * for its monthly row, `<lineId>:setup` for its setup row and `third_party:<costId>`. Ids are free text, so two rows
 * of a period could in principle collide on a key: a presentation that depends on the keys checks them, this
 * function only derives them.
 */
export function clientSafePeriodItems(result: Composition) {
  if (result.quote.calculationStatus !== 'calculated' || !result.quote.totals)
    throw new PricingV3Error('PREVIEW_REQUIRES_CALCULATED_SIMULATION')
  const D = Decimal.clone({ precision: 80 })
  const thirdPartyKey = (costId: string) => `${PRICING_V3_THIRD_PARTY_BILLING}:${costId}`

  return result.quote.periods.map(p => {
    if (!p.result.totals) throw new PricingV3Error('PREVIEW_REQUIRES_CALCULATED_SIMULATION')
    const lines = p.result.lines
    const setup = lines.filter(l => l.kind === 'setup').reduce((s, l) => s.plus(l.net), new D(0))
    const thirdParty = lines.filter(l => l.kind === PRICING_V3_THIRD_PARTY_BILLING)

    // The kernel already formatted this period at the currency's precision; an amount derived here keeps that scale
    // instead of assuming two decimals (CLP has none).
    const scale = p.result.totals.net.split('.')[1]?.length ?? 0

    const items: { key: string; kind: ClientSafeItemKind; label: string; net: string }[] =
      result.commercialUnit === 'managed_service'
        ? [
            {
              key: 'fee',
              kind: 'fee',
              label: 'Servicio gestionado — fee del periodo',
              // What the service itself is sold for: nothing a supplier is paid for is presented as fee.
              net: thirdParty
                .reduce((fee, l) => fee.minus(l.net), new D(p.result.totals.net).minus(setup))
                .toFixed(scale)
            },
            ...(setup.gt(0)
              ? [{ key: 'setup', kind: 'setup' as const, label: 'Implementación inicial', net: setup.toFixed(scale) }]
              : []),
            ...thirdParty.map(l => ({
              key: thirdPartyKey(l.parentLineId),
              kind: 'third_party' as const,
              label: l.label,
              net: l.net
            }))
          ]
        : lines.map(l =>
            l.kind === 'setup'
              ? { key: `${l.parentLineId}:setup`, kind: 'setup' as const, label: 'Implementación inicial', net: l.net }
              : l.kind === PRICING_V3_THIRD_PARTY_BILLING
                ? { key: thirdPartyKey(l.parentLineId), kind: 'third_party' as const, label: l.label, net: l.net }
                : { key: l.parentLineId, kind: 'line' as const, label: l.label, net: l.net }
          )

    return { periodId: p.periodId, items, net: p.result.totals.net }
  })
}

/**
 * Client-shaped local simulation preview. No internal identifiers, cost stack, providers, rates or margin.
 * Every amount is a final net (after commercial rounding, discount and uplift); none of those is itemized.
 *
 * From contract 1.4.0 a re-invoiced third-party cost is an item of its own in the period it falls in, by the concept
 * the brief declares and its final net: it is never folded into the fee of a managed service, which is the period net
 * minus the setup and minus those items. A cost the client pays directly is listed apart under `clientPaidDirectly`
 * (concept, amount and currency as declared), outside every item, period and total; the key is absent when the brief
 * declares none. Neither carries the supplier, what the supplier charges or the rule that priced it.
 *
 * The items are the ones of `clientSafePeriodItems`, printed by concept and net: the keys it derives stay internal.
 */
export function projectCompositionPreview(result: Composition) {
  if (result.quote.calculationStatus !== 'calculated' || !result.quote.totals)
    throw new PricingV3Error('PREVIEW_REQUIRES_CALCULATED_SIMULATION')
  const currency = result.quote.totals.currency

  const periods = clientSafePeriodItems(result).map(period => ({
    periodId: period.periodId,
    currency,
    items: period.items.map(item => ({ label: item.label, net: item.net })),
    net: period.net
  }))

  const paidDirectly = clientPaidDirectly(result.quote.resolution.brief)

  return {
    schemaVersion: 'pricing-v3-composition-preview/1',
    status: 'Simulación interna pendiente de revisión',
    binding: false,
    commercialUnit: result.commercialUnit,
    currency,
    periods,
    net: result.quote.totals.net,
    tax: result.quote.totals.tax,
    grandTotal: result.quote.totals.grandTotal,
    ...(paidDirectly.length ? { clientPaidDirectly: paidDirectly } : {}),
    note: 'No es una oferta emitida. Validar alcance, recursos, precio, impuestos y condiciones antes de presentación.'
  }
}

export function compositionPreviewMarkdown(result: Composition) {
  const p = projectCompositionPreview(result)
  const oneLine = (value: string) => value.replace(/[\r\n]/g, ' ')

  // After the net of the term, so that no amount above it reads as including these.
  const paidDirectly = p.clientPaidDirectly?.length
    ? `\n\nPagado directamente por el cliente a su proveedor. No forma parte de esta cotización ni de su neto:\n\n${p.clientPaidDirectly
        .map(item => `- ${oneLine(item.label)}: ${item.amount} ${item.currency} (periodo ${item.periodIds.join(', ')})`)
        .join('\n')}`
    : ''

  return (
    `# Simulación de cotización\n\n${p.status}. No vinculante.\n\n` +
    p.periods
      .map(
        period =>
          `Periodo ${period.periodId} — ${period.currency}\n\n` +
          period.items.map(i => `- ${oneLine(i.label)}: ${i.net} ${period.currency}`).join('\n')
      )
      .join('\n\n') +
    `\n\nNeto del plazo: ${p.net} ${p.currency}.${paidDirectly}\n\n${p.note}\n`
  )
}
