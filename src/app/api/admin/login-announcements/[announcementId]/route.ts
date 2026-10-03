import { NextResponse } from 'next/server'

import { setLoginAnnouncementStatus, updateLoginAnnouncement } from '@/lib/login-announcements/commands'
import { loginAnnouncementErrorResponse, requireLoginAnnouncementsManager } from '@/lib/login-announcements/http'

/**
 * TASK-1963 — Edita una novedad del login.
 * - `{ "status": "published" | "draft" | "archived" }` sólo cambia el estado (idempotente).
 * - `{ "announcement": { … } }` reemplaza su contenido sin tocar el estado.
 */
export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ announcementId: string }> }) {
  const gate = await requireLoginAnnouncementsManager('update')

  if (gate.response) return gate.response

  const { actorId } = gate

  try {
    const { announcementId } = await context.params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (body && 'status' in body && !('announcement' in body))
      return NextResponse.json({ announcement: await setLoginAnnouncementStatus(announcementId, body.status, actorId) })

    return NextResponse.json({
      announcement: await updateLoginAnnouncement(announcementId, body?.announcement ?? null, actorId)
    })
  } catch (error) {
    return loginAnnouncementErrorResponse(error)
  }
}
