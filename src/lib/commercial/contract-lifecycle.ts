import 'server-only'

import { query, withTransaction } from '@/lib/db'
import {
  publishContractActivated,
  publishContractCompleted,
  publishContractCreated,
  publishContractModified,
  publishContractRenewed,
  publishContractTerminated
} from '@/lib/commercial/contract-events'

interface QueryResultLike<T> {
  rows: T[]
}

interface QueryableClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResultLike<T>>
}

export interface ContractLifecycleActor {
  userId: string
  name: string
}

type RelationshipType = 'originator' | 'renewal' | 'modification' | 'cancellation'

interface QuoteRow extends Record<string, unknown> {
  quotation_id: string
  quotation_number: string | null
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  commercial_model: string | null
  staffing_model: string | null
  pricing_model: string | null
  status: string
  quote_date: string | Date | null
  sent_at: string | Date | null
  approved_at: string | Date | null
  converted_at: string | Date | null
  expiry_date: string | Date | null
  valid_until: string | Date | null
  contract_duration_months: number | null
  mrr: string | number | null
  arr: string | number | null
  tcv: string | number | null
  acv: string | number | null
  total_amount_clp: string | number | null
  total_price: string | number | null
  currency: string | null
  exchange_rate_to_clp: string | number | null
}

interface ExistingContractRow extends Record<string, unknown> {
  contract_id: string
  contract_number: string
  status: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  commercial_model: string | null
  staffing_model: string | null
  originator_quote_id: string | null
}

export interface EnsureContractResult {
  contractId: string
  contractNumber: string
  created: boolean
  status: string
}

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const buildContractNumber = ({
  quotationNumber,
  quotationId
}: {
  quotationNumber: string | null
  quotationId: string
}) => {
  if (quotationNumber?.startsWith('EO-QUO-')) {
    return quotationNumber.replace(/^EO-QUO-/, 'EO-CTR-')
  }

  return `EO-CTR-${quotationId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
}

const deriveStartDate = (quote: QuoteRow, override?: string | null) =>
  override
  ?? toIsoDate(quote.approved_at)
  ?? toIsoDate(quote.converted_at)
  ?? toIsoDate(quote.sent_at)
  ?? toIsoDate(quote.quote_date)
  ?? new Date().toISOString().slice(0, 10)

const deriveEndDate = (quote: QuoteRow, override?: string | null) => {
  if (override !== undefined) return override
  if (quote.commercial_model === 'retainer') return null

  return toIsoDate(quote.expiry_date) ?? toIsoDate(quote.valid_until)
}

const deriveContractStatus = (quoteStatus: string) => {
  if (quoteStatus === 'approved' || quoteStatus === 'converted') return 'active'
  if (quoteStatus === 'sent') return 'draft'

  return 'draft'
}

export const syncContractIdOnDocumentChain = async ({
  quotationId,
  contractId,
  client
}: {
  quotationId: string
  contractId: string
  client?: QueryableClient
}) => {
  const statements = [
    `UPDATE greenhouse_finance.purchase_orders
        SET contract_id = $1,
            updated_at = NOW()
      WHERE quotation_id = $2
        AND (contract_id IS NULL OR contract_id = $1)`,
    `UPDATE greenhouse_finance.service_entry_sheets
        SET contract_id = $1,
            updated_at = NOW()
      WHERE quotation_id = $2
        AND (contract_id IS NULL OR contract_id = $1)`,
    `UPDATE greenhouse_finance.income
        SET contract_id = $1,
            updated_at = NOW()
      WHERE quotation_id = $2
        AND (contract_id IS NULL OR contract_id = $1)`
  ]

  for (const statement of statements) {
    if (client) {
      await client.query(statement, [contractId, quotationId])
    } else {
      await query(statement, [contractId, quotationId])
    }
  }
}

const loadQuoteForContract = async (client: QueryableClient, quotationId: string) => {
  const result = await client.query(
    `SELECT quotation_id, quotation_number, client_id, organization_id, space_id,
            commercial_model, staffing_model, pricing_model, status,
            quote_date, sent_at, approved_at, converted_at, expiry_date, valid_until,
            contract_duration_months, mrr, arr, tcv, acv, total_amount_clp, total_price,
            currency, exchange_rate_to_clp
       FROM greenhouse_commercial.quotations
      WHERE quotation_id = $1
      LIMIT 1`,
    [quotationId]
  ) as { rows: QuoteRow[] }

  return result.rows[0] ?? null
}

const loadExistingContractForQuote = async (client: QueryableClient, quotationId: string) => {
  const result = await client.query(
    `SELECT c.contract_id, c.contract_number, c.status, c.client_id, c.organization_id,
            c.space_id, c.commercial_model, c.staffing_model, c.originator_quote_id
       FROM greenhouse_commercial.contracts c
       JOIN greenhouse_commercial.contract_quotes cq
         ON cq.contract_id = c.contract_id
      WHERE cq.quotation_id = $1
      ORDER BY
        CASE cq.relationship_type
          WHEN 'originator' THEN 0
          WHEN 'renewal' THEN 1
          WHEN 'modification' THEN 2
          ELSE 3
        END
      LIMIT 1`,
    [quotationId]
  ) as { rows: ExistingContractRow[] }

  return result.rows[0] ?? null
}

export const ensureContractForQuotation = async ({
  quotationId,
  actor,
  startDate,
  endDate
}: {
  quotationId: string
  actor: ContractLifecycleActor
  startDate?: string | null
  endDate?: string | null
}): Promise<EnsureContractResult> => {
  void actor

  return withTransaction(async client => {
    const existing = await loadExistingContractForQuote(client, quotationId)

    if (existing) {
      await syncContractIdOnDocumentChain({
        quotationId,
        contractId: String(existing.contract_id),
        client
      })

      return {
        contractId: String(existing.contract_id),
        contractNumber: String(existing.contract_number),
        created: false,
        status: String(existing.status)
      }
    }

    const quote = await loadQuoteForContract(client, quotationId)

    if (!quote) {
      throw new Error(`Quotation ${quotationId} not found.`)
    }

    if (!quote.organization_id && !quote.space_id) {
      throw new Error(`Quotation ${quotationId} has no organization_id or space_id; cannot promote to contract.`)
    }

    const derivedStatus = deriveContractStatus(String(quote.status))
    const resolvedStartDate = deriveStartDate(quote, startDate ?? undefined)
    const resolvedEndDate = deriveEndDate(quote, endDate ?? undefined)

    const contractNumber = buildContractNumber({
      quotationNumber: quote.quotation_number ? String(quote.quotation_number) : null,
      quotationId
    })

    const insert = await client.query(
      `INSERT INTO greenhouse_commercial.contracts (
         contract_number,
         client_id,
         organization_id,
         space_id,
         commercial_model,
         staffing_model,
         status,
         start_date,
         end_date,
         auto_renewal,
         renewal_frequency_months,
         mrr_clp,
         arr_clp,
         tcv_clp,
         acv_clp,
         originator_quote_id,
         currency,
         exchange_rate_to_clp,
         signed_at
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7,
         $8::date, $9::date,
         $10, $11, $12, $13, $14, $15,
         $16, $17, $18,
         CASE WHEN $7 = 'active' THEN NOW() ELSE NULL END
       )
       RETURNING contract_id, contract_number, status`,
      [
        contractNumber,
        quote.client_id,
        quote.organization_id,
        quote.space_id,
        quote.commercial_model ?? 'project',
        quote.staffing_model ?? 'outcome_based',
        derivedStatus,
        resolvedStartDate,
        resolvedEndDate,
        quote.commercial_model === 'retainer',
        quote.commercial_model === 'retainer'
          ? (quote.contract_duration_months ?? 12)
          : null,
        toNum(quote.mrr),
        toNum(quote.arr),
        toNum(quote.tcv) ?? toNum(quote.total_amount_clp) ?? toNum(quote.total_price),
        toNum(quote.acv) ?? toNum(quote.total_amount_clp) ?? toNum(quote.total_price),
        quotationId,
        quote.currency ?? 'CLP',
        toNum(quote.exchange_rate_to_clp)
      ]
    ) as { rows: Array<{ contract_id: string; contract_number: string; status: string }> }

    const contract = insert.rows[0]

    await client.query(
      `INSERT INTO greenhouse_commercial.contract_quotes (
         contract_id, quotation_id, relationship_type, effective_from
       ) VALUES ($1, $2, 'originator', $3::date)
       ON CONFLICT (contract_id, quotation_id) DO NOTHING`,
      [contract.contract_id, quotationId, resolvedStartDate]
    )

    await syncContractIdOnDocumentChain({
      quotationId,
      contractId: contract.contract_id,
      client
    })

    await publishContractCreated(
      {
        contractId: contract.contract_id,
        contractNumber: contract.contract_number,
        clientId: quote.client_id ? String(quote.client_id) : null,
        organizationId: quote.organization_id ? String(quote.organization_id) : null,
        spaceId: quote.space_id ? String(quote.space_id) : null,
        status: contract.status,
        commercialModel: quote.commercial_model ? String(quote.commercial_model) : null,
        staffingModel: quote.staffing_model ? String(quote.staffing_model) : null,
        originatorQuoteId: quotationId,
        quotationId,
        relationshipType: 'originator',
        effectiveAt: new Date().toISOString()
      },
      client
    )

    if (contract.status === 'active') {
      await publishContractActivated(
        {
          contractId: contract.contract_id,
          contractNumber: contract.contract_number,
          clientId: quote.client_id ? String(quote.client_id) : null,
          organizationId: quote.organization_id ? String(quote.organization_id) : null,
          spaceId: quote.space_id ? String(quote.space_id) : null,
          status: contract.status,
          commercialModel: quote.commercial_model ? String(quote.commercial_model) : null,
          staffingModel: quote.staffing_model ? String(quote.staffing_model) : null,
          originatorQuoteId: quotationId,
          effectiveAt: new Date().toISOString()
        },
        client
      )
    }

    return {
      contractId: contract.contract_id,
      contractNumber: contract.contract_number,
      created: true,
      status: contract.status
    }
  })
}

const attachQuotationToContract = async ({
  contractId,
  quotationId,
  relationshipType,
  effectiveFrom,
  client
}: {
  contractId: string
  quotationId: string
  relationshipType: RelationshipType
  effectiveFrom: string
  client: QueryableClient
}) => {
  await client.query(
    `INSERT INTO greenhouse_commercial.contract_quotes (
       contract_id, quotation_id, relationship_type, effective_from
     ) VALUES ($1, $2, $3, $4::date)
     ON CONFLICT (contract_id, quotation_id) DO UPDATE SET
       relationship_type = EXCLUDED.relationship_type,
       effective_from = EXCLUDED.effective_from,
       updated_at = NOW()`,
    [contractId, quotationId, relationshipType, effectiveFrom]
  )

  await syncContractIdOnDocumentChain({ quotationId, contractId, client })
}

export const renewContract = async ({
  contractId,
  quotationId,
  actor
}: {
  contractId: string
  quotationId?: string | null
  actor: ContractLifecycleActor
}) => {
  void actor

  return withTransaction(async client => {
    if (quotationId) {
      const quote = await loadQuoteForContract(client, quotationId)

      if (!quote) {
        throw new Error(`Quotation ${quotationId} not found.`)
      }

      const effectiveFrom = deriveStartDate(quote)

      await attachQuotationToContract({
        contractId,
        quotationId,
        relationshipType: 'renewal',
        effectiveFrom,
        client
      })
    }

    const updated = await client.query(
      `UPDATE greenhouse_commercial.contracts
          SET status = 'renewed',
              renewed_at = NOW(),
              updated_at = NOW()
        WHERE contract_id = $1
      RETURNING contract_number, client_id, organization_id, space_id, commercial_model, staffing_model, originator_quote_id`,
      [contractId]
    ) as { rows: ExistingContractRow[] }

    const contract = updated.rows[0]

    if (!contract) {
      throw new Error(`Contract ${contractId} not found.`)
    }

    await publishContractRenewed(
      {
        contractId,
        contractNumber: contract.contract_number,
        clientId: contract.client_id ? String(contract.client_id) : null,
        organizationId: contract.organization_id ? String(contract.organization_id) : null,
        spaceId: contract.space_id ? String(contract.space_id) : null,
        status: 'renewed',
        commercialModel: contract.commercial_model ? String(contract.commercial_model) : null,
        staffingModel: contract.staffing_model ? String(contract.staffing_model) : null,
        originatorQuoteId: contract.originator_quote_id ? String(contract.originator_quote_id) : null,
        quotationId,
        relationshipType: quotationId ? 'renewal' : null,
        effectiveAt: new Date().toISOString()
      },
      client
    )

    return { contractId, status: 'renewed' as const }
  })
}

export const modifyContract = async ({
  contractId,
  quotationId,
  actor
}: {
  contractId: string
  quotationId: string
  actor: ContractLifecycleActor
}) => {
  void actor

  return withTransaction(async client => {
    const quote = await loadQuoteForContract(client, quotationId)

    if (!quote) {
      throw new Error(`Quotation ${quotationId} not found.`)
    }

    await attachQuotationToContract({
      contractId,
      quotationId,
      relationshipType: 'modification',
      effectiveFrom: deriveStartDate(quote),
      client
    })

    const updated = await client.query(
      `UPDATE greenhouse_commercial.contracts
          SET updated_at = NOW()
        WHERE contract_id = $1
      RETURNING contract_number, client_id, organization_id, space_id, status, commercial_model, staffing_model, originator_quote_id`,
      [contractId]
    ) as { rows: ExistingContractRow[] }

    const contract = updated.rows[0]

    if (!contract) {
      throw new Error(`Contract ${contractId} not found.`)
    }

    await publishContractModified(
      {
        contractId,
        contractNumber: contract.contract_number,
        clientId: contract.client_id ? String(contract.client_id) : null,
        organizationId: contract.organization_id ? String(contract.organization_id) : null,
        spaceId: contract.space_id ? String(contract.space_id) : null,
        status: String(contract.status),
        commercialModel: contract.commercial_model ? String(contract.commercial_model) : null,
        staffingModel: contract.staffing_model ? String(contract.staffing_model) : null,
        originatorQuoteId: contract.originator_quote_id ? String(contract.originator_quote_id) : null,
        quotationId,
        relationshipType: 'modification',
        effectiveAt: new Date().toISOString()
      },
      client
    )

    return { contractId, status: String(contract.status) }
  })
}

export const terminateContract = async ({
  contractId,
  actor,
  reason,
  terminatedAt
}: {
  contractId: string
  actor: ContractLifecycleActor
  reason?: string | null
  terminatedAt?: string | null
}) => {
  void actor

  return withTransaction(async client => {
    const updated = await client.query(
      `UPDATE greenhouse_commercial.contracts
          SET status = 'terminated',
              terminated_at = COALESCE($2::timestamptz, NOW()),
              terminated_reason = $3,
              updated_at = NOW()
        WHERE contract_id = $1
      RETURNING contract_number, client_id, organization_id, space_id, commercial_model, staffing_model, originator_quote_id`,
      [contractId, terminatedAt ?? null, reason ?? null]
    ) as { rows: ExistingContractRow[] }

    const contract = updated.rows[0]

    if (!contract) {
      throw new Error(`Contract ${contractId} not found.`)
    }

    await publishContractTerminated(
      {
        contractId,
        contractNumber: contract.contract_number,
        clientId: contract.client_id ? String(contract.client_id) : null,
        organizationId: contract.organization_id ? String(contract.organization_id) : null,
        spaceId: contract.space_id ? String(contract.space_id) : null,
        status: 'terminated',
        commercialModel: contract.commercial_model ? String(contract.commercial_model) : null,
        staffingModel: contract.staffing_model ? String(contract.staffing_model) : null,
        originatorQuoteId: contract.originator_quote_id ? String(contract.originator_quote_id) : null,
        reason: reason ?? null,
        effectiveAt: terminatedAt ?? new Date().toISOString()
      },
      client
    )

    return { contractId, status: 'terminated' as const }
  })
}

export const completeContract = async ({
  contractId
}: {
  contractId: string
}) => {
  return withTransaction(async client => {
    const updated = await client.query(
      `UPDATE greenhouse_commercial.contracts
          SET status = 'completed',
              updated_at = NOW()
        WHERE contract_id = $1
      RETURNING contract_number, client_id, organization_id, space_id, commercial_model, staffing_model, originator_quote_id`,
      [contractId]
    ) as { rows: ExistingContractRow[] }

    const contract = updated.rows[0]

    if (!contract) {
      throw new Error(`Contract ${contractId} not found.`)
    }

    await publishContractCompleted(
      {
        contractId,
        contractNumber: contract.contract_number,
        clientId: contract.client_id ? String(contract.client_id) : null,
        organizationId: contract.organization_id ? String(contract.organization_id) : null,
        spaceId: contract.space_id ? String(contract.space_id) : null,
        status: 'completed',
        commercialModel: contract.commercial_model ? String(contract.commercial_model) : null,
        staffingModel: contract.staffing_model ? String(contract.staffing_model) : null,
        originatorQuoteId: contract.originator_quote_id ? String(contract.originator_quote_id) : null,
        effectiveAt: new Date().toISOString()
      },
      client
    )

    return { contractId, status: 'completed' as const }
  })
}
