// Next Imports
import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

// Third-party Imports
import { getServerSession } from 'next-auth'

// Component Imports
import Login from '@views/Login'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { hasGoogleAuthProvider, hasMicrosoftAuthProvider } from '@/lib/auth-secrets'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to the Greenhouse client portal.'
}

const LoginPage = async () => {
  const session = await getServerSession(authOptions)
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
