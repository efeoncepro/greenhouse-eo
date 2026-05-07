# TASK-614 — People / Payroll Economy Facet & Entitlements Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `—`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-611` (capabilities_registry table + FK + parity test infrastructure)
- Branch: `task/TASK-614-people-payroll-economy-facet-entitlements-hardening`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Endurecer la convergencia ya existente entre `People` y `Payroll` para que la faceta económica del colaborador deje de depender tanto de `roleCodes`, reduzca mezcla conceptual dentro del tab `economy`, y termine de apoyarse en readers canónicos `person-360` en vez de helpers transitorios/deprecated.

**Spec canónico vinculante**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` — esta task aplica el mismo patrón (capabilities registry + relationship resolver + projection helper + 7-layer defense) al objeto canónico `Persona` (member). El spec V1 es transversal: organizations + persons usan la misma infraestructura, solo cambian facets y relationships.

## Why This Task Exists

`People` y `Payroll` ya muestran un patrón bastante sano:

- `People` es la surface canónica del colaborador
- `/hr/payroll/member/[memberId]` ya redirige a `/people/[memberId]?tab=payroll`
- la persona ya expone contexto económico/finance/payroll dentro de su detail

O sea: a diferencia de `Organizaciones/Clientes`, aquí no hay dos experiencias rivales compitiendo por el mismo objeto.

Pero todavía quedan gaps de hardening importantes:

- la visibilidad de tabs y subfacets sigue muy anclada a `roleCodes`
- el tab `economy` mezcla payroll, compensation y finance como una bolsa demasiado amplia
- existen readers transitorios (`getPersonFinanceOverviewFromPostgres`) marcados como deprecated y pendientes de convergencia a `person-complete-360`
- el modelo de capabilities finas todavía no expresa con precisión quién puede ver qué parte del contexto económico del colaborador

Sin esta lane, la UX sigue siendo usable, pero el access model y la arquitectura de readers quedan a medio consolidar y dificultan escalar People como workspace enterprise.

## Goal

- Formalizar permisos finos para la faceta económica del colaborador.
- Reducir la mezcla conceptual del tab `economy` sin romper el patrón actual `Payroll -> People`.
- Converger readers deprecated hacia la capa `person-360`/`person-complete-360`.
- Dejar una base más robusta para futuras surfaces HR/Finance sobre persona.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` ← **spec canónico vinculante** (patrón transversal organization + person)
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/tasks/complete/TASK-784-person-legal-profile-identity-documents-foundation.md` (TASK-784 ya canonizó `person.legal_profile.*` con 6 capabilities)
- `docs/tasks/in-progress/TASK-731-reporting-hierarchy.md` (TASK-731 entregó helpers de manager↔direct-report)

Reglas obligatorias:

- `People` sigue siendo la surface canónica del colaborador; esta task no debe crear un detail paralelo dentro de Payroll.
- `Payroll` puede seguir teniendo entrypoints operativos propios, pero el detalle persona-céntrico debe mantenerse en `People`.
- **Capability namespace canónico**: `person.<facet>.<action>` transversal con `scope ∈ {own, tenant, all}`. `person` se agrega al modules union (mismo patrón que `organization` en V1 spec). Entrypoint NO es dimensión de autorización.
- **Reuso obligatorio de primitives V1**: `capabilities_registry` (TASK-611), `home_rollout_flags`/`feature_rollout_flags` (TASK-780), `captureWithDomain('identity', ...)`, defense-in-depth 7-layer (TASK-742). NO recrear infraestructura.
- **Reuso de TASK-784**: `person.legal_profile.*` ya canonizado — esta task lo extiende con facets adicionales, NO lo redecide.
- La semántica económica de persona no puede recalcular negocio inline si ya existe un reader canónico en `person-360`.
- Cualquier separación interna de `economy` debe preservar compatibilidad URL y no romper deep-links existentes sin transición explícita.
- **Rollout flag mandatorio**: `person_workspace_facets_v2` gobierna el cutover. NO cambio default sin flag.
- **Server-only** mandatorio en projection helper (`import 'server-only'`).
- **Degraded mode honesto** cuando relationship resolver falla — NO crash, NO blank, mensaje en es-CL tuteo (skill `greenhouse-ux-writing`).

## Normative Docs

- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`
- `docs/tasks/in-progress/TASK-274-account-complete-360-federated-serving-layer.md`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/people/PersonView.tsx`
- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/people/helpers.ts`
- `src/lib/people/permissions.ts`
- `src/lib/people/get-person-finance-overview.ts`
- `src/lib/person-360/get-person-finance.ts`
- `src/app/api/people/[memberId]/finance/route.ts`
- `src/app/(dashboard)/hr/payroll/member/[memberId]/page.tsx`

### Blocks / Impacts

- future hardening de People 360 como workspace enterprise
- surfaces HR/Finance que consumen el contexto económico del colaborador
- follow-ups de permisos finos en People / Payroll / HR

### Files owned

- `src/views/greenhouse/people/PersonView.tsx`
- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/people/helpers.ts`
- `src/lib/people/permissions.ts`
- `src/lib/people/get-person-finance-overview.ts`
- `src/lib/person-360/get-person-finance.ts`
- `src/app/api/people/[memberId]/finance/route.ts`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

## Current Repo State (verified inventory 2026-05-07)

### Already exists

- `PersonView` + `PersonTabs` con 6 tabs visibles: `profile | activity | memberships | economy | payment | ai-tools`. Visibilidad por `TAB_PERMISSIONS` ligada a `roleCodes`.
- Tipos canónicos `src/types/person-complete-360.ts` con 8 facets: `identity | assignments | organization | leave | payroll | delivery | costs | staffAug`.
- Resolver canónico `getPersonComplete360(identifier, { facets: [...] })` con readers per-facet en `src/lib/person-360/facets/`.
- Reader deprecated `getPersonFinanceOverviewFromPostgres` con JSDoc explícito apuntando al resolver canónico.
- TASK-731 reporting_hierarchy entrega helpers manager↔direct-report: `getCurrentReportingLine`, `listDirectReports`, `listReportingSubtree`, `getEffectiveSupervisor`, `listReportingChain`, `listMembersWithoutSupervisor`.
- TASK-784 canonizó 6 capabilities `person.legal_profile.*` (read_masked / self_update / hr_update / verify / reveal_sensitive / export_snapshot).
- Patrón `Payroll → People` ya canónico vía redirect en `/hr/payroll/member/[memberId]`.

### Callers actuales de `/people/[memberId]` (Slice 0 inventory completed)

Bounded set — solo navegación interna:

| Caller                              | Path                                                       | Tipo                                                       |
| ----------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Org chart node                      | `OrgChartNodeCard.tsx`, `OrgLeadershipNodeCard.tsx`        | Click en nodo del orgchart                                 |
| HR org chart sidebar                | `HrOrgChartView.tsx`                                       | Botón + sidebar link                                       |
| People list/table row               | `PeopleList.tsx`, `PeopleListTable.tsx`                    | `router.push` / `Link href`                                |
| Nexa mention                        | `NexaMentionText.tsx`                                      | Resolver de mention en threads                             |
| Supervisor workspace                | `SupervisorWorkspaceView.tsx`                              | HR approvals + member detail link                          |
| Payment profile drawer              | `PaymentProfilesView.tsx`                                  | `router.push('/people/[id]?tab=payment')` deep-link        |
| Talent discovery                    | `TalentDiscoveryView.tsx`                                  | Click en candidate result                                  |
| Admin user detail                   | `GreenhouseAdminUserDetail.tsx`                            | Cross-link admin → people                                  |
| Deep-link catalog                   | `navigation/deep-links/definitions/internal.ts`            | Registro canónico de deep-links                            |

**Sin callers externos** (emails, webhooks, integraciones). Blast radius bajo. Migración no afecta deep-links cross-system.

### Gap

- Visibilidad de tabs sigue por `roleCodes` (`TAB_PERMISSIONS`), NO por capabilities finas — solo `person.legal_profile.*` existe en el namespace `person.*`.
- Tab `economy` mezcla 3-4 sub-conceptos (compensation / payroll / benefits / finance_impact) sin contrato fino.
- No existe relationship resolver canónico (`self`, `manager`, `peer`) — comparaciones inline `accessContext.userId === targetMemberId` repartidas por código.
- Reader `getPersonFinanceOverviewFromPostgres` deprecated sin lint rule que prevenga nuevos usos ni cutover plan formal.
- No existe `personWorkspaceProjection` helper canónico — la UI compone visibilidad ad-hoc.
- No hay reliability signal para detectar drift `roleCodes ↔ projection` durante el cutover.
- No hay rollout flag para gating del cutover V1→V2.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Caller inventory + degraded path UX spec

- ✅ Inventory completado (sección "Callers actuales" arriba). Bounded set sin callers externos.
- Spec del mensaje degradado (cuando relationship resolver falla o subject sin acceso):
  - Copy en es-CL tuteo via skill `greenhouse-ux-writing` antes de implementar.
  - 3 estados: `success` / `degraded_no_access` / `degraded_self_unresolved`.
  - NO redirect silente. NO blank state. NO crash.

### Slice 1 — Capability namespace `person.*` + facet contract

Decisión cerrada: namespace canónico es `person.<facet>.<action>` transversal con `scope ∈ {own, tenant, all}`. `person` se agrega al modules union (mismo patrón que `organization` en V1 spec).

**10 capabilities canónicas** (extiende las 6 ya existentes de TASK-784):

| Capability key            | Module   | Actions                       | Scopes válidos         | Semántica                                                 |
| ------------------------- | -------- | ----------------------------- | ---------------------- | --------------------------------------------------------- |
| `person.identity`         | `person` | `read`                        | `own`, `tenant`, `all` | Datos básicos: nombre, foto, email work, status           |
| `person.legal_profile.*`  | `person` | (TASK-784 — preserved as-is)  | (TASK-784)             | RUT, dirección legal, identity documents                  |
| `person.assignments`      | `person` | `read`                        | `own`, `tenant`, `all` | Memberships activas + roles in account                    |
| `person.organizations`    | `person` | `read`                        | `own`, `tenant`, `all` | Lista de orgs donde tiene assignment (canonical 360)      |
| `person.compensation`     | `person` | `read`, `read_sensitive`      | `own`, `tenant`, `all` | Salario base, bonos, equity (sensitive split)             |
| `person.payroll`          | `person` | `read`, `read_sensitive`      | `own`, `tenant`, `all` | Recibos históricos, descuentos, status pago               |
| `person.benefits`         | `person` | `read`, `approve`             | `own`, `tenant`, `all` | Vacaciones, balances, leave requests                      |
| `person.delivery`         | `person` | `read`                        | `own`, `tenant`, `all` | Tasks, projects, ICO contributions                        |
| `person.finance_impact`   | `person` | `read`, `read_sensitive`      | `tenant`, `all`        | Loaded cost, member-period attribution, cost intelligence |
| `person.tooling`          | `person` | `read`, `manage`              | `own`, `tenant`, `all` | AI-tooling licenses, perks                                |
| `person.staff_aug`        | `person` | `read`, `update`              | `tenant`, `all`        | Placement records, contracted hours                       |

**Notas**:

- `read_sensitive` separado de `read` para PII/comp details (patrón TASK-784 + TASK-766).
- `person.compensation` es NUEVO (split del payroll para distinguir contractual vs operacional).
- `person.benefits` reemplaza el facet `leave` del 360 (más amplio: cubre vacaciones + perks + tooling).
- TASK-784 capabilities preservadas tal cual.

**Mapping facet TS ↔ capability key** en `src/lib/person-workspace/facet-capability-mapping.ts`.
**Mapping facet → viewCode** en `src/lib/person-workspace/facet-view-mapping.ts` (insumo del reliability signal).

### Slice 2 — Capabilities registry seed + FK enforcement

- Migration `migrations/<ts>_person-capabilities-registry-seed.sql`:
  - Extiende `greenhouse_core.capabilities_registry` (creada por TASK-611) con seed de las 10 capabilities `person.*`.
  - Reusa la FK `entitlement_grants.capability_key → capabilities_registry` ya enforced por TASK-611.
- Verificar DDL aplicado via `information_schema` (anti pre-up-marker bug TASK-768 Slice 1).
- Test paridad TS↔DB extendido para incluir person capabilities.
- **NO crear tabla nueva** — reusa la canonizada por TASK-611 Slice 2.

### Slice 3 — Relationship resolver canónico para person

- Helper `src/lib/person-workspace/relationship-resolver.ts` con type union `SubjectPersonRelation` (6 kinds):

  ```ts
  type SubjectPersonRelation =
    | { kind: 'self'; userId: string; memberId: string }
    | { kind: 'manager'; supervisorPath: ReportingLineRecord[]; depth: 'direct' | 'subtree' | 'chain' }
    | { kind: 'internal_admin'; tenantId: string; adminScope: 'efeonce_admin' | 'hr_admin' | 'finance_admin' }
    | { kind: 'peer'; sharedAssignmentIds: string[] }
    | { kind: 'unrelated_internal'; tenantId: string }
    | { kind: 'no_relation' }
  ```

- **Reusa primitives existentes**: TASK-731 `getCurrentReportingLine` + `listReportingSubtree` para detectar `manager`, `client_team_assignments` para `peer`, `role_assignments` para `internal_admin`.
- Single Postgres roundtrip con CTEs (mismo patrón TASK-611 §4.3).
- Cross-tenant isolation enforced en WHERE clause.
- **Self-detection canonizado**: helper `isSelf(subject, memberId)` reemplaza las comparaciones inline `accessContext.userId === memberId` repartidas en código.
- Tests matriz: 6 relations × 10 facets × 4 entrypoints = 240 assertions (snapshot table).
- Tests cross-tenant: subject del tenant A NO puede leer member del tenant B sin scope `all`.

### Slice 4 — Person workspace projection helper + cache

- Helper `src/lib/person-workspace/projection.ts`:
  - `import 'server-only'` mandatorio.
  - `resolvePersonWorkspaceProjection({ subject, memberId, entrypointContext })` → `PersonWorkspaceProjection`.
  - Pure function, composición determinística (mismo orden 1-7 que V1 spec §4.4).
  - Default facet por entrypoint:
    - `people` → `'profile'`
    - `hr` → `'payroll'` (cuando viene de `/hr/payroll/member/[id]` redirect)
    - `my_workspace` → `'profile'` (self)
    - `admin` → `'identity'`
- Tipo de retorno (mirror del V1 spec, distinto type per object):

  ```ts
  type PersonWorkspaceProjection = {
    memberId: string
    entrypointContext: 'people' | 'hr' | 'my_workspace' | 'admin'
    relationship: SubjectPersonRelation
    visibleFacets: PersonFacet[]
    visibleTabs: PersonTab[]
    defaultFacet: PersonFacet
    allowedActions: PersonWorkspaceAction[]
    fieldRedactions: Partial<Record<PersonFacet, string[]>>
    degradedMode: boolean
    degradedReason: 'relationship_lookup_failed' | 'entitlements_lookup_failed' | 'no_facets_authorized' | 'self_resolution_failed' | null
    cacheKey: string
    computedAt: Date
  }
  ```

- Cache in-memory TTL 30s keyed por `${subjectId}:${memberId}:${entrypointContext}` (mismo patrón TASK-780).
- `clearPersonProjectionCacheForSubject(subjectId)` invocable por consumer del outbox event de TASK-404.
- Degraded mode: nunca throw. Degraded honesto.

### Slice 5 — Economy facet sub-decomposition

- Decisión: el tab `economy` se mantiene como **single tab UI** con **sub-secciones internas** declarativas (NO sub-tabs, preserva URL stable).
- Sub-secciones canónicas:
  - **Compensación** (consume `person.compensation:read|read_sensitive`)
  - **Nómina y recibos** (consume `person.payroll:read|read_sensitive`)
  - **Beneficios y vacaciones** (consume `person.benefits:read`)
  - **Impacto financiero** (consume `person.finance_impact:read|read_sensitive`)
- Cada sub-sección es self-contained (queries propias, drawers propios). Si capability no autorizada → sub-sección oculta (NO mensaje "denied", solo no aparece).
- Si las 4 sub-secciones quedan denegadas → tab `economy` no visible.
- Sub-decomposición en `src/views/greenhouse/people/tabs/EconomyTab.tsx` consumiendo `projection.allowedActions` y `projection.fieldRedactions`.

### Slice 6 — Reader convergence to person-360 + lint enforcement

- Migrar callers de `getPersonFinanceOverviewFromPostgres` a `getPersonComplete360(identifier, { facets: ['payroll', 'costs', 'assignments'] })`. Lista de callers via grep — completar inventory.
- Lint rule `greenhouse/no-deprecated-person-finance-reader` (modo `error`): bloquea import de `getPersonFinanceOverviewFromPostgres` en código nuevo. Override block solo para el archivo deprecated propio (mientras tenga callers transicionales).
- Reliability signal `identity.person_workspace.deprecated_reader_usage` cuenta llamadas residuales. Steady = 0 cuando cutover completo.
- Cuando `deprecated_reader_usage = 0` por 30 días → DELETE del helper deprecated (TASK derivada V1.1).

### Slice 7 — Reliability signals + rollout flag + payroll entrypoint hardening

- Reader `src/lib/reliability/queries/person-workspace-projection-drift.ts` con query analog a V1 spec §6.
- Signal `identity.person_workspace.facet_view_drift` (kind=`drift`, severity=`warning` si count>0, steady=0). Detecta drift entre `roleCodes` legacy `TAB_PERMISSIONS` y projection nueva durante el cutover.
- Signal `identity.person_workspace.deprecated_reader_usage` (kind=`drift`, severity=`warning` si count>0, steady=0).
- Wire bajo subsystem `Identity & Access`.
- Rollout flag `person_workspace_facets_v2` (extender CHECK de `home_rollout_flags.flag_key` o consumir `feature_rollout_flags`).
- **Payroll entrypoint hardening**: `/hr/payroll/member/[memberId]` redirect a `/people/[memberId]?tab=economy&entrypoint=hr` con `entrypointContext='hr'` y `defaultFacet='payroll'` cuando flag enabled.

### Slice 8 — Tests + docs + 4-pillar verification

- Unit tests: relationship resolver, projection helper, capability checks per facet × relationship.
- Test cross-tenant isolation explícito.
- Test self-detection (`subject.userId === member.userId` legítimo NO se sobreescribe).
- Playwright `tests/e2e/smoke/person-workspace.spec.ts` con storage state agente:
  - Path success por relationship (self / manager / hr_admin).
  - Path degraded (subject sin acceso → mensaje en es-CL tuteo).
  - Deep-link `/hr/payroll/member/[id]` redirige correcto.
- Actualizar `docs/architecture/Greenhouse_HRIS_Architecture_v1.md` y `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` con Delta enlazando spec V1.
- Doc funcional `docs/documentation/people/persona-workspace.md`.
- 4-pillar score block.

## Out of Scope

- Rehacer completo el módulo Payroll.
- Abrir un segundo workspace de persona en HR o Finance.
- Cambiar startup policy o navegación broad del portal.
- Mezclar esta lane con `EPIC-008` de organizaciones/clientes.
- Retirar `roleCodes` legacy en V1 — coexisten con projection. Colapso post-soak ≥6 meses con `facet_view_drift = 0` sostenido.
- Activación de `entrypointContext='client_portal'` para personas — fuera de scope V1 (Globe scope).

## Detailed Spec

**Spec canónico vinculante**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`. Esta task aplica el mismo patrón al objeto canónico `Persona`/`Colaborador`.

### Decisiones cerradas (NO re-debatir)

1. **Namespace**: `person.<facet>.<action>` transversal con `scope ∈ {own, tenant, all}`. `person` se agrega al modules union.
2. **Reuso obligatorio de infraestructura V1**: `capabilities_registry` (TASK-611), `feature_rollout_flags`/`home_rollout_flags` (TASK-780), `captureWithDomain('identity', ...)`, defense-in-depth 7-layer (TASK-742). NO crear infraestructura paralela.
3. **TASK-784 preservada**: `person.legal_profile.*` (6 capabilities) queda intacto. Esta task lo extiende, NO redecide.
4. **Self-detection canonizada**: helper `isSelf(subject, memberId)` reemplaza comparaciones inline `accessContext.userId === memberId` repartidas en código.
5. **`economy` queda como single tab UI** con sub-secciones internas (NO sub-tabs) — preserva deep-link stable.
6. **`getPersonFinanceOverviewFromPostgres` se deprecia con timeline**: lint rule + signal + cutover plan + DELETE en TASK derivada V1.1.
7. **Cache TTL 30s in-memory** (patrón TASK-780). NO materialización en BQ/PG.
8. **Server-only** mandatorio en projection helper.

### Decisión canónica (preservada del task original)

- `People` = workspace canónico del colaborador.
- `Payroll` = superficie operativa especializada con entrypoints propios.
- `economy` = faceta del colaborador, no un segundo objeto.
- `Payroll → People` redirect sigue siendo el path canónico para detail.

### Contrato de retorno (canónico, mirror del V1 spec)

```ts
type PersonWorkspaceProjection = {
  memberId: string
  entrypointContext: 'people' | 'hr' | 'my_workspace' | 'admin'
  relationship: SubjectPersonRelation
  visibleFacets: PersonFacet[]
  visibleTabs: PersonTab[]
  defaultFacet: PersonFacet
  allowedActions: PersonWorkspaceAction[]
  fieldRedactions: Partial<Record<PersonFacet, string[]>>
  degradedMode: boolean
  degradedReason: 'relationship_lookup_failed' | 'entitlements_lookup_failed' | 'no_facets_authorized' | 'self_resolution_failed' | null
  cacheKey: string
  computedAt: Date
}
```

## 4-Pillar Score

### Safety

- **Authorization granular**: 10+6 capabilities `person.<facet>.<action>` (10 nuevas + 6 de TASK-784 preservadas). `read_sensitive` separado de `read` para PII/comp details.
- **Cross-tenant isolation**: enforced en query del relationship-resolver (WHERE clause filtra por `tenant_id` derivado del subject).
- **Self-detection canónica**: helper `isSelf` reemplaza comparaciones inline. Single source of truth — no más drift.
- **Server-only**: projection helper con `import 'server-only'`. UI recibe sólo facets autorizados.
- **Manager scope cap**: `manager` relationship via TASK-731 supervisorPath — manager solo accede a `compensation`/`payroll` de subordinates en su subtree, nunca cross-chain ni laterales.
- **Blast radius**: degraded mode → `visibleFacets: []` + mensaje. Cero cross-tenant leak posible.
- **Verified by**: matriz personas test (240 asserts), capability-FK test, cross-tenant isolation test, self-detection unit test, lint rule `no-deprecated-person-finance-reader`.
- **Residual risk**: drift `roleCodes` legacy ↔ projection — cuantificado por `facet_view_drift` signal. Aceptado en V1 con plan de retiro post-soak.

### Robustness

- **Idempotency**: pure function. Cache no afecta corrección.
- **Atomicity**: registry seed migration atomic (`-- Up Migration` marker validated). Grants atómicos vía TASK-404.
- **Race protection**: `entitlement_grants` UNIQUE composite, `client_team_assignments` UNIQUE composite, `reporting_lines` UNIQUE active partial (TASK-731).
- **Constraint coverage**: PK + FK + CHECK en `capabilities_registry` (TASK-611); UNIQUE en assignments + reporting; FK enforcement vía NOT VALID + VALIDATE atomic.
- **Bad input**: `memberId` inválido → `no_relation` → degraded. NULL/undefined: type-narrowed por TS, runtime guard server-only.
- **Verified by**: parity test TS↔DB extendido, concurrency test, fuzz test inputs, FK violation test.

### Resilience

- **Retry policy**: read-only path. Cache absorbe ráfagas.
- **Dead letter**: N/A en projection (read-only). Consumer outbox cache invalidation tiene dead_letter signal.
- **Reliability signals**: `identity.person_workspace.facet_view_drift` (drift) + `identity.person_workspace.deprecated_reader_usage` (drift).
- **Audit trail**: TASK-404 `entitlement_grant_audit_log` (append-only) + TASK-784 `person_legal_profile_audit_log`. Projection es read-only — no requiere audit log propio.
- **Recovery**: cache corrupto → próximo request recomputa. Resolver falla → degraded honesto. Reader deprecated → lint rule bloquea regression. Nunca crash.
- **Degradación honesta**: 4 estados explícitos (`success` / `degraded_no_access` / `degraded_self_unresolved` / `degraded_relationship_failed`).

### Scalability

- **Hot path Big-O**: O(log n) en resolver (composite indexes en assignments + reporting), O(1) cache hit, O(10) projection compute.
- **Index coverage**: `client_team_assignments(member_user_id, organization_id, active_until)` parcial; `reporting_lines(member_id, supervisor_member_id, effective_until)` parcial; `entitlement_grants(subject_id, capability_key)`.
- **Async paths**: cache invalidation reactiva via outbox events. Sin path blocking.
- **Cost at 10x**: linear en usuarios activos. Cache TTL 30s amortiza ráfagas. Person count crece más rápido que org count en empresas — proyectar O(n_persons × n_subjects_que_los_ven) y validar con datos reales.
- **Pagination**: directorio People (`/people` lista) NO ejecuta projection completa per-row. Endpoint summary `accessLevel` para listas largas.
- **Verified by**: `EXPLAIN ANALYZE` resolver, load test 10x synthetic en `/people/[memberId]`, p99 latency budget < 200ms server-side.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `person` agregado al modules union con las 10 capabilities canónicas declaradas en el TS catalog (extiende las 6 de TASK-784).
- [ ] Seed extendido en `greenhouse_core.capabilities_registry` (tabla canónica TASK-611) con FK enforcement desde `entitlement_grants`.
- [ ] Test paridad TS↔DB pasa en CI extendido para incluir person capabilities.
- [ ] `relationship-resolver.ts` resuelve las 6 categorías canónicas con cross-tenant isolation enforced en SQL.
- [ ] Helper `isSelf(subject, memberId)` canonizado — comparaciones inline migradas.
- [ ] Helper `resolvePersonWorkspaceProjection` retorna el contrato canónico (incluyendo `degradedMode` honesto).
- [ ] Cache TTL 30s in-memory + invalidation reactiva via outbox events.
- [ ] Tab `economy` decompone en 4 sub-secciones (Compensación / Nómina / Beneficios / Impacto financiero) consumiendo capabilities finas.
- [ ] Lint rule `greenhouse/no-deprecated-person-finance-reader` activa en modo `error`.
- [ ] Reliability signals `identity.person_workspace.facet_view_drift` + `identity.person_workspace.deprecated_reader_usage` registrados y visibles en `/admin/operations`.
- [ ] Rollout flag `person_workspace_facets_v2` declarado y consumible.
- [ ] Patrón `Payroll → People` preservado: `/hr/payroll/member/[memberId]` redirect funcionando con `entrypointContext='hr'` + `defaultFacet='payroll'`.
- [ ] Tests: matriz personas (240 asserts) + cross-tenant isolation + self-detection + degraded mode.
- [ ] Playwright smoke por relationship type + entrypoint pasa.
- [ ] 4-pillar score block presente en este task file.
- [ ] `Greenhouse_HRIS_Architecture_v1.md` y `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` actualizados con Delta enlazando spec V1.
- [ ] Doc funcional `docs/documentation/people/persona-workspace.md` creado.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm migrate:up` + verificación DDL via `information_schema` (anti pre-up-marker bug)
- `pnpm pg:doctor` post-migration
- Test paridad TS↔DB extendido: `pnpm test:capabilities-parity`
- Reliability signals visibles en `/admin/operations` post-deploy
- Validación manual en `/people/[memberId]` y `/hr/payroll/member/[memberId]` (ambos paths con flag enabled vs disabled)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `Greenhouse_HRIS_Architecture_v1.md` y el contrato de access model quedaron alineados con la decisión final

## Follow-ups

- DELETE de `getPersonFinanceOverviewFromPostgres` cuando `deprecated_reader_usage = 0` por 30 días (TASK derivada V1.1).
- Activación de `entrypointContext='client_portal'` para Globe (Sky, etc.) — security review específico.
- Retiro de `roleCodes` legacy en `TAB_PERMISSIONS` cuando `facet_view_drift = 0` sostenido ≥6 meses.
- Split adicional de subfacets en `People` si el runtime demuestra que alguna sub-sección sigue siendo demasiado ancha.
- Convergencia de más readers legacy hacia `person-complete-360` (lista incremental por reader).
