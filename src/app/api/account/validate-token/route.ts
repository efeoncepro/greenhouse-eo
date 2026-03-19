import { NextResponse } from 'next/server'

import { validateToken } from '@/lib/auth-tokens'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ valid: false, message: 'Token requerido.' })
    }

    const record = await validateToken(token)

    if (!record) {
      return NextResponse.json({ valid: false, message: 'Enlace inválido o expirado.' })
    }

    return NextResponse.json({ valid: true, tokenType: record.token_type })
  } catch {
    return NextResponse.json({ valid: false, message: 'Error al validar el enlace.' })
  }
}
