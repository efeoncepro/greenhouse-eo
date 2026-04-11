import { NextResponse } from 'next/server'

import { setUserAvatarAssetPath } from '@/lib/admin/media-assets'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
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

    // Propagate to PostgreSQL — client_users keeps gs:// path,
    // members gets browser-ready proxy URL
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.client_users
       SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND (avatar_url IS DISTINCT FROM $1)`,
      [assetPath, id]
    )

    const memberProxyUrl = `/api/media/users/${id}/avatar`

    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.members
       SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE member_id = (
         SELECT member_id FROM greenhouse_core.client_users
         WHERE user_id = $2 AND member_id IS NOT NULL
       ) AND (avatar_url IS DISTINCT FROM $1)`,
      [memberProxyUrl, id]
    )

    return NextResponse.json({
      ok: true,
      assetPath
    })
  } catch {
    return NextResponse.json({ error: 'No pudimos guardar la foto del usuario.' }, { status: 500 })
  }
}
