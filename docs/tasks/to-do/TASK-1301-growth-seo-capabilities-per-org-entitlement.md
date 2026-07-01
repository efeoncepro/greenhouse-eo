# TASK-1301 — Growth SEO: Capabilities + Per-Org Entitlement

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `db`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|identity`
- Blocked by: `none`
- Branch: `task/TASK-1301-growth-seo-capabilities-per-org-entitlement`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Define las **capabilities `growth.seo.*`** del módulo SEO (`target.configure`, `audit.run`, `observation.read`, `report.read_client`, `entitlement.manage`) en el catálogo TS (`entitlements-catalog.ts`) + `capabilities_registry` (migración seed en el **MISMO PR**) + grant a ≥1 rol real en `runtime.ts` + coverage test — cerrando el guard `capability-grant-coverage.test.ts`. El **acceso es per-org vía `module_assignments`** (módulo `seo_v1`), NO por rol (lección TASK-1248), con las **4 puertas** (operador / contratado / trial-PLG / público). Provee el **chokepoint único `enforceSeoRunEntitlement`** con **quota cap por-org** — el gate de costo DataForSEO (riesgo #1 del módulo): resuelve tier + allowance + budget leyendo el módulo asignado y el contador `seo_provider_spend_daily` (TASK-1300), espejando el resolver AEO `resolveAeoEntitlement`. No incluye crons, readers de datos SEO, ni UI — solo el plano de autorización + entitlement.

## Why This Task Exists

El módulo SEO es caro (O(orgs × keywords × devices × días) contra DataForSEO — riesgo #1, `EPIC-022 §13.1`) y client-facing. Antes de que 1303/1304 disparen una sola captura hay que fijar QUIÉN puede correrla y con qué cupo. Dos lecciones canónicas lo condicionan: (1) el acceso a un servicio de este tipo es **per-org, no por rol** — TASK-1248 se equivocó modelando el AEO como viewCode role-wide y se corrigió a `module_assignments`; el SEO nace ya per-org. (2) Toda capability nueva debe **granteear-se a ≥1 rol real en el mismo PR** o el guard `capability-grant-coverage.test.ts` rompe el build. Esta task fija ambos: las 5 capabilities gobernadas + su grant + el chokepoint `enforceSeoRunEntitlement` que centraliza el gate de costo (un único punto donde se valida entitlement → ventana → allowance → budget), para que ningún consumer (cron, command, Nexa, MCP) pueda saltarse el cap de gasto per-org.

## Goal

- 5 capabilities `growth.seo.*` en `entitlements-catalog.ts` (TS) **y** `greenhouse_core.capabilities_registry` (migración seed en el mismo PR).
- Grant a ≥1 rol real en `runtime.ts` (set operador interno + `report.read_client` a `client_*` scope `own`) + `capability-grant-coverage.test.ts` verde.
- Acceso per-org vía `module_assignments` (módulo `seo_v1`) con las 4 puertas; el chokepoint `enforceSeoRunEntitlement` resuelve tier + allowance + budget con quota cap por-org.
- Migración con marker `-- Up Migration` + DO-block; grant coverage sin brecha.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §9 (Entitlements `growth.seo.*` per-org, 4 puertas, chokepoint `enforceSeoRunEntitlement` con quota cap) + §13.1/§13.5 (costo riesgo #1; reversibilidad = revocar assignment).
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — modelo canónico capability-based, startup policy, `can()`.
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §"Capability grant coverage + ROLE_CODES"` — los 14 ROLE_CODES reales; nunca citar un rol fantasma.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — cada capability nace gobernada, un primitive muchos consumers.
- CLAUDE.md §"Capability ⇒ grant coverage + ROLE_CODES" + §"Heurística de acceso" (routeGroups vs views vs entitlements vs startup policy).

Reglas obligatorias:

- **Capability + grant en el MISMO PR.** Seedear en `capabilities_registry` (DB) + `entitlements-catalog.ts` (TS) + granteear a ≥1 rol real en `runtime.ts`; `capability-grant-coverage.test.ts` debe quedar verde. NUNCA capability `can()`-checked sin grant.
- **Acceso per-org vía `module_assignments`, NO por rol.** El acceso a un Space/org concreto se decide por assignment del módulo `seo_v1` (lección TASK-1248), no por que el usuario tenga tal rol. El rol solo define el plano fino "puede pedir un run"; el acceso efectivo lo gobierna el chokepoint.
- **Solo ROLE_CODES reales.** Grants contra `src/config/role-codes.ts` (los 14); nunca `DEVOPS_OPERATOR`/`HR_ADMIN`/`commercial_admin`/`operations` (fantasmas).
- **`report.read_client` scope `own`.** El cliente ve el reporte de SU org, derivada server-side del orgContext de sesión — nunca de un `organization_id` del request.
- **Chokepoint único.** Todo write provider-facing SEO pasa por `enforceSeoRunEntitlement` (un solo punto de gate de costo); ningún cron/command lo reimplementa inline.
- **Boundary duro.** Este dominio NUNCA referencia payroll/finance/compensación.

## Normative Docs

- `src/config/entitlements-catalog.ts` (§growth, líneas ~1907–2095) — patrón de las capabilities `growth.ai_visibility.*`/`growth.forms.*` [modelo a espejar].
- `src/lib/entitlements/runtime.ts` (bloques growth ~180–390 + client ~2429–2450) — patrón de grant operador + grant cliente scope `own`.
- `src/lib/entitlements/capability-grant-coverage.test.ts` — el guard que rompe el build [debe quedar verde].
- `src/lib/growth/ai-visibility/entitlement.ts` — `resolveAeoEntitlement` (tier + allowance + budget vía `module_assignments.metadata_json`; conteo de runs contra el cap) [espejo de `enforceSeoRunEntitlement`].
- `migrations/20260628105903574_task-1277-aeo-run-capabilities.sql` — patrón canónico de seed en `greenhouse_core.capabilities_registry` (INSERT + `ON CONFLICT DO UPDATE` + DO-block anti pre-up-marker) [referencia directa].
- `src/config/role-codes.ts` — los 14 ROLE_CODES reales.

## Dependencies & Impact

### Depends on

- `greenhouse_core.capabilities_registry` (existe) + `entitlements-catalog.ts` + `runtime.ts` + `can()` (todo existente).
- `greenhouse_client_portal.module_assignments` (existe — soporta el AEO per-org; el SEO agrega el `module_key='seo_v1'`).
- `greenhouse_growth.seo_provider_spend_daily` (contador de gasto) — **TASK-1300** (el chokepoint lee el budget de ahí). Si 1300 no está, el gate de budget degrada a "sin dato de gasto" [verificar orden de merge].

### Blocks / Impacts

- Bloquea `TASK-1303` (rank capture pasa por `enforceSeoRunEntitlement` antes de gastar), `TASK-1304` (site audit/backlinks idem), `TASK-1310` (report cliente gateado por `report.read_client`).
- Impacta `capability-grant-coverage.test.ts` (agrega 5 capabilities al superset cubierto).

### Files owned

- `src/config/entitlements-catalog.ts` [modificado — +5 capabilities `growth.seo.*`]
- `src/lib/entitlements/runtime.ts` [modificado — grants a rol real + client scope `own`]
- `migrations/<ts>_task-1301-seo-capabilities.sql` [nuevo — seed en `capabilities_registry`]
- `src/lib/growth/seo/entitlement.ts` [nuevo — `enforceSeoRunEntitlement` + resolver per-org] [verificar path]
- `src/lib/growth/seo/__tests__/entitlement.test.ts` [nuevo]
- `src/lib/entitlements/capability-grant-coverage.test.ts` [posible actualización si el superset se declara explícito]

## Current Repo State

### Already exists

- Modelo capability-based canónico: `entitlements-catalog.ts` (TS) + `capabilities_registry` (DB) + `runtime.ts` (grants) + `can()` + `capability-grant-coverage.test.ts`.
- Patrón per-org probado: el AEO usa `module_assignments` (módulo `ai_visibility_v1`) + `resolveAeoEntitlement` (tier `contracted|trial|pilot` + allowance + budget backstop). Las capabilities `growth.ai_visibility.*` (incl. `entitlement.manage`, `report.read_client` scope `own`, `run.portal`) están seedeadas y grantadas.
- 14 ROLE_CODES reales en `src/config/role-codes.ts`.

### Gap

- Cero capabilities `growth.seo.*`. No hay grant ni registry entry para SEO.
- No hay módulo `seo_v1` en `module_assignments` ni chokepoint `enforceSeoRunEntitlement` — nada gobierna quién dispara una captura SEO ni con qué cupo/budget.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `db`
- Source of truth afectado: `entitlements-catalog.ts` (TS SoT de capabilities) + `greenhouse_core.capabilities_registry` (DB SoT) + `runtime.ts` (grant SoT) + `greenhouse_client_portal.module_assignments` (SoT per-org del acceso). El chokepoint `enforceSeoRunEntitlement` es el reader gobernado del entitlement.
- Consumidores afectados: crons/commands de captura SEO (1303/1304), report cliente (1310), Nexa/MCP (por construcción, Full API Parity), `can()` en routes.
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: `capability-grant-coverage.test.ts` (toda capability `can()`-checked alcanzable por el superset), `can(subject, cap, action, scope)`, el patrón `module_assignments` per-org del AEO.
- Contrato nuevo o modificado: 5 capabilities `growth.seo.*`, módulo `seo_v1` en `module_assignments`, `enforceSeoRunEntitlement(organizationId, actor, { estimatedCostUsd? })` → `{ allowed, tier, allowanceRemaining, blockedReason }`.
- Backward compatibility: `additive` (capabilities y módulo nuevos; cero impacto en el AEO ni en capabilities existentes).
- Full API parity: **SÍ** — cada capability nace gobernada (un primitive, muchos consumers). El chokepoint `enforceSeoRunEntitlement` es reader server-side reusable por UI/Nexa/MCP/cron; el write de negocio (configurar target, disparar audit) es command gobernado con capability + `propose → confirm → execute` en los consumers (1303/1304). Ver §Capability Definition of Done.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.capabilities_registry` (+5 filas `growth.seo.*`), `greenhouse_client_portal.module_assignments` (nuevo `module_key='seo_v1'`, sin cambio de schema), lectura de `greenhouse_growth.seo_provider_spend_daily` (TASK-1300) para el budget.
- Invariantes que no se pueden romper:
  - Toda capability `growth.seo.*` seedeada en registry + catálogo TS + grantada a ≥1 rol real en el MISMO PR (coverage test verde).
  - Grants solo contra los 14 ROLE_CODES reales (nunca fantasma).
  - `report.read_client` scope `own` (org derivada server-side de sesión, nunca del request).
  - Acceso efectivo per-org vía `module_assignments` (módulo `seo_v1`), NO por rol (el rol es el plano fino; el módulo es el acceso al Space).
  - `enforceSeoRunEntitlement` es el ÚNICO chokepoint de gate de costo; ningún consumer lo reimplementa inline.
  - Quota cap por-org: si el gasto/allowance del período se agota, `enforceSeoRunEntitlement` bloquea con `blockedReason` (`no_entitlement|expired|quota_exhausted|budget_exhausted`); nunca deja pasar un run que exceda el cap.
  - Cero referencia a payroll/finance/`grader_*` (cross-módulo AEO se cruza en un derived read en 1305, no acá).
- Tenant/space boundary: el `organizationId` del chokepoint se deriva server-side (orgContext de sesión para cliente; target seleccionado para operador). `report.read_client` = solo la propia org.
- Idempotency/concurrency: el resolver es read-only (no muta); el conteo de allowance/budget es una lectura consistente del período (mes) — mismo patrón que `resolveAeoEntitlement`. El seed usa `ON CONFLICT (capability_key) DO UPDATE` (idempotente).
- Audit/outbox/history: sin outbox en esta task (el resolver no muta). Los writes de negocio que lo consumen (1303/1304) llevan su audit/outbox. El grant de acceso per-org (crear/revocar assignment) lo hace `entitlement.manage` y su command en el consumer.

### Migration, backfill and rollout

- Migration posture: `additive` + `seed` (5 filas en `capabilities_registry` vía INSERT + `ON CONFLICT DO UPDATE`; marker + DO-block que aborta si `count <> 5`). Sin cambio de schema de `module_assignments`.
- Default state: `disabled` a nivel feature — las capabilities existen y el chokepoint resuelve, pero ninguna org tiene un assignment `seo_v1` activo hasta que el operador lo cree (`entitlement.manage`). Módulo completo detrás de `GROWTH_SEO_ENABLED` (default OFF) en los consumers.
- Backfill plan: N/A (ninguna org tiene SEO hoy; los assignments se crean on-demand por el operador — p. ej. Grupo Berel como Fase 0).
- Rollback path: revert PR (quita catálogo TS + grants) + reverse migration (deprecar las 5 capabilities vía `deprecated_at = NOW()`, patrón AEO). Revocar acceso de una org = revocar su assignment `seo_v1` (reversibilidad §13.5). El coverage test protege contra dejar una capability sin grant en el revert.
- External coordination: ninguna nueva (usa `module_assignments` existente). El operador crea el primer assignment `seo_v1` (Berel) como paso de rollout, no de esta migración.

### Security and access

- Auth/access gate: `capability` + `module_assignment` per-org. Las routes/commands consumers hacen `can(subject, 'growth.seo.*', action, scope)` + `enforceSeoRunEntitlement` para el gate de costo/allowance.
- Sensitive data posture: sin PII/payroll/finance. Solo el plano de autorización + métricas de gasto SEO (no sensibles).
- Error contract: bloqueos vía `blockedReason` estable (enum cerrado) mapeado a canonical error en los consumers; nunca prosa cruda. El resolver retorna `{ allowed: false, blockedReason }`, no lanza para un bloqueo esperado.
- Abuse/rate-limit posture: **quota cap por-org** en `enforceSeoRunEntitlement` (allowance por período + budget backstop leyendo `seo_provider_spend_daily`) — el gate de costo DataForSEO (riesgo #1). La puerta pública (diferida) reusa el rate-limit del patrón `public-submission`.

### Runtime evidence

- Local checks: `pnpm test src/lib/entitlements/capability-grant-coverage.test.ts` verde (5 capabilities cubiertas) + `pnpm test src/lib/growth/seo/__tests__/entitlement.test.ts` (chokepoint: sin assignment → `no_entitlement`; allowance agotada → `quota_exhausted`; budget excedido → `budget_exhausted`; assignment activo con cupo → `allowed`).
- DB/runtime checks: `pnpm migrate:up` + SELECT de que las 5 filas `growth.seo.*` existen en `capabilities_registry` con `deprecated_at IS NULL`; el DO-block aborta si faltan.
- Integration checks: crear un `module_assignments` `seo_v1` de prueba para una org y confirmar que `enforceSeoRunEntitlement` la habilita; revocarlo y confirmar que bloquea (`no_entitlement`).
- Reliability signals/logs: N/A directo en esta task (el signal `seo.provider.cost_over_budget` lo materializa 1303; el chokepoint provee el dato de allowance/budget que consumirá).
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [x] **Lógica en el primitive, no en la UI.** El entitlement/allowance vive en `src/lib/growth/seo/entitlement.ts` (`enforceSeoRunEntitlement`), reusable por cron/command/UI/Nexa/MCP; ninguna UI reimplementa el gate.
- [x] **Modelada como aggregate/recurso/command, no como click-handler.** Las capabilities `growth.seo.*` modelan acciones de negocio (configurar target, disparar audit, leer observación/report, gestionar entitlement); el chokepoint es un reader gobernado del entitlement per-org.
- [x] **Read** expuesto como reader canónico (`enforceSeoRunEntitlement`, resolver per-org); **write** (configurar target / disparar audit / gestionar entitlement) como command gobernado en los consumers (1303/1304) con capability, authorization fina (per-org via `module_assignments`, NO admin-coarse), idempotencia, audit/outbox, errores canónicos.
- [x] **Capability + grant en el MISMO PR.** Las 5 capabilities se seedean en `capabilities_registry` + `entitlements-catalog.ts` + se grantean a ≥1 rol real en `runtime.ts` + `capability-grant-coverage.test.ts` verde (esta task).
- [x] **Camino programático declarado.** El chokepoint y las capabilities son consumibles por Product API/`api/platform/*`/MCP/CLI; los endpoints concretos nacen en 1303/1304/1310. Deuda documentada: sin consumer runtime hasta esas tasks (secuenciadas en EPIC-022).
- [x] **Write apto para `propose → confirm → execute`.** Los writes de negocio (audit.run, target.configure) se implementan bajo ese runtime gobernado en los consumers; esta task fija el plano de autorización, no una integración Nexa-específica.
- [x] **Un primitive, muchos consumers.** `enforceSeoRunEntitlement` es el único gate; cero lógica de entitlement duplicada por consumer.
- [x] **Parity check = SÍ.** Cada capability `growth.seo.*` tiene contrato gobernado a nivel capability → todos los consumers (incl. Nexa) la operan por construcción. Deuda: los commands/readers de datos SEO llegan en 1302–1305, gateados por estas capabilities.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capabilities + registry seed + grants + coverage

- Agregar las 5 capabilities `growth.seo.*` a `entitlements-catalog.ts` (module `growth`; scopes: `target.configure`/`audit.run`/`entitlement.manage` = `execute`+`tenant`; `observation.read` = `read`+`tenant`; `report.read_client` = `read`+`own`).
- Migración seed en `greenhouse_core.capabilities_registry` (INSERT + `ON CONFLICT (capability_key) DO UPDATE` + marker `-- Up Migration` + DO-block que aborta si `count <> 5`; Down = `deprecated_at = NOW()`). Patrón espejo de `20260628105903574_task-1277-aeo-run-capabilities.sql`.
- Grants en `runtime.ts`: set operador interno (route_group `internal` ∪ `EFEONCE_ADMIN` ∪ `EFEONCE_ACCOUNT` ∪ `EFEONCE_OPERATIONS` ∪ `AI_TOOLING_ADMIN`) para `target.configure`/`audit.run`/`observation.read`; `entitlement.manage` solo `EFEONCE_ADMIN` + `EFEONCE_ACCOUNT` (espejo AEO); `report.read_client` a `client_executive`/`client_manager`/`client_specialist` scope `own` (+ réplica al superset interno para el coverage guard, patrón AEO).
- `capability-grant-coverage.test.ts` verde. `pnpm migrate:up` + verificación de las 5 filas.

### Slice 2 — Per-org entitlement + chokepoint `enforceSeoRunEntitlement`

- `src/lib/growth/seo/entitlement.ts`: resolver per-org espejo de `resolveAeoEntitlement` — lee `module_assignments` (`module_key='seo_v1'`, `status IN ('active','pilot')`, no expirado), resuelve tier (`contracted|trial|pilot` desde `metadata_json.seo_tier`) + allowance del período + budget backstop leyendo `seo_provider_spend_daily` (TASK-1300).
- `enforceSeoRunEntitlement(organizationId, actor, { estimatedCostUsd? })` → `{ allowed, tier, allowanceRemaining, blockedReason }` con enum de bloqueo cerrado (`no_entitlement|expired|quota_exhausted|budget_exhausted`). **Quota cap por-org** duro: no habilita un run que exceda el cap del tier o el budget global.
- Las 4 puertas documentadas en el módulo: operador (`entitlement.manage`, todas las orgs), contratado (assignment activo → observación + report), trial/PLG (assignment con quota cap + expiry), público (diferido — quick-check rate-limited reusando el patrón `public-submission`; no se implementa acá, solo se deja el hook).
- Tests del chokepoint (sin assignment, expirado, cupo agotado, budget excedido, habilitado).

## Out of Scope

- Schema de datos SEO (`seo_targets`, snapshots) — TASK-1299.
- Cliente DataForSEO / registry de familias / tabla `seo_provider_spend_daily` — TASK-1300 (esta task LEE el contador, no lo crea).
- Crons de captura, readers de datos SEO, reactive BQ mirror, reliability signals — TASK-1303–1305.
- El command que crea/revoca un `module_assignments` `seo_v1` (surface de `entitlement.manage`) — se implementa en el consumer operador (o follow-up); esta task define la capability, no su endpoint.
- La puerta pública (quick-check) end-to-end — diferida (§10.2); acá solo el hook.
- Cualquier UI — TASK-1306–1310.

## Detailed Spec

Ver el contrato canónico en `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §9`. Las 5 capabilities espejan el grain de `growth.ai_visibility.*`: `growth.seo.target.configure` (execute, tenant — autor de targets/keywords/competitors), `growth.seo.audit.run` (execute, tenant — disparar site audit), `growth.seo.observation.read` (read, tenant — rank/backlink/audit reads del contratado/operador), `growth.seo.report.read_client` (read, own — gate del report cliente de SU org), `growth.seo.entitlement.manage` (execute, tenant — el operador grantea acceso per-org). El **acceso efectivo es per-org vía `module_assignments`** (módulo `seo_v1`, tier en `metadata_json.seo_tier`), NO por rol — lección TASK-1248 (el AEO se corrigió de viewCode role-wide a assignment per-org; el SEO nace ya per-org). Las **4 puertas**: operador (interno, todas las orgs, `entitlement.manage`), contratado (assignment activo → observación + report), trial/PLG (assignment con quota cap + expiry), público (diferido, quick-check rate-limited sobre el chokepoint, sin persistencia más allá de lead capture). El **chokepoint único `enforceSeoRunEntitlement`** centraliza el gate de costo DataForSEO (riesgo #1, §13.1): resuelve entitlement → ventana → allowance → budget con **quota cap por-org**, espejando `resolveAeoEntitlement`. Reversibilidad (§13.5): revocar el assignment `seo_v1` corta el acceso de una org sin tocar código.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (capabilities + registry seed + grants + coverage) es prerequisito duro: sin las capabilities registradas y grantadas, el chokepoint no tiene qué chequear y el coverage guard rompe el build. Slice 2 (chokepoint) construye encima. Orden estricto Slice 1 → Slice 2. La migración seed va en Slice 1, en el MISMO PR que el catálogo TS + grants (capability-grant coverage rule).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Capability seedeada sin grant → build roto | identity/entitlements | high | grant a ≥1 rol real en `runtime.ts` en el MISMO PR + `capability-grant-coverage.test.ts` como gate | CI rojo (coverage test) |
| Modelar acceso por rol en vez de per-org (re-error TASK-1248) | growth/identity | medium | acceso efectivo vía `module_assignments` (`seo_v1`); el rol es solo el plano fino; chokepoint valida el módulo | review + test del chokepoint sin assignment |
| Over-exposure per-org: un cliente ve otra org | seguridad | medium | `report.read_client` scope `own`, org derivada server-side; el chokepoint recibe `organizationId` server-derived, nunca del request | test de scope own + review |
| Rol fantasma en el grant → colapsa a admin | identity | low | grants solo contra `src/config/role-codes.ts` (14 reales) | review contra role-codes.ts |
| Quota cap no aplica → gasto DataForSEO se dispara | growth ($) | high | `enforceSeoRunEntitlement` bloquea con `blockedReason` cuando allowance/budget agotado; único chokepoint (ningún consumer lo salta) | test de quota_exhausted/budget_exhausted |
| Seed marker invertido → capabilities nunca registradas | data | medium | marker `-- Up Migration` exacto + DO-block RAISE EXCEPTION si `count <> 5` | migración falla loud |
| Chokepoint sin `seo_provider_spend_daily` (1300 no mergeado) | data | medium | degradación honesta: si la tabla no existe, el gate de budget queda inerte pero el gate de allowance sigue; declarar dependencia de orden de merge | test con tabla ausente |

### Feature flags / cutover

- Sin flag propio del plano de autorización (las capabilities pueden existir grantadas sin daño; ninguna org tiene assignment). El módulo completo detrás de `GROWTH_SEO_ENABLED` (default OFF) + fila en `FEATURE_FLAG_STATE_LEDGER.md` (declarada en la task que prende el primer consumer, 1302/1303). Cutover per-org = crear el `module_assignments` `seo_v1` (Berel primero, Fase 0).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (quita catálogo TS + grants) + reverse migration (`deprecated_at = NOW()` en las 5 capabilities) | <10 min | si (sin org con assignment) |
| Slice 2 | revert PR (quita el chokepoint) | <10 min | si (read-only, no muta) |
| Acceso de una org | revocar su `module_assignments` `seo_v1` (`effective_to`/`status`) | <2 min | si (sin tocar código) |

### Production verification sequence

1. `pnpm migrate:up` en staging → DO-block confirma las 5 filas `growth.seo.*` en `capabilities_registry`.
2. `pnpm test src/lib/entitlements/capability-grant-coverage.test.ts` verde (coverage sin brecha).
3. Crear un `module_assignments` `seo_v1` de prueba (org agente/Berel) con `metadata_json.seo_tier='contracted'` → `enforceSeoRunEntitlement(orgId, actor)` retorna `allowed: true` + `tier: 'contracted'`.
4. Agotar el allowance simulado / exceder budget → confirmar `blockedReason` correcto (`quota_exhausted`/`budget_exhausted`).
5. Revocar el assignment → confirmar `no_entitlement`. Con un `client_*` distinto, confirmar que `report.read_client` scope `own` no cruza a otra org.
6. Prod vía release control plane (additive) cuando el módulo se secuencie; el operador crea el primer assignment real (Berel) como paso de rollout.

### Out-of-band coordination required

- El operador (AM/admin con `entitlement.manage`) crea el primer `module_assignments` `seo_v1` para la org piloto (Grupo Berel, Fase 0) — es un paso de rollout operativo, no de la migración. Verificar orden de merge con TASK-1300 (`seo_provider_spend_daily`) para que el gate de budget tenga su fuente [verificar].

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 5 capabilities `growth.seo.*` (`target.configure`, `audit.run`, `observation.read`, `report.read_client`, `entitlement.manage`) existen en `entitlements-catalog.ts` **y** `greenhouse_core.capabilities_registry` (seed en el mismo PR).
- [ ] Cada capability grantada a ≥1 rol real de `src/config/role-codes.ts` en `runtime.ts`; `capability-grant-coverage.test.ts` verde (sin capability `can()`-checked sin grant).
- [ ] `report.read_client` scope `own`, grantada a `client_executive`/`client_manager`/`client_specialist`; org derivada server-side (test de scope own).
- [ ] `entitlement.manage` grantada solo a `EFEONCE_ADMIN` + `EFEONCE_ACCOUNT` (espejo AEO).
- [ ] Acceso efectivo per-org vía `module_assignments` (`module_key='seo_v1'`), NO por rol (test: rol sin assignment → bloqueado).
- [ ] `enforceSeoRunEntitlement` es el único chokepoint; resuelve tier + allowance + budget con quota cap por-org; bloquea con `blockedReason` cerrado (`no_entitlement|expired|quota_exhausted|budget_exhausted`).
- [ ] Migración seed con marker `-- Up Migration` + DO-block que aborta si `count <> 5`; Down = `deprecated_at = NOW()` (cero DROP de datos).
- [ ] Cero grant a rol fantasma; cero referencia a payroll/finance/`grader_*`.
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (incluye `capability-grant-coverage.test.ts` + tests del chokepoint `enforceSeoRunEntitlement`)
- `pnpm migrate:up` en staging + SELECT contra `capabilities_registry` (5 filas `growth.seo.*`, `deprecated_at IS NULL`) + smoke del chokepoint con un `module_assignments` `seo_v1` real (habilita) y revocado (bloquea).

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1303/1304 pasan por `enforceSeoRunEntitlement`; TASK-1310 gateado por `report.read_client`)
- [ ] documentación técnica (arquitectura del dominio SEO §9 refleja las capabilities + puertas + chokepoint reales) + entitlements/roles doc actualizado

## Follow-ups

- `TASK-1303` — rank capture command invoca `enforceSeoRunEntitlement` antes de gastar + materializa `seo.provider.cost_over_budget`.
- `TASK-1304` — site audit/backlinks gateados por `growth.seo.audit.run` + chokepoint.
- `TASK-1310` — report cliente gateado por `growth.seo.report.read_client`.
- Command/endpoint de `entitlement.manage` (crear/revocar assignment `seo_v1` per-org) — surface operador (o follow-up dedicado).
- Puerta pública (quick-check rate-limited) end-to-end — diferida (§10.2).

## Open Questions

1. ¿El resolver/chokepoint vive en `src/lib/growth/seo/entitlement.ts` (espejo de `ai-visibility/entitlement.ts`)? Propuesta: sí, mismo layout; confirmar en Discovery.
2. ¿El módulo se llama `seo_v1` en `module_assignments` (espejo de `ai_visibility_v1`)? Propuesta: `seo_v1`; confirmar convención con el operador.
3. ¿Orden de merge respecto a TASK-1300 (`seo_provider_spend_daily`)? Propuesta: 1300 antes para que el gate de budget tenga fuente; si 1301 va primero, el gate de budget degrada honesto hasta que 1300 aterrice. Resolver en Discovery.
4. ¿El command de `entitlement.manage` (crear/revocar assignment) entra en esta task o en un follow-up? Propuesta: follow-up (esta task define la capability, no su endpoint) para mantener el scope acotado.
