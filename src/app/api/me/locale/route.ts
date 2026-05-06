import { NextResponse } from 'next/server'

import { GH_LOCALE_COOKIE, normalizeLocale } from '@/i18n/locales'
import {
  getUserLocalePreferenceSnapshot,
  localeOptions,
  updateUserPreferredLocale
} from '@/lib/i18n/locale-preferences'
import { requireTenantContext } from '@/lib/tenant/authorization'
import type { Locale } from '@/lib/copy'

export const dynamic = 'force-dynamic'

const parseLocaleBody = async (request: Request): Promise<{ locale: Locale | null } | null> => {
  const body = (await request.json().catch(() => null)) as { locale?: unknown } | null

  if (!body || !('locale' in body)) {
    return null
  }

  if (body.locale === null) {
    return { locale: null }
  }

  if (typeof body.locale !== 'string') {
    return null
  }

  const locale = normalizeLocale(body.locale)

  return locale ? { locale } : null
}

const withLocaleCookie = (response: NextResponse, locale: Locale | null) => {
  if (locale) {
    response.cookies.set(GH_LOCALE_COOKIE, locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    })
  } else {
    response.cookies.set(GH_LOCALE_COOKIE, '', {
      path: '/',
      sameSite: 'lax',
      maxAge: 0
    })
  }

  return response
}

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const preference = await getUserLocalePreferenceSnapshot(tenant.userId)

  return NextResponse.json({ preference, options: localeOptions })
}

export async function PATCH(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsedBody = await parseLocaleBody(request)

  if (!parsedBody) {
    return NextResponse.json({ error: 'locale must be es-CL, en-US, or null' }, { status: 400 })
  }

  try {
    const preference = await updateUserPreferredLocale({
      userId: tenant.userId,
      locale: parsedBody.locale
    })

    const response = NextResponse.json({ preference, options: localeOptions })

    return withLocaleCookie(response, parsedBody.locale ?? preference.effectiveLocale)
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.error('PATCH /api/me/locale failed:', error)

    return NextResponse.json({ error: 'Unable to update locale preference' }, { status: 500 })
  }
}
