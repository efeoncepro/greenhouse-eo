'use client'

import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'

import type { ChildrenType } from '@core/types'

type Props = ChildrenType & {
  session?: Session | null
}

const AuthSessionProvider = ({ children, session = null }: Props) => {
  return <SessionProvider session={session || undefined}>{children}</SessionProvider>
}

export default AuthSessionProvider
