import { redirect } from 'next/navigation'

import { getOptionalServerSession } from '@/lib/auth/require-server-session'

// Depende de cookies/headers via NextAuth — siempre dynamic.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getOptionalServerSession()

  if (!session?.user) {
    redirect('/login')
  }

  redirect(session.user.portalHomePath)
}
