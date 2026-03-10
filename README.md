# Greenhouse Portal

Portal de clientes de Efeonce construido sobre Vuexy + Next.js. Este repositorio contiene la base operativa del producto Greenhouse y ya no debe tratarse como un starter generico.

## Objetivo

Greenhouse busca darle a cada cliente acceso a:
- metricas ICO
- estado de su operacion creativa
- dashboards de entrega, velocidad, capacidad y riesgo
- contexto de proyectos, tareas y sprints sin reemplazar Notion
- una capa de transparencia conectada al sistema Greenhouse

La especificacion funcional principal esta en:
- `../Greenhouse_Portal_Spec_v1.md`

La documentacion operativa interna del repo esta en:
- `AGENTS.md`
- `BACKLOG.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `Handoff.md`
- `MULTITENANT_ARCHITECTURE.md`
- `project_context.md`
- `changelog.md`

Documento maestro:
- `GREENHOUSE_ARCHITECTURE_V1.md`

Ese documento define:
- el norte del producto
- el modelo multi-tenant y multi-user
- las fases de implementacion
- que se puede trabajar en paralelo
- la separacion entre cliente, Efeonce interno y admin

Documento tecnico de Fase 1:
- `GREENHOUSE_IDENTITY_ACCESS_V1.md`

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

## Estado Actual

Estado hoy:
- base tecnica funcionando en Vercel
- shell Greenhouse visible en las rutas principales del portal
- branding base integrado en navegacion y favicon temporal
- `next-auth` ya protege el dashboard y autentica solo contra `greenhouse.client_users`
- el login ya no muestra bloque demo ni mensajes internos de infraestructura
- credenciales de BigQuery cargadas en Vercel para `Development`, `staging` y `Production`
- `@google-cloud/bigquery` ya esta integrado en el repo
- existe `/api/dashboard/kpis` con queries server-side a BigQuery
- existen `/api/dashboard/summary`, `/api/dashboard/charts` y `/api/dashboard/risks`
- existe `/api/projects` con queries server-side a BigQuery
- existen `/api/projects/[id]` y `/api/projects/[id]/tasks` con autorizacion por tenant
- el dashboard principal ya es una vista ejecutiva real con charts estilo Vuexy sobre throughput, salud on-time, mix operativo, esfuerzo y proyectos bajo atencion
- la vista `/proyectos` ya consume datos reales filtrados por tenant
- la vista `/proyectos/[id]` ya muestra detalle de proyecto con tareas, review pressure y sprint context si existe
- `build` local estabilizado en Windows con salida dinamica bajo `.next-local/`
- existe un plan maestro de arquitectura y roadmap multi-agente en `GREENHOUSE_ARCHITECTURE_V1.md`
- ya existen en BigQuery `client_users`, `roles`, `user_role_assignments`, `user_project_scopes`, `user_campaign_scopes`, `client_feature_flags` y `audit_events`
- ya existe bootstrap real de clientes desde HubSpot para companias con al menos un `closedwon`
- ya existen `/auth/landing`, `/internal/dashboard`, `/admin` y `/admin/users` como superficies minimas de Fase 1
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
- el dashboard ya tiene un primer vertical slice real, pero aun no es el centro ejecutivo del producto
- faltan `/api/sprints` y `/api/dashboard/charts`
- `greenhouse.clients` todavia conserva columnas legacy de auth como metadata de compatibilidad, aunque el runtime ya no las usa para login
- aun no existe la capa de team/capacity y campaign intelligence
- las superficies `/internal/dashboard` y `/admin/users` son minimas; falta desarrollar sus vistas de negocio

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

Objetivo funcional:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Estado actual en Vercel:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` existe en `Development`, `staging` y `Production`
- `GCP_PROJECT` existe en `Development`, `staging` y `Production`
- `NEXTAUTH_SECRET` y `NEXTAUTH_URL` existen y deben configurarse tambien en `Preview` cuando una branch necesite login real

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
- dominio objetivo: `greenhouse.efeonce.com`

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

## Proximos Pasos Recomendados

1. Definir `client_users`, roles y scopes como siguiente base del modelo multi-tenant.
2. Agregar `/api/dashboard/charts` y rediseñar `/dashboard` como centro ejecutivo del producto.
3. Agregar `/api/sprints` y velocity real como contexto de velocidad, no como gestor de trabajo.
4. Diseñar la capa de `team/capacity`.
5. Diseñar la capa de `campaign intelligence`.
