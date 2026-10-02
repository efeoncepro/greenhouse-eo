import { describe, it, expect, vi, afterAll } from 'vitest'

vi.mock('server-only', () => ({}))
import { sql } from 'kysely'

import fixture from './__fixtures__/complete.json'
import {
  createXrayCase,
  readXrayCase,
  updateXrayDraft,
  issueXrayEdition,
  createXrayShare,
  revokeXrayShare,
  withdrawXrayEdition
} from './commands'
import { consumeXrayRate } from './store'
import { digestXrayToken } from './token'
import { resolvePublicXray } from './public-reader'
import { getDb, closeGreenhousePostgres } from '@/lib/db'

const enabled =
  process.env.XRAY_EPHEMERAL_TEST === 'true' &&
  process.env.GREENHOUSE_POSTGRES_HOST === '127.0.0.1' &&
  process.env.GREENHOUSE_POSTGRES_DATABASE === 'xray_ephemeral'

describe.skipIf(!enabled)('X-Ray ephemeral PostgreSQL integration', () => {
  afterAll(async () => {
    await closeGreenhousePostgres()
  })
  it('tenant boundaries, revision CAS, retry issuance, digest-only grants, revoke and immutable history', async () => {
    const a = { organizationId: 'org-a', actorUserId: 'actor-a' },
      b = { organizationId: 'org-b', actorUserId: 'actor-b' }

    const c = await createXrayCase(a, { title: 'Demo', prospectReference: 'crm-demo', intent: fixture })

    await expect(readXrayCase(b, c.caseId)).rejects.toMatchObject({ code: 'not_found' })
    await expect(updateXrayDraft(a, c.caseId, { expectedRevision: 2, intent: fixture })).rejects.toMatchObject({
      code: 'revision_conflict'
    })
    const first = await issueXrayEdition(a, c.caseId, { expectedRevision: 1, idempotencyKey: 'test-issue-1' })
    const retry = await issueXrayEdition(a, c.caseId, { expectedRevision: 1, idempotencyKey: 'test-issue-1' })

    expect(retry.idempotent).toBe(true)
    expect(retry.edition.editionId).toBe(first.edition.editionId)
    await expect(
      issueXrayEdition(a, c.caseId, { expectedRevision: 1, idempotencyKey: 'different-key' })
    ).rejects.toMatchObject({ code: 'idempotency_conflict' })
    await updateXrayDraft(a, c.caseId, { expectedRevision: 1, intent: { ...fixture, title: 'Changed draft' } })
    expect(
      (await issueXrayEdition(a, c.caseId, { expectedRevision: 1, idempotencyKey: 'test-issue-1' })).edition.manifest
        .title
    ).toBe(fixture.title)
    await expect(createXrayShare(b, first.edition.editionId)).rejects.toMatchObject({ code: 'not_found' })
    const share = await createXrayShare(a, first.edition.editionId)

    const read = () =>
      resolvePublicXray({ token: share.token, clientIp: '127.0.0.1', env: { AEO_XRAY_SHARING_ENABLED: 'true' } })

    expect((await read()).status).toBe('ok')
    const bucket = digestXrayToken('local-ephemeral-limit')

    expect(await consumeXrayRate(bucket, 2)).toBe(true)
    expect(await consumeXrayRate(bucket, 2)).toBe(true)
    expect(await consumeXrayRate(bucket, 2)).toBe(false)
    const db = await getDb()

    const record = await sql<{
      token_digest: string
    }>`select token_digest from greenhouse_xray.share_grants where grant_id=${share.grant.grantId}::uuid`.execute(db)

    expect(record.rows[0].token_digest).not.toContain(share.token)
    await expect(
      sql`update greenhouse_xray.editions set manifest_json='{}'::jsonb where edition_id=${first.edition.editionId}::uuid`.execute(
        db
      )
    ).rejects.toThrow('xray_edition_immutable')
    await revokeXrayShare(a, share.grant.grantId)
    expect((await read()).status).toBe('gone')
    const share2 = await createXrayShare(a, first.edition.editionId)

    await withdrawXrayEdition(a, first.edition.editionId)
    expect(
      (
        await resolvePublicXray({
          token: share2.token,
          clientIp: '127.0.0.1',
          env: { AEO_XRAY_SHARING_ENABLED: 'true' }
        })
      ).status
    ).toBe('gone')
    await expect(createXrayShare(a, first.edition.editionId)).rejects.toMatchObject({ code: 'not_ready' })
  })
})
