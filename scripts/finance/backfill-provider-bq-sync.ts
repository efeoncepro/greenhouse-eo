#!/usr/bin/env tsx
/**
 * TASK-771 Slice 5 — One-shot backfill de la proyección provider_bq_sync.
 *
 * Recovery del incidente 2026-05-03: 3 suppliers (figma-inc, microsoft-inc,
 * notion-inc) quedaron creados en Postgres pero el sync inline a BigQuery
 * falló silenciosamente, dejando greenhouse.providers BQ y
 * greenhouse.fin_suppliers.provider_id BQ desactualizados. AI Tooling
 * (`src/lib/ai-tools/service.ts` — 4 LEFT JOINs) los ve stale.
 *
 * Slice 2 ya tiene la projection canónica `provider_bq_sync` que drena vía
 * `ops-reactive-finance` cada 5 min. Este script invoca la projection
 * directamente para los suppliers afectados (one-shot recovery), sin
 * depender de timing de schedulers ni de re-emisión de outbox events.
 *
 * Idempotente: el helper `syncProviderFromFinanceSupplier` hace MERGE BQ
 * por provider_id + UPDATE filtrado por COALESCE diff. Re-correr el script
 * es safe.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/finance/backfill-provider-bq-sync.ts \
 *     [--supplier-ids=figma-inc,microsoft-inc,notion-inc] [--dry-run]
 *
 *   Sin --supplier-ids, usa el set canónico del incidente 2026-05-03.
 */

import process from 'node:process'

import { getFinanceSupplierFromPostgres } from '@/lib/finance/postgres-store'
import { syncProviderFromFinanceSupplier } from '@/lib/providers/canonical'

const KNOWN_AFFECTED_SUPPLIERS = ['figma-inc', 'microsoft-inc', 'notion-inc']

interface CliOptions {
  supplierIds: string[]
  dryRun: boolean
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const idsArg = args.find(a => a.startsWith('--supplier-ids='))

  const supplierIds = idsArg
    ? idsArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)
    : KNOWN_AFFECTED_SUPPLIERS

  return { supplierIds, dryRun }
}

interface SupplierResult {
  supplierId: string
  status: 'synced' | 'skipped_not_found' | 'skipped_no_provider' | 'failed'
  providerId?: string | null
  providerName?: string | null
  error?: string
}

const processOne = async (supplierId: string, dryRun: boolean): Promise<SupplierResult> => {
  const supplier = await getFinanceSupplierFromPostgres(supplierId)

  if (!supplier) {
    return { supplierId, status: 'skipped_not_found' }
  }

  if (dryRun) {
    return {
      supplierId,
      status: 'synced',
      providerId: supplier.providerId,
      providerName: supplier.tradeName ?? supplier.legalName
    }
  }

  try {
    const result = await syncProviderFromFinanceSupplier({
      supplierId: supplier.supplierId,
      providerId: supplier.providerId,
      legalName: supplier.legalName,
      tradeName: supplier.tradeName,
      website: supplier.website,
      isActive: supplier.isActive
    })

    if (!result) {
      return { supplierId, status: 'skipped_no_provider' }
    }

    return {
      supplierId,
      status: 'synced',
      providerId: result.providerId,
      providerName: result.providerName
    }
  } catch (err) {
    return {
      supplierId,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

const main = async () => {
  const { supplierIds, dryRun } = parseArgs()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('TASK-771 Slice 5 — backfill provider_bq_sync (one-shot)')
  console.log(`  Mode:        ${dryRun ? 'DRY-RUN (no BQ writes)' : 'LIVE'}`)
  console.log(`  Supplier IDs: ${supplierIds.join(', ')}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const results: SupplierResult[] = []

  for (const supplierId of supplierIds) {
    process.stdout.write(`  → ${supplierId.padEnd(24)} `)
    const result = await processOne(supplierId, dryRun)

    results.push(result)

    if (result.status === 'synced') {
      console.log(`OK provider=${result.providerId} (${result.providerName})`)
    } else if (result.status === 'skipped_not_found') {
      console.log('SKIP: not found in PG')
    } else if (result.status === 'skipped_no_provider') {
      console.log('SKIP: no resolvable provider')
    } else {
      console.log(`FAIL: ${result.error}`)
    }
  }

  const synced = results.filter(r => r.status === 'synced').length
  const skipped = results.filter(r => r.status.startsWith('skipped')).length
  const failed = results.filter(r => r.status === 'failed').length

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Summary: synced=${synced}, skipped=${skipped}, failed=${failed}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
