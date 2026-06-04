import { NextResponse } from 'next/server'

import { hash } from 'bcryptjs'

import { consumeToken, validateToken } from '@/lib/auth-tokens'
import { withPasswordChangeAuthorization } from '@/lib/identity/password-mutation'

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

    if (!record || record.token_type !== 'invite' || !record.user_id) {
      return NextResponse.json({ success: false, message: 'Enlace de invitación inválido o expirado.' }, { status: 400 })
    }

    const passwordHash = await hash(password, 12)
    const targetUserId = record.user_id

    await withPasswordChangeAuthorization(
      { userId: targetUserId, source: 'accept_invite' },
      async client => {
        // Al setear password_hash, auth_mode DEBE transicionar fuera de 'invited'
        // (invariant TASK-742: 'invited' ⇒ password_hash IS NULL). Si el usuario ya
        // tenía SSO (microsoft_oid) → 'both'; si no → 'credentials'. Ambos exigen
        // password_hash NOT NULL, que es justo lo que estamos seteando. Sin este
        // flip, la fila quedaría 'invited' + password_hash NOT NULL → viola el CHECK.
        await client.query(
          `UPDATE greenhouse_core.client_users
           SET password_hash = $1,
               password_hash_algorithm = 'bcrypt',
               status = 'active',
               auth_mode = CASE WHEN microsoft_oid IS NOT NULL THEN 'both' ELSE 'credentials' END,
               updated_at = now()
           WHERE user_id = $2`,
          [passwordHash, targetUserId]
        )
      }
    )

    await consumeToken(record.token_hash)

    return NextResponse.json({ success: true, message: 'Cuenta creada exitosamente.' })
  } catch (err) {
    console.error('[accept-invite] Error:', err)

    return NextResponse.json({ success: false, message: 'Error interno.' }, { status: 500 })
  }
}
