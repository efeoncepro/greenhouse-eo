import { NextResponse } from 'next/server'

import { requireScimAuth } from '@/lib/scim/auth'
import { toScimError, toScimListResponse } from '@/lib/scim/formatters'
import {
  listGroups,
  queryGroupsByFilter,
  getGroupMembers,
  createGroup,
  toScimGroup
} from '@/lib/scim/groups'

export const dynamic = 'force-dynamic'

// ── GET /api/scim/v2/Groups — List or filter groups ──

export async function GET(request: Request) {
  const auth = await requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const url = new URL(request.url)
    const filter = url.searchParams.get('filter')
    const startIndex = Math.max(1, parseInt(url.searchParams.get('startIndex') || '1', 10))
    const count = Math.min(100, Math.max(1, parseInt(url.searchParams.get('count') || '100', 10)))

    let groupRows

    if (filter) {
      const match = filter.match(/(\w+)\s+eq\s+"([^"]+)"/)

      if (!match) {
        return NextResponse.json(toScimError('Invalid filter syntax', 400), { status: 400 })
      }

      const [, field, value] = match

      groupRows = await queryGroupsByFilter(field, value)
    } else {
      const result = await listGroups(startIndex, count)

      groupRows = result.rows
    }

    // Enrich with members
    const groups = await Promise.all(
      groupRows.map(async row => {
        const members = await getGroupMembers(row.scim_group_id)

        return toScimGroup(row, members)
      })
    )

    return NextResponse.json(
      toScimListResponse(groups, startIndex, count, groups.length)
    )
  } catch (error) {
    console.error('[scim] GET /Groups error:', error)

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}

// ── POST /api/scim/v2/Groups — Create group ──

export async function POST(request: Request) {
  const auth = await requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const body = await request.json().catch(() => null)

    if (!body?.displayName) {
      return NextResponse.json(toScimError('displayName is required', 400), { status: 400 })
    }

    const memberIds = (body.members || []).map((m: { value: string }) => m.value)

    const group = await createGroup({
      displayName: body.displayName,
      externalId: body.externalId,
      memberIds
    })

    const members = await getGroupMembers(group.scim_group_id)

    return NextResponse.json(toScimGroup(group, members), { status: 201 })
  } catch (error) {
    console.error('[scim] POST /Groups error:', error)

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}
