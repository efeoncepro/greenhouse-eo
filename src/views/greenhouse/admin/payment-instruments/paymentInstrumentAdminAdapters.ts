'use client'

import {
  DEFAULT_FOR_OPTIONS,
  getProvider,
  type InstrumentCategory
} from '@/config/payment-instruments'
import { getCategoryProviderRule } from '@/lib/finance/payment-instruments/category-rules'

export type ReadinessStatus = 'ready' | 'needs_configuration' | 'at_risk' | 'inactive'
export type SectionHealth = 'ok' | 'partial' | 'error'
export type CheckStatus = 'pass' | 'warning' | 'fail'
export type AuditTone = 'success' | 'warning' | 'error' | 'info' | 'secondary'

export type PaymentInstrumentAccount = {
  accountId: string
  accountName: string
  instrumentCategory: InstrumentCategory
  providerSlug: string | null
  providerName: string | null
  currency: string
  country: string
  isActive: boolean
  openingBalance: number
  openingBalanceDate: string | null
  accountType: string
  accountNumberMasked: string | null
  providerIdentifierMasked: string | null
  cardLastFour: string | null
  cardNetwork: string | null
  creditLimit: number | null
  responsibleUserId: string | null
  defaultFor: string[]
  displayOrder: number
  notes: string | null
  metadataJsonSafe: Record<string, string | number | boolean>
  createdAt: string | null
  updatedAt: string | null
}

export type ReadinessCheck = {
  key: string
  label: string
  status: CheckStatus
  actionHref?: string
}

export type PaymentInstrumentImpact = {
  incomePaymentsCount: number
  expensePaymentsCount: number
  settlementLegsCount: number
  closedPeriodsCount: number
  latestBalanceDate: string | null
  latestMovementAt: string | null
  highImpactMutationRequired: boolean
}

export type TreasuryMovement = {
  movementId?: string
  occurredAt?: string | null
  postedAt?: string | null
  description?: string | null
  counterpartyName?: string | null
  amount?: number | null
  amountClp?: number | null
  direction?: 'in' | 'out' | string | null
  source?: string | null
  status?: string | null
}

export type TreasuryHistoryPoint = {
  period?: string | null
  balance?: number | null
  amount?: number | null
}

export type PaymentInstrumentTreasury = {
  balance: {
    amount?: number | null
    amountClp?: number | null
    currency?: string | null
    asOfDate?: string | null
    updatedAt?: string | null
  } | null
  recentMovements: TreasuryMovement[]
  history: TreasuryHistoryPoint[]
}

export type PaymentInstrumentAuditEntry = {
  auditId: string
  action: string
  actorName: string | null
  actorEmail: string | null
  reason: string | null
  createdAt: string | null
  tone: AuditTone
  summary: string
}

export type PaymentInstrumentAdminDetail = {
  account: PaymentInstrumentAccount
  readiness: {
    status: ReadinessStatus
    checks: ReadinessCheck[]
  }
  impact: PaymentInstrumentImpact
  treasury: PaymentInstrumentTreasury | null
  audit: PaymentInstrumentAuditEntry[]
  sections: {
    account: SectionHealth
    impact: SectionHealth
    treasury: SectionHealth
    audit: SectionHealth
  }
}

export type PaymentInstrumentListItem = {
  accountId: string
  instrumentName: string
  instrumentCategory: InstrumentCategory
  providerSlug: string | null
  providerName: string | null
  currency: string
  active: boolean
  defaultFor: string[]
  createdAt: string | null
  readinessStatus: ReadinessStatus
  impactScore: number
  maskedIdentifier: string | null
  updatedAt: string | null
}

export type PaymentInstrumentListResponse = {
  items: PaymentInstrumentListItem[]
  total: number
  partial: boolean
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)

const asNullableString = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null)

const asNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(numeric) ? numeric : fallback
}

const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback)

const asStringArray = (value: unknown): string[] => (Array.isArray(value) ? value.filter(item => typeof item === 'string') : [])

const isSafeMetadataValue = (value: unknown): value is string | number | boolean =>
  ['string', 'number', 'boolean'].includes(typeof value)

const toSafeMetadata = (value: unknown): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(asRecord(value)).filter((entry): entry is [string, string | number | boolean] =>
      isSafeMetadataValue(entry[1])
    )
  )

export const maskSensitiveValue = (value: unknown) => {
  const stringValue = asNullableString(value)

  if (!stringValue) return null

  const visible = stringValue.replace(/\s+/g, '').slice(-4)

  return visible ? `•••• ${visible}` : '••••'
}

export const normalizeDefaultFor = (value: string) =>
  DEFAULT_FOR_OPTIONS.find(option => option.value === value)?.label ?? value.replace(/_/g, ' ')

const normalizeReadinessStatus = (value: unknown, active: boolean): ReadinessStatus => {
  if (value === 'ready' || value === 'needs_configuration' || value === 'at_risk' || value === 'inactive') return value

  return active ? 'needs_configuration' : 'inactive'
}

const checkStatus = (value: unknown): CheckStatus =>
  value === 'pass' || value === 'warning' || value === 'fail' ? value : 'warning'

const sectionHealth = (value: unknown): SectionHealth =>
  value === 'ok' || value === 'partial' || value === 'error' ? value : 'partial'

const normalizeAccount = (raw: Record<string, unknown>): PaymentInstrumentAccount => {
  const accountRaw = asRecord(raw.account ?? raw)

  const instrumentCategory = asString(
    accountRaw.instrumentCategory ?? accountRaw.instrument_category,
    'bank_account'
  ) as InstrumentCategory

  const providerSlug = asNullableString(accountRaw.providerSlug ?? accountRaw.provider_slug)

  const provider = getProvider(providerSlug)

  return {
    accountId: asString(accountRaw.accountId ?? accountRaw.account_id, 'unknown-instrument'),
    accountName: asString(accountRaw.accountName ?? accountRaw.instrumentName ?? accountRaw.account_name, 'Instrumento sin nombre'),
    instrumentCategory,
    providerSlug,
    providerName: asNullableString(accountRaw.providerName ?? accountRaw.provider_name) ?? provider?.name ?? null,
    currency: asString(accountRaw.currency, 'CLP'),
    country: asString(accountRaw.country, 'CL'),
    isActive: asBoolean(accountRaw.isActive ?? accountRaw.active ?? accountRaw.is_active, true),
    openingBalance: asNumber(accountRaw.openingBalance ?? accountRaw.opening_balance),
    openingBalanceDate: asNullableString(accountRaw.openingBalanceDate ?? accountRaw.opening_balance_date),
    accountType: asString(accountRaw.accountType ?? accountRaw.account_type, 'asset'),
    accountNumberMasked:
      asNullableString(accountRaw.accountNumberMasked ?? accountRaw.account_number_masked) ??
      maskSensitiveValue(accountRaw.accountNumber ?? accountRaw.accountNumberFull ?? accountRaw.account_number),
    providerIdentifierMasked:
      asNullableString(accountRaw.providerIdentifierMasked ?? accountRaw.provider_identifier_masked) ??
      maskSensitiveValue(accountRaw.providerIdentifier ?? accountRaw.provider_identifier),
    cardLastFour: asNullableString(accountRaw.cardLastFour ?? accountRaw.card_last_four),
    cardNetwork: asNullableString(accountRaw.cardNetwork ?? accountRaw.card_network),
    creditLimit: accountRaw.creditLimit === null ? null : asNumber(accountRaw.creditLimit ?? accountRaw.credit_limit, 0) || null,
    responsibleUserId: asNullableString(accountRaw.responsibleUserId ?? accountRaw.responsible_user_id),
    defaultFor: asStringArray(accountRaw.defaultFor ?? accountRaw.default_for),
    displayOrder: asNumber(accountRaw.displayOrder ?? accountRaw.display_order),
    notes: asNullableString(accountRaw.notes),
    metadataJsonSafe: toSafeMetadata(accountRaw.metadataJsonSafe ?? accountRaw.metadataJson ?? accountRaw.metadata_json),
    createdAt: asNullableString(accountRaw.createdAt ?? accountRaw.created_at),
    updatedAt: asNullableString(accountRaw.updatedAt ?? accountRaw.updated_at)
  }
}

export const adaptPaymentInstrumentDetail = (payload: unknown): PaymentInstrumentAdminDetail => {
  const raw = asRecord(payload)
  const account = normalizeAccount(raw)
  const readinessRaw = asRecord(raw.readiness)
  const impactRaw = asRecord(raw.impact)
  const treasuryRaw = asRecord(raw.treasury)
  const sectionsRaw = asRecord(raw.sections)
  const hasAdminContract = Boolean(raw.account || raw.readiness || raw.impact || raw.audit || raw.sections)

  const checks = Array.isArray(readinessRaw.checks)
    ? readinessRaw.checks.map((item, index) => {
        const check = asRecord(item)

        return {
          key: asString(check.key, `check-${index}`),
          label: asString(check.label, 'Revision pendiente'),
          status: checkStatus(check.status),
          actionHref: asNullableString(check.actionHref) ?? undefined
        }
      })
    : (() => {
        const fallbackRule = getCategoryProviderRule(account.instrumentCategory as InstrumentCategory)
        const fallbackProviderRequired = fallbackRule?.requiresProvider ?? account.instrumentCategory !== 'cash'
        const fallbackProviderLabel = fallbackRule?.providerLabel ?? 'Proveedor'

        return [
        {
          key: 'provider',
          label: account.providerSlug
            ? `${fallbackProviderLabel} configurado`
            : fallbackProviderRequired
              ? `${fallbackProviderLabel} pendiente`
              : 'Proveedor no aplica',
          status: !fallbackProviderRequired || account.providerSlug ? ('pass' as const) : ('warning' as const)
        },
        {
          key: 'identifier',
          label:
            account.accountNumberMasked || account.providerIdentifierMasked || account.cardLastFour
              ? 'Identificador operativo disponible'
              : 'Identificador operativo pendiente',
          status: account.accountNumberMasked || account.providerIdentifierMasked || account.cardLastFour ? ('pass' as const) : ('warning' as const)
        },
        {
          key: 'routing',
          label: account.defaultFor.length > 0 ? 'Ruteo por defecto definido' : 'Sin ruteo por defecto',
          status: account.defaultFor.length > 0 ? ('pass' as const) : ('warning' as const)
        }
      ]
      })()

  const impact: PaymentInstrumentImpact = {
    incomePaymentsCount: asNumber(impactRaw.incomePaymentsCount),
    expensePaymentsCount: asNumber(impactRaw.expensePaymentsCount),
    settlementLegsCount: asNumber(impactRaw.settlementLegsCount),
    closedPeriodsCount: asNumber(impactRaw.closedPeriodsCount),
    latestBalanceDate: asNullableString(impactRaw.latestBalanceDate),
    latestMovementAt: asNullableString(impactRaw.latestMovementAt),
    highImpactMutationRequired: asBoolean(impactRaw.highImpactMutationRequired)
  }

  return {
    account,
    readiness: {
      status: normalizeReadinessStatus(readinessRaw.status, account.isActive),
      checks
    },
    impact,
    treasury: raw.treasury
      ? {
          balance: asRecord(treasuryRaw.balance),
          recentMovements: Array.isArray(treasuryRaw.recentMovements)
            ? treasuryRaw.recentMovements.map(item => {
                const movement = asRecord(item)

                return {
                  movementId: asString(movement.movementId ?? movement.id, ''),
                  occurredAt: asNullableString(movement.occurredAt ?? movement.date),
                  postedAt: asNullableString(movement.postedAt),
                  description: asNullableString(movement.description),
                  counterpartyName: asNullableString(movement.counterpartyName),
                  amount: asNumber(movement.amount),
                  amountClp: movement.amountClp == null ? null : asNumber(movement.amountClp),
                  direction: asNullableString(movement.direction),
                  source: asNullableString(movement.source),
                  status: asBoolean(movement.reconciled) ? 'conciliado' : asNullableString(movement.status)
                }
              })
            : [],
          history: Array.isArray(treasuryRaw.history) ? treasuryRaw.history.map(item => asRecord(item) as TreasuryHistoryPoint) : []
        }
      : null,
    audit: Array.isArray(raw.audit)
      ? raw.audit.map((item, index) => {
          const entry = asRecord(item)

          return {
            auditId: asString(entry.auditId ?? entry.audit_id, `audit-${index}`),
            action: asString(entry.action, 'activity'),
            actorName: asNullableString(entry.actorName ?? entry.actor_name),
            actorEmail: asNullableString(entry.actorEmail ?? entry.actor_email),
            reason: asNullableString(entry.reason),
            createdAt: asNullableString(entry.createdAt ?? entry.created_at),
            tone: (asString(entry.tone, 'info') as AuditTone) ?? 'info',
            summary: asString(entry.summary, asString(entry.action, 'Actividad administrativa'))
          }
        })
      : [],
    sections: {
      account: sectionHealth(sectionsRaw.account ?? 'ok'),
      impact: sectionHealth(sectionsRaw.impact ?? (hasAdminContract ? 'ok' : 'partial')),
      treasury: sectionHealth(sectionsRaw.treasury ?? (raw.treasury ? 'ok' : 'partial')),
      audit: sectionHealth(sectionsRaw.audit ?? (raw.audit ? 'ok' : 'partial'))
    }
  }
}

export const adaptPaymentInstrumentList = (payload: unknown): PaymentInstrumentListResponse => {
  const raw = asRecord(payload)
  const itemsRaw = Array.isArray(raw.items) ? raw.items : []

  return {
    items: itemsRaw.map(item => {
      const row = asRecord(item)
      const providerSlug = asNullableString(row.providerSlug ?? row.provider_slug)
      const provider = getProvider(providerSlug)
      const instrumentCategory = asString(row.instrumentCategory ?? row.instrument_category, 'bank_account') as InstrumentCategory
      const active = asBoolean(row.active ?? row.isActive ?? row.is_active, true)

      return {
        accountId: asString(row.accountId ?? row.account_id, 'unknown-instrument'),
        instrumentName: asString(row.instrumentName ?? row.accountName ?? row.account_name, 'Instrumento sin nombre'),
        instrumentCategory,
        providerSlug,
        providerName: asNullableString(row.providerName ?? row.provider_name) ?? provider?.name ?? null,
        currency: asString(row.currency, 'CLP'),
        active,
        defaultFor: asStringArray(row.defaultFor ?? row.default_for),
        createdAt: asNullableString(row.createdAt ?? row.created_at),
        readinessStatus: normalizeReadinessStatus(row.readinessStatus ?? row.readiness_status, active),
        impactScore: asNumber(row.impactScore ?? row.impact_score),
        maskedIdentifier:
          asNullableString(row.maskedIdentifier ?? row.accountNumberMasked ?? row.providerIdentifierMasked) ??
          maskSensitiveValue(row.accountNumber ?? row.accountNumberFull ?? row.providerIdentifier),
        updatedAt: asNullableString(row.updatedAt ?? row.updated_at)
      }
    }),
    total: asNumber(raw.total, itemsRaw.length),
    partial: asBoolean(raw.partial)
  }
}
