import { redirect } from 'next/navigation'

import { getServerAuthSession } from '@/lib/auth'

export default async function Page() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    redirect('/login')
  }

  redirect(session.user.portalHomePath)
}
