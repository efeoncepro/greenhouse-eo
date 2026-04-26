import type {
  SisterPlatformBindingResolution,
  SisterPlatformConsumerRecord,
  SisterPlatformExternalScopeType,
  SisterPlatformGreenhouseScopeType
} from '@/lib/sister-platforms/types'

export type ApiPlatformVersion = string

export type ApiPlatformScopeType = SisterPlatformGreenhouseScopeType
export type ApiPlatformExternalScopeType = SisterPlatformExternalScopeType

export type ApiPlatformRateLimit = {
  limitPerMinute: number
  limitPerHour: number
  remainingPerMinute?: number
  remainingPerHour?: number
  resetAt?: string
  retryAfterSeconds?: number
}

export type ApiPlatformRequestContext = {
  requestId: string
  routeKey: string
  version: ApiPlatformVersion
  consumer: SisterPlatformConsumerRecord
  binding: SisterPlatformBindingResolution
  rateLimit: ApiPlatformRateLimit
}

export type ApiPlatformSuccessResult<T> = {
  data: T
  meta?: Record<string, unknown>
  status?: number
  headers?: Record<string, string>
  cacheControl?: string
  etag?: string
  lastModified?: string
  notModified?: boolean
}

export const buildScopeSummary = (binding: SisterPlatformBindingResolution) => ({
  scopeType: binding.greenhouseScopeType,
  organizationId: binding.organizationId,
  clientId: binding.clientId,
  spaceId: binding.spaceId
})
