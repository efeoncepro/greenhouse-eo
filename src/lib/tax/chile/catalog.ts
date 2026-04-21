import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'

import type {
  TaxCodeKind,
  TaxCodeLookupContext,
  TaxCodeRecord,
  TaxRecoverability
} from './types'

const CACHE_TTL_MS = 5 * 60 * 1000

type CacheKey = string

interface CacheEntry {
  loadedAt: number
  rows: TaxCodeRecord[]
}

const cache = new Map<CacheKey, CacheEntry>()

function resolveAt(at?: Date | string): Date {
  if (!at) return new Date()
  if (at instanceof Date) return at

  return new Date(at)
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function cacheKeyFor(jurisdiction: string, spaceId: string | null, asOf: string): CacheKey {
  return `${jurisdiction}|${spaceId ?? 'global'}|${asOf}`
}

function normalizeRate(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

type TaxCodeRow = {
  id: string
  tax_code: string
  jurisdiction: string
  kind: string
  rate: string | number | null
  recoverability: string
  label_es: string
  label_en: string | null
  description: string | null
  effective_from: Date | string
  effective_to: Date | string | null
  space_id: string | null
  metadata: unknown
}

function mapRow(row: TaxCodeRow): TaxCodeRecord {
  const effectiveFrom = row.effective_from instanceof Date ? toIsoDate(row.effective_from) : String(row.effective_from)

  const effectiveTo = row.effective_to
    ? row.effective_to instanceof Date
      ? toIsoDate(row.effective_to)
      : String(row.effective_to)
    : null

  return {
    id: row.id,
    taxCode: row.tax_code,
    jurisdiction: row.jurisdiction,
    kind: row.kind as TaxCodeKind,
    rate: normalizeRate(row.rate),
    recoverability: row.recoverability as TaxRecoverability,
    labelEs: row.label_es,
    labelEn: row.label_en,
    description: row.description,
    effectiveFrom,
    effectiveTo,
    spaceId: row.space_id,
    metadata: normalizeMetadata(row.metadata)
  }
}

/**
 * Loads all tax codes applicable to the given jurisdiction, scoped by tenant
 * (`spaceId`) when provided and filtered by effective window (`at`).
 *
 * Results are cached per `(jurisdiction, spaceId, as-of date)` for 5 minutes.
 * Pass `bypassCache: true` in tests or after a catalog write.
 */
export async function loadChileTaxCodes(
  context: TaxCodeLookupContext = {},
  options: { bypassCache?: boolean } = {}
): Promise<TaxCodeRecord[]> {
  const jurisdiction = 'CL'
  const spaceId = context.spaceId ?? null
  const at = resolveAt(context.at)
  const asOf = toIsoDate(at)
  const key = cacheKeyFor(jurisdiction, spaceId, asOf)

  if (!options.bypassCache) {
    const hit = cache.get(key)

    if (hit && Date.now() - hit.loadedAt < CACHE_TTL_MS) {
      return hit.rows
    }
  }

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_finance.tax_codes')
    .selectAll()
    .where('jurisdiction', '=', jurisdiction)
    .where(eb =>
      eb.or([eb('space_id', 'is', null), eb('space_id', '=', spaceId ?? sql<string>`NULL`)])
    )
    .where('effective_from', '<=', sql<Date>`${asOf}::date`)
    .where(eb =>
      eb.or([eb('effective_to', 'is', null), eb('effective_to', '>', sql<Date>`${asOf}::date`)])
    )
    .orderBy('tax_code', 'asc')
    .orderBy('space_id', 'desc')
    .orderBy('effective_from', 'desc')
    .execute()

  const mapped = (rows as TaxCodeRow[]).map(mapRow)

  const dedupedByCode = new Map<string, TaxCodeRecord>()

  for (const record of mapped) {
    const current = dedupedByCode.get(record.taxCode)

    if (!current) {
      dedupedByCode.set(record.taxCode, record)
      continue
    }

    const currentSpaceScore = current.spaceId ? 1 : 0
    const candidateSpaceScore = record.spaceId ? 1 : 0

    if (candidateSpaceScore > currentSpaceScore) {
      dedupedByCode.set(record.taxCode, record)
      continue
    }

    if (candidateSpaceScore === currentSpaceScore && record.effectiveFrom > current.effectiveFrom) {
      dedupedByCode.set(record.taxCode, record)
    }
  }

  const result = Array.from(dedupedByCode.values()).sort((a, b) =>
    a.taxCode.localeCompare(b.taxCode)
  )

  cache.set(key, { loadedAt: Date.now(), rows: result })

  return result
}

export function clearChileTaxCodesCache(): void {
  cache.clear()
}
