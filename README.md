# Greenhouse Portal

Portal multi-tenant de Efeonce construido sobre Vuexy + Next.js. Este repositorio ya no funciona como starter genérico: hoy es la base operativa real de Greenhouse para clientes, equipo interno, administración y vistas transversales agency.

## Qué es hoy el proyecto

Greenhouse ya corre como una aplicación App Router con:

- autenticación con `next-auth` contra `greenhouse.client_users`
- login por `credentials`, Microsoft Entra ID y Google OAuth
- data server-side desde BigQuery
- superficies cliente, `internal`, `admin`, `agency` y `capabilities`
- branding y nomenclatura Greenhouse encima de Vuexy, sin crear un theme paralelo

El portal no busca reemplazar Notion ni HubSpot. Su rol es exponer lectura ejecutiva, contexto operativo y gobierno de acceso sobre las fuentes de verdad reales.

## Superficies activas

### Cliente

- `/dashboard`
- `/proyectos`
- `/proyectos/[id]`
- `/sprints`
- `/sprints/[id]`
- `/settings`
- `/capabilities/[moduleId]`
- `/updates`

### Acceso

- `/login`
- `/auth/landing`
- `/auth/access-denied`

### Interno y administración

- `/internal/dashboard`
- `/admin`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/roles`
- `/admin/tenants`
- `/admin/tenants/[id]`
- `/admin/tenants/[id]/view-as/dashboard`
- `/admin/tenants/[id]/capability-preview/[moduleId]`

### Agency

- `/agency`
- `/agency/spaces`
- `/agency/spaces/[spaceId]`
- `/agency/capacity`

## APIs activas

### Dashboard y proyecto

- `/api/dashboard/kpis`
- `/api/dashboard/summary`
- `/api/dashboard/charts`
- `/api/dashboard/risks`
- `/api/projects`
- `/api/projects/[id]`
- `/api/projects/[id]/tasks`

### Team

- `/api/team/members`
- `/api/team/capacity`
- `/api/team/by-project/[projectId]`
- `/api/team/by-sprint/[sprintId]`

### Capabilities

- `/api/capabilities/resolve`
- `/api/capabilities/[moduleId]/data`

### Agency

- `/api/agency/pulse`
- `/api/agency/spaces`
- `/api/agency/capacity`

### Admin e integración

- `/api/admin/tenants/[id]/capabilities`
- `/api/admin/tenants/[id]/capabilities/sync`
- `/api/admin/tenants/[id]/contacts/provision`
- `/api/admin/tenants/[id]/logo`
- `/api/admin/users/[id]/avatar`
- `/api/media/tenants/[id]/logo`
- `/api/media/users/[id]/avatar`
- `/api/integrations/v1/tenants`
- `/api/integrations/v1/tenants/capabilities/sync`
- `/api/integrations/v1/catalog/capabilities`

## Stack

- Next.js 16.1.1
- React 19.2.3
- TypeScript 5.9.3
- MUI 7
- Vuexy como base de shell, navegación y patrones UI
- `next-auth` para sesión
- `@google-cloud/bigquery` para lectura de datos
- PNPM
- Vercel como plataforma de deploy

## Fuentes de datos y contratos

- BigQuery es la fuente principal del portal.
- Las queries viven server-side; el browser no consulta BigQuery directamente.
- El modelo real de acceso parte de:
  - `greenhouse.client_users`
  - `greenhouse.roles`
  - `greenhouse.user_role_assignments`
  - `greenhouse.user_project_scopes`
  - `greenhouse.user_campaign_scopes`
- El dashboard, agency, capabilities, team y varias superficies admin ya leen tablas reales de `greenhouse` y `notion_ops`.

## Estado funcional actual

- El portal ya protege superficies autenticadas con `next-auth`.
- Microsoft SSO y Google SSO ya conviven con `credentials` sobre el mismo principal canónico.
- El dashboard cliente ya es una vista ejecutiva real, no una demo.
- Proyectos, detalle de proyecto, sprints, settings, admin tenants y agency ya existen como módulos vivos.
- Capabilities ya tiene routing, resolución por tenant y preview admin.
- Team/capacity ya tiene APIs dedicadas y componentes propios de Greenhouse.
- El runtime ya soporta persistencia de logo de tenant y avatar de usuario.

## Setup local

Instalación:

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

Lint:

```bash
npx pnpm lint
```

Limpieza:

```bash
npx pnpm clean
```

## Variables de entorno

Variables activas en `.env.example`:

- `NEXT_PUBLIC_APP_URL`
- `BASEPATH`
- `GCP_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64`
- `GREENHOUSE_AGENT_MODEL`
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`

Notas operativas:

- `BASEPATH` solo debe definirse si realmente se usa `basePath`.
- Para previews con login real, las variables de auth y credenciales GCP deben existir también en `Preview`.
- Para Microsoft SSO y Google SSO, los redirect URIs deben estar registrados en Azure y GCP respectivamente.

## Convenciones del repo

- `main` representa producción.
- `develop` es la rama de integración y staging.
- El trabajo normal sale desde ramas `feature/*`, `fix/*`, `docs/*` o `hotfix/*`.
- `full-version` se usa solo como referencia local de Vuexy; no es parte del producto ni debe volverse source of truth.
- Los componentes reutilizables de Greenhouse viven en `src/components/greenhouse/*`.
- La composición por ruta vive en `src/views/greenhouse/*` o en la capa App Router correspondiente.

## GitHub y colaboración

- Este repo es `private` y su distribución sigue el modelo comercial declarado en `package.json`; no debe asumirse una licencia open source por defecto.
- Los cambios deben entrar por Pull Request hacia `develop` o `main`, usando el template de PR y dejando evidencia de validación.
- GitHub Actions valida `pnpm lint` y `pnpm build` en pushes y PRs relevantes antes de promoción.
- Dependabot revisa dependencias de `npm` y GitHub Actions semanalmente.
- Seguridad y soporte del repositorio quedan documentados en `.github/SECURITY.md` y `.github/SUPPORT.md`.
- La asignación de revisión por defecto vive en `.github/CODEOWNERS`.

## Documentation Map

### En raíz

- `README.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `project_context.md`
- `Handoff.md`
- `Handoff.archive.md`
- `changelog.md`

### En `docs/`

- `docs/README.md`: mapa maestro
- `docs/architecture/*`: arquitectura, identidad, multitenancy, nomenclatura, capabilities
- `docs/api/*`: contratos de integración y API
- `docs/ui/*`: sistema visual, orquestación UI y validación visual
- `docs/roadmap/*`: backlog y matriz de fases
- `docs/operations/*`: modelo de documentación
- `docs/tasks/*`: briefs `CODEX_TASK_*`

## Qué leer primero

Si vas a trabajar en el repo:

1. `AGENTS.md`
2. `project_context.md`
3. `Handoff.md`
4. `docs/README.md`

Si el cambio toca producto, auth, data o arquitectura:

1. `../Greenhouse_Portal_Spec_v1.md`
2. `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
3. `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`

Si el cambio es UI:

1. `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
2. `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
3. `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
4. `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
