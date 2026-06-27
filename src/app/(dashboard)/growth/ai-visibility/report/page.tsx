import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import EmptyState from '@/components/greenhouse/EmptyState'
import { modelFromClientReport } from '@/components/growth/ai-visibility/report-artifact/model'
import { requireServerSession } from '@/lib/auth/require-server-session'
import {
  ClientGraderReportError,
  readClientGraderReport
} from '@/lib/client-portal/readers/curated/growth-ai-visibility'
import { GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT } from '@/lib/copy/growth'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireClientTenantContext } from '@/lib/tenant/authorization'
import AiVisibilityClientReportView from '@/views/greenhouse/growth/ai-visibility/client/AiVisibilityClientReportView'

/**
 * TASK-1248 — Portal cliente · AI Visibility (ruta deep-link, routeGroup `client`).
 *
 * 3.er consumer de Full API Parity (público / admin / cliente sobre el mismo `buildGraderReport`). El acceso
 * es client-tenant + capability + org de sesión (server-side); la UI NO computa scope. Consume el reader
 * client-scoped vía el boundary del portal cliente (TASK-1243), NUNCA un reader de growth directo. Estados
 * honestos: empty (sin diagnóstico) / preparing (run no listo o en revisión interna — NUNCA expone la razón
 * de `review_required`) / error (transitorio) / permission denied.
 */

export const dynamic = 'force-dynamic'

const C = GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT
const CONTACT_HREF = 'mailto:hola@efeonce.com'

const StateShell = ({ children }: { children: ReactNode }) => (
  <Box sx={{ p: 6, maxWidth: 720, mx: 'auto' }}>{children}</Box>
)

export default async function AiVisibilityClientReportPage() {
  // No sesión → redirige a login. Sesión sin tenant cliente → permission denied (no redirect).
  await requireServerSession()

  const { tenant } = await requireClientTenantContext()

  if (!tenant || !can(tenant, 'growth.ai_visibility.report.read_client', 'read', 'own')) {
    return (
      <StateShell>
        <EmptyState
          icon='tabler-lock'
          title={C.states.permissionDenied.title}
          description={C.states.permissionDenied.body}
        />
      </StateShell>
    )
  }

  if (!tenant.organizationId) {
    return (
      <StateShell>
        <EmptyState
          icon='tabler-chart-bar-off'
          title={C.states.empty.title}
          description={C.states.empty.body}
          action={
            <Button variant='contained' href={CONTACT_HREF}>
              {C.states.empty.cta}
            </Button>
          }
        />
      </StateShell>
    )
  }

  try {
    const { report } = await readClientGraderReport({ organizationId: tenant.organizationId })
    const model = modelFromClientReport(report)

    return (
      <AiVisibilityClientReportView
        model={model}
        organizationName={tenant.organizationName ?? tenant.clientName}
        asOfLabel={report.provenance.asOfDate}
      />
    )
  } catch (error) {
    if (error instanceof ClientGraderReportError) {
      if (error.code === 'not_found') {
        return (
          <StateShell>
            <EmptyState
              icon='tabler-chart-bar-off'
              title={C.states.empty.title}
              description={C.states.empty.body}
              action={
                <Button variant='contained' href={CONTACT_HREF}>
                  {C.states.empty.cta}
                </Button>
              }
            />
          </StateShell>
        )
      }

      // report_unavailable → "se está preparando" neutral. NUNCA exponer la razón interna de review_required.
      return (
        <StateShell>
          <EmptyState
            icon='tabler-clock-hour-4'
            title={C.states.preparing.title}
            description={C.states.preparing.body}
          />
        </StateShell>
      )
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'client_ai_visibility_report_page' },
      extra: { organizationId: tenant.organizationId }
    })

    // Error transitorio → Reintentar (recarga la ruta). Es la única acción `actionable` de estos estados.
    return (
      <StateShell>
        <EmptyState
          icon='tabler-alert-triangle'
          title={C.states.error.title}
          description={C.states.error.body}
          action={
            <Button variant='tonal' href='/growth/ai-visibility/report'>
              {C.states.error.retry}
            </Button>
          }
        />
      </StateShell>
    )
  }
}
