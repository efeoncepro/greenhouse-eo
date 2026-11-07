import 'server-only'

import { randomUUID } from 'node:crypto'

import {
  assertKmsVersionBelongsToKey,
  type KmsSignerPort
} from '@/lib/auth-server/keys/kms-signer'
import { prepareSigningKeyVersion } from '@/lib/auth-server/keys/signing-keys-store'

import {
  activateRotationOperation,
  claimRotationOperation,
  readRotationSnapshot,
  transitionRotationOperation,
  type RotationOperation,
  type RotationSnapshot
} from './key-rotation-store'

export const AUTH_KEY_ROTATION_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000

export type RotationKmsPort = Readonly<{
  createVersion: (keyName: string) => Promise<string>
  getVersionState: (versionName: string) => Promise<'ENABLED' | 'PENDING' | 'DISABLED' | 'OTHER'>
  signer: KmsSignerPort
}>

export type RotationPublicationPort = Readonly<{
  verify: (candidateKid: string, predecessorKid: string) => Promise<void>
}>

export type RotationStorePort = Readonly<{
  read: typeof readRotationSnapshot
  claim: typeof claimRotationOperation
  transition: typeof transitionRotationOperation
  activate: typeof activateRotationOperation
}>

export type RotationTickResult = Readonly<{
  status: 'disabled' | 'dry_run' | 'not_due' | 'baseline_required' | 'busy' |
    'blocked' | 'pending' | 'create_uncertain' | 'verified'
  reason?: string
  operationId?: string
}>

export const rotationStore: RotationStorePort = {
  read: readRotationSnapshot,
  claim: claimRotationOperation,
  transition: transitionRotationOperation,
  activate: activateRotationOperation
}

const dryRunStatus = (snapshot: RotationSnapshot, now: Date): RotationTickResult => {
  if (!snapshot.active) return { status: 'dry_run', reason: 'no_active_key' }
  if (snapshot.open) return { status: 'dry_run', reason: `open_${snapshot.open.phase}` }
  if (snapshot.retiring.length) return { status: 'dry_run', reason: 'retiring_key_requires_review' }
  if (!snapshot.lastVerifiedAt) return { status: 'dry_run', reason: 'baseline_required' }
  if (snapshot.lastVerifiedKid !== snapshot.active.kid) return { status: 'dry_run', reason: 'active_differs_from_baseline' }

  if (now.getTime() - snapshot.lastVerifiedAt.getTime() < AUTH_KEY_ROTATION_INTERVAL_MS) {
    return { status: 'dry_run', reason: 'not_due' }
  }

  return { status: 'dry_run', reason: 'eligible_after_review' }
}

export const runKeyRotationTick = async (input: Readonly<{
  enabled: boolean
  dryRun: boolean
  keyName: string
  actor: string
  executionId: string
  now?: Date
  store?: RotationStorePort
  kms: RotationKmsPort
  publication: RotationPublicationPort
}>): Promise<RotationTickResult> => {
  // Flag OFF means no PostgreSQL or KMS reads. This is the default for a new Job.
  if (!input.enabled) return { status: 'disabled' }

  const now = input.now ?? new Date()
  const store = input.store ?? rotationStore

  if (input.dryRun) return dryRunStatus(await store.read(input.keyName), now)

  const owner = randomUUID()

  const claimed = await store.claim({
    keyName: input.keyName,
    owner,
    actor: input.actor,
    executionId: input.executionId,
    now
  })

  if (claimed.kind !== 'claimed') return { status: claimed.kind }

  let operation = claimed.operation!

  const transition = async (to: RotationOperation['phase'], result: string, extra: {
    kmsVersion?: string
    candidateKid?: string
    verifiedAt?: Date
    releaseLease?: boolean
  } = {}) => {
    operation = await store.transition({
      operation,
      from: operation.phase,
      to,
      actor: input.actor,
      executionId: input.executionId,
      result,
      ...extra
    })
  }

  if (operation.phase === 'planned') {
    await transition('creating', 'intent_persisted')

    let versionName: string

    try {
      versionName = await input.kms.createVersion(input.keyName)
    } catch {
      await transition('create_uncertain', 'rpc_result_uncertain', { releaseLease: true })

      return { status: 'create_uncertain', operationId: operation.id }
    }

    assertKmsVersionBelongsToKey(versionName, input.keyName)
    await transition('version_created', 'version_recorded', { kmsVersion: versionName })
  }

  if (operation.phase === 'version_created') {
    const versionName = operation.kmsVersion

    if (!versionName) throw new Error('Rotation ledger has no KMS version')
    assertKmsVersionBelongsToKey(versionName, input.keyName)
    const state = await input.kms.getVersionState(versionName)

    if (state === 'PENDING') {
      await transition('version_created', 'generation_pending', { releaseLease: true })

      return { status: 'pending', operationId: operation.id }
    }

    if (state !== 'ENABLED') {
      await transition('blocked', 'candidate_not_enabled', { releaseLease: true })

      return { status: 'blocked', reason: 'candidate_not_enabled', operationId: operation.id }
    }

    try {
      const prepared = await prepareSigningKeyVersion(input.kms.signer, versionName, input.keyName)

      await transition('preverified', 'candidate_signature_verified', { candidateKid: prepared.kid })
    } catch {
      await transition('blocked', 'candidate_signature_failed', { releaseLease: true })

      return { status: 'blocked', reason: 'candidate_signature_failed', operationId: operation.id }
    }
  }

  if (operation.phase === 'preverified') {
    const versionName = operation.kmsVersion

    if (!versionName) throw new Error('Preverified rotation has no KMS version')
    const prepared = await prepareSigningKeyVersion(input.kms.signer, versionName, input.keyName)

    operation = await store.activate({ operation, prepared, actor: input.actor, executionId: input.executionId })
  }

  if (operation.phase === 'activated') {
    const candidateKid = operation.candidateKid

    if (!candidateKid) throw new Error('Activated rotation has no candidate kid')

    try {
      await input.publication.verify(candidateKid, operation.predecessorKid)
    } catch {
      await transition('blocked', 'publication_check_failed', { releaseLease: true })

      return { status: 'blocked', reason: 'publication_check_failed', operationId: operation.id }
    }

    await transition('verified', 'published_and_ready', { verifiedAt: new Date(), releaseLease: true })

    return { status: 'verified', operationId: operation.id }
  }

  return { status: 'blocked', reason: `unexpected_phase_${operation.phase}`, operationId: operation.id }
}
