# Task Index

Panel operativo de tasks del repo.

## Convencion vigente

- Las tasks nuevas deben usar `TASK-###` como ID estable.
- Los `CODEX_TASK_*` existentes siguen vigentes como legacy hasta su migracion.
- El numero de `TASK-###` no define prioridad mutable; el orden actual vive en `Rank` y en el backlog priorizado de este indice.
- Plantilla canonica para crear y leer tasks:
  - [TASK_TEMPLATE.md](TASK_TEMPLATE.md)
- Registro canonico de IDs bootstrap:
  - [TASK_ID_REGISTRY.md](TASK_ID_REGISTRY.md)

## Bootstrap actual

Primer bloque operativo asignado:

- `TASK-001` a `TASK-010` ya reservados para la lane activa y el top 9 abierto del backlog
- siguiente ID disponible: `TASK-011`
- cualquier fila sin `Task ID` fuera de ese bloque sigue pendiente de bootstrap

## Estados

- `in-progress`: trabajo activo o parcialmente implementado que sigue abierto.
- `to-do`: brief vigente, alineado o por alinear, pero sin ejecución cerrada en el repo actual.
- `complete`: task cerrada, implementada, absorbida por otra versión o conservada como referencia histórica.

## In Progress

| Task ID | Task | Prioridad | Impacto | Esfuerzo | Estado real | Foco |
| --- | --- | --- | --- | --- | --- | --- |
| `TASK-001` | [CODEX_TASK_HR_Payroll_Operational_Hardening_v1.md](in-progress/CODEX_TASK_HR_Payroll_Operational_Hardening_v1.md) | P1 | Alto | Alto | Parcial | Hardening operativo de Payroll: readiness, auditabilidad por entry, consistencia de fuentes y cálculo Chile más robusto |

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

| Rank | Task ID | Task | Prioridad | Impacto | Esfuerzo | Estado real | Foco |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `TASK-002` | [CODEX_TASK_Tenant_Notion_Mapping.md](to-do/CODEX_TASK_Tenant_Notion_Mapping.md) | P0 | Alto | Medio | Parcial | Corte del legado `notion_project_ids` y convergencia canónica `Space -> Notion` |
| 2 | `TASK-003` | [CODEX_TASK_Invoice_Payment_Ledger_Correction_v1.md](to-do/CODEX_TASK_Invoice_Payment_Ledger_Correction_v1.md) | P0 | Muy alto | Medio | Diseño | **Corrección de integridad.** Nubox bank movements escriben `income.amount_paid` directamente sin crear registros en `income_payments`. Pagos sin trazabilidad, reconciliación bancaria incompleta, riesgo de duplicación. Corregir flujo para que todo pago pase por ledger. |
| 3 | `TASK-004` | [CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1.md](to-do/CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1.md) | P0 | Muy alto | Medio | Diseño | **Corrección de cálculos.** Dashboard financiero muestra facturado como ingreso, flujo de caja falso (accrual - accrual), egresos inconsistentes (con/sin nómina), fuentes divergentes (BigQuery vs Postgres). 6 problemas documentados. Migrar a Postgres-first, KPIs duales facturado/cobrado, cash flow real. |
| 4 | ~~CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md~~ | — | — | — | — | **Cerrada** | People consumers migrados a Postgres-first con BigQuery fallback; backfill script para reconciliación de orphan profiles; 22 tests unitarios |
| 5 | ~~GREENHOUSE_IDENTITY_ACCESS_V2.md~~ | — | — | — | — | **Movida a spec** | Reclasificada como documento de arquitectura → `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`. 12/12 items implementados |
| 6 | ~~CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md~~ | — | — | — | — | **Cerrada** | 3 slices completos: accounts/suppliers/rates, income/expenses CRUD, reconciliación runtime — todo Postgres-first con BigQuery fallback |
| 7 | ~~CODEX_TASK_Admin_Team_Postgres_Runtime_Migration_v1.md~~ | — | — | — | — | **Cerrada** | 3 slices: member reads/mutations, assignment reads/mutations, team-queries — todo Postgres-first con BigQuery fallback |
| 8 | ~~CODEX_TASK_People_360_Enrichments_v1.md~~ | — | — | — | — | **Cerrada** | Tab Identidad (4 cards: identidad, acceso, perfil laboral, actividad operativa), CTAs cross-module en Nómina y Finanzas |
| 9 | `TASK-005` | [CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1.md](to-do/CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1.md) | P1 | Alto | Alto | Diseño | Capa canónica de work entries para reconciliar permisos, asistencia y futura integración con Microsoft Teams antes de nómina |
| 10 | `TASK-006` | [CODEX_TASK_Webhook_Infrastructure_MVP_v1.md](to-do/CODEX_TASK_Webhook_Infrastructure_MVP_v1.md) | P1 | Alto | Medio | Diseño | Foundation reusable para inbound/outbound webhooks, delivery logs, retries y dead letters encima de `greenhouse_sync.outbox_events` |
| 11 | `TASK-007` | [CODEX_TASK_Lint_Debt_Burn_Down_v1.md](to-do/CODEX_TASK_Lint_Debt_Burn_Down_v1.md) | P1 | Alto | Medio | Diseño | Recuperar baseline `pnpm lint` limpio con autofix controlado + cleanup manual de imports, unused vars y `require()` legacy |
| 12 | ~~CODEX_TASK_Creative_Hub_Module_v2.md~~ | — | — | — | — | **Cerrada** | 4/4 gaps resueltos: AND gate activación, Brand Intelligence con KPIs reales, CSC pipeline con fases explícitas, métricas con aging real por item |
| 13 | `TASK-008` | [CODEX_TASK_Team_Identity_Capacity_System_v2.md](to-do/CODEX_TASK_Team_Identity_Capacity_System_v2.md) | P1 | Alto | Alto | Parcial | Formalización de capacity y su encaje con People, assignments e identidad canónica |
| 14 | `TASK-009` | [CODEX_TASK_Greenhouse_Home_Nexa_v2.md](to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md) | P1 | Alto | Medio | Diseño | Nueva entrada `client-first` al portal con `Home` como puerta principal del usuario |
| 15 | `TASK-010` | [CODEX_TASK_Organization_Economics_Dashboard_v1.md](to-do/CODEX_TASK_Organization_Economics_Dashboard_v1.md) | P1 | Muy alto | Medio | Diseño | **Sinergia cross-module.** Dashboard ejecutivo por org que correlaciona revenue (Finance) + costo laboral real (Payroll/FTE) + eficiencia operativa (ICO Engine) + margen ajustado. Cierra el loop completo de rentabilidad. |
| 16 | `reservar TASK-011` | [CODEX_TASK_ICO_Person_360_Integration_v1.md](to-do/CODEX_TASK_ICO_Person_360_Integration_v1.md) | P1 | Alto | Medio | Diseño | **Sinergia cross-module.** Proyectar métricas ICO (RPA, OTD, FTR, cycle time) a `person_delivery_360` vía Postgres. Perfil operativo completo: compensación × FTE × eficiencia. |
| 17 | [CODEX_TASK_Outbox_Event_Expansion_v1.md](to-do/CODEX_TASK_Outbox_Event_Expansion_v1.md) | P1 | Alto | Medio | Diseño | **Sinergia cross-module.** Expandir outbox a Account 360, HR Core, Identity. Construir primer consumer reactivo (assignment change → recalculate cost allocation). Catálogo de eventos. |
| 18 | [CODEX_TASK_Nubox_Finance_Reconciliation_Bridge_v1.md](to-do/CODEX_TASK_Nubox_Finance_Reconciliation_Bridge_v1.md) | P1 | Alto | Medio | Diseño | **Sinergia cross-module.** Matching automático DTE↔income/expense, propuestas de reconciliación, cobertura DTE por organización. Cierra circuito Nubox→Finance. |
| 19 | [CODEX_TASK_Projects_Account_360_Bridge_v1.md](to-do/CODEX_TASK_Projects_Account_360_Bridge_v1.md) | P1 | Alto | Medio | Diseño | **Sinergia cross-module.** Conectar Projects con Account 360 vía Space-Notion bridge. Tab de proyectos por org, project counts en `organization_360`, cadena Org→Space→Notion→Projects. |
| 20 | [CODEX_TASK_Financial_Intelligence_Layer_v2.md](to-do/CODEX_TASK_Financial_Intelligence_Layer_v2.md) | P2 | Alto | Medio | Diseño | Trends, partnerships, cost allocations UI, LTV/CAC y vista analytics consolidada sobre foundation ya implementada |
| 21 | [CODEX_TASK_Business_Units_Canonical_v2.md](to-do/CODEX_TASK_Business_Units_Canonical_v2.md) | P2 | Alto | Medio | Diseño | Metadata canónica para BU comercial vs operativa y analítica futura en Finance/ICO |
| 22 | [CODEX_TASK_Campaign_360_v2.md](to-do/CODEX_TASK_Campaign_360_v2.md) | P2 | Alto | Alto | Diseño | Nuevo objeto canónico de negocio encima de `Space`, `Project` e `ICO Engine` |
| 23 | [CODEX_TASK_SCIM_User_Provisioning_v2.md](to-do/CODEX_TASK_SCIM_User_Provisioning_v2.md) | P2 | Alto | Alto | Diseño | Provisioning enterprise sobre `Identity & Access V2` y PostgreSQL |
| 24 | [CODEX_TASK_Staff_Augmentation_Module_v2.md](to-do/CODEX_TASK_Staff_Augmentation_Module_v2.md) | P2 | Alto | Alto | Diseño | Placements de staff aug sobre assignments, people y services |
| 25 | [CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md](to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md) | P2 | Medio | Alto | Diseño | Enrichment de delivery e ICO con metadata de Frame.io para Creative Hub |
| 26 | ~~CODEX_TASK_Greenhouse_Email_Catalog_v1.md~~ | — | — | — | **Movida a spec** | Reclasificada como documento de referencia → `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md` |
| 27 | [CODEX_TASK_Portal_View_Surface_Consolidation.md](to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md) | P3 | Medio | Medio | Parcial | Consolidación UX transversal de shells, vistas y navegación |
| 28 | ~~CODEX_TASK_Typography_Hierarchy_Fix.md~~ | — | — | — | **Cerrada** | Jerarquía core absorbida en mergedTheme.ts; custom variants `monoId`, `monoAmount`, `kpiValue` para adopción gradual |
| 29 | [CODEX_TASK_Typography_Variant_Adoption_v1.md](to-do/CODEX_TASK_Typography_Variant_Adoption_v1.md) | P3 | Medio | Bajo | Diseño | Migrar 56+ fontWeight/fontFamily hardcodeados a theme variants en 4 slices: redundantes finance, executive cards, monoId/monoAmount, kpiValue |

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
| [CODEX_TASK_Typography_Hierarchy_Fix.md](complete/CODEX_TASK_Typography_Hierarchy_Fix.md) | Jerarquía tipográfica core ya implementada en mergedTheme.ts (DM Sans default, Poppins h1-h6/button/overline). Custom variants `monoId`, `monoAmount`, `kpiValue` en theme para reemplazo gradual de 56+ hardcoded fontWeights |

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

#### Cadena de sinergias cross-module (nuevas)

```
Organization Economics Dashboard ←── Finance Intelligence (foundation)
        │                    │
        ├── consume ← ICO Person 360 Integration (métricas per-person)
        │                    │
        ├── consume ← Projects Account 360 Bridge (delivery per org)
        │                    │
        ├── consume ← Nubox Finance Reconciliation (cobertura DTE)
        │
        └── reactivo ← Outbox Event Expansion (invalidación automática)
                │
                ├──→ Webhook Infrastructure MVP (más eventos para dispatch)
                ├──→ Notification System (eventos para notificar)
                └──→ Data Node v2 (event stream para consumers externos)

ICO Person 360 ──→ Team Identity Capacity v2 (utilización real)
        │
        └──→ Staff Augmentation (eficiencia de placements)

Projects Account 360 ──→ Campaign 360 (resolución Space → Projects)
        │
        └──→ FrameIO Analytics (delivery assets per project per org)

Nubox Finance Reconciliation ──→ Financial Intelligence v2 (analytics enriquecidos)

Finance Dashboard Calculation Correction ←── Invoice Payment Ledger (cash flow preciso)
        │
        ├──→ Organization Economics Dashboard (métricas financieras correctas)
        └──→ Financial Intelligence v2 (trends sobre base contable correcta)
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
| Webhook Infrastructure MVP | Notification System, HR Payroll Attendance/Leave Work Entries, Services Runtime Closure, Greenhouse Data Node v2, **Outbox Event Expansion** |
| Lint Debt Burn Down | Cualquier lane activa que necesite `pnpm lint`, especialmente Webhook Infrastructure, Notification System, Payroll Operational Hardening y módulos compartidos |
| Business Units Canonical | Financial Intelligence v2, Campaign 360, FrameIO Analytics, Services Runtime Closure |
| Campaign 360 | Financial Intelligence v2, FrameIO Analytics |
| Typography Hierarchy Fix | (ninguna — cambio aislado) |
| Typography Variant Adoption | Portal View Surface Consolidation (reduce deuda visual transversal) |
| Greenhouse Home Nexa | (ninguna — superficie aditiva) |
| **Organization Economics Dashboard** | Financial Intelligence v2, Business Units Canonical, Campaign 360, Greenhouse Home Nexa |
| **ICO Person 360 Integration** | Organization Economics Dashboard, Team Identity Capacity v2, Staff Augmentation |
| **Outbox Event Expansion** | Webhook Infrastructure MVP, Organization Economics (invalidación reactiva), Notification System, Data Node v2 |
| **Nubox Finance Reconciliation Bridge** | Organization Economics Dashboard (cobertura DTE), Financial Intelligence v2 |
| **Projects Account 360 Bridge** | Organization Economics Dashboard (delivery per org), Campaign 360 (Space→Projects), FrameIO Analytics |
| **Invoice Payment Ledger Correction** | Nubox Finance Reconciliation Bridge (prerequisito: ledger completo), Organization Economics Dashboard (revenue cobrado vs. facturado), Financial Intelligence v2 (aging, DSO, cash flow), **Finance Dashboard Calculation Correction** (cash flow preciso depende de payments en ledger) |
| **Finance Dashboard Calculation Correction** | Organization Economics Dashboard (métricas financieras correctas), Financial Intelligence v2 (trends sobre base contable correcta), Nubox Finance Reconciliation Bridge (cobertura DTE necesita distinguir facturado de cobrado) |

---

## Regla operativa

- Mantener todas las tasks del sistema dentro de `docs/tasks/` y sus subcarpetas de estado.
- Toda task nueva debe nacer desde `docs/tasks/TASK_TEMPLATE.md` y usar `TASK-###` como ID estable.
- Los briefs vivos del proyecto deben quedar versionados dentro de `docs/tasks/**`; no usar archivos sueltos en raíz como source of truth.
- No asumir que un task está vigente solo por existir; contrastar siempre con `project_context.md`, `Handoff.md` y `changelog.md`.
- Toda task del sistema nueva, reactivada o retomada debe revisarse obligatoriamente contra la arquitectura antes de implementarse.
- Revisión mínima obligatoria para cualquier task del sistema:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- Además de esa base, cada task debe contrastarse con la arquitectura especializada que le corresponda.
  - ejemplos: `FINANCE_CANONICAL_360_V1.md`, `GREENHOUSE_SERVICE_MODULES_V1.md`, `GREENHOUSE_IDENTITY_ACCESS_V1.md`, `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Si una task contradice la arquitectura vigente, no debe ejecutarse tal cual.
  - primero se corrige la task
  - o se documenta explícitamente la nueva decisión arquitectónica antes de implementar
