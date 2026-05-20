import 'server-only'

/**
 * TASK-900 — Materializer hardening flags canonical (3 ortogonales).
 *
 * 3 flags graduados, todos default OFF. Cutover progresivo en staging
 * shadow >= 7d antes de flip producción:
 *   1. MERGE_PATTERN_ENABLED  → MERGE atomic vs DELETE+INSERT legacy
 *   2. FRESHNESS_GATE_ENABLED → skip preemptivo cuando upstream degradado
 *   3. INCREMENTAL_DELTA_ENABLED → REQUIRES MERGE_PATTERN_ENABLED
 *
 * Hard rule canonical (arch-architect verdict): activar INCREMENTAL_DELTA
 * sin MERGE_PATTERN throw runtime — delta filter no tiene sentido sobre
 * DELETE+INSERT (que recompute siempre full period).
 *
 * Default OFF garantiza zero behavioral change post-merge: el cron sigue
 * con legacy DELETE+INSERT bit-for-bit hasta que operador active
 * explícitamente los flags.
 */

export const isMergePatternEnabled = (): boolean =>
  process.env.ICO_MATERIALIZER_MERGE_PATTERN_ENABLED === 'true'

export const isIncrementalDeltaEnabled = (): boolean =>
  process.env.ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED === 'true'

export const assertMaterializerFlagCoherence = (): void => {
  if (isIncrementalDeltaEnabled() && !isMergePatternEnabled()) {
    throw new Error(
      'incremental_delta_requires_merge_pattern: ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED=true requires ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=true. Activate MERGE_PATTERN first or disable INCREMENTAL_DELTA.'
    )
  }
}
