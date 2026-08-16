import { getLocale } from 'next-intl/server'

import type { ChildrenType } from '@core/types'

import Providers from '@components/Providers'

import { localeDirections } from '@/i18n/locales'
import type { Locale } from '@/lib/copy'

export const dynamic = 'force-dynamic'

export default async function PublicCareersLayout({ children }: ChildrenType) {
  const locale = (await getLocale()) as Locale
  const direction = localeDirections[locale] ?? 'ltr'

  return <Providers direction={direction}>{children}</Providers>
}
