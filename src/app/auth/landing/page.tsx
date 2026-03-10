import { redirect } from 'next/navigation'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'

export default async function Page() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  redirect(session.user.portalHomePath || '/dashboard')
}
