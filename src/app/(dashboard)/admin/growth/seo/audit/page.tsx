import { notFound, redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { listSeoEligibleSpaces } from '@/lib/growth/seo/overview/list-seo-spaces'
import { resolveActiveSeoTarget } from '@/lib/growth/seo/overview/read-overview-sidebar'
import { SITE_AUDIT_MAX_CRAWL_PAGES } from '@/lib/growth/seo/site-audit/queue-audit'
import { readSiteAuditReport } from '@/lib/growth/seo/site-audit/reader'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import SiteAuditView from '@/views/greenhouse/admin/growth/seo/audit/SiteAuditView'

/**
 * TASK-1309 — Auditoría del sitio (nodo S4 del master flow EPIC-022), cuarta y última
 * tab de "Search Visibility".
 *
 * Guard idéntico al del cockpit (TASK-1306) y al de Rendimiento (TASK-1307) porque es la
 * MISMA surface: viewCode `administracion.growth_seo` + capability
 * `growth.seo.observation.read` + `module_assignment` per-org resuelto por los Spaces
 * elegibles, con `notFound()` si el módulo está apagado y redirect defensivo si el tenant
 * es `client`. Child del mismo viewCode: NO siembra uno nuevo ni suma ítem de menú.
 *
 * La página es cliente PURO del reader (`readSiteAuditReport`): no deriva salud, no
 * fabrica snapshots y no llama a DataForSEO en el render. El estado honesto del crawl
 * (`running`/`succeeded`/`degraded`/`failed`) viene del backend y se pinta tal cual — un
 * `succeeded` con cero findings es el reporte "sitio limpio", no un error (arch §6).
 *
 * ⚠️ `?space=` es COMPARTIBLE pero no autoridad: un Space sin `module_assignment` vigente
 * cae al primer elegible. `?issueGroup=` y `?severity=` sí se pasan tal cual — son filtros
 * dentro de los datos de la propia org; la view sólo abre el grupo si existe en el reporte
 * y `severity` se acota contra la allowlist del CHECK de TASK-1299.
 */

export const metadata: Metadata = { title: 'Auditoría — SEO | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'administracion.growth_seo'

interface PageProps {
  searchParams: Promise<{ space?: string; issueGroup?: string; severity?: string }>
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
  const selectedSpace = spaces.find(candidate => candidate.organizationId === params.space) ?? spaces[0] ?? null

  // Correr el audit y verlo son permisos distintos: un analista puede diagnosticar sin
  // poder gastar presupuesto de proveedor. Sin la capability el CTA ni se renderiza.
  const canRunAudit = can(tenant, 'growth.seo.audit.run', 'execute', 'tenant')

  if (!selectedSpace) {
    // Pasar el gate y no tener NINGÚN Space con el módulo no es un error: es el estado
    // honesto "sin Spaces con SEO", y la view lo dice con esas palabras.
    return (
      <SiteAuditView
        spaces={spaces}
        selectedSpaceId={null}
        rootDomain={null}
        seoTargetId={null}
        report={null}
        openIssueGroup={null}
        severityFilter={null}
        canRunAudit={false}
        crawlPageCap={SITE_AUDIT_MAX_CRAWL_PAGES}
      />
    )
  }

  const target = await resolveActiveSeoTarget(selectedSpace.organizationId)

  // Space elegible sin target creado ≠ target sin auditar. Son dos caminos de salida
  // distintos y llevan al operador a acciones distintas (configurar vs correr el crawl).
  if (!target) {
    return (
      <SiteAuditView
        spaces={spaces}
        selectedSpaceId={selectedSpace.organizationId}
        rootDomain={null}
        seoTargetId={null}
        report={null}
        openIssueGroup={null}
        severityFilter={null}
        canRunAudit={canRunAudit}
        crawlPageCap={SITE_AUDIT_MAX_CRAWL_PAGES}
      />
    )
  }

  const report = await readSiteAuditReport(target.seoTargetId)

  return (
    <SiteAuditView
      spaces={spaces}
      selectedSpaceId={selectedSpace.organizationId}
      rootDomain={target.rootDomain}
      seoTargetId={target.seoTargetId}
      report={report}
      openIssueGroup={params.issueGroup?.trim() || null}
      severityFilter={
        params.severity === 'critical' || params.severity === 'warning' || params.severity === 'notice'
          ? params.severity
          : null
      }
      canRunAudit={canRunAudit}
      // El techo del crawl viaja a la view para que pueda decir cuándo el conteo de
      // páginas es el LÍMITE y no el tamaño del sitio — un `100` redondo casi nunca es
      // el sitio entero, y presentarlo pelado convierte una muestra en un censo.
      crawlPageCap={SITE_AUDIT_MAX_CRAWL_PAGES}
    />
  )
}
