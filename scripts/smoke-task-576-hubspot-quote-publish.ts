#!/usr/bin/env tsx

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const moduleWithCache = require('module') as { _cache: Record<string, unknown> }

moduleWithCache._cache[require.resolve('server-only')] = {
  id: 'server-only',
  exports: {},
  loaded: true
}

import {
  applyGreenhousePostgresProfile,
  loadGreenhouseToolEnv,
  type PostgresProfile
} from './lib/load-greenhouse-tool-env'

const DEFAULT_BASE_URL = 'https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app'
const DEFAULT_QUOTATION_ID = 'qt-b1959939-db45-45c2-a2c3-6f5fd57b2af9'
const DEFAULT_LINE_LABEL = 'Creative Operations Lead'

interface ScriptArgs {
  quotationId: string
  lineLabel: string
  billingStartDate: string | null
}

interface QuoteRow extends Record<string, unknown> {
  quotation_id: string
  quotation_number: string
  organization_id: string | null
  hubspot_company_id: string | null
  hubspot_quote_id: string | null
  quote_date: string | Date | null
  billing_start_date: string | Date | null
  created_by: string | null
  issued_by: string | null
}

interface LocalLineRow extends Record<string, unknown> {
  line_item_id: string
  label: string
  product_id: string | null
  hubspot_product_id: string | null
  hubspot_line_item_id: string | null
}

interface CatalogRow extends Record<string, unknown> {
  product_id: string
  product_name: string
  product_code: string | null
  legacy_sku: string | null
  hubspot_product_id: string | null
  source_kind: string | null
}

interface RemoteLineItem {
  identity?: {
    hubspotLineItemId?: string | null
    hubspotProductId?: string | null
    productCode?: string | null
    legacySku?: string | null
  }
  content?: {
    name?: string | null
  }
  billing?: {
    frequency?: string | null
    startDate?: string | null
  }
  tax?: {
    taxRate?: number | null
  }
}

interface CompanyQuotesResponse {
  count: number
  quotes: Array<{
    identity: {
      hubspotQuoteId: string
      title: string | null
      quoteNumber: string | null
    }
    sender?: {
      firstName?: string | null
      lastName?: string | null
      email?: string | null
      companyName?: string | null
    }
    associations: {
      dealId: string | null
      companyId: string | null
      contactIds: string[]
      lineItemCount: number
    }
  }>
}

interface QuoteLineItemsResponse {
  count: number
  lineItems: RemoteLineItem[]
}

const parseArgs = (argv: string[]): ScriptArgs => {
  const args: ScriptArgs = {
    quotationId: DEFAULT_QUOTATION_ID,
    lineLabel: DEFAULT_LINE_LABEL,
    billingStartDate: null
  }

  for (const raw of argv) {
    if (raw.startsWith('--quotation-id=')) {
      args.quotationId = raw.slice('--quotation-id='.length).trim() || DEFAULT_QUOTATION_ID
      continue
    }

    if (raw.startsWith('--line-label=')) {
      args.lineLabel = raw.slice('--line-label='.length).trim() || DEFAULT_LINE_LABEL
      continue
    }

    if (raw.startsWith('--billing-start-date=')) {
      const value = raw.slice('--billing-start-date='.length).trim()

      args.billingStartDate = value || null
    }
  }

  return args
}

const toDateOnly = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const sanitizeBaseUrl = (value: string | undefined): string =>
  value
    ?.trim()
    .replace(/\\r|\\n/g, '')
    .replace(/[\r\n]+/g, '')
    .replace(/\/+$/, '') || DEFAULT_BASE_URL

const log = (title: string, payload: unknown) => {
  console.log(`\n=== ${title} ===`)
  console.log(JSON.stringify(payload, null, 2))
}

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() || null

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  loadGreenhouseToolEnv()

  const profile = (process.env.MIGRATE_PROFILE as PostgresProfile) || 'ops'
  const profileInfo = applyGreenhousePostgresProfile(profile)
  const baseUrl = sanitizeBaseUrl(process.env.HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL)

  log('TASK-576 smoke bootstrap', {
    quotationId: args.quotationId,
    lineLabel: args.lineLabel,
    billingStartDateOverride: args.billingStartDate,
    profile: profileInfo.profile,
    baseUrl
  })

  const [{ closeGreenhousePostgres, query, withTransaction }, { pushCanonicalQuoteToHubSpot }] =
    await Promise.all([
      import('@/lib/db'),
      import('@/lib/hubspot/push-canonical-quote')
    ])

  try {
    const quoteRows = await query<QuoteRow>(
      `SELECT q.quotation_id,
              q.quotation_number,
              q.organization_id,
              org.hubspot_company_id,
              q.hubspot_quote_id,
              q.quote_date,
              q.billing_start_date,
              q.created_by,
              q.issued_by
         FROM greenhouse_commercial.quotations AS q
         LEFT JOIN greenhouse_core.organizations AS org
           ON org.organization_id = q.organization_id
        WHERE q.quotation_id = $1
        LIMIT 1`,
      [args.quotationId]
    )

    const quote = quoteRows[0]

    assert(quote, `No se encontró la cotización ${args.quotationId}.`)
    assert(quote.hubspot_quote_id, `La cotización ${args.quotationId} aún no tiene hubspot_quote_id.`)
    assert(quote.hubspot_company_id, `La cotización ${args.quotationId} no tiene hubspot_company_id resoluble.`)

    const localLines = await query<LocalLineRow>(
      `SELECT line_item_id,
              label,
              product_id,
              hubspot_product_id,
              hubspot_line_item_id
         FROM greenhouse_commercial.quotation_line_items
        WHERE quotation_id = $1
        ORDER BY sort_order, line_number, line_item_id`,
      [args.quotationId]
    )

    assert(localLines.length > 0, `La cotización ${args.quotationId} no tiene líneas canónicas.`)

    const targetLine =
      localLines.find(line => normalize(line.label) === normalize(args.lineLabel)) ||
      localLines[0]

    const catalogRows = await query<CatalogRow>(
      `SELECT product_id,
              product_name,
              product_code,
              legacy_sku,
              hubspot_product_id,
              source_kind
         FROM greenhouse_commercial.product_catalog
        WHERE lower(product_name) = lower($1)
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1`,
      [targetLine.label]
    )

    const catalogProduct = catalogRows[0]

    assert(
      catalogProduct,
      `No encontramos binding catálogo-first para la línea "${targetLine.label}" en greenhouse_commercial.product_catalog.`
    )
    assert(
      catalogProduct.hubspot_product_id,
      `El producto de catálogo ${catalogProduct.product_id} no tiene hubspot_product_id.`
    )

    const remoteLineItemsResponse = await fetch(
      `${baseUrl}/quotes/${encodeURIComponent(String(quote.hubspot_quote_id))}/line-items`,
      {
        signal: AbortSignal.timeout(20_000)
      }
    )

    assert(
      remoteLineItemsResponse.ok,
      `GET /quotes/${quote.hubspot_quote_id}/line-items devolvió ${remoteLineItemsResponse.status}.`
    )

    const remoteLineItemsPayload = (await remoteLineItemsResponse.json()) as QuoteLineItemsResponse

    const remoteLineItem =
      remoteLineItemsPayload.lineItems.find(item =>
        normalize(item.identity?.productCode) === normalize(catalogProduct.product_code)
      ) ||
      remoteLineItemsPayload.lineItems.find(item =>
        normalize(item.identity?.legacySku) === normalize(catalogProduct.legacy_sku)
      ) ||
      remoteLineItemsPayload.lineItems.find(item =>
        normalize(item.content?.name) === normalize(targetLine.label)
      )

    assert(
      remoteLineItem?.identity?.hubspotLineItemId,
      `No pudimos resolver el hubspotLineItemId existente para "${targetLine.label}" en la quote ${quote.hubspot_quote_id}.`
    )

    const remoteLineItemId = remoteLineItem.identity.hubspotLineItemId

    const effectiveBillingStartDate =
      args.billingStartDate ||
      toDateOnly(quote.billing_start_date) ||
      toDateOnly(quote.quote_date)

    assert(
      effectiveBillingStartDate,
      `No pudimos derivar billing_start_date para ${args.quotationId}; pasa --billing-start-date=YYYY-MM-DD.`
    )

    await withTransaction(async client => {
      await client.query(
        `UPDATE greenhouse_commercial.quotations
            SET billing_start_date = COALESCE(billing_start_date, $2::date),
                updated_at = NOW()
          WHERE quotation_id = $1`,
        [args.quotationId, effectiveBillingStartDate]
      )

      await client.query(
        `UPDATE greenhouse_commercial.quotation_line_items
            SET product_id = $2,
                hubspot_product_id = $3,
                hubspot_line_item_id = $4,
                updated_at = NOW()
          WHERE quotation_id = $1
            AND line_item_id = $5`,
        [
          args.quotationId,
          catalogProduct.product_id,
          catalogProduct.hubspot_product_id,
          remoteLineItemId,
          targetLine.line_item_id
        ]
      )
    })

    log('canonical bindings enforced before push', {
      quotationId: args.quotationId,
      quotationNumber: quote.quotation_number,
      billingStartDate: effectiveBillingStartDate,
      lineItemId: targetLine.line_item_id,
      lineLabel: targetLine.label,
      productId: catalogProduct.product_id,
      productCode: catalogProduct.product_code,
      legacySku: catalogProduct.legacy_sku,
      hubspotProductId: catalogProduct.hubspot_product_id,
      hubspotLineItemId: remoteLineItemId
    })

    const pushResult = await pushCanonicalQuoteToHubSpot({
      quotationId: args.quotationId,
      actorId: quote.issued_by || quote.created_by || null
    })

    log('push result', pushResult)

    const [companyQuotesResponse, refreshedLineItemsResponse] = await Promise.all([
      fetch(`${baseUrl}/companies/${encodeURIComponent(String(quote.hubspot_company_id))}/quotes`, {
        signal: AbortSignal.timeout(20_000)
      }),
      fetch(`${baseUrl}/quotes/${encodeURIComponent(String(quote.hubspot_quote_id))}/line-items`, {
        signal: AbortSignal.timeout(20_000)
      })
    ])

    assert(
      companyQuotesResponse.ok,
      `GET /companies/${quote.hubspot_company_id}/quotes devolvió ${companyQuotesResponse.status}.`
    )
    assert(
      refreshedLineItemsResponse.ok,
      `GET /quotes/${quote.hubspot_quote_id}/line-items devolvió ${refreshedLineItemsResponse.status}.`
    )

    const companyQuotesPayload = (await companyQuotesResponse.json()) as CompanyQuotesResponse
    const refreshedLineItemsPayload = (await refreshedLineItemsResponse.json()) as QuoteLineItemsResponse

    const remoteQuote = companyQuotesPayload.quotes.find(
      item => item.identity.hubspotQuoteId === String(quote.hubspot_quote_id)
    )

    const refreshedLineItem =
      refreshedLineItemsPayload.lineItems.find(
        item => item.identity?.hubspotLineItemId === remoteLineItemId
      ) ||
      refreshedLineItemsPayload.lineItems.find(item => normalize(item.content?.name) === normalize(targetLine.label))

    assert(remoteQuote, `No encontramos la quote ${quote.hubspot_quote_id} en /companies/${quote.hubspot_company_id}/quotes.`)
    assert(
      refreshedLineItem,
      `No encontramos la línea HubSpot actualizada para "${targetLine.label}" después del push.`
    )

    const sender = remoteQuote.sender ?? {}
    const lineIdentity = refreshedLineItem.identity ?? {}
    const lineBilling = refreshedLineItem.billing ?? {}
    const lineTax = refreshedLineItem.tax ?? {}

    const verification = {
      quoteId: remoteQuote.identity.hubspotQuoteId,
      sender,
      associations: remoteQuote.associations,
      lineItem: {
        hubspotLineItemId: lineIdentity.hubspotLineItemId ?? null,
        hubspotProductId: lineIdentity.hubspotProductId ?? null,
        productCode: lineIdentity.productCode ?? null,
        legacySku: lineIdentity.legacySku ?? null,
        billingFrequency: lineBilling.frequency ?? null,
        billingStartDate: lineBilling.startDate ?? null,
        taxRate: lineTax.taxRate ?? null
      }
    }

    log('remote verification', verification)

    assert(sender.firstName && sender.lastName, 'La quote quedó sin sender nombre/apellido en HubSpot.')
    assert(sender.email, 'La quote quedó sin sender email en HubSpot.')
    assert(sender.companyName, 'La quote quedó sin empresa emisora en HubSpot.')
    assert(
      normalize(lineIdentity.hubspotProductId) === normalize(catalogProduct.hubspot_product_id),
      'La línea HubSpot no quedó ligada al producto canónico.'
    )
    assert(
      normalize(lineIdentity.productCode) === normalize(catalogProduct.product_code),
      'La línea HubSpot no expuso el product_code/Ref esperado.'
    )
    assert(lineBilling.frequency, 'La línea HubSpot quedó sin billing frequency.')
    assert(
      normalize(lineBilling.startDate) === normalize(effectiveBillingStartDate),
      'La línea HubSpot quedó sin billing start date canónico.'
    )
    assert(lineTax.taxRate !== null && lineTax.taxRate !== undefined, 'La línea HubSpot quedó sin tasa IVA visible.')

    console.log('\nTASK-576 smoke OK')
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('\nTASK-576 smoke FAILED')
  console.error(error)
  process.exit(1)
})
