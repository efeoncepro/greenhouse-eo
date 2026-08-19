import 'server-only'

/**
 * TASK-1739 Slice 3 — Flag del filtro de datos sintéticos en los readers operativos.
 *
 * `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` (default OFF, **Vercel-only**) gatea ÚNICAMENTE el filtro
 * del desk y del talent pool. OFF ⇒ los readers se comportan exactamente como antes.
 *
 * Qué NO gatea, a propósito:
 * - **La exclusión del gold set** (`scripts/hiring/build-gold-set-sample.ts`): es la corrección de un
 *   defecto que puede contaminar la calibración de la IA. No se le da un interruptor para volver al
 *   estado roto.
 * - **Los commands de marcado y purga**: su puerta es capability + allowlist humana. Un flag
 *   encendido jamás autoriza un backfill.
 * - **La guarda de publicación** (`publishOpening`): una vacante no real no se publica nunca, con
 *   flag o sin flag.
 *
 * Ningún Cloud Run lo lee: la señal de reliability cuenta filas MARCADAS, no filas filtradas, así que
 * no depende de este flag. Registrado en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo
 * PR que lo declara.
 */
export const isHiringSyntheticDataFilterEnabled = (): boolean =>
  process.env.HIRING_SYNTHETIC_DATA_FILTER_ENABLED === 'true'
