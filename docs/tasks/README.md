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
| 2 | [CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md](to-do/CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md) | P0 | Muy alto | Medio | Parcial | Subir cobertura de reconciliación y cortar consumers vivos a `person_360` |
| 3 | [GREENHOUSE_IDENTITY_ACCESS_V2.md](to-do/GREENHOUSE_IDENTITY_ACCESS_V2.md) | P0 | Muy alto | Alto | Avanzada | RBAC composable, access model y cierre del cutover `Postgres-first` |
| 4 | [CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md](to-do/CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md) | P0 | Alto | Medio | Avanzada | Cierre del runtime de Finance sobre PostgreSQL antes de seguir ampliando Finance |
| 5 | [CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md](to-do/CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md) | P0 | Alto | Medio | Parcial | Cierre del runtime de Payroll sobre PostgreSQL y salida del doble carril legacy |
| 6 | [CODEX_TASK_Admin_Team_Module_v2.md](to-do/CODEX_TASK_Admin_Team_Module_v2.md) | P1 | Alto | Medio | Parcial | Escritura de roster y asignaciones que aterrizan Team/People en operación real |
| 7 | [CODEX_TASK_People_360_Enrichments_v1.md](to-do/CODEX_TASK_People_360_Enrichments_v1.md) | P1 | Alto | Medio | Parcial | Enrichments cross-module para consolidar `People` como lectura 360 |
| 8 | [CODEX_TASK_Financial_Module_v2.md](to-do/CODEX_TASK_Financial_Module_v2.md) | P1 | Alto | Medio | Avanzada | Cierre funcional de Finance una vez asegurado el runtime migration |
| 9 | [CODEX_TASK_HR_Payroll_Module_v3.md](to-do/CODEX_TASK_HR_Payroll_Module_v3.md) | P1 | Alto | Medio | Avanzada | Cierre funcional y UX de Payroll después del corte runtime |
| 10 | [CODEX_TASK_Creative_Hub_Module_v2.md](to-do/CODEX_TASK_Creative_Hub_Module_v2.md) | P1 | Alto | Alto | Avanzada | Cierre productivo de Creative Hub sobre capabilities y datos operativos reales |
| 11 | [CODEX_TASK_Team_Identity_Capacity_System_v2.md](to-do/CODEX_TASK_Team_Identity_Capacity_System_v2.md) | P1 | Alto | Alto | Parcial | Formalización de capacity y su encaje con People, assignments e identidad canónica |
| 12 | [CODEX_TASK_Greenhouse_Home_Nexa_v2.md](to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md) | P1 | Alto | Medio | Diseño | Nueva entrada `client-first` al portal con `Home` como puerta principal del usuario |
| 13 | [CODEX_TASK_Financial_Intelligence_Layer.md](to-do/CODEX_TASK_Financial_Intelligence_Layer.md) | P2 | Alto | Medio | Parcial | Capa analítica y de unit economics sobre Finance ya parcialmente sembrada |
| 14 | [CODEX_TASK_Business_Units_Canonical_v2.md](to-do/CODEX_TASK_Business_Units_Canonical_v2.md) | P2 | Alto | Medio | Diseño | Metadata canónica para BU comercial vs operativa y analítica futura en Finance/ICO |
| 15 | [CODEX_TASK_Campaign_360_v2.md](to-do/CODEX_TASK_Campaign_360_v2.md) | P2 | Alto | Alto | Diseño | Nuevo objeto canónico de negocio encima de `Space`, `Project` e `ICO Engine` |
| 16 | [CODEX_TASK_SCIM_User_Provisioning_v2.md](to-do/CODEX_TASK_SCIM_User_Provisioning_v2.md) | P2 | Alto | Alto | Diseño | Provisioning enterprise sobre `Identity & Access V2` y PostgreSQL |
| 17 | [CODEX_TASK_Staff_Augmentation_Module_v2.md](to-do/CODEX_TASK_Staff_Augmentation_Module_v2.md) | P2 | Alto | Alto | Diseño | Placements de staff aug sobre assignments, people y services |
| 18 | [CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md](to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md) | P2 | Medio | Alto | Diseño | Enrichment de delivery e ICO con metadata de Frame.io para Creative Hub |
| 19 | [CODEX_TASK_Greenhouse_Email_Catalog_v1.md](to-do/CODEX_TASK_Greenhouse_Email_Catalog_v1.md) | P2 | Medio | Medio | Diseño | Extensión del baseline transaccional hacia digests, seguridad y alerts de producto |
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
| [CODEX_TASK_People_Unified_View_v3.md](complete/CODEX_TASK_People_Unified_View_v3.md) | Surface fundacional de People ya cerrada; follow-up vivo solo para enrichments 360 |
| [CODEX_TASK_Person_360_Profile_Unification_v1.md](complete/CODEX_TASK_Person_360_Profile_Unification_v1.md) | Backbone y serving fundacional de Person 360 ya cerrados; follow-up vivo solo para coverage y consumer cutover |
| [CODEX_TASK_Space_Admin_View_Redesign.md](complete/CODEX_TASK_Space_Admin_View_Redesign.md) | Brief histórico de vista admin de space |
| [CODEX_TASK_Source_Sync_Runtime_Projections_v1.md](complete/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md) | Lane fundacional de raw/conformed/proyecciones runtime ya materializada con datos reales |
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
