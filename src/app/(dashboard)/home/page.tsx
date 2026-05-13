import 'server-only'

import Box from '@mui/material/Box'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { resolveAccountManagerEmail } from '@/lib/client-portal/composition/resolve-account-manager-email'
import { buildHomeEntitlementsContext } from '@/lib/home/build-home-entitlements-context'
import { composeHomeSnapshot } from '@/lib/home/compose-home-snapshot'
import { getHomeUserIdentity } from '@/lib/home/get-home-user-identity'
import { captureHomeShellError } from '@/lib/home/observability'
import { resolveHomeRolloutFlag } from '@/lib/home/rollout-flags'
import type { HomeUiDensity } from '@/lib/home/contract'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import ClientPortalDegradedBanner from '@/views/greenhouse/client-portal/empty-states/ClientPortalDegradedBanner'
import ModuleNotAssignedEmpty from '@/views/greenhouse/client-portal/empty-states/ModuleNotAssignedEmpty'
import HomeShellV2 from '@/views/greenhouse/home/v2/HomeShellV2'
import HomeViewLegacy from '@/views/greenhouse/home/HomeView'

export const dynamic = 'force-dynamic'

type UserPreferencesRow = {
  ui_density: string | null
  home_default_view: string | null
  home_v2_opt_out: boolean | null
} & Record<string, unknown>

const fetchUserPreferences = async (userId: string): Promise<UserPreferencesRow> => {
  try {
    const rows = await runGreenhousePostgresQuery<UserPreferencesRow>(
      `SELECT ui_density, home_default_view, home_v2_opt_out
         FROM greenhouse_core.client_users
        WHERE user_id = $1`,
      [userId]
    )

    return rows[0] ?? { ui_density: null, home_default_view: null, home_v2_opt_out: false }
  } catch {
    return { ui_density: null, home_default_view: null, home_v2_opt_out: false }
  }
}

const normalizeDensity = (raw: string | null): HomeUiDensity => {
  if (raw === 'cozy' || raw === 'comfortable' || raw === 'compact') return raw

  return 'cozy'
}

type HomeSearchParams = {
  /** Slug user-facing del módulo denegado por `requireViewCodeAccess` (TASK-827 Slice 4). */
  readonly denied?: string

  /** `'resolver_unavailable'` cuando page guard cae a fallback por throw del resolver. */
  readonly error?: string
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<HomeSearchParams> | HomeSearchParams
}) {
  const session = await requireServerSession()
  const { user } = session

  // TASK-827 Slice 4 — 5-state contract handling pre-render.
  // Si el page guard de una ruta cliente redirigió acá con ?denied= o ?error=,
  // renderizamos el empty state honesto ANTES de la composition normal del home.
  // Internal portal users no llegan acá con estos params (D1 bypass del guard).
  const params: HomeSearchParams = searchParams ? await searchParams : {}

  if (user.tenantType === 'client') {
    if (params.error === 'resolver_unavailable') {
      return (
        <Box sx={{ p: 6, maxWidth: 720, mx: 'auto' }}>
          <ClientPortalDegradedBanner mode='fallback' />
        </Box>
      )
    }

    if (params.denied) {
      const accountManagerEmail = await resolveAccountManagerEmail(user.clientId ?? '')

      return (
        <Box sx={{ p: 6, maxWidth: 720, mx: 'auto' }}>
          <ModuleNotAssignedEmpty publicSlug={params.denied} accountManagerEmail={accountManagerEmail} />
        </Box>
      )
    }
  }

  const [preferences, identity, rolloutFlag] = await Promise.all([
    fetchUserPreferences(user.userId),
    getHomeUserIdentity(user.userId),
    resolveHomeRolloutFlag('home_v2_shell', {
      userId: user.userId,
      tenantId: user.clientId ?? null,
      roleCodes: user.roleCodes ?? []
    })
  ])

  const v2Enabled = rolloutFlag.enabled && preferences.home_v2_opt_out !== true

  if (!v2Enabled) {
    return <HomeViewLegacy />
  }

  try {
    return await renderV2(user, preferences, identity)
  } catch (error) {
    // V2 composer falla → degrade honesta a legacy. Sentry tag home_version=v2
    // queda en el evento para que reliability dashboards distingan errores
    // por variante. NUNCA dejar la página en estado roto: la mejor experiencia
    // de fallback es la home legacy que ya corre estable hace meses.
    captureHomeShellError(error, 'v2', {
      stage: 'render_v2_shell',
      userId: user.userId,
      tenantId: user.clientId ?? null,
      flagSource: rolloutFlag.source,
      flagScopeType: rolloutFlag.scopeType
    })

    return <HomeViewLegacy />
  }
}

async function renderV2(
  user: Awaited<ReturnType<typeof requireServerSession>>['user'],
  preferences: UserPreferencesRow,
  identity: Awaited<ReturnType<typeof getHomeUserIdentity>>
) {
  const homeEntitlements = buildHomeEntitlementsContext({
    userId: user.userId,
    tenantType: user.tenantType,
    roleCodes: user.roleCodes ?? [],
    primaryRoleCode: user.primaryRoleCode,
    routeGroups: user.routeGroups ?? [],
    authorizedViews: user.authorizedViews ?? [],
    businessLines: user.businessLines ?? [],
    serviceModules: user.serviceModules ?? [],
    portalHomePath: user.portalHomePath ?? '/home',
    memberId: user.memberId
  })

  const snapshot = await composeHomeSnapshot({
    userId: user.userId,
    tenantId: user.clientId ?? null,
    tenantType: user.tenantType,
    audienceKey: homeEntitlements.entitlements.audienceKey,
    roleCodes: user.roleCodes ?? [],
    primaryRoleCode: user.primaryRoleCode,
    entitlements: homeEntitlements.entitlements,
    density: normalizeDensity(preferences.ui_density),
    defaultView: preferences.home_default_view,
    optedOutOfV2: preferences.home_v2_opt_out === true,
    // Identity sources, by priority:
    //   1. greenhouse_serving.person_360.resolved_* (canonical 360 view)
    //   2. greenhouse_core.client_users.{full_name,avatar_url}
    //   3. NextAuth session (last resort — user.name / user.image)
    // The Hero never invents a name; if all sources are blank we render
    // the role label instead of a generic "Usuario".
    firstName:
      identity?.firstName ??
      (user.name ?? '').split(' ')[0] ??
      'Usuario',
    fullName: identity?.fullName ?? user.name ?? null,
    avatarUrl:
      identity?.avatarUrl ??
      (user as { image?: string | null }).image ??
      null,
    tenantLabel:
      identity?.tenantLabel ??
      (user.tenantType === 'efeonce_internal' ? 'Efeonce Group' : 'Cliente Greenhouse')
  })

  return <HomeShellV2 snapshot={snapshot} />
}
