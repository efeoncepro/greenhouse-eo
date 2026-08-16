import type { TalentPoolAccessDecision, TalentPoolLifecycle } from './contracts'

export const TALENT_POOL_POLICY_VERSION = 'talent-pool-v1'
export const TALENT_POOL_FUTURE_CONSENT_TTL_MONTHS = 12

export const deriveTalentPoolAccess = ({
  lifecycleStatus,
  futureConsentExpiresAt,
  now = new Date()
}: {
  lifecycleStatus: TalentPoolLifecycle
  futureConsentExpiresAt: string | null
  now?: Date
}): TalentPoolAccessDecision => {
  const expired = Boolean(futureConsentExpiresAt && new Date(futureConsentExpiresAt).getTime() <= now.getTime())

  // An active application is its own purpose. A stale/withdrawn future-opportunity
  // lease must never hide the application the candidate is currently pursuing.
  if (lifecycleStatus === 'active_process') {
    return {
      discoverable: true,
      contactable: false,
      allowedActions: ['read', 'update_availability'],
      reasonCodes: ['active_application_only']
    }
  }

  if (lifecycleStatus === 'withdrawn') {
    return { discoverable: false, contactable: false, allowedActions: [], reasonCodes: ['consent_withdrawn'] }
  }

  if (lifecycleStatus === 'expired' || expired) {
    return { discoverable: false, contactable: false, allowedActions: [], reasonCodes: ['future_consent_expired'] }
  }

  if (lifecycleStatus === 'paused') {
    return { discoverable: true, contactable: false, allowedActions: ['read'], reasonCodes: ['contact_paused'] }
  }

  if (lifecycleStatus === 'pool_eligible' && futureConsentExpiresAt) {
    return {
      discoverable: true,
      contactable: true,
      allowedActions: ['read', 'update_availability', 'invite', 'withdraw'],
      reasonCodes: ['future_consent_current']
    }
  }

  return {
    discoverable: true,
    contactable: false,
    allowedActions: ['read', 'update_availability'],
    reasonCodes: ['future_consent_missing']
  }
}
