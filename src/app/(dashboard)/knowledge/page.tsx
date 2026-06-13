import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import KnowledgeCenterView from '@/views/greenhouse/knowledge/KnowledgeCenterView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { isKnowledgeCanvasLensEnabled } from '@/lib/knowledge/nexa/canvas-lens-flag'
import { resolveHomeRolloutFlag } from '@/lib/home/rollout-flags'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Knowledge | Greenhouse'
}

export default async function KnowledgePage() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType === 'client') {
    redirect('/401')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'plataforma.knowledge',
    fallback: tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  // TASK-1110 — kill-switch de la composición Nexa in-place (rollout-flag DB, TASK-780). ON por defecto
  // (fila global seeded enabled=TRUE); revertible sin code-deploy. Si PG está caído el resolver degrada
  // a disabled → la lente Humano vuelve a su estado legacy (host workbench intacto), nunca crashea.
  const compositionLensEnabled = (
    await resolveHomeRolloutFlag('knowledge_composition_lens', {
      userId: tenant.userId,
      tenantId: tenant.clientId ?? null,
      roleCodes: tenant.roleCodes
    }).catch(() => ({ enabled: false }))
  ).enabled

  return <KnowledgeCenterView canvasLensEnabled={isKnowledgeCanvasLensEnabled()} compositionLensEnabled={compositionLensEnabled} />
}
