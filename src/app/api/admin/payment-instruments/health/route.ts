import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { assertPaymentInstrumentCapability } from '@/lib/finance/payment-instruments'
import { checkPaymentCatalogHealth } from '@/lib/finance/payment-instruments/catalog-drift'
import { FinanceValidationError } from '@/lib/finance/shared'
import { translatePostgresError, extractPostgresErrorTags } from '@/lib/finance/postgres-error-translator'
import { captureMessageWithDomain, captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

/**
 * Payment Provider Catalog — runtime health endpoint (L5 of the catalog
 * robustness layers).
 *
 * Compares the canonical manifest (CANONICAL_PROVIDERS, derived from
 * `public/images/logos/payment/manifest.json`) against the live
 * `greenhouse_finance.payment_provider_catalog` rows. Drift here means: a
 * deploy went out without applying the latest catalog migration to this
 * environment. Surfaces the drift two ways:
 *
 *   1. Structured JSON to the caller — admins / health probes / reliability
 *      composers can render the report.
 *
 *   2. Sentry message tagged `domain=finance` via `captureMessageWithDomain`,
 *      so the reliability dashboard reads it as an incident signal for the
 *      finance module (per `RELIABILITY_REGISTRY[finance].incidentDomainTag`).
 *
 * The endpoint is admin-only (uses the same capability gate as the rest of
 * the payment-instruments admin surface).
 */
export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertPaymentInstrumentCapability({
      tenant,
      capability: 'finance.payment_instruments.read',
      action: 'read'
    })

    const health = await checkPaymentCatalogHealth()

    if (!health.healthy) {
      captureMessageWithDomain(
        `Payment provider catalog drift detected (${health.drift.length} mismatches).`,
        'finance',
        {
          level: 'warning',
          tags: { source: 'payment_catalog_drift' },
          extra: {
            manifestEntries: health.manifestEntries,
            dbRows: health.dbRows,
            drift: health.drift
          },
          fingerprint: ['payment-catalog-drift']
        }
      )
    }

    return NextResponse.json(health, {
      headers: { 'Cache-Control': 'no-store' },
      status: health.healthy ? 200 : 503
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.statusCode }
      )
    }

    const translated = translatePostgresError(error)

    if (translated) {
      captureWithDomain(error, 'finance', {
        tags: { source: 'payment_instruments_admin', op: 'health', ...extractPostgresErrorTags(error) }
      })

      return NextResponse.json(
        { error: translated.message, code: translated.code, details: translated.details },
        { status: translated.statusCode }
      )
    }

    captureWithDomain(error, 'finance', { tags: { source: 'payment_instruments_admin', op: 'health' } })

    return NextResponse.json(
      { error: 'Error interno al evaluar la salud del catálogo de proveedores.' },
      { status: 500 }
    )
  }
}
