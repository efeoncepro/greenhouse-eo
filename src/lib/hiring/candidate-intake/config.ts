// TASK-1736 Slice 2 — Flag del writer nuevo de identidad del candidato.
//
// `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` (default OFF, Vercel-only por ahora) gatea la
// materialización de la capa de evidencia application-scoped + la reconciliación de display (D3).
// OFF ⇒ el intake se comporta EXACTAMENTE como antes de Slice 2: cero filas nuevas, cero
// reconciliación. El flag por sí solo NUNCA autoriza el backfill histórico (ADR D4 — requiere
// además allowlist vigente; eso es Slice 3). Registrado en
// docs/operations/FEATURE_FLAG_STATE_LEDGER.md en el mismo PR que lo declara (read-sites: este
// archivo, consumido por `submit-application.ts` y por la señal de reliability
// `hiring.candidate_identity.evidence_coverage_gap` — Slice 4, Vercel en ambos casos).

export const isCandidateIdentityNormalizationEnabled = (): boolean =>
  process.env.HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED === 'true'
