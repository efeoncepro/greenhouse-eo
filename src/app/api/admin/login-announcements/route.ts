import { NextResponse } from 'next/server'

import { createLoginAnnouncement } from '@/lib/login-announcements/commands'
import { loginAnnouncementErrorResponse, requireLoginAnnouncementsManager } from '@/lib/login-announcements/http'
import { listLoginAnnouncementsForAdmin } from '@/lib/login-announcements/reader'

/**
 * TASK-1963 — Administración de las novedades del login. `GET` lista todas (cualquier estado); `POST` crea una en
 * borrador. Ambas exigen `login_announcements.manage`.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const gate = await requireLoginAnnouncementsManager('update')

  if (gate.response) return gate.response

  try {
    return NextResponse.json({ announcements: await listLoginAnnouncementsForAdmin() })
  } catch (error) {
    return loginAnnouncementErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const gate = await requireLoginAnnouncementsManager('create')

  if (gate.response) return gate.response

  const { actorId } = gate

  try {
    const body = await request.json().catch(() => null)

    return NextResponse.json({ announcement: await createLoginAnnouncement(body, actorId) }, { status: 201 })
  } catch (error) {
    return loginAnnouncementErrorResponse(error)
  }
}
