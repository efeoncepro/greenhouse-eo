import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { getHomeSnapshot } from '@/lib/home/get-home-snapshot'

/**
 * API route to fetch the initial data for the Greenhouse Home view.
 */
export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = session

  try {
    const snapshot = await getHomeSnapshot({
      userId: user.userId,
      firstName: (user.name || '').split(' ')[0] || 'Usuario',
      lastName: (user.name || '').split(' ').slice(1).join(' ') || null,
      roleName: user.role || 'client_executive',
      businessLines: user.businessLines || [],
      serviceModules: user.serviceModules || [],
      roleCodes: user.roleCodes || [],
      routeGroups: user.routeGroups || [],
      organizationId: user.organizationId
    })

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Failed to fetch home snapshot:', error)

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
