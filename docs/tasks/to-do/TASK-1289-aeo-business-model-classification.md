# TASK-1289 — AEO: clasificación de modelo de negocio (arquetipo del buyer-intent)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1288`
- Branch: `task/TASK-1289-aeo-business-model-classification`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Introduce el eje que falta para que el grader generalice: el **modelo de negocio** de la marca. Nuevo atributo `business_model` en `grader_profiles` (`consumer_b2c` / `b2b_service_provider` / `b2b_product_saas` / `retail_ecommerce` / `marketplace` / `public_institution`), que decide el **framing del buyer-intent** de los prompts (TASK-1290). **DERIVA del `brand_intelligence` snapshot compartido** (TASK-1288 — el `candidate_business_model` ya viene del LLM grounded que leyó el sitio; NO se re-lee el sitio), con **override del operador**. Parte de EPIC-021 / cierre de ISSUE-110.

## Why This Task Exists

El defecto de fondo del falso-0 de SKY no es solo la categoría: es que el grader asume que **toda** marca es una agencia/proveedor B2B. Una aerolínea (consumo) necesita prompts de intención de compra de consumidor; un SaaS, prompts de evaluación de software; una agencia, los actuales. Sin un eje explícito de modelo de negocio, no hay cómo elegir el framing correcto. Es ortogonal a la categoría (una categoría puede tener marcas de consumo y B2B).

## Goal

- Persistir `business_model` (enum cerrado) en `grader_profiles`, **derivado del `candidate_business_model` del `brand_intelligence` snapshot** (TASK-1288, ya grounded en el sitio) + confianza, con **override** explícito del operador. NO re-leer el sitio (consume el snapshot compartido).
- Default conservador + honesto: si no se puede clasificar con confianza → un valor `unknown`/needs-review que el gate de TASK-1291 trata como "no correr sobre prospecto sin confirmar".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-021-aeo-brand-aware-prompt-generation-engine.md`

Reglas obligatorias:

- `business_model` es un **enum cerrado** (CHECK en DB); ortogonal a la categoría (no derivarlo solo del nombre).
- El override del operador es append-only/auditado (no se pisa silenciosamente la clasificación automática).
- Sin clasificación confiable → `unknown` honesto (no forzar `b2b_service_provider` por default — eso es justo el bug que se arregla).

## Normative Docs

- `docs/issues/open/ISSUE-110-aeo-grader-false-zero-non-agency-brands-taxonomy-bypass.md`
- `docs/tasks/to-do/TASK-1288-aeo-canonical-category-resolution.md`

## Dependencies & Impact

### Depende de

- **TASK-1288** (categoría canónica + **`brand_intelligence` snapshot compartido**) — el `business_model` se deriva del `candidate_business_model` del snapshot. Bloqueante.

### Impacta a

- **TASK-1290** (packs por arquetipo) consume `business_model`.
- **TASK-1291** (gate operador) usa `business_model unknown/needs-review` para bloquear.

### Files owned

- `migrations/<ts>_task-1289-grader-profile-business-model.sql` (columna + CHECK + audit del override)
- `src/lib/growth/ai-visibility/taxonomy/business-model.ts` (enum + clasificador determinista) `[verificar naming]`
- `src/lib/growth/ai-visibility/provision-profile.ts` (setear `business_model` derivado)
- `src/lib/growth/ai-visibility/operator/*` (command de override) `[verificar]`

## Current Repo State

### Already exists

- `grader_profiles` + provisión (TASK-1286).
- (Tras TASK-1288) `category_node_id` canónico como señal.

### Gap

- No existe el eje `business_model` ni clasificador ni override.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration` (+ `command` del override)
- Source of truth afectado: `grader_profiles.business_model`
- Consumidores afectados: prompt generator (TASK-1290) · gate operador (TASK-1291)
- Runtime target: `local|staging|production`

### Contract surface

- Contrato nuevo: `classifyBusinessModel({ categoryNodeId, brandName?, websiteSignals? }) → { businessModel, confidence }` + columna `business_model` + command de override operador.
- Backward compatibility: `additive`.
- Full API parity: clasificador = helper canónico; override = command gobernado.

### Data model and invariants

- Entidades: `grader_profiles` (+`business_model` TEXT CHECK enum + `business_model_source` `derived`|`operator_override`).
- Invariantes: enum cerrado; `unknown` permitido; override auditado; clasificador determinista para una entrada.
- Tenant/space boundary: per-org (perfil).
- Idempotency/concurrency: backfill idempotente; override por claim.
- Audit/outbox/history: el override se audita (quién, de qué a qué).

### Migration, backfill and rollout

- Migration posture: `additive`.
- Default state: clasificación automática en provisión nueva; backfill de existentes (dry-run).
- Backfill plan: clasificar perfiles existentes desde `category_node_id` (reporta `unknown`).
- Rollback path: reverse migration + revert.
- External coordination: sign-off del enum de arquetipos con comercial (alineado al ICP Globe).

### Security and access

- Auth/access gate: override gateado por la capability operador del grader (reuse).
- Sensitive data posture: sin PII.
- Error contract: canónico; `captureWithDomain(err,'growth',…)`.
- Abuse/rate-limit posture: n/a.

### Runtime evidence

- Local checks: tests del clasificador (aerolínea→consumer_b2c; SaaS→b2b_product_saas; agencia→b2b_service_provider; ambiguo→unknown).
- DB/runtime checks: migrate verify + backfill report; SKY → `consumer_b2c`.
- Integration checks: override operador cambia el valor + audita.
- Reliability signals/logs: signal de perfiles `business_model=unknown`.
- Production verification sequence: migrate staging → backfill → verify SKY/Berel → prod.

### Acceptance criteria additions

- [ ] SoT (`business_model`), clasificador y command de override nombrados.
- [ ] Enum cerrado + CHECK; `unknown` honesto (no default a agencia).
- [ ] Backfill + signal de `unknown`; override auditado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Enum + clasificador determinista

- `business-model.ts` (enum + `classifyBusinessModel`). Tests por arquetipo.

### Slice 2 — Persistencia + provisión + backfill

- Migration (`business_model` + `business_model_source` + CHECK + audit). `provision-profile.ts` setea el derivado. Backfill idempotente.

### Slice 3 — Override operador + signal

- Command de override gobernado (auditado) + reliability signal de `unknown`.

## Out of Scope

- Los packs de prompts por arquetipo (TASK-1290).
- El gate de run/envío (TASK-1291).
- LLM-assist para clasificar (follow-up; el determinista es el spine).

## Detailed Spec

`business_model` es ortogonal a la categoría y es el eje que elige el framing del buyer-intent. El clasificador determinista (categoría + heurísticas de señales) es el spine; el operador puede override-ar con auditoría. Sin confianza → `unknown` (honesto), que el gate de TASK-1291 trata como "confirmar antes de correr sobre prospecto".

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- S1 (enum+clasificador) → S2 (persistencia+backfill) → S3 (override+signal). Bloqueada por TASK-1288.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Clasificación errónea → framing equivocado | growth | medium | override operador + `unknown` honesto + gate TASK-1291 | `business_model=unknown` alto / override frecuente |
| Default a agencia (re-introduce el bug) | growth | low | enum sin default a agencia; `unknown` explícito | revisión |

### Feature flags / cutover

- N/A — additive (columna + clasificador). El consumo real lo gatea TASK-1290/1291.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | reverse migration | <10 min | sí |
| Slice 3 | revert PR | <5 min | sí |

### Production verification sequence

1. migrate staging + backfill report.
2. verify SKY → `consumer_b2c`, una agencia → `b2b_service_provider`.
3. override operador audita.
4. prod tras sign-off del enum.

### Out-of-band coordination required

- Sign-off comercial del set de arquetipos (alineado al ICP Globe).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `grader_profiles.business_model` (enum cerrado + CHECK) persistido por un clasificador determinista; `unknown` honesto, sin default a agencia.
- [ ] Backfill idempotente; SKY clasifica `consumer_b2c`; signal de `unknown`.
- [ ] Command de override operador gobernado + auditado (source `operator_override`).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` + backfill + smoke del clasificador

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (EPIC-021, TASK-1290/1291, ISSUE-110)
- [ ] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`

## Follow-ups

- LLM-assist para clasificar marcas ambiguas / multi-modelo.

## Open Questions

- ¿El set de arquetipos es suficiente para el ICP Globe, o falta alguno (ej. `financial_institution`, `public_b2g`)? (definir con comercial).
