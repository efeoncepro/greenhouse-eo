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

### Rama
- Rama usada: `feature/greenhouse-shell`
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
- La especificacion define un target productivo mas avanzado que el estado actual del starter kit.
- Si se modifican rutas o `basePath`, validar en Vercel de nuevo.
- El branding actual usa assets temporales entregados por el usuario; falta reemplazo por versiones finales de diseno.
- El repo sigue dentro de OneDrive; la salida dinamica de `build` reduce el problema, pero no elimina el riesgo sistemico del sync.
- En Windows local, `build` ya no reutiliza la misma carpeta de salida; `start` usa la ultima ruta registrada en `.next-build-dir`.
- La configuracion Git local que evita warnings vive en `.git/config`; si otro agente trabaja en otra maquina y reaparecen avisos, debe revisar `core.autocrlf` contra `.gitattributes`.

### Proximo paso recomendado
- Crear `/api/projects` filtrado por cliente y reemplazar la grilla mock de proyectos.
- Reemplazar el bootstrap `env_demo` por `password_hash` reales o SSO.
- Implementar `/proyectos/[id]` con detalle de tareas, estado y comentarios abiertos.
- Despues agregar `/api/sprints` y endurecer auth para un flujo multi-tenant real.
