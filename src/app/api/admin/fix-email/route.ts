import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export async function POST(request: Request) {
  const { secret } = await request.json()

  // One-time migration endpoint — remove after use
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Update email
  const updated = await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.client_users
     SET email = $1, updated_at = now()
     WHERE LOWER(email) = $2
     RETURNING user_id, email, full_name`,
    ['jreyes@efeoncepro.com', 'julio.reyes@efeonce.org']
  )

  // Clean rate limit tokens from testing
  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_core.auth_tokens WHERE email LIKE '%reyes%'`,
    []
  )

  return NextResponse.json({ updated, message: 'Email updated, test tokens cleaned' })
}
