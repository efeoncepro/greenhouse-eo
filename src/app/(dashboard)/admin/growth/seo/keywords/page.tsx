import { notFound, redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { readKeywordOpportunities } from '@/lib/growth/seo/keyword-opportunities-reader'
import { listSeoEligibleSpaces } from '@/lib/growth/seo/overview/list-seo-spaces'
import { readSeoOverviewConnection } from '@/lib/growth/seo/overview/read-overview-connection'
import { resolveTrackedKeywordCapacity } from '@/lib/growth/seo/track-keywords'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import KeywordOpportunitiesView from '@/views/greenhouse/admin/growth/seo/keywords/KeywordOpportunitiesView'

/**
 * TASK-1308 — Oportunidades de keywords (`EPIC-022` §10.4, nodo S3 del master flow).
 *
 * Guard idéntico al del cockpit (TASK-1306) y Rendimiento (TASK-1307) porque es la MISMA
 * surface: viewCode `administracion.growth_seo` + capability `growth.seo.observation.read`
 * + `module_assignment` per-org resuelto por los Spaces elegibles, con `notFound()` si el
 * módulo está apagado y redirect defensivo si el tenant es `client`. Child del mismo
 * viewCode: NO siembra uno nuevo ni suma ítem de menú.
 *
 * ⚠️ VER Y SEGUIR SON DOS PERMISOS. `observation.read` abre la pantalla;
 * `growth.seo.target.configure` habilita "Seguir", que compromete gasto recurrente del
 * proveedor. Un analista puede leer el mapa completo sin poder hacer crecer la factura, y
 * la UI oculta el botón en vez de dejarlo fallar en el submit.
 */

export const metadata: Metadata = { title: 'Keywords — SEO | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'administracion.growth_seo'

/** Ventanas que ofrece el selector. Un valor fuera de la lista cae al default. */
const ALLOWED_WINDOW_DAYS = new Set([28, 90])
const DEFAULT_WINDOW_DAYS = 28

interface PageProps {
  searchParams: Promise<{ space?: string; window?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  // Puerta 0 — flag del módulo (default OFF). Con el módulo apagado la ruta NO existe.
  if (!isSeoModuleEnabled()) {
    notFound()
  }

  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // Defensivo: un tenant cliente NUNCA entra a una surface interna, aunque por drift de
  // grants tuviera el viewCode. Su acceso al módulo va por `growth.seo.report.read_client`.
  if (tenant.tenantType === 'client') {
    redirect('/401')
  }

  const hasAccess =
    hasAuthorizedViewCode({
      tenant,
      viewCode: VIEW_CODE,
      fallback: tenant.routeGroups.includes('admin')
    }) && can(tenant, 'growth.seo.observation.read', 'read', 'tenant')

  if (!hasAccess) {
    redirect('/401')
  }

  const params = await searchParams
  const spaces = await listSeoEligibleSpaces()

  // El `?space=` es COMPARTIBLE pero no autoridad: uno sin `module_assignment` vigente cae
  // al primer Space elegible. Confiar en él dejaría que un enlace pegado saltee el gate.
  const selectedSpace = spaces.find(candidate => candidate.organizationId === params.space) ?? spaces[0] ?? null

  const parsedWindow = Number.parseInt(params.window ?? '', 10)
  const windowDays = ALLOWED_WINDOW_DAYS.has(parsedWindow) ? parsedWindow : DEFAULT_WINDOW_DAYS

  const canTrackKeywords = can(tenant, 'growth.seo.target.configure', 'execute', 'tenant')
  const capacity = resolveTrackedKeywordCapacity()

  if (!selectedSpace) {
    // Pasar el gate y no tener NINGÚN Space con el módulo no es un error: es el estado
    // honesto "sin Spaces con SEO", y la view lo dice con esas palabras.
    return (
      <KeywordOpportunitiesView
        spaces={spaces}
        selectedSpaceId={null}
        rootDomain={null}
        connectionState='not_connected'
        canConnectSearchConsole={false}
        canTrackKeywords={false}
        windowDays={windowDays}
        opportunities={null}
        trackedKeywords={[]}
        capacity={capacity}
      />
    )
  }

  const connection = await readSeoOverviewConnection(selectedSpace.organizationId)

  // Sin conexión no hay demanda medida, y estas oportunidades se calculan con ella: pedir
  // la lectura igual gastaría queries para devolver un vacío que la view ya sabe pintar.
  if (connection.state === 'not_connected' || connection.state === 'no_snapshots') {
    return (
      <KeywordOpportunitiesView
        spaces={spaces}
        selectedSpaceId={selectedSpace.organizationId}
        rootDomain={null}
        connectionState={connection.state}
        canConnectSearchConsole={can(tenant, 'growth.search_console.connect', 'execute', 'tenant')}
        canTrackKeywords={canTrackKeywords}
        windowDays={windowDays}
        opportunities={null}
        trackedKeywords={[]}
        capacity={capacity}
      />
    )
  }

  const target = (
    await runGreenhousePostgresQuery<{ seo_target_id: string; root_domain: string }>(
      `SELECT seo_target_id, root_domain
         FROM greenhouse_growth.seo_targets
        WHERE organization_id = $1
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1`,
      [selectedSpace.organizationId]
    )
  )[0]

  if (!target) {
    return (
      <KeywordOpportunitiesView
        spaces={spaces}
        selectedSpaceId={selectedSpace.organizationId}
        rootDomain={null}
        connectionState='no_snapshots'
        canConnectSearchConsole={false}
        canTrackKeywords={canTrackKeywords}
        windowDays={windowDays}
        opportunities={null}
        trackedKeywords={[]}
        capacity={capacity}
      />
    )
  }

  // Oportunidades y set vigente en paralelo: son independientes y secuenciarlos duplicaría
  // la latencia del primer paint. El set vigente es lo que decide si una fila dice "Seguir"
  // o "Siguiendo" — sin él la pantalla ofrecería seguir algo que ya se sigue.
  const [opportunities, tracked] = await Promise.all([
    readKeywordOpportunities(target.seo_target_id, { windowDays }),
    runGreenhousePostgresQuery<{ keyword: string }>(
      `SELECT DISTINCT m.keyword
         FROM greenhouse_growth.seo_keyword_set_members m
         JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
        WHERE s.seo_target_id = $1
          AND m.effective_to IS NULL`,
      [target.seo_target_id]
    )
  ])

  return (
    <KeywordOpportunitiesView
      spaces={spaces}
      selectedSpaceId={selectedSpace.organizationId}
      seoTargetId={target.seo_target_id}
      rootDomain={target.root_domain}
      connectionState={connection.state}
      canConnectSearchConsole={false}
      canTrackKeywords={canTrackKeywords}
      windowDays={windowDays}
      opportunities={opportunities}
      trackedKeywords={tracked.map(row => row.keyword)}
      capacity={capacity}
    />
  )
}
