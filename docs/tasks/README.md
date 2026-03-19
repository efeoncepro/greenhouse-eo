# Codex Tasks

Panel operativo de briefs `CODEX_TASK_*` del repo.

## Estados

- `in-progress`: trabajo activo o parcialmente implementado que sigue abierto.
- `to-do`: brief vigente, alineado o por alinear, pero sin ejecución cerrada en el repo actual.
- `complete`: task cerrada, implementada, absorbida por otra versión o conservada como referencia histórica.

## In Progress

Actualmente sin tasks activas en esta carpeta despues de la auditoria documental del `2026-03-19`.
Las lanes parcialmente implementadas se devolvieron a `to-do` y las realmente cerradas se movieron a `complete`.

## To Do

| Task | Foco |
| --- | --- |
| [CODEX_TASK_Campaign_360.md](to-do/CODEX_TASK_Campaign_360.md) | Modelo canonico de campanas y su capa 360 |
| [CODEX_TASK_Campaign_360_v2.md](to-do/CODEX_TASK_Campaign_360_v2.md) | Baseline canonica de implementacion de Campaign sobre `greenhouse_core` + `ICO Engine` |
| [CODEX_TASK_Business_Units_Canonical.md](to-do/CODEX_TASK_Business_Units_Canonical.md) | Normalización de Business Units y su metadata transversal |
| [CODEX_TASK_Business_Units_Canonical_v2.md](to-do/CODEX_TASK_Business_Units_Canonical_v2.md) | Baseline canonica de implementación de BU como metadata sobre `business_line` existente |
| [CODEX_TASK_Admin_Team_Module_v2.md](to-do/CODEX_TASK_Admin_Team_Module_v2.md) | Escritura de roster y asignaciones para People, con backend base ya sembrado pero UI y cierre todavía abiertos |
| [CODEX_TASK_Creative_Hub_Module_v2.md](to-do/CODEX_TASK_Creative_Hub_Module_v2.md) | Cierre runtime real de Creative Hub sobre Capabilities |
| [CODEX_TASK_Financial_Module_v2.md](to-do/CODEX_TASK_Financial_Module_v2.md) | Cierre backend/runtime de Finance y handoff para frontend |
| [CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md](to-do/CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md) | Corte de Finance operativo a PostgreSQL con slices ya materializados pero migración aún incompleta |
| [CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline.md](to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline.md) | Pipeline analitico de Frame.io para enriquecer Creative Hub e ICO |
| [CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md](to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md) | Baseline canonica de implementacion de Frame.io sobre source sync, delivery e ICO vigentes |
| [CODEX_TASK_Greenhouse_Email_Catalog_v1.md](to-do/CODEX_TASK_Greenhouse_Email_Catalog_v1.md) | Catalogo oficial de emails de Greenhouse mas alla del baseline transaccional |
| [CODEX_TASK_Greenhouse_Home_Nexa.md](to-do/CODEX_TASK_Greenhouse_Home_Nexa.md) | Home conversacional con Nexa como superficie de entrada del portal |
| [CODEX_TASK_Greenhouse_Home_Nexa_v2.md](to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md) | Baseline canonica de implementacion de Home + Nexa sobre `portalHomePath` y el runtime real del portal |
| [CODEX_TASK_HR_Payroll_Module_v3.md](to-do/CODEX_TASK_HR_Payroll_Module_v3.md) | Cierre de gaps runtime y UX del módulo HR Payroll |
| [CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md](to-do/CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md) | Corte de Payroll a PostgreSQL con wiring completo pero pendientes de backfill/cierre |
| [CODEX_TASK_People_Unified_View_v3.md](to-do/CODEX_TASK_People_Unified_View_v3.md) | Cierre 360 de People sobre el runtime actual |
| [CODEX_TASK_Person_360_Profile_Unification_v1.md](to-do/CODEX_TASK_Person_360_Profile_Unification_v1.md) | Perfil único 360 para reconciliar People, Users, CRM Contact y Member |
| [CODEX_TASK_SCIM_User_Provisioning.md](to-do/CODEX_TASK_SCIM_User_Provisioning.md) | Provisioning SCIM desde Entra ID |
| [CODEX_TASK_SCIM_User_Provisioning_v2.md](to-do/CODEX_TASK_SCIM_User_Provisioning_v2.md) | Baseline canonica de implementacion de SCIM sobre `Identity & Access V2` y PostgreSQL |
| [CODEX_TASK_Source_Sync_Runtime_Projections_v1.md](to-do/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md) | Jobs reales de sync para poblar raw/conformed y proyectar CRM/Delivery a PostgreSQL |
| [CODEX_TASK_Staff_Augmentation_Module.md](to-do/CODEX_TASK_Staff_Augmentation_Module.md) | Placements de Staff Augmentation como capa comercial sobre assignments |
| [CODEX_TASK_Staff_Augmentation_Module_v2.md](to-do/CODEX_TASK_Staff_Augmentation_Module_v2.md) | Baseline canonica de implementacion de Staff Augmentation sobre assignments, PostgreSQL y Services |
| [CODEX_TASK_Team_Identity_Capacity_System_v2.md](to-do/CODEX_TASK_Team_Identity_Capacity_System_v2.md) | Identidad canónica ya sembrada y formalización pendiente de capacity |
| [CODEX_TASK_Tenant_Notion_Mapping.md](to-do/CODEX_TASK_Tenant_Notion_Mapping.md) | Convergencia del mapping canonico `Space -> Notion` y corte de `notion_project_ids` |
| [GREENHOUSE_IDENTITY_ACCESS_V2.md](to-do/GREENHOUSE_IDENTITY_ACCESS_V2.md) | Modelo RBAC composable V2: arquitectura objetivo, DDL y cutover Postgres-first todavía no cerrados |
| [CODEX_TASK_Portal_View_Surface_Consolidation.md](to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md) | Consolidación UX de vistas, shells maestras y navegación del portal |
| [CODEX_TASK_Typography_Hierarchy_Fix.md](to-do/CODEX_TASK_Typography_Hierarchy_Fix.md) | Ajuste transversal de jerarquía tipográfica |

## Supporting Specs

| Documento | Rol actual |
| --- | --- |
| [Greenhouse_Account_360_Object_Model_v1.md](to-do/Greenhouse_Account_360_Object_Model_v1.md) | Spec estructural de Organizations, Spaces y convenciones `EO-*` |
| [Greenhouse_Data_Node_Architecture_v1.md](to-do/Greenhouse_Data_Node_Architecture_v1.md) | Estrategia de export, API y MCP para exponer datos del portal |
| [Greenhouse_Data_Node_Architecture_v2.md](to-do/Greenhouse_Data_Node_Architecture_v2.md) | Baseline canonica de implementacion de Data Node sobre runtime actual, PostgreSQL y API externa futura |
| [Greenhouse_ICO_Engine_v1.md](to-do/Greenhouse_ICO_Engine_v1.md) | Spec amplia del motor ICO; conservar como referencia de diseño junto a la arquitectura viva |
| [Greenhouse_Services_Architecture_v1.md](to-do/Greenhouse_Services_Architecture_v1.md) | Spec del objeto `Service` y derivación de capabilities desde servicios activos |

## Complete

| Task | Foco |
| --- | --- |
| [CODEX_TASKS_ALIGNMENT_UPDATE_v1.md](complete/CODEX_TASKS_ALIGNMENT_UPDATE_v1.md) | Alineación histórica de tasks con el repo real |
| [CODEX_TASK_Admin_Landing_Control_Tower_Redesign.md](complete/CODEX_TASK_Admin_Landing_Control_Tower_Redesign.md) | Landing interna y control tower |
| [CODEX_TASK_Admin_Team_Module.md](complete/CODEX_TASK_Admin_Team_Module.md) | Brief histórico de Admin Team reemplazado por v2 |
| [CODEX_TASK_Agency_Operator_Layer.md](complete/CODEX_TASK_Agency_Operator_Layer.md) | Capa agency transversal |
| [CODEX_TASK_AI_Tooling_Credit_System.md](complete/CODEX_TASK_AI_Tooling_Credit_System.md) | Brief histórico de AI Tooling reemplazado por v2 |
| [CODEX_TASK_AI_Tooling_Credit_System_v2.md](complete/CODEX_TASK_AI_Tooling_Credit_System_v2.md) | Foundation backend de AI tooling ya cerrada para el alcance declarado |
| [CODEX_TASK_Client_Dashboard_Redesign.md](complete/CODEX_TASK_Client_Dashboard_Redesign.md) | Rediseño dashboard cliente |
| [CODEX_TASK_Client_Dashboard_Visual_Diagnosis.md](complete/CODEX_TASK_Client_Dashboard_Visual_Diagnosis.md) | Diagnóstico visual del dashboard cliente |
| [CODEX_TASK_Creative_Hub_Module.md](complete/CODEX_TASK_Creative_Hub_Module.md) | Brief histórico de Creative Hub reemplazado por v2 |
| [CODEX_TASK_ETL_ICO_Pipeline_Hardening.md](complete/CODEX_TASK_ETL_ICO_Pipeline_Hardening.md) | Hardening del pipeline `notion-bq-sync -> sync-conformed -> ico-materialize` |
| [CODEX_TASK_Financial_Module.md](complete/CODEX_TASK_Financial_Module.md) | Brief histórico de Finance reemplazado por v2 |
| [CODEX_TASK_Fix_Team_Capacity_Views.md](complete/CODEX_TASK_Fix_Team_Capacity_Views.md) | Ajustes a vistas de capacidad de equipo |
| [CODEX_TASK_Google_SSO_Greenhouse.md](complete/CODEX_TASK_Google_SSO_Greenhouse.md) | Google SSO |
| [CODEX_TASK_HR_Core_Module.md](complete/CODEX_TASK_HR_Core_Module.md) | Brief histórico de HR Core reemplazado por v2 |
| [CODEX_TASK_HR_Core_Module_v2.md](complete/CODEX_TASK_HR_Core_Module_v2.md) | Foundation backend de HR Core ya cerrada para el alcance declarado |
| [CODEX_TASK_HR_Payroll_Module.md](complete/CODEX_TASK_HR_Payroll_Module.md) | Brief histórico de HR Payroll reemplazado por v2 |
| [CODEX_TASK_HR_Payroll_Module_v2.md](complete/CODEX_TASK_HR_Payroll_Module_v2.md) | Brief histórico de HR Payroll absorbido por v3 |
| [CODEX_TASK_Login_Page_Greenhouse.md](complete/CODEX_TASK_Login_Page_Greenhouse.md) | UI de login Greenhouse |
| [CODEX_TASK_Microsoft_SSO_Greenhouse.md](complete/CODEX_TASK_Microsoft_SSO_Greenhouse.md) | Microsoft SSO |
| [CODEX_TASK_People_Unified_View.md](complete/CODEX_TASK_People_Unified_View.md) | Brief histórico de People reemplazado por v2 |
| [CODEX_TASK_People_Unified_View_v2.md](complete/CODEX_TASK_People_Unified_View_v2.md) | Brief histórico de People reemplazado por v3 |
| [CODEX_TASK_Space_Admin_View_Redesign.md](complete/CODEX_TASK_Space_Admin_View_Redesign.md) | Brief histórico de vista admin de space |
| [CODEX_TASK_Team_Identity_Capacity_System.md](complete/CODEX_TASK_Team_Identity_Capacity_System.md) | Brief histórico de Team Identity & Capacity reemplazado por v2 |
| [CODEX_TASK_Tenant_Detail_View_Redesign.md](complete/CODEX_TASK_Tenant_Detail_View_Redesign.md) | Detalle admin de tenant |
| [CODEX_TASK_Transactional_Email_System.md](complete/CODEX_TASK_Transactional_Email_System.md) | Sistema transaccional de email: reset, invitaciones, verificación — Resend + React Email + PostgreSQL |

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
