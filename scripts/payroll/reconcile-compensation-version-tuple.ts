import 'server-only'

/**
 * TASK-958 Slice 1 — reconcile a drifting compensation_version tuple to match the
 * member's canonical classification, GUARANTEED payroll-neutral.
 *
 * Problem: `members.contract_type` (validated 3-way CHECK) and
 * `compensation_versions.contract_type` (CHECK that was NOT VALID → grandfathered)
 * can diverge. Caso fundacional: Melkin Hernández (contractor internacional de
 * Nicaragua vía Deel) — member row `(contractor, international, deel)` correcto,
 * pero su comp version vigente `(indefinido, international)` no matchea ningún
 * combo válido (`indefinido` exige `chile`).
 *
 * Payroll-safety contract (operator hard rule "si la toca no rompe payroll"):
 * for each drifting current comp version, this script computes the member's
 * `buildPayrollEntry` with the CURRENT tuple and with the TARGET tuple, and only
 * applies the UPDATE if every MONETARY field is byte-identical. If any differs,
 * it ABORTS without mutating. Classification LABELS (contractTypeSnapshot,
 * payRegime, deelContractId) are expected to change and are excluded from the
 * monetary comparison.
 *
 * Why Melkin is payroll-neutral: he routes via `payroll_via='deel'` → Deel
 * passthrough; `contract_type` only enters the calc via
 * `allowsRemoteAllowance(contract_type)`, and both `indefinido` and `contractor`
 * are `true` → identical `deelGrossTotal`. The assertion proves it empirically.
 *
 * Guard: only reconciles when the member's own `(contract_type, pay_regime,
 * payroll_via)` tuple is canonical (we reconcile the comp version TO match the
 * member; the member must be the source of truth). Aborts otherwise.
 *
 * Usage:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/payroll/reconcile-compensation-version-tuple.ts --member-id=<id>          # dry-run
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/payroll/reconcile-compensation-version-tuple.ts --member-id=<id> --apply  # execute
 */

import { buildPayrollEntry } from '@/lib/payroll/calculate-payroll'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { CONTRACT_DERIVATIONS, normalizeContractType, type ContractType } from '@/types/hr-contracts'
import type { BonusProrationConfig, CompensationVersion, PayRegime, PayrollEntry } from '@/types/payroll'

// Canonical valid tuples (mirror del CHECK members_contract_payroll_tuple_check).
const VALID_MEMBER_TUPLE = (ct: string, pr: string, via: string): boolean =>
  (['indefinido', 'plazo_fijo', 'honorarios'].includes(ct) && pr === 'chile' && via === 'internal') ||
  (['contractor', 'eor'].includes(ct) && pr === 'international' && via === 'deel') ||
  (ct === 'international_internal' && pr === 'international' && via === 'internal')

// Campos MONETARIOS del PayrollEntry — la aserción payroll-neutral compara SOLO estos.
// Las etiquetas de clasificación (contractTypeSnapshot, payRegime, deelContractId) cambian
// a propósito y se excluyen.
const MONETARY_FIELDS: ReadonlyArray<keyof PayrollEntry> = [
  'grossTotal',
  'netTotalCalculated',
  'bonusOtdAmount',
  'bonusRpaAmount',
  'chileAfpAmount',
  'chileAfpCotizacionAmount',
  'chileAfpComisionAmount',
  'chileGratificacionLegalAmount',
  'chileColacionAmount',
  'chileMovilizacionAmount',
  'chileHealthAmount',
  'chileHealthObligatoriaAmount',
  'chileHealthVoluntariaAmount',
  'chileEmployerSisAmount',
  'chileEmployerCesantiaAmount',
  'chileEmployerMutualAmount',
  'chileEmployerTotalCost',
  'chileTaxableBase',
  'chileTaxAmount',
  'chileApvAmount',
  'chileUnemploymentAmount',
  'chileTotalDeductions',
  'siiRetentionAmount'
]

// bonusConfig irrelevante para la comparación (kpi=null → bonus=0); literal mínimo válido.
const NEUTRAL_BONUS_CONFIG: BonusProrationConfig = {
  otdThreshold: 0,
  otdFloor: 0,
  rpaThreshold: 0,
  rpaFullPayoutThreshold: 0,
  rpaSoftBandEnd: 0,
  rpaSoftBandFloorFactor: 0
}

type MemberRow = {
  member_id: string
  display_name: string | null
  contract_type: string | null
  pay_regime: string | null
  payroll_via: string | null
}

type CompRow = {
  version_id: string
  version: number
  contract_type: string | null
  pay_regime: string | null
  base_salary: string | number | null
  remote_allowance: string | number | null
  colacion_amount: string | number | null
  movilizacion_amount: string | number | null
  fixed_bonus_amount: string | number | null
  bonus_otd_max: string | number | null
  bonus_rpa_max: string | number | null
  gratificacion_legal_mode: string | null
  afp_name: string | null
  afp_rate: string | number | null
  afp_cotizacion_rate: string | number | null
  afp_comision_rate: string | number | null
  health_system: string | null
  health_plan_uf: string | number | null
  unemployment_rate: string | number | null
  has_apv: boolean | null
  apv_amount: string | number | null
  currency: string | null
  effective_from: string | Date | null
  effective_to: string | Date | null
  is_current: boolean | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const memberArg = args.find(a => a.startsWith('--member-id='))

  return {
    memberId: memberArg ? memberArg.slice('--member-id='.length).trim() : '',
    apply: args.includes('--apply')
  }
}

// Construye un CompensationVersion (shape que buildPayrollEntry consume) desde la fila,
// con un override opcional de la tupla (para el cómputo TARGET).
const toCompensationVersion = (
  row: CompRow,
  memberPayrollVia: string | null,
  override?: { contractType: ContractType; payRegime: PayRegime }
): CompensationVersion =>
  ({
    versionId: row.version_id,
    version: row.version,
    payRegime: override?.payRegime ?? ((row.pay_regime === 'international' ? 'international' : 'chile') as PayRegime),
    currency: (row.currency ?? 'CLP') as CompensationVersion['currency'],
    baseSalary: toNum(row.base_salary),
    remoteAllowance: toNum(row.remote_allowance),
    colacionAmount: toNum(row.colacion_amount),
    movilizacionAmount: toNum(row.movilizacion_amount),
    fixedBonusAmount: toNum(row.fixed_bonus_amount),
    bonusOtdMax: toNum(row.bonus_otd_max),
    bonusRpaMax: toNum(row.bonus_rpa_max),
    gratificacionLegalMode: (row.gratificacion_legal_mode ?? 'ninguna') as CompensationVersion['gratificacionLegalMode'],
    afpName: row.afp_name,
    afpRate: toNum(row.afp_rate),
    afpCotizacionRate: toNum(row.afp_cotizacion_rate),
    afpComisionRate: toNum(row.afp_comision_rate),
    healthSystem: (row.health_system ?? 'fonasa') as CompensationVersion['healthSystem'],
    healthPlanUf: toNum(row.health_plan_uf),
    unemploymentRate: toNum(row.unemployment_rate),
    hasApv: Boolean(row.has_apv),
    apvAmount: toNum(row.apv_amount),
    contractType: override?.contractType ?? normalizeContractType(row.contract_type),
    payrollVia: memberPayrollVia === 'deel' ? 'deel' : 'internal'
  }) as CompensationVersion

const monetarySnapshot = (entry: PayrollEntry): Record<string, unknown> => {
  const out: Record<string, unknown> = {}

  const record = entry as unknown as Record<string, unknown>

  for (const f of MONETARY_FIELDS) out[f as string] = record[f as string] ?? null

  return out
}

const main = async () => {
  const { memberId, apply } = parseArgs()

  if (!memberId) {
    console.error('ERROR: --member-id=<id> is required.')
    process.exit(1)
  }

  console.log(`\n=== TASK-958 compensation_version tuple reconcile — member=${memberId} mode=${apply ? 'APPLY' : 'DRY-RUN'} ===\n`)

  // 1. Member (source of truth). Solo reconciliamos si su tupla es canónica.
  const members = await runGreenhousePostgresQuery<MemberRow>(
    `SELECT member_id, display_name, contract_type, pay_regime, payroll_via
     FROM greenhouse_core.members WHERE member_id = $1`,
    [memberId]
  )

  const member = members[0]

  if (!member) {
    console.error(`ABORT: member ${memberId} not found.`)
    process.exit(1)
  }

  const memberCt = member.contract_type ?? ''
  const memberPr = member.pay_regime ?? ''
  const memberVia = member.payroll_via ?? ''

  if (!VALID_MEMBER_TUPLE(memberCt, memberPr, memberVia)) {
    console.error(
      `ABORT: member tuple (${memberCt}, ${memberPr}, ${memberVia}) is NOT canonical. ` +
        `This script reconciles the comp version TO match the member; fix the member first.`
    )
    process.exit(1)
  }

  // Target canónico para la comp version: matchea la clasificación del member.
  const targetContractType = normalizeContractType(memberCt)
  const targetPayRegime = CONTRACT_DERIVATIONS[targetContractType].payRegime

  console.log(`Member: ${member.display_name} · tuple (${memberCt}, ${memberPr}, ${memberVia}) ✓ canonical`)
  console.log(`Target comp-version tuple: (${targetContractType}, ${targetPayRegime})\n`)

  // 2. Comp versions VIGENTES con tupla que NO matchea el target.
  const comps = await runGreenhousePostgresQuery<CompRow>(
    `SELECT version_id, version, contract_type, pay_regime, base_salary, remote_allowance,
            colacion_amount, movilizacion_amount, fixed_bonus_amount, bonus_otd_max, bonus_rpa_max,
            gratificacion_legal_mode, afp_name, afp_rate, afp_cotizacion_rate, afp_comision_rate,
            health_system, health_plan_uf, unemployment_rate, has_apv, apv_amount, currency,
            effective_from::text AS effective_from, effective_to::text AS effective_to, is_current
     FROM greenhouse_payroll.compensation_versions
     WHERE member_id = $1
       AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       AND (contract_type IS DISTINCT FROM $2 OR pay_regime IS DISTINCT FROM $3)
     ORDER BY version`,
    [memberId, targetContractType, targetPayRegime]
  )

  if (comps.length === 0) {
    console.log('No hay comp versions vigentes con tupla en drift. Nada que reconciliar (idempotente no-op).\n')
    process.exit(0)
  }

  const periodDate = new Date().toISOString().slice(0, 10)
  const toReconcile: number[] = []

  for (const row of comps) {
    console.log(`-- comp v${row.version}: (${row.contract_type}, ${row.pay_regime}) → (${targetContractType}, ${targetPayRegime})`)

    // 3. PAYROLL-SAFE: buildPayrollEntry con tupla ACTUAL vs TARGET. Mismas entradas
    //    (kpi=null, attendance=null, bonusConfig neutral) — solo difiere la tupla.
    const entryBefore = await buildPayrollEntry({
      periodId: 'task958-reconcile-dryrun',
      periodDate,
      compensation: toCompensationVersion(row, memberVia),
      ufValue: null,
      bonusConfig: NEUTRAL_BONUS_CONFIG,
      kpi: null,
      attendance: null
    })

    const entryAfter = await buildPayrollEntry({
      periodId: 'task958-reconcile-dryrun',
      periodDate,
      compensation: toCompensationVersion(row, memberVia, {
        contractType: targetContractType,
        payRegime: targetPayRegime
      }),
      ufValue: null,
      bonusConfig: NEUTRAL_BONUS_CONFIG,
      kpi: null,
      attendance: null
    })

    const before = JSON.stringify(monetarySnapshot(entryBefore))
    const after = JSON.stringify(monetarySnapshot(entryAfter))

    if (before !== after) {
      console.error('   ✗ NOT payroll-neutral — los campos monetarios difieren. ABORT (no se muta).')
      console.error('   before:', before)
      console.error('   after: ', after)
      process.exit(1)
    }

    console.log('   ✓ payroll-neutral (campos monetarios idénticos before/after)')
    toReconcile.push(row.version)
  }

  if (!apply) {
    console.log(`\nDRY-RUN — reconciliaría ${toReconcile.length} comp version(es): v${toReconcile.join(', v')}. Re-run con --apply.\n`)
    process.exit(0)
  }

  // 4. APPLY — UPDATE atómico.
  const updated = await withGreenhousePostgresTransaction(async client => {
    const r = await client.query<{ version_id: string; version: number }>(
      `UPDATE greenhouse_payroll.compensation_versions
       SET contract_type = $2, pay_regime = $3
       WHERE member_id = $1
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
         AND (contract_type IS DISTINCT FROM $2 OR pay_regime IS DISTINCT FROM $3)
       RETURNING version_id, version`,
      [memberId, targetContractType, targetPayRegime]
    )

    return r.rows
  })

  console.log(`\nRECONCILED ${updated.length} comp version(es): v${updated.map(r => r.version).join(', v')}`)

  const after = await runGreenhousePostgresQuery<CompRow>(
    `SELECT version, contract_type, pay_regime, is_current FROM greenhouse_payroll.compensation_versions
     WHERE member_id = $1 ORDER BY version`,
    [memberId]
  )

  console.log('\nAFTER:')
  for (const r of after) console.log(`  v${r.version}: (${r.contract_type}, ${r.pay_regime}) current=${r.is_current}`)
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERR:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
