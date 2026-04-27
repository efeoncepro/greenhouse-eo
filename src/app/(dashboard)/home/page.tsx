import 'server-only'

import { requireServerSession } from '@/lib/auth/require-server-session'
import { buildHomeEntitlementsContext } from '@/lib/home/build-home-entitlements-context'
import { composeHomeSnapshot } from '@/lib/home/compose-home-snapshot'
import { isHomeV2GloballyEnabled } from '@/lib/home/flags'
import type { HomeUiDensity } from '@/lib/home/contract'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
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

export default async function HomePage() {
  const session = await requireServerSession()
  const { user } = session

  const preferences = await fetchUserPreferences(user.userId)
  const v2Enabled = isHomeV2GloballyEnabled() && preferences.home_v2_opt_out !== true

  if (!v2Enabled) {
    return <HomeViewLegacy />
  }

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
    firstName: (user.name ?? '').split(' ')[0] || 'Usuario',
    fullName: user.name ?? null,
    avatarUrl: (user as { image?: string | null }).image ?? null,
    tenantLabel: user.tenantType === 'efeonce_internal' ? 'Efeonce Group' : 'Cliente Greenhouse'
  })

  return <HomeShellV2 snapshot={snapshot} />
}
