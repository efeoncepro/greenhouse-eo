import { NextResponse } from 'next/server'

import { hash } from 'bcryptjs'

import { consumeToken, validateToken } from '@/lib/auth-tokens'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password || typeof password !== 'string') {
      return NextResponse.json({ success: false, message: 'Datos incompletos.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 })
    }

    const record = await validateToken(token)

    if (!record || record.token_type !== 'invite') {
      return NextResponse.json({ success: false, message: 'Enlace de invitación inválido o expirado.' }, { status: 400 })
    }

    const passwordHash = await hash(password, 12)

    // Activate user account and set password
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.client_users
       SET password_hash = $1, password_hash_algorithm = 'bcrypt', status = 'active', updated_at = now()
       WHERE user_id = $2`,
      [passwordHash, record.user_id]
    )

    await consumeToken(record.token_hash)

    return NextResponse.json({ success: true, message: 'Cuenta creada exitosamente.' })
  } catch (err) {
    console.error('[accept-invite] Error:', err)

    return NextResponse.json({ success: false, message: 'Error interno.' }, { status: 500 })
  }
}
