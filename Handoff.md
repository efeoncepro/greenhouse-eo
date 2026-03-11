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
- 2026-03-11 18:05 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Extender Greenhouse para consumir los contactos asociados a la company desde `hubspot-greenhouse-integration` y mostrar el gap entre contactos CRM y usuarios ya provisionados del space.
- Publicar un contrato cross-repo en `/developers/api` para fijar ownership por repo, contract surfaces, branch policy y promotion flow.

### Rama
- Rama usada: `feature/hubspot-live-cross-repo-contract`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Production

### Archivos tocados
- `GREENHOUSE_CROSS_REPO_CONTRACT_V1.md`
- `GREENHOUSE_INTEGRATIONS_API_V1.md`
- `README.md`
- `changelog.md`
- `project_context.md`
- `Handoff.md`
- `public/docs/greenhouse-cross-repo-contract-v1.md`
- `src/app/(blank-layout-pages)/developers/api/page.tsx`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `vercel --prod --yes`: correcto
  - deployment productivo final: `https://greenhouse-9s95g7396-efeonce-7670142f.vercel.app`
  - aliases verificados por `vercel inspect`:
    - `https://greenhouse-eo.vercel.app`
    - `https://greenhouse.efeoncepro.com`
- Validacion operativa del servicio live de HubSpot:
  - `GET /contract`: `200`
  - `GET /companies/30825221458/contacts`: `200`
  - respuesta valida con `16` contactos asociados para `Sky Airline`
- `/developers/api` ahora debe considerarse la referencia publica para:
  - Integrations API hospedada por Greenhouse
  - facade CRM externa consumida por Greenhouse
  - contrato cross-repo descargable
- smoke publico:
  - `vercel curl /developers/api --deployment greenhouse-9s95g7396-efeonce-7670142f.vercel.app`: correcto
  - `vercel curl /docs/greenhouse-cross-repo-contract-v1.md --deployment greenhouse-9s95g7396-efeonce-7670142f.vercel.app`: correcto
- Limite de smoke:
  - aun no se ha hecho verificacion visual/autenticada de `/admin/tenants/[id]` en Production para este bloque nuevo de contactos

### Riesgos o pendientes
- El servicio dedicado de HubSpot sigue publico por ahora; si Greenhouse va a depender mas de el, conviene endurecer autenticacion o red privada.
- Falta validar visualmente la tabla de contactos CRM y su comparacion con usuarios provisionados en `/admin/tenants/[id]`.
- Falta decidir si el siguiente paso solo sera lectura live o provisionamiento automatico hacia `greenhouse.client_users`.

### Proximo paso recomendado
- Revisar con sesion admin real `/admin/tenants/hubspot-company-30825221458` y confirmar que los contactos CRM se muestran correctamente con el estado `Ya existe` o `Falta provisionar`.
- Si el resultado convence, el siguiente paso ya no es solo lectura: decidir si Greenhouse va a provisionar automaticamente esos contactos hacia `greenhouse.client_users`.
- Si otro agente o repo necesita continuar este trabajo, el primer read ya no debe ser una memoria conversacional sino `GREENHOUSE_CROSS_REPO_CONTRACT_V1.md`.

### Fecha
- 2026-03-11 16:45 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Conectar Greenhouse al servicio dedicado `hubspot-greenhouse-integration` para lecturas live de `company profile` y `owner`, y dejar documentado el modelo real de latencia frente a HubSpot.

### Rama
- Rama usada: `main`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Production

### Archivos tocados
- `.env.example`
- `GREENHOUSE_INTEGRATIONS_API_V1.md`
- `README.md`
- `changelog.md`
- `project_context.md`
- `Handoff.md`
- `src/lib/admin/get-admin-tenant-detail.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `vercel --prod --yes`: correcto
  - deployment productivo final: `https://greenhouse-qzt2jdrt3-efeonce-7670142f.vercel.app`
  - aliases verificados por `vercel inspect`:
    - `https://greenhouse-eo.vercel.app`
    - `https://greenhouse.efeoncepro.com`
- `vercel env ls production`: correcto
  - `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` ya existe en `Production`
- Validacion operativa del servicio live de HubSpot:
  - `GET /contract`: `200`
  - `GET /companies/30825221458`: `200`
  - `GET /companies/30825221458/owner`: `200`
  - retorna `Sky Airline` y owner `Julio Reyes Rangel`
- Limite de smoke:
  - no se hizo verificacion visual/autenticada de `/admin/tenants/[id]` en Production porque faltaba una sesion admin automatizada para ese turno

### Riesgos o pendientes
- La lectura live de `company` y `owner` reduce latencia porque consulta HubSpot bajo demanda, pero `capabilities` siguen siendo sync-based.
- El servicio dedicado de HubSpot sigue publico por ahora; si Greenhouse va a depender mas de el, conviene endurecer autenticacion o red privada.
- Falta una validacion visual/autenticada de la card live dentro de `/admin/tenants/[id]`.

### Proximo paso recomendado
- Entrar con una sesion admin real y revisar `/admin/tenants/hubspot-company-30825221458` para confirmar visualmente la card live.
- Si Greenhouse va a leer mas campos live, extender el servicio dedicado antes de tocar la API generica de integraciones.

### Fecha
- 2026-03-11 10:55 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Reparar la API productiva de integraciones para que el bridge de HubSpot pueda resolver tenants y terminar la conexion bidireccional con Greenhouse.

### Rama
- Rama usada: `main`
- Rama objetivo del merge: `main`

### Ambiente objetivo
- Production

### Archivos tocados
- `.gitignore`
- `src/lib/integrations/greenhouse-integration.ts`
- `changelog.md`
- `project_context.md`
- `Handoff.md`

### Verificacion
- `npx pnpm lint src/lib/integrations/greenhouse-integration.ts src/app/api/integrations/v1/tenants/route.ts`: correcto
- `npx pnpm build`: correcto
- Causa raiz reproducida antes del fix:
  - BigQuery rechazaba `NULL` en `targetClientId` y `updatedSince` sin `types`, devolviendo `Parameter types must be provided for null values`
- `vercel --prod --yes`: correcto
  - deployments productivos relevantes:
    - `https://greenhouse-rd6xgomq7-efeonce-7670142f.vercel.app`
    - `https://greenhouse-ki5azne0e-efeonce-7670142f.vercel.app`
    - `https://greenhouse-ojlumllrz-efeonce-7670142f.vercel.app`
- Se roto `GREENHOUSE_INTEGRATION_API_TOKEN` en Vercel Production y luego se redeployo Greenhouse.
- Se corrigio tambien el path de mutacion de integraciones:
  - `src/lib/admin/tenant-capabilities.ts` ahora envia `types` explicitos a BigQuery para los params nullable del `MERGE`
- Smoke real final en Production:
  - `GET /api/integrations/v1/catalog/capabilities`: `200`
  - `GET /api/integrations/v1/tenants`: `200`
  - `GET /api/integrations/v1/tenants?sourceSystem=hubspot_crm&sourceObjectType=company&sourceObjectId=30825221458`: `200`
  - el bloqueo operativo ya no esta en Greenhouse; el bridge de HubSpot pudo volver a consumir la API correctamente

### Riesgos o pendientes
- `staging` sigue pendiente de validacion separada; el problema operativo activo estaba en Production.
- Los archivos temporales `.env.vercel.production` y `.env.vercel.staging` se siguen eliminando tras cada uso local; no forman parte del cambio versionado.
- Falta decidir si los dry runs del bridge HubSpot deben dejar o no huella de idempotencia, porque hoy el primer push real despues de un dry run necesita `force=true`.

### Proximo paso recomendado
- Mantener Greenhouse y `hubspot-bigquery` sincronizados sobre el token actual rotando ambos lados en el mismo turno si vuelve a cambiar.
- Si se quiere pulir la operacion, ajustar la semantica de idempotencia para que `dryRun=true` no obligue a usar `force=true` en la primera corrida real.

### Fecha
- 2026-03-11 06:31 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Simplificar el hero del dashboard para corregir la desalineacion del top fold.
- Mantener la card de `Capacity` como version principal y dejar lista una variante compacta reusable.
- Subir el nivel de UX writing y accesibilidad en hero y capacity.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / staging

### Archivos tocados
- `GREENHOUSE_DASHBOARD_UX_GAPS_V1.md`
- `src/components/greenhouse/ExecutiveHeroCard.tsx`
- `src/components/greenhouse/ExecutiveMiniStatCard.tsx`
- `src/components/greenhouse/CapacityOverviewCard.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/dashboard/AccountTeamSection.tsx`
- `src/views/greenhouse/dashboard/config.ts`
- `src/views/greenhouse/dashboard/orchestrator.ts`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Validacion visual local:
  - login admin correcto en `http://localhost:3100/login`
  - `view-as` correcto en `http://localhost:3100/admin/tenants/space-efeonce/view-as/dashboard`
  - captura Playwright confirmo hero mas compacto y top stats derechas sin elongacion artificial
- Skill usado para criterio de seleccion UI/UX:
  - `greenhouse-vuexy-portal`
  - referencia aplicada: `references/ui-ux-vuexy.md`

### Riesgos o pendientes
- La variante `compact` de `CapacityOverviewCard` quedo lista en el componente pero no se consume todavia en otra superficie real.
- La validacion visual se hizo sobre `view-as` del tenant benchmark `space-efeonce`; faltaria repetirla en `Preview` Vercel si este cambio se promueve fuera de local.
- Se creo `.env.local` ignorado por Git para autenticar la sesion local de validacion; no forma parte del cambio versionado.

### Proximo paso recomendado
- Hacer push y revisar el deployment de `develop` o del preview correspondiente con `vercel-ops` si se quiere repetir la comprobacion visual fuera de local.

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Crear el benchmark interno `space-efeonce`, llevar el dashboard a `snapshot mode` para historicos cortos y empezar a migrar el labeling visible de `tenant` a `space`.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development / staging

### Archivos tocados
- `bigquery/greenhouse_efeonce_space_v1.sql`
- `src/lib/dashboard/tenant-dashboard-overrides.ts`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx`
- `src/views/greenhouse/dashboard/*`
- `src/components/greenhouse/*`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Smoke BigQuery:
- `space-efeonce` creado en `greenhouse.clients`
- `space-efeonce` con `57` proyectos base
- `space-efeonce` con `958` tareas intersectando el scope
- `space-efeonce` con business lines `crm_solutions`, `globe`, `wave`
- `space-efeonce` con service modules `agencia_creativa`, `consultoria_crm`, `desarrollo_web`, `implementacion_onboarding`, `licenciamiento_hubspot`

### Riesgos o pendientes
- `space-efeonce` es metadata-only por ahora: no tiene `client_users` propios y debe consumirse via `Ver como cliente` desde admin.
- El lookup de auth no debe duplicarse con el mismo email interno en `tenant_type = client`; eso introduciria ambiguedad en login.
- El siguiente paso de producto es validar el dashboard de `space-efeonce` y, en base a esa lectura, decidir si se divide en una vista general y vistas anidadas de performance / delivery / quality.
- La deuda UX mas importante que ya se ataco es `capacity`; la siguiente si hiciera falta seria dividir el dashboard rico en tabs o vistas anidadas para bajar longitud total.
- Documento de referencia para esta iteracion: `GREENHOUSE_DASHBOARD_UX_GAPS_V1.md`.

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

## 2026-03-10 - Executive UI system documentation baseline

### Objetivo del turno
- Documentar el sistema visual ejecutivo reusable que debe guiar la siguiente iteracion del dashboard y futuras superficies Greenhouse.
- Alinear la documentacion viva para que el rediseño no derive en cards ad hoc ni en copias directas de Vuexy.

### Cambios aplicados
- Se agrego `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md` como contrato de:
  - jerarquia visual
  - familias de cards ejecutivas
  - reglas de composicion
  - limites de reutilizacion de Vuexy
- Se alinearon `README.md`, `GREENHOUSE_ARCHITECTURE_V1.md`, `BACKLOG.md`, `PHASE_TASK_MATRIX.md` y `project_context.md` para que el siguiente paso prioritario sea migrar `/dashboard` a ese sistema reusable.

### Verificacion
- Revision manual de consistencia documental sobre:
  - arquitectura
  - backlog
  - matriz de fases
  - contexto operativo
  - referencias Vuexy

### Riesgos o pendientes
- Todavia no hay cambio runtime en este bloque; solo base documental.
- El siguiente paso correcto es commit documental y luego implementacion del refactor visual reusable en `/dashboard`.

## 2026-03-10 - Executive dashboard orchestration and Vuexy-aligned refactor

### Objetivo del turno
- Rehacer `/dashboard` con jerarquia mas cercana a Vuexy analytics sin copiar su branding ni su data demo.
- Introducir una capa escalable de orquestacion para decidir que bloques ejecutivos mostrar y en que orden.

### Cambios aplicados
- Se agregaron componentes reusables en `src/components/greenhouse/*`:
  - `ExecutiveCardShell`
  - `ExecutiveHeroCard`
  - `ExecutiveMiniStatCard`
- Se adaptaron al dashboard patrones fuertes de Vuexy:
  - hero tipo `WebsiteAnalyticsSlider`
  - card analitica tipo `EarningReports`
  - card de salud tipo `SupportTracker`
  - tabla compacta tipo `ProjectsTable`
- Se agrego `src/views/greenhouse/dashboard/orchestrator.ts` como registro deterministico de bloques ejecutivos.
- `GreenhouseDashboard.tsx` ya no arma el layout a mano; ahora consume ese orquestador y compone hero, top stats, analisis y contexto sobre los mismos datos reales.

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto

### Riesgos o pendientes
- El dashboard ya tiene una capa de composicion reusable, pero aun no existe una extension equivalente para `/equipo`, `/campanas` o vistas internas.
- Falta validacion visual manual en `dev-greenhouse.efeoncepro.com` y luego en produccion.
- `AttentionProjectCard.tsx` quedo desplazado por la nueva tabla compacta y podria eliminarse en una limpieza posterior si ya no vuelve a usarse.
- El skill local `greenhouse-vuexy-portal` fue reforzado con una guia de seleccion de componentes Vuexy/MUI para futuras decisiones UI/UX; usarlo como criterio antes de crear widgets nuevos.

## 2026-03-10 - Logo libraries and compact documentation model

### Objetivo del turno
- Dejar documentado el stack real de logos y marcas para UI Greenhouse.
- Reducir friccion documental con una regla canonica de documentacion liviana.

### Cambios aplicados
- Se instalaron `simple-icons` y `@iconify-json/logos` en `starter-kit` para reutilizar logos de tecnologia y AI sin descargar assets manuales.
- Se documento que el stack activo de charts sigue siendo `apexcharts` + `react-apexcharts`, mientras `recharts` y `keen-slider` siguen como referencia en `full-version`.
- Se agrego `DOCUMENTATION_OPERATING_MODEL_V1.md` para fijar una politica de documentacion compacta basada en una fuente canonica y deltas cortos.

### Verificacion
- `pnpm add simple-icons`
- `pnpm add -D @iconify-json/logos`
- `postinstall` regenero `src/assets/iconify-icons/generated-icons.css`

### Riesgos o pendientes
- Aun no existe un componente reusable `BrandLogo` para explotar `simple-icons` y `@iconify-json/logos` desde runtime.
- `recharts` y `keen-slider` aun no fueron activados en `starter-kit`; siguen en evaluacion como siguiente paso visual.

## 2026-03-10 - Sky reusable dashboard capabilities

### Objetivo del turno
- Convertir el slice de Sky en capacidades reusables y escalables del dashboard, no en una excepcion por tenant.
- Incorporar account team, capacity inicial, tooling tecnologico, tooling AI, `RpA` mensual y `First-Time Right` con una capa reusable.

### Cambios aplicados
- Se extendio `getDashboardOverview()` para exponer:
  - `accountTeam`
  - `tooling`
  - `qualitySignals`
  - `relationship`
  - `charts.monthlyDelivery`
- Se creo `src/lib/dashboard/tenant-dashboard-overrides.ts` como capa controlada para:
  - overrides de equipo asignado
  - defaults de herramientas por `serviceModules`
  - fallback seedado de `RpA`
- Se agregaron secciones reusables del dashboard:
  - `DeliverySignalsSection`
  - `QualitySignalsSection`
  - `AccountTeamSection`
  - `ToolingSection`
- `GreenhouseDashboard.tsx` quedo como ensamblador de capacidades, no como archivo monolitico con JSX tenant-specific.

### Validacion
- Smoke BigQuery real sobre Sky:
  - miembros detectados desde Notion: `Daniela`, `Melkin Hernandez | Efeonce`
  - primer proyecto scoped: `Kick-Off - Sky Airlines`
  - serie mensual visible: `2025-07`
  - `2` entregables visibles
  - `50%` on-time mensual
  - `0` ajustes cliente
  - `avg_rpa = null` medido y fallback seedado disponible para UI
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto

### Riesgos o pendientes
- `RpA` sigue siendo un dato muy pobre en origen; la UI lo muestra con `source = measured | seeded | unavailable`.
- capacity, tooling y AI tooling ya existen como lectura ejecutiva reusable, pero no como APIs formales ni modelos semanticos duros.
- Falta validacion visual manual del dashboard en `staging` o `Preview`.

## 2026-03-10 - Admin view-as para dashboard cliente

### Objetivo del turno
- Permitir a `julio.reyes@efeonce.org` revisar lo que ve un cliente sin cerrar su sesion admin.

### Cambios aplicados
- Se agrego el boton `Ver como cliente` en `GreenhouseAdminTenantDetail`.
- Se creo la ruta `src/app/(dashboard)/admin/tenants/[id]/view-as/dashboard/page.tsx`.
- Se creo `GreenhouseAdminTenantDashboardPreview` para renderizar el dashboard real del tenant bajo shell admin y con banner de preview.

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Next ya registra la ruta `ƒ /admin/tenants/[id]/view-as/dashboard`

### Uso
- Entrar con cuenta admin
- Abrir `/admin/tenants/{clientId}`
- Pulsar `Ver como cliente`

### Objetivo del turno
- Implementar el primer slice seguro de Sky Airline dentro del dashboard existente.
- Mantener fuera de runtime los bloques que siguen bloqueados por modelado o calidad de dato.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `main` despues de validacion visual

### Ambiente objetivo
- Development y luego `staging`

### Archivos tocados
- `BACKLOG.md`
- `Handoff.md`
- `PHASE_TASK_MATRIX.md`
- `README.md`
- `SKY_TENANT_EXECUTIVE_SLICE_V1.md`
- `changelog.md`
- `project_context.md`
- `src/app/api/dashboard/summary/route.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/types/greenhouse-dashboard.ts`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/dashboard/chart-options.ts`

### Verificacion
- Smoke BigQuery directo:
  - primera actividad visible Sky: `2025-07-16`
  - serie mensual visible: `2025-07`
  - `2` entregables visibles
  - `50%` on-time
  - `0` ajustes cliente
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Intento de smoke directo del helper `getDashboardOverview()` con `tsx`: no aplica fuera del runtime Next por el guard `server-only`

### Riesgos o pendientes
- El grano mensual actual usa `created_time`, no `due month`; eso fue una decision deliberada para este primer slice seguro.
- RpA y `First-Time Right` siguen bloqueados y se muestran como pendientes, no como KPI.
- equipo asignado, capacity, herramientas y AI tools siguen pendientes de modelo explicito.
- Falta validacion visual manual del nuevo slice en `/dashboard`.

### Proximo paso recomendado
- Validar visualmente el dashboard de Sky en `staging`.
- Si la UI queda sana, seguir con `/admin/scopes` y `/admin/feature-flags`.

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Reautenticar GCP en local para recuperar acceso confiable a BigQuery.
- Evaluar sobre datos reales la factibilidad del slice pedido para Sky Airline antes de escribir codigo de producto.
- Dejar la iniciativa documentada y alineada con backlog, arquitectura y contexto operativo.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: sin merge por ahora; pendiente aprobacion del enfoque

### Ambiente objetivo
- Development
- BigQuery dataset `efeonce-group.greenhouse`

### Archivos tocados
- `BACKLOG.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `Handoff.md`
- `PHASE_TASK_MATRIX.md`
- `README.md`
- `SKY_TENANT_EXECUTIVE_SLICE_V1.md`
- `changelog.md`
- `project_context.md`

### Verificacion
- `gcloud auth login --update-adc`: correcto
- `gcloud auth print-access-token`: correcto
- `gcloud auth application-default print-access-token`: correcto
- Smoke BigQuery real sobre Sky:
  - tenant encontrado: `hubspot-company-30825221458` `Sky Airline`
  - modulos activos: `agencia_creativa`, `globe`
  - proyecto scoped actual: `23239c2f-efe7-80ad-b410-f96ea38f49c2` `Kick-Off - Sky Airlines`
  - `pct_on_time` del proyecto: placeholder dash, no valor usable
  - `rpa_promedio` del proyecto: `0`
  - tareas visibles en scope actual: `2`
  - primera evidencia operativa visible: `2025-07-16`
  - Daniela visible en proyecto y tareas; Melkin visible en una tarea; Andres no visible en el scope actual
  - `rpa` no es confiable hoy para KPI cliente: `1118` de `1125` tareas globales tienen `rpa = 0`

### Riesgos o pendientes
- Sky pide `First-Time Right` basado en RpA, pero el dato de RpA no es defendible hoy para un KPI cliente.
- La seccion de equipo asignado no debe salir de inferir responsables de tareas; requiere un modelo explicito de account assignment.
- Herramientas tecnologicas, herramientas AI y capacity por persona no existen todavia como modelo reutilizable en Greenhouse.
- El contador de tenure necesita una decision de fuente:
  - `2025-07-16` si significa primera colaboracion operativa visible
  - `2025-08-01` si significa inicio formal del proyecto
- No se hizo `commit` ni `push`; queda pendiente aprobacion explicita del enfoque antes de versionar.

### Proximo paso recomendado
- Revisar y aprobar `SKY_TENANT_EXECUTIVE_SLICE_V1.md`.
- Si se aprueba, implementar primero solo el slice seguro:
  - `on-time` mensual
  - tenure
  - output mensual y ajustes por mes
- Dejar RpA, `First-Time Right`, equipo asignado, capacity y tooling para una segunda capa con modelo nuevo.

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Promover `develop` a `main` y verificar el deployment productivo real.
- Corregir la documentacion viva para usar el alias productivo actual validado en Vercel.

### Rama
- Rama usada: `main`
- Rama promovida: `develop` -> `main`

### Ambiente objetivo
- Production

### Archivos tocados
- `CONTRIBUTING.md`
- `Handoff.md`
- `README.md`
- `project_context.md`

### Verificacion
- `git merge --ff-only develop`: correcto
- `git push origin main`: correcto
- `vercel list greenhouse-eo --yes`: correcto, nuevo deployment `Production` listo
- `vercel inspect https://greenhouse-ttyaam78y-efeonce-7670142f.vercel.app`: correcto
- Alias productivos verificados:
  - `https://greenhouse-eo.vercel.app`
  - `https://greenhouse.efeoncepro.com`
- `nslookup greenhouse.efeoncepro.com`: correcto
- `vercel curl /login --deployment https://greenhouse-ttyaam78y-efeonce-7670142f.vercel.app`: responde
- `vercel curl /api/auth/csrf --deployment https://greenhouse-ttyaam78y-efeonce-7670142f.vercel.app`: responde
- `vercel curl /dashboard --deployment https://greenhouse-ttyaam78y-efeonce-7670142f.vercel.app`: responde

### Riesgos o pendientes
- El dominio `greenhouse.efeonce.com` no corresponde al alias productivo verificado en este turno; la documentacion viva ya quedo corregida a `greenhouse.efeoncepro.com`.
- La app productiva esta protegida por Vercel Authentication para smoke HTTP directo; la verificacion remota en este turno se hizo con `vercel inspect`, DNS y `vercel curl`.
- Sigue pendiente validacion visual manual del dashboard module-aware con tenants `crm_solutions`, `globe` y `wave`.

### Proximo paso recomendado
- Validar visualmente `https://greenhouse.efeoncepro.com` en Production.
- Luego volver a `develop` para abrir `/admin/scopes` y `/admin/feature-flags`.

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Volver `/dashboard` module-aware usando `businessLines` y `serviceModules` ya presentes en el tenant context.
- Mantener alineados los artefactos vivos para que el backlog no siga marcando este punto como pendiente.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `main` despues de validacion visual en `Preview` o `staging`

### Ambiente objetivo
- Development y luego `Preview` o `staging`

### Archivos tocados
- `BACKLOG.md`
- `Handoff.md`
- `PHASE_TASK_MATRIX.md`
- `README.md`
- `changelog.md`
- `project_context.md`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/api/dashboard/charts/route.ts`
- `src/app/api/dashboard/risks/route.ts`
- `src/app/api/dashboard/summary/route.ts`
- `src/app/api/dashboard/kpis/route.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/types/greenhouse-dashboard.ts`
- `src/components/greenhouse/ChipGroup.tsx`
- `src/components/greenhouse/MetricList.tsx`
- `src/components/greenhouse/MetricStatCard.tsx`
- `src/components/greenhouse/SectionHeading.tsx`
- `src/components/greenhouse/index.ts`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/dashboard/AttentionProjectCard.tsx`
- `src/views/greenhouse/dashboard/chart-options.ts`
- `src/views/greenhouse/dashboard/config.ts`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto

### Riesgos o pendientes
- La composicion actual es UI-aware y usa los mismos aggregates ejecutivos existentes; todavia no crea payloads dedicados por modulo ni evita recomputar `getDashboardOverview()` por slice.
- Falta validacion visual manual en `Preview` o `staging` para confirmar balance, copy y comportamiento responsive del nuevo dashboard.
- `serviceModules` ya condicionan el dashboard, pero aun no la navegacion ni billing.
- Next 16 vuelve a intentar inyectar includes efimeros de `.next-local` en `tsconfig.json` durante `build`; se limpiaron para no dejar rutas locales hardcodeadas en el repo.
- La nueva capa reusable transversal vive en `src/components/greenhouse/*`; futuras vistas Greenhouse deberian consumir primero esa capa y dejar en `src/views/greenhouse/<modulo>/*` solo lo especifico de cada superficie.

### Proximo paso recomendado
- Validar visualmente `/dashboard` con al menos un tenant `crm_solutions`, uno `globe` y uno `wave`.
- Si la UI queda sana, abrir `/admin/scopes` y `/admin/feature-flags` como siguiente slice.

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Materializar el siguiente slice de Fase 7 centrado en tenants.
- Mantener consistente el modelo `tenant = client = empresa`, con relacion uno-a-muchos hacia usuarios.

### Rama
- Rama usada: `develop`
- Rama objetivo del merge: `main` despues de validacion visual en `staging`

### Ambiente objetivo
- Development y luego `staging`

### Archivos tocados
- `BACKLOG.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `Handoff.md`
- `MULTITENANT_ARCHITECTURE.md`
- `PHASE_TASK_MATRIX.md`
- `README.md`
- `changelog.md`
- `project_context.md`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/admin/tenants/page.tsx`
- `src/app/(dashboard)/admin/tenants/[id]/page.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/lib/admin/get-admin-tenant-detail.ts`
- `src/lib/admin/get-admin-tenants-overview.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Build confirma rutas:
  - `/admin/tenants`
  - `/admin/tenants/[id]`
  - `/admin/users`
  - `/admin/users/[id]`
  - `/admin/roles`
- Smoke BigQuery previo para diseño del slice:
  - tenants con `auth_mode = password_reset_pending` y 1 usuario bootstrap: correctos
  - tenant demo con multiples usuarios: correcto
  - `serviceModules`, `feature flags` y `scoped projects` por tenant: correctos

### Riesgos o pendientes
- El slice de tenants es read-only; aun no existen mutaciones seguras.
- `client_feature_flags` y `client_service_modules` ya se muestran, pero todavia no existe gobierno editable para scopes ni flags.
- La capa documental ya refleja que `tenant = client = empresa` y que la relacion correcta es `1 tenant -> N usuarios`.
- Conviene validar visualmente en `staging` antes de promover a `main`.

### Proximo paso recomendado
- Validar visualmente `/admin/tenants` y `/admin/tenants/[id]` en `staging`.
- Luego abrir `/admin/scopes` y `/admin/feature-flags`, o volver a `/api/sprints` segun prioridad operativa.

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Recuperar acceso del usuario a cuentas existentes del portal.
- Resetear la cuenta demo cliente para volver a probar la vista de cliente.

### Rama
- Rama usada: `develop`

### Ambiente objetivo
- BigQuery dataset `efeonce-group.greenhouse`

### Archivos tocados
- `Handoff.md`

### Verificacion
- `gcloud config get-value project`: `efeonce-group`
- `gcloud auth list`: correcto
- `gcloud auth application-default print-access-token`: correcto
- Update directo sobre `greenhouse.client_users` para `client.portal@efeonce.com`: correcto
- Verificacion posterior de la fila demo:
  - `status = active`
  - `active = true`
  - `auth_mode = credentials`
  - `password_hash_algorithm = bcrypt`
  - `default_portal_home_path = /dashboard`
- Verificacion de hash con la contraseña temporal compartida al usuario en este turno: correcta

### Riesgos o pendientes
- No dejar la contraseña temporal de la demo en documentos del repo ni en SQL versionado.
- Los clientes bootstrap desde HubSpot siguen en `invited` o `password_reset_pending`; no sirven aun como cuentas de prueba cliente.

### Proximo paso recomendado
- Si la cuenta demo vuelve a circular entre varias personas, crear una cuenta cliente de QA separada en lugar de reutilizar `client.portal@efeonce.com`.

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Promover `feature/executive-dashboard-phase2` hacia `develop`.
- Confirmar que la integracion en `develop` construye localmente y queda desplegada en `staging`.

### Rama
- Rama usada: `develop`
- Rama promovida: `feature/executive-dashboard-phase2` -> `develop`

### Ambiente objetivo
- `staging`

### Archivos tocados
- `Handoff.md`

### Verificacion
- `git merge --no-ff feature/executive-dashboard-phase2 -m "merge: promote executive dashboard phase 2"`: correcto
- `npx pnpm build` sobre `develop`: correcto
- Build confirma rutas:
  - `/dashboard`
  - `/admin/roles`
  - `/admin/users`
  - `/admin/users/[id]`
  - `/api/dashboard/summary`
  - `/api/dashboard/charts`
  - `/api/dashboard/risks`
- `git rev-list --left-right --count origin/develop...HEAD`: `0 8`
- `git push origin develop`: correcto
- `vercel inspect https://greenhouse-8gqkxk88v-efeonce-7670142f.vercel.app`: correcto
- Alias de `staging`: `https://dev-greenhouse.efeoncepro.com`
- `vercel curl /login --deployment https://greenhouse-8gqkxk88v-efeonce-7670142f.vercel.app`: correcto, responde la pantalla de login
- `vercel curl /dashboard --deployment https://greenhouse-8gqkxk88v-efeonce-7670142f.vercel.app`: correcto, responde la app protegida y redirige a `/login` sin sesion

### Riesgos o pendientes
- La validacion en Preview y `staging` fue tecnica; aun conviene revision visual manual en `staging` antes de subir a `main`.

### Proximo paso recomendado
- Revisar visualmente `staging`.
- Si la UI y los datos se ven sanos, promover `develop` a `main`.

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Alinear la documentacion operativa con el estado real de `feature/executive-dashboard-phase2`.
- Dejar explicitado el estado de promocion de la rama para el siguiente agente.

### Rama
- Rama usada: `feature/executive-dashboard-phase2`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development ahora
- Preview antes de merge a `develop`

### Archivos tocados
- `BACKLOG.md`
- `README.md`
- `Handoff.md`
- `changelog.md`
- `project_context.md`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `git rev-list --left-right --count develop...feature/executive-dashboard-phase2`: `0 6`
- `git rev-list --left-right --count main...feature/executive-dashboard-phase2`: `0 7`
- `vercel inspect` sobre la alias `greenhouse-eo-git-feature-executive-das-e08569-efeonce-7670142f.vercel.app`: correcto, corresponde a `feature/executive-dashboard-phase2`
- `vercel curl /login`: correcto, devuelve la pantalla de login del portal
- `vercel curl /api/auth/csrf`: correcto, devuelve `csrfToken`
- `vercel curl /dashboard`: correcto, responde el dashboard ejecutivo en Preview
- `vercel curl /admin/users`: correcto, responde la superficie admin en Preview

### Riesgos o pendientes
- La validacion remota de este turno fue tecnica, no visual; conviene revisar UI manualmente en `staging` despues del merge a `develop`.
- El siguiente bloque con mejor relacion impacto/esfuerzo sigue siendo: `serviceModules` en dashboard, `/admin/tenants`, y luego `/api/sprints`.

### Proximo paso recomendado
- Mergear `feature/executive-dashboard-phase2` a `develop`.
- Validar visualmente `staging` antes de promover a `main`.

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

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Implementar el primer slice completo de Fase 2 para convertir `/dashboard` en la home ejecutiva real del cliente.
- Reutilizar el stack de charts y el wrapper visual de Vuexy desde `full-version` sin romper el estilo del starter.
- Validar las nuevas queries de BigQuery sobre un tenant real con scope bootstrap.

### Rama
- Rama usada: `feature/executive-dashboard-phase2`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development y luego promotion a `Preview`, `staging` y `Production`

### Archivos tocados
- `BACKLOG.md`
- `Handoff.md`
- `README.md`
- `changelog.md`
- `package.json`
- `pnpm-lock.yaml`
- `project_context.md`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/api/dashboard/charts/route.ts`
- `src/app/api/dashboard/kpis/route.ts`
- `src/app/api/dashboard/risks/route.ts`
- `src/app/api/dashboard/summary/route.ts`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/libs/ApexCharts.tsx`
- `src/libs/styles/AppReactApexCharts.tsx`
- `src/types/greenhouse-dashboard.ts`
- `src/views/greenhouse/GreenhouseDashboard.tsx`

### Verificacion
- `npx pnpm add apexcharts@3.49.0 react-apexcharts@1.4.1`: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Validacion local de stack Vuexy:
  - `full-version/package.json`: confirma `apexcharts@3.49.0` y `react-apexcharts@1.4.1`
  - `full-version/src/libs/ApexCharts.tsx`: confirmado
  - `full-version/src/libs/styles/AppReactApexCharts.tsx`: confirmado
- Validacion BigQuery real:
  - smoke query de usuarios cliente con scopes bootstrap: correcta
  - smoke del helper `get-dashboard-overview` contra `hubspot-company-30825221458` y proyecto `23239c2f-efe7-80ad-b410-f96ea38f49c2`: correcto
  - se detecto y corrigio un bug de agregacion en `healthy_projects` y `projects_at_risk` antes de cerrar el turno

### Riesgos o pendientes
- El dashboard ejecutivo ya esta real, pero `capacity` y `market-speed` siguen pendientes porque `tiempo_de_ejecucion`, `tiempo_en_revision` y `tiempo_en_cambios` no vienen en formato numerico confiable desde Notion.
- Los nuevos endpoints `/api/dashboard/summary`, `/api/dashboard/charts` y `/api/dashboard/risks` recomputan el overview completo; si el trafico sube, conviene separar queries o cachear por tenant.
- El smoke real se hizo con un tenant bootstrap de scope corto; antes de promover conviene revisar tambien un tenant con mas volumen.
- Para trabajo visual futuro, el orden correcto de referencia Vuexy es:
- `../full-version/src/views/dashboards/analytics/*`
- `../full-version/src/views/dashboards/crm/*`
- `../full-version/src/libs/ApexCharts.tsx`
- `../full-version/src/libs/styles/AppReactApexCharts.tsx`
- y despues validar contra:
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/libs/apex-charts/`
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/components/styled-libs/app-react-apex-charts/`

### Proximo paso recomendado
- Validar visualmente el nuevo `/dashboard` en `Preview`.
- Promover el slice a `develop` si la UI y los datos se ven sanos.
- Luego abrir el siguiente bloque de Fase 2: `capacity` y `market-speed` solo si primero se normalizan los tiempos operativos en origen o en marts.

### Nota de reutilizacion Vuexy para Admin
- `full-version/src/views/apps/user/list/*` y `full-version/src/views/apps/roles/*` son buenos candidatos de integracion directa para `/admin/users` y `/admin/roles`.
- `full-version/src/views/apps/user/view/*` es la referencia correcta para `/admin/users/[id]`.
- `overview`, `security` y `billing-plans` deben reinterpretarse para Greenhouse:
- `overview` -> tenant, roles, scopes y actividad
- `security` -> auth mode, last login, resets, audit
- `billing-plans` -> invoices, fee y contexto comercial del cliente
- No copiar fake-db ni semantica demo de billing/security del template.
- Documentacion oficial Vuexy raiz:
- `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/`

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Materializar el siguiente slice de Fase 7 reutilizando `user/view/*` de Vuexy para detalle de usuario admin.
- Dejar documentado que `User Management`, `Roles & Permissions` y `billing/security` se usan como referencia estructural y no como data layer demo.

### Rama
- Rama usada: `feature/executive-dashboard-phase2`
- Rama objetivo del merge: `develop`

### Ambiente objetivo
- Development y luego `Preview`

### Archivos tocados
- `BACKLOG.md`
- `Handoff.md`
- `README.md`
- `changelog.md`
- `project_context.md`
- `src/app/(dashboard)/admin/users/[id]/page.tsx`
- `src/lib/admin/get-admin-user-detail.ts`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminUsers.tsx`

### Verificacion
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Build confirma rutas:
  - `/admin/users`
  - `/admin/users/[id]`
  - `/admin/roles`
- La lista de `/admin/users` ahora navega al detalle por `userId`.
- `getAdminUserDetail` consulta `client_users`, `clients`, `roles`, `user_role_assignments`, `user_project_scopes` y `user_campaign_scopes` desde BigQuery.

### Riesgos o pendientes
- `/admin/users`, `/admin/users/[id]` y `/admin/roles` son superficies read-only; aun no existe mutacion segura.
- El tab `billing` es deliberadamente un placeholder estructural para invoices y fee; no debe conectarse a datos fake.
- Aun faltan `/admin/tenants`, `/admin/scopes` y `/admin/feature-flags`.

### Proximo paso recomendado
- Promover este slice si el preview visual esta sano.
- Luego abrir `/admin/tenants` o volver a Fase 2 para madurar `capacity` y `market-speed`, segun prioridad de producto.

---

### Fecha
- 2026-03-10 America/Santiago

### Agente
- Codex

### Objetivo del turno
- Validar si Greenhouse debe condicionar vistas y charts por servicios contratados del cliente.
- Aterrizar esa idea sobre datos reales de BigQuery y dejarla documentada como arquitectura formal.

### Rama
- Rama usada: `feature/executive-dashboard-phase2`

### Hallazgos de datos
- La fuente comercial real disponible hoy es `efeonce-group.hubspot_crm.deals`.
- Existen dos campos utiles:
  - `linea_de_servicio`
  - `servicios_especificos`
- Valores observados en deals `closedwon`:
  - business line: `crm_solutions`, `globe`, `wave`
  - service modules: `licenciamiento_hubspot`, `implementacion_onboarding`, `consultoria_crm`, `agencia_creativa`, `desarrollo_web`
- Esto permite derivar modulos de producto para clientes reales sin hardcodear vistas por tenant.

### Decisiones
- `service modules` se adoptan como cuarto eje del producto junto a tenant, role y scope.
- No reemplazan seguridad.
- Sirven para componer:
  - navegacion
  - widgets del dashboard
  - tabs y vistas relevantes
  - contexto comercial y billing

### Archivos tocados
- `BACKLOG.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `GREENHOUSE_SERVICE_MODULES_V1.md`
- `Handoff.md`
- `README.md`
- `bigquery/greenhouse_service_modules_v1.sql`
- `bigquery/greenhouse_service_module_bootstrap_v1.sql`
- `changelog.md`
- `project_context.md`
- `src/lib/auth.ts`
- `src/lib/tenant/access.ts`
- `src/lib/tenant/get-tenant-context.ts`
- `src/types/next-auth.d.ts`

### Riesgos o pendientes
- El mapping inicial depende de consistencia comercial en HubSpot; hay deals cerrados con valores vacios.
- `serviceModules` deben entrar al tenant context antes de intentar condicionar UI en runtime.
- No usar `serviceModules` como reemplazo de roles/scopes.

### Proximo paso recomendado
- Versionar y luego aplicar el schema `greenhouse_service_modules_v1.sql`.
- Derivar assignments iniciales desde deals `closedwon`.
- Exponer `serviceModules` en `getTenantContext()` y usarlos primero en dashboard y navegacion.

### Estado real al cierre
- `greenhouse.service_modules`: 9 filas
- `greenhouse.client_service_modules`: 22 filas
- El runtime ya expone `businessLines` y `serviceModules`.
- Smoke sobre tenants importados:
  - DDSoft -> `wave` + `desarrollo_web`
  - Sky Airline -> `globe` + `agencia_creativa`
  - SSilva -> `crm_solutions` + `consultoria_crm`, `implementacion_onboarding`, `licenciamiento_hubspot`

### Referencia operativa
- `PHASE_TASK_MATRIX.md` resume el estado de fases y las tareas pendientes por fase para continuacion rapida entre agentes.

### Delta 2026-03-10 Navbar Theme
- `ModeDropdown` quedo alineado con Greenhouse:
  - labels en espanol
  - popper anclado al grupo derecho del navbar
  - trigger accesible
- En layout vertical, el switch de tema ya no vive junto al toggle de navegacion; ahora comparte el grupo derecho con `UserDropdown`.
- `ModeChanger` ahora reacciona tambien a cambios en `prefers-color-scheme` mientras la app sigue abierta, por lo que `Sistema` ya no queda congelado hasta recargar.
- Validado con `npx pnpm lint` y `npx pnpm build`.

### Delta 2026-03-10
- Se agrego `src/components/greenhouse/BrandLogo.tsx` como primitive reusable para logos de herramientas y marcas.
- `src/assets/iconify-icons/bundle-icons-css.ts` ahora bundlea marcas curadas para Figma, GitHub, Copilot, Gemini, HubSpot, Looker, Miro, Notion, OpenAI y Vercel.
- `ToolingSection` ya consume `BrandLogo` y aplica fallback deterministico:
  - logo del bundle local
  - icono brand de Tabler
  - monograma
- `npx pnpm build:icons` y `npx pnpm lint` pasaron.
- `npx pnpm build` completo runtime correctamente; el wrapper local solo expiro por timeout despues del resumen final de rutas.

### Delta 2026-03-10 UI Library Parity
- Se instalo en `starter-kit` la paridad de librerias UI de `full-version` para evitar nuevas instalaciones reactivas por modulo.
- Quedaron disponibles para uso inmediato:
  - `recharts`, `keen-slider`
  - `@fullcalendar/*`, `react-datepicker`, `date-fns`
  - `@tanstack/react-table`, `@tanstack/match-sorter-utils`
  - `react-hook-form`, `@hookform/resolvers`, `valibot`, `input-otp`
  - `@tiptap/*`, `cmdk`
  - `react-dropzone`, `react-toastify`, `emoji-mart`, `@emoji-mart/*`
- `react-player`, `mapbox-gl`, `react-map-gl`
- `@floating-ui/dom`, `@formkit/drag-and-drop`, `bootstrap-icons`
- `npx pnpm lint` y `npx pnpm build` pasaron despues de instalar el stack.
- Warning conocido: `pnpm` reporta peer warnings de `@tiptap/*`, pero el build actual del portal sigue sano.

### Delta 2026-03-11 Capability Governance
- Se documento `GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md` como metodologia reutilizable para validacion visual real de dashboards y vistas admin.
- La iniciativa de `service modules` ya no queda solo en documentacion: ahora `greenhouse.service_modules` funciona como catalogo canonico de capabilities y `greenhouse.client_service_modules` como registro de asignacion por tenant.
- `/admin/tenants/[id]` ahora expone `Capability governance` para asignar manualmente business lines y service modules desde admin.
- Se agregaron rutas API para gobernanza y sincronizacion externa:
  - `GET /api/admin/tenants/[id]/capabilities`
  - `PUT /api/admin/tenants/[id]/capabilities`
  - `POST /api/admin/tenants/[id]/capabilities/sync`
- La estructura de sincronizacion ya soporta HubSpot u otra fuente porque separa:
  - `sourceSystem`
  - `sourceObjectType`
  - `sourceObjectId`
  - `sourceClosedwonDealId`
  - `confidence`
  - payload de `businessLines` y `serviceModules`
- Cuando `sourceSystem = hubspot_crm` y no llega payload explicito, la API deriva capabilities desde deals `closedwon` usando `hubspot_company_id`.
- Se fijo precedencia operativa:
  - `greenhouse_admin` controla manualmente y no se sobreescribe por sync externo
  - la fuente externa sincroniza el resto de assignments
- Validado con `npx pnpm lint` y `npx pnpm build`.

### Delta 2026-03-11 Public ID Strategy
- Se agrego `GREENHOUSE_ID_STRATEGY_V1.md` como contrato para separar `internal keys` de `public IDs`.
- Regla actual:
  - tenant con HubSpot: `EO-<hubspot_company_id>`
  - tenant manual: `EO-SPACE-<slug>`
  - user importado: `EO-USR-<hubspot_contact_id>`
  - user manual/interno: `EO-USR-<suffix estable>`
  - business line: `EO-BL-<module_code>`
  - service module: `EO-SVC-<module_code>`
- Se agrego `src/lib/ids/greenhouse-ids.ts` como helper compartido para derivar IDs visibles sin romper joins ni rutas actuales.
- Admin tenant detail, admin user detail, tenant preview y capability governance ya consumen IDs publicos derivados.
- Se versiono `bigquery/greenhouse_public_ids_v1.sql` como migracion opcional para persistir `public_id` en tablas clave sin reemplazar los ids internos.

### Delta 2026-03-11 Capability Governance UX + source model correction
- `/admin/tenants/[id]` ya no deja `Capability governance` comprimido en la columna izquierda.
  - El resumen del tenant pasa primero.
  - El editor de capabilities ahora ocupa ancho completo.
  - La copy se acorto y se alineo al lenguaje operativo del producto.
- Se removio la derivacion automatica de capabilities desde `deals closedwon`.
- `POST /api/admin/tenants/[id]/capabilities/sync` ahora exige `businessLines` o `serviceModules` explicitos.
- La regla vigente queda asi:
  - admin puede fijar manualmente el estado operativo del tenant
  - una integracion externa puede sincronizar capabilities si lee el objeto empresa o una fuente canonica equivalente y envia payload explicito
  - Greenhouse no interpreta `deals` como historial de servicio del cliente
- Queda deuda de datos:
  - el dataset replicado actual no expone aun propiedades company-level como `linea_de_servicio` o `servicios_especificos` en `hubspot_crm.companies` ni en `hubspot_crm.companies_history`
  - por eso el sync externo queda soportado a nivel API, pero no debe autoderivarse desde BigQuery hasta tener esas propiedades disponibles correctamente

### Delta 2026-03-11 Generic Integrations API
- Se agrego `GREENHOUSE_INTEGRATIONS_API_V1.md` como contrato de integracion bidireccional desde Greenhouse.
- La nueva superficie no depende de sesiones admin ni de NextAuth.
  - Usa `GREENHOUSE_INTEGRATION_API_TOKEN`.
  - Acepta `Authorization: Bearer <token>` o `x-greenhouse-integration-key`.
- Rutas nuevas:
  - `GET /api/integrations/v1/catalog/capabilities`
  - `GET /api/integrations/v1/tenants`
  - `POST /api/integrations/v1/tenants/capabilities/sync`
- La API es generica para HubSpot, Notion u otros conectores.
- El contrato de seleccion/resolucion de tenant usa:
  - `clientId`
  - `publicId`
  - `sourceSystem`
  - `sourceObjectType`
  - `sourceObjectId`
- Resolucion implementada hoy:
  - `hubspot_crm` + `company` + `hubspot_company_id`
- La idea operativa es:
  - los conectores leen el catalogo canonico de capabilities desde Greenhouse
  - empujan contextos normalizados al tenant correcto
  - y tambien pueden leer snapshots de tenants para sincronizacion saliente o reconciliacion
