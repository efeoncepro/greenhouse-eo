import { NextResponse } from 'next/server'

import { canTenantAccessAsset, deletePendingAsset, downloadPrivateAsset, getAssetById } from '@/lib/storage/greenhouse-assets'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { assetId } = await params
    const asset = await getAssetById(assetId)

    if (!asset) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!canTenantAccessAsset({ tenant, asset })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const downloaded = await downloadPrivateAsset({
      assetId,
      actorUserId: tenant.userId
    })

    return new NextResponse(new Uint8Array(downloaded.file.arrayBuffer), {
      headers: {
        'Content-Type': downloaded.asset.mimeType,
        'Content-Disposition': `attachment; filename="${downloaded.asset.filename}"`,
        'Cache-Control': downloaded.file.cacheControl
      }
    })
  } catch (error) {
    console.error('GET /api/assets/private/[assetId] failed:', error)

    return NextResponse.json({ error: 'Unable to download asset.' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { assetId } = await params
    const asset = await getAssetById(assetId)

    if (!asset) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!canTenantAccessAsset({ tenant, asset })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deletePendingAsset({
      assetId,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete asset.'

    if (message === 'asset_not_pending') {
      return NextResponse.json({ error: 'Only pending assets can be deleted.' }, { status: 409 })
    }

    if (message === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.error('DELETE /api/assets/private/[assetId] failed:', error)

    return NextResponse.json({ error: 'Unable to delete asset.' }, { status: 500 })
  }
}
