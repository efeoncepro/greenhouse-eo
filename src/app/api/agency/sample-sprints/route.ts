import { NextResponse } from 'next/server'

import {
  declareSampleSprint,
  listSampleSprintOptions,
  listSampleSprints,
  type DeclareSampleSprintInput
} from '@/lib/commercial/sample-sprints/store'

import { mapSampleSprintError, parseJsonBody, requireSampleSprintEntitlement } from './access'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireSampleSprintEntitlement('commercial.engagement.read', 'read')

  if (!tenant) return errorResponse

  const { searchParams } = new URL(request.url)
  const includeOptions = searchParams.get('includeOptions') === 'true'
  const status = searchParams.get('status')

  const [items, options] = await Promise.all([
    listSampleSprints({ tenant, status }),
    includeOptions ? listSampleSprintOptions(tenant) : Promise.resolve(null)
  ])

  return NextResponse.json({ items, count: items.length, options })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireSampleSprintEntitlement('commercial.engagement.declare', 'create')

  if (!tenant) return errorResponse

  const body = await parseJsonBody<Omit<DeclareSampleSprintInput, 'requestedBy'>>(request)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  try {
    const result = await declareSampleSprint({
      ...body,
      requestedBy: tenant.userId
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return mapSampleSprintError(error)
  }
}
