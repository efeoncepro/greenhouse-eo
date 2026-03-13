import { NextResponse } from 'next/server'

import { setUserAvatarAssetPath } from '@/lib/admin/media-assets'
import {
  assertSupportedImageFile,
  greenhouseMediaMaxBytes,
  uploadGreenhouseMediaAsset
} from '@/lib/storage/greenhouse-media'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Debes adjuntar una imagen valida.' }, { status: 400 })
  }

  try {
    assertSupportedImageFile({ contentType: file.type, size: file.size })
  } catch (error) {
    if (error instanceof Error && error.message === 'unsupported_type') {
      return NextResponse.json({ error: 'Selecciona un PNG, JPG, WEBP o SVG.' }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'file_too_large') {
      return NextResponse.json({ error: `La imagen supera ${Math.round(greenhouseMediaMaxBytes / 1024 / 1024)} MB.` }, { status: 400 })
    }

    return NextResponse.json({ error: 'No pudimos validar la imagen.' }, { status: 400 })
  }

  const { id } = await params
  const bytes = await file.arrayBuffer()

  try {
    const assetPath = await uploadGreenhouseMediaAsset({
      entityFolder: 'users',
      entityId: id,
      kind: 'avatar',
      fileName: file.name,
      contentType: file.type,
      bytes
    })

    await setUserAvatarAssetPath({
      userId: id,
      assetPath
    })

    return NextResponse.json({
      ok: true,
      assetPath
    })
  } catch {
    return NextResponse.json({ error: 'No pudimos guardar la foto del usuario.' }, { status: 500 })
  }
}
