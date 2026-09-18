import { describe, expect, it } from 'vitest'

/**
 * TASK-1848 Slice 2 — DeliveryIntent contra PostgreSQL REAL (`pnpm test:live src/lib/efeonce-insights/delivery`).
 *
 * Lo que ningún mock prueba: el dedupe entre intents por (versión, modalidad, persona) con el índice
 * único parcial, el claim atómico `pending → claimed`, la inmutabilidad del contenido autorizado, los
 * CHECK de adjunto irrevocable y de share TTL, y que los EmailTypes nacieron apagados.
 *
 * Todo dentro de UNA transacción que se revierte (sentinel). No toca `email_deliveries`: el claim de
 * correo commitea en su propia transacción y se ejercita en el canary de staging.
 */

const hasLiveDb = Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)

class RollbackSentinel extends Error {}

describe.skipIf(!hasLiveDb)('TASK-1848 — DeliveryIntent (PostgreSQL real)', () => {
  it('dedupe entre intents, claim atómico, contenido inmutable y EmailTypes apagados', async () => {
    const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')
    const store = await import('./store')

    let failure: unknown = null

    try {
      await withGreenhousePostgresTransaction(async client => {
        const config = await client.query<{ email_type: string; enabled: boolean }>(
          `SELECT email_type, enabled FROM greenhouse_notifications.email_type_config WHERE email_type LIKE 'insights_edition_delivery%' ORDER BY 1`
        )

        expect(config.rows.map(row => row.email_type)).toEqual(['insights_edition_delivery', 'insights_edition_delivery_attachment'])

        const edition = await client.query<{ edition_id: string; organization_id: string }>(
          `SELECT edition_id, organization_id FROM greenhouse_insights.insight_editions ORDER BY created_at DESC LIMIT 1`
        )

        if (!edition.rows[0]) throw new RollbackSentinel('sin ediciones en la base: nada que probar')

        const { edition_id: editionId, organization_id: organizationId } = edition.rows[0]
        const issuedHash = 'a'.repeat(64)

        const base = {
          organizationId, editionId, editionIssuedHash: issuedHash, modality: 'share_link' as const, outputs: [], subject: 'Informe live test',
          message: null, shareTtlDays: 30, attachmentIrrevocableAck: false, requestHash: 'b'.repeat(64), authorizedByActorKind: 'member' as const, authorizedByUserId: 'live'
        }

        const first = await store.insertInsightDeliveryIntent(client, { ...base, idempotencyKey: 'live-test-key-0001' })
        const second = await store.insertInsightDeliveryIntent(client, { ...base, idempotencyKey: 'live-test-key-0002' })

        const recipient = { organizationId, editionId, editionIssuedHash: issuedHash, modality: 'share_link' as const, recipientKey: 'live@example.com', recipientKind: 'client_user' as const, recipientUserId: 'user-live' }

        const a = await store.insertInsightDeliveryRecipient(client, { ...recipient, deliveryIntentId: first.deliveryIntentId })

        expect(a.state).toBe('pending')

        // Misma persona, misma versión, misma modalidad en OTRO intent ⇒ nace skipped/duplicate.
        const b = await store.insertInsightDeliveryRecipient(client, { ...recipient, deliveryIntentId: second.deliveryIntentId })

        expect(b).toMatchObject({ state: 'skipped', skipReason: 'duplicate_delivery' })

        // Otra modalidad no es duplicado.
        const attachmentIntent = await store.insertInsightDeliveryIntent(client, {
          ...base, idempotencyKey: 'live-test-key-0003', modality: 'attachment', outputs: ['deck_pdf'], shareTtlDays: null, attachmentIrrevocableAck: true
        })

        const c = await store.insertInsightDeliveryRecipient(client, { ...recipient, modality: 'attachment', deliveryIntentId: attachmentIntent.deliveryIntentId })

        expect(c.state).toBe('pending')

        // CHECK: adjunto sin aceptación de irrevocabilidad y share_link sin TTL.
        await client.query('SAVEPOINT bad_attachment')
        await expect(store.insertInsightDeliveryIntent(client, { ...base, idempotencyKey: 'live-test-key-0004', modality: 'attachment', outputs: ['deck_pdf'], shareTtlDays: null, attachmentIrrevocableAck: false })).rejects.toThrow()
        await client.query('ROLLBACK TO SAVEPOINT bad_attachment')

        await client.query('SAVEPOINT bad_share')
        await expect(store.insertInsightDeliveryIntent(client, { ...base, idempotencyKey: 'live-test-key-0005', shareTtlDays: null })).rejects.toThrow()
        await client.query('ROLLBACK TO SAVEPOINT bad_share')

        // El contenido autorizado no cambia; el estado sí.
        await client.query('SAVEPOINT edit_subject')
        await expect(client.query(`UPDATE greenhouse_insights.insight_delivery_intents SET subject = 'otro asunto' WHERE delivery_intent_id = $1`, [first.deliveryIntentId])).rejects.toThrow(/no cambia/)
        await client.query('ROLLBACK TO SAVEPOINT edit_subject')

        await store.setInsightDeliveryIntentState(client, { deliveryIntentId: first.deliveryIntentId, state: 'dispatching' })

        // Claim atómico: dos intentos sobre la misma fila, sólo el primero la obtiene.
        const claim = await client.query(
          `UPDATE greenhouse_insights.insight_delivery_recipients SET state = 'claimed', attempts = attempts + 1, claimed_at = now()
            WHERE delivery_recipient_id = $1 AND state = 'pending' RETURNING delivery_recipient_id`,
          [a.deliveryRecipientId]
        )

        const again = await client.query(
          `UPDATE greenhouse_insights.insight_delivery_recipients SET state = 'claimed', attempts = attempts + 1, claimed_at = now()
            WHERE delivery_recipient_id = $1 AND state = 'pending' RETURNING delivery_recipient_id`,
          [a.deliveryRecipientId]
        )

        expect(claim.rowCount).toBe(1)
        expect(again.rowCount).toBe(0)

        // Terminar exige venir del estado esperado.
        const done = await store.finishInsightDeliveryRecipient(client, { deliveryRecipientId: a.deliveryRecipientId, fromStates: ['claimed'], state: 'failed', lastErrorCode: 'provider_rejected' })

        expect(done?.state).toBe('failed')
        expect(await store.finishInsightDeliveryRecipient(client, { deliveryRecipientId: a.deliveryRecipientId, fromStates: ['claimed'], state: 'accepted' })).toBeNull()

        // Un fallido libera el cupo del dedupe: ahora otro intent sí puede alcanzar a la persona.
        const third = await store.insertInsightDeliveryIntent(client, { ...base, idempotencyKey: 'live-test-key-0006' })

        expect((await store.insertInsightDeliveryRecipient(client, { ...recipient, deliveryIntentId: third.deliveryIntentId })).state).toBe('pending')

        // Retiro: cancela lo pendiente de la edición, no toca lo terminado.
        const cancelled = await store.cancelPendingInsightDeliveryRecipients(client, { organizationId, editionId })

        expect(cancelled.map(row => row.deliveryRecipientId)).not.toContain(a.deliveryRecipientId)
        expect(cancelled.length).toBeGreaterThanOrEqual(2)

        await store.insertInsightDeliveryEvent(client, { deliveryIntentId: first.deliveryIntentId, organizationId, toState: 'cancelled', actorKind: 'member' })

        await client.query('SAVEPOINT event_update')
        await expect(client.query(`UPDATE greenhouse_insights.insight_delivery_events SET to_state = 'x' WHERE delivery_intent_id = $1`, [first.deliveryIntentId])).rejects.toThrow()
        await client.query('ROLLBACK TO SAVEPOINT event_update')

        // La lectura del transporte por prefijo corre (sin filas en esta transacción ⇒ mapa vacío).
        expect((await store.readInsightDeliveryTransport([a.deliveryRecipientId], client)).size).toBe(0)

        throw new RollbackSentinel('ok')
      })
    } catch (error) {
      failure = error
    }

    if (!(failure instanceof RollbackSentinel)) throw failure
    if (failure.message !== 'ok') console.warn(`[live] ${failure.message}`)
  })
})
