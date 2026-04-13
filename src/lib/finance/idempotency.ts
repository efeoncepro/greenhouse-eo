import 'server-only'

import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ─── Types ──────────────────────────────────────────────────

type IdempotencyStatus = 'processing' | 'completed' | 'failed'

interface StoredKey extends Record<string, unknown> {
  status: IdempotencyStatus
  response_status: number | null
  response_body: unknown | null
}

// ─── Core helper ────────────────────────────────────────────

/**
 * Wraps a Finance POST handler with idempotency-key support.
 *
 * Usage:
 *   return withIdempotency(request, tenantId, '/api/finance/income', async () => {
 *     // ... handler body, return NextResponse
 *   })
 *
 * Clients send:  Idempotency-Key: <uuid>
 * - First call with that key: executes handler, stores response
 * - Retry with same key:      returns cached response without executing handler
 * - In-flight key:            returns 409 immediately
 * - No key present:           behaves as before (no-op)
 */
export const withIdempotency = async (
  request: Request,
  tenantId: string,
  endpoint: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> => {
  const key = request.headers.get('Idempotency-Key')

  if (!key || !key.trim()) {
    return handler()
  }

  const trimmedKey = key.trim()

  // Try to insert the key in 'processing' state (idempotent claim)
  // ON CONFLICT means another request already claimed this key
  const existing = await runGreenhousePostgresQuery<StoredKey>(
    `
    INSERT INTO greenhouse_finance.idempotency_keys
      (idempotency_key, tenant_id, endpoint, status)
    VALUES ($1, $2, $3, 'processing')
    ON CONFLICT (idempotency_key, tenant_id)
    DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
    RETURNING status, response_status, response_body
    `,
    [trimmedKey, tenantId, endpoint]
  )

  const record = existing[0] as StoredKey | undefined

  // Key was already claimed by a previous (or in-flight) request
  if (record?.status === 'completed' && record.response_status !== null) {
    return NextResponse.json(record.response_body, { status: record.response_status })
  }

  if (record?.status === 'failed') {
    // Allow retry on failed requests (re-attempt, don't return cached error)
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.idempotency_keys
       SET status = 'processing', response_status = NULL, response_body = NULL
       WHERE idempotency_key = $1 AND tenant_id = $2`,
      [trimmedKey, tenantId]
    )
  }

  if (record?.status === 'processing') {
    // Another request is in-flight with this key
    return NextResponse.json(
      { error: 'A request with this Idempotency-Key is already in progress.' },
      { status: 409 }
    )
  }

  // Execute the handler
  let response: NextResponse

  try {
    response = await handler()
  } catch (err) {
    // Mark key as failed so retries are allowed
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.idempotency_keys
       SET status = 'failed'
       WHERE idempotency_key = $1 AND tenant_id = $2`,
      [trimmedKey, tenantId]
    ).catch(() => undefined)

    throw err
  }

  // Cache the response
  let body: unknown = null

  try {
    body = await response.clone().json()
  } catch {
    // Non-JSON body — cache as null
  }

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_finance.idempotency_keys
     SET status = 'completed', response_status = $3, response_body = $4
     WHERE idempotency_key = $1 AND tenant_id = $2`,
    [trimmedKey, tenantId, response.status, body ? JSON.stringify(body) : null]
  ).catch(() => undefined) // best-effort — don't fail the request if caching fails

  return response
}
