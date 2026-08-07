import 'server-only'

import { SEO_SITE_AUDIT_COMPLETED_EVENT } from '@/lib/growth/seo/contracts'
import { mirrorSiteAuditRunToBq } from '@/lib/growth/seo/site-audit/site-audit-history-bq-mirror'
import type { ProjectionDefinition } from '@/lib/sync/projection-registry'

export const seoSiteAuditHistoryBqSyncProjection: ProjectionDefinition = {
  name: 'seo_site_audit_history_bq_sync',
  description:
    'TASK-1304 — growth.seo.site_audit.completed → MERGE seo_site_audit_runs PG → BQ greenhouse_growth_analytics.seo_site_audit_history (re-read PG, idempotente por audit_run_id)',
  domain: 'growth',
  triggerEvents: [SEO_SITE_AUDIT_COMPLETED_EVENT],
  extractScope: payload => {
    const seoTargetId = typeof payload.seoTargetId === 'string' ? payload.seoTargetId.trim() : ''
    const auditRunId = typeof payload.auditRunId === 'string' ? payload.auditRunId.trim() : ''

    if (!seoTargetId || !auditRunId) return null

    return { entityType: 'seo_target', entityId: seoTargetId }
  },
  refresh: async (_scope, payload) => {
    const auditRunId = typeof payload.auditRunId === 'string' ? payload.auditRunId.trim() : ''

    if (!auditRunId) {
      return 'no-op: auditRunId inválido en el payload'
    }

    const result = await mirrorSiteAuditRunToBq(auditRunId)

    if (result.rowsMirrored === 0) {
      return `no-op: run ${auditRunId} sin fila terminada en PG`
    }

    return null
  },
  maxRetries: 3
}
