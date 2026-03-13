# Handoff.md

## Uso
Este archivo es el snapshot operativo entre agentes. Debe priorizar claridad y continuidad.
Mantener aqui solo estado activo, validacion reciente y proximos pasos.
Si hace falta contexto historico detallado, revisar `Handoff.archive.md`.

## Formato Recomendado

### Fecha
- YYYY-MM-DD HH:MM zona horaria

### Agente
- Nombre del agente o persona

### Objetivo del turno
- Que se hizo o que se intento resolver

### Rama
- Rama usada
- Rama objetivo del merge

### Ambiente objetivo
- Development, Preview, staging o Production

### Archivos tocados
- Lista corta de archivos relevantes

### Verificacion
- Comandos ejecutados
- Resultado
- Lo que no se pudo verificar

### Riesgos o pendientes
- Riesgos activos
- Decisiones bloqueadas
- Proximo paso recomendado

---

## Estado Actual

## 2026-03-13 01:40 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Ejecutar `CODEX_TASK_Microsoft_SSO_Greenhouse.md` adaptandolo al modelo real de Greenhouse (`greenhouse.client_users`) y no al esquema legacy de login sobre `greenhouse.clients`.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development + auth runtime + BigQuery + configuracion Vercel

### Archivos tocados
- `src/lib/auth.ts`
- `src/lib/tenant/access.ts`
- `src/types/next-auth.d.ts`
- `src/views/Login.tsx`
- `src/app/(blank-layout-pages)/login/page.tsx`
- `src/app/(blank-layout-pages)/auth/access-denied/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `bigquery/greenhouse_identity_access_v1.sql`
- `bigquery/greenhouse_microsoft_sso_v1.sql`
- `scripts/setup-bigquery.sql`
- `.env.example`
- `.env.local.example`
- `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `README.md`
- `project_context.md`
- `changelog.md`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Migracion BigQuery aplicada con el cliente Node del repo:
  - `bigquery/greenhouse_microsoft_sso_v1.sql`
  - columnas confirmadas en `greenhouse.client_users`: `microsoft_oid`, `microsoft_tenant_id`, `microsoft_email`, `last_login_provider`
- `gcloud config get-value project`: `efeonce-group`
- `gcloud auth application-default print-access-token`: correcto
- `vercel login`: correcto por device flow
- Vercel env verificado con `vercel env list --debug`
  - `Production`: ahora tiene `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET`
  - `staging`: ahora tiene `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET`
  - `Development`: ahora tiene `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL`
  - `Preview (develop)`: ahora tiene `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET`

### Riesgos o pendientes
- El task original pedía resolver SSO contra `greenhouse.clients`, pero el runtime real ya vive en `greenhouse.client_users`; el cambio se implemento sobre el modelo actual para no reintroducir el principal legacy.
- Por seguridad, el flujo no auto-provisiona usuarios solo por `allowed_email_domains`; si el dominio coincide pero no existe un principal explicito en `client_users`, el login Microsoft cae en `/auth/access-denied`.
- `Preview` sigue usando env vars muy branch-specific; otras ramas feature que quieran validar SSO remoto pueden necesitar `AZURE_AD_*` cargadas tambien para su branch preview concreto.
- No se hizo smoke OAuth completo en navegador contra Azure; quedo verificado el runtime, el build, la migracion de BigQuery y la presencia de variables clave en Vercel.

## 2026-03-12 16:10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Ejecutar el brief `CODEX_TASK_Admin_Landing_Control_Tower_Redesign.md` sobre la landing interna real `/internal/dashboard`.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / landing interna Efeonce

### Archivos tocados
- `src/views/greenhouse/GreenhouseInternalDashboard.tsx`
- `src/views/greenhouse/internal/dashboard/*`
- `src/lib/internal/get-internal-dashboard-overview.ts`
- `src/app/(dashboard)/internal/dashboard/loading.tsx`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- No se ejecuto validacion visual autenticada real en `/internal/dashboard`.

### Riesgos o pendientes
- El CTA `Crear space` quedo visible pero deshabilitado porque el repo aun no tiene mutacion ni ruta real para onboarding de un nuevo space desde UI.
- `Editar` y `Desactivar` existen como acciones del menu contextual pero siguen deshabilitadas; no hay workflow admin implementado para esas mutaciones.
- La priorizacion operativa usa las senales disponibles hoy (`createdAt`, `lastLoginAt`, `scopedProjects`, `pendingResetUsers`, `avgOnTimePct`) y no una auditoria formal de onboarding multi-evento.

## 2026-03-12 13:05 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Ejecutar el brief `CODEX_TASK_Client_Dashboard_Redesign.md` sobre la vista cliente real del dashboard.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / dashboard cliente y preview admin `view-as`

### Archivos tocados
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/dashboard/*`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/lib/dashboard/tenant-dashboard-overrides.ts`
- `src/components/greenhouse/EmptyState.tsx`
- `src/components/greenhouse/SectionErrorBoundary.tsx`
- `src/components/card-statistics/HorizontalWithSubtitle.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/loading.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx`
- `src/lib/auth.ts`
- `src/lib/tenant/get-tenant-context.ts`
- `src/types/greenhouse-dashboard.ts`
- `src/types/next-auth.d.ts`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- No se ejecuto validacion visual autenticada real en `/dashboard` ni en `/admin/tenants/[id]/view-as/dashboard`.

### Riesgos o pendientes
- El modal de ampliacion de equipo/ecosistema no dispara una notificacion real porque el repo aun no tiene endpoint ni workflow para enviar esa solicitud a owner, email o webhook; quedo como mensaje copiable.
- La zona de `Tu stack` solo muestra herramientas con URL configurada; si la cuenta no tiene links reales guardados, cae al empty state aunque existan defaults por modulo.
- La seccion de capacidad usa la capacidad visible hoy en la cuenta (`monthlyHours` + `averageAllocationPct`) y no una serie formal de utilization historica por 2+ meses.
- Falta smoke visual/authenticado del nuevo dashboard en desktop, tablet y mobile.

## 2026-03-12 07:35 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Cerrar el modelado inicial de identidad interna Efeonce para no depender solo de `client_users` y dejar preparada la futura unificacion con Azure AD.

### Rama
- Rama usada: actual de trabajo local
- Rama objetivo: la rama activa del repo

### Ambiente objetivo
- Development con aplicacion real en BigQuery

### Archivos tocados
- `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `bigquery/greenhouse_internal_identity_v1.sql`
- `scripts/backfill-internal-identity-profiles.ts`
- `src/lib/ids/greenhouse-ids.ts`
- `src/lib/admin/get-admin-user-detail.ts`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`

### Verificacion
- `npx pnpm backfill:internal-identity-profiles --dry-run`: correcto
- `npx pnpm backfill:internal-identity-profiles`: correcto
- Resultado real en BigQuery:
  - `2` auth principals internos enlazados a `identity_profile_id`
  - `6` owners HubSpot internos sembrados como perfiles canonicos
  - `8` perfiles `EO-ID-*` creados
- ADC verificado sano con `gcloud auth application-default print-access-token`

### Riesgos o pendientes
- No se hizo auto-merge entre `julio.reyes@efeonce.org` y `jreyes@efeoncepro.com`; esa clase de alias entre dominios queda como reconciliacion manual o futura regla revisada.
- Falta corrida final de `lint` y `build` despues del bootstrap de identidad interna antes de commit si el turno se retoma desde aqui.
- Azure AD no esta implementado; solo quedo la base canonica para enlazarlo despues.

### Fecha
- 2026-03-12 09:15 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Documentar un sistema formal de orquestacion UI para Greenhouse basado en Vuexy/MUI.
- Dejar un skill local reusable para que solicitudes de Claude, Codex u otros agentes se normalicen y mapeen al mismo criterio.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / documentacion operativa

### Archivos tocados
- `GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- `README.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`
- `C:/Users/jreye/.codex/skills/greenhouse-ui-orchestrator/SKILL.md`
- `C:/Users/jreye/.codex/skills/greenhouse-ui-orchestrator/agents/openai.yaml`

### Verificacion
- Revision documental del modelo actual en:
  - `DOCUMENTATION_OPERATING_MODEL_V1.md`
  - `references/ui-ux-vuexy.md` del skill `greenhouse-vuexy-portal`
- Verificacion de referencias reales en `full-version` y `starter-kit` para:
  - `WebsiteAnalyticsSlider`
  - `SupportTracker`
  - `SalesOverview`
  - `LineAreaDailySalesChart`
  - `SourceVisits`
  - `SalesByCountries`
  - `UserListCards`
  - `UserListTable`
  - `UserDetails`
  - `UserActivityTimeline`
  - primitives locales `ExecutiveHeroCard`, `ExecutiveMiniStatCard`, `ExecutiveCardShell`, `BrandLogo`
- `python C:/Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/jreye/.codex/skills/greenhouse-ui-orchestrator`: correcto
- No se ejecuto `lint` ni `build` porque el cambio es documental y de skill local.

### Riesgos o pendientes
- El skill local nuevo no queda automaticamente disponible en el listado de skills de esta sesion; puede requerir nueva sesion o recarga de entorno para ser invocable como skill registrada.
- El catalogo es una primera curacion; falta sumar patrones especificos de `/admin/tenants`, futuras scopes y feature flags, y surfaces de `/equipo` y `/campanas`.
- Falta decidir si el siguiente paso sera solo consulta o si tambien se construira una herramienta interna que consuma el brief y recomiende patrones desde UI.

### Proximo paso recomendado
- Aplicar este sistema al siguiente trabajo visual real sobre `/admin/tenants/[id]` o `/dashboard`.
- Si el flujo resulta estable, promover el orquestador a una practica obligatoria en todas las solicitudes UI del repo.

### Fecha
- 2026-03-12 09:02 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Preparar el smoke funcional del nuevo modelo escalable de provisioning por batches.
- Dejar explicitado que este trabajo sigue abierto y no debe mezclarse aun con `develop`.

### Rama
- Rama usada: `feature/scalable-tenant-contact-provisioning`
- Commit actual del feature: `bc8b546`
- Rama objetivo del merge: ninguna aun; smoke pendiente antes de promover a `develop`

### Ambiente objetivo
- Development local / feature branch aislada

### Archivos tocados
- `src/lib/admin/tenant-member-provisioning-shared.ts`
- `src/lib/admin/tenant-contact-provisioning-snapshot.ts`
- `src/lib/admin/get-admin-tenant-detail.ts`
- `src/lib/admin/tenant-member-provisioning.ts`
- `src/app/api/admin/tenants/[id]/contacts/provision/route.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`

### Verificacion
- `npx pnpm lint`: correcto
- `npx tsc -p tsconfig.json --noEmit`: correcto
- `npx pnpm build`: bloqueado en este worktree por limitacion de Turbopack/Windows/OneDrive con paths largos, no por error de tipos del cambio
- Push remoto: correcto en `origin/feature/scalable-tenant-contact-provisioning`
- Smoke funcional real del batching:
  - tenant usado: `hubspot-company-27776076692` (`ANAM`)
  - caso validado: `5` contactos pendientes
  - una request con `5` IDs devolvio `400` como se esperaba
  - luego se ejecutaron `2` lotes secuenciales (`4 + 1`) con snapshot firmado y ambos devolvieron `created`
  - verificacion final contra BigQuery + Cloud Run: `tenantUserCount = 6`, `liveContactCount = 6`, `missingCount = 0`

### Riesgos o pendientes
- El batching nuevo ya fue smokeado funcionalmente; falta solo decidir promocion.
- No mergear aun esta rama a `develop` ni `main`.
- El checkout principal del usuario sigue con `.gitignore` modificado; este feature se esta trabajando aparte para no colisionar con ese estado local.

### Proximo paso recomendado
- Promover `feature/scalable-tenant-contact-provisioning` a `develop`.
- Despues validar en preview o staging una corrida equivalente antes de llevarlo a `main`.

### Fecha
- 2026-03-12 08:45 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Hacer escalable el provisioning de contactos HubSpot sin romper el boundary por tenant.
- Eliminar la dependencia de una sola request larga para corridas bulk.

### Rama
- Rama usada: `docs/production-closeout`
- Rama objetivo del merge: por definir antes de promover a `develop` y `main`

### Ambiente objetivo
- Development / pre-merge

### Archivos tocados
- `src/lib/admin/tenant-member-provisioning-shared.ts`
- `src/lib/admin/tenant-contact-provisioning-snapshot.ts`
- `src/lib/admin/get-admin-tenant-detail.ts`
- `src/lib/admin/tenant-member-provisioning.ts`
- `src/app/api/admin/tenants/[id]/contacts/provision/route.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`

### Verificacion
- Cambio funcional implementado:
  - la pantalla admin ahora hace una sola lectura live inicial de contactos y reutiliza un snapshot firmado por el servidor
  - el endpoint ya no acepta corridas largas: limita el request a `4` contactos por llamada
  - la UI divide automaticamente los pendientes en batches secuenciales y agrega feedback/progreso
  - el backend solo vuelve a consultar Cloud Run si no recibe un snapshot valido
- Validacion:
  - `npx pnpm lint`: correcto
  - `npx tsc -p tsconfig.json --noEmit`: correcto
  - `npx pnpm build`: bloqueado por limitacion de Turbopack/Windows/OneDrive con paths largos en el worktree largo, no por un error de tipos del cambio

### Riesgos o pendientes
- Falta smoke funcional del batching nuevo en un runtime real antes de promover.
- La rama de trabajo actual nacio como cierre documental y ahora contiene codigo; conviene reetiquetarla o mover estos commits a una rama de feature antes del merge.

### Proximo paso recomendado
- Crear una rama de feature limpia para este cambio escalable.
- Hacer smoke local o preview de la UI admin ejecutando varios lotes secuenciales.
- Si el smoke sale bien, promover primero a `develop`.

### Fecha
- 2026-03-12 22:05 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Ejecutar `CODEX_TASK_Tenant_Detail_View_Redesign.md` y rediseñar `/admin/tenants/[id]` con header, tabs y patrones Vuexy reutilizados desde `full-version`.

### Rama
- Rama usada: actual de trabajo local
- Rama objetivo: la rama activa del repo

### Ambiente objetivo
- Admin surface del repo `starter-kit`

### Archivos tocados
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/admin/tenants/TenantCapabilityManager.tsx`
- `src/views/greenhouse/admin/tenants/TenantUsersTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantServiceModulesTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantDetailEmptyState.tsx`
- `src/views/greenhouse/admin/tenants/TenantDetailErrorBoundary.tsx`
- `src/views/greenhouse/admin/tenants/TenantDetailLoading.tsx`
- `src/views/greenhouse/admin/tenants/helpers.ts`
- `src/app/(dashboard)/admin/tenants/[id]/loading.tsx`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- La ruta `ƒ /admin/tenants/[id]` sigue compilando en el build de Next.js
- No se ejecuto validacion visual autenticada real en navegador sobre la ruta; solo validacion estatica y de build

### Riesgos o pendientes
- El brief pedia notas operativas editables, pero no existe una mutacion ya expuesta para `notes`; la vista quedo preparada como lectura clara, no como editor persistente.
- El repo no trae `@mui/x-data-grid`; la tabla de usuarios y la de service modules quedaron resueltas con el patron Vuexy existente sobre `@tanstack/react-table` y `TablePaginationComponent`.
- Conviene correr la validacion visual autentica descrita en `GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md` sobre `/admin/tenants/[id]` y revisar responsive en tablet antes de cerrar commit final.
