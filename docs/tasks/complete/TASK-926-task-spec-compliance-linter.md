# TASK-926 — Task Spec Compliance Linter (`pnpm task:lint`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `develop` (operator override; no branch switch)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea `pnpm task:lint` — un linter de compliance estructural para los markdown de `docs/tasks/`, espejo del ya existente `pnpm design:lint` (que gatea CI via `design-contract.yml`). Convierte en enforcement mecánico las "reglas duras" del Task Lifecycle Protocol que hoy son 100% disciplina humana: zonas obligatorias del template, paridad `Lifecycle` ↔ carpeta, y paridad task ↔ `TASK_ID_REGISTRY.md`.

## Why This Task Exists

El repo tiene gobernanza de specs madura (template de 4 zonas, ADR index, lifecycle protocol) pero **ningún check automático valida que una task cumpla el contrato**. Consecuencias observables hoy:

- **Lifecycle drift**: el propio `docs/tasks/README.md` registra cierres como "closed 2026-05-05 — lifecycle drift" (TASK-110, TASK-115). El `Lifecycle:` del markdown y la carpeta donde vive se desincronizan sin que nada lo detecte, aunque CLAUDE.md lo declara regla dura ("una task no está cerrada si el archivo sigue en `in-progress/`").
- **Registry drift**: tasks pueden existir en `to-do/` sin fila en `TASK_ID_REGISTRY.md` (o viceversa). La asignación de IDs depende de leer marcadores "siguiente ID disponible" que ya están desactualizados en el registry.
- **Template incompleto silencioso**: una task `implementation` puede pasar a `in-progress` sin `Rollout Plan & Risk Matrix` (sección load-bearing canónica desde 2026-05-13) o sin `Acceptance Criteria`, y nadie lo nota hasta el cierre.

Es exactamente el gap que `design:lint` ya resolvió para el contrato visual: un parser declarativo + severity model + gate CI. Esta task replica ese patrón para el sistema de tasks — el artefacto más usado por todos los agentes (Claude, Codex, Cursor) que tocan el repo.

## Goal

- `pnpm task:lint` valida estructura, paridad lifecycle↔carpeta y paridad registry, con salida humana + `--format json`.
- Gate CI en modo `--changed` (solo tasks tocadas en el PR) para no bloquear por el backlog legacy pre-template.
- Cero falsos positivos sobre tasks legacy (`CODEX_TASK_*` y pre-template quedan exentas o warn-only).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SPEC_DRIVEN_DEVELOPMENT_V1.md` — **ADR que esta task implementa**. TASK-926 es la primera implementación de la escalera de promoción L0→L2: toma invariantes-prosa del Task Protocol (zonas, paridad lifecycle↔carpeta) y los lleva a L2 (check ejecutable). Respetar el patrón canónico §2.2 (check declarativo + rollout warn-first + legacy-exempt + gate CI).
- `docs/tasks/TASK_TEMPLATE.md` — fuente de verdad de las zonas y secciones obligatorias.
- `docs/tasks/TASK_PROCESS.md` — semántica de Type (`implementation` / `umbrella` / `policy`), Lightweight Mode, y qué secciones aplican a cada Type.
- `docs/tasks/README.md` — convención vigente (paridad carpeta ↔ `Lifecycle`).

Reglas obligatorias:

- El linter es **declarativo**: el catálogo de reglas vive en data, no en branches hardcodeados (mirror del `design:lint` rule catalog).
- **Type-aware**: tasks `umbrella`/`policy` NO exigen Zone 3 Detailed Spec ni Verification automatizada; `implementation` sí. Lightweight Mode (`P2+` + Effort `Low`) relaja documentación pesada.
- **Legacy-exempt**: tasks cuyo nombre matchea `CODEX_TASK_*` o que carecen del bloque `## Status` con `Lifecycle:` se tratan como legacy → exentas de reglas estructurales (a lo sumo warn). El contrato solo es duro para tasks formato template.
- Severity model espejo de `design:lint`: `error` bloquea siempre; `warning` bloquea solo en `--strict`.

## Normative Docs

- `eslint-plugins/greenhouse/` + `eslint.config.mjs` — referencia del patrón de rule catalog declarativo del repo (no se reusa el motor ESLint; se mira el patrón).
- `.github/workflows/design-contract.yml` — workflow de referencia a clonar para el gate.
- `scripts/ci/migration-marker-gate.mjs` y `scripts/ci/vercel-cron-async-critical-gate.mjs` — patrón canónico de CI gate en `scripts/ci/`.

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_SPEC_DRIVEN_DEVELOPMENT_V1.md` (ADR; esta task es su primera implementación)
- `docs/tasks/TASK_TEMPLATE.md` (estructura de zonas — contrato que el linter codifica)
- `docs/tasks/TASK_ID_REGISTRY.md` (fuente para la paridad registry)
- patrón `package.json` script + `scripts/ci/*.mjs` ya establecido

### Blocks / Impacts

- Habilita un follow-up (collision detector) — detector de colisiones de `## Files owned` cross-task, que comparte el parser de esta task.
- Impacta el flujo de creación/cierre de TODA task futura (gate adicional en PRs que tocan `docs/tasks/**`).

### Files owned

- `scripts/ci/task-lint.mjs` (nuevo — CLI + orquestación)
- `scripts/ci/task-lint/rules.mjs` (nuevo — catálogo declarativo de reglas)
- `scripts/ci/task-lint/parser.mjs` (nuevo — parse de frontmatter-like `## Status` + secciones)
- `.github/workflows/task-contract.yml` (nuevo — gate CI)
- `package.json` (script `task:lint`)
- `docs/tasks/TASK_PROCESS.md` (documentar el gate + cómo correrlo local)

## Current Repo State

### Already exists

- `pnpm design:lint` + `.github/workflows/design-contract.yml` con `STRICT_WARNINGS` — patrón completo a replicar.
- Husky pre-commit/pre-push hooks — defense in depth donde encaja un check rápido opcional.
- `docs/tasks/TASK_TEMPLATE.md` con las 4 zonas formalizadas y secciones canónicas marcadas.
- `docs/tasks/TASK_ID_REGISTRY.md` con la tabla `Task ID | Lifecycle | brief | archivo`.

### Gap

- No hay parser de tasks ni catálogo de reglas.
- No hay gate CI para `docs/tasks/**`.
- La paridad lifecycle↔carpeta y task↔registry es enforcement humano (y ya driftó al menos 2 veces documentadas).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Parser + rule engine foundation

- `scripts/ci/task-lint/parser.mjs`: lee un `.md` de task, extrae el bloque `## Status` (campos `Lifecycle/Priority/Impact/Effort/Type/Domain/...`), detecta presencia de cada sección canónica (`## Summary`, `## Goal`, `## Architecture Alignment`, `## Dependencies & Impact` con sub-`### Files owned`, `## Scope`, `## Rollout Plan & Risk Matrix`, `## Acceptance Criteria`, `## Verification`, `## Closing Protocol`), y clasifica la task como `template` vs `legacy`.
- `scripts/ci/task-lint/rules.mjs`: catálogo declarativo `{ id, severity, appliesTo: (task)=>bool, check: (task)=>Finding[] }`.

### Slice 2 — Structural + parity rules

- Reglas estructurales (solo `template` tasks): zonas obligatorias presentes según Type; `Acceptance Criteria` con ≥1 checkbox; `implementation` exige `Rollout Plan & Risk Matrix` no vacía (no "N/A" sin razón para dominios sensibles — warn).
- Regla de paridad **lifecycle↔carpeta**: el campo `Lifecycle:` debe coincidir con la carpeta (`to-do`/`in-progress`/`complete`). `error`.
- Regla de paridad **registry**: cada task `template` en una carpeta tiene fila en `TASK_ID_REGISTRY.md`, y el `Lifecycle` del registry coincide. `error` para missing, `warning` para lifecycle mismatch. **Esta regla nace y permanece `warning`-only más tiempo que el resto** (el registry es una tabla hecha a mano que ya sabemos driftada): el primer run destapará deuda pre-existente del registry como una avalancha de findings → se **tría aparte como limpieza**, NO se trata como bloqueo. Flip a `error` solo cuando el registry esté saneado.
- Regla de **next-id marker** (ajuste post-review arquitectura 2026-05-24): el marcador "siguiente ID disponible: `TASK-###`" en `docs/tasks/README.md` debe ser `max(ID en TASK_ID_REGISTRY) + 1`. `warning` si está desactualizado. Es el drift class que más nos pega (lo venimos bumpeando a mano 924→925→926→927). Idealmente la fuente de verdad del next-id se **deriva del registry** (`max+1`), reduciendo el marcador a algo verificable en vez de mantenido a mano — el linter al menos lo valida.

### Slice 3 — CLI surface

- `scripts/ci/task-lint.mjs`: orquesta parser+rules sobre `docs/tasks/{to-do,in-progress,complete}/*.md`.
- Flags: `--format json|human` (default human), `--strict` (warnings bloquean), `--changed` (solo archivos del diff vs `origin/<base>`), `--task TASK-###` (focal).
- `package.json`: script `"task:lint": "node scripts/ci/task-lint.mjs"`.
- Exit codes: 0 clean, 1 errores (o warnings en `--strict`).

### Slice 4 — CI gate + docs

- `.github/workflows/task-contract.yml`: corre `pnpm task:lint --changed --strict` en PRs con paths `docs/tasks/**`. Clonar setup pnpm+Node canónico (`pnpm/action-setup@v6` ANTES de `setup-node@v5`).
- Documentar en `TASK_PROCESS.md`: cómo correr local, qué bloquea, cómo eximir legacy.
- Rollout warn-first: el workflow arranca en modo no-strict (warnings visibles, no bloquean) hasta confirmar 0 falsos positivos sobre el backlog tocado; flip a `--strict` en un commit posterior.

## Out of Scope

- **Detector de colisiones de `## Files owned`** cross-task → follow-up separado (reusa este parser).
- Validación de que los ADR referenciados en `Depends on` existen y están `Accepted` → follow-up separado.
- Auto-fix / auto-mover archivos entre carpetas. El linter solo reporta; el agente corrige.
- Reescritura / reformateo del backlog legacy `CODEX_TASK_*`.

## Detailed Spec

El parser NO usa un parser markdown pesado: opera por líneas (regex de headings `^## ` / `^### ` + extracción del bloque `## Status` con pares `- Campo: \`valor\``), espejo del enfoque liviano de `scripts/ci/*.mjs`. Sin dependencias nuevas en `package.json`.

**Tolerancia a valores multi-línea/prosa en `## Status`** (ajuste post-review arquitectura 2026-05-24): campos como `Blocked by:` hoy contienen párrafos largos (ej. TASK-921 con prosa multi-línea, backticks y enlaces). El parser NO debe asumir un valor de una sola línea: extrae el valor del campo hasta el próximo `- Campo:` o el fin del bloque `## Status`. Fixture real obligatorio con un `Blocked by:` multi-línea del backlog vigente.

Clasificación `template` vs `legacy`: una task es `template` si el filename matchea `^TASK-\d{3}-` Y contiene un bloque `## Status` con `Lifecycle:`. Cualquier otra (`CODEX_TASK_*`, briefs, specs reclasificadas) es `legacy` → solo se le aplican reglas de paridad registry en modo `warning`, nunca estructurales.

Finding shape: `{ file, rule, severity, line?, message }`. Salida JSON: `{ errors: Finding[], warnings: Finding[], summary: { tasksScanned, templateTasks, legacyTasks } }` — mismo shape filosófico que `design:lint --format json` para que un futuro dashboard lo consuma.

## Rollout Plan & Risk Matrix

Cambio aditivo de tooling + doc. No toca runtime productivo, ni SCIM/payroll/finance/release/identity/cron/outbox/migrations. Sin feature flags de runtime; el "flag" es el modo del workflow (warn → strict).

### Slice ordering hard rule

- Slice 1 (parser) → Slice 2 (rules, depende del shape del parser) → Slice 3 (CLI, depende de rules) → Slice 4 (CI gate, depende del CLI).
- El gate CI (Slice 4) arranca **warn-only**; el flip a `--strict` es un paso posterior verificado, NO parte del primer merge.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Falsos positivos bloquean PRs legítimos | CI / DX | medium | modo `--changed` (solo PR diff) + warn-first rollout + legacy-exempt | PRs rojos por task-contract; revisar findings |
| Parser frágil ante variaciones de formato del template | tooling | medium | reglas tolerantes (presencia de heading, no contenido exacto) + tests con fixtures reales del backlog | tests de fixtures fallan |
| Backlog legacy dispara ruido | CI / DX | high (si no se exime) | clasificación `legacy` explícita + reglas estructurales solo a `template` | volumen de warnings en primer run |
| Deuda pre-existente del registry sale como avalancha en el primer run | DX / governance | high | regla registry-parity nace `warning`-only + se tría como limpieza separada, NO bloqueo; flip a `error` solo post-saneo | volumen de findings registry en primer run |

### Feature flags / cutover

Sin flag de runtime. Cutover en dos pasos: (1) workflow warn-only al merge; (2) flip a `--strict` post verificación de 0 falsos positivos sobre PRs reales. Revert: quitar `--strict` del workflow (1 línea) o disable del workflow.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-3 | revert PR (solo agrega scripts + 1 línea package.json) | <5 min | sí |
| Slice 4 | quitar `--strict` o disable `task-contract.yml` | <5 min | sí |

### Production verification sequence

1. `pnpm task:lint --format json` local sobre todo el backlog → revisar que `legacyTasks` no genera errors, solo `templateTasks` evaluadas.
2. Crear un PR de prueba que toque una task con drift intencional (lifecycle mismatch) → verificar que el gate lo detecta.
3. Merge con workflow warn-only → observar findings sobre PRs reales ~1 semana.
4. Flip a `--strict` cuando los findings sean 0 falsos positivos.

### Out-of-band coordination required

N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `pnpm task:lint` corre sin crashear sobre el backlog completo y reporta summary (`tasksScanned/templateTasks/legacyTasks`).
- [x] Detecta lifecycle↔carpeta mismatch como `error` (verificado con fixture).
- [x] Detecta task `template` en carpeta sin fila en `TASK_ID_REGISTRY.md` (regla registry-parity, `warning`-only en V1 hasta saneo del registry; flip a `error` posterior).
- [x] Detecta marcador "siguiente ID disponible" desactualizado vs `max(ID registry)+1` como `warning`.
- [x] Tasks `CODEX_TASK_*` y briefs no generan `error` estructural (solo paridad registry warn).
- [x] Parsea correctamente un `## Status` con `Blocked by:` multi-línea/prosa (fixture real del backlog, ej. TASK-921) sin truncar ni romper.
- [x] `--format json` emite shape `{ errors, warnings, summary }`.
- [x] `--changed` limita el scan al diff del PR.
- [x] `.github/workflows/task-contract.yml` corre en PRs que tocan `docs/tasks/**` (warn-only en el primer merge).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm task:lint --format json` ejecutado sobre el backlog real (validación manual del summary)

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` sincronizado con el cierre
- [x] `Handoff.md` actualizado si hubo aprendizajes/deuda
- [x] `changelog.md` actualizado (gate CI nuevo = protocolo visible)
- [x] chequeo de impacto cruzado (follow-up collision detector declarado)
- [x] `pnpm task:lint` corre verde sobre sí misma (esta task debe pasar su propio linter)

## Delta 2026-05-24

V1 shipped en `develop` por override del operador (sin branch switch). Entrega `pnpm task:lint` con parser reusable, rule catalog declarativo, CLI human/JSON, `--changed`, `--task`, `--strict`, tests focales y workflow `.github/workflows/task-contract.yml` en rollout warn-first. El modo backlog completo reporta deuda historica como warnings para no bloquear por formatos pre-template; `--changed` y `--task` mantienen errores duros para drift nuevo/focal. No toca runtime, DB, Payroll, access model ni UI.

## Follow-ups

- Files-owned collision detector (siguiente ID libre al crearla; reusa el parser de TASK-926): dado un diff, lista qué tasks declaran ownership de los archivos tocados y avisa solapamientos. Cierra el gap #1 del audit SDD.
- Validación de referencias ADR en `Depends on` (existencia + status `Accepted`).
- Considerar correr `task:lint` en el Husky pre-commit (solo `--changed`, fast) como defense in depth.

## Open Questions

- ¿El gate debe vivir en un workflow propio (`task-contract.yml`) o como step dentro de `ci.yml`? Propuesta: workflow propio, espejo de `design-contract.yml`, para path-filtering limpio.
- ¿Lightweight Mode debe relajar también `Rollout Plan & Risk Matrix` a warn? Propuesta: sí para `umbrella`/`policy`; para `implementation` Lightweight, mantener el bloque obligatorio pero aceptar la plantilla mínima "N/A — additive".
