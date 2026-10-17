import { chmodSync, existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { EFEONCE_META_PROFILE as profile, MetaReadError } from './client'
import { MetaMutationError } from './mutation-client'
import { buildMetaWritePlan, writePlanDigest, type MetaWritePlan } from './write-contract'
import { loadWriteReceipt, runMetaWrites, type MetaWriteReceipt, type MutationPort } from './writes'

const directories: string[] = []

afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }) })

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'meta-write-tests-'))

  directories.push(dir)
  const input = join(dir, 'input.json')
  const receipt = join(dir, 'receipt.json')

  const port = {
    preflight: vi.fn<MutationPort['preflight']>(async () => undefined),
    submit: vi.fn<MutationPort['submit']>(async () => ({ id: '100' })),
    readBack: vi.fn<MutationPort['readBack']>(async () => ({ verified: true, data: { id: '100', status: 'PAUSED' } })),
    trustInstagramContainer: vi.fn<MutationPort['trustInstagramContainer']>(() => undefined)
  } satisfies MutationPort

  function payload(value: unknown) { writeFileSync(input, JSON.stringify(value), { mode: 0o600 });

return input }

  payload({ name: 'Campaign', objective: 'OUTCOME_LEADS' })
  const digest = writePlanDigest(buildMetaWritePlan('campaign_create', { name: 'Campaign', objective: 'OUTCOME_LEADS' }))
  const apply = ['campaigns', 'create', '--input', input, '--apply', '--confirm', digest, '--receipt', receipt]


return { dir, input, receipt, port, payload, digest, apply }
}

function ownContainer(path: string, name: string, resultId: string): MetaWriteReceipt {
  const plan = buildMetaWritePlan('instagram_container_create', { media_type: 'IMAGE', image_url: 'https://cdn.example.test/' + name + '.jpg' })

  const value: MetaWriteReceipt = { contract: 'meta-write-receipt.v1', profile, plan, digest: writePlanDigest(plan),
    phase: 'verified', atUtc: '2026-10-18T00:00:00Z', result: { id: resultId }, verification: { verified: true, data: { id: resultId, status_code: 'FINISHED' } } }

  writeFileSync(path, JSON.stringify(value), { mode: 0o600 })

return value
}

describe('Meta write plans and durable attempt receipts', () => {
  it('defaults ads to PAUSED and bounds all references and payload fields', () => {
    expect(buildMetaWritePlan('campaign_create', { name: 'Campaign', objective: 'OUTCOME_LEADS' }).params)
      .toMatchObject({ status: 'PAUSED', buying_type: 'AUCTION', special_ad_categories: [] })
    const targeting = { geo_locations: { countries: ['CL'] } }

    expect(buildMetaWritePlan('adset_create', { name: 'Set', campaign_id: '100', optimization_goal: 'LINK_CLICKS', targeting, daily_budget: 100 }).params.status).toBe('PAUSED')
    expect(() => buildMetaWritePlan('campaign_create', { name: 'Campaign', objective: 'OUTCOME_LEADS', status: 'ACTIVE' })).toThrow(MetaReadError)
    expect(() => buildMetaWritePlan('campaign_create', { name: 'Campaign', objective: 'OUTCOME_LEADS', daily_budget: 100 })).toThrow(MetaReadError)
    expect(() => buildMetaWritePlan('creative_create', { name: 'Creative', object_story_id: 'foreign_100' })).toThrow(MetaReadError)
    expect(() => buildMetaWritePlan('adset_create', { name: 'Set', campaign_id: '100', optimization_goal: 'OFFSITE_CONVERSIONS', targeting, daily_budget: 100, promoted_object: { pixel_id: 'foreign' } })).toThrow(MetaReadError)
    expect(() => buildMetaWritePlan('ad_create', { name: 'Ad', adset_id: '100', creative: { creative_id: '200', source_id: '300' } })).toThrow(MetaReadError)
    expect(() => buildMetaWritePlan('facebook_comment_reply', { post_id: 'foreign_100', comment_id: '200', message: 'reply' })).toThrow(MetaReadError)
    expect(buildMetaWritePlan('instagram_container_create', { media_type: 'IMAGE', image_url: 'https://cdn.example.test/photo.jpg' }).params).not.toHaveProperty('media_type')
    for (const url of ['https://127.0.0.1/image.jpg', 'https://user:pass@example.test/image.jpg', 'https://cdn.example.test/image.jpg?secret=x', 'https://localhost/image.jpg'])
      expect(() => buildMetaWritePlan('facebook_photo_publish', { url })).toThrow(MetaReadError)
  })

  it('preview performs preflight without submit or creating an attempt receipt', async () => {
    const f = fixture()
    const result = await runMetaWrites(['campaigns', 'create', '--input', f.input], f.port)

    expect(result).toMatchObject({ exitCode: 0, output: { phase: 'plan', noMutation: true, digest: f.digest, preview: { params: { status: 'PAUSED' } } } })
    expect(f.port.preflight).toHaveBeenCalledOnce()
    expect(f.port.submit).not.toHaveBeenCalled()
    expect(existsSync(f.receipt)).toBe(false)
  })

  it('requires the digest of the actual reviewed input before any submission', async () => {
    const f = fixture()

    f.payload({ name: 'Changed after review', objective: 'OUTCOME_LEADS' })
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 2, output: { error: { code: 'write_plan_digest_mismatch' } } })
    expect(f.port.submit).not.toHaveBeenCalled()
    expect(existsSync(f.receipt)).toBe(false)
  })

  it('checkpoints dispatch and returned IDs before readback, and never resubmits a known attempt', async () => {
    const f = fixture()

    f.port.submit.mockImplementation(async () => {
      expect(loadWriteReceipt(f.receipt).phase).toBe('dispatched')

return { id: '100' }
    })
    f.port.readBack.mockImplementation(async () => {
      expect(loadWriteReceipt(f.receipt)).toMatchObject({ phase: 'accepted', result: { id: '100' } })

return { verified: true, data: { id: '100', status: 'PAUSED' } }
    })
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 0, output: { phase: 'verified', result: { id: '100' } } })
    expect(lstatSync(f.receipt).mode & 0o777).toBe(0o600)
    f.port.readBack.mockResolvedValue({ verified: true, data: { id: '100', status: 'PAUSED' } })
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 0, output: { phase: 'verified' } })
    expect(f.port.submit).toHaveBeenCalledOnce()
    expect(f.port.readBack).toHaveBeenCalledTimes(2)
    expect(existsSync(f.receipt + '.lock')).toBe(false)
  })

  it('records unknown outcomes and blocks automatic retry without a known ID', async () => {
    const f = fixture()

    f.port.submit.mockRejectedValue(new MetaMutationError(new MetaReadError('META_TIMEOUT', 5), 'unknown'))
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 7, output: { phase: 'unknown' } })
    expect(loadWriteReceipt(f.receipt).phase).toBe('unknown')
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 7, output: { phase: 'unknown', error: { code: 'existing_attempt_not_repeated' } } })
    expect(f.port.submit).toHaveBeenCalledOnce()
    expect(f.port.readBack).not.toHaveBeenCalled()
  })

  it('retains IDs when readback fails and later verify performs reads only', async () => {
    const f = fixture()

    f.port.readBack.mockRejectedValueOnce(new MetaReadError('META_API_ERROR', 4, { httpStatus: 403, metaCode: 200 }))
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 8, output: { phase: 'accepted', result: { id: '100' } } })
    expect(loadWriteReceipt(f.receipt).result).toEqual({ id: '100' })
    expect(await runMetaWrites(['write', 'verify', '--receipt', f.receipt], f.port)).toMatchObject({ exitCode: 0, output: { phase: 'verified' } })
    expect(f.port.submit).toHaveBeenCalledOnce()
  })

  it('keeps a pending Instagram container separate from publication and resumes only verification', async () => {
    const f = fixture()

    f.payload({ media_type: 'IMAGE', image_url: 'https://cdn.example.test/photo.jpg' })
    const plan = buildMetaWritePlan('instagram_container_create', JSON.parse(readFileSync(f.input, 'utf8')))
    const args = ['instagram', 'container', 'create', '--input', f.input, '--apply', '--confirm', writePlanDigest(plan), '--receipt', f.receipt]

    f.port.readBack.mockResolvedValueOnce({ verified: false, pending: true, data: { id: '100', status_code: 'IN_PROGRESS' } } as never)
    expect(await runMetaWrites(args, f.port)).toMatchObject({ exitCode: 8, output: { phase: 'pending' } })
    expect(await runMetaWrites(['write', 'verify', '--receipt', f.receipt], f.port)).toMatchObject({ exitCode: 0, output: { phase: 'verified' } })
    expect(f.port.submit).toHaveBeenCalledOnce()
    expect(f.port.trustInstagramContainer).not.toHaveBeenCalled()
  })

  it('rejects public inputs, symlinks, receipt tampering, and existing locks before a second write', async () => {
    const f = fixture()

    chmodSync(f.input, 0o644)
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 2 })
    chmodSync(f.input, 0o600)
    const link = join(f.dir, 'input-link.json')

    symlinkSync(f.input, link)
    expect(await runMetaWrites(['campaigns', 'create', '--input', link], f.port)).toMatchObject({ exitCode: 2 })
    writeFileSync(f.receipt + '.lock', '', { mode: 0o600 })
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 2, output: { error: { code: 'receipt_locked_or_unavailable' } } })
    expect(f.port.submit).not.toHaveBeenCalled()
    rmSync(f.receipt + '.lock')
    await runMetaWrites(f.apply, f.port)
    const value = loadWriteReceipt(f.receipt)

    value.plan.params.name = 'Tampered'
    writeFileSync(f.receipt, JSON.stringify(value))
    expect(() => loadWriteReceipt(f.receipt)).toThrow(MetaReadError)
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 2 })
    expect(f.port.submit).toHaveBeenCalledOnce()
  })

  it('rejects a symlink receipt without replacing its destination', async () => {
    const f = fixture()
    const destination = join(f.dir, 'unrelated.json')

    writeFileSync(destination, '{"untouched":true}', { mode: 0o600 })
    symlinkSync(destination, f.receipt)
    expect(await runMetaWrites(f.apply, f.port)).toMatchObject({ exitCode: 2 })
    expect(readFileSync(destination, 'utf8')).toBe('{"untouched":true}')
    expect(f.port.submit).not.toHaveBeenCalled()
  })

  it('binds Instagram publication to a verified own-container receipt and its complete digest', async () => {
    const f = fixture()
    const sourcePath = join(f.dir, 'container.json')
    const source = ownContainer(sourcePath, 'first', '900')

    f.payload({ creation_receipt: sourcePath })
    const preview = await runMetaWrites(['instagram', 'publish', '--input', f.input], f.port)

    expect(preview).toMatchObject({ exitCode: 0, output: { preview: { targetId: '900', dependencyDigest: source.digest, params: { creation_id: '900' } } } })
    expect(f.port.trustInstagramContainer).toHaveBeenCalledWith('900')
    expect(f.port.submit).not.toHaveBeenCalled()
    source.phase = 'pending'
    writeFileSync(sourcePath, JSON.stringify(source))
    expect(await runMetaWrites(['instagram', 'publish', '--input', f.input], f.port)).toMatchObject({ exitCode: 2 })
  })

  it('verifies a known published media ID without rebinding its immutable original container intent', async () => {
    const f = fixture()
    const sourcePath = join(f.dir, 'container.json')
    const source = ownContainer(sourcePath, 'first', '900')
    const plan: MetaWritePlan = { operation: 'instagram_publish', targetId: '900', params: { creation_id: '900' }, dependencyReceipt: sourcePath, dependencyDigest: source.digest }
    const value: MetaWriteReceipt = { contract: 'meta-write-receipt.v1', profile, plan, digest: writePlanDigest(plan), phase: 'accepted', atUtc: '2026-10-18T00:00:00Z', result: { id: '9010' } }

    writeFileSync(f.receipt, JSON.stringify(value), { mode: 0o600 })
    ownContainer(sourcePath, 'changed', '901')
    const result = await runMetaWrites(['write', 'verify', '--receipt', f.receipt], f.port)

    expect(result.exitCode).toBe(0)
    expect(f.port.readBack).toHaveBeenCalledWith(plan, { id: '9010' })
    expect(f.port.trustInstagramContainer).not.toHaveBeenCalled()
    expect(loadWriteReceipt(f.receipt).plan.targetId).toBe('900')
  })
  it('rechecks a known Instagram publication after its creation receipt becomes PUBLISHED', async () => {
    const f = fixture()
    const sourcePath = join(f.dir, 'container.json')
    const source = ownContainer(sourcePath, 'image', '555')

    f.payload({ creation_receipt: sourcePath })
    const preview = await runMetaWrites(['instagram', 'publish', '--input', f.input], f.port)
    const digest = (preview.output as { digest: string }).digest
    const apply = ['instagram', 'publish', '--input', f.input, '--apply', '--confirm', digest, '--receipt', f.receipt]

    expect((await runMetaWrites(apply, f.port)).exitCode).toBe(0)
    source.verification = { verified: true, data: { id: '555', status_code: 'PUBLISHED' } }
    writeFileSync(sourcePath, JSON.stringify(source), { mode: 0o600 })
    f.port.preflight.mockRejectedValue(new Error('Consumed container must not be submitted again'))
    expect((await runMetaWrites(apply, f.port)).exitCode).toBe(0)
    expect(f.port.submit).toHaveBeenCalledOnce()
    expect(f.port.readBack).toHaveBeenCalledTimes(2)
  })

})
