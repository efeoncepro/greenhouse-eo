# TASK-1290 — AEO: packs de prompts por arquetipo × buyer-intent (reemplaza el pack único de agencia)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1289`
- Branch: `task/TASK-1290-aeo-archetype-prompt-packs`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El corazón del fix: reemplazar el prompt pack único (cableado a "¿qué agencias/proveedores de {category} ayudan a empresas enterprise?") por un **generador de fan-out por arquetipo × etapa de buyer-intent**. Para `consumer_b2c` (SKY) genera intención de consumo ("¿cuáles son las mejores aerolíneas en {market}?"); para `b2b_service_provider` el set actual; para `b2b_product_saas`/`retail_ecommerce`/`marketplace` sus framings. El **scoring se queda determinista e idéntico** (presencia/SoV/citación se computan igual); solo cambian las preguntas. Cierra el núcleo de ISSUE-110.

## Why This Task Exists

Es la pieza que hace que el grader **mida la realidad**. Hoy `prompt-pack-v1.ts` (y v2) son una lista estática agencia-only; el Query Fan-Out (seo-aeo) debe reflejar el journey de compra real de la marca, que depende del modelo de negocio (TASK-1289) + la categoría canónica (TASK-1288). Sin esto, SKY (y toda marca de consumo) seguirá saliendo 0.

## Goal

- Generador `buildPromptSet({ brandName, categoryNodeId, categoryLabel, businessModel, market, locale, competitors, year })` que produce el fan-out apropiado al arquetipo, cubriendo las etapas (awareness · consideration · comparison · trust · purchase) con los tipos de sub-query del Query Fan-Out (related/comparative/implicit/recent).
- Plantillas por arquetipo (spine determinista, versionado/inmutable como los packs actuales). El scoring NO cambia. Provenance del arquetipo + versión del pack en el run.
- LLM-assist OPCIONAL y gated (solo categorías long-tail; su salida pasa por review/eval, nunca cruda a un run) — o diferido a follow-up.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (prompt packs inmutables + versionados; scoring determinista)
- `docs/epics/to-do/EPIC-021-aeo-brand-aware-prompt-generation-engine.md`
- seo-aeo `modules/04_AEO_GEO.md` (Query Fan-Out, prompt/answer-space research)

Reglas obligatorias:

- El scoring (presencia/SoV/citación) **NO cambia** — solo cambian los prompts. Cualquier cambio de scoring es regresión.
- Los packs por arquetipo son **inmutables + versionados** (cambios → versión nueva), igual que el pack actual.
- Interpolación como **dato delimitado** (anti prompt-injection), nunca PII; prompts con `{{competitor}}` sin competidor se descartan (patrón existente).
- El run persiste **provenance**: `business_model`, `category_node_id`, versión del pack/arquetipo usado.

## Normative Docs

- `docs/issues/open/ISSUE-110-aeo-grader-false-zero-non-agency-brands-taxonomy-bypass.md`
- `src/lib/growth/ai-visibility/prompt-packs/prompt-pack-v1.ts` (el pack a generalizar)
- `src/lib/growth/ai-visibility/prompt-pack.ts` (interpolación)

## Dependencies & Impact

### Depende de

- **TASK-1288** (categoría canónica + label) y **TASK-1289** (business_model). Bloqueante.

### Impacta a

- El run-engine (resuelve prompts vía el generador, no el pack fijo).
- **TASK-1292** (eval golden-set por arquetipo).
- El lead magnet (debe seguir bit-for-bit para el caso agencia).

### Files owned

- `src/lib/growth/ai-visibility/prompt-packs/archetypes/*.ts` (plantillas por arquetipo) `[verificar naming]`
- `src/lib/growth/ai-visibility/prompt-packs/build-prompt-set.ts` (generador) `[verificar]`
- `src/lib/growth/ai-visibility/prompt-pack.ts` (usar el generador)
- `src/lib/growth/ai-visibility/run-engine.ts` (provenance del arquetipo/pack)
- migración (si la provenance del arquetipo se persiste en `grader_runs`) `[verificar]`

## Current Repo State

### Already exists

- `prompt-pack-v1.ts`/`v2` (estáticos, agencia-only) + `prompt-pack.ts` (interpolación + descarte de `{{competitor}}`).
- `grader_runs.execution_prompts` (persiste los prompts resueltos) + `prompt_pack_version`.

### Gap

- No hay packs por arquetipo ni generador; el run siempre usa el pack agencia.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (cambia qué se le pregunta a los motores reales en TODAS las puertas del grader)
- Impacto principal: `command` (generador) (+ `migration` si se persiste provenance del arquetipo)
- Source of truth afectado: los packs por arquetipo (artefactos versionados) + provenance en `grader_runs`
- Consumidores afectados: run-engine (3 puertas: público/cliente/operador) · eval (TASK-1292)
- Runtime target: `local|staging|production`

### Contract surface

- Contrato nuevo: `buildPromptSet(profileVars) → GraderRunPromptInput[]` (resuelve arquetipo → pack → interpola). Provenance del arquetipo + versión en el run.
- Backward compatibility: `compatible` para el caso agencia (debe producir el MISMO set que hoy para `b2b_service_provider`); `additive` para los nuevos arquetipos.
- Full API parity: el generador es el único camino de resolución de prompts; las 3 puertas lo usan por construcción.

### Data model and invariants

- Entidades: packs por arquetipo (en código, versionados); `grader_runs` (+ provenance del arquetipo si se persiste).
- Invariantes:
  - Para `b2b_service_provider` el set es **idéntico** al actual (no regresión del lead magnet).
  - Cada arquetipo cubre las etapas de buyer-intent con el framing correcto; interpolación delimitada; descarte de `{{competitor}}` sin competidor.
  - Scoring inalterado (mismo `score_version`).
- Tenant/space boundary: el run ya es per-org.
- Idempotency/concurrency: la generación es determinista (mismas vars → mismo set).
- Audit/outbox/history: provenance (arquetipo + versión) en el run; el `execution_prompts` ya se persiste.

### Migration, backfill and rollout

- Migration posture: `additive` (si se persiste provenance del arquetipo) o `repo-only`.
- Default state: detrás de flag `..._ARCHETYPE_PROMPTS_ENABLED` (default OFF): con OFF el generador devuelve el pack agencia actual (no-op); con ON resuelve por arquetipo.
- Backfill plan: ninguno (afecta runs nuevos).
- Rollback path: flag OFF → vuelve al pack agencia.
- External coordination: review del copy de los prompts por arquetipo (comercial/AEO).

### Security and access

- Auth/access gate: sin nueva capability (consumido por el run ya gobernado).
- Sensitive data posture: sin PII; interpolación delimitada anti-injection.
- Error contract: canónico; degradación honesta si falta arquetipo (cae a un default seguro + signal, no a prompts rotos).
- Abuse/rate-limit posture: n/a (mismo costo por run; mismo nº de prompts por etapa).

### Runtime evidence

- Local checks: tests del generador (agencia = set idéntico al actual; consumer_b2c = prompts de consumo; cada arquetipo cubre etapas; descarte de competitor).
- DB/runtime checks: run real sobre SKY (staging) con flag ON → prompts de consumo → SKY aparece → score realista ≠ 0.
- Integration checks: los 3 endpoints (público/cliente/operador) resuelven prompts por arquetipo.
- Reliability signals/logs: signal de runs con arquetipo `unknown`/fallback.
- Production verification sequence: flag ON staging → run SKY realista → eval (TASK-1292) verde → prod.

### Acceptance criteria additions

- [ ] SoT (packs por arquetipo + provenance) y generador nombrados; scoring inalterado.
- [ ] No regresión: `b2b_service_provider` produce el set idéntico al actual.
- [ ] Run real SKY con score realista ≠ 0 (evidencia).
- [ ] Flag + degradación honesta si falta arquetipo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Generador + arquetipo agencia (no regresión)

- `build-prompt-set.ts` + el arquetipo `b2b_service_provider` que reproduce **idéntico** el pack actual. Test de no-regresión vs `prompt-pack-v1`.

### Slice 2 — Arquetipos nuevos

- Plantillas para `consumer_b2c`, `b2b_product_saas`, `retail_ecommerce`, `marketplace` (+ `public_institution`) cubriendo las etapas de buyer-intent. Tests por arquetipo.

### Slice 3 — Wiring + provenance + flag

- `prompt-pack.ts`/`run-engine.ts` usan el generador; provenance del arquetipo/versión en el run; flag `..._ARCHETYPE_PROMPTS_ENABLED`.

## Out of Scope

- El gate de validación del operador (TASK-1291).
- La eval golden-set por arquetipo (TASK-1292).
- LLM-assist productivo (a lo sumo un slice follow-up gated por eval).

## Detailed Spec

El generador resuelve `business_model → arquetipo → plantillas`, interpola las vars canónicas (label de categoría de TASK-1288, no el enum) y produce el fan-out. El scoring downstream es agnóstico al arquetipo (mide presencia/SoV/citación sobre las observaciones, sin importar la pregunta). Esto garantiza que generalizar los prompts NO toca el motor de score.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- S1 (generador + agencia no-regresión) → S2 (arquetipos nuevos) → S3 (wiring + flag). Bloqueada por TASK-1288/1289.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión del lead magnet (set agencia cambia) | growth | medium | test de no-regresión bit-for-bit vs pack actual + flag | diff en `execution_prompts` del caso agencia |
| Arquetipo nuevo con prompts pobres | growth | medium | review de copy AEO + eval (TASK-1292) gate | score irreal en eval |
| Arquetipo `unknown` → prompts rotos | growth | low | fallback seguro + signal (no inyectar enum) | runs con arquetipo fallback |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED` (default OFF → pack agencia actual; ON → por arquetipo). Flip tras eval verde.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <10 min | sí |
| Slice 2 | revert PR | <10 min | sí |
| Slice 3 | flag OFF | <5 min | sí |

### Production verification sequence

1. flag OFF: verificar set agencia idéntico (no-regresión).
2. flag ON staging: run SKY → prompts consumo → score realista.
3. eval (TASK-1292) verde multi-arquetipo.
4. prod tras sign-off.

### Out-of-band coordination required

- Review del copy de los prompts por arquetipo (comercial/AEO).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `buildPromptSet` resuelve `business_model → arquetipo → fan-out` por etapas de buyer-intent; interpola la label canónica (no el enum); descarta `{{competitor}}` sin competidor.
- [ ] No-regresión: para `b2b_service_provider` el set es **idéntico** al `prompt-pack-v1` actual (test bit-for-bit).
- [ ] Run real sobre SKY (staging, flag ON) genera prompts de consumo y devuelve score realista ≠ 0 (evidencia).
- [ ] Scoring inalterado (mismo `score_version`); provenance del arquetipo/versión en el run; flag + fallback honesto.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- run real staging sobre SKY + diff de no-regresión del caso agencia

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (EPIC-021, TASK-1291/1292, ISSUE-110)
- [ ] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (prompt generation por arquetipo)

## Follow-ups

- LLM-assist gated (eval-backed) para categorías long-tail donde la plantilla queda genérica.
- Sub-segmentación por mercado/locale más fina si el buyer-intent difiere mucho por país.

## Open Questions

- ¿Persistir la provenance del arquetipo en `grader_runs` (columna) o basta con la versión del pack? (definir en Discovery).
