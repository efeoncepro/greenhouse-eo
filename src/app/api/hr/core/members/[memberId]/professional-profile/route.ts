import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { getMemberSkillsDirect, StaffingValidationError } from '@/lib/agency/skills-staffing'
import { getMemberCertifications, CertificationValidationError } from '@/lib/hr-core/certifications'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

import type { MemberSkill } from '@/types/agency-skills'
import type { MemberCertification, ProfessionalProfile } from '@/types/certifications'

export const dynamic = 'force-dynamic'

const EXPIRING_SOON_DAYS = 90

type MemberProfileRow = {
  member_id: string
  display_name: string | null
  about_me: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  twitter_url: string | null
  threads_url: string | null
  behance_url: string | null
  github_url: string | null
  dribbble_url: string | null
  phone: string | null
  location_city: string | null
  location_country: string | null
}

const isExpiringSoon = (expiryDate: string | null): boolean => {
  if (!expiryDate) return false

  const expiry = new Date(expiryDate)
  const now = new Date()

  if (expiry <= now) return false

  const diffMs = expiry.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  return diffDays <= EXPIRING_SOON_DAYS
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params

    const rows = await query<MemberProfileRow>(
      `
        SELECT
          member_id, display_name, about_me,
          linkedin_url, portfolio_url, twitter_url, threads_url,
          behance_url, github_url, dribbble_url,
          phone, location_city, location_country
        FROM greenhouse_core.members
        WHERE member_id = $1
      `,
      [memberId]
    )

    const member = rows[0]

    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    }

    const [skills, certifications]: [MemberSkill[], MemberCertification[]] = await Promise.all([
      getMemberSkillsDirect(memberId),
      getMemberCertifications(memberId)
    ])

    const verifiedSkillCount = skills.filter(s => s.verifiedBy !== null).length
    const verifiedCertCount = certifications.filter(c => c.verificationStatus === 'verified').length
    const activeCertCount = certifications.filter(c => !c.isExpired).length
    const expiringSoonCount = certifications.filter(c => isExpiringSoon(c.expiryDate)).length

    const profile: ProfessionalProfile = {
      memberId: member.member_id,
      displayName: member.display_name ?? '',
      aboutMe: member.about_me ?? null,
      professionalLinks: {
        linkedinUrl: member.linkedin_url ?? null,
        portfolioUrl: member.portfolio_url ?? null,
        twitterUrl: member.twitter_url ?? null,
        threadsUrl: member.threads_url ?? null,
        behanceUrl: member.behance_url ?? null,
        githubUrl: member.github_url ?? null,
        dribbbleUrl: member.dribbble_url ?? null
      },
      contact: {
        phone: member.phone ?? null,
        locationCity: member.location_city ?? null,
        locationCountry: member.location_country ?? null
      },
      skills,
      certifications,
      summary: {
        skillCount: skills.length,
        certificationCount: certifications.length,
        verifiedSkillCount,
        verifiedCertCount,
        activeCertCount,
        expiringSoonCount
      }
    }

    return NextResponse.json(profile)
  } catch (error) {
    if (error instanceof StaffingValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    if (error instanceof CertificationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('[hr/core/members/professional-profile] GET error:', error)

    return NextResponse.json({ error: 'Unable to load professional profile.' }, { status: 500 })
  }
}
