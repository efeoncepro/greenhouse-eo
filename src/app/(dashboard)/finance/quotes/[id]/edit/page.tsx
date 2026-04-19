import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import { ROLE_CODES } from '@/config/role-codes'
import { getOrganizationList } from '@/lib/account-360/organization-store'
import { listTemplates } from '@/lib/commercial/governance/templates-store'
import {
  getFinanceQuoteDetailFromCanonical,
  listFinanceQuoteLinesFromCanonical,
  mapCanonicalQuoteDetailRow,
  mapCanonicalQuoteLineRow
} from '@/lib/finance/quotation-canonical-store'
import {
  canViewCostStack,
  hasAuthorizedViewCode,
  requireTenantContext
} from '@/lib/tenant/authorization'
import QuoteBuilderPageView from '@/views/greenhouse/finance/QuoteBuilderPageView'
import type {
  QuoteBuilderShellQuote
} from '@/views/greenhouse/finance/workspace/QuoteBuilderShell'
import type { QuoteLineItem, QuoteLineSource } from '@/views/greenhouse/finance/workspace/QuoteLineItemsEditor'
import type {
  QuoteBuilderBillingFrequency,
  QuoteBuilderPricingModel,
  QuoteCreateOrganization,
  QuoteCreateTemplate
} from '@/views/greenhouse/finance/workspace/quote-builder-types'
import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Editar cotización — Greenhouse'
}

const KNOWN_SOURCES: readonly QuoteLineSource[] = ['catalog', 'service', 'template', 'manual']

const coerceLineSource = (value: string): QuoteLineSource | undefined =>
  (KNOWN_SOURCES as readonly string[]).includes(value) ? (value as QuoteLineSource) : undefined

const coerceCurrency = (value: string | null | undefined): PricingOutputCurrency => {
  if (value === 'USD' || value === 'CLF' || value === 'COP' || value === 'MXN' || value === 'PEN' || value === 'CLP') {
    return value
  }

  return 'CLP'
}

const coerceBillingFrequency = (value: string | null | undefined): QuoteBuilderBillingFrequency => {
  if (value === 'milestone' || value === 'one_time') return value

  return 'monthly'
}

const coercePricingModel = (value: string | null | undefined): QuoteBuilderPricingModel => {
  if (value === 'staff_aug' || value === 'retainer') return value

  return 'project'
}

const QuoteBuilderEditPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const { tenant } = await requireTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.cotizaciones',
    fallback: tenant.routeGroups.includes('finance') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const detailRow = await getFinanceQuoteDetailFromCanonical({ tenant, quoteId: id })

  if (!detailRow) {
    redirect('/finance/quotes')
  }

  const detail = mapCanonicalQuoteDetailRow(detailRow)

  if (detail.status !== 'draft') {
    redirect(`/finance/quotes/${detail.quoteId}?denied=edit`)
  }

  const [linesRows, templateRows, orgResult] = await Promise.all([
    listFinanceQuoteLinesFromCanonical({ tenant, quoteId: id }).catch(() => []),
    listTemplates({ activeOnly: true }).catch(() => []),
    getOrganizationList({ page: 1, pageSize: 200, status: 'active' }).catch(() => ({ items: [] as Array<{ organizationId: string; organizationName: string }> }))
  ])

  const coerceEditLineType = (value: string | null): QuoteLineItem['lineType'] => {
    switch (value) {
      case 'role':
        return 'role'
      case 'person':
        return 'person'
      case 'deliverable':
      case 'service':
        return 'deliverable'
      case 'direct_cost':
      case 'tool':
      case 'overhead_addon':
      default:
        return value === 'person' ? 'person' : value === 'role' ? 'role' : value === 'deliverable' ? 'deliverable' : 'direct_cost'
    }
  }

  const coerceEditUnit = (value: string | null): QuoteLineItem['unit'] => {
    if (value === 'hour' || value === 'month' || value === 'project' || value === 'unit') return value

    return 'unit'
  }

  const initialLines: QuoteLineItem[] = linesRows
    .map(row => mapCanonicalQuoteLineRow(row))
    .map(row => {
      const pricingV2LineType =
        row.lineType === 'role' ||
        row.lineType === 'person' ||
        row.lineType === 'tool' ||
        row.lineType === 'overhead_addon' ||
        row.lineType === 'direct_cost'
          ? row.lineType
          : undefined

      const resolvedSku =
        row.roleCode ?? row.memberId ?? row.serviceSku ?? row.toolId ?? row.addonId ?? null

      return {
        lineItemId: row.lineItemId,
        label: row.name,
        description: row.description,
        lineType: coerceEditLineType(row.lineType),
        unit: coerceEditUnit(row.unit),
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        subtotalPrice: row.totalAmount,
        subtotalAfterDiscount: row.totalAmount,
        productId: row.productId,
        roleCode: row.roleCode,
        memberId: row.memberId,
        serviceSku: row.serviceSku,
        discountType: row.discountPercent !== null ? ('percentage' as const) : null,
        discountValue: row.discountPercent ?? row.discountAmount ?? null,
        source: coerceLineSource(row.source),
        metadata: pricingV2LineType
          ? {
              pricingV2LineType,
              sku: resolvedSku ?? undefined,
              moduleId: row.moduleId,
              serviceSku: row.serviceSku,
              fteFraction: row.fteAllocation,
              periods: 1
            }
          : null
      }
    })

  const templates: QuoteCreateTemplate[] = templateRows.map(template => ({
    templateId: template.templateId,
    templateName: template.templateName,
    templateCode: template.templateCode,
    pricingModel: template.pricingModel as QuoteBuilderPricingModel,
    businessLineCode: template.businessLineCode,
    usageCount: template.usageCount,
    defaults: {
      currency: template.defaultCurrency,
      billingFrequency: template.defaultBillingFrequency,
      paymentTermsDays: template.defaultPaymentTermsDays,
      contractDurationMonths: template.defaultContractDurationMonths
    }
  }))

  const organizations: QuoteCreateOrganization[] = orgResult.items.map(org => ({
    organizationId: String(org.organizationId),
    organizationName: String(org.organizationName)
  }))

  const quote: QuoteBuilderShellQuote = {
    quotationId: detail.quoteId,
    quotationNumber: detail.quoteNumber,
    clientId: detail.clientId,
    organizationId: detail.organizationId,
    contactIdentityProfileId: detail.contact?.identityProfileId ?? null,
    description: detail.description,
    currency: detail.currency,
    status: detail.status,
    outputCurrency: coerceCurrency(detail.currency),
    contractDurationMonths: null,
    validUntil: detail.expiryDate,
    pricingModel: coercePricingModel(detail.pricingModel),
    billingFrequency: coerceBillingFrequency(null),
    businessLineCode: null,
    commercialModel: (detail.commercialModel as CommercialModelCode | null) ?? null,
    countryFactorCode: null
  }

  return (
    <QuoteBuilderPageView
      mode='edit'
      quote={quote}
      initialLines={initialLines}
      templates={templates}
      organizations={organizations}
      canSeeCostStack={canViewCostStack(tenant)}
    />
  )
}

export default QuoteBuilderEditPage
