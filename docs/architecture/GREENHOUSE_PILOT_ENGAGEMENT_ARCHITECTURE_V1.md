# GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1

> **Tipo de documento:** Spec de arquitectura canónica
> **Versión:** 1.2
> **Creado:** 2026-05-05 por Claude (Opus 4.7)
> **Última actualización:** 2026-05-07 por Codex — Delta v1.11 TASK-810 aplicado: DB guard anti-zombie
> **Estado:** Implementación por slices EPIC-014
> **Owner:** Comercial / Agency
> **Brand UI**: "Sample Sprint" (paraguas comercial). Schema interno usa `engagement_*` genérico — el rebranding marketing no requiere migrations.
> **Domain boundary:** Commercial (no Finance — ver `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`)

## Delta v1.10 (2026-05-07) — TASK-809 UI real + API wizards

TASK-809 conecta el mockup aprobado a runtime real:

1. **Surface real:** `/agency/sample-sprints` queda protegida por view `gestion.sample_sprints` y capability `commercial.engagement.read`. La navegacion muestra la entrada en Comercial y, para usuarios internos/admin, bajo Agencia > Operaciones.
2. **APIs:** `/api/agency/sample-sprints` lista/declara; `/:serviceId` lee detalle; `approve`, `progress` y `outcome` delegan a helpers canonicos previos. `/api/admin/commercial/engagement-approvals` expone la cola admin de approvals pendientes.
3. **Store reusable:** `src/lib/commercial/sample-sprints/store.ts` crea Sample Sprints como `services.engagement_kind IN ('pilot','trial','poc','discovery')`, `status='pending_approval'`, `commitment_terms_json` con criteria/deadline/cost/team, y approval inicial en la misma transaccion.
4. **Reportes:** el uploader privado canonico soporta `sample_sprint_report_draft` y `sample_sprint_report`; `recordOutcome()` y `convertEngagement()` attachan el asset al outcome dentro de la transaccion.
5. **Access model:** sin nuevos routeGroups ni startup policy. `views` usa `gestion.sample_sprints`; `entitlements` reutiliza `commercial.engagement.{read,declare,record_progress,record_outcome,approve}`.
6. **Drift documentado:** `schema-snapshot-baseline.sql` sigue desactualizado respecto de `services.engagement_kind`, pero runtime live, migrations TASK-801 y `src/types/db.d.ts` son consistentes. No crear migracion correctiva por este drift documental.

## Delta v1.11 (2026-05-07) — TASK-810 DB guard anti-zombie

TASK-810 cierra el slice final de EPIC-014 con defensa mecanica en DB:

1. **Drift corregido:** el diseño historico de §3.3 proponia un `CHECK` con `EXISTS`. PostgreSQL no permite subqueries dentro de `CHECK` y `CURRENT_DATE` en un CHECK tampoco reevalua filas por paso del tiempo. El mecanismo canonico queda corregido a trigger `BEFORE INSERT OR UPDATE`.
2. **Guard instalado:** migration `20260507183122498_task-810-engagement-anti-zombie-trigger.sql` crea `greenhouse_core.assert_engagement_requires_decision_before_120d()` y trigger `services_engagement_requires_decision_before_120d` sobre `greenhouse_core.services`.
3. **Predicado:** bloquea services non-regular activos, elegibles, >120 dias desde `start_date`, sin outcome ni lineage. Excluye `regular`, inactivos, `legacy_seed_archived`, `hubspot_sync_status='unmapped'`, estados no activos y terminales `cancelled|closed`.
4. **Operacion:** el camino normal de resolucion es registrar outcome en `/agency/sample-sprints/[serviceId]/outcome`; el runbook vive en `docs/operations/runbooks/engagement-zombie-handling.md`.
5. **Preflight:** `scripts/commercial/preflight-zombie-check.ts` reporta `space_id`/`organization_id` porque `services` no tiene `client_id` en runtime real.
6. **Reliability:** `commercial.engagement.zombie` sigue detectando el drift a 90 dias; el trigger aplica hard stop a 120 dias.

## Delta v1.9 (2026-05-07) — TASK-807 Commercial Health implementada

TASK-807 formaliza `Commercial Health` como subsystem operativo del módulo reliability `commercial`:

1. **Módulo existente, subsystem nuevo:** `commercial` ya existía en `STATIC_RELIABILITY_REGISTRY` por TASK-813; TASK-807 no crea un módulo paralelo, agrega `Commercial Health` como `OperationsSubsystem` y lo mapea a `moduleKey='commercial'`.
2. **Primitive compartida:** `src/lib/commercial/sample-sprints/health.ts` centraliza los conteos read-only de health para evitar duplicar SQL entre `/admin/ops-health` y `getReliabilityOverview()`.
3. **Seis signals:** cinco readers nuevos (`overdue_decision`, `budget_overrun`, `zombie`, `unapproved_active`, `conversion_rate_drop`) más `stale_progress` de TASK-805 reutilizado. Todos degradan a `unknown` ante error y no mutan estado.
4. **Drift resuelto — `transition_event`:** esa columna/tabla no existe en runtime. `zombie` se define como service non-regular elegible, activo por >90 días, sin `engagement_outcomes` y sin `engagement_lineage` como parent/child.
5. **Budget real:** `budget_overrun` compara `engagement_approvals.expected_internal_cost_clp` contra actuals agrupados por `service_id` desde `greenhouse_serving.commercial_cost_attribution_v2`; no usa solo `gtm_investment_pnl` porque esa view filtra `terms_kind='no_cost'`.
6. **Conversion threshold:** default `30%`, configurable vía `GREENHOUSE_COMMERCIAL_ENGAGEMENT_CONVERSION_RATE_THRESHOLD` (`0.3` o `30`). Sin outcomes trailing 6m el signal queda `ok` por falta de denominador evaluable.
7. **Surface real:** el subsystem queda visible en `/admin/ops-health`; referencias históricas a `/admin/operations` deben tratarse como legacy naming del Ops Health dashboard.

## Delta v1.3 (2026-05-06) — TASK-801 implementada con 2 ajustes vs spec

TASK-801 (Slice 1 / Capa 1 + 1b) cerrada 2026-05-06 vía migration `20260506200742463_task-801-engagement-primitive-services-extension.sql`. Auditoría pre-implementación detectó dos desvíos vs el repo real, corregidos en la migration sin alterar el intent:

1. **`services.service_id` es `TEXT`, no `UUID`.** §3.2 Capa 1b declaraba el FK como `UUID REFERENCES services(service_id)`. Realidad: el PK de `services` es `text` (creado con la convención `svc-<uuid>` como string), y `client_team_assignments.assignment_id` también es `text`. **Corrección aplicada**: `service_id TEXT REFERENCES greenhouse_core.services(service_id) ON DELETE SET NULL`. Las futuras tablas de §3.2 (Capa 2 `engagement_commercial_terms`, Capa 3 `engagement_phases`/`engagement_outcomes`/`engagement_lineage`, etc.) que referencian `services.service_id` deben usar `TEXT` también — actualizar specs cuando se implementen TASK-802 onwards.

2. **`commercial_cost_attribution_v2` es VIEW, no TABLE.** §3.2 Capa 6.2 (cost intelligence) declaraba `ALTER TABLE commercial_cost_attribution_v2 ADD COLUMN attribution_intent`. Realidad: v2 es VIEW canónica creada en TASK-708 y refinada en TASK-709b (UNION ALL de 3 CTEs). **Corrección aplicada:** TASK-801 agregó la columna como literal operacional; TASK-806 reemplazó esa semántica por derivación real para rows service-linked. La VIEW ahora propaga `service_id` desde `client_team_assignments` y solo emite `pilot/trial/poc/discovery` cuando el service está aprobado, activo, no archivado legacy y no unmapped. TASK-815 agrega la ancla canónica para direct-client expenses mediante allocations aprobadas; sin esa fila explícita siguen `operational`.

**Estado post-implementación verificado**:

- 4 columnas creadas: `services.engagement_kind` text NOT NULL DEFAULT 'regular', `services.commitment_terms_json` jsonb NULL, `client_team_assignments.service_id` text NULL, `commercial_cost_attribution.attribution_intent` text NOT NULL DEFAULT 'operational'.
- 2 CHECK constraints aplicados: `services_engagement_kind_check` (5 valores), `commercial_cost_attribution_attribution_intent_check` (6 valores).
- 1 índice partial: `client_team_assignments_service_idx WHERE service_id IS NOT NULL`.
- VIEW v2 reescrita preservando shape exacto de TASK-709b + nueva columna.
- Backward compat 100%: 30/30 services preservan `'regular'`, 9/9 CCA rows preservan `'operational'`.
- Types regenerados en `src/types/db.d.ts`. `pnpm build`/`lint`/`test`/`tsc` clean.

**Hard rule futura**: cualquier task de EPIC-014 que cree FK a `services.service_id` debe usar `TEXT` no `UUID`. Cualquier task que extienda `commercial_cost_attribution_v2` debe usar `CREATE OR REPLACE VIEW`, no `ALTER TABLE`.

## Delta v1.4 (2026-05-07) — TASK-802 pre-implementation correction

TASK-802 corrige Capa 2 antes de implementar contra runtime real:

1. **`engagement_commercial_terms.service_id` debe ser `TEXT`, no `UUID`.** Es la aplicación directa de la hard rule de TASK-801: `greenhouse_core.services.service_id` es `text`.
2. **`declared_by` queda nullable en DB, requerido por helper.** La spec anterior combinaba `TEXT NOT NULL` con `ON DELETE SET NULL`, contrato contradictorio. Se alinea con TASK-760/761/762: el helper exige actor humano al declarar términos, pero la FK puede quedar `NULL` si el usuario se elimina para preservar historial.
3. **TASK-813 eligibility guard.** Cualquier write path de terms debe validar que el `service` sea engagement real elegible: `active=TRUE`, `status != 'legacy_seed_archived'` y `hubspot_sync_status IS DISTINCT FROM 'unmapped'`. Las filas archivadas por TASK-813 y las materializadas como `unmapped` no deben recibir términos comerciales operativos.

## Delta v1.5 (2026-05-07) — TASK-803 implementada

TASK-803 (Capas 3, 4 y 5) quedó implementada vía migration `20260507135645984_task-803-engagement-phases-outcomes-lineage.sql`:

1. **`engagement_phases`** modela hitos operativos del engagement con `phase_kind`, `phase_order`, ventana planificada, estado y actor de cierre. `UNIQUE (service_id, phase_order)` evita timeline ambiguo.
2. **`engagement_outcomes`** modela la decisión terminal con `outcome_kind`, rationale, métricas, asset de reporte y links opcionales a `next_service_id` o `next_quotation_id`. La tabla es append-only por triggers DB: cualquier corrección posterior debe ir por TASK-808 audit/outbox, no por mutación destructiva.
3. **`engagement_lineage`** modela transiciones parent/child multi-graph con `relationship_kind`, `transition_reason`, `recorded_by` y `UNIQUE (parent_service_id, child_service_id, relationship_kind)`.
4. **Runtime real preservado:** todas las FKs a `services`, `assets`, `quotations` y `client_users` usan `TEXT`, no `UUID`.
5. **TASK-813 hard guard reusable:** `src/lib/commercial/sample-sprints/eligibility.ts` centraliza la exclusión de services inactivos, `legacy_seed_archived` y `hubspot_sync_status='unmapped'`. Lo consumen `commercial-terms`, `phases`, `outcomes` y `lineage`.
6. **Sin access/UI en este slice:** no se agregan `routeGroups`, `views`, `entitlements`, startup policy, APIs, UI, reliability signals ni outbox events. TASK-808 conserva ownership del audit log/outbox de engagement.

## Delta v1.6 (2026-05-07) — TASK-804 implementada

TASK-804 (Capa 7 approval + capacity warning soft) quedó implementada vía migration `20260507145320864_task-804-engagement-approvals-capacity-warning.sql`:

1. **`engagement_approvals`** modela el state machine `pending | approved | rejected | withdrawn` con fila única por `service_id`, checks de shape por estado, actor evidence (`approved_by`, `rejected_by`, `withdrawn_by`) y `updated_at` automático.
2. **Runtime real preservado:** `service_id` usa `TEXT` hacia `greenhouse_core.services(service_id)`. Actor FKs apuntan a `greenhouse_core.client_users(user_id)` y son nullable en DB para soportar `ON DELETE SET NULL`; los helpers siguen exigiendo actor input.
3. **Capacity warning soft:** `src/lib/commercial/sample-sprints/capacity-checker.ts` calcula capacidad por miembro y periodo desde `client_team_assignments`, excluye asignaciones internas Efeonce y retorna `totalFte`, `allocatedFte`, `availableFte` y `conflictingAssignments`.
4. **Approval helpers:** `approvals.ts` expone `requestApproval`, `approveEngagement`, `rejectEngagement`, `withdrawApproval` y `getApprovalForService`. `approveEngagement` persiste `capacity_warning_json` siempre; si algún miembro queda sobre 100% FTE exige `capacity_override_reason >= 10`.
5. **Estado de `services`:** `requestApproval` marca non-regular services como `status='pending_approval'`; `approveEngagement` los vuelve `active`. El runtime no tiene CHECK sobre `services.status`, así que este valor es compatible sin DDL adicional.
6. **Access model:** `commercial.engagement.approve` ya existía en catálogo/runtime y queda EFEONCE_ADMIN-only en V1. TASK-804 agrega test explícito de gating; no crea `routeGroups`, `views` ni startup policy.
7. **Sin API/UI/outbox en este slice:** TASK-809 toma la surface real y TASK-808 toma audit/outbox; este slice entrega primitives y helpers.

## Delta v1.7 (2026-05-07) — TASK-805 implementada

TASK-805 (Capa 6 progress snapshots) quedó implementada vía migration `20260507152450308_task-805-engagement-progress-snapshots.sql`:

1. **`engagement_progress_snapshots`** persiste snapshots semanales por `service_id + snapshot_date` con `UNIQUE (service_id, snapshot_date)` e índice `(service_id, snapshot_date DESC)` para listados/latest.
2. **Runtime real preservado:** `service_id` usa `TEXT` hacia `greenhouse_core.services(service_id)` y `recorded_by` usa `TEXT` hacia `greenhouse_core.client_users(user_id)` nullable en DB por `ON DELETE SET NULL`; el helper exige actor input.
3. **Append-only:** triggers DB bloquean `UPDATE`/`DELETE`. Correcciones futuras deben registrarse como otro snapshot fechado o vía audit/outbox de TASK-808.
4. **Metrics V1:** `metrics_json` sigue schema-flexible, pero DB y helper exigen objeto JSON no vacío. Templates por `engagement_kind` quedan como V2.
5. **Helper canónico:** `src/lib/commercial/sample-sprints/progress-recorder.ts` expone `recordProgressSnapshot`, `listSnapshotsForService` y `getLatestSnapshot`; aplica guard TASK-813 y rechaza `services.engagement_kind='regular'`.
6. **Access model:** `commercial.engagement.record_progress` ya existía en catálogo/runtime y queda operator-friendly para `routeGroup=commercial` / admin; approve sigue admin-only. No se agregan `routeGroups`, `views` ni startup policy.
7. **Reliability:** `src/lib/reliability/queries/engagement-stale-progress.ts` agrega `commercial.engagement.stale_progress` como signal `drift`/`warning` si un engagement activo non-regular no tiene snapshot reciente (>10 días). Se inyecta bajo `moduleKey='commercial'`; TASK-807 conserva el subsystem `Commercial Health` completo.
8. **Sin API/UI/outbox en este slice:** TASK-809 toma la surface real y TASK-808 toma audit/outbox.

## Delta v1.8 (2026-05-07) — TASK-815 implementada

TASK-815 cierra el follow-up explícito de TASK-806 para gastos directos de cliente sin `service_id`:

1. **Primitive nueva:** `greenhouse_finance.expense_service_allocations` modela una asignación aprobada `expense_id -> service_id` con `allocated_amount_clp`, `allocation_source`, `evidence_json` y state machine `draft | approved | rejected`.
2. **No heurística:** `commercial_cost_attribution_v2` solo emite `expense_direct_service` cuando existe allocation aprobada; no infiere service desde cliente, nombre, línea de servicio ni scope.
3. **Residual seguro:** el monto aprobado sale como `expense_direct_service`; el remanente del mismo expense conserva `expense_direct_client` y `attribution_intent='operational'`.
4. **Guardrails DB:** la trigger acepta solo expenses directos de cliente (`cost_is_direct=TRUE`, `allocated_client_id IS NOT NULL`), no anulados, dentro del cap del expense, y services activos/no archived/no unmapped.
5. **Service P&L:** `src/lib/service-attribution/materialize.ts` consume allocations aprobadas como direct cost high-confidence (`approved_expense_service_allocation`) y descuenta ese monto del residual para evitar doble conteo.
6. **Sin access/UI en esta slice:** no se agregan `routeGroups`, `views`, `entitlements` ni startup policy. TASK-809 debe montar la surface aprobada para crear/aprobar allocations; TASK-807 puede agregar health signals sobre expenses pendientes de allocation.

## Delta v1.2 (2026-05-05) — pre-flight check + naming "Sample Sprint"

Aplicando red-team pre-épica con `arch-architect`. Cambios:

### Naming layer (B1 — híbrido genérico-en-schema + marketing en UI)

- **UI / paths**: `/agency/sample-sprints` (era `/agency/pilots`).
- **TS module**: `src/lib/commercial/sample-sprints/` (era `pilots/`).
- **Schema** (genérico, sobrevive marketing pivots): `engagement_*` reemplaza `pilot_*` y `service_*` en las tablas owned por esta spec:
  - `service_commercial_terms` → `engagement_commercial_terms`
  - `service_phases` → `engagement_phases`
  - `service_outcomes` → `engagement_outcomes`
  - `service_lineage` → `engagement_lineage`
  - `engagement_approvals` → `engagement_approvals`
  - `pilot_decision_audit_log` → `engagement_audit_log`
- **Capabilities**: `commercial.engagement.{declare,approve,record_outcome,read}` (era `commercial.pilot.*`).
- **Outbox events**: `service.engagement.{declared,approved,rejected,phase_completed,outcome_recorded,converted}_v1`.
- **Reliability signals**: `commercial.engagement.{overdue_decision,budget_overrun,zombie,unapproved_active,conversion_rate_drop}` bajo subsystem `Commercial Health`.
- **Sub-tipos visibles en UI** (con marketing rebrand del enum interno):
  - `pilot` → "Operations Sprint"
  - `trial` → "Extension Sprint"
  - `poc` → "Validation Sprint"
  - `discovery` → "Discovery Sprint"

### Decisiones de alcance V1 (B2-B5)

- **B2 — Notificaciones cliente automáticas: DIFERIDAS a V2**. V1 = comunicación manual. Razón: blast radius reputacional + complejidad subsistema (templates + i18n + delivery + opt-out). Slice 8.5 cancelado de V1.
- **B3 — Progress snapshots semanales: INCLUIDOS como primitiva**. Nueva tabla `engagement_progress_snapshots` (Slice 4.5). Razón: sin esto, reporte final = trabajo arqueológico al cierre. Tabla genérica reusable para cualquier service con fases.
- **B4 — Capacity warning en approval: INCLUIDO como soft warning**. Nuevo helper `getMemberCapacityForPeriod`. Approval NO se bloquea por capacity, solo emite warning + override_reason en audit log. Razón: hard blocker genera falsos negativos (vacaciones futuras desconocidas, transitions de assignments).
- **B5 — Auto-generación de reporte: MANUAL en V1, automation V2**. Wizard de outcome incluye structured fields (volume_managed, top_frictions, recommendations) que se persisten en `metrics_json` — input para V2 auto-generation. Razón: quality gate humano en cliente-facing artifact.

### Gaps adicionales documentados

- **Onboarding checklist**: `engagement_phases` se reusa con phase canónica `kickoff` cuyos `deliverables_json` modelan los accesos requeridos (ad accounts, calendario campañas, contacto escalamiento).
- **`client_team_assignments.service_id` FK opcional**: agregar columna para anclar assignment a service específico. Permite "Valentina dedicada a Sky Content Lead" vs "Valentina dedicada a Sky en general". Genérico — sirve para cualquier service.
- **Cancelación temprana**: `engagement_outcomes.outcome_kind` enum extendido a `converted | adjusted | dropped | cancelled_by_client | cancelled_by_provider`. Nueva columna `cancellation_reason TEXT`.
- **Pricing post-conversión**: `engagement_outcomes.next_quotation_id UUID REFERENCES greenhouse_commercial.quotations(quotation_id)` opcional. Si NULL, wizard pide monto manual y crea quotation auto.

Score 4-pilar post-Delta v1.2: estimado 9.0/10 (vs 8.4 en v1.1, 6.75 en v1.0). Spec lista para `greenhouse-task-planner`.

## Delta v1.1 (2026-05-05) — correcciones post-auditoría

Audit de la spec v1.0 reveló 3 errores materiales de schema + 4 supuestos no verificados. Cambios aplicados en esta versión:

- **Fix Error 1 — Schema cost attribution**: `greenhouse_commercial_cost_attribution.commercial_cost_attribution` → `greenhouse_serving.commercial_cost_attribution` (verificado en `src/types/db.d.ts:6444`). Decisión sobre v1 vs v2: ALTER se aplica a **ambas** (`v1` y `v2`); ambas comparten el filtro 3-axis supersede pattern.
- **Fix Error 2 — FK `users` rota**: las 6 columnas que apuntaban a `greenhouse_core.users(user_id)` (tabla inexistente) ahora apuntan a **`greenhouse_core.client_users(user_id)`** con `ON DELETE SET NULL`. Patrón verificado en migrations canónicas TASK-760/761/762 (offboarding case + final settlement). Tipo de columna corregido a `TEXT` (no `UUID`) — `client_users.user_id` es TEXT.
- **Fix Error 3 — Cita TASK-728 incorrecta**: TASK-728 era sobre Movement Feed UI, no NOT VALID/VALIDATE. Reemplazado por **TASK-708/766/774** que son las canónicas para ese patrón.
- **Verificado Supuesto 5 — `lifecycle_stage` enum**: valores reales `prospect | opportunity | active_client | inactive | churned | provider_only | disqualified` (verificado en migration `20260421113910459_task-535-organization-lifecycle-ddl.sql:26`). El doc usa `prospect | opportunity | active_client` que **son válidos**. Agregado `lifecycle_stage_source='quote_converted'` (valor existente en el enum, línea 51 de la misma migration) al flow de conversión.
- **Verificado Supuesto 7 — subsystem `Commercial Health`**: NO existe en `src/lib/reliability/` hoy. Declarado explícitamente como **nuevo subsystem** que esta spec introduce, con migration de registry en Slice 6.
- **Resuelto Open Q4 — owner del approval**: `commercial.pilot.approve` por default es **EFEONCE_ADMIN + COMMERCIAL_LEAD** (cuando este último exista). Hoy solo `EFEONCE_ADMIN` puede aprobar; cuando se cree el role `COMMERCIAL_LEAD` se habilita.
- **Agregado §3.3 anti-zombie** ya tenía CHECK; ahora también incluye DDL completa de `pilot_decision_audit_log` (faltaba en v1.0 — solo se mencionaba sin schema).
- **Agregado §3.4** — índices faltantes en `service_lineage` y `engagement_approvals`.
- **Agregado §8** — boundary transaccional explícito `BEGIN; ... COMMIT;` con rollback contract en flow de conversión.
- **Agregado §10.2** — handling explícito de `lifecycle_stage_source/by/since` al flipear organization.
- **Agregado §14** — patrón TASK-409 (extender `client_economics` con backfill desde `commercial_cost_attribution`) reusado explícitamente para `gtm_investment_pnl`.

Score 4-pilar post-Delta: estimado 8.5/10 (vs 6.75/10 en v1.0). Bloqueantes para implementación resueltos.

## Delta v1.1 (2026-05-05) — correcciones post-auditoría

Audit de la spec v1.0 reveló 3 errores materiales de schema + 4 supuestos no verificados. Cambios aplicados en esta versión:

- **Fix Error 1 — Schema cost attribution**: `greenhouse_commercial_cost_attribution.commercial_cost_attribution` → `greenhouse_serving.commercial_cost_attribution` (verificado en `src/types/db.d.ts:6444`). Decisión sobre v1 vs v2: ALTER se aplica a **ambas** (`v1` y `v2`); ambas comparten el filtro 3-axis supersede pattern.
- **Fix Error 2 — FK `users` rota**: las 6 columnas que apuntaban a `greenhouse_core.users(user_id)` (tabla inexistente) ahora apuntan a **`greenhouse_core.client_users(user_id)`** con `ON DELETE SET NULL`. Patrón verificado en migrations canónicas TASK-760/761/762 (offboarding case + final settlement). Tipo de columna corregido a `TEXT` (no `UUID`) — `client_users.user_id` es TEXT.
- **Fix Error 3 — Cita TASK-728 incorrecta**: TASK-728 era sobre Movement Feed UI, no NOT VALID/VALIDATE. Reemplazado por **TASK-708/766/774** que son las canónicas para ese patrón.
- **Verificado Supuesto 5 — `lifecycle_stage` enum**: valores reales `prospect | opportunity | active_client | inactive | churned | provider_only | disqualified` (verificado en migration `20260421113910459_task-535-organization-lifecycle-ddl.sql:26`). El doc usa `prospect | opportunity | active_client` que **son válidos**. Agregado `lifecycle_stage_source='quote_converted'` (valor existente en el enum, línea 51 de la misma migration) al flow de conversión.
- **Verificado Supuesto 7 — subsystem `Commercial Health`**: NO existe en `src/lib/reliability/` hoy. Declarado explícitamente como **nuevo subsystem** que esta spec introduce, con migration de registry en Slice 6.
- **Resuelto Open Q4 — owner del approval**: `commercial.pilot.approve` por default es **EFEONCE_ADMIN + COMMERCIAL_LEAD** (cuando este último exista). Hoy solo `EFEONCE_ADMIN` puede aprobar; cuando se cree el role `COMMERCIAL_LEAD` se habilita.
- **Agregado §3.3 anti-zombie** ya tenía CHECK; ahora también incluye DDL completa de `pilot_decision_audit_log` (faltaba en v1.0 — solo se mencionaba sin schema).
- **Agregado §3.4** — índices faltantes en `service_lineage` y `engagement_approvals`.
- **Agregado §8** — boundary transaccional explícito `BEGIN; ... COMMIT;` con rollback contract en flow de conversión.
- **Agregado §10.2** — handling explícito de `lifecycle_stage_source/by/since` al flipear organization.
- **Agregado §14** — patrón TASK-409 (extender `client_economics` con backfill desde `commercial_cost_attribution`) reusado explícitamente para `gtm_investment_pnl`.

Score 4-pilar post-Delta: estimado 8.5/10 (vs 6.75/10 en v1.0). Bloqueantes para implementación resueltos.

## 1. Resumen ejecutivo

Greenhouse vende servicios a clientes (Sky, etc.) y a veces, antes de contratar, ofrece un **Piloto / Demo / Trial / POC** acotado en tiempo, sin costo para el cliente, pero con costo interno real para Efeonce (recursos asignados). Al cierre, el cliente decide: continuar, ajustar o dejarlo. Esta spec define cómo modelar ese tipo de engagement reusando el canónico 360 sin crear identidades paralelas, con gobierno explícito y defensa en profundidad anti-zombie / anti-runaway-cost.

**Decisión raíz:** un Sample Sprint **NO es una entidad nueva** — es un `service` con `engagement_kind != 'regular'`, gobernado por approval workflow, fases declarativas, lineage graph, doble registro de costo (auditoría por cliente + reclasificación gerencial GTM) y reliability signals. La marca comercial "Sample Sprint" envuelve los 4 sub-tipos canónicos (Operations / Extension / Validation / Discovery Sprint).

**Alternativa rechazada:** tabla `pilot_engagements` o `sample_sprints` separada — violaría la regla canónica 360 y duplicaría plomería ya resuelta en `services`, `client_team_assignments`, `commercial_cost_attribution`, `quotations`, `client_economics`.

## 2. Casos de uso canónicos

| Caso | Ejemplo real (2026-04) | Características |
|---|---|---|
| **Pilot** | Sky Content Lead, Sky Paid Social Care | 4 semanas, sin costo, equipo dedicado, reporte final, decisión binaria |
| **Trial** | Extensión de servicio existente a nuevo módulo | 2-8 semanas, scope acotado, costo reducido o cero |
| **POC** | Validación técnica de integración | 1-4 semanas, scope técnico, deliverable = informe |
| **Discovery** | Mapeo inicial pre-propuesta | 1-2 semanas, output = brief estructurado |

Las 4 categorías comparten estructura (acotadas en tiempo, deliverable explícito, decisión post-cierre) pero difieren en términos comerciales (gratis / parcial / con costo) y en owner operativo. La modelación las trata como **variantes del mismo átomo** — el `engagement_kind`.

## 3. Modelo dimensional canónico

### 3.1 Dimensiones ortogonales (NO mezclar en un solo enum)

| Dimensión | Pregunta que responde | Valores | Persistencia |
|---|---|---|---|
| `engagement_kind` | ¿Qué tipo de servicio es? | `regular`, `pilot`, `trial`, `poc`, `discovery` | Columna en `services` |
| `commercial_terms` | ¿Cómo se cobra? | `committed`, `no_cost`, `success_fee`, `reduced_fee` | Tabla `engagement_commercial_terms` time-versioned |
| `lifecycle_phase` | ¿En qué fase operativa está? | declarativo per service | Tabla `service_phases` |
| `outcome` | ¿Cuál fue la decisión final? | `converted`, `adjusted`, `dropped` | Tabla `service_outcomes` |
| `lineage` | ¿De qué nació, en qué se transformó? | graph relations | Tabla `service_lineage` |

**Regla dura:** las 5 dimensiones son ortogonales. NUNCA mezclarlas en un solo enum. Mañana aparece un piloto pagado parcialmente con success fee y SLA — la matriz combinatoria explota si las mezclás.

### 3.2 Schema (propuesto, no implementado)

> **Delta v1.2 — naming**: tablas usan prefijo `engagement_*` (genérico, sobrevive marketing pivots). UI label "Sample Sprint" no requiere migrations al renombrar.
>
> **Delta v1.1**: schema canónico de cost attribution es `greenhouse_serving`, NO `greenhouse_commercial_cost_attribution` (que no existe). FK del operador apunta a `greenhouse_core.client_users(user_id)` con tipo `TEXT` y `ON DELETE SET NULL` (patrón verificado en TASK-760/761/762 — offboarding case + final settlement).

```sql
-- Capa 1: extensión de services
ALTER TABLE greenhouse_core.services
  ADD COLUMN engagement_kind TEXT NOT NULL DEFAULT 'regular'
    CHECK (engagement_kind IN ('regular','pilot','trial','poc','discovery')),
  ADD COLUMN commitment_terms_json JSONB; -- success_criteria, decision_deadline, expected_internal_cost_clp

-- Capa 1b: anclar client_team_assignment a service específico (genérico, reusable)
ALTER TABLE greenhouse_core.client_team_assignments
  ADD COLUMN service_id UUID REFERENCES greenhouse_core.services(service_id) ON DELETE SET NULL;
CREATE INDEX client_team_assignments_service_idx
  ON greenhouse_core.client_team_assignments (service_id)
  WHERE service_id IS NOT NULL;

-- Capa 2: términos comerciales time-versioned
CREATE TABLE greenhouse_commercial.engagement_commercial_terms (
  terms_id            UUID PRIMARY KEY,
  service_id          TEXT NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  terms_kind          TEXT NOT NULL CHECK (terms_kind IN ('committed','no_cost','success_fee','reduced_fee')),
  effective_from      DATE NOT NULL,
  effective_to        DATE,
  monthly_amount_clp  NUMERIC(18,2),
  success_criteria    JSONB,
  declared_by         TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  declared_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason              TEXT NOT NULL CHECK (length(reason) >= 10),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX engagement_commercial_terms_active_unique
  ON greenhouse_commercial.engagement_commercial_terms (service_id)
  WHERE effective_to IS NULL;
CREATE INDEX engagement_commercial_terms_kind_idx
  ON greenhouse_commercial.engagement_commercial_terms (terms_kind, effective_from)
  WHERE effective_to IS NULL;

-- Capa 3: fases declarativas (reusable más allá de Sample Sprints)
CREATE TABLE greenhouse_commercial.engagement_phases (
  phase_id          UUID PRIMARY KEY,
  service_id        UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  phase_name        TEXT NOT NULL,
  phase_kind        TEXT CHECK (phase_kind IN ('kickoff','operation','reporting','decision','custom')),
  phase_order       INT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  status            TEXT NOT NULL CHECK (status IN ('pending','in_progress','completed','skipped')),
  deliverables_json JSONB, -- canónico para phase_kind='kickoff': accesos requeridos (ad accounts, calendar, contacts)
  completed_at      TIMESTAMPTZ,
  completed_by      TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  UNIQUE (service_id, phase_order)
);

-- Capa 4: outcome (decisión final + cancelaciones)
CREATE TABLE greenhouse_commercial.engagement_outcomes (
  outcome_id           UUID PRIMARY KEY,
  service_id           UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  outcome_kind         TEXT NOT NULL CHECK (outcome_kind IN (
    'converted','adjusted','dropped','cancelled_by_client','cancelled_by_provider'
  )),
  decision_date        DATE NOT NULL,
  report_asset_id      UUID REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  metrics_json         JSONB, -- volume_managed, top_frictions, recommendations, etc — input para auto-report V2
  decision_rationale   TEXT NOT NULL CHECK (length(decision_rationale) >= 10),
  cancellation_reason  TEXT, -- requerido si outcome_kind IN ('cancelled_by_client','cancelled_by_provider')
  next_service_id      UUID REFERENCES greenhouse_core.services(service_id) ON DELETE SET NULL,
  next_quotation_id    UUID REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL,
  decided_by           TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  decided_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id), -- 1 outcome por service (terminal)
  CHECK (
    (outcome_kind NOT IN ('cancelled_by_client','cancelled_by_provider'))
    OR (cancellation_reason IS NOT NULL AND length(cancellation_reason) >= 10)
  )
);

-- Capa 5: lineage graph (multi-parent / multi-child)
CREATE TABLE greenhouse_commercial.engagement_lineage (
  lineage_id        UUID PRIMARY KEY,
  parent_service_id UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  child_service_id  UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  relationship_kind TEXT NOT NULL CHECK (relationship_kind IN
    ('converted_to','spawned_from','replaced_by','renewed_from','adjusted_into')),
  transition_date   DATE NOT NULL,
  transition_reason TEXT NOT NULL CHECK (length(transition_reason) >= 10),
  recorded_by       TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parent_service_id <> child_service_id),
  UNIQUE (parent_service_id, child_service_id, relationship_kind)
);

-- Capa 6: progress snapshots (Delta v1.2 — B3 — reporte forensic-friendly)
CREATE TABLE greenhouse_commercial.engagement_progress_snapshots (
  snapshot_id        UUID PRIMARY KEY,
  service_id         UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  snapshot_date      DATE NOT NULL,
  metrics_json       JSONB NOT NULL, -- volumen gestionado, KPIs, top issues, screenshots refs
  qualitative_notes  TEXT,
  recorded_by        TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id, snapshot_date)
);
CREATE INDEX engagement_progress_service_date_idx
  ON greenhouse_commercial.engagement_progress_snapshots (service_id, snapshot_date DESC);

-- Capa 7: gobierno — approval workflow
CREATE TABLE greenhouse_commercial.engagement_approvals (
  approval_id              UUID PRIMARY KEY,
  service_id               UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  requested_by             TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  expected_internal_cost_clp NUMERIC(18,2) NOT NULL,
  expected_duration_days   INT NOT NULL CHECK (expected_duration_days BETWEEN 7 AND 120),
  decision_deadline        DATE NOT NULL,
  success_criteria_json    JSONB NOT NULL,
  capacity_warning_json    JSONB, -- Delta v1.2 — B4 — snapshot del capacity check al momento del approval
  capacity_override_reason TEXT,  -- Delta v1.2 — B4 — requerido si aprobador forza pese a capacity warning
  status                   TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','withdrawn')),
  approved_by              TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  approved_at              TIMESTAMPTZ,
  rejection_reason         TEXT,
  UNIQUE (service_id)
);

-- Capa 8: audit log append-only
CREATE TABLE greenhouse_commercial.engagement_audit_log (
  audit_id           BIGSERIAL PRIMARY KEY,
  service_id         UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE NO ACTION,
  event_kind         TEXT NOT NULL CHECK (event_kind IN (
    'declared','approved','rejected','capacity_overridden','phase_completed',
    'progress_snapshot_recorded','outcome_recorded','lineage_added','converted','cancelled','reverted'
  )),
  actor_user_id      TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json       JSONB NOT NULL,
  reason             TEXT
);
CREATE INDEX engagement_audit_service_idx
  ON greenhouse_commercial.engagement_audit_log (service_id, occurred_at DESC);

-- Append-only triggers (patrón TASK-535/TASK-768)
CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_audit_no_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'engagement_audit_log is append-only';
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_audit_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'engagement_audit_log is append-only';
END $$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_audit_log_no_update
  BEFORE UPDATE ON greenhouse_commercial.engagement_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_audit_no_update();

CREATE TRIGGER engagement_audit_log_no_delete
  BEFORE DELETE ON greenhouse_commercial.engagement_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_audit_no_delete();
```

### 3.4 Índices adicionales

```sql
-- engagement_lineage: grafo bidireccional, queries "ancestros / descendientes"
CREATE INDEX engagement_lineage_parent_idx
  ON greenhouse_commercial.engagement_lineage (parent_service_id);
CREATE INDEX engagement_lineage_child_idx
  ON greenhouse_commercial.engagement_lineage (child_service_id);

-- engagement_approvals: queries "approvals pendientes" en /admin/operations
CREATE INDEX engagement_approvals_pending_idx
  ON greenhouse_commercial.engagement_approvals (status, decision_deadline)
  WHERE status = 'pending';

-- engagement_outcomes: queries "outcomes por período" para conversion_rate
CREATE INDEX engagement_outcomes_decision_idx
  ON greenhouse_commercial.engagement_outcomes (decision_date DESC, outcome_kind);

-- engagement_outcomes: lookup rápido del child contract post-conversión
CREATE INDEX engagement_outcomes_next_service_idx
  ON greenhouse_commercial.engagement_outcomes (next_service_id)
  WHERE next_service_id IS NOT NULL;
```

### 3.3 DB guard anti-zombie (defensa en DB)

> TASK-810 corrigio este diseño: el mecanismo implementado es trigger, no CHECK,
> porque el predicado necesita consultar outcomes/lineage.

```sql
CREATE TRIGGER services_engagement_requires_decision_before_120d
  BEFORE INSERT OR UPDATE ON greenhouse_core.services
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_core.assert_engagement_requires_decision_before_120d();
```

El trigger rechaza `check_violation` cuando un engagement non-regular activo supera 120 dias sin `engagement_outcomes` ni `engagement_lineage`. El preflight equivalente debe estar en cero antes de instalar o endurecer el guard.

## 4. Lifecycle de organización (interacción con party lifecycle)

Reusa la máquina de estados ya canónica (`GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`):

```
prospect
   │
   ▼
opportunity ◄─────────────┐
   │                      │
   ├─ pilot_in_progress ──┤  (engagement_kind != 'regular' active)
   │                      │
   ├─ outcome=converted ──┼──▶ active_client (spawn nuevo service regular)
   ├─ outcome=adjusted ───┴──▶ se mantiene en opportunity (nuevo piloto/quote)
   └─ outcome=dropped ───────▶ prospect (tag: pilot_evaluated)
```

**Regla dura:** un Sample Sprint NUNCA flipea la organización a `active_client`. Solo el `service` regular post-conversión lo hace. Eso protege los KPIs comerciales de inflar conversion rate con Sample Sprints no convertidos.

## 5. Gobierno y defensa en profundidad (patrón 7 capas TASK-742)

### 5.1 Capability granular dedicada

| Capability | Module | Action | Scope | Allowed source |
|---|---|---|---|---|
| `commercial.engagement.declare` | commercial | create | tenant | route_group=commercial / EFEONCE_ADMIN |
| `commercial.engagement.approve` | commercial | approve | tenant | EFEONCE_ADMIN (today) + COMMERCIAL_LEAD (cuando exista el role) |
| `commercial.engagement.record_outcome` | commercial | update | tenant | EFEONCE_ADMIN + COMMERCIAL_LEAD |
| `commercial.engagement.record_progress` | commercial | update | tenant | route_group=commercial / route_group=agency / EFEONCE_ADMIN — Delta v1.2 (B3) |
| `commercial.engagement.read` | commercial | read | tenant | route_group=commercial / route_group=agency / EFEONCE_ADMIN |

> **Delta v1.2 — naming**: capabilities renombradas de `commercial.pilot.*` → `commercial.engagement.*` (genérico — schema-aligned). UI label "Sample Sprint" no requiere capability rename si mañana el rebrand cambia.
>
> **Delta v1.1 — owner de approve resuelto**: hoy `EFEONCE_ADMIN` es el único que puede aprobar (el role `COMMERCIAL_LEAD` no existe en el sistema actual). Cuando se cree el role `COMMERCIAL_LEAD`, se habilita como segundo source válido. Esto resuelve Open Question #4 de v1.0.

`commercial.engagement.approve` separada de `services.create` evita que cualquier vendedor cree Sample Sprints sin gobierno.

### 5.2 Approval workflow obligatorio (con capacity warning soft)

Sin fila en `engagement_approvals.status='approved'`, el `service` con `engagement_kind != 'regular'` nace con `status='pending_approval'`. **No se materializan cost attributions** hasta que el approval está aprobado. Eso evita Sample Sprints fantasma que silenciosamente queman recursos.

**Delta v1.2 (B4) — capacity warning soft**: el wizard de approval invoca `getMemberCapacityForPeriod(memberId, startDate, endDate)` para cada miembro propuesto y muestra:

- ✅ Capacity OK si `proposed_fte + allocated_fte <= 100%`.
- ⚠️ Capacity warning si `proposed_fte + allocated_fte > 100%` — UI muestra warning amarillo con detalle del conflicto. Aprobador puede forzar approval pero **debe declarar `capacity_override_reason`** (≥ 10 chars). El snapshot del warning se persiste en `engagement_approvals.capacity_warning_json` para audit.
- ❌ NO hay hard blocker — el aprobador siempre puede forzar (porque puede saber de vacaciones o transitions futuras que el sistema no conoce). El override queda registrado.

Helper TS canónico:

```ts
getMemberCapacityForPeriod(memberId: string, fromDate: Date, toDate: Date): {
  totalFte: number;          // siempre 1.0
  allocatedFte: number;       // suma de active assignments en el período
  availableFte: number;       // 1.0 - allocatedFte
  conflictingAssignments: { service_id: string; client_id: string; fte: number }[];
}
```

### 5.3 Reliability signals canónicos (subsystem `Commercial Health` — NUEVO)

> **Delta v1.1 — Subsystem `Commercial Health` no existe hoy** en `src/lib/reliability/`. Esta spec lo introduce como **primer subsystem del módulo Commercial**. Slice 6 incluye la migration de registry (mirror de cómo TASK-672 introdujo `Finance Data Quality`). Hasta que la migration aplique, los signals viven sin rollup.

| Signal | Kind | Severity | Steady | Detección |
|---|---|---|---|---|
| `commercial.engagement.overdue_decision` | drift | error | 0 | engagements con `phase_kind=reporting` cerrada hace +14d sin `engagement_outcome` |
| `commercial.engagement.budget_overrun` | drift | warning | 0 | engagements donde `actual_internal_cost > expected_internal_cost * 1.2` |
| `commercial.engagement.zombie` | drift | error | 0 | engagements `engagement_kind != 'regular'` activos > 90 días sin transition_event |
| `commercial.engagement.unapproved_active` | drift | error | 0 | services con `engagement_kind != 'regular'` y `status != 'pending_approval'` sin approval aprobado |
| `commercial.engagement.conversion_rate_drop` | drift | warning | variable | conversion rate trailing 6m < threshold (default 30%) |
| `commercial.engagement.stale_progress` | drift | warning | 0 | engagements activos sin progress snapshot en últimos 10 días — Delta v1.2 (B3) |

### 5.4 Outbox events versionados v1

> **Delta v1.2 — naming**: events renombrados de `service.pilot.*` → `service.engagement.*` (genérico). Cuando cambie el marketing label "Sample Sprint", consumers downstream NO se rompen.
>
> **Delta v1.10 — TASK-808 runtime alignment**: la version vive en `payload_json.version=1`; el `event_type` no usa sufijo `_v1`. Los eventos se publican en `greenhouse_sync.outbox_events` con `aggregate_type='service'` y `aggregate_id=<service_id>`.

- `service.engagement.declared` v1
- `service.engagement.approved` v1
- `service.engagement.rejected` v1
- `service.engagement.capacity_overridden` v1 (Delta v1.2 — B4)
- `service.engagement.phase_completed` v1
- `service.engagement.progress_snapshot_recorded` v1 (Delta v1.2 — B3)
- `service.engagement.outcome_recorded` v1
- `service.engagement.cancelled` v1 (Delta v1.2 — outcome de cancelación)
- `service.engagement.converted` v1 (link a child_service_id)

### 5.5 Audit log append-only

Tabla `greenhouse_commercial.engagement_audit_log` con triggers PG `engagement_audit_log_no_update` y `engagement_audit_log_no_delete` (patrón TASK-535/TASK-768). DDL completa en §3.2. Cualquier cambio en approval, outcome, progress o lineage produce una fila append-only con `event_kind`, `actor_user_id`, `payload_json`, `reason`.

**Event kinds** (Delta v1.2 — extendidos):

- `declared` — engagement creado
- `approved` — approval otorgado
- `rejected` — approval rechazado
- `capacity_overridden` — aprobador forzó pese a capacity warning (B4)
- `phase_completed` — fase marcada como completada
- `progress_snapshot_recorded` — snapshot semanal registrado (B3)
- `outcome_recorded` — outcome final declarado
- `lineage_added` — relación parent/child entre services registrada
- `converted` — flow de conversión completo ejecutado
- `cancelled` — cancelado early (by_client / by_provider)
- `reverted` — reservado para futuro rollback manual con audit explícito; no materializado en TASK-808 V1.

**Delta v1.2**: tabla renombrada de `pilot_decision_audit_log` → `engagement_audit_log` (alineado con resto del schema). DDL en §3.2 — functions + triggers + index `engagement_audit_service_idx`.

## 6. Cost intelligence — doble registro

### 6.1 Problema

Si un piloto sin costo registra `total_revenue=0` y `labor_cost > 0`, el cliente aparece con margin negativa, **contaminando** los KPIs de profitability del cliente real.

### 6.2 Solución canónica (NO usar `economic_category='gtm_investment'` solo)

**Doble registro, sin perder trazabilidad:**

#### 6.2.1 `commercial_cost_attribution` — atribución por cliente (auditoría)

El costo del piloto SÍ se atribuye al `client_id` del piloto. Se agrega columna a **ambas tablas canónicas** (v1 + v2):

```sql
-- v1 (legacy, aún consumida por dashboards históricos)
ALTER TABLE greenhouse_serving.commercial_cost_attribution
  ADD COLUMN attribution_intent TEXT NOT NULL DEFAULT 'operational'
    CHECK (attribution_intent IN ('operational','pilot','trial','poc','discovery','overhead'));

-- v2 (canónica post TASK-708/709 — labor consolidado anti double-counting)
ALTER TABLE greenhouse_serving.commercial_cost_attribution_v2
  ADD COLUMN attribution_intent TEXT NOT NULL DEFAULT 'operational'
    CHECK (attribution_intent IN ('operational','pilot','trial','poc','discovery','overhead'));
```

> **Delta v1.1**: corregido el schema (`greenhouse_serving`, NO `greenhouse_commercial_cost_attribution` que no existe). Decidido aplicar a **ambas v1 y v2** porque:
> - v2 es la canónica post-TASK-708/709 (consolidated labor, anti double-counting), y la VIEW `gtm_investment_pnl` debe leer de v2.
> - v1 sigue siendo consumida por surfaces que aún no migraron; el filtro `attribution_intent` debe estar coherente en ambas para evitar drift cuando una projection lee v1 y otra v2.
> - Cuando v1 se deprecate (task futura), se removerá la columna allí; mientras tanto, el seed default `'operational'` mantiene compatibilidad backward.

Eso preserva auditoría: "Sky consumió X horas de Valentina durante el piloto Content Lead".

#### 6.2.2 VIEW canónica `gtm_investment_pnl` — reclasificación gerencial

```sql
-- VIEW canónica gtm_investment_pnl (TASK-806).
-- Lee desde v2 (canonical post TASK-708/709 — labor consolidado) con service_id
-- propagado desde client_team_assignments.
CREATE OR REPLACE VIEW greenhouse_serving.gtm_investment_pnl AS
SELECT
  cca.period_year,
  cca.period_month,
  cca.client_id,
  c.client_name,
  cca.service_id,
  s.name AS service_name,
  s.engagement_kind,
  cca.member_id,
  m.display_name AS member_name,
  cca.cost_dimension,
  cca.amount_clp::NUMERIC AS gtm_investment_clp,
  cca.fte_contribution,
  cca.attribution_intent,
  sct.terms_kind
FROM greenhouse_serving.commercial_cost_attribution_v2 cca
JOIN greenhouse_core.services s ON s.service_id = cca.service_id
JOIN greenhouse_commercial.engagement_commercial_terms sct
  ON sct.service_id = s.service_id
  AND sct.terms_kind = 'no_cost'
  AND sct.effective_from <= make_date(cca.period_year, cca.period_month, 1)
  AND (sct.effective_to IS NULL OR sct.effective_to > make_date(cca.period_year, cca.period_month, 1))
LEFT JOIN greenhouse_core.clients c ON c.client_id = cca.client_id
LEFT JOIN greenhouse_core.members m ON m.member_id = cca.member_id
WHERE cca.attribution_intent IN ('pilot','trial','poc','discovery')
  AND s.engagement_kind IN ('pilot','trial','poc','discovery')
  AND s.active = TRUE
  AND s.status != 'legacy_seed_archived'
  AND s.hubspot_sync_status IS DISTINCT FROM 'unmapped'
  AND EXISTS (
    SELECT 1
    FROM greenhouse_commercial.engagement_approvals ea
    WHERE ea.service_id = s.service_id
      AND ea.status = 'approved'
  );

COMMENT ON VIEW greenhouse_serving.gtm_investment_pnl IS
  'Management-accounting view for approved no-cost Sample Sprint GTM investment. '
  'Not client-facing audit evidence, not fiscal/legal accounting, and not a replacement '
  'for source cost attribution records.';
```

> **Delta v1.1**: VIEW corregida para leer de `greenhouse_serving.commercial_cost_attribution_v2` (canónica post TASK-708/709). Patrón explícitamente heredado de TASK-409 (extender `client_economics` con backfill desde `commercial_cost_attribution`) para reducir surface novel y reusar primitiva canonizada.
> **Delta v1.3 (TASK-806)**: runtime real usa `amount_clp` + `cost_dimension`, no columnas `allocated_labor_clp/direct_overhead/shared_overhead` en v2. La service dimension se propaga desde `client_team_assignments.service_id`; no se reclasifican direct-client expenses sin ancla de servicio. La ventana de términos usa `effective_to > period_start`, alineada al helper canónico `getActiveCommercialTerms`.
> **Delta v1.8 (TASK-815)**: la ancla explícita para direct-client expenses es `greenhouse_finance.expense_service_allocations`. `commercial_cost_attribution_v2` expone `expense_direct_service` para allocations aprobadas y mantiene el residual como `expense_direct_client`.

El P&L gerencial **resta** `gtm_investment_pnl` del cliente y **suma** a línea separada "GTM Investment". El cliente no aparece como unprofitable; el piloto aparece como inversión deliberada.

### 6.3 Reglas duras

- **NUNCA** marcar `economic_category='gtm_investment'` en un payment. Esa columna sigue fiel al patrón TASK-768 (clasificador analítico estable). El intent vive en `commercial_cost_attribution.attribution_intent`.
- **NUNCA** filtrar pilotos del `commercial_cost_attribution` para "no manchar" KPIs. La auditoría por cliente requiere el registro completo. La reclasificación es read-time vía VIEW.
- **NUNCA** asignar cost attribution antes de approval aprobado. La capa de gobierno bloquea.

## 7. Surface UI

Vive en módulo **Agency** (no Finance — domain boundary canónico).

| Surface | Audiencia | Contenido |
|---|---|---|
| `/agency/sample-sprints` | Commercial + Agency leads | Tabla Sample Sprints en curso con conversion rate trailing 6m + agrupación por cliente |
| `/agency/sample-sprints/[serviceId]` | Owner del Sample Sprint | Detalle: fases, deliverables, equipo asignado, costo acumulado vs budget, días hasta decisión, **timeline de progress snapshots** |
| `/agency/sample-sprints/[serviceId]/progress` | Owner | Wizard semanal para registrar `engagement_progress_snapshot` (metrics_json + qualitative_notes) — Delta v1.2 (B3) |
| `/agency/sample-sprints/[serviceId]/outcome` | EFEONCE_ADMIN / COMMERCIAL_LEAD | Wizard de decisión final con upload de reporte + structured fields (volume_managed, top_frictions, recommendations) |
| `/admin/operations` | Reliability dashboard | 6 signals del subsystem `Commercial Health` |

> **Delta v1.2 — naming**: paths cambiados de `/agency/pilots/*` → `/agency/sample-sprints/*` (UI marketing brand). Capability gating sigue genérico (`commercial.engagement.*`).

Capability gating: `commercial.engagement.read` para listas, `commercial.engagement.{declare,approve,record_outcome,record_progress}` para mutaciones.

### 7.1 Sub-tipos visibles en UI (mapping marketing → schema)

| Schema (`engagement_kind`) | UI label | Caso de uso típico |
|---|---|---|
| `pilot` | "Operations Sprint" | Sky Content Lead (4 semanas full operación) |
| `trial` | "Extension Sprint" | Cliente activo prueba módulo nuevo |
| `poc` | "Validation Sprint" | Validación técnica / integración |
| `discovery` | "Discovery Sprint" | Mapeo pre-propuesta |

## 8. Conversión Sample Sprint → contrato

Flujo canónico **atómico** (boundary transaccional explícito — Delta v1.1):

```sql
BEGIN;
  -- 1. Insertar outcome (wizard valida que el Sample Sprint está en estado terminal-ready)
  INSERT INTO greenhouse_commercial.engagement_outcomes (
    service_id, outcome_kind, decision_date, decision_rationale,
    next_service_id, next_quotation_id, decided_by, metrics_json
  ) VALUES (...);

  -- 2. Si ya existe child service regular, declarar commercial_terms committed
  INSERT INTO greenhouse_commercial.engagement_commercial_terms (
    service_id, terms_kind, effective_from, monthly_amount_clp, ...
  ) VALUES (..., 'committed', CURRENT_DATE, ...);

  -- 3. Linkear via engagement_lineage
  INSERT INTO greenhouse_commercial.engagement_lineage (
    parent_service_id, child_service_id, relationship_kind, transition_date, transition_reason, recorded_by
  ) VALUES (..., 'converted_to', ...);

  -- 4. Audit log append-only
  INSERT INTO greenhouse_commercial.engagement_audit_log (
    service_id, event_kind, actor_user_id, payload_json, reason
  ) VALUES (..., 'converted', ...);

  -- 5. Outbox event v1 (en la misma tx — patrón canónico TASK-771/773)
  INSERT INTO greenhouse_sync.outbox_events (
    aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
  ) VALUES ('service', ..., 'service.engagement.converted', '{"version":1, ...}', 'pending', now());
COMMIT;
```

**Steps async (post-commit, vía reactive consumer)**:

6. Consumer reactivo lee `service.engagement.converted` v1 y:
   - Llama `promoteParty({ toStage:'active_client', source:'quote_converted' })` para que el writer canónico inserte `organization_lifecycle_history`, actualice `lifecycle_stage/source/by/since`, instancie `clients`/`client_profiles` cuando corresponda y publique eventos `commercial.party.*`.
   - No crea HubSpot deals directo desde service en TASK-808. El runtime real solo tiene comando canónico Quote Builder → Deal (`createDealFromQuoteContext`) con governance/idempotency/rate-limit; service→deal queda como follow-up explícito.

> **Delta v1.1 — atomicidad explícita + lifecycle source canónico + HubSpot conditional**:
>
> - **Atomicidad**: pasos 1-5 viven en **una sola transacción Postgres**. Si cualquier INSERT falla → ROLLBACK completo. El reactive consumer (paso 6) es at-least-once con consumer idempotente (patrón canónico outbox).
> - **Lifecycle source canónico**: el flip a `active_client` debe pasar por `promoteParty()` con `source='quote_converted'`. Sin esto, se omiten lifecycle history, client/profile side-effects y eventos downstream.
> - **HubSpot conditional**: la versión runtime de TASK-808 no llama HubSpot. El consumer marca metadata `deferred_no_canonical_service_to_deal_command` si detecta que habría correspondido crear deal, hasta que exista un comando service→deal con la misma gobernanza de Quote Builder.

### 8.1 Rollback contract

Si el flow atómico falla (paso 1-5):
- Sin outcome, sin nuevo service, sin lineage. La organización **NO** se flipea a `active_client`.
- El piloto sigue activo. Operador reintenta vía wizard.

Si el reactive consumer falla (paso 6):
- Outbox event queda `pending` → retry exponencial → dead_letter después de N intentos.
- Mientras tanto: nuevo service existe + lineage registrado, pero org sigue en `opportunity` y HubSpot sin deal. Estado consistente (org puede flipearse manualmente vía endpoint admin si el dead_letter no se resuelve en X horas).

## 9. Métricas canónicas

| Métrica | Fórmula | Owner |
|---|---|---|
| **Pilot conversion rate** | `count(outcome=converted) / count(outcome IN any)` trailing 6m | Commercial |
| **Avg time to decision** | `decision_date - service.start_date` para outcomes | Commercial |
| **GTM investment ratio** | `sum(gtm_investment_pnl) / sum(operating_revenue)` per period | Finance gerencial |
| **Sample Sprint ROI** | `sum(revenue del child_service trailing 12m) / sum(internal_cost del Sample Sprint)` | Commercial |
| **Active Sample Sprints backlog** | `count(engagement_kind != 'regular' AND status='active')` | Agency ops |

## 10. Dependencias e impacto

### 10.1 Depende de

- `greenhouse_core.services` (extensión, no nueva tabla)
- `greenhouse_core.client_team_assignments` (sin cambios — schema verificado en `db.d.ts:1847`)
- `greenhouse_serving.commercial_cost_attribution` (v1) **+** `greenhouse_serving.commercial_cost_attribution_v2` (v2 canónica, 1 columna nueva en cada: `attribution_intent`)
- `greenhouse_core.assets` (FK al canonical asset uploader, patrón TASK-721 — verificado en `db.d.ts:1666`)
- `greenhouse_core.organizations` (lifecycle_stage + lifecycle_stage_source + lifecycle_stage_by + lifecycle_stage_since — TASK-535/TASK-542 canonical lifecycle infrastructure)
- `greenhouse_core.client_users(user_id)` para FKs de actor (TEXT, ON DELETE SET NULL — patrón TASK-760/761/762)
- `greenhouse_commercial.quotations` (sin cambios — la quote del piloto ya documenta términos)
- `greenhouse_finance.client_economics` (extensión: dashboards leen via VIEW `gtm_investment_pnl` para reclasificación gerencial)
- `greenhouse_sync.outbox_events` (reusa patrón canónico TASK-771/773 para eventos del piloto)

### 10.2 Impacta a

- Cualquier consumer de `services` que asuma "service = facturable" debe filtrar por `engagement_kind = 'regular'` o por `service_commercial_terms.terms_kind = 'committed'`. **Auditar inventario completo de consumers en Slice 1.**
- Dashboards de `client_economics` deben reclasificar vía `gtm_investment_pnl` view (NO filtrar pilotos del cost_attribution — preserva auditoría).
- Reactive projection `client_economics_refresh` (post TASK-409) debe respetar `attribution_intent` para no inflar costo del cliente.
- **HubSpot bridge**: pilotos NO crean deals automáticamente al declararse. Implementación: el reactive consumer que dispara deal creation filtra `WHERE engagement_kind = 'regular' AND hubspot_deal_id IS NULL`. La columna `services.hubspot_sync_status` ya existe (`db.d.ts`) y se mantiene como gate.
- **Lifecycle history (TASK-535/TASK-542)**: cualquier flip de `lifecycle_stage` debe poblar los 4 campos coordinados (`stage`, `stage_source`, `stage_by`, `stage_since`). El trigger `organization_lifecycle_history_no_update/no_delete` ya enforce append-only del snapshot history.

### 10.3 Verificación de supuestos pendientes (resueltos en Delta v1.1)

| Supuesto v1.0 | Estado v1.1 | Evidence |
|---|---|---|
| Schema cost_attribution = `greenhouse_commercial_cost_attribution` | ❌ CORREGIDO → `greenhouse_serving` | `src/types/db.d.ts:6444` |
| FK actor a `greenhouse_core.users(user_id)` | ❌ CORREGIDO → `greenhouse_core.client_users(user_id)` TEXT | TASK-760/761/762 patron |
| Cita TASK-728 = NOT VALID/VALIDATE | ❌ CORREGIDO → TASK-708/766/774 | TASK-728 = Movement Feed UI |
| `lifecycle_stage` enum incluye `opportunity`, `active_client` | ✅ VERIFICADO | migration `20260421113910459:26-34` |
| `lifecycle_stage_source='quote_converted'` válido | ✅ VERIFICADO | migration `20260421113910459:51` |
| Subsystem `Commercial Health` existe | ❌ NUEVO — declarado en Slice 6 | búsqueda en `src/lib/reliability/` |
| HubSpot auto-create deals para `services` regulares | ⚠️ ASUMIDO — verificar en implementación | `services.hubspot_deal_id` existe |

### 10.3 Archivos owned (para detección de impacto cruzado)

> **Delta v1.2 — naming**: módulo TS renombrado a `sample-sprints/` (UI brand). Reliability queries y schema-related code mantienen prefijo `engagement-*` (genérico).

- `src/lib/commercial/sample-sprints/` (nuevo módulo)
- `src/lib/commercial/sample-sprints/store.ts`
- `src/lib/commercial/sample-sprints/approval-workflow.ts`
- `src/lib/commercial/sample-sprints/capacity-checker.ts` (Delta v1.2 — B4)
- `src/lib/commercial/sample-sprints/lineage.ts`
- `src/lib/commercial/sample-sprints/outcome-recorder.ts`
- `src/lib/commercial/sample-sprints/progress-recorder.ts` (Delta v1.2 — B3)
- `src/lib/commercial/sample-sprints/cost-reclassifier.ts` (VIEW reader)
- `src/lib/commercial/sample-sprints/conversion-tx.ts` (atomic flow §8)
- `src/lib/reliability/queries/engagement-overdue-decision.ts`
- `src/lib/reliability/queries/engagement-budget-overrun.ts`
- `src/lib/reliability/queries/engagement-zombie.ts`
- `src/lib/reliability/queries/engagement-unapproved-active.ts`
- `src/lib/reliability/queries/engagement-conversion-rate-drop.ts`
- `src/lib/reliability/queries/engagement-stale-progress.ts` (Delta v1.2 — B3)
- `src/app/(dashboard)/agency/sample-sprints/`
- `src/app/api/agency/sample-sprints/`
- `src/app/api/admin/commercial/engagement-approvals/`

## 11. Roadmap por slices (cuando se decida implementar)

| Slice | Scope | Dependencias |
|---|---|---|
| **1** | Migration `services.engagement_kind` + `commitment_terms_json` + `client_team_assignments.service_id` + `attribution_intent` (v1 + v2) | Solo DDL |
| **2** | `engagement_commercial_terms` time-versioned + helper `getActiveCommercialTerms` | Slice 1 |
| **3** | `engagement_phases` + `engagement_outcomes` (con `cancellation_reason` + `next_quotation_id`) + `engagement_lineage` | Slice 1 |
| **4** | `engagement_approvals` workflow + capability `commercial.engagement.approve` + helper `getMemberCapacityForPeriod` (capacity warning soft) | Slice 1, IAM |
| **4.5** | `engagement_progress_snapshots` + capability `commercial.engagement.record_progress` + reliability signal `stale_progress` (Delta v1.2 — B3) | Slice 1 |
| **5** | VIEW `gtm_investment_pnl` + reclassifier helper (lee `commercial_cost_attribution_v2`, patrón TASK-409) | Slices 1-3 |
| **6** | 6 reliability signals + subsystem `Commercial Health` registry (NUEVO — mirror TASK-672 `Finance Data Quality`) | Slices 1-5 + Slice 4.5 |
| **7** | `engagement_audit_log` + outbox events v1 (9 events) + reactive consumers (lifecycle flip + HubSpot conditional) | Slices 1-6 |
| **8** | UI `/agency/sample-sprints` + wizards declaración/approval/progress/outcome + agrupación per-cliente | Slices 1-7 |
| **9** | DB guard anti-zombie via trigger `services_engagement_requires_decision_before_120d` | Slices 1-8 (post-cleanup) |

## 12. Reglas duras (resumen anti-regresión)

- **NUNCA** crear tabla `pilot_engagements` (ni `sample_sprints`) paralela. Viola regla 360. La primitiva canónica es `services.engagement_kind`.
- **NUNCA** mezclar `engagement_kind` y `commercial_terms` en un solo enum (ortogonalidad de las 5 dimensiones).
- **NUNCA** marcar `economic_category='gtm_investment'` en un payment. La intent vive en `commercial_cost_attribution.attribution_intent`.
- **NUNCA** flipear `organizations.lifecycle_stage='active_client'` por declarar un Sample Sprint. Solo el child_service post-conversión lo hace, **siempre poblando `lifecycle_stage_source='quote_converted'` + `lifecycle_stage_by` + `lifecycle_stage_since`** (TASK-535/542 contract).
- **NUNCA** crear HubSpot deal automáticamente al declarar Sample Sprint. Solo el child_service regular post-conversión, conditional `WHERE engagement_kind='regular' AND hubspot_deal_id IS NULL`.
- **NUNCA** asignar cost attribution sin `engagement_approvals.status='approved'`. La capa de gobierno bloquea.
- **NUNCA** dejar engagement non-regular activo > 120 días sin outcome ni lineage. Trigger DB + reliability signal `commercial.engagement.zombie` lo enforce.
- **NUNCA** filtrar engagements del `commercial_cost_attribution` para "limpiar" dashboards. Usar VIEW `gtm_investment_pnl` para reclassificación read-time.
- **NUNCA** modificar `engagement_outcomes` o `engagement_audit_log` (append-only enforced por trigger).
- **NUNCA** spawn `engagement_lineage` row sin `transition_reason >= 10 chars`.
- **NUNCA** declarar `engagement_kind != 'regular'` sin success_criteria_json + decision_deadline + expected_internal_cost_clp.
- **NUNCA** ejecutar el flow de conversión §8 fuera de transacción atómica. Los 5 INSERTs core deben commitear juntos o rollback completo.
- **NUNCA** aprobar un Sample Sprint con capacity warning sin declarar `capacity_override_reason` (≥ 10 chars). El warning se persiste en `engagement_approvals.capacity_warning_json` para audit (Delta v1.2 — B4).
- **NUNCA** cerrar un outcome `cancelled_by_client` o `cancelled_by_provider` sin `cancellation_reason ≥ 10 chars` (CHECK constraint en §3.2 lo enforce).
- **NUNCA** registrar más de un `engagement_progress_snapshot` por `(service_id, snapshot_date)` — UNIQUE constraint lo previene. Cadence canónica: weekly.
- **NUNCA** enviar notificaciones automáticas al cliente en V1. Diferido a V2 (Delta v1.2 — B2). Comunicación es manual del operador owner del Sample Sprint.

## 13. Documentos relacionados

- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canónico 360 (regla raíz: no crear identidades paralelas)
- `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — lifecycle de organization (prospect → opportunity → active_client)
- `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — pilotos viven en Commercial, no Finance
- `Greenhouse_Services_Architecture_v1.md` — service como átomo comercial
- `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` — quotations como propuesta previa al piloto
- `GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md` — atribución de costo por cliente
- `GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md` — patrón TASK-768 dimensión analítica (no se reusa para `attribution_intent`, pero patrón homólogo)
- `GREENHOUSE_AUTH_RESILIENCE_V1.md` — patrón TASK-742 defensa 7 capas (referencia para gobierno)
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry signals + subsystem rollup
- `GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events v1 declarados aquí

## 14. Patrones canónicos reusados

| Patrón | Origen | Aplicación en este modelo |
|---|---|---|
| Time-versioned terms | TASK-700 internal_account_number_registry | `service_commercial_terms` con `effective_from/to` + UNIQUE active partial index |
| Append-only audit log | TASK-535 (organization_lifecycle_history) / TASK-768 (economic_category_resolution_log) | `pilot_decision_audit_log` con triggers `pilot_audit_no_update/no_delete` |
| Approval workflow + capability granular | TASK-742 (7 capas) | `engagement_approvals` + `commercial.pilot.approve` |
| State machine + trigger DB | TASK-765 | `engagement_kind` + anti-zombie trigger 120d |
| Reliability signal subsystem | TASK-672 (Finance Data Quality precedent) | 5 signals subsystem `Commercial Health` (NUEVO — Slice 6) |
| VIEW canónica + helper reclassifier | TASK-571/699/766/774 | `gtm_investment_pnl` view + helper TS |
| Asset uploader canónico | TASK-721 | `service_outcomes.report_asset_id` FK a `greenhouse_core.assets` |
| Outbox events versionados | GREENHOUSE_EVENT_CATALOG_V1 + TASK-771/773 | 6 events v1 + atomic in-tx insertion + reactive consumer at-least-once |
| NOT VALID + VALIDATE atomic | TASK-708/766/774 (corregido v1.1 — TASK-728 era cita errónea) | Solo para CHECKs row-local; TASK-810 usa trigger por predicado cross-table |
| Lifecycle history with source/by/since | TASK-535/TASK-542 | flip a `active_client` poblando los 4 campos coordinados |
| FK actor pattern (TEXT + ON DELETE SET NULL) | TASK-760/761/762 (offboarding case + final settlement) | 6 FKs a `greenhouse_core.client_users(user_id)` |
| Extender `client_economics` con backfill | TASK-409 (`labor_cost_clp` add + backfill desde commercial_cost_attribution) | VIEW `gtm_investment_pnl` lee de `commercial_cost_attribution_v2` para reclassification gerencial |
| Lineage graph multi-parent | (nuevo, derivado de patrones tree-existentes) | `service_lineage` con UNIQUE (parent, child, kind) |

**Cero primitivas inventadas** salvo el lineage graph (genuinamente nuevo, derivado del patrón tree-tracking común). Todos los demás building blocks reusan canonizados con TASK-### explícita.

## 15. Casos de prueba canónicos (smoke tests)

1. **Happy path conversion:** Sky Content Lead Sample Sprint → outcome=converted → spawn service regular → org flipea a `active_client` con `lifecycle_stage_source='quote_converted'` + `lifecycle_stage_by` + `lifecycle_stage_since` poblados → HubSpot deal creado (post-conversión, conditional).
2. **Drop path:** Sky Paid Social Care Sample Sprint → outcome=dropped → org vuelve a prospect con tag `pilot_evaluated` → no HubSpot deal.
3. **Adjusted path:** Sample Sprint → outcome=adjusted → nuevo Sample Sprint declarado linkado vía engagement_lineage relationship_kind=adjusted_into.
4. **Cancellation by client:** Sample Sprint cancelado en semana 2 por Sky → outcome=cancelled_by_client + cancellation_reason ≥ 10 chars → audit log evento `cancelled` → outbox event `service.engagement.cancelled v1`.
5. **Cancellation by provider:** Efeonce no puede continuar → outcome=cancelled_by_provider + cancellation_reason → mismo path audit/outbox.
6. **Anti-zombie:** engagement activo 121 días sin outcome ni lineage → trigger DB rechaza UPDATE → reliability signal `commercial.engagement.zombie` emite.
7. **Anti-unapproved:** intentar crear cost_attribution para engagement sin approval → bloqueado por gate de approval workflow.
8. **Budget overrun:** engagement con actual_cost > expected * 1.2 → reliability signal `commercial.engagement.budget_overrun` emite warning.
9. **Conversion rate drop:** trailing 6m < 30% → signal `commercial.engagement.conversion_rate_drop` emite warning.
10. **Cost reclassification:** dashboard `/finance/clients/sky` muestra Sky con margin neutral durante Sample Sprint (gracias a VIEW gtm_investment_pnl) + dashboard `/finance/gtm-investment` muestra el costo como línea separada.
11. **Capacity warning soft + override** (Delta v1.2 — B4): aprobar engagement con miembro saturado → UI muestra warning amarillo → aprobador declara `capacity_override_reason` → approval persiste con `capacity_warning_json` snapshot + `capacity_override_reason` → audit log evento `capacity_overridden`.
12. **Progress snapshot weekly cadence** (Delta v1.2 — B3): operador registra snapshot semanal con metrics_json → reliability signal `commercial.engagement.stale_progress` se mantiene en 0 → si no hay snapshot por > 10 días, signal emite warning.
13. **Atomic conversion rollback**: forzar fallo en step 4 (audit log INSERT) durante conversión → ROLLBACK completo → no hay outcome, no hay nuevo service, no hay lineage → org sigue en `opportunity` → operador puede reintentar.
14. **Outbox dead_letter recovery**: reactive consumer falla 5 veces aplicando `service.engagement.converted` → event va a dead_letter → admin endpoint reprocesa manualmente → org se flipea a active_client correctamente con todos los campos lifecycle.
15. **Multi Sprint per cliente** (Sky con Content Lead + Paid Social Care simultáneos): UI `/agency/sample-sprints` agrupa visualmente por cliente; conversion rate se mide per-sprint independiente.
16. **Pricing post-conversión via next_quotation_id**: outcome.next_quotation_id apunta a quotation aceptada → spawn service hereda `monthly_amount_clp` desde quotation → si NULL, wizard pide monto manual y crea quotation auto.

## 16. Open questions (resolver al implementar)

1. ¿`commercial.pilot.approve` requiere también firma del CFO si `expected_internal_cost_clp > threshold`? (sugerido: sí, > 5M CLP requiere doble approval).
2. ¿Pilotos cross-tenant (Efeonce vende a múltiples Globe clients en paralelo)? El modelo actual asume 1 piloto = 1 client. Multi-tenant sería extensión.
3. ¿Integración con HubSpot deal stage "Pilot in Progress"? Decidir si HubSpot refleja el piloto o solo el contrato post-conversión. Recomendación: solo post-conversión, para no inflar pipeline metrics con pilotos.
4. ~~¿Quién owna el approval por default?~~ **RESUELTO en Delta v1.1**: `EFEONCE_ADMIN` hoy (único role existente); `COMMERCIAL_LEAD` cuando se cree.
5. ¿Aplicar el modelo retroactivamente a Sample Sprints históricos (Sky abril-mayo 2026)? Backfill manual con `engagement_approvals.approved_retroactively=true` y reason explícita. Task derivada post-V1.
6. **Nuevo en v1.1**: ¿el path HubSpot auto-create deal para `services` regulares (post-conversión) realmente existe hoy? Verificar antes de Slice 7. Si no existe, ese step queda como "trigger manual via UI" y se difiere a una task posterior.
7. **Nuevo en v1.1**: ¿deprecation timeline de `commercial_cost_attribution` v1? La spec aplica `attribution_intent` a v1 + v2 por safety, pero idealmente v1 se removerá. Sin task tracker eso, la columna en v1 se vuelve technical debt.
8. **Nuevo en v1.2 (B2 follow-up)**: ¿qué triggers exactos para notificaciones cliente automáticas en V2? Candidatos canónicos: `T-3 días kickoff`, `weekly progress digest cada viernes`, `T-7 días decision_deadline`, `outcome recorded`. Diseñar templates + i18n + opt-out cuando se materialice.
9. **Nuevo en v1.2**: capacity check ¿debe considerar también `payroll_period.exported` para calcular vacaciones planificadas? Hoy `getMemberCapacityForPeriod` solo cruza `client_team_assignments`. V2 podría incluir cobertura de vacaciones / licencias para reducir falsos positivos en el warning.
10. **Nuevo en v1.2 (B5 follow-up)**: schema canónico de `metrics_json` por `engagement_kind`. Hoy es JSONB sin shape. V2 necesita templates por kind (Operations Sprint vs Discovery Sprint tienen reportes muy distintos) — input para auto-generación de PDF.

## 17. 4-Pilar Score (Delta v1.2)

> Score post Delta v1.2: **9.0/10** (vs 8.4 en v1.1, 6.75 en v1.0). Mejoras de v1.1 → v1.2:
>
> - **Safety +0.5**: B4 capacity warning + override audit reduce blast radius de over-allocation; B2 deferral elimina riesgo reputacional de notif automática mal calibrada.
> - **Robustness +0.5**: cancellation paths (5 outcome_kinds vs 3); next_quotation_id resuelve gap de pricing post-conversión.
> - **Resilience +0.5**: B3 progress snapshots dan forensic trail durante operación; signal `stale_progress` detecta abandono temprano.
> - **Scalability +0.5**: naming sweep `engagement_*` permite que mañana "Strategic Workshop" o "Audit Sprint" se modelen como sub-tipo del paraguas sin migrations.
>
> Score detallado abajo se mantiene del Delta v1.1 con incrementos puntuales por las nuevas primitivas.

## 17.1 Score detallado heredado de Delta v1.1

### Safety

- **What can go wrong**: pilotos sin gobierno queman recursos, lifecycle se flipea sin trazabilidad, aprobaciones bypaseadas, audit trail corrupto.
- **Gates**: capability granular `commercial.pilot.{declare,approve,record_outcome,read}`, approval workflow obligatorio (`pilot_approvals.status='approved'` requerido para cost attribution), audit log append-only con triggers PG anti-update/delete.
- **Blast radius if wrong**: medium — un piloto fantasma cuesta dinero por cliente atribuido pero no contamina cross-tenant; el lifecycle history append-only protege auditoría.
- **Verified by**: 5 reliability signals (overdue/budget_overrun/zombie/unapproved_active/conversion_rate_drop), trigger anti-zombie 120d, audit triggers, FK ON DELETE SET NULL para preservar audit cuando un actor deja la empresa.
- **Residual risk**: el path HubSpot auto-create deals (Open Q6) no está verificado; si no existe, el flow queda con un gap manual hasta que se implemente. Mitigación: en Slice 7 se verifica explícitamente y se difiere si necesario.
- **Score estimado**: 8.5/10.

### Robustness

- **Idempotency**: outbox events con `event_id` UUID PK + at-least-once consumer canónico (TASK-771/773); `service_outcomes UNIQUE (service_id)` previene doble-outcome; `service_lineage UNIQUE (parent, child, kind)` previene duplicados.
- **Atomicity**: §8 declara `BEGIN; ... COMMIT;` explícito para los 5 INSERTs core. Outbox event va en la misma tx. Reactive consumer (paso 6) es post-commit con rollback contract documentado en §8.1.
- **Race protection**: `service_commercial_terms_active_unique` partial index previene 2 terms activos simultáneos; `pilot_approvals UNIQUE (service_id)` previene re-approval; CHECK enums limitan transitions inválidas.
- **Constraint coverage**: 6 tablas, 8+ CHECK constraints, 6 FK con políticas explícitas (CASCADE para owned, SET NULL para actor).
- **Verified by**: 8 smoke tests §15 (happy/drop/adjusted/zombie/unapproved/budget/conversion/cost reclass) + audit log invariant.
- **Score estimado**: 8.5/10.

### Resilience

- **Retry policy**: outbox + reactive consumer hereda patrón canónico (exponential backoff bounded, dead_letter después de N).
- **Dead letter**: heredada del outbox canónico (`status='dead_letter'` cuando retries exhausted, alert via reliability signal).
- **Reliability signals**: 5 declarados, **subsystem `Commercial Health` declarado como NUEVO** (Slice 6 incluye registry migration mirror de TASK-672 `Finance Data Quality`).
- **Audit trail**: `pilot_decision_audit_log` append-only completo en §3.2, trigger anti-update/delete, indexed por (service_id, occurred_at DESC) para forensics rápido.
- **Recovery**: §8.1 declara rollback contract explícito; §10.2 documenta path manual via endpoint admin si dead_letter persiste; runbook por signal pending pero estructura clara.
- **Residual risk**: runbooks específicos no escritos aún (parte del Slice 6). El reliability signal `commercial.pilots.zombie` cubre detección pero la respuesta operativa (¿desbloquear vía admin?) queda como TODO.
- **Score estimado**: 8/10.

### Scalability

- **Hot path Big-O**: O(1) lookup por service_id; lineage graph traversal O(n) en cadenas — bounded en práctica por la longitud típica del journey (3-5 pilotos por client max realista).
- **Index coverage**: §3.4 declara los 4 índices faltantes (lineage parent + child, pilot_approvals pending, outcomes decision DESC). UNIQUE active partial en commercial_terms ya cubre hot read.
- **Async paths**: outbox + reactive consumer ✅ (post-commit, no bloquea write path).
- **Cost at 10x**: a 100 pilotos/año el modelo escala bien; a 1000/año `service_lineage` puede necesitar partitioning (no es problema actual).
- **Pagination**: spec no declara cursores en `/agency/pilots` — para 100 rows trivial; debería declararse en Slice 8 al implementar UI.
- **Residual risk**: si se aplica multi-tenant (Open Q2) — un piloto cross-tenant — la atomicidad transaccional cruza schemas y necesita rediseño. No es problema actual.
- **Score estimado**: 8.5/10.

**Score promedio post-Delta: 8.4/10** (vs 6.75/10 en v1.0). **Bloqueantes resueltos. Spec lista para invocar `greenhouse-task-planner` y generar TASK-### tracking files** (uno por slice del roadmap §11).

## 18. Changelog

| Fecha | Versión | Autor | Cambio |
|---|---|---|---|
| 2026-05-05 | 1.0 | Claude (Opus 4.7) | Spec inicial — propuesta no implementada |
| 2026-05-05 | 1.1 | Claude (Opus 4.7) — auditoría con `arch-architect` | Delta v1.1: 3 errores materiales corregidos (schema cost attribution, FK actor, cita TASK-728), 4 supuestos verificados (lifecycle enum, source enum, subsystem novel, owner approve), DDL completa de `pilot_decision_audit_log` agregada, índices faltantes (lineage, approvals pending, outcomes decision), boundary transaccional explícito en §8, lifecycle history canónico aplicado en §10.2, patrón TASK-409 + TASK-760/761/762 reusados explícitamente. Score 4-pilar: 6.75/10 → 8.5/10 estimado. |
| 2026-05-05 | 1.2 | Claude (Opus 4.7) — pre-flight check + naming "Sample Sprint" | Delta v1.2: rebrand UI "Sample Sprint" + sub-tipos (Operations/Extension/Validation/Discovery Sprint); naming sweep de tablas a `engagement_*` (genérico — sobrevive marketing pivots); 5 decisiones de alcance V1 resueltas (B1 naming híbrido, B2 notif diferidas a V2, B3 progress snapshots incluido, B4 capacity warning soft, B5 reporte manual con structured fields); nueva tabla `engagement_progress_snapshots` (Slice 4.5); extensión `client_team_assignments.service_id` FK opcional; outcome enum extendido con `cancelled_by_client/provider` + `cancellation_reason`; `next_quotation_id` para pricing post-conversión; capability `commercial.engagement.record_progress` nueva; signal `commercial.engagement.stale_progress` nueva; 9 outbox events (vs 6 en v1.1); 16 hard rules (vs 11); 16 smoke tests (vs 8); 10 open questions (vs 7). Score 4-pilar: 8.5/10 → 9.0/10 estimado. **Spec lista para `greenhouse-task-planner`**. |
| 2026-05-07 | 1.3 | Codex — TASK-806 runtime alignment | `commercial_cost_attribution_v2` ahora propaga `service_id` y deriva `attribution_intent` desde services non-regular aprobados con guard TASK-813; `gtm_investment_pnl` real usa `amount_clp`, filtra `terms_kind='no_cost'`, exige approval aprobado vía `EXISTS` y documenta explícitamente que es management accounting, no auditoría cliente/fiscal. |
