/**
 * TASK-1692 Slice 1 — sanity del append transaccional contra PG REAL (gate TASK-893).
 *
 * Escribe de verdad y ABORTA: el throw final fuerza el ROLLBACK del helper canónico, así que
 * la base queda como estaba. Verificar el SQL leyéndolo no cuenta — los mocks ejercitan el TS.
 */
import { withGreenhousePostgresTransaction, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { appendDiscoveryActionTx } from '@/lib/growth/seo/keyword-discovery/queue'

const CANDIDATE = 'seokdc-d848bc88-a435-4972-ad42-a186a2cd49bc'
const ORG = 'org-32333527-02a8-487b-819e-6f76a761777d'

const checks: Array<{ name: string; ok: boolean; detail?: string }> = []
const check = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail })

const main = async () => {
  const before = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM greenhouse_growth.seo_keyword_discovery_actions`
  )

  check('ledger arranca vacío', before[0].n === '0', `filas=${before[0].n}`)

  try {
    await withGreenhousePostgresTransaction(async client => {
      // 1. PoolClient satisface la interfaz DiscoveryActionClient (si no, ni compila ni corre).
      const first = await appendDiscoveryActionTx(client, {
        organizationId: ORG,
        candidateId: CANDIDATE,
        actionKind: 'promoted_to_tracking',
        actor: 'sanity-1692',
        idempotencyKey: 'sanity:1692:kset-x:tracked',
        metadata: { outcome: 'tracked', intent: 'target', keywordSetId: 'kset-x', runId: 'run-x' }
      })

      check('append inserta', first.ok === true && first.deduped === false, JSON.stringify(first))

      // 2. La fila existe DENTRO de la transacción.
      const inTx = await client.query<{ action_kind: string; metadata_json: unknown }>(
        `SELECT action_kind, metadata_json FROM greenhouse_growth.seo_keyword_discovery_actions
          WHERE organization_id = $1 AND idempotency_key = $2`,
        [ORG, 'sanity:1692:kset-x:tracked']
      )

      check('fila visible en la tx', inTx.rows.length === 1, `filas=${inTx.rows.length}`)
      check('action_kind persistido', inTx.rows[0]?.action_kind === 'promoted_to_tracking')
      // JSONB no preserva el ORDEN de las claves: comparar strings serializados compara el
      // orden de Postgres, no el dato. Se compara clave por clave.
      const meta = (inTx.rows[0]?.metadata_json ?? {}) as Record<string, unknown>
      const expected = { outcome: 'tracked', intent: 'target', keywordSetId: 'kset-x', runId: 'run-x' }

      check(
        'metadata_json round-trip sin keyword cruda',
        Object.entries(expected).every(([k, v]) => meta[k] === v) &&
          Object.keys(meta).length === Object.keys(expected).length,
        JSON.stringify(meta)
      )

      // 3. Idempotencia real contra la constraint, no contra un mock.
      const second = await appendDiscoveryActionTx(client, {
        organizationId: ORG,
        candidateId: CANDIDATE,
        actionKind: 'promoted_to_tracking',
        actor: 'sanity-1692',
        idempotencyKey: 'sanity:1692:kset-x:tracked',
        metadata: { outcome: 'tracked' }
      })

      check('repetir dedupea', second.ok === true && second.deduped === true, JSON.stringify(second))
      check(
        'dedupe resuelve la MISMA fila',
        second.ok === true && first.ok === true && second.actionId === first.actionId
      )

      // 4. Anti-oracle sobre datos reales.
      const foreign = await appendDiscoveryActionTx(client, {
        organizationId: 'org-INEXISTENTE',
        candidateId: CANDIDATE,
        actionKind: 'dismissed',
        actor: 'sanity-1692'
      })

      check('org ajena → run_not_found', foreign.ok === false && foreign.errorCode === 'run_not_found', JSON.stringify(foreign))

      throw new Error('__rollback__')
    })
  } catch (error) {
    if ((error as Error).message !== '__rollback__') throw error
  }

  // 5. El trigger append-only rechaza UPDATE y DELETE. Cada intento va en SU PROPIA
  // transacción: un error de PG aborta la transacción entera (25P02), así que encadenarlos
  // dentro de una sola haría que el segundo fallara por la causa equivocada.
  for (const [label, sql] of [
    ['UPDATE', `UPDATE greenhouse_growth.seo_keyword_discovery_actions SET actor = 'x' WHERE organization_id = $1`],
    ['DELETE', `DELETE FROM greenhouse_growth.seo_keyword_discovery_actions WHERE organization_id = $1`]
  ] as const) {
    try {
      await withGreenhousePostgresTransaction(async client => {
        // 🔴 El trigger es FOR EACH ROW: sobre una tabla VACÍA un UPDATE/DELETE no dispara
        // nada y "pasa" por no tocar filas. Hay que insertar primero para que el intento sea
        // real — si no, el test verificaría la ausencia de datos, no la garantía append-only.
        await appendDiscoveryActionTx(client, {
          organizationId: ORG,
          candidateId: CANDIDATE,
          actionKind: 'dismissed',
          actor: 'sanity-1692',
          idempotencyKey: `sanity:1692:trigger:${label}`
        })

        await client.query(sql, [ORG])
      })
      check(`trigger rechaza ${label}`, false, 'NO lo rechazó')
    } catch (error) {
      check(`trigger rechaza ${label}`, /append-only|append_only/i.test((error as Error).message), (error as Error).message.slice(0, 60))
    }
  }

  const after = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM greenhouse_growth.seo_keyword_discovery_actions`
  )

  check('ROLLBACK dejó la base intacta', after[0].n === '0', `filas=${after[0].n}`)

  for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)

  const failed = checks.filter(c => !c.ok).length

  console.log(`\n${checks.length - failed}/${checks.length} checks OK`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
