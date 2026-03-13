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
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to the Greenhouse client portal.'
}

const LoginPage = async () => {
  const session = await getServerSession(authOptions)
  const hasMicrosoftAuth = Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET)

  if (session) {
    redirect('/auth/landing')
  }

  // Vars
  const mode = await getServerMode()

  return <Login mode={mode} hasMicrosoftAuth={hasMicrosoftAuth} />
}

export default LoginPage
