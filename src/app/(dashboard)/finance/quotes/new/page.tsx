import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import { getOrganizationList } from '@/lib/account-360/organization-store'
import { listTemplates } from '@/lib/commercial/governance/templates-store'
import { canAccessFinanceQuotes } from '@/lib/finance/quotation-access'
import {
  canViewCostStack,
  requireTenantContext
} from '@/lib/tenant/authorization'
import QuoteBuilderPageView from '@/views/greenhouse/finance/QuoteBuilderPageView'
import type {
  QuoteBuilderPricingModel,
  QuoteCreateOrganization,
  QuoteCreateTemplate
} from '@/views/greenhouse/finance/workspace/quote-builder-types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nueva cotización — Greenhouse'
}

const QuoteBuilderNewPage = async () => {
  const { tenant } = await requireTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (!canAccessFinanceQuotes(tenant)) {
    redirect(tenant.portalHomePath)
  }

  const [templateRows, orgResult] = await Promise.all([
    listTemplates({ activeOnly: true }).catch(() => []),
    getOrganizationList({ page: 1, pageSize: 200, status: 'active' }).catch(() => ({ items: [] as Array<{ organizationId: string; organizationName: string }> }))
  ])

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

  return (
    <QuoteBuilderPageView
      mode='create'
      templates={templates}
      organizations={organizations}
      canSeeCostStack={canViewCostStack(tenant)}
    />
  )
}

export default QuoteBuilderNewPage
