import { notFound, redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import type { SeoPerformanceMetric, SeoPerformanceMode, SeoRankDevice } from '@/lib/growth/seo/contracts'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { listSeoEligibleSpaces } from '@/lib/growth/seo/overview/list-seo-spaces'
import { readSeoOverviewConnection } from '@/lib/growth/seo/overview/read-overview-connection'
import { readSeoPerformance } from '@/lib/growth/seo/performance/read-performance'
import { readSeoPerformanceCatalog } from '@/lib/growth/seo/performance/read-performance-catalog'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import SeoPerformanceView from '@/views/greenhouse/admin/growth/seo/performance/SeoPerformanceView'

/**
 * TASK-1307 — pantalla ancla del módulo SEO: la evolución en el tiempo de un conjunto
 * elegido de URLs o keywords (`EPIC-022` §10.3).
 *
 * Guard idéntico al del cockpit (TASK-1306) porque es la MISMA surface: viewCode
 * `administracion.growth_seo` + capability `growth.seo.observation.read` +
 * `module_assignment` per-org resuelto por los Spaces elegibles, con `notFound()` si el
 * módulo está apagado y redirect defensivo si el tenant es `client`. Esta ruta es child
 * del mismo viewCode: NO siembra uno nuevo ni suma ítem de menú.
 *
 * ⚠️ Los query params son COMPARTIBLES pero no autoridad. `?space=` que no tenga
 * `module_assignment` vigente cae al primer Space elegible (confiar en él dejaría que un
 * enlace pegado saltee el chokepoint), y `?range=`/`?metric=`/`?device=` fuera de la
 * allowlist caen al default. Los ítems del set (`?urls=`/`?keywords=`) sí se pasan tal
 * cual: son valores de filtro dentro de los datos de la propia org, van parametrizados, y
 * el reader los acota y nombra los que no tienen dato — recortarlos contra el catálogo
 * descartaría en silencio un ítem legítimo que se cayó de la ventana del catálogo.
 */

export const metadata: Metadata = { title: 'Rendimiento — SEO | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'administracion.growth_seo'

/** Ventanas que ofrece el selector. Un valor fuera de la lista cae al default. */
const ALLOWED_RANGE_DAYS = new Set([28, 90, 180])
const DEFAULT_RANGE_DAYS = 90

/**
 * Techo de legibilidad del chart (la distinción por forma se agota antes de 8 series).
 *
 * NO se exporta: Next.js sólo admite exports conocidos en un `page.tsx` (`default`,
 * `metadata`, `dynamic`, …) y cualquier otro rompe el typecheck del build. El espejo del
 * cliente vive en la view, junto al control que lo aplica.
 */
const MAX_COMPARED_ITEMS = 8

interface PageProps {
  searchParams: Promise<{
    space?: string
    urls?: string
    keywords?: string
    metric?: string
    device?: string
    range?: string
  }>
}

const parseItems = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map(item => decodeURIComponent(item).trim())
    .filter(Boolean)

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

  const selectedSpace = spaces.find(candidate => candidate.organizationId === params.space) ?? spaces[0] ?? null

  const parsedRange = Number.parseInt(params.range ?? '', 10)
  const rangeDays = ALLOWED_RANGE_DAYS.has(parsedRange) ? parsedRange : DEFAULT_RANGE_DAYS

  const device: SeoRankDevice =
    params.device === 'mobile' || params.device === 'tablet' || params.device === 'desktop'
      ? params.device
      : 'desktop'

  // El modo lo DECIDE cuál de los dos parámetros vino, no un tercer parámetro que pudiera
  // contradecirlos: un enlace con `?urls=` y `mode=keyword` sería ambiguo por construcción.
  const urlItems = parseItems(params.urls)
  const keywordItems = parseItems(params.keywords)
  const mode: SeoPerformanceMode = urlItems.length > 0 ? 'url' : 'keyword'
  const items = (mode === 'url' ? urlItems : keywordItems).slice(0, MAX_COMPARED_ITEMS)

  const metric: SeoPerformanceMetric =
    params.metric === 'clicks' || params.metric === 'impressions' || params.metric === 'ctr'
      ? params.metric
      : 'position'

  if (!selectedSpace) {
    // Pasar el gate y no tener NINGÚN Space con el módulo no es un error: es el estado
    // honesto "sin Spaces con SEO", y la view lo dice con esas palabras.
    return (
      <SeoPerformanceView
        spaces={spaces}
        selectedSpaceId={null}
        connectionState='not_connected'
        dataAsOf={null}
        canConnectSearchConsole={false}
        mode={mode}
        metric={metric}
        device={device}
        rangeDays={rangeDays}
        items={items}
        catalog={[]}
        performance={null}
      />
    )
  }

  const connection = await readSeoOverviewConnection(selectedSpace.organizationId)

  // Catálogo y lectura en paralelo: son independientes y secuenciarlos duplicaría la
  // latencia del primer paint. La lectura sólo se pide si hay set elegido — pedirla con el
  // set vacío gastaría queries para devolver el `no_items` que la view ya sabe pintar.
  const [catalog, performance] = await Promise.all([
    connection.state === 'not_connected'
      ? null
      : readSeoPerformanceCatalog(selectedSpace.organizationId, { mode, windowDays: rangeDays }),
    items.length > 0 && connection.state !== 'not_connected'
      ? readSeoPerformance(selectedSpace.organizationId, { mode, metric, device, rangeDays, items })
      : null
  ])

  return (
    <SeoPerformanceView
      spaces={spaces}
      selectedSpaceId={selectedSpace.organizationId}
      connectionState={connection.state}
      dataAsOf={connection.dataAsOf}
      canConnectSearchConsole={can(tenant, 'growth.search_console.connect', 'execute', 'tenant')}
      mode={mode}
      metric={metric}
      device={device}
      rangeDays={rangeDays}
      items={items}
      catalog={catalog?.ok ? catalog.items : []}
      performance={performance}
    />
  )
}
