import { getLocale } from 'next-intl/server'

import { CareersPublicShell, CareersUnavailableView } from '@/components/greenhouse/careers'
import { getMicrocopy, type Locale } from '@/lib/copy'

export default async function PublicCareersOpeningNotFound() {
  const locale = (await getLocale()) as Locale
  const copy = getMicrocopy(locale).careers

  return (
    <CareersPublicShell copy={copy} locale={locale} backHref='/public/careers#gh-listing'>
      <CareersUnavailableView copy={copy} />
    </CareersPublicShell>
  )
}
