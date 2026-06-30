import 'server-only'

import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  authorComparisonTable,
  ComparisonTableAuthorError,
  COMPARISON_TABLE_BRIDGE_CONTRACT_VERSION,
  type AuthorComparisonTableMode,
} from '@/lib/public-site/comparison-table/author-comparison-table'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const parseJsonBody = async (request: Request) => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * POST /api/admin/public-site/comparison-table
 *
 * Governed authoring lane for the `greenhouse_comparison_table` widget
 * (TASK-1225). Internal-only (capability `platform.public_site.comparison_table.author`).
 * Validates a `comparisonTable.v1` manifest and either returns a signed dry-run
 * plan (default — propose) or, when the write path is enabled, authors a draft
 * via the bridge (execute). The LLM never mutates directly: execute is gated by
 * flag + secret; the governed loop is propose → human confirm → execute.
 *
 * Body: { pageId: string, manifest: object, mode?: 'dry_run'|'execute',
 *         environment?: 'staging'|'production', widgetElementId?: string }
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'platform.public_site.comparison_table.author', 'execute', 'all')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const contractHeaders = {
    'Cache-Control': 'no-store',
    'X-Greenhouse-Contract': COMPARISON_TABLE_BRIDGE_CONTRACT_VERSION,
  }

  const raw = await parseJsonBody(request)

  if (!isRecord(raw)) {
    return NextResponse.json(
      { error: 'El cuerpo debe ser un objeto JSON.', code: 'invalid_body', actionable: true },
      { status: 400, headers: contractHeaders }
    )
  }

  const pageId = typeof raw.pageId === 'string' ? raw.pageId.trim() : ''

  if (!pageId) {
    return NextResponse.json(
      { error: 'pageId es obligatorio.', code: 'invalid_body', actionable: true },
      { status: 400, headers: contractHeaders }
    )
  }

  const mode: AuthorComparisonTableMode = raw.mode === 'execute' ? 'execute' : 'dry_run'
  const environment: 'staging' | 'production' = raw.environment === 'production' ? 'production' : 'staging'
  const widgetElementId = typeof raw.widgetElementId === 'string' ? raw.widgetElementId : undefined

  try {
    const plan = await authorComparisonTable({
      pageId,
      manifest: raw.manifest,
      actor: tenant.userId,
      environment,
      mode,
      widgetElementId,
    })

    return NextResponse.json({ status: 'ok', plan }, { status: 200, headers: contractHeaders })
  } catch (error) {
    if (error instanceof ComparisonTableAuthorError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          actionable: error.code === 'comparison_table_manifest_invalid',
          ...(error.issues ? { issues: error.issues } : {}),
        },
        { status: error.statusCode, headers: contractHeaders }
      )
    }

    captureWithDomain(error, 'platform', {
      tags: { source: 'api_admin_public_site_comparison_table', stage: 'author', mode },
    })

    return NextResponse.json(
      { error: 'No se pudo procesar la autoría del widget.', code: 'internal_error', actionable: false },
      { status: 500, headers: contractHeaders }
    )
  }
}
