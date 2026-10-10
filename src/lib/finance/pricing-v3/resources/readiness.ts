import Decimal from 'decimal.js'

import { PricingV3Error } from '../errors'
import type { composeResourceQuote } from './composition'
import { linesBelowPolicyFloor } from './summary'

type Composition = ReturnType<typeof composeResourceQuote>

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

  // The floor verdict is the kernel's (MARGIN_BELOW_FLOOR per line); readiness only turns it into an owned decision.
  const belowPolicyFloor = linesBelowPolicyFloor(result)

  for (const line of belowPolicyFloor)
    gap(
      'MARGIN_BELOW_POLICY_FLOOR',
      `periods.${line.periodId}.result.lines.${line.lineId}`,
      'Commercial/Finance',
      'The price of this line is under the margin floor of the selected pricing policy. Decide: raise the price, change the scope or approve an exception. The system does not raise the price.'
    )

  return {
    calculationStatus: result.quote.calculationStatus,
    commercialStatus: 'requires_review',
    binding: false,
    gaps: gaps.filter((g, i) => gaps.findIndex(x => x.code === g.code && x.path === g.path) === i),
    margin: result.quote.totals
      ? {
          modeledRate: result.quote.totals.marginRate,
          proposedTarget: '0.40',
          proposedFloor: '0.35',
          approved: false,
          belowProposedFloor:
            result.quote.totals.marginRate === null ? null : new Decimal(result.quote.totals.marginRate).lt('0.35'),
          // Per-line floors of the pricing policy actually selected, as judged by the kernel. Independent of the
          // generic proposals above, which stay unapproved references.
          policyFloor: { source: 'kernel:MARGIN_BELOW_FLOOR', linesBelowFloor: belowPolicyFloor }
        }
      : null
  }
}

/** Client-shaped local simulation preview. No internal identifiers, cost stack, providers, rates or margin. */
export function projectCompositionPreview(result: Composition) {
  if (result.quote.calculationStatus !== 'calculated' || !result.quote.totals)
    throw new PricingV3Error('PREVIEW_REQUIRES_CALCULATED_SIMULATION')
  const D = Decimal.clone({ precision: 80 })
  const currency = result.quote.totals.currency

  const periods = result.quote.periods.map(p => {
    if (!p.result.totals) throw new PricingV3Error('PREVIEW_REQUIRES_CALCULATED_SIMULATION')
    const lines = p.result.lines
    const setup = lines.filter(l => l.kind === 'setup').reduce((s, l) => s.plus(l.net), new D(0))

    // The kernel already formatted this period at the currency's precision; an amount derived here keeps that scale
    // instead of assuming two decimals (CLP has none).
    const scale = p.result.totals.net.split('.')[1]?.length ?? 0

    const items =
      result.commercialUnit === 'managed_service'
        ? [
            {
              label: 'Servicio gestionado — fee del periodo',
              net: new D(p.result.totals.net).minus(setup).toFixed(scale)
            },
            ...(setup.gt(0) ? [{ label: 'Implementación inicial', net: setup.toFixed(scale) }] : [])
          ]
        : lines.map(l => ({ label: l.kind === 'setup' ? 'Implementación inicial' : l.label, net: l.net }))

    return { periodId: p.periodId, currency, items, net: p.result.totals.net }
  })

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
    note: 'No es una oferta emitida. Validar alcance, recursos, precio, impuestos y condiciones antes de presentación.'
  }
}

export function compositionPreviewMarkdown(result: Composition) {
  const p = projectCompositionPreview(result)

  return (
    `# Simulación de cotización\n\n${p.status}. No vinculante.\n\n` +
    p.periods
      .map(
        period =>
          `Periodo ${period.periodId} — ${period.currency}\n\n` +
          period.items.map(i => `- ${i.label.replace(/[\r\n]/g, ' ')}: ${i.net} ${period.currency}`).join('\n')
      )
      .join('\n\n') +
    `\n\nNeto del plazo: ${p.net} ${p.currency}.\n\n${p.note}\n`
  )
}
