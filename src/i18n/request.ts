import { cookies, headers } from 'next/headers'

import { getRequestConfig } from 'next-intl/server'

import { getSharedMessages } from './messages'
import { resolveLocaleFromRequest } from './resolve-locale'
import { GH_LOCALE_COOKIE } from './locales'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const locale = resolveLocaleFromRequest({
    cookieLocale: cookieStore.get(GH_LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get('accept-language')
  })

  return {
    locale,
    messages: getSharedMessages(locale)
  }
})
