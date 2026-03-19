import { NextResponse } from 'next/server'

import { consumeToken, validateToken } from '@/lib/auth-tokens'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, message: 'Token requerido.' }, { status: 400 })
    }

    const record = await validateToken(token)

    if (!record || record.token_type !== 'verify') {
      return NextResponse.json({ success: false, message: 'Enlace de verificación inválido o expirado.' }, { status: 400 })
    }

    // Mark email as verified
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.client_users
       SET email_verified = true, updated_at = now()
       WHERE user_id = $1`,
      [record.user_id]
    )

    await consumeToken(record.token_hash)

    return NextResponse.json({ success: true, message: 'Email verificado.' })
  } catch (err) {
    console.error('[verify-email] Error:', err)

    return NextResponse.json({ success: false, message: 'Error interno.' }, { status: 500 })
  }
}
