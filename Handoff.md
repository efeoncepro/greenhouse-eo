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

## 2026-03-13 23:58 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Endurecer de verdad la identidad canonica del roster Efeonce para que Greenhouse sea la identidad base y los providers externos queden enlazados como enrichment.
- Dar una pasada visual adicional a las 4 surfaces live del task usando patrones Vuexy ya presentes en el repo.

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Development / BigQuery real / preview readiness

### Archivos tocados
- `src/types/team.ts`
- `src/lib/team-queries.ts`
- `scripts/setup-team-tables.sql`
- `src/config/greenhouse-nomenclature.ts`
- `src/components/greenhouse/TeamIdentityBadgeGroup.tsx`
- `src/components/greenhouse/TeamMemberCard.tsx`
- `src/components/greenhouse/TeamDossierSection.tsx`
- `src/components/greenhouse/TeamCapacitySection.tsx`
- `src/components/greenhouse/ProjectTeamSection.tsx`
- `src/components/greenhouse/SprintTeamVelocitySection.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `pnpm lint`: correcto
- `pnpm build`: correcto
- `scripts/setup-team-tables.sql` reaplicado en BigQuery real: correcto
- Verificacion directa en BigQuery:
  - `greenhouse.team_members` ahora expone `identity_profile_id` y `email_aliases`
  - el roster Efeonce quedo con `7` miembros enlazados a perfil canonico
  - `identity_profile_source_links` ahora incluye links activos de `greenhouse_team`, `greenhouse_auth`, `notion`, `hubspot_crm` y `azure_ad`
  - el perfil legado `identity-hubspot-crm-owner-75788512` de Julio quedo `archived` / `active = FALSE`
  - `greenhouse.team_members` ahora tambien expone columnas de perfil ampliado: `first_name`, `last_name`, `preferred_name`, `legal_name`, `org_role_id`, `profession_id`, `seniority_level`, `employment_type`, `birth_date`, `phone`, `teams_user_id`, `slack_user_id`, `location_city`, `location_country`, `time_zone`, `years_experience`, `efeonce_start_date`, `biography`, `languages`
  - `greenhouse.team_role_catalog` y `greenhouse.team_profession_catalog` ya quedaron sembradas en BigQuery real

### Riesgos o pendientes
- Falta validacion visual autenticada en Preview para confirmar la nueva jerarquia visual de las 4 cards con datos reales en navegador.
- La capa ya soporta futuros providers en `identity_profile_source_links`, pero todavia no existe ingestion real para `google_workspace`, `deel`, `frame_io` o `adobe`; el modelo quedo listo, no el sync.
- El perfil ampliado ya existe a nivel schema y runtime, pero varios atributos siguen `NULL` en seed porque no habia dato confirmado; para cerrar la ficha completa faltaria una fuente canonica de RRHH o un backoffice admin de talento.
- El repo externo `notion-bigquery` ya estaba alineado para `Responsables`; no hay cambio pendiente ahi por este ajuste salvo mergear su rama documental si se quiere dejar el contrato cerrado.

## 2026-03-13 23:20 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Cerrar los pendientes reales del runtime de team identity + capacity:
  - validar con Node local
  - endurecer y aplicar el bootstrap SQL en BigQuery
  - confirmar el nombre correcto del repo externo del sync

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Development / BigQuery real / preview readiness

### Archivos tocados
- `.eslintrc.js`
- `src/lib/team-queries.ts`
- `src/components/greenhouse/TeamDossierSection.tsx`
- `scripts/setup-team-tables.sql`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `pnpm lint`: correcto
- `pnpm build`: correcto
- `scripts/setup-team-tables.sql` aplicado en BigQuery real: correcto
  - `greenhouse.team_members`: `7` filas
  - `greenhouse.client_team_assignments`: `10` filas
- Verificacion directa en BigQuery:
  - `space-efeonce` quedo con `7` assignments seed
  - `hubspot-company-30825221458` quedo con `3` assignments seed
- `git ls-remote https://github.com/efeoncepro/notion-bigquery.git HEAD`: sin acceso util desde esta sesion
- `git ls-remote git@github.com:efeoncepro/notion-bigquery.git HEAD`: `Repository not found`

### Riesgos o pendientes
- El repo externo correcto del pipeline es `notion-bigquery`, no `notion-bq-sync`.
- Esa parte externa sigue pendiente porque el repo no esta en este workspace y no hubo acceso remoto valido desde esta sesion.
- La validacion ad hoc por import directo de `src/lib/team-queries.ts` con `tsx` choco con `server-only`; no indica fallo del feature, pero si que una smoke script reusable tendria que correr via entorno Next/server real o con un harness dedicado.

## 2026-03-13 22:15 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Implementar la base runtime del sistema de identidad y capacidad del equipo descrito en `CODEX_TASK_Team_Identity_Capacity_System.md` dentro del repo actual.

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Development / cliente / team identity + capacity

### Archivos tocados
- `src/types/team.ts`
- `src/lib/team-queries.ts`
- `src/app/api/team/members/route.ts`
- `src/app/api/team/capacity/route.ts`
- `src/app/api/team/by-project/[projectId]/route.ts`
- `src/app/api/team/by-sprint/[sprintId]/route.ts`
- `src/components/greenhouse/RequestDialog.tsx`
- `src/components/greenhouse/TeamAvatar.tsx`
- `src/components/greenhouse/TeamMemberCard.tsx`
- `src/components/greenhouse/TeamLoadBar.tsx`
- `src/components/greenhouse/UpsellBanner.tsx`
- `src/components/greenhouse/TeamDossierSection.tsx`
- `src/components/greenhouse/TeamCapacitySection.tsx`
- `src/components/greenhouse/ProjectTeamSection.tsx`
- `src/components/greenhouse/SprintTeamVelocitySection.tsx`
- `src/components/greenhouse/index.ts`
- `src/views/greenhouse/dashboard/DashboardRequestDialog.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/views/greenhouse/GreenhouseProjectDetail.tsx`
- `src/views/greenhouse/GreenhouseSprintDetail.tsx`
- `src/app/(dashboard)/sprints/[id]/page.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `scripts/setup-team-tables.sql`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- Inspeccion real de BigQuery via `INFORMATION_SCHEMA` usando las credenciales de `.env.local`: correcto.
  - `notion_ops.tareas` expone `responsables`, `responsables_ids`, `responsables_names` y `responsable_texto`.
  - No existe una tabla `notion_ops.users`/`usuarios` visible en ese dataset.
- No se pudo ejecutar `pnpm lint`, `pnpm build` ni `tsc` en esta sesion porque el runtime del terminal no expone `node`, `pnpm` ni `npx`.
- No se hizo smoke visual autenticado real de `/settings`, `/dashboard`, `/proyectos/[id]` ni `/sprints/[id]` despues del wiring.

### Riesgos o pendientes
- El task original menciona cambios al pipeline externo `notion-bq-sync`, pero ese repo no existe en este workspace; esa parte sigue bloqueada fuera de este turno.
- La implementacion usa el schema real hoy visible en BigQuery, no el schema hipotetico del documento. Si el pipeline cambia y normaliza columnas `responsable_*`, conviene reevaluar si mantener el alias runtime actual o simplificarlo.
- `/sprints/[id]` no existia en el repo y quedo habilitado en version minima para hospedar `Velocity por persona`; falta una pasada visual y decidir si la pagina debe crecer con mas contexto de sprint.
- `package.json` y `pnpm-lock.yaml` siguen sin tocarse; no hubo validacion JavaScript/TypeScript integral desde este terminal.

## 2026-03-13 20:05 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Implementar upload persistente de logo/foto para spaces y usuarios en los lugares donde hoy existian placeholders de identidad visual.

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Development / admin e internal / identidad visual persistente

### Archivos tocados
- `src/lib/storage/greenhouse-media.ts`
- `src/lib/admin/media-assets.ts`
- `src/lib/bigquery.ts`
- `src/lib/tenant/access.ts`
- `src/lib/auth.ts`
- `src/types/next-auth.d.ts`
- `src/app/api/admin/tenants/[id]/logo/route.ts`
- `src/app/api/admin/users/[id]/avatar/route.ts`
- `src/app/api/media/tenants/[id]/logo/route.ts`
- `src/app/api/media/users/[id]/avatar/route.ts`
- `src/components/greenhouse/IdentityImageUploader.tsx`
- `src/components/greenhouse/index.ts`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/internal/dashboard/InternalControlTowerTable.tsx`
- `src/views/greenhouse/admin/users/UserListTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantUsersTable.tsx`
- `src/lib/admin/get-admin-tenant-detail.ts`
- `src/lib/admin/get-admin-tenants-overview.ts`
- `src/lib/admin/get-admin-user-detail.ts`
- `src/lib/admin/get-admin-access-overview.ts`
- `src/lib/internal/get-internal-dashboard-overview.ts`
- `src/config/greenhouse-nomenclature.ts`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint src/lib/bigquery.ts src/lib/storage/greenhouse-media.ts src/lib/admin/media-assets.ts 'src/app/api/admin/tenants/[id]/logo/route.ts' 'src/app/api/admin/users/[id]/avatar/route.ts' 'src/app/api/media/tenants/[id]/logo/route.ts' 'src/app/api/media/users/[id]/avatar/route.ts' src/components/greenhouse/IdentityImageUploader.tsx src/components/greenhouse/index.ts src/lib/admin/get-admin-tenant-detail.ts src/lib/admin/get-admin-tenants-overview.ts src/lib/admin/get-admin-user-detail.ts src/lib/admin/get-admin-access-overview.ts src/lib/internal/get-internal-dashboard-overview.ts src/lib/tenant/access.ts src/lib/auth.ts src/types/next-auth.d.ts src/components/layout/shared/UserDropdown.tsx src/views/greenhouse/GreenhouseAdminUserDetail.tsx src/views/greenhouse/admin/users/UserListTable.tsx src/views/greenhouse/admin/tenants/TenantUsersTable.tsx src/views/greenhouse/GreenhouseAdminTenants.tsx src/views/greenhouse/internal/dashboard/InternalControlTowerTable.tsx src/views/greenhouse/GreenhouseAdminTenantDetail.tsx src/config/greenhouse-nomenclature.ts`: correcto
- `npx pnpm exec tsc -p tsconfig.json --noEmit --pretty false --incremental false`: sigue bloqueado solo por el archivo duplicado ajeno `src/config/capability-registry (1).ts`

### Riesgos o pendientes
- No se hizo smoke visual autenticado real del flujo de upload ni prueba end-to-end contra GCS/BigQuery en este turno; la validacion fue estatica.
- `package.json` y `pnpm-lock.yaml` siguen modificados en el worktree por trabajo ajeno y no deben mezclarse por accidente con este commit.
- Si el bucket `${GCP_PROJECT}-greenhouse-media` no existe en un ambiente dado, hay que crearlo o definir `GREENHOUSE_MEDIA_BUCKET` antes de probar uploads reales.

## 2026-03-13 20:28 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Verificar por que `pre-greenhouse.efeoncepro.com` no mostraba el estado nuevo de la rama y corregir el bloqueo de Preview en Vercel.

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Preview de Vercel / branch `fix/internal-nav-nomenclature-hydration`

### Archivos tocados
- `tsconfig.json`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `vercel inspect pre-greenhouse.efeoncepro.com -S efeonce-7670142f`: el alias `pre-greenhouse.efeoncepro.com` sigue apuntando a `greenhouse-5jepkohhj-efeonce-7670142f.vercel.app`, no al preview activo de la rama.
- `vercel inspect greenhouse-o05bk3bl7-efeonce-7670142f.vercel.app --logs -S efeonce-7670142f`: el ultimo deploy del branch `fix/internal-nav-nomenclature-hydration` estaba fallando en build por `src/config/capability-registry (1).ts`.
- `npx pnpm exec tsc -p tsconfig.json --noEmit --pretty false --incremental false`: correcto despues de excluir duplicados `* (1).ts(x)` del typecheck.

### Riesgos o pendientes
- Aunque el branch vuelva a desplegar en `Ready`, `pre-greenhouse.efeoncepro.com` seguira mostrando el deployment viejo hasta que se re-asigne o se promueva manualmente el alias.
- Sigue pendiente confirmar visualmente que el uploader y los logos cargados ya aparecen en la preview nueva una vez que Vercel termine el deploy sano.

## 2026-03-13 18:46 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Incorporar los nuevos SVG de branding cargados en `public/branding/SVG` y reemplazar placeholders previos en el shell y en superficies donde `Globe`, `Reach`, `Wave` y `Efeonce` ya forman parte visible de la experiencia.

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Development / branding / shell autenticado / business lines

### Archivos tocados
- `src/components/greenhouse/brand-assets.ts`
- `src/components/greenhouse/BrandWordmark.tsx`
- `src/components/greenhouse/BrandLogo.tsx`
- `src/components/greenhouse/BusinessLineBadge.tsx`
- `src/components/greenhouse/AccountTeamDossierSection.tsx`
- `src/components/greenhouse/index.ts`
- `src/components/layout/shared/Logo.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/app/layout.tsx`
- `src/app/(blank-layout-pages)/auth/access-denied/page.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/internal/dashboard/InternalControlTowerTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantCapabilityManager.tsx`
- `src/views/greenhouse/admin/tenants/TenantServiceModulesTable.tsx`
- `src/views/greenhouse/dashboard/ClientDashboardHero.tsx`
- `src/views/greenhouse/dashboard/config.ts`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint src/components/greenhouse/brand-assets.ts src/components/greenhouse/BusinessLineBadge.tsx src/components/greenhouse/BrandLogo.tsx src/components/greenhouse/AccountTeamDossierSection.tsx src/components/greenhouse/index.ts src/components/layout/shared/Logo.tsx src/app/layout.tsx src/views/greenhouse/GreenhouseAdminTenantDetail.tsx src/views/greenhouse/GreenhouseAdminTenants.tsx`: correcto

### Riesgos o pendientes
- El typo del asset `public/branding/SVG/isotipo-goble-full.svg` se consume tal como existe en disco; si luego se corrige el nombre del archivo, hay que ajustar el registry.
- Esta ronda ya cubre shell, hero cliente, footers, business lines visibles y superficies principales de admin/internal; conviene hacer una pasada visual real para confirmar tamaños y contraste de wordmarks negativos sobre fondos oscuros.

## 2026-03-13 14:58 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Corregir la interpretacion de `Greenhouse_Nomenclatura_Portal_v3.md` para no mezclar la navegacion cliente del documento con labels de `internal/admin`, y realinear la distribucion del sidebar cliente.

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Development / preview / sidebar cliente / nomenclatura operativa

### Archivos tocados
- `src/config/greenhouse-nomenclature.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/views/greenhouse/dashboard/ClientDashboardHero.tsx`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/GreenhouseAdminRoles.tsx`
- `src/views/greenhouse/admin/users/UserListTable.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/data/navigation/verticalMenuData.tsx`
- `src/data/navigation/horizontalMenuData.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint src/config/greenhouse-nomenclature.ts src/components/layout/vertical/VerticalMenu.tsx src/components/layout/shared/UserDropdown.tsx src/views/greenhouse/GreenhouseDashboard.tsx src/views/greenhouse/GreenhouseProjects.tsx src/views/greenhouse/GreenhouseSprints.tsx src/views/greenhouse/GreenhouseSettings.tsx src/views/greenhouse/dashboard/ClientDashboardHero.tsx src/views/greenhouse/GreenhouseAdminTenants.tsx src/views/greenhouse/GreenhouseAdminRoles.tsx src/views/greenhouse/admin/users/UserListTable.tsx src/components/layout/vertical/FooterContent.tsx src/components/layout/horizontal/FooterContent.tsx src/data/navigation/verticalMenuData.tsx src/data/navigation/horizontalMenuData.tsx`: correcto
- No se hizo validacion visual autenticada real del sidebar cliente o admin despues de este ajuste.

### Riesgos o pendientes
- La separacion cliente vs internal/admin ya corrige el boundary conceptual, pero aun falta un barrido route-by-route del microcopy cliente contra el documento completo.
- La seccion dinamica `Servicios` sigue viva en el sidebar cliente por necesidad de runtime de capabilities; conviene validarla despues contra la arquitectura de navegacion del producto y no solo contra el doc de nomenclatura.

## 2026-03-13 14:24 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Endurecer el parseo de credenciales BigQuery para Preview de branch en Vercel y revisar desalineaciones de microcopy contra `Greenhouse_Nomenclatura_Portal_v3.md`.

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Preview / login / branding publico / runtime auth BigQuery

### Archivos tocados
- `src/lib/bigquery.ts`
- `src/config/greenhouse-nomenclature.ts`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/GreenhouseAdminRoles.tsx`
- `src/views/greenhouse/admin/users/UserListTable.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint src/views/Login.tsx src/lib/bigquery.ts`: correcto antes de la ronda final de microcopy
- `npx tsc -p tsconfig.json --noEmit --pretty false --incremental false`: bloqueado por archivos duplicados ajenos ya presentes en el worktree (`*(1).ts`, `*(1).tsx`) fuera de este cambio
- `vercel inspect https://pre-greenhouse.efeoncepro.com -S efeonce-7670142f`: correcto, alias apuntando a la preview vigente de la branch
- `vercel logs https://pre-greenhouse.efeoncepro.com -S efeonce-7670142f --no-follow --since 10m --expand`: detecto fallo previo de parseo en `GOOGLE_APPLICATION_CREDENTIALS_JSON`

### Riesgos o pendientes
- Falta rerun de lint sobre el slice final con microcopy admin/settings.
- Falta volver a publicar la ronda final de microcopy en Vercel.
- Si el branch sigue fallando en credenciales despues del fallback base64, cargar `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` en Preview de la branch y redeployar antes de volver a diagnosticar password o provisionamiento.

## 2026-03-13 12:46 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Corregir el desalineamiento post-branding donde `/internal/dashboard` y superficies admin arrancaban con nomenclatura Greenhouse parcial y luego hidrataban a labels legacy/Vuexy, ademas de revisar escapes de tema por cookies viejas.

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Development / production fix candidate / shell autenticado / branding runtime

### Archivos tocados
- `src/@core/utils/brandSettings.ts`
- `src/@core/contexts/settingsContext.tsx`
- `src/@core/utils/serverHelpers.ts`
- `src/components/auth/AuthSessionProvider.tsx`
- `src/components/Providers.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint src/@core/utils/brandSettings.ts src/@core/contexts/settingsContext.tsx src/@core/utils/serverHelpers.ts src/components/auth/AuthSessionProvider.tsx src/components/Providers.tsx "src/app/(dashboard)/layout.tsx" src/config/greenhouse-nomenclature.ts src/components/layout/vertical/VerticalMenu.tsx src/components/layout/shared/UserDropdown.tsx`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false --incremental false`: correcto
- `npx pnpm build`: correcto
- No se ejecuto smoke visual autenticado en navegador real despues del fix; la validacion fue estatico + build

### Riesgos o pendientes
- El fix elimina el flicker del shell autenticado y bloquea `primaryColor/skin/semiDark` legacy en cookie, pero no reescribe aun copy legacy fuera del nav/dropdown en vistas admin como headers o tablas.
- Si algun usuario esperaba seguir personalizando color primario o `skin` desde cookies legacy/customizer, ese comportamiento ya no se preserva; se mantiene solo `mode`, `layout` y widths.
- Conviene hacer smoke visual real en `/internal/dashboard`, `/admin/tenants`, `/admin/users` y `/admin/roles` en preview o staging para confirmar que no queda ningun escape visual de Vuexy en runtime autenticado.

## 2026-03-13 12:01 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Cerrar la ejecucion real de `Greenhouse_Nomenclatura_Portal_v3.md`, no solo a nivel de labels, sino tambien en theming, tipografia, sidebar branded y copy secundaria del dashboard cliente activo.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / client portal / nomenclature + branding runtime / Vuexy theme-safe rollout

### Archivos tocados
- `src/config/greenhouse-nomenclature.ts`
- `src/configs/primaryColorConfig.ts`
- `src/configs/themeConfig.ts`
- `src/app/layout.tsx`
- `src/styles/greenhouse-sidebar.css`
- `src/components/theme/index.tsx`
- `src/components/theme/mergedTheme.ts`
- `src/components/theme/types.ts`
- `src/components/layout/shared/Logo.tsx`
- `src/components/layout/vertical/Navigation.tsx`
- `src/components/layout/horizontal/VerticalNavContent.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/dashboard/ClientPortfolioHealthAccordion.tsx`
- `src/views/greenhouse/dashboard/ClientAttentionProjectsAccordion.tsx`
- `src/views/greenhouse/dashboard/ClientEcosystemSection.tsx`
- `src/views/greenhouse/dashboard/chart-options.ts`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint ...` sobre el slice tocado de nomenclatura, theme y dashboard cliente: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false --incremental false`: correcto
- `npx pnpm build`: correcto
- No se ejecuto validacion visual autenticada real en `/login`, `/dashboard`, `/proyectos`, `/sprints` o `/settings`

### Riesgos o pendientes
- Falta smoke visual autenticado real del sidebar branded, login y dashboard cliente siguiendo `GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`; este turno valido estructura y build, no jerarquia visual final.
- `themeConfig.mode` queda en `light` como default del documento, pero el switch runtime de `light/dark/system` sigue existiendo; conviene revisar que el look & feel en `dark` no necesite ajuste fino despues del smoke visual.
- El documento completo sigue siendo mas amplio que este slice: admin e internal aun conservan copy legacy fuera de la capa centralizada y no fueron objetivo de este turno.

## 2026-03-13 11:09 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Ejecutar `Greenhouse_Nomenclatura_Portal_v3.md` sobre las superficies cliente principales sin romper el sistema de theming oficial de Vuexy.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / client portal / nomenclature rollout / Vuexy theme-safe UI wiring

### Archivos tocados
- `src/config/greenhouse-nomenclature.ts`
- `src/views/Login.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/views/greenhouse/dashboard/*`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/data/navigation/*`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint ...` sobre los archivos tocados de nomenclatura y superficies cliente: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: timeout en este worktree (`124s`), no verificado

### Riesgos o pendientes
- La nomenclatura v3 ya cubre login, navegacion y las rutas cliente principales, pero todavia quedan textos legacy fuera de este slice en componentes secundarios de dashboard, admin e internal.
- Se ratifico que Vuexy debe seguir siendo la capa de theming base; si otro agente quiere tocar paleta global u overrides compartidos, debe hacerlo por `src/components/theme/mergedTheme.ts` o `@core/theme/*`, no con un theme custom paralelo.
- Conviene correr una validacion visual autenticada real sobre `/dashboard`, `/proyectos`, `/sprints`, `/settings` y `/login` antes de promover este cambio.

## 2026-03-13 14:39 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Subir la barra visual de `Creative Hub` para que la capability no solo cumpla el runtime del documento, sino que reutilice de forma explicita patrones Vuexy de `full-version`.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / capability runtime / Creative Hub / visual refactor / smoke autenticado

### Archivos tocados
- `src/components/capabilities/CapabilityOverviewHero.tsx`
- `src/components/capabilities/CapabilityCard.tsx`
- `src/components/card-statistics/HorizontalWithSubtitle.tsx`
- `src/views/greenhouse/GreenhouseCapabilityModule.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint src/components/card-statistics/HorizontalWithSubtitle.tsx src/components/capabilities/CapabilityOverviewHero.tsx src/components/capabilities/CapabilityCard.tsx src/views/greenhouse/GreenhouseCapabilityModule.tsx`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false --incremental false`: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto

### Riesgos o pendientes
- `Creative Hub` ya usa de forma activa patrones visuales adaptados de `full-version`, pero solo este modulo quedo llevado a esa barra; el resto de capabilities aun usan el dispatcher declarativo con visuales mas sobrios.
- `HorizontalWithSubtitle` ahora admite ocultar trend cuando no existe una delta real; si otro agente lo reutiliza, esa flexibilidad ya es parte del contrato del componente.
- `next build` sigue mostrando el mensaje de reconfiguracion de `tsconfig.json`; en este turno no dejo basura porque el archivo se limpio antes de cerrar.

## 2026-03-13 11:42 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Consolidar `Creative Hub` como el primer modulo enriquecido del runtime declarativo de capabilities y ampliar el card catalog real sin romper los otros modules.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / capability runtime / Creative Hub / smoke autenticado

### Archivos tocados
- `src/types/capabilities.ts`
- `src/config/capability-registry.ts`
- `src/lib/capability-queries/helpers.ts`
- `src/lib/capability-queries/creative-hub.ts`
- `src/lib/capability-queries/crm-command-center.ts`
- `src/lib/capability-queries/onboarding-center.ts`
- `src/lib/capability-queries/web-delivery-lab.ts`
- `src/components/capabilities/CapabilityCard.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`
- `tsconfig.json`

### Verificacion
- `npx pnpm exec eslint src/types/capabilities.ts src/config/capability-registry.ts src/lib/capability-queries/helpers.ts src/lib/capability-queries/creative-hub.ts src/lib/capability-queries/crm-command-center.ts src/lib/capability-queries/onboarding-center.ts src/lib/capability-queries/web-delivery-lab.ts src/components/capabilities/CapabilityCard.tsx`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto

### Riesgos o pendientes
- `Creative Hub` ya usa `cardData` propio y dos card types nuevos (`metric-list`, `chart-bar`), pero el catalogo del documento completo aun es mayor y sigue siendo backlog.
- `next build` sigue reinyectando includes especificos en `tsconfig.json`; se mantuvo el cleanup manual antes de cerrar este turno.
- El siguiente bloque natural, si se sigue expandiendo capabilities, es extraer otro modulo real sobre el mismo patron declarativo enriquecido, probablemente `CRM Command` o un modulo nuevo del documento.

## 2026-03-13 09:11 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Cubrir la parte literal restante del documento en frontend: `CapabilityCard` dispatcher y `ModuleLayout` declarativo guiado por `data.module.cards`.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / capability runtime / frontend declarativo / smoke autenticado

### Archivos tocados
- `src/components/capabilities/CapabilityCard.tsx`
- `src/components/capabilities/ModuleLayout.tsx`
- `src/views/greenhouse/GreenhouseCapabilityModule.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`
- `tsconfig.json`

### Verificacion
- `npx pnpm exec eslint src/components/capabilities/CapabilityCard.tsx src/components/capabilities/ModuleLayout.tsx src/views/greenhouse/GreenhouseCapabilityModule.tsx`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto

### Riesgos o pendientes
- El dispatcher declarativo cubre los card types reales del registry actual (`metric`, `project-list`, `tooling-list`, `quality-list`), no aun el catalogo amplio completo del documento.
- `next build` sigue intentando reinyectar includes especificos en `tsconfig.json`; se mantuvo el cleanup manual antes del commit.
- Los modulos futuros y pipelines nuevas del documento siguen siendo backlog, no deuda de esta iteracion.

## 2026-03-13 08:39 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Ejecutar la siguiente capa pendiente de `Greenhouse_Capabilities_Architecture_v1.md`: query builders dedicados, cache por capability y guard server-side reusable, dejando el flujo validado y publicado.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / capability runtime / BigQuery / smoke autenticado / build local

### Archivos tocados
- `src/config/capability-registry.ts`
- `src/types/capabilities.ts`
- `src/lib/capabilities/get-capability-module-data.ts`
- `src/lib/capabilities/module-content-builders.ts`
- `src/lib/capabilities/resolve-capabilities.ts`
- `src/lib/capabilities/verify-module-access.ts`
- `src/lib/capability-queries/*`
- `src/app/api/capabilities/[moduleId]/data/route.ts`
- `src/app/(dashboard)/capabilities/[moduleId]/layout.tsx`
- `scripts/mint-local-admin-jwt.js`
- `tsconfig.json`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint ...` sobre la nueva capa de capabilities: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto
- `node .\\scripts\\mint-local-admin-jwt.js`: correcto

### Riesgos o pendientes
- La UI de capabilities sigue siendo una composicion ejecutiva compartida; el avance de este turno separa la data layer y el guard, pero no implementa aun el dispatcher completo de card types propuesto por la spec.
- `next build` sigue intentando reinyectar includes especificos en `tsconfig.json`; el workaround operativo sigue siendo limpiar esos paths autogenerados antes de commitear.
- El documento original menciona modulos futuros como `Review Engine`, `Performance Center` o `SEO Monitor`; esos siguen fuera del scope activo y requeriran nuevas pipelines de datos.

## 2026-03-13 07:21 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Cerrar la validacion pendiente de `Greenhouse_Capabilities_Architecture_v1.md` con preview admin autenticada, smoke local real y estabilizacion de la verificacion TypeScript en este worktree.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / admin preview / capability runtime / smoke local autenticado

### Archivos tocados
- `src/lib/capabilities/get-capability-module-data.ts`
- `src/lib/capabilities/module-content-builders.ts`
- `src/types/capabilities.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantCapabilityPreview.tsx`
- `src/app/(dashboard)/admin/tenants/[id]/capability-preview/[moduleId]/page.tsx`
- `scripts/mint-local-admin-jwt.js`
- `scripts/run-capability-preview-smoke.ps1`
- `tsconfig.json`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `gcloud auth login --update-adc`: correcto
- `gcloud auth application-default print-access-token`: correcto
- `npx pnpm exec eslint ...` sobre archivos de capabilities y preview admin: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1 -SkipScreenshots`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto
- Smoke validado sobre:
  - `/admin/tenants/space-efeonce/view-as/dashboard`
  - `/admin/tenants/space-efeonce/capability-preview/creative-hub`

### Riesgos o pendientes
- El documento original sigue proponiendo query builders dedicados por module; hoy la data de cada capability sigue montada sobre el contrato de `/dashboard` con builders editoriales separados.
- La ruta preview admin se movio a `capability-preview` porque el nesting anterior bajo `view-as/capabilities` provocaba corrupcion de route types en Next 16 durante typegen.
- `tsconfig.json` deja fuera validators historicos de `.next-local/build-*`; la intencion es estabilizar la verificacion del repo actual y no compilar caches de ramas antiguas.

## 2026-03-13 00:54 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Ejecutar `Greenhouse_Capabilities_Architecture_v1.md` sobre la arquitectura real del repo, alineando capabilities con `businessLines` y `serviceModules` ya resueltos en sesion y no con el modelo legacy de `greenhouse.clients`.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / client portal / navegacion dinamica / capabilities runtime

### Archivos tocados
- `src/types/capabilities.ts`
- `src/config/capability-registry.ts`
- `src/lib/capabilities/resolve-capabilities.ts`
- `src/lib/capabilities/get-capability-module-data.ts`
- `src/views/greenhouse/GreenhouseCapabilityModule.tsx`
- `src/app/api/capabilities/resolve/route.ts`
- `src/app/api/capabilities/[moduleId]/data/route.ts`
- `src/app/(dashboard)/capabilities/[moduleId]/layout.tsx`
- `src/app/(dashboard)/capabilities/[moduleId]/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion
- `npx pnpm exec eslint ...` sobre los archivos tocados de capabilities y `VerticalMenu`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `npx pnpm lint`: timeout en este worktree
- `npx pnpm build`: timeout en este worktree

### Riesgos o pendientes
- La capa nueva ejecuta la spec usando el runtime vigente (`client_users` + `client_service_modules` + tenant session) y no el JOIN legacy sugerido por el documento original; esa diferencia queda intencional.
- La data de `/capabilities/[moduleId]` reutiliza el payload del dashboard actual; aun no existen query builders dedicados por module ni cache dedicada.
- Conviene hacer smoke visual autenticado del sidebar dinamico y al menos un module route real (`/capabilities/creative-hub` o equivalente) antes de promover cambios mayores sobre esta linea.

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
- El runtime auth ahora incluye un fallback para internos Efeonce que resuelve aliases `@efeonce.org` y `@efeoncepro.com` usando el perfil Microsoft antes de rechazar el SSO.
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

### Fecha
- 2026-03-13 11:35 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Implementar la fase principal de alineacion a `Greenhouse_Nomenclatura_Portal_v3.md` sin mezclar trabajo de agente/runtime AI.
- Canonicalizar microcopy cliente e `internal/admin` en `src/config/greenhouse-nomenclature.ts`.
- Completar piezas faltantes del portal cliente: `Updates`, `Tu equipo de cuenta` en `Mi Greenhouse`, y `Ciclos` con modulos base adicionales.

### Rama
- Rama usada: actual de trabajo local
- Rama objetivo: la rama activa del repo

### Ambiente objetivo
- Cliente + `internal/admin` en `starter-kit`

### Archivos tocados
- `src/config/greenhouse-nomenclature.ts`
- `src/components/greenhouse/AccountTeamDossierSection.tsx`
- `src/components/greenhouse/index.ts`
- `src/app/(dashboard)/updates/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/sprints/page.tsx`
- `src/data/navigation/verticalMenuData.tsx`
- `src/data/navigation/horizontalMenuData.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/views/Login.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/GreenhouseProjectDetail.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseUpdates.tsx`
- `src/views/greenhouse/dashboard/ClientTeamCapacitySection.tsx`
- `src/views/greenhouse/GreenhouseInternalDashboard.tsx`
- `src/views/greenhouse/internal/dashboard/InternalControlTowerTable.tsx`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/GreenhouseAdminRoles.tsx`
- `src/views/greenhouse/admin/users/UserListCards.tsx`
- `src/views/greenhouse/admin/users/UserListTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantUsersTable.tsx`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
- `changelog.md`
- `project_context.md`
- `Handoff.md`

### Verificacion
- Cambio funcional implementado:
  - se agrego la ruta cliente `/updates` y su navegacion asociada
  - `Mi Greenhouse` ahora incorpora el dossier `Tu equipo de cuenta`
  - `Pulse` separa la lectura de `Capacidad del equipo` del dossier relacional
  - `Ciclos` ahora expone `Ciclo activo`, `Ciclos anteriores`, `Velocity por ciclo`, `Burndown` y `Velocity por persona` con copy Greenhouse
  - `Proyectos/[id]` fue reescrito con breadcrumbs cliente, labels Greenhouse y sin mensajes tecnicos visibles
  - `internal/admin` ahora toma una capa adicional de copy desde `GH_INTERNAL_MESSAGES` en dashboard interno, tablas de users, users por tenant y detalle de usuario
- Validacion:
  - `pnpm exec eslint` sobre los slices tocados: correcto
  - `pnpm exec tsc -p tsconfig.json --noEmit --pretty false --incremental false`: bloqueado por archivo ajeno `src/config/capability-registry (1).ts`

### Riesgos o pendientes
- Sigue quedando copy residual legacy en superficies internas grandes no barridas completas en este turno, especialmente `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`.
- No se ejecuto smoke visual autenticado real; la validacion fue estatica.
- `tsc` sigue bloqueado por el archivo duplicado ajeno `src/config/capability-registry (1).ts`, fuera del alcance de esta alineacion.

### Proximo paso recomendado
- Barrer `GreenhouseAdminTenantDetail.tsx` y `GreenhouseAdminTenantDashboardPreview.tsx` para terminar de sacar copy residual interna.
- Ejecutar smoke visual autenticado de `/dashboard`, `/proyectos/[id]`, `/settings`, `/sprints`, `/updates`, `/admin`, `/admin/users/[id]`.
- Resolver o eliminar el archivo duplicado `src/config/capability-registry (1).ts` antes del siguiente `build/tsc` integral.

### Fecha
- 2026-03-13 18:05 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Extender la alineacion de nomenclatura Greenhouse a `admin/tenants/[id]`, `view-as/dashboard` y los subcomponentes operativos del detalle de space.

### Rama
- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo: la rama activa del repo

### Ambiente objetivo
- `internal/admin` del repo `starter-kit`

### Archivos tocados
- `src/config/greenhouse-nomenclature.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx`
- `src/views/greenhouse/admin/tenants/TenantCapabilityManager.tsx`
- `src/views/greenhouse/admin/tenants/TenantServiceModulesTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantDetailErrorBoundary.tsx`
- `Handoff.md`
- `changelog.md`
- `project_context.md`

### Verificacion
- `pnpm exec eslint src/config/greenhouse-nomenclature.ts src/views/greenhouse/GreenhouseAdminTenantDetail.tsx src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx src/views/greenhouse/admin/tenants/TenantCapabilityManager.tsx src/views/greenhouse/admin/tenants/TenantServiceModulesTable.tsx src/views/greenhouse/admin/tenants/TenantDetailErrorBoundary.tsx`: correcto

### Riesgos o pendientes
- El detalle de tenant queda mucho mas alineado, pero aun puede sobrevivir copy residual menor ligado a labels tecnicas de HubSpot owner/base URL o textos de dominio que el equipo quiera hispanizar mas adelante.
- Sigue pendiente smoke visual autenticado de `admin/tenants/[id]` y `view-as/dashboard`.
