import { NextResponse } from 'next/server'

import { listActiveLoginAnnouncements } from '@/lib/login-announcements/reader'

/**
 * TASK-1963 — Novedades publicadas y vigentes del login. Pública (sin sesión), sin parámetros y cacheable: entrega
 * sólo campos de presentación. Es el mismo reader que usa la página `/login` (Full API Parity).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const announcements = await listActiveLoginAnnouncements()

  return NextResponse.json(
    { announcements },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  )
}
