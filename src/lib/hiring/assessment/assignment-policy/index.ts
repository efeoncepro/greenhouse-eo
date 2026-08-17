// TASK-1719 — Policy de assessment por HiringOpening + assignment gobernado.
// ADR: GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.
//
// Boundary: éstos son los ÚNICOS primitives de policy/assignment. UI, MCP y ops-worker los
// consumen; ninguno duplica la resolución de plantilla ni acepta `templateId` del caller.

export * from './store'
export * from './assignment-store'
export * from './readers'
export * from './commands'
export * from './assign'
export * from './proposal-digest'
export * from './proposal-store'
export * from './propose-assignment'
export * from './confirm-assignment'
export type * from '@/types/hiring-assessment-policy'
