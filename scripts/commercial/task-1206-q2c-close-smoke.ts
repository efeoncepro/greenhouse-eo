import 'server-only'

import { randomUUID } from 'node:crypto'

import { query, withTransaction } from '@/lib/db'
import { upsertCanonicalOrganization } from '@/lib/account-360/organization-identity'
import { closeQuoteToCash } from '@/lib/commercial/quote-to-cash/close-quote-to-cash'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import {
  getQ2cConvertedWithoutIncomeSignal,
  getQ2cConvertedWithoutAuditSignal,
  getQ2cIssuedWithoutDealSignal,
  getQ2cContractOnlySlaBreachSignal,
  getQ2cDuplicateIncomeSignal
} from '@/lib/reliability/queries/commercial-quote-to-cash-health'

/**
 * TASK-1206 — Smoke controlado del cierre Quote-to-Cash canónico (`closeQuoteToCash`).
 *
 * Crea un FIXTURE manual nuevo (org `ZZZ Q2C Smoke` + cotización emitida con 1 línea, NO una de
 * las 12 Nubox imports de dev que duplicarían AR) y ejerce el path real de AR:
 *   1. closeQuoteToCash(simple_invoice) → income + contrato + audit Q2C + converted + outbox.
 *   2. REPLAY con el mismo idempotencyKey → debe devolver el MISMO incomeId, sin segundo AR.
 *   3. Verifica los 5 reliability signals (converted_without_income=0, duplicate_income=0).
 *
 * Income es append-only: el fixture NO se borra (decisión del operador 2026-06-21). Los artefactos
 * quedan marcados `ZZZ Q2C Smoke` para ser filtrables.
 *
 * Uso: requiere `--confirm` (escribe AR real en dev). ADC gcloud fresco + proxy Cloud SQL.
 *   set -a && source .env.local && set +a
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/task-1206-q2c-close-smoke.ts --confirm
 */

const FIXTURE_TAX_ID = 'ZZZQ2CSMOKE'
const FIXTURE_ORG_NAME = 'ZZZ Q2C Smoke Fixture'
const ACTOR_USER_ID = 'user-agent-e2e-001'

const subject: TenantEntitlementSubject = {
  userId: ACTOR_USER_ID,
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin', 'finance_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: [],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/'
} as unknown as TenantEntitlementSubject

const actor = { userId: ACTOR_USER_ID, tenantScope: 'efeonce_internal:system', name: 'Q2C Smoke' }

const log = (...args: unknown[]) => console.log('[q2c-smoke]', ...args)

const resolveFixtureOrg = async (): Promise<string> => {
  const existing = await query<{ organization_id: string; organization_type: string }>(
    `SELECT organization_id, organization_type FROM greenhouse_core.organizations WHERE tax_id = $1 LIMIT 1`,
    [FIXTURE_TAX_ID]
  )

  const { organizationId } = await upsertCanonicalOrganization({
    existingOrganizationId: existing[0]?.organization_id ?? null,
    currentType: existing[0]?.organization_type ?? null,
    organizationName: FIXTURE_ORG_NAME,
    legalName: FIXTURE_ORG_NAME,
    taxId: FIXTURE_TAX_ID,
    taxIdType: 'rut',
    country: 'CL',
    lifecycleStage: 'prospect',
    hasClientRole: false,
    origin: 'manual'
  })

  return organizationId
}

const createFixtureIssuedQuotation = async (organizationId: string): Promise<string> => {
  const runId = randomUUID().slice(0, 8).toUpperCase()
  const quotationNumber = `ZZZ-Q2C-SMOKE-${runId}`
  const amount = 119000

  return withTransaction(async client => {
    const inserted = await client.query<{ quotation_id: string }>(
      // tax_code se deja NULL: el CHECK quotations_tax_snapshot_consistent exige los 3 campos
      // de snapshot (tax_code/tax_snapshot_json/tax_snapshot_frozen_at) todos NULL o todos
      // NOT NULL. El income builder maneja tax_code NULL (no-tax) — suficiente para el smoke.
      // tax_rate=0 → el income builder infiere código exento (TAX_EXEMPT) sin necesitar el trío
      // de snapshot (que el CHECK quotations_tax_snapshot_consistent exige todo-NULL o todo-NOT-NULL).
      `INSERT INTO greenhouse_commercial.quotations (
         quotation_number, organization_id, client_name_cache, status, current_version,
         currency, source_system, source_quote_id, quote_date,
         subtotal, total_price, total_amount, total_amount_clp, tax_rate, tax_amount,
         description, created_by
       ) VALUES (
         $1, $2, $3, 'issued', 1,
         'CLP', 'manual', $1, CURRENT_DATE,
         $4, $4, $4, $4, 0, 0,
         'TASK-1206 Q2C close smoke fixture (no borrar — append-only).', $5
       )
       RETURNING quotation_id`,
      [quotationNumber, organizationId, FIXTURE_ORG_NAME, amount, ACTOR_USER_ID]
    )

    const quotationId = inserted.rows[0].quotation_id

    // 1 línea para no disparar el signal `authored_without_command` (manual+issued+0 líneas).
    await client.query(
      `INSERT INTO greenhouse_commercial.quotation_line_items (
         quotation_id, version_number, label, line_type, unit, quantity, unit_price, subtotal_price
       ) VALUES ($1, 1, 'Smoke deliverable', 'deliverable', 'project', 1, $2, $2)`,
      [quotationId, 119000]
    )

    return quotationId
  })
}

const verifyClose = async (quotationId: string, incomeId: string) => {
  const q = await query<{ status: string; converted_to_income_id: string | null }>(
    `SELECT status, converted_to_income_id FROM greenhouse_commercial.quotations WHERE quotation_id = $1`,
    [quotationId]
  )

  log('quotation:', JSON.stringify(q[0]))

  const inc = await query<{ income_id: string; payment_status: string; total_amount_clp: string; contract_id: string | null }>(
    `SELECT income_id, payment_status, total_amount_clp, contract_id FROM greenhouse_finance.income WHERE quotation_id = $1`,
    [quotationId]
  )

  log(`income rows for quotation (debe ser 1): ${inc.length}`, JSON.stringify(inc))

  const audit = await query<{ status: string; operation_type: string; contract_id: string | null }>(
    `SELECT status, operation_type, contract_id FROM greenhouse_commercial.commercial_operations_audit WHERE quotation_id = $1 AND operation_type = 'quote_to_cash' ORDER BY started_at DESC LIMIT 1`,
    [quotationId]
  )

  log('Q2C audit:', JSON.stringify(audit[0]))

  const outbox = await query<{ event_type: string }>(
    `SELECT event_type FROM greenhouse_sync.outbox_events WHERE aggregate_id = $1 OR payload_json->>'quotationId' = $1 ORDER BY occurred_at DESC LIMIT 10`,
    [quotationId]
  )

  log('outbox events (muestra):', JSON.stringify(outbox.map(o => o.event_type)))

  const ok =
    q[0]?.status === 'converted' &&
    q[0]?.converted_to_income_id === incomeId &&
    inc.length === 1 &&
    inc[0]?.income_id === incomeId &&
    audit[0]?.status === 'completed'

  return ok
}

const runSignals = async () => {
  const signals = await Promise.all([
    getQ2cConvertedWithoutIncomeSignal(),
    getQ2cConvertedWithoutAuditSignal(),
    getQ2cIssuedWithoutDealSignal(),
    getQ2cContractOnlySlaBreachSignal(),
    getQ2cDuplicateIncomeSignal()
  ])

  for (const s of signals) {
    const count = s.evidence?.find(e => e.label === 'count')?.value

    log(`signal ${s.signalId} → severity=${s.severity} count=${count}`)
  }

  const critical = signals.filter(s =>
    [
      'commercial.quote_to_cash.converted_without_income',
      'commercial.quote_to_cash.duplicate_income'
    ].includes(s.signalId)
  )

  return critical.every(s => s.severity === 'ok')
}

const main = async () => {
  if (!process.argv.includes('--confirm')) {
    log('DRY: pasá --confirm para ejecutar el smoke (escribe AR real en dev sobre un fixture).')
    process.exit(0)
  }

  log('1) Resolviendo fixture org…')
  const organizationId = await resolveFixtureOrg()

  log('   org:', organizationId)

  log('2) Creando cotización fixture emitida…')
  const quotationId = await createFixtureIssuedQuotation(organizationId)

  log('   quotation:', quotationId)

  const idempotencyKey = `q2c-smoke-${randomUUID().slice(0, 12)}`

  log('3) closeQuoteToCash(simple_invoice)…')

  const first = await closeQuoteToCash({
    quotationId,
    strategy: 'simple_invoice',
    subject,
    actor,
    idempotencyKey
  })

  log('   resultado:', JSON.stringify(first))

  log('4) REPLAY (mismo idempotencyKey) — debe devolver el mismo incomeId, sin segundo AR…')

  const replay = await closeQuoteToCash({
    quotationId,
    strategy: 'simple_invoice',
    subject,
    actor,
    idempotencyKey
  })

  log('   replay:', JSON.stringify(replay))

  log('5) Verificando downstream…')
  const downstreamOk = await verifyClose(quotationId, first.incomeId ?? '')

  log('6) Verificando reliability signals…')
  const signalsOk = await runSignals()

  const replayOk = replay.incomeId === first.incomeId && replay.replayed === true && first.finalState === 'converted'

  log('────────────────────────────────────────')
  log(`RESULTADO: close=${first.finalState} income=${first.incomeId} contract=${first.contractId}`)
  log(`  downstream OK: ${downstreamOk}`)
  log(`  replay idempotente (mismo incomeId, sin doble AR): ${replayOk}`)
  log(`  signals críticos en steady: ${signalsOk}`)
  log(`  SMOKE ${downstreamOk && replayOk && signalsOk ? 'PASS ✅' : 'FAIL ❌'}`)
  log(`  fixture: org=${organizationId} quotation=${quotationId} income=${first.incomeId} (append-only, no se borra)`)

  process.exit(downstreamOk && replayOk && signalsOk ? 0 : 1)
}

main().catch(err => {
  console.error('[q2c-smoke] FAIL:', err instanceof Error ? err.stack : err)
  process.exit(1)
})
