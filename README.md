# Greenhouse Portal

Portal de clientes de Efeonce construido sobre Vuexy + Next.js. Este repositorio contiene la base operativa del producto Greenhouse y ya no debe tratarse como un starter generico.

## Objetivo

Greenhouse busca darle a cada cliente acceso a:
- metricas ICO
- estado de su operacion creativa
- dashboards de entrega, velocidad, capacidad y riesgo
- contexto de proyectos, tareas y sprints sin reemplazar Notion
- composicion modular por linea de negocio y servicio contratado
- una capa de transparencia conectada al sistema Greenhouse

La especificacion funcional principal esta en:
- `../Greenhouse_Portal_Spec_v1.md`

La documentacion operativa interna del repo esta en:
- `AGENTS.md`
- `BACKLOG.md`
- `DOCUMENTATION_OPERATING_MODEL_V1.md`
- `GREENHOUSE_CROSS_REPO_CONTRACT_V1.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`
- `SKY_TENANT_EXECUTIVE_SLICE_V1.md`
- `PHASE_TASK_MATRIX.md`
- `GREENHOUSE_SERVICE_MODULES_V1.md`
- `Handoff.md`
- `MULTITENANT_ARCHITECTURE.md`
- `project_context.md`
- `changelog.md`

Documento maestro:
- `GREENHOUSE_ARCHITECTURE_V1.md`
- Resumen rapido de tareas por fase:
- `PHASE_TASK_MATRIX.md`
- Documentacion oficial Vuexy:
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/`

Ese documento define:
- el norte del producto
- el modelo multi-tenant y multi-user
- las fases de implementacion
- que se puede trabajar en paralelo
- la separacion entre cliente, Efeonce interno y admin

Documento tecnico de Fase 1:
- `GREENHOUSE_IDENTITY_ACCESS_V1.md`

Documento tecnico de modulos de servicio:
- `GREENHOUSE_SERVICE_MODULES_V1.md`

Ese documento define:
- `client_users`
- roles
- scopes
- session payload objetivo
- plan de migracion desde el MVP actual

## Alcance del Repo

- Este repo versiona solo `starter-kit`.
- `full-version` vive fuera del repo y se usa como referencia de contexto, referencia visual y referencia funcional.
- No se debe subir `full-version` a este repositorio.
- Si se toman componentes desde `full-version`, deben adaptarse al contexto Greenhouse antes de integrarse.
- Los componentes UI reutilizables propios de Greenhouse deben vivir en `src/components/greenhouse/*`; las vistas deben consumir esa capa antes de crear JSX ad hoc por modulo.
- El sistema visual ejecutivo reusable del producto queda definido en `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md` y toma a Vuexy como referencia compositiva, no como fuente de pantallas para copiar.

## Estado Actual

Estado hoy:
- base tecnica funcionando en Vercel
- shell Greenhouse visible en las rutas principales del portal
- branding base integrado en navegacion y favicon temporal
- `next-auth` ya protege el dashboard y autentica solo contra `greenhouse.client_users`
- el login ya no muestra bloque demo ni mensajes internos de infraestructura
- credenciales de BigQuery cargadas en Vercel para `Development`, `staging` y `Production`
- `@google-cloud/bigquery` ya esta integrado en el repo
- el stack visual del repo ya usa `apexcharts` + `react-apexcharts`, `recharts`, `keen-slider`, `fullcalendar`, `react-datepicker`, `react-dropzone`, `react-toastify`, `cmdk`, `tiptap`, `tanstack/react-table`, `react-player`, `mapbox-gl`, `react-map-gl`, `react-hook-form`, `valibot`, `simple-icons` y `@iconify-json/logos`
- `src/components/greenhouse/BrandLogo.tsx` es la primitive reusable para branding de herramientas y resuelve logos desde el bundle local de Vuexy/Iconify antes de caer a fallbacks
- existe `/api/dashboard/kpis` con queries server-side a BigQuery
- existen `/api/dashboard/summary`, `/api/dashboard/charts` y `/api/dashboard/risks`
- existe `/api/projects` con queries server-side a BigQuery
- existen `/api/projects/[id]` y `/api/projects/[id]/tasks` con autorizacion por tenant
- el dashboard principal ya es una vista ejecutiva real con charts estilo Vuexy sobre throughput, salud on-time, mix operativo, esfuerzo y proyectos bajo atencion
- el dashboard ya compone hero y cards segun `businessLines` y `serviceModules` del tenant
- el dashboard ahora tambien expone tenure de relacion, `on-time` mensual y entregables/ajustes por mes cuando el tenant tiene historico visible
- el dashboard ahora expone tambien secciones reusables de quality, account team y tooling para tenants con senal suficiente
- la capa reusable combina BigQuery real, señales de Notion y overrides controlados por tenant cuando el modelo formal aun no existe
- la vista `/proyectos` ya consume datos reales filtrados por tenant
- la vista `/proyectos/[id]` ya muestra detalle de proyecto con tareas, review pressure y sprint context si existe
- `build` local estabilizado en Windows con salida dinamica bajo `.next-local/`
- existe un plan maestro de arquitectura y roadmap multi-agente en `GREENHOUSE_ARCHITECTURE_V1.md`
- ya existen en BigQuery `client_users`, `roles`, `user_role_assignments`, `user_project_scopes`, `user_campaign_scopes`, `client_feature_flags` y `audit_events`
- ya existe bootstrap real de clientes desde HubSpot para companias con al menos un `closedwon`
- ya existen `/auth/landing`, `/internal/dashboard`, `/admin`, `/admin/users`, `/admin/users/[id]` y `/admin/roles` como superficies iniciales de access y governance
- ya existen `/admin/tenants` y `/admin/tenants/[id]` como slice real de governance orientado a empresa/tenant
- ya existe `/admin/tenants/[id]/view-as/dashboard` para revisar el dashboard cliente desde una sesion admin
- `/admin/roles` ya reutiliza patrones visuales de Vuexy sobre datos reales de BigQuery
- `/admin/users/[id]` ya reutiliza la estructura `overview` / `security` / `billing` de Vuexy reinterpretada para Greenhouse
- el demo client y el admin interno ya autentican con `password_hash` bcrypt

Rutas actuales:
- `/dashboard`
- `/proyectos`
- `/proyectos/[id]`
- `/sprints`
- `/settings`
- `/login`
- `/auth/landing`
- `/internal/dashboard`
- `/admin`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/roles`
- `/admin/tenants`
- `/admin/tenants/[id]`
- `/admin/tenants/[id]/view-as/dashboard`

Endpoints principales actuales:
- `/api/dashboard/kpis`
- `/api/dashboard/summary`
- `/api/dashboard/charts`
- `/api/dashboard/risks`
- `/api/projects`
- `/api/projects/[id]`
- `/api/projects/[id]/tasks`

Rutas objetivo del producto:
- `/dashboard`
- `/proyectos`
- `/proyectos/[id]`
- `/sprints`
- `/settings`

Brecha visible:
- la autenticacion ya consume un origen multi-user real y ahora existen 9 tenants cliente bootstrap desde HubSpot, pero esos contactos siguen en estado `invited` hasta que exista onboarding real
- el dashboard ya es la home ejecutiva actual del portal y ya compone narrativa por `serviceModules`, pero aun faltan `capacity`, `market-speed` y slices de campanas
- faltan `/api/sprints`, `/api/dashboard/capacity` y `/api/dashboard/market-speed`
- `greenhouse.clients` todavia conserva columnas legacy de auth como metadata de compatibilidad, aunque el runtime ya no las usa para login
- aun no existe la capa semantica formal de team/capacity, quality ni campaign intelligence, aunque el dashboard ya tiene una primera capa reusable de lectura ejecutiva
- las superficies `/internal/dashboard` y `/admin` ya tienen slices reales, pero aun faltan mutaciones seguras, scopes y feature flags

Iniciativa activa documentada:
- `SKY_TENANT_EXECUTIVE_SLICE_V1.md` fija el diagnostico y la factibilidad del slice pedido por Sky Airline antes de implementarlo.
- En este momento, `on-time` mensual, tenure y entregables/ajustes por mes ya quedaron implementados sobre datos reales.
- Tambien quedaron implementadas secciones reusables de account team, capacity inicial, tooling tecnologico, tooling AI y calidad mensual.
- `RpA` mensual y `First-Time Right` pueden mostrarse desde la misma capa reusable, pero hoy mezclan dato medido con fallback seedado cuando la fuente real no es defendible.
- El siguiente paso del dashboard es migrar la composicion actual al `Executive UI System` reusable documentado en `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`.
- En paralelo, sigue pendiente formalizar APIs y modelos fuente para team/capacity, quality y tooling.

## Stack

- Next.js 16.1.1
- React 19.2.3
- TypeScript 5.9.3
- MUI 7.x
- App Router
- PNPM
- Vercel para deploy

Stack objetivo adicional:
- `next-auth`
- `@google-cloud/bigquery`

## Arquitectura Objetivo

La app debe operar asi:

```text
Cliente autenticado
  -> request
Next.js App Router / API Routes
  -> query server-side filtrada por client_id
BigQuery
  -> resultados
UI del portal
```

Reglas clave:
- BigQuery no se consulta desde el browser.
- Las queries deben ejecutarse server-side.
- El modelo es multi-tenant por `client_id`.
- La especificacion funcional prevalece como norte del producto salvo decision documentada.
- Greenhouse no debe convertirse en un segundo Notion.

## Comandos

Instalacion:

```bash
npx pnpm install --frozen-lockfile
```

Desarrollo:

```bash
npx pnpm dev
```

Build:

```bash
npx pnpm build
```

Limpieza local:

```bash
npx pnpm clean
```

Lint:

```bash
npx pnpm lint
```

## Variables de Entorno

Actuales en `.env.example`:
- `NEXT_PUBLIC_APP_URL`
- `BASEPATH`
- `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`

Objetivo funcional:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`

Estado actual en Vercel:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` existe en `Development`, `staging` y `Production`
- `GCP_PROJECT` existe en `Development`, `staging` y `Production`
- `NEXTAUTH_SECRET` y `NEXTAUTH_URL` existen y deben configurarse tambien en `Preview` cuando una branch necesite login real
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` permite apuntar Greenhouse al servicio live de HubSpot; si no se define, el runtime usa el endpoint activo de Cloud Run como fallback
- el servicio live de HubSpot ahora expone:
  - `GET /contract`
  - `GET /companies/{hubspotCompanyId}`
  - `GET /companies/{hubspotCompanyId}/owner`
  - `GET /companies/{hubspotCompanyId}/contacts`
- `/admin/tenants/[id]` ya consume esos endpoints para mostrar `company`, `owner` y los contactos CRM asociados al space, incluyendo una comparacion rapida contra los usuarios ya provisionados en Greenhouse
- `/developers/api` ahora enlaza el contrato canonico cross-repo en `/docs/greenhouse-cross-repo-contract-v1.md` para dejar claro que Greenhouse consume conectores externos y no reimplementa sus syncs

Notas:
- `next.config.ts` usa `BASEPATH` como `basePath`.
- Si `BASEPATH` se define innecesariamente en Vercel, la app deja de vivir en `/`.
- En `Preview`, `GOOGLE_APPLICATION_CREDENTIALS_JSON` puede llegar con serializaciones distintas segun como Vercel entregue la variable. `src/lib/bigquery.ts` ya tolera formato JSON minified y formato legacy escapado.
- Si un login valido falla en `Preview`, primero verificar que el dominio apunte al deployment correcto y luego revisar `GOOGLE_APPLICATION_CREDENTIALS_JSON` antes de asumir problema de password o de `client_users`.
- Toda variable nueva debe documentarse tambien en `project_context.md`.

## Deploy

Repositorio:
- `https://github.com/efeoncepro/greenhouse-eo.git`

Entorno actual:
- Vercel
- dominio actual: `greenhouse-eo.vercel.app`
- alias productivo actual: `greenhouse.efeoncepro.com`

Configuracion importante en Vercel:
- `Framework Preset`: `Next.js`
- `Root Directory`: vacio o equivalente al repo raiz
- `Output Directory`: vacio

Ambientes:
- `Development`
- `staging` asociado a `develop`
- `Production` asociado a `main`
- `Preview` efimero para ramas feature y fix

Nota operativa:
- hubo un `404 NOT_FOUND` inicial por tener `Framework Preset` en `Other`
- ese problema ya fue corregido

## Flujo de Trabajo

Ramas:
- `main`: produccion
- `develop`: integracion y staging compartido
- `feature/*`, `fix/*`, `docs/*`: trabajo aislado por agente
- `hotfix/*`: correcciones de produccion

Camino normal:
1. Crear rama desde `develop`.
2. Implementar cambio pequeno y verificable.
3. Validar con `npx pnpm build`, `npx pnpm lint` o validacion manual suficiente.
4. Hacer push y revisar Preview Deployment en Vercel si el cambio afecta UI, rutas, layout o deploy.
5. Mergear a `develop`.
6. Validar en `staging`.
7. Mergear a `main`.
8. Confirmar deploy a `Production`.

## Estructura Relevante

- `src/app/layout.tsx`: layout raiz
- `src/app/auth/landing/page.tsx`: redirect post-login por `portalHomePath`
- `src/app/(dashboard)/layout.tsx`: layout principal del dashboard
- `src/app/(dashboard)/internal/layout.tsx`: guard server-side para rutas internas
- `src/app/(dashboard)/admin/layout.tsx`: guard server-side para rutas admin
- `src/app/api/dashboard/kpis/route.ts`: primer endpoint real del portal
- `src/app/api/projects/route.ts`: listado real de proyectos por tenant
- `src/app/api/projects/[id]/route.ts`: detalle de proyecto por tenant
- `src/app/api/projects/[id]/tasks/route.ts`: tareas del proyecto por tenant
- `src/components/layout/**`: piezas de navegacion y shell
- `src/configs/**`: tema y configuracion visual
- `src/data/navigation/**`: definicion del menu
- `src/lib/bigquery.ts`: cliente server-side de BigQuery
- `src/lib/dashboard/get-dashboard-overview.ts`: capa de datos del dashboard
- `src/lib/projects/get-projects-overview.ts`: capa de datos de proyectos
- `src/lib/projects/get-project-detail.ts`: capa de datos del detalle de proyecto
- `src/app/api/**`: aqui debe vivir la capa de endpoints server-side del producto
- `scripts/run-next-build.mjs`: wrapper de build local para Windows
- `scripts/run-next-start.mjs`: wrapper de start local para reutilizar el ultimo build

## Referencias de Trabajo

Leer antes de cambios importantes:
- `AGENTS.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `Handoff.md`
- `project_context.md`
- `../Greenhouse_Portal_Spec_v1.md`

Usar como referencia de implementacion:
- `../full-version`

Usar de `../full-version` principalmente:
- dashboards
- tablas filtrables
- patrones de usuarios, roles y permissions

Orden recomendado para buscar referencia Vuexy:
- `../full-version/src/views/dashboards/analytics/*`
- `../full-version/src/views/dashboards/crm/*`
- `../full-version/src/views/apps/user/list/*`
- `../full-version/src/views/apps/user/view/*`
- `../full-version/src/views/apps/roles/*`
- `../full-version/src/libs/ApexCharts.tsx`
- `../full-version/src/libs/styles/AppReactApexCharts.tsx`
- `../full-version/src/libs/Recharts.tsx`
- `../full-version/src/libs/styles/AppRecharts.ts`
- despues confirmar contra la documentacion oficial de Vuexy:
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/libs/apex-charts/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/styled-libs/app-react-apex-charts/`

JWT y ACL en Vuexy vs Greenhouse:
- Vuexy usa `next-auth` con estrategia `jwt` como patron base de sesion; eso no es una ventaja diferencial del template porque Greenhouse ya usa JWT tambien.
- El ACL/permisos de Vuexy sirve como referencia de organizacion visual y pantallas demo de permisos, no como modelo multi-tenant listo para produccion.
- Greenhouse no debe depender del ACL generico del template para autorizacion real.
- La autorizacion real de Greenhouse vive en `greenhouse.client_users`, `greenhouse.roles`, `greenhouse.user_role_assignments`, `greenhouse.user_project_scopes` y `greenhouse.user_campaign_scopes`.
- El enforcement real se hace server-side con `roleCodes`, `routeGroups`, `projectScopes` y `campaignScopes`, no con flags client-side del template.

User Management y Roles & Permissions:
- La app de `User Management` y `Roles & Permissions` de Vuexy si es buena candidata para integracion visual en Greenhouse.
- Debe adaptarse solo como capa UI y estructura de navegacion sobre datos reales de BigQuery.
- `src/views/apps/user/list/*` y `src/views/apps/roles/*` son referencia directa para `/admin/users` y `/admin/roles`.
- `src/views/apps/user/view/*` es referencia directa para `/admin/users/[id]`.
- Los tabs `overview`, `security` y `billing-plans` no deben copiarse tal cual: deben reinterpretarse asi:
- `overview` -> tenant, roles, scopes, actividad y contexto del usuario
- `security` -> auth mode, ultimo acceso, resets, auditoria y controles de acceso
- `billing-plans` -> invoices, fee, plan contratado, consumo y contexto comercial del cliente
- Los modulos demo de invoices, payment method, recent devices o billing fake no son source of truth y no deben entrar como data layer.

Service modules:
- Greenhouse debe adaptar navegacion, charts y vistas segun servicios contratados del cliente.
- Ese eje no reemplaza roles ni scopes; los complementa.
- La fuente comercial actual para derivarlos es `hubspot_crm.deals.linea_de_servicio` y `hubspot_crm.deals.servicios_especificos`.
- El schema base esta versionado en `bigquery/greenhouse_service_modules_v1.sql`.
- El bootstrap inicial desde deals `closedwon` esta versionado en `bigquery/greenhouse_service_module_bootstrap_v1.sql`.
- `getTenantContext()` ya expone `businessLines` y `serviceModules` para runtime server-side y composicion actual del dashboard.
- Ver `GREENHOUSE_SERVICE_MODULES_V1.md`.
- Para CRM live, Greenhouse ya puede consultar el servicio dedicado `hubspot-greenhouse-integration` y leer `company profile` y `owner` bajo demanda.
- Regla de latencia actual:
- `company profile` y `owner` pueden reflejar cambios de HubSpot con baja latencia en cuanto Greenhouse vuelve a consultar.
- `capabilities` siguen dependiendo de sync explicito hasta que exista una capa event-driven.

Regla de componentes Greenhouse:
- `src/components/greenhouse/*` es la capa compartida de UI del producto.
- `src/views/greenhouse/<modulo>/*` debe contener solo composicion y piezas especificas del modulo.
- Antes de crear una card, heading, badge group o lista metrica nueva, revisar primero si debe vivir en `src/components/greenhouse/*`.

## Proximos Pasos Recomendados

1. Migrar `/dashboard` al `Executive UI System` reusable documentado en `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`.
2. Validar visualmente el nuevo slice de Sky en `/dashboard`.
3. Construir `/admin/scopes` y `/admin/feature-flags`.
4. Agregar `/api/sprints` y la vista real de `/sprints`.
5. Extender `serviceModules` a navegacion y billing.
6. Modelar `team/capacity` antes de exponer equipo asignado como API formal.
