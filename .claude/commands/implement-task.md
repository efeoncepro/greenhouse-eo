---
description: Implementa una TASK-### Greenhouse local-first (Discovery → Audit → Plan → Slices → Gates de cierre) con skills + GVC + reliability.
argument-hint: TASK-###|### [notas opcionales, ej. "crea preview remoto" o "mantente en develop"]
---

# Implementar `$ARGUMENTS`

Vas a implementar la task indicada en `$ARGUMENTS` (formato `TASK-###` o número desnudo `###`; el resto son notas del operador). Por defecto **trabajas en `develop`, local-first, SIN push** (`local = taller`; el push remoto NO es cierre automático — espera instrucción explícita). Si toca UI, levanta `pnpm dev` y entrega la URL `localhost` exacta antes de pedir push.

> **Fuente de verdad = `CLAUDE.md` + `AGENTS.md` (ya en tu contexto) + las skills + la spec de la task.** Este command es solo el **harness de proceso + checklist de gates**. NO re-declara reglas: aplica las canónicas vigentes de esos documentos. Si este harness contradice a `CLAUDE.md`, gana `CLAUDE.md` — y avísame para corregir el command (ver "Auto-mantenimiento" al final).

Comunicación: español neutro latinoamericano (sin voseo/modismos argentinos). Calidad por defecto: robusta, segura, resiliente, escalable — causa raíz, no parches (`SOLUTION_QUALITY_OPERATING_MODEL_V1`).

---

## 0. Intake de la task

- **`in-progress/`**: lee el `.md` + `Handoff.md` + busca trabajo previo (commits en `develop`, WIP con `git status --short`). Continúa desde el primer slice incompleto; NO repitas fases ya hechas salvo drift (commits nuevos en `main`, schema cambiado, archivos owned movidos). Cuidado con orphan uncommitted de sesiones previas (clase TASK-943): ciérralo o stashealo antes de acoplar commits que dependan de él.
- **`to-do/`**: verifica que nadie la trabaja (`gh pr list --search "TASK-###"` + `git branch -a | grep TASK-###` vacíos) → mueve a `in-progress/`, `Lifecycle: in-progress`, sync `docs/tasks/README.md`, anota en `Handoff.md` (trabajo en develop local-first; sin branch salvo que el operador pida preview remoto), confirma bloque `## Dependencies & Impact`.
- Si la spec tiene `## Open Questions`: resuélvelas con la opción más robusta + documenta rationale antes de FASE 1. Bloqueante → detente y reporta.

## Subagentes

`Agent` tool (`Explore`, `general-purpose`, `Plan`) para paralelizar trabajo independiente — discovery cross-módulos, slices sin dependencias, verificación cruzada. Múltiples subagentes en **un solo mensaje**. Contexto autocontenido + qué skills invocar si van a escribir. No dupliques en el hilo lo que delegaste.

## Skills (invocar una vez por dominio, antes de escribir)

Elige según dominio (lista canónica y mandatos en `CLAUDE.md`): `greenhouse-backend` · `greenhouse-dev` · `greenhouse-ux` · `greenhouse-ux-writing` (TODO copy visible) · `greenhouse-postgres` · `gcp-bigquery` · `hubspot-greenhouse-bridge` · `greenhouse-cron-sync-ops`. **Mandatorias por gate**: `greenhouse-finance-accounting-operator` (cualquier finanzas/costos/fiscal/tesorería/P&L o trigger léxico contable), `greenhouse-payroll-auditor` (payroll/finiquito/KPI ICO), `greenhouse-documentation-governor` (cierre), `greenhouse-qa-release-auditor` (cierre no trivial). **UI** → loop obligatorio: diseña con `greenhouse-ux` + `modern-ui` + `state-design` + `forms-ux` + `greenhouse-ux-writing` + `typography-design` ANTES de JSX, corre los 2 gates Figma (token-mapping + primitive lookup), y **verifica con GVC** (`pnpm fe:capture`) en loop hasta que se vea enterprise (desktop+mobile). Nunca freehand ni "listo" sin captura mirada.

## Budget guardrail

Si llevas **>3 slices sin commit del primero**, **re-haces Discovery 2da vez**, o **3+ subagentes fallaron sobre el mismo problema**: detente y reporta (probable scope creep / supuesto roto / falta input). No sigas escribiendo código hasta resolver.

---

## FASE 1 — Discovery (read-only)
1. Lee la spec completa.
2. Lee los arch docs que declare + `DECISIONS_INDEX.md` (busca acá antes de tocar contratos compartidos) + `project_context.md` ("Estado vigente") + `Handoff.md`.
3. Explora `src/`, `migrations/`, `eslint-plugins/greenhouse/rules/`, `src/lib/reliability/queries/`, `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`. Encuentra helpers canónicos / VIEWs / primitives / signals / capabilities / lint rules ya existentes. **Subagentes `Explore` en paralelo** si >2 módulos.
4. **Schema real PG** (`db.d.ts` NO es source of truth): `pnpm pg:connect:status` + proxy `127.0.0.1:15432` (nunca IP pública). Valida tipos contra `information_schema.columns`. Toda SQL embebida con COALESCE/CASE/date-math se ejercita contra PG real antes de usarse (gate TASK-893).
5. Datos vivos para remediation/backfill: `pnpm staging:request <path>` (persona agente de menor privilegio) + `pnpm pg:connect:shell`.

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
Por módulo tocado/impactado: outbox events OUT/IN (`EVENT_CATALOG`) · webhooks · crons (clasifica async_critical/prod_only/tooling) · FKs/JOINs/VIEWs · tenant isolation · helpers reusables · reliability signals · capabilities (+ grant en `runtime.ts`, guard `capability-grant-coverage.test`) · tests transversales (column-parity, KPI anti-regresión, paridad SQL↔TS, drift-guards) · boundary workers `@core` + `worker:runtime-deps-gate` si tocás `src/lib/**` worker-bundled. **Subagentes en paralelo** si >2 módulos.

## FASE 4 — Plan (imprime; si P0/P1 o blast alto → STOP checkpoint humano)
Slices ordenados: migrations (`pnpm migrate:create`, marker `-- Up Migration`, DDL solo en Up, DO block anti pre-up-marker, CHECK NOT VALID+VALIDATE, backfill idempotente con dry-run, commit + `db.d.ts` juntos) → types → API routes (auth + capability least-privilege + validación + outbox v1 + `canonicalErrorResponse` es-CL + `captureWithDomain`) → helpers de dominio (single source of truth) → outbox events v1 (publisher + consumer que re-lee de PG) → reliability signals (key + kind + severity + steady=0 + reader + wire-up) → lint rules (override block + RuleTester) → UI (primitive lookup → Vuexy `Custom*` → MUI; tokens `theme.palette.*`/`theme.axis.*` + variants tipográficas, sin HEX/px/`fontSize` inline; copy via `getMicrocopy()`/`src/lib/copy`/`greenhouse-nomenclature`; charts ECharts→Apex→Recharts; ruta `(dashboard)` alcanzable o en `route-reachability-manifest`) → docs → ISSUE-###. Indica skill por item.

## FASE 5 — Implementación
Invoca el skill ANTES de Bash/Edit/Write. Reglas duras vigentes en `CLAUDE.md` (no las re-declaro). Recordatorios fáciles de olvidar: reutilizar > crear · tenant isolation en SQL · nunca `new Pool()` fuera de `src/lib/postgres/client.ts` · nunca `error.message`/prosa inglesa raw al cliente · nunca `Sentry.captureException` directo · nunca copy/HEX/`fontSize` hardcodeado · capability ⇒ grant en `runtime.ts` mismo slice (rol real de `role-codes.ts`) · viewCode ⇒ migration seed mismo PR · `pnpm` siempre · `printf %s` para secrets · `npx tsx --require ./scripts/lib/server-only-shim.cjs` para CLI server-only · `gtimeout` no `timeout`. Acciones destructivas/blast alto → confirma. Por slice: `pnpm local:check` + tests focales, commit `feat(<domain>): TASK-### Slice N — <título>` con co-author trailer; `git status --short` antes de commitear (no acoples orphan WIP). Lint/test roto ajeno → documenta y sigue; lint que destapa bug latente real → arréglalo.

## FASE 6 — Verificación + Cierre
**Gate local (el pre-push hook lint+tsc NO basta)**: `pnpm test` (full) + `pnpm build` (Turbopack) + `pnpm lint` 0 err + `pnpm tsc --noEmit` + `pnpm pg:doctor`. UI: `pnpm local:check:ui` + evidencia GVC desktop+mobile mirada. Workers tocados: `pnpm worker:runtime-deps-gate` + sin import `@core` worker-bundled + (post-push) 4 workflows Cloud Run en `success`. Checks: `grep -r "new Pool" src/` → 0 fuera del client · 0 `getServerAuthSession()` directo en pages/layouts · 0 error inglés raw en endpoints nuevos · signals nuevos en steady esperado · tests anti-regresión cubren el incidente (si cierra ISSUE).
**Runtime Rollout Completion Gate**: si depende de flags/env/migraciones/backfills/redeploy/integración externa no verificada → reporta `code complete, rollout pendiente`, NO "listo".
**Gates de skill**: `greenhouse-documentation-governor` (`pnpm docs:closure-check`) + `greenhouse-qa-release-auditor` (`pnpm qa:gates --changed` → `PASS | CONDITIONAL PASS | BLOCK`).
**Closing Protocol**: `Lifecycle: complete` + mover a `complete/` (carpeta ≡ Lifecycle) · sync `README.md` + `TASK_ID_REGISTRY.md` · `Handoff.md` + `changelog.md` (entry visible) · arch docs `## Delta` · `CLAUDE.md` solo si hay invariante duro nuevo · `EVENT_CATALOG`/`RELIABILITY_CONTROL_PLANE` Delta si aplica · doc funcional + manual si cambia comportamiento visible · impacto cruzado (`## Delta` a tasks que referencien archivos tocados) · ISSUE-### si cerró incidente.
**Push/PR**: solo con instrucción explícita. Si la hay: PR `gh pr create --base develop`; si aprueba merge directo → squash + esperar deploy + reproducir flow en vivo + signal en steady ANTES de marcar `complete`.

## Cierre
Resumen: slices, tests verdes, migrations, capabilities/events/signals, docs, KPI/data diff, evidencia GVC (si UI), estado de rollout (code-complete vs operativamente completo), próximo paso. NO "completada" mientras `Lifecycle: in-progress` siga vivo o falte una capa de rollout/documental.

---

## Auto-mantenimiento de este command
Si durante la task notás que este harness referencia un comando/gate/path/token **desactualizado** respecto a `CLAUDE.md`/`AGENTS.md`/skills/package.json, **flaggéalo al final** y propón el edit a este archivo (`.claude/commands/implement-task.md`). Si el drift toca la convivencia con Codex, correr también `pnpm codex:task-hook:check` y revisar `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`. El governor documental lo trata como doc viva del repo.
