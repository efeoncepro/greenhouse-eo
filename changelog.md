# changelog.md

## Regla
- Registrar solo cambios con impacto real en comportamiento, estructura, flujo de trabajo o despliegue.
- Usar entradas cortas, fechadas y accionables.

## 2026-03-19

### Nubox DTE Integration — data seeding and task brief
- API de Nubox verificada: base URL `api.pyme.nubox.com/nbxpymapi-environment-pyme/v1`, auth con Bearer + x-api-key.
- Endpoints descubiertos: `/v1/sales` (ventas), `/v1/purchases` (compras proveedores), `/v1/expenses` (egresos bancarios), `/v1/incomes` (cobros).
- Credenciales almacenadas en `.env.local`: `NUBOX_API_BASE_URL`, `NUBOX_BEARER_TOKEN`, `NUBOX_X_API_KEY`.
- **Organizaciones**: 4 actualizadas con RUT + legal_name + industry desde Nubox (Corp Aldea, DDSoft, Gob RM, Sky Airline). 2 creadas (SGI, Sika).
- **Proveedores**: 17 creados + 1 actualizado en `greenhouse_finance.suppliers` con RUT, categoría y moneda. 19 proveedores totales.
- **Ingresos**: 78 registros importados en `greenhouse_finance.income` desde 15 meses de ventas Nubox. $163.8M CLP total. 0 huérfanos.
- Task brief creado: `docs/tasks/to-do/CODEX_TASK_Nubox_DTE_Integration.md` — 8 fases: infra, schema, emisión, sync ventas, sync compras, sync pagos, cron, UI.
- Script discovery: `scripts/nubox-extractor.py` (credenciales via env vars, no hardcodeadas).

### Advanced tasks split into complete foundations + focused follow-ups
- `CODEX_TASK_Source_Sync_Runtime_Projections_v1.md` se movió a `docs/tasks/complete/` al verificarse que ya cumplió su alcance fundacional: control plane, raw, conformed y proyecciones runtime con datos reales.
- `CODEX_TASK_Person_360_Profile_Unification_v1.md` se movió a `docs/tasks/complete/`; el trabajo pendiente quedó reducido a `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md`.
- `CODEX_TASK_People_Unified_View_v3.md` se movió a `docs/tasks/complete/`; el trabajo pendiente quedó reducido a `CODEX_TASK_People_360_Enrichments_v1.md`.
- `docs/tasks/README.md` quedó ajustado para que `to-do` refleje solo el remanente real y no tasks fundacionales ya absorbidas por el runtime.

### To-do task index synced to real implementation status
- `docs/tasks/README.md` ahora no solo ordena el backlog por prioridad, impacto y esfuerzo; también agrega `Estado real` para distinguir lanes `Avanzadas`, `Parciales`, `Diseño` y briefs de `Referencia`.
- Se reordenó el `P0` para reflejar mejor el repo vivo: `Source Sync`, `Tenant Notion Mapping`, `Person 360`, `Identity & Access`, `Finance PG migration` y `HR Payroll PG migration`.
- Se incorporó `CODEX_TASK_Financial_Intelligence_Layer.md` al índice, ya que estaba en `docs/tasks/to-do/` pero fuera del panel operativo.

### To-do backlog prioritized in task index
- `docs/tasks/README.md` ahora ordena el backlog `to-do` por `Prioridad`, `Impacto` y `Esfuerzo`, separando foundations `P0`, cierres de modulo `P1`, expansión estratégica `P2` y polish `P3`.
- También distingue explícitamente los briefs históricos u originales que deben leerse solo como contexto de producto y no ejecutarse antes de sus versiones `v2`.
- `Supporting Specs` queda marcado como input arquitectónico, no como backlog de ejecución autónoma.

### Transactional Email System — complete
- Sistema completo en producción: forgot-password, reset-password, invite, verify-email.
- Stack: Resend + React Email + PostgreSQL auth_tokens + BigQuery email_logs.
- DNS configurado: SPF combinado (Outlook + HubSpot + Amazon SES), DKIM, DMARC.
- Microsoft 365 whitelisting: `amazonses.com` en anti-spam policies para recibir emails de Resend.
- Rutas movidas de `/api/auth/*` a `/api/account/*` para evitar colisión con NextAuth catch-all.
- Domain alias expansion: `efeoncepro.com` ↔ `efeonce.org` en lookup de usuario.
- Email se envía a la dirección que el usuario escribió (no la almacenada), resolviendo el caso de dominios sin MX.
- Templates rediseñados: header gradient (Midnight Navy → Core Blue), logo PNG, `lang="es"`, copy en español con first-name greeting, fallback URL en texto plano, accesibilidad (color-scheme, alt descriptivo, contraste 7.5:1).
- Limpieza: endpoint temporal `fix-email` y script `fix-user-email.ts` eliminados.
- Task movida a `docs/tasks/complete/`.

### In-progress tasks audit completed
- Se auditó todo el panel `docs/tasks/in-progress/` contra el estado real del repo y el alcance declarado de cada brief.
- `CODEX_TASK_AI_Tooling_Credit_System_v2.md` y `CODEX_TASK_HR_Core_Module_v2.md` se movieron a `docs/tasks/complete/` por considerarse cerradas para el alcance que declaran.
- Las demás lanes parcialmente implementadas o con gaps explícitos se reubicaron en `docs/tasks/to-do/` para dejar de tratarlas como trabajo activo.
- `docs/tasks/README.md` quedó alineado con esta nueva clasificación y la carpeta `in-progress/` quedó vacía tras la auditoría.

### Greenhouse Email Catalog task added
- Se agregó `docs/tasks/to-do/CODEX_TASK_Greenhouse_Email_Catalog_v1.md` para separar el catalogo de emails de producto de la task puramente tecnica de `Transactional Email`.
- La nueva task ordena los emails en cuatro familias: `Access & Identity`, `Security`, `Executive Digests & Decision Support` y `Domain Notifications`.
- También deja priorizados los siguientes slices `P0`: `welcome_account_activated`, `invite_reminder`, `password_changed`, `review_ready`, `daily_executive_digest` y `delivery_risk_alert`.

### Frame.io Analytics Pipeline v2 added as implementation baseline
- Se agregó `docs/tasks/to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md` para conservar el objetivo real de enriquecer `Creative Hub` e `ICO` con data de Frame.io, pero reescribir la base técnica sobre el contrato vivo de `delivery_tasks` + `ico_engine.v_tasks_enriched`.
- `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline.md` ahora tiene guardrails de lectura para evitar implementar literalmente una nueva vista `greenhouse_conformed.tasks_enriched`, el control plane primario en BigQuery, o el modelado `UUID` / `spaces(id)` en el binding por `space`.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación para esta lane de Frame.io.

### Business Units v2 added as implementation baseline
- Se agregó `docs/tasks/to-do/CODEX_TASK_Business_Units_Canonical_v2.md` para conservar la necesidad de normalizar `Business Units`, pero reescribirla sin competir con el catálogo canónico ya existente de `service_modules`.
- `CODEX_TASK_Business_Units_Canonical.md` ahora tiene guardrails de lectura para evitar implementar literalmente una segunda identidad canónica de catálogo, `lead_person_id UUID` sobre `persons(id)` legacy o una semántica única que mezcle BU comercial y operativa.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación para Business Units.
- La `v2` ahora deja explícito el objetivo analítico: `commercial_business_unit` para Finance/Services y `operating_business_unit` para ICO/delivery, evitando mezclar ambas bajo una sola granularidad ambigua.

### Home Nexa v2 added as implementation baseline
- Se agregó `docs/tasks/to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md` para conservar la visión de producto de `Home + Nexa`, pero reescribir su base técnica sobre `portalHomePath`, los route groups reales del repo y la superficie actual de `dashboard` / `internal/dashboard`.
- `CODEX_TASK_Greenhouse_Home_Nexa.md` ahora tiene guardrails de lectura para evitar implementar literalmente `/home` como redirect universal, el modelo de acceso `client|operator|admin`, o una estructura App Router que no coincide con el workspace actual.
- La decisión operativa queda explícita: `client -> /home` como entrada principal deseada; perfiles internos y funcionales mantienen por ahora sus homes especializados.

### Staff Augmentation v2 added as implementation baseline
- Se agregó `docs/tasks/to-do/CODEX_TASK_Staff_Augmentation_Module_v2.md` para conservar la intención del módulo de placements, pero reescribir su base técnica sobre `Postgres-first`, `client_team_assignments` como anchor y la convención viva de IDs/FKs del core.
- `CODEX_TASK_Staff_Augmentation_Module.md` ahora tiene guardrails de lectura para evitar implementar literalmente `UUID` como convención principal, `service_id UUID`, o `ICO by placement` como dimensión cerrada sin un bridge real de atribución.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación para Staff Augmentation.

### SCIM v2 added as implementation baseline
- Se agregó `docs/tasks/to-do/CODEX_TASK_SCIM_User_Provisioning_v2.md` para conservar la intención del provisioning SCIM con Entra pero reescribir la base técnica sobre `Identity & Access V2`, `Postgres-first` y el grafo de identidad actual.
- `CODEX_TASK_SCIM_User_Provisioning.md` ahora tiene guardrails de lectura para evitar reintroducir BigQuery como write path principal o el modelo viejo de auth.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación de SCIM.

### Data Node v2 added as implementation baseline
- Se agregó `docs/tasks/to-do/Greenhouse_Data_Node_Architecture_v2.md` para conservar la visión de producto de `Data Node` pero reescribir su base técnica sobre `Postgres-first`, auth por helpers explícitos y el runtime actual del portal.
- `Greenhouse_Data_Node_Architecture_v1.md` ahora tiene guardrails de lectura para evitar ejecutar literalmente su control plane en BigQuery, su dependencia en `middleware.ts` o la apertura prematura de servicios/repos adicionales.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación para Data Node.
### Resend helper added for transactional email runtime
- Se agregó `src/lib/resend.ts` como wrapper `server-only` para `Resend`, con inicialización lazy, `EMAIL_FROM` canónico y helpers `isResendConfigured()`, `getResendApiKey()` y `getResendClient()`.
- `package.json` y `pnpm-lock.yaml` ahora incluyen la dependencia oficial `resend`.
- La validación local del helper quedó bloqueada por la `RESEND_API_KEY` actual en `.env.local`: el valor presente no coincide con el formato esperado por Resend y la API respondió `400 API key is invalid`.

### Transactional email env placeholders added to local and example configs
- `.env.example` y `.env.local.example` ahora incluyen `RESEND_API_KEY` y `EMAIL_FROM` para el futuro sistema de emails transaccionales.
- `.env.local` local tambien quedo preparado con esos placeholders, sin escribir la clave real.
- `project_context.md` se actualizo para documentar ambas variables como parte del set esperado cuando se habilite el flujo de emails transaccionales.

### Transactional Email task normalized against live auth architecture
- `docs/tasks/to-do/CODEX_TASK_Transactional_Email_System.md` ya no trata `middleware.ts` como boundary de auth y ahora reconoce el patrón vigente de guardas por layout y validación explícita en API routes.
- La spec también se alineó al patrón real de PostgreSQL del repo: setup dedicado por dominio (`setup-postgres-transactional-email.*`) y reutilización de la capa compartida `src/lib/postgres/client.ts` / helpers de auth en vez de un `setup-postgres.sql` monolítico o un `db.ts` genérico implícito.
- Se mantuvo el alcance funcional del task: Resend + PostgreSQL para tokens/mutaciones + BigQuery solo para logging y auditoría.

### Unit testing baseline formalized with Vitest + Testing Library
- El repo ya no depende solo de `Vitest` para funciones puras: ahora tambien tiene soporte formal para tests de componentes React con `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` y `jsdom`.
- `vitest.config.ts` ahora reconoce `*.test.tsx` y `*.spec.tsx`, y usa `node` como entorno por defecto para mantener el foco de unit tests sobre logica pura y permitir `jsdom` solo donde haga falta.
- Se agrego `src/test/render.tsx` como helper canonico de render con `ThemeProvider` de MUI para evitar que cada test de UI reconstruya su propio wrapper.
- `src/components/greenhouse/EmptyState.test.tsx` deja un ejemplo real de test de componente sobre la capa UI compartida.
- `AGENTS.md` ahora documenta `pnpm test` como ruta valida de verificacion y fija `Vitest + Testing Library` como baseline operativo de unit testing del repo.
- Validacion ejecutada: `pnpm test` con `3` archivos y `33` tests pasando.

### Person Activity tab — ICO Engine merge + KPI layout + sidebar FTE alignment
- **Activity tab reescrito**: `PersonActivityTab` ahora hace fetch a `/api/ico-engine/context?dimension=member` en vez de depender de `PersonOperationalMetrics`. Props cambiaron a `{ memberId: string }`. Muestra 6 KPIs (RpA, OTD%, FTR%, Throughput, Ciclo, Stuck), donut CSC, radar de salud, gauge de velocidad. Selectores de mes/año.
- **Tab ICO eliminado**: `PersonIcoTab.tsx` borrado, referencia removida de `PersonTabs`, `helpers.ts`, y `PersonTab` type.
- **KPI cards overflow fix**: Grid anidado reemplazado por flex con `overflowX: auto` y `minWidth: 160px` por card. Los iconos ya no se recortan en el borde del contenedor.
- **Sidebar FTE alineado con Organizaciones**: `get-person-detail.ts` ahora deriva `totalFte`, `totalHoursMonth` y `activeAssignments` solo de assignments que tienen membresía en Postgres (`person_memberships`), no de todos los `client_team_assignments` en BigQuery. Ejemplo: Andrés tenía 2.0 FTE (Efeonce + Sky en BQ) pero solo 1 membresía (Sky) — ahora muestra 1.0 FTE.
- **v_tasks_enriched fix**: COALESCE con empty arrays corregido a `IF(ARRAY_LENGTH > 0)` en `schema.ts`.

## 2026-03-18

### Identity Reconciliation Service — scalable source-agnostic identity matching
- **Nuevo módulo**: `src/lib/identity/reconciliation/` — pipeline completo de descubrimiento, matching, propuesta y auto-link de identidades de source systems a team members.
- **Postgres DDL**: `greenhouse_sync.identity_reconciliation_proposals` con partial unique index, status CHECK, y admin queue index.
- **Matching engine**: señales `email_exact` (0.90), `name_exact` (0.70), `name_fuzzy` (0.45), `name_first_token` (0.30), `existing_cross_link` (0.15). Auto-link ≥ 0.85, review ≥ 0.40.
- **Discovery enriquecido**: cuando Notion devuelve UUIDs como nombres (usuarios externos/invitados), extrae nombres reales de `responsable_texto` por posición.
- **Admin API**: GET proposals con filtros, POST trigger manual con dry-run, resolve (approve/reject/dismiss/reassign), stats por source system.
- **Pipeline integration**: tail step no-blocking en `sync-notion-conformed` — corre automáticamente con el cron diario.
- **Primer run**: 13 IDs no vinculados descubiertos (todos ex-colaboradores externos). 1 rechazado (Daniela Infante, match incorrecto). 12 descartados. 0 auto-links (no había miembros activos sin vincular excepto Humberly, que no aparece en tareas).

### Documentation normalization — task index and canonical-reading guardrails
- `docs/tasks/README.md` ahora vuelve a reflejar los briefs vivos recientes (`Campaign 360`, `Tenant Notion Mapping`, `Transactional Email`) y agrega una seccion `Supporting Specs` para las specs grandes que hoy funcionan como referencia de diseno.
- `CODEX_TASK_ETL_ICO_Pipeline_Hardening.md` se reclasifico a `docs/tasks/complete/` porque el propio brief ya marcaba su estado como implementado y la arquitectura viva absorbio ese trabajo.
- `Greenhouse_ICO_Engine_v1.md` y `CODEX_TASK_Tenant_Notion_Mapping.md` ahora incluyen un bloque de estado 2026-03-18 para dejar explicito que, ante conflicto, prevalecen `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_DATA_MODEL_MASTER_V1.md`, `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` y `GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`.
- Se agrego `docs/tasks/to-do/CODEX_TASK_Campaign_360_v2.md` como baseline canonica de implementacion para `Campaign`, manteniendo la task original como framing de producto y agregando guardrails para evitar implementar su version tecnica historica tal cual.

## 2026-03-16

### Payroll systematization — bonus proration, attendance, PDF/Excel, personnel expense
- **Motor de prorrateo gradual**: OTD 3 niveles (>=94% full, 70-94% lineal, <70% cero), RpA escala inversa con umbral 3. Reemplaza lógica binaria previa. Thresholds configurables desde `payroll_bonus_config.otd_floor`.
- **Integración asistencia/licencias**: `fetchAttendanceForAllMembers()` combina BigQuery `attendance_daily` + Postgres `leave_requests`. Días deducibles (`absent + unpaid_leave`) reducen base y teletrabajo proporcionalmente. 9 campos nuevos en `payroll_entries`.
- **Generación PDF/Excel**: Excel 3 hojas con exceljs (Resumen, Detalle, Asistencia & Bonos). PDF con @react-pdf/renderer — reporte período landscape + recibo individual con haberes, asistencia, descuentos legales, neto.
- **3 endpoints nuevos**: `GET /api/hr/payroll/periods/:id/pdf`, `/excel`, `GET /entries/:id/receipt`. Validan período aprobado/exportado.
- **UI actualizada**: semáforo OTD 3 colores, columna asistencia con ratio y chip ausencias, tooltips base/teletrabajo ajustado, botón recibo por entry, botones PDF/Excel/CSV en período, card prorrateo expandible.
- **Gasto de personal**: módulo `personnel-expense.ts` + endpoint + tab en dashboard. KPI cards, gráfico evolución bruto/neto, donut Chile vs Internacional, tabla detalle por período. Filtro por rango de fechas.
- **Arquitectura**: Postgres-first — nuevos campos solo en Cloud SQL, BigQuery devuelve `CAST(NULL)`. BigQuery MERGE sin cambios.
- **Pendiente**: ejecutar DDL migration en Cloud SQL (`ALTER TABLE ADD COLUMN IF NOT EXISTS`), seed `payroll_bonus_config` con nuevos thresholds, unit tests para `bonus-proration.ts`.

### Person 360 runtime contract aligned to enriched v2 setup
- Se detectó un desalineamiento entre código y base: `Admin > Users > detail` ya esperaba el contrato enriquecido de `greenhouse_serving.person_360`, pero Cloud SQL seguía con la versión base.
- Se corrigió el comando canónico `pnpm setup:postgres:person-360` para que apunte a `scripts/setup-postgres-person-360-v2.ts`.
- También se alineó `scripts/setup-postgres-person-360-serving.ts` a la misma versión para no volver a degradar el serving por accidente.
- `person_360 v2` quedó aplicado en Cloud SQL.
- Resultado:
  - `EO-ID`, `serial_number`, `resolved_*` y facetas extendidas ya están disponibles para `resolve-eo-id`, `get-person-profile` y `get-admin-user-detail`.

### Identity & Access V2 — Role homologation across TypeScript + frontend (Claude)
- `TenantRouteGroup` type expandido: +`my`, `people`, `ai_tooling` (10 valores total).
- `rolePriority` expandido a 15 roles (6 V2: collaborator, hr_manager, finance_analyst, finance_admin, people_viewer, ai_tooling_admin).
- `deriveRouteGroups()` fallback BigQuery cubre los 6 roles V2.
- `canAccessPeopleModule` ahora acepta route group `'people'` (para `people_viewer`).
- `requireAiToolingTenantContext` guard nuevo para AI Tooling.
- People permissions: `people_viewer` (read-only assignments/activity), `hr_manager` (compensation/payroll).
- VerticalMenu: People y AI Tooling visibles por route group, no solo por role code hardcoded.
- Admin helpers: iconos y colores para roles V2.
- Backward compatible: usuarios existentes con `finance_manager`, `hr_payroll`, `employee` sin cambios.

### Identity & Access V2 — PostgreSQL RBAC model + session resolution wiring (Claude)
- DDL: `setup-postgres-identity-v2.sql` — ALTER client_users (12 cols SSO/auth/session), scope tables (project, campaign, client), audit_events, client_feature_flags, role seed V2 (6 new roles), session_360 + user_360 views.
- Backfill: `backfill-postgres-identity-v2.ts` — 6-step migration BigQuery → Postgres (SSO columns, member_id links, role assignments, scopes, feature flags).
- Identity Store: `src/lib/tenant/identity-store.ts` — readiness check con TTL 60s, 4 session lookups vía session_360, internal users list, SSO link + last login writes.
- Wiring: `src/lib/tenant/access.ts` ahora usa Postgres-first con BigQuery fallback para todos los lookups de sesión y dual-write para SSO linking + last login.
- Scripts y DDL aún NO ejecutados en Cloud SQL.

## 2026-03-15

### Person 360 serving baseline materialized in PostgreSQL
- Se creó `greenhouse_serving.person_360` como primera vista unificada de persona sobre `identity_profiles`, `members`, `client_users` y `crm_contacts`.
- Se agregó el comando `pnpm audit:person-360` para medir cobertura real de unificación entre facetas.
- Estado validado:
  - `profiles_total = 38`
  - `profiles_with_member = 7`
  - `profiles_with_user = 37`
  - `profiles_with_contact = 29`
  - `profiles_with_member_and_user = 7`
  - `profiles_with_user_and_contact = 29`
  - `profiles_with_all_three = 0`
- Principales gaps detectados:
  - `users_without_profile = 2`
  - `contacts_without_profile = 34`
  - `internal_users_without_member = 1`

### Person 360 formalized as the canonical human profile strategy
- Se fijó en arquitectura que Greenhouse debe tratar `identity_profile` como ancla canónica de persona.
- `member`, `client_user` y `crm_contact` quedan formalizados como facetas del mismo perfil, no como raíces paralelas.
- `People` y `Users` pasan a definirse como vistas contextuales del mismo `Person 360`.
- La lane fundacional quedó absorbida por `CODEX_TASK_Person_360_Profile_Unification_v1.md`; el follow-up vivo pasa a ser `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md`.

### AI Tooling runtime migrated to PostgreSQL
- `AI Tooling` ya no depende primariamente del bootstrap runtime de BigQuery para responder catálogo, licencias, wallets y metadata admin.
- Se creó `greenhouse_ai` en Cloud SQL con:
  - `tool_catalog`
  - `member_tool_licenses`
  - `credit_wallets`
  - `credit_ledger`
- `src/lib/ai-tools/service.ts` ahora usa `Postgres first` con fallback controlado al store legacy.
- `setup-postgres-ai-tooling.ts` ya no solo crea schema: también siembra catálogo mínimo y providers requeridos para que el módulo no arranque vacío.
- Estado validado tras setup:
  - `tool_catalog = 9`
  - `licenses = 0`
  - `wallets = 0`
  - `ledger = 0`
  - providers activos visibles = `10`, incluyendo `Microsoft` y `Notion`

### Project detail now exposes source performance indicators and RpA semaphore
- `Project Detail > tasks` ya expone directamente desde fuente:
  - `semáforo_rpa`
  - `indicador_de_performance`
  - `cumplimiento`
  - `completitud`
  - `días_de_retraso`
  - `días_reprogramados`
  - `reprogramada`
  - `client_change_round`
  - `client_change_round_final`
  - `workflow_change_round`
  - tiempos de ejecución, revisión y cambios
- También se agregó `rpaSemaphoreDerived` para compatibilidad con la lógica actual del portal.
- `Source Sync Runtime Projections` quedó extendido para llevar ese mismo set al modelo canónico `delivery_*`, aunque el apply de BigQuery sigue temporalmente bloqueado por `table update quota exceeded`.

### Finance clients consumers now read canonical CRM first with live fallback
- `GET /api/finance/clients` y `GET /api/finance/clients/[id]` ya no dependen solo de `hubspot_crm.*` live.
- Ambos consumers ahora priorizan:
  - `greenhouse_conformed.crm_companies`
  - `greenhouse_conformed.crm_deals`
  - `greenhouse.client_service_modules`
- Se mantuvo fallback a `hubspot_crm.companies` y `hubspot_crm.deals` cuando la proyección todavía no alcanzó el evento live.
- Esto evita romper el flujo donde HubSpot promociona una empresa a cliente y Greenhouse la crea en tiempo real antes de que corra el sync.

### Admin project scope naming now prefers delivery projections
- `Admin > tenant detail` y `Admin > user detail` ya priorizan `greenhouse_conformed.delivery_projects.project_name` para resolver nombres de proyecto en scopes.
- `notion_ops.proyectos` queda temporalmente como fallback y para `page_url`, mientras ese campo no viva en la proyección canónica.

### Projects metadata now prefers delivery projections
- `Projects Overview` y `Project Detail` ya priorizan `greenhouse_conformed.delivery_projects` y `greenhouse_conformed.delivery_sprints` para nombre, estado y fechas.
- `notion_ops.tareas` se mantiene para métricas finas de tarea (`rpa`, reviews, blockers, frame comments).
- `notion_ops.proyectos` y `notion_ops.sprints` quedan temporalmente para `page_url`, `summary` y fallback.

### HubSpot contacts + owners now project into the canonical runtime graph
- `Source Sync Runtime Projections` ya materializa:
  - `greenhouse_conformed.crm_contacts`
  - `greenhouse_crm.contacts`
- El slice respeta la frontera Greenhouse:
  - solo entran contactos asociados a compañías que ya pertenecen al universo de clientes Greenhouse
  - no se auto-provisionan nuevos `client_users` desde el sync
  - la integración/admin live sigue siendo la capa de provisioning de accesos
- Reconciliación activa:
  - `HubSpot Contact -> client_user`
  - `HubSpot Contact -> identity_profile`
  - `HubSpot Owner -> member/user`
- `HubSpot Owner` ahora también se sincroniza como source link reusable en `greenhouse_core`:
  - `member <- hubspot owner = 6`
  - `user <- hubspot owner = 1`
  - `identity_profile <- hubspot owner = 6`
- Estado validado tras rerun:
  - `crm_contacts = 63`
  - `linked_user_id = 29`
  - `linked_identity_profile_id = 29`
  - `owner_member_id = 63`
  - `owner_user_id = 61`
  - `identity_profile_source_links` HubSpot contact = `29`
  - `entity_source_links` HubSpot contact -> user = `29`
  - runtime owners:
    - companies `owner_member_id = 9`, `owner_user_id = 9`
    - deals `owner_member_id = 21`, `owner_user_id = 21`

### Canonical `Space` model added to the 360 backbone
- Se agregó `greenhouse_core.spaces` y `greenhouse_core.space_source_bindings` como nuevo boundary operativo para Agency, delivery e ICO metrics.
- `Efeonce` ya quedó modelado como `internal_space` con `client_id = null`, en vez de depender solo del pseudo-cliente legacy `space-efeonce`.
- Se agregó `greenhouse_serving.space_360`.
- `Source Sync Runtime Projections` ya publica `space_id` en:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_conformed.delivery_sprints`
  - `greenhouse_delivery.projects`
  - `greenhouse_delivery.tasks`
  - `greenhouse_delivery.sprints`
- Seed validado:
  - PostgreSQL `spaces = 11` (`10 client_space`, `1 internal_space`)
  - Delivery con `space_id` en PostgreSQL: projects `57/59`, tasks `961/1173`, sprints `11/13`
  - Delivery con `space_id` en BigQuery conformed: projects `57/59`, tasks `961/1173`, sprints `11/13`
- Se endureció además la capa de acceso PostgreSQL para el backbone:
  - `setup-postgres-canonical-360.sql` ya otorga grants a `greenhouse_runtime` y `greenhouse_migrator`
  - `setup-postgres-access.sql` intenta normalizar ownership de `greenhouse_core`, `greenhouse_serving` y `greenhouse_sync` hacia `greenhouse_migrator` sin bloquearse por objetos legacy aislados

### Finance Slice 2 PostgreSQL wiring — Income, Expenses, Payments (Claude)
- Creado `src/lib/finance/postgres-store-slice2.ts` — repository layer completo para Slice 2 con readiness check independiente, CRUD de income/expenses/income_payments, sequence ID generator, y publicación de outbox events.
- 7 rutas API wired a Postgres-first con BigQuery fallback:
  - GET/POST `/api/finance/income`
  - GET `/api/finance/income/[id]`
  - POST `/api/finance/income/[id]/payment`
  - GET/POST `/api/finance/expenses`
  - GET `/api/finance/expenses/[id]`
- Income payments normalizados: Postgres usa tabla `income_payments` con FK; BigQuery fallback mantiene JSON `payments_received`.
- Payment creation transaccional con `FOR UPDATE` lock sobre income row.
- PUT income/expenses y reconciliation runtime quedan pendientes para Slice 3.

### HR Payroll & Leave backfill scripts + serving view (Claude)
- `scripts/backfill-postgres-payroll.ts` — backfill BigQuery → PostgreSQL para compensation_versions, payroll_periods, payroll_entries, payroll_bonus_config.
- `scripts/backfill-postgres-hr-leave.ts` — backfill BigQuery → PostgreSQL para leave_types, leave_balances, leave_requests, leave_request_actions.
- `greenhouse_serving.member_leave_360` — serving view con member + vacation balance + pending/approved requests del año actual.
- Scripts escritos, NO ejecutados aún.
- Fix TS en `sync-source-runtime-projections.ts:571` para desbloquear build.

### Data model master and first real source-sync seed
- Se agregó `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md` y su operating model para agentes como fuente de verdad del modelo de datos Greenhouse.
- Se ejecutó el primer seed real de `Source Sync Runtime Projections`: `delivery` quedó proyectado completo a PostgreSQL y `greenhouse_crm` quedó filtrado al universo real de clientes Greenhouse.

### PostgreSQL access model and `pg:doctor` tooling
- Se agregó `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` para formalizar la separación de acceso `runtime / migrator / admin`.
- `AGENTS.md` ahora documenta cómo acceder a PostgreSQL, qué perfil usar según el tipo de trabajo y qué comandos correr antes de tocar un dominio nuevo.
- Se agregaron los comandos:
  - `pnpm setup:postgres:access`
  - `pnpm pg:doctor`
- Se agregó un loader reutilizable de env local para tooling PostgreSQL y un runner compartido para scripts SQL.
- `setup-postgres-finance.sql`, `setup-postgres-hr-leave.sql` y `setup-postgres-payroll.sql` ahora otorgan acceso a:
  - `greenhouse_runtime`
  - `greenhouse_migrator`
  en vez de atarse a `greenhouse_app`.
- Se validó en Cloud SQL que:
  - `greenhouse_app` hereda `greenhouse_runtime`
  - `greenhouse_migrator_user` hereda `greenhouse_migrator`
  - `HR`, `Payroll` y `Finance` ya exponen grants consumibles por ambos roles

### Finance PostgreSQL first slice and canonical provider bridge
- `Finance` ya tiene materializado su primer slice operacional en PostgreSQL:
  - `greenhouse_finance.accounts`
  - `greenhouse_finance.suppliers`
  - `greenhouse_finance.exchange_rates`
  - `greenhouse_serving.provider_finance_360`
- Se agregó `src/lib/finance/postgres-store.ts` para el repository `Postgres first`.
- `accounts` y `exchange-rates` ya prefieren PostgreSQL en runtime, con fallback controlado a BigQuery durante rollout.
- `GET /api/finance/expenses/meta` ya toma la lista de cuentas desde PostgreSQL cuando el slice está listo.
- Se ejecutó backfill inicial desde BigQuery:
  - `accounts`: `1`
  - `suppliers`: `2`
  - `exchange_rates`: `0`
- El bridge `Supplier -> Provider` ahora también materializa providers canónicos `financial_vendor` en PostgreSQL y expone la relación vía `provider_finance_360`.
- Se corrigió además el setup estructural de permisos en Cloud SQL:
  - `greenhouse_app` ya tiene `REFERENCES` sobre `greenhouse_core`
  - `greenhouse_app` ya puede publicar en `greenhouse_sync`
  - el script `setup-postgres-finance.sql` ahora incorpora grants para que un ambiente nuevo no dependa de intervención manual

### Parallel Postgres migration lanes documented for agent work
- Se agregaron tres tasks nuevas para ejecutar en paralelo la siguiente etapa de plataforma:
  - `CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md`
  - `CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`
  - `CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`
- Cada brief deja explicitados:
  - boundaries de archivos
  - alcance y no scope
  - dependencias
  - criterios de aceptacion
  - handoff sugerido para Claude u otro agente
- `docs/tasks/README.md` ya refleja estas lanes como `in-progress`.

### HR leave avatars now use real/fallback profile image data
- `HR > Permisos` ya no fuerza iniciales en la tabla de solicitudes y en el modal de revisión.
- `HrLeaveRequest` ahora devuelve `memberAvatarUrl`.
- En BigQuery se usa `team_members.avatar_url` cuando existe.
- En PostgreSQL se usa el resolver compartido de avatar por nombre/email hasta que `avatar_url` viva de forma canónica en `greenhouse_core`.

### Source sync foundation materialized in PostgreSQL and BigQuery
- Se agregaron los scripts:
  - `pnpm setup:postgres:source-sync`
  - `pnpm setup:bigquery:source-sync`
- En PostgreSQL se materializaron:
  - `greenhouse_sync.source_sync_runs`
  - `greenhouse_sync.source_sync_watermarks`
  - `greenhouse_sync.source_sync_failures`
  - `greenhouse_crm.companies`
  - `greenhouse_crm.deals`
  - `greenhouse_delivery.projects`
  - `greenhouse_delivery.sprints`
  - `greenhouse_delivery.tasks`
- En BigQuery se materializaron:
  - datasets `greenhouse_raw`, `greenhouse_conformed`, `greenhouse_marts`
  - raw snapshots iniciales de Notion y HubSpot
  - conformed tables iniciales de `delivery_*` y `crm_*`
- El runner `setup-bigquery-source-sync.ts` quedó desacoplado de `server-only` para poder ejecutarse como tooling externo.

### HR leave request creation type fix in PostgreSQL
- Se corrigió la creación de solicitudes en `HR > Permisos` sobre PostgreSQL.
- El write de `leave_balances` usaba el parámetro `year` como `text` dentro del `INSERT ... SELECT`, lo que rompía `POST /api/hr/core/leave/requests`.
- `src/lib/hr-core/postgres-leave-store.ts` ahora fuerza el placeholder como entero en el `balance_id` y en la columna `year`, evitando el error `column "year" is of type integer but expression is of type text`.

### External source sync architecture for Notion and HubSpot
- Se agregó `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` para definir el blueprint de ingestión, backup, normalización y serving de datos externos.
- Greenhouse formaliza que:
  - `Notion` y `HubSpot` siguen siendo `source systems`
  - `BigQuery raw` guarda snapshots inmutables y replayables
  - `BigQuery conformed` expone entidades externas estables
  - `PostgreSQL` recibe solo proyecciones runtime-críticas para cálculo y pantallas operativas
- Se definieron como objetos mínimos de control:
  - `greenhouse_sync.source_sync_runs`
  - `greenhouse_sync.source_sync_watermarks`
  - `greenhouse_sync.source_sync_failures`
- Se definieron como primeras tablas conformed objetivo:
  - `delivery_projects`
  - `delivery_tasks`
  - `delivery_sprints`
  - `crm_companies`
  - `crm_deals`

### HR leave rollout hardening for Preview
- `HR > Permisos` ya no cae completo en `Preview` si el conector a Cloud SQL falla durante el rollout a PostgreSQL.
- `src/lib/hr-core/service.ts` ahora hace fallback controlado a BigQuery para metadata, balances, requests, creación y revisión de solicitudes cuando detecta:
  - falta de permisos Cloud SQL
  - schema Postgres no listo
  - errores transitorios de conectividad
- Se corrigió además la infraestructura de `Preview` otorgando `roles/cloudsql.client` al service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`, que era el origen real del error `cloudsql.instances.get`.

### PostgreSQL canonical 360 backbone and initial BigQuery backfill
- Se agregó `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` para formalizar el modelo canónico 360 en PostgreSQL.
- Se materializaron en `greenhouse-pg-dev` los esquemas:
  - `greenhouse_core`
  - `greenhouse_serving`
  - `greenhouse_sync`
- Se agregaron vistas 360 iniciales:
  - `client_360`
  - `member_360`
  - `provider_360`
  - `user_360`
  - `client_capability_360`
- Se agregó `greenhouse_sync.outbox_events` como foundation de publicación `Postgres -> BigQuery`.
- Se agregaron scripts operativos:
  - `pnpm setup:postgres:canonical-360`
  - `pnpm backfill:postgres:canonical-360`
- Se ejecutó backfill inicial desde BigQuery hacia Postgres:
  - `clients`: `11`
  - `identity_profiles`: `9`
  - `identity_profile_source_links`: `29`
  - `client_users`: `39`
  - `members`: `7`
  - `providers`: `8` canónicos sobre `11` filas origen, por deduplicación de `provider_id`
  - `service_modules`: `9`
  - `client_service_modules`: `30`
  - `roles`: `8`
  - `user_role_assignments`: `40`

### Data platform architecture and Cloud SQL operational foundation
- Se formalizó la arquitectura objetivo `OLTP + OLAP` en `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`.
- Greenhouse deja explícitamente definido que `PostgreSQL` será la base operacional para workflows mutables y `BigQuery` quedará como warehouse analítico.
- Se provisionó la primera instancia administrada de PostgreSQL en Google Cloud:
  - instancia: `greenhouse-pg-dev`
  - proyecto: `efeonce-group`
  - región: `us-east4`
  - motor: `POSTGRES_16`
  - base creada: `greenhouse_app`
  - usuario creado: `greenhouse_app`
- Se crearon los secretos operativos iniciales en Secret Manager:
  - `greenhouse-pg-dev-postgres-password`
  - `greenhouse-pg-dev-app-password`
- Este cambio deja lista la fundación de infraestructura para empezar la migración fuera de BigQuery, pero todavía no conecta el runtime del portal a Postgres.

### HR Payroll admin team surface and compensation overview resilience
- `Payroll` ya no depende de una ruta inexistente para indicar dónde habilitar o gestionar colaboradores.
- Se agregó la ruta runtime `/admin/team`, reutilizando la vista de `People`, y el menú `Admin` ahora expone `Equipo`.
- `GH_INTERNAL_NAV` ahora incluye la entrada canónica `adminTeam`.
- `getCompensationOverview()` ahora es resiliente a fallos parciales:
  - si falla la carga de compensaciones actuales, mantiene el roster
  - si falla la carga enriquecida de miembros, cae al roster base de `greenhouse.team_members`
- `Payroll` ahora apunta a `Admin > Equipo` como surface real para habilitación del equipo y primera compensación.

### HR Payroll period creation and compensation onboarding hardening
- `HR Payroll` ya no depende de inferencia implícita de tipos para params `null` en BigQuery al crear períodos, crear compensaciones o persistir entries.
- Se agregaron tipos explícitos en los writes de:
  - `payroll_periods`
  - `compensation_versions`
  - `payroll_entries`
- El dashboard de nómina ahora deja de silenciar fallos de carga en `/api/hr/payroll/periods` y `/api/hr/payroll/compensation`.
- `Compensaciones` ahora explica mejor el onboarding:
  - CTA visible para configurar la primera compensación
  - mensaje explícito si faltan colaboradores activos
  - mensaje explícito cuando todos ya tienen compensación vigente y la edición se hace desde la fila
- En `Preview` se confirmó que sí existe relación canónica entre colaboradores y `Payroll`: hoy hay `7` `team_members` activos y `0` compensaciones vigentes.

### Supplier to Provider canonical bridge for AI Tooling
- `Finance Suppliers` y `AI Tooling` ahora comparten mejor la identidad canónica de vendor/plataforma a través de `greenhouse.providers`.
- Se agregó `src/lib/providers/canonical.ts` para sincronizar suppliers financieros activos hacia `greenhouse.providers`.
- `fin_suppliers` ahora puede persistir `provider_id` y las rutas de suppliers ya devuelven ese vínculo.
- `AI Tooling` ahora sincroniza providers desde Finance antes de poblar metadata o validar `providerId`.
- El diálogo `Nueva herramienta` ya no depende de una sola lista vacía y muestra estado explícito si todavía no hay providers disponibles.

### Finance exchange-rate visibility and HR leave request drawer hardening
- `Finance Dashboard` ahora muestra warning si `/api/finance/exchange-rates/latest` no devuelve snapshot o responde con error HTTP.
- `HR Core` ahora evita que `Solicitar permiso` quede con dropdown vacío y silencioso:
  - deshabilita el CTA cuando no hay tipos activos
  - muestra estado explícito en el select
  - preselecciona el primer tipo activo al abrir
  - expone error si falla `GET /api/hr/core/meta`

### Cross-module QA sweep for Finance, HR Core, HR Payroll and AI Tooling
- Se ejecutó una pasada de QA funcional/contractual sobre los módulos `Finance`, `HR Core`, `HR Payroll` y `AI Tooling`, contrastando pantallas activas con sus rutas API reales.
- `Finance Dashboard` ahora usa `currentBalance` en vez de `openingBalance` para `Saldo total` y muestra mejor contexto del snapshot de tipo de cambio.
- `HR Core` ahora expone desde UI la cancelación de solicitudes de permiso pendientes, alineándose con el backend que ya soportaba `action = cancel`.
- `HR Payroll` ahora reinicia correctamente el formulario de compensación al abrir una nueva alta o una nueva versión para otro colaborador, evitando arrastre de estado previo.
- `AI Tooling` quedó verificado en esta pasada como operativo en sus flujos admin principales sobre catálogo, licencias, wallets y consumo.
- Las tasks vivas de esos módulos quedaron actualizadas con flujos mapeados, fix aplicado y estado post-QA.

### Finance exchange-rate daily sync
- `Finance` ahora puede hidratar y persistir automáticamente el tipo de cambio `USD/CLP` desde APIs abiertas antes de calcular ingresos o egresos en USD.
- Se agregó `src/lib/finance/exchange-rates.ts` como capa server-only de sincronización:
  - fuente primaria: `mindicador.cl`
  - fallback: `open.er-api.com`
- Se agregó `GET/POST /api/finance/exchange-rates/sync` para sincronización diaria/manual y `vercel.json` con cron diario hacia esa ruta.
- `GET /api/finance/exchange-rates/latest` ahora intenta hidratar el snapshot si todavía no existe en `fin_exchange_rates`.
- `resolveExchangeRateToClp()` ahora puede auto-sincronizar `USD/CLP` / `CLP/USD` antes de devolver error, reduciendo dependencia de carga manual previa.

### HR Payroll compensation-current backend hardening
- `HR-Payroll` backend ya no depende ciegamente de `compensation_versions.is_current` para resolver la compensación vigente.
- `src/lib/payroll/get-compensation.ts` ahora deriva la vigencia real por `effective_from` / `effective_to`, evitando que compensaciones futuras dejen stale la compensación “actual”.
- `src/lib/payroll/get-payroll-members.ts` ahora usa el mismo criterio temporal para `hasCurrentCompensation`, manteniendo consistente `eligibleMembers` y el overview de compensaciones.

### Finance backend re-QA closure
- Se ejecutó un re-QA backend de `Finance` después de la segunda tanda y se corrigieron los bugs server-side que seguían abiertos.
- `GET /api/finance/dashboard/aging` ya no mezcla monedas nativas cuando frontend espera CLP; ahora devuelve aging en CLP proporcional.
- `GET /api/finance/clients` y `GET /api/finance/clients/[id]` ya no calculan `totalReceivable` en moneda nativa; ahora lo devuelven consistente en CLP.
- `GET /api/finance/dashboard/by-service-line` ahora separa `cash` y `accrual`, manteniendo compatibilidad legacy en `income` / `expenses` / `net`.
- Con este re-QA, `Finance` backend queda suficientemente estable para ceder el siguiente foco operativo a `HR-Payroll`.

### Finance reconciliation backend hardening
- `Finance` recibió una primera tanda backend de endurecimiento sobre conciliación bancaria.
- La importación de extractos ya no reutiliza la secuencia de `row_id` al reimportar dentro del mismo período y `statement_row_count` ahora representa el total acumulado real del período.
- `match`, `unmatch`, `exclude` y `auto-match` ahora bloquean mutaciones sobre períodos `reconciled` o `closed`.
- `PUT /api/finance/reconciliation/[id]` ahora valida cierre operativo real antes de permitir `reconciled` o `closed`:
  - exige extracto importado
  - exige cero filas `unmatched` o `suggested`
  - exige `difference = 0`
  - impide cerrar un período que aún no fue reconciliado
- La selección temporal para ingresos en conciliación ahora usa el último `payments_received` cuando existe, con fallback a `invoice_date`.
- Se documentó en la task financiera el handoff explícito `Codex -> Claude` para separar trabajo backend crítico de ajustes UI/UX.

## 2026-03-14

### Portal surface consolidation task
- Se agregó una task `to-do` específica para consolidación UX y arquitectura de vistas del portal:
  - `docs/tasks/to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md`
- La task documenta:
  - qué surfaces hoy sí se sienten troncales
  - qué surfaces compiten por la misma intención
  - qué vistas conviene unificar, enriquecer o depriorizar
- No hay cambios runtime en esta entrada; solo se deja el brief rector para una futura fase de implementación.

### People and team capacity backend complements
- `People v3` y `Team Identity & Capacity v2` recibieron complementos backend para dejar contratos más estables antes del frontend.
- `GET /api/people/meta` ahora expone:
  - `visibleTabs`
  - `supportedTabs`
  - `availableEnrichments`
  - `canManageTeam`
- `GET /api/people` ahora también devuelve `filters` para `roleCategories`, `countries` y `payRegimes`.
- `GET /api/people/[memberId]` ahora puede devolver:
  - `capacity`
  - `financeSummary`
- `GET /api/team/capacity` ahora devuelve semántica explícita de capacidad:
  - por miembro: `assignedHoursMonth`, `expectedMonthlyThroughput`, `utilizationPercent`, `capacityHealth`
  - por payload: `healthBuckets` y `roleBreakdown`
- Se agregó `src/lib/team-capacity/shared.ts` para centralizar benchmarks y reglas server-side de salud de capacity.

### Team Identity and People task reclassification
- `Team Identity & Capacity` y `People Unified View v2` fueron contrastadas explícitamente contra arquitectura y runtime actual.
- Resultado:
  - `People` sí está implementado y alineado como capa read-first del colaborador
  - `People v2` quedó como brief histórico porque el runtime ya avanzó más allá de su contexto original
  - `Team Identity & Capacity` sí dejó cerrada la base canónica de identidad, pero no debe tratarse como task completa en capacity
- Se reclasificaron las tasks:
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md` queda como referencia histórica
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v3.md` queda como cierre fundacional de la surface
  - `docs/tasks/to-do/CODEX_TASK_People_360_Enrichments_v1.md` pasa a ser la task activa para los enrichments 360 pendientes
  - `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` queda como referencia histórica/fundacional
  - `docs/tasks/to-do/CODEX_TASK_Team_Identity_Capacity_System_v2.md` pasa a ser la task activa para formalización de capacity
  - `docs/tasks/README.md`, `project_context.md` y `Handoff.md` quedaron alineados con este cambio

### Creative Hub backend runtime closure
- `Creative Hub v2` dejó de depender solo del snapshot agregado de `Capabilities` y ahora tiene una capa backend específica para cierre real del módulo.
- Se endureció la activación runtime:
  - `resolveCapabilityModules()` ahora exige match de `business line` y `service module` cuando ambos están definidos
  - `Creative Hub` ya no se activa solo por `globe`; requiere además uno de:
    - `agencia_creativa`
    - `produccion_audiovisual`
    - `social_media_content`
- Se agregó `src/lib/capability-queries/creative-hub-runtime.ts` para construir snapshot task-level de la capability:
  - usa `fase_csc` cuando existe
  - la deriva server-side cuando todavía no existe en `notion_ops.tareas`
  - calcula aging real, FTR y RpA cuando la data existe
- `GET /api/capabilities/creative-hub/data` ahora devuelve:
  - capa `Brand Intelligence`
  - pipeline CSC basado en fases reales/derivadas
  - stuck assets por tarea y fase, no por proyecto agregado

### Creative Hub task reclassified to runtime v2
- `Creative Hub` fue contrastado contra arquitectura y contra el runtime real del repo:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_SERVICE_MODULES_V1.md`
  - `Greenhouse_Capabilities_Architecture_v1.md`
- El resultado confirmó que el módulo sí está bien ubicado como `capability surface`, pero no está completo respecto del brief original.
- Se reclasificó la task:
  - `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md` queda como brief histórico
  - `docs/tasks/to-do/CODEX_TASK_Creative_Hub_Module_v2.md` pasa a ser el brief activo orientado a cierre runtime
- Gaps documentados en la `v2`:
  - activación demasiado amplia del módulo
  - ausencia real de la capa `Brand Intelligence`
  - `CSC Pipeline Tracker` todavía heurístico

### HR core backend foundation and task v2
- `HR Core Module` dejó de tratarse como brief pendiente únicamente greenfield:
  - `docs/tasks/complete/CODEX_TASK_HR_Core_Module.md` queda como referencia histórica
  - `docs/tasks/complete/CODEX_TASK_HR_Core_Module_v2.md` pasa a ser la task activa orientada a runtime/backend
- La task fue contrastada antes de implementar contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Se implementó la primera foundation backend real del dominio:
  - `ensureHrCoreInfrastructure()` extiende `team_members` y crea `departments`, `member_profiles`, `leave_types`, `leave_balances`, `leave_requests`, `leave_request_actions` y `attendance_daily`
  - `scripts/setup-hr-core-tables.sql` queda como referencia SQL versionada
  - se seedó el rol `employee` con route group `employee`
- Se agregó la superficie backend operativa:
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
- Se documentó la nueva variable:
  - `HR_CORE_TEAMS_WEBHOOK_SECRET`
  - agregada en `.env.example` y `.env.local.example`

### AI tooling backend foundation and task v2
- `AI Tooling & Credit System` dejó de tratarse como brief pendiente puramente greenfield:
  - `docs/tasks/complete/CODEX_TASK_AI_Tooling_Credit_System.md` queda como referencia histórica
  - `docs/tasks/complete/CODEX_TASK_AI_Tooling_Credit_System_v2.md` pasa a ser la task activa orientada a runtime/backend
- La task fue contrastada antes de implementar contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `FINANCE_CANONICAL_360_V1.md`
- Se implementó la primera foundation backend real del dominio:
  - `ensureAiToolingInfrastructure()` para bootstrap on-demand de `providers`, `ai_tool_catalog`, `member_tool_licenses`, `ai_credit_wallets` y `ai_credit_ledger`
  - `scripts/setup-ai-tooling-tables.sql` como referencia SQL versionada del mismo modelo
  - registro runtime inicial de `greenhouse.providers.provider_id`
- Se agregó la superficie backend operativa:
  - `GET /api/ai-tools/catalog`
  - `GET /api/ai-tools/licenses`
  - `GET /api/ai-credits/wallets`
  - `GET /api/ai-credits/ledger`
  - `GET /api/ai-credits/summary`
  - `POST /api/ai-credits/consume`
  - `POST /api/ai-credits/reload`
  - `GET /api/admin/ai-tools/meta`
  - `GET/POST /api/admin/ai-tools/catalog`
  - `GET/PATCH /api/admin/ai-tools/catalog/[toolId]`
  - `GET/POST /api/admin/ai-tools/licenses`
  - `GET/PATCH /api/admin/ai-tools/licenses/[licenseId]`
  - `GET/POST /api/admin/ai-tools/wallets`
  - `GET/PATCH /api/admin/ai-tools/wallets/[walletId]`
- `FINANCE_CANONICAL_360_V1.md` quedó alineado con la nueva realidad runtime:
  - `greenhouse.providers` ya no es solo un objeto futuro de arquitectura
  - `fin_suppliers` se mantiene como extensión financiera del provider, no como identidad universal del vendor

### Admin team backend complement freeze
- `Admin Team Module v2` fue contrastado contra arquitectura antes de extender backend:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- El resultado confirmó que el módulo sigue alineado:
  - `Admin Team` owning roster/assignment writes
  - `People` conservado como read-first
  - `team_members.member_id` mantenido como ancla canónica
- Se agregaron superficies backend propias de Admin Team para no depender solo de `People`:
  - `GET /api/admin/team/members` ahora devuelve metadata + `members` + `summary`
  - `GET /api/admin/team/members/[memberId]`
  - `GET /api/admin/team/assignments`
  - `GET /api/admin/team/assignments/[assignmentId]`
- Se endureció la alineación con identidad:
  - cuando el colaborador ya tiene `identity_profile_id`, `Admin Team` ahora sincroniza best-effort `azureOid`, `notionUserId` y `hubspotOwnerId` hacia `greenhouse.identity_profile_source_links`

### HR payroll v3 backend complement freeze
- `HR Payroll v3` fue contrastada contra arquitectura antes de tocar backend:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- El resultado confirmó que la task sigue alineada con el modelo canónico:
  - `Payroll` mantiene ownership de compensaciones, períodos y entries
  - el colaborador sigue anclado a `greenhouse.team_members.member_id`
- Se cerraron complementos backend para que frontend pueda avanzar sin inventar contratos:
  - `GET /api/hr/payroll/compensation` ahora devuelve `compensations`, `eligibleMembers`, `members` y `summary`
  - `GET /api/hr/payroll/compensation/eligible-members`
  - `GET /api/hr/payroll/periods` ahora devuelve `periods` + `summary`
  - `GET /api/hr/payroll/periods/[periodId]/entries` ahora devuelve `entries` + `summary`
  - `GET /api/hr/payroll/members/[memberId]/history` ahora incluye `member` y devuelve `404` si el colaborador no existe
- Se agregó `src/lib/payroll/get-payroll-members.ts` como capa server-side para:
  - summary canónico de colaborador
  - discovery de colaboradores activos y elegibilidad de compensación vigente

### Finance backend runtime closure and task v2
- `Financial Module` dejó de tratarse como brief greenfield activo:
  - `docs/tasks/complete/CODEX_TASK_Financial_Module.md` queda como referencia histórica
  - `docs/tasks/to-do/CODEX_TASK_Financial_Module_v2.md` pasa a ser el brief vigente para cierre runtime/backend y handoff con frontend
- Se agregó backend operativo para cerrar conciliación y egresos especializados:
  - `GET /api/finance/reconciliation/[id]/candidates`
  - `POST /api/finance/reconciliation/[id]/exclude`
  - `GET /api/finance/expenses/meta`
  - `GET /api/finance/expenses/payroll-candidates`
- Se endureció la consistencia de conciliación:
  - `auto-match` ahora también marca `fin_income` / `fin_expenses` como reconciliados cuando aplica
  - `match`, `unmatch` y `exclude` sincronizan el estado entre `fin_bank_statement_rows` y la transacción financiera target
  - `GET /api/finance/reconciliation/[id]` ahora devuelve `matchStatus` normalizado y `rawMatchStatus`
- `POST /api/finance/expenses` ahora también acepta los campos especializados que ya existían en schema:
  - previsión
  - impuestos
  - categoría de varios
- `project_context.md` y `docs/architecture/FINANCE_CANONICAL_360_V1.md` quedaron actualizados para reflejar esta capa backend nueva.

### HR payroll brief split: baseline vs runtime gaps
- `CODEX_TASK_HR_Payroll_Module_v2.md` dejó de tratarse como brief vigente greenfield y quedó marcado como referencia histórica de la implementación base.
- Se creó `docs/tasks/to-do/CODEX_TASK_HR_Payroll_Module_v3.md` como brief activo para cerrar los gaps reales del módulo actual:
  - alta inicial de compensación desde UI
  - edición visible de metadata del período en `draft`
  - fallback manual de KPI y override de entry en la vista de nómina
  - ficha de colaborador útil aun sin payroll cerrado
- `docs/tasks/README.md` quedó alineado para que `HR Payroll` vuelva a figurar como trabajo `in-progress` en vez de task cerrada por completo.

### Codex task board operational panels
- `docs/tasks/` dejó de funcionar como carpeta plana y ahora se organiza como tablero operativo con paneles:
  - `docs/tasks/in-progress/`
  - `docs/tasks/to-do/`
  - `docs/tasks/complete/`
- `docs/tasks/README.md` quedó como vista maestra del board y la referencia obligatoria para saber qué task está activa, pendiente o ya absorbida/histórica.
- La clasificación inicial se hizo contrastando repo real + `project_context.md` + `Handoff.md` + `changelog.md`, para no mover briefs solo por intuición.
- Se corrigió `.gitignore` para que los `CODEX_TASK_*` bajo `docs/tasks/**` vuelvan a quedar versionables; el patrón ignorado ahora aplica solo a scratch files en raíz.
- `README.md`, `AGENTS.md` y `project_context.md` quedaron alineados a esta convención nueva.

### Provider canonical object alignment
- La arquitectura 360 ahora reconoce `Provider` como objeto canónico objetivo para vendors/plataformas reutilizables entre AI Tooling, Finance, Identity y Admin.
- Se documentó la relación recomendada:
  - ancla objetivo `greenhouse.providers.provider_id`
  - `fin_suppliers` como extensión financiera del Provider, no como identidad global del vendor
  - `vendor` libre permitido solo como snapshot/display label, no como relación primaria reusable
- Se alineó la task `AI Tooling & Credit System` para que el catálogo de herramientas guarde `provider_id` y no nazca acoplado a vendors en texto libre.
- `docs/architecture/FINANCE_CANONICAL_360_V1.md` ahora también deja explícita la distinción operativa entre `Supplier` y `Provider` para que Finance no siga funcionando como identidad vendor global por omisión.

### Codex task architecture gate
- La gobernanza de `CODEX_TASK_*` quedó endurecida:
  - toda task nueva, reactivada o retomada debe revisarse obligatoriamente contra la arquitectura antes de implementarse
  - mínimo obligatorio: `GREENHOUSE_ARCHITECTURE_V1.md` y `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - además, cada task debe contrastarse con la arquitectura especializada aplicable
- La regla quedó documentada en:
  - `AGENTS.md`
  - `docs/tasks/README.md`
  - `docs/README.md`

### Greenhouse 360 object model
- Se formalizó una regla transversal de arquitectura para todo el portal en `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`:
  - Greenhouse debe evolucionar sobre objetos canónicos enriquecidos, no sobre módulos con identidades paralelas por silo
  - se definieron los anclajes y reglas base para `Client`, `Collaborator`, `Product/Capability`, `Quote`, `Project` y `Sprint`
  - `Finance` queda explícitamente tratado como una especialización de este modelo, no como una excepción local
- Se alinearon docs existentes de arquitectura para evitar contradicciones con ese modelo, especialmente en:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `MULTITENANT_ARCHITECTURE.md`
  - `GREENHOUSE_SERVICE_MODULES_V1.md`
  - `Greenhouse_Capabilities_Architecture_v1.md`
- Se alinearon también las tasks con mayor riesgo de deriva para que futuros desarrollos no reintroduzcan silos:
  - `Financial Module`
  - `AI Tooling & Credit System`
  - `Creative Hub`
  - `HR Payroll v2`
  - `People Unified View v2`
  - `Team Identity & Capacity`
  - `Agency Operator Layer`
  - `Admin Team v2`

### Finance staging runtime stabilization
- Se endureció el bootstrap runtime de `Finance` para no agotar cuota de BigQuery en lecturas:
  - `ensureFinanceInfrastructure()` ya no ejecuta `ALTER`/`UPDATE`/`MERGE` de forma ciega en cada request
  - ahora inspecciona `INFORMATION_SCHEMA` y solo crea tablas o columnas faltantes
  - el seed de `finance_manager` pasa a `INSERT` solo si el rol no existe
- `GET /api/finance/clients` dejó de depender de subqueries correlacionadas no soportadas por BigQuery:
  - receivables y cantidad de facturas activas ahora salen de un rollup por `JOIN`
  - con esto se corrige el `500` que dejaba `/finance/clients` sin clientes en `develop`/`Staging`
- Se volvió a endurecer el directorio de clientes para evitar fallas silenciosas:
  - la lista ahora se apoya primero en `greenhouse.clients` y trata HubSpot + `fin_income` como enriquecimientos opcionales
  - si falla `hubspot_crm.companies`, el endpoint cae a modo degradado y sigue devolviendo clientes base
  - si falla el rollup de receivables, la vista sigue cargando clientes con KPIs financieros en `0`
  - `ClientsListView` ya no interpreta errores backend como “no hay clientes”; ahora muestra un `Alert` explícito cuando `/api/finance/clients` responde no-`ok`
- El modal `Registrar ingreso` quedó alineado con esa misma fuente:
  - vuelve a cargar `/api/finance/clients` con `cache: 'no-store'` cada vez que se abre
  - deja visible el error real si el dropdown no puede hidratar clientes
  - envía también `clientId` y `clientProfileId` del cliente seleccionado al crear el ingreso, evitando perder la referencia canónica cuando falta `hubspotCompanyId`

### Finance canonical backend phase
- El backend de `Finance` avanzó desde referencias parciales a llaves canónicas sin romper contratos existentes:
  - `clients` ahora prioriza `greenhouse.clients.client_id` como anclaje principal y conserva fallback por `client_profile_id` / `hubspot_company_id`
  - `POST /api/finance/clients` y `/api/finance/clients/sync` ya rellenan `client_id` en `fin_client_profiles` cuando el tenant es resoluble
  - `income` y `expenses` ya pasan por resolución canónica de cliente antes de persistir
  - los egresos también validan y resuelven relación `memberId` / `payrollEntryId` antes de escribir
  - inconsistencias explícitas entre referencias financieras ahora responden `409`
  - referencias canónicas inexistentes (`clientId`, `clientProfileId`, `hubspotCompanyId`, `memberId`) ya no se aceptan silenciosamente
  - `GET /api/finance/clients` corrigió un bug en los filtros `requiresPo` / `requiresHes`
- Se agregó una nueva lectura financiera de colaborador:
  - `GET /api/people/[memberId]/finance`
  - devuelve summary, assignments, identities, payroll history y expenses asociados al colaborador
  - el endpoint fuerza bootstrap de infraestructura financiera antes de consultar `fin_expenses`
- Validación ejecutada:
  - `pnpm exec eslint` sobre los archivos tocados: correcto
  - `git diff --check`: correcto
  - `pnpm exec tsc --noEmit --pretty false`: siguen presentes errores globales preexistentes de `.next-local/.next` y rutas SCIM faltantes
### Finance module backend hardening
- Se corrigieron varios desalineamientos críticos del módulo `Finance` en `feature/finance-module`:
  - `GET /api/finance/income/[id]` y `GET /api/finance/expenses/[id]` ya existen para detalle real
  - `POST /api/finance/income/[id]/payment` quedó implementado para registrar pagos parciales o totales y persistir `payments_received`
  - `POST /api/finance/expenses/bulk` quedó implementado para creación masiva de egresos
  - los `POST` de ingresos y egresos ahora generan IDs secuenciales `INC-YYYYMM-###` / `EXP-YYYYMM-###`
  - las transacciones en USD ya no aceptan `exchangeRateToClp = 0`; resuelven el snapshot desde `fin_exchange_rates` o fallan con error explícito
- La conciliación automática también quedó endurecida:
  - matching por monto + fecha con ventana de `±3 días`
  - resolución ambigua bloqueada cuando hay más de un candidato con la misma confianza
  - mejor uso de referencia + descripción para detectar coincidencias
- Se alinearon contratos de entrada del frontend con el backend:
  - drawers de clientes y proveedores ahora usan solo monedas `CLP/USD`
  - tax ID types y categorías de proveedores quedaron sincronizados con los enums server-side
  - `clients` y `suppliers` validan `paymentCurrency` / `taxIdType` en backend en vez de aceptar valores drifted
  - `finance_contacts` de clientes ya se escribe como JSON real con `PARSE_JSON(...)`
- La capa de clientes quedó más cerca del brief financiero:
  - `GET /api/finance/clients` ahora usa `greenhouse.clients` como base activa y enriquece con `hubspot_crm.companies` + `fin_client_profiles`
  - la lista expone nombre comercial HubSpot, dominio, país, línea de servicio, módulos, saldo por cobrar y cantidad de facturas activas
  - `GET /api/finance/clients/[id]` ahora devuelve company context, summary de cuentas por cobrar y deals read-only de HubSpot cuando el schema disponible los soporta
  - el enriquecimiento HubSpot se construye con introspección de columnas (`INFORMATION_SCHEMA`) para no asumir rígidamente nombres de campos en `companies`/`deals`
- Validación ejecutada:
  - `pnpm exec eslint` sobre los archivos tocados: correcto
  - `git diff --check`: correcto
  - `pnpm exec tsc --noEmit --pretty false`: sigue fallando por errores globales preexistentes en `.next` / SCIM, no por los cambios de Finance

### Admin team promoted to develop
- `feature/admin-team-crud` fue integrado en `develop` mediante el merge commit `ee2355b` para abrir la fase de validación compartida en `Staging`.
- La integración arrastra:
  - backend `Admin Team` bajo `/api/admin/team/*`
  - drawers admin dentro de `People`
  - endurecimiento de previews para evitar fallos por `NEXTAUTH_SECRET` y otras env vars faltantes
- Validación local post-merge: `eslint`, `tsc --noEmit` y `git diff --check` correctos.
- Se corrigieron tres detalles menores de frontend detectados en esa pasada:
  - grouping de imports en `src/views/greenhouse/people/PeopleList.tsx`
  - import no usado en `src/views/greenhouse/people/PersonLeftSidebar.tsx`
  - grouping de imports en `src/views/greenhouse/people/PersonView.tsx`

### Vercel ops skill hardening
- La skill local [vercel-operations](/Users/jreye/Documents/greenhouse-eo/.codex/skills/vercel-operations/SKILL.md) ahora deja explícito el patrón operativo que venía rompiendo previews en este repo:
  - verificar env vars branch-scoped antes de confiar en un Preview
  - tratar `next-auth NO_SECRET` como problema de infraestructura/env
  - no mover `pre-greenhouse` sin smoke previo de `/api/auth/session`
  - usar un playbook corto para errores de preview antes del login
- El objetivo es evitar repetir ciclos donde un deployment parece `Ready` pero se cae en runtime por `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GCP_PROJECT` o credenciales Google faltantes.

### Admin team preview promotion
- La rama `feature/admin-team-crud` ya quedó publicada en GitHub:
  - commit `f894eba`
  - PR: `https://github.com/efeoncepro/greenhouse-eo/pull/new/feature/admin-team-crud`
- Preview oficial de la rama confirmado en Vercel:
  - `https://greenhouse-2z503i2bu-efeonce-7670142f.vercel.app`
  - alias de rama: `https://greenhouse-eo-git-feature-admin-team-crud-efeonce-7670142f.vercel.app`
- `pre-greenhouse.efeoncepro.com` fue repuntado a ese deployment para QA compartido del módulo `Admin Team`.

### Admin team preview hardening
- El backend de `Admin Team` quedó endurecido para desplegar en preview sin depender de `GCP_PROJECT` durante `module evaluation`.
- Se movió a lazy resolution el acceso a `getBigQueryProjectId()` en la capa nueva de admin y también en los helpers que todavía podían romper previews al colectar page data:
  - `src/lib/team-admin/mutate-team.ts`
  - `src/lib/payroll/*` relevantes para export, periods, compensation, entries, calculate, KPI fetch y persist
  - `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`
  - `src/lib/people/get-people-list.ts`
  - `src/lib/people/get-person-detail.ts`
  - `src/lib/people/get-person-operational-metrics.ts`
- También se corrigieron dos regressions de frontend que estaban tumbando `next build` en preview:
  - `src/components/Providers.tsx` ya no pasa `direction` a `AppReactToastify`
  - `src/views/greenhouse/people/drawers/EditProfileDrawer.tsx` normaliza `roleCategory` localmente
- Preview funcional confirmado:
  - `https://greenhouse-enzxjzyg9-efeonce-7670142f.vercel.app`
- Smoke sin sesión del módulo admin:
  - `GET /api/admin/team/meta`: `401 Unauthorized`
  - `GET /api/admin/team/members`: `401 Unauthorized`
- El primer deploy listo de la rama seguía devolviendo `500` por `next-auth NO_SECRET`; se resolvió para este deployment puntual inyectando runtime envs en el comando de deploy.

### Admin team backend foundation
- Se inició `Admin Team Module v2` en la rama `feature/admin-team-crud` con la primera capa backend de mutaciones.
- Nuevas rutas admin bajo `/api/admin/team/*`:
  - `GET /api/admin/team/meta`
  - `GET/POST /api/admin/team/members`
  - `PATCH /api/admin/team/members/[memberId]`
  - `POST /api/admin/team/members/[memberId]/deactivate`
  - `POST /api/admin/team/assignments`
  - `PATCH/DELETE /api/admin/team/assignments/[assignmentId]`
- Se agregó `src/lib/team-admin/mutate-team.ts` como helper server-side para:
  - crear y editar personas
  - desactivar personas y cerrar sus assignments activos
  - crear, reactivar, editar y desasignar assignments
  - registrar `audit_events` cuando la tabla existe
- `src/types/team.ts` ahora también exporta los contratos de mutación y records admin:
  - `CreateMemberInput`
  - `UpdateMemberInput`
  - `CreateAssignmentInput`
  - `UpdateAssignmentInput`
  - `TeamAdminMemberRecord`
  - `TeamAdminAssignmentRecord`
- El backend ya expone metadata estable para frontend admin:
  - `GET /api/admin/team/meta`
  - `GET /api/admin/team/members` como handshake compatible con la task
  - ambas respuestas incluyen `roleCategories`, `contactChannels` y `activeClients`
- Las validaciones de mutación se endurecieron desde el inicio:
  - duplicados de email se revisan contra `team_members` y `client_users`
  - no se crean assignments sobre tenants inactivos
  - si existe un assignment histórico para la misma combinación `clientId + memberId`, el backend lo reactiva en vez de duplicar la relación

### First production release
- `main` fue promovida por fast-forward desde `develop` y Greenhouse queda lanzado formalmente en producción.
- Deployment productivo validado:
  - commit release: `361d36e`
  - deployment: `dpl_7LZ3GcuYRp5oKubke42u8mvJuF2E`
  - URL: `https://greenhouse-ld2p73cqt-efeonce-7670142f.vercel.app`
  - dominio final: `https://greenhouse.efeoncepro.com`
- Smoke real en producción:
  - `/login`: correcto
  - `/api/people` sin sesión: `Unauthorized`
  - login real con `humberly.henriquez@efeonce.org`: correcto
  - `/api/auth/session`: correcto
  - `/api/people`: correcto
  - `/api/hr/payroll/periods`: `200 OK`

### People unified frontend
- Se implemento el frontend completo de `People Unified View v2` con 18 archivos nuevos.
- Lista `/people`: stats row (4 cards), filtros (rol, pais, estado, busqueda), tabla TanStack con avatar, cargo, pais, FTE, estado.
- Ficha `/people/[memberId]`: layout 2 columnas, sidebar izquierdo (avatar, contacto, metricas, integraciones), tabs dinamicos por rol.
- Tabs implementados: Asignaciones (read-only), Actividad (KPIs + breakdown), Compensacion (desglose vigente), Nomina (chart + tabla).
- Sidebar navigation: seccion "Equipo > Personas" visible por `roleCodes` (`efeonce_admin`, `efeonce_operations`, `hr_payroll`).
- Ghost slot en tab Asignaciones preparado para futuro Admin Team CRUD.

### People unified backend foundation
- Se implemento la primera capa backend read-only de `People Unified View v2` con dos rutas nuevas:
  - `GET /api/people`
  - `GET /api/people/[memberId]`
- Se agrego `src/types/people.ts` como contrato base para lista y ficha de persona.
- El contrato de detalle ya incluye metadata util para frontend sin recalculo cliente:
  - `access.visibleTabs`
  - `access.canViewAssignments`
  - `access.canViewActivity`
  - `access.canViewCompensation`
  - `access.canViewPayroll`
  - `summary.activeAssignments`
  - `summary.totalFte`
  - `summary.totalHoursMonth`
- Se agrego `src/lib/people/permissions.ts` como helper reusable para calcular visibilidad real de tabs segun roles.
- La nueva capa `src/lib/people/*` consolida:
  - roster y assignments desde `team_members` + `client_team_assignments`
  - integraciones desde `identity_profile_source_links`
  - actividad operativa desde `notion_ops.tareas`
  - compensacion y nomina desde payroll
- El match operativo del detalle de persona quedo endurecido:
  - sigue priorizando `notion_user_id`
  - ahora tambien reutiliza señales canonicas desde `identity_profile_source_links` para mejorar el fallback de actividad cuando falta o cambia el enlace principal
- `src/lib/tenant/authorization.ts` ahora expone `requirePeopleTenantContext()` y fija el acceso real del modulo a:
  - `efeonce_admin`
  - `efeonce_operations`
  - `hr_payroll`
- Queda ratificada la regla de arquitectura para evitar retrabajo:
  - `People` es lectura consolidada
  - el futuro CRUD de equipo no debe vivir bajo `/api/people/*`, sino bajo `/api/admin/team/*`

### People unified module integration
- El frontend y backend de `People` ya quedaron integrados y el modulo completo compila dentro del repo:
  - `/people`
  - `/people/[memberId]`
  - `/api/people`
  - `/api/people/[memberId]`
- La UI de detalle ya no recalcula permisos ni resumen localmente cuando el backend ya entrega esos datos:
  - `PersonTabs` usa `detail.access.visibleTabs`
  - `PersonLeftSidebar` usa `detail.summary`
- La navegacion interna ya expone `Personas` en el sidebar mediante `GH_PEOPLE_NAV`.
- El modulo ya fue publicado en preview desde `feature/hr-payroll`:
  - commit `a52c682`
  - preview `Ready`: `https://greenhouse-79pl7kuct-efeonce-7670142f.vercel.app`
  - branch alias: `https://greenhouse-eo-git-feature-hr-payroll-efeonce-7670142f.vercel.app`
- Smoke de preview sin sesion:
  - `/login` responde correctamente
  - `/api/people` y `/api/people/[memberId]` devuelven `Unauthorized`
  - `/people` redirige a `/login`
- QA autenticado real ya ejecutado por rol:
  - `efeonce_operations`: login correcto y acceso correcto a `/api/people` y `/api/people/[memberId]`
  - `efeonce_account`: login correcto pero `/api/people` responde `403 Forbidden`
  - `hr_payroll`: `Humberly Henriquez` fue provisionada con el rol y el preview ya la reconoce con `routeGroups ['hr','internal']`
  - `GET /api/hr/payroll/periods` con sesión `hr_payroll`: `200 OK`
- `pre-greenhouse.efeoncepro.com` fue re-asignado al deployment vigente de `feature/hr-payroll` (`greenhouse-79pl7kuct-efeonce-7670142f.vercel.app`) para QA compartido del modulo `People`.
- El módulo ya quedó integrado en `develop` y validado en `staging`:
  - merge `ad63aa5`
  - `dev-greenhouse.efeoncepro.com` ya apunta al deployment `dpl_EJqoBLEUZhqZiyWjpyJrh9PRWpHq`
  - smoke autenticado en `staging`: correcto para `People` y `HR Payroll`

### People unified view task alignment
- Se agrego `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md` como brief corregido y ejecutable para `People`, alineado al runtime real del repo.
- La nueva version elimina supuestos incorrectos del brief anterior:
  - no depende de `/admin/team` ni de `/api/admin/team/*`
  - no introduce un route group `people` inexistente
  - mapea permisos al auth real (`efeonce_admin`, `efeonce_operations`, `hr_payroll`)
  - reutiliza `location_country` en lugar de proponer una columna redundante `country`
- `docs/tasks/README.md` ya indexa la nueva task como referencia operativa.

### HR payroll backend hardening
- El backend de `HR Payroll` ya quedó operativo y validado con `pnpm build`, incluyendo las rutas `/api/hr/payroll/**` dentro del artefacto de producción.
- Se endureció la capa server-side de payroll para evitar estados inconsistentes:
  - validación estricta de números y fechas en compensaciones, períodos y edición de entries
  - bloqueo de actualización de `payroll_periods` cuando el período ya no está en `draft`
  - validación final de reglas de bono antes de aprobar una nómina
- `compensation_versions` ahora inserta nuevas versiones sin solapes de vigencia y mantiene `is_current` coherente cuando existe una versión futura programada, reduciendo riesgo de cálculos históricos o programados inconsistentes.
- La auditoría de creación de compensaciones ya prioriza el email de sesión y no solo el `userId` interno cuando el actor está autenticado.
- El smoke runtime contra BigQuery real ya quedó ejecutado:
  - `notion_ops.tareas` confirmó los campos productivos usados por payroll (`responsables_ids`, `rpa`, `estado`, `last_edited_time`, `fecha_de_completado`, `fecha_límite`)
  - el bootstrap `greenhouse_hr_payroll_v1.sql` ya fue aplicado en `efeonce-group.greenhouse`
  - existen en BigQuery real las tablas `compensation_versions`, `payroll_periods`, `payroll_entries`, `payroll_bonus_config` y el rol `hr_payroll`
- `fetch-kpis-for-period.ts` quedó corregido para soportar columnas acentuadas reales del dataset y el DDL de payroll se ajustó para no depender de `DEFAULT` literales incompatibles en este bootstrap de BigQuery.
- Se agregó el runbook [docs/operations/HR_PAYROLL_BRANCH_RESCUE_RUNBOOK_V1.md](docs/operations/HR_PAYROLL_BRANCH_RESCUE_RUNBOOK_V1.md) para rescatar y reubicar trabajo no committeado de payroll en una rama propia sin usar un flujo riesgoso de `stash -> develop -> apply`.

### GitHub collaboration hygiene
- El repo ahora incorpora `.github/` con una capa minima de colaboracion y mantenimiento:
  - `workflows/ci.yml`
  - `PULL_REQUEST_TEMPLATE.md`
  - `ISSUE_TEMPLATE/*`
  - `dependabot.yml`
  - `CODEOWNERS`
- Se agregaron `.github/SECURITY.md` y `.github/SUPPORT.md` para separar reporte de vulnerabilidades del soporte operativo normal.
- `README.md` y `CONTRIBUTING.md` ahora explicitan el flujo GitHub real del proyecto: PRs, CI, templates y soporte.
- `.gitignore` ya no marca `full-version/` como ignorado, evitando contradiccion con el hecho de que hoy esa referencia si esta versionada en el workspace.
- Se elimino la copia accidental `scripts/mint-local-admin-jwt (1).js` para limpiar higiene del repo.

### Markdown documentation reorganization
- La raiz del repo ahora queda reservada para onboarding GitHub y continuidad operativa: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `project_context.md`, `Handoff.md`, `Handoff.archive.md` y `changelog.md`.
- Se movieron specs, roadmap, guides y `CODEX_TASK_*` a `docs/` bajo una taxonomia estable:
  - `docs/architecture/`
  - `docs/api/`
  - `docs/ui/`
  - `docs/roadmap/`
  - `docs/operations/`
  - `docs/tasks/`
- Se agregaron `docs/README.md` y `docs/tasks/README.md` como indices navegables.
- `README.md`, `AGENTS.md` y `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` ahora explicitan el layout documental nuevo.

### Agency spaces data hydration and avatars
- `src/lib/agency/agency-queries.ts` dejo de filtrar `greenhouse.clients` por una columna inexistente (`tenant_type`) y ahora arma el inventario agency desde clientes activos reales.
- La salud de spaces ahora combina proyectos Notion, scopes de usuario y staffing Greenhouse para que `/agency/spaces` y la tabla de `/agency` no queden casi vacias cuando un space tiene poca senal operativa en `notion_ops`.
- `SpaceCard` y `SpaceHealthTable` ahora muestran contexto complementario por space: proyectos, personas asignadas, FTE y usuarios, manteniendo los KPI operativos visibles sin inventar datos.
- `getAgencyCapacity()` ahora trae `avatar_url`, `role_category` y breakdown por space desde `greenhouse.team_members` + `greenhouse.client_team_assignments`.
- `/agency/capacity` ya reutiliza `TeamAvatar`, por lo que el equipo Efeonce vuelve a mostrar fotos reales en lugar de solo iniciales.
- Validacion cerrada:
  - `pnpm exec eslint src/lib/agency/agency-queries.ts src/components/agency/CapacityOverview.tsx src/components/agency/SpaceCard.tsx src/components/agency/SpaceHealthTable.tsx`
  - `pnpm build`
  - consulta runtime real a BigQuery: `space-efeonce` vuelve con `57` proyectos, `7` personas y `7` FTE; capacidad devuelve `avatarUrl` reales para el roster.

## 2026-03-13

### Agency operator layer
- Se integro la primera capa agency sobre `develop` con rutas autenticadas para lectura global interna:
  - `/agency`
  - `/agency/spaces`
  - `/agency/capacity`
- Se agregaron endpoints dedicados:
  - `GET /api/agency/pulse`
  - `GET /api/agency/spaces`
  - `GET /api/agency/capacity`
- `VerticalMenu` ahora muestra una seccion `Agencia` para usuarios con acceso `internal/admin`, sin afectar login, settings ni Google SSO.
- `src/lib/agency/agency-queries.ts` ya resuelve KPIs, salud de spaces y capacidad global desde BigQuery reutilizando `greenhouse.clients`, `greenhouse.client_service_modules`, `greenhouse.team_members`, `greenhouse.client_team_assignments` y `notion_ops`.
- La integracion sobre `develop` se valido con `pnpm exec eslint` y `pnpm build` despues de corregir errores menores de estilo que venian en la rama original.

### Pulse team view correction
- `Pulse` dejo de usar la lectura de `team/capacity` como base de la card principal y ahora renderiza la Vista 1 del task desde roster asignado (`getTeamMembers`).
- `src/components/greenhouse/TeamCapacitySection.tsx` se rehizo como `Tu equipo asignado`: lista compacta de personas con avatar, nombre, cargo, canal de contacto, FTE y ghost slot final.
- La zona derecha del bloque ahora muestra solo resumen contractual visible: FTE total, horas mensuales, linea de servicio y modalidad.
- El dashboard cliente y el `view-as` admin hidratan esta seccion server-side, eliminando el error de `Pulse` cuando la vista no podia resolver carga operativa desde un fetch cliente.
- Validacion ejecutada: `pnpm lint` y `pnpm build`.

### Team capacity views closeout
- Se ejecuto `docs/tasks/complete/CODEX_TASK_Fix_Team_Capacity_Views.md` en la rama paralela `fix/team-capacity-views-vuexy`, priorizando composicion con primitives activas de Vuexy/MUI ya presentes en el repo.
- `src/components/greenhouse/TeamCapacitySection.tsx` ahora distingue entre capacidad contractual y metricas operativas reales: si BigQuery no trae columnas operativas, ya no inventa breakdowns por persona ni chips de actividad.
- `Pulse` gano un resumen lateral mas ejecutivo con `HorizontalWithSubtitle`, barra de utilizacion contextual y una lectura contractual mas clara para cada miembro.
- Se agrego `TeamExpansionGhostCard` como primitive reusable para el CTA de ampliacion del equipo y se reutilizo tanto en `Pulse` como en `Mi Greenhouse`.
- La iteracion visual siguiente compacto `Pulse` aun mas hacia el layout del task: lista vertical densa por persona, ghost slot tipo fila, columna derecha sin estiramiento artificial y CTA de capacidad menos agresivo.
- La ronda quedo validada con `pnpm lint` y `pnpm build`.

### Google SSO foundation
- El login ahora soporta Google OAuth (`next-auth/providers/google`) ademas de Microsoft y credenciales, manteniendo `greenhouse.client_users` como principal canonico del portal.
- `src/lib/tenant/access.ts` ahora puede resolver y enlazar identidad Google (`google_sub`, `google_email`) y reusa el mismo criterio de elegibilidad SSO para cuentas `active` o `invited`.
- `/login` ahora muestra un CTA secundario `Entrar con Google` y `/settings` expone el estado de vinculacion de Microsoft y Google desde la misma card de identidad.
- `scripts/setup-bigquery.sql`, `.env.example`, `.env.local.example` y `README.md` ya documentan las columnas nuevas y las variables `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- El delta ya fue aplicado en infraestructura real:
  - BigQuery: `greenhouse.client_users` ahora tiene `google_sub` y `google_email`
  - GCP: existe el OAuth client `greenhouse-portal`
  - Vercel: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` quedaron cargados en `Development`, `staging`, `Production`, `Preview (develop)` y `Preview (feature/google-sso)`
  - Preview validado del branch: `greenhouse-eo-git-feature-google-sso-efeonce-7670142f.vercel.app`
- Regla operativa ratificada: `allowed_email_domains` no auto-crea principals durante Google SSO; solo sirve como pista operativa de provisioning cuando no existe un `client_user` explicito.

### Google SSO safe develop preview
- Se preparo una rama merge-safe sobre la punta real de `develop`: `fix/google-sso-develop-safe`.
- El delta seguro contra `develop` se limito a auth/login/settings, setup SQL, env examples y documentacion; no entra ningun archivo del rediseño de team.
- Vercel ya tiene un bloque dedicado `Preview (fix/google-sso-develop-safe)` con `GCP_PROJECT`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
- `pre-greenhouse.efeoncepro.com` se re-apunto al deployment `greenhouse-eo-git-fix-google-sso-develop-safe-efeonce-7670142f.vercel.app`.
- Validacion remota cerrada:
  - `/api/auth/providers` en el branch safe y en `pre-greenhouse` devuelve `azure-ad`, `google` y `credentials`
  - `/login` en `pre-greenhouse` ya renderiza `Entrar con Google`

### Promote and deploy closeout
- La rama `fix/internal-nav-nomenclature-hydration` ya fue promovida a `develop` y luego a `main`.
- `pre-greenhouse.efeoncepro.com` fue re-apuntado manualmente al preview nuevo del branch despues de corregir el bloqueo de Preview por archivos duplicados `* (1).ts(x)`.
- `dev-greenhouse.efeoncepro.com` quedo actualizado sobre el deployment de `staging` generado desde `develop`.
- `greenhouse.efeoncepro.com` quedo actualizado sobre el deployment productivo generado desde `main`.

### Canonical team identity hardening
- `greenhouse.team_members` ahora queda enlazada a una identidad Greenhouse canonica via `identity_profile_id`, con `email_aliases` para resolver casos multi-dominio como `@efeonce.org` y `@efeoncepro.com`.
- `scripts/setup-team-tables.sql` ya no solo siembra roster y assignments: ahora tambien reconcilia perfiles y source links en `greenhouse.identity_profiles` e `identity_profile_source_links`.
- Julio dejo de quedar partido en dos perfiles activos: el perfil HubSpot legado se archiva y el roster apunta a un solo perfil canonico con links a `greenhouse_auth`, `azure_ad`, `hubspot_crm`, `notion` y `greenhouse_team`.
- El runtime de `src/lib/team-queries.ts` ya trata `greenhouse_auth` como principal interno y no como provider Microsoft; el resumen de providers queda listo para crecer a `Google`, `Deel` u otras fuentes futuras.
- Las 4 vistas live del task (`Mi Greenhouse`, `Pulse`, `Proyectos/[id]`, `Sprints/[id]`) tuvieron una pasada visual adicional para usar mejor `ExecutiveCardShell`, resumenes KPI y badges de identidad.

### Team profile taxonomy
- `greenhouse.team_members` ahora soporta una capa de perfil mas rica con nombre estructurado, taxonomia interna de rol/profesion, contacto laboral, ubicacion, trayectoria y bio profesional.
- Se agregaron `greenhouse.team_role_catalog` y `greenhouse.team_profession_catalog` como catalogos base para matching de talento y staffing por oficio, no solo por cargo visible.
- El seed actual ya asigna `org_role_id`, `profession_id`, `seniority_level`, `employment_type`, bio profesional e idiomas para el roster inicial sin inventar edad, telefono o ubicacion cuando no estaban confirmados.
- `/api/team/members` y el dossier visual ahora exponen y usan datos derivados como `ageYears`, `tenureEfeonceMonths`, `tenureClientMonths` y `profileCompletenessPercent`.
- El modelo canonico ya queda listo para enlazar mas adelante providers adicionales como `Frame.io` o `Adobe` via `identity_profile_source_links`, sin meterlos aun al runtime visible.

### Team identity and capacity runtime
- Se agregaron APIs dedicadas para equipo y capacidad en `/api/team/members`, `/api/team/capacity`, `/api/team/by-project/[projectId]` y `/api/team/by-sprint/[sprintId]`.
- `Mi Greenhouse`, `Pulse`, `Proyectos/[id]` y la nueva ruta `/sprints/[id]` ya consumen superficies dedicadas de equipo/capacidad en lugar de depender solo del override legacy del dashboard.
- `scripts/setup-team-tables.sql` ya no es solo DDL base: quedo como bootstrap idempotente via `MERGE` para `greenhouse.team_members` y `greenhouse.client_team_assignments`.
- El bootstrap ya fue aplicado en BigQuery real con `7` team members y `10` assignments seed para `space-efeonce` y `hubspot-company-30825221458`.
- La implementacion se alineo al schema real de `notion_ops.tareas` detectado en BigQuery: `responsables`, `responsables_ids`, `responsables_names` y `responsable_texto`, no a columnas ficticias `responsable_*`.
- La validacion final del repo para esta ronda ya quedo corrida con `pnpm lint` y `pnpm build`.

### Team identity task closeout
- La Vista 1 del task dejo de mostrar FTE individual dentro de cada card de persona para respetar el contrato del dossier.
- La Vista 3 se rehizo al patron pedido por el task: `AvatarGroup` compacto arriba y detalle expandible tabular por persona debajo.
- Se agregaron primitives visuales nuevas `TeamSignalChip` y `TeamProgressBar` para que los semaforos del modulo usen `GH_COLORS.semaphore` en vez de depender solo de los colores genericos de MUI.
- Los textos visibles que seguian hardcodeados en las 4 vistas del modulo se movieron a `GH_TEAM` / `GH_MESSAGES`.
- El documento `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` se alineo al contrato real de BigQuery y al repo correcto del pipeline (`notion-bigquery`).

### Tenant and user identity media
- Los placeholders de logo/foto en admin e internal ahora ya pueden persistir imagen real para spaces y usuarios.
- Se agregaron uploads autenticados server-side para:
  - `POST /api/admin/tenants/[id]/logo`
  - `POST /api/admin/users/[id]/avatar`
- Se agregaron proxies autenticados de lectura para no exponer buckets publicos:
  - `GET /api/media/tenants/[id]/logo`
  - `GET /api/media/users/[id]/avatar`
- La persistencia queda repartida entre:
  - `greenhouse.clients.logo_url` para logos de space/tenant
  - `greenhouse.client_users.avatar_url` para fotos de usuario
- El runtime ya refleja esas imagenes en detalle de tenant, detalle de usuario, listados admin, tabla interna de control tower, tabla de usuarios por tenant y dropdown de sesion.
- `tsconfig.json` ahora excluye archivos duplicados `* (1).ts(x)` para que previews de Vercel no queden bloqueadas por copias accidentales del workspace.

### Branding SVG rollout
- El shell autenticado y el favicon ahora consumen isotipos/wordmarks SVG oficiales de Efeonce en lugar del `avatar.png` heredado.
- Las business lines visibles del producto (`Globe`, `Reach`, `Wave`) ya pueden renderizar logos oficiales desde una capa reusable en `src/components/greenhouse/brand-assets.ts`.
- Los wordmarks de `Globe`, `Reach`, `Wave` y `Efeonce` ahora tambien viven en hero cliente, footers, tablas/capabilities internas y pantallas admin donde antes solo aparecia texto plano.

### Nomenclature boundary correction
- `src/config/greenhouse-nomenclature.ts` ya no mezcla la navegacion cliente del documento con labels de `internal/admin`; ahora separa `GH_CLIENT_NAV` y `GH_INTERNAL_NAV`.
- `VerticalMenu` ahora respeta la distribucion del documento para cliente: `Pulse`, `Proyectos`, `Ciclos`, `Mi Greenhouse` en ese orden y sin secciones artificiales intermedias.
- Las superficies `internal/admin` conservan su propia nomenclatura operativa (`Dashboard`, `Admin Tenants`, `Admin Users`, `Roles & Permissions`) sin sobrerrepresentarse como parte del contrato de `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`.

### Preview auth hardening
- `src/lib/bigquery.ts` ahora soporta `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` como fallback para Preview, ademas de tolerar mas shapes serializados del JSON crudo antes de abortar el login server-side.
- Queda ratificado que una Preview con login roto debe validarse contra alias actual y secretos serializados del branch, no solo contra `GOOGLE_APPLICATION_CREDENTIALS_JSON` plano.

### Vercel operations skill
- El repo ahora versiona `.codex/skills/vercel-operations/` como skill local para operar Vercel con criterio consistente.
- La skill documenta el uso de CLI para `link`, `logs`, `inspect`, `env`, `promote`, `rollback`, dominios protegidos y bypass de deployment protection.
- Tambien deja trazado el mapa operativo propio de Greenhouse en Vercel: `main` -> `Production`, `develop` -> `Staging`, ramas `feature/*`/`fix/*`/`hotfix/*` -> `Preview`, y el rol especial de `pre-greenhouse.efeoncepro.com`.

### Internal/admin branding lock and nav hydration
- El shell autenticado ahora recibe la sesion inicial en `SessionProvider`, evitando que `/internal/**` y `/admin/**` arranquen con el menu cliente y luego muten a labels legacy al hidratar.
- `VerticalMenu` y `UserDropdown` ya no hardcodean labels legacy, pero la nomenclatura cliente e internal/admin queda separada en contratos distintos dentro de `src/config/greenhouse-nomenclature.ts`.
- El runtime de settings ya no respeta `primaryColor`, `skin` ni `semiDark` legacy guardados en cookie cuando contradicen el branding Greenhouse; se preservan solo preferencias seguras como `mode`, `layout` y widths.
- `getSettingsFromCookie()` ahora sanea cookies invalidas o viejas antes de renderizar, reduciendo escapes de color/skin basicos de Vuexy entre SSR e hidratacion.

### Greenhouse nomenclature portal v3 rollout
- Se agrego `src/config/greenhouse-nomenclature.ts` como fuente unica de copy y tokens visibles del portal cliente, consolidando `GH_CLIENT_NAV`, `GH_LABELS`, `GH_TEAM`, `GH_MESSAGES` y `GH_COLORS`.
- La navegacion cliente ahora expone `Pulse`, `Proyectos`, `Ciclos` y `Mi Greenhouse`, incluyendo subtitulos en el sidebar vertical cuando el nav no esta colapsado.
- `/login`, `/dashboard`, `/proyectos`, `/sprints`, `/settings`, footers y dropdown de usuario ya consumen la nueva nomenclatura centralizada en lugar de labels legacy repartidos.
- Se saco una primera capa de hex hardcodeados de la UI cliente, especialmente en helpers del dashboard y en el modulo de equipo/capacidad.
- Quedo explicitado el boundary de theming: Greenhouse mantiene el sistema de tema oficial de Vuexy y no debe reemplazarlo con un theme custom paralelo.
- El branding del documento ya quedo conectado al runtime real del starter kit:
  - `primaryColorConfig` ahora usa `efeonce-core`
  - `mergedTheme.ts` ya inyecta la paleta Efeonce y la tipografia `DM Sans` + `Poppins`
  - `src/app/layout.tsx` ya carga esas fonts y `src/styles/greenhouse-sidebar.css`
- El sidebar vertical ahora usa fondo `Midnight Navy`, logo negativo y estados activos/hover alineados a la paleta Efeonce sin tocar `src/@core/**`.
- La capa cliente activa ya no deja el dashboard a medio camino de la nomenclatura:
  - `GreenhouseDashboard` movio subtitulos, empty states y chart copy a `GH_MESSAGES`
  - `ClientPortfolioHealthAccordion`, `ClientAttentionProjectsAccordion` y `ClientEcosystemSection` dejaron de hardcodear copy visible
  - `chart-options.ts` ya usa labels/totals/goals centralizados y colores Greenhouse para la donut cliente

### Creative Hub capability consolidation
- `Creative Hub` ya funciona como el primer modulo enriquecido del runtime declarativo de capabilities, agregando `Review pipeline` y `Review hotspots` sobre la misma snapshot cacheada de BigQuery.
- `CapabilityModuleData` ahora expone `cardData` keyed por `card.id`, y `src/components/capabilities/CapabilityCard.tsx` renderiza cada card desde su propio payload en lugar de depender de arrays globales del modulo.
- El card catalog activo del runtime se amplio con `metric-list` y `chart-bar`, manteniendo compatibilidad con `metric`, `project-list`, `tooling-list` y `quality-list`.
- La iteracion visual siguiente ya quedo aplicada sobre `Creative Hub` usando patrones Vuexy concretos de `full-version`: hero tipo `WebsiteAnalyticsSlider`, KPI cards con `HorizontalWithSubtitle`, quality card tipo `SupportTracker` y listas ejecutivas mas cercanas a `SourceVisits`.

### Capabilities declarative card layer
- `/capabilities/[moduleId]` ya renderiza sus bloques desde `data.module.cards` y no desde una composicion fija en la vista.
- Se agregaron `src/components/capabilities/CapabilityCard.tsx` y `src/components/capabilities/ModuleLayout.tsx` para despachar los card types activos del registry actual.
- `src/views/greenhouse/GreenhouseCapabilityModule.tsx` quedo reducido al hero y al layout declarativo del modulo.

### Capabilities dedicated query builders
- `GET /api/capabilities/[moduleId]/data` ya no depende del payload completo de `/dashboard`; ahora resuelve cada modulo via `src/lib/capability-queries/*` con una snapshot BigQuery mas chica y cacheada por tenant.
- Se agregaron query builders dedicados para `creative-hub`, `crm-command-center`, `onboarding-center` y `web-delivery-lab`, manteniendo la UI actual pero separando la lectura ejecutiva por lens de capability.
- Se agrego `verifyCapabilityModuleAccess()` para centralizar el guard reusable de modulo y devolver `403` cuando un cliente intenta forzar un module existente pero no contratado.
- `scripts/mint-local-admin-jwt.js` ahora puede resolver `NEXTAUTH_SECRET` desde `.env.local` o `.env.production.local`, dejando el smoke de preview mas autonomo.

### Capabilities admin preview and smoke
- Se agrego `/admin/tenants/[id]/capability-preview/[moduleId]` como superficie de validacion autenticada para revisar cada capability con contexto real de tenant desde una sesion admin.
- `src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx` ahora expone accesos directos a los modules resueltos para el tenant y `get-capability-module-data` soporta fallback al registry solo para esta preview admin.
- Se extrajo el contenido editorial de capabilities a `src/lib/capabilities/module-content-builders.ts` para separar registry/data resolution de la narrativa visual por modulo.
- Se agregaron `scripts/mint-local-admin-jwt.js` y `scripts/run-capability-preview-smoke.ps1`; el smoke real ya valido dashboard preview y `creative-hub` con respuesta `200` y screenshots en local.
- `tsconfig.json` dejo de incluir validators historicos de `.next-local/build-*`, estabilizando `npx tsc -p tsconfig.json --noEmit` frente a caches viejos de Next.

### Capabilities runtime foundation
- Se ejecuto la primera version funcional de `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md` sobre el runtime vigente del portal, sin reintroducir el modelo legacy de resolver capabilities desde `greenhouse.clients`.
- Se agregaron `src/config/capability-registry.ts`, `src/lib/capabilities/resolve-capabilities.ts` y `src/lib/capabilities/get-capability-module-data.ts` para resolver modules a partir de `businessLines` y `serviceModules` ya presentes en la sesion.
- Se agregaron:
  - `GET /api/capabilities/resolve`
  - `GET /api/capabilities/[moduleId]/data`
  - `/capabilities/[moduleId]`
- El sidebar vertical ahora muestra una seccion dinamica `Servicios` con modules activos del tenant:
  - `Creative Hub`
  - `CRM Command`
  - `Onboarding Center`
  - `Web Delivery`
- La data inicial de cada capability module reutiliza el contrato server-side del dashboard actual para exponer hero, metric cards, projects in focus, tooling y quality signal mientras los query builders dedicados quedan para una iteracion posterior.

## 2026-03-12

### Microsoft SSO foundation
- El login ahora soporta Microsoft Entra ID (`azure-ad`) y credenciales en paralelo sobre `greenhouse.client_users`, manteniendo el payload rico de roles, scopes y route groups del runtime actual.
- `src/lib/tenant/access.ts` ahora puede resolver y enlazar identidad Microsoft (`microsoft_oid`, `microsoft_tenant_id`, `microsoft_email`) y registra `last_login_provider` junto con `last_login_at`.
- `/login` prioriza Microsoft como CTA principal, `/auth/access-denied` cubre el rechazo de cuentas no autorizadas y `/settings` muestra el estado de vinculacion de la cuenta Microsoft.
- Se agregaron `bigquery/greenhouse_microsoft_sso_v1.sql` y `scripts/setup-bigquery.sql`; la migracion aditiva de columnas SSO ya fue aplicada en BigQuery real sobre `greenhouse.client_users`.

### Internal control tower redesign
- `/internal/dashboard` ahora funciona como una landing operativa real para Efeonce: header compacto, copy en espanol, acciones rapidas y una tabla de control con filtros, busqueda, paginacion y row actions.
- La vista ahora deriva automaticamente estados `Activo`, `Onboarding`, `Requiere atencion` e `Inactivo` usando `createdAt`, `lastLoginAt`, `scopedProjects`, `pendingResetUsers` y `avgOnTimePct`.
- Se agregaron `loading.tsx` y helpers locales para el control tower interno, y el contrato server-side ahora expone senales adicionales por cliente para priorizacion y OTD global.
- `Crear space`, `Editar` y `Desactivar` quedaron visibles pero sin mutacion real porque el repo aun no implementa ese workflow admin.

### Client dashboard redesign
- `/dashboard` y `/admin/tenants/[id]/view-as/dashboard` ahora usan una lectura cliente en 3 zonas: hero + 4 KPI cards, grid de 4 charts y detalle operativo abajo del fold.
- Se retiraron de la vista cliente los bloques de cocina operativa mas internos, incluyendo la lectura previa de `capacity`, el inventario declarativo de tooling por modulo y varias cards redundantes de calidad/entrega.
- El dashboard ahora agrega `loading.tsx`, `EmptyState`, `SectionErrorBoundary`, cadencia semanal de entregas y `RpA` por proyecto desde el mismo contrato server-side de BigQuery.
- El CTA de ampliacion del equipo y de ecosistema quedo como modal de solicitud copiable; aun no existe en el repo una mutacion real para notificar a un owner o webhook.

### Admin tenant detail redesign
- `/admin/tenants/[id]` dejo de ser un scroll lineal y ahora usa un header compacto con KPIs, acciones rapidas y tabs de `Capabilities`, `Usuarios`, `CRM`, `Proyectos` y `Configuracion`.
- La vista admin del tenant ahora reutiliza patrones Vuexy de header, tabs y tablas paginadas sobre la data real de Greenhouse, sin tocar la logica de governance ni los endpoints existentes.
- Se agregaron empty states, error boundary local y `loading.tsx` para que la superficie admin no exponga errores crudos ni flashes vacios durante la carga.

### Agent operations cleanup
- `Handoff.md` se compactó para dejar solo estado operativo vigente y el historial detallado quedó archivado en `Handoff.archive.md`.
- `project_context.md` se depuró para eliminar estado transaccional de ramas y smokes puntuales, y para dejar consistente el inventario de librerías visuales activas.
- `AGENTS.md`, `README.md` y `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` ahora explicitan la separación entre snapshot operativo y archivo histórico.

### Internal identity foundation
- Se agrego `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` para separar `auth principal` de `canonical identity` en usuarios internos Efeonce.
- Se versiono `bigquery/greenhouse_internal_identity_v1.sql` con:
  - `greenhouse.identity_profiles`
  - `greenhouse.identity_profile_source_links`
  - `greenhouse.client_users.identity_profile_id`
- Se agrego `scripts/backfill-internal-identity-profiles.ts` y se ejecuto sobre BigQuery real:
  - `2` auth principals internos Greenhouse enlazados a perfil canonico
  - `6` HubSpot owners internos sembrados como perfiles canonicos
  - `8` perfiles `EO-ID-*` creados
- `src/lib/ids/greenhouse-ids.ts` ahora deriva `EO-ID-*` para perfiles canonicos internos sin romper `EO-USR-*` para el principal de acceso.
- `/admin/users/[id]` ahora puede mostrar el `EO-ID` cuando el usuario tenga `identity_profile_id` enlazado.

### UI orchestration
- Se agrego `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md` como contrato canonico para seleccionar y promover patrones Vuexy/MUI en Greenhouse.
- Se agrego `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md` como primer catalogo curado de referencias `full-version` y primitives locales reutilizables.
- Se agrego `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md` para normalizar solicitudes de UI que vengan de personas, Claude, Codex u otros agentes antes de implementar.
- Se dejo un skill local base en `C:/Users/jreye/.codex/skills/greenhouse-ui-orchestrator` para reutilizar este flujo fuera de la memoria del repo.
- El repo ahora versiona una copia del skill en `.codex/skills/greenhouse-ui-orchestrator/` para que tambien quede disponible en GitHub.

### Build and deploy hygiene
- `starter-kit` ahora excluye `full-version/` y `demo-configs/` del scope de TypeScript, ESLint y Vercel deploy para que el runtime productivo no arrastre codigo de referencia ni demos.

## 2026-03-11

### Admin
- `/admin/tenants/[id]` ya no se queda solo en lectura live de contactos CRM: ahora permite provisionar en lote los contactos HubSpot faltantes hacia `greenhouse.client_users`.
- El provisioning de contactos ahora es rerunnable y de reconciliacion:
  - crea usuarios `invited` nuevos cuando no existen
  - repara rol `client_executive` y scopes base cuando el usuario del mismo tenant ya existia por `user_id` o por `email`
  - detecta duplicados ambiguos dentro del mismo tenant y los devuelve como conflicto en lugar de dejarlos pasar como `already_exists`
- La tabla de contactos CRM ahora distingue `Ya existe`, `Falta provisionar` y `Sin email`, y expone feedback del resultado de la corrida admin.
- El smoke real sobre `hubspot-company-30825221458` detecto y corrigio un bug de BigQuery en el alta de usuarios nuevos:
  - `upsertClientUser` ahora envia `types` explicitos para parametros `STRING` cuando `jobTitle` u otros campos llegan como `null`
  - despues del fix, el contacto `136893943450` (`valeria.gutierrez@skyairline.com`) quedo provisionado con `status=invited`, `auth_mode=password_reset_pending`, rol `client_executive` y `1` scope base
  - una segunda corrida sobre el mismo contacto devolvio `reconciled`, confirmando idempotencia funcional
- El tenant de Sky (`hubspot-company-30825221458`) ya quedo completamente provisionado en produccion:
  - `tenantUserCount = 16`
  - `liveContactCount = 16`
  - `missingCount = 0`
  - la corrida bulk creo o reconcilio el resto de contactos CRM con email
- Se valido tambien la experiencia cliente productiva con la cuenta demo `client.portal@efeonce.com`: login correcto, sesion `client_executive` y `/dashboard` respondiendo `200`.
- Se implemento una via escalable para el provisioning admin:
  - la pantalla admin usa un snapshot firmado de los contactos live leidos al cargar el tenant
  - el backend limita cada request a `4` contactos para evitar corridas largas atadas a una sola conexion HTTP
  - la UI ejecuta batches secuenciales y agrega progreso y feedback consolidado
  - si el snapshot firmado no existe o expira, el backend conserva fallback a lectura live directa desde la Cloud Run
- Este cambio busca mantener el boundary por tenant y la frescura del source CRM, pero bajar el riesgo operacional de timeouts en corridas bulk.
- Smoke del modelo escalable:
  - `ANAM` (`hubspot-company-27776076692`) tenia `5` contactos pendientes
  - una request de `5` IDs devolvio `400` por sobrepasar el limite del endpoint
  - dos requests secuenciales (`4 + 1`) con snapshot firmado devolvieron `created`
  - verificacion final: `missingCount = 0`

### Integrations
- Se auditaron todas las ramas activas y de respaldo; el unico trabajo funcional no absorbido quedo fijado en `reconcile/merge-hubspot-provisioning` y el rescate documental cross-repo en `reconcile/docs-cross-repo-contract`.
- Se verifico que `greenhouse-eo` ya consume la integracion creada en `hubspot-bigquery` mediante el servicio `hubspot-greenhouse-integration`, incluyendo `GET /contract` y `GET /companies/{hubspotCompanyId}/contacts`.
- Se agrego `src/lib/integrations/hubspot-greenhouse-service.ts` como cliente server-side para el servicio dedicado `hubspot-greenhouse-integration`.
- `/admin/tenants/[id]` ahora muestra contexto CRM live desde HubSpot para `company profile` y `owner`, con `fetch` `no-store` y timeout defensivo.
- `/admin/tenants/[id]` ahora tambien consume `GET /companies/{hubspotCompanyId}/contacts` para mostrar los contactos CRM asociados al space y compararlos con los usuarios ya provisionados en Greenhouse.
- El modelo de latencia quedo documentado: `company` y `owner` pueden reflejar cambios de HubSpot con baja latencia al consultar bajo demanda; `capabilities` siguen siendo sync-based hasta incorporar eventos o webhooks.
- Se agrego `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` a `.env.example` y a la documentacion viva como override del endpoint de Cloud Run.

### Dashboard
- El hero ejecutivo del dashboard se simplifico para bajar densidad arriba del fold: menos copy, dos highlights clave, summary rectangular y badges condensados.
- Las mini cards derechas del top fold dejaron de heredar altura artificial del hero y ahora se apilan en una columna proporcionada en desktop.
- `CapacityOverviewCard` ahora soporta variantes `default` y `compact`, manteniendo la version completa como principal y dejando listo el patron multi-formato.
- Se mejoro el UX writing del top fold y de `Capacity` para hacer la lectura mas corta, directa y consistente.
- Se agregaron mejoras de accesibilidad en hero y capacity: landmarks, ids accesibles, listas semanticas y labels explicitos para barras de allocation.

### Validacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Smoke local autenticado en `http://localhost:3100` con cuenta admin real: correcto
- `GET /admin/tenants/hubspot-company-30825221458`: `200`
- `POST /api/admin/tenants/hubspot-company-30825221458/contacts/provision`:
  - primer intento: detecto bug real de tipado `null` en BigQuery
  - segundo intento despues del fix: `created: 1`
  - tercer intento sobre el mismo contacto: `reconciled: 1`
- Produccion verificada despues de promover `develop` a `main`:
  - deployment productivo activo y aliases correctos
  - login admin productivo correcto
  - `GET /admin/tenants/hubspot-company-30825221458`: `200`
  - endpoint productivo de provisioning confirmado
  - corrida bulk productiva completada para Sky, con caveat de cierre prematuro de la conexion HTTP en corridas largas
- Smoke cliente productivo con `client.portal@efeonce.com`: correcto
- `lint` y chequeo de tipos del modelo escalable por batches: correctos
- `build` del worktree largo de Windows: bloqueado por limite de path/Turbopack fuera del alcance funcional del cambio
- Validacion visual local con login admin + `view-as` sobre `space-efeonce`: correcta
- Documento operativo `docs/ui/GREENHOUSE_DASHBOARD_UX_GAPS_V1.md` quedo reescrito con matriz de brechas, soluciones, seleccion y ejecucion final
## 2026-03-10

### Dashboard
- Se agrego `snapshot mode` para dashboards con historico corto, reemplazando charts grandes y vacios por una lectura ejecutiva compacta.
- Se extrajo `CapacityOverviewCard` como componente reusable y escalable para capacity/equipo asignado.
- Se agrego `layoutMode = snapshot | standard | rich` en el orquestador del dashboard para que la composicion se adapte a la densidad de datos del space.
- `CapacityOverviewCard` paso a una sola superficie con summary strip, roster responsive e insights compactos al pie.
- Los grids de KPI, focus, delivery, quality y tooling migraron a patrones mas fluidos con `minmax` para responder mejor al espacio disponible.

### Spaces
- Se definio el label visible `space` para superficies admin relacionadas con clientes, manteniendo `tenant` solo como termino interno.
- Se versiono `bigquery/greenhouse_efeonce_space_v1.sql` para sembrar `space-efeonce` como benchmark interno sobre el portfolio propio de Efeonce.
- El seed real aplicado en BigQuery deja a `space-efeonce` con 57 proyectos base y todos los business lines / service modules activos para validacion del MVP ejecutivo.

## 2026-03-09

### Infraestructura
- Se inicializo `starter-kit` como repositorio Git independiente y se publico en `https://github.com/efeoncepro/greenhouse-eo.git`.
- Se confirmo que `full-version` queda fuera del repo y no debe subirse.

### Deploy
- Se diagnostico un `404 NOT_FOUND` en Vercel.
- La causa fue configuracion incorrecta del proyecto en Vercel: `Framework Preset` estaba en `Other`.
- El despliegue quedo operativo al cambiar `Framework Preset` a `Next.js` y redeployar.
- Se conecto Vercel CLI al proyecto `greenhouse-eo`.
- Se confirmo el `Custom Environment` `staging` asociado a `develop`.
- Se cargaron `GCP_PROJECT` y `GOOGLE_APPLICATION_CREDENTIALS_JSON` en `Development`, `staging` y `Production`.

### Proyecto
- Se valido que el build local funciona con `npx pnpm build`.
- Se redefinio el shell principal del producto con rutas `/dashboard`, `/proyectos`, `/sprints`, `/settings` y `/login`.
- La ruta `/` ahora redirige a `/dashboard`.
- `/home` y `/about` quedaron como redirects de compatibilidad.
- Se reemplazaron menu, branding base, footer, logo, login y dropdown para reflejar Greenhouse en lugar de la demo de Vuexy.
- Se agrego `next-auth` con `CredentialsProvider`, proteccion base del dashboard, redirect de guest/authenticated y logout real.
- Se integraron assets reales de marca en la navegacion y se configuro el avatar temporal como favicon.
- Se agrego `@google-cloud/bigquery` al repo.
- Se implemento `src/lib/bigquery.ts` para acceso server-side a BigQuery.
- Se implemento `src/app/api/dashboard/kpis/route.ts` como primer endpoint real del portal.
- El dashboard principal ya consume datos reales de BigQuery para KPIs, estado de cartera y proyectos bajo observacion.
- El scope actual del tenant demo se controla con `DEMO_CLIENT_PROJECT_IDS` mientras se define la fuente multi-tenant real.
- Se creo el dataset `efeonce-group.greenhouse`.
- Se creo la tabla `greenhouse.clients` como base del modelo multi-tenant.
- Se cargo un tenant bootstrap `greenhouse-demo-client`.
- Se versiono el DDL en `bigquery/greenhouse_clients.sql`.
- Se agregaron `docs/architecture/MULTITENANT_ARCHITECTURE.md` y `docs/roadmap/BACKLOG.md` para dejar la arquitectura objetivo y el plan de avance.
- `next-auth` ya consulta `greenhouse.clients` para resolver el tenant por email.
- Se agrego `bcryptjs` para soportar `password_hash` reales cuando se carguen en la tabla.
- Se agrego actualizacion de `last_login_at` y helper reusable de tenant en runtime.
- Se implemento `src/app/api/projects/route.ts` como listado real de proyectos por tenant.
- La vista `/proyectos` ya consume datos reales de BigQuery con estados de carga y error.

### Documentacion Operativa
- Se agregaron `AGENTS.md`, `Handoff.md`, `changelog.md` y `project_context.md` para coordinacion multi-agente.
- Se definio la logica operativa de ramas, promotion flow y uso de ambientes `Development`, `Preview` y `Production` con Vercel.
- Se normalizo el encoding de `../Greenhouse_Portal_Spec_v1.md` para dejar la especificacion legible en UTF-8.
- Se alineo la documentacion interna del repo con la especificacion funcional del portal Greenhouse.
- Se reemplazo el `README.md` generico por documentacion real del proyecto Greenhouse.
- Se creo la rama `develop` y se dejo documentado el flujo `Preview -> Staging -> Production`.
- Se agrego `CONTRIBUTING.md` con el flujo de colaboracion y se reforzo `.gitignore` para secretos locales.

### Calidad de Repositorio
- Se agrego `.gitattributes` para fijar finales de linea `LF` en archivos de texto y reducir warnings recurrentes de `LF/CRLF` en Windows.
- Se verifico el staging de Git sin warnings de conversion despues de ajustar la politica local de `EOL`.
- Se reemplazaron scripts Unix `rm -rf` por utilidades cross-platform con Node.
- En Windows local, `build` paso a usar un `distDir` dinamico bajo `.next-local/` para evitar bloqueos recurrentes sobre `.next` dentro de OneDrive.
- Se dejo explicitada la regla de no correr `git add/commit/push` en paralelo para evitar `index.lock`.

## 2026-03-10

### Proyecto
- Se implementaron `/api/projects/[id]` y `/api/projects/[id]/tasks` con autorizacion por tenant usando `getTenantContext()`.
- Se agrego `/proyectos/[id]` con header de KPIs, tabla de tareas, review pressure y sprint context si existe.
- La vista `/proyectos` ahora navega al detalle interno del portal en lugar de usar el CTA temporal al workspace fuente.
- Se agrego `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` como documento maestro de arquitectura, roadmap, roles, rutas, datos y trabajo paralelo multi-agente.
- Se agrego `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md` como diseno tecnico detallado de Fase 1 para usuarios, roles, scopes, session payload y migracion auth.
- Se versiono `bigquery/greenhouse_identity_access_v1.sql` con el schema propuesto para `client_users`, roles, role assignments y scopes.
- Se aplico en BigQuery el schema de identidad y acceso V1 y se seeded `client_users`, `roles`, `user_role_assignments` y `user_project_scopes`.
- `next-auth` ahora prioriza `greenhouse.client_users` con fallback a `greenhouse.clients` para no romper el runtime durante la migracion.
- La sesion JWT ahora expone `userId`, `tenantType`, `roleCodes`, `primaryRoleCode`, `projectScopes`, `campaignScopes` y mantiene alias legacy de compatibilidad.
- Se agrego `bigquery/greenhouse_hubspot_customer_bootstrap_v1.sql` para bootstrap real de tenants y usuarios cliente desde HubSpot.
- Se importaron 9 companias cliente con al menos un `closedwon` como tenants Greenhouse y se creo 1 contacto cliente invitado por empresa.
- Se agrego `src/lib/tenant/authorization.ts` y las APIs cliente ahora validan `tenantType`, `routeGroups` y acceso a proyecto antes de consultar datos.
- Se creo el usuario admin interno `julio.reyes@efeonce.org` en `greenhouse.client_users` con rol activo `efeonce_admin` y auth `credentials`.
- Se retiro el fallback operativo a `greenhouse.clients`; el runtime auth ahora depende solo de `greenhouse.client_users` y tablas de role/scope.
- Se migro el demo client a `credentials` con `password_hash` bcrypt y se elimino la dependencia normal de `env_demo`.
- Se agregaron `/auth/landing`, `/internal/dashboard`, `/admin` y `/admin/users` con guards server-side por route group.
- Se versiono `bigquery/greenhouse_project_scope_bootstrap_v1.sql` y se aplicaron scopes bootstrap para DDSoft, SSilva y Sky Airline.
- Se reordeno `docs/roadmap/BACKLOG.md` por fases y streams paralelos alineados al nuevo plan maestro.
- Se actualizaron `README.md`, `project_context.md`, `docs/architecture/MULTITENANT_ARCHITECTURE.md` y `Handoff.md` para tomar el nuevo plan como referencia.
- Se desactivo el usuario demo `client.portal@efeonce.com` y se dejo el login sin bloque demo.
- Se creo y activo el admin interno `julio.reyes@efeonce.org` con rol `efeonce_admin` y home `/internal/dashboard`.
- El login ahora muestra un error de UI amigable y ya no expone mensajes internos como `tenant registry`.
- Se corrigio un fallo real de `Preview` donde Vercel entregaba `GOOGLE_APPLICATION_CREDENTIALS_JSON` en formatos distintos; `src/lib/bigquery.ts` ahora soporta JSON minified y JSON legacy escapado.
- Se agregaron logs minimos en `src/lib/auth.ts` para distinguir lookup, estado de usuario y mismatch de password cuando falle auth en runtime.
- Se confirmo que `pre-greenhouse.efeoncepro.com` debe validarse siempre contra el deployment aliasado actual antes de diagnosticar login o UI vieja.
- Se implemento el primer slice real de Fase 2: `/dashboard` ahora es una vista ejecutiva con charts estilo Vuexy sobre throughput, salud on-time, mix operativo, mix de esfuerzo y proyectos bajo atencion.
- Se agregaron `/api/dashboard/summary`, `/api/dashboard/charts` y `/api/dashboard/risks` como contratos iniciales del dashboard ejecutivo.
- Se incorporo `apexcharts@3.49.0` y `react-apexcharts@1.4.1` para alinear el dashboard con el stack de charts de `full-version`.
- Se agregaron `src/libs/ApexCharts.tsx` y `src/libs/styles/AppReactApexCharts.tsx` siguiendo el wrapper visual de Vuexy para tooltips, tipografia y estilos MUI.
- `src/lib/dashboard/get-dashboard-overview.ts` ahora entrega KPIs ejecutivos, series de throughput, mixes operativos y ranking de proyectos bajo atencion a partir de BigQuery.
- Se detecto y corrigio un bug de agregacion en portfolio health donde `healthy_projects` y `projects_at_risk` se multiplicaban por el join con tareas.
- Se dejo documentado en el repo el orden correcto de referencia Vuexy: `full-version` primero y documentacion oficial despues, especialmente para `ApexCharts` y `AppReactApexCharts`.
- Se dejo documentada la distincion entre el JWT/ACL generico de Vuexy y el modelo real de seguridad de Greenhouse: JWT como transporte de sesion y autorizacion multi-tenant resuelta server-side con roles y scopes desde BigQuery.
- Se dejo documentada la estrategia para reutilizar `User Management` y `Roles & Permissions` de Vuexy en `/admin`, incluyendo el uso futuro de `overview`, `security` y `billing-plans` como base para `/admin/users/[id]` e invoices del cliente.
- Se implemento `/admin/users/[id]` sobre BigQuery reutilizando la estructura de `user/view/*` de Vuexy con tabs `overview`, `security` y `billing` reinterpretados para contexto, acceso y futuro billing real.
- `/admin/users` ahora enlaza al detalle del usuario por `userId`.
- Se confirmo y documento el uso de la documentacion oficial de Vuexy como segunda fuente despues de `full-version`: `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/`.
- Se definio `service modules` como nuevo eje formal de arquitectura para condicionar navegacion, charts y vistas por servicios contratados del cliente.
- Se valido sobre BigQuery que `hubspot_crm.deals.linea_de_servicio` y `hubspot_crm.deals.servicios_especificos` ya contienen la base comercial necesaria para ese modelo.
- Se agregaron `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md` y `bigquery/greenhouse_service_modules_v1.sql` como contrato y DDL inicial de esta capacidad.
- Se agrego `bigquery/greenhouse_service_module_bootstrap_v1.sql` y se aplico bootstrap inicial de modulos sobre clientes HubSpot cerrados.
- `greenhouse.service_modules` quedo con 9 registros y `greenhouse.client_service_modules` con 22 asignaciones activas.
- `next-auth`, `TenantAccessRecord` y `getTenantContext()` ahora exponen `businessLines` y `serviceModules` para composicion actual del dashboard y futura extension a navegacion y billing.
- Se agrego `docs/roadmap/PHASE_TASK_MATRIX.md` como resumen operativo de tareas pendientes por fase.
- `/dashboard` ahora usa `businessLines` y `serviceModules` en runtime para componer hero, cards de foco y copy segun el servicio contratado del tenant.
- La vista del dashboard se extrajo a una capa reusable propia en `src/views/greenhouse/dashboard/*` para reutilizar cards, badges, headings y configuracion de charts en futuras vistas Greenhouse.
- Se creo `src/components/greenhouse/*` como capa compartida del producto para headings, stat cards, chip groups y listas metricas reutilizables mas alla del dashboard.

### Calidad
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Se promovio `feature/tenant-auth-bq` a `develop` y luego `develop` a `main`.
- `dev-greenhouse.efeoncepro.com` y `greenhouse.efeoncepro.com` quedaron actualizados al runtime de Fase 1.
- Se detecto que `staging` y `Production` tenian `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `NEXTAUTH_SECRET` mal cargados en Vercel.
- Se reescribieron esas variables en ambos ambientes y se redeployaron los deployments activos.
- Validacion final en `Production`:
  - `/login`: 200
  - `/api/auth/csrf`: 200
  - `POST /api/auth/callback/credentials` con `julio.reyes@efeonce.org`: 200
  - `/internal/dashboard`: correcto
  - `/admin/users`: correcto
- Smoke BigQuery de Fase 2:
  - scope bootstrap cliente `hubspot-company-30825221458`: correcto
  - helper `get-dashboard-overview` devolviendo KPIs, charts y proyectos bajo atencion: correcto

### Documentacion Operativa
- Se alinearon `README.md`, `docs/roadmap/BACKLOG.md` y `project_context.md` con el estado real de `feature/executive-dashboard-phase2`.
- Se retiro de esos artefactos el lenguaje que aun trataba auth y dashboard como trabajo futuro cuando ya existen en runtime.
- Se dejo explicitado que la siguiente promocion valida depende de revisar `Preview` antes de mergear a `develop`.
- Se verifico la alias de Preview de `feature/executive-dashboard-phase2` con `vercel inspect` y `vercel curl` sobre `/login`, `/api/auth/csrf`, `/dashboard` y `/admin/users`.
- Se agrego `/admin/tenants` y `/admin/tenants/[id]` como nuevo slice de governance y se actualizaron los artefactos vivos para reflejarlo.
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` y `docs/architecture/MULTITENANT_ARCHITECTURE.md` ahora explicitan que `tenant = client = company`, y que los usuarios son una relacion separada `1 tenant -> N users`.
- Se recupero la autenticacion local de GCP con `gcloud auth login --update-adc` para volver a validar BigQuery sin depender de secretos parseados a mano.
- Se documento `docs/ui/SKY_TENANT_EXECUTIVE_SLICE_V1.md` como iniciativa formal para Sky Airline.
- Quedo alineado en README, backlog, matriz, contexto, arquitectura y handoff que:
  - `on-time` mensual, tenure y entregables o ajustes por mes son factibles ahora para Sky
  - RpA mensual y `First-Time Right` siguen bloqueados por calidad de dato
  - equipo asignado, capacity, herramientas y AI tools requieren modelo nuevo antes de exponerse
- Se implemento el primer slice seguro de Sky en `/dashboard`.
- El dashboard ahora expone:
  - tenure de relacion desde primera actividad visible
  - `on-time` mensual agrupado por fecha de creacion
  - entregables visibles y ajustes cliente por mes
- Se mantuvo fuera de runtime:
  - RpA mensual
  - `First-Time Right`
  - equipo asignado
  - capacity
  - herramientas tecnologicas y AI tools
- Se hizo reusable y escalable el slice de Sky dentro del dashboard existente.
  - `getDashboardOverview()` ahora expone `accountTeam`, `tooling`, `qualitySignals`, `relationship` y `monthlyDelivery`.
  - Se agrego `src/lib/dashboard/tenant-dashboard-overrides.ts` para mezclar:
    - señal real de BigQuery
    - señales derivadas desde Notion
    - defaults por `serviceModules`
    - overrides controlados por tenant
  - Se crearon secciones reusables:
    - `DeliverySignalsSection`
    - `QualitySignalsSection`
    - `AccountTeamSection`
    - `ToolingSection`
  - Sky ya puede ver:
    - `on-time` mensual
    - tenure
    - entregables y ajustes por mes
    - account team y capacity inicial
    - herramientas tecnologicas
    - herramientas AI
    - `RpA` mensual y `First-Time Right` con origen explicito (`measured`, `seeded`, `unavailable`)
  - Validado con `npx pnpm lint` y `npx pnpm build`
- Se agrego la primera version de `Ver como cliente` para cuentas admin.
  - Nuevo CTA `Ver como cliente` en `GreenhouseAdminTenantDetail`.
  - Nueva ruta ` /admin/tenants/[id]/view-as/dashboard`.
  - La vista renderiza el dashboard real del tenant dentro de un preview admin con banner y retorno al detalle del tenant.
  - Validado con `npx pnpm lint` y `npx pnpm build`.
- Se agrego `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md` para fijar el sistema visual ejecutivo reusable del producto.
- Quedo alineado en README, arquitectura, backlog, matriz, contexto y handoff que el siguiente trabajo prioritario del dashboard es migrarlo a ese sistema reusable.
- Se fijo como regla que Vuexy analytics es referencia de jerarquia y composicion, no fuente para copiar branding, paleta ni semantica demo.
- `/dashboard` fue refactorizado hacia un layout ejecutivo Vuexy-aligned con hero reutilizable, mini stat cards, throughput overview, portfolio health y tabla compacta de proyectos bajo atencion.
- Se agrego `src/views/greenhouse/dashboard/orchestrator.ts` como capa deterministica para decidir el mix de bloques ejecutivos segun `serviceModules`, calidad de dato y capacidades disponibles.
- Se agregaron `ExecutiveCardShell`, `ExecutiveHeroCard` y `ExecutiveMiniStatCard` a `src/components/greenhouse/*` como primitives reusables para futuras superficies Greenhouse.
- Se fortalecio el skill local `greenhouse-vuexy-portal` para futuras decisiones UI/UX: ahora incluye una guia de seleccion de componentes Vuexy/MUI para avatars, card-statistics, theming, OptionMenu y orquestacion de dashboards.
- Se activaron `simple-icons` y `@iconify-json/logos` en `starter-kit` para reutilizar logos de marcas y herramientas sin depender de descargas manuales.
- Se agrego `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` para reducir duplicacion documental usando una fuente canonica por tema y deltas cortos en los documentos vivos.
- Se agrego `BrandLogo` como primitive reusable para tooling cards y se ampliaron los icon bundles de Vuexy con logos de marca curados.
- Se hizo operativo el switch de tema estilo Vuexy en Greenhouse: mejor integracion en navbar, labels localizados y reaccion en vivo al modo `system`.
- Se instalo en `starter-kit` la paridad de librerias UI de `full-version` para charts, calendars, tables, forms, editor, media, maps, toasts y drag/drop.

### 2026-03-11 - Capability governance and visual validation method
- Added `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md` to formalize the local visual QA workflow used for authenticated dashboard checks and `view-as` tenant reviews.
- Extended the tenant admin detail flow so `getAdminTenantDetail()` returns the capability catalog/state for each tenant.
- Added `src/lib/admin/tenant-capability-types.ts` and `src/lib/admin/tenant-capabilities.ts` as the canonical contract and server layer for:
  - reading tenant capability state
  - manual admin assignments
  - HubSpot-derived capability sync
  - generic source-based capability sync
- Added admin routes:
  - `GET /api/admin/tenants/[id]/capabilities`
  - `PUT /api/admin/tenants/[id]/capabilities`
  - `POST /api/admin/tenants/[id]/capabilities/sync`
- Added `TenantCapabilityManager` into `/admin/tenants/[id]` so admin users can assign or sync business lines and service modules directly from the tenant screen.
- Confirmed the current service-modules initiative is structurally viable because the existing BigQuery model already separates:
  - canonical capability metadata in `greenhouse.service_modules`
  - tenant assignments in `greenhouse.client_service_modules`
  - external commercial source signals in HubSpot deals
- Quality checks:
  - `npx pnpm lint`
  - `npx pnpm build`

### 2026-03-11 - Public identifier strategy
- Added `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md` to define the separation between internal keys and product-facing public IDs.
- Added `src/lib/ids/greenhouse-ids.ts` with deterministic public ID builders for:
  - tenants/spaces
  - collaborators/users
  - business lines
  - service modules
  - capability assignments
  - role assignments
  - feature flag assignments
- Extended admin tenant and user data contracts so the UI can expose readable IDs without leaking raw `hubspot-company-*` or `user-hubspot-contact-*` prefixes.
- Updated admin tenant detail, user detail, tenant preview, and capability governance UI to surface the new public IDs and service IDs.
- Added `bigquery/greenhouse_public_ids_v1.sql` as the versioned migration to add and backfill nullable `public_id` columns in the core governance tables.

### 2026-03-11 - Capability governance UX and source correction
- Reworked `TenantCapabilityManager` so the governance surface is now a full-width admin section with compact summary tiles, shorter Spanish copy, stronger text hierarchy, and a manual-first interaction model.
- Rebalanced `/admin/tenants/[id]` so tenant identity, validation CTA, and governance appear in a clearer order instead of pushing the editor into a narrow left rail.
- Removed automatic capability derivation from HubSpot `closedwon` deals in `POST /api/admin/tenants/[id]/capabilities/sync`.
- The sync route now requires explicit `businessLines` or `serviceModules` in the payload and treats the source as company-level or external metadata only.

### 2026-03-11 - Generic integrations API
- Added `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md` as the contract for external connectors.
- Added token-based integration auth via `GREENHOUSE_INTEGRATION_API_TOKEN`.
- Added generic routes under `/api/integrations/v1/*` so HubSpot, Notion, or any other connector can use the same surface:
  - `GET /api/integrations/v1/catalog/capabilities`
  - `GET /api/integrations/v1/tenants`
  - `POST /api/integrations/v1/tenants/capabilities/sync`
- The API is intentionally provider-neutral and resolves tenants by:
  - `clientId`
  - `publicId`
  - `sourceSystem` + `sourceObjectType` + `sourceObjectId`
- Current first-class source mapping is HubSpot company resolution through `hubspot_company_id`, but the contract is ready for additional systems.

### 2026-03-11 - Integrations API tenant listing fix
- Fixed `GET /api/integrations/v1/tenants` so BigQuery no longer receives untyped `NULL` params for `targetClientId` and `updatedSince`.
- The route now sends empty-string sentinels plus explicit BigQuery param types, avoiding the production `500` raised by `Parameter types must be provided for null values`.
- Validation:
  - `npx pnpm lint src/lib/integrations/greenhouse-integration.ts src/app/api/integrations/v1/tenants/route.ts`
  - `npx pnpm build`
- Deployed the fix to Production as `https://greenhouse-rd6xgomq7-efeonce-7670142f.vercel.app`.
- Post-deploy smoke outcome:
  - the `500` path is no longer the active failure mode
  - the production integration token currently configured for connectors still returns `401 Unauthorized` on `/api/integrations/v1/catalog/capabilities` and `/api/integrations/v1/tenants`
  - the remaining blocker is token/auth configuration, not the BigQuery null-parameter bug
- Rotated `GREENHOUSE_INTEGRATION_API_TOKEN` in Vercel Production and redeployed to `https://greenhouse-ojlumllrz-efeonce-7670142f.vercel.app`.
- Fixed the integration sync mutation path by adding explicit BigQuery param types in `src/lib/admin/tenant-capabilities.ts` for nullable merge params.
- Production verification after token rotation and redeploy:
  - `GET /api/integrations/v1/catalog/capabilities`: `200`
  - `GET /api/integrations/v1/tenants?limit=3`: `200`
  - `GET /api/integrations/v1/tenants?sourceSystem=hubspot_crm&sourceObjectType=company&sourceObjectId=30825221458`: `200`
  - `POST /api/integrations/v1/tenants/capabilities/sync`: no longer the active `500` blocker for the HubSpot bridge rollout
# 2026-03-13
- feat: se inicio la alineacion integral del portal a `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` con una capa canonica ampliada de copy en `src/config/greenhouse-nomenclature.ts` para cliente e `internal/admin`.
- feat: se agrego la ruta cliente `/updates` y su presencia en navegacion, footers y accesos secundarios del shell.
- feat: `Mi Greenhouse` ahora incorpora `Tu equipo de cuenta` como dossier relacional reutilizable y `Pulse` deja `Capacidad del equipo` como modulo operativo separado.
- feat: `Proyectos/[id]` y `Ciclos` fueron reescritos con microcopy Greenhouse, breadcrumbs cliente, estados vacios explicativos y modulos base del documento.
- feat: se extendio la canonizacion de copy operativa a `Control Tower`, tablas de usuarios, usuarios del space y detalle de usuario en `internal/admin`.
- feat: `admin/tenants/[id]`, `view-as/dashboard`, governance de capabilities y tabla de service modules ahora consumen copy operativa desde `GH_INTERNAL_MESSAGES` en lugar de labels dispersos.
# 2026-03-14
- chore: `pre-greenhouse.efeoncepro.com` fue re-asignado al preview `feature/hr-payroll` (`greenhouse-hpw9s8fkp-efeonce-7670142f.vercel.app`) para validar backend + UI del modulo HR Payroll en el dominio compartido de Preview.
- fix: el preview `feature/hr-payroll` dejo de romper el login por `credentials` antes de validar password; se corrigieron `GCP_PROJECT` y `NEXTAUTH_URL` en `Preview (feature/hr-payroll)`, se redeployo a `greenhouse-lc737eg28-efeonce-7670142f.vercel.app` y `pre-greenhouse` fue reasignado a ese deployment corregido.
- feat: se provisionaron 6 nuevos usuarios internos Efeonce en `greenhouse.client_users`, enlazados a `team_members` / `identity_profiles`, con roles `efeonce_account` o `efeonce_operations`, aliases internos `@efeonce.org` y smoke de login exitoso en `pre-greenhouse`.
# 2026-03-15
- fix: `HR > Permisos` ahora usa PostgreSQL como store operativo (`greenhouse_hr`) para metadata, saldos, solicitudes y revisión, enlazado a `greenhouse_core.client_users` y `greenhouse_core.members`.
- fix: `HR Core` dejó de ejecutar bootstraps `DDL` en request-time; `ensureHrCoreInfrastructure()` queda como bootstrap explícito y el runtime usa validación no mutante contra BigQuery.
- chore: se bootstrappeó una sola vez `HR Core` en BigQuery y se agregaron env vars de PostgreSQL al Preview de `fix/codex-operational-finance`.
- fix: `FinanceDashboardView` ya no presenta saldo total engañoso cuando no existen cuentas activas y ahora muestra movimientos recientes reales combinando ingresos y egresos.
- fix: `ReconciliationView` ahora expone movimientos pendientes por conciliar aunque no existan períodos abiertos y comunica explícitamente cuando el bloqueo operativo es ausencia de cuentas activas o de períodos.
# 2026-03-15

- Fix: corrected the AI Tooling bootstrap seed so `ensureAiToolingInfrastructure()` no longer fails when a seeded tool omits optional params like `subscriptionAmount`, restoring the admin catalog/licenses/wallets/meta routes in preview.
