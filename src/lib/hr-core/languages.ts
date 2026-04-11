import 'server-only'

import { query } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { MemberLanguage, LanguageProficiencyLevel, LanguageVisibility } from '@/types/talent-taxonomy'

type LanguageRow = {
  member_id: string
  language_code: string
  language_name: string
  proficiency_level: string
  visibility: string
}

class LanguageValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'LanguageValidationError'
    this.statusCode = statusCode
  }
}

const mapRow = (row: LanguageRow): MemberLanguage => ({
  memberId: row.member_id,
  languageCode: row.language_code,
  languageName: row.language_name,
  proficiencyLevel: (['basic', 'conversational', 'professional', 'fluent', 'native'].includes(row.proficiency_level)
    ? row.proficiency_level
    : 'professional') as LanguageProficiencyLevel,
  visibility: row.visibility === 'client_visible' ? 'client_visible' : 'internal'
})

export const getMemberLanguages = async (memberId: string): Promise<MemberLanguage[]> => {
  const rows = await query<LanguageRow>(
    `
      SELECT member_id, language_code, language_name, proficiency_level, visibility
      FROM greenhouse_core.member_languages
      WHERE member_id = $1
      ORDER BY
        CASE proficiency_level
          WHEN 'native' THEN 1
          WHEN 'fluent' THEN 2
          WHEN 'professional' THEN 3
          WHEN 'conversational' THEN 4
          ELSE 5
        END ASC,
        language_name ASC
    `,
    [memberId]
  )

  return rows.map(mapRow)
}

export const upsertMemberLanguage = async ({
  memberId,
  input,
  actorUserId
}: {
  memberId: string
  input: { languageCode: string; languageName: string; proficiencyLevel?: string; visibility?: string }
  actorUserId?: string | null
}): Promise<MemberLanguage[]> => {
  const code = String(input.languageCode || '').trim().toLowerCase()
  const name = String(input.languageName || '').trim()

  if (!code || code.length !== 2) throw new LanguageValidationError('languageCode debe ser un código ISO 639-1 de 2 letras.')
  if (!name) throw new LanguageValidationError('languageName es requerido.')

  const proficiency: LanguageProficiencyLevel = (['basic', 'conversational', 'professional', 'fluent', 'native'] as const)
    .includes(input.proficiencyLevel as LanguageProficiencyLevel)
    ? (input.proficiencyLevel as LanguageProficiencyLevel)
    : 'professional'

  const visibility: LanguageVisibility = input.visibility === 'client_visible' ? 'client_visible' : 'internal'

  await query(
    `
      INSERT INTO greenhouse_core.member_languages (
        member_id, language_code, language_name, proficiency_level, visibility,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (member_id, language_code) DO UPDATE SET
        language_name = EXCLUDED.language_name,
        proficiency_level = EXCLUDED.proficiency_level,
        visibility = EXCLUDED.visibility,
        updated_at = CURRENT_TIMESTAMP
    `,
    [memberId, code, name, proficiency, visibility]
  )

  await publishOutboxEvent({
    aggregateType: 'memberLanguage',
    aggregateId: `${memberId}:${code}`,
    eventType: 'memberLanguageUpserted',
    payload: { memberId, languageCode: code, proficiencyLevel: proficiency, actorUserId }
  })

  return getMemberLanguages(memberId)
}

export const removeMemberLanguage = async ({
  memberId,
  languageCode,
  actorUserId
}: {
  memberId: string
  languageCode: string
  actorUserId?: string | null
}): Promise<MemberLanguage[]> => {
  const code = String(languageCode || '').trim().toLowerCase()

  await query(
    `DELETE FROM greenhouse_core.member_languages WHERE member_id = $1 AND language_code = $2`,
    [memberId, code]
  )

  await publishOutboxEvent({
    aggregateType: 'memberLanguage',
    aggregateId: `${memberId}:${code}`,
    eventType: 'memberLanguageDeleted',
    payload: { memberId, languageCode: code, actorUserId }
  })

  return getMemberLanguages(memberId)
}

export { LanguageValidationError }
