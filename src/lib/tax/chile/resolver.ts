import 'server-only'

import { loadChileTaxCodes } from './catalog'

import type { ChileTaxCodeId, TaxCodeLookupContext, TaxCodeRecord } from './types'

export class ChileTaxCodeNotFoundError extends Error {
  constructor(
    public readonly taxCode: string,
    public readonly context: TaxCodeLookupContext
  ) {
    super(
      `Chile tax code "${taxCode}" not found for space "${context.spaceId ?? 'global'}" at "${
        context.at ? new Date(context.at).toISOString() : 'now'
      }".`
    )
    this.name = 'ChileTaxCodeNotFoundError'
  }
}

/**
 * Resolves a Chile tax code by stable id (e.g. `cl_vat_19`) applying tenant
 * override precedence and effective-dating. Tenant-scoped rows (matching
 * `spaceId`) shadow the global catalog; otherwise the global row is returned.
 *
 * Throws `ChileTaxCodeNotFoundError` when the code does not apply to the
 * (space, date) pair. Callers persisting snapshots should treat this as a
 * hard error — downstream aggregates must not fall back to a hardcoded rate.
 */
export async function resolveChileTaxCode(
  taxCode: ChileTaxCodeId | string,
  context: TaxCodeLookupContext = {}
): Promise<TaxCodeRecord> {
  const records = await loadChileTaxCodes(context)
  const match = records.find(record => record.taxCode === taxCode)

  if (!match) {
    throw new ChileTaxCodeNotFoundError(taxCode, context)
  }

  return match
}

export async function tryResolveChileTaxCode(
  taxCode: ChileTaxCodeId | string,
  context: TaxCodeLookupContext = {}
): Promise<TaxCodeRecord | null> {
  try {
    return await resolveChileTaxCode(taxCode, context)
  } catch (error) {
    if (error instanceof ChileTaxCodeNotFoundError) return null
    throw error
  }
}
