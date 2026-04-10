import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql, type Transaction } from 'kysely'

import { getDb, query } from '@/lib/db'
import {
  FinanceValidationError,
  assertDateString,
  assertNonEmptyString,
  assertValidCurrency,
  normalizeString,
  resolveExchangeRateToClp,
  roundCurrency,
  toDateString,
  toNumber,
  type FinanceCurrency
} from '@/lib/finance/shared'
import { rematerializeAccountBalancesFromDate } from '@/lib/finance/account-balances'
import {
  getShareholderMovementSourceSummaries,
  inferShareholderMovementSource,
  resolveShareholderMovementSource,
  type ShareholderMovementSourceSummary,
  type ShareholderMovementSourceType,
  type ShareholderMovementTenantScope
} from '@/lib/finance/shareholder-account/source-links'

import type { DB } from '@/types/db'

const SHAREHOLDER_ACCOUNT_STATUSES = ['active', 'frozen', 'closed'] as const

export type ShareholderAccountStatus = (typeof SHAREHOLDER_ACCOUNT_STATUSES)[number]

const SHAREHOLDER_MOVEMENT_TYPES = [
  'expense_paid_by_shareholder',
  'personal_withdrawal',
  'reimbursement',
  'return_to_company',
  'salary_advance',
  'capital_contribution',
  'other'
] as const

export type ShareholderMovementType = (typeof SHAREHOLDER_MOVEMENT_TYPES)[number]
export type ShareholderMovementDirection = 'credit' | 'debit'

type DbTx = Transaction<DB>

type ShareholderAccountSummaryRow = {
  account_id: string
  account_name: string
  currency: string
  status: string
  ownership_percentage: unknown
  profile_id: string
  member_id: string | null
  space_id: string | null
  shareholder_name: string
  shareholder_email: string | null
  opening_balance: unknown
  current_balance: unknown
  current_balance_clp: unknown
  movement_count: unknown
  last_movement_date: string | Date | null
  notes: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

type ShareholderMovementRow = {
  movement_id: string
  account_id: string
  direction: string
  movement_type: string
  amount: unknown
  currency: string
  exchange_rate: unknown
  amount_clp: unknown
  linked_expense_id: string | null
  linked_income_id: string | null
  linked_payment_type: string | null
  linked_payment_id: string | null
  settlement_group_id: string | null
  counterparty_account_id: string | null
  counterparty_account_name: string | null
  description: string | null
  evidence_url: string | null
  movement_date: string | Date | null
  running_balance_clp: unknown
  source_type: string | null
  source_id: string | null
  space_id: string | null
  recorded_by_user_id: string | null
  recorded_at: string | Date | null
}

type ShareholderAccountBalanceRow = {
  account_id: string
  currency: string
  balance: unknown
  balance_clp: unknown
  last_movement_date: string | Date | null
  movement_count: unknown
}

type ShareholderPersonOptionRow = {
  profile_id: string
  member_id: string | null
  display_name: string
  canonical_email: string | null
  source_label: string
}

export type ShareholderPersonOption = {
  profileId: string
  memberId: string | null
  displayName: string
  email: string | null
  sourceLabel: string
}

export type ShareholderAccountSummary = {
  accountId: string
  accountName: string
  currency: string
  status: string
  ownershipPercentage: number | null
  profileId: string
  memberId: string | null
  spaceId: string | null
  shareholderName: string
  shareholderEmail: string | null
  openingBalance: number
  currentBalance: number
  currentBalanceClp: number
  movementCount: number
  lastMovementDate: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type ShareholderAccountMovement = {
  movementId: string
  accountId: string
  direction: ShareholderMovementDirection
  movementType: ShareholderMovementType
  amount: number
  currency: string
  exchangeRate: number | null
  amountClp: number
  linkedExpenseId: string | null
  linkedIncomeId: string | null
  linkedPaymentType: 'income_payment' | 'expense_payment' | null
  linkedPaymentId: string | null
  settlementGroupId: string | null
  counterpartyAccountId: string | null
  counterpartyAccountName: string | null
  description: string | null
  evidenceUrl: string | null
  movementDate: string
  runningBalanceClp: number | null
  sourceType: ShareholderMovementSourceType
  sourceId: string | null
  source: ShareholderMovementSourceSummary | null
  spaceId: string | null
  recordedByUserId: string | null
  recordedAt: string | null
}

export type ShareholderAccountBalance = {
  accountId: string
  currency: string
  balance: number
  balanceClp: number
  position: 'company_owes_shareholder' | 'shareholder_owes_company' | 'settled'
  movementCount: number
  lastMovementDate: string | null
}

export type CreateShareholderAccountInput = {
  profileId: string
  memberId?: string | null
  accountName?: string | null
  currency: FinanceCurrency
  status?: ShareholderAccountStatus | null
  ownershipPercentage?: number | null
  openingBalance?: number | null
  notes?: string | null
  spaceId?: string | null
  actorUserId?: string | null
}

export type RecordShareholderMovementInput = {
  direction: ShareholderMovementDirection
  movementType: ShareholderMovementType
  amount: number
  currency?: FinanceCurrency | null
  movementDate: string
  description?: string | null
  evidenceUrl?: string | null
  linkedExpenseId?: string | null
  linkedIncomeId?: string | null
  linkedPaymentType?: 'income_payment' | 'expense_payment' | null
  linkedPaymentId?: string | null
  sourceType?: ShareholderMovementSourceType | null
  sourceId?: string | null
  counterpartyAccountId?: string | null
  exchangeRateOverride?: number | null
  spaceId?: string | null
  actorUserId?: string | null
  tenantScope?: ShareholderMovementTenantScope | null
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const assertAccountStatus = (value: string | null | undefined) => {
  const normalized = normalizeString(value || 'active') as ShareholderAccountStatus

  if (!SHAREHOLDER_ACCOUNT_STATUSES.includes(normalized)) {
    throw new FinanceValidationError(`status must be one of: ${SHAREHOLDER_ACCOUNT_STATUSES.join(', ')}`)
  }

  return normalized
}

const assertMovementDirection = (value: unknown): ShareholderMovementDirection => {
  const normalized = normalizeString(value)

  if (normalized !== 'credit' && normalized !== 'debit') {
    throw new FinanceValidationError('direction must be "credit" or "debit".')
  }

  return normalized
}

const assertMovementType = (value: unknown): ShareholderMovementType => {
  const normalized = normalizeString(value) as ShareholderMovementType

  if (!SHAREHOLDER_MOVEMENT_TYPES.includes(normalized)) {
    throw new FinanceValidationError(`movementType must be one of: ${SHAREHOLDER_MOVEMENT_TYPES.join(', ')}`)
  }

  return normalized
}

const generateShareholderAccountId = (displayName: string, currency: FinanceCurrency) =>
  `sha-${slugify(displayName)}-${currency.toLowerCase()}`

const mapSummaryRow = (row: ShareholderAccountSummaryRow): ShareholderAccountSummary => ({
  accountId: normalizeString(row.account_id),
  accountName: normalizeString(row.account_name),
  currency: normalizeString(row.currency),
  status: normalizeString(row.status),
  ownershipPercentage: row.ownership_percentage != null ? toNumber(row.ownership_percentage) : null,
  profileId: normalizeString(row.profile_id),
  memberId: row.member_id ? normalizeString(row.member_id) : null,
  spaceId: row.space_id ? normalizeString(row.space_id) : null,
  shareholderName: normalizeString(row.shareholder_name),
  shareholderEmail: row.shareholder_email ? normalizeString(row.shareholder_email) : null,
  openingBalance: roundCurrency(toNumber(row.opening_balance)),
  currentBalance: roundCurrency(toNumber(row.current_balance)),
  currentBalanceClp: roundCurrency(toNumber(row.current_balance_clp)),
  movementCount: Math.round(toNumber(row.movement_count)),
  lastMovementDate: toDateString(row.last_movement_date),
  notes: row.notes ? normalizeString(row.notes) : null,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
})

const mapMovementRow = (row: ShareholderMovementRow): ShareholderAccountMovement => ({
  ...inferShareholderMovementSource({
    sourceType: row.source_type,
    sourceId: row.source_id,
    linkedExpenseId: row.linked_expense_id,
    linkedIncomeId: row.linked_income_id,
    linkedPaymentType: row.linked_payment_type,
    linkedPaymentId: row.linked_payment_id,
    settlementGroupId: row.settlement_group_id
  }),
  movementId: normalizeString(row.movement_id),
  accountId: normalizeString(row.account_id),
  direction: normalizeString(row.direction) as ShareholderMovementDirection,
  movementType: normalizeString(row.movement_type) as ShareholderMovementType,
  amount: roundCurrency(toNumber(row.amount)),
  currency: normalizeString(row.currency),
  exchangeRate: row.exchange_rate != null ? toNumber(row.exchange_rate) : null,
  amountClp: roundCurrency(toNumber(row.amount_clp)),
  linkedExpenseId: row.linked_expense_id ? normalizeString(row.linked_expense_id) : null,
  linkedIncomeId: row.linked_income_id ? normalizeString(row.linked_income_id) : null,
  linkedPaymentType: row.linked_payment_type ? normalizeString(row.linked_payment_type) as 'income_payment' | 'expense_payment' : null,
  linkedPaymentId: row.linked_payment_id ? normalizeString(row.linked_payment_id) : null,
  settlementGroupId: row.settlement_group_id ? normalizeString(row.settlement_group_id) : null,
  counterpartyAccountId: row.counterparty_account_id ? normalizeString(row.counterparty_account_id) : null,
  counterpartyAccountName: row.counterparty_account_name ? normalizeString(row.counterparty_account_name) : null,
  description: row.description ? normalizeString(row.description) : null,
  evidenceUrl: row.evidence_url ? normalizeString(row.evidence_url) : null,
  movementDate: toDateString(row.movement_date) || '',
  runningBalanceClp: row.running_balance_clp != null ? roundCurrency(toNumber(row.running_balance_clp)) : null,
  source: null,
  spaceId: row.space_id ? normalizeString(row.space_id) : null,
  recordedByUserId: row.recorded_by_user_id ? normalizeString(row.recorded_by_user_id) : null,
  recordedAt: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : row.recorded_at
})

const mapBalanceRow = (row: ShareholderAccountBalanceRow): ShareholderAccountBalance => {
  const balance = roundCurrency(toNumber(row.balance))
  const balanceClp = roundCurrency(toNumber(row.balance_clp))

  return {
    accountId: normalizeString(row.account_id),
    currency: normalizeString(row.currency),
    balance,
    balanceClp,
    position: balance > 0 ? 'company_owes_shareholder' : balance < 0 ? 'shareholder_owes_company' : 'settled',
    movementCount: Math.round(toNumber(row.movement_count)),
    lastMovementDate: toDateString(row.last_movement_date)
  }
}

const insertOutboxEvent = async (
  trx: DbTx,
  event: {
    aggregateType: string
    aggregateId: string
    eventType: string
    payload: Record<string, unknown>
  }
) => {
  await trx
    .insertInto('greenhouse_sync.outbox_events')
    .values({
      event_id: `outbox-${randomUUID()}`,
      aggregate_type: event.aggregateType,
      aggregate_id: event.aggregateId,
      event_type: event.eventType,
      payload_json: event.payload as never,
      status: 'pending',
      occurred_at: sql`CURRENT_TIMESTAMP`
    })
    .execute()
}

const getProfile = async (profileId: string) => {
  const db = await getDb()

  const profile = await db
    .selectFrom('greenhouse_core.identity_profiles')
    .select(['profile_id', 'full_name', 'canonical_email', 'active'])
    .where('profile_id', '=', profileId)
    .executeTakeFirst()

  if (!profile || !profile.active) {
    throw new FinanceValidationError(`profileId "${profileId}" not found or inactive.`, 404)
  }

  return profile
}

const getMember = async (memberId: string) => {
  const db = await getDb()

  const member = await db
    .selectFrom('greenhouse_core.members')
    .select(['member_id', 'identity_profile_id', 'active'])
    .where('member_id', '=', memberId)
    .executeTakeFirst()

  if (!member || !member.active) {
    throw new FinanceValidationError(`memberId "${memberId}" not found or inactive.`, 404)
  }

  return member
}

const getShareholderAccountCore = async (accountId: string) => {
  const db = await getDb()

  const account = await db
    .selectFrom('greenhouse_finance.shareholder_accounts as sa')
    .innerJoin('greenhouse_finance.accounts as a', 'a.account_id', 'sa.account_id')
    .innerJoin('greenhouse_core.identity_profiles as ip', 'ip.profile_id', 'sa.profile_id')
    .select([
      'sa.account_id',
      'sa.profile_id',
      'sa.member_id',
      'sa.space_id',
      'sa.status',
      'a.account_name',
      'a.currency',
      'a.opening_balance',
      'ip.full_name'
    ])
    .where('sa.account_id', '=', accountId)
    .where('a.instrument_category', '=', 'shareholder_account')
    .executeTakeFirst()

  if (!account) {
    throw new FinanceValidationError(`Shareholder account "${accountId}" not found.`, 404)
  }

  return account
}

const validateCounterpartyAccount = async (accountId: string, currency: string) => {
  const db = await getDb()

  const counterparty = await db
    .selectFrom('greenhouse_finance.accounts')
    .select(['account_id', 'currency', 'is_active'])
    .where('account_id', '=', accountId)
    .executeTakeFirst()

  if (!counterparty || !counterparty.is_active) {
    throw new FinanceValidationError(`counterpartyAccountId "${accountId}" not found or inactive.`, 404)
  }

  if (normalizeString(counterparty.currency) !== normalizeString(currency)) {
    throw new FinanceValidationError(
      'counterpartyAccountId must use the same currency as the shareholder account for this slice.'
    )
  }

  return counterparty
}

const buildMovementSettlementDirection = (direction: ShareholderMovementDirection) =>
  direction === 'credit' ? 'incoming' : 'outgoing'

const enrichShareholderMovements = async ({
  movements,
  tenantScope
}: {
  movements: ShareholderAccountMovement[]
  tenantScope?: ShareholderMovementTenantScope | null
}) => {
  if (!tenantScope || movements.length === 0) {
    return movements
  }

  const sourceSummaries = await getShareholderMovementSourceSummaries({
    scope: tenantScope,
    refs: movements.map(movement => ({
      sourceType: movement.sourceType,
      sourceId: movement.sourceId
    }))
  })

  return movements.map(movement => {
    if (!movement.sourceId || movement.sourceType === 'manual') {
      return movement
    }

    return {
      ...movement,
      source: sourceSummaries.get(`${movement.sourceType}:${movement.sourceId}`) || null
    }
  })
}

export const listShareholderPersonOptions = async ({
  search
}: {
  search?: string | null
} = {}): Promise<ShareholderPersonOption[]> => {
  const db = await getDb()
  const normalizedSearch = normalizeString(search).toLowerCase()

  let queryBuilder = db
    .selectFrom('greenhouse_core.identity_profiles as ip')
    .leftJoin('greenhouse_core.members as m', 'm.identity_profile_id', 'ip.profile_id')
    .leftJoin('greenhouse_core.person_memberships as pm', join =>
      join
        .onRef('pm.profile_id', '=', 'ip.profile_id')
        .on('pm.active', '=', true)
    )
    .select([
      'ip.profile_id',
      'm.member_id',
      sql<string>`COALESCE(NULLIF(m.display_name, ''), ip.full_name)`.as('display_name'),
      'ip.canonical_email',
      sql<string>`
        CASE
          WHEN m.member_id IS NOT NULL THEN 'internal_member'
          WHEN pm.membership_type IN ('partner', 'advisor') THEN pm.membership_type
          ELSE 'person'
        END
      `.as('source_label')
    ])
    .where('ip.active', '=', true)
    .where(eb =>
      eb.or([
        eb('m.member_id', 'is not', null),
        eb('pm.membership_type', 'in', ['partner', 'advisor'])
      ])
    )

  if (normalizedSearch) {
    queryBuilder = queryBuilder.where(eb =>
      eb.or([
        sql<boolean>`LOWER(ip.full_name) LIKE ${`%${normalizedSearch}%`}`,
        sql<boolean>`LOWER(COALESCE(ip.canonical_email, '')) LIKE ${`%${normalizedSearch}%`}`
      ])
    )
  }

  const rows = await queryBuilder.orderBy('display_name', 'asc').limit(50).execute()

  const unique = new Map<string, ShareholderPersonOption>()

  for (const row of rows as ShareholderPersonOptionRow[]) {
    const profileId = normalizeString(row.profile_id)

    if (!profileId || unique.has(profileId)) continue

    unique.set(profileId, {
      profileId,
      memberId: row.member_id ? normalizeString(row.member_id) : null,
      displayName: normalizeString(row.display_name),
      email: row.canonical_email ? normalizeString(row.canonical_email) : null,
      sourceLabel: normalizeString(row.source_label)
    })
  }

  return Array.from(unique.values())
}

export const listShareholderAccounts = async ({
  spaceId
}: {
  spaceId?: string | null
} = {}): Promise<ShareholderAccountSummary[]> => {
  const normalizedSpaceId = normalizeString(spaceId) || null

  const rows = await query<ShareholderAccountSummaryRow>(`
    WITH latest_balance AS (
      SELECT DISTINCT ON (ab.account_id)
        ab.account_id,
        ab.closing_balance AS current_balance,
        COALESCE(ab.closing_balance_clp, ab.closing_balance) AS current_balance_clp
      FROM greenhouse_finance.account_balances ab
      ORDER BY ab.account_id, ab.balance_date DESC
    ),
    movement_summary AS (
      SELECT
        sam.account_id,
        COUNT(*)::text AS movement_count,
        MAX(sam.movement_date) AS last_movement_date,
        COALESCE(SUM(
          CASE
            WHEN sam.direction = 'credit' THEN sam.amount
            ELSE -sam.amount
          END
        ), 0) AS current_balance,
        COALESCE(SUM(
          CASE
            WHEN sam.direction = 'credit' THEN sam.amount_clp
            ELSE -sam.amount_clp
          END
        ), 0) AS current_balance_clp
      FROM greenhouse_finance.shareholder_account_movements sam
      GROUP BY sam.account_id
    )
    SELECT
      sa.account_id,
      a.account_name,
      a.currency,
      sa.status,
      sa.ownership_percentage,
      sa.profile_id,
      sa.member_id,
      sa.space_id,
      ip.full_name AS shareholder_name,
      ip.canonical_email AS shareholder_email,
      a.opening_balance,
      COALESCE(lb.current_balance, ms.current_balance, a.opening_balance)::text AS current_balance,
      COALESCE(lb.current_balance_clp, ms.current_balance_clp, a.opening_balance)::text AS current_balance_clp,
      COALESCE(ms.movement_count, '0') AS movement_count,
      ms.last_movement_date,
      sa.notes,
      sa.created_at,
      sa.updated_at
    FROM greenhouse_finance.shareholder_accounts sa
    INNER JOIN greenhouse_finance.accounts a
      ON a.account_id = sa.account_id
    INNER JOIN greenhouse_core.identity_profiles ip
      ON ip.profile_id = sa.profile_id
    LEFT JOIN latest_balance lb
      ON lb.account_id = sa.account_id
    LEFT JOIN movement_summary ms
      ON ms.account_id = sa.account_id
    WHERE a.instrument_category = 'shareholder_account'
      AND ($1::text IS NULL OR sa.space_id = $1)
    ORDER BY a.account_name ASC
  `, [normalizedSpaceId])

  return rows.map(mapSummaryRow)
}

export const createShareholderAccount = async (
  input: CreateShareholderAccountInput
): Promise<ShareholderAccountSummary> => {
  const profileId = assertNonEmptyString(input.profileId, 'profileId')
  const currency = assertValidCurrency(input.currency)
  const profile = await getProfile(profileId)
  const memberId = input.memberId ? assertNonEmptyString(input.memberId, 'memberId') : null

  if (memberId) {
    const member = await getMember(memberId)

    if (normalizeString(member.identity_profile_id || '') !== profileId) {
      throw new FinanceValidationError('memberId does not belong to the provided profileId.')
    }
  }

  const accountName = normalizeString(input.accountName) || `CCA — ${normalizeString(profile.full_name)}`
  const accountId = generateShareholderAccountId(accountName, currency)
  const status = assertAccountStatus(input.status)
  const openingBalance = roundCurrency(toNumber(input.openingBalance))
  const ownershipPercentage = input.ownershipPercentage != null ? roundCurrency(toNumber(input.ownershipPercentage)) : null
  const notes = normalizeString(input.notes) || null
  const spaceId = normalizeString(input.spaceId) || null
  const actorUserId = normalizeString(input.actorUserId) || null
  const db = await getDb()

  await db.transaction().execute(async trx => {
    const existing = await trx
      .selectFrom('greenhouse_finance.shareholder_accounts')
      .select('account_id')
      .where('account_id', '=', accountId)
      .executeTakeFirst()

    if (existing) {
      throw new FinanceValidationError(`Shareholder account "${accountId}" already exists.`, 409)
    }

    await trx
      .insertInto('greenhouse_finance.accounts')
      .values({
        account_id: accountId,
        account_name: accountName,
        bank_name: 'Cuenta corriente accionista',
        account_number: null,
        account_number_full: null,
        currency,
        account_type: 'other',
        country_code: 'CL',
        is_active: true,
        opening_balance: openingBalance.toString(),
        opening_balance_date: null,
        notes,
        created_by_user_id: actorUserId,
        instrument_category: 'shareholder_account',
        provider_slug: null,
        provider_identifier: null,
        card_last_four: null,
        card_network: null,
        credit_limit: null,
        responsible_user_id: null,
        default_for: ['general'],
        display_order: 0,
        metadata_json: {
          shareholderProfileId: profileId,
          shareholderMemberId: memberId,
          instrumentNature: 'shareholder_current_account'
        } as never
      })
      .execute()

    await trx
      .insertInto('greenhouse_finance.shareholder_accounts')
      .values({
        account_id: accountId,
        profile_id: profileId,
        member_id: memberId,
        space_id: spaceId,
        ownership_percentage: ownershipPercentage != null ? ownershipPercentage.toString() : null,
        status,
        notes,
        metadata_json: {
          shareholderName: normalizeString(profile.full_name)
        } as never,
        created_by_user_id: actorUserId
      })
      .execute()

    await insertOutboxEvent(trx, {
      aggregateType: 'finance_account',
      aggregateId: accountId,
      eventType: 'finance.account.created',
      payload: {
        accountId,
        instrumentCategory: 'shareholder_account',
        accountName,
        currency
      }
    })

    await insertOutboxEvent(trx, {
      aggregateType: 'finance_shareholder_account',
      aggregateId: accountId,
      eventType: 'finance.shareholder_account.created',
      payload: {
        accountId,
        profileId,
        memberId,
        status,
        currency,
        ownershipPercentage,
        spaceId
      }
    })
  })

  const created = await listShareholderAccounts({ spaceId })

  return created.find(account => account.accountId === accountId) || {
    accountId,
    accountName,
    currency,
    status,
    ownershipPercentage,
    profileId,
    memberId,
    spaceId,
    shareholderName: normalizeString(profile.full_name),
    shareholderEmail: profile.canonical_email ? normalizeString(profile.canonical_email) : null,
    openingBalance,
    currentBalance: openingBalance,
    currentBalanceClp: openingBalance,
    movementCount: 0,
    lastMovementDate: null,
    notes,
    createdAt: null,
    updatedAt: null
  }
}

export const listShareholderAccountMovements = async ({
  accountId,
  startDate,
  endDate,
  direction,
  movementType,
  tenantScope
}: {
  accountId: string
  startDate?: string | null
  endDate?: string | null
  direction?: ShareholderMovementDirection | null
  movementType?: ShareholderMovementType | null
  tenantScope?: ShareholderMovementTenantScope | null
}): Promise<ShareholderAccountMovement[]> => {
  const normalizedAccountId = assertNonEmptyString(accountId, 'accountId')

  await getShareholderAccountCore(normalizedAccountId)

  const filters = ['sam.account_id = $1']
  const params: Array<string> = [normalizedAccountId]

  if (startDate) {
    params.push(assertDateString(startDate, 'startDate'))
    filters.push(`sam.movement_date >= $${params.length}`)
  }

  if (endDate) {
    params.push(assertDateString(endDate, 'endDate'))
    filters.push(`sam.movement_date <= $${params.length}`)
  }

  if (direction) {
    params.push(assertMovementDirection(direction))
    filters.push(`sam.direction = $${params.length}`)
  }

  if (movementType) {
    params.push(assertMovementType(movementType))
    filters.push(`sam.movement_type = $${params.length}`)
  }

  const rows = await query<ShareholderMovementRow>(
    `
      SELECT
        sam.movement_id,
        sam.account_id,
        sam.direction,
        sam.movement_type,
        sam.amount,
        sam.currency,
        sam.exchange_rate,
        sam.amount_clp,
        sam.linked_expense_id,
        sam.linked_income_id,
        sam.linked_payment_type,
        sam.linked_payment_id,
        sam.settlement_group_id,
        sam.counterparty_account_id,
        ca.account_name AS counterparty_account_name,
        sam.description,
        sam.evidence_url,
        sam.movement_date,
        sam.running_balance_clp,
        sam.source_type,
        sam.source_id,
        sam.space_id,
        sam.recorded_by_user_id,
        sam.recorded_at
      FROM greenhouse_finance.shareholder_account_movements sam
      LEFT JOIN greenhouse_finance.accounts ca
        ON ca.account_id = sam.counterparty_account_id
      WHERE ${filters.join(' AND ')}
      ORDER BY sam.movement_date DESC, sam.recorded_at DESC
    `,
    params
  )

  return enrichShareholderMovements({
    movements: rows.map(mapMovementRow),
    tenantScope
  })
}

export const getShareholderAccountBalance = async (accountId: string): Promise<ShareholderAccountBalance> => {
  const normalizedAccountId = assertNonEmptyString(accountId, 'accountId')
  const account = await getShareholderAccountCore(normalizedAccountId)

  const rows = await query<ShareholderAccountBalanceRow>(`
    SELECT
      sa.account_id,
      a.currency,
      COALESCE(SUM(
        CASE
          WHEN sam.direction = 'credit' THEN sam.amount
          ELSE -sam.amount
        END
      ), 0)::text AS balance,
      COALESCE(SUM(
        CASE
          WHEN sam.direction = 'credit' THEN sam.amount_clp
          ELSE -sam.amount_clp
        END
      ), 0)::text AS balance_clp,
      MAX(sam.movement_date) AS last_movement_date,
      COUNT(sam.movement_id)::text AS movement_count
    FROM greenhouse_finance.shareholder_accounts sa
    INNER JOIN greenhouse_finance.accounts a
      ON a.account_id = sa.account_id
    LEFT JOIN greenhouse_finance.shareholder_account_movements sam
      ON sam.account_id = sa.account_id
    WHERE sa.account_id = $1
    GROUP BY sa.account_id, a.currency
  `, [normalizedAccountId])

  const current = rows[0]

  if (!current) {
    throw new FinanceValidationError(`Shareholder account "${normalizedAccountId}" not found.`, 404)
  }

  const balance = mapBalanceRow(current)

  if (balance.movementCount === 0 && roundCurrency(toNumber(account.opening_balance)) !== 0) {
    return {
      ...balance,
      balance: roundCurrency(toNumber(account.opening_balance)),
      balanceClp: roundCurrency(toNumber(account.opening_balance)),
      position:
        toNumber(account.opening_balance) > 0
          ? 'company_owes_shareholder'
          : toNumber(account.opening_balance) < 0
            ? 'shareholder_owes_company'
            : 'settled'
    }
  }

  return balance
}

export const recordShareholderAccountMovement = async (
  accountId: string,
  input: RecordShareholderMovementInput
): Promise<ShareholderAccountMovement> => {
  const normalizedAccountId = assertNonEmptyString(accountId, 'accountId')
  const account = await getShareholderAccountCore(normalizedAccountId)
  const direction = assertMovementDirection(input.direction)
  const movementType = assertMovementType(input.movementType)
  const movementDate = assertDateString(input.movementDate, 'movementDate')
  const amount = roundCurrency(toNumber(input.amount))

  if (amount <= 0) {
    throw new FinanceValidationError('amount must be greater than zero.')
  }

  const currency = assertValidCurrency(input.currency || (normalizeString(account.currency) as FinanceCurrency))

  if (currency !== normalizeString(account.currency)) {
    throw new FinanceValidationError('Movement currency must match the shareholder account currency in this slice.')
  }

  const counterpartyAccountId = normalizeString(input.counterpartyAccountId) || null

  if (counterpartyAccountId && counterpartyAccountId === normalizedAccountId) {
    throw new FinanceValidationError('counterpartyAccountId must be different from accountId.')
  }

  if (counterpartyAccountId) {
    await validateCounterpartyAccount(counterpartyAccountId, currency)
  }

  const exchangeRate = currency === 'CLP'
    ? 1
    : await resolveExchangeRateToClp({
        currency,
        requestedRate: input.exchangeRateOverride ?? null
      })

  const amountClp = currency === 'CLP'
    ? amount
    : roundCurrency(amount * exchangeRate)

  const description = normalizeString(input.description) || null
  const evidenceUrl = normalizeString(input.evidenceUrl) || null
  const normalizedTenantScope = input.tenantScope || null

  const inferredSource = inferShareholderMovementSource({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    linkedExpenseId: input.linkedExpenseId,
    linkedIncomeId: input.linkedIncomeId,
    linkedPaymentType: input.linkedPaymentType,
    linkedPaymentId: input.linkedPaymentId
  })

  if (inferredSource.sourceType !== 'manual' && (!normalizedTenantScope || !inferredSource.sourceId)) {
    throw new FinanceValidationError('A tenant-scoped canonical source is required for non-manual shareholder movements.', 422)
  }

  const resolvedSource = inferredSource.sourceType !== 'manual' && inferredSource.sourceId && normalizedTenantScope
    ? await resolveShareholderMovementSource({
        scope: normalizedTenantScope,
        sourceType: inferredSource.sourceType,
        sourceId: inferredSource.sourceId
      })
    : null

  const linkedExpenseId = resolvedSource?.linkedExpenseId || normalizeString(input.linkedExpenseId) || null
  const linkedIncomeId = resolvedSource?.linkedIncomeId || normalizeString(input.linkedIncomeId) || null

  const linkedPaymentType = resolvedSource?.linkedPaymentType
    || (input.linkedPaymentType ? normalizeString(input.linkedPaymentType) as 'income_payment' | 'expense_payment' : null)

  const linkedPaymentId = resolvedSource?.linkedPaymentId || normalizeString(input.linkedPaymentId) || null
  const spaceId = normalizeString(input.spaceId || account.space_id) || null
  const actorUserId = normalizeString(input.actorUserId) || null
  const movementId = `sha-mov-${randomUUID()}`
  const settlementGroupId = `stlgrp-sha-${randomUUID()}`
  const primaryLegId = `stlleg-sha-${randomUUID()}`
  const mirrorLegId = counterpartyAccountId ? `stlleg-sha-${randomUUID()}` : null

  const db = await getDb()

  await db.transaction().execute(async trx => {
    const runningRow = await trx
      .selectFrom('greenhouse_finance.shareholder_account_movements as sam')
      .select('sam.running_balance_clp')
      .where('sam.account_id', '=', normalizedAccountId)
      .orderBy('sam.movement_date', 'desc')
      .orderBy('sam.recorded_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    const previousRunningBalanceClp = toNumber(runningRow?.running_balance_clp ?? 0)
    const signedAmountClp = direction === 'credit' ? amountClp : -amountClp
    const runningBalanceClp = roundCurrency(previousRunningBalanceClp + signedAmountClp)

    await trx
      .insertInto('greenhouse_finance.settlement_groups')
      .values({
        settlement_group_id: settlementGroupId,
        group_direction: buildMovementSettlementDirection(direction),
        settlement_mode: counterpartyAccountId ? 'mixed' : 'funding',
        source_payment_type: linkedPaymentType,
        source_payment_id: linkedPaymentId,
        primary_instrument_id: normalizedAccountId,
        provider_reference: null,
        provider_status: 'settled',
        notes: description,
        created_by_user_id: actorUserId
      })
      .execute()

    await trx
      .insertInto('greenhouse_finance.settlement_legs')
      .values({
        settlement_leg_id: primaryLegId,
        settlement_group_id: settlementGroupId,
        linked_payment_type: linkedPaymentType,
        linked_payment_id: linkedPaymentId,
        leg_type: 'funding',
        direction: buildMovementSettlementDirection(direction),
        instrument_id: normalizedAccountId,
        counterparty_instrument_id: counterpartyAccountId,
        currency,
        amount: amount.toString(),
        amount_clp: amountClp.toString(),
        fx_rate: exchangeRate.toString(),
        provider_reference: null,
        provider_status: 'settled',
        transaction_date: movementDate,
        is_reconciled: false,
        reconciliation_row_id: null,
        reconciled_at: null,
        notes: description,
        created_by_user_id: actorUserId
      })
      .execute()

    if (counterpartyAccountId && mirrorLegId) {
      await trx
        .insertInto('greenhouse_finance.settlement_legs')
        .values({
          settlement_leg_id: mirrorLegId,
          settlement_group_id: settlementGroupId,
          linked_payment_type: linkedPaymentType,
          linked_payment_id: linkedPaymentId,
          leg_type: 'funding',
          direction: direction === 'credit' ? 'outgoing' : 'incoming',
          instrument_id: counterpartyAccountId,
          counterparty_instrument_id: normalizedAccountId,
          currency,
          amount: amount.toString(),
          amount_clp: amountClp.toString(),
          fx_rate: exchangeRate.toString(),
          provider_reference: null,
          provider_status: 'settled',
          transaction_date: movementDate,
          is_reconciled: false,
          reconciliation_row_id: null,
          reconciled_at: null,
          notes: description,
          created_by_user_id: actorUserId
        })
        .execute()
    }

    await sql`
      INSERT INTO greenhouse_finance.shareholder_account_movements (
        movement_id,
        account_id,
        direction,
        movement_type,
        amount,
        currency,
        exchange_rate,
        amount_clp,
        linked_expense_id,
        linked_income_id,
        linked_payment_type,
        linked_payment_id,
        settlement_group_id,
        counterparty_account_id,
        source_type,
        source_id,
        description,
        evidence_url,
        movement_date,
        running_balance_clp,
        metadata_json,
        space_id,
        recorded_by_user_id
      )
      VALUES (
        ${movementId},
        ${normalizedAccountId},
        ${direction},
        ${movementType},
        ${amount.toString()},
        ${currency},
        ${exchangeRate.toString()},
        ${amountClp.toString()},
        ${linkedExpenseId},
        ${linkedIncomeId},
        ${linkedPaymentType},
        ${linkedPaymentId},
        ${settlementGroupId},
        ${counterpartyAccountId},
        ${inferredSource.sourceType},
        ${inferredSource.sourceId},
        ${description},
        ${evidenceUrl},
        ${movementDate},
        ${runningBalanceClp.toString()},
        '{}'::jsonb,
        ${spaceId},
        ${actorUserId}
      )
    `.execute(trx)

    await insertOutboxEvent(trx, {
      aggregateType: 'finance_shareholder_account',
      aggregateId: normalizedAccountId,
      eventType: 'finance.shareholder_account_movement.recorded',
      payload: {
        accountId: normalizedAccountId,
        movementId,
        settlementGroupId,
        direction,
        movementType,
        amount,
        amountClp,
        currency,
        movementDate,
        counterpartyAccountId,
        sourceType: inferredSource.sourceType,
        sourceId: inferredSource.sourceId,
        linkedExpenseId,
        linkedIncomeId,
        linkedPaymentType,
        linkedPaymentId
      }
    })

    await insertOutboxEvent(trx, {
      aggregateType: 'finance_settlement_leg',
      aggregateId: primaryLegId,
      eventType: 'finance.settlement_leg.recorded',
      payload: {
        settlementLegId: primaryLegId,
        settlementGroupId,
        instrumentId: normalizedAccountId,
        counterpartyInstrumentId: counterpartyAccountId,
        transactionDate: movementDate
      }
    })

    if (counterpartyAccountId && mirrorLegId) {
      await insertOutboxEvent(trx, {
        aggregateType: 'finance_settlement_leg',
        aggregateId: mirrorLegId,
        eventType: 'finance.settlement_leg.recorded',
        payload: {
          settlementLegId: mirrorLegId,
          settlementGroupId,
          instrumentId: counterpartyAccountId,
          counterpartyInstrumentId: normalizedAccountId,
          transactionDate: movementDate
        }
      })
    }
  })

  await rematerializeAccountBalancesFromDate({
    accountId: normalizedAccountId,
    fromDate: movementDate
  })

  if (counterpartyAccountId) {
    await rematerializeAccountBalancesFromDate({
      accountId: counterpartyAccountId,
      fromDate: movementDate
    })
  }

  const created = await listShareholderAccountMovements({
    accountId: normalizedAccountId,
    tenantScope: normalizedTenantScope
  })

  const movement = created.find(item => item.movementId === movementId)

  if (!movement) {
    throw new FinanceValidationError('Movement recorded but could not be reloaded.', 500)
  }

  return movement
}
