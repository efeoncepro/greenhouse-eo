// Next Imports
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

// Component Imports
import Login from '@views/Login'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Third-party Imports
import { getServerSession } from 'next-auth'

// Lib Imports
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to the Greenhouse client portal.'
}

const LoginPage = async () => {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/dashboard')
  }

  // Vars
  const mode = await getServerMode()

  return <Login mode={mode} />
}

export default LoginPage
