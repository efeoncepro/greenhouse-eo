import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

import { demoClientConfig } from '@/lib/demo-client'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  providers: [
    CredentialsProvider({
      name: 'Greenhouse Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null
        }

        if (credentials.email !== demoClientConfig.email || credentials.password !== demoClientConfig.password) {
          return null
        }

        return {
          id: demoClientConfig.id,
          email: demoClientConfig.email,
          name: demoClientConfig.name,
          clientId: demoClientConfig.id,
          projectIds: demoClientConfig.projectIds
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.clientId = user.clientId
        token.projectIds = user.projectIds
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.email = token.email || ''
        session.user.name = token.name || ''
        session.user.clientId = typeof token.clientId === 'string' ? token.clientId : ''
        session.user.projectIds = Array.isArray(token.projectIds) ? token.projectIds.filter(Boolean) : []
      }

      return session
    }
  }
}
