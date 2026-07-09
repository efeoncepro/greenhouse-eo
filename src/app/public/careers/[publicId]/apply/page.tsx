import { notFound } from 'next/navigation'

import type { Metadata } from 'next'

import { getLocale } from 'next-intl/server'

import { CareersApplyClient, CareersPublicShell } from '@/components/greenhouse/careers'
import { getMicrocopy, type Locale } from '@/lib/copy'
import { buildCareersApplicationFormContract } from '@/lib/hiring/public-careers/growth-form-contract'
import { buildCareersOpeningViewModel, formatCareersTemplate } from '@/lib/hiring/public-careers/view-model'
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
  const opening = await loadPublicOpening(publicId, 'public_careers_apply_metadata')
  const title = opening ? formatCareersTemplate(copy.apply.titleTemplate, { role: opening.title }) : copy.detail.unavailableTitle

  return {
    title,
    description: copy.metadata.description,
    robots: { index: false, follow: false },
  }
}

export default async function PublicCareersApplyPage({ params }: PageProps) {
  const { publicId } = await params
  const { copy, locale } = await loadCareersContext()
  const opening = await loadPublicOpening(publicId, 'public_careers_apply_page')

  if (!opening) notFound()

  const viewModel = buildCareersOpeningViewModel(opening, copy)

  const formContract = buildCareersApplicationFormContract({
    copy,
    locale,
    opening: viewModel,
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
  })

  return (
    <CareersPublicShell copy={copy} locale={locale} backHref={viewModel.detailHref} backLabel={copy.header.backToDetail}>
      <CareersApplyClient copy={copy} formContract={formContract} opening={viewModel} />
    </CareersPublicShell>
  )
}
