# changelog.md

## Regla
- Registrar solo cambios con impacto real en comportamiento, estructura, flujo de trabajo o despliegue.
- Usar entradas cortas, fechadas y accionables.

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
- Se agregaron `MULTITENANT_ARCHITECTURE.md` y `BACKLOG.md` para dejar la arquitectura objetivo y el plan de avance.
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
- Se agrego `GREENHOUSE_ARCHITECTURE_V1.md` como documento maestro de arquitectura, roadmap, roles, rutas, datos y trabajo paralelo multi-agente.
- Se agrego `GREENHOUSE_IDENTITY_ACCESS_V1.md` como diseno tecnico detallado de Fase 1 para usuarios, roles, scopes, session payload y migracion auth.
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
- Se reordeno `BACKLOG.md` por fases y streams paralelos alineados al nuevo plan maestro.
- Se actualizaron `README.md`, `project_context.md`, `MULTITENANT_ARCHITECTURE.md` y `Handoff.md` para tomar el nuevo plan como referencia.
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
