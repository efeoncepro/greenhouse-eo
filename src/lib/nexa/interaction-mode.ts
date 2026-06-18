/**
 * TASK-1079 — Nexa interaction mode (SSOT puro, client-safe).
 *
 * El usuario elige cómo conversar con Nexa: `dock` (compacto A), `expandible`
 * (panel B) o `lane` (sidecar full-height C). Las 3 modalidades comparten runtime
 * (`useNexaPersistentRuntime`), persistencia e historial (`nexa_threads`) y selector
 * de modelo — cero lógica de chat duplicada.
 *
 * La preferencia persiste en `greenhouse_core.client_users.nexa_interaction_mode`
 * (self-preference per usuario; NO env var ni home_rollout_flags operator-facing).
 * Este módulo es PURO: coerce + gating por flags de disponibilidad. El reader
 * server-side vive en `interaction-mode.server.ts`; el provider client en
 * `nexa-interaction-mode-context.tsx`.
 */

export type NexaInteractionMode = 'dock' | 'expandible' | 'lane'

export const NEXA_INTERACTION_MODES: readonly NexaInteractionMode[] = ['dock', 'expandible', 'lane'] as const

export const isNexaInteractionMode = (value: unknown): value is NexaInteractionMode =>
  value === 'dock' || value === 'expandible' || value === 'lane'

/**
 * Disponibilidad de cada modo según flags de plataforma:
 * - `expandableEnabled`: el panel B + el lane reusan el runtime persistente que ese
 *   flag habilita (`NEXA_FLOATING_EXPANDABLE_ENABLED`, TASK-1078).
 * - `laneEnabled`: el lane C (reflow del contenido) está detrás de su propio flag
 *   default-OFF (`NEXA_INTERACTION_LANE_ENABLED`, TASK-1079).
 */
export interface NexaInteractionModeAvailability {
  expandableEnabled: boolean
  laneEnabled: boolean
}

/**
 * Default cuando el usuario NO tiene preferencia (NULL). Preserva EXACTAMENTE el
 * comportamiento actual del flotante: con el flag expandible ON → panel B; con OFF →
 * dock compacto. Nunca devuelve `lane` por default (es opt-in explícito).
 */
export const defaultNexaInteractionMode = (availability: NexaInteractionModeAvailability): NexaInteractionMode =>
  availability.expandableEnabled ? 'expandible' : 'dock'

/**
 * Resuelve la preferencia cruda a un modo efectivo, gateado por disponibilidad
 * (default-safe): un modo no disponible degrada al fallback, nunca rompe.
 */
export const coerceNexaInteractionMode = (
  raw: string | null | undefined,
  availability: NexaInteractionModeAvailability
): NexaInteractionMode => {
  if (raw === 'lane') return availability.laneEnabled ? 'lane' : defaultNexaInteractionMode(availability)
  if (raw === 'expandible') return availability.expandableEnabled ? 'expandible' : 'dock'
  if (raw === 'dock') return 'dock'

  // NULL / valor inválido → default que preserva el comportamiento vigente.
  return defaultNexaInteractionMode(availability)
}

/**
 * Modos ofrecibles en el selector (un modo no disponible no se ofrece). `dock`
 * siempre disponible (es el fallback universal).
 */
export const availableNexaInteractionModes = (
  availability: NexaInteractionModeAvailability
): NexaInteractionMode[] => {
  const modes: NexaInteractionMode[] = ['dock']

  if (availability.expandableEnabled) modes.push('expandible')
  if (availability.laneEnabled) modes.push('lane')

  return modes
}
