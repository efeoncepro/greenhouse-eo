import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/admin/ops/finance/setup-quotes
 *
 * One-time migration endpoint for TASK-163.
 * Uses cron auth (CRON_SECRET bearer) so it can be called via vercel curl.
 * Idempotent — safe to run multiple times.
 */
export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  const results: string[] = []

  // Step 1: Create quotes table
  try {
    await runGreenhousePostgresQuery(`
      CREATE TABLE IF NOT EXISTS greenhouse_finance.quotes (
        quote_id TEXT PRIMARY KEY,
        client_id TEXT,
        organization_id TEXT,
        client_name TEXT,
        quote_number TEXT,
        quote_date DATE,
        due_date DATE,
        description TEXT,
        currency TEXT NOT NULL DEFAULT 'CLP',
        subtotal NUMERIC,
        tax_rate NUMERIC DEFAULT 0.19,
        tax_amount NUMERIC,
        total_amount NUMERIC,
        exchange_rate_to_clp NUMERIC DEFAULT 1,
        total_amount_clp NUMERIC,
        status TEXT DEFAULT 'sent',
        converted_to_income_id TEXT,
        expiry_date DATE,
        nubox_document_id TEXT,
        nubox_sii_track_id TEXT,
        nubox_emission_status TEXT,
        dte_type_code TEXT DEFAULT '52',
        dte_folio TEXT,
        nubox_emitted_at TIMESTAMPTZ,
        nubox_last_synced_at TIMESTAMPTZ,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `)

    await runGreenhousePostgresQuery(`
      CREATE INDEX IF NOT EXISTS idx_quotes_client ON greenhouse_finance.quotes (client_id)
    `)

    await runGreenhousePostgresQuery(`
      CREATE INDEX IF NOT EXISTS idx_quotes_nubox ON greenhouse_finance.quotes (nubox_document_id)
    `)

    results.push('Step 1: quotes table created/verified')
  } catch (error) {
    results.push(`Step 1 ERROR: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Step 1b: Add referenced_income_id to income
  try {
    await runGreenhousePostgresQuery(`
      ALTER TABLE greenhouse_finance.income
      ADD COLUMN IF NOT EXISTS referenced_income_id TEXT
    `)

    results.push('Step 1b: referenced_income_id column added')
  } catch (error) {
    results.push(`Step 1b ERROR: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Step 2: Pre-migration counts
  let quotesInIncome = 0
  let creditNotesPositive = 0

  try {
    const countRows = await runGreenhousePostgresQuery<{ cnt: string } & Record<string, unknown>>(
      `SELECT COUNT(*) AS cnt FROM greenhouse_finance.income WHERE dte_type_code = '52' OR income_type = 'quote'`
    )

    quotesInIncome = Number(countRows[0]?.cnt ?? 0)

    const cnRows = await runGreenhousePostgresQuery<{ cnt: string } & Record<string, unknown>>(
      `SELECT COUNT(*) AS cnt FROM greenhouse_finance.income WHERE dte_type_code = '61' AND total_amount > 0`
    )

    creditNotesPositive = Number(cnRows[0]?.cnt ?? 0)

    results.push(`Step 2: Pre-counts — ${quotesInIncome} quotes in income, ${creditNotesPositive} credit notes with positive amounts`)
  } catch (error) {
    results.push(`Step 2 ERROR: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Step 3: Migrate quotes from income → quotes table
  if (quotesInIncome > 0) {
    try {
      await runGreenhousePostgresQuery(`
        INSERT INTO greenhouse_finance.quotes (
          quote_id, client_id, organization_id, client_name,
          quote_number, quote_date, due_date,
          currency, subtotal, tax_rate, tax_amount, total_amount,
          exchange_rate_to_clp, total_amount_clp,
          status, nubox_document_id, nubox_sii_track_id, nubox_emission_status,
          dte_type_code, dte_folio, nubox_emitted_at, nubox_last_synced_at,
          created_at, updated_at
        )
        SELECT
          'QUO-MIG-' || income_id,
          client_id, organization_id, client_name,
          invoice_number, invoice_date, due_date,
          currency, subtotal, tax_rate, tax_amount, total_amount,
          exchange_rate_to_clp, total_amount_clp,
          'sent', nubox_document_id::text, nubox_sii_track_id::text, nubox_emission_status,
          '52', dte_folio, nubox_emitted_at, nubox_last_synced_at,
          created_at, updated_at
        FROM greenhouse_finance.income
        WHERE (dte_type_code = '52' OR income_type = 'quote')
        ON CONFLICT (quote_id) DO NOTHING
      `)

      const delRows = await runGreenhousePostgresQuery<{ cnt: string } & Record<string, unknown>>(
        `WITH deleted AS (
          DELETE FROM greenhouse_finance.income
          WHERE dte_type_code = '52' OR income_type = 'quote'
          RETURNING 1
        ) SELECT COUNT(*)::text AS cnt FROM deleted`
      )

      results.push(`Step 3: Migrated ${quotesInIncome} quotes, deleted ${delRows[0]?.cnt ?? 0} from income`)
    } catch (error) {
      results.push(`Step 3 ERROR: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    results.push('Step 3: No quotes to migrate (already clean)')
  }

  // Step 4: Fix credit note signs
  if (creditNotesPositive > 0) {
    try {
      const fixRows = await runGreenhousePostgresQuery<{ cnt: string } & Record<string, unknown>>(
        `WITH updated AS (
          UPDATE greenhouse_finance.income
          SET
            total_amount = -ABS(total_amount),
            total_amount_clp = -ABS(total_amount_clp),
            subtotal = -ABS(subtotal),
            tax_amount = -ABS(tax_amount),
            payment_status = 'paid'
          WHERE dte_type_code = '61' AND total_amount > 0
          RETURNING 1
        ) SELECT COUNT(*)::text AS cnt FROM updated`
      )

      results.push(`Step 4: Fixed ${fixRows[0]?.cnt ?? 0} credit notes (amounts negated)`)
    } catch (error) {
      results.push(`Step 4 ERROR: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    results.push('Step 4: No credit notes to fix (already negative or none exist)')
  }

  // Step 5: Post-migration validation
  try {
    const quotesCount = await runGreenhousePostgresQuery<{ cnt: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS cnt FROM greenhouse_finance.quotes`
    )

    const remainingQuotes = await runGreenhousePostgresQuery<{ cnt: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS cnt FROM greenhouse_finance.income WHERE dte_type_code = '52' OR income_type = 'quote'`
    )

    const remainingPositiveCn = await runGreenhousePostgresQuery<{ cnt: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS cnt FROM greenhouse_finance.income WHERE dte_type_code = '61' AND total_amount > 0`
    )

    results.push(`Step 5: Validation — ${quotesCount[0]?.cnt} quotes in table, ${remainingQuotes[0]?.cnt} quotes still in income (should be 0), ${remainingPositiveCn[0]?.cnt} positive credit notes (should be 0)`)
  } catch (error) {
    results.push(`Step 5 ERROR: ${error instanceof Error ? error.message : String(error)}`)
  }

  return NextResponse.json({ results, migrationComplete: true })
}
