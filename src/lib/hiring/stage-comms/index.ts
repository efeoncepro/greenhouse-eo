/**
 * TASK-1719 Slices 4/5 — fan-in de comunicación por cambio de etapa.
 *
 * Punto de entrada único del módulo. La projection reactiva consume `resolveStageChangeCandidateComms`;
 * nadie más debería decidir por su cuenta si un cambio de etapa comunica algo al candidato.
 */
export { HIRING_STAGE_TEST_ASSIGNMENT_FLAG, STAGE_CHANGE_ACTIONABLE_WINDOW_HOURS, isHiringStageTestAssignmentEnabled } from './config'
export { resolveStageChangeCandidateComms } from './decide'
