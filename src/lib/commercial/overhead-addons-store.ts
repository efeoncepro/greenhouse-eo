import type { PoolClient } from 'pg'
import type { Selectable } from 'kysely'

import { getDb, query, withTransaction } from '@/lib/db'
import type { DB } from '@/types/db'

import {
  publishOverheadAddonCreated,
  publishOverheadAddonDeactivated,
  publishOverheadAddonReactivated,
  publishOverheadAddonUpdated
} from './overhead-addon-events'
import type { OverheadAddonSeedRow } from './overhead-addons-seed'

type OverheadAddonRow = Selectable<DB['greenhouse_commercial.overhead_addons']>

export interface OverheadAddonEntry {
  addonId: string
  addonSku: string
  category: string
  addonName: string
  addonType: string
  unit: string | null
  costInternalUsd: number
  marginPct: number | null
  finalPriceUsd: number | null
  finalPricePct: number | null
  pctMin: number | null
  pctMax: number | null
  minimumAmountUsd: number | null
  applicableTo: string[]
  description: string | null
  conditions: string | null
  visibleToClient: boolean
  active: boolean
  effectiveFrom: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ListOverheadAddonsInput {
  applicableTo?: string | null
  visibleToClient?: boolean | null
  active?: boolean | null
}

export interface ResolveApplicableAddonsInput {
  businessLine?: string | null
  staffingModel?: string | null
  visibleToClient?: boolean | null
}

export interface UpsertOverheadAddonResult {
  addonId: string
  addonSku: string
  created: boolean
  changed: boolean
}

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value == null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toStringDate = (value: string | Date | null | undefined) => {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const toStringTimestamp = (value: string | Date | null | undefined) => {
  if (!value) return ''
  if (typeof value === 'string') return value

  return value.toISOString()
}

const arraysEqual = (left: string[] | null | undefined, right: string[] | null | undefined) => {
  const a = [...(left || [])].sort()
  const b = [...(right || [])].sort()

  if (a.length !== b.length) return false

  return a.every((value, index) => value === b[index])
}

const numberChanged = (left: number | null | undefined, right: number | null | undefined, tolerance = 0.0001) => {
  const normalizedLeft = left ?? 0
  const normalizedRight = right ?? 0

  return Math.abs(normalizedLeft - normalizedRight) > tolerance
}

const mapAddon = (row: OverheadAddonRow): OverheadAddonEntry => ({
  addonId: row.addon_id,
  addonSku: row.addon_sku,
  category: row.category,
  addonName: row.addon_name,
  addonType: row.addon_type,
  unit: row.unit,
  costInternalUsd: toNumber(row.cost_internal_usd) ?? 0,
  marginPct: toNumber(row.margin_pct),
  finalPriceUsd: toNumber(row.final_price_usd),
  finalPricePct: toNumber(row.final_price_pct),
  pctMin: toNumber(row.pct_min),
  pctMax: toNumber(row.pct_max),
  minimumAmountUsd: toNumber(row.minimum_amount_usd),
  applicableTo: row.applicable_to || [],
  description: row.description,
  conditions: row.conditions,
  visibleToClient: row.visible_to_client,
  active: row.active,
  effectiveFrom: toStringDate(row.effective_from),
  notes: row.notes,
  createdAt: toStringTimestamp(row.created_at),
  updatedAt: toStringTimestamp(row.updated_at)
})

export const listOverheadAddons = async (input: ListOverheadAddonsInput = {}): Promise<OverheadAddonEntry[]> => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_commercial.overhead_addons')
    .selectAll()
    .orderBy('addon_sku', 'asc')
    .execute()

  return rows
    .map(mapAddon)
    .filter(entry => (input.active === false ? true : entry.active))
    .filter(entry => (input.visibleToClient == null ? true : entry.visibleToClient === input.visibleToClient))
    .filter(entry => (input.applicableTo ? entry.applicableTo.includes(input.applicableTo) : true))
}

export const getOverheadAddonBySku = async (addonSku: string): Promise<OverheadAddonEntry | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.overhead_addons')
    .selectAll()
    .where('addon_sku', '=', addonSku)
    .executeTakeFirst()

  return row ? mapAddon(row) : null
}

export const resolveApplicableAddons = async (input: ResolveApplicableAddonsInput): Promise<OverheadAddonEntry[]> => {
  const tags = new Set<string>(['all_projects'])

  if (input.businessLine) {
    tags.add(input.businessLine)
  }

  if (input.staffingModel === 'named_resources') {
    tags.add('staff_augmentation')
  }

  const addons = await listOverheadAddons({
    visibleToClient: input.visibleToClient,
    active: true
  })

  return addons.filter(addon => addon.applicableTo.some(tag => tags.has(tag)))
}

const findExistingAddon = async (addonSku: string, addonName: string, client: PoolClient) => {
  const result = await client.query<OverheadAddonRow>(
    `
      SELECT *
      FROM greenhouse_commercial.overhead_addons
      WHERE addon_sku = $1
         OR lower(addon_name) = lower($2)
      ORDER BY CASE WHEN addon_sku = $1 THEN 0 ELSE 1 END, created_at ASC
      LIMIT 1
    `,
    [addonSku, addonName]
  )

  return result.rows[0] ?? null
}

export const upsertOverheadAddonEntry = async (row: OverheadAddonSeedRow): Promise<UpsertOverheadAddonResult> =>
  withTransaction(async client => {
    const existing = await findExistingAddon(row.addonSku, row.addonName, client)

    if (!existing) {
      const result = await client.query<{ addon_id: string }>(
      `
        INSERT INTO greenhouse_commercial.overhead_addons (
          addon_sku,
          category,
          addon_name,
          addon_type,
          unit,
          cost_internal_usd,
          margin_pct,
          final_price_usd,
          final_price_pct,
          pct_min,
          pct_max,
          minimum_amount_usd,
          applicable_to,
          description,
          conditions,
          visible_to_client,
          active,
          notes,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8::numeric, $9::numeric,
          $10::numeric, $11::numeric, $12::numeric, $13::text[], $14, $15, $16, $17, $18,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING addon_id
      `,
      [
        row.addonSku,
        row.category,
        row.addonName,
        row.addonType,
        row.unit,
        row.costInternalUsd,
        row.marginPct,
        row.finalPriceUsd,
        row.finalPricePct,
        row.pctMin,
        row.pctMax,
        row.minimumAmountUsd,
        row.applicableTo,
        row.description,
        row.conditions,
        row.visibleToClient,
        row.active,
        row.notes
        ]
      )

      const addonId = result.rows[0]?.addon_id || ''

      // TASK-546 Fase B — emit `.created` so the materializer can pick it up.
      if (addonId) {
        await publishOverheadAddonCreated(
          {
            addonId,
            addonSku: row.addonSku,
            addonName: row.addonName,
            addonType: row.addonType,
            visibleToClient: row.visibleToClient,
            active: row.active
          },
          client
        )
      }

      return {
        addonId,
        addonSku: row.addonSku,
        created: true,
        changed: true
      }
    }

    const changed =
      existing.addon_sku !== row.addonSku ||
      existing.category !== row.category ||
      existing.addon_name !== row.addonName ||
      existing.addon_type !== row.addonType ||
      (existing.unit || null) !== row.unit ||
      numberChanged(toNumber(existing.cost_internal_usd), row.costInternalUsd) ||
      numberChanged(toNumber(existing.margin_pct), row.marginPct) ||
      numberChanged(toNumber(existing.final_price_usd), row.finalPriceUsd) ||
      numberChanged(toNumber(existing.final_price_pct), row.finalPricePct) ||
      numberChanged(toNumber(existing.pct_min), row.pctMin) ||
      numberChanged(toNumber(existing.pct_max), row.pctMax) ||
      numberChanged(toNumber(existing.minimum_amount_usd), row.minimumAmountUsd) ||
      !arraysEqual(existing.applicable_to, row.applicableTo) ||
      (existing.description || null) !== row.description ||
      (existing.conditions || null) !== row.conditions ||
      existing.visible_to_client !== row.visibleToClient ||
      existing.active !== row.active ||
      (existing.notes || null) !== row.notes

    if (!changed) {
      return {
        addonId: existing.addon_id,
        addonSku: row.addonSku,
        created: false,
        changed: false
      }
    }

    await client.query(
      `
        UPDATE greenhouse_commercial.overhead_addons
        SET
        addon_sku = $2,
        category = $3,
        addon_name = $4,
        addon_type = $5,
        unit = $6,
        cost_internal_usd = $7::numeric,
        margin_pct = $8::numeric,
        final_price_usd = $9::numeric,
        final_price_pct = $10::numeric,
        pct_min = $11::numeric,
        pct_max = $12::numeric,
        minimum_amount_usd = $13::numeric,
        applicable_to = $14::text[],
        description = $15,
        conditions = $16,
        visible_to_client = $17,
        active = $18,
        notes = $19,
        updated_at = CURRENT_TIMESTAMP
      WHERE addon_id = $1
    `,
    [
      existing.addon_id,
      row.addonSku,
      row.category,
      row.addonName,
      row.addonType,
      row.unit,
      row.costInternalUsd,
      row.marginPct,
      row.finalPriceUsd,
      row.finalPricePct,
      row.pctMin,
      row.pctMax,
      row.minimumAmountUsd,
      row.applicableTo,
      row.description,
      row.conditions,
      row.visibleToClient,
      row.active,
      row.notes
      ]
    )

    // TASK-546 Fase B — emit lifecycle transitions so the materializer can
    // sync archival state. The `.updated` event carries the fresh snapshot;
    // `.deactivated` / `.reactivated` fire only on active-flag transitions.
    const now = new Date().toISOString()

    if (existing.active && !row.active) {
      await publishOverheadAddonDeactivated(
        {
          addonId: existing.addon_id,
          addonSku: row.addonSku,
          deactivatedAt: now
        },
        client
      )
    } else if (!existing.active && row.active) {
      await publishOverheadAddonReactivated(
        {
          addonId: existing.addon_id,
          addonSku: row.addonSku,
          reactivatedAt: now
        },
        client
      )
    } else {
      await publishOverheadAddonUpdated(
        {
          addonId: existing.addon_id,
          addonSku: row.addonSku,
          addonName: row.addonName,
          addonType: row.addonType,
          visibleToClient: row.visibleToClient,
          active: row.active
        },
        client
      )
    }

    return {
      addonId: existing.addon_id,
      addonSku: row.addonSku,
      created: false,
      changed: true
    }
  })

export const syncOverheadAddonSkuSequence = async () => {
  await query(
    `
      SELECT setval(
        'greenhouse_commercial.overhead_addon_sku_seq',
        GREATEST(
          COALESCE((
            SELECT MAX(CAST(SUBSTRING(addon_sku FROM 5) AS integer))
            FROM greenhouse_commercial.overhead_addons
            WHERE addon_sku ~ '^EFO-[0-9]+$'
          ), 0),
          9
        ),
        TRUE
      )
    `
  )
}
