import { resolveCapabilityModules } from '@/lib/capabilities/resolve-capabilities'
import { can, getTenantEntitlements } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject, TenantEntitlements } from '@/lib/entitlements/types'
import { projectShortcutForHome, resolveRecommendedShortcuts } from '@/lib/shortcuts/resolver'
import type { HomeAccessContext, HomeRecommendedShortcut } from '@/types/home'
import type { ResolvedCapabilityModule } from '@/types/capabilities'

// TASK-553 — `recommendedShortcuts` now derives from the canonical resolver in
// `src/lib/shortcuts/resolver.ts`. The same resolver feeds the header
// dropdown so Home and the shell never drift. To register a new shortcut,
// extend `src/lib/shortcuts/catalog.ts`. Do NOT add a hardcoded array here.

export type HomeEntitlementsContext = {
  entitlements: TenantEntitlements
  accessContext: HomeAccessContext
  recommendedShortcuts: HomeRecommendedShortcut[]
  visibleCapabilityModules: ResolvedCapabilityModule[]
  canSeeFinanceStatus: boolean
}

export const buildHomeEntitlementsContext = (
  subject: TenantEntitlementSubject & {
    businessLines?: string[]
    serviceModules?: string[]
  }
): HomeEntitlementsContext => {
  const entitlements = getTenantEntitlements(subject)

  const visibleCapabilityModules = resolveCapabilityModules({
    businessLines: subject.businessLines || [],
    serviceModules: subject.serviceModules || []
  })

  const recommendedShortcuts = resolveRecommendedShortcuts(subject, 4).map(projectShortcutForHome)

  const canSeeFinanceStatus = can(entitlements, 'finance.status', 'read')

  return {
    entitlements,
    accessContext: {
      audienceKey: entitlements.audienceKey,
      startupPolicyKey: entitlements.startupPolicyKey,
      moduleKeys: entitlements.moduleKeys
    },
    recommendedShortcuts,
    visibleCapabilityModules,
    canSeeFinanceStatus
  }
}
