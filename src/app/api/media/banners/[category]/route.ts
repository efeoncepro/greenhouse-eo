import { NextResponse } from 'next/server'

import { downloadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'
import { getGreenhousePublicMediaBucket } from '@/lib/storage/greenhouse-assets'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES = ['leadership', 'operations', 'creative', 'technology', 'strategy', 'support', 'default']

export async function GET(_: Request, { params }: { params: Promise<{ category: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { category } = await params

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid banner category' }, { status: 400 })
  }

  try {
    const bucket = getGreenhousePublicMediaBucket()
    const asset = await downloadGreenhouseStorageObject({ bucketName: bucket, objectName: `banners/${category}.png` })

    return new NextResponse(asset.arrayBuffer, {
      headers: {
        'Content-Type': asset.contentType,
        'Cache-Control': 'public, max-age=86400, immutable'
      }
    })
  } catch {
    return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
  }
}
