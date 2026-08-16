import { redirect } from 'next/navigation'

import { getLocale } from 'next-intl/server'

import type { Metadata } from 'next'

import TalentPoolDeskView from '@/views/greenhouse/hiring/TalentPoolDeskView'
import { getMicrocopy } from '@/lib/copy'
import { can } from '@/lib/entitlements/runtime'
import { listHiringOpenings, searchTalentPool, talentPoolFlags } from '@/lib/hiring'
import { normalizeLocale } from '@/i18n/locales'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Banco de talento | Hiring Desk | Greenhouse' }
export const dynamic = 'force-dynamic'

type SearchParams = {
  query?: string
  capability?: string
  seniority?: string
  language?: string
  country?: string
  availability?: string
}

export default async function TalentPoolPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const hasAccess = hasAuthorizedViewCode({ tenant, viewCode: 'gestion.hiring_talent_pool', fallback: false })

  if (!hasAccess || !can(tenant, 'hiring.talent_pool.read', 'read', 'tenant')) redirect('/401')

  const resolved = searchParams ? await searchParams : {}

  const initialFilters = {
    query: resolved.query?.slice(0, 80) ?? '',
    capability: resolved.capability?.slice(0, 80) ?? '',
    seniority: resolved.seniority?.slice(0, 40) ?? '',
    language: resolved.language?.slice(0, 16) ?? '',
    country: resolved.country?.slice(0, 2) ?? '',
    availability: resolved.availability?.slice(0, 40) ?? ''
  }

  const flags = talentPoolFlags()

  const [locale, initialResult, openings] = await Promise.all([
    getLocale(),
    flags.search
      ? searchTalentPool({
          query: initialFilters.query || undefined,
          capabilityKeys: initialFilters.capability ? [initialFilters.capability] : undefined,
          seniority: initialFilters.seniority || undefined,
          languageCode: initialFilters.language || undefined,
          countryCode: initialFilters.country || undefined,
          availability: initialFilters.availability || undefined,
          limit: 25
        })
      : Promise.resolve({ items: [], nextCursor: null }),
    listHiringOpenings({ status: 'active', limit: 100 })
  ])

  return (
    <TalentPoolDeskView
      copy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringDesk}
      initialResult={initialResult}
      initialFilters={initialFilters}
      openings={openings.map(opening => ({
        openingId: opening.openingId,
        label: opening.publicTitle ?? opening.internalTitle,
        status: opening.status
      }))}
      readEnabled={flags.search}
      inviteEnabled={flags.invite}
      canInvite={can(tenant, 'hiring.talent_pool.invite', 'execute', 'tenant')}
    />
  )
}
