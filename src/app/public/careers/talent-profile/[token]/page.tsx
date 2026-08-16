import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'

import { CareersPublicShell, TalentPoolSelfServiceClient } from '@/components/greenhouse/careers'
import { getMicrocopy, type Locale } from '@/lib/copy'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

const context = async () => {
  const locale = (await getLocale()) as Locale

  return { locale, copy: getMicrocopy(locale).careers }
}

export const generateMetadata = async (): Promise<Metadata> => {
  const { copy } = await context()

  return {
    title: copy.talentPoolSelfService.metadataTitle,
    description: copy.talentPoolSelfService.intro,
    robots: { index: false, follow: false }
  }
}

export default async function TalentPoolSelfServicePage({ params }: PageProps) {
  const { token } = await params
  const { copy, locale } = await context()

  return (
    <CareersPublicShell copy={copy} locale={locale} backHref='/public/careers' backLabel={copy.header.backToJobs}>
      <TalentPoolSelfServiceClient token={token} copy={copy} locale={locale} />
    </CareersPublicShell>
  )
}
