import 'server-only'

import { randomUUID } from 'node:crypto'

import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import {
  matchDte,
  DTE_AUTO_MATCH_THRESHOLD,
  DTE_REVIEW_THRESHOLD,
  type DteRecord,
  type FinanceCandidate,
  type DteMatchSignal
} from '@/lib/nubox/dte-matching'

// ── Types ────────────────────────────────────────────────────────────────────

export type DteProposalStatus = 'pending' | 'auto_matched' | 'approved' | 'rejected' | 'orphan'

export interface DteReconciliationProposal {
  proposalId: string
  dteSource: 'nubox_sale' | 'nubox_purchase'
  dteSourceId: string
  dteFolio: string | null
  dteTypeCode: string | null
  dteTotalAmount: number | null
  dteEmissionDate: string | null
  dteCounterpartRut: string | null
  dteCounterpartName: string | null
  financeType: 'income' | 'expense'
  financeId: string | null
  financeTotalAmount: number | null
  amountDiscrepancy: number | null
  confidence: number
  matchSignals: DteMatchSignal[]
  status: DteProposalStatus
  resolvedBy: string | null
  resolvedAt: string | null
  syncRunId: string | null
  organizationId: string | null
  createdAt: string
  updatedAt: string
}

export interface DteReconciliationRunResult {
  syncRunId: string
  dtesScanned: number
  alreadyLinkedCount: number
  autoMatchedCount: number
  pendingReviewCount: number
  orphanCount: number
  errors: string[]
  durationMs: number
}

// ── Postgres row type ────────────────────────────────────────────────────────

type ProposalRow = {
  proposal_id: string
  dte_source: string
  dte_source_id: string
  dte_folio: string | null
  dte_type_code: string | null
  dte_total_amount: unknown
  dte_emission_date: string | null
  dte_counterpart_rut: string | null
  dte_counterpart_name: string | null
  finance_type: string
  finance_id: string | null
  finance_total_amount: unknown
  amount_discrepancy: unknown
  confidence: unknown
  match_signals: unknown
  status: string
  resolved_by: string | null
  resolved_at: string | null
  sync_run_id: string | null
  organization_id: string | null
  created_at: string
  updated_at: string
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }
  if (v && typeof v === 'object' && 'valueOf' in v) {
    const prim = (v as { valueOf: () => unknown }).valueOf()

    return typeof prim === 'number' ? prim : 0
  }

  return 0
}

const mapProposal = (row: ProposalRow): DteReconciliationProposal => ({
  proposalId: row.proposal_id,
  dteSource: row.dte_source as 'nubox_sale' | 'nubox_purchase',
  dteSourceId: row.dte_source_id,
  dteFolio: row.dte_folio,
  dteTypeCode: row.dte_type_code,
  dteTotalAmount: row.dte_total_amount != null ? toNumber(row.dte_total_amount) : null,
  dteEmissionDate: row.dte_emission_date,
  dteCounterpartRut: row.dte_counterpart_rut,
  dteCounterpartName: row.dte_counterpart_name,
  financeType: row.finance_type as 'income' | 'expense',
  financeId: row.finance_id,
  financeTotalAmount: row.finance_total_amount != null ? toNumber(row.finance_total_amount) : null,
  amountDiscrepancy: row.amount_discrepancy != null ? toNumber(row.amount_discrepancy) : null,
  confidence: toNumber(row.confidence),
  matchSignals: Array.isArray(row.match_signals)
    ? (row.match_signals as DteMatchSignal[])
    : typeof row.match_signals === 'string'
      ? (JSON.parse(row.match_signals) as DteMatchSignal[])
      : [],
  status: row.status as DteProposalStatus,
  resolvedBy: row.resolved_by,
  resolvedAt: row.resolved_at,
  syncRunId: row.sync_run_id,
  organizationId: row.organization_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

// ── Discover unlinked DTEs ───────────────────────────────────────────────────

/**
 * Find income records that were synced from Nubox (have nubox_document_id)
 * and have not been reconciled yet via a proposal.
 */
async function discoverUnlinkedSaleDtes(): Promise<DteRecord[]> {
  const rows = await runGreenhousePostgresQuery<{
    nubox_document_id: string
    dte_folio: string | null
    dte_type_code: string | null
    total_amount: unknown
    invoice_date: string | null
    organization_id: string | null
    client_name: string | null
  }>(
    `SELECT
       i.nubox_document_id::text AS nubox_document_id,
       i.dte_folio,
       i.dte_type_code,
       i.total_amount,
       i.invoice_date::text AS invoice_date,
       i.organization_id,
       i.client_name
     FROM greenhouse_finance.income i
     WHERE i.nubox_document_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM greenhouse_finance.dte_reconciliation_proposals p
         WHERE p.dte_source = 'nubox_sale'
           AND p.dte_source_id = i.nubox_document_id::text
           AND p.status IN ('auto_matched', 'approved')
       )`
  )

  const dtes: DteRecord[] = []

  for (const row of rows) {
    let counterpartRut: string | null = null

    if (row.organization_id) {
      const orgRows = await runGreenhousePostgresQuery<{ tax_id: string | null }>(
        `SELECT tax_id FROM greenhouse_core.organizations WHERE organization_id = $1 LIMIT 1`,
        [row.organization_id]
      )

      counterpartRut = orgRows[0]?.tax_id || null
    }

    dtes.push({
      dteSourceId: row.nubox_document_id,
      dteSource: 'nubox_sale',
      folio: row.dte_folio,
      dteTypeCode: row.dte_type_code,
      totalAmount: toNumber(row.total_amount),
      emissionDate: row.invoice_date,
      counterpartRut,
      counterpartName: row.client_name,
      organizationId: row.organization_id
    })
  }

  return dtes
}

async function discoverUnlinkedPurchaseDtes(): Promise<DteRecord[]> {
  const rows = await runGreenhousePostgresQuery<{
    nubox_purchase_id: string
    document_number: string | null
    total_amount: unknown
    document_date: string | null
    nubox_supplier_rut: string | null
    nubox_supplier_name: string | null
    supplier_id: string | null
  }>(
    `SELECT
       e.nubox_purchase_id::text AS nubox_purchase_id,
       e.document_number,
       e.total_amount,
       e.document_date::text AS document_date,
       e.nubox_supplier_rut,
       e.nubox_supplier_name,
       e.supplier_id
     FROM greenhouse_finance.expenses e
     WHERE e.nubox_purchase_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM greenhouse_finance.dte_reconciliation_proposals p
         WHERE p.dte_source = 'nubox_purchase'
           AND p.dte_source_id = e.nubox_purchase_id::text
           AND p.status IN ('auto_matched', 'approved')
       )`
  )

  const dtes: DteRecord[] = []

  for (const row of rows) {
    let organizationId: string | null = null

    if (row.supplier_id) {
      const supRows = await runGreenhousePostgresQuery<{ organization_id: string | null }>(
        `SELECT organization_id FROM greenhouse_finance.suppliers WHERE supplier_id = $1 LIMIT 1`,
        [row.supplier_id]
      )

      organizationId = supRows[0]?.organization_id || null
    }

    dtes.push({
      dteSourceId: row.nubox_purchase_id,
      dteSource: 'nubox_purchase',
      folio: row.document_number,
      dteTypeCode: null,
      totalAmount: toNumber(row.total_amount),
      emissionDate: row.document_date,
      counterpartRut: row.nubox_supplier_rut,
      counterpartName: row.nubox_supplier_name,
      organizationId
    })
  }

  return dtes
}

// ── Load finance candidates ──────────────────────────────────────────────────

async function loadIncomeCandidates(): Promise<FinanceCandidate[]> {
  const rows = await runGreenhousePostgresQuery<{
    income_id: string
    total_amount: unknown
    invoice_date: string | null
    due_date: string | null
    invoice_number: string | null
    client_name: string | null
    organization_id: string | null
    nubox_document_id: unknown
  }>(
    `SELECT
       income_id,
       total_amount,
       invoice_date::text AS invoice_date,
       due_date::text AS due_date,
       invoice_number,
       client_name,
       organization_id,
       nubox_document_id
     FROM greenhouse_finance.income`
  )

  const candidates: FinanceCandidate[] = []

  for (const row of rows) {
    let counterpartRut: string | null = null

    if (row.organization_id) {
      const orgRows = await runGreenhousePostgresQuery<{ tax_id: string | null }>(
        `SELECT tax_id FROM greenhouse_core.organizations WHERE organization_id = $1 LIMIT 1`,
        [row.organization_id]
      )

      counterpartRut = orgRows[0]?.tax_id || null
    }

    candidates.push({
      financeId: row.income_id,
      financeType: 'income',
      totalAmount: toNumber(row.total_amount),
      documentDate: row.invoice_date,
      dueDate: row.due_date,
      documentNumber: row.invoice_number,
      counterpartRut,
      counterpartName: row.client_name,
      organizationId: row.organization_id,
      nuboxLinked: row.nubox_document_id != null
    })
  }

  return candidates
}

async function loadExpenseCandidates(): Promise<FinanceCandidate[]> {
  const rows = await runGreenhousePostgresQuery<{
    expense_id: string
    total_amount: unknown
    document_date: string | null
    due_date: string | null
    document_number: string | null
    supplier_name: string | null
    nubox_supplier_rut: string | null
    supplier_id: string | null
    nubox_purchase_id: unknown
  }>(
    `SELECT
       expense_id,
       total_amount,
       document_date::text AS document_date,
       due_date::text AS due_date,
       document_number,
       supplier_name,
       nubox_supplier_rut,
       supplier_id,
       nubox_purchase_id
     FROM greenhouse_finance.expenses`
  )

  const candidates: FinanceCandidate[] = []

  for (const row of rows) {
    let organizationId: string | null = null

    if (row.supplier_id) {
      const supRows = await runGreenhousePostgresQuery<{ organization_id: string | null }>(
        `SELECT organization_id FROM greenhouse_finance.suppliers WHERE supplier_id = $1 LIMIT 1`,
        [row.supplier_id]
      )

      organizationId = supRows[0]?.organization_id || null
    }

    candidates.push({
      financeId: row.expense_id,
      financeType: 'expense',
      totalAmount: toNumber(row.total_amount),
      documentDate: row.document_date,
      dueDate: row.due_date,
      documentNumber: row.document_number,
      counterpartRut: row.nubox_supplier_rut,
      counterpartName: row.supplier_name,
      organizationId,
      nuboxLinked: row.nubox_purchase_id != null
    })
  }

  return candidates
}

// ── Insert / update proposals ────────────────────────────────────────────────

async function insertDteProposal(proposal: {
  proposalId: string
  dte: DteRecord
  financeId: string | null
  financeTotalAmount: number | null
  amountDiscrepancy: number | null
  confidence: number
  matchSignals: DteMatchSignal[]
  status: DteProposalStatus
  syncRunId: string
}): Promise<void> {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_finance.dte_reconciliation_proposals (
       proposal_id, dte_source, dte_source_id, dte_folio, dte_type_code,
       dte_total_amount, dte_emission_date, dte_counterpart_rut, dte_counterpart_name,
       finance_type, finance_id, finance_total_amount, amount_discrepancy,
       confidence, match_signals, status, sync_run_id, organization_id
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7::date, $8, $9,
       $10, $11, $12, $13,
       $14, $15::jsonb, $16, $17, $18
     )
     ON CONFLICT (dte_source, dte_source_id) WHERE status IN ('pending', 'auto_matched')
     DO UPDATE SET
       finance_id = EXCLUDED.finance_id,
       finance_total_amount = EXCLUDED.finance_total_amount,
       amount_discrepancy = EXCLUDED.amount_discrepancy,
       confidence = EXCLUDED.confidence,
       match_signals = EXCLUDED.match_signals,
       status = EXCLUDED.status,
       sync_run_id = EXCLUDED.sync_run_id,
       updated_at = CURRENT_TIMESTAMP`,
    [
      proposal.proposalId,
      proposal.dte.dteSource,
      proposal.dte.dteSourceId,
      proposal.dte.folio,
      proposal.dte.dteTypeCode,
      proposal.dte.totalAmount,
      proposal.dte.emissionDate || null,
      proposal.dte.counterpartRut,
      proposal.dte.counterpartName,
      proposal.dte.dteSource === 'nubox_sale' ? 'income' : 'expense',
      proposal.financeId,
      proposal.financeTotalAmount,
      proposal.amountDiscrepancy,
      proposal.confidence,
      JSON.stringify(proposal.matchSignals),
      proposal.status,
      proposal.syncRunId,
      proposal.dte.organizationId
    ]
  )
}

async function applyAutoMatch(proposal: {
  dte: DteRecord
  financeId: string
}): Promise<void> {
  if (proposal.dte.dteSource === 'nubox_sale') {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.income SET
         nubox_document_id = COALESCE(nubox_document_id, $2),
         dte_folio = COALESCE(dte_folio, $3),
         dte_type_code = COALESCE(dte_type_code, $4),
         nubox_last_synced_at = NOW(),
         updated_at = NOW()
       WHERE income_id = $1`,
      [
        proposal.financeId,
        Number(proposal.dte.dteSourceId),
        proposal.dte.folio,
        proposal.dte.dteTypeCode
      ]
    )
  } else {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.expenses SET
         nubox_purchase_id = COALESCE(nubox_purchase_id, $2),
         nubox_supplier_rut = COALESCE(nubox_supplier_rut, $3),
         nubox_last_synced_at = NOW(),
         updated_at = NOW()
       WHERE expense_id = $1`,
      [
        proposal.financeId,
        Number(proposal.dte.dteSourceId),
        proposal.dte.counterpartRut
      ]
    )
  }

  // Publish outbox event
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.outbox_events (
       event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
     ) VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', NOW())`,
    [
      `evt-${randomUUID()}`,
      proposal.dte.dteSource === 'nubox_sale' ? 'finance.income' : 'finance.expense',
      proposal.financeId,
      'finance.dte.auto_matched',
      JSON.stringify({
        dte_source: proposal.dte.dteSource,
        dte_source_id: proposal.dte.dteSourceId,
        finance_id: proposal.financeId,
        folio: proposal.dte.folio
      })
    ]
  )
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export async function runDteReconciliation(opts?: {
  dryRun?: boolean
  syncRunId?: string
}): Promise<DteReconciliationRunResult> {
  const startMs = Date.now()
  const syncRunId = opts?.syncRunId || `dte-recon-${randomUUID().slice(0, 8)}`
  const dryRun = opts?.dryRun ?? false

  const result: DteReconciliationRunResult = {
    syncRunId,
    dtesScanned: 0,
    alreadyLinkedCount: 0,
    autoMatchedCount: 0,
    pendingReviewCount: 0,
    orphanCount: 0,
    errors: [],
    durationMs: 0
  }

  try {
    // 1. Discover unlinked DTEs
    const [saleDtes, purchaseDtes] = await Promise.all([
      discoverUnlinkedSaleDtes(),
      discoverUnlinkedPurchaseDtes()
    ])

    const allDtes = [...saleDtes, ...purchaseDtes]
    result.dtesScanned = allDtes.length

    if (allDtes.length === 0) {
      result.durationMs = Date.now() - startMs

      return result
    }

    // 2. Load all finance candidates
    const [incomeCandidates, expenseCandidates] = await Promise.all([
      loadIncomeCandidates(),
      loadExpenseCandidates()
    ])

    const allCandidates = [...incomeCandidates, ...expenseCandidates]

    // 3. Match each DTE against candidates
    for (const dte of allDtes) {
      try {
        const match = matchDte(dte, allCandidates)
        const proposalId = `dte-${dte.dteSource}-${dte.dteSourceId.slice(0, 12)}-${randomUUID().slice(0, 8)}`

        if (match.confidence >= DTE_AUTO_MATCH_THRESHOLD && match.financeId) {
          // Auto-match
          if (!dryRun) {
            await insertDteProposal({
              proposalId,
              dte,
              financeId: match.financeId,
              financeTotalAmount: match.financeTotalAmount,
              amountDiscrepancy: match.amountDiscrepancy,
              confidence: match.confidence,
              matchSignals: match.signals,
              status: 'auto_matched',
              syncRunId
            })

            await applyAutoMatch({ dte, financeId: match.financeId })
          }

          result.autoMatchedCount++
        } else if (match.confidence >= DTE_REVIEW_THRESHOLD && match.financeId) {
          // Pending review
          if (!dryRun) {
            await insertDteProposal({
              proposalId,
              dte,
              financeId: match.financeId,
              financeTotalAmount: match.financeTotalAmount,
              amountDiscrepancy: match.amountDiscrepancy,
              confidence: match.confidence,
              matchSignals: match.signals,
              status: 'pending',
              syncRunId
            })
          }

          result.pendingReviewCount++
        } else {
          // Orphan DTE (no match found)
          if (!dryRun) {
            await insertDteProposal({
              proposalId,
              dte,
              financeId: null,
              financeTotalAmount: null,
              amountDiscrepancy: null,
              confidence: match.confidence,
              matchSignals: match.signals,
              status: 'orphan',
              syncRunId
            })
          }

          result.orphanCount++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)

        result.errors.push(`${dte.dteSourceId}: ${msg}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    result.errors.push(`Discovery failed: ${msg}`)
  }

  result.durationMs = Date.now() - startMs

  return result
}

// ── Query proposals ──────────────────────────────────────────────────────────

export async function listDteProposals(opts?: {
  status?: DteProposalStatus | null
  organizationId?: string | null
  page?: number
  pageSize?: number
}): Promise<{ items: DteReconciliationProposal[]; total: number }> {
  const status = opts?.status || null
  const organizationId = opts?.organizationId || null
  const page = opts?.page || 1
  const pageSize = opts?.pageSize || 50

  const countRows = await runGreenhousePostgresQuery<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM greenhouse_finance.dte_reconciliation_proposals
     WHERE ($1::text IS NULL OR status = $1)
       AND ($2::text IS NULL OR organization_id = $2)`,
    [status, organizationId]
  )

  const total = Number(countRows[0]?.total || '0')

  const rows = await runGreenhousePostgresQuery<ProposalRow>(
    `SELECT
       proposal_id, dte_source, dte_source_id, dte_folio, dte_type_code,
       dte_total_amount, dte_emission_date::text AS dte_emission_date,
       dte_counterpart_rut, dte_counterpart_name,
       finance_type, finance_id, finance_total_amount, amount_discrepancy,
       confidence, match_signals, status, resolved_by,
       resolved_at::text AS resolved_at, sync_run_id, organization_id,
       created_at::text AS created_at, updated_at::text AS updated_at
     FROM greenhouse_finance.dte_reconciliation_proposals
     WHERE ($1::text IS NULL OR status = $1)
       AND ($2::text IS NULL OR organization_id = $2)
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [status, organizationId, pageSize, (page - 1) * pageSize]
  )

  return { items: rows.map(mapProposal), total }
}

export async function getDteProposal(proposalId: string): Promise<DteReconciliationProposal | null> {
  const rows = await runGreenhousePostgresQuery<ProposalRow>(
    `SELECT
       proposal_id, dte_source, dte_source_id, dte_folio, dte_type_code,
       dte_total_amount, dte_emission_date::text AS dte_emission_date,
       dte_counterpart_rut, dte_counterpart_name,
       finance_type, finance_id, finance_total_amount, amount_discrepancy,
       confidence, match_signals, status, resolved_by,
       resolved_at::text AS resolved_at, sync_run_id, organization_id,
       created_at::text AS created_at, updated_at::text AS updated_at
     FROM greenhouse_finance.dte_reconciliation_proposals
     WHERE proposal_id = $1`,
    [proposalId]
  )

  return rows.length > 0 ? mapProposal(rows[0]) : null
}

// ── Resolve proposals ────────────────────────────────────────────────────────

export async function resolveDteProposal(opts: {
  proposalId: string
  action: 'approve' | 'reject'
  resolvedBy: string
}): Promise<DteReconciliationProposal | null> {
  const newStatus: DteProposalStatus = opts.action === 'approve' ? 'approved' : 'rejected'

  return withGreenhousePostgresTransaction(async client => {
    // Fetch proposal
    const proposalRows = await client.query<ProposalRow>(
      `SELECT
         proposal_id, dte_source, dte_source_id, dte_folio, dte_type_code,
         dte_total_amount, dte_emission_date::text AS dte_emission_date,
         dte_counterpart_rut, dte_counterpart_name,
         finance_type, finance_id, finance_total_amount, amount_discrepancy,
         confidence, match_signals, status, resolved_by,
         resolved_at::text AS resolved_at, sync_run_id, organization_id,
         created_at::text AS created_at, updated_at::text AS updated_at
       FROM greenhouse_finance.dte_reconciliation_proposals
       WHERE proposal_id = $1
       FOR UPDATE`,
      [opts.proposalId]
    )

    if (proposalRows.rows.length === 0) return null

    const proposal = mapProposal(proposalRows.rows[0])

    if (proposal.status !== 'pending') {
      throw new Error(`Proposal ${opts.proposalId} is not pending (current: ${proposal.status})`)
    }

    // Update status
    const updatedRows = await client.query<ProposalRow>(
      `UPDATE greenhouse_finance.dte_reconciliation_proposals
       SET status = $2, resolved_by = $3, resolved_at = NOW(), updated_at = NOW()
       WHERE proposal_id = $1
       RETURNING
         proposal_id, dte_source, dte_source_id, dte_folio, dte_type_code,
         dte_total_amount, dte_emission_date::text AS dte_emission_date,
         dte_counterpart_rut, dte_counterpart_name,
         finance_type, finance_id, finance_total_amount, amount_discrepancy,
         confidence, match_signals, status, resolved_by,
         resolved_at::text AS resolved_at, sync_run_id, organization_id,
         created_at::text AS created_at, updated_at::text AS updated_at`,
      [opts.proposalId, newStatus, opts.resolvedBy]
    )

    // If approved and has finance_id, apply the link
    if (opts.action === 'approve' && proposal.financeId) {
      const dte: DteRecord = {
        dteSourceId: proposal.dteSourceId,
        dteSource: proposal.dteSource,
        folio: proposal.dteFolio,
        dteTypeCode: proposal.dteTypeCode,
        totalAmount: proposal.dteTotalAmount || 0,
        emissionDate: proposal.dteEmissionDate,
        counterpartRut: proposal.dteCounterpartRut,
        counterpartName: proposal.dteCounterpartName,
        organizationId: proposal.organizationId
      }

      if (dte.dteSource === 'nubox_sale') {
        await client.query(
          `UPDATE greenhouse_finance.income SET
             nubox_document_id = COALESCE(nubox_document_id, $2),
             dte_folio = COALESCE(dte_folio, $3),
             dte_type_code = COALESCE(dte_type_code, $4),
             nubox_last_synced_at = NOW(),
             updated_at = NOW()
           WHERE income_id = $1`,
          [
            proposal.financeId,
            Number(dte.dteSourceId),
            dte.folio,
            dte.dteTypeCode
          ]
        )
      } else {
        await client.query(
          `UPDATE greenhouse_finance.expenses SET
             nubox_purchase_id = COALESCE(nubox_purchase_id, $2),
             nubox_supplier_rut = COALESCE(nubox_supplier_rut, $3),
             nubox_last_synced_at = NOW(),
             updated_at = NOW()
           WHERE expense_id = $1`,
          [
            proposal.financeId,
            Number(dte.dteSourceId),
            dte.counterpartRut
          ]
        )
      }

      // Publish outbox event for the match
      await client.query(
        `INSERT INTO greenhouse_sync.outbox_events (
           event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
         ) VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', NOW())`,
        [
          `evt-${randomUUID()}`,
          dte.dteSource === 'nubox_sale' ? 'finance.income' : 'finance.expense',
          proposal.financeId,
          'finance.dte.matched',
          JSON.stringify({
            proposal_id: opts.proposalId,
            dte_source: dte.dteSource,
            dte_source_id: dte.dteSourceId,
            finance_id: proposal.financeId,
            resolved_by: opts.resolvedBy
          })
        ]
      )
    }

    // Publish discrepancy event if mismatch detected on approve
    if (
      opts.action === 'approve' &&
      proposal.amountDiscrepancy != null &&
      Math.abs(proposal.amountDiscrepancy) > 0
    ) {
      await client.query(
        `INSERT INTO greenhouse_sync.outbox_events (
           event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
         ) VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', NOW())`,
        [
          `evt-${randomUUID()}`,
          proposal.dteSource === 'nubox_sale' ? 'finance.income' : 'finance.expense',
          proposal.financeId || proposal.dteSourceId,
          'finance.dte.discrepancy_found',
          JSON.stringify({
            proposal_id: opts.proposalId,
            dte_amount: proposal.dteTotalAmount,
            finance_amount: proposal.financeTotalAmount,
            discrepancy: proposal.amountDiscrepancy
          })
        ]
      )
    }

    return updatedRows.rows.length > 0 ? mapProposal(updatedRows.rows[0]) : null
  })
}
