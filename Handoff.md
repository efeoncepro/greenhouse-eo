# Handoff.md

## Uso
Este archivo es el estado operativo entre agentes. Debe priorizar claridad y continuidad. No escribir narrativas largas.
Si un cambio fue dejado sin `commit` o sin `push` por falta de verificacion, eso debe quedar escrito aqui de forma explicita.

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

### Fecha
- 2026-03-09 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Inicializar y subir `starter-kit` como repo independiente.
- Diagnosticar `404 NOT_FOUND` en Vercel.
- Confirmar configuracion correcta de despliegue.
- Crear base documental multi-agente.
- Corregir encoding de la especificacion externa y alinearla con la documentacion operativa.
- Reemplazar el README default por uno alineado a Greenhouse.
- Crear `develop` y documentar el flujo `Preview -> Staging -> Production`.
- Montar el primer shell Greenhouse sobre el starter-kit.
- Integrar la primera capa real de auth con `next-auth`.
- Integrar el branding base real del portal en navegacion y favicon.
- Corregir los warnings recurrentes de `LF/CRLF`.
- Conectar Vercel CLI, configurar `staging` y cargar credenciales de BigQuery en Vercel.
- Estabilizar el flujo local de `build` en Windows y evitar `index.lock` por comandos Git mutantes en paralelo.
- Integrar `@google-cloud/bigquery`, crear `/api/dashboard/kpis` y conectar el dashboard a datos reales por alcance de cliente demo.
- Definir la arquitectura multi-tenant objetivo, crear la base `greenhouse.clients` en BigQuery y dejar backlog priorizado para continuar el proyecto.
- Conectar `next-auth` a `greenhouse.clients`, actualizar `last_login_at` y agregar helper de tenant reusable.
- Implementar `/api/projects` y reemplazar la vista mock de `/proyectos` por datos reales de BigQuery filtrados por tenant.

### Rama
- Rama usada: `feature/tenant-auth-bq`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Preview de feature branch y luego `staging`

### Archivos tocados
- `.env.example`
- `.gitattributes`
- `.gitignore`
- `AGENTS.md`
- `BACKLOG.md`
- `CONTRIBUTING.md`
- `Handoff.md`
- `MULTITENANT_ARCHITECTURE.md`
- `README.md`
- `bigquery/greenhouse_clients.sql`
- `changelog.md`
- `next.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `project_context.md`
- `tsconfig.json`
- `scripts/clean-paths.mjs`
- `scripts/run-next-build.mjs`
- `scripts/run-next-start.mjs`
- `public/branding/avatar.png`
- `public/branding/logo-full.svg`
- `public/branding/logo-negative.svg`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/(blank-layout-pages)/login/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/proyectos/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/sprints/page.tsx`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/dashboard/kpis/route.ts`
- `src/app/api/projects/route.ts`
- `src/components/auth/AuthSessionProvider.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/components/layout/horizontal/VerticalNavContent.tsx`
- `src/components/layout/shared/Logo.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/vertical/Navigation.tsx`
- `src/configs/themeConfig.ts`
- `src/data/navigation/horizontalMenuData.tsx`
- `src/data/navigation/verticalMenuData.tsx`
- `src/lib/bigquery.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/lib/demo-client.ts`
- `src/lib/projects/get-projects-overview.ts`
- `src/lib/auth.ts`
- `src/lib/tenant/clients.ts`
- `src/lib/tenant/get-tenant-context.ts`
- `src/types/greenhouse-dashboard.ts`
- `src/types/next-auth.d.ts`
- `src/views/Login.tsx`
- `src/views/greenhouse/*`
- `../Greenhouse_Portal_Spec_v1.md`

### Verificacion
- `git push -u origin main --force`: correcto
- `git checkout -b develop` y `git push -u origin develop`: correcto
- `npx pnpm install --frozen-lockfile`: correcto
- `npx pnpm build`: correcto
- `npx pnpm build` sobre `feature/greenhouse-shell`: correcto con rutas `/dashboard`, `/proyectos`, `/sprints`, `/settings`
- `npx pnpm add next-auth@4.24.13`: correcto
- `npx pnpm build` con `next-auth` integrado: correcto
- `npx pnpm build` con branding Greenhouse en navegacion y favicon: correcto
- `git config --local core.autocrlf false`: correcto
- `git config --local core.eol lf`: correcto
- `git add .gitattributes` y `git add .`: correctos, sin warnings `LF/CRLF`
- Vercel CLI enlazado a `greenhouse-eo`: correcto
- `staging` confirmado en Vercel y asociado a `develop`: correcto
- Variables `GCP_PROJECT` y `GOOGLE_APPLICATION_CREDENTIALS_JSON` cargadas en `Development`, `staging` y `Production`: correcto
- `npx pnpm build` ejecutado varias veces seguidas en Windows local con `distDir` dinamico: correcto
- `npx pnpm add @google-cloud/bigquery`: correcto
- `npx pnpm add bcryptjs`: correcto
- `npx pnpm build` con BigQuery integrado y `/api/dashboard/kpis`: correcto
- `npx pnpm build` con `/api/projects` y `/proyectos` conectado a BigQuery: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build` con auth lookup en `greenhouse.clients`: correcto
- Dataset `efeonce-group.greenhouse`: creado
- Tabla `efeonce-group.greenhouse.clients`: creada
- Tenant bootstrap `greenhouse-demo-client`: insertado y verificado
- Verificacion manual en Vercel: correcta despues de cambiar `Framework Preset` a `Next.js`
- Lectura y normalizacion de `../Greenhouse_Portal_Spec_v1.md`: correcta
- Reemplazo de `README.md`: correcto, alineado con la especificacion y el contexto operativo actual

### Riesgos o pendientes
- Login ya autentica con `next-auth`, pero contra credenciales demo configurables por env.
- La app ya usa `greenhouse.clients` en runtime para resolver tenant y alcance.
- El bootstrap actual sigue dependiendo de `auth_mode = env_demo` y `DEMO_CLIENT_PASSWORD`.
- La vista `/proyectos` ya usa datos reales, pero el CTA todavia abre el workspace fuente porque `/proyectos/[id]` aun no existe.
- La especificacion define un target productivo mas avanzado que el estado actual del starter kit.
- Si se modifican rutas o `basePath`, validar en Vercel de nuevo.
- El branding actual usa assets temporales entregados por el usuario; falta reemplazo por versiones finales de diseno.
- El repo sigue dentro de OneDrive; la salida dinamica de `build` reduce el problema, pero no elimina el riesgo sistemico del sync.
- En Windows local, `build` ya no reutiliza la misma carpeta de salida; `start` usa la ultima ruta registrada en `.next-build-dir`.
- La configuracion Git local que evita warnings vive en `.git/config`; si otro agente trabaja en otra maquina y reaparecen avisos, debe revisar `core.autocrlf` contra `.gitattributes`.

### Proximo paso recomendado
- Reemplazar el bootstrap `env_demo` por `password_hash` reales o SSO.
- Crear `/proyectos/[id]` con detalle de tareas, estado y comentarios abiertos.
- Reemplazar el CTA temporal de `/proyectos` por navegacion interna al detalle.
- Despues agregar `/api/sprints` y endurecer auth para un flujo multi-tenant real.

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Implementar el detalle interno de proyecto como siguiente slice real del portal.
- Crear APIs tenant-safe para detalle y tareas de proyecto.
- Reemplazar la navegacion temporal de `/proyectos` por navegacion interna al detalle.

### Rama
- Rama usada: `feature/tenant-auth-bq`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Preview de feature branch y luego `staging`

### Archivos tocados
- `BACKLOG.md`
- `Handoff.md`
- `README.md`
- `changelog.md`
- `project_context.md`
- `src/app/(dashboard)/proyectos/[id]/page.tsx`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/projects/[id]/tasks/route.ts`
- `src/lib/projects/get-project-detail.ts`
- `src/types/greenhouse-project-detail.ts`
- `src/views/greenhouse/GreenhouseProjectDetail.tsx`
- `src/views/greenhouse/GreenhouseProjects.tsx`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Build confirmo las rutas ` /api/projects/[id]`, `/api/projects/[id]/tasks` y `/proyectos/[id]`
- Smoke queries directas a BigQuery para project detail, tasks y sprint context: correctas sobre `2dc39c2f-efe7-803e-abcd-d74ff4a40940`

### Riesgos o pendientes
- El bootstrap de auth sigue dependiendo de `auth_mode = env_demo` para el tenant seeded.
- `MULTITENANT_ARCHITECTURE.md` sigue atrasado respecto del runtime real y debe actualizarse.
- El sprint context depende de `sprint_ids` en tareas; si el proyecto no trae esa relacion, la vista muestra estado vacio controlado.
- `/sprints`, `/settings` y `/api/dashboard/charts` siguen pendientes como slices reales.

### Proximo paso recomendado
- Reemplazar `env_demo` por `password_hash` reales o SSO.
- Crear `/api/sprints` y conectar `/sprints` a datos reales.
- Crear `/api/dashboard/charts` para profundizar el dashboard.

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Documentar la arquitectura Greenhouse V1 con suficiente detalle para trabajo multi-agente en paralelo.
- Reordenar el roadmap del proyecto por fases, streams y actividades ejecutables.
- Alinear los artefactos de contexto del repo para que el nuevo plan sea la referencia activa.

### Rama
- Rama usada: `feature/tenant-auth-bq`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development y documentacion operativa para trabajo futuro

### Archivos tocados
- `BACKLOG.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `Handoff.md`
- `MULTITENANT_ARCHITECTURE.md`
- `README.md`
- `changelog.md`
- `project_context.md`

### Verificacion
- No se ejecuto `build` ni `lint` porque el turno fue documental y no cambio runtime ni dependencias.
- Se reviso `full-version` como referencia para dashboards, tablas y patrones de user/roles/permissions antes de fijar el plan maestro.

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Implementar la Fase 1 de auth runtime sobre `client_users`, roles y scopes.
- Aplicar el schema de identidad y acceso en BigQuery.
- Mantener compatibilidad con `greenhouse.clients` mientras termina la migracion.

### Rama
- Rama usada: `feature/tenant-auth-bq`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development, Preview y BigQuery dataset `efeonce-group.greenhouse`

### Archivos tocados
- `BACKLOG.md`
- `Handoff.md`
- `MULTITENANT_ARCHITECTURE.md`
- `README.md`
- `bigquery/greenhouse_hubspot_customer_bootstrap_v1.sql`
- `changelog.md`
- `project_context.md`
- `src/app/api/dashboard/kpis/route.ts`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/projects/[id]/tasks/route.ts`
- `src/lib/auth.ts`
- `src/lib/tenant/access.ts`
- `src/lib/tenant/authorization.ts`
- `src/lib/tenant/get-tenant-context.ts`
- `src/types/next-auth.d.ts`
- `src/views/Login.tsx`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `bigquery/greenhouse_identity_access_v1.sql`: aplicado en `efeonce-group.greenhouse` omitiendo solo `CREATE SCHEMA IF NOT EXISTS` porque el dataset ya existia
- Verificacion de tablas:
  - `client_users`: 2 filas
  - `roles`: 6 filas
  - `user_role_assignments`: 2 filas
  - `user_project_scopes`: 4 filas
  - `user_campaign_scopes`: 0 filas
  - `client_feature_flags`: 0 filas
  - `audit_events`: 0 filas
- Verificacion de seeds:
  - `user-greenhouse-demo-client-executive` con `client_executive` y 4 proyectos
  - `user-efeonce-admin-bootstrap` con `efeonce_admin`
- `bigquery/greenhouse_hubspot_customer_bootstrap_v1.sql`: aplicado correctamente
- Verificacion de bootstrap HubSpot:
  - 9 companias con `closedwon` importadas como tenants `hubspot-company-*`
  - ejemplos verificados: `ANAM`, `Sky Airline`
  - 1 contacto cliente inicial por empresa en `client_users` con estado `invited`
- Usuario admin interno creado:
  - email: `julio.reyes@efeonce.org`
  - rol: `efeonce_admin`
  - estado: `active`
  - auth_mode: `credentials`
- `src/lib/tenant/authorization.ts`: agregado y consumido por `/api/dashboard/kpis`, `/api/projects`, `/api/projects/[id]` y `/api/projects/[id]/tasks`
- Se actualizo el ACL del dataset `greenhouse` para dar `WRITER` al service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`

### Riesgos o pendientes
- El service account todavia no puede crear datasets a nivel proyecto; solo tablas dentro del dataset `greenhouse`
- El runtime conserva fallback a `greenhouse.clients`; aun no debe retirarse
- El bootstrap demo sigue usando `auth_mode = env_demo`
- Los guards actuales cubren solo rutas cliente; faltan `/internal/**` y `/admin/**`
- Los tenants HubSpot bootstrap no tienen aun `notion_project_ids` ni `user_project_scopes`, por lo que entrarian con contexto vacio hasta mapear proyectos

### Proximo paso recomendado
- Cargar usuarios reales en `client_users`
- Quitar dependencia operativa de `env_demo`
- Implementar guards por `tenantType`, `roleCodes` y `routeGroups` para `/internal/**` y `/admin/**`
- Mapear `notion_project_ids` y `user_project_scopes` para los tenants importados desde HubSpot
- Construir `/api/dashboard/charts` y rediseñar `/dashboard` como centro ejecutivo del producto

### Riesgos o pendientes
- El repo ya tiene una direccion clara, pero aun falta traducir el plan a schemas concretos de `client_users`, roles y scopes.
- El siguiente trabajo de codigo deberia tomar `GREENHOUSE_ARCHITECTURE_V1.md` como contrato activo para evitar que el producto derive otra vez hacia vistas demasiado operativas.
- Sigue pendiente convertir el dashboard actual en la home ejecutiva real del producto.

### Proximo paso recomendado
- Diseñar y documentar el schema inicial de `client_users`, `roles` y tablas de scope.
- Despues implementar `/api/dashboard/charts` y rediseñar `/dashboard` como vista ejecutiva principal.

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Aterrizar la Fase 1 de Greenhouse en artefactos tecnicos ejecutables.
- Versionar el schema BigQuery propuesto para usuarios, roles y scopes.
- Documentar el modelo de identidad, session payload y migracion auth con suficiente detalle para trabajo multi-agente.

### Rama
- Rama usada: `feature/tenant-auth-bq`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development y documentacion/DDL para siguientes fases

### Archivos tocados
- `BACKLOG.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `Handoff.md`
- `MULTITENANT_ARCHITECTURE.md`
- `README.md`
- `bigquery/greenhouse_identity_access_v1.sql`
- `changelog.md`
- `project_context.md`

### Verificacion
- No se ejecuto `build` ni `lint` porque el turno fue de documentacion y DDL, sin cambios runtime.
- Se revisaron `bigquery/greenhouse_clients.sql`, `src/lib/auth.ts`, `src/lib/tenant/clients.ts` y `src/types/next-auth.d.ts` para alinear el diseno con el MVP actual antes de fijar el plan.

### Riesgos o pendientes
- El DDL nuevo aun no esta aplicado en BigQuery; por ahora es schema versionado, no runtime activo.
- `src/lib/auth.ts` y la session actual todavia usan el modelo MVP basado en `greenhouse.clients`.
- El siguiente cambio de codigo debe respetar `GREENHOUSE_IDENTITY_ACCESS_V1.md` para evitar un refactor parcial incoherente.
- Sigue pendiente convertir el dashboard en home ejecutiva real luego de cerrar el modelo de acceso.

### Proximo paso recomendado
- Aplicar y validar `bigquery/greenhouse_identity_access_v1.sql`.
- Refactorizar auth para leer desde `client_users` y cargar roles/scopes.
- Actualizar el payload de session y los helpers de authz.

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Cerrar completamente la Fase 1 de identidad, acceso y multi-user model.
- Eliminar la dependencia runtime de `env_demo` y del fallback legacy.
- Agregar superficies minimas internas/admin para soportar `portalHomePath` y evitar errores de redirect para usuarios internos.
- Dejar el repo, la documentacion y BigQuery alineados con el estado real de Fase 1.

### Rama
- Rama usada: `feature/tenant-auth-bq`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development, Preview y BigQuery dataset `efeonce-group.greenhouse`

### Archivos tocados
- `.env.example`
- `BACKLOG.md`
- `Handoff.md`
- `MULTITENANT_ARCHITECTURE.md`
- `README.md`
- `bigquery/greenhouse_clients.sql`
- `bigquery/greenhouse_identity_access_v1.sql`
- `bigquery/greenhouse_project_scope_bootstrap_v1.sql`
- `changelog.md`
- `project_context.md`
- `src/app/(dashboard)/admin/layout.tsx`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/admin/users/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/internal/layout.tsx`
- `src/app/(dashboard)/internal/dashboard/page.tsx`
- `src/app/(dashboard)/proyectos/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/sprints/page.tsx`
- `src/app/auth/landing/page.tsx`
- `src/app/page.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/lib/internal/get-internal-dashboard-overview.ts`
- `src/lib/tenant/access.ts`
- `src/lib/tenant/authorization.ts`
- `src/lib/tenant/clients.ts`
- `src/views/Login.tsx`
- `src/views/greenhouse/GreenhouseInternalDashboard.tsx`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Smoke BigQuery:
  - `greenhouse.client_users` usado como unica fuente runtime de auth: correcto
  - demo user y admin interno con bcrypt: correctos
  - scopes bootstrap para DDSoft, SSilva y Sky Airline: correctos
- Smoke HTTP local:
  - login de demo client: correcto
  - login de admin interno: correcto
  - redirects por `portalHomePath`: correctos
  - `/dashboard`, `/internal/dashboard` y `/admin/users` responden sin error server-side con sesion valida

### Riesgos o pendientes
- Los contactos cliente importados desde HubSpot siguen en estado `invited`; no se deben considerar usuarios finales activados hasta que exista onboarding.
- `greenhouse.clients` conserva columnas legacy de auth como metadata de compatibilidad; el runtime ya no las usa.
- `/internal/dashboard` y `/admin/users` son superficies minimas de Fase 1, no producto final.

### Proximo paso recomendado
- Iniciar Fase 2 con `/api/dashboard/charts` y el rediseño ejecutivo de `/dashboard`.

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Diagnosticar por que `pre-greenhouse.efeoncepro.com/login` seguia rechazando el admin interno aunque el usuario existia y el hash estaba correcto.
- Corregir el runtime real de `Preview` y confirmar acceso valido.

### Rama
- Rama usada: `feature/tenant-auth-bq`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Preview de feature branch sobre `pre-greenhouse.efeoncepro.com`

### Archivos tocados
- `Handoff.md`
- `MULTITENANT_ARCHITECTURE.md`
- `README.md`
- `changelog.md`
- `project_context.md`
- `src/lib/auth.ts`
- `src/lib/bigquery.ts`

### Verificacion
- Query directa a `greenhouse.client_users` para `julio.reyes@efeonce.org`: correcta
- `bcrypt.compare('Julio2026!Greenhouse', password_hash)`: correcto
- `vercel env pull` de `Preview` para `feature/tenant-auth-bq`: correcto
- Validacion local del secreto `GOOGLE_APPLICATION_CREDENTIALS_JSON`:
  - formato legacy escapado: correcto con el parser nuevo
  - formato JSON minified: correcto con el parser nuevo
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Commit `f918641` y push de la rama: correctos
- Alias de `pre-greenhouse.efeoncepro.com` al deployment mas reciente: correcto
- Login real en Preview: correcto

### Riesgos o pendientes
- El mensaje de UI de login sigue siendo generico a proposito; no distingue lookup fallido de error interno para no exponer detalles al usuario final.
- En `Preview`, Vercel puede entregar `GOOGLE_APPLICATION_CREDENTIALS_JSON` en mas de una serializacion. Si reaparece un falso `Invalid credentials`, revisar primero ese parseo y el alias activo del dominio.
- Los contactos cliente bootstrap desde HubSpot siguen `invited`, por lo que el acceso confirmado hoy es el admin interno de Efeonce.

### Proximo paso recomendado
- Iniciar Fase 2 con `/api/dashboard/charts` y el dashboard ejecutivo cliente.
- Mantener el parser de BigQuery tolerante a ambos formatos de secreto mientras Vercel siga entregando ambas variantes en `Preview`.

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Promover Fase 1 estable desde `feature/tenant-auth-bq` hacia `develop` y `main`.
- Validar que `staging` y `Production` quedaran autentificando correctamente.
- Corregir configuracion rota de Vercel en ambientes persistentes.

### Rama
- Rama usada: `main`
- Ramas promovidas: `feature/tenant-auth-bq` -> `develop` -> `main`

### Ambiente objetivo
- `staging` (`dev-greenhouse.efeoncepro.com`)
- `Production` (`greenhouse.efeoncepro.com`)

### Archivos tocados
- `Handoff.md`
- `changelog.md`

### Verificacion
- Merge `feature/tenant-auth-bq` -> `develop`: correcto
- Push `develop`: correcto
- Nuevo deployment `staging`: `greenhouse-njozg0ttt-efeonce-7670142f.vercel.app`
- Merge `develop` -> `main`: correcto
- Push `main`: correcto
- Nuevo deployment `Production`: `greenhouse-m1upubtnb-efeonce-7670142f.vercel.app`
- Diagnostico de env real con `vercel env pull`:
  - `staging` y `Production` tenian `GOOGLE_APPLICATION_CREDENTIALS_JSON` y/o `NEXTAUTH_SECRET` mal cargados
- Reescritura de variables en Vercel:
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
- Redeploy de `staging` y `Production`: correctos
- Validacion final en `Production`:
  - `/login`: 200
  - `/api/auth/csrf`: 200
  - login de `julio.reyes@efeonce.org`: correcto
  - `/internal/dashboard`: correcto
  - `/admin/users`: correcto

### Riesgos o pendientes
- `staging` sigue protegido por Vercel Authentication, por lo que la validacion CLI completa del login requiere `vercel curl` o bypass; el deployment y variables quedaron corregidos, pero la verificacion completa mas limpia se hizo en `Production`.
- Los contactos cliente bootstrap desde HubSpot siguen `invited`; el acceso confirmado y operativo hoy es el admin interno de Efeonce.
- El parser tolerante de `GOOGLE_APPLICATION_CREDENTIALS_JSON` debe mantenerse porque Vercel no esta entregando una sola serializacion consistente entre ambientes.

### Proximo paso recomendado
- Iniciar Fase 2 con `/api/dashboard/charts` y la home ejecutiva real del portal.
- Antes de abrir accesos cliente reales, definir onboarding para usuarios `invited` y flujo de activacion/reset.
