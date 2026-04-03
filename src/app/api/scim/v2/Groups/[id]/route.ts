import { NextResponse } from 'next/server'

import { requireScimAuth } from '@/lib/scim/auth'
import { toScimError } from '@/lib/scim/formatters'
import {
  getGroupById,
  getGroupMembers,
  updateGroup,
  patchGroupMembers,
  toScimGroup
} from '@/lib/scim/groups'

export const dynamic = 'force-dynamic'

// ── GET /api/scim/v2/Groups/[id] ──

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const { id } = await params
    const group = await getGroupById(id)

    if (!group) {
      return NextResponse.json(toScimError('Group not found', 404), { status: 404 })
    }

    const members = await getGroupMembers(group.scim_group_id)

    return NextResponse.json(toScimGroup(group, members))
  } catch (error) {
    console.error('[scim] GET /Groups/[id] error:', error)

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}

// ── PATCH /api/scim/v2/Groups/[id] ──

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const { id } = await params
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json(toScimError('Invalid JSON body', 400), { status: 400 })
    }

    const group = await getGroupById(id)

    if (!group) {
      return NextResponse.json(toScimError('Group not found', 404), { status: 404 })
    }

    const updates: { displayName?: string; active?: boolean } = {}

    for (const op of body.Operations || []) {
      const path = op.path?.toLowerCase()
      const opType = (op.op || '').toLowerCase()

      if (path === 'displayname') {
        updates.displayName = String(op.value)
      } else if (path === 'members' || path?.startsWith('members[')) {
        // Member operations
        const memberValues = Array.isArray(op.value)
          ? op.value.map((v: { value: string }) => v.value)
          : [op.value?.value || op.value].filter(Boolean)

        if (opType === 'add') {
          await patchGroupMembers(group.scim_group_id, 'add', memberValues)
        } else if (opType === 'remove') {
          // Extract member ID from path like 'members[value eq "xxx"]'
          const pathMatch = path?.match(/members\[value\s+eq\s+"([^"]+)"\]/i)

          if (pathMatch) {
            await patchGroupMembers(group.scim_group_id, 'remove', [pathMatch[1]])
          } else {
            await patchGroupMembers(group.scim_group_id, 'remove', memberValues)
          }
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateGroup(id, updates)
    }

    const updatedGroup = await getGroupById(id)
    const members = await getGroupMembers(group.scim_group_id)

    return NextResponse.json(toScimGroup(updatedGroup || group, members))
  } catch (error) {
    console.error('[scim] PATCH /Groups/[id] error:', error)

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}

// ── DELETE /api/scim/v2/Groups/[id] ──

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const { id } = await params
    const result = await updateGroup(id, { active: false })

    if (!result) {
      return NextResponse.json(toScimError('Group not found', 404), { status: 404 })
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('[scim] DELETE /Groups/[id] error:', error)

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}
