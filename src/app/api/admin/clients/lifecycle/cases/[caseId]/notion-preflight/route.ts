import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import { advanceLifecycleChecklistItem } from '@/lib/client-lifecycle/commands/advance-checklist-item'
import { getChecklistItemByCode } from '@/lib/client-lifecycle/store'
import { getNotionOnboardingReadiness } from '@/lib/integrations/notion-onboarding-preflight'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

const ITEM_CODE = 'verify_notion_flowing'

/**
 * TASK-1009 — POST /api/admin/clients/lifecycle/cases/[caseId]/notion-preflight
 *
 * Corre el preflight de onboarding Notion para el space del caso y, SOLO si todos
 * los checks críticos están verdes, auto-completa el ítem bloqueante
 * `verify_notion_flowing`. El operador NO puede marcarlo verde estando rojo:
 * la completación la decide el resultado real del preflight, server-side.
 * Read-mostly (la única mutación posible es avanzar el ítem cuando readyToOnboard).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const { tenant, userId, errorResponse } = await authorizeLifecycle('client.lifecycle.case.advance')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Resolver el space del caso (org → space con binding Notion). Anti-tamper:
    // el space NO viene del cliente, se deriva del caso.
    const rows = await runGreenhousePostgresQuery<{ space_id: string }>(
      `SELECT s.space_id
       FROM greenhouse_core.client_lifecycle_cases c
       JOIN greenhouse_core.spaces s ON s.organization_id = c.organization_id
       JOIN greenhouse_core.space_notion_sources sns ON sns.space_id = s.space_id
       WHERE c.case_id = $1
       ORDER BY s.created_at ASC
       LIMIT 1`,
      [caseId]
    )

    const spaceId = rows[0]?.space_id ?? null

    if (!spaceId) {
      return NextResponse.json(
        {
          error: 'El caso no tiene un space con vínculo Notion. Vinculá el teamspace antes de correr el preflight.',
          code: 'no_notion_space',
          actionable: true,
          preflight: null,
          advanced: false
        },
        { status: 422 }
      )
    }

    const preflight = await getNotionOnboardingReadiness(spaceId)

    let advanced = false

    if (preflight.readyToOnboard) {
      // Solo avanza si el ítem existe en este caso (casos previos a TASK-1009 no lo tienen).
      const item = await getChecklistItemByCode(caseId, ITEM_CODE)

      if (item && item.status !== 'completed') {
        await advanceLifecycleChecklistItem({
          caseId,
          itemCode: ITEM_CODE,
          newStatus: 'completed',
          notes: `Preflight Notion verde (auto): ${preflight.summary}`.slice(0, 480),
          actorUserId: userId
        })
        advanced = true
      } else if (item?.status === 'completed') {
        advanced = true
      }
    }

    return NextResponse.json({ spaceId, preflight, advanced })
  } catch (error) {
    return mapLifecycleError(error, 'notion_preflight')
  }
}
