# Codex Tasks

Panel operativo de briefs `CODEX_TASK_*` del repo.

## Estados

- `in-progress`: trabajo activo o parcialmente implementado que sigue abierto.
- `to-do`: brief vigente, alineado o por alinear, pero sin ejecución cerrada en el repo actual.
- `complete`: task cerrada, implementada, absorbida por otra versión o conservada como referencia histórica.

## In Progress

| Task | Prioridad | Impacto | Esfuerzo | Estado real | Foco |
| --- | --- | --- | --- | --- | --- |
| [CODEX_TASK_HR_Payroll_Operational_Hardening_v1.md](in-progress/CODEX_TASK_HR_Payroll_Operational_Hardening_v1.md) | P1 | Alto | Alto | Parcial | Hardening operativo de Payroll: readiness, auditabilidad por entry, consistencia de fuentes y cálculo Chile más robusto |

## To Do

### Criterio operativo

- `Prioridad`: `P0` desbloquea arquitectura o runtime compartido; `P1` cierra módulos visibles o muy cercanos al usuario; `P2` expande capacidades; `P3` pule UX o follow-ons.
- `Impacto`: `Muy alto`, `Alto`, `Medio`.
- `Esfuerzo`: `Bajo`, `Medio`, `Alto`.
- `Estado real`:
  - `Avanzada` = la lane ya tiene runtime o modelo materializado importante
  - `Parcial` = existen slices o foundations, pero el módulo sigue claramente abierto
  - `Diseño` = baseline o spec alineada, sin implementación significativa todavía
  - `Referencia` = brief histórico o framing de producto, no baseline ejecutable
- Regla de lectura:
  - si existe `v2`, esa es la baseline de implementación
  - los briefs originales `v1` o sin sufijo quedan como referencia de producto o histórico, no como primer ejecutable

### Backlog Priorizado

| Orden | Task | Prioridad | Impacto | Esfuerzo | Estado real | Foco |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [CODEX_TASK_Tenant_Notion_Mapping.md](to-do/CODEX_TASK_Tenant_Notion_Mapping.md) | P0 | Alto | Medio | Parcial | Corte del legado `notion_project_ids` y convergencia canónica `Space -> Notion` |
| 2 | ~~CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md~~ | — | — | — | **Cerrada** | People consumers migrados a Postgres-first con BigQuery fallback; backfill script para reconciliación de orphan profiles; 22 tests unitarios |
| 3 | ~~GREENHOUSE_IDENTITY_ACCESS_V2.md~~ | — | — | — | **Movida a spec** | Reclasificada como documento de arquitectura → `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`. 12/12 items implementados |
| 4 | ~~CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md~~ | — | — | — | **Cerrada** | 3 slices completos: accounts/suppliers/rates, income/expenses CRUD, reconciliación runtime — todo Postgres-first con BigQuery fallback |
| 5 | ~~CODEX_TASK_Admin_Team_Postgres_Runtime_Migration_v1.md~~ | — | — | — | **Cerrada** | 3 slices: member reads/mutations, assignment reads/mutations, team-queries — todo Postgres-first con BigQuery fallback |
| 6 | ~~CODEX_TASK_People_360_Enrichments_v1.md~~ | — | — | — | **Cerrada** | Tab Identidad (4 cards: identidad, acceso, perfil laboral, actividad operativa), CTAs cross-module en Nómina y Finanzas |
| 7 | [CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1.md](to-do/CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1.md) | P1 | Alto | Alto | Diseño | Capa canónica de work entries para reconciliar permisos, asistencia y futura integración con Microsoft Teams antes de nómina |
| 8 | [CODEX_TASK_Webhook_Infrastructure_MVP_v1.md](to-do/CODEX_TASK_Webhook_Infrastructure_MVP_v1.md) | P1 | Alto | Medio | Diseño | Foundation reusable para inbound/outbound webhooks, delivery logs, retries y dead letters encima de `greenhouse_sync.outbox_events` |
| 9 | [CODEX_TASK_Lint_Debt_Burn_Down_v1.md](to-do/CODEX_TASK_Lint_Debt_Burn_Down_v1.md) | P1 | Alto | Medio | Diseño | Recuperar baseline `pnpm lint` limpio con autofix controlado + cleanup manual de imports, unused vars y `require()` legacy |
| 10 | ~~CODEX_TASK_Creative_Hub_Module_v2.md~~ | — | — | — | **Cerrada** | 4/4 gaps resueltos: AND gate activación, Brand Intelligence con KPIs reales, CSC pipeline con fases explícitas, métricas con aging real por item |
| 11 | [CODEX_TASK_Team_Identity_Capacity_System_v2.md](to-do/CODEX_TASK_Team_Identity_Capacity_System_v2.md) | P1 | Alto | Alto | Parcial | Formalización de capacity y su encaje con People, assignments e identidad canónica |
| 12 | [CODEX_TASK_Greenhouse_Home_Nexa_v2.md](to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md) | P1 | Alto | Medio | Diseño | Nueva entrada `client-first` al portal con `Home` como puerta principal del usuario |
| 13 | [CODEX_TASK_Financial_Intelligence_Layer_v2.md](to-do/CODEX_TASK_Financial_Intelligence_Layer_v2.md) | P2 | Alto | Medio | Diseño | Trends, partnerships, cost allocations UI, LTV/CAC y vista analytics consolidada sobre foundation ya implementada |
| 14 | [CODEX_TASK_Business_Units_Canonical_v2.md](to-do/CODEX_TASK_Business_Units_Canonical_v2.md) | P2 | Alto | Medio | Diseño | Metadata canónica para BU comercial vs operativa y analítica futura en Finance/ICO |
| 15 | [CODEX_TASK_Campaign_360_v2.md](to-do/CODEX_TASK_Campaign_360_v2.md) | P2 | Alto | Alto | Diseño | Nuevo objeto canónico de negocio encima de `Space`, `Project` e `ICO Engine` |
| 16 | [CODEX_TASK_SCIM_User_Provisioning_v2.md](to-do/CODEX_TASK_SCIM_User_Provisioning_v2.md) | P2 | Alto | Alto | Diseño | Provisioning enterprise sobre `Identity & Access V2` y PostgreSQL |
| 17 | [CODEX_TASK_Staff_Augmentation_Module_v2.md](to-do/CODEX_TASK_Staff_Augmentation_Module_v2.md) | P2 | Alto | Alto | Diseño | Placements de staff aug sobre assignments, people y services |
| 18 | [CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md](to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md) | P2 | Medio | Alto | Diseño | Enrichment de delivery e ICO con metadata de Frame.io para Creative Hub |
| 19 | ~~CODEX_TASK_Greenhouse_Email_Catalog_v1.md~~ | — | — | — | **Movida a spec** | Reclasificada como documento de referencia → `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md` |
| 20 | [CODEX_TASK_Portal_View_Surface_Consolidation.md](to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md) | P3 | Medio | Medio | Parcial | Consolidación UX transversal de shells, vistas y navegación |
| 21 | [CODEX_TASK_Typography_Hierarchy_Fix.md](to-do/CODEX_TASK_Typography_Hierarchy_Fix.md) | P3 | Medio | Bajo | Parcial | Ajuste transversal de jerarquía tipográfica y legibilidad |

### Briefs Históricos o de Producto

| Task | Estado operativo actual | Uso recomendado |
| --- | --- | --- |
| [CODEX_TASK_Campaign_360.md](to-do/CODEX_TASK_Campaign_360.md) | Brief original desalineado en modelo técnico | Usar solo como framing de producto; implementar sobre `v2` |
| [CODEX_TASK_Business_Units_Canonical.md](to-do/CODEX_TASK_Business_Units_Canonical.md) | Brief original que competía con `service_modules` | Usar solo como contexto; implementar sobre `v2` |
| [CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline.md](to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline.md) | Brief original `BigQuery-first` | Usar solo como referencia de objetivo; implementar sobre `v2` |
| [CODEX_TASK_Greenhouse_Home_Nexa.md](to-do/CODEX_TASK_Greenhouse_Home_Nexa.md) | Brief original previo al runtime actual del portal | Usar solo como visión UX; implementar sobre `v2` |
| [CODEX_TASK_SCIM_User_Provisioning.md](to-do/CODEX_TASK_SCIM_User_Provisioning.md) | Brief original previo a `Identity & Access V2` | Usar solo como referencia; implementar sobre `v2` |
| [CODEX_TASK_Staff_Augmentation_Module.md](to-do/CODEX_TASK_Staff_Augmentation_Module.md) | Brief original con drift en IDs y runtime | Usar solo como contexto; implementar sobre `v2` |

## Supporting Specs

Estos documentos siguen vivos, pero no compiten como backlog ejecutable independiente.
Se consumen como arquitectura o diseño de apoyo según la lane activa.

| Documento | Rol actual |
| --- | --- |
| [Greenhouse_Account_360_Object_Model_v1.md](complete/Greenhouse_Account_360_Object_Model_v1.md) | Spec arquitectónica 100% implementada: organizations + spaces (tenant) + person_memberships, IDs canónicos EO-ORG/SPC/MBR, serving view organization_360, API routes, UI en /agency/organizations, modelo unificado org_type |
| [Greenhouse_Data_Node_Architecture_v1.md](to-do/Greenhouse_Data_Node_Architecture_v1.md) | Estrategia de export, API y MCP para exponer datos del portal |
| [Greenhouse_Data_Node_Architecture_v2.md](to-do/Greenhouse_Data_Node_Architecture_v2.md) | Baseline canonica de implementacion de Data Node sobre runtime actual, PostgreSQL y API externa futura |
| [Greenhouse_ICO_Engine_v1.md](../architecture/Greenhouse_ICO_Engine_v1.md) | Movida a `docs/architecture/` como spec de referencia. ICO Engine implementado: pipeline operativo, materialización, multi-assignee, health endpoint |
| [Greenhouse_Services_Architecture_v1.md](../architecture/Greenhouse_Services_Architecture_v1.md) | Movida a `docs/architecture/` como spec de referencia. Core implementado (tabla, view, resolución). Gaps operativos derivados a `CODEX_TASK_Services_Runtime_Closure_v1` |

## Complete

| Task | Foco |
| --- | --- |
| [CODEX_TASKS_ALIGNMENT_UPDATE_v1.md](complete/CODEX_TASKS_ALIGNMENT_UPDATE_v1.md) | Alineación histórica de tasks con el repo real |
| [CODEX_TASK_Admin_Landing_Control_Tower_Redesign.md](complete/CODEX_TASK_Admin_Landing_Control_Tower_Redesign.md) | Landing interna y control tower |
| [CODEX_TASK_Admin_Team_Module.md](complete/CODEX_TASK_Admin_Team_Module.md) | Brief histórico de Admin Team reemplazado por v2 |
| [CODEX_TASK_Admin_Team_Module_v2.md](complete/CODEX_TASK_Admin_Team_Module_v2.md) | CRUD completo de roster y asignaciones: 10 API routes, 4 drawers, mutate-team.ts (1,844 líneas), tipos completos. Pendiente solo migración BigQuery → Postgres (derivada a task separada) |
| [CODEX_TASK_Agency_Operator_Layer.md](complete/CODEX_TASK_Agency_Operator_Layer.md) | Capa agency transversal |
| [CODEX_TASK_AI_Tooling_Credit_System.md](complete/CODEX_TASK_AI_Tooling_Credit_System.md) | Brief histórico de AI Tooling reemplazado por v2 |
| [CODEX_TASK_AI_Tooling_Credit_System_v2.md](complete/CODEX_TASK_AI_Tooling_Credit_System_v2.md) | Foundation backend de AI tooling ya cerrada para el alcance declarado |
| [CODEX_TASK_Client_Dashboard_Redesign.md](complete/CODEX_TASK_Client_Dashboard_Redesign.md) | Rediseño dashboard cliente |
| [CODEX_TASK_Client_Dashboard_Visual_Diagnosis.md](complete/CODEX_TASK_Client_Dashboard_Visual_Diagnosis.md) | Diagnóstico visual del dashboard cliente |
| [CODEX_TASK_Creative_Hub_Module.md](complete/CODEX_TASK_Creative_Hub_Module.md) | Brief histórico de Creative Hub reemplazado por v2 |
| [CODEX_TASK_ETL_ICO_Pipeline_Hardening.md](complete/CODEX_TASK_ETL_ICO_Pipeline_Hardening.md) | Hardening del pipeline `notion-bq-sync -> sync-conformed -> ico-materialize` |
| [CODEX_TASK_Financial_Intelligence_Layer.md](complete/CODEX_TASK_Financial_Intelligence_Layer.md) | Foundation de datos (4 tablas/views), client economics (compute + vista + trend), P&L parcial, cost allocations store, PersonFinanceTab. Pendientes derivados a v2 |
| [CODEX_TASK_Financial_Module.md](complete/CODEX_TASK_Financial_Module.md) | Brief histórico de Finance reemplazado por v2 |
| [CODEX_TASK_Financial_Module_v2.md](complete/CODEX_TASK_Financial_Module_v2.md) | Runtime gap closure completo: 38 endpoints, 8 páginas, 7 drawers, reconciliación con candidates/match/unmatch/exclude, egresos especializados (payroll/previsión/impuestos), expenses/meta y payroll-candidates |
| [CODEX_TASK_Fix_Team_Capacity_Views.md](complete/CODEX_TASK_Fix_Team_Capacity_Views.md) | Ajustes a vistas de capacidad de equipo |
| [CODEX_TASK_Google_SSO_Greenhouse.md](complete/CODEX_TASK_Google_SSO_Greenhouse.md) | Google SSO |
| [CODEX_TASK_HR_Core_Module.md](complete/CODEX_TASK_HR_Core_Module.md) | Brief histórico de HR Core reemplazado por v2 |
| [CODEX_TASK_HR_Core_Module_v2.md](complete/CODEX_TASK_HR_Core_Module_v2.md) | Foundation backend de HR Core ya cerrada para el alcance declarado |
| [CODEX_TASK_HR_Payroll_Module.md](complete/CODEX_TASK_HR_Payroll_Module.md) | Brief histórico de HR Payroll reemplazado por v2 |
| [CODEX_TASK_HR_Payroll_Module_v2.md](complete/CODEX_TASK_HR_Payroll_Module_v2.md) | Brief histórico de HR Payroll absorbido por v3 |
| [CODEX_TASK_HR_Payroll_Module_v3.md](complete/CODEX_TASK_HR_Payroll_Module_v3.md) | Cierre UX de Payroll: alta compensación, edición período, KPI manual, override, ficha colaborador |
| [CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md](complete/CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md) | Runtime Payroll cortado a PostgreSQL: schema, store, 11 rutas Postgres-first, serving view, backfill |
| [CODEX_TASK_Nubox_DTE_Integration.md](complete/CODEX_TASK_Nubox_DTE_Integration.md) | Integración bidireccional completa: emisión DTE individual/masiva, sync ventas/compras/pagos, PDF/XML proxy, cron diario, modelo unificado de organizaciones, identity resolution por RUT, auto-provisioning suppliers. Pendiente solo: migrations producción + primer DTE real |
| [CODEX_TASK_Login_Page_Greenhouse.md](complete/CODEX_TASK_Login_Page_Greenhouse.md) | UI de login Greenhouse |
| [CODEX_TASK_Microsoft_SSO_Greenhouse.md](complete/CODEX_TASK_Microsoft_SSO_Greenhouse.md) | Microsoft SSO |
| [CODEX_TASK_People_Unified_View.md](complete/CODEX_TASK_People_Unified_View.md) | Brief histórico de People reemplazado por v2 |
| [CODEX_TASK_People_Unified_View_v2.md](complete/CODEX_TASK_People_Unified_View_v2.md) | Brief histórico de People reemplazado por v3 |
| [CODEX_TASK_People_Unified_View_v3.md](complete/CODEX_TASK_People_Unified_View_v3.md) | Surface fundacional de People ya cerrada; follow-up vivo solo para enrichments 360 |
| [CODEX_TASK_Person_360_Profile_Unification_v1.md](complete/CODEX_TASK_Person_360_Profile_Unification_v1.md) | Backbone y serving fundacional de Person 360 ya cerrados; follow-up vivo solo para coverage y consumer cutover |
| [CODEX_TASK_Space_Admin_View_Redesign.md](complete/CODEX_TASK_Space_Admin_View_Redesign.md) | Brief histórico de vista admin de space |
| [CODEX_TASK_Source_Sync_Runtime_Projections_v1.md](complete/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md) | Lane fundacional de raw/conformed/proyecciones runtime ya materializada con datos reales |
| [CODEX_TASK_Team_Identity_Capacity_System.md](complete/CODEX_TASK_Team_Identity_Capacity_System.md) | Brief histórico de Team Identity & Capacity reemplazado por v2 |
| [CODEX_TASK_Tenant_Detail_View_Redesign.md](complete/CODEX_TASK_Tenant_Detail_View_Redesign.md) | Detalle admin de tenant |
| [CODEX_TASK_Transactional_Email_System.md](complete/CODEX_TASK_Transactional_Email_System.md) | Sistema transaccional de email: reset, invitaciones, verificación — Resend + React Email + PostgreSQL |
| [CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md](complete/CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md) | 3 slices: Slice 1 (accounts, suppliers, rates — 7 rutas), Slice 2 (income/expenses CRUD + PUT — 5 rutas), Slice 3 (reconciliación runtime completa — 10 rutas). Todo Postgres-first con BigQuery fallback. Feature-flag gating via `assertFinanceSlice2PostgresReady()` |
| [CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md](complete/CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md) | 3 slices: People list Postgres-first, Person detail Postgres-first (3 sub-queries), reconciliation coverage (backfill script). 22 tests unitarios. BigQuery fallback con `shouldFallbackToLegacy()` |
| [CODEX_TASK_Admin_Team_Postgres_Runtime_Migration_v1.md](complete/CODEX_TASK_Admin_Team_Postgres_Runtime_Migration_v1.md) | 3 slices: Slice 1 (member reads/mutations + identity sync), Slice 2 (assignment reads/mutations — dual-write flipped), Slice 3 (team-queries roster + identity). Todo Postgres-first con BigQuery fallback. `syncAssignmentToPostgres` eliminado, reemplazado por `syncToBigQuery` |
| [CODEX_TASK_People_360_Enrichments_v1.md](complete/CODEX_TASK_People_360_Enrichments_v1.md) | Tab "Identidad" con 4 cards: identidad (Person 360), acceso al portal, perfil laboral (HR Core), actividad operativa (delivery context). CTAs cross-module en Nómina y Finanzas. Meta endpoint actualizado. 8 archivos, 0 nuevos endpoints |

## Mapa de dependencias cruzadas

Vista rápida de cómo las tasks activas se afectan entre sí. Usar esta tabla para evaluar impacto cruzado al cerrar una task.

### Cadenas críticas de dependencia

```
Tenant Notion Mapping ──→ Services Runtime Closure ──→ Business Units Canonical
        │                         │                           │
        ├──→ Campaign 360 ←──────┘                           │
        │                                                     │
        └──→ FrameIO Analytics ──→ Business Units (BU ops) ──┘
                                                              │
Finance PG Migration ──→ Financial Intelligence v2 ←──────────┘
        │
        └──→ Staff Augmentation (economics)

Person 360 Coverage ──→ People 360 Enrichments
        │                       │
        └──→ SCIM Provisioning  └──→ Team Identity Capacity
                                            │
Admin Team PG Migration ────────────────────┘
        │
        └──→ Staff Augmentation (assignment_type)
```

### Tabla de impacto: "si cierro X, reviso Y"

| Al cerrar esta task | Revisar estas tasks |
|---|---|
| Tenant Notion Mapping | Services Runtime Closure, Campaign 360, FrameIO Analytics, Business Units |
| Person 360 Coverage | People 360 Enrichments, Admin Team PG Migration, SCIM Provisioning |
| Finance PG Migration | Financial Intelligence v2, Staff Augmentation, Business Units |
| Admin Team PG Migration | Team Identity Capacity, Staff Augmentation, People 360 Enrichments |
| HR Payroll Attendance/Leave Work Entries | HR Payroll Operational Hardening, HRIS Contract Type Consolidation |
| Services Runtime Closure | Business Units, Campaign 360, Staff Augmentation, Tenant Notion Mapping |
| Webhook Infrastructure MVP | Notification System, HR Payroll Attendance/Leave Work Entries, Services Runtime Closure, Greenhouse Data Node v2 |
| Lint Debt Burn Down | Cualquier lane activa que necesite `pnpm lint`, especialmente Webhook Infrastructure, Notification System, Payroll Operational Hardening y módulos compartidos |
| Business Units Canonical | Financial Intelligence v2, Campaign 360, FrameIO Analytics, Services Runtime Closure |
| Campaign 360 | Financial Intelligence v2, FrameIO Analytics |
| Typography Hierarchy Fix | (ninguna — cambio aislado) |
| Greenhouse Home Nexa | (ninguna — superficie aditiva) |

---

## Regla operativa

- Mantener todos los `CODEX_TASK_*` dentro de `docs/tasks/` y sus subcarpetas de estado.
- Los briefs vivos del proyecto deben quedar versionados dentro de `docs/tasks/**`; no usar archivos sueltos en raíz como source of truth.
- No asumir que un task está vigente solo por existir; contrastar siempre con `project_context.md`, `Handoff.md` y `changelog.md`.
- Toda `CODEX_TASK_*` nueva, reactivada o retomada debe revisarse obligatoriamente contra la arquitectura antes de implementarse.
- Revisión mínima obligatoria para cualquier `CODEX_TASK_*`:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- Además de esa base, cada task debe contrastarse con la arquitectura especializada que le corresponda.
  - ejemplos: `FINANCE_CANONICAL_360_V1.md`, `GREENHOUSE_SERVICE_MODULES_V1.md`, `GREENHOUSE_IDENTITY_ACCESS_V1.md`, `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Si una task contradice la arquitectura vigente, no debe ejecutarse tal cual.
  - primero se corrige la task
  - o se documenta explícitamente la nueva decisión arquitectónica antes de implementar
