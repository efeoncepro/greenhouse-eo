import { describe, expect, it } from 'vitest'

/**
 * TASK-1848 Slice 1 — ShareGrant contra PostgreSQL REAL (`pnpm test:live src/lib/efeonce-insights/sharing`).
 *
 * Lo que ningún mock prueba: el CHECK de 90 días, la unicidad del digest, el trigger que impide
 * reactivar o editar un grant, la resolución por digest con edición/org/módulo en UNA query, la
 * cascada de retiro y la cubeta de rate limit atómica.
 *
 * Todo dentro de UNA transacción que se revierte (sentinel): las tablas son no-delete/append-only.
 * Skipea sin DB: un `skipped` se ve verde — leer `passed` en el reporte.
 */

const hasLiveDb = Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)

class RollbackSentinel extends Error {}

const actor = { kind: 'member' as const, userId: 'live-test-user', memberId: null }

describe.skipIf(!hasLiveDb)('TASK-1848 — ShareGrant (PostgreSQL real)', () => {
  it('digest único, techo de 90 días, inmutable salvo revocar una vez, resolución y cascada', async () => {
    const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')
    const store = await import('./store')
    const { digestInsightShareToken, generateInsightShareToken, hashInsightShareSubject } = await import('./token')

    let failure: unknown = null

    try {
      await withGreenhousePostgresTransaction(async client => {
        const edition = await client.query<{ edition_id: string; organization_id: string }>(
          `SELECT edition_id, organization_id FROM greenhouse_insights.insight_editions ORDER BY created_at DESC LIMIT 1`
        )

        if (!edition.rows[0]) throw new RollbackSentinel('sin ediciones en la base: nada que probar')

        const { edition_id: editionId, organization_id: organizationId } = edition.rows[0]
        const token = generateInsightShareToken()
        const digest = digestInsightShareToken(token)

        const grant = await store.insertInsightShareGrant(client, {
          organizationId, editionId, tokenDigest: digest, downloadOutputs: ['deck_pdf'], label: 'live', source: 'manual', ttlDays: 30, actor
        })

        expect(grant.shareGrantId).toMatch(/^ishr-/)
        expect(new Date(grant.expiresAt).getTime() - new Date(grant.createdAt).getTime()).toBe(30 * 86_400_000)

        // El bearer no existe en la fila: sólo su digest.
        const raw = await client.query<{ row: string }>(`SELECT row_to_json(g)::text AS row FROM greenhouse_insights.insight_share_grants g WHERE share_grant_id = $1`, [grant.shareGrantId])

        expect(raw.rows[0]!.row).not.toContain(token)
        expect(raw.rows[0]!.row).toContain(digest)

        // Resolución por digest: grant + estado de edición + org + módulo en una lectura.
        const resolved = await store.resolveInsightShareGrantByDigest(digest, client)

        expect(resolved?.grant.shareGrantId).toBe(grant.shareGrantId)
        expect(typeof resolved?.organizationActive).toBe('boolean')
        expect(typeof resolved?.moduleActive).toBe('boolean')
        expect(await store.resolveInsightShareGrantByDigest(digestInsightShareToken(generateInsightShareToken()), client)).toBeNull()

        // Techo de 90 días y digest único: los hace cumplir la base, no sólo el command.
        await client.query('SAVEPOINT over_ttl')
        await expect(
          store.insertInsightShareGrant(client, { organizationId, editionId, tokenDigest: digestInsightShareToken(generateInsightShareToken()), downloadOutputs: [], label: null, source: 'manual', ttlDays: 91, actor })
        ).rejects.toThrow()
        await client.query('ROLLBACK TO SAVEPOINT over_ttl')

        await client.query('SAVEPOINT dup_digest')
        await expect(
          store.insertInsightShareGrant(client, { organizationId, editionId, tokenDigest: digest, downloadOutputs: [], label: null, source: 'manual', ttlDays: 1, actor })
        ).rejects.toThrow()
        await client.query('ROLLBACK TO SAVEPOINT dup_digest')

        // Sólo la revocación cambia un grant.
        await client.query('SAVEPOINT edit_expiry')
        await expect(client.query(`UPDATE greenhouse_insights.insight_share_grants SET expires_at = now() + interval '5 days' WHERE share_grant_id = $1`, [grant.shareGrantId])).rejects.toThrow(/sólo la revocación/)
        await client.query('ROLLBACK TO SAVEPOINT edit_expiry')

        const second = await store.insertInsightShareGrant(client, {
          organizationId, editionId, tokenDigest: digestInsightShareToken(generateInsightShareToken()), downloadOutputs: [], label: null, source: 'manual', ttlDays: 7, actor
        })

        const revoked = await store.revokeInsightShareGrant(client, { organizationId, shareGrantId: grant.shareGrantId, actor, reason: 'manual' })

        expect(revoked?.revokeReason).toBe('manual')
        // Revocar de nuevo no hace nada (idempotente) y des-revocar lo impide el trigger.
        expect(await store.revokeInsightShareGrant(client, { organizationId, shareGrantId: grant.shareGrantId, actor, reason: 'manual' })).toBeNull()

        await client.query('SAVEPOINT unrevoke')
        await expect(client.query(`UPDATE greenhouse_insights.insight_share_grants SET revoked_at = NULL, revoke_reason = NULL, revoked_by_actor_kind = NULL WHERE share_grant_id = $1`, [grant.shareGrantId])).rejects.toThrow(/no se modifica ni se reactiva/)
        await client.query('ROLLBACK TO SAVEPOINT unrevoke')

        // El otro grant sigue vivo: la revocación es individual.
        expect(await store.countActiveInsightShareGrants(client, organizationId, editionId)).toBeGreaterThanOrEqual(1)

        // Cascada de retiro: corta los vivos, no toca los ya revocados.
        const cascaded = await store.revokeActiveInsightShareGrantsForEdition(client, { organizationId, editionId, actor, reason: 'edition_withdrawn' })

        expect(cascaded.map(row => row.shareGrantId)).toContain(second.shareGrantId)
        expect(cascaded.map(row => row.shareGrantId)).not.toContain(grant.shareGrantId)

        // No-delete.
        await client.query('SAVEPOINT no_delete')
        await expect(client.query(`DELETE FROM greenhouse_insights.insight_share_grants WHERE share_grant_id = $1`, [second.shareGrantId])).rejects.toThrow()
        await client.query('ROLLBACK TO SAVEPOINT no_delete')

        // Cubeta atómica: el hit N+1 dentro del minuto no cabe.
        const subject = hashInsightShareSubject(`live:${grant.shareGrantId}`, 'live-salt')

        expect(await store.consumeInsightShareRateBucket(subject, 'view', 2, client)).toBe(true)
        expect(await store.consumeInsightShareRateBucket(subject, 'view', 2, client)).toBe(true)
        expect(await store.consumeInsightShareRateBucket(subject, 'view', 2, client)).toBe(false)
        expect(await store.consumeInsightShareRateBucket(subject, 'download', 2, client)).toBe(true)

        throw new RollbackSentinel('ok')
      })
    } catch (error) {
      failure = error
    }

    if (!(failure instanceof RollbackSentinel)) throw failure
    if (failure.message !== 'ok') console.warn(`[live] ${failure.message}`)
  })
})
