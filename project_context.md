# project_context.md

## Resumen
Proyecto base de Greenhouse construido sobre el starter kit de Vuexy para Next.js con TypeScript, App Router y MUI. El objetivo no es mantener el producto como template, sino usarlo como base operativa para evolucionarlo hacia el portal Greenhouse.

## Delta 2026-03-15 Source sync foundation materialized
- Se ejecutó el primer slice técnico del blueprint de sync externo sobre PostgreSQL y BigQuery.
- Scripts nuevos agregados:
  - `pnpm setup:postgres:source-sync`
  - `pnpm setup:bigquery:source-sync`
- En PostgreSQL (`greenhouse-pg-dev / greenhouse_app`) quedaron materializados:
  - schemas:
    - `greenhouse_crm`
    - `greenhouse_delivery`
  - tablas de control:
    - `greenhouse_sync.source_sync_runs`
    - `greenhouse_sync.source_sync_watermarks`
    - `greenhouse_sync.source_sync_failures`
  - tablas de proyección inicial:
    - `greenhouse_crm.companies`
    - `greenhouse_crm.deals`
    - `greenhouse_delivery.projects`
    - `greenhouse_delivery.sprints`
    - `greenhouse_delivery.tasks`
- En BigQuery (`efeonce-group`) quedaron materializados:
  - datasets:
    - `greenhouse_raw`
    - `greenhouse_conformed`
    - `greenhouse_marts`
  - raw snapshots:
    - `notion_projects_snapshots`
    - `notion_tasks_snapshots`
    - `notion_sprints_snapshots`
    - `notion_people_snapshots`
    - `notion_databases_snapshots`
    - `hubspot_companies_snapshots`
    - `hubspot_deals_snapshots`
    - `hubspot_contacts_snapshots`
    - `hubspot_owners_snapshots`
    - `hubspot_line_items_snapshots`
  - conformed current-state tables:
    - `delivery_projects`
    - `delivery_tasks`
    - `delivery_sprints`
    - `crm_companies`
    - `crm_deals`
- Regla operativa derivada:
  - el siguiente paso ya no es “crear estructura”, sino construir jobs de ingestión/backfill que llenen `raw`, materialicen `conformed` y proyecten `greenhouse_crm` / `greenhouse_delivery`

## Delta 2026-03-15 External source sync blueprint
- Se agregó `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` para formalizar cómo Greenhouse debe desacoplar cálculos y runtime de `Notion` y `HubSpot`.
- Dirección operativa definida:
  - `Notion` y `HubSpot` quedan como `source systems`
  - `BigQuery raw` guarda el backup inmutable y replayable
  - `BigQuery conformed` normaliza entidades externas
  - `PostgreSQL` recibe solo proyecciones runtime-críticas para cálculos y pantallas operativas
  - `BigQuery marts` mantiene analítica, 360 e histórico
- Datasets y schemas objetivo explícitos:
  - BigQuery:
    - `greenhouse_raw`
    - `greenhouse_conformed`
    - `greenhouse_marts`
  - PostgreSQL:
    - `greenhouse_crm`
    - `greenhouse_delivery`
    - `greenhouse_sync.source_sync_runs`
    - `greenhouse_sync.source_sync_watermarks`
    - `greenhouse_sync.source_sync_failures`
- Regla operativa derivada:
  - ningún cálculo crítico del portal debe seguir leyendo APIs live de `Notion` o `HubSpot` en request-time
  - el raw externo se respalda en BigQuery y el subset operativo se sirve desde PostgreSQL

## Delta 2026-03-15 HR leave preview rollout hardening
- El cutover de `HR > Permisos` a PostgreSQL en `Preview` quedó endurecido con fallback operativo a BigQuery para evitar que la vista completa falle si Cloud SQL no está disponible.
- El slice de `leave` ahora puede caer controladamente al path legacy para:
  - metadata
  - balances
  - requests
  - create/review
- Regla operativa derivada:
  - una rama `Preview` que use Cloud SQL connector debe tener el service account de `GOOGLE_APPLICATION_CREDENTIALS_JSON` con `roles/cloudsql.client`
  - sin ese rol, el error esperable es `cloudsql.instances.get` / `boss::NOT_AUTHORIZED`
- Este fallback no cambia la dirección arquitectónica:
  - PostgreSQL sigue siendo el store objetivo del dominio
  - BigQuery queda como red de seguridad temporal mientras se estabiliza el rollout por ambiente

## Delta 2026-03-15 HR leave runtime cutover to PostgreSQL
- `HR > Permisos` se convirtió en el primer dominio operativo del portal que ya usa PostgreSQL en runtime sobre la instancia `greenhouse-pg-dev`.
- Se agregó el dominio `greenhouse_hr` en Cloud SQL con:
  - `leave_types`
  - `leave_balances`
  - `leave_requests`
  - `leave_request_actions`
- El slice migrado ahora resuelve identidad desde el backbone canónico:
  - `greenhouse_core.client_users`
  - `greenhouse_core.members`
- Rutas que ahora prefieren PostgreSQL cuando el ambiente está configurado:
  - `GET /api/hr/core/meta`
  - `GET /api/hr/core/leave/balances`
  - `GET /api/hr/core/leave/requests`
  - `GET /api/hr/core/leave/requests/[requestId]`
  - `POST /api/hr/core/leave/requests`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
- El resto de `HR Core` dejó de ejecutar `DDL` en request-time:
  - `ensureHrCoreInfrastructure()` queda como bootstrap explícito
  - runtime usa `assertHrCoreInfrastructureReady()` como validación no mutante
- Provisioning ejecutado en datos:
  - bootstrap único de `greenhouse_hr` en Cloud SQL
  - bootstrap único de `scripts/setup-hr-core-tables.sql` en BigQuery para dejar `HR Core` listo fuera del request path
- Infra compartida:
  - `src/lib/google-credentials.ts` centraliza las credenciales GCP para BigQuery, Cloud SQL connector y media storage
- Configuración Preview:
  - la rama `fix/codex-operational-finance` ya tiene env vars de PostgreSQL en Vercel Preview para este corte
- Boundary vigente:
  - sólo `HR > Permisos` quedó cortado a PostgreSQL
  - `departamentos`, `member profile` y `attendance` siguen en BigQuery, pero ya sin bootstraps mutantes en navegación normal

## Delta 2026-03-15 Data platform architecture and Cloud SQL foundation
- Se agregó la arquitectura de datos objetivo en:
  - `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- La dirección formal del stack queda declarada como:
  - `PostgreSQL` para `OLTP` y workflows mutables
  - `BigQuery` para `raw`, `conformed`, `core analytics` y `marts`
- Se provisionó la primera base operacional de referencia en Google Cloud:
  - proyecto: `efeonce-group`
  - instancia Cloud SQL: `greenhouse-pg-dev`
  - motor: `POSTGRES_16`
  - región: `us-east4`
  - tier: `db-custom-1-3840`
  - storage: `20 GB SSD`
  - base inicial: `greenhouse_app`
  - usuario inicial: `greenhouse_app`
- Secretos creados en Secret Manager:
  - `greenhouse-pg-dev-postgres-password`
  - `greenhouse-pg-dev-app-password`
- Boundary vigente:
  - la app todavía no está conectada a Postgres en runtime
  - esta pasada deja lista la fundación de infraestructura y el backbone canónico 360, no el cutover runtime
  - la integración de aplicación debe hacerse vía repository/services, no con rewrites directos módulo por módulo contra Cloud SQL
- Materialización ejecutada sobre la instancia:
  - esquemas:
    - `greenhouse_core`
    - `greenhouse_serving`
    - `greenhouse_sync`
  - vistas 360:
    - `client_360`
    - `member_360`
    - `provider_360`
    - `user_360`
    - `client_capability_360`
  - tabla de publicación:
    - `greenhouse_sync.outbox_events`
- Scripts operativos agregados:
  - `pnpm setup:postgres:canonical-360`
  - `pnpm backfill:postgres:canonical-360`
- Backfill inicial ejecutado desde BigQuery hacia Postgres:
  - `clients`: `11`
  - `identity_profiles`: `9`
  - `identity_profile_source_links`: `29`
  - `client_users`: `39`
  - `members`: `7`
  - `providers`: `8` canónicos sobre `11` filas origen, por deduplicación real de `provider_id`
  - `service_modules`: `9`
  - `client_service_modules`: `30`
  - `roles`: `8`
  - `user_role_assignments`: `40`
- Variables nuevas documentadas:
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
  - `GREENHOUSE_POSTGRES_IP_TYPE`
  - `GREENHOUSE_POSTGRES_HOST`
  - `GREENHOUSE_POSTGRES_PORT`
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD`
  - `GREENHOUSE_POSTGRES_MAX_CONNECTIONS`
  - `GREENHOUSE_POSTGRES_SSL`
  - `GREENHOUSE_BIGQUERY_DATASET`
  - `GREENHOUSE_BIGQUERY_LOCATION`

## Delta 2026-03-15 Finance exchange-rate sync persistence
- `Finance` ahora tiene hidratación automática server-side de `USD/CLP` para evitar que ingresos/egresos en USD dependan de carga manual previa.
- Proveedores activos para tipo de cambio:
  - primario: `mindicador.cl`
  - fallback: `open.er-api.com`
- Superficie backend agregada:
  - `POST /api/finance/exchange-rates/sync`
    - uso interno autenticado por sesión `finance_manager`
    - también admite acceso interno por cron
  - `GET /api/finance/exchange-rates/sync`
    - pensado para `Vercel Cron`
  - `GET /api/finance/exchange-rates/latest`
    - ahora intenta hidratar y persistir si no existe ninguna tasa `USD -> CLP` almacenada
- Persistencia operativa:
  - se guardan ambos pares por fecha:
    - `USD -> CLP`
    - `CLP -> USD`
  - la tabla sigue siendo `greenhouse.fin_exchange_rates`
  - el `rate_id` sigue siendo determinístico: `${fromCurrency}_${toCurrency}_${rateDate}`
- Ajuste de runtime:
  - `resolveExchangeRateToClp()` ahora puede auto-hidratar `USD/CLP` antes de fallar cuando no encuentra snapshot almacenado
- Deploy/configuración:
  - se agregó `vercel.json` con cron diario hacia `/api/finance/exchange-rates/sync`
  - nueva variable opcional: `CRON_SECRET`
- Regla operativa derivada:
  - frontend no debe intentar resolver tipo de cambio desde cliente ni depender de input manual cuando el backend ya puede hidratar la tasa del día

## Delta 2026-03-14 Portal surface consolidation task
- Se documentó una task `to-do` específica para consolidación UX y arquitectura de surfaces del portal:
  - `docs/tasks/to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md`
- La task no propone cambios de código inmediatos.
- Su objetivo es resolver con criterio explícito:
  - qué vistas son troncales
  - qué vistas se unifican
  - qué vistas se enriquecen
  - qué vistas deben pasar a tabs, drilldowns o redirects
- Regla operativa derivada:
  - no seguir abriendo rutas nuevas por módulo sin revisar antes esta consolidación de surfaces

## Delta 2026-03-14 People + Team capacity backend complements
- `People v3` y `Team Identity & Capacity v2` ya no dependen solo de contratos mínimos heredados.
- Complementos backend activos:
  - `GET /api/people/meta`
  - `GET /api/people` ahora también devuelve `filters`
  - `GET /api/people/[memberId]` ahora puede devolver `capacity` y `financeSummary`
  - `GET /api/team/capacity` ahora devuelve semántica explícita de capacidad por miembro y por rol
- Regla operativa derivada:
  - frontend no debe inferir salud de capacidad desde `FTE` o `activeAssets` si el backend ya devuelve `capacityHealth`
  - frontend de `People` debe usar `meta`, `capacity` y `financeSummary` como contratos canónicos de lectura 360

## Delta 2026-03-14 Team Identity & People task reclassification
- `Team Identity & Capacity` y `People Unified View v2` fueron contrastadas explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `FINANCE_CANONICAL_360_V1.md` en el caso de `People`
- Resultado operativo:
  - `People` sí está alineado con arquitectura y sí existe como módulo real
  - `People v2` ya debe tratarse como brief histórico porque el runtime avanzó más allá de su contexto original
  - `Team Identity & Capacity` sí cerró la base canónica de identidad sobre `team_members.member_id`
  - la parte de capacidad no debe tratarse todavía como cerrada
- Regla operativa derivada:
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md` queda como brief histórico
  - `docs/tasks/in-progress/CODEX_TASK_People_Unified_View_v3.md` pasa a ser la task vigente para cierre 360 del colaborador
  - `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` queda como brief histórico/fundacional
  - `docs/tasks/in-progress/CODEX_TASK_Team_Identity_Capacity_System_v2.md` pasa a ser la task vigente para formalización de capacity

## Delta 2026-03-14 Creative Hub task reclassification
- `Creative Hub` fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_SERVICE_MODULES_V1.md`
  - `Greenhouse_Capabilities_Architecture_v1.md`
- Resultado operativo:
  - el módulo sí está alineado estructuralmente con arquitectura
  - `Creative Hub` sigue siendo una capability surface, no un objeto canónico nuevo
  - el cliente canónico sigue anclado a `greenhouse.clients.client_id`
  - el brief original no debe tratarse como completamente implementado
- Gaps detectados en runtime:
  - activación demasiado amplia del módulo por `businessLine = globe`
  - ausencia real de la capa `Brand Intelligence`
  - `CSC Pipeline Tracker` soportado hoy con heurísticas, no con un modelo explícito de `fase_csc`
- Regla operativa derivada:
  - `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md` queda como brief histórico
  - `docs/tasks/in-progress/CODEX_TASK_Creative_Hub_Module_v2.md` pasa a ser la task vigente para cierre runtime

## Delta 2026-03-14 Creative Hub backend runtime closure
- `Creative Hub v2` ya no depende solo del snapshot genérico de `Capabilities`; ahora tiene backend propio de enriquecimiento creativo para cerrar los gaps detectados.
- Complementos backend agregados:
  - `resolveCapabilityModules()` ahora exige match de `business line` y `service module` cuando ambos requisitos existen
  - `creative-hub` ya soporta activación por:
    - `agencia_creativa`
    - `produccion_audiovisual`
    - `social_media_content`
  - `src/lib/capability-queries/creative-hub-runtime.ts` agrega snapshot detallado de tareas con:
    - fase CSC explícita o derivada
    - aging real
    - FTR/RpA reales cuando existen columnas soporte
- Superficie runtime cerrada para frontend:
  - `GET /api/capabilities/creative-hub/data` ahora devuelve también:
    - sección `Brand Intelligence`
    - pipeline CSC por fase real
    - stuck assets calculados por tarea/fase
- Boundary vigente:
  - `Creative Hub` sigue siendo capability surface dentro de `Capabilities`
  - no crea objeto canónico paralelo de capability, asset o proyecto

## Delta 2026-03-14 HR core backend foundation
- `HR Core Module` fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Resultado operativo:
  - `Collaborator` sigue anclado a `greenhouse.team_members.member_id`
  - `Admin Team` mantiene ownership del roster base
  - `People` sigue siendo la vista read-first del colaborador
  - `HR Core` queda como capa de extensión para estructura org, perfil HR, permisos, asistencia y acciones de aprobación
- Infraestructura backend agregada:
  - `ensureHrCoreInfrastructure()` extiende `team_members` con:
    - `department_id`
    - `reports_to`
    - `job_level`
    - `hire_date`
    - `contract_end_date`
    - `daily_required`
  - crea:
    - `greenhouse.departments`
    - `greenhouse.member_profiles`
    - `greenhouse.leave_types`
    - `greenhouse.leave_balances`
    - `greenhouse.leave_requests`
    - `greenhouse.leave_request_actions`
    - `greenhouse.attendance_daily`
  - seed del rol `employee` con `route_group_scope = ['internal', 'employee']`
- Superficie backend activa:
  - `GET /api/hr/core/meta`
  - `GET/POST /api/hr/core/departments`
  - `GET/PATCH /api/hr/core/departments/[departmentId]`
  - `GET/PATCH /api/hr/core/members/[memberId]/profile`
  - `GET /api/hr/core/leave/balances`
  - `GET/POST /api/hr/core/leave/requests`
  - `GET /api/hr/core/leave/requests/[requestId]`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
  - `GET /api/hr/core/attendance`
  - `POST /api/hr/core/attendance/webhook/teams`
- Ajuste de identidad/acceso:
  - `tenant/access.ts` y `tenant/authorization.ts` ya reconocen `employee` como route group válido
- Variable nueva:
  - `HR_CORE_TEAMS_WEBHOOK_SECRET` para proteger la ingesta externa de asistencia

## Delta 2026-03-14 AI tooling backend foundation
- `AI Tooling & Credit System` fue contrastada explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `FINANCE_CANONICAL_360_V1.md`
- Resultado operativo:
  - la task sí quedó alineada con arquitectura
  - `greenhouse.clients.client_id` sigue siendo el ancla canónica de cliente para wallets y ledger
  - `greenhouse.team_members.member_id` sigue siendo el ancla canónica de colaborador para licencias y consumos atribuibles
  - `greenhouse.providers.provider_id` ya existe en runtime como registro reusable de vendor/plataforma
  - `ai_tool_catalog`, `member_tool_licenses`, `ai_credit_wallets` y `ai_credit_ledger` quedan como tablas de dominio, no como identidades paralelas
- Infraestructura backend agregada:
  - `ensureAiToolingInfrastructure()` crea on-demand:
    - `greenhouse.providers`
    - `greenhouse.ai_tool_catalog`
    - `greenhouse.member_tool_licenses`
    - `greenhouse.ai_credit_wallets`
    - `greenhouse.ai_credit_ledger`
  - `scripts/setup-ai-tooling-tables.sql` queda como referencia SQL versionada del mismo bootstrap
- Superficie backend activa:
  - operación:
    - `GET /api/ai-tools/catalog`
    - `GET /api/ai-tools/licenses`
  - créditos:
    - `GET /api/ai-credits/wallets`
    - `GET /api/ai-credits/ledger`
    - `GET /api/ai-credits/summary`
    - `POST /api/ai-credits/consume`
    - `POST /api/ai-credits/reload`
  - admin:
    - `GET /api/admin/ai-tools/meta`
    - `GET/POST /api/admin/ai-tools/catalog`
    - `GET/PATCH /api/admin/ai-tools/catalog/[toolId]`
    - `GET/POST /api/admin/ai-tools/licenses`
    - `GET/PATCH /api/admin/ai-tools/licenses/[licenseId]`
    - `GET/POST /api/admin/ai-tools/wallets`
    - `GET/PATCH /api/admin/ai-tools/wallets/[walletId]`
- Regla operativa derivada:
  - frontend de AI Tooling no debe inventar catálogo, providers, enums ni balance derivado si el backend ya entrega esos contratos

## Delta 2026-03-14 Admin team backend complements
- `Admin Team Module v2` fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Resultado operativo:
  - la task sigue alineada con arquitectura
  - `Admin Team` mantiene ownership de las mutaciones de roster y asignaciones
  - `People` sigue siendo read-first y no incorpora writes
  - `team_members.member_id` sigue siendo el ancla canónica del colaborador
- Complementos backend agregados para cerrar mejor el módulo:
  - `GET /api/admin/team/members` ahora devuelve metadata + `members` + `summary`
  - `GET /api/admin/team/members/[memberId]`
  - `GET /api/admin/team/assignments`
  - `GET /api/admin/team/assignments/[assignmentId]`
- Ajuste de alineación con identidad:
  - `Admin Team` puede seguir guardando snapshots útiles en `team_members`
  - cuando el colaborador ya tiene `identity_profile_id`, el backend ahora sincroniza best-effort `azureOid`, `notionUserId` y `hubspotOwnerId` hacia `greenhouse.identity_profile_source_links`

## Delta 2026-03-14 HR payroll v3 backend complements
- `HR Payroll v3` ya fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- Resultado operativo:
  - la `v3` sí está alineada con arquitectura
  - `Payroll` sigue owning `compensation_versions`, `payroll_periods` y `payroll_entries`
  - el colaborador sigue anclado a `greenhouse.team_members.member_id`
  - no se movieron writes hacia `People` ni `Admin`
- Complementos backend agregados para desbloquear frontend:
  - `GET /api/hr/payroll/compensation` ahora devuelve `compensations`, `eligibleMembers`, `members` y `summary`
  - `GET /api/hr/payroll/compensation/eligible-members`
  - `GET /api/hr/payroll/periods` ahora devuelve `periods` + `summary`
  - `GET /api/hr/payroll/periods/[periodId]/entries` ahora devuelve `entries` + `summary`
  - `GET /api/hr/payroll/members/[memberId]/history` ahora incluye `member` además de `entries` y `compensationHistory`
- Regla operativa derivada:
  - frontend de `HR Payroll` debe consumir estos contratos como source of truth y no recomputar discovery de colaboradores o KPIs agregados si el backend ya los expone

## Delta 2026-03-14 Finance backend runtime closure
- `Finance` ya no debe tratarse solo como dashboard + CRUD parcial; ahora también expone una capa backend de soporte operativo para que frontend cierre conciliación y egresos especializados sin inventar contratos.
- Superficie backend agregada o endurecida:
  - `GET /api/finance/reconciliation/[id]/candidates`
  - `POST /api/finance/reconciliation/[id]/exclude`
  - `GET /api/finance/expenses/meta`
  - `GET /api/finance/expenses/payroll-candidates`
  - `POST /api/finance/expenses` ahora también acepta campos especializados de previsión, impuestos y varios
- Regla operativa vigente:
  - conciliación sigue siendo ownership de `Finance`; los writes siguen viviendo en `fin_reconciliation_periods`, `fin_bank_statement_rows`, `fin_income` y `fin_expenses`
  - la integración con `Payroll` sigue siendo read-only desde `Finance`; la nueva superficie de payroll candidates no convierte a `Finance` en source of truth de nómina
  - los contratos nuevos siguen anclados a `client_id` y `member_id` cuando corresponde
- Ajuste de consistencia relevante:
  - `auto-match`, `match`, `unmatch` y `exclude` ya no pueden dejar desacoplado el estado entre la fila bancaria y la transacción financiera reconciliada

## Delta 2026-03-14 Task board reorganization
- `docs/tasks/` ya no debe leerse como una carpeta plana de briefs.
- Regla operativa nueva:
  - las `CODEX_TASK_*` se ordenan en paneles `in-progress`, `to-do` y `complete`
  - `docs/tasks/README.md` es la vista maestra del board y la única entrada obligatoria para entender estado vigente de tasks
  - `complete` puede incluir tasks implementadas, absorbidas por una v2 o mantenidas como referencia histórica cerrada
- Regla de versionado nueva:
  - los briefs `CODEX_TASK_*` vigentes del proyecto deben vivir dentro de `docs/tasks/**`
  - el patrón ignorado `CODEX_TASK_*.md` ya no debe ocultar los documentos bajo `docs/tasks/`; queda reservado solo para scratch local en raíz
- Restricción operativa nueva:
  - mover una task entre paneles requiere contraste con repo real + `project_context.md` + `Handoff.md` + `changelog.md`, no solo intuición

## Delta 2026-03-14 Provider canonical object alignment
- La arquitectura 360 ya no debe tratar `provider`, `vendor` o `supplier` como conceptos intercambiables.
- Regla operativa nueva:
  - `Provider` pasa a reconocerse como objeto canónico objetivo para vendors/plataformas reutilizables entre AI Tooling, Finance, Identity y Admin
  - ancla recomendada: `greenhouse.providers.provider_id`
  - `fin_suppliers` debe tratarse como extensión financiera del Provider, no como identidad global del vendor
  - `vendor` libre puede existir como snapshot/display label, pero no como relación primaria cuando el vínculo de proveedor sea reusable entre módulos
- Impacto inmediato en diseño:
  - la task de `AI Tooling & Credit System` debe relacionar `ai_tool_catalog` con `provider_id`
  - futuras relaciones de licencias, wallets, costos y mapeos de identidad deben resolver contra `provider_id` cuando aplique

## Delta 2026-03-14 Greenhouse 360 object model
- El repo ahora formaliza una regla de arquitectura transversal: Greenhouse debe evolucionar como plataforma de `objetos canónicos enriquecidos`, no como módulos con identidades paralelas por silo.
- Documento canónico nuevo:
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- Regla operativa vigente:
  - si un módulo describe un objeto ya existente en Greenhouse, debe anclarse a su ID canónico
  - las tablas de dominio pueden existir, pero como `extension tables`, `transaction tables` o `event tables`, no como nuevos maestros del mismo objeto
  - las vistas 360 deben salir de read models enriquecidos sobre objetos compartidos
- Catálogo canónico actual explicitado:
  - `Cliente` → `greenhouse.clients.client_id`
  - `Colaborador` → `greenhouse.team_members.member_id`
  - `Producto/Capability` → `greenhouse.service_modules.module_id`
  - `Cotización`, `Proyecto` y `Sprint` quedan definidos como objetos canónicos objetivo aunque todavía necesiten mayor formalización de identidad en runtime

## Delta 2026-03-14 Finance canonical backend phase
- El módulo `Finance` mantiene sus tablas `fin_*` como capa transaccional propia, pero ya no debe modelarse como silo aislado:
  - `greenhouse.clients.client_id` queda como llave canónica de cliente
  - `greenhouse.team_members.member_id` queda como llave canónica de colaborador
  - `fin_client_profiles` actúa como extensión financiera del tenant, no como identidad primaria paralela
- Regla operativa vigente del backend financiero:
  - nuevas escrituras deben resolver referencias por `clientId` cuando sea posible
  - durante la transición se aceptan `clientProfileId` y `hubspotCompanyId`, pero el backend valida consistencia y responde `409` ante referencias incompatibles
  - egresos que vengan con `payrollEntryId` deben resolverse a `memberId` server-side
- Superficie backend relevante agregada o endurecida:
  - `src/lib/finance/canonical.ts` centraliza resolución cliente/persona
  - `GET /api/people/[memberId]/finance` agrega lectura financiera read-only para People sin introducir writes bajo `/api/people/*`
- Boundary de arquitectura:
  - `Finance` sigue owning cuentas, proveedores, tipos de cambio y conciliación
  - las vistas 360 deben salir de read-models enriquecidos, no de convertir `fin_*` en source of truth para roster o tenants

## Delta 2026-03-14 Admin team backend foundation
- El repo ya tiene la primera capa backend de escritura para `Admin Team Module v2` sobre rama de trabajo dedicada:
  - `src/lib/team-admin/mutate-team.ts`
  - `/api/admin/team/meta`
  - `/api/admin/team/members`
  - `/api/admin/team/members/[memberId]`
  - `/api/admin/team/members/[memberId]/deactivate`
  - `/api/admin/team/assignments`
  - `/api/admin/team/assignments/[assignmentId]`
- Regla operativa vigente:
  - `Admin Team` es la única capa de mutación de roster/asignaciones
  - `People` sigue siendo read-first y no debe incorporar writes bajo `/api/people/*`
  - todas las mutaciones nuevas se protegen con `requireAdminTenantContext()` y quedan reservadas a `efeonce_admin`
- Boundary de coordinación vigente:
  - Codex implementa backend de `Admin Team`
  - Claude implementa frontend de `Admin Team`
  - Claude puede avanzar en paralelo una vez exista el `mutation contract freeze` mínimo
- Ajuste de contrato para frontend:
  - `GET /api/admin/team/meta` expone metadata para drawers admin (`activeClients`, `roleCategories`, `contactChannels`)
  - `GET /api/admin/team/members` se mantiene como capability handshake compatible con la task para habilitar CTAs admin sin depender de `404/405`

## Delta 2026-03-14 People unified frontend
- Frontend completo de `People Unified View v2` implementado sobre los contratos backend:
  - `/people` → `PeopleList.tsx` (stats + filtros + tabla TanStack)
  - `/people/[memberId]` → `PersonView.tsx` (2 columnas: sidebar + tabs)
- Tabs dinamicos segun `detail.access.visibleTabs` del backend:
  - Asignaciones (read-only, ghost slot para futuro CRUD)
  - Actividad (3 KPI cards + breakdown por proyecto)
  - Compensacion (desglose vigente con seccion Chile condicional)
  - Nomina (chart ApexCharts + tabla detalle por periodo)
- Sidebar "Equipo > Personas" agregado al `VerticalMenu.tsx`:
  - visibilidad por `roleCodes`, no por route group
  - posicion: despues de Agencia, antes de HR
- Componentes reutilizables nuevos:
  - `CountryFlag.tsx` (banderas emoji por ISO alpha-2)
  - `IntegrationStatus.tsx` (check verde/gris por provider)
- La carpeta `views/greenhouse/people/drawers/` queda reservada para Admin Team Module (CRUD)

## Delta 2026-03-14 People unified backend foundation
- El repo ya tiene una primera capa backend read-only para `People Unified View`:
  - `GET /api/people`
  - `GET /api/people/[memberId]`
  - `src/lib/people/get-people-list.ts`
  - `src/lib/people/get-person-detail.ts`
  - `src/lib/people/get-person-operational-metrics.ts`
  - `src/types/people.ts`
- Regla operativa de acceso vigente:
  - `People` no introduce route group `people`
  - el backend valida `internal` y restringe por roles reales:
    - `efeonce_admin`
    - `efeonce_operations`
    - `hr_payroll`
- Regla operativa de arquitectura:
  - `People` es lectura consolidada, no CRUD
  - no se deben introducir writes bajo `/api/people/*`
  - el futuro `Admin Team Module` debe vivir bajo `/api/admin/team/*` y reutilizar la misma capa de datos
- Fuentes reales del backend `People`:
  - roster: `greenhouse.team_members`
  - assignments: `greenhouse.client_team_assignments`
  - identidad: `greenhouse.identity_profile_source_links`
  - actividad: `notion_ops.tareas`
  - HR: `greenhouse.compensation_versions` y `greenhouse.payroll_entries`
- Regla de modelado vigente:
  - usar `location_country`, no crear una columna redundante `country`
  - tratar `team_members.identity_profile_id` como identidad canonica de persona
  - tratar `client_users` como principal de acceso, no como ficha laboral
- Estado de integracion actual:
  - ya existen `/people` y `/people/[memberId]` en App Router
  - el sidebar ya expone `Personas`
  - el frontend consume el contrato backend consolidado
  - `pnpm build` ya incluye las dos rutas UI y las dos APIs del modulo
- Regla de acople frontend/backend:
  - el frontend no debe recalcular permisos de tabs desde la session si el backend ya entrega `access.visibleTabs`
  - el sidebar de persona debe usar `summary` del payload, no recomputar FTE u horas desde la tabla

## Delta 2026-03-14 HR payroll backend foundation
- El repo ya tiene una primera capa backend operativa de `HR Payroll` bajo el route group propio `hr`:
  - `src/app/(dashboard)/hr/layout.tsx`
  - `src/app/api/hr/payroll/**`
  - `src/lib/payroll/**`
  - `src/types/payroll.ts`
- La infraestructura de payroll no depende exclusivamente de una migración manual previa:
  - `ensurePayrollInfrastructure()` crea on-demand `greenhouse.compensation_versions`, `greenhouse.payroll_periods`, `greenhouse.payroll_entries` y `greenhouse.payroll_bonus_config`
  - el seed del rol `hr_payroll` también quedó incorporado en runtime y en SQL versionado
- Reglas backend vigentes del módulo:
  - solo períodos `draft` aceptan cambios de `uf_value`, `tax_table_version` o `notes`
  - la aprobación de nómina revalida server-side que los bonos respeten elegibilidad y rangos
  - la creación de `compensation_versions` ya no debe generar solapes de vigencia y distingue entre versiones actuales y futuras usando `effective_from` / `effective_to`
- Estado de validación actual:
  - `pnpm build`: correcto con las rutas `HR Payroll` incluidas
  - la validación runtime contra BigQuery real ya confirmó:
    - schema vivo de `notion_ops.tareas` con `responsables_ids`, `rpa`, `estado`, `last_edited_time`, `fecha_de_completado` y `fecha_límite`
    - bootstrap aplicado de `greenhouse.compensation_versions`, `greenhouse.payroll_periods`, `greenhouse.payroll_entries` y `greenhouse.payroll_bonus_config`
    - seed aplicado del rol `hr_payroll` en `greenhouse.roles`
- Ajuste operativo derivado del smoke real:
  - `fetch-kpis-for-period.ts` ya no debe asumir aliases sin acento como `fecha_limite`; en producción existen columnas acentuadas y deben citarse como identifiers escapados en SQL dinámico
  - el DDL versionado de payroll se endureció para no depender de `DEFAULT` literales en BigQuery, porque el runtime de la app ya setea esos valores explícitamente

## Delta 2026-03-14 GitHub collaboration hygiene
- El repo ahora incorpora una capa explicita de buenas practicas GitHub bajo `.github/`:
  - `workflows/ci.yml`
  - `PULL_REQUEST_TEMPLATE.md`
  - `ISSUE_TEMPLATE/bug_report.yml`
  - `ISSUE_TEMPLATE/feature_request.yml`
  - `ISSUE_TEMPLATE/config.yml`
  - `dependabot.yml`
  - `CODEOWNERS`
- La automatizacion minima esperada del repo queda formalizada:
  - `pnpm lint`
  - `pnpm build`
  - revision semanal de dependencias `npm` y GitHub Actions via Dependabot
- Se agregaron `.github/SECURITY.md` y `.github/SUPPORT.md` como documentos canonicos de reporte y soporte del repositorio.
- Regla operativa nueva:
  - Greenhouse es un repo `private` con licencia comercial declarada en `package.json`
  - no debe agregarse una licencia open source por defecto ni asumir permisos de redistribucion sin decision explicita de Efeonce
- Se removio la contradiccion de `.gitignore` respecto de `full-version/`; aunque siga siendo referencia local, hoy existe versionado en este workspace y no debe tratarse como artefacto ignorado.

## Delta 2026-03-14 Document structure reorganization
- La raiz documental del repo ya no debe usarse para mezclar specs, tasks y guias especializadas.
- Regla operativa vigente:
  - en raiz solo quedan `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `project_context.md`, `Handoff.md`, `Handoff.archive.md` y `changelog.md`
  - la documentacion canónica no operativa ahora vive en `docs/`
- Taxonomia activa:
  - `docs/architecture/`
  - `docs/api/`
  - `docs/ui/`
  - `docs/roadmap/`
  - `docs/operations/`
  - `docs/tasks/`
- `docs/README.md` es el mapa maestro y `docs/tasks/README.md` concentra el board de briefs `CODEX_TASK_*`.
- Estructura viva de tasks:
  - `docs/tasks/in-progress/`
  - `docs/tasks/to-do/`
  - `docs/tasks/complete/`

## Delta 2026-03-14 Agency data hydration correction
- La capa `agency` ya no debe asumir que toda la senal operativa vive solo en `notion_project_ids` ni filtrar `greenhouse.clients` por `tenant_type`.
  - `src/lib/agency/agency-queries.ts` ahora toma `clients.active = TRUE` como base canonica de spaces.
  - El inventario de proyectos agency se arma desde la union de:
    - `greenhouse.clients.notion_project_ids`
    - `greenhouse.user_project_scopes` via `greenhouse.client_users`
- Regla operativa nueva para `/agency/spaces`:
  - si un space tiene poca o nula senal en `notion_ops`, igual debe mostrar contexto util desde Greenhouse (`personas asignadas`, `FTE`, `usuarios`) y no quedar casi vacio.
- Regla operativa nueva para `/agency/capacity`:
  - la lista de capacidad debe reutilizar `TeamAvatar` y no un avatar ad-hoc, para heredar `avatarUrl` real y fallback cromatico consistente con el roster.

## Delta 2026-03-13 Agency operator layer
- El repo ahora tiene una primera capa agency para lectura ejecutiva interna a nivel transversal:
  - `/agency`
  - `/agency/spaces`
  - `/agency/capacity`
- Regla operativa de acceso:
  - hoy no existe un principal dedicado `agency`
  - la surface agency se habilita a usuarios `internal` o `admin` via `requireAgencyTenantContext()`
- La navegacion global ahora puede mostrar una seccion `Agencia` en `VerticalMenu` sin afectar el contrato cliente ni los flows de auth ya activos.
- La data agency sale de BigQuery real y no de mocks:
  - `greenhouse.clients`
  - `greenhouse.client_service_modules`
  - `greenhouse.service_modules`
  - `greenhouse.team_members`
  - `greenhouse.client_team_assignments`
  - `notion_ops.tareas`
  - `notion_ops.proyectos`
- Restriccion actual:
  - `/agency/spaces/[spaceId]` todavia no es una surface agency dedicada; redirige al dashboard del portal con `?space=<id>`
  - si se necesita una lectura agency por space mas profunda, debera implementarse como modulo posterior y no asumirse ya resuelto por esta iteracion

## Delta 2026-03-13 Pulse team view correction
- `Pulse` ya no debe tratar la seccion de equipo como una lectura primaria de capacidad operativa.
  - La surface del dashboard cliente ahora consume roster asignado (`getTeamMembers`) como fuente principal para `Tu equipo asignado`.
  - La columna derecha queda limitada a resumen contractual visible: FTE, horas, linea de servicio y modalidad.
- Regla operativa nueva para `Pulse`:
  - la Vista 1 (`Tu equipo asignado`) es roster-first y no depende de queries de carga operativa para renderizar
  - la Vista 2 (`Capacidad operativa`) queda fuera de la card principal y solo debe aparecer despues como detalle/expandible o en otra ubicacion
- El `view-as` admin del dashboard ahora tambien hidrata esta seccion server-side con roster del tenant para evitar errores por fetch cliente fuera del contexto `client`.

## Delta 2026-03-13 Canonical team identity hardening
- La capa de equipo/capacidad ya no debe tratar `azure_oid`, `notion_user_id` o `hubspot_owner_id` como la identidad canonica.
  - `greenhouse.team_members.identity_profile_id` pasa a ser el enlace canonico de persona para el roster Efeonce.
  - Los providers externos se resuelven y enriquecen desde `greenhouse.identity_profile_source_links`.
- `scripts/setup-team-tables.sql` ahora tambien actua como bootstrap de reconciliacion canonica para el roster de equipo:
  - agrega `identity_profile_id` y `email_aliases` si faltan en `greenhouse.team_members`
  - siembra o actualiza perfiles canonicos usados por el roster
  - siembra source links para `greenhouse_team`, `greenhouse_auth`, `notion`, `hubspot_crm` y `azure_ad`
  - archiva el perfil duplicado de Julio anclado en HubSpot y deja un solo perfil canonico activo para su identidad
- Regla operativa nueva:
  - `greenhouse_team` representa la identidad Greenhouse del roster
  - `identity_profile_source_links` es la capa preparada para sumar futuros providers como `google_workspace`, `deel`, `frame_io` o `adobe` sin redisenar `team_members`
- La lectura runtime de providers en `src/lib/team-queries.ts` ya no debe inferir Microsoft desde `greenhouse_auth`; `greenhouse_auth` es un principal interno, no un provider externo.
- Las 4 surfaces live del task tuvieron una pasada visual adicional con patrones Vuexy compartidos:
  - `Mi Greenhouse` y `Pulse` ya muestran badges de identidad mas robustos
  - `Equipo en este proyecto` y `Velocity por persona` ahora usan `ExecutiveCardShell`, resumenes KPI y cards por persona con mejor jerarquia visual

## Delta 2026-03-13 Team profile taxonomy
- `greenhouse.team_members` ya no modela solo roster operativo; ahora tambien soporta perfil profesional y atributos de identidad laboral:
  - nombre estructurado: `first_name`, `last_name`, `preferred_name`, `legal_name`
  - taxonomia interna: `org_role_id`, `profession_id`, `seniority_level`, `employment_type`
  - contacto y presencia: `phone`, `teams_user_id`, `slack_user_id`
  - ubicacion y contexto: `location_city`, `location_country`, `time_zone`
  - trayectoria: `birth_date`, `years_experience`, `efeonce_start_date`
  - perfil narrativo: `biography`, `languages`
- Se agregaron catalogos nuevos en BigQuery:
  - `greenhouse.team_role_catalog`
  - `greenhouse.team_profession_catalog`
- Regla operativa nueva para talento:
  - `role_title` sigue siendo el cargo visible en la operacion actual
  - `org_role_id` representa el rol interno dentro de Efeonce
  - `profession_id` representa la profesion u oficio reusable para staffing y matching de perfiles
- El runtime cliente de `/api/team/members` ahora deriva ademas:
  - `tenureEfeonceMonths`
  - `tenureClientMonths`
  - `ageYears`
  - `profileCompletenessPercent`
- Se decidio no inventar PII faltante en seed:
  - si ciudad, pais, telefono, edad o experiencia real no estaban confirmados, quedan `NULL`
  - el modelo ya existe y la UI lo expresa como `en configuracion`

## Delta 2026-03-13 Team identity and capacity runtime
- Se implemento una primera capa real del task `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` dentro de este repo:
  - `GET /api/team/members`
  - `GET /api/team/capacity`
  - `GET /api/team/by-project/[projectId]`
  - `GET /api/team/by-sprint/[sprintId]`
  - `scripts/setup-team-tables.sql`
  - componentes cliente para dossier, capacidad, equipo por proyecto y velocity por persona
- La fuente real inspeccionada en BigQuery para `notion_ops.tareas` no expone `responsable_nombre` ni `responsable_email` como columnas directas.
  - El runtime nuevo usa el schema real detectado en `INFORMATION_SCHEMA`:
    - `responsables`
    - `responsables_ids`
    - `responsables_names`
    - `responsable_texto`
  - El match operativo prioriza `notion_user_id` ↔ `responsables_ids[SAFE_OFFSET(0)]`, con fallback a email/nombre.
- `scripts/setup-team-tables.sql` quedo endurecido como bootstrap idempotente via `MERGE` y ya fue aplicado en BigQuery real:
  - `greenhouse.team_members`: `7` filas seed
  - `greenhouse.client_team_assignments`: `10` filas seed
- La validacion local ya corrio con runtime Node real:
  - `pnpm lint`: correcto
  - `pnpm build`: correcto
- El repo externo correcto del pipeline es `notion-bigquery`, no `notion-bq-sync`.
  - Ese repo no existe en este workspace.
  - Desde esta sesion no hubo acceso remoto util a `efeoncepro/notion-bigquery`, por lo que no se modifico ni redeployo la Cloud Function externa.
- El task `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` ya no debe asumirse contra columnas ficticias `responsable_*` en BigQuery.
  - La especificacion se alineo al contrato real verificado en `notion_ops.tareas`:
    - `responsables_names`
    - `responsables_ids`
    - `responsable_texto`
  - Los derivados operativos `responsable_nombre` y `responsable_notion_id` se resuelven en runtime desde esos campos.
- `/settings` ya no depende de `getDashboardOverview()` solo para el roster; consume el endpoint dedicado de equipo.
- `/dashboard` reemplaza la card legacy de capacity por una surface cliente que consume la API dedicada.
- `/proyectos/[id]` ahora incorpora una seccion `Equipo en este proyecto`.
- El repo no tenia `/sprints/[id]`; se habilito una primera ruta para hospedar `Velocity por persona` y enlazarla desde el detalle de proyecto.
- Cierre literal del task en UI:
  - Vista 1 ya no muestra FTE individual por persona
  - Vista 3 ya usa `AvatarGroup` + expandible tabular por persona
  - los semaforos visibles del modulo usan primitives basadas en `GH_COLORS.semaphore`
  - los textos visibles que faltaban en las 4 vistas se movieron a `GH_TEAM` / `GH_MESSAGES`

## Delta 2026-03-13 Preview auth hardening
- `src/lib/bigquery.ts` ahora acepta un fallback opcional `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` para evitar fallos de serializacion de secretos en Preview de Vercel.
- Si una Preview de branch necesita login funcional y el JSON crudo falla por quoting/escaping, la opcion preferida pasa a ser cargar `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` junto con `GCP_PROJECT`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL`.
- El repo ahora versiona una skill local para operaciones Vercel:
  - `.codex/skills/vercel-operations/SKILL.md`
  - cubre CLI, dominios protegidos, `promote`, `rollback`, env vars y el mapa operativo `Preview` / `Staging` / `Production` del proyecto
  - debe usarse como criterio operativo cuando el trabajo requiera verificar previews, dominios custom o promociones entre ambientes
- Regla operativa adicional para previews OAuth:
  - si una branch preview necesita login real, no asumir que hereda los secrets de otra preview
  - cargar un bloque explicito `Preview (<branch>)` con `GCP_PROJECT`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
  - para pruebas humanas de Google SSO, preferir el dominio autorizado `pre-greenhouse.efeoncepro.com` sobre aliases estables de branch si esos aliases no fueron agregados en GCP como redirect URI

## Delta 2026-03-13 Branding lock and nav hydration
- El shell autenticado ahora debe inyectar la sesion inicial al `SessionProvider` para evitar flicker entre menu cliente e interno/admin durante la hidratacion.
- La capa de nomenclatura ya no debe mezclar portal cliente con internal/admin:
  - `GH_CLIENT_NAV` queda reservado para la navegacion cliente normada por `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
  - `GH_INTERNAL_NAV` queda como nomenclatura operativa separada para `/internal/**` y `/admin/**`
- Regla operativa nueva para theming runtime: Greenhouse no debe honrar cookies legacy de `primaryColor`, `skin` o `semiDark` que reintroduzcan branding Vuexy; esas preferencias quedan bloqueadas al baseline Greenhouse y solo se preservan `mode`, `layout` y widths compatibles.
- `src/@core/utils/brandSettings.ts` y `getSettingsFromCookie()` son ahora el boundary de saneamiento para cookies de settings antes de SSR o hidratacion cliente.

## Delta 2026-03-13 Greenhouse nomenclature portal
- Ya existe `src/config/greenhouse-nomenclature.ts` como fuente unica de nomenclatura visible para la capa cliente:
  - `GH_CLIENT_NAV`
  - `GH_LABELS`
  - `GH_TEAM`
  - `GH_MESSAGES`
  - `GH_COLORS`
- `src/config/greenhouse-nomenclature.ts` tambien versiona `GH_INTERNAL_NAV`, pero solo como capa operativa para superficies `internal/admin`; no como parte del contrato del portal cliente definido en `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`.
- La navegacion cliente y las superficies principales `/login`, `/dashboard`, `/proyectos`, `/sprints` y `/settings` ya empezaron a consumir esa capa centralizada en vez de labels hardcodeados.
- El rollout ya no es solo copy-level: la marca Efeonce ahora entra por el wiring oficial del starter kit sin crear un theme paralelo:
  - `src/components/theme/mergedTheme.ts`
  - `src/components/theme/index.tsx`
  - `src/configs/primaryColorConfig.ts`
  - `src/app/layout.tsx`
- `layout.tsx` ahora carga `DM Sans` + `Poppins`, y el sidebar branded queda encapsulado en `src/styles/greenhouse-sidebar.css` con logo negativo para el nav vertical.
- El dashboard cliente activo ahora tambien consume la nomenclatura centralizada en sus componentes secundarios de experiencia:
  - `ClientPortfolioHealthAccordion`
  - `ClientAttentionProjectsAccordion`
  - `ClientEcosystemSection`
  - annotations, tooltips y totals de `chart-options.ts`
- Regla operativa ratificada para theming: Greenhouse no debe reescribir el theme de Vuexy desde cero; cualquier ajuste global de tema debe pasar por `src/components/theme/mergedTheme.ts`, `@core/theme/*` o la configuracion oficial de Vuexy.

## Delta 2026-03-13 Branding SVG rollout
- `public/branding/SVG` pasa a ser la carpeta canonica para isotipos y wordmarks SVG de `Efeonce`, `Globe`, `Reach` y `Wave`.
- `src/components/greenhouse/brand-assets.ts` centraliza el mapping reusable de esos assets para shell, business lines y futuras cards que necesiten logos propios.
- `src/components/layout/shared/Logo.tsx` y `src/app/layout.tsx` ya no deben depender del PNG `avatar.png` como marca primaria; el shell y el favicon salen desde esa capa SVG.
- `src/components/greenhouse/BrandWordmark.tsx` y `src/components/greenhouse/BusinessLineBadge.tsx` son ahora los componentes canonicos para renderizar `Efeonce`, `Globe`, `Reach` y `Wave` en contextos `inline`, footer, hero, tabla o chip sin hardcodes de imagen dispersos.

## Delta 2026-03-13 Tenant and user media persistence
- El runtime ya soporta subir y persistir logos/fotos reales para identidades visibles del portal en lugar de depender solo de iniciales o fallbacks.
- Capa server-side nueva:
  - `src/lib/storage/greenhouse-media.ts` para upload/download autenticado contra GCS
  - `src/lib/admin/media-assets.ts` para leer/escribir `logo_url` y `avatar_url` en BigQuery
- Endpoints internos nuevos:
  - `POST /api/admin/tenants/[id]/logo`
  - `POST /api/admin/users/[id]/avatar`
  - `GET /api/media/tenants/[id]/logo`
  - `GET /api/media/users/[id]/avatar`
- Regla operativa:
  - el bucket por defecto es `${GCP_PROJECT}-greenhouse-media`
  - puede overridearse con `GREENHOUSE_MEDIA_BUCKET`
  - los assets se guardan como `gs://...` en BigQuery y se sirven via proxy autenticado del portal, no via URL publica del bucket
- El uploader UI reusable para admin ahora vive en `src/components/greenhouse/IdentityImageUploader.tsx`.
- `greenhouse.clients` no traia `logo_url` en el DDL base; el runtime agrega la columna on-demand con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS logo_url STRING` antes de persistir logos de tenant.
- La sesion NextAuth ya propaga `avatarUrl`, permitiendo que el dropdown autenticado refleje la foto guardada del usuario.

## Delta 2026-03-13 Promote and deploy closeout
- La iniciativa de alineacion de nomenclatura + branding + media persistente ya quedo promovida a:
  - `develop`
  - `main`
- Estado actual de aliases Vercel confirmado al cierre:
  - `pre-greenhouse.efeoncepro.com` apunta al preview vigente del branch `fix/google-sso-develop-safe`
  - `dev-greenhouse.efeoncepro.com` apunta al deployment de `staging` generado desde `develop`
  - `greenhouse.efeoncepro.com` apunta al deployment productivo generado desde `main`
- Regla operativa ratificada:
  - si `pre-greenhouse` no refleja una rama activa, no asumir fallo de codigo; primero revisar `vercel inspect`, alias asignado y estado del ultimo deployment del branch
  - si Preview falla por duplicados `* (1).ts(x)`, `tsconfig.json` ya los excluye para que el deploy no quede atascado por copias accidentales del workspace

## Delta 2026-03-13 Capabilities runtime foundation
- La spec `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md` ya tiene una primera ejecucion real sobre el runtime actual del repo, sin volver al modelo legacy de resolver capabilities directo desde `greenhouse.clients`.
- El runtime nuevo toma `businessLines` y `serviceModules` desde la sesion tenant-aware actual, que ya deriva de `greenhouse.client_service_modules` + `greenhouse.service_modules`.
- Se agregaron:
  - `GET /api/capabilities/resolve`
  - `GET /api/capabilities/[moduleId]/data`
  - `/capabilities/[moduleId]`
- El sidebar vertical ahora incorpora una seccion dinamica `Servicios` cuando el tenant cliente tiene modules activos en el registry.
- La primera implementacion incluye registry versionado para:
  - `creative-hub`
  - `crm-command-center`
  - `onboarding-center`
  - `web-delivery-lab`
- La data inicial de cada modulo reutiliza el contrato real de `/dashboard` para entregar una lectura ejecutiva coherente mientras los query builders dedicados siguen siendo una fase posterior.
- El admin ahora tiene una vista de validacion autenticada para modules en `/admin/tenants/[id]/capability-preview/[moduleId]`, separada del `view-as/dashboard`.
- La preview admin usa fallback controlado al registry para inspeccionar modules del tenant aunque la resolucion cliente estricta siga dependiendo de `businessLines` y `serviceModules`.
- El smoke operativo de capabilities queda automatizado en `scripts/run-capability-preview-smoke.ps1`, con JWT admin local y capturas Playwright sobre:
  - `/admin/tenants/space-efeonce/view-as/dashboard`
  - `/admin/tenants/space-efeonce/capability-preview/creative-hub`
- `tsconfig.json` ya no incluye validators historicos de `.next-local/build-*`; solo conserva tipos `dev` para evitar que caches viejos rompan `tsc`.
- La capa ahora ya no reutiliza `getDashboardOverview()` para `/capabilities/[moduleId]`; existe `src/lib/capability-queries/*` con query builders dedicados por modulo y snapshot BigQuery cacheada con `unstable_cache`.
- Se agrego `verifyCapabilityModuleAccess()` para centralizar el guard server-side y distinguir `404` de `403` en `/api/capabilities/[moduleId]/data`.
- El registry de capabilities ahora declara `dataSources` por modulo para dejar trazabilidad explicita entre cada surface y sus tablas BigQuery reales.
- `/capabilities/[moduleId]` ya no depende de una composicion hardcodeada; el route renderiza `data.module.cards` via `src/components/capabilities/CapabilityCard.tsx` y `src/components/capabilities/ModuleLayout.tsx`.
- El dispatcher declarativo actual ya no consume arrays globales de modulo; cada tarjeta usa `cardData` por `card.id`, dejando el runtime listo para ampliar el catalogo sin romper los modulos existentes.
- `Creative Hub` ya quedo consolidado como primer modulo mas rico del sistema declarativo, con:
  - `creative-metrics`
  - `creative-review-pipeline`
  - `creative-review-hotspots`
  - `creative-projects`
  - `creative-quality`
- La consolidacion visual de `Creative Hub` ya quedo alineada explicitamente con patrones de `full-version` en vez de una composicion ad hoc:
  - hero adaptado desde la logica de `WebsiteAnalyticsSlider`
  - KPI cards sobre `HorizontalWithSubtitle`
  - quality card compacta tipo `SupportTracker`
  - listas ejecutivas con jerarquia tipo `SourceVisits`
- El dispatcher declarativo actual cubre los card types reales del registry vigente:
  - `metric`
  - `project-list`
  - `tooling-list`
  - `quality-list`
  - `metric-list`
  - `chart-bar`

## Delta 2026-03-12 Internal Control Tower Redesign
- `/internal/dashboard` dejo de ser un hero estatico con lista plana de tenants y ahora funciona como `Control Tower` operativo para el equipo interno Efeonce.
- La landing interna ahora usa:
  - header compacto con subtitulo dinamico y acciones
  - 6 KPI cards con semaforos de activacion, inactividad y OTD global
  - tabla paginada con busqueda, filtros por estado, row actions y prioridad visual para `Requiere atencion`
- `src/lib/internal/get-internal-dashboard-overview.ts` ahora entrega senales adicionales por cliente:
  - `createdAt`
  - `updatedAt`
  - `lastLoginAt`
  - `lastActivityAt`
  - `totalUsers`, `activeUsers`, `invitedUsers`, `pendingResetUsers`
  - `scopedProjects`
  - `avgOnTimePct`
  - arrays de `businessLines` y `serviceModules`
- El rediseño sigue sin introducir mutaciones nuevas: `Crear space`, `Editar` y `Desactivar` quedan como affordances parciales hasta que exista workflow real.

## Delta 2026-03-12 Internal Identity Foundation
- Se agrego `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` como contrato canonico para separar `auth principal` de `canonical identity` en usuarios internos Efeonce.
- La fundacion nueva usa:
  - `EO-USR-*` para el principal de acceso actual
  - `EO-ID-*` para el perfil canonico interno
- Se versiono `bigquery/greenhouse_internal_identity_v1.sql` para crear `identity_profiles`, `identity_profile_source_links` y `client_users.identity_profile_id`.
- Se agrego bootstrap operativo `scripts/backfill-internal-identity-profiles.ts`:
  - descubre candidatos internos por `tenant_type` o rol interno en `client_users`
  - descubre owners internos en `hubspot_crm.owners` por dominio `@efeonce.org` o `@efeoncepro.com`
  - crea perfiles canonicos y source links listos para enlazar Notion o Azure AD despues
- Estado real ejecutado:
  - `2` auth principals internos Greenhouse enlazados
  - `6` HubSpot owners internos sembrados como perfiles canonicos
  - `8` perfiles `EO-ID-*` creados en BigQuery

## Delta 2026-03-13 Google SSO foundation
- El login ahora soporta tres flujos paralelos sobre `greenhouse.client_users`:
  - `credentials`
  - Microsoft Entra ID (`azure-ad` en NextAuth)
  - Google OAuth (`google` en NextAuth)
- `client_users` extiende el contrato de identidad con:
  - `google_sub`
  - `google_email`
- `/login` ahora agrega Google como CTA secundaria debajo de Microsoft y antes del divisor de credenciales.
- `/settings` ahora muestra el estado de vinculo de Microsoft y Google, y permite iniciar cualquiera de los dos enlaces SSO cuando la sesion actual entro por credenciales.
- Infra ya aplicada fuera del repo:
  - `greenhouse.client_users` ya expone `google_sub` y `google_email` en BigQuery real
  - el proyecto `efeonce-group` ya tiene creado el OAuth client `greenhouse-portal`
  - Vercel `greenhouse-eo` ya tiene `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` cargados en `Development`, `staging`, `Production`, `Preview (develop)` y `Preview (feature/google-sso)`
- Regla operativa ratificada para auth:
  - Google SSO, igual que Microsoft SSO, solo vincula principals ya existentes en `greenhouse.client_users`
  - `allowed_email_domains` puede explicar un rechazo o servir de pista de provisioning, pero no auto-crea principals durante login

## Delta 2026-03-12 Microsoft SSO foundation
- El login ahora soporta dos flujos en paralelo sobre `greenhouse.client_users`:
  - `credentials`
  - Microsoft Entra ID (`azure-ad` en NextAuth)
- `client_users` extiende el contrato de identidad con:
  - `microsoft_oid`
  - `microsoft_tenant_id`
  - `microsoft_email`
  - `last_login_provider`
- `/login` prioriza Microsoft SSO como CTA principal y deja email + contrasena como fallback.
- `/settings` ahora muestra el estado de vinculo Microsoft y permite iniciar el enlace SSO cuando la sesion entro por credenciales.
- La ruta publica adicional `/auth/access-denied` cubre el rechazo de usuarios Microsoft sin principal explicito autorizado en Greenhouse.

## Documento Maestro de Arquitectura
- Documento maestro actual: `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Resumen rapido de fases y tareas: `docs/roadmap/PHASE_TASK_MATRIX.md`
- Este documento debe leerse antes de cambiar arquitectura, auth, rutas, roles, multi-tenant, dashboard, team/capacity, campaign intelligence o admin.
- Si un agente necesita trabajar en paralelo con otro, debe tomar su scope desde las fases y actividades definidas en `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`.
- `docs/roadmap/BACKLOG.md` es el resumen operativo del roadmap; `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` es la explicacion completa.
- Documento tecnico de identidad y acceso: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- DDL de identidad y acceso: `bigquery/greenhouse_identity_access_v1.sql`
- Documento tecnico de modulos de servicio: `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- DDL de modulos de servicio: `bigquery/greenhouse_service_modules_v1.sql`
- Bootstrap de modulos de servicio: `bigquery/greenhouse_service_module_bootstrap_v1.sql`
- Metodo canonico de validacion visual: `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- Iniciativa tenant-especifica activa: `docs/ui/SKY_TENANT_EXECUTIVE_SLICE_V1.md`
- Contrato visual ejecutivo reusable: `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`
- Contrato canonico de orquestacion UI: `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- Catalogo curado de patrones Vuexy/MUI: `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- Brief canonico de intake UI: `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- Seed operativo para benchmark interno del dashboard: `bigquery/greenhouse_efeonce_space_v1.sql`
- Plan UX actual para la siguiente iteracion del dashboard: `docs/ui/GREENHOUSE_DASHBOARD_UX_GAPS_V1.md`

## Especificacion Fuente
- Documento fuente actual: `../Greenhouse_Portal_Spec_v1.md`
- Ese markdown define el target funcional del portal y debe usarse como referencia primaria de producto.
- Si existe conflicto entre el estado actual del starter kit y la especificacion, prevalece la especificacion como norte de implementacion salvo decision documentada.

## Alcance del Repositorio
- Este repositorio contiene solo `starter-kit`.
- La carpeta `full-version` existe fuera de este repo como referencia de contexto, referencia visual y referencia funcional.
- `full-version` debe servir para entender hacia donde debe evolucionar `starter-kit`.
- No se debe mezclar automaticamente codigo de `full-version` dentro de este repo sin adaptacion y revision.
- Las referencias mas utiles de `full-version` para Greenhouse son dashboards, tablas y patrones de user/roles/permissions, no los modulos de negocio template.
- Orden recomendado para buscar referencia Vuexy:
- `../full-version/src/views/dashboards/analytics/*`
- `../full-version/src/views/dashboards/crm/*`
- `../full-version/src/views/apps/user/list/*`
- `../full-version/src/views/apps/user/view/*`
- `../full-version/src/views/apps/roles/*`
- `../full-version/src/libs/ApexCharts.tsx`
- `../full-version/src/libs/styles/AppReactApexCharts.tsx`
- `../full-version/src/libs/Recharts.tsx`
- `../full-version/src/libs/styles/AppRecharts.ts`
- y luego la documentacion oficial:
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/libs/apex-charts/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/styled-libs/app-react-apex-charts/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/user-interface/components/avatars/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/development/theming/overview/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/custom/option-menu/`
- Vuexy tambien trae `next-auth` con JWT y pantallas/patrones de permissions, pero eso debe leerse como referencia de template, no como el modelo de seguridad final de Greenhouse.
- En Greenhouse, JWT ya existe, pero la autorizacion real no depende del ACL demo del template; depende de roles y scopes multi-tenant resueltos server-side desde BigQuery.
- Las apps de `User Management` y `Roles & Permissions` si deben considerarse candidatas directas para `/admin`, pero solo reutilizando estructura visual y componentes; la data layer debe salir de BigQuery y no de fake-db.
- Para dashboards y superficies ejecutivas, la referencia correcta es la jerarquia de `full-version/src/views/dashboards/analytics/*`; el sistema reusable que la adapta a Greenhouse queda fijado en `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`.
- La seleccion de patrones Vuexy/MUI para cualquier solicitud nueva ya no debe salir de exploracion libre de `full-version`; debe pasar por el sistema definido en `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`.
- El intake de solicitudes UI puede venir de personas o de otros agentes; el brief canonico para normalizar pedidos de Claude, Codex u otros queda en `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`.
- El repo tambien versiona una copia del skill operativo en `.codex/skills/greenhouse-ui-orchestrator/` para que el flujo no dependa solo del perfil local del agente.

## Stack Actual
- Next.js 16.1.1
- React 19.2.3
- TypeScript 5.9.3
- MUI 7.x
- App Router en `src/app`
- PNPM lockfile presente
- `apexcharts` + `react-apexcharts` activos para charts ejecutivos
- El portal ya tiene un `space-efeonce` sembrado en BigQuery para validar el MVP del dashboard cliente sobre el portfolio interno con mayor densidad de datos.
- En producto, la label visible debe migrar a `space`; `tenant` se mantiene solo como termino interno de runtime y datos.
- El dashboard ya no se compone solo por `snapshot` vs `non-snapshot`; ahora existe `layoutMode = snapshot | standard | rich` para ajustar jerarquia y distribucion de cards segun la densidad real del space.
- `recharts` activo como segunda via de charting reusable alineada con `full-version`
- `keen-slider`, `@fullcalendar/*`, `react-datepicker`, `react-dropzone`, `react-toastify`, `cmdk`, `@tiptap/*`, `@tanstack/react-table`, `react-player`, `mapbox-gl`, `react-map-gl`, `react-hook-form`, `@hookform/resolvers`, `valibot`, `@formkit/drag-and-drop`, `emoji-mart` y `@emoji-mart/*` ya estan instalados en `starter-kit`
- `simple-icons` activo para logos SVG de marcas como fallback directo en runtime
- `@iconify-json/logos` activo para incorporar logos de marca al pipeline Iconify/CSS del repo
- `src/components/greenhouse/BrandLogo.tsx` ya consume ese stack para tooling cards, priorizando logos bundleados y usando fallback a Tabler o monograma
- `.gitattributes` fija archivos de texto en `LF` para estabilizar el trabajo en Windows

## Target Definido por la Especificacion
- Portal de clientes multi-tenant para Efeonce Greenhouse
- BigQuery como fuente principal de datos consumida server-side
- NextAuth.js para autenticacion
- API Routes en App Router para exponer datos filtrados por cliente
- Alias productivo actual: `greenhouse.efeoncepro.com`
- Dataset propio del portal: `efeonce-group.greenhouse`

## Posicion de Producto Actual
- Greenhouse debe ser un portal ejecutivo y operativo, no un segundo Notion.
- Notion sigue siendo el system of work.
- Greenhouse debe exponer visibilidad de entrega, velocidad, capacidad, riesgo y contexto por tenant.
- Greenhouse tambien debe componer vistas y charts segun linea de negocio y servicios contratados del cliente.
- Proyectos, tareas y sprints existen como drilldown explicativo, no como centro del producto.
- El centro actual del producto ya es `/dashboard`; las siguientes capas objetivo son `/equipo` y `/campanas`.

## Comandos Utiles
- `npx pnpm install --frozen-lockfile`
- `npx pnpm dev`
- `npx pnpm build`
- `npx pnpm lint`
- `npx pnpm clean`

## Librerias visuales activas
- `apexcharts` y `react-apexcharts`: base actual para charts ejecutivos; wrappers locales en `src/libs/ApexCharts.tsx` y `src/libs/styles/AppReactApexCharts.tsx`.
- `recharts`: segunda via de charting disponible para cards compactas y visualizaciones de comparacion.
- `keen-slider`: sliders, carousels y hero cards con narrativa visual.
- `@fullcalendar/*`, `react-datepicker`, `date-fns`: calendario, planner y date UX.
- `@tanstack/react-table`, `@tanstack/match-sorter-utils`: tablas avanzadas, filtros y sorting.
- `react-hook-form`, `@hookform/resolvers`, `valibot`, `input-otp`: forms complejas, validacion y OTP UX.
- `@tiptap/*`, `cmdk`: rich text, editorial UX y command palette.
- `react-dropzone`, `react-toastify`, `emoji-mart`, `@emoji-mart/*`: upload, feedback y picker UX.
- `react-player`, `mapbox-gl`, `react-map-gl`: media, embeds y mapas.
- `@floating-ui/dom`, `@formkit/drag-and-drop`, `bootstrap-icons`: posicionamiento, reorder y soporte de iconografia.
- Ya no es necesario reinstalar este stack desde `full-version`; el inventario base de Vuexy ya vive en `starter-kit`.
- `simple-icons`: logos SVG de marcas y herramientas sin descargar assets manuales.
- `@iconify-json/logos`: logos de marca integrables al pipeline de iconos del repo en `src/assets/iconify-icons/bundle-icons-css.ts`.
- `recharts` y `keen-slider` ya estan disponibles en `starter-kit`; usarlos solo cuando una superficie lo justifique y manteniendo `apexcharts` como base actual del dashboard.

## Regla documental compacta
- La estrategia de documentacion liviana del repo queda en `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`.
- La regla es: detalle completo en una fuente canonica; deltas breves en `README.md`, `project_context.md`, `Handoff.md` y `changelog.md`.
- `Handoff.md` debe mantener solo el estado activo del turno o del frente abierto.
- `Handoff.archive.md` conserva el historial detallado cuando un handoff deja de ser operativo como snapshot rapido.
- Si un build local falla por rutas de otra rama, revisar el cache historico en `.next-local/**` antes de asumir un bug del cambio actual.

## Estructura Base
- `src/app/layout.tsx`: layout raiz
- `src/app/(dashboard)/layout.tsx`: layout principal autenticado o de dashboard
- `src/app/(dashboard)/dashboard/page.tsx`: dashboard principal actual
- `src/app/(dashboard)/proyectos/page.tsx`: vista base de proyectos
- `src/app/(dashboard)/proyectos/[id]/page.tsx`: detalle de proyecto
- `src/app/(dashboard)/sprints/page.tsx`: vista base de sprints
- `src/app/(dashboard)/settings/page.tsx`: vista base de settings
- `src/app/(blank-layout-pages)/login/page.tsx`: login actual
- `src/app/api/dashboard/kpis/route.ts`: primer endpoint real con datos de BigQuery
- `src/app/api/projects/route.ts`: listado real de proyectos por tenant
- `src/app/api/projects/[id]/route.ts`: detalle real de proyecto por tenant
- `src/app/api/projects/[id]/tasks/route.ts`: tareas del proyecto por tenant
- `src/components/layout/**`: piezas del layout
- `src/components/greenhouse/**`: componentes UI reutilizables del producto Greenhouse
- `src/configs/**`: configuracion de tema y color
- `src/data/navigation/**`: definicion de menu
- `src/lib/bigquery.ts`: cliente reusable de BigQuery
- `src/lib/dashboard/get-dashboard-overview.ts`: capa de datos server-side del dashboard
- `src/lib/projects/get-projects-overview.ts`: capa de datos server-side de proyectos
- `src/lib/projects/get-project-detail.ts`: capa de datos server-side del detalle de proyecto y sus tareas
- `src/views/greenhouse/dashboard/**`: configuracion y componentes especificos del dashboard Greenhouse
- `src/views/greenhouse/dashboard/orchestrator.ts`: orquestador de bloques ejecutivos reutilizables para el dashboard

## Estado de Rutas
- Existe `/dashboard`
- Existe `/capabilities/[moduleId]`
- Existe `/proyectos`
- Existe `/proyectos/[id]`
- Existe `/sprints`
- Existe `/settings`
- Existe `/login`
- Existe `/auth/landing`
- Existe `/internal/dashboard`
- Existe `/admin`
- Existe `/admin/tenants`
- Existe `/admin/tenants/[id]`
- Existe `/admin/tenants/[id]/view-as/dashboard`
- Existe `/admin/users`
- Existe `/admin/users/[id]`
- Existe `/admin/roles`
- Existe `src/app/page.tsx`
- La raiz `/` redirige segun `portalHomePath`
- `/home` y `/about` quedaron como rutas de compatibilidad que redirigen a la nueva experiencia

## Rutas Objetivo del Producto
- `/dashboard`: dashboard principal con KPIs ICO
- `/entrega`: contexto operativo agregado
- `/proyectos`: lista de proyectos del cliente
- `/proyectos/[id]`: detalle de proyecto con tareas y sprint
- `/campanas`: lista de campanas y relacion con output
- `/campanas/[id]`: detalle de campana con entregables y KPIs
- `/equipo`: equipo asignado, capacidad y carga
- `/sprints`: vista de sprints y velocidad
- `/settings`: perfil y preferencias del cliente
- `/internal/**`: visibilidad interna Efeonce
- `/admin/**`: gobernanza de tenants, usuarios, roles, scopes y feature flags

## Brecha Actual vs Objetivo
- El shell principal ya fue adaptado a Greenhouse con rutas reales y branding base.
- `next-auth` ya esta integrado, usa session JWT, protege el dashboard y autentica solo contra `greenhouse.client_users`.
- El JWT actual de Greenhouse ya carga `roleCodes`, `routeGroups`, `projectScopes` y `campaignScopes`; eso reemplaza el valor de negocio que podria aportar un ACL generico del template.
- `@google-cloud/bigquery` ya esta integrado con un cliente server-side reusable.
- `/internal/dashboard` ya fue reinterpretado como `Control Tower` en espanol, con foco en salud de activacion, onboarding trabado, inactividad y acceso rapido al detalle del space.
- `/dashboard` ya fue redisenado hacia una lectura cliente mas compacta en 3 zonas: hero + 4 KPI cards, 4 charts ejecutivos y detalle operativo bajo el fold.
- El dashboard cliente ya no expone la cocina anterior de `capacity`, tooling declarativo por modulo ni cards redundantes de calidad/entrega; esas piezas se movieron fuera de la vista principal del cliente.
- El contrato server-side del dashboard ahora tambien entrega cadencia semanal de entregas y `RpA` por proyecto sin cambiar la fuente de datos base en BigQuery.
- El CTA de ampliacion del equipo/ecosistema existe como modal de solicitud copiable; la notificacion real a owner o webhook sigue pendiente de una mutacion dedicada.
- El runtime del dashboard ya incorpora un orquestador deterministico de bloques ejecutivos para seleccionar hero, top stats y secciones por `serviceModules`, calidad de dato y capacidades disponibles.
- Ya existen `/api/dashboard/kpis`, `/api/dashboard/summary`, `/api/dashboard/charts` y `/api/dashboard/risks`.
- Ya existe `/api/projects` y la vista `/proyectos` consume datos reales filtrados por tenant.
- Ya existen `/api/projects/[id]`, `/api/projects/[id]/tasks` y la vista `/proyectos/[id]` con detalle real por tenant.
- Ya existe una fuente real multi-user en `greenhouse.client_users` y tablas de scopes/roles; el demo y el admin interno ya usan credenciales bcrypt.
- `/admin/tenants`, `/admin/users`, `/admin/roles` y `/admin/users/[id]` ya son el primer slice real de admin sobre datos reales.
- `/admin/users/[id]` reutiliza la estructura de `user/view/*` con tabs reinterpretados para Greenhouse:
- `overview` -> contexto del usuario y alcance
- `security` -> acceso y auditoria
- `billing` -> invoices y contexto comercial del cliente
- `/admin/tenants/[id]` consolida la empresa/tenant como unidad de gobierno y la relaciona con usuarios, modulos, flags y proyectos visibles.
- `/admin/tenants/[id]/view-as/dashboard` permite revisar el dashboard real del cliente desde una sesion admin sin cambiar de usuario.
- El login ya no muestra bloque demo y el mensaje de error de UI ya no expone detalles internos como `tenant registry`.
- Ya existen 9 tenants cliente bootstrap desde HubSpot para companias con al menos un `closedwon`, cada uno con un contacto cliente inicial en estado `invited`.
- Aun no existe `/api/sprints`.
- Aun no existen `/api/dashboard/capacity` ni `/api/dashboard/market-speed`; se pospusieron porque los tiempos operativos actuales no vienen en formato numerico confiable.
- Ya existe una capa multi-user real separada de tenants.
- La sincronizacion externa de capabilities debe venir por payload explicito desde una fuente canonica de empresa; no debe inferirse automaticamente desde `deals`.
- El runtime de auth y `getTenantContext()` ya exponen `businessLines` y `serviceModules`.
- La spec de capabilities ya no queda solo en documento: existe un registry runtime y una ruta generica `/capabilities/[moduleId]` alimentada por el tenant context actual.
- `/admin/tenants/[id]` ya no solo muestra business lines y service modules: ahora tambien dispone de un editor de capabilities y rutas API para guardar seleccion manual o sincronizar desde fuentes externas.
- `/admin/tenants/[id]` ahora tambien consulta un servicio HubSpot dedicado para leer `company profile` y `owner` bajo demanda, sin esperar a BigQuery.
- `/admin/tenants/[id]` ahora tambien consulta los `contacts` asociados a la `company` en HubSpot para comparar miembros CRM contra los usuarios ya provisionados en Greenhouse.
- `/admin/tenants/[id]` ya puede provisionar de forma segura los contactos CRM faltantes hacia `greenhouse.client_users`:
  - crea usuarios `invited` cuando no existen
  - reconcilia usuarios ya existentes del mismo tenant por email para reparar rol `client_executive` y scopes base si quedaron incompletos
  - evita falsos `already_exists` cuando el usuario existia pero su acceso no estaba completo
- ya existe una base documental para un orquestador UI multi-agente: `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`, `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md` y `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md` fijan como Claude, Codex u otros asistentes deben normalizar solicitudes y seleccionar patrones Vuexy/MUI sin explorar `full-version` de forma ad hoc
- Regla de latencia actual:
  - `company profile`, `owner` y `contacts` pueden reflejar cambios de HubSpot con baja latencia cuando Greenhouse vuelve a consultar el servicio dedicado
  - `capabilities` siguen siendo sync-based hasta que exista una capa event-driven o webhook-driven
- Aun no existe una capa semantica de KPIs y marts para dashboard, team, capacity y campaigns.
- Ya existen rutas minimas de Efeonce interno y admin, y el modulo admin ya tiene tenants, lista de usuarios, roles y detalle de usuario; falta mutacion segura de scopes y feature flags.
- `serviceModules` ya extienden la navegacion cliente a traves de la seccion dinamica `Servicios`; sigue pendiente extenderlos a billing por servicio contratado.
- Para Sky Airline ya existe un diagnostico formal de factibilidad:
- `on-time` mensual, tenure y entregables/ajustes por mes ya quedaron implementados con la data actual
- ya existen en `/dashboard` secciones reusables de quality, account team, capacity inicial, herramientas tecnologicas y AI tools
- esas secciones mezclan señal real de BigQuery, nombres detectados desde Notion, defaults por `serviceModules` y overrides controlados por tenant
- sigue pendiente formalizar APIs y modelos fuente para que dejen de depender de fallback u overrides
- la siguiente iteracion de UI debe dejar de tratar cada seccion como una card aislada y converger hacia familias reusables de hero, mini stat, chart, list y table cards
- el switch de tema del shell Greenhouse ya esta operativo en navbar con soporte real para `light`, `dark` y `system`, incluyendo reaccion al cambio del tema del sistema mientras la sesion sigue abierta

## Deploy
- Hosting principal: Vercel
- Repositorio remoto: `https://github.com/efeoncepro/greenhouse-eo.git`
- Configuracion importante en Vercel:
  - `Framework Preset`: `Next.js`
  - `Root Directory`: vacio o equivalente al repo raiz
  - `Output Directory`: vacio
- Se detecto un problema inicial de `404 NOT_FOUND` por tener `Framework Preset` en `Other`. Ya fue resuelto.

## Estrategia de Ramas y Ambientes
- `main`:
  - rama productiva
  - su deploy en Vercel corresponde a `Production`
- `develop`:
  - rama de integracion compartida
  - debe usarse como entorno de prueba funcional del equipo
  - esta asociada al `Custom Environment` `staging` en Vercel
- `feature/*` y `fix/*`:
  - ramas personales o por tarea
  - cada push debe validarse en `Preview`
- `hotfix/*`:
  - salen desde `main`
  - sirven para corregir produccion con el menor alcance posible
  - deben volver tanto a `main` como a `develop`

## Logica de Trabajo Recomendada
1. Crear rama desde `develop` para trabajo normal o desde `main` para hotfix.
2. Implementar cambio pequeno y verificable.
3. Validar localmente con `npx pnpm build`, `npx pnpm lint` o prueba manual suficiente.
4. Hacer push de la rama y revisar su Preview Deployment en Vercel cuando el cambio afecte UI, rutas, layout o variables.
5. Mergear a `develop` cuando el cambio ya este sano en su preview individual.
6. Hacer validacion compartida sobre `Staging` asociado a `develop`.
7. Mergear a `main` solo cuando el cambio este listo para produccion.
8. Confirmar deploy a `Production` en Vercel.

## Regla de Entornos
- `Development`: uso local de cada agente
- `Preview`: validacion remota de ramas de trabajo
- `Staging`: entorno persistente controlado asociado a `develop`
- `Production`: estado estable accesible para usuarios finales

## Regla de Variables en Vercel
- Toda variable debe definirse conscientemente por ambiente.
- No asumir que una variable de `Preview` o `Staging` existe en `Production`, ni al reves.
- Si una feature necesita variable nueva, primero debe existir en `Preview` y `Staging` antes de promocionarse a `main`.
- Mantener `.env.example` alineado con las variables requeridas.
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` en `Preview` puede llegar en mas de una serializacion; el parser de `src/lib/bigquery.ts` ya soporta JSON minified y JSON legacy escapado.
- Si `Preview` rechaza un login que en BigQuery esta activo y con hash correcto, revisar primero alias del dominio y el parseo de `GOOGLE_APPLICATION_CREDENTIALS_JSON` antes de asumir fallo de credenciales.

## Variables de Entorno
- `.env.example` define:
  - `NEXT_PUBLIC_APP_URL`
  - `BASEPATH`
  - `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`
- `next.config.ts` usa `process.env.BASEPATH` como `basePath`
- Riesgo operativo: si `BASEPATH` se configura en Vercel sin necesitarlo, la app deja de vivir en `/`

## Variables de Entorno Objetivo
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `GCP_PROJECT` ya existen en Vercel para `Development`, `staging` y `Production`.
- `NEXTAUTH_SECRET` y `NEXTAUTH_URL` ya estan integradas al runtime actual.
- `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET` habilitan Microsoft SSO multi-tenant en NextAuth y deben existir en cualquier ambiente donde se quiera validar ese flujo.
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` habilitan Google SSO en NextAuth y deben existir en cualquier ambiente donde se quiera validar ese flujo.
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` permite apuntar Greenhouse al servicio dedicado `hubspot-greenhouse-integration`; si no se define, el runtime usa el endpoint activo de Cloud Run como fallback.
- Cuando una branch requiera login funcional en `Preview`, tambien debe tener `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GCP_PROJECT`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL` definidos en ese ambiente.
- `tsconfig.json` excluye `**/* (1).ts` y `**/* (1).tsx` para evitar que duplicados locales del workspace rompan `tsc` y los builds de Preview en Vercel.

## Multi-Tenant Actual
- Dataset creado: `efeonce-group.greenhouse`
- Tabla creada: `greenhouse.clients`
- Tenant bootstrap cargado: `greenhouse-demo-client`
- Documento de referencia: `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- Documento maestro de evolucion: `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Documento de Fase 1 para identidad y acceso: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- DDL versionado: `bigquery/greenhouse_clients.sql`
- DDL propuesto para evolucion multi-user: `bigquery/greenhouse_identity_access_v1.sql`
- DDL multi-user ya aplicado en BigQuery: `client_users`, `roles`, `user_role_assignments`, `user_project_scopes`, `user_campaign_scopes`, `client_feature_flags`, `audit_events`
- DDL de bootstrap real desde HubSpot: `bigquery/greenhouse_hubspot_customer_bootstrap_v1.sql`
- DDL de bootstrap de scopes por mapeo conocido: `bigquery/greenhouse_project_scope_bootstrap_v1.sql`

## Decisiones Actuales
- Mantener cambios iniciales pequenos y reversibles.
- Usar `full-version` como fuente de contexto y referencia para construir la version Greenhouse dentro de `starter-kit`.
- Usar `../Greenhouse_Portal_Spec_v1.md` como especificacion funcional principal.
- No versionar `full-version` como parte de este repo.
- Favorecer despliegues frecuentes y verificables en Vercel.
- Usar `develop` como rama de `Staging` y `main` como rama de produccion.
- Documentar toda decision que afecte layout, rutas, deploy o variables de entorno.
- Mantener la politica de finales de linea en `LF` y evitar depender de conversiones automaticas de Git en Windows.
- En Windows local, `build` usa un `distDir` dinamico bajo `.next-local/` para evitar fallos `EPERM` al reutilizar la misma salida dentro de OneDrive.
- Evitar comandos Git mutantes en paralelo para no generar `index.lock`.
- La estrategia de IDs de producto ya no debe exponer prefijos de origen como `hubspot-company-*`; usar `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md` y `src/lib/ids/greenhouse-ids.ts` como referencia.
- Capability governance no debe derivarse desde `deals` ni `closedwon`; el sync externo solo es valido cuando llega con payload explicito desde el registro de empresa u otra fuente canonica equivalente.
- La fuente canonica de nomenclatura y microcopy Greenhouse vive en `src/config/greenhouse-nomenclature.ts`; cualquier texto visible nuevo en cliente debe salir de esa capa.
- La navegacion cliente vigente para el portal Greenhouse contempla `Pulse`, `Proyectos`, `Ciclos`, `Mi Greenhouse` y `Updates`.
- `Mi Greenhouse` concentra el modulo relacional `Tu equipo de cuenta`; `Pulse` mantiene `Capacidad del equipo` como lectura operativa separada.
- La capa `GH_INTERNAL_MESSAGES` ya gobierna tambien partes grandes de `admin/tenants/[id]`, `view-as/dashboard`, governance de capabilities y tablas operativas del detalle de space.

## Deuda Tecnica Visible
- El proyecto ya tiene shell Greenhouse, pero aun no refleja la identidad funcional final.
- La autenticacion runtime ya no depende de `greenhouse.clients`; esas columnas quedaron como metadata legacy de compatibilidad.
- El demo y el admin interno ya usan `password_hash` reales; los contactos cliente importados desde HubSpot permanecen `invited` hasta onboarding.
- Faltan sprints reales, `capacity`, `market-speed` y los data flows restantes definidos en la especificacion.
- Tenant metadata y user identity ya quedaron separados.
- Falta definir la capa semantica de KPIs y capacidad.
- Falta relacion campanas con proyectos, entregables e indicadores.
- Falta aterrizar completamente el sistema ejecutivo reusable en runtime para que `/dashboard`, `/equipo`, `/campanas` e internal/admin compartan un mismo lenguaje visual.
- Sigue pendiente decidir cuando persistir `public_id` en BigQuery; por ahora el runtime puede derivarlos sin romper `client_id` y `user_id`.
- La nueva referencia para conectores externos es `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`; la API de integraciones debe mantenerse generica para HubSpot, Notion u otros sistemas.
- `GET /api/integrations/v1/tenants` no debe enviar parametros `NULL` sin `types` a BigQuery; el runtime vigente usa strings vacios como sentinel y tipos explicitos para mantener estable la resolucion de tenants en integraciones externas.
- La nueva lectura operacional de HubSpot no reemplaza la API generica de integraciones:
  - `/api/integrations/v1/*` sigue siendo el contrato para sync bidireccional de capabilities
  - el servicio `hubspot-greenhouse-integration` es la fachada de lectura live para CRM company/owner
- Sigue pendiente barrer copy residual interna en superficies grandes como `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`.
- Existe un bloqueo de tipos ajeno al plan actual por el archivo duplicado `src/config/capability-registry (1).ts`, que hoy impide usar `tsc` como verificacion integral limpia.

## Supuestos Operativos
- El repo puede estar siendo editado por varios agentes y personas en paralelo.
- `Handoff.md` es la fuente de continuidad entre turnos.
- `AGENTS.md` define las reglas del repositorio y prevalece como guia operativa local.
