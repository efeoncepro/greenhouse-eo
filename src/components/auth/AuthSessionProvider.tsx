'use client'

import type { ChildrenType } from '@core/types'
import { SessionProvider } from 'next-auth/react'

const AuthSessionProvider = ({ children }: ChildrenType) => {
  return <SessionProvider>{children}</SessionProvider>
}

export default AuthSessionProvider
