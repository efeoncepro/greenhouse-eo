import 'server-only'

import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { getMode, getSystemMode } from '@core/utils/serverHelpers'
import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint: tests every async call the dashboard layout makes.
 * DELETE this file after TASK-378 is resolved.
 */
export async function GET() {
  const results: Record<string, unknown> = {}

  // Step 1: getServerAuthSession
  try {
    const session = await getServerAuthSession()
    results.session = session ? { userId: session.user?.userId, ok: true } : { ok: false, reason: 'null' }
  } catch (error) {
    results.session = { ok: false, error: String(error) }
  }

  // Step 2: getMode
  try {
    results.mode = await getMode()
  } catch (error) {
    results.mode = { error: String(error) }
  }

  // Step 3: getSystemMode
  try {
    results.systemMode = await getSystemMode()
  } catch (error) {
    results.systemMode = { error: String(error) }
  }

  // Step 4: getOperatingEntityIdentity
  try {
    const entity = await getOperatingEntityIdentity()
    results.operatingEntity = entity ? { id: entity.organizationId, ok: true } : { ok: false, reason: 'null' }
  } catch (error) {
    results.operatingEntity = { ok: false, error: String(error) }
  }

  return NextResponse.json(results)
}
