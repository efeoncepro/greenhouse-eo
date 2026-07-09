import { notFound } from 'next/navigation'

import type { Metadata } from 'next'

import { getLocale } from 'next-intl/server'

import { CareersDetailView, CareersPublicShell } from '@/components/greenhouse/careers'
import { getMicrocopy, type Locale } from '@/lib/copy'
import { isHiringPublicApplicationsEnabled } from '@/lib/hiring/public-careers/config'
import { buildCareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'
import { getPublicOpeningByPublicId } from '@/lib/hiring/publication'
import { captureWithDomain } from '@/lib/observability/capture'

export const revalidate = 300

interface PageProps {
  params: Promise<{ publicId: string }>
}

const loadCareersContext = async () => {
  const locale = (await getLocale()) as Locale
  const copy = getMicrocopy(locale).careers

  return { locale, copy }
}

const loadPublicOpening = async (publicId: string, source: string) => {
  try {
    return await getPublicOpeningByPublicId(publicId)
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source }, extra: { publicId } })

    return null
  }
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { publicId } = await params
  const { copy } = await loadCareersContext()
  const opening = await loadPublicOpening(publicId, 'public_careers_detail_metadata')
  const title = opening ? `${opening.title} | ${copy.metadata.title}` : copy.detail.unavailableTitle
  const description = opening?.summary ?? copy.metadata.description
  const applicationsEnabled = isHiringPublicApplicationsEnabled()

  return {
    title,
    description,
    robots: applicationsEnabled ? { index: true, follow: true } : { index: false, follow: false },
  }
}

export default async function PublicCareersDetailPage({ params }: PageProps) {
  const { publicId } = await params
  const { copy, locale } = await loadCareersContext()
  const opening = await loadPublicOpening(publicId, 'public_careers_detail_page')

  if (!opening) notFound()

  const viewModel = buildCareersOpeningViewModel(opening, copy)

  return (
    <CareersPublicShell copy={copy} locale={locale} backHref='/public/careers#gh-listing'>
      <CareersDetailView copy={copy} opening={viewModel} />
    </CareersPublicShell>
  )
}
