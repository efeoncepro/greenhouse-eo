import { notFound } from 'next/navigation'

import type { Metadata } from 'next'

import { getLocale } from 'next-intl/server'

import { CareersDetailView, CareersPublicShell } from '@/components/greenhouse/careers'
import { getMicrocopy, type Locale } from '@/lib/copy'
import {
  isCareersEditorialDetailEnabled,
  isHiringPublicApplicationsEnabled,
  isHiringPublicJobPostingSchemaEnabled,
  resolvePublicCareersBaseUrl
} from '@/lib/hiring/public-careers/config'
import { buildJobPostingJsonLd, serializeJsonLd } from '@/lib/hiring/public-careers/job-posting'
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
    // TASK-1740 — canonical explícito SOLO para la leaf page de una vacante publicada.
    ...(opening
      ? {
          alternates: {
            canonical: `${resolvePublicCareersBaseUrl()}/public/careers/${encodeURIComponent(opening.publicId)}`
          }
        }
      : {})
  }
}

export default async function PublicCareersDetailPage({ params }: PageProps) {
  const { publicId } = await params
  const { copy, locale } = await loadCareersContext()
  const opening = await loadPublicOpening(publicId, 'public_careers_detail_page')

  if (!opening) notFound()

  const viewModel = buildCareersOpeningViewModel(opening, copy)
  const editorialEnabled = isCareersEditorialDetailEnabled()

  // TASK-1740 — JSON-LD JobPosting desde el MISMO payload visible. Fail-closed: si la
  // vacante no produce schema válido (remota sin países elegibles, etc.) no se emite.
  const jobPosting = isHiringPublicJobPostingSchemaEnabled()
    ? buildJobPostingJsonLd(opening, resolvePublicCareersBaseUrl())
    : null

  return (
    <CareersPublicShell copy={copy} locale={locale} backHref='/public/careers#gh-listing'>
      {jobPosting ? (
        <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: serializeJsonLd(jobPosting) }} />
      ) : null}
      <CareersDetailView copy={copy} opening={viewModel} editorialEnabled={editorialEnabled} locale={locale} />
    </CareersPublicShell>
  )
}
