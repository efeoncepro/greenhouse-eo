export const MEMBERSHIP_TYPES = [
  'team_member',
  'client_contact',
  'client_user',
  'contact',
  'billing',
  'contractor',
  'partner',
  'advisor'
] as const

export type MembershipType = (typeof MEMBERSHIP_TYPES)[number]

export const EFEONCE_ASSIGNMENT_MEMBERSHIP_TYPES = ['team_member'] as const

export const ORG_NATIVE_MEMBERSHIP_TYPES = [
  'client_contact',
  'client_user',
  'contact',
  'billing',
  'contractor',
  'partner',
  'advisor'
] as const

export const TEAM_MEMBER_MEMBERSHIP_TYPE: MembershipType = 'team_member'

export const isMembershipType = (value: string): value is MembershipType =>
  MEMBERSHIP_TYPES.includes(value as MembershipType)

export const isEfeonceAssignmentMembershipType = (value: string) =>
  EFEONCE_ASSIGNMENT_MEMBERSHIP_TYPES.includes(value as typeof EFEONCE_ASSIGNMENT_MEMBERSHIP_TYPES[number])

export const isOrgNativeMembershipType = (value: string) =>
  ORG_NATIVE_MEMBERSHIP_TYPES.includes(value as typeof ORG_NATIVE_MEMBERSHIP_TYPES[number])
