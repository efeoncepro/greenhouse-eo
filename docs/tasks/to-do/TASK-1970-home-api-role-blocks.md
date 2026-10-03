# TASK-1970 — Homes por rol · C: API de la Home por rol (bloques de las tres Homes sobre readers canónicos)

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
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `none`
- Status real: `Diseño; discovery de TASK-1967 hecho; sin implementación`
- Rank: `3`
- Domain: `platform|delivery|crm`
- Blocked by: `TASK-1968`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende la API existente de la Home (`GET /api/home/snapshot/v2` y su registro de bloques) con los bloques de datos de las tres Homes aprobadas en `TASK-1967`: interna/admin, clientes y colaboradores. La API sólo compone: cada bloque llama al reader canónico de su dominio, y los readers que faltan se crean pequeños en su dominio, no dentro de la Home. Las interfaces (`TASK-1971`, `TASK-1854`, `TASK-1972`) consumen sólo esta API.

## Why This Task Exists

Casi todo el dato de las Homes nuevas ya existe en ICO, aprobaciones, capacidad, SEO, AEO, delivery y HR, pero:

- no tiene el **alcance** que pide cada Home: ICO responde por Space, persona o agencia y sólo para internos; el cliente no puede leerlo y el filtro por equipo no existe;
- no tiene la **forma** del diseño: no hay serie semanal de piezas con cycle time;
- no cabe en el **tiempo** de la Home (2–4 s por bloque) cuando lee BigQuery en vivo;
- y varias piezas no existen: contador unificado de aprobaciones, portafolio de señales por cliente, lista de tareas por persona, próxima evaluación, clima.

Además el discovery encontró defectos en los loaders actuales que esta task corrige al tocarlos: el countdown de nómina consulta columnas que `greenhouse_payroll.payroll_periods` no tiene (`load-closing-countdown.ts`), el cierre de Finanzas sale sin fecha límite (`ttl_close_at` fijo en `NULL`) y los recientes guardan títulos armados desde la URL («Persona e603fade», `RecentsTracker.tsx:27-33`).

## Goal

- Un snapshot por audiencia (`admin|internal`, `client`, `collaborator`) con los bloques de datos del canvas aprobado, cada uno con capability, timeout y `fallback`.
- Cero lógica de negocio en la Home: cada bloque usa un reader de `src/lib/<dominio>/**`; los readers nuevos quedan disponibles para Nexa y otros consumers.
- Lecturas sobre proyecciones materializadas en PostgreSQL, respetando la metric trust policy y declarando `asOf` y estado «sin datos» por bloque.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md` (Home Rollout Flag Platform)
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` y `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (gobierno de lo que ve un cliente)

Reglas obligatorias:

- La Home compone; no escribe SQL inline ni reglas de negocio. Reader faltante → se crea en su dominio con test.
- Ningún loader acepta ids de organización, Space o persona desde la query: salen de la sesión (patrón de `TASK-1968`).
- El cliente sólo recibe datos vía el BFF `src/lib/client-portal/**`; el tipo de servicio sale de los módulos asignados (`resolveClientPortalModulesForOrganization`), nunca de `session.businessLines`.
- Métrica con `dataStatus` `suppressed` o `low_confidence` → el bloque muestra el estado, no el número.
- Estados de tareas con `src/lib/delivery/task-status-canonical.ts`; `due_date` es DATE (aritmética de fechas según `SQL_DATE_MATH_AGENT_INVARIANTS.md`).
- Nómina y permisos: sólo lectura de valores materializados; nunca calcular montos ni saldos.
- La banda de capacidad que manda es la del código (`getCapacityHealth`, `src/lib/team-capacity/units.ts`: alta desde 85 %, equilibrada 35–85 %, baja bajo 35 %) — decisión del operador 2026-10-02.

## Normative Docs

- `docs/tasks/to-do/TASK-1967-role-homes-redesign-program.md` (programa, decisiones del operador, hallazgos)
- Canvas aprobado: https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU (`Main.dc.html`, `Cliente.dc.html`, `Colaborador.dc.html`)
- `docs/context/06_glosario-metricas.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1968` (tenant obligatorio en loaders; sin él no se agregan bloques cliente).
- Home v2: `src/lib/home/contract.ts`, `src/lib/home/registry.ts`, `src/lib/home/compose-home-snapshot.ts`, `src/lib/home/loaders/*`, `src/app/api/home/snapshot/v2/route.ts`.
- ICO: `src/lib/ico-engine/read-metrics.ts` (`readAgencyMetrics`, `computeMetricsByContext`, `readMetricsSummaryByClientId`), `src/lib/agency/agency-queries.ts` (`getAgencyWeeklyActivity`), proyecciones `greenhouse_serving.ico_member_metrics`, `ico_organization_metrics`, `agency_performance_reports`.
- Clientes: `src/lib/client-portal/readers/native/module-resolver.ts`, `src/lib/account-360/organization-operational-metrics-reader.ts`, `src/lib/growth/seo/client/read-seo-client-surface.ts`, `src/lib/growth/seo/overview/read-overview-kpis.ts`, `src/lib/client-portal/readers/curated/growth-ai-visibility.ts`, `src/lib/team/client-safe-profile.ts`, `src/lib/operational-responsibility/readers.ts`.
- Colaboradores: `src/lib/my-performance/dto.ts`, `src/lib/person-360/get-person-ico-profile.ts`, `src/lib/person-360/get-person-hr.ts`, `/api/my/payroll`, `src/lib/hr-core/**` (objetivos y evaluaciones), `greenhouse_delivery.tasks`.
- Interna: `src/lib/approval-authority/store.ts`, `src/lib/hr-core/supervisor-workspace.ts`, `src/lib/cost-intelligence/check-period-readiness.ts`, `src/lib/calendar/operational-calendar.ts`, `src/lib/agency/team-capacity-store.ts`, `src/lib/growth/ai-visibility/client/command.ts`, `src/lib/growth/seo/overview/read-overview-sidebar.ts`, `src/lib/commercial-intelligence/intelligence-store.ts`, `src/lib/login-announcements/reader.ts`, `src/lib/platform-health/composer.ts`, `src/lib/release/manifest-store.ts`.

### Blocks / Impacts

- `TASK-1971` (Home interna), `TASK-1854` (Home de clientes) y `TASK-1972` (Home de colaboradores) consumen esta API.
- `TASK-1967` (programa): esta es la hija C.
- `TASK-1707` (recurrencia del AEO Grader): mientras no cierre, «citas en IA» del cliente es una foto, no una serie.

### Files owned

- `src/lib/home/registry.ts`, `src/lib/home/contract.ts` (bloques nuevos)
- `src/lib/home/loaders/*` nuevos de esta task y `load-closing-countdown.ts`, `load-recents-rail.ts`
- `src/app/api/home/recents/track/route.ts`
- readers nuevos en su dominio: `src/lib/ico-engine/**` (serie semanal y filtro de equipo), `src/lib/approval-authority/**` (contador unificado), `src/lib/client-portal/readers/**` (mezcla de servicios, ICO y SEO/AEO cliente, cola de revisión, equipo, hitos), `src/lib/delivery/**` (tareas por persona), `src/lib/integrations/weather/**`
- migraciones de esta task bajo `migrations/`

## Current Repo State

### Already exists

- API y composer de la Home v2 con bloques por audiencia, capability, timeout y `fallback`; endpoint `GET /api/home/snapshot/v2`.
- KPIs ICO por Space/cliente/persona/agencia (OTD, FTR, RpA, cycle time, throughput, piezas trabadas) con trust policy en el registro de métricas.
- Throughput semanal de la agencia (sólo conteo, 12 semanas) y proyecciones PG de ICO por miembro y organización.
- Capacidad por persona (`getAgencyTeamCapacity`), cierre de período (`check-period-readiness.ts`), aprobaciones por dominio, señales AEO/SEO por organización, módulos cliente, SEO y AEO cliente, ICO por organización, equipo client-safe, endpoints `/api/my/*`, novedades del login (`listActiveLoginAnnouncements`), salud de plataforma.

### Gap

- Serie semanal de piezas con cycle time por agencia, organización y persona; filtro por equipo (no existe la clasificación creativo/contenido/estrategia: `TeamRoleCategory` no tiene «content»).
- Exposición cliente de ICO por organización y de SEO/AEO (tráfico orgánico, citas en IA, posiciones de valor, presencia por motor); indexación (ICR) no existe.
- Contador unificado de aprobaciones; portafolio de señales por cliente; actividad comercial de HubSpot (deals sin actividad, renovación sin reunión) no se sincroniza.
- Cola de revisión con lógica dentro de la ruta (`src/app/api/reviews/queue/route.ts`); entregas recientes cliente en PostgreSQL; equipo con `resolveAvatarUrl` y director de cuenta; próximos hitos.
- Tareas por persona; piezas en revisión del cliente por persona; próximo pago (`scheduled_for`); próxima evaluación con plazo del ciclo; `/api/my/assignments` expone costos que la Home no debe usar.
- Countdown de nómina roto, cierre de Finanzas sin fecha, recientes con títulos de URL, sin fuente de versión, sin clima.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/home/**`, `src/app/api/home/**` y los dominios productores en `src/lib/**`
- Future candidate home: `portal`
- Boundary: `GET /api/home/snapshot/v2` (composer) sobre readers canónicos por dominio; los readers nuevos son consumibles por Nexa, MCP y otras vistas
- Server/browser split: loaders y readers sólo en el servidor; el navegador recibe DTOs por bloque ya resueltos
- Build impact: none — sin dependencias nuevas; el clima usa `fetch` a un proveedor HTTP sin SDK
- Extraction blocker: none

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: readers por dominio (ICO, aprobaciones, capacidad, SEO/AEO, delivery, HR, novedades) y registro de bloques de la Home
- Consumidores afectados: Home interna (`TASK-1971`), Home de clientes (`TASK-1854`), Home de colaboradores (`TASK-1972`), Nexa (lectura)
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `src/lib/home/contract.ts` (bloque, slot, `fallback`, timeout), `GET /api/home/snapshot/v2`, `src/lib/ico-engine/metric-registry.ts`
- Contrato nuevo o modificado: bloques nuevos en el registro por audiencia (ver Detailed Spec) y sus readers de dominio
- Backward compatibility: `gated` — los bloques nuevos se registran apagados por audiencia hasta que su UI se active con `home_rollout_flags`
- Full API parity: cada bloque es un reader de dominio expuesto por la API de la Home; Nexa y MCP leen los mismos readers

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_serving.ico_*`, `greenhouse_delivery.tasks`, `greenhouse_serving.user_recent_items`, `greenhouse_payroll.payroll_periods` (sólo lectura), `greenhouse_hr.eval_cycles` (lectura), `greenhouse_serving.home_rollout_flags` (CHECK de claves)
- Invariantes que no se pueden romper:
  - Un bloque cliente sólo lee datos de la organización de la sesión, vía `src/lib/client-portal/**`.
  - Ninguna métrica `suppressed`/`low_confidence` se muestra como número válido.
  - La Home no calcula montos de nómina ni saldos de permisos.
  - Los títulos de recientes se resuelven en el servidor desde la entidad; el cliente no los escribe.
- Write-target allowlist: N/A — la única escritura tocada es el upsert de recientes (ya existente) y el recálculo de sus títulos
- Tenant/space boundary: audiencia y scope desde la sesión (`get-home-user-identity.ts`); colaborador por `memberId` (con `member_identity_not_linked` cuando falta)
- Idempotency/concurrency: lecturas; el recálculo de títulos de recientes es idempotente por fila
- Audit/outbox/history: none — lecturas; `captureWithDomain` por bloque que falle

### Migration, backfill and rollout

- Migration posture: `additive` (claves nuevas en el CHECK de `home_rollout_flags` si las UIs las piden; índices de lectura si el reader de tareas los necesita)
- Default state: bloques registrados y apagados por audiencia hasta su UI
- Backfill plan: recálculo de títulos de `user_recent_items` en dry-run y luego apply por lotes
- Rollback path: revert PR; los bloques nuevos no se muestran sin su flag
- External coordination: proveedor de clima gratuito sin API key — verificar que sus términos permitan uso comercial antes de producción (el plan gratuito de Open-Meteo, por ejemplo, es no comercial)

### Security and access

- Auth/access gate: sesión + audiencia del bloque + capability por bloque (`can()`); colaborador con `requireMyTenantContext` en los readers `/my`
- Sensitive data posture: datos comerciales de clientes, desempeño individual, fecha de pago; sin montos de nómina, sin costos por hora, sin direcciones personales (la ciudad para el clima sale de `greenhouse_core.members.location_city`)
- Error contract: `canonicalErrorResponse` en rutas tocadas; bloques con `fallback` y sin error crudo
- Abuse/rate-limit posture: caché del clima por ciudad y timeout corto; sin escrituras nuevas expuestas

### Runtime evidence

- Local checks: tests por reader nuevo y por loader (incluye no-fuga por tenant y trust policy)
- DB/runtime checks: cada reader nuevo ejercitado al menos una vez contra PostgreSQL real vía proxy (`SQL_DATE_MATH_AGENT_INVARIANTS.md`)
- Integration checks: llamada real al proveedor de clima en staging
- Reliability signals/logs: `captureHomeShellError`, tag `home_version`, `captureWithDomain` por dominio
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — ICO para las tres Homes

- Reader de serie semanal (últimas 6 semanas): piezas entregadas y cycle time por semana, con scope agencia, organización o persona, sobre proyecciones PG. Cada semana trae su fecha de inicio (lunes, zona `America/Santiago`) y un flag `isPartial` para la semana en curso; los totales y comparaciones del bloque usan semanas completas.
- Clasificación de equipos para el filtro de performance (creativo, contenido, estrategia y SEO) mapeada desde `TeamRoleCategory`/rol; agregado por equipo.
- Bloque `team-performance` (interna): OTD, FTR, RpA, cycle time con meta y estado, throughput semanal, piezas trabadas (reader en `src/lib`, reemplaza el SQL inline de `/api/ico-engine/stuck-assets`), utilización y personas; filtro equipo/cliente desde la sesión.
- Bloque `my-performance` (colaborador) y bloque cliente creativo usan el mismo reader con su scope.

### Slice 2 — Bloques de la Home interna

- `focus-today`: cierre de período con fecha límite desde el calendario operacional (corrige `ttl_close_at` y la query de nómina) + contador unificado de aprobaciones (leave, expense_report, onboarding y supervisor).
- `client-signals`: portafolio de señales por organización visible (AEO, SEO; comercial con renovación desde contratos) con `asOf` y estado sin datos; «deal sin actividad» y «renovación sin reunión» quedan «sin datos» hasta la sincronización de HubSpot (follow-up).
- `team-capacity`: `getAgencyTeamCapacity` con la banda del código; quitar el `.catch(() => new Map())` silencioso.
- `recents-rail`: títulos resueltos en el servidor + recálculo de filas guardadas.
- `announcements`: `listActiveLoginAnnouncements` con límite propio para la Home.
- Footer: estado de plataforma y versión del portal (fuente decidida: release manifest o SHA).
- `weather`: adapter provider-neutral en `src/lib/integrations/weather/` con caché y timeout; ciudad desde `members.location_city`; `fallback: 'hide'`.

### Slice 3 — Bloques de la Home de clientes (vía client-portal)

- Resolver de mezcla de servicios desde módulos (`creative_hub_globe_v1` → creativo; `seo_v2` o `ai_visibility_v1` → SEO/AEO).
- Rendimiento creativo: ICO por organización (`readOrganizationOperationalMetricsRow`) + serie semanal del Slice 1.
- Rendimiento SEO/AEO: tráfico orgánico desde `readSeoOverviewKpis`, citas en IA (foto hasta `TASK-1707`), posiciones de valor, presencia por motor; indexación sólo si existe fuente, si no «sin datos».
- `focus-today` cliente: ciclo actual (sprints PG) y piezas en revisión (cola extraída de `src/app/api/reviews/queue/route.ts` a `src/lib`).
- Entregas recientes (`greenhouse_delivery.tasks` por organización), equipo Efeonce con `resolveAvatarUrl` y director de cuenta, próximos hitos (cierre de ciclo, próximo informe de Insights; QBR «sin datos» hasta que exista la entidad).
- Novedades como venta cruzada: filtrar por líneas de servicio que la organización no tiene (mapeo `serviceLine` → módulo).

### Slice 4 — Bloques de la Home de colaboradores

- Reader de tareas por persona sobre `greenhouse_delivery.tasks` (vence hoy, vuelve con feedback en ronda 2, mañana) con estados canónicos.
- Piezas en revisión del cliente por persona; utilización personal sin campos de costo.
- Mi ficha: vacaciones disponibles (`vacationAvailable`), próximo pago desde `scheduled_for` (o «por confirmar» si no hay orden), objetivos en curso, próxima evaluación con plazo del ciclo.
- `/api/my/*` tocados pasan a `canonicalErrorResponse`.

## Out of Scope

- Cualquier JSX o copy visible (es de `TASK-1969`, `TASK-1971`, `TASK-1854`, `TASK-1972`).
- Sincronizar actividad de HubSpot (deals y reuniones): follow-up propio.
- Recurrencia del AEO Grader (`TASK-1707`) y reader de indexación por URL de Search Console.
- Crear la entidad QBR.
- Cambiar la política de inicio por rol.

## Detailed Spec

Bloques por audiencia (ids orientativos; el agente los fija en `contract.ts`):

| Bloque | Audiencias | Reader de dominio | Estado al crear |
|---|---|---|---|
| `team-performance` | admin, internal | ICO semanal + KPIs (Slice 1) | nuevo |
| `focus-today` | admin, internal | cierre de período + aprobaciones | reemplaza `closing-countdown` + `today-inbox` |
| `client-signals` | admin, internal | portafolio AEO/SEO/comercial | nuevo |
| `team-capacity` | admin, internal | `getAgencyTeamCapacity` | nuevo |
| `recents-rail` | admin, internal | `user_recent_items` con títulos resueltos | corrige existente |
| `announcements` | todas | `listActiveLoginAnnouncements` | nuevo |
| `service-performance` | client | mezcla de servicios + ICO/SEO/AEO cliente | nuevo |
| `client-focus` | client | ciclo + cola de revisión | nuevo |
| `client-deliveries` | client | entregas recientes | nuevo |
| `client-team` | client | equipo client-safe + director de cuenta | nuevo |
| `client-milestones` | client | hitos | nuevo |
| `my-performance` | collaborator | ICO semanal personal | nuevo |
| `my-focus` / `my-tasks` | collaborator | tareas por persona | nuevo |
| `my-assignments` | collaborator | asignaciones sin costos | nuevo |
| `my-profile-stats` | collaborator | vacaciones, pago, objetivos, evaluación | nuevo |
| `weather` | todas | adapter de clima | nuevo |
| `platform-status` | todas (footer) | salud de plataforma + versión | nuevo |

Cada bloque declara `requires.capability`, `timeoutMs` y `fallback`; cada DTO trae `asOf` y un estado `ready|empty|degraded|unavailable`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1968` cerrada → Slice 1 → Slices 2, 3 y 4 (en paralelo).
- Slice 3 no se publica antes de su test de no-fuga por organización.
- Ningún bloque se muestra a usuarios hasta que su UI active la clave en `home_rollout_flags`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Bloque lento por BigQuery en vivo | UI / data | medium | Readers sobre proyecciones PG; timeout y `fallback` | `captureHomeShellError` |
| Cliente recibe datos de otra organización | identity | low | BFF client-portal + test de no-fuga por bloque | no signal — test rojo |
| SQL de fechas sobre DATE revienta en runtime | data | medium | Ejercitar cada reader contra PG real; lint de fechas | Sentry por dominio |
| Exponer costos al colaborador | payroll / finance | low | DTO sin `costPerHourTarget` ni `suggestedBillRateTarget` + test | test rojo |
| Proveedor de clima no permite uso comercial | integration | medium | Verificar términos antes de producción; `fallback: 'hide'` | bloque oculto |

### Feature flags / cutover

- Los bloques nuevos se registran por audiencia pero se muestran sólo cuando la UI correspondiente active su clave en `greenhouse_serving.home_rollout_flags`. La API puede desplegarse sin efecto visible.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | < 15 min | sí |
| Slice 2 | revert PR; el recálculo de títulos de recientes es idempotente | < 15 min | sí |
| Slice 3 | revert PR + redeploy | < 15 min | sí |
| Slice 4 | revert PR + redeploy | < 15 min | sí |

### Production verification sequence

1. Cada reader nuevo ejercitado contra PG real vía proxy.
2. Staging: snapshot v2 con usuario agente por audiencia (admin, cliente creativo, cliente SEO, colaborador) y revisión de cada DTO.
3. Producción: despliegue sin flags; snapshot por audiencia con el usuario agente.

### Out-of-band coordination required

- Términos de uso del proveedor de clima.
- Decisión de fuente de versión (release manifest o SHA).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un reader de serie semanal (piezas + cycle time) con scope agencia, organización y persona, con semana marcada `isPartial`, y se usa en los tres bloques de rendimiento.
- [ ] El filtro por equipo existe con una clasificación documentada y mapeada desde los roles.
- [ ] Todos los bloques de la tabla del Detailed Spec existen en el registro con audiencia, capability, timeout, `fallback`, `asOf` y estado.
- [ ] Ningún loader contiene SQL inline: cada uno llama a un reader en `src/lib/<dominio>/**` con test.
- [ ] El countdown muestra el cierre de nómina y la fecha límite del cierre de Finanzas.
- [ ] Los recientes muestran nombres reales y las filas guardadas quedaron recalculadas.
- [ ] Los bloques cliente pasan su test de no-fuga por organización y el tipo de servicio sale de los módulos.
- [ ] Ningún DTO de colaborador incluye costos ni montos de nómina.
- [ ] Una métrica `suppressed`/`low_confidence` llega como estado, no como número.
- [ ] El bloque de clima se oculta si el proveedor falla, y sus términos de uso comercial quedaron verificados.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (focal por reader y loader; suite completa al cierre)
- Smoke de cada reader nuevo contra PostgreSQL real vía `pnpm pg:connect`
- Snapshot v2 en staging por audiencia con el usuario agente

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1967` marca la hija C como cerrada
- [ ] documentación técnica (`docs/architecture/`), funcional y manual de los bloques nuevos, según el protocolo de triple documentación

## Follow-ups

- Sincronizar actividad de HubSpot para «deal sin actividad» y «renovación sin reunión».
- Reader de indexación (ICR) si Search Console lo permite.
- Entidad de hitos de cuenta (QBR).
- Alinear `docs/context/06_glosario-metricas.md` a la banda de capacidad del código.
