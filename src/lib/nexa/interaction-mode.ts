/**
 * TASK-1079 — Nexa interaction mode (SSOT puro, client-safe).
 *
 * El usuario elige cómo conversar con Nexa: `expandible` (panel ampliable con
 * historial) o `lane` (sidecar full-height). Ambas modalidades comparten runtime
 * (`useNexaPersistentRuntime`), persistencia e historial (`nexa_threads`) y selector
 * de modelo — cero lógica de chat duplicada.
 *
 * Delta 2026-08-05 — el modo `dock` ("Compacto") se retiró: era el panel efímero
 * anterior a TASK-1078 (runtime local, sin historial persistido) que sobrevivió como
 * opción del selector después de que el panel ampliable pasó a ser el comportamiento
 * base. Ya no existe como modo; una preferencia `dock` persistida se coacciona a
 * `expandible` (ver `coerceNexaInteractionMode`), así que no hay perfil que quede
 * apuntando a un modo inexistente.
 *
 * La preferencia persiste en `greenhouse_core.client_users.nexa_interaction_mode`
 * (self-preference per usuario; NO env var ni home_rollout_flags operator-facing).
 * Este módulo es PURO: coerce + gating por flags de disponibilidad. El reader
 * server-side vive en `interaction-mode.server.ts`; el provider client en
 * `nexa-interaction-mode-context.tsx`.
 */

export type NexaInteractionMode = 'expandible' | 'lane'

export const NEXA_INTERACTION_MODES: readonly NexaInteractionMode[] = ['expandible', 'lane'] as const

export const isNexaInteractionMode = (value: unknown): value is NexaInteractionMode =>
  value === 'expandible' || value === 'lane'

/**
 * Disponibilidad de cada modo según flags de plataforma. `expandible` es el piso
 * incondicional (no se gatea: es el comportamiento base del flotante desde que
 * TASK-1078 completó su rollout). Solo el lane C (reflow del contenido) sigue detrás
 * de su flag (`NEXA_INTERACTION_LANE_ENABLED`, TASK-1079).
 */
export interface NexaInteractionModeAvailability {
  laneEnabled: boolean
}

/**
 * Default cuando el usuario NO tiene preferencia (NULL): el panel ampliable. Nunca
 * devuelve `lane` por default (es opt-in explícito).
 */
export const defaultNexaInteractionMode = (): NexaInteractionMode => 'expandible'

/**
 * Resuelve la preferencia cruda a un modo efectivo, gateada por disponibilidad
 * (default-safe): un modo no disponible degrada al fallback, nunca rompe. El valor
 * legacy `dock` (modo retirado) cae acá y degrada a `expandible`.
 */
export const coerceNexaInteractionMode = (
  raw: string | null | undefined,
  availability: NexaInteractionModeAvailability
): NexaInteractionMode => {
  if (raw === 'lane') return availability.laneEnabled ? 'lane' : defaultNexaInteractionMode()

  // `expandible`, `dock` legacy, NULL o valor inválido → el piso incondicional.
  return defaultNexaInteractionMode()
}

/**
 * Modos ofrecibles en el selector (un modo no disponible no se ofrece). `expandible`
 * siempre disponible (es el fallback universal).
 */
export const availableNexaInteractionModes = (
  availability: NexaInteractionModeAvailability
): NexaInteractionMode[] => {
  const modes: NexaInteractionMode[] = ['expandible']

  if (availability.laneEnabled) modes.push('lane')

  return modes
}
