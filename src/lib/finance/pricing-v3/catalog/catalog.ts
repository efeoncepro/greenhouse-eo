import Decimal from 'decimal.js'

import { PricingV3Error } from '../errors'
import { catalogSchema, changeSetSchema } from './contracts'
import type { Catalog, CatalogRecord } from './contracts'

const D = Decimal.clone({ precision: 80 })

export function validateCatalog(raw: unknown): Catalog {
  const catalog = catalogSchema.parse(raw)

  if (new Set(catalog.records.map(r => `${r.recordId}:${r.revision}`)).size !== catalog.records.length)
    throw new PricingV3Error('DUPLICATE_CATALOG_RECORD')
  if (
    new Set(catalog.currencies.map(c => c.code)).size !== catalog.currencies.length ||
    new Set(catalog.countries).size !== catalog.countries.length
  )
    throw new PricingV3Error('DUPLICATE_CATALOG_DIMENSION')
  const keys = new Set<string>()

  for (const row of catalog.records) {
    if (row.retiredAt && (row.retiredAt <= row.source.effectiveFrom || row.source.effectiveUntil >= row.retiredAt))
      throw new PricingV3Error('INVALID_RETIREMENT')
    const key = `${row.recordId}:${row.revision}`

    if (keys.has(key)) throw new PricingV3Error('DUPLICATE_CATALOG_RECORD')
    keys.add(key)
    const siblings = catalog.records.filter(r => r.recordId === row.recordId && r !== row)

    if (
      siblings.some(
        r =>
          r.kind !== row.kind ||
          (r.source.effectiveFrom <= row.source.effectiveUntil && row.source.effectiveFrom <= r.source.effectiveUntil)
      )
    )
      throw new PricingV3Error('OVERLAPPING_CATALOG_RECORD')
    if (
      row.kind === 'kit' &&
      new Set(row.value.requirements.map(r => r.requirementId)).size !== row.value.requirements.length
    )
      throw new PricingV3Error('DUPLICATE_KIT_REQUIREMENT')
    if (row.kind === 'cost' && new Set(row.value.components.map(c => c.coverage)).size !== row.value.components.length)
      throw new PricingV3Error('DUPLICATE_COST_COVERAGE')

    if (row.kind === 'price_rounding') {
      const currency = catalog.currencies.find(c => c.code === row.value.currency)

      if (!currency) throw new PricingV3Error('PRICE_ROUNDING_CURRENCY_NOT_REGISTERED')
      // A whole number of the currency's minimum unit; the kernel would refuse anything else as INVALID_PRICE_ROUNDING.
      if (!new D(row.value.multiple).mod(new D(10).pow(-currency.precision)).isZero())
        throw new PricingV3Error('INVALID_PRICE_ROUNDING_MULTIPLE')
    }
  }

  return catalog
}

export function activeRecords(catalog: Catalog, asOf: string) {
  return catalog.records.filter(r => r.source.effectiveFrom <= asOf && r.source.effectiveUntil >= asOf)
}

export function searchCatalog(catalog: Catalog, query = '', kind?: CatalogRecord['kind'], asOf?: string) {
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  const rows = asOf ? activeRecords(catalog, asOf) : catalog.records

  return rows.filter(r => (!kind || r.kind === kind) && normalize(JSON.stringify(r)).includes(normalize(query)))
}

const dayBefore = (date: string) => {
  const time = new Date(`${date}T00:00:00Z`)

  time.setUTCDate(time.getUTCDate() - 1)

  return time.toISOString().slice(0, 10)
}

/** Pure successor construction. The adapter checks hashes and exclusive file writes. */
export function changeCatalog(raw: unknown, changeRaw: unknown) {
  const current = validateCatalog(raw)
  const change = changeSetSchema.parse(changeRaw)

  if (change.nextVersion === current.version) throw new PricingV3Error('CATALOG_VERSION_REQUIRED')
  if (current.audit.some(a => a.changeId === change.changeId)) throw new PricingV3Error('CHANGE_ALREADY_APPLIED')
  if (new Set(change.changes.map(c => c.recordId)).size !== change.changes.length)
    throw new PricingV3Error('DUPLICATE_CHANGE')
  const next = structuredClone(current)

  if (change.dimensions) {
    if (
      change.dimensions.countriesAdd.some(c => next.countries.includes(c)) ||
      change.dimensions.currenciesAdd.some(c => next.currencies.some(old => old.code === c.code))
    )
      throw new PricingV3Error('CATALOG_DIMENSION_CONFLICT')
    next.countries.push(...change.dimensions.countriesAdd)
    next.currencies.push(...change.dimensions.currenciesAdd)
  }

  const differences = []

  for (const edit of change.changes) {
    const previous = next.records.filter(r => r.recordId === edit.recordId).sort((a, b) => b.revision - a.revision)[0]

    if (edit.operation === 'add' ? Boolean(previous) : !previous) throw new PricingV3Error('CATALOG_RECORD_CONFLICT')

    if (previous) {
      if (previous.retiredAt) throw new PricingV3Error('RETIRED_CATALOG_RECORD')
      if (
        edit.effectiveFrom < previous.source.effectiveFrom ||
        (edit.operation === 'retire' && edit.effectiveFrom === previous.source.effectiveFrom)
      )
        throw new PricingV3Error('EFFECTIVE_DATE_CONFLICT')

      if (edit.effectiveFrom === previous.source.effectiveFrom) {
        // Same-day correction belongs to a new version. Parent and audited before-value preserve history.
        next.records = next.records.filter(r => r !== previous)
      } else {
        const until = dayBefore(edit.effectiveFrom)

        if (until < previous.source.effectiveUntil) previous.source.effectiveUntil = until
      }
    }

    if (edit.operation === 'retire') {
      if (edit.record) throw new PricingV3Error('INVALID_CHANGE_RECORD')
      previous!.retiredAt = edit.effectiveFrom
    } else {
      const candidate = edit.record

      if (
        !candidate ||
        candidate.retiredAt ||
        candidate.recordId !== edit.recordId ||
        candidate.source.effectiveFrom !== edit.effectiveFrom ||
        candidate.revision !== (previous ? previous.revision + 1 : 1) ||
        (previous && previous.kind !== candidate.kind)
      )
        throw new PricingV3Error('INVALID_CHANGE_RECORD')

      const identity = (r: CatalogRecord) => {
        switch (r.kind) {
          case 'profile':
            return `${r.value.profileId}:${r.value.seniorityCode}`
          case 'cost':
            return `${r.value.profileId}:${r.value.seniorityCode}`
          case 'resource':
            return r.value.resourceId
          case 'kit':
            return r.value.kitId
          case 'allocation':
            return r.value.policyId
          case 'pricing':
            return `${r.value.profileId}:${r.value.tierCode}:${r.value.offerId}:${r.value.engagementCode}`
          case 'talent_factor':
            return `${r.value.country}:${r.value.referenceCountry}`
          case 'market_factor':
            return r.value.country
          case 'fx':
            return `${r.value.from}:${r.value.to}`
          case 'price_rounding':
            return `${r.value.currency}:${r.value.offerId ?? '*'}`
        }
      }

      if (previous && identity(previous) !== identity(candidate)) throw new PricingV3Error('CATALOG_IDENTITY_CONFLICT')
      if (previous && candidate.source.reference === previous.source.reference)
        throw new PricingV3Error('UPDATED_SOURCE_REFERENCE_REQUIRED')
      next.records.push(candidate)
    }

    // Capture the old value from the untouched parent, not the interval-adjusted successor.
    differences.push({
      operation: edit.operation,
      recordId: edit.recordId,
      effectiveFrom: edit.effectiveFrom,
      before: current.records.find(r => r.recordId === previous?.recordId && r.revision === previous?.revision) ?? null,
      after: edit.record ?? null
    })
  }

  next.version = change.nextVersion

  return {
    catalog: validateCatalog(next),
    change,
    differences,
    dimensionChanges: change.dimensions
      ? {
          before: { countries: current.countries, currencies: current.currencies },
          after: { countries: next.countries, currencies: next.currencies }
        }
      : null
  }
}
