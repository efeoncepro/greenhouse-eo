export interface AssessmentClockAnchor {
  databaseNowMs: number
  monotonicStartedMs: number
}

/** Proyecta el reloj autoritativo de DB usando sólo tiempo monotónico transcurrido en el cliente. */
export const projectAssessmentDatabaseNow = (
  anchor: AssessmentClockAnchor,
  monotonicNowMs: number,
): number => anchor.databaseNowMs + Math.max(0, monotonicNowMs - anchor.monotonicStartedMs)

export const resolveTimerTotalSeconds = (
  phase: 'answering' | 'submit_grace' | 'closed',
  timing: { hasTimeLimit: boolean; effectiveMinutes: number },
): number => Math.max(1,
  phase === 'submit_grace'
    ? 30 * 60
    : timing.hasTimeLimit
      ? timing.effectiveMinutes * 60
      : 24 * 60 * 60)
