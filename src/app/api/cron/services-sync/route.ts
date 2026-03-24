import { NextResponse } from 'next/server'

import { syncAllOrganizationServices } from '@/lib/services/service-sync'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const startMs = Date.now()
    const { organizations, results } = await syncAllOrganizationServices()

    const totalCreated = results.reduce((s, r) => s + r.created, 0)
    const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
    const totalErrors = results.reduce((s, r) => s + r.errors.length, 0)

    console.log(
      `[services-sync] ${organizations} orgs, ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors, ${Date.now() - startMs}ms`
    )

    return NextResponse.json({
      organizations,
      totalCreated,
      totalUpdated,
      totalErrors,
      durationMs: Date.now() - startMs,
      details: results.filter(r => r.created > 0 || r.updated > 0 || r.errors.length > 0)
    })
  } catch (error) {
    console.error('[services-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
