/**
 * TASK-1775 — Runner del backfill histórico de dominio (DataForSEO Labs
 * `historical_rank_overview`, 10× el costo del Labs normal).
 *
 * Uso (proxy PG arriba + ADC vigente + creds DataForSEO en el proceso):
 *
 *   # DRY-RUN (default): imprime meses faltantes por sujeto y el costo estimado. NO gasta.
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/growth/backfill-domain-rank-history.ts --target=seot-XXXX
 *
 *   # Corrida real (GASTA): exige --apply explícito. Tope duro USD 5 salvo --max-usd.
 *   ... --target=seot-XXXX --apply [--domains=a.cl,b.cl] [--from=2021-01] [--to=2026-07] [--max-usd=8]
 *
 * ⚠️ El dato histórico es pasado inmutable: se compra UNA vez por sujeto. Meses ya presentes
 * se saltan (resumible tras una interrupción). Confirmar el tope en USD con el operador antes
 * de la primera corrida con --apply (TASK-1775 §Out-of-band coordination).
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

process.env.GROWTH_SEO_ENABLED = 'true'

// ⚠️ Obligatorio ANTES de cualquier llamada cobrada: registra el spend recorder del runtime —
// sin él, el transporte LANZA a propósito (contrato TASK-1300).
import '../../src/lib/growth/seo/register-provider-spend'

import { closeGreenhousePostgres } from '../../src/lib/postgres/client'
import {
  backfillDomainRankHistory,
  previewDomainRankHistoryBackfill
} from '../../src/lib/growth/seo/domain-overview/history-backfill'

const args = new Map<string, string>()

for (const raw of process.argv.slice(2)) {
  const match = raw.match(/^--([^=]+)(?:=(.*))?$/)

  if (match) {
    args.set(match[1], match[2] ?? 'true')
  }
}

const main = async () => {
  const seoTargetId = args.get('target')

  if (!seoTargetId) {
    console.error(
      'Uso: backfill-domain-rank-history.ts --target=seot-XXXX [--apply] [--domains=a.cl,b.cl] [--from=YYYY-MM] [--to=YYYY-MM] [--max-usd=N]'
    )
    process.exitCode = 1

    return
  }

  const apply = args.get('apply') === 'true'

  const domains = (args.get('domains') ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  const maxUsdRaw = args.get('max-usd')
  const maxUsd = maxUsdRaw ? Number(maxUsdRaw) : undefined

  if (maxUsdRaw && (!Number.isFinite(maxUsd) || (maxUsd as number) <= 0)) {
    console.error('[backfill] --max-usd debe ser un número > 0')
    process.exitCode = 1

    return
  }

  const input = {
    seoTargetId,
    domains: domains.length > 0 ? domains : undefined,
    fromMonth: args.get('from'),
    toMonth: args.get('to'),
    maxUsd
  }

  const plan = await previewDomainRankHistoryBackfill(input)

  if (!plan.ok) {
    console.error(`[backfill] FALLÓ el preview: ${plan.errorCode}`)
    process.exitCode = 1

    return
  }

  console.log(
    `[backfill] target ${plan.seoTargetId} · mercado ${plan.locationCode}/${plan.languageCode} · ` +
      `rango ${plan.fromMonth} → ${plan.toMonth} · tope USD ${plan.maxUsd}`
  )

  for (const subject of plan.subjects) {
    const pending = subject.pendingMonths.length

    console.log(
      `  - ${subject.domain}: ${pending} mes(es) pendiente(s)` +
        (pending > 0
          ? ` (${subject.pendingMonths[0]} → ${subject.pendingMonths[pending - 1]}) · ~USD ${subject.estimatedCostUsd}`
          : ' · nada que comprar')
    )
  }

  console.log(`[backfill] costo estimado total: USD ${plan.totalEstimatedCostUsd}`)

  if (plan.exceedsCap) {
    console.log(
      `[backfill] ⚠️ el estimado supera el tope (USD ${plan.maxUsd}): la corrida se recortará; ` +
        'sube --max-usd sólo con autorización del operador'
    )
  }

  if (!apply) {
    console.log('[backfill] DRY-RUN — no se gastó nada. Repite con --apply para comprar.')

    return
  }

  const result = await backfillDomainRankHistory(input)

  if (!result.ok) {
    console.error(`[backfill] FALLÓ: ${result.errorCode}`)
    process.exitCode = 1

    return
  }

  console.log(
    `[backfill] ${result.subjects} sujeto(s) → ${result.seeded} sembrados ` +
      `(${result.snapshotsWritten} filas), ${result.alreadySeeded} ya presentes, ` +
      `${result.noHistory} sin historia del proveedor, ${result.capBlocked} cortados por tope, ` +
      `${result.budgetBlocked} bloqueados por presupuesto, ${result.providerErrors} errores · ` +
      `costo real USD ${result.costUsd.toFixed(4)} (tope ${result.maxUsd})`
  )

  for (const outcome of result.outcomes) {
    if (outcome.status !== 'seeded' && outcome.status !== 'already_seeded') {
      console.log(`  - ${outcome.domain}: ${outcome.status}${outcome.errorCode ? ` [${outcome.errorCode}]` : ''}`)
    }
  }
}

main()
  .catch(error => {
    console.error('[backfill] FALLÓ:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
