/**
 * Canonical role code constants.
 * Single source of truth — use these instead of string literals.
 */
export const ROLE_CODES = {
  EFEONCE_ADMIN: 'efeonce_admin',
  EMPLOYEE: 'employee',
  FINANCE_MANAGER: 'finance_manager',
  FINANCE_ADMIN: 'finance_admin',
  FINANCE_ANALYST: 'finance_analyst',
  HR_PAYROLL: 'hr_payroll',
  HR_MANAGER: 'hr_manager',
  EFEONCE_OPERATIONS: 'efeonce_operations',
  EFEONCE_ACCOUNT: 'efeonce_account',
  PEOPLE_VIEWER: 'people_viewer',
  AI_TOOLING_ADMIN: 'ai_tooling_admin',
  COLLABORATOR: 'collaborator',
  CLIENT_EXECUTIVE: 'client_executive',
  CLIENT_MANAGER: 'client_manager',
  CLIENT_SPECIALIST: 'client_specialist'
} as const

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES]

/** Priority order for primary role selection (index 0 = highest). */
export const ROLE_PRIORITY: RoleCode[] = [
  ROLE_CODES.EFEONCE_ADMIN,
  ROLE_CODES.EMPLOYEE,
  ROLE_CODES.FINANCE_MANAGER,
  ROLE_CODES.FINANCE_ADMIN,
  ROLE_CODES.FINANCE_ANALYST,
  ROLE_CODES.HR_PAYROLL,
  ROLE_CODES.HR_MANAGER,
  ROLE_CODES.EFEONCE_OPERATIONS,
  ROLE_CODES.EFEONCE_ACCOUNT,
  ROLE_CODES.PEOPLE_VIEWER,
  ROLE_CODES.AI_TOOLING_ADMIN,
  ROLE_CODES.COLLABORATOR,
  ROLE_CODES.CLIENT_EXECUTIVE,
  ROLE_CODES.CLIENT_MANAGER,
  ROLE_CODES.CLIENT_SPECIALIST
]

/** Type guard: check if a string is a known role code. */
export const isRoleCode = (value: string): value is RoleCode =>
  (Object.values(ROLE_CODES) as string[]).includes(value)
