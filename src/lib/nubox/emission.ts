import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { issuNuboxSales, getNuboxSale } from '@/lib/nubox/client'
import type { NuboxIssuanceRequest, NuboxIssuanceDocument } from '@/lib/nubox/types'

// ─── Types ──────────────────────────────────────────────────────────────────

export type EmitDteResult = {
  success: boolean
  incomeId: string
  nuboxDocumentId: number | null
  nuboxSiiTrackId: number | null
  emissionStatus: string | null
  folio: string | null
  error: string | null
}

export type DteStatusResult = {
  incomeId: string
  nuboxDocumentId: number | null
  emissionStatusId: number | null
  emissionStatusName: string | null
  siiTrackId: number | null
  isAnnulled: boolean | null
}

type IncomeForEmission = {
  income_id: string
  client_id: string | null
  client_name: string
  invoice_number: string | null
  invoice_date: string
  due_date: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  description: string | null
  nubox_document_id: number | null
}

type OrganizationForEmission = {
  organization_id: string
  organization_name: string
  tax_id: string
  industry: string | null
}

// ─── Core Emission Logic ────────────────────────────────────────────────────

export const emitDte = async ({
  incomeId,
  dteTypeCode
}: {
  incomeId: string
  dteTypeCode: string // "33", "34", "61", etc.
}): Promise<EmitDteResult> => {
  // 1. Fetch income record
  const incomeRows = await runGreenhousePostgresQuery<IncomeForEmission>(
    `SELECT income_id, client_id, client_name, invoice_number, invoice_date,
            due_date, subtotal, tax_rate, tax_amount, total_amount, description,
            nubox_document_id
     FROM greenhouse_finance.income
     WHERE income_id = $1`,
    [incomeId]
  )

  if (incomeRows.length === 0) {
    return { success: false, incomeId, nuboxDocumentId: null, nuboxSiiTrackId: null, emissionStatus: null, folio: null, error: 'Income not found' }
  }

  const income = incomeRows[0]

  // 2. Validate not already emitted
  if (income.nubox_document_id) {
    return { success: false, incomeId, nuboxDocumentId: income.nubox_document_id, nuboxSiiTrackId: null, emissionStatus: null, folio: null, error: 'DTE already emitted' }
  }

  // 3. Resolve organization and RUT
  if (!income.client_id) {
    return { success: false, incomeId, nuboxDocumentId: null, nuboxSiiTrackId: null, emissionStatus: null, folio: null, error: 'No client_id on income' }
  }

  const orgRows = await runGreenhousePostgresQuery<OrganizationForEmission>(
    `SELECT o.organization_id, o.organization_name, o.tax_id, o.industry
     FROM greenhouse_core.clients c
     JOIN greenhouse_core.organizations o ON o.organization_id = c.organization_id
     WHERE c.client_id = $1 AND o.tax_id IS NOT NULL AND o.tax_id <> ''`,
    [income.client_id]
  )

  if (orgRows.length === 0) {
    return { success: false, incomeId, nuboxDocumentId: null, nuboxSiiTrackId: null, emissionStatus: null, folio: null, error: 'Organization not found or missing RUT' }
  }

  const org = orgRows[0]

  // 4. Build Nubox issuance payload
  const idempotenceId = randomUUID()

  const document: NuboxIssuanceDocument = {
    type: { legalCode: dteTypeCode },
    paymentForm: { legalCode: '2' }, // Crédito by default
    dueDate: income.due_date || undefined,
    client: {
      tradeName: org.organization_name,
      identification: { value: org.tax_id },
      mainActivity: org.industry || undefined
    },
    details: [{
      lineNumber: 1,
      description: income.description || `Servicios profesionales — ${income.invoice_number || income.income_id}`,
      quantity: 1,
      unitPrice: Number(income.subtotal) || Number(income.total_amount)
    }]
  }

  const request: NuboxIssuanceRequest = { documents: [document] }

  // 5. Call Nubox API
  let nuboxDocumentId: number | null = null
  let nuboxSiiTrackId: number | null = null
  let emissionStatus: string | null = null
  let folio: string | null = null
  let responseStatus: number | null = null
  let responseBody: unknown = null
  let errorMessage: string | null = null

  try {
    const response = await issuNuboxSales(request)

    responseBody = response
    const result = response.results?.[0]

    if (result) {
      responseStatus = result.status
      nuboxDocumentId = result.id || null
      nuboxSiiTrackId = result.trackId || null
      folio = result.number || null
      emissionStatus = result.emissionStatus?.name || null

      if (result.status >= 400) {
        errorMessage = result.error || `Nubox returned status ${result.status}`
      }
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error)
  }

  // 6. Persist results in transaction
  await withGreenhousePostgresTransaction(async client => {
    // Update income with Nubox fields (even on error, to track attempt)
    if (nuboxDocumentId) {
      await client.query(
        `UPDATE greenhouse_finance.income SET
          nubox_document_id = $2,
          nubox_sii_track_id = $3,
          nubox_emission_status = $4,
          dte_type_code = $5,
          dte_folio = $6,
          nubox_emitted_at = NOW(),
          nubox_last_synced_at = NOW(),
          updated_at = NOW()
        WHERE income_id = $1`,
        [incomeId, nuboxDocumentId, nuboxSiiTrackId, emissionStatus, dteTypeCode, folio]
      )
    }

    // Insert emission log
    await client.query(
      `INSERT INTO greenhouse_finance.nubox_emission_log (
        income_id, idempotence_id, request_payload,
        response_status, response_body,
        nubox_document_id, emission_status, error_message
      ) VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6, $7, $8)`,
      [
        incomeId,
        idempotenceId,
        JSON.stringify(request),
        responseStatus,
        JSON.stringify(responseBody),
        nuboxDocumentId,
        emissionStatus,
        errorMessage
      ]
    )

    // Publish outbox event
    if (nuboxDocumentId) {
      await client.query(
        `INSERT INTO greenhouse_sync.outbox_events (
          event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
        ) VALUES ($1, 'finance.income', $2, 'finance.income.dte_emitted', $3::jsonb, 'pending', NOW())`,
        [
          `evt-${randomUUID()}`,
          incomeId,
          JSON.stringify({
            income_id: incomeId,
            nubox_document_id: nuboxDocumentId,
            dte_type_code: dteTypeCode,
            folio,
            emission_status: emissionStatus
          })
        ]
      )
    }
  })

  return {
    success: !errorMessage && nuboxDocumentId != null,
    incomeId,
    nuboxDocumentId,
    nuboxSiiTrackId,
    emissionStatus,
    folio,
    error: errorMessage
  }
}

// ─── Status Refresh ─────────────────────────────────────────────────────────

export const refreshDteStatus = async (incomeId: string): Promise<DteStatusResult> => {
  const rows = await runGreenhousePostgresQuery<{ nubox_document_id: number | null }>(
    `SELECT nubox_document_id FROM greenhouse_finance.income WHERE income_id = $1`,
    [incomeId]
  )

  if (rows.length === 0 || !rows[0].nubox_document_id) {
    return {
      incomeId,
      nuboxDocumentId: rows[0]?.nubox_document_id ?? null,
      emissionStatusId: null,
      emissionStatusName: null,
      siiTrackId: null,
      isAnnulled: null
    }
  }

  const nuboxId = rows[0].nubox_document_id
  const sale = await getNuboxSale(nuboxId)

  // Update Postgres with latest status
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_finance.income SET
      nubox_emission_status = $2,
      nubox_sii_track_id = $3,
      nubox_last_synced_at = NOW(),
      updated_at = NOW()
    WHERE income_id = $1`,
    [
      incomeId,
      sale.emissionStatus?.name || null,
      sale.dataCl?.trackId || null
    ]
  )

  return {
    incomeId,
    nuboxDocumentId: nuboxId,
    emissionStatusId: sale.emissionStatus?.id ?? null,
    emissionStatusName: sale.emissionStatus?.name || null,
    siiTrackId: sale.dataCl?.trackId ?? null,
    isAnnulled: sale.dataCl?.annulled ?? null
  }
}
