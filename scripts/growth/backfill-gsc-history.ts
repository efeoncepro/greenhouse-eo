/**
 * TASK-1655 — Runner del backfill histórico GSC → BigQuery.
 *
 * Uso (proxy PG arriba con `pnpm pg:connect` + ADC vigente):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-gsc-history.ts \
 *     --org=org-XXXX --months=16 [--dry-run]
 *
 * Sin `--org` recorre TODAS las orgs con conexión GSC activa (la decisión del operador
 * 2026-08-07: todas las orgs con SEO). `--dry-run` muestra el plan (rango + días ya
 * presentes en BQ) sin llamar a la API ni escribir.
 *
 * El trabajo real vive en el command del dominio (`backfillGscHistory`); este archivo es
 * solo transporte de operador — parsea args, resuelve el rango y reporta progreso.
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

// El flag gatea los readers del dominio; el backfill es una operación de operador y corre
// aunque el módulo esté OFF en este entorno — se habilita explícito para el proceso.
process.env.GROWTH_SEO_ENABLED = 'true'

import { closeGreenhousePostgres } from '../../src/lib/postgres/client'
import { backfillGscHistory } from '../../src/lib/growth/seo/gsc-backfill'
import { listGscHistoryDates } from '../../src/lib/growth/seo/gsc-history-bq-mirror'
import { listActiveSearchConsoleOrganizations } from '../../src/lib/growth/search-console'

const args = new Map<string, string>()

for (const raw of process.argv.slice(2)) {
  const match = raw.match(/^--([^=]+)(?:=(.*))?$/)

  if (match) {
    args.set(match[1], match[2] ?? 'true')
  }
}

/** GSC retiene 16 meses; pedir más solo produce días `empty`. */
const MAX_MONTHS = 16

const shiftIsoDate = (isoDate: string, deltaDays: number): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  date.setUTCDate(date.getUTCDate() + deltaDays)

  return date.toISOString().slice(0, 10)
}

const main = async () => {
  const months = Math.min(MAX_MONTHS, Math.max(1, Number.parseInt(args.get('months') ?? '16', 10) || 16))
  const dryRun = args.get('dry-run') === 'true'
  const onlyOrg = args.get('org') ?? null

  const activeOrgs = await listActiveSearchConsoleOrganizations()
  const orgs = onlyOrg ? activeOrgs.filter(org => org.organizationId === onlyOrg) : activeOrgs

  if (orgs.length === 0) {
    console.error(
      onlyOrg
        ? `[backfill] la org ${onlyOrg} no tiene conexión GSC activa.`
        : '[backfill] ninguna org con conexión GSC activa.'
    )
    process.exitCode = 1

    return
  }

  // GSC no publica D-1: cerrar el rango en D-3 evita una cola de días `empty` que el
  // batch diario va a rellenar solo cuando Google publique.
  const today = new Date().toISOString().slice(0, 10)
  const toDate = shiftIsoDate(today, -3)
  const fromDate = shiftIsoDate(toDate, -Math.round(months * 30.4))

  console.log(`[backfill] rango ${fromDate} → ${toDate} (~${months} meses) · orgs: ${orgs.length} · dryRun=${dryRun}`)

  for (const org of orgs) {
    const existing = await listGscHistoryDates(org.organizationId)

    console.log(`\n[backfill] ${org.organizationId} (${org.siteUrl}) — ${existing.size} días ya en BQ`)

    if (dryRun) {
      continue
    }

    let processed = 0

    const result = await backfillGscHistory(org.organizationId, {
      fromDate,
      toDate,
      onProgress: outcome => {
        processed += 1

        // Log compacto: una línea cada 30 días o ante cualquier anomalía.
        if (processed % 30 === 0 || outcome.status === 'degraded' || outcome.status === 'failed') {
          console.log(
            `  [${processed}] ${outcome.captureDate} → ${outcome.status}` +
              (outcome.rowsWritten > 0 ? ` (${outcome.rowsWritten} filas)` : '') +
              (outcome.errorCode ? ` [${outcome.errorCode}]` : '')
          )
        }
      }
    })

    if (!result.ok) {
      console.error(`  ✗ ${org.organizationId}: ${result.errorCode}`)
      process.exitCode = 1
      continue
    }

    console.log(
      `  ✓ ${result.days} días: ${result.materialized} materializados (${result.rowsWritten} filas), ` +
        `${result.skippedExisting} ya presentes, ${result.empty} sin datos, ` +
        `${result.degraded} degradados, ${result.failed} fallidos`
    )

    if (result.degraded + result.failed > 0) {
      // El backfill es resumible: re-correrlo reintenta SOLO lo que faltó.
      console.log('  ⚠ re-corre el script para reintentar los días degradados/fallidos.')
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
