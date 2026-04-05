import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { getPermissionSet, updatePermissionSet, deletePermissionSet, PermissionSetError } from '@/lib/admin/permission-sets'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { setId } = await params

  try {
    const set = await getPermissionSet(setId)

    if (!set) return NextResponse.json({ error: 'Permission Set no encontrado.' }, { status: 404 })

    return NextResponse.json(set)
  } catch (error) {
    console.error(`[admin/views/sets/${setId}] GET error:`, error)

    return NextResponse.json({ error: 'No se pudo obtener el Permission Set.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { setId } = await params

  try {
    const body = await request.json()

    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const description = typeof body.description === 'string' ? body.description.trim() : undefined
    const section = typeof body.section === 'string' ? body.section.trim() : undefined

    let viewCodes: string[] | undefined

    if (Array.isArray(body.viewCodes)) {
      viewCodes = body.viewCodes.filter((v: unknown) => typeof v === 'string' && v.trim())

      if (viewCodes!.length === 0) {
        return NextResponse.json({ error: 'Debe incluir al menos una vista.' }, { status: 400 })
      }

      const validViewCodes = new Set(VIEW_REGISTRY.map(v => v.viewCode))
      const invalidCodes = viewCodes!.filter(c => !validViewCodes.has(c))

      if (invalidCodes.length > 0) {
        return NextResponse.json({ error: `Vistas no válidas: ${invalidCodes.join(', ')}` }, { status: 400 })
      }
    }

    await updatePermissionSet(setId, { name, description, section, viewCodes, updatedBy: tenant.userId })

    return NextResponse.json({ setId, updated: true })
  } catch (error) {
    if (error instanceof PermissionSetError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error(`[admin/views/sets/${setId}] PUT error:`, error)

    return NextResponse.json({ error: 'No se pudo actualizar el Permission Set.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { setId } = await params

  try {
    await deletePermissionSet(setId, tenant.userId)

    return NextResponse.json({ setId, deleted: true })
  } catch (error) {
    if (error instanceof PermissionSetError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error(`[admin/views/sets/${setId}] DELETE error:`, error)

    return NextResponse.json({ error: 'No se pudo eliminar el Permission Set.' }, { status: 500 })
  }
}
