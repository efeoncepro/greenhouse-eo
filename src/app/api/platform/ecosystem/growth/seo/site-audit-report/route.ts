import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoSiteAuditReportPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

export const dynamic = 'force-dynamic'

/**
 * TASK-1304 — Reporte del site audit técnico del target SEO de la organización
 * (OnPage, health + findings por severidad). Lane machine-authed del ecosystem: org por
 * binding (org-scoped manda, internal exige `organizationId`), entitlement per-org
 * `seo_v2` con 404 anti-oracle. Passthrough del reader canónico `readSiteAuditReport`.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.site_audit_report',
    handler: async context => getEcosystemSeoSiteAuditReportPayload({ context, request })
  })
}
