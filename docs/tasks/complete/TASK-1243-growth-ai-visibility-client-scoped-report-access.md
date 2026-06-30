# TASK-1243 — Growth AI Visibility: Client-Scoped Report Access

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|client|identity`
- Blocked by: `TASK-1239`
- Branch: `task/TASK-1243-growth-ai-visibility-client-scoped-report-access`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El **tercer consumer de la parity** (EPIC-020 E): un reader **client-scoped** que deja a un usuario `client_*` autenticado ver el `grader_report` de SU organización — binding `run ↔ org cliente`, gateado por capability `client_*`, vía el anti-corruption layer del client portal. Mismo `buildGraderReport`; el cliente es un reader scoped, NUNCA una reimplementación. La UI del portal es follow-up (foundation backend primero).

## Why This Task Exists

Con A (snapshot) + B (intake) hechos, el grader tiene 2 de 3 consumers (público + admin). Falta el **cliente autenticado**: un Globe que es cliente de Efeonce debería ver su propio reporte de visibilidad en IA dentro del portal, sin acceso interno ni a la evidencia cruda. Hoy no existe el binding `run ↔ org cliente` ni un reader scoped por tenant cliente. Sin esto, la parity de 3 consumers queda incompleta y el portal cliente no puede mostrar el grader.

## Goal

- Binding `run/profile ↔ organización cliente` (cómo un run se asocia a un cliente del portal).
- Reader client-scoped `readClientGraderReport(orgContext, runId|latest)` gateado por capability `client_*`, que delega en `buildGraderReport` y respeta el tenant boundary (un cliente sólo ve lo suyo).
- DTO apropiado para cliente (entre el público y el interno; sin evidencia cruda de provider).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` + `agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` — BFF/anti-corruption layer del client portal (hoja del DAG; no importar `@/lib/client-portal/*` desde un producer domain).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 (audience `client`), §11.1.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability `client_*` + grant.
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — org context de sesión.

Reglas obligatorias:

- **Tenant boundary duro:** un cliente sólo ve los runs/reportes de SU organización. El binding `run ↔ org` se deriva server-side, NUNCA de un id del browser.
- Mismo primitive `buildGraderReport`: el reader cliente proyecta un DTO scoped (sin evidencia cruda); NO reimplementa la derivación.
- Capability `client_*` (rol real `client_executive`/`client_manager`/`client_specialist`) + grant mismo PR (guard coverage).
- El client portal es hoja del DAG: el reader vive en el producer domain (`growth`), el portal lo consume vía su BFF.

## Normative Docs

- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — `buildGraderReport` + audiences (`client`).
- `docs/tasks/complete/TASK-1239-growth-ai-visibility-public-report-snapshot-token-reader.md` — snapshot (referencia para el binding/serving cliente).
- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — `grader_profiles`/`grader_runs` (dónde colgaría el binding a org).

## Dependencies & Impact

### Depends on

- `TASK-1235` (complete) — `buildGraderReport` + audience `client`.
- `TASK-1239` (complete dev) — patrón de serving del reporte (snapshot/token).
- Client portal domain + org context de sesión + capability framework.

### Blocks / Impacts

- Completa la parity de 3 consumers (público/admin/cliente).
- Habilita la surface del grader en el portal cliente (UI = follow-up).

### Files owned

- `src/lib/growth/ai-visibility/client/**` — reader client-scoped + binding [verificar estructura].
- `migrations/` — binding `run/profile ↔ org` si no existe (additive) [verificar si grader_profiles ya puede colgar de una org].
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` — capability `client_*` + grant.
- `src/lib/growth/ai-visibility/__tests__/**` — tests (tenant boundary).

## Current Repo State

### Already exists

- `buildGraderReport` + audience `client` en el contrato; `grader_profiles`/`grader_runs`.
- Client portal BFF/anti-corruption layer + org context de sesión + capability framework.

### Gap

- No existe binding `run/profile ↔ organización cliente` ni reader client-scoped.
- No hay capability `client_*` para el grader ni grant.
- El portal cliente no tiene surface del grader (UI follow-up).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (+ posible migration additive del binding).
- Source of truth afectado: `grader_runs`/`grader_profiles` + binding a `greenhouse_core.organizations` [verificar].
- Consumidores afectados: portal cliente (UI follow-up), Nexa/MCP cliente futuros.
- Runtime target: `local` + `staging`.

### Contract surface

- Contrato existente a respetar: `buildGraderReport`, client portal BFF, capability framework.
- Contrato nuevo: `readClientGraderReport(orgContext, …)` + binding `run ↔ org` + capability `growth.ai_visibility.report.read_client` (o reuso de `report.read` con scope) [decidir].
- Backward compatibility: `additive`.
- Full API parity: reader scoped sobre el mismo primitive; el portal es cliente.

### Data model and invariants

- Entidades afectadas: `grader_runs`/`grader_profiles` + binding a org [verificar].
- Invariantes que no se pueden romper:
  - Tenant boundary: un cliente sólo ve lo de su org (derivado server-side).
  - Mismo `buildGraderReport`; DTO cliente sin evidencia cruda.
  - Capability `client_*` real + grant mismo PR.
  - Client portal = hoja del DAG (no importar desde producer).
- Tenant/space boundary: org context de sesión (`client` route group).
- Idempotency/concurrency: read-only.
- Audit/outbox/history: none (read).

### Migration, backfill and rollout

- Migration posture: `additive` si el binding `run ↔ org` no existe (columna `profile.organization_id` o tabla de binding) [verificar]; `none` si ya derivable.
- Default state: gated por capability `client_*` (sin grant a clientes hasta el rollout).
- Backfill plan: asociar runs existentes a su org si aplica (la mayoría son internos/públicos sin org).
- Rollback path: revert PR / capability sin grant.
- External coordination: N/A — repo/interno.

### Security and access

- Auth/access gate: `requireClientTenantContext` [verificar helper] + capability `client_*`.
- Sensitive data posture: DTO cliente sin raw provider text; sin PII de otros.
- Error contract: canónico es-CL; sin raw.
- Abuse/rate-limit posture: read interno autenticado.

### Runtime evidence

- Local checks: tests del tenant boundary (cliente A no ve runs de cliente B), DTO sin raw, capability+grant.
- DB/runtime checks: binding verify si se migra.
- Reliability signals/logs: reusa los de scoring; sin signal nuevo obligatorio.
- Production verification sequence: cliente staging ve sólo su reporte.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Tenant boundary + binding `run ↔ org` derivado server-side explícitos.
- [ ] Migration posture explícita (binding additive o derivable).
- [ ] Evidencia runtime (test tenant boundary) listada.
- [ ] DTO cliente sin raw; capability `client_*` + grant mismo PR.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Binding run ↔ org + capability

- Binding `run/profile ↔ organización cliente` (columna/tabla additive si no existe) + capability `client_*` + grant `runtime.ts`.
- Tests del binding + grant coverage.

### Slice 2 — Reader client-scoped + DTO cliente

- `readClientGraderReport(orgContext, runId|latest)`: deriva la org de la sesión, filtra runs de esa org, delega en `buildGraderReport`, proyecta el DTO cliente (sin evidencia cruda).
- Tests del tenant boundary (cliente A ≠ cliente B) + DTO sin raw.

## Out of Scope

- La surface visible en el portal cliente (UI follow-up / task aparte).
- El público (A) / admin (F) / HubSpot (D).
- Crear runs para clientes (eso es el intake/onboarding, no este reader).

## Detailed Spec

El reader cliente es el 3.er consumer de la parity: mismo `buildGraderReport`, proyección scoped por tenant. La org se deriva del `orgContext` de sesión (`client` route group), nunca del browser. El binding `run ↔ org` se materializa (additive) si no es derivable hoy. El DTO cliente queda entre el público y el interno: sin evidencia cruda de provider, con el detalle accionable que el cliente puede ver. La UI del portal lo consume vía su BFF (hoja del DAG).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (binding + capability) → Slice 2 (reader + DTO). El reader (2) depende del binding (1) para filtrar por org.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cliente ve runs de otra org (over-exposure) | security/tenant | medium | binding + filtro server-side + test cliente A≠B | test tenant boundary |
| DTO cliente filtra evidencia cruda | privacy | low | proyección scoped sin raw + leak test | leak test |
| Capability sin grant → 403 latente | access | low | grant mismo PR + guard coverage | capability-grant-coverage.test |

### Feature flags / cutover

- Sin flag: gated por capability `client_*` (sin grant a clientes hasta el rollout). Cutover = grant + UI del portal.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (binding additive) + revert PR | <10 min | si |
| Slice 2 | revert PR (reader) | <5 min | si |

### Production verification sequence

1. Migrar binding (si aplica) + verificar.
2. Staging: cliente A sólo ve sus runs; cliente B no ve los de A.
3. Prod: junto con la UI del portal, vía release control plane.

### Out-of-band coordination required

- N/A — repo/interno (depende de la existencia de orgs cliente reales con runs).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Binding `run/profile ↔ org cliente` (additive: `grader_profiles.organization_id` FK→organizations) + capability dedicada `growth.ai_visibility.report.read_client` + grant a `client_*` (guard coverage verde).
- [x] `readClientGraderReport(organizationId, runId?)` deriva la org de la sesión (endpoint), filtra por org (store JOIN), delega en `buildGraderReport` (vía reuso de `readGraderReport`).
- [x] Tenant boundary: cliente A NO ve runs de cliente B (`client-report-reader.test.ts` lo prueba; SQL del JOIN ejercitada live contra PG).
- [x] DTO cliente (`ClientGraderReport`) sin evidencia cruda de provider (`report-client-leak.test.ts`, 3 capas).
- [x] Sin reimplementación del builder (un primitive, muchos consumers: `readClientGraderReport` reusa `readGraderReport` + `buildGraderReport`).

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- Test tenant boundary + grant coverage
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [x] `Lifecycle` sincronizado (`complete`)
- [x] archivo en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] arch `## Delta` (`GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`) + `EPIC-020` Child Task E
- [x] chequeo de impacto cruzado (TASK-1248 desbloqueada parcialmente; TASK-1235/1239 + client portal)

## Status real

`Code complete + verificado (full test clean 0 failed + build ✓ + grant coverage + SQL live).` **Rollout pendiente (no de código):** poblar `grader_profiles.organization_id` para orgs cliente reales = intake/onboarding cliente (fuera de scope); el reader queda gated por capability `report.read_client` (granteada) + requiere un perfil con org + un run reportable. La UI del portal = TASK-1248.

## Resolución de Open Questions (Discovery)

1. **Binding = columna `grader_profiles.organization_id`** (nullable, additive, FK text → `greenhouse_core.organizations` ON DELETE SET NULL). El run deriva su org vía `profile_id → profile.organization_id`. Tabla de asociación descartada: 1 perfil de marca ↔ 1 org en V1 (over-engineering una M:N inexistente).
2. **Capability DEDICADA `growth.ai_visibility.report.read_client`** (no scope-overload de `report.read` interno). Rationale: least-privilege explícito + patrón cliente del repo (`client_portal.pulse.read`, `organization.*` son capabilities propias) + desacopla el acceso cliente del lifecycle del read interno. (El framework SÍ soporta scope-based, pero el acoplamiento lo hacía frágil.)
3. **On-read scoped** (no el snapshot inmutable). El snapshot es para el link público anónimo (TASK-1239); el cliente autenticado ve su reporte vivo con el mismo `buildGraderReport`.

## Follow-ups

- Surface del grader en el portal cliente (UI; consume este reader vía BFF) → **TASK-1248**.
- Poblar `grader_profiles.organization_id` desde el intake/onboarding cliente (write path; fuera de scope de este reader).
- Nexa cliente: operar el reporte desde la conversational experience (parity).
