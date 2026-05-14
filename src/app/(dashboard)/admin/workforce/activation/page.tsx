import { redirect } from 'next/navigation'

import WorkforceActivationView from '@/views/greenhouse/admin/workforce-activation/WorkforceActivationView'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { listPendingIntakeMembers } from '@/lib/workforce/intake-queue/list-pending-members'
import { getWorkforceScimMembersPendingProfileCompletionSignal } from '@/lib/reliability/queries/scim-workforce-signals'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

/**
 * TASK-873 Slice 4 — /admin/workforce/activation (V1 esqueleto admin governance).
 *
 * **Surface canonical**: este es el variant `admin governance / transitional`
 * explicitly endorsed por Codex en TASK-874 spec §"Approved UI Contract"
 * (líneas 89-134, 2026-05-14):
 *
 *   "/admin/workforce/activation puede quedar como alias/transitional/admin
 *    governance, pero no como ruta/menú primario."
 *
 * El surface **PRIMARIO** de Workforce Activation ships in TASK-874:
 *   - viewCode objetivo: `equipo.workforce_activation`
 *   - routeGroup objetivo: `hr`
 *   - Ruta recomendada: `/hr/workforce/activation` o `/workforce/activation`
 *     (decisión final en TASK-874 Plan Mode)
 *   - Menú: bajo `Personas y HR` (grupo `Workforce` / `Lifecycle laboral`
 *     preferido, o item directo)
 *
 * Server page que renderiza la cola operativa de fichas laborales pendientes
 * para EFEONCE_ADMIN + FINANCE_ADMIN + HR_PAYROLL (gate canonical declarado
 * en runtime.ts Slice 1 + role_view_assignments seeded por migration
 * 20260514113914311).
 *
 * Initial paint SSR-friendly: tabla + reliability signal en paralelo.
 * Handoff a `WorkforceActivationView` client para cursor pagination + drawer
 * + filters.
 *
 * **Mockup canonical** aprobado por user 2026-05-14 (autor Codex):
 *   `src/views/greenhouse/admin/workforce-activation/mockup/`
 *
 *   El mockup define el surface enriquecido (queue + inspector consola
 *   operativa, NO 4 KPI cards encima de tabla, NO 3 cols permanentes en
 *   1440×900, etc — ver TASK-874 §"Reglas duras de rechazo" líneas 125-134).
 *
 * TASK-874 puede:
 *   (a) Compartir `WorkforceActivationView` entre ambos surfaces (admin +
 *       HR) y enriquecer in-place con readiness lanes + inspector, o
 *   (b) Crear nuevo view client para el HR primary surface y dejar este
 *       page admin como minimal governance view.
 *   La decisión es Plan Mode de TASK-874.
 *
 * Forward-compat slots: `PendingIntakeMemberRow` declara `readinessStatus?`,
 * `blockerCount?`, `topBlockerLane?` para que TASK-874 los populate sin
 * breaking change ("thin adapter" pattern, ver spec TASK-874 §Slice 3).
 */

export const dynamic = 'force-dynamic'

const Page = async ({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) => {
  await requireServerSession()
  const params = searchParams ? await searchParams : {}
  const initialSelectedMemberId = typeof params.memberId === 'string' ? params.memberId : null
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'workforce.member.activation_readiness.read', 'read', 'tenant')) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const [initialPage, pendingSignal] = await Promise.all([
    listPendingIntakeMembers({ pageSize: 50, includeReadiness: true }).catch(() => ({
      items: [],
      nextCursor: null,
      hasMore: false,
      totalApprox: null
    })),
    getWorkforceScimMembersPendingProfileCompletionSignal().catch(() => null)
  ])

  return (
    <WorkforceActivationView
      initialItems={[...initialPage.items]}
      initialCursor={initialPage.nextCursor}
      initialHasMore={initialPage.hasMore}
      initialTotalApprox={initialPage.totalApprox}
      pendingSignal={pendingSignal}
      apiPath='/api/admin/workforce/activation'
      completeIntakeApiBasePath='/api/admin/workforce/members'
      intakeApiBasePath='/api/admin/workforce/members'
      initialSelectedMemberId={initialSelectedMemberId}
    />
  )
}

export default Page
