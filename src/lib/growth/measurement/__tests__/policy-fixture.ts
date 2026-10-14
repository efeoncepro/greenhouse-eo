import type { MeasurementPolicyRevision } from '../policy-contract'

export const sourceKey='a879b155-a143-40bd-9b15-731c2b62d175'
export const sourceVersion='a879b155-a143-40bd-9b15-731c2b62d176'
export const policyFixture = (overrides: Partial<MeasurementPolicyRevision> = {}): MeasurementPolicyRevision => ({
  policyId:'a879b155-a143-40bd-9b15-731c2b62d173',revisionId:'a879b155-a143-40bd-9b15-731c2b62d174',revision:1,state:'published',
  publishedRevisionId:'a879b155-a143-40bd-9b15-731c2b62d174',scope:{sourceKind:'form_submission',sourceKey,surfaceId:'fhsf-aeo'},
  config:{purpose:'commercial_lead',sourceVersion,origins:['https://efeoncepro.com'],destinations:['meta','google_upd'],mapping:{email:'email',phone:'phone',firstName:'firstName',lastName:'lastName'}},...overrides,
})
