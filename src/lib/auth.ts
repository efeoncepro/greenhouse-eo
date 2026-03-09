import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const demoEmail = process.env.DEMO_CLIENT_EMAIL || 'client.portal@efeonce.com'
const demoPassword = process.env.DEMO_CLIENT_PASSWORD || 'greenhouse-demo'
const demoName = process.env.DEMO_CLIENT_NAME || 'Greenhouse Demo'

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

        if (credentials.email !== demoEmail || credentials.password !== demoPassword) {
          return null
        }

        return {
          id: 'greenhouse-demo-client',
          email: demoEmail,
          name: demoName
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
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.email = token.email || ''
        session.user.name = token.name || ''
      }

      return session
    }
  }
}
