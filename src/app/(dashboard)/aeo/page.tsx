import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import { modelFromClientReport } from '@/components/growth/ai-visibility/report-artifact/model'
import { requireServerSession } from '@/lib/auth/require-server-session'
import {
  ClientGraderReportError,
  readClientGraderReport
} from '@/lib/client-portal/readers/curated/growth-ai-visibility'
import { GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT, GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING } from '@/lib/copy/growth'
import { can } from '@/lib/entitlements/runtime'
import { formatDate } from '@/lib/format/date'
import { resolveAeoEntitlement, type AeoEntitlement } from '@/lib/growth/ai-visibility/entitlement'
import { isPortalRunEnabled, isTrialTierEnabled } from '@/lib/growth/ai-visibility/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireClientTenantContext } from '@/lib/tenant/authorization'
import AeoLockedCard from '@/views/greenhouse/growth/ai-visibility/client/AeoLockedCard'
import AeoTierBanner from '@/views/greenhouse/growth/ai-visibility/client/AeoTierBanner'
import AiVisibilityClientReportView from '@/views/greenhouse/growth/ai-visibility/client/AiVisibilityClientReportView'

/**
 * TASK-1248 + TASK-1278 — Portal cliente · AEO (ruta deep-link `/aeo`, routeGroup `client`).
 *
 * Superficie por TIER (nodo S6 del EPIC-020), resuelta SIEMPRE server-side desde el entitlement
 * (`resolveAeoEntitlement`, TASK-1277), NUNCA del rol ni en cliente:
 *
 *   - **sin módulo** → teaser/Locked GRATIS (cross-sell, no corre el motor).
 *   - **contratado** → workbench completo (TASK-1248), sin banner de cupo (su re-medición es el
 *     re-grade recurrente, no self-serve).
 *   - **trial / pilot** → banner de cupo ("Te quedan N de M") + run self-serve (chokepoint) cuando hay
 *     cupo; al agotar → banner de upsell (NO error). El informe, cuando existe, usa el MISMO workbench.
 *
 * El run pasa SOLO por el command gobernado de TASK-1277 (la UI es cliente). Estados honestos: empty /
 * preparing (run no listo o en revisión interna — NUNCA expone la razón) / error transitorio / denied.
 */

export const dynamic = 'force-dynamic'

const C = GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT
const T = GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING

const StateShell = ({ children }: { children: ReactNode }) => (
  <Box sx={{ p: 6, maxWidth: 720, mx: 'auto' }}>{children}</Box>
)

const TieredShell = ({ banner, children }: { banner: ReactNode; children?: ReactNode }) => (
  <Stack spacing={5} sx={{ p: { xs: 4, md: 6 }, minWidth: 0 }}>
    <GreenhouseBreadcrumbs
      items={[
        { label: C.page.breadcrumbRoot, href: '/home' },
        { label: C.page.breadcrumbLeaf }
      ]}
    />
    {banner}
    {children}
  </Stack>
)

// Fecha del reset mensual → "1 de julio" (helper canónico, locale es-CL por defecto).
const formatResetLabel = (iso: string): string => formatDate(iso, { day: 'numeric', month: 'long' })

// El run self-serve está activo sólo si el chokepoint lo aceptaría: portal run ON + (trial requiere su flag).
const isRunAvailable = (tier: AeoEntitlement['tier']): boolean =>
  isPortalRunEnabled() && (tier !== 'trial' || isTrialTierEnabled())

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
        <EmptyState icon='tabler-chart-bar-off' title={C.states.empty.title} description={C.states.empty.body} />
      </StateShell>
    )
  }

  const organizationId = tenant.organizationId

  // TASK-1277 — fuente ÚNICA del gate per-org + tier + allowance. Reemplaza la llamada separada a
  // `hasModuleAccess` (mismo filtro de módulo) y de paso resuelve cupo/tier en un solo paso server-side.
  // Degradación honesta si el resolver throw (misma UX de error transitorio, sin leak del module_key).
  let entitlement: AeoEntitlement

  try {
    entitlement = await resolveAeoEntitlement(organizationId)
  } catch (error) {
    captureWithDomain(error, 'client_portal', {
      tags: { source: 'client_ai_visibility_entitlement_gate' },
      extra: { organizationId }
    })

    return (
      <StateShell>
        <EmptyState
          icon='tabler-alert-triangle'
          title={C.states.error.title}
          description={C.states.error.body}
          action={
            <Button variant='tonal' href='/aeo'>
              {C.states.error.retry}
            </Button>
          }
        />
      </StateShell>
    )
  }

  // Sin módulo AEO asignado → teaser/Locked GRATIS (cross-sell PLG). NO corre el motor; mismo trato que
  // un cliente "sin acceso" pero reencuadrado como descubrimiento, no como puerta cerrada.
  if (!entitlement.hasModule) {
    return (
      <StateShell>
        <AeoLockedCard />
      </StateShell>
    )
  }

  const isTieredTier = entitlement.tier === 'trial' || entitlement.tier === 'pilot'
  const runAvailable = isRunAvailable(entitlement.tier)
  const resetDateLabel = formatResetLabel(entitlement.periodResetAt)

  const banner = isTieredTier ? (
    <AeoTierBanner
      allowanceRemaining={entitlement.allowanceRemaining}
      allowanceCap={entitlement.allowanceCap}
      resetDateLabel={resetDateLabel}
      blocked={entitlement.blockedReason !== null}
      runAvailable={runAvailable}
    />
  ) : null

  try {
    const { report } = await readClientGraderReport({ organizationId })
    const model = modelFromClientReport(report)

    // Informe listo. Contratado → workbench solo. Trial/pilot → banner de cupo arriba + MISMO workbench.
    return (
      <>
        {banner ? (
          <Box sx={{ px: { xs: 4, md: 6 }, pt: { xs: 4, md: 6 } }}>{banner}</Box>
        ) : null}
        <AiVisibilityClientReportView
          model={model}
          organizationName={tenant.organizationName ?? tenant.clientName}
          asOfLabel={report.provenance.asOfDate}
        />
      </>
    )
  } catch (error) {
    if (error instanceof ClientGraderReportError) {
      // Sin informe aún (not_found / report_unavailable). Para trial/pilot la experiencia es el banner
      // (con run self-serve si hay cupo, o upsell si está agotado) + un prompt de primera revisión.
      if (isTieredTier) {
        return (
          <TieredShell banner={banner}>
            {entitlement.blockedReason === null ? (
              <EmptyState
                icon='tabler-sparkles'
                title={T.firstRun.title}
                description={T.firstRun.body}
              />
            ) : null}
          </TieredShell>
        )
      }

      if (error.code === 'not_found') {
        return (
          <StateShell>
            <EmptyState icon='tabler-chart-bar-off' title={C.states.empty.title} description={C.states.empty.body} />
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
      extra: { organizationId }
    })

    // Error transitorio → Reintentar (recarga la ruta). Es la única acción `actionable` de estos estados.
    return (
      <StateShell>
        <EmptyState
          icon='tabler-alert-triangle'
          title={C.states.error.title}
          description={C.states.error.body}
          action={
            <Button variant='tonal' href='/aeo'>
              {C.states.error.retry}
            </Button>
          }
        />
      </StateShell>
    )
  }
}
