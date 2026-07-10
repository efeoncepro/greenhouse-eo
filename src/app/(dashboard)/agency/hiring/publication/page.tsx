import { redirect } from 'next/navigation'

import { getLocale } from 'next-intl/server'

import type { Metadata } from 'next'

import PublicationDeskView from '@/views/greenhouse/hiring/PublicationDeskView'
import { can } from '@/lib/entitlements/runtime'
import { getHiringDeskSnapshot } from '@/lib/hiring'
import { getMicrocopy } from '@/lib/copy'
import { normalizeLocale } from '@/i18n/locales'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Publicación | Hiring Desk | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function HiringPublicationPage() {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const hasAccess = hasAuthorizedViewCode({ tenant, viewCode: 'gestion.hiring_publication', fallback: false })

  if (
    !hasAccess ||
    !can(tenant, 'hiring.opening.read', 'read', 'tenant') ||
    !can(tenant, 'hiring.application.read', 'read', 'tenant')
  ) redirect('/401')

  const [locale, snapshot] = await Promise.all([
    getLocale(),
    getHiringDeskSnapshot({ openingLimit: 80, applicationLimit: 1 }),
  ])

  return <PublicationDeskView copy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringDesk} initialSnapshot={snapshot} />
}
