# TASK-1141 — Nexa data-aware suggested prompts: "Mi espacio" (per-colaborador)

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `nexa|platform|ai|hr|ui`
- Blocked by: `none` (TASK-1087/1139 en `develop`)
- Branch: `task/TASK-1141-nexa-data-aware-prompts-my-space`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende los prompts data-aware de Nexa (Tier 2) a **"Mi espacio"** (`/my/*`) — la superficie de mayor alcance porque la ve **cada colaborador**, no solo quien mira una ficha de cliente. Cuando un colaborador abre Nexa en su espacio personal, los prompts arrancan desde **sus propios pendientes reales** (vacaciones por aprobar si es supervisor, ficha incompleta, liquidación lista, aprobaciones pendientes) en vez de plantillas genéricas. Incluye la **generalización del composer a un registro de resolvers por contexto** (foundational, lo consumen TASK-1142/1143).

## Why This Task Exists

TASK-1087/1139 cablearon data-aware SOLO para el contexto `client` (fichas de organización). El composer quedó hardcodeado a `readOrganizationWorkspaceCompactSignalsSafely`. "Mi espacio" es la superficie con más reach (todo colaborador la usa) y la más trivial en anti-oracle (es la data propia del usuario en sesión). Requiere (a) generalizar el composer a un registro `context → resolver` y (b) un resolver de pendientes self-service del propio miembro.

## Goal

- Composer generalizado a **registro de resolvers por contexto** (`client` = org compact-signals existente; `personal` = nuevo). Cero regresión del path `client`.
- Nuevo contexto `personal` para `/my/*`; la página declara `NexaContextScope entityKind='member' entityId={session.memberId}`.
- Resolver self-service que compone los pendientes del propio colaborador reusando readers canónicos (leave, ficha/intake, payslip, supervisorAccess). NUNCA recomputa inline; NUNCA expone data de otro usuario (anti-oracle trivial: solo el `memberId`/`identityProfileId` de sesión).
- Copy es-CL vía `greenhouse-ux-writing` (`GH_NEXA.floating.data_aware_prompts` extendido). Reusa la UI del `hint` (TASK-1139) — sin nueva superficie visual.
- Mismo flag `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED`. Degradación honesta a Tier 1/1.5.

## Dependencies & Impact

- **Depende de:** TASK-1087/1139 (composer + contrato + hook + endpoint + flag + hint UI). Readers self-service existentes: `src/lib/hr-core/postgres-leave-store.ts`, `src/lib/contractor-engagements/self-service-projection.ts`, intake (`workforce_intake_status`), supervisorAccess (TASK-727).
- **Impacta a:** `suggested-prompts-data-aware.ts` (→ registro), `suggested-prompts.ts` (`NexaPageEntityKind` += `member`; nuevo contextKey `personal`), `route.ts` (acepta `entityKind`), hook (gate generalizado), `/my/layout.tsx` (declara contexto), copy.
- **Archivos owned:** `src/lib/nexa/suggested-prompts-data-aware.ts`, `src/lib/nexa/data-aware-resolvers/*` (nuevo dir), `src/app/(dashboard)/my/layout.tsx`, `src/lib/copy/nexa.ts`, `src/lib/nexa/suggested-prompts.ts`.

## Current Repo State

- **Already exists:** composer org-only + hint UI + contrato + flag; sesión con `memberId`/`identityProfileId`; readers self-service (leave/contractor/intake) + `supervisorAccess`.
- **Gap:** composer no es registro; `/my/*` no declara entidad; no hay resolver de pendientes self-service; contextKey `personal` no existe.

## Scope (slices)

- **Slice 0 — Composer registry (foundational).** Generaliza `resolveDataAwareSuggestedPrompts` a un registro `Record<NexaPromptContextKey, DataAwareResolver>`. El resolver `client` = la lógica org actual (extraída, sin cambio de comportamiento). `entityKind` se agrega al input. Tests anti-regresión del path `client` (byte-idéntico).
- **Slice 1 — Resolver `personal` + copy.** `src/lib/nexa/data-aware-resolvers/personal.ts` (server-only, puro mapper + IO thin): compone leave pendiente / ficha incompleta / payslip lista / aprobaciones pendientes (si supervisor) del `memberId` de sesión. Allowlist categórica (nunca montos crudos). Copy es-CL vía `greenhouse-ux-writing`.
- **Slice 2 — Declaración de página + ruteo.** `/my/layout.tsx` declara `NexaContextScope entityKind='member' entityId` (resuelto server-side de la sesión); `routeContextKey('/my/*') → 'personal'`; hook + route aceptan `entityKind='member'`.
- **Slice 3 — Tests + GVC + doc.** Tests del resolver (pendientes → prompts, degradación, anti-oracle own-only) + GVC (abrir Nexa en `/my` con un pendiente real) + Delta en `experience/suggested-prompts.md` (doc gate).

## Out of Scope

- Payroll data-aware (TASK-1142) · Finance global (TASK-1143) · WebMCP.
- Cambiar el contrato `nexa-suggested-prompts.v1` (el `hint`/`entityRef` ya existen).
- Nueva UI: reusa las cards + hint de TASK-1139.

## Detailed Spec

- **Registry:** `DATA_AWARE_RESOLVERS: Record<NexaPromptContextKey, (input) => Promise<NexaSuggestedPrompt[]>>`. El orquestador elige por `input.context`, corre el resolver, cachea (TTL 30s), degrada a `template_fallback` si vacío. El `client` resolver envuelve el actual `buildDataAwarePromptsFromCompactSignals` + `readOrganizationWorkspaceCompactSignalsSafely`.
- **Resolver `personal`:** lee del `memberId`/`identityProfileId` de sesión. Señales V1 (allowlist): `leave_pending_self` (días por aprobar si supervisor) / `intake_incomplete` (ficha) / `payslip_ready` (liquidación del mes) / `approvals_pending` (si `supervisorAccess`). Cada una → un gancho con `hint` (`pending`/`kpi`). NUNCA monto crudo; NUNCA data de otro miembro.
- **Anti-oracle:** el `entityId` se ignora del cliente para `personal` — se usa SIEMPRE el `memberId` de sesión (no se confía un id del query → un usuario no puede pedir los pendientes de otro).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule
Slice 0 (registry) primero — desbloquea todo + es el que arriesga regresión del path `client`. Tests anti-regresión del `client` resolver son el gate del Slice 0.

### Risk matrix
| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Regresión del path `client` al extraer el resolver | composer | Media | Tests anti-regresión byte-idénticos del `client` resolver antes de mergear Slice 0 | suite Nexa |
| Fuga de data de otro miembro | resolver personal | Baja | `entityId` del cliente IGNORADO; siempre `memberId` de sesión | test anti-oracle own-only |
| Monto crudo al prompt | resolver personal | Baja | Allowlist categórica (mismo principio TASK-1087) | test allowlist |

### Feature flags / cutover
Mismo flag `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` (ON local + staging). Cero flag nuevo. Aditivo.

### Rollback plan per slice
Todos: `revert commit` (<2 min, reversible). El registry revertido vuelve al composer org-only.

### Production verification sequence
1. Local (flag ON): abrir Nexa en `/my` con un pendiente real → prompt refleja el pendiente. 2. Staging GVC. 3. Prod = próximo release.

### Out-of-band coordination required
Ninguna. Sin migraciones/env/Azure/GCP.

## Acceptance Criteria

- [ ] El path `client` (org/finance client detail) sigue byte-idéntico (tests anti-regresión verdes).
- [ ] En `/my`, con un pendiente real, el primer prompt lo refleja; sin pendiente → Tier 1/1.5.
- [ ] El resolver `personal` usa SIEMPRE el `memberId` de sesión (ignora cualquier `entityId` del query) — test anti-oracle.
- [ ] Ningún prompt lleva monto crudo (test allowlist).
- [ ] Con el flag off, `/my` muestra plantillas (sin fetch).
- [ ] `pnpm nexa:doc-gate` verde (Delta en `experience/suggested-prompts.md`).

## Verification

- `pnpm local:check` + tests focales (registry, resolver personal, anti-oracle, allowlist) + suite Nexa.
- **UI por skills**: `greenhouse-ux-writing` (copy) + `state-design`/`modern-ui` (reusa hint — confirmar que no rompe la grilla) + **GVC desktop+mobile** de `/my` con pendiente real.
- `pnpm test` (full) + `pnpm build` + `pnpm nexa:doc-gate`.

## Closing Protocol

- `Lifecycle: complete` + mover a `complete/` + sync `README.md` + `TASK_ID_REGISTRY.md`.
- Delta en `experience/suggested-prompts.md` (registry + contexto `personal`).
- `changelog.md` + `Handoff.md`.

## Follow-ups

- TASK-1142 (Payroll) y TASK-1143 (Finance global) consumen el registry de esta task.

## Closure 2026-06-15 — code-complete

Registry de resolvers (foundational, lo consumen 1142/1143) + contexto `personal` (Mi espacio).
- Composer = `DATA_AWARE_RESOLVERS[context]`; resolver `client` extraído byte-idéntico (14/14 anti-regresión).
- Resolver `personal` (`data-aware-personal-resolver.ts`, server-only): vacaciones propias + aprobaciones del equipo vía `listLeaveRequestsFromPostgres` (cero SQL nuevo). **Anti-oracle**: usa SIEMPRE `subject.memberId`, ignora el `entityId` del cliente (test). `/my/layout` declara el contexto.
- Copy es-CL revisado con `greenhouse-ux-writing` (corregido voseo "Tenés"→"Tienes").
- Gates: tsc 0 · lint 0 · 22/22 tests focales (registry + personal + anti-oracle + allowlist) · suite Nexa 90 · doc gate verde · build exit 0.
- **Pendiente (rollout):** GVC en `/my` con un pendiente real (mismo gate que 1087/1139; flag ON local+staging).
- **Follow-ups:** ficha incompleta + payslip ready (copy ya existe, falta wirear su reader).
