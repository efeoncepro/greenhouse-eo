import { notFound, redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { listSeoEligibleSpaces } from '@/lib/growth/seo/overview/list-seo-spaces'
import { readSeoOverviewConnection } from '@/lib/growth/seo/overview/read-overview-connection'
import { readSeoOverviewKpis } from '@/lib/growth/seo/overview/read-overview-kpis'
import { readSeoOverviewSidebar } from '@/lib/growth/seo/overview/read-overview-sidebar'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import SeoOverviewView from '@/views/greenhouse/admin/growth/seo/overview/SeoOverviewView'

/**
 * TASK-1306 — Cockpit Overview del módulo SEO (Search Visibility 360, EPIC-022).
 *
 * Guard de TRES puertas, cada una responde una pregunta distinta y ninguna sustituye
 * a otra:
 *   1. viewCode `administracion.growth_seo` — ¿esta surface le es visible al rol?
 *   2. capability `growth.seo.observation.read` — ¿tiene autoridad fina de lectura?
 *   3. `module_assignment` (`seo_v2`) por org — ¿el Space contrató el módulo?
 *
 * Las 2 primeras se resuelven acá; la 3.ª la resuelve la lista de Spaces elegibles:
 * si el operador pasa el gate pero NINGÚN Space tiene el módulo, no es un error —
 * es el estado honesto "sin Spaces con SEO", y la view lo dice con esas palabras.
 *
 * Redirect defensivo para `client`: esta es una surface INTERNA. El acceso cliente al
 * módulo SEO va por `growth.seo.report.read_client` (scope 'own') y su propia surface,
 * nunca por este cockpit.
 */

export const metadata: Metadata = { title: 'SEO — Search Visibility | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'administracion.growth_seo'

interface PageProps {
  searchParams: Promise<{ space?: string; range?: string }>
}

/** Ventanas ofrecidas por el selector. Un valor fuera de la lista cae al default. */
const ALLOWED_RANGE_DAYS = new Set([7, 28, 90, 180])
const DEFAULT_RANGE_DAYS = 28

export default async function Page({ searchParams }: PageProps) {
  // Puerta 0 — flag del módulo (EPIC-022, default OFF). Con el módulo apagado la ruta
  // NO existe: un 404 es más honesto que una pantalla vacía que sugiere "no hay datos".
  if (!isSeoModuleEnabled()) {
    notFound()
  }

  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // Defensivo: un tenant cliente NUNCA entra a una surface interna, aunque por algún
  // drift de grants tuviera el viewCode.
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

  const spaces = await listSeoEligibleSpaces()
  const { space: requestedSpaceId, range: requestedRange } = await searchParams

  // El `?range=` es compartible pero NO es autoridad: un valor arbitrario (o enorme) no
  // define la ventana de consulta. Sólo se aceptan las opciones que el selector ofrece.
  const parsedRange = Number.parseInt(requestedRange ?? '', 10)
  const rangeDays = ALLOWED_RANGE_DAYS.has(parsedRange) ? parsedRange : DEFAULT_RANGE_DAYS

  // El `?space=` es compartible, pero NO es autoridad: si apunta a una org sin
  // `module_assignment` vigente NO la abrimos — caemos al primer Space elegible.
  // Confiar en el query param sería dejar que un enlace pegado saltee el chokepoint.
  const selectedSpace = spaces.find(candidate => candidate.organizationId === requestedSpaceId) ?? spaces[0] ?? null

  const connection = selectedSpace
    ? await readSeoOverviewConnection(selectedSpace.organizationId)
    : { state: 'not_connected' as const, dataAsOf: null }

  // Sólo se leen KPIs cuando hay algo materializado: pedirlos en `not_connected`
  // gastaría 4 queries para devolver ceros que la UI no debe mostrar igual.
  // KPIs y sidebar en paralelo: son independientes y secuenciarlos duplicaría la latencia
  // del primer paint sin ganar nada.
  const [kpis, sidebar] = await Promise.all([
    selectedSpace && connection.state === 'connected' ? readSeoOverviewKpis(selectedSpace.organizationId, rangeDays) : null,
    selectedSpace ? readSeoOverviewSidebar(selectedSpace.organizationId) : null
  ])

  return (
    <SeoOverviewView
      spaces={spaces}
      selectedSpaceId={selectedSpace?.organizationId ?? null}
      connectionState={connection.state}
      dataAsOf={connection.dataAsOf}
      canConnectSearchConsole={can(tenant, 'growth.search_console.connect', 'execute', 'tenant')}
      kpis={kpis}
      sidebar={sidebar}
      rangeDays={rangeDays}
    />
  )
}
