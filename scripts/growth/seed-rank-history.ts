/**
 * TASK-1655 Slice 4 — Runner de la semilla histórica de rank (DataForSEO Labs).
 *
 * Uso (proxy PG arriba + ADC vigente + creds DataForSEO en el proceso):
 *   DATAFORSEO_API_LOGIN=... DATAFORSEO_API_PASSWORD_SECRET_REF=greenhouse-dataforseo-api-password \
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/seed-rank-history.ts --target=seot-XXXX
 *
 * ⚠️ GASTA presupuesto de proveedor (poco: ~$0.02/keyword estimado, gate + fence del
 * chokepoint aplican igual). Idempotente: keywords ya sembradas no se vuelven a pagar.
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

process.env.GROWTH_SEO_ENABLED = 'true'

// ⚠️ Obligatorio ANTES de cualquier llamada cobrada: registra el spend recorder del
// runtime — sin él, el transporte LANZA a propósito (el gasto sin contabilizar es el
// modo de falla que ese guard existe para impedir).
import '../../src/lib/growth/seo/register-provider-spend'

import { closeGreenhousePostgres } from '../../src/lib/postgres/client'
import { seedRankHistory } from '../../src/lib/growth/seo/rank-history-seed'

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
    console.error('Uso: seed-rank-history.ts --target=seot-XXXX')
    process.exitCode = 1

    return
  }

  const result = await seedRankHistory(seoTargetId)

  if (!result.ok) {
    console.error(`[seed] FALLÓ: ${result.errorCode}`)
    process.exitCode = 1

    return
  }

  console.log(
    `[seed] ${result.seedRunId} · ${result.keywords} keywords → ${result.seeded} sembradas ` +
      `(${result.snapshotsWritten} snapshots), ${result.alreadySeeded} ya sembradas, ` +
      `${result.noHistory} sin historia del proveedor, ${result.budgetBlocked} bloqueadas por presupuesto, ` +
      `${result.providerErrors} errores · costo real $${result.costUsd.toFixed(4)}`
  )

  for (const outcome of result.outcomes) {
    if (outcome.status !== 'seeded' && outcome.status !== 'already_seeded') {
      console.log(`  - ${outcome.keyword}: ${outcome.status}${outcome.errorCode ? ` [${outcome.errorCode}]` : ''}`)
    }
  }
}

main()
  .catch(error => {
    console.error('[seed] FALLÓ:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
