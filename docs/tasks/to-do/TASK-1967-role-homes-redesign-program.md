# TASK-1967 — Homes por rol: programa de implementación del rediseño aprobado (interna, clientes y colaboradores)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseño aprobado por el operador el 2026-10-02 en canvas; discovery de 4 frentes hecho; TASK-1854 absorbida como hija G; resto de hijas por crear; sin implementación`
- Rank: `TBD`
- Domain: `platform|delivery|crm`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees (cada hija declara la suya)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Coordina la implementación de las tres Homes que el operador aprobó el 2026-10-02 en el canvas «Greenhouse Home renovada» (https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU): equipo interno/admin, clientes y colaboradores. Las tres comparten chrome (logo Efeonce arriba, Greenhouse al pie, topbar flotante), el saludo con el Spark rig 2.5D y el composer de Nexa que abre la conversación debajo, y difieren en sus paneles por rol. Este umbrella fija el orden, el dueño de cada pieza y los hallazgos de discovery; el código vive en las hijas.

## Why This Task Exists

La Home actual no sostiene la dirección aprobada y el discovery del 2026-10-02 (4 agentes en paralelo) encontró que casi todo el dato existe en dominios productores pero no está expuesto con el alcance correcto, y que hay defectos vivos en la Home de hoy:

- El composer de Nexa de la Home v2 no abre nada: `HomeHeroAi.tsx:53` hace `router.push('/home?nexa=…')` y nadie lee `?nexa=`.
- `loadHomeAiInsightsBento()` (`src/lib/home/loaders/load-ai-insights-bento.ts:38-43`) no recibe contexto de tenant y su audiencia incluye `client`: **posible fuga entre clientes** (inferido del código, no verificado en runtime).
- El pulse-strip del cliente muestra Reliability y Sync Notion con enlaces a `/admin` (`load-pulse-strip.ts:339`); `/api/client-portal/account-summary` entrega costo laboral y margen al cliente (`src/lib/account-360/organization-executive.ts:30`).
- «Continúa donde lo dejaste» guarda títulos como «Persona e603fade» porque el cliente arma el título desde la URL (`src/components/greenhouse/RecentsTracker.tsx:27-33`) y el upsert lo conserva.
- El cierre de nómina nunca aparece en el countdown: la query de `load-closing-countdown.ts` consulta columnas que `greenhouse_payroll.payroll_periods` no tiene y el `catch` lo silencia; el cierre de Finanzas sale «sin fecha límite» porque `ttl_close_at` está fijo en `NULL`.
- El paquete instalado `@efeoncepro/axis-graphic-line` 0.11.0 no trae el Spark rig (llegó en 0.14.0).
- `TASK-1854` (EPIC-046) ya posee el rediseño de la Home cliente con otra dirección visual de 2026-09-09; sin coordinación habría dos dueños de `/home`.

## Goal

- Partir el programa en hijas ejecutables con orden explícito: datos primero (backend-data), luego cada Home (ui-ux), con el chrome y el saludo compartidos como base común.
- Dejar registrados los hallazgos de discovery, los defectos que se corrigen en el camino y las decisiones del operador que cada hija debe respetar.
- Resolver la convivencia con `TASK-1854`, `TASK-402`, `TASK-1133` y `TASK-1110` antes de que una hija toque `/home`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md` (Home Rollout Flag Platform, shortcuts, Nexa Insights)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` (Composition Shell, Adaptive Card, elevation, motion)
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` y `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (BFF hoja, módulos por organización)
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` (la Home sólo lee nómina y permisos)
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`

Reglas obligatorias:

- Cada widget consume un reader canónico en `src/lib/**`; ninguna hija escribe SQL inline en una ruta ni lógica de negocio en un componente.
- Los widgets de la Home se montan como bloques del registro de Home v2 (`src/lib/home/registry.ts`) con audiencia, capability y `fallback`; no se crea una superficie paralela.
- Toda variante de shell nueva nace como fila en `greenhouse_serving.home_rollout_flags` (extender el CHECK y los dos type unions), nunca como env var binaria.
- El cliente nunca ramifica por `session.businessLines`; el tipo de servicio sale de los módulos asignados (`resolveClientPortalModulesForOrganization`).
- Una métrica con `dataStatus` `suppressed` o `low_confidence` no se muestra como si fuera válida (metric trust policy).
- El Spark del saludo se llama **Elio** (decisión del operador 2026-10-02): su etiqueta y su nombre accesible dicen «Elio · <estado>». Elio no es el asistente: el composer y la conversación siguen siendo de **Nexa**. Si algún día Elio reemplaza a Nexa, lo decide el operador en otra task.

## Normative Docs

- Canvas aprobado: https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU (artboards `Main.dc.html` = interna/admin, `Cliente.dc.html`, `Colaborador.dc.html`).
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/operations/brand-characters/SPARKS_V1.md` y, en el repo AXIS, `docs/agent-composition/sparks.md` (sección «El rig: el Spark que mira»).
- `docs/context/06_glosario-metricas.md` (OTD, FTR, RpA, Cycle Time, ACR, OTL, PVR, ICR, utilización).
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md` y `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md` (cada hija los completa).

## Dependencies & Impact

### Depends on

- Home v2: `src/lib/home/contract.ts`, `src/lib/home/registry.ts`, `src/lib/home/compose-home-snapshot.ts`, `src/lib/home/loaders/*`, `src/views/greenhouse/home/v2/*`.
- Flags: `greenhouse_serving.home_rollout_flags` + `src/lib/home/rollout-flags.ts` + `src/lib/home/rollout-flags-store.ts`.
- Nexa: `src/lib/nexa/use-nexa-runtime.ts`, `src/app/api/home/nexa/route.ts`, primitive `NexaMomentComposition` (`src/components/greenhouse/primitives/nexa-moment-composition/`).
- Paquetes AXIS: `@efeoncepro/axis-graphic-line` ≥ 0.14.0, `@efeoncepro/axis-brand-assets` ≥ 0.4.12, `@efeoncepro/axis-ui-contracts` ≥ 0.3.41 (publicación en GitHub Packages sin verificar: `pnpm view` respondió 401).
- `TASK-1963` (novedades del login, reader `listActiveLoginAnnouncements`).

### Blocks / Impacts

- `TASK-1854` (EPIC-046, Home cliente): **absorbida como hija G** por decisión del operador del 2026-10-02. Conserva su ID, su epic y su alcance de «Mis servicios»; su dirección visual pasa al artboard `Cliente.dc.html` y sus documentos de UI del 2026-09-09 se rehacen.
- `TASK-402` (orquestación universal de Home): sin cambio de ruta para colaboradores — el operador decidió el 2026-10-02 que la Home del colaborador sigue en `/my`, como hoy.
- `TASK-1133` (limpieza de la Home legacy y su chat): se vuelve más simple cuando la Home v2 nueva quede por defecto.
- `TASK-1110` (composición in-place de Nexa): su primitive es la base del composer que abre la conversación debajo.
- `TASK-1940`/`TASK-1941` (Sparks como personajes de Agent Ops): el uso del Spark en la Home debe respetar su canon.
- `TASK-878` (self-heal de identidad de colaborador): mientras siga en to-do, la Home del colaborador debe manejar `member_identity_not_linked`.

### Files owned

- `docs/tasks/to-do/TASK-1967-role-homes-redesign-program.md`

## Current Repo State

### Already exists

- **Ruteo e inicio**: `src/lib/tenant/resolve-portal-home-path.ts` (admin/interno/cliente → `/home`; colaborador puro → `/my`; HR → `/hr/payroll`; Finance → `/finance`); audiencias en `src/lib/entitlements/runtime.ts` (`admin|internal|hr|finance|collaborator|client`).
- **Home v2**: `src/app/(dashboard)/home/page.tsx` con `home_v2_shell` → `HomeShellV2`; si V2 falla, degrada a `HomeViewLegacy`. Registro con 11 bloques y slots `hero|pulse|main|aside|footer`; endpoint `GET /api/home/snapshot/v2`.
- **Nexa**: runtime en `src/lib/nexa/use-nexa-runtime.ts` contra `POST /api/home/nexa` (JSON, sin streaming en servidor); primitives `NexaComposer`, `nexa-conversation-bubble`, `nexa-answer-bubble`, `NexaMomentComposition`.
- **Chrome**: `src/components/layout/vertical/Navigation.tsx` (colapso por cookie de settings), `src/components/layout/shared/Logo.tsx` (la variante `default` ya resuelve Efeonce con `resolveBrandAssets('efeonce')`), `src/components/layout/vertical/FooterContent.tsx`, `src/configs/themeConfig.ts` (navbar `floating: true`).
- **Interna**: KPIs ICO por Space en `readAgencyMetrics`/`computeMetricsByContext` (`src/lib/ico-engine/read-metrics.ts`), throughput semanal en `getAgencyWeeklyActivity` (`src/lib/agency/agency-queries.ts:553`), capacidad por persona en `getAgencyTeamCapacity` (`src/lib/agency/team-capacity-store.ts:271`), cierre de período en `src/lib/cost-intelligence/check-period-readiness.ts`, aprobaciones por dominio en `src/lib/approval-authority/store.ts:275` y `src/lib/hr-core/supervisor-workspace.ts:139`, señales AEO/SEO por organización (`readClientGraderReport`, `readSeoOverviewSidebar`, `readSearchConsoleAnalytics`), estado de plataforma en `loadHomeReliabilityRibbon` y `getPlatformHealth`.
- **Clientes**: módulos por organización en `src/lib/client-portal/readers/native/module-resolver.ts` (`creative_hub_globe_v1`, `seo_v2`, `ai_visibility_v1`, `insights_v1`); ICO por organización en `readOrganizationOperationalMetricsRow` (`src/lib/account-360/organization-operational-metrics-reader.ts:247`); SEO cliente en `readSeoClientSurface`; AEO cliente expuesto en `src/lib/client-portal/readers/curated/growth-ai-visibility.ts`; cola de revisión en `src/app/api/reviews/queue/route.ts`; equipo en `getClientSafeTeamProfiles` (`src/lib/team/client-safe-profile.ts:314`).
- **Colaboradores**: `/my` → `MyDashboardView`; `GET /api/my/performance` (`composeMyPerformance`, sin costos), `/api/my/assignments`, `/api/my/leave` (`vacationAvailable`), `/api/my/payroll` (`scheduled_for`/`paid_at` por orden de pago), `/api/hr/goals/my`, `/api/my/evaluations`; guard `requireMyTenantContext()` con el error canónico `member_identity_not_linked`.

### Gap

- **Chrome y saludo**: bump de los paquetes AXIS; hospedaje de las capas del rig (`sparkRigBase(línea, '/static/…')`); logo Efeonce en el menú con isotipo al colapsar; wordmark Greenhouse al footer con estado de plataforma y versión; topbar como tarjeta flotante; composer que abre la conversación debajo del saludo (hoy no abre nada).
- **Interna**: no hay reader único de «Performance del equipo» (KPIs + throughput semanal con cycle time + piezas trabadas + utilización + headcount) con filtro por equipo o cliente; la taxonomía de equipos (creativo, contenido, estrategia) no existe (`TeamRoleCategory` no tiene «content»); `stuck-assets` tiene SQL inline en la ruta; no hay contador unificado de aprobaciones; no hay reader de portafolio de señales por cliente (AEO + SEO + comercial) y faltan la indexación (ICR) y la actividad de HubSpot (deals sin actividad, renovaciones sin reunión); la banda de capacidad del código (≥ 85 % alta, 35–85 % equilibrada) es la que manda; el glosario (80–90 %) queda por alinear; la segmentación de novedades por audiencia no existe; no hay fuente de versión expuesta a la UI; no hay integración de clima.
- **Clientes**: no hay resolver de «mezcla de servicios» que entregue el modo del panel; ICO por organización no está expuesto en client-portal; no hay serie semanal de entregas; ACR, OTL, PVR e ICR sólo existen en el glosario (ACR es una foto, la recurrencia es `TASK-1707`); no hay share of voice por motor contra un competidor; la cola de revisión vive dentro de la ruta; el equipo devuelve `avatar_url` crudo y filtra por `client_id`; el director de cuenta no está expuesto; no hay reader de próximos hitos (QBR no existe como entidad).
- **Colaboradores**: no hay lista de tareas por persona (`greenhouse_delivery.tasks` tiene las columnas); no hay serie semanal personal; el conteo de piezas en revisión del cliente por persona no existe; la «próxima fecha de pago» no es un concepto canónico (sólo `scheduled_for` de órdenes existentes); la próxima evaluación necesita el plazo del ciclo; `/api/my/assignments` expone `costPerHourTarget` y `suggestedBillRateTarget`; varias rutas `/api/my/*` responden 500 con mensaje crudo.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/(dashboard)/home`, `src/app/(dashboard)/my`, `src/lib/home/**`, `src/views/greenhouse/home/v2/**`, `src/components/layout/**`
- Future candidate home: `portal`
- Boundary: readers por dominio productor en `src/lib/**`; la Home sólo compone bloques del registro de Home v2; el cliente consume vía el BFF `src/lib/client-portal/**`
- Server/browser split: loaders y readers server-only; el Spark rig y el composer de Nexa son client components que reciben datos ya resueltos
- Build impact: bump de tres paquetes AXIS y capas del rig como estáticos versionados; sin dependencias nuevas fuera de AXIS salvo el adapter de clima, que decide su hija
- Extraction blocker: none

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

Cada slice de este umbrella es una task hija que se crea con `greenhouse-task-planner` (con su ID, su addendum UI o backend y su propio rollout). El orden está en «Slice ordering hard rule».

### Slice 1 — Hija A · Correcciones de seguridad y datos de la Home actual (backend-data, P0)

- Cerrar la posible fuga de `loadHomeAiInsightsBento` (pasar contexto de tenant o sacar `client` de su audiencia) con test de no-fuga.
- Quitar del cliente los enlaces `/admin` del pulse-strip y dejar de exponer costo laboral y margen en `account-summary`.
- Si la fuga se confirma en runtime, abrir el `ISSUE-###` correspondiente antes de corregir.

### Slice 2 — Hija B · Chrome compartido y saludo con Spark (ui-ux, primitive)

- Bump de `@efeoncepro/axis-graphic-line`, `axis-brand-assets` y `axis-ui-contracts`; capas del rig como estáticos versionados; primitive de saludo con `<SparkRig line="engine">`, indicador de pensamiento bajo el Spark (rotulado «Elio · <estado>», nunca «Nexa») y halo sin anillo.
- Composer de Nexa (runtime existente) que abre la conversación debajo del saludo sobre el runtime existente (reemplaza el `router.push('/home?nexa=…')` muerto), sugerencias como burbujas pequeñas.
- Logo Efeonce en el menú con isotipo al colapsar; Greenhouse al footer con estado de plataforma y versión; topbar flotante; menú de teléfono como barra con botón.

### Slice 3 — Hija C · Readers de la Home interna (backend-data)

- Reader de «Performance del equipo» sobre snapshots materializados (OTD, FTR, RpA, Cycle Time, throughput semanal con cycle time, piezas trabadas, utilización, headcount) con filtro todo el equipo / equipo / cliente, respetando metric trust policy.
- Contador unificado de aprobaciones; countdown de cierre corregido (nómina y fecha límite desde el calendario operacional).
- Reader de portafolio «Señales de tus clientes» (AEO, SEO, comercial) con `asOf` y estado sin datos.
- Recientes con nombre resuelto en el servidor + recálculo de filas guardadas; fuente de versión; novedades reutilizando `listActiveLoginAnnouncements`.
- Clima: adapter provider-neutral en `src/lib/integrations/weather/` con un proveedor gratuito sin API key, caché y timeout; ciudad desde `greenhouse_core.members.location_city` resuelta en el servidor (nunca desde direcciones personales); bloque con `fallback: 'hide'`.

### Slice 4 — Hija D · Readers de la Home de clientes vía client-portal (backend-data)

- Resolver de mezcla de servicios desde módulos (`creative_hub_globe_v1` → creativo; `seo_v2` o `ai_visibility_v1` → SEO/AEO).
- ICO por organización expuesto en client-portal + serie semanal de entregas; SEO/AEO cliente (tráfico orgánico desde `readSeoOverviewKpis`, citas en IA, posiciones de valor, presencia por motor) con el gobierno de cada fuente.
- Cola de revisión extraída a `src/lib/**`; entregas recientes; equipo con `resolveAvatarUrl` y director de cuenta; próximos hitos.

### Slice 5 — Hija E · Readers de la Home de colaboradores (backend-data)

- Lista de tareas por persona sobre `greenhouse_delivery.tasks` con `task-status-canonical` (vence hoy, ronda 2 con feedback, mañana).
- Serie semanal personal de piezas con cycle time; piezas en revisión del cliente por persona.
- Próximo pago desde `scheduled_for` (sin inventar política); próxima evaluación con plazo del ciclo; sacar campos de costo de lo que consume la Home; errores canónicos en `/api/my/*`.

### Slice 6 — Hija F · Home interna (ui-ux)

- Bloques del registro de Home v2 para admin/interno según el artboard `Main.dc.html`: saludo, Performance del equipo con filtro desplegable, Tu foco hoy, Señales de tus clientes, novedades, capacidad, Continúa donde lo dejaste.

### Slice 7 — Hija G · Home de clientes (ui-ux) = `TASK-1854`

- `TASK-1854` es esta hija (absorbida 2026-10-02). Según `Cliente.dc.html`: panel «Rendimiento de tu servicio» que cambia entre creativo y SEO/AEO (selector sólo si tiene ambos), Tu foco hoy del ciclo, entregas recientes, novedades como venta cruzada, tu equipo Efeonce y próximos hitos; conserva su alcance de «Mis servicios» y sus bloqueos de EPIC-046 (`TASK-1852`, `TASK-1853`).

### Slice 8 — Hija H · Home de colaboradores (ui-ux)

- Según `Colaborador.dc.html`: Mi desempeño, Tu foco hoy, Mis tareas, novedades, mis asignaciones y mi ficha; reemplaza `MyDashboardView` en `/my` (la ruta y la política de inicio no cambian).

## Out of Scope

- Escribir código en este umbrella: todo el código vive en las hijas.
- Cambiar la política de inicio por rol (HR → `/hr/payroll`, Finance → `/finance`): es de `TASK-402`.
- Borrar la Home legacy: es de `TASK-1133`.
- Producir el 3D real del Spark o nuevas poses: es de AXIS y `TASK-1941`.
- Construir la recurrencia del AEO Grader (`TASK-1707`) o el reader de indexación por URL de Search Console fuera de lo que la hija D necesite.
- Calcular montos de nómina o permisos en la Home.

## Detailed Spec

Decisiones de diseño del operador (2026-10-02) que todas las hijas heredan:

| Elemento | Decisión aprobada |
|---|---|
| Saludo | Fecha + clima (sin «Efeonce Group»), título en Bricolage, bajada que resume el día; Spark rig 2.5D (línea Engine) con halo y sin anillo; bajo él, indicador de pensamiento de tres esferas con la palabra del estado (En espera, Escuchando, Pensando, Trabajando, Respuesta lista); con movimiento reducido quedan quietas |
| Composer | Campo sin lupa con indicación «Enter ↵»; al enviar, la conversación con Nexa se abre debajo, dentro del saludo (pregunta, respuesta con fuente y acciones, «Abrir en pantalla completa», cerrar); sin aviso de IA generativa en la portada |
| Sugerencias | Tres burbujas pequeñas (34 px) con la esquina superior izquierda casi recta, ligadas a lo que muestra la Home de cada rol; se ocultan al abrir la conversación |
| Chrome | Logo Efeonce arriba del menú, isotipo al colapsar; Greenhouse a color en el footer de contenido con «Greenhouse™ es una plataforma de Efeonce Group», enlaces, estado de plataforma vivo y versión; topbar como tarjeta blanca flotante igual al portal en vivo; en teléfono el menú es una barra con botón |
| Interna | Performance del equipo (OTD, FTR, RpA, Cycle Time con meta y estado + throughput semanal con cycle time + piezas trabadas, utilización y personas) con desplegable por equipo/cliente; Tu foco hoy; Señales de tus clientes con filtros AEO/SEO/Comercial; novedades tipo login; capacidad del equipo; Continúa donde lo dejaste |
| Clientes | Rendimiento de tu servicio que cambia entre creativo (ICO + entregas semanales) y SEO/AEO (citas en IA, tráfico orgánico, posiciones de valor, indexación, presencia por motor de IA); Tu foco hoy del ciclo; entregas recientes; novedades como venta cruzada; tu equipo Efeonce; próximos hitos |
| Colaboradores | Mi desempeño (ICO personal + piezas semanales); Tu foco hoy; Mis tareas; novedades; mis asignaciones con FTE; mi ficha (vacaciones, próxima liquidación, objetivos, evaluación) |

La matriz completa de hallazgos por widget (EXISTE / PARCIAL / NO EXISTE, con rutas) está resumida en «Current Repo State»; cada hija la amplía en su propio discovery.

## Rollout Plan & Risk Matrix

Umbrella: el runtime lo define cada hija. Aquí sólo el impacto y el orden que las hijas deben respetar.

### Slice ordering hard rule

- Hija A (seguridad) va primero y no espera a nadie.
- Hija B (chrome + saludo) puede correr en paralelo con C, D y E.
- Hija F (UI interna) requiere B y C cerradas.
- Hija G (`TASK-1854`, UI clientes) requiere A, B y D cerradas, además de sus bloqueos propios de EPIC-046 (`TASK-1852`, `TASK-1853`).
- Hija H (UI colaboradores) requiere B y E cerradas; vive en `/my`.
- Ninguna hija ui-ux prende su variante en producción sin la fila correspondiente en `home_rollout_flags`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga de datos entre clientes en la Home | identity / UI | medium (inferido del código) | Hija A primero, test de no-fuga por tenant | no signal — emerge en revisión; abrir ISSUE si se confirma |
| Dos dueños de `/home` cliente | UI | low (resuelto: `TASK-1854` es la hija G) | Un solo dueño de la UI cliente; los readers son de la hija D | no signal — conflicto de archivos owned |
| Métricas ICO lentas en el render de la Home (BigQuery en vivo) | UI / data | medium | Readers sobre proyecciones materializadas en PostgreSQL; timeouts y `fallback` por bloque | `captureHomeShellError` / tag `home_version` |
| Paquetes AXIS ≥ 0.14.0 no publicados o incompatibles | release | medium | Hija B verifica publicación antes del bump; build de producción | build rojo |
| Cliente ve un servicio que no contrató | UI | low | Mezcla de servicios sólo desde módulos asignados | test del resolver |
| Colaborador sin `memberId` ve error crudo | identity | medium | `throwIfNotOk` y CTA sin Reintentar | `identity.workforce.unlinked_internal_user` |

### Feature flags / cutover

- Cada Home nueva se activa con una clave nueva en `greenhouse_serving.home_rollout_flags` (por rol y por tenant), creada por la hija UI correspondiente con su migración del CHECK. La Home v2 actual sigue como fallback. Revert: apagar la fila; efecto en ≤ 30 s (cache del resolver).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Hija A | revert PR + redeploy | < 15 min | sí |
| Hija B | revert PR (bump y chrome) + redeploy | < 15 min | sí |
| Hijas C, D, E | readers aditivos: revert PR; sin migraciones destructivas | < 15 min | sí |
| Hijas F, G, H | apagar su fila en `home_rollout_flags` | < 1 min | sí |

### Production verification sequence

1. Hija A en staging con usuarios cliente de dos organizaciones: ninguno ve datos del otro; después producción.
2. Cada hija backend-data verifica sus readers contra PostgreSQL real vía proxy antes de su release.
3. Cada hija UI se valida con GVC desktop y 390 px en staging con la flag prendida sólo para el usuario agente, luego para un rol, luego global.

### Out-of-band coordination required

- Publicación en GitHub Packages de los paquetes AXIS con el Spark rig.
- Clima con proveedor gratuito sin API key (decisión del operador 2026-10-02): antes de producción, confirmar que sus términos permiten uso comercial — el plan gratuito de Open-Meteo, por ejemplo, es para uso no comercial; si no lo permite, elegir otro proveedor gratuito o el plan de pago.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las hijas A–F y H existen como tasks registradas (G ya existe: `TASK-1854`), cada una con su perfil (`backend-data` o `ui-ux`), su addendum completo y `pnpm task:lint --task TASK-###` sin hallazgos.
- [ ] Cada hija UI apunta al artboard aprobado del canvas que le corresponde y registra wireframe, flow y motion bajo `docs/ui/`.
- [ ] `TASK-1854`, `TASK-402`, `TASK-1133`, `TASK-1110` y `TASK-878` tienen un `## Delta` que referencia este programa.
- [x] La decisión sobre `TASK-1854` está registrada: absorbida como hija G (operador, 2026-10-02).
- [ ] La hija A cerró antes que cualquier hija UI de clientes.
- [ ] Las tres Homes están activas por `home_rollout_flags` en producción con evidencia GVC de desktop y 390 px.

## Verification

- Revisión manual de consistencia documental: hijas creadas, orden respetado, Deltas en las tasks afectadas.
- `pnpm task:lint --task TASK-1967`
- `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] todas las hijas A–H están en `complete/`

## Follow-ups

- Crear las hijas A–F y H con `greenhouse-task-planner` (empezar por A); la G es `TASK-1854`.
- Si la fuga de `loadHomeAiInsightsBento` se confirma, `ISSUE-###` en `docs/issues/open/`.
- Alinear `docs/context/06_glosario-metricas.md` (hoy dice 80–90 %) a la banda del código, que es la que manda (decisión del operador 2026-10-02).
- Taxonomía de equipos para el filtro de performance (creativo, contenido, estrategia).
- Entidad de hitos de cuenta (QBR) si el operador la quiere real.

## Delta 2026-10-02

- Decisiones del operador del mismo día: el Spark se llama **Elio** y el asistente sigue siendo **Nexa** (reemplazarlo queda para otra decisión); la Home de colaboradores sigue en `/my`; el clima va con un proveedor gratuito sin API key; la banda de capacidad que manda es la del código (`getCapacityHealth` en `src/lib/team-capacity/units.ts`: alta desde 85 %, equilibrada 35–85 %, baja bajo 35 %). Los artboards del canvas ya lo reflejan.
- El operador decidió absorber `TASK-1854` como hija G de este programa. Mantiene su ID, su epic (EPIC-046), sus bloqueos `TASK-1852`/`TASK-1853` y su alcance de «Mis servicios»; su dirección visual se reemplaza por el artboard `Cliente.dc.html` aprobado.

## Open Questions

- Ninguna abierta al 2026-10-02: las cinco decisiones de diseño quedaron registradas en el Delta.

