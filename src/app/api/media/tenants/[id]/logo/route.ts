import { NextResponse } from 'next/server'

import { getTenantLogoAssetPath } from '@/lib/admin/media-assets'
import { downloadGreenhouseMediaAsset } from '@/lib/storage/greenhouse-media'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const canRead = tenant.routeGroups.includes('admin') || tenant.routeGroups.includes('internal') || tenant.clientId === id

  if (!canRead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const assetPath = await getTenantLogoAssetPath(id)

  if (!assetPath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const asset = await downloadGreenhouseMediaAsset(assetPath)

    return new NextResponse(asset.arrayBuffer, {
      headers: {
        'Content-Type': asset.contentType,
        'Cache-Control': asset.cacheControl
      }
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
