/**
 * TASK-1692 Slice 3 — atomicidad REAL de `applyKeywordTracking` + ledger, contra PG.
 *
 * Los mocks prueban el TS; esto prueba que membresía y fila viajan en la MISMA transacción.
 * Todo corre dentro de una transacción que aborta: la base queda como estaba.
 */
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { applyKeywordTracking } from '@/lib/growth/seo/track-keywords'

const CANDIDATE = 'seokdc-d848bc88-a435-4972-ad42-a186a2cd49bc'
const ORG = 'org-32333527-02a8-487b-819e-6f76a761777d'
const TARGET = 'seot-berel-mx'
const KEYWORD = `sanity-1692-${Date.now()}`

const checks: Array<{ name: string; ok: boolean; detail?: string }> = []
const check = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail })

const countLedger = async () => {
  const rows = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM greenhouse_growth.seo_keyword_discovery_actions`
  )

  return Number(rows[0].n)
}

const main = async () => {
  check('ledger arranca vacío', (await countLedger()) === 0)

  // ── Caso 1: happy path — membresía y fila en la MISMA transacción ────────────────
  try {
    await withGreenhousePostgresTransaction(async client => {
      const result = await applyKeywordTracking(client, {
        seoTargetId: TARGET,
        organizationId: ORG,
        setName: 'sanity-1692-set',
        capacity: 500,
        actor: 'sanity-1692',
        source: 'operator_ui',
        intent: 'target',
        intentDeclaredBy: 'sanity-1692',
        requested: [{ keyword: KEYWORD, valid: true }],
        discoveryProvenance: { candidateId: CANDIDATE, runId: 'seokdr-sanity' }
      })

      check('outcome tracked', result.outcomes[0]?.status === 'tracked', result.outcomes[0]?.status)

      const ledger = await client.query<{ action_kind: string; metadata_json: Record<string, unknown> }>(
        `SELECT action_kind, metadata_json FROM greenhouse_growth.seo_keyword_discovery_actions
          WHERE organization_id = $1`,
        [ORG]
      )

      check('fila del ledger en la MISMA tx', ledger.rows.length === 1, `filas=${ledger.rows.length}`)
      check('action_kind correcto', ledger.rows[0]?.action_kind === 'promoted_to_tracking')
      check(
        'metadata con outcome + intent + set + run',
        ledger.rows[0]?.metadata_json?.outcome === 'tracked' &&
          ledger.rows[0]?.metadata_json?.intent === 'target' &&
          ledger.rows[0]?.metadata_json?.runId === 'seokdr-sanity' &&
          typeof ledger.rows[0]?.metadata_json?.keywordSetId === 'string',
        JSON.stringify(ledger.rows[0]?.metadata_json)
      )
      check(
        'metadata SIN la keyword cruda',
        !JSON.stringify(ledger.rows[0]?.metadata_json ?? {}).includes(KEYWORD)
      )

      const members = await client.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM greenhouse_growth.seo_keyword_set_members m
           JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
          WHERE s.seo_target_id = $1 AND m.keyword = $2 AND m.effective_to IS NULL`,
        [TARGET, KEYWORD]
      )

      check('membresía abierta en la MISMA tx', members.rows[0]?.n === '1', `filas=${members.rows[0]?.n}`)

      throw new Error('__rollback__')
    })
  } catch (error) {
    if ((error as Error).message !== '__rollback__') throw error
  }

  check('tras el ROLLBACK el ledger sigue vacío', (await countLedger()) === 0)

  const orphanMembers = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM greenhouse_growth.seo_keyword_set_members WHERE keyword = $1`,
    [KEYWORD]
  )

  // ⚠️ `runGreenhousePostgresQuery` devuelve un ARRAY pelado, no `{ rows }`.
  check('tras el ROLLBACK no quedó membresía huérfana', orphanMembers[0].n === '0', `filas=${orphanMembers[0].n}`)

  // ── Caso 2: el append falla ⇒ la membresía TAMPOCO queda ─────────────────────────
  try {
    await withGreenhousePostgresTransaction(async client => {
      await applyKeywordTracking(client, {
        seoTargetId: TARGET,
        organizationId: ORG,
        setName: 'sanity-1692-set',
        capacity: 500,
        actor: 'sanity-1692',
        source: 'operator_ui',
        requested: [{ keyword: `${KEYWORD}-b`, valid: true }],
        // Candidato INEXISTENTE: el append devuelve run_not_found y el command debe abortar.
        discoveryProvenance: { candidateId: 'seokdc-no-existe', runId: 'seokdr-sanity' }
      })

      check('append inválido aborta la promoción', false, 'NO abortó')
    })
  } catch (error) {
    check(
      'append inválido aborta la promoción',
      (error as Error).message.startsWith('seo_discovery_action_append_failed'),
      (error as Error).message.slice(0, 60)
    )
  }

  const afterFail = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT count(*)::text AS n FROM greenhouse_growth.seo_keyword_set_members WHERE keyword = $1`,
    [`${KEYWORD}-b`]
  )

  check('🔴 sin fila NO hay membresía: cero media verdad', afterFail[0].n === '0', `filas=${afterFail[0].n}`)
  check('ledger sigue vacío al cierre', (await countLedger()) === 0)

  for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)

  const failed = checks.filter(c => !c.ok).length

  console.log(`\n${checks.length - failed}/${checks.length} checks OK`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
