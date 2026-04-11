import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ProfessionalLinksRow extends Record<string, unknown> {
  linkedin_url: string | null
  portfolio_url: string | null
  twitter_url: string | null
  threads_url: string | null
  behance_url: string | null
  github_url: string | null
  dribbble_url: string | null
  about_me: string | null
  biography: string | null
  phone: string | null
  location_city: string | null
  location_country: string | null
}

const toResponse = (row: ProfessionalLinksRow) => ({
  links: {
    linkedinUrl: row.linkedin_url ?? null,
    portfolioUrl: row.portfolio_url ?? null,
    twitterUrl: row.twitter_url ?? null,
    threadsUrl: row.threads_url ?? null,
    behanceUrl: row.behance_url ?? null,
    githubUrl: row.github_url ?? null,
    dribbbleUrl: row.dribbble_url ?? null
  },
  aboutMe: row.about_me ?? null,
  contact: {
    phone: row.phone ?? null,
    locationCity: row.location_city ?? null,
    locationCountry: row.location_country ?? null
  }
})

const isValidUrl = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return false

  try {
    new URL(value)

    return true
  } catch {
    return false
  }
}

export async function GET() {
  const { memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rows = await query<ProfessionalLinksRow>(
      `SELECT
        linkedin_url, portfolio_url, twitter_url, threads_url,
        behance_url, github_url, dribbble_url,
        about_me, biography, phone, location_city, location_country
      FROM greenhouse_core.members
      WHERE member_id = $1`,
      [memberId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 })
    }

    return NextResponse.json(toResponse(rows[0]))
  } catch (error) {
    console.error('GET /api/my/professional-links failed:', error)

    return NextResponse.json({ error: 'Error interno al obtener links profesionales.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { memberId, errorResponse } = await requireMyTenantContext()

  if (!memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const updates: string[] = []
    const params: unknown[] = [memberId]
    let idx = 2

    // Link fields — validate URLs
    const linkFieldMap: Record<string, string> = {
      linkedinUrl: 'linkedin_url',
      portfolioUrl: 'portfolio_url',
      twitterUrl: 'twitter_url',
      threadsUrl: 'threads_url',
      behanceUrl: 'behance_url',
      githubUrl: 'github_url',
      dribbbleUrl: 'dribbble_url'
    }

    for (const [camelKey, dbColumn] of Object.entries(linkFieldMap)) {
      if (body[camelKey] !== undefined) {
        const value = body[camelKey] === '' ? null : body[camelKey]

        if (value !== null && !isValidUrl(value)) {
          return NextResponse.json(
            { error: `${camelKey} no es una URL valida.` },
            { status: 400 }
          )
        }

        updates.push(`${dbColumn} = $${idx++}`)
        params.push(value ?? null)
      }
    }

    // about_me — free text
    if (body.aboutMe !== undefined) {
      const value = typeof body.aboutMe === 'string' ? body.aboutMe.trim() || null : null

      updates.push(`about_me = $${idx++}`)
      params.push(value)
    }

    // Contact fields
    if (body.phone !== undefined) {
      const value = typeof body.phone === 'string' ? body.phone.trim() || null : null

      updates.push(`phone = $${idx++}`)
      params.push(value)
    }

    if (body.locationCity !== undefined) {
      const value = typeof body.locationCity === 'string' ? body.locationCity.trim() || null : null

      updates.push(`location_city = $${idx++}`)
      params.push(value)
    }

    if (body.locationCountry !== undefined) {
      const value = typeof body.locationCountry === 'string' ? body.locationCountry.trim() || null : null

      updates.push(`location_country = $${idx++}`)
      params.push(value)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')

    const rows = await query<ProfessionalLinksRow>(
      `UPDATE greenhouse_core.members
      SET ${updates.join(', ')}
      WHERE member_id = $1
      RETURNING
        linkedin_url, portfolio_url, twitter_url, threads_url,
        behance_url, github_url, dribbble_url,
        about_me, biography, phone, location_city, location_country`,
      params
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 })
    }

    return NextResponse.json(toResponse(rows[0]))
  } catch (error) {
    console.error('PATCH /api/my/professional-links failed:', error)

    return NextResponse.json({ error: 'Error interno al actualizar links profesionales.' }, { status: 500 })
  }
}
