export interface ProviderCommunicationConsent {
  providerId: string
  label: string
  required: boolean
}

export interface ProviderConfiguration {
  meetingDurationMillis: number
  onlineUserIds: string[]
  companyRequired: boolean
  legalConsentEnabled: boolean
  communicationConsents: ProviderCommunicationConsent[]
}

export interface ProviderAvailabilitySlot {
  startsAt: string
  endsAt: string
}

export interface ProviderAvailability {
  hasMore: boolean
  slots: ProviderAvailabilitySlot[]
}

export interface ProviderBookingInput {
  startsAt: string
  meetingDurationMillis: number
  timezone: string
  locale: string
  email: string
  firstName: string
  lastName: string
  company: string
  likelyAvailableUserIds: string[]
  legalConsentResponses: Array<{ providerId: string; consented: boolean }>
}

export interface ProviderBookingOutcome {
  startsAt: string
  endsAt: string
  timezone: string
  meetingDurationMillis: number
  channel: 'microsoft_teams'
  providerEvidence: {
    calendarEventId: string
    contactId: string
    webConferenceUrl: string
  }
}
export interface MeetingSchedulingProvider {
  getConfiguration(input: { timezone: string; signal?: AbortSignal }): Promise<ProviderConfiguration>
  getAvailability(input: {
    timezone: string
    monthOffset: number
    meetingDurationMillis: number
    signal?: AbortSignal
  }): Promise<ProviderAvailability>
  book(input: ProviderBookingInput, options?: { signal?: AbortSignal }): Promise<ProviderBookingOutcome>
}

export type ProviderErrorCategory =
  | 'transport'
  | 'timeout_ambiguous'
  | 'authentication'
  | 'rate_limited'
  | 'slot_conflict'
  | 'policy_rejected'
  | 'schema_drift'
  | 'degraded_booking'

export class MeetingProviderError extends Error {
  constructor(
    public readonly category: ProviderErrorCategory,
    public readonly retryable: boolean,
    public readonly safeMetadata: Readonly<Record<string, string | number | boolean | null>> = {},
  ) {
    super(`meeting_provider_${category}`)
    this.name = 'MeetingProviderError'
  }
}
