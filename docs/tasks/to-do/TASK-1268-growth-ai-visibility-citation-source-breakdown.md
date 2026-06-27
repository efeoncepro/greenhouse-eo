# TASK-1268 — Growth AI Visibility: Citation Source Domain Breakdown (Digital PR Targeting)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1268-growth-ai-visibility-citation-source-breakdown`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El report ya tiene `citationInsight` (ownDomainShare) + `sourceTypeSummary` (conteo por tipo de fuente), pero no el desglose accionable: **qué dominios específicos** alimentan las respuestas de los answer engines sobre la marca. Esta task agrega la agregación por dominio de cita — derivada on-read de las `provider_observations` ya capturadas — para que la recomendación de digital PR diga *dónde* colocar contenido, no solo "consigue más citas".

## Why This Task Exists

Las citas crudas ya están en `provider_observations` (cada observation guarda `citations`). Hoy se resumen por tipo (`sourceTypeSummary`) pero no por dominio. Saber que las respuestas sobre la marca se apoyan en `g2.com`, `reddit.com/r/x` o un competidor cambia la acción: digital PR se dirige a esos dominios. Es la diferencia entre un diagnóstico ("baja citation quality") y un plan ("estos 5 dominios mandan; consigue presencia ahí"). Costo casi nulo: no hay llamada externa nueva, es derivación de datos ya capturados.

## Goal

- Agregar las citas de `provider_observations` por **dominio** (frecuencia, motores que lo citan, ¿es own-domain / competidor / tercero / UGC?), derivado on-read sin tabla nueva.
- Exponerlo en el report builder como un campo public-safe (top-N dominios, sin URLs crudas sensibles) y enriquecer la recomendación de digital PR.
- Reusar el patrón de derivación de TASK-1235 (report builder) + signal enrichment de TASK-1237.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 report artifact, §11 programmatic contract, §13 privacy/security.
- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — derivación on-read pura de score+findings; `citationInsight`.
- `docs/tasks/complete/TASK-1237-growth-ai-visibility-report-signal-enrichment.md` — enriquecimiento de señales de cita.
- Skill `seo-aeo` — módulo `05_OFFPAGE_AUTHORITY` (digital PR, qué dominios citan).

Reglas obligatorias:

- **Derivación on-read pura**, sin tabla nueva: las citas ya viven en `provider_observations.citations`. Esta task agrega un agregador que el report builder consume, NO un nuevo write path.
- **Public-safe boundary:** el `PublicGraderReport` no puede exponer URLs crudas sensibles ni raw provider text. Exponer dominio + frecuencia + clasificación (own/competitor/third-party/ugc), top-N acotado. El leak test existente debe cubrir el campo nuevo.
- **Reusar el report builder canónico** (TASK-1235), no lógica paralela en un consumer.
- **Honest degradation:** runs sin citas → campo vacío con razón, no inventar dominios.

## Normative Docs

- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md`
- `src/lib/growth/ai-visibility/report/builder.ts` [verificar]
- `src/lib/growth/ai-visibility/report/contracts.ts`
- `src/lib/growth/ai-visibility/store.ts` (lectura de `provider_observations.citations`)

## Dependencies & Impact

### Depends on

- `TASK-1235` — report builder + `citationInsight` + leak test.
- `TASK-1237` — signal enrichment de citas.
- Datos ya capturados en `provider_observations.citations` (no requiere captura nueva).

### Blocks / Impacts

- Enriquece la recomendación de digital PR (consumida por `TASK-1269` fix-it).
- `TASK-1265` (AI Overviews) aporta un canal de citas más rico → más valor a este desglose.

### Files owned

- `src/lib/growth/ai-visibility/report/citation-breakdown.ts` [nuevo: agregador]
- `src/lib/growth/ai-visibility/report/builder.ts` [extender]
- `src/lib/growth/ai-visibility/report/contracts.ts` [extender: campo public-safe + leak test]

## Current Repo State

### Already exists

- `provider_observations.citations` (JSONB) capturado por cada observation.
- `citationInsight` (ownDomainShare) + `sourceTypeSummary` en el report (TASK-1235/1237).
- Leak tests del `PublicGraderReport` (TASK-1235).

### Gap

- No hay desglose por dominio de cita (qué dominios específicos mandan).
- La recomendación de digital PR es genérica por falta de targeting de dominios.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: report builder (derivación on-read de `provider_observations`)
- Consumidores afectados: report builder, public lead magnet, client portal report, recomendaciones
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: report builder derivación pura (TASK-1235), `PublicGraderReport` leak-proof.
- Contrato nuevo o modificado: campo `citationSourceBreakdown` (top-N dominios + clasificación) public-safe.
- Backward compatibility: `compatible` (campo additive; consumers existentes no rompen).
- Full API parity: el report es un reader canónico; el desglose lo consumen UI/Nexa/MCP por construcción.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.provider_observations` (solo lectura). Sin tabla nueva.
- Invariantes que no se pueden romper:
  - Derivación on-read pura; cero write path nuevo.
  - `PublicGraderReport` no expone URLs crudas sensibles ni raw provider text (leak test cubre el campo).
  - Run sin citas → campo vacío con razón, no inventar dominios.
- Tenant/space boundary: público sin sesión; el público recibe solo el subset public-safe.
- Idempotency/concurrency: derivación determinista del snapshot; el report freezeado no cambia.
- Audit/outbox/history: N/A (read derivation); el snapshot inmutable lo congela (TASK-1239).

### Migration, backfill and rollout

- Migration posture: `none` (derivación de datos existentes).
- Default state: `enabled with rationale` — campo additive public-safe; bajo riesgo. Gating opcional por flag si se prefiere shadow.
- Backfill plan: N/A (deriva en cada build de report; snapshots viejos quedan como están).
- Rollback path: revert PR.
- External coordination: N/A — repo-only change.

### Security and access

- Auth/access gate: el report público ya está tokenizado (TASK-1239); este campo hereda ese gate.
- Sensitive data posture: sin PII; clasificación de dominio public-safe, sin URLs sensibles.
- Error contract: errores sanitizados; honest degradation si no hay citas.
- Abuse/rate-limit posture: hereda el rate-limit del read del report (TASK-1245).

### Runtime evidence

- Local checks: `pnpm test` del agregador + leak test del campo nuevo en `PublicGraderReport`.
- DB/runtime checks: build de report de un run con citas reales + verificar top-N dominios correcto.
- Integration checks: N/A (no external call).
- Reliability signals/logs: ninguno nuevo (deriva de datos existentes).
- Production verification sequence: build de report en staging + verificar campo + leak test verde.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Agregador de citas por dominio + report field + leak test

- `citation-breakdown.ts`: agrega `provider_observations.citations` por dominio (frecuencia, motores que lo citan, clasificación own/competitor/third-party/ugc).
- Extender report builder + `PublicGraderReport`/`ClientGraderReport` con `citationSourceBreakdown` (top-N, public-safe) + leak test del campo nuevo.

### Slice 2 — Enriquecer la recomendación de digital PR

- Conectar el breakdown con la recomendación de `citation_quality` / digital PR para que apunte a dominios concretos.

## Out of Scope

- Render del breakdown en el report visual (TASK-1252).
- Captura de citas nuevas (ya están; AI Overviews las amplía vía TASK-1265).
- Cualquier write path o tabla nueva.

## Detailed Spec

El agregador recorre las `citations` de las observations del run, normaliza cada URL a su dominio registrable (eTLD+1), cuenta frecuencia y motores, y clasifica el dominio contra el own-domain de la marca y los competidores declarados. Salida: lista ordenada `{ domain, count, engines[], classification }`. El report builder toma el top-N public-safe (sin paths/URLs crudas). Es la versión accionable de `citationInsight`: en vez de "35% own-domain", dice "g2.com (8 citas), reddit.com (5), competidor.com (4)". La recomendación de digital PR pasa de genérica a dirigida.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (agregador + field + leak test) → Slice 2 (recomendación). Slice 2 depende del field de Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Leak de URL cruda sensible al público | privacy/security | medium | exponer solo dominio + clasificación; leak test del campo nuevo | leak test rojo |
| Normalización de dominio incorrecta (subdominios/eTLD) | data quality | medium | usar parser eTLD+1 confiable; test de casos borde | review de breakdown |
| Run sin citas reporta vacío confuso | data quality | low | honest degradation: vacío con razón explícita | N/A |

### Feature flags / cutover

- Sin flag obligatorio — additive public-safe sobre derivación read. Opcional `GROWTH_AI_VISIBILITY_CITATION_BREAKDOWN_ENABLED` si se prefiere shadow antes de exponer al público. Revert: revert PR. <5 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (campo additive) | <5 min | si |
| Slice 2 | revert PR | <5 min | si |

### Production verification sequence

1. Build de report de un run con citas reales en staging + verificar top-N dominios + clasificación.
2. Leak test verde sobre `PublicGraderReport`.
3. Deploy prod + verificar un report público.

### Out-of-band coordination required

- N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El agregador deriva el breakdown por dominio desde `provider_observations.citations` sin tabla ni write path nuevo.
- [ ] `citationSourceBreakdown` (top-N + clasificación) expuesto public-safe; leak test del campo verde.
- [ ] Normalización a eTLD+1 correcta con casos borde testeados.
- [ ] Run sin citas → campo vacío con razón (honest degradation), sin dominios inventados.
- [ ] La recomendación de digital PR apunta a dominios concretos del breakdown.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Build de report de un run real en staging + verificación del breakdown

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1265 citas AI Overviews, TASK-1269 fix-it, TASK-1252 render)

## Follow-ups

- Tendencia de dominios citados run-over-run (qué dominios ganaron/perdieron peso) sobre el trend de TASK-1236.

## Open Questions

- Ninguna pendiente — derivación de datos ya capturados; decisiones de scope cerradas.
