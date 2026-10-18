import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { EFEONCE_META_PROFILE as profile, MetaReadError, type JsonObject } from './client'
import type { MetaMutationClient} from './mutation-client';
import { MetaMutationError } from './mutation-client'
import { buildMetaWritePlan, writePlanDigest, WRITE_COMMANDS, type MetaCreatedObject, type MetaWritePlan } from './write-contract'

type Phase = 'prepared' | 'dispatched' | 'accepted' | 'verified' | 'pending' | 'rejected' | 'not_sent' | 'unknown'
export type MetaWriteReceipt = {
  contract: 'meta-write-receipt.v1'; profile: typeof profile; plan: MetaWritePlan; digest: string
  phase: Phase; atUtc: string; result?: MetaCreatedObject; verification?: JsonObject; error?: JsonObject
}
export type MutationPort = Pick<MetaMutationClient, 'preflight' | 'submit' | 'readBack' | 'trustInstagramContainer'>

function privateJson(path: string): unknown {
  const s = lstatSync(path)

  if (!s.isFile() || s.isSymbolicLink() || s.size > 262144 || (s.mode & 0o077)) throw new MetaReadError('private_regular_json_required', 2)

  return JSON.parse(readFileSync(path, 'utf8'))
}

export function loadWriteReceipt(path: string): MetaWriteReceipt {
  try {
    const value = privateJson(path) as MetaWriteReceipt

    if (value.contract !== 'meta-write-receipt.v1' || JSON.stringify(value.profile) !== JSON.stringify(profile) ||
        !Object.values(WRITE_COMMANDS).includes(value.plan.operation) || !['prepared', 'dispatched', 'accepted', 'verified', 'pending', 'rejected', 'not_sent', 'unknown'].includes(value.phase) ||
        !/^[a-f0-9]{64}$/.test(value.digest) || writePlanDigest(value.plan) !== value.digest ||
        (value.phase === 'verified' && value.verification?.verified !== true) ||
        (value.phase === 'pending' && value.verification?.pending !== true) ||
        (['verified', 'pending', 'accepted'].includes(value.phase) !== Boolean(value.result)) ||
        (value.result && (!/^\d{1,40}(?:_\d{1,40})?$/.test(value.result.id) || (value.result.postId && !/^\d{1,40}_\d{1,40}$/.test(value.result.postId))))) throw new Error('invalid')

    return value
  } catch { throw new MetaReadError('invalid_private_write_receipt', 2) }
}

function saveReceipt(path: string, receipt: MetaWriteReceipt, create = false) {
  const temporary = `${path}.${process.pid}.tmp`

  let createdTemporary = false

  try {
    const fd = openSync(create ? path : temporary, 'wx', 0o600)

    createdTemporary = !create

    try { writeFileSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fsyncSync(fd) } finally { closeSync(fd) }
    if (!create) renameSync(temporary, path)
    const directory = openSync(dirname(path), 'r')

    try { fsyncSync(directory) } finally { closeSync(directory) }
  } catch { throw new MetaReadError('receipt_checkpoint_failed', 7) }
  finally { if (createdTemporary && existsSync(temporary)) { try { unlinkSync(temporary) } catch { /* Keep the last durable receipt. */ } } }
}

function safeError(error: unknown): JsonObject {
  if (!(error instanceof MetaReadError)) return { code: 'local_write_operation_failed' }

  return { code: error.code, ...(error.httpStatus !== undefined ? { httpStatus: error.httpStatus } : {}), ...(error.metaCode !== undefined ? { metaCode: error.metaCode } : {}), ...(error.metaSubcode !== undefined ? { metaSubcode: error.metaSubcode } : {}) }
}

function bindContainer(plan: MetaWritePlan, client: MutationPort) {
  if (plan.operation !== 'instagram_publish') return
  if (!plan.dependencyReceipt) throw new MetaReadError('own_container_receipt_required', 2)
  const source = loadWriteReceipt(resolve(plan.dependencyReceipt))

  if (plan.dependencyDigest && (plan.dependencyDigest !== source.digest || plan.targetId !== source.result?.id)) throw new MetaReadError('container_receipt_intent_changed', 2)
  if (source.plan.operation !== 'instagram_container_create' || source.phase !== 'verified' || (source.verification?.data as JsonObject | undefined)?.status_code !== 'FINISHED' || !source.result || !/^\d{1,40}$/.test(source.result.id)) throw new MetaReadError('finished_own_container_required', 2)
  plan.targetId = source.result.id
  plan.params = { creation_id: source.result.id }
  plan.dependencyReceipt = resolve(plan.dependencyReceipt)
  plan.dependencyDigest = source.digest
  client.trustInstagramContainer(source.result.id)
}

async function verifyReceipt(receipt: MetaWriteReceipt, path: string, client: MutationPort) {
  if (!receipt.result) return { exitCode: 7, output: { ok: false, phase: receipt.phase, receipt: path, error: { code: 'no_known_id_reconcile_before_retry' } } }

  try {
    const checked = await client.readBack(receipt.plan, receipt.result)

    receipt.phase = checked.verified ? 'verified' : checked.pending ? 'pending' : 'accepted'
    receipt.atUtc = new Date().toISOString()
    receipt.verification = checked as unknown as JsonObject
    delete receipt.error
    saveReceipt(path, receipt)

    return { exitCode: checked.verified ? 0 : 8, output: { ok: checked.verified, phase: receipt.phase, digest: receipt.digest, result: receipt.result, verification: checked, receipt: path } }
  } catch (error) {
    receipt.phase = 'accepted'; receipt.error = safeError(error); saveReceipt(path, receipt)

    return { exitCode: 8, output: { ok: false, phase: receipt.phase, digest: receipt.digest, result: receipt.result, receipt: path, error: receipt.error } }
  }
}

function lockReceipt(path: string): () => void {
  if (!path.endsWith('.json')) throw new MetaReadError('json_receipt_path_required', 2)
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const lock = `${path}.lock`
  let fd: number

  try { fd = openSync(lock, 'wx', 0o600) } catch { throw new MetaReadError('receipt_locked_or_unavailable', 2) }
  closeSync(fd)

  return () => { try { unlinkSync(lock) } catch { /* The receipt, not the lock, records remote outcome. */ } }
}

export function isMetaWriteCommand(argv: string[]) {
  const words = argv.filter(a => !a.startsWith('-')).slice(0, 3)

  return Object.keys(WRITE_COMMANDS).some(k => argv.slice(0, k.split(' ').length).join(' ') === k) || words.slice(0, 2).join(' ') === 'write verify'
}

export async function runMetaWrites(argv: string[], client: MutationPort, now = new Date()) {
  let unlock: (() => void) | undefined

  try {
    const { positionals, values } = parseArgs({ args: argv, strict: true, allowPositionals: true, options: { input: { type: 'string' }, apply: { type: 'boolean' }, confirm: { type: 'string' }, receipt: { type: 'string' } } })
    const command = positionals.join(' ')
    const verify = command === 'write verify'

    if (verify) {
      if (!values.receipt || values.input || values.apply || values.confirm) throw new MetaReadError('verify_requires_only_receipt', 2)
      const path = resolve(values.receipt)

      unlock = lockReceipt(path)

      return { command, ...await verifyReceipt(loadWriteReceipt(path), path, client) }
    }

    if (!Object.hasOwn(WRITE_COMMANDS, command) || !values.input) throw new MetaReadError('write_input_required', 2)
    if (values.apply && (!values.receipt || !values.confirm || !/^[a-f0-9]{64}$/.test(values.confirm))) throw new MetaReadError('apply_requires_digest_and_receipt', 2)
    if (!values.apply && (values.confirm || values.receipt)) throw new MetaReadError('confirmation_requires_apply', 2)
    let input: unknown

    try { input = privateJson(resolve(values.input)) } catch { throw new MetaReadError('private_write_input_required', 2) }
    const plan = buildMetaWritePlan(WRITE_COMMANDS[command as keyof typeof WRITE_COMMANDS], input)

    // Recover a known publication by its immutable submitted plan, even after the
    // creation container is consumed (PUBLISHED) or its receipt is re-verified.
    if (plan.operation === 'instagram_publish' && values.apply && existsSync(resolve(values.receipt!))) {
      const existingPath = resolve(values.receipt!)

      unlock = lockReceipt(existingPath)
      const prior = loadWriteReceipt(existingPath)

      if (prior.plan.operation !== plan.operation || prior.plan.dependencyReceipt !== resolve(plan.dependencyReceipt!) || prior.digest !== values.confirm)
        throw new MetaReadError('receipt_intent_conflict', 2)
      if (prior.result) return { command, ...await verifyReceipt(prior, existingPath, client) }
      if (prior.phase !== 'prepared') return { command, exitCode: ['unknown', 'dispatched'].includes(prior.phase) ? 7 : 5, output: { ok: false, phase: prior.phase, receipt: existingPath, error: { code: 'existing_attempt_not_repeated' } } }
      unlock(); unlock = undefined
    }

    bindContainer(plan, client)
    const digest = writePlanDigest(plan)

    if (values.apply && values.confirm !== digest) throw new MetaReadError('write_plan_digest_mismatch', 2)

    if (!values.apply) {
      await client.preflight(plan)

      return { command, exitCode: 0, output: { ok: true, phase: 'plan', operation: plan.operation, digest, preview: plan, preflight: { passed: true }, noMutation: true, notes: ['Budgets use explicit Meta account units; no currency conversion or activation.', 'Creation/publishing requires the reviewed payload to be authorized by the operator.'] } }
    }

    const path = resolve(values.receipt!)

    unlock = lockReceipt(path)

    if (existsSync(path)) {
      const prior = loadWriteReceipt(path)

      if (prior.digest !== digest) throw new MetaReadError('receipt_intent_conflict', 2)
      if (prior.result) return { command, ...await verifyReceipt(prior, path, client) }
      if (prior.phase !== 'prepared') return { command, exitCode: prior.phase === 'unknown' || prior.phase === 'dispatched' ? 7 : 5, output: { ok: false, phase: prior.phase, receipt: path, error: { code: 'existing_attempt_not_repeated', prior: prior.error } } }
    }

    await client.preflight(plan)
    const receipt: MetaWriteReceipt = { contract: 'meta-write-receipt.v1', profile, plan, digest, phase: 'prepared', atUtc: now.toISOString() }

    if (!existsSync(path)) saveReceipt(path, receipt, true)
    receipt.phase = 'dispatched'; saveReceipt(path, receipt)
    let created: MetaCreatedObject

    try { created = await client.submit(plan) } catch (error) {
      const outcome = error instanceof MetaMutationError ? error.outcome : 'unknown'

      receipt.phase = outcome; receipt.error = safeError(error); saveReceipt(path, receipt)

      return { command, exitCode: outcome === 'unknown' ? 7 : error instanceof MetaReadError ? error.exitCode : 5, output: { ok: false, phase: receipt.phase, digest, receipt: path, error: receipt.error } }
    }

    receipt.result = created; receipt.phase = 'accepted'; saveReceipt(path, receipt)

    return { command, ...await verifyReceipt(receipt, path, client) }
  } catch (error) {
    const safe = error instanceof MetaReadError ? error : new MetaReadError('invalid_write_arguments_or_receipt', 2)

    return { exitCode: safe.exitCode, output: { ok: false, error: safeError(safe) } }
  } finally { unlock?.() }
}
