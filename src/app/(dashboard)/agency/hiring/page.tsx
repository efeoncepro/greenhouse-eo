import { redirect } from 'next/navigation'

import { getLocale } from 'next-intl/server'

import type { Metadata } from 'next'

import DemandDeskView from '@/views/greenhouse/hiring/DemandDeskView'
import { can } from '@/lib/entitlements/runtime'
import { getHiringDeskSnapshot } from '@/lib/hiring'
import { getMicrocopy } from '@/lib/copy'
import { normalizeLocale } from '@/i18n/locales'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Hiring Desk | Greenhouse' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams?: Promise<{ captureFailure?: string; captureDrawer?: string; captureQuery?: string }>
}

export default async function HiringDemandPage({ searchParams }: Props) {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'gestion.hiring_demand',
    fallback: false,
  })

  if (
    !hasAccess ||
    !can(tenant, 'hiring.demand.read', 'read', 'tenant') ||
    !can(tenant, 'hiring.opening.read', 'read', 'tenant') ||
    !can(tenant, 'hiring.application.read', 'read', 'tenant')
  ) redirect('/401')

  const resolved = searchParams ? await searchParams : undefined
  const captureQuery = process.env.NODE_ENV !== 'production' ? resolved?.captureQuery?.slice(0, 120) : undefined

  const [locale, snapshot] = await Promise.all([
    getLocale(),
    getHiringDeskSnapshot({ query: captureQuery, openingLimit: 80, applicationLimit: 120 }),
  ])

  const captureDrawer = process.env.NODE_ENV !== 'production' && ['account-manager', 'growth-designer', 'data-engineer'].includes(resolved?.captureDrawer ?? '')
    ? resolved?.captureDrawer
    : undefined

  return <DemandDeskView copy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringDesk} initialSnapshot={snapshot} currentUserId={tenant.userId} simulateLoadFailure={process.env.NODE_ENV !== 'production' && resolved?.captureFailure === 'load'} initialDrawerTemplate={captureDrawer} initialQuery={captureQuery} />
}
