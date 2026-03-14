# project_context.md

## Resumen
Proyecto base de Greenhouse construido sobre el starter kit de Vuexy para Next.js con TypeScript, App Router y MUI. El objetivo no es mantener el producto como template, sino usarlo como base operativa para evolucionarlo hacia el portal Greenhouse.

## Delta 2026-03-13 Canonical team identity hardening
- La capa de equipo/capacidad ya no debe tratar `azure_oid`, `notion_user_id` o `hubspot_owner_id` como la identidad canonica.
  - `greenhouse.team_members.identity_profile_id` pasa a ser el enlace canonico de persona para el roster Efeonce.
  - Los providers externos se resuelven y enriquecen desde `greenhouse.identity_profile_source_links`.
- `scripts/setup-team-tables.sql` ahora tambien actua como bootstrap de reconciliacion canonica para el roster de equipo:
  - agrega `identity_profile_id` y `email_aliases` si faltan en `greenhouse.team_members`
  - siembra o actualiza perfiles canonicos usados por el roster
  - siembra source links para `greenhouse_team`, `greenhouse_auth`, `notion`, `hubspot_crm` y `azure_ad`
  - archiva el perfil duplicado de Julio anclado en HubSpot y deja un solo perfil canonico activo para su identidad
- Regla operativa nueva:
  - `greenhouse_team` representa la identidad Greenhouse del roster
  - `identity_profile_source_links` es la capa preparada para sumar futuros providers como `google_workspace`, `deel`, `frame_io` o `adobe` sin redisenar `team_members`
- La lectura runtime de providers en `src/lib/team-queries.ts` ya no debe inferir Microsoft desde `greenhouse_auth`; `greenhouse_auth` es un principal interno, no un provider externo.
- Las 4 surfaces live del task tuvieron una pasada visual adicional con patrones Vuexy compartidos:
  - `Mi Greenhouse` y `Pulse` ya muestran badges de identidad mas robustos
  - `Equipo en este proyecto` y `Velocity por persona` ahora usan `ExecutiveCardShell`, resumenes KPI y cards por persona con mejor jerarquia visual

## Delta 2026-03-13 Team profile taxonomy
- `greenhouse.team_members` ya no modela solo roster operativo; ahora tambien soporta perfil profesional y atributos de identidad laboral:
  - nombre estructurado: `first_name`, `last_name`, `preferred_name`, `legal_name`
  - taxonomia interna: `org_role_id`, `profession_id`, `seniority_level`, `employment_type`
  - contacto y presencia: `phone`, `teams_user_id`, `slack_user_id`
  - ubicacion y contexto: `location_city`, `location_country`, `time_zone`
  - trayectoria: `birth_date`, `years_experience`, `efeonce_start_date`
  - perfil narrativo: `biography`, `languages`
- Se agregaron catalogos nuevos en BigQuery:
  - `greenhouse.team_role_catalog`
  - `greenhouse.team_profession_catalog`
- Regla operativa nueva para talento:
  - `role_title` sigue siendo el cargo visible en la operacion actual
  - `org_role_id` representa el rol interno dentro de Efeonce
  - `profession_id` representa la profesion u oficio reusable para staffing y matching de perfiles
- El runtime cliente de `/api/team/members` ahora deriva ademas:
  - `tenureEfeonceMonths`
  - `tenureClientMonths`
  - `ageYears`
  - `profileCompletenessPercent`
- Se decidio no inventar PII faltante en seed:
  - si ciudad, pais, telefono, edad o experiencia real no estaban confirmados, quedan `NULL`
  - el modelo ya existe y la UI lo expresa como `en configuracion`

## Delta 2026-03-13 Team identity and capacity runtime
- Se implemento una primera capa real del task `CODEX_TASK_Team_Identity_Capacity_System.md` dentro de este repo:
  - `GET /api/team/members`
  - `GET /api/team/capacity`
  - `GET /api/team/by-project/[projectId]`
  - `GET /api/team/by-sprint/[sprintId]`
  - `scripts/setup-team-tables.sql`
  - componentes cliente para dossier, capacidad, equipo por proyecto y velocity por persona
- La fuente real inspeccionada en BigQuery para `notion_ops.tareas` no expone `responsable_nombre` ni `responsable_email` como columnas directas.
  - El runtime nuevo usa el schema real detectado en `INFORMATION_SCHEMA`:
    - `responsables`
    - `responsables_ids`
    - `responsables_names`
    - `responsable_texto`
  - El match operativo prioriza `notion_user_id` ↔ `responsables_ids[SAFE_OFFSET(0)]`, con fallback a email/nombre.
- `scripts/setup-team-tables.sql` quedo endurecido como bootstrap idempotente via `MERGE` y ya fue aplicado en BigQuery real:
  - `greenhouse.team_members`: `7` filas seed
  - `greenhouse.client_team_assignments`: `10` filas seed
- La validacion local ya corrio con runtime Node real:
  - `pnpm lint`: correcto
  - `pnpm build`: correcto
- El repo externo correcto del pipeline es `notion-bigquery`, no `notion-bq-sync`.
  - Ese repo no existe en este workspace.
  - Desde esta sesion no hubo acceso remoto util a `efeoncepro/notion-bigquery`, por lo que no se modifico ni redeployo la Cloud Function externa.
- `/settings` ya no depende de `getDashboardOverview()` solo para el roster; consume el endpoint dedicado de equipo.
- `/dashboard` reemplaza la card legacy de capacity por una surface cliente que consume la API dedicada.
- `/proyectos/[id]` ahora incorpora una seccion `Equipo en este proyecto`.
- El repo no tenia `/sprints/[id]`; se habilito una primera ruta para hospedar `Velocity por persona` y enlazarla desde el detalle de proyecto.

## Delta 2026-03-13 Preview auth hardening
- `src/lib/bigquery.ts` ahora acepta un fallback opcional `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` para evitar fallos de serializacion de secretos en Preview de Vercel.
- Si una Preview de branch necesita login funcional y el JSON crudo falla por quoting/escaping, la opcion preferida pasa a ser cargar `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` junto con `GCP_PROJECT`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL`.

## Delta 2026-03-13 Branding lock and nav hydration
- El shell autenticado ahora debe inyectar la sesion inicial al `SessionProvider` para evitar flicker entre menu cliente e interno/admin durante la hidratacion.
- La capa de nomenclatura ya no debe mezclar portal cliente con internal/admin:
  - `GH_CLIENT_NAV` queda reservado para la navegacion cliente normada por `Greenhouse_Nomenclatura_Portal_v3.md`
  - `GH_INTERNAL_NAV` queda como nomenclatura operativa separada para `/internal/**` y `/admin/**`
- Regla operativa nueva para theming runtime: Greenhouse no debe honrar cookies legacy de `primaryColor`, `skin` o `semiDark` que reintroduzcan branding Vuexy; esas preferencias quedan bloqueadas al baseline Greenhouse y solo se preservan `mode`, `layout` y widths compatibles.
- `src/@core/utils/brandSettings.ts` y `getSettingsFromCookie()` son ahora el boundary de saneamiento para cookies de settings antes de SSR o hidratacion cliente.

## Delta 2026-03-13 Greenhouse nomenclature portal
- Ya existe `src/config/greenhouse-nomenclature.ts` como fuente unica de nomenclatura visible para la capa cliente:
  - `GH_CLIENT_NAV`
  - `GH_LABELS`
  - `GH_TEAM`
  - `GH_MESSAGES`
  - `GH_COLORS`
- `src/config/greenhouse-nomenclature.ts` tambien versiona `GH_INTERNAL_NAV`, pero solo como capa operativa para superficies `internal/admin`; no como parte del contrato del portal cliente definido en `Greenhouse_Nomenclatura_Portal_v3.md`.
- La navegacion cliente y las superficies principales `/login`, `/dashboard`, `/proyectos`, `/sprints` y `/settings` ya empezaron a consumir esa capa centralizada en vez de labels hardcodeados.
- El rollout ya no es solo copy-level: la marca Efeonce ahora entra por el wiring oficial del starter kit sin crear un theme paralelo:
  - `src/components/theme/mergedTheme.ts`
  - `src/components/theme/index.tsx`
  - `src/configs/primaryColorConfig.ts`
  - `src/app/layout.tsx`
- `layout.tsx` ahora carga `DM Sans` + `Poppins`, y el sidebar branded queda encapsulado en `src/styles/greenhouse-sidebar.css` con logo negativo para el nav vertical.
- El dashboard cliente activo ahora tambien consume la nomenclatura centralizada en sus componentes secundarios de experiencia:
  - `ClientPortfolioHealthAccordion`
  - `ClientAttentionProjectsAccordion`
  - `ClientEcosystemSection`
  - annotations, tooltips y totals de `chart-options.ts`
- Regla operativa ratificada para theming: Greenhouse no debe reescribir el theme de Vuexy desde cero; cualquier ajuste global de tema debe pasar por `src/components/theme/mergedTheme.ts`, `@core/theme/*` o la configuracion oficial de Vuexy.

## Delta 2026-03-13 Branding SVG rollout
- `public/branding/SVG` pasa a ser la carpeta canonica para isotipos y wordmarks SVG de `Efeonce`, `Globe`, `Reach` y `Wave`.
- `src/components/greenhouse/brand-assets.ts` centraliza el mapping reusable de esos assets para shell, business lines y futuras cards que necesiten logos propios.
- `src/components/layout/shared/Logo.tsx` y `src/app/layout.tsx` ya no deben depender del PNG `avatar.png` como marca primaria; el shell y el favicon salen desde esa capa SVG.
- `src/components/greenhouse/BrandWordmark.tsx` y `src/components/greenhouse/BusinessLineBadge.tsx` son ahora los componentes canonicos para renderizar `Efeonce`, `Globe`, `Reach` y `Wave` en contextos `inline`, footer, hero, tabla o chip sin hardcodes de imagen dispersos.

## Delta 2026-03-13 Tenant and user media persistence
- El runtime ya soporta subir y persistir logos/fotos reales para identidades visibles del portal en lugar de depender solo de iniciales o fallbacks.
- Capa server-side nueva:
  - `src/lib/storage/greenhouse-media.ts` para upload/download autenticado contra GCS
  - `src/lib/admin/media-assets.ts` para leer/escribir `logo_url` y `avatar_url` en BigQuery
- Endpoints internos nuevos:
  - `POST /api/admin/tenants/[id]/logo`
  - `POST /api/admin/users/[id]/avatar`
  - `GET /api/media/tenants/[id]/logo`
  - `GET /api/media/users/[id]/avatar`
- Regla operativa:
  - el bucket por defecto es `${GCP_PROJECT}-greenhouse-media`
  - puede overridearse con `GREENHOUSE_MEDIA_BUCKET`
  - los assets se guardan como `gs://...` en BigQuery y se sirven via proxy autenticado del portal, no via URL publica del bucket
- El uploader UI reusable para admin ahora vive en `src/components/greenhouse/IdentityImageUploader.tsx`.
- `greenhouse.clients` no traia `logo_url` en el DDL base; el runtime agrega la columna on-demand con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS logo_url STRING` antes de persistir logos de tenant.
- La sesion NextAuth ya propaga `avatarUrl`, permitiendo que el dropdown autenticado refleje la foto guardada del usuario.

## Delta 2026-03-13 Capabilities runtime foundation
- La spec `Greenhouse_Capabilities_Architecture_v1.md` ya tiene una primera ejecucion real sobre el runtime actual del repo, sin volver al modelo legacy de resolver capabilities directo desde `greenhouse.clients`.
- El runtime nuevo toma `businessLines` y `serviceModules` desde la sesion tenant-aware actual, que ya deriva de `greenhouse.client_service_modules` + `greenhouse.service_modules`.
- Se agregaron:
  - `GET /api/capabilities/resolve`
  - `GET /api/capabilities/[moduleId]/data`
  - `/capabilities/[moduleId]`
- El sidebar vertical ahora incorpora una seccion dinamica `Servicios` cuando el tenant cliente tiene modules activos en el registry.
- La primera implementacion incluye registry versionado para:
  - `creative-hub`
  - `crm-command-center`
  - `onboarding-center`
  - `web-delivery-lab`
- La data inicial de cada modulo reutiliza el contrato real de `/dashboard` para entregar una lectura ejecutiva coherente mientras los query builders dedicados siguen siendo una fase posterior.
- El admin ahora tiene una vista de validacion autenticada para modules en `/admin/tenants/[id]/capability-preview/[moduleId]`, separada del `view-as/dashboard`.
- La preview admin usa fallback controlado al registry para inspeccionar modules del tenant aunque la resolucion cliente estricta siga dependiendo de `businessLines` y `serviceModules`.
- El smoke operativo de capabilities queda automatizado en `scripts/run-capability-preview-smoke.ps1`, con JWT admin local y capturas Playwright sobre:
  - `/admin/tenants/space-efeonce/view-as/dashboard`
  - `/admin/tenants/space-efeonce/capability-preview/creative-hub`
- `tsconfig.json` ya no incluye validators historicos de `.next-local/build-*`; solo conserva tipos `dev` para evitar que caches viejos rompan `tsc`.
- La capa ahora ya no reutiliza `getDashboardOverview()` para `/capabilities/[moduleId]`; existe `src/lib/capability-queries/*` con query builders dedicados por modulo y snapshot BigQuery cacheada con `unstable_cache`.
- Se agrego `verifyCapabilityModuleAccess()` para centralizar el guard server-side y distinguir `404` de `403` en `/api/capabilities/[moduleId]/data`.
- El registry de capabilities ahora declara `dataSources` por modulo para dejar trazabilidad explicita entre cada surface y sus tablas BigQuery reales.
- `/capabilities/[moduleId]` ya no depende de una composicion hardcodeada; el route renderiza `data.module.cards` via `src/components/capabilities/CapabilityCard.tsx` y `src/components/capabilities/ModuleLayout.tsx`.
- El dispatcher declarativo actual ya no consume arrays globales de modulo; cada tarjeta usa `cardData` por `card.id`, dejando el runtime listo para ampliar el catalogo sin romper los modulos existentes.
- `Creative Hub` ya quedo consolidado como primer modulo mas rico del sistema declarativo, con:
  - `creative-metrics`
  - `creative-review-pipeline`
  - `creative-review-hotspots`
  - `creative-projects`
  - `creative-quality`
- La consolidacion visual de `Creative Hub` ya quedo alineada explicitamente con patrones de `full-version` en vez de una composicion ad hoc:
  - hero adaptado desde la logica de `WebsiteAnalyticsSlider`
  - KPI cards sobre `HorizontalWithSubtitle`
  - quality card compacta tipo `SupportTracker`
  - listas ejecutivas con jerarquia tipo `SourceVisits`
- El dispatcher declarativo actual cubre los card types reales del registry vigente:
  - `metric`
  - `project-list`
  - `tooling-list`
  - `quality-list`
  - `metric-list`
  - `chart-bar`

## Delta 2026-03-12 Internal Control Tower Redesign
- `/internal/dashboard` dejo de ser un hero estatico con lista plana de tenants y ahora funciona como `Control Tower` operativo para el equipo interno Efeonce.
- La landing interna ahora usa:
  - header compacto con subtitulo dinamico y acciones
  - 6 KPI cards con semaforos de activacion, inactividad y OTD global
  - tabla paginada con busqueda, filtros por estado, row actions y prioridad visual para `Requiere atencion`
- `src/lib/internal/get-internal-dashboard-overview.ts` ahora entrega senales adicionales por cliente:
  - `createdAt`
  - `updatedAt`
  - `lastLoginAt`
  - `lastActivityAt`
  - `totalUsers`, `activeUsers`, `invitedUsers`, `pendingResetUsers`
  - `scopedProjects`
  - `avgOnTimePct`
  - arrays de `businessLines` y `serviceModules`
- El rediseño sigue sin introducir mutaciones nuevas: `Crear space`, `Editar` y `Desactivar` quedan como affordances parciales hasta que exista workflow real.

## Delta 2026-03-12 Internal Identity Foundation
- Se agrego `GREENHOUSE_INTERNAL_IDENTITY_V1.md` como contrato canonico para separar `auth principal` de `canonical identity` en usuarios internos Efeonce.
- La fundacion nueva usa:
  - `EO-USR-*` para el principal de acceso actual
  - `EO-ID-*` para el perfil canonico interno
- Se versiono `bigquery/greenhouse_internal_identity_v1.sql` para crear `identity_profiles`, `identity_profile_source_links` y `client_users.identity_profile_id`.
- Se agrego bootstrap operativo `scripts/backfill-internal-identity-profiles.ts`:
  - descubre candidatos internos por `tenant_type` o rol interno en `client_users`
  - descubre owners internos en `hubspot_crm.owners` por dominio `@efeonce.org` o `@efeoncepro.com`
  - crea perfiles canonicos y source links listos para enlazar Notion o Azure AD despues
- Estado real ejecutado:
  - `2` auth principals internos Greenhouse enlazados
  - `6` HubSpot owners internos sembrados como perfiles canonicos
  - `8` perfiles `EO-ID-*` creados en BigQuery

## Delta 2026-03-12 Microsoft SSO foundation
- El login ahora soporta dos flujos en paralelo sobre `greenhouse.client_users`:
  - `credentials`
  - Microsoft Entra ID (`azure-ad` en NextAuth)
- `client_users` extiende el contrato de identidad con:
  - `microsoft_oid`
  - `microsoft_tenant_id`
  - `microsoft_email`
  - `last_login_provider`
- `/login` prioriza Microsoft SSO como CTA principal y deja email + contrasena como fallback.
- `/settings` ahora muestra el estado de vinculo Microsoft y permite iniciar el enlace SSO cuando la sesion entro por credenciales.
- La ruta publica adicional `/auth/access-denied` cubre el rechazo de usuarios Microsoft sin principal explicito autorizado en Greenhouse.

## Documento Maestro de Arquitectura
- Documento maestro actual: `GREENHOUSE_ARCHITECTURE_V1.md`
- Resumen rapido de fases y tareas: `PHASE_TASK_MATRIX.md`
- Este documento debe leerse antes de cambiar arquitectura, auth, rutas, roles, multi-tenant, dashboard, team/capacity, campaign intelligence o admin.
- Si un agente necesita trabajar en paralelo con otro, debe tomar su scope desde las fases y actividades definidas en `GREENHOUSE_ARCHITECTURE_V1.md`.
- `BACKLOG.md` es el resumen operativo del roadmap; `GREENHOUSE_ARCHITECTURE_V1.md` es la explicacion completa.
- Documento tecnico de identidad y acceso: `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- DDL de identidad y acceso: `bigquery/greenhouse_identity_access_v1.sql`
- Documento tecnico de modulos de servicio: `GREENHOUSE_SERVICE_MODULES_V1.md`
- DDL de modulos de servicio: `bigquery/greenhouse_service_modules_v1.sql`
- Bootstrap de modulos de servicio: `bigquery/greenhouse_service_module_bootstrap_v1.sql`
- Metodo canonico de validacion visual: `GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- Iniciativa tenant-especifica activa: `SKY_TENANT_EXECUTIVE_SLICE_V1.md`
- Contrato visual ejecutivo reusable: `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`
- Contrato canonico de orquestacion UI: `GREENHOUSE_UI_ORCHESTRATION_V1.md`
- Catalogo curado de patrones Vuexy/MUI: `GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- Brief canonico de intake UI: `GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- Seed operativo para benchmark interno del dashboard: `bigquery/greenhouse_efeonce_space_v1.sql`
- Plan UX actual para la siguiente iteracion del dashboard: `GREENHOUSE_DASHBOARD_UX_GAPS_V1.md`

## Especificacion Fuente
- Documento fuente actual: `../Greenhouse_Portal_Spec_v1.md`
- Ese markdown define el target funcional del portal y debe usarse como referencia primaria de producto.
- Si existe conflicto entre el estado actual del starter kit y la especificacion, prevalece la especificacion como norte de implementacion salvo decision documentada.

## Alcance del Repositorio
- Este repositorio contiene solo `starter-kit`.
- La carpeta `full-version` existe fuera de este repo como referencia de contexto, referencia visual y referencia funcional.
- `full-version` debe servir para entender hacia donde debe evolucionar `starter-kit`.
- No se debe mezclar automaticamente codigo de `full-version` dentro de este repo sin adaptacion y revision.
- Las referencias mas utiles de `full-version` para Greenhouse son dashboards, tablas y patrones de user/roles/permissions, no los modulos de negocio template.
- Orden recomendado para buscar referencia Vuexy:
- `../full-version/src/views/dashboards/analytics/*`
- `../full-version/src/views/dashboards/crm/*`
- `../full-version/src/views/apps/user/list/*`
- `../full-version/src/views/apps/user/view/*`
- `../full-version/src/views/apps/roles/*`
- `../full-version/src/libs/ApexCharts.tsx`
- `../full-version/src/libs/styles/AppReactApexCharts.tsx`
- `../full-version/src/libs/Recharts.tsx`
- `../full-version/src/libs/styles/AppRecharts.ts`
- y luego la documentacion oficial:
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/libs/apex-charts/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/styled-libs/app-react-apex-charts/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/user-interface/components/avatars/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/development/theming/overview/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/custom/option-menu/`
- Vuexy tambien trae `next-auth` con JWT y pantallas/patrones de permissions, pero eso debe leerse como referencia de template, no como el modelo de seguridad final de Greenhouse.
- En Greenhouse, JWT ya existe, pero la autorizacion real no depende del ACL demo del template; depende de roles y scopes multi-tenant resueltos server-side desde BigQuery.
- Las apps de `User Management` y `Roles & Permissions` si deben considerarse candidatas directas para `/admin`, pero solo reutilizando estructura visual y componentes; la data layer debe salir de BigQuery y no de fake-db.
- Para dashboards y superficies ejecutivas, la referencia correcta es la jerarquia de `full-version/src/views/dashboards/analytics/*`; el sistema reusable que la adapta a Greenhouse queda fijado en `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`.
- La seleccion de patrones Vuexy/MUI para cualquier solicitud nueva ya no debe salir de exploracion libre de `full-version`; debe pasar por el sistema definido en `GREENHOUSE_UI_ORCHESTRATION_V1.md`.
- El intake de solicitudes UI puede venir de personas o de otros agentes; el brief canonico para normalizar pedidos de Claude, Codex u otros queda en `GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`.
- El repo tambien versiona una copia del skill operativo en `.codex/skills/greenhouse-ui-orchestrator/` para que el flujo no dependa solo del perfil local del agente.

## Stack Actual
- Next.js 16.1.1
- React 19.2.3
- TypeScript 5.9.3
- MUI 7.x
- App Router en `src/app`
- PNPM lockfile presente
- `apexcharts` + `react-apexcharts` activos para charts ejecutivos
- El portal ya tiene un `space-efeonce` sembrado en BigQuery para validar el MVP del dashboard cliente sobre el portfolio interno con mayor densidad de datos.
- En producto, la label visible debe migrar a `space`; `tenant` se mantiene solo como termino interno de runtime y datos.
- El dashboard ya no se compone solo por `snapshot` vs `non-snapshot`; ahora existe `layoutMode = snapshot | standard | rich` para ajustar jerarquia y distribucion de cards segun la densidad real del space.
- `recharts` activo como segunda via de charting reusable alineada con `full-version`
- `keen-slider`, `@fullcalendar/*`, `react-datepicker`, `react-dropzone`, `react-toastify`, `cmdk`, `@tiptap/*`, `@tanstack/react-table`, `react-player`, `mapbox-gl`, `react-map-gl`, `react-hook-form`, `@hookform/resolvers`, `valibot`, `@formkit/drag-and-drop`, `emoji-mart` y `@emoji-mart/*` ya estan instalados en `starter-kit`
- `simple-icons` activo para logos SVG de marcas como fallback directo en runtime
- `@iconify-json/logos` activo para incorporar logos de marca al pipeline Iconify/CSS del repo
- `src/components/greenhouse/BrandLogo.tsx` ya consume ese stack para tooling cards, priorizando logos bundleados y usando fallback a Tabler o monograma
- `.gitattributes` fija archivos de texto en `LF` para estabilizar el trabajo en Windows

## Target Definido por la Especificacion
- Portal de clientes multi-tenant para Efeonce Greenhouse
- BigQuery como fuente principal de datos consumida server-side
- NextAuth.js para autenticacion
- API Routes en App Router para exponer datos filtrados por cliente
- Alias productivo actual: `greenhouse.efeoncepro.com`
- Dataset propio del portal: `efeonce-group.greenhouse`

## Posicion de Producto Actual
- Greenhouse debe ser un portal ejecutivo y operativo, no un segundo Notion.
- Notion sigue siendo el system of work.
- Greenhouse debe exponer visibilidad de entrega, velocidad, capacidad, riesgo y contexto por tenant.
- Greenhouse tambien debe componer vistas y charts segun linea de negocio y servicios contratados del cliente.
- Proyectos, tareas y sprints existen como drilldown explicativo, no como centro del producto.
- El centro actual del producto ya es `/dashboard`; las siguientes capas objetivo son `/equipo` y `/campanas`.

## Comandos Utiles
- `npx pnpm install --frozen-lockfile`
- `npx pnpm dev`
- `npx pnpm build`
- `npx pnpm lint`
- `npx pnpm clean`

## Librerias visuales activas
- `apexcharts` y `react-apexcharts`: base actual para charts ejecutivos; wrappers locales en `src/libs/ApexCharts.tsx` y `src/libs/styles/AppReactApexCharts.tsx`.
- `recharts`: segunda via de charting disponible para cards compactas y visualizaciones de comparacion.
- `keen-slider`: sliders, carousels y hero cards con narrativa visual.
- `@fullcalendar/*`, `react-datepicker`, `date-fns`: calendario, planner y date UX.
- `@tanstack/react-table`, `@tanstack/match-sorter-utils`: tablas avanzadas, filtros y sorting.
- `react-hook-form`, `@hookform/resolvers`, `valibot`, `input-otp`: forms complejas, validacion y OTP UX.
- `@tiptap/*`, `cmdk`: rich text, editorial UX y command palette.
- `react-dropzone`, `react-toastify`, `emoji-mart`, `@emoji-mart/*`: upload, feedback y picker UX.
- `react-player`, `mapbox-gl`, `react-map-gl`: media, embeds y mapas.
- `@floating-ui/dom`, `@formkit/drag-and-drop`, `bootstrap-icons`: posicionamiento, reorder y soporte de iconografia.
- Ya no es necesario reinstalar este stack desde `full-version`; el inventario base de Vuexy ya vive en `starter-kit`.
- `simple-icons`: logos SVG de marcas y herramientas sin descargar assets manuales.
- `@iconify-json/logos`: logos de marca integrables al pipeline de iconos del repo en `src/assets/iconify-icons/bundle-icons-css.ts`.
- `recharts` y `keen-slider` ya estan disponibles en `starter-kit`; usarlos solo cuando una superficie lo justifique y manteniendo `apexcharts` como base actual del dashboard.

## Regla documental compacta
- La estrategia de documentacion liviana del repo queda en `DOCUMENTATION_OPERATING_MODEL_V1.md`.
- La regla es: detalle completo en una fuente canonica; deltas breves en `README.md`, `project_context.md`, `Handoff.md` y `changelog.md`.
- `Handoff.md` debe mantener solo el estado activo del turno o del frente abierto.
- `Handoff.archive.md` conserva el historial detallado cuando un handoff deja de ser operativo como snapshot rapido.
- Si un build local falla por rutas de otra rama, revisar el cache historico en `.next-local/**` antes de asumir un bug del cambio actual.

## Estructura Base
- `src/app/layout.tsx`: layout raiz
- `src/app/(dashboard)/layout.tsx`: layout principal autenticado o de dashboard
- `src/app/(dashboard)/dashboard/page.tsx`: dashboard principal actual
- `src/app/(dashboard)/proyectos/page.tsx`: vista base de proyectos
- `src/app/(dashboard)/proyectos/[id]/page.tsx`: detalle de proyecto
- `src/app/(dashboard)/sprints/page.tsx`: vista base de sprints
- `src/app/(dashboard)/settings/page.tsx`: vista base de settings
- `src/app/(blank-layout-pages)/login/page.tsx`: login actual
- `src/app/api/dashboard/kpis/route.ts`: primer endpoint real con datos de BigQuery
- `src/app/api/projects/route.ts`: listado real de proyectos por tenant
- `src/app/api/projects/[id]/route.ts`: detalle real de proyecto por tenant
- `src/app/api/projects/[id]/tasks/route.ts`: tareas del proyecto por tenant
- `src/components/layout/**`: piezas del layout
- `src/components/greenhouse/**`: componentes UI reutilizables del producto Greenhouse
- `src/configs/**`: configuracion de tema y color
- `src/data/navigation/**`: definicion de menu
- `src/lib/bigquery.ts`: cliente reusable de BigQuery
- `src/lib/dashboard/get-dashboard-overview.ts`: capa de datos server-side del dashboard
- `src/lib/projects/get-projects-overview.ts`: capa de datos server-side de proyectos
- `src/lib/projects/get-project-detail.ts`: capa de datos server-side del detalle de proyecto y sus tareas
- `src/views/greenhouse/dashboard/**`: configuracion y componentes especificos del dashboard Greenhouse
- `src/views/greenhouse/dashboard/orchestrator.ts`: orquestador de bloques ejecutivos reutilizables para el dashboard

## Estado de Rutas
- Existe `/dashboard`
- Existe `/capabilities/[moduleId]`
- Existe `/proyectos`
- Existe `/proyectos/[id]`
- Existe `/sprints`
- Existe `/settings`
- Existe `/login`
- Existe `/auth/landing`
- Existe `/internal/dashboard`
- Existe `/admin`
- Existe `/admin/tenants`
- Existe `/admin/tenants/[id]`
- Existe `/admin/tenants/[id]/view-as/dashboard`
- Existe `/admin/users`
- Existe `/admin/users/[id]`
- Existe `/admin/roles`
- Existe `src/app/page.tsx`
- La raiz `/` redirige segun `portalHomePath`
- `/home` y `/about` quedaron como rutas de compatibilidad que redirigen a la nueva experiencia

## Rutas Objetivo del Producto
- `/dashboard`: dashboard principal con KPIs ICO
- `/entrega`: contexto operativo agregado
- `/proyectos`: lista de proyectos del cliente
- `/proyectos/[id]`: detalle de proyecto con tareas y sprint
- `/campanas`: lista de campanas y relacion con output
- `/campanas/[id]`: detalle de campana con entregables y KPIs
- `/equipo`: equipo asignado, capacidad y carga
- `/sprints`: vista de sprints y velocidad
- `/settings`: perfil y preferencias del cliente
- `/internal/**`: visibilidad interna Efeonce
- `/admin/**`: gobernanza de tenants, usuarios, roles, scopes y feature flags

## Brecha Actual vs Objetivo
- El shell principal ya fue adaptado a Greenhouse con rutas reales y branding base.
- `next-auth` ya esta integrado, usa session JWT, protege el dashboard y autentica solo contra `greenhouse.client_users`.
- El JWT actual de Greenhouse ya carga `roleCodes`, `routeGroups`, `projectScopes` y `campaignScopes`; eso reemplaza el valor de negocio que podria aportar un ACL generico del template.
- `@google-cloud/bigquery` ya esta integrado con un cliente server-side reusable.
- `/internal/dashboard` ya fue reinterpretado como `Control Tower` en espanol, con foco en salud de activacion, onboarding trabado, inactividad y acceso rapido al detalle del space.
- `/dashboard` ya fue redisenado hacia una lectura cliente mas compacta en 3 zonas: hero + 4 KPI cards, 4 charts ejecutivos y detalle operativo bajo el fold.
- El dashboard cliente ya no expone la cocina anterior de `capacity`, tooling declarativo por modulo ni cards redundantes de calidad/entrega; esas piezas se movieron fuera de la vista principal del cliente.
- El contrato server-side del dashboard ahora tambien entrega cadencia semanal de entregas y `RpA` por proyecto sin cambiar la fuente de datos base en BigQuery.
- El CTA de ampliacion del equipo/ecosistema existe como modal de solicitud copiable; la notificacion real a owner o webhook sigue pendiente de una mutacion dedicada.
- El runtime del dashboard ya incorpora un orquestador deterministico de bloques ejecutivos para seleccionar hero, top stats y secciones por `serviceModules`, calidad de dato y capacidades disponibles.
- Ya existen `/api/dashboard/kpis`, `/api/dashboard/summary`, `/api/dashboard/charts` y `/api/dashboard/risks`.
- Ya existe `/api/projects` y la vista `/proyectos` consume datos reales filtrados por tenant.
- Ya existen `/api/projects/[id]`, `/api/projects/[id]/tasks` y la vista `/proyectos/[id]` con detalle real por tenant.
- Ya existe una fuente real multi-user en `greenhouse.client_users` y tablas de scopes/roles; el demo y el admin interno ya usan credenciales bcrypt.
- `/admin/tenants`, `/admin/users`, `/admin/roles` y `/admin/users/[id]` ya son el primer slice real de admin sobre datos reales.
- `/admin/users/[id]` reutiliza la estructura de `user/view/*` con tabs reinterpretados para Greenhouse:
- `overview` -> contexto del usuario y alcance
- `security` -> acceso y auditoria
- `billing` -> invoices y contexto comercial del cliente
- `/admin/tenants/[id]` consolida la empresa/tenant como unidad de gobierno y la relaciona con usuarios, modulos, flags y proyectos visibles.
- `/admin/tenants/[id]/view-as/dashboard` permite revisar el dashboard real del cliente desde una sesion admin sin cambiar de usuario.
- El login ya no muestra bloque demo y el mensaje de error de UI ya no expone detalles internos como `tenant registry`.
- Ya existen 9 tenants cliente bootstrap desde HubSpot para companias con al menos un `closedwon`, cada uno con un contacto cliente inicial en estado `invited`.
- Aun no existe `/api/sprints`.
- Aun no existen `/api/dashboard/capacity` ni `/api/dashboard/market-speed`; se pospusieron porque los tiempos operativos actuales no vienen en formato numerico confiable.
- Ya existe una capa multi-user real separada de tenants.
- La sincronizacion externa de capabilities debe venir por payload explicito desde una fuente canonica de empresa; no debe inferirse automaticamente desde `deals`.
- El runtime de auth y `getTenantContext()` ya exponen `businessLines` y `serviceModules`.
- La spec de capabilities ya no queda solo en documento: existe un registry runtime y una ruta generica `/capabilities/[moduleId]` alimentada por el tenant context actual.
- `/admin/tenants/[id]` ya no solo muestra business lines y service modules: ahora tambien dispone de un editor de capabilities y rutas API para guardar seleccion manual o sincronizar desde fuentes externas.
- `/admin/tenants/[id]` ahora tambien consulta un servicio HubSpot dedicado para leer `company profile` y `owner` bajo demanda, sin esperar a BigQuery.
- `/admin/tenants/[id]` ahora tambien consulta los `contacts` asociados a la `company` en HubSpot para comparar miembros CRM contra los usuarios ya provisionados en Greenhouse.
- `/admin/tenants/[id]` ya puede provisionar de forma segura los contactos CRM faltantes hacia `greenhouse.client_users`:
  - crea usuarios `invited` cuando no existen
  - reconcilia usuarios ya existentes del mismo tenant por email para reparar rol `client_executive` y scopes base si quedaron incompletos
  - evita falsos `already_exists` cuando el usuario existia pero su acceso no estaba completo
- ya existe una base documental para un orquestador UI multi-agente: `GREENHOUSE_UI_ORCHESTRATION_V1.md`, `GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md` y `GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md` fijan como Claude, Codex u otros asistentes deben normalizar solicitudes y seleccionar patrones Vuexy/MUI sin explorar `full-version` de forma ad hoc
- Regla de latencia actual:
  - `company profile`, `owner` y `contacts` pueden reflejar cambios de HubSpot con baja latencia cuando Greenhouse vuelve a consultar el servicio dedicado
  - `capabilities` siguen siendo sync-based hasta que exista una capa event-driven o webhook-driven
- Aun no existe una capa semantica de KPIs y marts para dashboard, team, capacity y campaigns.
- Ya existen rutas minimas de Efeonce interno y admin, y el modulo admin ya tiene tenants, lista de usuarios, roles y detalle de usuario; falta mutacion segura de scopes y feature flags.
- `serviceModules` ya extienden la navegacion cliente a traves de la seccion dinamica `Servicios`; sigue pendiente extenderlos a billing por servicio contratado.
- Para Sky Airline ya existe un diagnostico formal de factibilidad:
- `on-time` mensual, tenure y entregables/ajustes por mes ya quedaron implementados con la data actual
- ya existen en `/dashboard` secciones reusables de quality, account team, capacity inicial, herramientas tecnologicas y AI tools
- esas secciones mezclan señal real de BigQuery, nombres detectados desde Notion, defaults por `serviceModules` y overrides controlados por tenant
- sigue pendiente formalizar APIs y modelos fuente para que dejen de depender de fallback u overrides
- la siguiente iteracion de UI debe dejar de tratar cada seccion como una card aislada y converger hacia familias reusables de hero, mini stat, chart, list y table cards
- el switch de tema del shell Greenhouse ya esta operativo en navbar con soporte real para `light`, `dark` y `system`, incluyendo reaccion al cambio del tema del sistema mientras la sesion sigue abierta

## Deploy
- Hosting principal: Vercel
- Repositorio remoto: `https://github.com/efeoncepro/greenhouse-eo.git`
- Configuracion importante en Vercel:
  - `Framework Preset`: `Next.js`
  - `Root Directory`: vacio o equivalente al repo raiz
  - `Output Directory`: vacio
- Se detecto un problema inicial de `404 NOT_FOUND` por tener `Framework Preset` en `Other`. Ya fue resuelto.

## Estrategia de Ramas y Ambientes
- `main`:
  - rama productiva
  - su deploy en Vercel corresponde a `Production`
- `develop`:
  - rama de integracion compartida
  - debe usarse como entorno de prueba funcional del equipo
  - esta asociada al `Custom Environment` `staging` en Vercel
- `feature/*` y `fix/*`:
  - ramas personales o por tarea
  - cada push debe validarse en `Preview`
- `hotfix/*`:
  - salen desde `main`
  - sirven para corregir produccion con el menor alcance posible
  - deben volver tanto a `main` como a `develop`

## Logica de Trabajo Recomendada
1. Crear rama desde `develop` para trabajo normal o desde `main` para hotfix.
2. Implementar cambio pequeno y verificable.
3. Validar localmente con `npx pnpm build`, `npx pnpm lint` o prueba manual suficiente.
4. Hacer push de la rama y revisar su Preview Deployment en Vercel cuando el cambio afecte UI, rutas, layout o variables.
5. Mergear a `develop` cuando el cambio ya este sano en su preview individual.
6. Hacer validacion compartida sobre `Staging` asociado a `develop`.
7. Mergear a `main` solo cuando el cambio este listo para produccion.
8. Confirmar deploy a `Production` en Vercel.

## Regla de Entornos
- `Development`: uso local de cada agente
- `Preview`: validacion remota de ramas de trabajo
- `Staging`: entorno persistente controlado asociado a `develop`
- `Production`: estado estable accesible para usuarios finales

## Regla de Variables en Vercel
- Toda variable debe definirse conscientemente por ambiente.
- No asumir que una variable de `Preview` o `Staging` existe en `Production`, ni al reves.
- Si una feature necesita variable nueva, primero debe existir en `Preview` y `Staging` antes de promocionarse a `main`.
- Mantener `.env.example` alineado con las variables requeridas.
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` en `Preview` puede llegar en mas de una serializacion; el parser de `src/lib/bigquery.ts` ya soporta JSON minified y JSON legacy escapado.
- Si `Preview` rechaza un login que en BigQuery esta activo y con hash correcto, revisar primero alias del dominio y el parseo de `GOOGLE_APPLICATION_CREDENTIALS_JSON` antes de asumir fallo de credenciales.

## Variables de Entorno
- `.env.example` define:
  - `NEXT_PUBLIC_APP_URL`
  - `BASEPATH`
  - `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`
- `next.config.ts` usa `process.env.BASEPATH` como `basePath`
- Riesgo operativo: si `BASEPATH` se configura en Vercel sin necesitarlo, la app deja de vivir en `/`

## Variables de Entorno Objetivo
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `GCP_PROJECT` ya existen en Vercel para `Development`, `staging` y `Production`.
- `NEXTAUTH_SECRET` y `NEXTAUTH_URL` ya estan integradas al runtime actual.
- `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET` habilitan Microsoft SSO multi-tenant en NextAuth y deben existir en cualquier ambiente donde se quiera validar ese flujo.
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` permite apuntar Greenhouse al servicio dedicado `hubspot-greenhouse-integration`; si no se define, el runtime usa el endpoint activo de Cloud Run como fallback.
- Cuando una branch requiera login funcional en `Preview`, tambien debe tener `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GCP_PROJECT`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL` definidos en ese ambiente.
- `tsconfig.json` excluye `**/* (1).ts` y `**/* (1).tsx` para evitar que duplicados locales del workspace rompan `tsc` y los builds de Preview en Vercel.

## Multi-Tenant Actual
- Dataset creado: `efeonce-group.greenhouse`
- Tabla creada: `greenhouse.clients`
- Tenant bootstrap cargado: `greenhouse-demo-client`
- Documento de referencia: `MULTITENANT_ARCHITECTURE.md`
- Documento maestro de evolucion: `GREENHOUSE_ARCHITECTURE_V1.md`
- Documento de Fase 1 para identidad y acceso: `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- DDL versionado: `bigquery/greenhouse_clients.sql`
- DDL propuesto para evolucion multi-user: `bigquery/greenhouse_identity_access_v1.sql`
- DDL multi-user ya aplicado en BigQuery: `client_users`, `roles`, `user_role_assignments`, `user_project_scopes`, `user_campaign_scopes`, `client_feature_flags`, `audit_events`
- DDL de bootstrap real desde HubSpot: `bigquery/greenhouse_hubspot_customer_bootstrap_v1.sql`
- DDL de bootstrap de scopes por mapeo conocido: `bigquery/greenhouse_project_scope_bootstrap_v1.sql`

## Decisiones Actuales
- Mantener cambios iniciales pequenos y reversibles.
- Usar `full-version` como fuente de contexto y referencia para construir la version Greenhouse dentro de `starter-kit`.
- Usar `../Greenhouse_Portal_Spec_v1.md` como especificacion funcional principal.
- No versionar `full-version` como parte de este repo.
- Favorecer despliegues frecuentes y verificables en Vercel.
- Usar `develop` como rama de `Staging` y `main` como rama de produccion.
- Documentar toda decision que afecte layout, rutas, deploy o variables de entorno.
- Mantener la politica de finales de linea en `LF` y evitar depender de conversiones automaticas de Git en Windows.
- En Windows local, `build` usa un `distDir` dinamico bajo `.next-local/` para evitar fallos `EPERM` al reutilizar la misma salida dentro de OneDrive.
- Evitar comandos Git mutantes en paralelo para no generar `index.lock`.
- La estrategia de IDs de producto ya no debe exponer prefijos de origen como `hubspot-company-*`; usar `GREENHOUSE_ID_STRATEGY_V1.md` y `src/lib/ids/greenhouse-ids.ts` como referencia.
- Capability governance no debe derivarse desde `deals` ni `closedwon`; el sync externo solo es valido cuando llega con payload explicito desde el registro de empresa u otra fuente canonica equivalente.
- La fuente canonica de nomenclatura y microcopy Greenhouse vive en `src/config/greenhouse-nomenclature.ts`; cualquier texto visible nuevo en cliente debe salir de esa capa.
- La navegacion cliente vigente para el portal Greenhouse contempla `Pulse`, `Proyectos`, `Ciclos`, `Mi Greenhouse` y `Updates`.
- `Mi Greenhouse` concentra el modulo relacional `Tu equipo de cuenta`; `Pulse` mantiene `Capacidad del equipo` como lectura operativa separada.
- La capa `GH_INTERNAL_MESSAGES` ya gobierna tambien partes grandes de `admin/tenants/[id]`, `view-as/dashboard`, governance de capabilities y tablas operativas del detalle de space.

## Deuda Tecnica Visible
- El proyecto ya tiene shell Greenhouse, pero aun no refleja la identidad funcional final.
- La autenticacion runtime ya no depende de `greenhouse.clients`; esas columnas quedaron como metadata legacy de compatibilidad.
- El demo y el admin interno ya usan `password_hash` reales; los contactos cliente importados desde HubSpot permanecen `invited` hasta onboarding.
- Faltan sprints reales, `capacity`, `market-speed` y los data flows restantes definidos en la especificacion.
- Tenant metadata y user identity ya quedaron separados.
- Falta definir la capa semantica de KPIs y capacidad.
- Falta relacion campanas con proyectos, entregables e indicadores.
- Falta aterrizar completamente el sistema ejecutivo reusable en runtime para que `/dashboard`, `/equipo`, `/campanas` e internal/admin compartan un mismo lenguaje visual.
- Sigue pendiente decidir cuando persistir `public_id` en BigQuery; por ahora el runtime puede derivarlos sin romper `client_id` y `user_id`.
- La nueva referencia para conectores externos es `GREENHOUSE_INTEGRATIONS_API_V1.md`; la API de integraciones debe mantenerse generica para HubSpot, Notion u otros sistemas.
- `GET /api/integrations/v1/tenants` no debe enviar parametros `NULL` sin `types` a BigQuery; el runtime vigente usa strings vacios como sentinel y tipos explicitos para mantener estable la resolucion de tenants en integraciones externas.
- La nueva lectura operacional de HubSpot no reemplaza la API generica de integraciones:
  - `/api/integrations/v1/*` sigue siendo el contrato para sync bidireccional de capabilities
  - el servicio `hubspot-greenhouse-integration` es la fachada de lectura live para CRM company/owner
- Sigue pendiente barrer copy residual interna en superficies grandes como `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`.
- Existe un bloqueo de tipos ajeno al plan actual por el archivo duplicado `src/config/capability-registry (1).ts`, que hoy impide usar `tsc` como verificacion integral limpia.

## Supuestos Operativos
- El repo puede estar siendo editado por varios agentes y personas en paralelo.
- `Handoff.md` es la fuente de continuidad entre turnos.
- `AGENTS.md` define las reglas del repositorio y prevalece como guia operativa local.
