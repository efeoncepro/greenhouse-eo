import { PricingV3Error } from './errors'
import type { PricingV3Artifact } from './adapters/local-snapshot'

/**
 * Internal caller supplies a verified artifact. This allowlist is not an authorization mechanism.
 *
 * It serves every contract unchanged: the client sees `net`, which is the final net (after commercial rounding,
 * discount and uplift). Rounding, uplift and discount breakdowns are internal and are never listed here.
 */
export function projectPricingV3ForClient(artifact: PricingV3Artifact) {
  const { input, result } = artifact.semantic

  if (result.calculationStatus !== 'calculated' || result.reviewStatus !== 'within_policy' || !result.totals)
    throw new PricingV3Error('EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY')

  return {
    documentType: 'draft_estimate',
    binding: false,
    calculationId: artifact.calculationId,
    dataMode: result.dataMode,
    quoteDate: input.request.quoteDate,
    currency: result.outputCurrency,
    offerId: input.request.offerId,
    duration: input.request.duration,
    scope: input.request.lines.map(line => ({
      lineId: line.lineId,
      profileId: line.profileId,
      profile: input.snapshot.profiles.find(profile => profile.profileId === line.profileId)?.label,
      seniority: line.seniorityCode,
      headcount: line.headcount,
      dedication: line.dedication,
      allocationMode: line.allocationMode,
      included: line.assignments.map(
        assignment => input.snapshot.resources.find(resource => resource.resourceId === assignment.resourceId)?.label
      ),
      exclusions: line.notApplicable.map(item => item.coverage)
    })),
    schedule: result.lines.map(line => ({
      lineId: line.lineId,
      periodId: line.periodId,
      kind: line.kind,
      label: line.label,
      net: line.net
    })),
    net: result.totals.net,
    tax: result.totals.tax,
    grandTotal: result.totals.grandTotal,
    uniformMonthlyNet: result.totals.uniformMonthlyNet,
    taxStatus: input.request.taxTreatment.kind,
    condition:
      result.dataMode === 'synthetic'
        ? 'Synthetic demonstration; not an operational rate or approved proposal.'
        : 'Non-binding draft estimate. Commercial approval and issuance are separate.'
  }
}

// Escape untrusted catalog labels before rendering them into Markdown.
const md = (value: string) => value.replace(/[\\`*_{}\[\]()<>#|!]/g, '\\$&').replace(/[\r\n]/g, ' ')

export function pricingV3ClientMarkdown(view: ReturnType<typeof projectPricingV3ForClient>) {
  return [
    '# Estimación — borrador',
    '',
    view.condition,
    '',
    `Moneda: ${view.currency}. Periodos: ${view.duration.periods} meses.`,
    '',
    ...view.scope.map(
      line =>
        `- ${md(line.profile ?? line.profileId)} (${md(line.seniority)}): ${line.headcount} persona(s), ${line.dedication.value} ${line.dedication.unit}, ${line.allocationMode}.`
    ),
    '',
    '| Periodo | Concepto | Neto |',
    '| --- | --- | --- |',
    ...view.schedule.map(line => `| ${line.periodId} | ${md(line.label)} / ${line.kind} | ${line.net} |`),
    '',
    `Neto: ${view.net} ${view.currency}.`,
    view.tax === null
      ? 'Impuestos pendientes; total con impuestos no determinado.'
      : `Impuestos: ${view.tax}. Total: ${view.grandTotal} ${view.currency}.`,
    '',
    'No constituye aprobación ni cotización emitida.',
    ''
  ].join('\n')
}
