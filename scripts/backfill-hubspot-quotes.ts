/**
 * Backfill script: Sync existing HubSpot quotes into greenhouse_finance.quotes
 *
 * Prerequisites:
 *   1. Migration 20260407182811937_add-hubspot-quotes-columns applied
 *   2. Cloud SQL Proxy running on 127.0.0.1:15432 (pnpm pg:connect)
 *   3. Cloud Run hubspot-greenhouse-integration service has /companies/{id}/quotes endpoint
 *
 * Usage:
 *   pnpm pg:connect                      # Start proxy
 *   npx tsx scripts/backfill-hubspot-quotes.ts
 *
 * What it does:
 *   1. Queries all organizations with a hubspot_company_id
 *   2. For each org, fetches quotes from the Cloud Run integration service
 *   3. Upserts each quote into greenhouse_finance.quotes with source_system='hubspot'
 *   4. Publishes outbox events for each created/updated quote
 *   5. Prints a summary report
 *
 * Safe to run multiple times — uses ON CONFLICT upsert (idempotent).
 */

import 'dotenv/config'

// Dynamically import the sync function — it depends on server-only modules
// so we need to handle the import carefully
async function main() {
  console.log('=== HubSpot Quotes Backfill ===')
  console.log(`Started at: ${new Date().toISOString()}`)
  console.log()

  // Verify env
  const baseUrl = process.env.HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL
  const pgHost = process.env.GREENHOUSE_POSTGRES_HOST

  if (!baseUrl) {
    console.error('ERROR: HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL not set')
    process.exit(1)
  }

  if (!pgHost) {
    console.error('ERROR: GREENHOUSE_POSTGRES_HOST not set. Run `pnpm pg:connect` first.')
    process.exit(1)
  }

  console.log(`Cloud Run service: ${baseUrl}`)
  console.log(`PostgreSQL host: ${pgHost}`)
  console.log()

  // Use dynamic import to handle server-only module
  // Since this is a standalone script, we bypass 'server-only' check
  const { runGreenhousePostgresQuery } = await import('../src/lib/postgres/client')

  // Step 1: Get all organizations with HubSpot company IDs
  interface OrgRow extends Record<string, unknown> {
    organization_id: string
    organization_name: string | null
    hubspot_company_id: string
  }

  const orgs = await runGreenhousePostgresQuery<OrgRow>(
    `SELECT organization_id, organization_name, hubspot_company_id
     FROM greenhouse_core.organizations
     WHERE hubspot_company_id IS NOT NULL AND hubspot_company_id != ''
     ORDER BY organization_name`
  )

  console.log(`Found ${orgs.length} organizations with HubSpot company IDs`)
  console.log()

  // Step 2: For each org, fetch and sync quotes
  let totalCreated = 0
  let totalUpdated = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const org of orgs) {
    console.log(`Processing: ${org.organization_name ?? org.organization_id} (HS: ${org.hubspot_company_id})`)

    try {
      // Resolve space for this org
      interface SpaceRow extends Record<string, unknown> {
        space_id: string
        client_id: string
        organization_id: string | null
      }

      const spaces = await runGreenhousePostgresQuery<SpaceRow>(
        `SELECT space_id, client_id, organization_id
         FROM greenhouse_core.spaces
         WHERE organization_id = $1
         LIMIT 1`,
        [org.organization_id]
      )

      if (spaces.length === 0) {
        console.log(`  ⚠ No space found — skipping`)
        totalSkipped++
        continue
      }

      const space = spaces[0]

      // Resolve client name
      const clientNames = await runGreenhousePostgresQuery<{ client_name: string | null }>(
        `SELECT client_name FROM greenhouse_finance.client_profiles WHERE client_profile_id = $1 LIMIT 1`,
        [space.client_id]
      )

      const clientName = clientNames[0]?.client_name ?? null

      // Fetch quotes from Cloud Run
      const timeout = 10000 // 10s for backfill (longer than normal)
      const response = await fetch(`${baseUrl}/companies/${org.hubspot_company_id}/quotes`, {
        signal: AbortSignal.timeout(timeout)
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`  ⚠ Quotes endpoint not available (404) — skipping`)
          totalSkipped++
          continue
        }

        console.error(`  ✗ Cloud Run error: ${response.status} ${response.statusText}`)
        totalErrors++
        continue
      }

      interface QuoteProfileIdentity {
        quoteId: string
        title: string | null
        quoteNumber: string | null
        hubspotQuoteId: string
      }

      interface QuoteProfile {
        identity: QuoteProfileIdentity
        financial: { amount: number | null; currency: string | null; discount: number | null }
        dates: { createDate: string | null; expirationDate: string | null; lastModifiedDate: string | null }
        status: { approvalStatus: string | null; signatureStatus: string | null }
        associations: { dealId: string | null; companyId: string | null; contactIds: string[]; lineItemCount: number }
        source: { sourceSystem: 'hubspot'; sourceObjectType: 'quote'; sourceObjectId: string }
      }

      const data: { quotes: QuoteProfile[] } = await response.json()
      const quotes = data.quotes ?? []

      if (quotes.length === 0) {
        console.log(`  — No quotes found`)
        continue
      }

      // Status mapping
      const STATUS_MAP: Record<string, string> = {
        DRAFT: 'draft', PENDING_APPROVAL: 'sent', APPROVAL_NOT_NEEDED: 'sent',
        APPROVED: 'accepted', REJECTED: 'rejected', SIGNED: 'accepted',
        LOST: 'rejected', EXPIRED: 'expired'
      }

      let created = 0
      let updated = 0

      for (const quote of quotes) {
        const hsId = quote.identity.hubspotQuoteId

        if (!hsId) continue

        const quoteId = `QUO-HS-${hsId}`
        const title = quote.identity.title || `HubSpot Quote ${hsId}`
        const quoteNumber = quote.identity.quoteNumber || null
        const amount = quote.financial.amount ?? 0
        const currency = quote.financial.currency || 'CLP'
        const status = (quote.status.approvalStatus && STATUS_MAP[quote.status.approvalStatus]) || 'draft'
        const expirationDate = quote.dates.expirationDate || null
        const createDate = quote.dates.createDate || null
        const dealId = quote.associations.dealId || null

        const result = await runGreenhousePostgresQuery<{ action: string }>(
          `INSERT INTO greenhouse_finance.quotes (
            quote_id, client_id, organization_id, client_name,
            quote_number, quote_date, due_date, description,
            currency, total_amount, total_amount_clp, status,
            source_system, hubspot_quote_id, hubspot_deal_id, hubspot_last_synced_at,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6::date, $7::date, $8,
            $9, $10, $11, $12,
            'hubspot', $13, $14, NOW(),
            NOW(), NOW()
          )
          ON CONFLICT (quote_id) DO UPDATE SET
            client_name = EXCLUDED.client_name,
            quote_number = EXCLUDED.quote_number,
            total_amount = EXCLUDED.total_amount,
            total_amount_clp = EXCLUDED.total_amount_clp,
            currency = EXCLUDED.currency,
            status = EXCLUDED.status,
            hubspot_deal_id = EXCLUDED.hubspot_deal_id,
            hubspot_last_synced_at = NOW(),
            updated_at = NOW()
          RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action`,
          [
            quoteId, space.client_id, space.organization_id, clientName,
            quoteNumber, createDate, expirationDate, title,
            currency, amount, currency === 'CLP' ? amount : 0, status,
            hsId, dealId
          ]
        )

        const action = result[0]?.action

        if (action === 'created') {
          created++
          totalCreated++

          // Publish outbox event
          const { randomUUID } = await import('node:crypto')

          await runGreenhousePostgresQuery(
            `INSERT INTO greenhouse_sync.outbox_events (
              event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
            ) VALUES ($1, 'quote', $2, 'finance.quote.synced', $3::jsonb, 'pending', NOW())`,
            [
              `outbox-${randomUUID()}`,
              quoteId,
              JSON.stringify({
                quoteId, hubspotQuoteId: hsId, hubspotDealId: dealId,
                sourceSystem: 'hubspot', action: 'created',
                organizationId: space.organization_id, spaceId: space.space_id
              })
            ]
          )
        } else if (action === 'updated') {
          updated++
          totalUpdated++
        }
      }

      console.log(`  ✓ ${quotes.length} quotes: ${created} created, ${updated} updated`)
    } catch (err) {
      console.error(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`)
      totalErrors++
    }
  }

  // Summary
  console.log()
  console.log('=== Summary ===')
  console.log(`Organizations processed: ${orgs.length}`)
  console.log(`Quotes created: ${totalCreated}`)
  console.log(`Quotes updated: ${totalUpdated}`)
  console.log(`Organizations skipped: ${totalSkipped}`)
  console.log(`Errors: ${totalErrors}`)
  console.log(`Finished at: ${new Date().toISOString()}`)

  process.exit(0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
