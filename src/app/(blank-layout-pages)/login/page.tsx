// Next Imports
import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

// Component Imports
import Login from '@views/Login'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { hasGoogleAuthProvider, hasMicrosoftAuthProvider } from '@/lib/auth-secrets'
import { getOptionalServerSession } from '@/lib/auth/require-server-session'

// Depende de cookies/headers via NextAuth — siempre dynamic.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to the Greenhouse client portal.'
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

  return <Login mode={mode} hasMicrosoftAuth={hasMicrosoftAuth} hasGoogleAuth={hasGoogleAuth} />
}

export default LoginPage
