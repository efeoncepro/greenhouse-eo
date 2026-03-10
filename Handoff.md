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
