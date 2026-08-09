/**
 * TASK-1307 — Registro curado de updates CONFIRMADOS del algoritmo de Google.
 *
 * Alimenta los bands de contexto del chart de evolución: una caída colectiva de
 * posiciones durante una ventana de update tiene una explicación distinta a una caída
 * propia del sitio, y el chart debe permitir distinguirlas.
 *
 * ⚠️ REGLAS DE ESTE REGISTRO:
 * - SOLO updates **confirmados por Google** (Search Status Dashboard / anuncios oficiales
 *   recogidos por prensa especializada). Jamás "algo se movió" de terceros — pintar un
 *   rumor como banda en el gráfico de un cliente es fabricar contexto.
 * - Cada entrada lleva la fuente de verificación. Al agregar una, verificar con búsqueda
 *   web (skill `seo-aeo`: los hechos volátiles se reverifican, no se recuerdan).
 * - Mantenimiento MANUAL y deliberado (as-of en cada tanda). Automatizarlo contra un feed
 *   de terceros es follow-up declarado en TASK-1307, no un TODO implícito.
 * - Sólo updates que afectan búsqueda ORGÁNICA (core/spam). Los específicos de Discover
 *   no entran: este chart mide rank orgánico.
 */

export interface AlgorithmUpdateWindow {
  /** Inicio del rollout (YYYY-MM-DD). */
  from: string
  /** Fin CONFIRMADO del rollout. */
  to: string
  /** Nombre corto para la etiqueta del band. */
  label: string
}

/** Verificados 2026-08-07 (Search Engine Journal / Search Engine Roundtable). */
export const CONFIRMED_ALGORITHM_UPDATES: readonly AlgorithmUpdateWindow[] = [
  { from: '2026-03-24', to: '2026-03-25', label: 'Google Spam Update (mar 2026)' },
  { from: '2026-03-27', to: '2026-04-08', label: 'Google Core Update (mar 2026)' },
  { from: '2026-05-21', to: '2026-06-02', label: 'Google Core Update (may 2026)' }
]

/** Ventanas que intersectan un rango de fechas (para pasar al chart solo lo visible). */
export const algorithmUpdatesInRange = (from: string, to: string): AlgorithmUpdateWindow[] =>
  CONFIRMED_ALGORITHM_UPDATES.filter(update => update.to >= from && update.from <= to)
