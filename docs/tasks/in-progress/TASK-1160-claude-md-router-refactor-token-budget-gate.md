# TASK-1160 — CLAUDE.md Router Refactor + Token Budget Gate

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops|platform|agent-governance|quality`
- Blocked by: `none`
- Branch: `task/TASK-1160-claude-md-router-refactor`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`CLAUDE.md` creció a **~6.191 líneas / ~193.000 tokens** (~96% de una ventana de 200k) porque cada task significativa appendeó un bloque de invariantes de 70-125 líneas. Se carga en cada turno y cada subagente lo hereda. Convertir `CLAUDE.md` de **spec-store en router**: mover los bloques domain-specific a sus skills/specs (load-on-demand), dejar pointers de 1-2 líneas, deduplicar patrones repetidos, y agregar un **CI gate de presupuesto de tokens** que impida la re-acreción. Cero cambio semántico de invariantes (relocación, no edición).

## Why This Task Exists

`CLAUDE.md` dejó de ser el contrato operativo y se volvió el sumidero de canonización: 195 secciones H3, 221 tasks referenciadas, 1.024 `NUNCA`. Las 12 secciones más grandes son bloques de invariantes de un solo subsistema (SQL signal readers 125 líneas, release playbook 110, ICO materializer 109, RpA demo 107…) que el ~95% de las tasks no toca pero igual carga.

Costo medible: (1) **rompe el spawn de subagentes** — un Explore falló live 2026-06-16 con ~205k tokens (system prompt + CLAUDE.md > límite 200k); (2) ~5× costo/latencia por turno innecesario; (3) prompt cache peor; (4) **entierra las reglas load-bearing** — 1.024 `NUNCA` esconden las ~20 que aplican siempre. La causa raíz es un patrón de gobernanza (`greenhouse-documentation-governor` manda canonizar invariantes en `CLAUDE.md` al cerrar cada task), así que sin arreglar la gobernanza vuelve a inflarse.

## Goal

- Reducir `CLAUDE.md` de ~193k → **target ~25-40k tokens** (recorte 5-8×) sin perder ninguna regla load-bearing.
- Mover cada bloque domain-specific a la skill/spec que corresponde, con pointer de 1-2 líneas en `CLAUDE.md`.
- Deduplicar los patrones canónicos repetidos (VIEW+helper+signal+lint; state-machine+CHECK+audit trio) en un solo doc canónico + pointers.
- Agregar un CI gate de presupuesto de tokens para `CLAUDE.md` (warn-first → error) que impida la re-acreción.
- Arreglar la regla de gobernanza para que los invariantes de dominio se canonicen en skill/spec, no en `CLAUDE.md`.
- Restaurar el spawn de subagentes (la prueba: un Explore con un prompt no-trivial no debe superar el límite).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `CLAUDE.md` (raíz) — el archivo a refactorizar; es el contrato operativo de todo agente.
- `AGENTS.md` (raíz) — contrato hermano (1.830 líneas); sufre el mismo patrón pero queda fuera de scope (follow-up).
- `.claude/skills/` y `.codex/skills/` — destino de los bloques domain-specific. Convención `SKILL.md` + reference files.
- `docs/architecture/` — destino de invariantes que pertenecen a una spec.
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md` + `docs/tasks/TASK_PROCESS.md` — el operating loop que `CLAUDE.md` debe seguir routeando.

Reglas obligatorias:

- **Relocación, NO edición.** Cero cambio semántico de cualquier invariante. El texto se MUEVE; no se reescribe ni se "mejora" en este task (eso sería otra task con su propio review de dominio).
- **Move-then-pointer.** Primero mover el contenido al destino (skill ref / spec), verificar que es alcanzable ahí, y recién entonces reemplazar el bloque en `CLAUDE.md` por el pointer. Nunca borrar antes de confirmar el destino.
- **Ninguna regla load-bearing se pierde.** Auditoría: cada `NUNCA`/`SIEMPRE` del `CLAUDE.md` original debe ser alcanzable (en el `CLAUDE.md` nuevo o en su skill/spec destino).
- **El gate de tokens va primero** (Slice 2, antes de la migración masiva) para medir el progreso y prevenir re-acreción durante el propio refactor.
- No tocar `project_context.md` (5.991 líneas) ni `AGENTS.md` en este task — son el mismo patrón pero scope separado (follow-ups).

## Normative Docs

- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md` — cómo se navegan los docs de contexto; informa qué es router vs detalle.
- `.claude/skills/greenhouse-documentation-governor/SKILL.md` — la skill cuya regla de cierre causó la acreción; debe actualizarse (Slice 6).

## Dependencies & Impact

### Depends on

- Ninguna task previa. Es self-contained (docs + CI script).

### Blocks / Impacts

- Impacta a **todo agente** (Claude + Codex) que lee `CLAUDE.md` — alto blast radius de gobernanza (no de runtime).
- Habilita el spawn confiable de subagentes (hoy roto cerca del límite de 200k).
- Patrón replicable a `AGENTS.md` y `project_context.md` (follow-ups).

### Files owned

- `CLAUDE.md`
- `scripts/ci/claude-md-token-budget.mjs` `[verificar/crear]`
- `.github/workflows/ci.yml` (agregar el gate)
- `.claude/skills/**/SKILL.md` + reference files (destino de bloques movidos) `[verificar paths por skill]`
- `.codex/skills/**/SKILL.md` (mirror cuando aplique) `[verificar]`
- `docs/architecture/**` (destino de invariantes que pertenecen a una spec) `[verificar paths]`
- `.claude/skills/greenhouse-documentation-governor/SKILL.md` + `.codex/skills/greenhouse-documentation-governor/SKILL.md` (Slice 6)
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md`

## Current Repo State

### Already exists

- `CLAUDE.md`: 6.191 líneas, ~193k tokens, 195 H3, 221 tasks referenciadas, 1.024 `NUNCA`.
- Skills de dominio que ya existen y son el destino natural de muchos bloques: `greenhouse-payroll-auditor`, `greenhouse-ico`, `greenhouse-finance-accounting-operator`, `greenhouse-production-release`, `greenhouse-postgres`, `greenhouse-cron-sync-ops`, `greenhouse-secret-hygiene`, `hubspot-greenhouse-bridge`, `notion-platform`, etc.
- Patrón de CI gate ya canonizado en el repo (`scripts/ci/route-reachability-gate.mjs`, `scripts/ci/vercel-cron-async-critical-gate.mjs`, `scripts/ci/worker-runtime-deps-gate.mjs`) — el token-budget gate replica este molde.

### Gap

- No existe un `scripts/ci/claude-md-token-budget.mjs` ni un budget declarado.
- No hay tabla-router "Dominio → skill/spec" al inicio de `CLAUDE.md`.
- Los ~150 bloques domain-specific viven inline en lugar de en sus skills/specs.
- Patrones canónicos (VIEW+helper+signal+lint; state-machine+CHECK+audit) están duplicados ~10× cada uno en distintos bloques.
- La regla del `documentation-governor` sigue mandando canonizar invariantes en `CLAUDE.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Inventory + classification map

- Script de análisis (`scripts/ci/claude-md-inventory.mjs` `[verificar/crear]`, throwaway o keep) que enumera cada sección H3 de `CLAUDE.md` con su tamaño en líneas/tokens.
- Clasificar cada sección en uno de: **keep** (cross-cutting, cada-task), **move-to-skill** (domain-specific con skill destino), **move-to-spec** (pertenece a una spec de `docs/architecture/`), **dedup** (instancia de un patrón repetido).
- Entregable committeable: `docs/operations/CLAUDE_MD_REFACTOR_MAP_<fecha>.md` con la tabla de clasificación + el destino de cada bloque + el keep-list cross-cutting acordado.

### Slice 2 — Token budget CI gate (va antes de la migración)

- `scripts/ci/claude-md-token-budget.mjs`: cuenta tokens (estimación chars/4 o tokenizer) de `CLAUDE.md` y falla si supera el budget. Warn-first (umbral alto inicial = tamaño actual) para no romper CI mientras se migra.
- Wire en `.github/workflows/ci.yml` (modo warn).
- Comando local `pnpm claude-md:budget` `[verificar nombre]`.

### Slice 3 — Move domain blocks → skills/specs (move-then-pointer)

- Para cada bloque `move-to-skill` / `move-to-spec` del mapa: mover el contenido al reference de la skill (o a la spec), verificar que queda alcanzable cuando la skill se invoca, y reemplazar el bloque en `CLAUDE.md` por un pointer de 1-2 líneas (qué dominio, qué skill/spec/lint cargar).
- Mirror Codex (`.codex/skills/**`) cuando la skill tenga par.
- Ejecutar por tandas por dominio (payroll, ICO, release, finance, notion, contractor, …), cada tanda un commit verificable.

### Slice 4 — Dedup canonical patterns

- Consolidar los patrones repetidos en un doc canónico (p.ej. `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` `[verificar/crear]`): "VIEW canónica + helper + reliability signal + lint", "state machine + CHECK + audit trio", "outbox + reactive consumer + dead-letter", "defense-in-depth 7-layer".
- Reemplazar las ~10 instancias inline de cada uno por un pointer al patrón + las particularidades de ese dominio (que ya viven en su skill/spec).

### Slice 5 — Router table + final structure + flip gate to error

- Tabla-router "Dominio/disparador → skill + spec" al inicio de `CLAUDE.md`.
- Pasada final de estructura: dejar solo lo cross-cutting (overview, stack, deploy envs, 360 model corto, operating loop, lifecycle, reglas transversales de una línea, router).
- Bajar el budget del gate al target (~40k tokens) y **flipear a error**.

### Slice 6 — Governance fix (anti re-acreción)

- Actualizar `greenhouse-documentation-governor` (Claude + Codex): los invariantes de dominio se canonizan en la **skill o la spec** del dominio; `CLAUDE.md` solo recibe un pointer. Documentar el budget gate como parte del cierre.

## Out of Scope

- Refactor de `AGENTS.md` (1.830 líneas) y `project_context.md` (5.991 líneas) — mismo patrón, scope separado (follow-ups).
- Cualquier **cambio semántico** de un invariante. Esta task SOLO relocaliza + deduplica. Mejorar/corregir una regla es otra task con review de su dominio.
- Borrar reglas. Todo se mueve o se consolida; nada se elimina sin destino.
- Crear skills nuevas. Si un bloque no tiene skill destino y no pertenece a una spec, se queda en `CLAUDE.md` (keep) o se le crea spec — pero crear skills nuevas es follow-up.

## Detailed Spec

- **Budget target:** ~25-40k tokens. Definir el número exacto en Slice 1 según cuánto sea genuinamente cross-cutting. El gate arranca en el tamaño actual (warn) y baja escalonado.
- **Keep-list (cross-cutting, se queda):** Project Overview/stack, Data Architecture (corto), Canonical 360 Object Model, Deploy Environments, Local-First Workflow, Operating Loop, Task/Issue Lifecycle, Documentation/QA gates (resumen), Secret Manager Hygiene (resumen), Migration markers, Canonical API error contract (resumen), `captureWithDomain`, PostgreSQL Access, Charts policy, Tooling CLIs, git hooks, avatar helper, y el router.
- **Move candidates (ejemplos):** todos los bloques keyed a un subsistema con skill — payroll participation/exit/contractor, ICO materializer/metrics/status-transition, release orchestrator/watchdog/preflight, finance CLP/FX/economic-category/ledger, notion sync/data-sources, SCIM, signature platform, etc.
- **Verificación de no-pérdida:** diff del set de `NUNCA`/`SIEMPRE` del `CLAUDE.md` original vs (nuevo `CLAUDE.md` ∪ skills/specs destino). Cero reglas huérfanas.

## Rollout Plan & Risk Matrix

`CLAUDE.md` es un artefacto de gobernanza versionado en git, no runtime de producción. El rollout es por commits reversibles; no hay DNS/migración/flag de producción. El riesgo material es **agent-governance** (perder o esconder una regla), no runtime.

### Slice ordering hard rule

- Slice 1 (inventory/map) → Slice 2 (gate, **antes** de la migración para medir) → Slice 3 (move) → Slice 4 (dedup) → Slice 5 (router + flip gate to error) → Slice 6 (governance).
- Slice 2 MUST ship antes de Slice 3/5: sin el gate no se mide el progreso ni se previene re-acreción durante el refactor.
- Slice 5 (flip a error) solo cuando Slices 3-4 cerraron y el budget real está bajo el target.
- Slice 6 (governance) puede correr en paralelo con Slice 5.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se pierde una regla load-bearing al mover | agent-governance | medium | move-then-pointer; auditoría diff de `NUNCA`/`SIEMPRE` original vs (nuevo ∪ skills/specs); review humano del git diff | grep audit: 0 reglas huérfanas |
| Pointer apunta a skill que no tiene el contenido movido | agent-governance | medium | mover contenido al destino + verificar invocando la skill ANTES de poner el pointer | spot-check: invocar la skill y confirmar la regla |
| Re-acreción post-refactor | agent-governance | high | token-budget CI gate (Slice 2 primero, error en Slice 5) + governance fix (Slice 6) | CI gate falla si `CLAUDE.md` > budget |
| Over-trimming de una regla cross-cutting | agent-governance | low | keep-list conservador acordado en Slice 1; review con `arch-architect` | spot-check: tasks comunes conservan sus reglas |
| Drift Claude vs Codex (mirror) | agent-governance | low | mover a la skill par `.codex/**` cuando exista; documentar el que no | revisar mirror por dominio |

### Feature flags / cutover

Sin flag — cambio de docs + CI gate. El "cutover" es el flip del gate de warn→error en Slice 5 (graduated). Revert: `git revert` del commit.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert (solo agrega un doc mapa) | <5 min | si |
| Slice 2 | revert gate / mantener warn | <5 min | si |
| Slice 3 | `git revert` de la tanda (el contenido sigue en git history + en la skill destino) | <10 min/tanda | si |
| Slice 4 | revert del dedup (pointers vuelven a inline) | <10 min | si |
| Slice 5 | revert router / bajar gate a warn | <10 min | si |
| Slice 6 | revert del cambio de skill | <5 min | si |

### Production verification sequence

1. Slice 1: correr el inventario, revisar el mapa de clasificación con el operador (¿keep-list correcto?).
2. Slice 2: gate en warn, CI verde.
3. Por cada tanda de Slice 3: mover → verificar destino alcanzable → pointer → `git diff` review → commit. Medir tokens (deben bajar).
4. Slice 4: dedup, re-medir.
5. Slice 5: confirmar budget < target, flipear gate a error, CI verde. **Prueba clave: spawn de un subagente Explore con un prompt no-trivial no supera el límite.**
6. Slice 6: governance actualizada; correr `pnpm docs:closure-check`.

### Out-of-band coordination required

N/A — repo-only change. Recomendado: validar el keep-list con el operador antes de Slice 3 (qué considera cross-cutting es una decisión suya).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `CLAUDE.md` queda bajo el budget target (~25-40k tokens) — medido por el gate.
- [ ] Existe `scripts/ci/claude-md-token-budget.mjs` wired en `ci.yml`, en modo `error` al cierre.
- [ ] Cada bloque domain-specific movido es alcanzable en su skill/spec (spot-check por dominio).
- [ ] Auditoría: cero reglas `NUNCA`/`SIEMPRE` del `CLAUDE.md` original quedan huérfanas (todas en el nuevo `CLAUDE.md` o en su destino).
- [ ] Ningún invariante fue editado semánticamente (solo relocado/consolidado) — verificable por diff.
- [ ] Existe la tabla-router "Dominio → skill/spec" al inicio de `CLAUDE.md`.
- [ ] Los patrones repetidos están consolidados en un doc canónico + pointers.
- [ ] `greenhouse-documentation-governor` (Claude + Codex) actualizado: invariantes de dominio → skill/spec + pointer.
- [ ] Un subagente Explore con un prompt no-trivial spawnea sin superar el límite de contexto.

## Verification

- `pnpm claude-md:budget` `[verificar nombre]` (el gate, verde bajo target).
- `pnpm docs:closure-check`
- `pnpm ops:lint --changed`
- Auditoría manual del diff de `NUNCA`/`SIEMPRE` (script de Slice 1 reutilizado).
- Smoke: invocar 3-4 skills de dominio (payroll, ICO, release, finance) y confirmar que sus invariantes movidos están presentes.
- Smoke: spawnear un subagente Explore con un prompt real y confirmar que no rompe por tamaño.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (AGENTS.md / project_context.md follow-ups)
- [ ] el set de reglas load-bearing quedó verificado sin pérdida (auditoría diff adjunta al cierre)

## Follow-ups

- **⚠️ TASK derivada (infra/harness) — el REAL fix del spawn de subagentes:** la verificación empírica (2026-06-16) mostró que un Explore **sigue fallando a ~204.879 tokens** con CLAUDE.md ya en 32.9k. El binding constraint son las **definiciones de tools MCP (~170k)** (Adobe Firefly ~60, Higgsfield ~50, Vercel ~25, Figma ~20, HubSpot ~18, Notion ~16, Semrush ~12, Spotify, Calendar, Metricool, GoDaddy, WordPress, Crossbeam…), NO CLAUDE.md. Para restaurar el spawn: desconectar los MCP servers no usados en el repo o que el harness los cargue diferidos (deferred). Fuera de scope de TASK-1160 (que es sobre CLAUDE.md). Ver §0.1 de `docs/operations/CLAUDE_MD_REFACTOR_MAP_2026-06-16.md`.
- **Slice 4 (dedup de patrones) — ✅ HECHO (2026-06-16):** los 6 patrones canónicos consolidados en `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (forma canónica única de cada patrón + reglas duras + fuente), registrado en `DECISIONS_INDEX.md` + en el índice Architecture Docs de CLAUDE.md. Aditivo (no quita las instancias de dominio → rule-audit sigue 0 huérfanas). Es la referencia para implementar un dominio nuevo sin inventar una forma propia.
- TASK derivada: aplicar el mismo router-refactor a `AGENTS.md` (1.830 líneas).
- TASK derivada: aplicar el mismo patrón a `project_context.md` (5.991 líneas).
- Evaluar un tokenizer real (no chars/4) para el gate si la estimación diverge mucho.

## Resultado (2026-06-16)

- **CLAUDE.md: 190.551 → 32.901 tokens (−83%)**, 6.191 → 1.360 líneas, 195 → ~85 secciones H3. Bajo la banda objetivo 30-35k.
- **0 reglas perdidas:** `pnpm claude-md:rule-audit` verificó 0 huérfanas (1.152 reglas `NUNCA`/`SIEMPRE` del baseline) tras cada una de las 23 tandas. Relocación verbatim, cero cambio semántico.
- Slices 1, 2, 3 (23 tandas), 5 (router + gate `--strict` @35k), 6 (governance fix Claude+Codex) cerrados. Slice 4 (dedup) = follow-up.
- 7 companions nuevos bajo `docs/architecture/agent-invariants/` + relocaciones a las specs canónicas existentes.

## Open Questions

- Budget target exacto (~25k vs ~40k): se fija en Slice 1 según cuánto sea genuinamente cross-cutting; decisión del operador.
- ¿Algún bloque domain-specific NO tiene skill destino y tampoco encaja en una spec? Esos casos: ¿se quedan en `CLAUDE.md` (keep) o se les crea spec? Resolver caso por caso en Slice 1.
