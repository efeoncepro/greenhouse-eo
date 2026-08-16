# Runbook — Rollout de la identidad del intake de candidatos (canary → prod → remediación)

> **Tipo de documento:** Runbook operativo
> **Task dueña:** `TASK-1736` (Slice 4) · **ADR:** `docs/architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`
> **Creado:** 2026-08-16 (Claude, Slice 4 code-only)
> **Estado:** rollout **gated a señal del operador** — este documento deja los pasos exactos listos; el flag sigue OFF en todos los environments y la remediación histórica no se ha aplicado.

## Para qué sirve

Ejecutar el flip del writer nuevo de identidad de candidatos (evidencia application-scoped +
reconciliación de display CAS) y la remediación histórica gobernada, sin improvisar comandos. El
flag es **Vercel-only** (ningún Cloud Run lo lee) y **default OFF**; la remediación por allowlist
es un acto humano independiente del flag (ADR D4: el flag por sí solo jamás autoriza backfill).

## Antes de empezar

- Leer el ADR — en especial D3 (precondiciones del reconcile), D4 (remediación) y las Hard rules.
- Read-sites del flag `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` (verificado por grep):
  `src/lib/hiring/candidate-intake/config.ts`, consumido por `submitPublicHiringApplication` y por
  la señal `hiring.candidate_identity.evidence_coverage_gap`. **Solo Vercel.**
- Verificar estado live ANTES de tocar nada (nunca confiar en docs):

```bash
vercel env ls --scope efeonce-7670142f | grep HIRING_CANDIDATE_IDENTITY
```

- La migración `20260816203411170_task-1736-candidate-identity-evidence.sql` ya está aplicada
  (dev/staging/prod comparten `greenhouse-pg-dev`). Para un environment fresco: `pnpm pg:connect:migrate`.

## Secuencia de rollout

### Paso 1 — Flip en staging

```bash
vercel env add HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED staging --scope efeonce-7670142f   # valor: true
# Redeploy de staging para calentar la env (las env de Vercel no calientan solas)
```

### Paso 2 — Canary: postulación sintética con nombre degenerado

Postular un candidato **sintético** (persona agente / correo de prueba; nunca un candidato real)
por AMBAS entradas públicas (Careers custom y Growth Forms nativo) con un nombre degenerado
evidente, p. ej. `valentina prueba` (todo minúsculas):

```bash
# Vía staging request (endpoint público gated por HIRING_PUBLIC_APPLICATIONS_ENABLED)
pnpm staging:request POST /api/public/hiring/applications '{...payload sintético...}'
```

Verificar en DB (read-only, `pnpm pg:connect:shell`):

1. **Evidencia**: fila nueva en `greenhouse_hiring.candidate_identity_intake_evidence` con
   `submitted_full_name` EXACTO a lo escrito (raw intacto), `casing_classification='degenerate_lower'`
   y `proposed_display_name` capitalizado.
2. **Reconcile**: `greenhouse_core.identity_profiles.full_name` quedó con el display propuesto
   (`Valentina Prueba`) y NO el verbatim.
3. **Audit**: fila en `greenhouse_hiring.candidate_identity_display_audit` con `source='reconcile'`
   y `outcome='applied'` (o `skipped/needs_review` con su reason code si la Person ya existía).
4. **Caso identity preexistente**: repetir el submit con el mismo email y otro casing — no duplica
   Person; el audit registra el outcome del CAS (nunca last-write-wins).
5. **Idempotencia**: re-submit idéntico ⇒ cero filas nuevas de evidencia (dedupe por digest).

### Paso 3 — Flip en producción

Solo con el canary de staging verde y `evidence_coverage_gap` en `ok`:

```bash
vercel env add HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED production --scope efeonce-7670142f   # valor: true
# Redeploy de production
```

Cooldown 24 h vigilando las señales (sección siguiente) antes de la remediación histórica.

### Paso 4 — Remediación histórica con el CLI (independiente del flag)

Manual completo: `docs/manual-de-uso/hr/operar-remediacion-nombres-candidatos.md`. Resumen:

```bash
# 1. Dry-run (read-only)
pnpm hiring:candidates:remediate-display

# 2. Emitir allowlist (archivo local GITIGNOREADO — contiene PII)
pnpm hiring:candidates:remediate-display --emit-allowlist ./task-1736.candidate-remediation-allowlist.json

# 3. Revisar/podar línea a línea (caso real 2026-08-16: 4 propuestas = 2 humanos + 2 perfiles QA
#    de prueba que se PODAN — remediar un perfil sintético es ruido, no valor)

# 4. Apply con actor + reason (lotes de 1, CAS + audit)
pnpm hiring:candidates:remediate-display --apply \
  --allowlist ./task-1736.candidate-remediation-allowlist.json \
  --actor <user-id> --reason "TASK-1736 remediación casing histórico"
```

El apply aborta solo si `applied != expected` (CAS/searchKey detectó cambios en DB o corrección
humana nueva). Verificación post-apply: readback de `full_name` de cada identidad remediada + filas
`reconcile/applied` en el audit + `needs_review_backlog` sin crecer.

## Verificación por señales

Dashboard: `/admin/operations` (módulo **Hiring / ATS**). Readers:
`src/lib/reliability/queries/hiring-candidate-identity-signals.ts`.

| Señal | Steady | Alerta significa |
|---|---|---|
| `hiring.candidate_identity.needs_review_backlog` | 0 | derivaciones a humano sin resolver (warning 1-5; error >5) ⇒ drenar con el command de corrección (capability `hiring.candidate.correct_display`), nunca SQL |
| `hiring.candidate_identity.evidence_coverage_gap` | 0 (flag ON) / `ok` con nota (flag OFF) | applications nuevas sin fila de evidencia con flag ON = silent-skip del write path ⇒ revisar Sentry dominio `hiring` + repetir canary |

## Rollback

- **Flag OFF + redeploy** (staging y/o production): el intake vuelve al comportamiento previo en
  <15 min; las filas de evidencia/audit quedan **inertes y auditables** (aditivas, jamás se borran).
- **Las correcciones ya aplicadas se CONSERVAN por diseño**: el modelo es append-only y la
  evidencia raw de cada aplicación permite reconstruir todo. Si un display remediado debe volver a
  su valor anterior, se revierte **por registro** con el mismo CAS (before-value exacto del audit) —
  nunca un UPDATE masivo.
- La remediación en curso se detiene sola ante cualquier drift (`countMatchesExpected=false` aborta).

## Qué NO hacer

- NO ejecutar el apply histórico sin dry-run vigente + allowlist revisada línea a línea (los 4 casos
  de 2026-08-16 son punto de partida, no contrato — regenerar siempre).
- NO remediar perfiles sintéticos/QA: podarlos de la allowlist.
- NO tocar `identity_profiles.full_name` con SQL manual — la única puerta es
  `reconcileCandidateIdentityDisplayName` (CAS + audit).
- NO pegar el output del dry-run/allowlist (contiene nombres) en logs compartidos, issues ni chat.
- NO asumir que prender el flag autoriza el backfill: son actos independientes (ADR D4).

## Problemas comunes

- **`evidence_coverage_gap` en warning recién prendido el flag** → la ventana de 24 h puede incluir
  applications previas al flip; confirmar con el canary y re-mirar tras el cooldown.
- **Apply reporta `needs_review (allowlist_version_drift)`** → la policy cambió de versión desde el
  dry-run: regenerar dry-run + allowlist.
- **Apply reporta `skipped (human_correction_present)`** → alguien corrigió a mano entre dry-run y
  apply; la corrección humana gana — no reintentar.
- **`needs_review_backlog` crece tras el flip** → intakes con discrepancia sustantiva de nombre
  (posible cambio real/homónimo): resolver una a una con el command de corrección humana.

## Referencias

- Spec: `docs/tasks/in-progress/TASK-1736-candidate-identity-intake-canonicalization-remediation.md` (§Rollout Plan)
- ADR: `docs/architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`
- Ledger de flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- CLI: `scripts/hiring/remediate-candidate-display-names.ts` (`pnpm hiring:candidates:remediate-display`)
- Manual: `docs/manual-de-uso/hr/operar-remediacion-nombres-candidatos.md`
- Señales: `src/lib/reliability/queries/hiring-candidate-identity-signals.ts`
