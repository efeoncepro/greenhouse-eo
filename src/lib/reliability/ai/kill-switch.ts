const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

/**
 * TASK-638 — Kill switch para el AI Observer.
 *
 * Convención del repo: opt-in. Default OFF para que la IA NO corra hasta
 * activación explícita en producción. Esto garantiza costo cero hasta que
 * un admin habilite la observación.
 *
 * Para activar: setear `RELIABILITY_AI_OBSERVER_ENABLED=true` en envs del
 * Cloud Run service `ops-worker` (vía deploy.sh o gcloud).
 */
export const isReliabilityAiObserverEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => {
  const raw = env.RELIABILITY_AI_OBSERVER_ENABLED

  if (!raw) return false

  return TRUE_VALUES.has(raw.trim().toLowerCase())
}
