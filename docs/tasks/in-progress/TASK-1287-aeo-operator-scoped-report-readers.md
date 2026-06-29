# TASK-1287 — AEO Operator-Scoped Report Readers (cockpit cross-org + detalle operador)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1287-aeo-operator-scoped-report-readers`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Foundation backend de los **dos readers operador-scoped** que la vista operador AEO (TASK-1276) consume y que hoy NO existen: (1) `readOperatorCrossOrgAeoScores` — agregado del **cockpit** (`/growth/aeo`): orgs con AEO entitlement + último run + score, en el scope del operador; (2) `readOperatorScopedAeoReport({ organizationId })` — el **reporte por-org en scope operador** (cualquier org del scope + prospectos), distinto del reader client-scoped de TASK-1243 (que está atado a `requireClientTenantContext` del portal). Reader-only, additive, sin migración. Cierra el hueco que dejaba a TASK-1276 declarando `Backend impact: none` con un Open Question pidiendo un reader inexistente.

## Why This Task Exists

TASK-1276 (vista operador) reusa el report model de TASK-1248, pero el reader de TASK-1243 es **client-scoped**: deriva la org desde el tenant del cliente vía `requireClientTenantContext`. El operador necesita el patrón inverso — leer el reporte de **cualquier org en su scope** (clientes contratados/trial + prospectos sincronizados de HubSpot), no la suya. Además el cockpit cross-cliente necesita un **agregado** (lista de orgs con AEO + score + último run) que ningún reader vigente entrega: TASK-1277 expone `resolveAeoEntitlement(organizationId)` (entitlement, una org), TASK-1275 expone `readRecommendationStatuses(organizationId)` (status, una org), TASK-1286 escribe tiers. El read operador del reporte y el agregado cross-org son la pieza backend que falta para que TASK-1276 sea UI pura.

## Goal

- Reader `readOperatorScopedAeoReport({ organizationId })` que devuelve el mismo modelo de reporte que consume TASK-1248/1252/1276, resuelto por **scope de org del operador** (no por tenant cliente), reusando el report builder canónico (TASK-1235) sin forkear scoring.
- Reader `readOperatorCrossOrgAeoScores()` que devuelve la lista de orgs con AEO (entitlement `contracted|trial|pilot`) + último run + score agregado, para el cockpit.
- Capability de lectura operador `growth.ai_visibility.report.read_operator` + grant a roles internos (mismo PR, coverage test), capability-gated (V1: un interno con la capability lee cualquier client-org — alineado con el grant operador de TASK-1277; el scoping per-AM no existe como primitive y queda follow-up), honest degradation (`null` ≠ `0` cuando no hay run).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability + grant mismo PR)

Reglas obligatorias:

- NO forkear el report builder ni el scoring: reusar el primitive de TASK-1235 (`modelFromClientReport` / report assembly) cambiando SOLO la resolución de scope (operador vs cliente).
- Tenant-safe: el operador solo lee orgs en su scope; NUNCA un reader que devuelva cualquier org sin gate. El read client-scoped de TASK-1243 NO se toca (sigue atado a `requireClientTenantContext`).
- Capability nueva ⇒ grant a ≥1 rol real + coverage test en el mismo PR (TASK-873/935); `can(subject, cap, action, scope)`, NUNCA `roleCodes.includes` inline.
- Honest degradation: org sin run ⇒ `score: null` + `lastRunAt: null`, NUNCA `0` (no inflar el cockpit con ceros falsos).

## Normative Docs

- `docs/tasks/complete/TASK-1248-growth-ai-visibility-client-report-ui.md` (report model espejo)
- `docs/tasks/complete/TASK-1243-growth-ai-visibility-client-scoped-report-access.md` (reader client-scoped — patrón inverso)
- `docs/tasks/to-do/TASK-1276-aeo-operator-view-growth-account360.md` (consumer)

## Dependencies & Impact

### Depends on

- Report builder / model canónico (TASK-1235) + `modelFromClientReport` (TASK-1248) — existe.
- Entitlement reader `resolveAeoEntitlement` (TASK-1277, complete) + tiers en `module_assignments` (TASK-1286) — para clasificar qué orgs tienen AEO en el cockpit.
- `grader_profiles.organization_id` bridge (TASK-1243) + prospectos org-sincronizados de HubSpot (TASK-706) — para resolver org/prospecto.

### Blocks / Impacts

- **Bloquea TASK-1276** Slices 1 (detalle) y 3 (cockpit): sin estos readers la vista operador no tiene de dónde leer.
- Habilita el reader operador-scoped que el flow/wireframe de TASK-1276 marcan como `[verificar]`.

### Files owned

- `src/lib/growth/ai-visibility/operator-report-reader.ts` (ambos readers) `[verificar naming]`
- `src/lib/entitlements/runtime.ts` (grant de la capability nueva) + `entitlements-catalog.ts` + migration seed de la capability
- `src/lib/entitlements/capability-grant-coverage.test.ts` (cobertura)
- tests focales de scope/degradación

## Current Repo State

### Already exists

- Reader client-scoped del reporte (TASK-1243) + report model (TASK-1248/1235).
- `resolveAeoEntitlement` (TASK-1277) + tiers AEO en `module_assignments` (TASK-1286).

### Gap

- No hay reader del reporte resuelto por **scope de operador** (solo client-scoped).
- No hay reader **agregado cross-org** de scores AEO para el cockpit.
- No hay capability de lectura operador del informe.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: lectura de `grader_profiles` + runs/`provider_observations` (report builder TASK-1235) + `module_assignments` (AEO tier). NO crea SoT.
- Consumidores afectados: TASK-1276 (UI operador) · Nexa/MCP (por construcción)
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: reader client-scoped (TASK-1243) intacto; report model `modelFromClientReport`; `RecommendationGapKey`.
- Contrato nuevo: `readOperatorScopedAeoReport({ organizationId })` + `readOperatorCrossOrgAeoScores()` (ambos en `src/lib/growth/ai-visibility/**`).
- Backward compatibility: `compatible` (additive, reader-only).
- Full API parity: el read se expone como reader canónico reusado por UI/Nexa/MCP; cero lógica de lectura en el componente.

### Data model and invariants

- Entidades/views afectadas: `greenhouse_growth.grader_profiles`, runs/observations, `module_assignments` (read-only).
- Invariantes:
  - El report builder/scoring NO se forkea: mismo modelo, distinta resolución de scope.
  - `score: null` / `lastRunAt: null` cuando no hay run elegible — NUNCA `0`.
  - El reader client-scoped (TASK-1243) NO cambia de comportamiento.
- Tenant/space boundary: el reader recibe una org ARBITRARIA → **self-guard obligatorio** con `can(subject, 'growth.ai_visibility.report.read_operator', 'read', 'tenant')` (a diferencia del client reader, que se protege derivando la org del propio tenant). V1 = capability-gated: interno con la capability lee cualquier client-org; el scoping per-AM no existe como primitive (TASK-1277 tampoco) → follow-up. Prospecto = `organization` tipo prospect (TASK-706).
- Idempotency/concurrency: reads puros, sin escritura.
- Audit/outbox/history: `none` (read-only). Rationale: lectura no muta estado; el audit de acciones vive en los commands (TASK-1275/1279).

### Migration, backfill and rollout

- Migration posture: `seed` (solo el seed de la capability nueva en `capabilities_registry`).
- Default state: `enabled` (reader gateado por capability; sin run ⇒ degradación honesta).
- Backfill plan: N/A (reader-only).
- Rollback path: `revert PR + reverse seed migration`.
- External coordination: N/A — repo-only.

### Security and access

- Auth/access gate: capability `growth.ai_visibility.report.read_operator` (interna, Growth/AM) + grant a `internal` route group ∪ `efeonce_admin` ∪ `efeonce_account` ∪ `efeonce_operations` (mismo set que el bloque operador de TASK-1277 `run.operator`; quien corre debe poder leer) + coverage automático. El reader self-guarda con `can()`.
- Sensitive data posture: el reporte operador puede incluir señales internas; respetar el disclosure del modelo (no exponer engine-snapshot interno a superficies públicas; esto es interno operador).
- Error contract: errores canónicos (`canonicalErrorResponse` / `CanonicalErrorCode`); `captureWithDomain` para fallos de lectura; honest degradation, no `.catch(() => [])`.
- Abuse/rate-limit posture: N/A (read interno gateado por capability).

### Runtime evidence

- Local checks: focal tests — scope (operador ve org en scope, NO ve fuera de scope), degradación (`null` no `0`), paridad del modelo con el client-scoped.
- DB/runtime checks: smoke del reader contra PG real vía proxy (orgs con/sin run); verify del seed de la capability.
- Integration checks: N/A (sin write externo).
- Reliability signals/logs: reusar capture de dominio `growth`; sin signal nuevo (read-only).
- Production verification sequence: migrate seed staging → smoke reader staging (org con run + org sin run + org fuera de scope) → repetir prod.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Tenant/access boundary (scope operador) e invariante `null≠0` explícitos.
- [ ] Seed de capability + grant + coverage en el mismo PR.
- [ ] Smoke del reader contra PG real listado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capability de lectura operador + grant + coverage

- Seed `growth.ai_visibility.report.read_operator` en `capabilities_registry` (migration) + `entitlements-catalog.ts`.
- Grant a `internal` ∪ `efeonce_admin` ∪ `efeonce_account` ∪ `efeonce_operations` en `runtime.ts` (mismo set que `run.operator` de TASK-1277); coverage test automático (grep de `can()`).

### Slice 2 — `readOperatorScopedAeoReport({ organizationId })`

- Reader que reusa el report builder (TASK-1235) resolviendo la org por scope operador (no `requireClientTenantContext`); estados con/sin run (degradación honesta); paridad de modelo con el client-scoped.

### Slice 3 — `readOperatorCrossOrgAeoScores()` (cockpit agregado)

- Reader agregado: orgs con AEO entitlement (`contracted|trial|pilot` vía `resolveAeoEntitlement`/`module_assignments`) + último run + score (`null` si no hay run), en el scope del operador.

### Slice 4 — Tests + smoke + cierre

- Focal tests (scope in/out, degradación, paridad de modelo) + smoke contra PG real + verify del seed; docs + closure.

## Out of Scope

- La UI operador (TASK-1276) y el control de status (TASK-1275).
- El run del motor (TASK-1277) y el envío + deal (TASK-1279).
- Cualquier cambio al reader client-scoped (TASK-1243) o al scoring.

## Detailed Spec

Ver `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`. Los readers reusan el report assembly de TASK-1235; la única diferencia con TASK-1243 es la **resolución de scope** (operador por org scope vs cliente por `requireClientTenantContext`). El agregado del cockpit compone `resolveAeoEntitlement` (clasificación de tier) con el último run por `grader_profiles.organization_id`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (capability + grant) ANTES de Slice 2/3 (los readers la usan como gate). Slice 2 y Slice 3 pueden ir en paralelo una vez cerrado Slice 1. Slice 4 (tests/smoke/cierre) al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reader operador lee org fuera de scope | access/identity | medium | gate por capability + filtro de org scope + test in/out de scope | code review + test rojo |
| Capability sin grant (fallback) | identity/entitlements | low | grant + coverage test en el mismo PR | `capability-grant-coverage.test.ts` |
| Cockpit muestra `0` en vez de "sin run" | data-quality/UX | low | invariante `null≠0` + test de degradación | revisión de modelo |
| Fork accidental del scoring | growth | low | reusar report builder TASK-1235, no reimplementar | code review |

### Feature flags / cutover

- Sin flag de runtime: reader gateado por capability nueva (default = grant a roles operador). Cutover por el grant; revert = reverse seed + revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse seed migration + revert PR | <10 min | sí |
| Slice 2 | revert PR (reader) | <5 min | sí |
| Slice 3 | revert PR (reader) | <5 min | sí |
| Slice 4 | n/a (tests/docs) | — | sí |

### Production verification sequence

1. `pnpm migrate:up` staging (seed capability) + verify fila en `capabilities_registry`.
2. Smoke `readOperatorScopedAeoReport` staging: org con run, org sin run (degradación), org fuera de scope (denegado).
3. Smoke `readOperatorCrossOrgAeoScores` staging: lista correcta + scores `null` donde no hay run.
4. Repetir en prod.

### Out-of-band coordination required

- N/A — repo-only + seed de capability.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `readOperatorScopedAeoReport({ organizationId })` que devuelve el report model resuelto por scope operador, con paridad de modelo respecto al client-scoped y degradación honesta (sin run ⇒ `null`).
- [ ] Existe `readOperatorCrossOrgAeoScores()` que lista orgs con AEO (`contracted|trial|pilot`) + último run + score (`null` si no hay run), en el scope del operador.
- [ ] Capability `growth.ai_visibility.report.read_operator` seedeada + grant a ≥1 rol real + coverage test, todo en el mismo PR.
- [ ] El reader client-scoped (TASK-1243) y el scoring NO cambian de comportamiento.
- [ ] Un operador NO lee orgs fuera de su scope (test in/out verde).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1287`
- Smoke de ambos readers contra PG real vía `pnpm pg:connect` + script tsx

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1276: quitar el `[verificar]` del reader operador-scoped)

## Follow-ups

- TASK-1276 consume estos readers (Slices 1 y 3).

## Open Questions

- ¿El agregado del cockpit incluye también orgs `none`/sin AEO para el subject picker de cross-sell, o ese listado lo resuelve TASK-1276 vía reader de orgs/prospectos (TASK-706)? Resolver en Discovery — preferible mantener este reader acotado a orgs CON AEO y dejar el picker de targets sin AEO a un reader de orgs general.
