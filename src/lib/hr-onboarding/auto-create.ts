import 'server-only'

import { query } from '@/lib/db'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import { getActiveOffboardingCaseForMember } from '@/lib/workforce/offboarding/store'

import { createOnboardingInstance } from './store'

type MemberRow = {
  member_id: string
  active: boolean
  status: string | null
  hire_date: Date | string | null
}

type AutoCreateResult = {
  createdOrFound: boolean
  instanceId?: string
  reason?: string
}

const ACTIVE_MEMBER_STATUSES = new Set(['active', 'onboarding', 'trial'])
const INACTIVE_MEMBER_STATUSES = new Set(['inactive', 'offboarded', 'terminated', 'deactivated'])

const toDateString = (value: Date | string | null) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const readMember = async (memberId: string) => {
  const rows = await query<MemberRow>(
    `
      SELECT member_id, active, status, hire_date
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId]
  )

  return rows[0] ?? null
}

const shouldCreateOnboarding = (member: MemberRow) => {
  if (!member.active) return false
  const status = String(member.status ?? '').toLowerCase()

  return !status || ACTIVE_MEMBER_STATUSES.has(status) || !INACTIVE_MEMBER_STATUSES.has(status)
}

export const ensureOnboardingChecklistForMemberEvent = async ({
  memberId,
  eventType,
  payload = {}
}: {
  memberId: string
  eventType: string
  payload?: Record<string, unknown>
}): Promise<AutoCreateResult> => {
  const member = await readMember(memberId)

  if (!member) {
    return { createdOrFound: false, reason: 'member_not_found' }
  }

  if (eventType === EVENT_TYPES.memberDeactivated || !member.active || INACTIVE_MEMBER_STATUSES.has(String(member.status ?? '').toLowerCase())) {
    const offboardingCase = await getActiveOffboardingCaseForMember(memberId)

    const instance = await createOnboardingInstance({
      input: {
        memberId,
        type: 'offboarding',
        offboardingCaseId: offboardingCase?.offboardingCaseId ?? null,
        source: offboardingCase ? 'offboarding_case' : 'member_event',
        sourceRef: {
          eventType,
          offboardingCaseId: offboardingCase?.offboardingCaseId ?? null,
          updatedFields: payload.updatedFields ?? null
        }
      }
    })

    return { createdOrFound: true, instanceId: instance.instanceId }
  }

  if (!shouldCreateOnboarding(member)) {
    return { createdOrFound: false, reason: 'member_not_active' }
  }

  const instance = await createOnboardingInstance({
    input: {
      memberId,
      type: 'onboarding',
      startDate: toDateString(member.hire_date),
      source: 'member_event',
      sourceRef: {
        eventType,
        updatedFields: payload.updatedFields ?? null
      }
    }
  })

  return { createdOrFound: true, instanceId: instance.instanceId }
}
