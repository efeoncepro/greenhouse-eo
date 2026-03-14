import 'server-only'

import { NextResponse } from 'next/server'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type { TeamContactChannel, TeamIdentityConfidence, TeamIdentityProvider, TeamMemberProfile, TeamRoleCategory } from '@/types/team'

export class PeopleValidationError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'PeopleValidationError'
    this.statusCode = statusCode
    this.details = details
  }
}

export const peopleRoleCodes = ['efeonce_admin', 'efeonce_operations', 'hr_payroll'] as const

export const toPeopleErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof PeopleValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null
      },
      { status: error.statusCode }
    )
  }

  console.error(fallbackMessage, error)

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

export const runPeopleQuery = async <T>(query: string, params: Record<string, unknown> = {}) => {
  const [rows] = await getBigQueryClient().query({
    query,
    params
  })

  return rows as T[]
}

const isMissingBigQueryEntityError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : ''

  return code === '404' || /not found: table/i.test(message) || /dataset .* was not found/i.test(message)
}

export const getPeopleTableColumns = async (dataset: string, tableName: string) => {
  const projectId = getBigQueryProjectId()

  try {
    const rows = await runPeopleQuery<{ column_name: string | null }>(
      `
        SELECT column_name
        FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = @tableName
      `,
      { tableName }
    )

    return new Set(rows.map(row => row.column_name || '').filter(Boolean))
  } catch (error) {
    if (isMissingBigQueryEntityError(error)) {
      return new Set<string>()
    }

    throw error
  }
}

export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

export const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

export const toDateString = (value: { value?: string } | string | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)

  return typeof value.value === 'string' ? value.value.slice(0, 10) : null
}

export const roundToTenths = (value: number) => Math.round(value * 10) / 10

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export const toStringArray = (value: string[] | null | undefined) =>
  Array.isArray(value)
    ? value
        .map(item => String(item || '').trim())
        .filter(Boolean)
    : []

export const normalizeMatchValue = (value: string | null | undefined) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\|/g, ' ')
    .replace(/[^a-z0-9@._\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const inferRoleCategory = (value: string | null | undefined): TeamRoleCategory => {
  const normalized = normalizeMatchValue(value)

  if (normalized.includes('account')) return 'account'
  if (normalized.includes('operat')) return 'operations'
  if (normalized.includes('strateg')) return 'strategy'
  if (normalized.includes('design') || normalized.includes('creative')) return 'design'
  if (normalized.includes('develop') || normalized.includes('web') || normalized.includes('tech')) return 'development'
  if (normalized.includes('media')) return 'media'

  return 'unknown'
}

export const toContactChannel = (value: string | null | undefined): TeamContactChannel => {
  if (value === 'slack' || value === 'email') {
    return value
  }

  return 'teams'
}

export const mapIdentityProvider = (sourceSystem: string | null | undefined): TeamIdentityProvider | null => {
  const normalized = normalizeMatchValue(sourceSystem)

  if (normalized === 'notion') return 'notion'
  if (normalized === 'hubspot_crm' || normalized === 'hubspot') return 'hubspot'

  if (normalized === 'azure_ad' || normalized === 'microsoft' || normalized === 'microsoft_sso') {
    return 'microsoft'
  }

  if (normalized === 'google' || normalized === 'google_oauth' || normalized === 'google_workspace') {
    return 'google'
  }

  if (normalized === 'deel' || normalized === 'deel_hr' || normalized === 'deel_com') {
    return 'deel'
  }

  return null
}

export const getIdentityConfidence = ({
  providers,
  identityProfileId,
  emailAliases
}: {
  providers: TeamIdentityProvider[]
  identityProfileId: string | null
  emailAliases: string[]
}): TeamIdentityConfidence => {
  if (identityProfileId && (providers.length >= 2 || (providers.length >= 1 && emailAliases.length > 0))) {
    return 'strong'
  }

  if (identityProfileId || providers.length >= 1 || emailAliases.length > 0) {
    return 'partial'
  }

  return 'basic'
}

const getMonthDiffFromDate = (value: string | null) => {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const now = new Date()
  let months = (now.getUTCFullYear() - date.getUTCFullYear()) * 12 + (now.getUTCMonth() - date.getUTCMonth())

  if (now.getUTCDate() < date.getUTCDate()) {
    months -= 1
  }

  return Math.max(0, months)
}

const getAgeYearsFromDate = (value: string | null) => {
  const months = getMonthDiffFromDate(value)

  return months === null ? null : Math.floor(months / 12)
}

const getProfileCompletenessPercent = (profile: Omit<TeamMemberProfile, 'profileCompletenessPercent'>) => {
  const checks = [
    profile.firstName,
    profile.lastName,
    profile.orgRoleId,
    profile.professionId,
    profile.seniorityLevel,
    profile.phone,
    profile.locationCity,
    profile.locationCountry,
    profile.timeZone,
    profile.yearsExperience,
    profile.efeonceStartDate,
    profile.teamsUserId || profile.slackUserId,
    profile.languages.length > 0 ? 'languages' : null
  ]

  const populatedCount = checks.filter(value => {
    if (typeof value === 'number') {
      return Number.isFinite(value)
    }

    return Boolean(value)
  }).length

  return clampPercent((populatedCount / checks.length) * 100)
}

export const createTeamMemberProfile = (overrides: Partial<Omit<TeamMemberProfile, 'profileCompletenessPercent'>> = {}): TeamMemberProfile => {
  const baseProfile: Omit<TeamMemberProfile, 'profileCompletenessPercent'> = {
    firstName: null,
    lastName: null,
    preferredName: null,
    legalName: null,
    orgRoleId: null,
    orgRoleName: null,
    professionId: null,
    professionName: null,
    seniorityLevel: null,
    employmentType: null,
    ageYears: null,
    phone: null,
    teamsUserId: null,
    slackUserId: null,
    locationCity: null,
    locationCountry: null,
    timeZone: null,
    yearsExperience: null,
    efeonceStartDate: null,
    tenureEfeonceMonths: null,
    tenureClientMonths: null,
    biography: null,
    languages: []
  }

  const profile = {
    ...baseProfile,
    ...overrides
  }

  return {
    ...profile,
    ageYears: profile.ageYears ?? null,
    profileCompletenessPercent: getProfileCompletenessPercent(profile)
  }
}

export const enrichProfile = ({
  firstName,
  lastName,
  preferredName,
  legalName,
  orgRoleId,
  orgRoleName,
  professionId,
  professionName,
  seniorityLevel,
  employmentType,
  birthDate,
  phone,
  teamsUserId,
  slackUserId,
  locationCity,
  locationCountry,
  timeZone,
  yearsExperience,
  efeonceStartDate,
  biography,
  languages
}: {
  firstName?: string | null
  lastName?: string | null
  preferredName?: string | null
  legalName?: string | null
  orgRoleId?: string | null
  orgRoleName?: string | null
  professionId?: string | null
  professionName?: string | null
  seniorityLevel?: string | null
  employmentType?: string | null
  birthDate?: string | null
  phone?: string | null
  teamsUserId?: string | null
  slackUserId?: string | null
  locationCity?: string | null
  locationCountry?: string | null
  timeZone?: string | null
  yearsExperience?: number | null
  efeonceStartDate?: string | null
  biography?: string | null
  languages?: string[]
}) =>
  createTeamMemberProfile({
    firstName: firstName || null,
    lastName: lastName || null,
    preferredName: preferredName || null,
    legalName: legalName || null,
    orgRoleId: orgRoleId || null,
    orgRoleName: orgRoleName || null,
    professionId: professionId || null,
    professionName: professionName || null,
    seniorityLevel: seniorityLevel || null,
    employmentType: employmentType || null,
    ageYears: getAgeYearsFromDate(birthDate || null),
    phone: phone || null,
    teamsUserId: teamsUserId || null,
    slackUserId: slackUserId || null,
    locationCity: locationCity || null,
    locationCountry: locationCountry || null,
    timeZone: timeZone || null,
    yearsExperience: yearsExperience ?? null,
    efeonceStartDate: efeonceStartDate || null,
    tenureEfeonceMonths: getMonthDiffFromDate(efeonceStartDate || null),
    biography: biography || null,
    languages: toStringArray(languages)
  })

export const pickMemberEmails = ({
  email,
  emailAliases
}: {
  email: string | null
  emailAliases: string[]
}) => {
  const normalizedPrimary = (email || '').trim() || null
  const aliases = toStringArray(emailAliases)

  const allCandidates = [normalizedPrimary, ...aliases].filter(Boolean) as string[]
  const internalEmail = allCandidates.find(candidate => candidate.toLowerCase().endsWith('@efeonce.org')) || null

  const publicEmail =
    allCandidates.find(candidate => candidate.toLowerCase().endsWith('@efeoncepro.com')) ||
    normalizedPrimary ||
    aliases[0] ||
    ''

  return {
    publicEmail,
    internalEmail
  }
}
