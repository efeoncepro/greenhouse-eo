/**
 * TASK-1719 Slices 4/5 — configuración del fan-in de comunicación por cambio de etapa.
 *
 * Contrato del flag (idéntico al de `HIRING_LIFECYCLE_EMAILS_ENABLED`): constante con el
 * nombre + predicado puro con `env` inyectable, comparación estricta contra `'true'` para
 * que ausencia o basura signifiquen OFF.
 *
 * ⚠️ Este flag lo lee SÓLO el `ops-worker` (Cloud Run). Prenderlo en Vercel no hace nada:
 * el consumer reactivo no corre ahí. Su SoT es `services/ops-worker/deploy.sh`, cuyo
 * `--set-env-vars` es destructivo — un flip out-of-band con `--update-env-vars` sobrevive
 * hasta el próximo deploy y después desaparece EN SILENCIO.
 *
 * Qué gobierna y qué NO: con el flag OFF el consumer sigue existiendo y sigue mandando el
 * correo genérico de avance de etapa igual que antes. El flag decide únicamente si además
 * se asigna el test. Por eso apagarlo nunca deja al candidato sin comunicación.
 */
export const HIRING_STAGE_TEST_ASSIGNMENT_FLAG = 'HIRING_STAGE_TEST_ASSIGNMENT_ENABLED'

export const isHiringStageTestAssignmentEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env[HIRING_STAGE_TEST_ASSIGNMENT_FLAG]?.trim().toLowerCase() === 'true'

/**
 * Horizonte de accionabilidad de un cambio de etapa, en horas.
 *
 * Un `stage_changed` más viejo que esto no se comunica ni dispara test: decirle a alguien
 * "avanzaste a Entrevista" por un movimiento de hace días, o mandarle una prueba por una
 * etapa que cruzó la semana pasada, es peor que no hacer nada. Esos casos van a la cola
 * humana (`resolveApplicationsMissedTriggerAwaitingHuman`), que no ejecuta nada sola.
 *
 * Además cierra un riesgo de rollout concreto: la Phase A del consumer reactivo NO tiene
 * ventana temporal — un `handler` key nuevo barre TODO el histórico del event type en su
 * primera corrida. Sin este horizonte, registrar este consumer dispararía comunicaciones
 * por eventos de hace meses. El horizonte no es un parche de migración: es la regla de
 * dominio correcta, y de paso hace segura la primera corrida.
 */
export const STAGE_CHANGE_ACTIONABLE_WINDOW_HOURS = 24
