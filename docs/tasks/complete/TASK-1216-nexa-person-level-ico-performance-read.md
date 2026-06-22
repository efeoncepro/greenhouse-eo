# TASK-1216 — Nexa person-level ICO/performance read (OTD por persona)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ico`
- Blocked by: `none`
- Branch: `task/TASK-1216-nexa-person-level-ico-performance-read`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy se puede consultar el OTD (y demás métricas ICO) de una persona específica por API (`GET /api/people/{memberId}/ico-profile`, reader `getPersonIcoProfile`), pero **Nexa no puede**: la tool `get_otd` no acepta argumentos y resuelve sólo OTD de la organización del tenant o pulso global de agencia — no tiene dimensión persona. Esta task agrega una tool de lectura de Nexa parametrizable por persona que delega en el reader canónico `getPersonIcoProfile`, cubriendo OTD (y, por construcción, las demás métricas ICO del perfil: RpA, etc.) — sin lógica nueva ni Nexa-específica.

## Why This Task Exists

El ADR `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (§North Star) exige que Nexa pueda operar toda capability con contrato gobernado, por construcción. El caso "¿cuál es el OTD de Daniela Ferreira?" lo expone: el contrato de lectura a nivel persona **ya existe y es parity-complete** (tabla `greenhouse_serving.ico_member_metrics`, reader `getPersonIcoProfile`, endpoint People con autorización fina anti-IDOR), pero el consumer #2 del ADR (Nexa) no lo alcanza porque su tool `get_otd` no está parametrizada. Es un gap chico con el primitive ya listo: basta cablear una tool de Nexa al reader existente respetando la misma autorización de People scope.

## Goal

- Nexa puede responder el OTD (y métricas ICO) de una persona específica nombrada por el usuario.
- La tool delega en el reader canónico `getPersonIcoProfile` (cero lógica duplicada).
- La autorización es idéntica a la del endpoint People: capability `canViewActivity` + visibilidad de la persona en el scope del solicitante (anti-IDOR); un usuario sin scope no obtiene el dato.
- Resolución persona→`member_id` por nombre, gobernada y sin exponer personas fuera de scope.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — §North Star + §Canonical consumers
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` — People scope / anti-IDOR

Reglas obligatorias:

- La tool es READ: Nexa lee directo, pero con la MISMA autorización que la UI/endpoint (`canViewActivity` + `assertMemberVisibleInPeopleScope`). NUNCA un back door que ignore scope.
- Delegar en `getPersonIcoProfile` — NO recomputar OTD ni queryear `ico_member_metrics` directo desde la capa Nexa.
- Resolución nombre→member_id gobernada (no enumerar personas fuera de scope; no filtrar PII).
- Citar SOLO roles reales (`role-codes.ts`).

## Normative Docs

- Skill obligatoria: `greenhouse-nexa-conversational`
- Skill: `greenhouse-ico` (semántica de métricas ICO)

## Dependencies & Impact

### Depends on

- Reader `getPersonIcoProfile` ([src/lib/person-360/get-person-ico-profile.ts](src/lib/person-360/get-person-ico-profile.ts)) — existente
- Tabla `greenhouse_serving.ico_member_metrics` (`otd_pct`, etc.) — existente
- Endpoint de referencia `GET /api/people/[memberId]/ico-profile` + su autorización (`requirePeopleTenantContext`, `assertPeopleCapability`, `assertMemberVisibleInPeopleScope`) — existente
- Registry de tools de Nexa: `src/lib/nexa/nexa-tools.ts`, `src/lib/nexa/nexa-contract.ts`

### Blocks / Impacts

- Avanza el North Star de Nexa para métricas de delivery a nivel persona.
- Relacionada: TASK-1217 (explicabilidad del "por qué" del OTD) — complementaria, no bloqueante.

### Files owned

- `src/lib/nexa/nexa-tools.ts` (tool nueva)
- `src/lib/nexa/nexa-contract.ts` (nombre de tool en el union type)
- Helper de resolución persona→member_id scoped si no existe uno reusable (`[verificar]` en Discovery)
- Tests de la tool

## Current Repo State

### Already exists

- OTD/ICO a nivel persona materializado y expuesto: `ico_member_metrics` + `getPersonIcoProfile` + `GET /api/people/[memberId]/ico-profile` (y `…/ico?year=&month=`) con autorización fina anti-IDOR.
- `get_otd` ([src/lib/nexa/nexa-tools.ts:266](src/lib/nexa/nexa-tools.ts)) — sin args; resuelve org-del-tenant o pulso global.
- Tools de Nexa de lectura ya operativas (`check_payroll`, `explain_my_pay`, etc.) como patrón.

### Gap

- `get_otd` no acepta dimensión persona → Nexa no puede responder OTD/RpA de una persona nombrada.
- No hay tool de Nexa que devuelva el perfil ICO de un `member_id` resuelto por nombre dentro del scope del solicitante.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command` (tool de lectura de Nexa)
- Source of truth afectado: reader `getPersonIcoProfile` (reusado)
- Consumidores afectados: `Nexa Agent`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `getPersonIcoProfile`, autorización People scope, registry de tools de Nexa.
- Contrato nuevo: tool de Nexa `get_member_performance` (nombre a confirmar) con argumento de persona (nombre o member_id) → perfil ICO scoped.
- Backward compatibility: `compatible` (additive; `get_otd` sigue igual o se complementa).
- Full API parity: Nexa consume el MISMO reader que la UI/endpoint People; cero lógica nueva.

### Data model and invariants

- Entidades/tablas: ninguna nueva (reusa `ico_member_metrics` vía el reader).
- Invariantes:
  - Autorización idéntica a la del endpoint People (capability + scope + anti-IDOR).
  - Nunca exponer una persona fuera del scope del solicitante (incluida la resolución por nombre).
  - Sin PII cruda en el prompt/respuesta más allá del nombre + métricas.
- Tenant/space boundary: derivado del subject de la sesión Nexa, igual que People.
- Idempotency/concurrency: N/A (read).
- Audit/outbox/history: N/A (read); aplican los logs de uso de tools de Nexa.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `enabled with rationale` — read additive con autorización heredada; bajo riesgo. Considerar flag si el equipo Nexa lo prefiere para staging.
- Backfill plan: N/A.
- Rollback path: revert PR (quita la tool).
- External coordination: N/A — repo only.

### Security and access

- Auth/access gate: `capability` (`canViewActivity`) + scope de People (anti-IDOR), evaluado en la ejecución de la tool.
- Sensitive data posture: métricas de desempeño de persona — exponer sólo dentro de scope.
- Error contract: errores sanitizados; si la persona no es visible en scope → respuesta de "no disponible"/no autorizado sin filtrar existencia.
- Abuse/rate-limit posture: rate-limit del runtime de Nexa; la resolución por nombre no debe permitir enumeración fuera de scope.

### Runtime evidence

- Local checks: tests de la tool (caso con scope, caso sin scope → denegado, caso nombre ambiguo).
- DB/runtime checks: smoke contra PG (proxy) del reader con un member real.
- Integration checks: E2E conversacional — preguntar a Nexa el OTD de un member visible y de uno fuera de scope.
- Reliability signals/logs: logs de uso de tools de Nexa.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] La tool reusa `getPersonIcoProfile` (sin lógica duplicada).
- [ ] Autorización idéntica al endpoint People verificada (incl. denegación fuera de scope).
- [ ] Resolución nombre→member_id no enumera personas fuera de scope.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Resolución persona→member_id scoped

- Helper que mapea un nombre (o member_id directo) al `member_id`, respetando el scope de People del solicitante; reusar resolver existente si lo hay.
- Manejo de ambigüedad (varias personas con nombre similar) sin filtrar personas fuera de scope.

### Slice 2 — Tool de Nexa de lectura ICO por persona

- Registrar la tool en `nexa-tools.ts` + `nexa-contract.ts`, con argumento de persona.
- Delegar en `getPersonIcoProfile` con la autorización de People scope; devolver OTD (+ métricas ICO del perfil).
- Tests (con scope, sin scope, ambiguo) + E2E conversacional.

## Out of Scope

- Explicabilidad del "por qué" del OTD (atraso imputable) → TASK-1217.
- Escritura/acción sobre métricas (esta task es read-only).
- Cambiar el cálculo de OTD/ICO o el reader subyacente.
- Una vista UI nueva (el endpoint People ya cubre la UI; esta task es para Nexa).

## Detailed Spec

El nombre final de la tool, el shape del argumento (nombre vs member_id) y el resolver de nombre→member_id se afinan en Discovery con `greenhouse-nexa-conversational`. El patrón: la tool recibe la referencia de persona → resuelve member_id dentro del scope del solicitante → llama `getPersonIcoProfile` con la autorización de la sesión → devuelve el perfil ICO (OTD + métricas). Como `getPersonIcoProfile` retorna el perfil completo, esta tool habilita por construcción también RpA y demás métricas ICO a nivel persona.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (resolver scoped) → Slice 2 (tool que lo usa). Sin resolución scoped no se puede gatear anti-IDOR.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Resolución por nombre filtra existencia de personas fuera de scope | identity / privacy | medium | Resolver dentro de scope; respuesta uniforme "no disponible"; test anti-enumeración | acceso a member fuera de scope en logs |
| Nexa expone OTD de persona a quien no tiene `canViewActivity` | ico / identity | medium | Heredar exactamente la autorización del endpoint People; E2E negativo | dato devuelto a rol sin capability |
| Nombre ambiguo devuelve persona equivocada | ico | low | Manejo explícito de ambigüedad (pedir desambiguación) | feedback de usuario |

### Feature flags / cutover

- Sin flag (additive read con autorización heredada), salvo que el equipo Nexa prefiera flag para staging. Revert = revert PR (<10 min).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (helper inerte si no se usa) | <10 min | sí |
| Slice 2 | revert PR (quita la tool) | <10 min | sí |

### Production verification sequence

1. Staging: E2E con member interno (`hr_manager`/`efeonce_account`) preguntando OTD de un member visible → responde.
2. E2E con solicitante sin `canViewActivity` o con member fuera de scope → denegado/uniforme.
3. Prod + monitor de logs de tool 7d.

### Out-of-band coordination required

- N/A — repo only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Nexa responde el OTD de una persona nombrada cuando el solicitante tiene scope/capability.
- [ ] Nexa NIEGA (sin filtrar existencia) cuando la persona está fuera de scope o falta `canViewActivity`.
- [ ] La tool delega en `getPersonIcoProfile`; cero recompute o query directa a `ico_member_metrics`.
- [ ] La respuesta incluye OTD (y por construcción las demás métricas ICO del perfil).
- [ ] Tests (scope / sin scope / ambiguo) + E2E conversacional verdes.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- E2E conversacional (positivo + negativo de scope)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado
- [ ] gap ledger de Full API Parity / Nexa actualizado (cobertura de lectura persona)
- [ ] `greenhouse-documentation-governor` + `pnpm docs:closure-check`
- [ ] `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed`

## Follow-ups

- TASK-1217 — explicabilidad del OTD (atraso imputable) por persona.
- Si la tool no cubre RpA de forma satisfactoria, evaluar tool/affordance específica de RpA.

## Open Questions

- ¿Tool nueva (`get_member_performance`) o extender `get_otd` con argumento opcional de persona? Resolver en Discovery (preferencia: tool nueva para no romper el contrato sin-args actual).
- ¿Existe ya un resolver nombre→member_id scoped reusable? `[verificar]`.

## Delta 2026-06-22 — COMPLETE (code-complete + verificado contra PG real, local-first sin push)

**Scope expandido por decisión del operador (parity real):** se agregaron como consumers, además del tool de Nexa, los lanes **MCP/ecosystem y app** de API Platform — los tres consumen el MISMO primitive canónico (un primitive, muchos consumers).

**Implementado (4 slices):**
- **Slice 1** — Primitive canónico neutral `readMemberIcoProfileForSubject` + helpers (`resolvePeopleActivityScope`, `resolveMemberReferenceInScope`, `isMemberVisibleInActivityScope`) en `src/lib/people/person-activity-access.ts`. Reusa primitivas People (canViewActivity + anti-IDOR + supervisor scope) + reader `getPersonIcoProfile`. 12 tests + SQL smoke contra PG real.
- **Slice 2** — Tool de Nexa `get_member_performance` (`nexa-tools.ts` + `nexa-contract.ts`), wrapper fino que mapea `NexaRuntimeContext`→`PeopleActivitySubject`. isAvailable internal-only; not_found uniforme; ambiguo→desambiguación; gap honesto. 9 tests.
- **Slice 3** — Regla de ruteo persona vs `get_otd` en el prompt; bump policy v2.3.0→v2.4.0 + changelog + golden snapshot. Docs de capa (versioning/techniques/behavior-and-routing). `nexa:doc-gate` verde.
- **Slice 4** — Lanes API Platform `people.v1`: `GET /api/platform/ecosystem/people/performance` (solo binding `internal`, subject `people_viewer` de menor privilegio) + `GET /api/platform/app/people/performance` (subject 1:1 del tenant). Shared `buildMemberPerformancePayload`. Nuevo error code `ambiguous_reference`. 7 tests.

**Acceptance:**
- [x] Nexa/MCP/app responden el OTD (+RpA/FTR/salud) de una persona nombrada con scope/capability.
- [x] Niega sin filtrar existencia fuera de scope/sin capability (forbidden / not_found uniforme).
- [x] Delega en `getPersonIcoProfile`; cero recompute o query directa a `ico_member_metrics`.
- [x] Tests unitarios (scope/sin scope/ambiguo) verdes (28 nuevos) + suite full 7697 verde + build prod OK + tsc + lint + `nexa:doc-gate`.
- [x] **Verificado con caso real contra PG** (primitive compartido por los 3 consumers): admin→`Daniela Ferreira` ok (OTD 96.2 / RpA 1.13 / FTR 93.7, 2026-06, 5 meses tendencia); cliente→forbidden; nombre inexistente→not_found.
- [~] **E2E conversacional LLM** (turno real de chat) NO ejecutado local (requiere dev server + LLM); el path de datos+autorización está verificado contra PG real. Recomendado smoke conversacional en staging post-deploy.

**Rollout:** sin migración, sin flag nuevo, additive. El tool funciona en V1 y V2 del prompt (la regla v2.4.0 solo afina el ruteo cuando `NEXA_SYSTEM_PROMPT_V2_ENABLED` está ON). Los lanes MCP/app quedan vivos; el lane MCP solo expone datos si existe un consumer con binding `internal` (acción del operador, no requerida para el contrato). Deploy = decisión del operador (local-first, sin push).

**Follow-up detectado (pre-existente, NO de esta task):** `computeHealth` en `get-person-ico-profile.ts` trata `rpaAvg` como score 0-100 (`>=70` verde) pero el RpA materializado es "rondas de corrección" (bajo=bueno), produciendo salud `red` con OTD 96% (caso Daniela). Es inconsistencia del reader canónico compartida por People endpoint + UI + esta tool (la reflejo fiel por parity). Corregir en el reader canónico (afecta los 3 consumers a la vez), no parchear suelto.
