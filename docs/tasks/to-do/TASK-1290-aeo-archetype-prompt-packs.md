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
- Backend impact: `migration`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1289`
- Branch: `task/TASK-1290-aeo-archetype-prompt-packs`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El corazón del fix: reemplazar el prompt pack único (cableado a "¿qué agencias/proveedores de {category} ayudan a empresas enterprise?") por un **prompt set generado por marca**. El patrón canónico es **LLM-autora-luego-congela**: al momento de AUTORÍA, un LLM investiga el espacio de buyer-intent real de la marca (categoría canónica + modelo de negocio + sitio) y propone el fan-out; ese set se **persiste como artefacto versionado e inmutable** atado al perfil, **se revisa** (operador/AEO, obligatorio para prospectos) y **se congela**; los **runs usan el set congelado y aprobado** → deterministas, reproducibles y baratos (el LLM corrió una vez al autorar, **NUNCA por run**). Plantillas por arquetipo = **baseline determinista / fallback** (sin LLM disponible o casos triviales). El **scoring se queda determinista e idéntico** (presencia/SoV/citación se computan igual); solo cambian las preguntas. Cierra el núcleo de ISSUE-110.

## Why This Task Exists

Es la pieza que hace que el grader **mida la realidad**. Hoy `prompt-pack-v1.ts` (y v2) son una lista estática agencia-only; el Query Fan-Out / prompt-research (seo-aeo §04) debe reflejar el journey de compra **real** de la marca (rutas/precio para una aerolínea, "cuenta sin comisiones" para un banco…), que una plantilla genérica no captura. La interpretación de "qué le preguntaría un comprador real a la IA sobre esta marca" es exactamente lo que un LLM hace bien — pero debe quedar **congelado y reproducible** para poder medir en el tiempo, evaluar y no sesgar la medición. Sin esto, SKY (y toda marca de consumo/no-agencia) seguirá saliendo 0.

## Goal

- **Autoría (LLM):** `authorPromptSet({ brandName, categoryNodeId, categoryLabel, businessModel, market, locale, competitors, websiteSignals? })` propone, vía el cliente LLM canónico (`src/lib/ai/*`), un fan-out que cubre las etapas (awareness · consideration · comparison · trust · purchase) con los tipos de sub-query del Query Fan-Out (related/comparative/implicit/recent), acotado en costo. NO leading (no preguntas redactadas para que la marca aparezca).
- **Artefacto congelado:** el set se persiste versionado + inmutable (lifecycle `draft → approved → active`), con provenance (modelo, inputs, estrategia). Los **runs referencian el set `active` aprobado**; misma marca → mismo set (reproducible).
- **Baseline determinista:** plantillas por arquetipo como fallback cuando no hay LLM / set aprobado, garantizando no-regresión bit-for-bit del caso agencia.
- El **scoring NO cambia**; provenance del set/versión en el run.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (prompt packs inmutables + versionados; scoring determinista)
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (invariantes de providers LLM — usar el cliente canónico de `src/lib/ai/*`, secret server-side)
- `docs/epics/to-do/EPIC-021-aeo-brand-aware-prompt-generation-engine.md`
- seo-aeo `modules/04_AEO_GEO.md` (Query Fan-Out, prompt/answer-space research)

Reglas obligatorias:

- **El LLM autora, NUNCA por run.** El LLM corre en el momento de AUTORÍA del set (una vez por marca/versión); el set se congela; los runs usan el set `active` aprobado. Generar prompts en vivo por run rompe la reproducibilidad (no se puede medir en el tiempo / evaluar drift), el costo y la seguridad.
- El scoring (presencia/SoV/citación) **NO cambia** — solo cambian los prompts. Cualquier cambio de scoring es regresión.
- El prompt set es **inmutable + versionado** (cambios → versión nueva), con lifecycle `draft → approved → active` (append-only). Un set `active` no se edita; se supersede con una versión nueva aprobada.
- **NUNCA** instanciar un SDK LLM nuevo en este dominio — usar el cliente canónico de `src/lib/ai/*` (helper structured); secret server-side; output validado contra schema; degradación honesta (sin LLM / schema inválido → baseline determinista, NO prompts rotos ni enum crudo).
- **No leading**: el LLM no debe redactar prompts diseñados para que la marca aparezca (sesgaría la medición); el review + eval (TASK-1292) lo controla.
- **System prompt del autor = artefacto versionado derivado de `seo-aeo`** (NO un "eres experto SEO" ad-hoc): codifica Query Fan-Out + etapas de buyer-intent + sub-query types + framing por modelo de negocio + restricción no-leading + la taxonomía del pack actual (`family`/`fanOutType`/`intentStage`/`namesBrand`). Su versión (`system_prompt_version`) es parte de la provenance del set; cambiarla re-dispara la eval.
- **Output estructurado** (queries tipadas con sus tags, mismo shape que el pack actual) vía el helper structured del cliente canónico; el scoring depende de los tags, así que texto libre es inaceptable.
- Interpolación de marca/categoría como **dato delimitado** (anti prompt-injection), nunca PII; prompts con `{{competitor}}` sin competidor se descartan (patrón existente).
- El run persiste **provenance**: `business_model`, `category_node_id`, id/versión del prompt set usado.

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

- `migrations/<ts>_task-1290-grader-prompt-sets.sql` (tabla `grader_prompt_sets` + provenance en `grader_runs`)
- `src/lib/growth/ai-visibility/prompt-packs/archetypes/*.ts` (baseline determinista por arquetipo) `[verificar naming]`
- `src/lib/growth/ai-visibility/prompt-packs/author-prompt-set.ts` (autoría LLM vía cliente canónico + grounding sources) `[verificar]`
- `src/lib/growth/ai-visibility/prompt-packs/author-system-prompt.ts` (system prompt experto AEO versionado, derivado de seo-aeo) + schema structured `[verificar]`
- `src/lib/growth/ai-visibility/prompt-packs/prompt-set-store.ts` (lifecycle draft→approved→active + resolve active) `[verificar]`
- `src/lib/growth/ai-visibility/prompt-pack.ts` (resolver el set active, fallback baseline)
- `src/lib/growth/ai-visibility/run-engine.ts` (provenance del prompt set)
- `src/lib/ai/*` (reuse del cliente LLM canónico + helper structured — NO SDK nuevo)

## Current Repo State

### Already exists

- `prompt-pack-v1.ts`/`v2` (estáticos, agencia-only) + `prompt-pack.ts` (interpolación + descarte de `{{competitor}}`).
- `grader_runs.execution_prompts` (persiste los prompts resueltos) + `prompt_pack_version`.

### Gap

- No hay prompt set por marca, ni autoría LLM, ni artefacto persistido/versionado, ni baseline por arquetipo; el run siempre usa el pack agencia en código.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (cambia qué se le pregunta a los motores reales en TODAS las puertas del grader + introduce autoría LLM)
- Impacto principal: `migration` (artefacto del prompt set) + `command` (autoría LLM + lifecycle) + `integration` (cliente LLM canónico)
- Source of truth afectado: nuevo `greenhouse_growth.grader_prompt_sets` (artefacto versionado por perfil) + provenance en `grader_runs`
- Consumidores afectados: run-engine (3 puertas: público/cliente/operador) · review operador (TASK-1291) · eval (TASK-1292)
- Runtime target: `local|staging|production`

### Contract surface

- Contratos nuevos: `authorPromptSet(profileVars) → draft set` (LLM, cliente canónico `src/lib/ai/*`, structured + cost-bounded) · `approvePromptSet(setId)` (draft→active, congela) · `resolveActivePromptSet(profileId) → GraderRunPromptInput[]` (lo que usa el run). Baseline determinista por arquetipo como fallback.
- Backward compatibility: `compatible` para el caso agencia (el baseline `b2b_service_provider` produce el MISMO set que hoy); `additive` para el artefacto + arquetipos nuevos.
- Full API parity: la autoría/approve/resolución son commands/readers gobernados; las 3 puertas resuelven el set `active` por construcción.

### Data model and invariants

- Entidades: `grader_prompt_sets` (`set_id`, `profile_id`, `version`, `business_model`, `category_node_id`, `prompts_json` (queries **estructuradas**: `family`/`fanOutType`/`intentStage`/`namesBrand`/`text`, mismo shape que el pack actual), `generation_strategy` `llm`|`template_baseline`, `model`, `system_prompt_version` (versión del cerebro AEO autor), `grounding_sources_json` (qué señales reales se usaron: site_probe/competitors/search_data), `status` `draft`|`approved`|`active`|`superseded`, `created_by`, `approved_by`, timestamps); baseline por arquetipo en código (versionado). `grader_runs` (+ `prompt_set_id`/`version` provenance).
- Invariantes:
  - Un perfil tiene a lo sumo UN set `active`; aprobar uno nuevo supersede el anterior (append-only, no edit-in-place).
  - El run usa el set `active`; misma marca → mismo set (reproducible). Si no hay set `active` → baseline determinista del arquetipo (no prompts rotos, no enum crudo).
  - Para `b2b_service_provider` el baseline es **idéntico** al pack actual (no regresión del lead magnet).
  - Scoring inalterado (mismo `score_version`); el LLM NO toca el score.
  - LLM output validado contra schema; prompts no-leading; interpolación delimitada; descarte de `{{competitor}}` sin competidor.
- Tenant/space boundary: el set es per-profile (per-org).
- Idempotency/concurrency: la AUTORÍA LLM no es determinista (por eso se congela un artefacto); la RESOLUCIÓN en run es determinista (lee el set `active`). Approve por claim atómico (un solo `active`).
- Audit/outbox/history: `grader_prompt_sets` append-only + provenance (modelo, inputs, quién aprobó); provenance del set en el run.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla `grader_prompt_sets` + columna provenance en `grader_runs`).
- Default state: detrás de flag `GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED` (default OFF): con OFF el run usa el pack agencia actual (no-op); con ON resuelve el set `active` (o baseline). La AUTORÍA LLM gateada por su propio flag + el kill switch global del grader; secret server-side.
- Backfill plan: autorar (o baseline) un set `active` para los perfiles existentes (dry-run; los de consumo se re-autoran). Idempotente.
- Rollback path: flag OFF → pack agencia; reverse migration (drop tabla); el LLM-author se apaga por flag.
- External coordination: review del copy de los prompts autorados (comercial/AEO) — gate de TASK-1291; sign-off de costo de la autoría LLM.

### Security and access

- Auth/access gate: autoría/approve gateados por capability operador del grader (reuse); resolución sin capability (run ya gobernado).
- Sensitive data posture: sin PII; el LLM recibe marca/categoría/sitio (públicos), nunca PII; interpolación delimitada anti-injection; secret LLM server-side (`*_SECRET_REF`).
- Error contract: canónico; degradación honesta — sin LLM / schema inválido / sin set `active` → baseline determinista + signal, NUNCA prompts rotos ni enum crudo.
- Abuse/rate-limit posture: la autoría LLM es 1×/marca/versión (no por run) + cost ceiling; el run no agrega costo LLM.

### Runtime evidence

- Local checks: tests del baseline (agencia = set idéntico al actual; cada arquetipo cubre etapas; descarte de competitor) + del lifecycle del artefacto (un solo `active`, supersede) + del fallback (sin LLM → baseline).
- DB/runtime checks: autorar+aprobar un set para SKY (staging) → run usa el set `active` → prompts de consumo → SKY aparece → score realista ≠ 0; reproducibilidad (2 runs, mismo set).
- Integration checks: los 3 endpoints resuelven el set `active`; el cliente LLM canónico responde structured + acotado en costo.
- Reliability signals/logs: signal de runs con baseline-fallback (sin set `active`) + de autorías LLM fallidas.
- Production verification sequence: flag ON staging → autorar SKY → review → run realista → eval (TASK-1292) verde → prod.

### Acceptance criteria additions

- [ ] SoT (`grader_prompt_sets` artefacto versionado + provenance) y los commands (author/approve/resolve) nombrados; scoring inalterado.
- [ ] LLM autora al momento de autoría (no por run); el run usa el set `active` congelado (reproducible); fallback a baseline determinista.
- [ ] No regresión: el baseline `b2b_service_provider` es idéntico al pack actual.
- [ ] Run real SKY con set autorado → score realista ≠ 0 (evidencia); un solo `active` por perfil; LLM vía cliente canónico + secret server-side.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Baseline determinista por arquetipo (no regresión)

- Plantillas por arquetipo (`b2b_service_provider` reproduce **idéntico** el pack actual — test de no-regresión vs `prompt-pack-v1`; `consumer_b2c`/`b2b_product_saas`/`retail_ecommerce`/`marketplace`/`public_institution` cubren las etapas). Es el fallback determinista.

### Slice 2 — Artefacto del prompt set + lifecycle

- Migration `grader_prompt_sets` (versionado, `draft→approved→active`, provenance) + `prompt-set-store.ts` (resolve active, approve atómico un-solo-active, supersede). `run-engine` referencia el set active (o baseline) + provenance.

### Slice 3 — Autoría LLM + flag

- `author-prompt-set.ts`: el LLM (cliente canónico `src/lib/ai/*`, structured + cost-bounded) propone un set `draft` por marca; validación de schema + no-leading; fallback a baseline si falla. Flag `GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED` + flag propio de la autoría LLM. (El approve/review operador vive en TASK-1291; acá se expone el command de approve.)

## Out of Scope

- El gate de validación + la UI de review operador (TASK-1291).
- La eval golden-set por arquetipo (TASK-1292).
- Re-autoría automática recurrente del set (cuando cambie el sitio/categoría) — follow-up.

## Detailed Spec

Dos tiempos separados. **Autoría** (no por run): el LLM, dada la marca + categoría canónica (label, no enum) + modelo de negocio + señales del sitio, propone el fan-out de buyer-intent; se valida (schema, no-leading) y se persiste como `draft`. **Aprobación**: operador/AEO revisa (TASK-1291) y aprueba → el set queda `active` (congelado, inmutable). **Medición** (cada run): el run-engine resuelve el set `active` del perfil (determinista, reproducible, sin costo LLM) o, si no hay, cae al **baseline determinista** del arquetipo. El scoring downstream es agnóstico a la pregunta (mide presencia/SoV/citación sobre las observaciones) → generalizar los prompts NO toca el motor de score. Esto resuelve la tensión "LLM interpreta vs reproducibilidad": el LLM interpreta **una vez al autorar**; el run mide con un set **fijo**.

### Estrategia de autoría LLM (grounded + experto AEO)

El LLM autor **mina el espacio de queries de buyer-intent** (no es el grounding de la medición — el grounding real es el run contra los motores; el LLM sólo *propone* las preguntas). Dos decisiones canónicas:

- **Autoría *grounded* (no a ciegas):** el LLM recibe señales REALES de la marca como contexto, no solo el nombre/categoría: el **site probe** (TASK-1266, ya existe), la lista de **competidores** declarados, y (si está disponible) **datos de búsqueda** (Semrush/PAA). Esto hace las queries específicas y locales (rutas/precio para una aerolínea), no genéricas. Lo usado queda en `grounding_sources_json` (provenance). Degradación honesta: sin señales → autoría solo desde marca+categoría+modelo (peor, pero no roto) o baseline.
- **System prompt = experto AEO versionado, derivado de la doctrina canónica:** el rol del LLM NO se inventa — se deriva de la skill `seo-aeo` (Query Fan-Out, etapas de buyer-intent, sub-query types, framing por modelo de negocio, restricción **no-leading**) + la taxonomía del pack actual (`family`/`fanOutType`/`intentStage`/`namesBrand`). El system prompt es un **artefacto versionado** (`system_prompt_version` en el set): cambiarlo cambia la versión del set → la **eval (TASK-1292) lo re-valida** (ningún cambio del "cerebro" sin eval).
- **Output ESTRUCTURADO, no texto libre:** el LLM devuelve queries tipadas con sus tags (`family`/`fanOutType`/`intentStage`/`namesBrand`/`text`), mismo shape que el pack actual, vía el helper structured del cliente canónico. Es obligatorio: el **scoring depende de esos tags** (ej. `namesBrand=false` = prompt de descubrimiento). Texto suelto rompería el motor.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- S1 (baseline + agencia no-regresión) → S2 (artefacto + lifecycle) → S3 (autoría LLM + flag). Bloqueada por TASK-1288/1289. El set autorado NO se usa en prod sin review (TASK-1291) + eval (TASK-1292).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión del lead magnet (baseline agencia cambia) | growth | medium | test de no-regresión bit-for-bit vs pack actual + flag | diff en `execution_prompts` del caso agencia |
| LLM genera prompts pobres / leading / off-topic | growth | medium | review operador (TASK-1291) + eval (TASK-1292) + no-leading constraint + schema | score irreal en eval / review rechaza |
| LLM por run (no reproducible) por error de diseño | growth | low | autoría 1×/marca/versión + set congelado; el run resuelve, no genera | costo LLM por run / set cambia entre runs |
| Sin set active → prompts rotos | growth | low | fallback a baseline determinista (no enum crudo) + signal | runs con baseline-fallback |
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

1. flag OFF: verificar baseline agencia idéntico (no-regresión).
2. flag ON staging: autorar (LLM) un set para SKY → review → approve → run usa el set active → prompts consumo → score realista; 2 runs = mismo set (reproducible).
3. eval (TASK-1292) verde multi-arquetipo.
4. prod tras sign-off (review del copy autorado + costo LLM).

### Out-of-band coordination required

- Review del copy de los prompts autorados por el LLM (comercial/AEO) — gate de TASK-1291.
- Sign-off de costo de la autoría LLM (1×/marca/versión).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] **Autoría LLM (no por run):** `authorPromptSet` produce un `draft` por marca vía el cliente canónico `src/lib/ai/*` (structured + cost-bounded, no-leading, schema-validado); el LLM NO corre por run.
- [ ] **Artefacto congelado + reproducible:** `grader_prompt_sets` versionado con lifecycle `draft→approved→active` (un solo `active` por perfil, supersede append-only); el run resuelve el set `active` (2 runs de la misma marca = mismo set).
- [ ] **Baseline + no-regresión:** sin set `active` → baseline determinista del arquetipo (no enum crudo); el baseline `b2b_service_provider` es **idéntico** al `prompt-pack-v1` actual (test bit-for-bit).
- [ ] Run real sobre SKY (staging, set autorado+aprobado) genera prompts de consumo y devuelve score realista ≠ 0 (evidencia); scoring inalterado (mismo `score_version`); provenance del set en el run; flag + fallback honesto.

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

- Re-autoría automática del set cuando cambie el sitio/categoría/competidores de la marca (cadencia, opt-in) — alimenta el re-grade recurrente (TASK-1270).
- Sub-segmentación por mercado/locale más fina si el buyer-intent difiere mucho por país (un set `active` por (perfil, market)).

## Open Questions

- ¿El review/approve (TASK-1291) es obligatorio para TODA marca o solo prospectos (cliente contratado podría auto-aprobar el baseline)? (definir con comercial).
- ¿Qué modelo LLM para la autoría (Gemini/Anthropic/OpenAI del cliente canónico) y su cost ceiling por autoría? (definir con el dueño de costo AEO).
- ¿El `system_prompt_version` del autor vive como artefacto en código (string versionado) o en DB para editarlo sin deploy? (recomendación: código + eval-gated; definir en Discovery).
