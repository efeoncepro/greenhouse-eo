import type { AxisAeoXrayManifest } from '@/lib/axis/aeo-xray/aeo-xray'

export type XrayAuthority = Readonly<{ organizationId: string; actorUserId: string }>
export type XrayCase = { caseId: string; organizationId: string; title: string; prospectReference: string }
export type XrayDraft = { caseId: string; revision: number; intent: unknown }
export type XrayEdition = {
  editionId: string
  caseId: string
  organizationId: string
  draftRevision: number
  idempotencyKey: string
  manifest: AxisAeoXrayManifest
  withdrawnAt: string | null
}
export type XrayGrant = {
  grantId: string
  editionId: string
  organizationId: string
  expiresAt: string
  revokedAt: string | null
  label: string | null
}
export type XrayErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'revision_conflict'
  | 'idempotency_conflict'
  | 'not_ready'
  | 'quota_exceeded'
export class XrayError extends Error {
  constructor(
    public code: XrayErrorCode,
    public status: number
  ) {
    super(code)
    this.name = 'XrayError'
  }
}
export type XraySharedResponse = {
  modelVersion: '1.0'
  header: { title: string; preparedFor: string; editionId: string }
  model: AxisAeoXrayManifest
  expiresAt: string
}
export type XrayPublicResult =
  | { status: 'ok'; body: XraySharedResponse }
  | { status: 'not_found' | 'gone' | 'rate_limited' | 'unavailable' }
