---
description: Implementa una TASK-### Greenhouse local-first (Discovery → Audit → Plan → Slices → Gates de cierre) con skills + GVC + reliability.
argument-hint: TASK-###|### [notas opcionales, ej. "crea preview remoto" o "mantente en develop"]
---

# Implementar `$ARGUMENTS`

Vas a implementar la task indicada en `$ARGUMENTS` (formato `TASK-###` o número desnudo `###`; el resto son notas del operador). Resuelve la rama desde el contrato del repositorio: **Greenhouse `develop`; Globe `main`; local-first y SIN push automático**. Una task no crea ramas `task/*`. Si toca UI, levanta `pnpm dev` y entrega la URL `localhost` exacta antes de pedir push.

> **Fuente de verdad = `CLAUDE.md` + `AGENTS.md` (ya en tu contexto) + las skills + la spec de la task.** Este command es solo el **harness de proceso + checklist de gates**. NO re-declara reglas: aplica las canónicas vigentes de esos documentos. Si este harness contradice a `CLAUDE.md`, gana `CLAUDE.md` — y avísame para corregir el command (ver "Auto-mantenimiento" al final).

> **Workspace obligatorio:** usa exclusivamente el checkout compartido actual. Nunca crees, uses, limpies ni
> muevas trabajo a worktrees, checkouts aislados o carpetas clonadas; ante WIP, conflicto o divergencia, detente y
> pide decisión al operador.

Comunicación: español neutro latinoamericano (sin voseo/modismos argentinos). Calidad por defecto: robusta, segura, resiliente, escalable — causa raíz, no parches (`SOLUTION_QUALITY_OPERATING_MODEL_V1`).

---

## 0. Intake de la task

- **Contrato de contexto**: antes de discovery, lee `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`.
  Usa `project_context.md` como router vigente y `Handoff.md` como continuidad activa; no cargues snapshots
  completos al arranque. Si falta contexto load-bearing, busca por keyword en task/issue/ADR/runtime y luego en
  `docs/operations/agent-context-history/`; revalida cualquier hallazgo histórico antes de obedecerlo.
- **`in-progress/`**: lee el `.md` + `Handoff.md` + busca trabajo previo en la rama canónica del repositorio y con `git status --short`. Continúa desde el primer slice incompleto; NO repitas fases ya hechas salvo drift. Si hay WIP huérfano o ajeno, preserva sus archivos y coordina ownership/secuencia; nunca uses stash, clean, restore, otra rama o checkout para apartarlo.
- **`to-do/`**: verifica que nadie la trabaja (`gh pr list --search "TASK-###"` + handoff/ownership vigente) → mueve a `in-progress/`, `Lifecycle: in-progress`, sync `docs/tasks/README.md`, anota en `Handoff.md` sobre la rama canónica y confirma `## Dependencies & Impact`. No crees una rama por task.
- Si la spec tiene `## Open Questions`: resuélvelas con la opción más robusta + documenta rationale antes de FASE 1. Bloqueante → detente y reporta.

## Subagentes

`Agent` tool (`Explore`, `general-purpose`, `Plan`) para paralelizar trabajo independiente — discovery cross-módulos, slices sin dependencias, verificación cruzada. Múltiples subagentes en **un solo mensaje**. Contexto autocontenido + qué skills invocar si van a escribir. No dupliques en el hilo lo que delegaste.

## Objetivo de sesión (`/goal`)

`/goal` es un **slash command built-in de Claude Code** (no vive en `.claude/commands/`; no crees `goal.md`). Sintaxis: `/goal [condition|clear]`. Sin argumento muestra el objetivo vigente o el último alcanzado; `clear`/`stop`/`off`/`reset`/`none`/`cancel` lo retira.

**Implicación de autonomía — leer antes de fijar uno:** `/goal` NO es una nota de acuerdo. Dispara **continuación autónoma turno tras turno** hasta cumplir la condición. Si la condición incluye acciones que gastan o mutan runtime (canaries facturables de Globe, fondeo, deploys, promociones), el agente avanza solo a través de ese gasto **sin checkpoint humano intermedio**. Por eso el alcance del goal es una decisión de riesgo, no de estilo.

Reglas al escribirlo:

- Si la condición cruza gasto real, deploy, promoción o mutación de runtime, **decláralo explícitamente** en el texto; si no se autoriza, acota la condición para detenerse antes de esa frontera.
- La condición debe ser **evaluable** (alguien externo puede responder sí/no), no prosa aspiracional.
- Debe declarar: objetivo de cierre · evidencia obligatoria · límites de alcance (qué NO se toca) · estado correcto si falta rollout (`code complete, rollout pendiente` u `operativamente bloqueado`) · si conviene `mantente en develop` y si se autorizan subagentes.
- Ante transporte ambiguo (no se sabe si el efecto ocurrió): **leer readers/estado antes de reintentar**, nunca un segundo submit a ciegas.

**Cuándo fijarlo — en FASE 4, no en FASE 0.** Este harness tiene checkpoints humanos en FASE 2, FASE 3 y FASE 4 (`si P0/P1 o blast alto → STOP checkpoint humano`). Un `/goal` fijado antes de arrancar **pasa de largo por los tres**: el goal no conoce los checkpoints del command. Secuencia canónica: `/implement-task <###>` corre FASES 1–4 e imprime el plan → el operador mira el plan → recién ahí se fija el `/goal` para empujar FASES 5–6. Así la condición cita los slices reales en vez de una aspiración. En P0/P1 o blast alto ese orden es obligatorio, no preferencia.

**La condición hereda los gates de este harness.** Un goal amplio optimiza hacia su condición y se come el ritmo por slice. Incluye siempre: *"por cada slice `pnpm local:check` + tests focales y commit `feat(<domain>): TASK-### Slice N — <título>`, con `git status --short` antes de commitear para no acoplar WIP ajeno; al cerrar `pnpm test` completo + `pnpm build` de producción"*.

**Mal motor para UI y para runtime.** El evaluador del goal juzga texto, no ve imágenes ni runtime: puede cerrar con "los cuatro gates pasaron" mientras la pantalla se ve genérica, o dar por buena una afirmación de que algo funciona en producción. En UI el goal sirve para llegar hasta los gates, no para declarar calidad visual; y `code complete ≠ operationally complete`.

**Nunca `/loop` sobre este command.** Es un pipeline lineal con fases: cada disparo lo reiniciaría desde Discovery, y el Budget guardrail de más arriba declara que re-hacer Discovery una segunda vez es señal de scope creep y hay que detenerse. `/loop` es para relojes ajenos (canary, proveedor async, deploy, CI, otra sesión), no para trabajo propio. Detalle de ambos mecanismos: skills `claude-goal-command` y `claude-loop-command`.

Contenido canónico compartido con Codex (mismo contrato, distinto mecanismo): `docs/operations/CODEX_EXECUTION_PROMPT_V1.md` §GOAL PREFLIGHT y §UI/UX GOAL GUARD.

## Skills (invocar una vez por dominio, antes de escribir)

Elige según dominio (lista canónica y mandatos en `CLAUDE.md`): `greenhouse-backend` · `greenhouse-dev` · `greenhouse-ux-writing` (TODO copy visible) · `greenhouse-postgres` · `gcp-bigquery` · `hubspot-greenhouse-bridge` · `greenhouse-cron-sync-ops`. **Mandatorias por gate**: `greenhouse-finance-accounting-operator` (cualquier finanzas/costos/fiscal/tesorería/P&L o trigger léxico contable), `greenhouse-payroll-auditor` (payroll/finiquito/KPI ICO), `greenhouse-documentation-governor` (cierre), `greenhouse-qa-release-auditor` (cierre no trivial). **UI** → fija `/goal TASK-### UI enterprise-ready` y usa `greenhouse-ai-design-studio` como orquestador canónico antes de JSX/copy visible; carga sus lanes reales de arquitectura, implementación, Vuexy, UX/content, tipografía, motion y review. Fija dirección visual versionada, recipe/Composition Shell, jerarquía de acciones, estados, responsive y un momento visual dominante; aplica presupuesto de chrome (máximo tres superficies `contained` en el first fold normal) y bloquea card-on-card sin frontera semántica. Ejecuta los contratos wireframe/flow/motion/readiness y los cuatro gates independientes: `pnpm design-contract:lint --task TASK-###`, `pnpm ui:code-lint --changed`, `pnpm ui:visual-gate --task TASK-###`, `pnpm ui:quality --task TASK-###`. GVC premium desktop+390px debe quedar mirado, sin overflow ni findings; score medio ≥4.5, piso ≥4 y jerarquía/economía de superficies/impacto visual/fidelidad/resistencia genérica ≥4.5. Nunca freehand ni "listo" por tokens correctos solamente.

## Budget guardrail

Si llevas **>3 slices sin commit del primero**, **re-haces Discovery 2da vez**, o **3+ subagentes fallaron sobre el mismo problema**: detente y reporta (probable scope creep / supuesto roto / falta input). No sigas escribiendo código hasta resolver.

---

## FASE 1 — Discovery (read-only)

1. Lee la spec completa.
2. Lee los arch docs que declare + `DECISIONS_INDEX.md` (busca acá antes de tocar contratos compartidos) + `project_context.md` ("Estado vigente") + `Handoff.md`.
3. Explora `src/`, `migrations/`, `eslint-plugins/greenhouse/rules/`, `src/lib/reliability/queries/`, `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`. Encuentra helpers canónicos / VIEWs / primitives / signals / capabilities / lint rules ya existentes. **Subagentes `Explore` en paralelo** si >2 módulos.
4. Lee `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` y valida `## Modular Placement Contract`: current home real, candidate home solo como metadata, primitive/boundary canónico, browser/server split, build impact y extraction blocker. Si falta o tiene placeholders, corrige la task antes de implementar; nunca anticipes `apps/*`/`packages/*` desde una feature aislada.
5. **Schema real PG** (`db.d.ts` NO es source of truth): `pnpm pg:connect:status` + proxy `127.0.0.1:15432` (nunca IP pública). Valida tipos contra `information_schema.columns`. Toda SQL embebida con COALESCE/CASE/date-math se ejercita contra PG real antes de usarse (gate TASK-893).
6. Datos vivos para remediation/backfill: `pnpm staging:request <path>` (persona agente de menor privilegio) + `pnpm pg:connect:shell`.
7. **Si la task es UI (`Execution profile: ui-ux` / `UI impact != none`) — REGLA DURA, leer antes de cualquier JSX:** lee COMPLETOS los docs declarados en `## Status` — `Wireframe`, `Flow`, `Motion` — Y el **master UI flow del programa** (`docs/ui/flows/EPIC-###-…-UI-FLOW.md`) cuando la superficie es parte de un programa multi-surface. Son el **contrato de diseño**: implementa la UI DESDE ellos (layout/regiones, estados/outcomes, copy ids es-CL, primitive decision, readers/commands, motion, a11y) — NUNCA freehand ni improvisando. Tu superficie es un **nodo del flujo cross-surface**, no una pantalla aislada: respeta su conexión con las demás (mismo modelo/render compartido, resolución por entitlement, command map de parity). **Si esos docs faltan o son stubs vacíos/genéricos (escritos solo para pasar el lint), DETENTE**: la task no está `UI ready` — falta el trabajo de product-design (no lo suplas improvisando; reporta y, si corresponde, autoralo con las skills product-design + el robustness gate del task-planner antes de implementar).

## FASE 2 — Auditoría (imprime, no avances sin)

    --- AUDIT: TASK-### ---
    SUPUESTOS CORRECTOS:        - <ítem> — verificado en <path/SQL/test>
    SUPUESTOS DESACTUALIZADOS:  - spec dice X, realidad Y (<path>) → acción
    CÓDIGO REUTILIZABLE:        - <qué> → <path:línea>
    DEPENDENCIAS FALTANTES:     - <bloqueantes>
    RIESGOS BLAST RADIUS:       - <archivos owned / consumers downstream / registries compartidos>
    OPEN QUESTIONS RESUELTAS:   - <Q → resolución → rationale>

Cosmético desactualizado → recalibra la spec primero (`docs(TASK-###): baseline recalibration pre-execution`). Bloqueante → detente, reporta, espera.

## FASE 3 — Mapa de conexiones (imprime, no avances sin)

Por módulo tocado/impactado: outbox events OUT/IN (`EVENT_CATALOG`) · webhooks · crons (clasifica async_critical/prod_only/tooling) · FKs/JOINs/VIEWs · tenant isolation · helpers reusables · reliability signals · capabilities (+ grant en `runtime.ts`, guard `capability-grant-coverage.test`) · tests transversales (column-parity, KPI anti-regresión, paridad SQL↔TS, drift-guards) · boundary workers `@core` + `worker:build-contract-gate` + `worker:runtime-deps-gate` si tocas build inputs o `src/lib/**` worker-bundled. **Subagentes en paralelo** si >2 módulos.

## FASE 4 — Plan (imprime; si P0/P1 o blast alto → STOP checkpoint humano)

Slices ordenados: migrations (`pnpm migrate:create`, marker `-- Up Migration`, DDL solo en Up, DO block anti pre-up-marker, CHECK NOT VALID+VALIDATE, backfill idempotente con dry-run, commit + `db.d.ts` juntos) → types → API routes (auth + capability least-privilege + validación + outbox v1 + `canonicalErrorResponse` es-CL + `captureWithDomain`) → helpers de dominio (single source of truth) → outbox events v1 (publisher + consumer que re-lee de PG) → reliability signals (key + kind + severity + steady=0 + reader + wire-up) → lint rules (override block + RuleTester) → UI (primitive lookup → Vuexy `Custom*` → MUI; tokens `theme.palette.*`/`theme.axis.*` + variants tipográficas, sin HEX/px/`fontSize` inline; copy via `getMicrocopy()`/`src/lib/copy`/`greenhouse-nomenclature`; charts ECharts→Apex→Recharts; ruta `(dashboard)` alcanzable o en `route-reachability-manifest`) → docs → ISSUE-###. Indica skill por item.

## FASE 5 — Implementación

Invoca el skill ANTES de Bash/Edit/Write. Reglas duras vigentes en `CLAUDE.md` (no las re-declaro). Recordatorios fáciles de olvidar: reutilizar > crear · tenant isolation en SQL · nunca `new Pool()` fuera de `src/lib/postgres/client.ts` · nunca `error.message`/prosa inglesa raw al cliente · nunca `Sentry.captureException` directo · nunca copy/HEX/`fontSize` hardcodeado · capability ⇒ grant en `runtime.ts` mismo slice (rol real de `role-codes.ts`) · viewCode ⇒ migration seed mismo PR · `pnpm` siempre · `printf %s` para secrets · `npx tsx --require ./scripts/lib/server-only-shim.cjs` para CLI server-only · `gtimeout` no `timeout`. Acciones destructivas/blast alto → confirma. Por slice: `pnpm local:check` + tests focales, commit `feat(<domain>): TASK-### Slice N — <título>` con co-author trailer; `git status --short` antes de commitear (no acoples orphan WIP). Lint/test roto ajeno → documenta y sigue; lint que destapa bug latente real → arréglalo.

## FASE 6 — Verificación + Cierre

**Gate local (el pre-push hook lint+tsc NO basta)**: `pnpm test` (full) + `pnpm build` (Turbopack) + `pnpm lint` 0 err + `pnpm typecheck` (NO `tsc --noEmit` crudo — OOM bajo el Node 20 al que Volta ata `pnpm`, ISSUE-104) + `pnpm pg:doctor`. UI: contratos wireframe/flow/motion/readiness + `pnpm design-contract:lint --task TASK-###` + `pnpm ui:code-lint --changed` + `pnpm ui:visual-gate --task TASK-###` + `pnpm ui:quality --task TASK-###` + `pnpm local:check:ui` + evidencia GVC premium desktop+mobile mirada. Workers tocados: `pnpm worker:build-contract-gate` + `pnpm worker:runtime-deps-gate` + sin import `@core` worker-bundled + (post-push) 4 workflows Cloud Run en `success`. Checks: `grep -r "new Pool" src/` → 0 fuera del client · 0 `getServerAuthSession()` directo en pages/layouts · 0 error inglés raw en endpoints nuevos · signals nuevos en steady esperado · tests anti-regresión cubren el incidente (si cierra ISSUE).
**Runtime Rollout Completion Gate**: si depende de flags/env/migraciones/backfills/redeploy/integración externa no verificada → reporta `code complete, rollout pendiente`, NO "listo".
**Gates de skill**: `greenhouse-documentation-governor` (`pnpm docs:closure-check`) + `greenhouse-qa-release-auditor` (`pnpm qa:gates --changed` → `PASS | CONDITIONAL PASS | BLOCK`). Si los cambios tocan `docs/commercial/tenders/<slug>/`, el reporte ejecuta además el gate fail-closed `pnpm tender:canonical-gate <slug>`; no marques la licitación como cerrada mientras no entregue `status=verified`.
Si el trabajo toca `greenhouse-globe-model-fleet`, sus route cards o el contrato de cables: `pnpm model-fleet:validate -- --strict-freshness` + `pnpm skills:mirrors`.
**Closing Protocol**: `Lifecycle: complete` + mover a `complete/` (carpeta ≡ Lifecycle) · sync `README.md` + `TASK_ID_REGISTRY.md` · actualizar `Handoff.md` solo con continuidad activa (riesgos, rollout pendiente y próximo paso) · actualizar `project_context.md` solo si cambió un contrato durable o su ruta canónica · `changelog.md` solo ante cambio real de producto/runtime/workflow y como ventana reciente; historia en `docs/changelog/internal/`, rotación con `pnpm docs:context-rotate --apply` · actualizar el contenido vigente de arquitectura/ADR, sin crear cronología automática `## Delta` · `CLAUDE.md` solo si su contrato independiente exige una invariante dura nueva · `EVENT_CATALOG`/`RELIABILITY_CONTROL_PLANE` si aplica · doc funcional + manual si cambia comportamiento visible · impacto cruzado en los documentos canónicos que referencien contratos tocados · ISSUE-### si cerró incidente · ejecutar `pnpm docs:context-check:strict` si cambió `AGENTS.md`, `project_context.md`, `Handoff.md`, `Handoff.archive.md`, `changelog.md`, `docs/changelog/internal/**` o el router/modelo de contexto — **es el ÚLTIMO comando antes del commit, después de la última edición documental: `docs:closure-check` NO lo incluye** y tocar `Handoff.md`/`changelog.md` después invalida su resultado (así llegó un CI rojo a `develop` el 2026-08-09). Si pide rotar: `pnpm docs:context-rotate --apply` → repetir strict.
**Push/PR**: solo con instrucción explícita. Si la hay: PR `gh pr create --base develop`; si aprueba merge directo → squash + esperar deploy + reproducir flow en vivo + signal en steady ANTES de marcar `complete`.

## Cierre

Resumen: slices, tests verdes, migrations, capabilities/events/signals, docs, KPI/data diff, evidencia GVC (si UI), estado de rollout (code-complete vs operativamente completo), próximo paso. NO "completada" mientras `Lifecycle: in-progress` siga vivo o falte una capa de rollout/documental.

---

## Auto-mantenimiento de este command

Si durante la task notas que este harness referencia un comando/gate/path/token **desactualizado** respecto a `CLAUDE.md`/`AGENTS.md`/skills/package.json, **márcalo al final** y propón el edit a este archivo (`.claude/commands/implement-task.md`). Si el drift toca la convivencia con Codex, correr también `pnpm codex:task-hook:check` y revisar `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`. El governor documental lo trata como doc viva del repo.
