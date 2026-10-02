/**
 * Binder `team` (TASK-1930, Slice 6).
 *
 * El equipo sólo puede venir de los hechos del roster real de TASK-1418 (quién trabaja en la cuenta, su rol y su
 * dedicación), con la foto resuelta por el allowlist `squad-person`. Esos hechos todavía no existen, así que el binder
 * no decide el roster ni elige caras: el slot queda sin ligar (`no-roster-facts`) y la lámina de equipo no compone.
 * Nunca una cara generada ni una persona que no está en la cuenta. Cuando TASK-1418 cierre, este binder consume sus
 * hechos sin recalcularlos.
 */

import { unbound, type Binder } from './shared'

export const teamBinder: Binder = () => unbound('no-roster-facts')
