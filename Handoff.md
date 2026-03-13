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
