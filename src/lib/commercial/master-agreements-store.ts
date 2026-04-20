import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { attachAssetToAggregate, buildPrivateAssetDownloadUrl } from '@/lib/storage/greenhouse-assets'
import type {
  MasterAgreementContractLinkRow,
  MasterAgreementDetailRow,
  MasterAgreementListRow,
  MasterAgreementStatus,
  ResolvedContractClauseRow
} from '@/lib/commercial/master-agreements-types'
import {
  listMasterAgreementClauses,
  replaceMasterAgreementClauses
} from '@/lib/commercial/master-agreement-clauses-store'
import {
  publishContractMsaLinked,
  publishMasterAgreementClausesChanged,
  publishMasterAgreementCreated,
  publishMasterAgreementUpdated
} from '@/lib/commercial/msa-events'
import { resolveFinanceContractTenantScope } from '@/lib/commercial/contract-tenant-scope'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

type MasterAgreementDbRow = {
  msa_id: string
  msa_number: string
  title: string
  counterparty_name: string | null
  organization_id: string
  organization_name: string | null
  client_id: string | null
  client_name: string | null
  status: string
  effective_date: string | Date
  expiration_date: string | Date | null
  auto_renewal: boolean
  renewal_frequency_months: number | null
  renewal_notice_days: number
  governing_law: string | null
  jurisdiction: string | null
  payment_terms_days: number | null
  currency: string | null
  signed_at: string | Date | null
  signed_by_client: string | null
  signed_by_efeonce: string | null
  signed_document_asset_id: string | null
  signature_provider: string | null
  signature_status: string | null
  signature_document_token: string | null
  signature_last_synced_at: string | Date | null
  internal_notes: string | null
  contract_count: number | string | null
  active_clause_count: number | string | null
  updated_at: string | Date
}

type ContractLinkDbRow = {
  contract_id: string
  contract_number: string
  status: string
  client_id: string | null
  organization_id: string | null
  start_date: string | Date | null
  end_date: string | Date | null
}

type ContractMsaRow = {
  contract_id: string
  contract_number: string
  status: string
  organization_id: string | null
  client_id: string | null
  msa_id: string | null
}

export class MasterAgreementValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'MasterAgreementValidationError'
    this.statusCode = statusCode
  }
}

const MASTER_AGREEMENT_STATUSES: readonly MasterAgreementStatus[] = [
  'draft',
  'active',
  'expired',
  'terminated',
  'superseded'
]

const isStatus = (value: string): value is MasterAgreementStatus =>
  (MASTER_AGREEMENT_STATUSES as readonly string[]).includes(value)

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toIsoTs = (value: string | Date | null): string | null => {
  if (!value) return null
  
return value instanceof Date ? value.toISOString() : String(value)
}

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeOptionalString = (value: string | null | undefined) => {
  const normalized = value?.trim() ?? ''

  return normalized.length > 0 ? normalized : null
}

const mapMasterAgreementRow = (row: MasterAgreementDbRow): MasterAgreementListRow => ({
  msaId: row.msa_id,
  msaNumber: row.msa_number,
  title: row.title,
  counterpartyName: row.counterparty_name,
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  clientId: row.client_id,
  clientName: row.client_name,
  status: isStatus(row.status) ? row.status : 'draft',
  effectiveDate: toIsoDate(row.effective_date) ?? new Date().toISOString().slice(0, 10),
  expirationDate: toIsoDate(row.expiration_date),
  autoRenewal: Boolean(row.auto_renewal),
  renewalFrequencyMonths: row.renewal_frequency_months ?? null,
  renewalNoticeDays: Number(row.renewal_notice_days ?? 0),
  governingLaw: row.governing_law,
  jurisdiction: row.jurisdiction,
  paymentTermsDays: row.payment_terms_days ?? null,
  currency: row.currency,
  signedAt: toIsoTs(row.signed_at ?? null),
  signedByClient: row.signed_by_client,
  signedByEfeonce: row.signed_by_efeonce,
  signedDocumentAssetId: row.signed_document_asset_id,
  signatureProvider: row.signature_provider,
  signatureStatus: row.signature_status,
  signatureDocumentToken: row.signature_document_token,
  signatureLastSyncedAt: toIsoTs(row.signature_last_synced_at ?? null),
  contractCount: toNumber(row.contract_count),
  activeClauseCount: toNumber(row.active_clause_count),
  updatedAt: toIsoTs(row.updated_at) ?? new Date().toISOString()
})

const mapContractLinkRow = (row: ContractLinkDbRow): MasterAgreementContractLinkRow => ({
  contractId: row.contract_id,
  contractNumber: row.contract_number,
  status: row.status,
  clientId: row.client_id,
  organizationId: row.organization_id,
  startDate: toIsoDate(row.start_date),
  endDate: toIsoDate(row.end_date)
})

const buildMasterAgreementNumber = () => `EO-MSA-${randomUUID().slice(0, 8).toUpperCase()}`

const assertDates = ({
  effectiveDate,
  expirationDate
}: {
  effectiveDate: string
  expirationDate?: string | null
}) => {
  if (!effectiveDate) {
    throw new MasterAgreementValidationError('effectiveDate es requerido.')
  }

  if (expirationDate && expirationDate < effectiveDate) {
    throw new MasterAgreementValidationError('expirationDate no puede ser anterior a effectiveDate.')
  }
}

const buildTenantWhereClause = ({
  organizationIds,
  spaceIds,
  alias
}: {
  organizationIds: string[]
  spaceIds: string[]
  alias: string
}) => {
  const conditions: Array<ReturnType<typeof sql>> = []

  if (organizationIds.length > 0) {
    conditions.push(sql<boolean>`${sql.ref(`${alias}.organization_id`)} IN (${sql.join(organizationIds.map(id => sql`${id}`), sql`, `)})`)
  }

  if (spaceIds.length > 0) {
    conditions.push(sql<boolean>`${sql.ref(`${alias}.space_id`)} IN (${sql.join(spaceIds.map(id => sql`${id}`), sql`, `)})`)
  }

  if (conditions.length === 0) {
    return sql<boolean>`FALSE`
  }

  return sql<boolean>`(${sql.join(conditions, sql` OR `)})`
}

const loadMasterAgreementRow = async (msaId: string) => {
  const db = await getDb()

  const result = await sql<MasterAgreementDbRow>`
    SELECT
      ma.msa_id,
      ma.msa_number,
      ma.title,
      ma.counterparty_name,
      ma.organization_id,
      org.organization_name,
      ma.client_id,
      cl.client_name,
      ma.status,
      ma.effective_date,
      ma.expiration_date,
      ma.auto_renewal,
      ma.renewal_frequency_months,
      ma.renewal_notice_days,
      ma.governing_law,
      ma.jurisdiction,
      ma.payment_terms_days,
      ma.currency,
      ma.signed_at,
      ma.signed_by_client,
      ma.signed_by_efeonce,
      ma.signed_document_asset_id,
      ma.signature_provider,
      ma.signature_status,
      ma.signature_document_token,
      ma.signature_last_synced_at,
      ma.internal_notes,
      COALESCE(contracts.contract_count, 0) AS contract_count,
      COALESCE(clauses.active_clause_count, 0) AS active_clause_count,
      ma.updated_at
    FROM greenhouse_commercial.master_agreements AS ma
    LEFT JOIN greenhouse_core.organizations AS org
      ON org.organization_id = ma.organization_id
    LEFT JOIN greenhouse_core.clients AS cl
      ON cl.client_id = ma.client_id
    LEFT JOIN (
      SELECT msa_id, COUNT(*)::int AS contract_count
      FROM greenhouse_commercial.contracts
      WHERE msa_id IS NOT NULL
      GROUP BY msa_id
    ) AS contracts
      ON contracts.msa_id = ma.msa_id
    LEFT JOIN (
      SELECT msa_id, COUNT(*) FILTER (WHERE included = TRUE)::int AS active_clause_count
      FROM greenhouse_commercial.master_agreement_clauses
      GROUP BY msa_id
    ) AS clauses
      ON clauses.msa_id = ma.msa_id
    WHERE ma.msa_id = ${msaId}
    LIMIT 1
  `.execute(db)

  return result.rows[0] ? mapMasterAgreementRow(result.rows[0]) : null
}

export const listMasterAgreements = async ({
  tenant,
  status
}: {
  tenant: TenantContext
  status?: MasterAgreementStatus | null
}): Promise<MasterAgreementListRow[]> => {
  const { organizationIds, hasScope } = await resolveFinanceContractTenantScope(tenant)

  if (!hasScope || organizationIds.length === 0) {
    return []
  }

  const db = await getDb()

  const conditions = [
    sql<boolean>`ma.organization_id IN (${sql.join(organizationIds.map(id => sql`${id}`), sql`, `)})`
  ]

  if (status) {
    conditions.push(sql<boolean>`ma.status = ${status}`)
  }

  const result = await sql<MasterAgreementDbRow>`
    SELECT
      ma.msa_id,
      ma.msa_number,
      ma.title,
      ma.counterparty_name,
      ma.organization_id,
      org.organization_name,
      ma.client_id,
      cl.client_name,
      ma.status,
      ma.effective_date,
      ma.expiration_date,
      ma.auto_renewal,
      ma.renewal_frequency_months,
      ma.renewal_notice_days,
      ma.governing_law,
      ma.jurisdiction,
      ma.payment_terms_days,
      ma.currency,
      ma.signed_at,
      ma.signed_by_client,
      ma.signed_by_efeonce,
      ma.signed_document_asset_id,
      ma.signature_provider,
      ma.signature_status,
      ma.signature_document_token,
      ma.signature_last_synced_at,
      ma.internal_notes,
      COALESCE(contracts.contract_count, 0) AS contract_count,
      COALESCE(clauses.active_clause_count, 0) AS active_clause_count,
      ma.updated_at
    FROM greenhouse_commercial.master_agreements AS ma
    LEFT JOIN greenhouse_core.organizations AS org
      ON org.organization_id = ma.organization_id
    LEFT JOIN greenhouse_core.clients AS cl
      ON cl.client_id = ma.client_id
    LEFT JOIN (
      SELECT msa_id, COUNT(*)::int AS contract_count
      FROM greenhouse_commercial.contracts
      WHERE msa_id IS NOT NULL
      GROUP BY msa_id
    ) AS contracts
      ON contracts.msa_id = ma.msa_id
    LEFT JOIN (
      SELECT msa_id, COUNT(*) FILTER (WHERE included = TRUE)::int AS active_clause_count
      FROM greenhouse_commercial.master_agreement_clauses
      GROUP BY msa_id
    ) AS clauses
      ON clauses.msa_id = ma.msa_id
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY
      CASE ma.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
      ma.expiration_date ASC NULLS LAST,
      ma.updated_at DESC
  `.execute(db)

  return result.rows.map(mapMasterAgreementRow)
}

export const getMasterAgreementDetail = async ({
  tenant,
  msaId
}: {
  tenant: TenantContext
  msaId: string
}): Promise<MasterAgreementDetailRow | null> => {
  const { organizationIds, hasScope } = await resolveFinanceContractTenantScope(tenant)

  if (!hasScope || organizationIds.length === 0) {
    return null
  }

  const base = await loadMasterAgreementRow(msaId)

  if (!base || !organizationIds.includes(base.organizationId)) {
    return null
  }

  const db = await getDb()

  const contractResult = await sql<ContractLinkDbRow>`
    SELECT
      contract_id,
      contract_number,
      status,
      client_id,
      organization_id,
      start_date,
      end_date
    FROM greenhouse_commercial.contracts
    WHERE msa_id = ${msaId}
    ORDER BY start_date DESC NULLS LAST, contract_number ASC
  `.execute(db)

  const clauses = await listMasterAgreementClauses({
    msaId,
    runtime: {
      paymentTermsDays: base.paymentTermsDays,
      governingLaw: base.governingLaw,
      jurisdiction: base.jurisdiction
    }
  })

  return {
    ...base,
    internalNotes: (await sql<{ internal_notes: string | null }>`
      SELECT internal_notes
      FROM greenhouse_commercial.master_agreements
      WHERE msa_id = ${msaId}
    `.execute(db)).rows[0]?.internal_notes ?? null,
    signedDocumentDownloadUrl: base.signedDocumentAssetId
      ? buildPrivateAssetDownloadUrl(base.signedDocumentAssetId)
      : null,
    clauses,
    linkedContracts: contractResult.rows.map(mapContractLinkRow)
  }
}

const assertOrganizationVisible = async (tenant: TenantContext, organizationId: string) => {
  const { organizationIds } = await resolveFinanceContractTenantScope(tenant)

  if (!organizationIds.includes(organizationId)) {
    throw new MasterAgreementValidationError('La organización no está visible para este tenant.', 403)
  }
}

export const createMasterAgreement = async ({
  tenant,
  actorUserId,
  input
}: {
  tenant: TenantContext
  actorUserId: string
  input: {
    msaNumber?: string | null
    title: string
    organizationId: string
    clientId?: string | null
    counterpartyName?: string | null
    status?: MasterAgreementStatus
    effectiveDate: string
    expirationDate?: string | null
    autoRenewal?: boolean
    renewalFrequencyMonths?: number | null
    renewalNoticeDays?: number | null
    governingLaw?: string | null
    jurisdiction?: string | null
    paymentTermsDays?: number | null
    currency?: string | null
    signedAt?: string | null
    signedByClient?: string | null
    signedByEfeonce?: string | null
    internalNotes?: string | null
    signedDocumentAssetId?: string | null
    clauses?: Array<{
      clauseId: string
      bodyOverride?: string | null
      variables?: Record<string, unknown>
      included?: boolean
      sortOrder?: number
      effectiveFrom?: string | null
      effectiveTo?: string | null
      notes?: string | null
    }>
  }
}) => {
  if (!normalizeOptionalString(input.title)) {
    throw new MasterAgreementValidationError('title es requerido.')
  }

  assertDates({
    effectiveDate: input.effectiveDate,
    expirationDate: input.expirationDate ?? null
  })

  await assertOrganizationVisible(tenant, input.organizationId)

  const db = await getDb()

  const created = await db.transaction().execute(async trx => {
    const result = await sql<MasterAgreementDbRow>`
      INSERT INTO greenhouse_commercial.master_agreements (
        msa_number,
        organization_id,
        client_id,
        title,
        counterparty_name,
        status,
        effective_date,
        expiration_date,
        auto_renewal,
        renewal_frequency_months,
        renewal_notice_days,
        governing_law,
        jurisdiction,
        payment_terms_days,
        currency,
        signed_at,
        signed_by_client,
        signed_by_efeonce,
        signed_document_asset_id,
        internal_notes,
        created_by,
        updated_by
      )
      VALUES (
        ${normalizeOptionalString(input.msaNumber) ?? buildMasterAgreementNumber()},
        ${input.organizationId},
        ${normalizeOptionalString(input.clientId) ?? null},
        ${input.title.trim()},
        ${normalizeOptionalString(input.counterpartyName) ?? null},
        ${input.status ?? 'draft'},
        ${input.effectiveDate}::date,
        ${normalizeOptionalString(input.expirationDate) ?? null}::date,
        ${input.autoRenewal ?? false},
        ${(input.autoRenewal ?? false) ? (input.renewalFrequencyMonths ?? 12) : null},
        ${input.renewalNoticeDays ?? 30},
        ${normalizeOptionalString(input.governingLaw) ?? null},
        ${normalizeOptionalString(input.jurisdiction) ?? null},
        ${input.paymentTermsDays ?? null},
        ${normalizeOptionalString(input.currency) ?? 'CLP'},
        ${normalizeOptionalString(input.signedAt) ?? null}::timestamptz,
        ${normalizeOptionalString(input.signedByClient) ?? null},
        ${normalizeOptionalString(input.signedByEfeonce) ?? null},
        ${normalizeOptionalString(input.signedDocumentAssetId) ?? null},
        ${normalizeOptionalString(input.internalNotes) ?? null},
        ${actorUserId},
        ${actorUserId}
      )
      RETURNING
        msa_id,
        msa_number,
        title,
        counterparty_name,
        organization_id,
        NULL::text AS organization_name,
        client_id,
        NULL::text AS client_name,
        status,
        effective_date,
        expiration_date,
        auto_renewal,
        renewal_frequency_months,
        renewal_notice_days,
        governing_law,
        jurisdiction,
        payment_terms_days,
        currency,
        signed_at,
        signed_by_client,
        signed_by_efeonce,
        signed_document_asset_id,
        signature_provider,
        signature_status,
        signature_document_token,
        signature_last_synced_at,
        internal_notes,
        0::int AS contract_count,
        0::int AS active_clause_count,
        updated_at
    `.execute(trx)

    const row = mapMasterAgreementRow(result.rows[0])

    if (input.clauses?.length) {
      await replaceMasterAgreementClauses({
        msaId: row.msaId,
        clauses: input.clauses,
        actorUserId,
        dbOrTx: trx
      })
    }

    if (input.signedDocumentAssetId) {
      await attachAssetToAggregate({
        assetId: input.signedDocumentAssetId,
        ownerAggregateType: 'master_agreement',
        ownerAggregateId: row.msaId,
        actorUserId,
        ownerClientId: row.clientId,
        metadata: {
          msaId: row.msaId,
          msaNumber: row.msaNumber
        }
      })
    }

    await publishMasterAgreementCreated(
      {
        msaId: row.msaId,
        msaNumber: row.msaNumber,
        organizationId: row.organizationId,
        clientId: row.clientId,
        status: row.status,
        clauseCount: input.clauses?.length ?? 0,
        actorUserId
      },
      trx
    )

    if (input.clauses?.length) {
      await publishMasterAgreementClausesChanged(
        {
          msaId: row.msaId,
          msaNumber: row.msaNumber,
          organizationId: row.organizationId,
          clientId: row.clientId,
          status: row.status,
          clauseCount: input.clauses.length,
          actorUserId
        },
        trx
      )
    }

    return row
  })

  return loadMasterAgreementRow(created.msaId)
}

export const updateMasterAgreement = async ({
  tenant,
  msaId,
  actorUserId,
  input
}: {
  tenant: TenantContext
  msaId: string
  actorUserId: string
  input: {
    msaNumber?: string | null
    title?: string
    clientId?: string | null
    counterpartyName?: string | null
    status?: MasterAgreementStatus
    effectiveDate?: string
    expirationDate?: string | null
    autoRenewal?: boolean
    renewalFrequencyMonths?: number | null
    renewalNoticeDays?: number | null
    governingLaw?: string | null
    jurisdiction?: string | null
    paymentTermsDays?: number | null
    currency?: string | null
    signedAt?: string | null
    signedByClient?: string | null
    signedByEfeonce?: string | null
    internalNotes?: string | null
    signedDocumentAssetId?: string | null
    clauses?: Array<{
      clauseId: string
      bodyOverride?: string | null
      variables?: Record<string, unknown>
      included?: boolean
      sortOrder?: number
      effectiveFrom?: string | null
      effectiveTo?: string | null
      notes?: string | null
    }>
  }
}) => {
  const current = await getMasterAgreementDetail({ tenant, msaId })

  if (!current) {
    return null
  }

  assertDates({
    effectiveDate: input.effectiveDate ?? current.effectiveDate,
    expirationDate: input.expirationDate ?? current.expirationDate
  })

  const updates: Array<ReturnType<typeof sql>> = []

  if (input.msaNumber !== undefined) {
    updates.push(sql`msa_number = ${normalizeOptionalString(input.msaNumber) ?? current.msaNumber}`)
  }

  if (input.title !== undefined) {
    const title = normalizeOptionalString(input.title)

    if (!title) {
      throw new MasterAgreementValidationError('title es requerido.')
    }

    updates.push(sql`title = ${title}`)
  }

  if (input.clientId !== undefined) {
    updates.push(sql`client_id = ${normalizeOptionalString(input.clientId) ?? null}`)
  }

  if (input.counterpartyName !== undefined) {
    updates.push(sql`counterparty_name = ${normalizeOptionalString(input.counterpartyName) ?? null}`)
  }

  if (input.status !== undefined) {
    updates.push(sql`status = ${input.status}`)
  }

  if (input.effectiveDate !== undefined) {
    updates.push(sql`effective_date = ${input.effectiveDate}::date`)
  }

  if (input.expirationDate !== undefined) {
    updates.push(sql`expiration_date = ${normalizeOptionalString(input.expirationDate) ?? null}::date`)
  }

  if (input.autoRenewal !== undefined) {
    updates.push(sql`auto_renewal = ${input.autoRenewal}`)
  }

  if (input.renewalFrequencyMonths !== undefined || input.autoRenewal !== undefined) {
    const autoRenewal = input.autoRenewal ?? current.autoRenewal

    const renewalFrequencyMonths = autoRenewal
      ? (input.renewalFrequencyMonths ?? current.renewalFrequencyMonths ?? 12)
      : null

    updates.push(sql`renewal_frequency_months = ${renewalFrequencyMonths}`)
  }

  if (input.renewalNoticeDays !== undefined) {
    updates.push(sql`renewal_notice_days = ${input.renewalNoticeDays}`)
  }

  if (input.governingLaw !== undefined) {
    updates.push(sql`governing_law = ${normalizeOptionalString(input.governingLaw) ?? null}`)
  }

  if (input.jurisdiction !== undefined) {
    updates.push(sql`jurisdiction = ${normalizeOptionalString(input.jurisdiction) ?? null}`)
  }

  if (input.paymentTermsDays !== undefined) {
    updates.push(sql`payment_terms_days = ${input.paymentTermsDays ?? null}`)
  }

  if (input.currency !== undefined) {
    updates.push(sql`currency = ${normalizeOptionalString(input.currency) ?? 'CLP'}`)
  }

  if (input.signedAt !== undefined) {
    updates.push(sql`signed_at = ${normalizeOptionalString(input.signedAt) ?? null}::timestamptz`)
  }

  if (input.signedByClient !== undefined) {
    updates.push(sql`signed_by_client = ${normalizeOptionalString(input.signedByClient) ?? null}`)
  }

  if (input.signedByEfeonce !== undefined) {
    updates.push(sql`signed_by_efeonce = ${normalizeOptionalString(input.signedByEfeonce) ?? null}`)
  }

  if (input.internalNotes !== undefined) {
    updates.push(sql`internal_notes = ${normalizeOptionalString(input.internalNotes) ?? null}`)
  }

  if (input.signedDocumentAssetId !== undefined) {
    updates.push(sql`signed_document_asset_id = ${normalizeOptionalString(input.signedDocumentAssetId) ?? null}`)
  }

  const db = await getDb()

  await db.transaction().execute(async trx => {
    if (updates.length > 0) {
      updates.push(sql`updated_by = ${actorUserId}`)
      updates.push(sql`updated_at = NOW()`)

      await sql`
        UPDATE greenhouse_commercial.master_agreements
        SET ${sql.join(updates, sql`, `)}
        WHERE msa_id = ${msaId}
      `.execute(trx)
    }

    if (input.clauses) {
      await replaceMasterAgreementClauses({
        msaId,
        clauses: input.clauses,
        actorUserId,
        dbOrTx: trx
      })
    }

    if (input.signedDocumentAssetId) {
      await attachAssetToAggregate({
        assetId: input.signedDocumentAssetId,
        ownerAggregateType: 'master_agreement',
        ownerAggregateId: msaId,
        actorUserId,
        ownerClientId: input.clientId ?? current.clientId,
        metadata: {
          msaId,
          msaNumber: input.msaNumber ?? current.msaNumber
        }
      })
    }

    await publishMasterAgreementUpdated(
      {
        msaId,
        msaNumber: input.msaNumber ?? current.msaNumber,
        organizationId: current.organizationId,
        clientId: input.clientId ?? current.clientId,
        status: input.status ?? current.status,
        actorUserId
      },
      trx
    )

    if (input.clauses) {
      await publishMasterAgreementClausesChanged(
        {
          msaId,
          msaNumber: input.msaNumber ?? current.msaNumber,
          organizationId: current.organizationId,
          clientId: input.clientId ?? current.clientId,
          status: input.status ?? current.status,
          clauseCount: input.clauses.length,
          actorUserId
        },
        trx
      )
    }
  })

  return loadMasterAgreementRow(msaId)
}

export const syncMasterAgreementSignature = async ({
  msaId,
  actorUserId,
  signatureProvider,
  signatureStatus,
  signatureDocumentToken,
  signedAt,
  signedByClient,
  signedByEfeonce,
  signedDocumentAssetId,
  signaturePayload
}: {
  msaId: string
  actorUserId?: string | null
  signatureProvider?: string | null
  signatureStatus?: string | null
  signatureDocumentToken?: string | null
  signedAt?: string | null
  signedByClient?: string | null
  signedByEfeonce?: string | null
  signedDocumentAssetId?: string | null
  signaturePayload?: Record<string, unknown> | null
}) => {
  const db = await getDb()

  const updates: Array<ReturnType<typeof sql>> = [
    sql`updated_at = NOW()`,
    sql`updated_by = ${actorUserId ?? 'system:zapsign'}`
  ]

  if (signatureProvider !== undefined) {
    updates.push(sql`signature_provider = ${normalizeOptionalString(signatureProvider) ?? null}`)
  }

  if (signatureStatus !== undefined) {
    updates.push(sql`signature_status = ${normalizeOptionalString(signatureStatus) ?? null}`)
  }

  if (signatureDocumentToken !== undefined) {
    updates.push(sql`signature_document_token = ${normalizeOptionalString(signatureDocumentToken) ?? null}`)
  }

  if (signedAt !== undefined) {
    updates.push(sql`signed_at = ${normalizeOptionalString(signedAt) ?? null}::timestamptz`)
  }

  if (signedByClient !== undefined) {
    updates.push(sql`signed_by_client = ${normalizeOptionalString(signedByClient) ?? null}`)
  }

  if (signedByEfeonce !== undefined) {
    updates.push(sql`signed_by_efeonce = ${normalizeOptionalString(signedByEfeonce) ?? null}`)
  }

  if (signedDocumentAssetId !== undefined) {
    updates.push(sql`signed_document_asset_id = ${normalizeOptionalString(signedDocumentAssetId) ?? null}`)
  }

  updates.push(sql`signature_last_synced_at = NOW()`)

  if (signaturePayload !== undefined) {
    updates.push(sql`signature_payload = ${JSON.stringify(signaturePayload ?? {})}::jsonb`)
  }

  await sql`
    UPDATE greenhouse_commercial.master_agreements
    SET ${sql.join(updates, sql`, `)}
    WHERE msa_id = ${msaId}
  `.execute(db)

  if (signedDocumentAssetId) {
    const current = await loadMasterAgreementRow(msaId)

    if (current) {
      await attachAssetToAggregate({
        assetId: signedDocumentAssetId,
        ownerAggregateType: 'master_agreement',
        ownerAggregateId: msaId,
        actorUserId: actorUserId ?? 'system:zapsign',
        ownerClientId: current.clientId,
        metadata: {
          msaId,
          msaNumber: current.msaNumber,
          signatureProvider: normalizeOptionalString(signatureProvider) ?? current.signatureProvider
        }
      })
    }
  }

  return loadMasterAgreementRow(msaId)
}

export const getMasterAgreementBySignatureDocumentToken = async (
  signatureDocumentToken: string
) => {
  const normalizedToken = normalizeOptionalString(signatureDocumentToken)

  if (!normalizedToken) {
    return null
  }

  const db = await getDb()

  const result = await sql<MasterAgreementDbRow>`
    SELECT
      ma.msa_id,
      ma.msa_number,
      ma.title,
      ma.counterparty_name,
      ma.organization_id,
      org.organization_name,
      ma.client_id,
      cl.client_name,
      ma.status,
      ma.effective_date,
      ma.expiration_date,
      ma.auto_renewal,
      ma.renewal_frequency_months,
      ma.renewal_notice_days,
      ma.governing_law,
      ma.jurisdiction,
      ma.payment_terms_days,
      ma.currency,
      ma.signed_at,
      ma.signed_by_client,
      ma.signed_by_efeonce,
      ma.signed_document_asset_id,
      ma.signature_provider,
      ma.signature_status,
      ma.signature_document_token,
      ma.signature_last_synced_at,
      ma.internal_notes,
      COALESCE(contracts.contract_count, 0) AS contract_count,
      COALESCE(clauses.active_clause_count, 0) AS active_clause_count,
      ma.updated_at
    FROM greenhouse_commercial.master_agreements AS ma
    LEFT JOIN greenhouse_core.organizations AS org
      ON org.organization_id = ma.organization_id
    LEFT JOIN greenhouse_core.clients AS cl
      ON cl.client_id = ma.client_id
    LEFT JOIN (
      SELECT msa_id, COUNT(*)::int AS contract_count
      FROM greenhouse_commercial.contracts
      WHERE msa_id IS NOT NULL
      GROUP BY msa_id
    ) AS contracts
      ON contracts.msa_id = ma.msa_id
    LEFT JOIN (
      SELECT msa_id, COUNT(*) FILTER (WHERE included = TRUE)::int AS active_clause_count
      FROM greenhouse_commercial.master_agreement_clauses
      GROUP BY msa_id
    ) AS clauses
      ON clauses.msa_id = ma.msa_id
    WHERE ma.signature_document_token = ${normalizedToken}
    LIMIT 1
  `.execute(db)

  return result.rows[0] ? mapMasterAgreementRow(result.rows[0]) : null
}

export const assignMasterAgreementToContract = async ({
  tenant,
  contractId,
  msaId,
  actorUserId
}: {
  tenant: TenantContext
  contractId: string
  msaId: string | null
  actorUserId: string
}) => {
  const { organizationIds, spaceIds, hasScope } = await resolveFinanceContractTenantScope(tenant)

  if (!hasScope) {
    throw new MasterAgreementValidationError('No existe scope contractual visible para este tenant.', 403)
  }

  const db = await getDb()

  const contractResult = await sql<ContractMsaRow>`
    SELECT
      contract_id,
      contract_number,
      status,
      organization_id,
      client_id,
      msa_id
    FROM greenhouse_commercial.contracts AS c
    WHERE c.contract_id = ${contractId}
      AND ${buildTenantWhereClause({ organizationIds, spaceIds, alias: 'c' })}
    LIMIT 1
  `.execute(db)

  const contract = contractResult.rows[0]

  if (!contract) {
    throw new MasterAgreementValidationError('Contract no encontrado para este tenant.', 404)
  }

  let masterAgreement: MasterAgreementListRow | null = null

  if (msaId) {
    masterAgreement = await loadMasterAgreementRow(msaId)

    if (!masterAgreement) {
      throw new MasterAgreementValidationError('MSA no encontrado.', 404)
    }

    if (contract.organization_id && masterAgreement.organizationId !== contract.organization_id) {
      throw new MasterAgreementValidationError('El MSA debe pertenecer a la misma organización del contrato.')
    }
  }

  await sql`
    UPDATE greenhouse_commercial.contracts
    SET
      msa_id = ${msaId},
      updated_at = NOW()
    WHERE contract_id = ${contractId}
  `.execute(db)

  if (masterAgreement) {
    await publishContractMsaLinked({
      msaId: masterAgreement.msaId,
      msaNumber: masterAgreement.msaNumber,
      organizationId: masterAgreement.organizationId,
      clientId: masterAgreement.clientId,
      status: masterAgreement.status,
      contractId,
      actorUserId
    })
  }

  return {
    contractId,
    msa: masterAgreement
  }
}

export const resolveContractClauses = async ({
  tenant,
  contractId
}: {
  tenant: TenantContext
  contractId: string
}): Promise<ResolvedContractClauseRow[]> => {
  const { organizationIds, spaceIds, hasScope } = await resolveFinanceContractTenantScope(tenant)

  if (!hasScope) {
    return []
  }

  const db = await getDb()

  const result = await sql<ContractMsaRow>`
    SELECT
      contract_id,
      contract_number,
      status,
      organization_id,
      client_id,
      msa_id
    FROM greenhouse_commercial.contracts AS c
    WHERE c.contract_id = ${contractId}
      AND ${buildTenantWhereClause({ organizationIds, spaceIds, alias: 'c' })}
    LIMIT 1
  `.execute(db)

  const contract = result.rows[0]

  if (!contract?.msa_id) {
    return []
  }

  const msa = await loadMasterAgreementRow(contract.msa_id)

  if (!msa) {
    return []
  }

  const clauses = await listMasterAgreementClauses({
    msaId: msa.msaId,
    runtime: {
      paymentTermsDays: msa.paymentTermsDays,
      governingLaw: msa.governingLaw,
      jurisdiction: msa.jurisdiction
    }
  })

  return clauses
    .filter(item => item.included)
    .map(item => ({
      contractId,
      msaId: msa.msaId,
      msaNumber: msa.msaNumber,
      clauseId: item.clauseId,
      clauseCode: item.clauseCode,
      clauseVersion: item.clauseVersion,
      clauseLanguage: item.clauseLanguage,
      category: item.category,
      title: item.title,
      resolvedBody: item.resolvedBody,
      included: item.included,
      sortOrder: item.sortOrder
    }))
}
