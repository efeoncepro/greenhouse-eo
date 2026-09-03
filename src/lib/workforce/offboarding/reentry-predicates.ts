/**
 * Shared SQL semantics for the executor and the drift detector. Arguments are
 * trusted SQL expressions from code, never operator input. Aliases are r/e.
 * End dates are the inclusive last day of the workforce episode.
 */
export const reentryRelationshipPredicate = ({
  profileIdSql,
  lastWorkingDaySql,
  asOfSql = 'CURRENT_DATE'
}: { profileIdSql: string; lastWorkingDaySql: string; asOfSql?: string }) => `
  r.profile_id = ${profileIdSql}
  AND r.relationship_type IN ('employee', 'contractor', 'executive')
  AND r.status = 'active'
  AND r.effective_from > ${lastWorkingDaySql}
  AND r.effective_from <= ${asOfSql}
  AND (r.effective_to IS NULL OR r.effective_to >= ${asOfSql})
`

export const reentryEngagementPredicate = ({
  profileIdSql,
  memberIdSql,
  lastWorkingDaySql,
  asOfSql = 'CURRENT_DATE'
}: { profileIdSql: string; memberIdSql: string; lastWorkingDaySql: string; asOfSql?: string }) => `
  (e.profile_id = ${profileIdSql} OR e.member_id = ${memberIdSql})
  AND e.status IN ('active', 'paused', 'ending')
  AND e.start_date > ${lastWorkingDaySql}
  AND e.start_date <= ${asOfSql}
  AND (e.end_date IS NULL OR e.end_date >= ${asOfSql})
`
