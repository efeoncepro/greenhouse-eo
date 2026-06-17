import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import RoadmapCockpitView from '@views/greenhouse/roadmap/RoadmapCockpitView'
import RoadmapCockpitError from '@views/greenhouse/roadmap/components/RoadmapCockpitError'
import { buildRoadmapCockpitData } from '@/lib/roadmap/cockpit/build-cockpit-data'
import { captureWithDomain } from '@/lib/observability/capture'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Roadmap | Greenhouse'
}

/**
 * TASK-1153 — Cockpit de Roadmap. Item de menú top-level (grupo Plataforma),
 * FUERA de Admin. INTERNO — clientes nunca lo ven. Gated por el viewCode
 * `plataforma.roadmap` (concedido solo a roles internos) con fallback de
 * route-group interno + redirect defensivo para tenants cliente. Consume el
 * reader read-only de TASK-1152 server-side; no parsea Markdown en cliente.
 */
export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  if (tenant.tenantType === 'client') redirect('/401')

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'plataforma.roadmap',
    fallback: tenant.tenantType === 'efeonce_internal'
  })

  if (!hasAccess) redirect('/401')

  try {
    const data = await buildRoadmapCockpitData()

    return <RoadmapCockpitView data={data} />
  } catch (error) {
    captureWithDomain(error, 'roadmap', { tags: { source: 'roadmap_cockpit_page' } })

    return <RoadmapCockpitError />
  }
}
