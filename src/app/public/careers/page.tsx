import type { Metadata } from 'next'

import { getLocale } from 'next-intl/server'

import { CareersHomeClient, CareersPublicShell } from '@/components/greenhouse/careers'
import { getMicrocopy, type Locale } from '@/lib/copy'
import { isHiringPublicApplicationsEnabled } from '@/lib/hiring/public-careers/config'
import { buildCareersOpeningViewModels, type CareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'
import { listPublicOpenings } from '@/lib/hiring/publication'
import { captureWithDomain } from '@/lib/observability/capture'

export const revalidate = 300

const OPENINGS_LIMIT = 80

const loadCareersContext = async () => {
  const locale = (await getLocale()) as Locale
  const copy = getMicrocopy(locale).careers

  return { locale, copy }
}

export const generateMetadata = async (): Promise<Metadata> => {
  const { copy } = await loadCareersContext()
  const applicationsEnabled = isHiringPublicApplicationsEnabled()

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    robots: applicationsEnabled ? { index: true, follow: true } : { index: false, follow: false },
  }
}

export default async function PublicCareersPage() {
  const { copy, locale } = await loadCareersContext()
  let listingState: 'loaded' | 'error' = 'loaded'
  let openings: CareersOpeningViewModel[] = []

  try {
    openings = buildCareersOpeningViewModels(await listPublicOpenings(OPENINGS_LIMIT, 0), copy)
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'public_careers_listing' } })
    listingState = 'error'
  }

  return (
    <CareersPublicShell copy={copy} locale={locale}>
      <CareersHomeClient copy={copy} openings={openings} listingState={listingState} />
    </CareersPublicShell>
  )
}
