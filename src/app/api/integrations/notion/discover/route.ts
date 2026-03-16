import { NextResponse } from 'next/server'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { discoverDatabases, sampleDatabase } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/notion/discover
 *
 * Search the Notion workspace for databases and group them by parent.
 * Databases are auto-classified as proyectos/tareas/sprints/revisiones.
 * Groups with both tareas + proyectos are flagged as "ready to register."
 *
 * Query params:
 *   ?q=keyword       — filter databases by title
 *   ?sample=DB_ID    — include sample records for a specific database
 *   ?sampleLimit=5   — max records in sample (1-20, default 5)
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('q') || undefined
    const sampleDbId = searchParams.get('sample') || undefined
    const sampleLimit = Math.min(20, Math.max(1, Number(searchParams.get('sampleLimit') || '5')))

    const discovery = await discoverDatabases(keyword)

    let sample = undefined
    if (sampleDbId) {
      try {
        const records = await sampleDatabase(sampleDbId, sampleLimit)
        sample = {
          databaseId: sampleDbId,
          records,
          count: records.length
        }
      } catch (err) {
        sample = {
          databaseId: sampleDbId,
          error: err instanceof Error ? err.message : 'Failed to fetch sample',
          records: [],
          count: 0
        }
      }
    }

    return NextResponse.json({
      ...discovery,
      sample
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Discovery failed'
    if (message.includes('NOTION_TOKEN')) {
      return NextResponse.json({ error: 'Notion integration not configured. Set NOTION_TOKEN environment variable.' }, { status: 503 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
