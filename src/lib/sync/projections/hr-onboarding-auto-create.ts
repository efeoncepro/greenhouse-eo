import 'server-only'

import { ensureOnboardingChecklistForMemberEvent } from '@/lib/hr-onboarding/auto-create'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

export const hrOnboardingAutoCreateProjection: ProjectionDefinition = {
  name: 'hr_onboarding_auto_create',
  description: 'Create idempotent onboarding/offboarding checklist instances from member lifecycle events.',
  domain: 'people',
  triggerEvents: [
    EVENT_TYPES.memberCreated,
    EVENT_TYPES.memberUpdated,
    EVENT_TYPES.memberDeactivated
  ],
  extractScope: payload => {
    const memberId = payload.memberId as string | undefined

    if (!memberId) return null

    return { entityType: 'member', entityId: memberId }
  },
  refresh: async (scope, payload) => {
    const eventType = payload._eventType as string | undefined

    const result = await ensureOnboardingChecklistForMemberEvent({
      memberId: scope.entityId,
      eventType: eventType ?? 'member.lifecycle',
      payload
    })

    if (!result.createdOrFound) {
      return result.reason ?? null
    }

    return `onboarding checklist ready: ${result.instanceId}`
  },
  maxRetries: 2
}
