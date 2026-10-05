import { redirect } from 'next/navigation'

import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'

import FinanceDashboardView from '@views/greenhouse/finance/FinanceDashboardView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'
import { NexaContextScope } from '@/lib/nexa/nexa-page-context'
import { getGreenhouseNavigationCopy } from '@/config/greenhouse-navigation-copy'
import { getPortalPageTitle } from '@/lib/copy/portal-metadata'

export const dynamic = 'force-dynamic'

export const generateMetadata = async (): Promise<Metadata> => {
  const { internal } = getGreenhouseNavigationCopy(await getLocale())

  return { title: getPortalPageTitle(internal.domainFinanzas.label) }
}

const FinanceDashboardPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.resumen',
    fallback: tenant.routeGroups.includes('finance') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect('/401')
  }

  // TASK-1143 — declara el contexto `finance` para Nexa (el chat flotante lee → prompts data-aware
  // de las anomalías del ledger). `entityId` es un sentinel (el scope es el tenant); el resolver
  // gatea por el route_group `finance` (anti-oracle). Distinto de la ficha de cliente (`client`).
  return (
    <>
      <NexaContextScope entityKind='finance_scope' entityId='finance-global' contextKey='finance' />
      <FinanceDashboardView />
    </>
  )
}

export default FinanceDashboardPage
