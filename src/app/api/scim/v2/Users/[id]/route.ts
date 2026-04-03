import { NextResponse } from 'next/server'

import { requireScimAuth } from '@/lib/scim/auth'
import { toScimUser, toScimError } from '@/lib/scim/formatters'
import { getUserById, updateUser, logScimOperation } from '@/lib/scim/provisioning'

import type { ScimPatchRequest } from '@/types/scim'

export const dynamic = 'force-dynamic'

// ── GET /api/scim/v2/Users/[id] — Get single user ──

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const { id } = await params
    const user = await getUserById(id)

    if (!user) {
      await logScimOperation({ operation: 'GET', scimId: id, responseStatus: 404 })

      return NextResponse.json(toScimError('User not found', 404), { status: 404 })
    }

    await logScimOperation({ operation: 'GET', scimId: user.scim_id, responseStatus: 200 })

    return NextResponse.json(toScimUser(user))
  } catch (error) {
    console.error('[scim] GET /Users/[id] error:', error)

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}

// ── PATCH /api/scim/v2/Users/[id] — Update / deactivate user ──

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const { id } = await params
    const body = (await request.json().catch(() => null)) as ScimPatchRequest | null

    if (!body) {
      return NextResponse.json(toScimError('Invalid JSON body', 400), { status: 400 })
    }

    const user = await getUserById(id)

    if (!user) {
      await logScimOperation({ operation: 'UPDATE', scimId: id, responseStatus: 404 })

      return NextResponse.json(toScimError('User not found', 404), { status: 404 })
    }

    // Parse SCIM patch operations
    const updates: { active?: boolean; displayName?: string; email?: string } = {}

    for (const op of body.Operations || []) {
      const path = op.path?.toLowerCase()
      const value = op.value

      switch (path) {
        case 'active':
          updates.active = String(value).toLowerCase() === 'true'
          break
        case 'displayname':
          updates.displayName = String(value)
          break
        case 'name.givenname':
        case 'name.familyname':
          // For name parts, we'd need to read+merge — skip for MVP
          break
        case 'emails[type eq "work"].value':
          updates.email = String(value)
          break
        default:
          // Entra sometimes sends without path, with value as object
          if (!path && typeof value === 'object' && value !== null) {
            const obj = value as Record<string, unknown>

            if ('active' in obj) updates.active = Boolean(obj.active)
            if ('displayName' in obj) updates.displayName = String(obj.displayName)
          }

          break
      }
    }

    const updatedUser = await updateUser(id, updates)

    if (!updatedUser) {
      return NextResponse.json(toScimError('User not found', 404), { status: 404 })
    }

    const operation = updates.active === false ? 'DEACTIVATE' : 'UPDATE'

    await logScimOperation({
      operation,
      scimId: updatedUser.scim_id,
      externalId: updatedUser.microsoft_oid,
      email: updatedUser.email,
      requestSummary: { operations: body.Operations?.length ?? 0, fields: Object.keys(updates) },
      responseStatus: 200
    })

    return NextResponse.json(toScimUser(updatedUser))
  } catch (error) {
    console.error('[scim] PATCH /Users/[id] error:', error)

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}

// ── DELETE /api/scim/v2/Users/[id] — Soft delete (deactivate) ──

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireScimAuth(request)

  if (!auth.authorized) return auth.errorResponse

  try {
    const { id } = await params
    const updatedUser = await updateUser(id, { active: false })

    if (!updatedUser) {
      await logScimOperation({ operation: 'DELETE', scimId: id, responseStatus: 404 })

      return NextResponse.json(toScimError('User not found', 404), { status: 404 })
    }

    await logScimOperation({
      operation: 'DELETE',
      scimId: updatedUser.scim_id,
      externalId: updatedUser.microsoft_oid,
      email: updatedUser.email,
      responseStatus: 204
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('[scim] DELETE /Users/[id] error:', error)

    return NextResponse.json(toScimError('Internal server error', 500), { status: 500 })
  }
}
