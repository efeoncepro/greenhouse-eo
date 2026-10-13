// Next Imports
import { redirect } from 'next/navigation'

import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'

// Component Imports
import Login from '@views/Login'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { hasGoogleAuthProvider, hasMicrosoftAuthProvider } from '@/lib/auth-secrets'
import { getOptionalServerSession } from '@/lib/auth/require-server-session'
import { listActiveLoginAnnouncements } from '@/lib/login-announcements/reader'
import { getPortalAccessMetadata } from '@/lib/copy/portal-metadata'
import { defaultLocale, normalizeLocale } from '@/i18n/locales'

// Depende de cookies/headers via NextAuth — siempre dynamic.
export const dynamic = 'force-dynamic'

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = normalizeLocale(await getLocale()) ?? defaultLocale

  return getPortalAccessMetadata(locale)
}

const LoginPage = async () => {
  const session = await getOptionalServerSession()
  const hasMicrosoftAuth = hasMicrosoftAuthProvider()
  const hasGoogleAuth = hasGoogleAuthProvider()

  if (session) {
    redirect('/auth/landing')
  }

  // Vars
  const mode = await getServerMode()

  // TASK-1964 — novedades del escenario (TASK-1963). El reader nunca rompe el login: ante error devuelve [].
  const announcements = await listActiveLoginAnnouncements()

  return (
    <Login mode={mode} hasMicrosoftAuth={hasMicrosoftAuth} hasGoogleAuth={hasGoogleAuth} announcements={announcements} />
  )
}

export default LoginPage
