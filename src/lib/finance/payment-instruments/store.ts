import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { query, withTransaction } from '@/lib/db'
import {
  FinanceValidationError,
  normalizeString,
  toNumber,
  type AccountType,
  type FinanceCurrency
} from '@/lib/finance/shared'

import {
  mapPaymentInstrumentAccountRow,
  serializePaymentInstrumentAuditSnapshot,
  serializePaymentInstrumentSafe
} from './serializer'
import type {
  PaymentInstrumentAccountRow,
  PaymentInstrumentAuditAction,
  PaymentInstrumentImpactSection,
  PaymentInstrumentImpactSummary,
  PaymentInstrumentRecord,
  PaymentInstrumentSafeRecord,
  PaymentInstrumentSensitiveField,
  PaymentInstrumentUpdateInput
} from './types'

type QueryableClient = Pick<PoolClient, 'query'>

const ACCOUNT_SELECT = `
  account_id,
  space_id,
  account_name,
  bank_name,
  account_number,
  account_number_full,
  currency,
  account_type,
  country_code,
  is_active,
  opening_balance,
  opening_balance_date,
  notes,
  instrument_category,
  provider_slug,
  provider_identifier,
  card_last_four,
  card_network,
  credit_limit,
  responsible_user_id,
  default_for,
  display_order,
  metadata_json,
  created_at,
  updated_at
`

const queryRows = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: QueryableClient
) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return query<T>(text, values)
}

const normalizeReason = (reason: unknown) => {
  const normalized = normalizeString(reason)

  if (normalized.length < 10) {
    throw new FinanceValidationError('A specific reason of at least 10 characters is required.', 400, {
      field: 'reason'
    })
  }

  return normalized
}

/**
 * Defense-in-depth — verify a `provider_slug` exists in the canonical PG
 * catalog before any INSERT/UPDATE that targets `accounts.provider_slug`.
 *
 * Without this check, a slug that drifted between the static TS catalog
 * (`src/config/payment-instruments.ts`) and the DB seed surfaces as a raw
 * foreign_key_violation (PG 23503) and bubbles up as HTTP 500. With it,
 * the API responds 422 with an actionable message — and the operator knows
 * to re-run the canonical catalog resync migration.
 *
 * Null/undefined slugs are accepted (the FK column is nullable).
 */
const assertProviderInCanonicalCatalog = async (
  client: QueryableClient,
  providerSlug: string | null | undefined
): Promise<void> => {
  if (!providerSlug) return

  const rows = await queryRows<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM greenhouse_finance.payment_provider_catalog
        WHERE provider_slug = $1
      ) AS exists
    `,
    [providerSlug],
    client
  )

  if (!rows[0]?.exists) {
    throw new FinanceValidationError(
      `Proveedor "${providerSlug}" no está registrado en el catálogo canónico (greenhouse_finance.payment_provider_catalog). ` +
        'Aplica la última migración del catálogo (`pnpm migrate:up`) o selecciona otro proveedor.',
      422,
      { providerSlug },
      'PROVIDER_NOT_IN_CANONICAL_CATALOG'
    )
  }
}

const impactSection = async ({
  key,
  label,
  sql,
  values
}: {
  key: PaymentInstrumentImpactSection['key']
  label: string
  sql: string
  values: unknown[]
}): Promise<PaymentInstrumentImpactSection> => {
  try {
    const rows = await query<{ count: string; amount_clp: unknown; last_activity_at: string | Date | null }>(sql, values)
    const row = rows[0]

    return {
      key,
      label,
      status: 'ready',
      count: toNumber(row?.count),
      amountClp: row?.amount_clp == null ? null : toNumber(row.amount_clp),
      lastActivityAt: row?.last_activity_at ? new Date(row.last_activity_at).toISOString() : null
    }
  } catch (error) {
    return {
      key,
      label,
      status: 'degraded',
      count: 0,
      amountClp: null,
      lastActivityAt: null,
      error: error instanceof Error ? error.message : 'Unknown impact read failure'
    }
  }
}

export const getPaymentInstrumentImpact = async ({
  accountId,
  spaceId
}: {
  accountId: string
  spaceId: string
}): Promise<PaymentInstrumentImpactSummary> => {
  const values = [accountId, spaceId]

  const sections = await Promise.all([
    impactSection({
      key: 'incomePayments',
      label: 'Income payments',
      values,
      sql: `
        SELECT
          COUNT(*)::text AS count,
          COALESCE(SUM(amount_clp), SUM(amount), 0) AS amount_clp,
          MAX(payment_date)::text AS last_activity_at
        FROM greenhouse_finance.income_payments
        WHERE payment_account_id = $1
          AND space_id = $2
      `
    }),
    impactSection({
      key: 'expensePayments',
      label: 'Expense payments',
      values,
      sql: `
        SELECT
          COUNT(*)::text AS count,
          COALESCE(SUM(amount_clp), SUM(amount), 0) AS amount_clp,
          MAX(payment_date)::text AS last_activity_at
        FROM greenhouse_finance.expense_payments
        WHERE payment_account_id = $1
          AND space_id = $2
      `
    }),
    impactSection({
      key: 'settlements',
      label: 'Settlement orchestration',
      values,
      sql: `
        SELECT
          COUNT(*)::text AS count,
          COALESCE(SUM(amount_clp), SUM(amount), 0) AS amount_clp,
          MAX(COALESCE(transaction_date::text, updated_at::text)) AS last_activity_at
        FROM greenhouse_finance.settlement_legs
        WHERE space_id = $2
          AND (instrument_id = $1 OR counterparty_instrument_id = $1)
      `
    }),
    impactSection({
      key: 'reconciliation',
      label: 'Reconciliation periods',
      values,
      sql: `
        SELECT
          COUNT(*)::text AS count,
          NULL::numeric AS amount_clp,
          MAX(updated_at)::text AS last_activity_at
        FROM greenhouse_finance.reconciliation_periods
        WHERE account_id = $1
          AND space_id = $2
      `
    }),
    impactSection({
      key: 'balances',
      label: 'Treasury balances',
      values,
      sql: `
        SELECT
          COUNT(*)::text AS count,
          MAX(closing_balance_clp) AS amount_clp,
          MAX(balance_date)::text AS last_activity_at
        FROM greenhouse_finance.account_balances
        WHERE account_id = $1
          AND space_id = $2
      `
    })
  ])

  return {
    accountId,
    sections,
    relatedRecords: sections.reduce((sum, section) => sum + section.count, 0),
    degraded: sections.some(section => section.status === 'degraded')
  }
}

const getPaymentInstrumentById = async ({
  accountId,
  spaceId,
  client
}: {
  accountId: string
  spaceId: string
  client?: QueryableClient
}) => {
  const rows = await queryRows<PaymentInstrumentAccountRow>(
    `
      SELECT ${ACCOUNT_SELECT}
      FROM greenhouse_finance.accounts
      WHERE account_id = $1
        AND space_id = $2
      LIMIT 1
    `,
    [accountId, spaceId],
    client
  )

  return rows[0] ? mapPaymentInstrumentAccountRow(rows[0]) : null
}

export const listPaymentInstruments = async ({
  spaceId,
  includeInactive = true
}: {
  spaceId: string
  includeInactive?: boolean
}): Promise<PaymentInstrumentSafeRecord[]> => {
  const rows = await query<PaymentInstrumentAccountRow>(
    `
      SELECT ${ACCOUNT_SELECT}
      FROM greenhouse_finance.accounts
      WHERE space_id = $1
        AND ($2::boolean = TRUE OR is_active = TRUE)
      ORDER BY display_order ASC, account_name ASC
    `,
    [spaceId, includeInactive]
  )

  return rows.map(mapPaymentInstrumentAccountRow).map(serializePaymentInstrumentSafe)
}

export const getPaymentInstrumentAdminDetail = async ({
  accountId,
  spaceId
}: {
  accountId: string
  spaceId: string
}) => {
  const record = await getPaymentInstrumentById({ accountId, spaceId })

  if (!record) return null

  const impact = await getPaymentInstrumentImpact({ accountId, spaceId })

  return {
    ...serializePaymentInstrumentSafe(record),
    impact
  }
}

const insertAuditEntry = async ({
  client,
  accountId,
  spaceId,
  actorUserId,
  action,
  reason,
  fieldName,
  diff,
  impact
}: {
  client: QueryableClient
  accountId: string
  spaceId: string
  actorUserId: string | null
  action: PaymentInstrumentAuditAction
  reason: string
  fieldName?: string | null
  diff: Record<string, unknown>
  impact?: PaymentInstrumentImpactSummary | null
}) => {
  await client.query(
    `
      INSERT INTO greenhouse_finance.payment_instrument_admin_audit_log (
        space_id,
        account_id,
        actor_user_id,
        action,
        field_name,
        reason,
        diff_json,
        impact_json,
        request_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
    `,
    [
      spaceId,
      accountId,
      actorUserId,
      action,
      fieldName ?? null,
      reason,
      JSON.stringify(diff),
      JSON.stringify(impact ?? {}),
      randomUUID()
    ]
  )
}

export const getPaymentInstrumentAuditLog = async ({
  accountId,
  spaceId,
  limit = 25
}: {
  accountId: string
  spaceId: string
  limit?: number
}) => query<{
  audit_id: string
  action: string
  actor_user_id: string | null
  field_name: string | null
  reason: string | null
  diff_json: Record<string, unknown>
  impact_json: Record<string, unknown>
  created_at: string | Date
}>(
  `
    SELECT audit_id, action, actor_user_id, field_name, reason, diff_json, impact_json, created_at
    FROM greenhouse_finance.payment_instrument_admin_audit_log
    WHERE account_id = $1
      AND space_id = $2
    ORDER BY created_at DESC
    LIMIT $3
  `,
  [accountId, spaceId, limit]
)

const HIGH_IMPACT_FIELDS = new Set<keyof PaymentInstrumentUpdateInput>([
  'currency',
  'instrumentCategory',
  'accountNumberFull',
  'providerIdentifier',
  'isActive'
])

const getChangedFields = (
  before: PaymentInstrumentRecord,
  updates: PaymentInstrumentUpdateInput
) => Object.entries(updates)
  .filter(([key, value]) => {
    const current = before[key as keyof PaymentInstrumentRecord]

    return JSON.stringify(current ?? null) !== JSON.stringify(value ?? null)
  })
  .map(([key]) => key as keyof PaymentInstrumentUpdateInput)

export const updatePaymentInstrumentAdmin = async ({
  accountId,
  spaceId,
  actorUserId,
  updates,
  reason,
  impactAcknowledged = false
}: {
  accountId: string
  spaceId: string
  actorUserId: string | null
  updates: PaymentInstrumentUpdateInput
  reason: string
  impactAcknowledged?: boolean
}) => {
  const normalizedReason = normalizeReason(reason)

  return withTransaction(async client => {
    const before = await getPaymentInstrumentById({ accountId, spaceId, client })

    if (!before) {
      throw new FinanceValidationError('Payment instrument not found', 404)
    }

    const changedFields = getChangedFields(before, updates)

    if (changedFields.length === 0) {
      throw new FinanceValidationError('No fields to update')
    }

    if (updates.providerSlug !== undefined) {
      await assertProviderInCanonicalCatalog(client, updates.providerSlug)
    }

    const impact = await getPaymentInstrumentImpact({ accountId, spaceId })
    const hasHighImpactChange = changedFields.some(field => HIGH_IMPACT_FIELDS.has(field))

    if (hasHighImpactChange && impact.relatedRecords > 0 && !impactAcknowledged) {
      throw new FinanceValidationError(
        'Impact acknowledgement is required before changing a payment instrument with related ledger activity.',
        409,
        { impact, changedFields },
        'PAYMENT_INSTRUMENT_IMPACT_ACK_REQUIRED'
      )
    }

    const values: unknown[] = [accountId, spaceId]
    const sets: string[] = []

    const pushSet = (column: string, value: unknown) => {
      values.push(value)
      sets.push(`${column} = $${values.length}`)
    }

    if (updates.accountName !== undefined) pushSet('account_name', updates.accountName)
    if (updates.bankName !== undefined) pushSet('bank_name', updates.bankName)
    if (updates.currency !== undefined) pushSet('currency', updates.currency)
    if (updates.accountType !== undefined) pushSet('account_type', updates.accountType)
    if (updates.country !== undefined) pushSet('country_code', updates.country)
    if (updates.isActive !== undefined) pushSet('is_active', updates.isActive)
    if (updates.openingBalance !== undefined) pushSet('opening_balance', updates.openingBalance)
    if (updates.openingBalanceDate !== undefined) pushSet('opening_balance_date', updates.openingBalanceDate)
    if (updates.accountNumber !== undefined) pushSet('account_number', updates.accountNumber)
    if (updates.accountNumberFull !== undefined) pushSet('account_number_full', updates.accountNumberFull)
    if (updates.notes !== undefined) pushSet('notes', updates.notes)
    if (updates.instrumentCategory !== undefined) pushSet('instrument_category', updates.instrumentCategory)
    if (updates.providerSlug !== undefined) pushSet('provider_slug', updates.providerSlug)
    if (updates.providerIdentifier !== undefined) pushSet('provider_identifier', updates.providerIdentifier)
    if (updates.cardLastFour !== undefined) pushSet('card_last_four', updates.cardLastFour)
    if (updates.cardNetwork !== undefined) pushSet('card_network', updates.cardNetwork)
    if (updates.creditLimit !== undefined) pushSet('credit_limit', updates.creditLimit)
    if (updates.responsibleUserId !== undefined) pushSet('responsible_user_id', updates.responsibleUserId)

    if (updates.defaultFor !== undefined) {
      values.push(updates.defaultFor)
      sets.push(`default_for = $${values.length}::text[]`)
    }

    if (updates.displayOrder !== undefined) pushSet('display_order', updates.displayOrder)

    if (updates.metadataJson !== undefined) {
      values.push(JSON.stringify(updates.metadataJson))
      sets.push(`metadata_json = $${values.length}::jsonb`)
    }

    sets.push('updated_at = CURRENT_TIMESTAMP')

    const rows = await queryRows<PaymentInstrumentAccountRow>(
      `
        UPDATE greenhouse_finance.accounts
        SET ${sets.join(', ')}
        WHERE account_id = $1
          AND space_id = $2
        RETURNING ${ACCOUNT_SELECT}
      `,
      values,
      client
    )

    const updated = mapPaymentInstrumentAccountRow(rows[0])

    const action: PaymentInstrumentAuditAction = before.isActive && updated.isActive === false
      ? 'deactivated'
      : !before.isActive && updated.isActive === true
        ? 'reactivated'
        : 'updated'

    await insertAuditEntry({
      client,
      accountId,
      spaceId,
      actorUserId,
      action,
      reason: normalizedReason,
      diff: {
        changedFields,
        before: serializePaymentInstrumentAuditSnapshot(before),
        after: serializePaymentInstrumentAuditSnapshot(updated)
      },
      impact
    })

    await publishOutboxEvent({
      aggregateType: 'payment_instrument',
      aggregateId: accountId,
      eventType: action === 'updated'
        ? EVENT_TYPES.financePaymentInstrumentUpdated
        : EVENT_TYPES.financePaymentInstrumentStatusChanged,
      payload: {
        accountId,
        spaceId,
        action,
        changedFields,
        before: serializePaymentInstrumentSafe(before),
        after: serializePaymentInstrumentSafe(updated)
      }
    }, client)

    return {
      instrument: serializePaymentInstrumentSafe(updated),
      impact,
      changedFields
    }
  })
}

export const revealPaymentInstrumentSensitiveFields = async ({
  accountId,
  spaceId,
  actorUserId,
  fields,
  reason
}: {
  accountId: string
  spaceId: string
  actorUserId: string | null
  fields: PaymentInstrumentSensitiveField[]
  reason: string
}) => {
  const normalizedReason = normalizeReason(reason)
  const uniqueFields = Array.from(new Set(fields))

  if (uniqueFields.length === 0) {
    throw new FinanceValidationError('At least one sensitive field must be requested.', 400)
  }

  return withTransaction(async client => {
    const record = await getPaymentInstrumentById({ accountId, spaceId, client })

    if (!record) {
      throw new FinanceValidationError('Payment instrument not found', 404)
    }

    const revealed = uniqueFields.reduce<Record<PaymentInstrumentSensitiveField, string | null>>((acc, field) => {
      acc[field] = record[field]

      return acc
    }, {} as Record<PaymentInstrumentSensitiveField, string | null>)

    await insertAuditEntry({
      client,
      accountId,
      spaceId,
      actorUserId,
      action: 'revealed_sensitive',
      reason: normalizedReason,
      fieldName: uniqueFields.join(','),
      diff: {
        revealedFields: uniqueFields,
        snapshot: serializePaymentInstrumentAuditSnapshot(record)
      }
    })

    await publishOutboxEvent({
      aggregateType: 'payment_instrument',
      aggregateId: accountId,
      eventType: EVENT_TYPES.financePaymentInstrumentSensitiveRevealed,
      payload: {
        accountId,
        spaceId,
        revealedFields: uniqueFields,
        actorUserId
      }
    }, client)

    return {
      accountId,
      fields: revealed
    }
  })
}

export const createPaymentInstrumentAdmin = async ({
  accountId,
  spaceId,
  actorUserId,
  input,
  reason
}: {
  accountId: string
  spaceId: string
  actorUserId: string | null
  input: {
    accountName: string
    bankName: string
    accountNumber: string | null
    accountNumberFull: string | null
    currency: FinanceCurrency
    accountType: AccountType
    country: string
    openingBalance: number
    openingBalanceDate: string | null
    notes: string | null
    instrumentCategory: string
    providerSlug: string | null
    providerIdentifier: string | null
    cardLastFour: string | null
    cardNetwork: string | null
    creditLimit: number | null
    responsibleUserId: string | null
    defaultFor: string[]
    displayOrder: number
    metadataJson?: Record<string, unknown>
  }
  reason?: string | null
}) => withTransaction(async client => {
  await assertProviderInCanonicalCatalog(client, input.providerSlug)

  const existing = await queryRows<{ account_id: string }>(
    `
      SELECT account_id
      FROM greenhouse_finance.accounts
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId],
    client
  )

  if (existing.length > 0) {
    throw new FinanceValidationError(`Account ${accountId} already exists.`, 409)
  }

  const rows = await queryRows<PaymentInstrumentAccountRow>(
    `
      INSERT INTO greenhouse_finance.accounts (
        account_id,
        space_id,
        account_name,
        bank_name,
        account_number,
        account_number_full,
        currency,
        account_type,
        country_code,
        is_active,
        opening_balance,
        opening_balance_date,
        notes,
        instrument_category,
        provider_slug,
        provider_identifier,
        card_last_four,
        card_network,
        credit_limit,
        responsible_user_id,
        default_for,
        display_order,
        metadata_json,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11::date, $12,
        $13, $14, $15, $16, $17, $18, $19, $20::text[], $21, $22::jsonb,
        $23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING ${ACCOUNT_SELECT}
    `,
    [
      accountId,
      spaceId,
      input.accountName,
      input.bankName,
      input.accountNumber,
      input.accountNumberFull,
      input.currency,
      input.accountType,
      input.country,
      input.openingBalance,
      input.openingBalanceDate,
      input.notes,
      input.instrumentCategory,
      input.providerSlug,
      input.providerIdentifier,
      input.cardLastFour,
      input.cardNetwork,
      input.creditLimit,
      input.responsibleUserId,
      input.defaultFor,
      input.displayOrder,
      JSON.stringify(input.metadataJson ?? {}),
      actorUserId
    ],
    client
  )

  const created = mapPaymentInstrumentAccountRow(rows[0])
  const safeCreated = serializePaymentInstrumentSafe(created)

  await insertAuditEntry({
    client,
    accountId,
    spaceId,
    actorUserId,
    action: 'created',
    reason: normalizeString(reason) || 'Payment instrument created from admin workspace.',
    diff: {
      after: serializePaymentInstrumentAuditSnapshot(created)
    }
  })

  await publishOutboxEvent({
    aggregateType: 'payment_instrument',
    aggregateId: accountId,
    eventType: EVENT_TYPES.financePaymentInstrumentCreated,
    payload: safeCreated
  }, client)

  return safeCreated
})
