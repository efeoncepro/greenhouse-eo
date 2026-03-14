import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const diagnostics: Record<string, unknown> = {}

  // 1. Check env vars presence
  diagnostics.envVars = {
    GOOGLE_APPLICATION_CREDENTIALS_JSON: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    GOOGLE_APPLICATION_CREDENTIALS_JSON_length: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length ?? 0,
    GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64),
    GCP_PROJECT: process.env.GCP_PROJECT ?? '(not set)',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? '(not set)',
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET)
  }

  // 2. Try to parse GCP credentials
  try {
    const { getGoogleCredentials } = await import('@/lib/bigquery')
    const creds = getGoogleCredentials()

    diagnostics.credentialsParsed = creds
      ? { ok: true, project_id: creds.project_id, client_email: creds.client_email }
      : { ok: false, reason: 'getGoogleCredentials returned undefined' }
  } catch (error) {
    diagnostics.credentialsParsed = {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // 3. Try to connect to BigQuery and run a trivial query
  try {
    const { getBigQueryClient } = await import('@/lib/bigquery')
    const bq = getBigQueryClient()
    const [rows] = await bq.query({ query: 'SELECT 1 AS ping' })

    diagnostics.bigQueryPing = { ok: true, rows }
  } catch (error) {
    diagnostics.bigQueryPing = {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // 4. Try to look up the user
  try {
    const { getTenantAccessRecordByEmail } = await import('@/lib/tenant/access')
    const tenant = await getTenantAccessRecordByEmail('julio.reyes@efeonce.org')

    diagnostics.tenantLookup = tenant
      ? {
          ok: true,
          userId: tenant.userId,
          email: tenant.email,
          active: tenant.active,
          status: tenant.status,
          hasPasswordHash: Boolean(tenant.passwordHash),
          passwordHashAlgorithm: tenant.passwordHashAlgorithm,
          tenantType: tenant.tenantType
        }
      : { ok: false, reason: 'user not found' }
  } catch (error) {
    diagnostics.tenantLookup = {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }

  return NextResponse.json(diagnostics, { status: 200 })
}
