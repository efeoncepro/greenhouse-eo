import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { listPermissionSets, createPermissionSet, PermissionSetError } from '@/lib/admin/permission-sets'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sets = await listPermissionSets()

    return NextResponse.json({ sets })
  } catch (error) {
    console.error('[admin/views/sets] GET error:', error)

    return NextResponse.json({ error: 'No se pudo obtener los Permission Sets.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 })

    const viewCodes = Array.isArray(body.viewCodes) ? body.viewCodes.filter((v: unknown) => typeof v === 'string' && v.trim()) : []

    if (viewCodes.length === 0) return NextResponse.json({ error: 'Debe incluir al menos una vista.' }, { status: 400 })

    const validViewCodes = new Set(VIEW_REGISTRY.map(v => v.viewCode))
    const invalidCodes = viewCodes.filter((c: string) => !validViewCodes.has(c))

    if (invalidCodes.length > 0) {
      return NextResponse.json({ error: `Vistas no válidas: ${invalidCodes.join(', ')}` }, { status: 400 })
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const setId = `pset-${slug}`

    const description = typeof body.description === 'string' ? body.description.trim() : undefined
    const section = typeof body.section === 'string' ? body.section.trim() : undefined

    await createPermissionSet({
      setId,
      name,
      description,
      section,
      viewCodes,
      createdBy: tenant.userId
    })

    return NextResponse.json({ setId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof PermissionSetError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[admin/views/sets] POST error:', error)

    return NextResponse.json({ error: 'No se pudo crear el Permission Set.' }, { status: 500 })
  }
}
