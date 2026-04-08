import { NextResponse } from 'next/server'

import NextAuth from 'next-auth'

import { getAuthOptions, isMissingNextAuthSecretError } from '@/lib/auth'

const handler = async (request: Request, context: { params: Promise<{ nextauth: string[] }> }) => {
  try {
    return await NextAuth(getAuthOptions())(request, context)
  } catch (error) {
    if (isMissingNextAuthSecretError(error)) {
      return NextResponse.json(
        { error: 'Authentication is not configured in this environment.' },
        { status: 503 }
      )
    }

    throw error
  }
}

export { handler as GET, handler as POST }
