# project_context.md

## Resumen
Proyecto base de Greenhouse construido sobre el starter kit de Vuexy para Next.js con TypeScript, App Router y MUI. El objetivo no es mantener el producto como template, sino usarlo como base operativa para evolucionarlo hacia el portal Greenhouse.

## Delta 2026-03-30 UI/UX skill stack local reforzada
- Greenhouse ya no debe depender solo de skills globales de UI para frontend portal.
- Nuevo baseline canónico:
  - `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- La capa local de skills en `.codex/skills/*` ya debe tratar este baseline como fuente operativa para:
  - first-fold hierarchy
  - estado vacio/parcial/error
  - UX writing
  - accessibility basica
- Nueva skill local:
  - `greenhouse-ux-content-accessibility`
- Decisión operativa:
  - `greenhouse-ui-orchestrator` sigue resolviendo patron y target
  - `greenhouse-vuexy-ui-expert` y `greenhouse-portal-ui-implementer` ya deben endurecer copy, state design y accessibility con la baseline moderna

## Delta 2026-03-30 view governance ya forma parte de la arquitectura base
- El portal ya no debe interpretarse como acceso fino gobernado solo por `routeGroups`.
- Estado vigente:
  - broad access por `routeGroups`
  - fine-grained access por `authorizedViews` + `view_code`
- Persistencia canónica en `greenhouse_core`:
  - `view_registry`
  - `role_view_assignments`
  - `user_view_overrides`
  - `view_access_log`
- Superficie operativa:
  - `/admin/views`
- Regla para trabajo futuro:
  - nuevas superficies visibles del portal deberían evaluarse explícitamente como:
    - gobernables por `view_code`, o
    - rutas base transversales fuera del modelo
- Excepción explícita vigente:
  - `/home` queda fuera del modelo de `view_code`
  - sigue siendo landing base de internos vía `portalHomePath`

## Delta 2026-03-30 capability modules cliente ya forman parte del gobierno de vistas
- Los capability modules client-facing ya no deben leerse como navegación implícita derivada solo desde `routeGroups`.
- Nuevo access point gobernable:
  - `cliente.modulos`
- Regla operativa vigente:
  - menú de `Módulos` visible solo si la sesión conserva `cliente.modulos`
  - `/capabilities/[moduleId]` exige tanto ese `view_code` como la validación específica del módulo

## Delta 2026-03-30 person-first identity debe preservar carriles reactivos
- La institucionalización de identidad `person-first` no puede ejecutarse como reemplazo ciego de `client_user`.
- Contrato operativo vigente:
  - `identity_profile` = raíz humana canónica
  - `member` = faceta operativa para payroll, HR, ICO, capacity, People y serving por colaborador
  - `client_user` = principal de acceso para sesión, inbox, preferencias, overrides y auditoría user-scoped
- Carriles sensibles revisados:
  - outbox / webhook dispatch
  - notification recipients
  - projections de notifications
  - projections de finance / client economics
  - projections de ICO / person intelligence
- Regla para follow-ons como `TASK-141`:
  - no mutar silenciosamente payloads, recipient keys ni identifiers operativos (`identity_profile_id`, `member_id`, `user_id`)
  - resolver el grafo humano completo sin degradar consumers que hoy dependen de `member` o `user`

## Delta 2026-03-30 canonical person resolver ya tiene primer slice reusable
- `TASK-141` dejó de ser solo framing documental.
- Baseline técnica nueva:
  - `src/lib/identity/canonical-person.ts`
- El resolver shared ya puede publicar el grafo humano mínimo por:
  - `userId`
  - `memberId`
  - `identityProfileId`
- Shape institucional aplicada:
  - `identityProfileId`
  - `memberId`
  - `userId`
  - `eoId`
  - `displayName`
  - `canonicalEmail`
  - `portalAccessState`
  - `resolutionSource`
- Guardrail vigente:
  - esto no reemplaza stores `userId`-scoped ni serving `memberId`-scoped
  - expone el bridge canónico sin hacer cutover big bang

## Delta 2026-03-30 /admin/views ya expone bridge persona sin romper overrides
- `Admin Center > Vistas y acceso` sigue siendo compatible con:
  - `user_view_overrides`
  - `view_access_log`
  - `authorizedViews`
- Cambio aplicado:
  - el preview ya enriquece cada principal portal con:
    - `identityProfileId`
    - `memberId`
    - `portalAccessState`
    - `resolutionSource`
- Lectura operativa:
  - `/admin/views` todavía no es una surface persona-first cerrada
  - pero ya no depende ciegamente de leer `client_user` como si fuera la raíz humana
  - `TASK-140` queda como follow-on para el universo previewable y la UX completa de persona

## Delta 2026-03-30 TASK-141 ya tiene resolver shared conservador
- Greenhouse ya no depende solo de contrato documental para la lane `person-first`.
- Slice runtime nuevo:
  - `src/lib/identity/canonical-person.ts`
- Adopción inicial cerrada:
  - `src/lib/notifications/person-recipient-resolver.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
- Regla operativa de este slice:
  - el resolver shared expone simultáneamente `identityProfileId`, `memberId`, `userId`, `portalAccessState` y `resolutionSource`
  - notifications sigue privilegiando `userId` como recipient key efectiva cuando existe principal portal
  - el carril no cambia todavía `/admin/views`, outbox payloads ni projections member-scoped

## Delta 2026-03-30 TASK-134 ya comparte recipients role-based sobre el contrato persona-first
- Notifications ya no mantiene dos lecturas distintas de recipients role-based entre projections y webhook consumers.
- Nuevo baseline shared:
  - `src/lib/notifications/person-recipient-resolver.ts`
    - `getRoleCodeNotificationRecipients(roleCodes)`
- Adopción inicial cerrada:
  - `src/lib/sync/projections/notifications.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
- Guardrail vigente:
  - inbox, preferencias y notificaciones persistidas siguen `userId`-scoped
  - dedupe y `notification_log.user_id` siguen dependiendo de `buildNotificationRecipientKey()`
  - el cut elimina drift de mapping, no cambia recipient keys ni semántica de delivery

## Delta 2026-03-30 TASK-134 quedó cerrada como contrato transversal de Notifications
- Greenhouse Notifications ya no tiene deuda estructural abierta entre identidad humana y delivery portal.
- Contrato vigente:
  - resolución humana `person-first`
  - `identity_profile` como raíz humana
  - `member` como faceta operativa cuando el evento nace desde colaboración/payroll
  - `userId` preservado como llave operativa para inbox, preferencias, auditoría y recipient key efectiva
- Regla para follow-ons:
  - nuevos consumers UX-facing o webhook-based deben nacer sobre este contrato shared
  - no reintroducir mappings `client_user-first` ni reinterpretar `notification_log.user_id` como FK estricta a portal user

## Delta 2026-03-30 TASK-141 quedó cerrada como baseline institucional
- La lane `canonical person identity consumption` ya no queda abierta como framing.
- Estado resultante:
  - `identity_profile` queda institucionalizado como raíz humana canónica
  - `member` sigue siendo la llave operativa fuerte para payroll, capacity, finance serving, ICO y costos
  - `client_user` sigue siendo principal de acceso para sesión, inbox, preferencias, overrides y auditoría
- Los siguientes cortes ya no deben reabrir este contrato:
  - `TASK-140` consume el bridge para completar `/admin/views` person-first
  - `TASK-134` endurece notifications sobre el resolver shared
  - `TASK-162` construye costo comercial canónico encima de esta separación explícita

## Delta 2026-03-30 `/admin/views` ya consume persona previewable
- `Admin Center > Vistas y acceso` ya no selecciona conceptualmente solo un `client_user`.
- Slice vigente:
  - el universo previewable se agrupa por persona canónica cuando existe `identityProfileId`
  - el fallback sigue siendo un principal portal aislado cuando el bridge humano está degradado
- Invariante preservada:
  - `userId` sigue siendo la llave operativa para overrides, auditoría de vistas y `authorizedViews`
  - el cut es persona-first para lectura y preview, no un reemplazo big bang del principal portal

## Delta 2026-03-30 runtime Postgres más resiliente a fallos TLS transitorios
- `src/lib/postgres/client.ts` ya no deja cacheado indefinidamente un pool fallido.
- Cambios operativos:
  - si `buildPool()` falla, el singleton se limpia para permitir recovery en el siguiente intento
  - si `pg` emite errores de conexión/TLS, el pool y el connector se resetean
  - queries y transacciones reintentan una vez para errores retryable como `ssl alert bad certificate`
- Lectura práctica:
  - esto no reemplaza el diagnóstico de infraestructura si Cloud SQL o el connector siguen fallando
  - sí evita que un handshake roto quede pegado en un runtime caliente y multiplique alertas innecesarias

## Delta 2026-03-30 Cost Intelligence foundation bootstrap
- Greenhouse ya reconoce `cost_intelligence` como domain soportado del projection registry.
- Base técnica nueva:
  - schema `greenhouse_cost_intelligence`
  - `period_closure_config`
  - `period_closures`
  - serving tables `greenhouse_serving.period_closure_status` y `greenhouse_serving.operational_pl_snapshots`
- Event catalog ya reserva el prefijo `accounting.*` para:
  - `accounting.period_closed`
  - `accounting.period_reopened`
  - `accounting.pl_snapshot.materialized`
  - `accounting.margin_alert.triggered`
- Route nueva:
  - `/api/cron/outbox-react-cost-intelligence`
- Decisión operativa actual:
  - el dominio ya puede procesarse de forma dedicada
  - el smoke local autenticado del path dedicado ya responde `200`
  - el scheduling fino puede seguir temporalmente apoyado en el catch-all `outbox-react` mientras no existan projections registradas; ya no por un bloqueo técnico del runtime, sino por secuenciación de rollout
- Regla nueva de continuidad:
  - `TASK-068` y `TASK-069` deben mantenerse consistentes con `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - Cost Intelligence no debe redefinir un P&L paralelo; debe materializar y agregar la semántica financiera canónica ya definida en Finance

## Delta 2026-03-30 TASK-068 period closure status ya tiene primer slice real
- Cost Intelligence ya no tiene solo foundation; ahora existe un carril operativo inicial para cierre de período:
  - `checkPeriodReadiness()`
  - `closePeriod()` / `reopenPeriod()`
  - projection `period_closure_status`
  - APIs bajo `/api/cost-intelligence/periods/**`
- Decisión semántica actual para readiness mensual:
  - ingreso por `greenhouse_finance.income.invoice_date`
  - gasto por `COALESCE(document_date, payment_date)`
  - FX por `greenhouse_finance.exchange_rates.rate_date`
  - payroll gating por `greenhouse_payroll.payroll_periods.status`
- Ajuste de continuidad aplicado:
  - el período ya se resuelve además contra el calendario operativo compartido de Greenhouse
  - `checkPeriodReadiness()` expone timezone/jurisdicción, ventana operativa y último día hábil del mes objetivo
  - `listRecentClosurePeriods()` garantiza incluir el mes operativo actual aunque todavía no existan señales materializadas en Finance/Payroll
- Estado actual:
  - task cerrada para su alcance
  - smoke reactivo end-to-end validado con `pnpm smoke:cost-intelligence:period-closure`
  - el remanente real ya no es de wiring/runtime; cualquier mejora futura cae como follow-on semántico, no como blocker del carril

## Delta 2026-03-30 TASK-069 operational_pl ya tiene primer slice materializado
- Cost Intelligence ya no depende solo de `client_economics` on-read para economics agregada.
- Nuevo carril implementado:
  - `computeOperationalPl()` materializa snapshots en `greenhouse_serving.operational_pl_snapshots`
  - scopes soportados: `client`, `space`, `organization`
  - APIs:
    - `/api/cost-intelligence/pl`
    - `/api/cost-intelligence/pl/[scopeType]/[scopeId]`
- Contrato aplicado:
  - revenue por client = net revenue (`total_amount_clp - partner_share`)
  - labor cost desde `client_labor_cost_allocation`
  - overhead desde `member_capacity_economics`
  - `period_closed` y `snapshot_revision` desde `period_closure_status`
  - anti-doble-conteo: `direct_expense` excluye `expenses.payroll_entry_id`
- Integraciones nuevas:
  - projection reactiva `operational_pl` dentro del domain `cost_intelligence`
  - `notification_dispatch` ya escucha `accounting.margin_alert.triggered`
  - `materialization-health` ya observa `operational_pl_snapshots`
- Estado actual:
  - task abierta todavía
  - el remanente principal ahora son consumers downstream (`TASK-071`) y hardening semántico, no wiring base

## Delta 2026-03-30 TASK-069 smoke reactivo E2E validado
- `operational_pl` ya quedó validada también en runtime reactivo real.
- Nuevo smoke reusable:
  - `pnpm smoke:cost-intelligence:operational-pl`
- Evidencia real del carril:
  - evento sintético `finance.income.updated`
  - handler `operational_pl:finance.income.updated` sin error en `outbox_reactive_log`
  - snapshots materializados en `greenhouse_serving.operational_pl_snapshots`
  - eventos `accounting.pl_snapshot.materialized` publicados
- Estado actual:
  - el carril base `outbox -> operational_pl` ya no está pendiente
  - lo siguiente con más valor es consumers downstream y hardening semántico

## Delta 2026-03-30 Finance Intelligence ya usa Cost Intelligence como surface principal
- `/finance/intelligence` ya no usa `ClientEconomicsView` como portada principal del módulo.
- Nueva surface activa:
  - `FinancePeriodClosureDashboardView`
- Capacidades visibles ya integradas en la UI:
  - hero y KPIs de cierre operativo
  - tabla de últimos 12 períodos con semáforos por pata
  - P&L inline expandible por cliente
  - cierre manual y reapertura con control por rol
- Regla operativa:
  - `finance_manager` y `efeonce_admin` pueden cerrar períodos listos
  - solo `efeonce_admin` puede reabrir períodos cerrados
- Estado:
  - implementación técnica ya validada con `eslint`, `tsc` y `build`
  - validación visual todavía pendiente antes de declarar `TASK-070` cerrada

## Delta 2026-03-30 Cost Intelligence ya tiene baseline cerrada como módulo
- Cost Intelligence ya no debe leerse como una lane experimental separada, sino como módulo operativo con baseline implementada.
- Estado consolidado:
  - `TASK-067` cerrada: foundation técnica
  - `TASK-068` cerrada: cierre de período
  - `TASK-069` cerrada: P&L operativo materializado
  - `TASK-070` en implementación avanzada: UI principal de Finance ya sobre el módulo
- Contrato canónico vigente:
  - serving base:
    - `greenhouse_serving.period_closure_status`
    - `greenhouse_serving.operational_pl_snapshots`
  - auth:
    - lectura para `finance` y `efeonce_admin`
    - cierre para `finance_manager` y `efeonce_admin`
    - reapertura solo para `efeonce_admin`
- Siguiente ola explícita:
  - `TASK-071` como consumers distribuidos en Agency, Org 360, People 360 y Home/Nexa

## Delta 2026-03-30 TASK-071 ya tiene primer cutover de consumers distribuidos
- Cost Intelligence ya no vive solo en `/finance/intelligence`; el serving materializado empezó a alimentar consumers existentes del portal.
- Estado real del cutover:
  - Agency lee `operational_pl_snapshots` para el resumen financiero de `SpaceCard`
  - Organization 360 (`Rentabilidad`) ya es serving-first con fallback al compute legacy
  - People 360 ya expone `latestCostSnapshot` con closure awareness en `PersonFinanceTab`
  - `FinanceImpactCard` de People HR Profile ya muestra período y estado de cierre
  - Home ya puede resolver un `financeStatus` resumido para roles internos/finance y usarlo en `OperationStatus`
- Remanente explícito de la lane:
  - endurecer fallback semantics
  - validación visual real
  - el resumen ya también entra a Nexa `lightContext`
  - sigue pendiente solo validación visual/cierre limpio de la lane

## Delta 2026-03-30 Cost Intelligence documentado end-to-end
- La documentación viva del repo ya refleja Cost Intelligence como módulo operativo transversal, no como lane aislada.
- Capas ya explicitadas en arquitectura:
  - foundation técnica (`TASK-067`)
  - period closure (`TASK-068`)
  - operational P&L (`TASK-069`)
  - finance UI principal (`TASK-070`)
  - consumers distribuidos (`TASK-071`)
- Finance conserva ownership del motor financiero central.
- Cost Intelligence queda formalizado como layer de management accounting, closure awareness y serving distribuido hacia Agency, Organization 360, People 360, Home y Nexa.

## Delta 2026-03-30 Cost Intelligence visual validation found a display-only date bug
- La validación visual real de `/finance/intelligence` confirmó que `lastBusinessDayOfTargetMonth` sí viene del calendario operativo compartido.
- El bug detectado fue de render y timezone:
  - la UI parseaba fechas `YYYY-MM-DD` con `new Date(...)`
  - eso corría el “último día hábil” un día hacia atrás en algunos períodos
- El fix quedó aplicado en `FinancePeriodClosureDashboardView` con parseo seguro para display.
- Con ese ajuste, el carril `TASK-070` queda todavía más cerca de cierre funcional real; el remanente ya es principalmente visual/UX, no de datos ni semántica operativa.

## Delta 2026-03-30 Cost Intelligence ya excluye assignments internos de la atribución comercial
- Se consolidó una regla canónica shared para assignments internos:
  - `space-efeonce`
  - `efeonce_internal`
  - `client_internal`
- Esa regla ya se reutiliza en:
  - `Agency > Team`
  - `member_capacity_economics`
  - `auto-allocation-rules`
  - `client_labor_cost_allocation`
  - `computeOperationalPl()`
- Decisión operativa:
  - la carga interna sigue siendo válida para operación/capacity
  - no debe competir como cliente comercial en labor cost ni en snapshots de Cost Intelligence
- Ajuste técnico asociado:
  - `greenhouse_runtime` necesita `DELETE` acotado sobre `greenhouse_serving.operational_pl_snapshots`
  - se usa solo para purgar snapshots obsoletos de la misma revisión antes del upsert vigente

## Delta 2026-03-30 Commercial cost attribution queda definida como capa canónica
- Greenhouse ya no debe leer la atribución comercial de costos como lógica repartida entre Payroll, Team Capacity, Finance y Cost Intelligence.
- Decisión acordada:
  - existe una capa canónica explícita de `commercial cost attribution`
  - Payroll, Team Capacity y Finance siguen calculando sus piezas de dominio
  - la verdad consolidada de costo comercial sale de una sola capa shared
  - esa capa alimenta primero a:
    - Finance
    - Cost Intelligence
  - y desde ahí a consumers derivados:
    - Agency
    - Organization 360
    - People
    - Home
    - Nexa
    - futuros Service P&L / Campaign bridges
- Task canónica abierta:
  - `TASK-162`

## Delta 2026-03-30 Sentry incident reader hardening
- `Ops Health` ya distingue entre el token de build/source maps y el token de lectura de incidentes.
- Nuevo contrato soportado:
  - `SENTRY_INCIDENTS_AUTH_TOKEN`
  - `SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF`
- `src/lib/cloud/observability.ts` intenta leer incidentes con `SENTRY_INCIDENTS_AUTH_TOKEN` primero y solo cae a `SENTRY_AUTH_TOKEN` como compatibilidad transicional.
- Si Sentry responde `401/403`, la UI mantiene degradación fail-soft pero con mensaje accionable:
  - el token no tiene permisos para leer incidentes
  - el reader requiere un token con scope `event:read`
- Decisión operativa:
  - `SENTRY_AUTH_TOKEN` sigue siendo el token principal de build/source maps
  - `SENTRY_INCIDENTS_AUTH_TOKEN` pasa a ser el canal recomendado para `Ops Health`

## Delta 2026-03-29 notifications identity model
- El sistema de notificaciones ya no debe leerse como `client_user-first`.
- Contrato canónico vigente:
  - `identity_profile` = raíz de persona
  - `member` = faceta operativa fuerte para HR/Payroll/Assignments
  - `client_user` = acceso portal, inbox y preferencias
- `src/lib/notifications/person-recipient-resolver.ts` centraliza la resolución compartida para:
  - `identityProfileId`
  - `memberId`
  - `userId`
  - fallback `email-only`
- `TASK-117` y `TASK-129` ya consumen este patrón; el follow-on transversal queda formalizado en `TASK-134`.

## Delta 2026-03-29 TASK-117 auto-cálculo mensual de payroll
- Payroll ya formaliza el hito mensual para dejar el período oficial en `calculated` el último día hábil del mes operativo.
- Contratos nuevos o endurecidos:
  - `getLastBusinessDayOfMonth()` / `isLastBusinessDayOfMonth()`
  - `getPayrollCalculationDeadlineStatus()`
  - `runPayrollAutoCalculation()`
  - `GET /api/cron/payroll-auto-calculate`
- `PayrollPeriodReadiness` ahora separa `calculation` y `approval`.
- `payroll_period.calculated` ya puede notificar a stakeholders operativos por el dominio reactivo `notifications` bajo la categoría `payroll_ops`.

## Delta 2026-03-29 TASK-133 observability incidents en Ops Health
- El dominio Cloud ya separa dos capas de observability:
  - `posture/configuración` en `getCloudObservabilityPosture()`
  - `incidentes Sentry abiertos/relevantes` en `getCloudSentryIncidents()`
- `getOperationsOverview()` ahora proyecta:
  - `cloud.observability.posture`
  - `cloud.observability.incidents`
- `GET /api/internal/health` expone también `sentryIncidents` como snapshot fail-soft machine-readable.
- `Ops Health` y `Cloud & Integrations` ya pueden mostrar errores runtime detectados por Sentry sin degradar el `overallStatus` base del health interno.
- Decisión arquitectónica explícita:
  - incidentes Sentry no reescriben la semántica del control plane health
  - siguen siendo señal operativa adicional, no fuente del semáforo runtime/posture

## Delta 2026-03-29 TASK-129 validada en production
- `main` ya incluye el consumer institucional de notificaciones via webhook bus.
- `production` quedó validada con delivery firmada real sobre:
  - `POST /api/internal/webhooks/notification-dispatch`
- Evidencia operativa confirmada:
  - `eventId=evt-prod-final-1774830739019`
  - notificación `assignment_change` persistida para `user-efeonce-admin-julio-reyes`
- Estado vigente del carril:
  - `staging` y `production` consumen el secreto de firmas vía Secret Manager
  - `production` ya no está bloqueada por ausencia del route en `main`

## Delta 2026-03-29 TASK-129 hardening final en staging
- `staging` ya opera `webhook notifications` sin `WEBHOOK_NOTIFICATIONS_SECRET` crudo en Vercel.
- Postura vigente del carril:
  - firma HMAC resuelta por `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`
  - secreto canónico servido desde GCP Secret Manager
  - alias estable `dev-greenhouse.efeoncepro.com` como target del subscriber
- `src/lib/secrets/secret-manager.ts` ahora sanitiza secuencias literales `\\n` / `\\r` en variables `*_SECRET_REF`, endureciendo el contrato frente a drift de export/import de env vars.

## Delta 2026-03-29 TASK-129 iniciada
- Greenhouse inicia un segundo carril institucional de notificaciones:
  - `reactive notifications` sigue como control plane legacy para eventos internos existentes
  - `webhook notifications` nace como consumer UX-facing del bus outbound
- Contratos nuevos en repo:
  - `POST /api/internal/webhooks/notification-dispatch`
  - `POST /api/admin/ops/webhooks/seed-notifications`
  - env/secret:
    - `WEBHOOK_NOTIFICATIONS_SECRET`
    - `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`
    - `WEBHOOK_NOTIFICATIONS_VERCEL_PROTECTION_BYPASS_SECRET`
- Decisión arquitectónica explícita:
  - `TASK-129` no reemplaza `notification_dispatch`
  - el ownership se define por `eventType` para evitar duplicados
  - el self-loop del subscriber de notificaciones soporta bypass opcional de `Deployment Protection`, igual que el canary

## Delta 2026-03-29 TASK-129 env rollout preparado en Vercel
- `staging` y `production` ya tienen `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`.
- Postura operativa vigente:
  - `staging` mantiene además `WEBHOOK_NOTIFICATIONS_SECRET` como fallback transicional
  - `production` ya queda preparada para consumir Secret Manager con el secreto canónico verificado
- El seed de subscriptions de webhooks ya no debe persistir `VERCEL_URL` efímero:
  - `seed-canary` y `seed-notifications` prefieren el alias real del request (`x-forwarded-host`) cuando existe
- Los target builders de webhooks sanitizan también secuencias literales `\n`/`\r`, no solo whitespace, para evitar query params contaminados en `greenhouse_sync.webhook_subscriptions`.
- Validación real ya ejecutada en `staging`:
  - `assignment.created` visible en campanita para un usuario real
  - `payroll_period.exported` crea notificaciones `payroll_ready` para recipients resolubles del período
- Gap de datos detectado durante la validación:
  - había `client_users` activos sin `member_id`; en `staging` se enlazaron los internos con match exacto de nombre para permitir la resolución de recipients del carril webhook notifications.

## Delta 2026-03-29 TASK-131 cerrada
- El health cloud ya separa correctamente secretos runtime-críticos de secretos de tooling.
- `src/lib/cloud/secrets.ts` ahora clasifica los secretos tracked entre:
  - `runtime`
  - `tooling`
- `src/lib/cloud/health.ts` dejó de degradar `overallStatus` solo porque `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` o `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` estén ausentes en el runtime del portal.
- La visibilidad operativa se conserva vía:
  - `secrets.runtimeSummary`
  - `secrets.toolingSummary`
  - `postgresAccessProfiles`
- Decisión institucional reforzada:
  - el portal productivo no debe recibir credenciales `migrator/admin` solo para mejorar un semáforo de health
  - esos perfiles siguen siendo tooling/operación, no dependencias de serving

## Delta 2026-03-29 TASK-125 cerrada
- `TASK-125` quedó cerrada con validación E2E real en `staging`.
- Baseline operativo vigente:
  - `POST /api/admin/ops/webhooks/seed-canary` registra una subscription interna self-loop
  - el target del canary soporta bypass opcional de `Deployment Protection`
  - `WEBHOOK_CANARY_SECRET_SECRET_REF` ya sirve el secreto desde Secret Manager en `staging`
  - el primer consumer canónico usa `finance.income.nubox_synced` como familia activa de bajo riesgo
- Validación real ejecutada:
  - `eventsMatched=1`
  - `deliveriesAttempted=1`
  - `succeeded=1`
  - canary receipt `HTTP 200`
- Ajuste estructural derivado:
  - `src/lib/webhooks/dispatcher.ts` ahora prioriza eventos `published` más recientes dentro de la ventana de 24h, para evitar starvation de subscriptions recién activadas

## Delta 2026-03-29 TASK-102 cerrada
- `TASK-102` quedó cerrada con verificación externa completa.
- Evidencia final incorporada:
  - `PITR=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
  - `staging` y `production` con `postgres.status=ok`, `usesConnector=true`, `sslEnabled=true`, `maxConnections=15`
  - slow query real visible en Cloud Logging
  - restore test exitoso vía clone efímero `greenhouse-pg-restore-test-20260329d`
- El clone de restore se verificó por SQL y luego se eliminó; no quedaron instancias temporales vivas.

## Delta 2026-03-29 TASK-102 casi cerrada
- `TASK-102` ya no está bloqueada por postura de Cloud SQL ni por rollout runtime.
- Validaciones externas ya confirmadas:
  - `PITR=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
  - `sslMode=ENCRYPTED_ONLY`
  - `staging` y `production` con `postgres.status=ok`, `usesConnector=true`, `sslEnabled=true`, `maxConnections=15`
- `Cloud Logging` ya mostró una slow query real (`SELECT pg_sleep(1.2)` con `duration: 1203.206 ms`).
- Ese remanente ya quedó resuelto con un restore test limpio y documentado.

## Delta 2026-03-29 TASK-099 cerrada
- `TASK-099` ya quedó cerrada para el alcance baseline de hardening seguro.
- `src/proxy.ts` ahora materializa:
  - headers estáticos cross-cutting
  - `Strict-Transport-Security` solo en `production`
  - `Content-Security-Policy-Report-Only` como capa de observación no bloqueante
- Decisión operativa vigente:
  - el baseline de seguridad headers ya no depende de introducir `CSP` enforce
  - cualquier tightening posterior de `CSP` se considera mejora futura, no blocker del track cloud

## Delta 2026-03-29 TASK-099 re-scoped to the validated baseline
- `TASK-099` sigue `in-progress`, pero ya no debe interpretarse como si el repo tuviera `Content-Security-Policy`.
- Estado real consolidado:
  - `src/proxy.ts` ya aplica headers estáticos cross-cutting
  - `Strict-Transport-Security` ya se limita a `production`
  - el matcher ya evita `_next/*` y assets estáticos
- Lo pendiente de la lane es solo `CSP`, que se mantiene diferida por riesgo sobre:
  - MUI/Emotion
  - OAuth
  - uploads/assets
- Decisión operativa vigente:
  - no cerrar `TASK-099` en falso
  - no introducir `CSP` sin rollout controlado tipo `Report-Only` o equivalente

## Delta 2026-03-29 Observability MVP cerrada
- `TASK-098` quedó cerrada tras validación en `staging` y `production`.
- `production` ya valida:
  - `observability.sentry.enabled=true`
  - `observability.slack.enabled=true`
  - `postureChecks.observability.status=ok`
- Deployment productivo validado:
  - commit `bcbd0c3`
  - deployment `dpl_5fyHqra7AgV865QmHSuZ2iqYWcYk`
  - `GET /api/auth/session` responde `{}` sin regresión visible de auth
- La recomendación pendiente es solo operativa:
  - rotar el webhook de Slack expuesto en una captura previa

## Delta 2026-03-29 Observability MVP operativa en staging
- `TASK-098` ya quedó validada end-to-end en `staging`.
- Señales confirmadas:
  - `GET /api/internal/health` devuelve `observability.summary=Sentry runtime + source maps listos · Slack alerts configuradas`
  - `observability.sentry.enabled=true`
  - `observability.slack.enabled=true`
- Validación operativa adicional ya ejecutada:
  - smoke real de Slack con respuesta `HTTP 200`
  - smoke real de Sentry con issue visible en el dashboard del proyecto `javascript-nextjs`
- El remanente real de `TASK-098` ya no está en repo ni en `staging`, sino en replicar el rollout a `production/main`.

## Delta 2026-03-29 Slack alerts Secret Manager-ready
- `TASK-098` extendió el patrón de `TASK-124` a `SLACK_ALERTS_WEBHOOK_URL`.
- Nuevo contrato soportado:
  - `SLACK_ALERTS_WEBHOOK_URL`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- `src/lib/alerts/slack-notify.ts` ahora resuelve el webhook vía helper canónico y `GET /api/internal/health` ya refleja esa postura real.
- Decisión de borde explícita para mantener este lote seguro:
  - `CRON_SECRET` sigue `env-only`
  - `SENTRY_AUTH_TOKEN` sigue `env-only` en build
  - `SENTRY_DSN` se mantiene como config runtime/env

## Delta 2026-03-29 Sentry minimal runtime baseline
- `TASK-098` ya no está solo en posture interna: el repo ahora incluye el wiring mínimo de `@sentry/nextjs` para App Router.
- Archivos canónicos del slice:
  - `next.config.ts`
  - `src/instrumentation.ts`
  - `src/instrumentation-client.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
- Contrato ambiental actualizado:
  - `SENTRY_DSN` o `NEXT_PUBLIC_SENTRY_DSN` habilitan runtime error tracking
  - `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` habilitan readiness de source maps
- El wiring es fail-open:
  - si no existe DSN, Sentry no inicializa
  - no cambia rutas ni contrato HTTP del portal
- `develop/staging` ya evolucionó desde ese baseline y hoy la observabilidad externa está operativa.
- El rollout externo pendiente ya quedó concentrado en `production/main`.

## Delta 2026-03-29 Observability posture baseline
- `TASK-098` quedó iniciada con un slice mínimo y reversible de contrato.
- `GET /api/internal/health` ahora proyecta también `observability`, con postura de:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL`
- La capa canónica vive en `src/lib/cloud/observability.ts`.
- El contrato del health interno ahora separa:
  - `runtimeChecks`
  - `postureChecks`
  - `overallStatus`
  - `summary`
- El payload también proyecta `postgresAccessProfiles` para distinguir:
  - credencial runtime del portal
  - perfiles `migrator` y `admin` de tooling/operación
- `503` sigue reservado para fallos reales de runtime; la postura incompleta solo degrada señal operativa.
- El wiring mínimo de `@sentry/nextjs` ya existe.
- El adapter `src/lib/alerts/slack-notify.ts` y los hooks base de cron ya existen; el remanente de Slack es cargar `SLACK_ALERTS_WEBHOOK_URL` y validar envíos reales.

## Delta 2026-03-29 Security headers proxy baseline
- `TASK-099` quedó iniciada con un `proxy.ts` mínimo de headers estáticos.
- La primera versión de `src/proxy.ts`:
  - no implementa auth
  - no centraliza guards de API
  - no aplica todavía `Content-Security-Policy`
- Objetivo del slice: sumar protección cross-cutting barata y reversible sin romper MUI, OAuth ni assets estáticos.

## Delta 2026-03-29 Secret Manager validado en staging + production
- `develop` absorbió `TASK-124` en `497cb19` y `main` absorbió el slice mínimo en `7238a90`.
- `staging` ya ejecuta `497cb19` y `/api/internal/health` confirmó resolución real por Secret Manager para:
  - `GREENHOUSE_POSTGRES_PASSWORD`
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - `NUBOX_BEARER_TOKEN`
- `production` ya ejecuta `7238a90` y confirmó por `/api/internal/health`:
  - `GREENHOUSE_POSTGRES_PASSWORD`
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - `NUBOX_BEARER_TOKEN`
- `greenhouse.efeoncepro.com/api/auth/session` respondió `200` con body `{}`.
- Estado transicional todavía explícito:
  - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` no están proyectados en runtime `staging`
  - el fallback legacy a env var sigue existiendo por compatibilidad durante la transición

## Delta 2026-03-29 Secret Manager helper baseline
- `TASK-124` ya inició implementación real con un helper canónico en `src/lib/secrets/secret-manager.ts`.
- Nuevo contrato base para secretos críticos:
  - env var legacy: `<ENV_VAR>`
  - secret ref opcional: `<ENV_VAR>_SECRET_REF`
  - resolución runtime: `Secret Manager -> env fallback -> unconfigured`
- El helper usa `@google-cloud/secret-manager`, cache corta y no expone valores crudos en logs.
- `GET /api/internal/health` ahora proyecta postura de secretos críticos bajo `secrets.summary` y `secrets.entries`, sin devolver valores.
- Primer consumer migrado al patrón:
  - `src/lib/nubox/client.ts` ahora resuelve `NUBOX_BEARER_TOKEN` vía helper con fallback controlado
- Postgres también quedó alineado al patrón:
  - `src/lib/postgres/client.ts` ahora acepta `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF`
  - `scripts/lib/load-greenhouse-tool-env.ts` ya soporta refs equivalentes para `runtime`, `migrator` y `admin`
- Auth también quedó alineado al patrón:
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - `GOOGLE_CLIENT_SECRET`
  resuelven vía `src/lib/auth-secrets.ts`
- Validación operativa local ya ejecutada:
  - `pnpm pg:doctor --profile=runtime`
- Estado pendiente explícito:
  - falta validación real en `staging` y `production` con secretos servidos desde Secret Manager

## Delta 2026-03-29 WIF preview validation + non-prod environment drift
- El preview redeployado de `feature/codex-task-096-wif-baseline` quedó validado en Vercel con health real:
  - `version=7638f85`
  - `auth.mode=wif`
  - BigQuery reachable
  - Cloud SQL reachable vía connector usando `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev`
- Para que ese preview fuera validable hubo que completar un env set mínimo de branch:
  - `GCP_PROJECT`
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD`
- Drift operativo verificado el 2026-03-29:
  - las env vars activas del rollout WIF/conector ya quedaron saneadas en `development`, `staging`, `production`, `preview/develop` y `preview/feature/codex-task-096-wif-baseline`
  - `dev-greenhouse.efeoncepro.com` quedó confirmado como `target=staging`
  - tras redeploy del staging activo, `/api/internal/health` respondió con `version=7a2ecec`, `auth.mode=mixed` y `usesConnector=true`
- Regla operativa derivada:
  - no desplegar la feature branch al entorno compartido solo para cerrar `TASK-096`
  - no endurecer Cloud SQL externo ni retirar la SA key hasta que `develop` absorba este baseline y `staging` quede validado con WIF final

## Delta 2026-03-29 Home landing cutover baseline
- `TASK-119` quedó cerrada sobre la policy de landing del portal.
- Nuevo contrato base:
  - usuarios internos/admin sin override explícito aterrizan por defecto en `/home`
  - roles funcionales siguen priorizando su landing especializada (`/hr/payroll`, `/finance`, `/my`) antes del fallback general
- `Control Tower` deja de funcionar como home implícito de internos y el patrón heredado queda absorbido por `Admin Center`.
- `portalHomePath` sigue siendo el contrato canónico de aterrizaje, pero su fallback institucional para `efeonce_internal` ya no es `/internal/dashboard`, sino `/home`.
- El runtime también normaliza sesiones legadas: si `NextAuth` o un registro viejo trae `'/internal/dashboard'` como home interno, el resolver canónico lo reescribe a `'/home'` antes de hidratar `session.user.portalHomePath`.

## Delta 2026-03-29 Nexa backend persistence and thread runtime
- `TASK-114` quedó cerrada con persistencia operativa para Nexa en PostgreSQL bajo `greenhouse_ai`.
- El runtime ahora materializa:
  - `nexa_threads`
  - `nexa_messages`
  - `nexa_feedback`
- `/api/home/nexa` ya persiste conversación, retorna `threadId` y genera `suggestions` post-respuesta.
- `src/lib/nexa/store.ts` valida readiness de las tablas, pero no intenta hacer DDL con el usuario `runtime`; la migración canónica vive en `scripts/migrations/add-nexa-ai-tables.sql`.
- Se agregaron endpoints dedicados para feedback e historial de threads que destraban la UI pendiente de `TASK-115`.

## Delta 2026-03-29 Release channels y changelog client-facing
- Greenhouse formalizo un operating model de release channels en `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`.
- Regla vigente:
  - el release se comunica principalmente por modulo o feature visible, no solo por plataforma completa
  - cada capacidad puede declararse `alpha`, `beta`, `stable` o `deprecated`
  - el canal no equivale automaticamente a disponibilidad general; tambien debe distinguirse el scope (`internal`, `pilot`, `selected_tenants`, `general`)
- Versionado vigente:
  - producto y modulos visibles usan `CalVer + canal`
  - APIs y contratos tecnicos versionados usan `SemVer`
- El changelog client-facing quedo separado del changelog interno del repo y nace en `docs/changelog/CLIENT_CHANGELOG.md`.
- `Preview`, `Staging` y `Production` siguen siendo los ambientes tecnicos; los canales de release se apoyan en ellos pero no los reemplazan.

## Delta 2026-03-29 Cloud governance operating model
- `Cloud` quedó institucionalizado como dominio interno de platform governance, no como módulo client-facing nuevo.
- La base canónica vive en `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`.
- El dominio ahora queda explícitamente separado en:
  - shell de governance (`Admin Center`)
  - surface de inventory/freshness (`Cloud & Integrations`)
  - surface de incidentes (`Ops Health`)
  - contracts/helpers/runbooks para posture, resiliencia, cron y costos
- La baseline mínima en código vive en `src/lib/cloud/*`:
  - `health.ts` para health checks compartidos
  - `bigquery.ts` para guards base de costo
  - `cron.ts` para postura mínima de scheduler secret
- La conexión UI ya quedó materializada vía `getOperationsOverview()`:
  - `Admin Center`
  - `/admin/cloud-integrations`
  - `/admin/ops-health`
  consumen el bloque `cloud` como snapshot institucional del dominio.
- `TASK-100` a `TASK-103` ya se interpretan como slices del dominio Cloud y no como hardening aislado.

## Delta 2026-03-29 Cloud SQL resilience baseline in progress
- `TASK-102` ya aplicó la baseline principal de resiliencia sobre `greenhouse-pg-dev`.
- Estado real verificado:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - flags `log_min_duration_statement=1000` y `log_statement=ddl`
- El runtime del portal también quedó alineado al nuevo pool target:
  - `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` en `Production`, `staging` y `Preview (develop)`
  - fallback por defecto del repo subido a `15`
- Ese remanente ya quedó resuelto después en la misma fecha con un restore test limpio y documentado sobre `greenhouse-pg-restore-test-20260329d`.

## Delta 2026-03-29 Cloud layer robustness expansion
- La capa `src/lib/cloud/*` ahora incorpora posture helpers reutilizables para el siguiente bloque `TASK-096` a `TASK-103`.
- Nuevas piezas institucionales:
  - `src/lib/cloud/gcp-auth.ts` para postura de autenticación GCP (`wif | service_account_key | mixed | unconfigured`)
  - `src/lib/cloud/postgres.ts` para postura runtime de Cloud SQL (`connector`, `ssl`, `pool`, riesgos)
  - `GET /api/internal/health` en `src/app/api/internal/health/route.ts`
  - `src/lib/alerts/slack-notify.ts` como adapter base de alertas operativas
- `getOperationsOverview()` ahora refleja también la postura de auth GCP y la postura de Cloud SQL, no solo reachability y cost guard.
- Los crons críticos del control plane (`outbox-publish`, `webhook-dispatch`, `sync-conformed`, `ico-materialize`, `nubox-sync`) ya tienen hook base de alerting Slack en caso de fallo.

## Delta 2026-03-29 TASK-096 cerrada
- `TASK-096` ya quedó cerrada para su alcance útil.
- Estado consolidado:
  - WIF/OIDC validado en `preview`, `staging` y `production`
  - Cloud SQL externo endurecido
  - Fase 3 de Secret Manager absorbida y cerrada por `TASK-124`

## Delta 2026-03-29 GCP credentials baseline WIF-aware in progress
- `TASK-096` quedó iniciada en el repo con baseline real en código; esta sesión trabajó sobre el estado actual de `develop`.
- El repo ahora resuelve autenticación GCP con un contrato explícito en `src/lib/google-credentials.ts`:
  - `wif` si existen `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_SERVICE_ACCOUNT_EMAIL`, y el runtime puede obtener un token OIDC de Vercel
  - `service_account_key` como fallback transicional
  - `ambient_adc` para entornos con credenciales implícitas
- Consumers alineados:
  - `src/lib/bigquery.ts`
  - `src/lib/postgres/client.ts`
  - `src/lib/storage/greenhouse-media.ts`
  - `src/lib/ai/google-genai.ts`
- Scripts operativos que seguían parseando `GOOGLE_APPLICATION_CREDENTIALS_JSON` manualmente también quedaron migrados al helper canónico.
- Nuevas variables de entorno documentadas para el rollout real:
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_PROJECT_NUMBER`
  - `GCP_WORKLOAD_IDENTITY_POOL_ID`
  - `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`
  - `GCP_SERVICE_ACCOUNT_EMAIL`
- Estado externo ya materializado:
  - GCP project `efeonce-group`
  - Workload Identity Pool `vercel`
  - Provider `greenhouse-eo`
  - service account runtime actual vinculada: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  - bindings por entorno Vercel para `development`, `preview`, `staging` y `production`
- Validación de transición ya ejecutada:
  - BigQuery respondió con WIF sin SA key
  - Cloud SQL Connector respondió `SELECT 1` con WIF sin SA key usando `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev`
  - preview Vercel real `version=7638f85` quedó sano con `/api/internal/health`
- Restricción vigente:
  - el runtime actual no hace bigbang ni retira la SA key por defecto
  - staging/production siguen en postura transicional hasta que Vercel + GCP WIF queden validados en preview/staging reales y se limpie un drift detectado en variables Vercel que hoy agregan sufijos literales `\n`

## Delta 2026-03-28 Admin Center governance shell
- `/admin` dejó de ser un redirect ciego y ahora funciona como landing real de `Admin Center`.
- La navegación administrativa ya separa explícitamente `Admin Center`, `Cloud & Integrations` y `Ops Health` como surfaces de gobernanza dentro del shell admin.
- La señal operacional para esas vistas se resuelve desde una capa compartida `src/lib/operations/get-operations-overview.ts`, reutilizada también por `GET /api/agency/operations`.
- `Admin Center` indexa la observabilidad operativa y la separa del uso diario del producto; no reemplaza `Agency > Operations`, sino que la contextualiza como vista extendida.

## Delta 2026-03-28 Centralized email delivery layer completed
- `TASK-095` quedó cerrada con `sendEmail()` como capa canónica sobre Resend, registro unificado en `greenhouse_notifications.email_deliveries` y resolver por suscripción en `greenhouse_notifications.email_subscriptions`.
- Auth, NotificationService y Payroll ya consumen esa capa; los envíos directos ad hoc y el plain text de notificaciones quedaron reemplazados por templates centralizados.
- El contrato operativo ahora distingue `sent`, `failed` y `skipped`, con la documentación de arquitectura y el índice de tasks ya alineados al runtime implementado.
- El retry cron `email-delivery-retry` quedó conectado a `delivery_payload` para reprocesar `failed` deliveries con hasta 3 intentos en 1 hora.

## Delta 2026-03-28 Payroll export package auto-bootstrap
- La capa de exportación de Payroll ahora materializa su propia tabla `greenhouse_payroll.payroll_export_packages` si el entorno de preview aún no la tiene aplicada.
- El objetivo es evitar que `Reenviar correo` y la descarga de artefactos queden bloqueados por un schema ausente en deployments viejos o incompletos.
- La migración canónica sigue siendo `scripts/migrations/add-payroll-export-packages.sql`; el runtime bootstrap solo actúa como red de seguridad operacional.

## Delta 2026-03-28 Payroll email delivery staging alias lesson
- `dev-greenhouse.efeoncepro.com` apunta al deployment `staging` de Vercel, no al `Preview (develop)`, así que la validación del correo de Payroll debe hacerse contra el entorno que realmente sirve ese alias.
- Para que `Reenviar correo` funcione en ese dominio, `RESEND_API_KEY` y `EMAIL_FROM` deben existir en `staging`; tenerlos solo en `Preview (develop)` no alcanza.
- El endpoint de reenvío no debe presentar `deliveryId: null` como éxito visible; a nivel de capa de delivery, ese caso debe distinguirse como `skipped` o `failed`.
- Como hardening futuro, la gestión de secretos transaccionales podría vivir en Google Secret Manager con service account de sincronización, pero la app desplegada seguirá consumiendo variables del entorno de Vercel.

## Delta 2026-03-28 Payroll export actions UX hardening
- `PayrollPeriodTab` ahora envuelve las acciones exportadas para que el CTA `Reenviar correo` no quede fuera de vista cuando el header tiene demasiados botones.
- La descarga de PDF del período cambió de `window.open` a una descarga explícita por `fetch -> blob -> anchor`, con lo que el browser debe iniciar un archivo real y no una navegación dependiente del pop-up handling.
- El contrato de negocio sigue igual: `Reenviar correo` y los artefactos descargables solo se exponen para períodos `exported`.

## Delta 2026-03-28 Payroll export package persistence completed
- `TASK-097` quedó cerrada: Payroll ahora persiste PDF/CSV de exportación en GCS, sirve descargas desde storage con fallback y permite reenvío del correo desde un período ya exportado.
- La implementación añade `greenhouse_payroll.payroll_export_packages`, la ruta `POST /api/hr/payroll/periods/[periodId]/resend-export-ready` y botones/CTAs en `PayrollPeriodTab` para reenvío.
- El contrato de negocio no cambia: `payroll_period.exported` sigue siendo el cierre canónico; el paquete documental es derivado y reutilizable.

## Delta 2026-03-28 Payroll export package persistence in progress
- `TASK-097` quedó en progreso para persistir el paquete documental de exportación Payroll en GCS y permitir reenvío del correo sin volver a cerrar el período.
- La implementación añade una tabla `greenhouse_payroll.payroll_export_packages`, rutas de descarga basadas en storage y `POST /api/hr/payroll/periods/[periodId]/resend-export-ready`.
- El cierre canónico sigue siendo `payroll_period.exported`; el paquete documental es un artefacto derivado y reutilizable.

## Delta 2026-03-28 Payroll export artifact persistence lane added
- Se documentó `TASK-097` como follow-up de Payroll para persistir PDF/CSV de cierre en GCS y habilitar reenvío del correo sin volver a cerrar el período.
- La lane se apoya en el contrato ya existente de `payroll_period.exported`, en el delivery de Resend y en la experiencia de recibos almacenados en bucket.
- El alcance explícito separa cierre canónico, reenvío de correo y descargas posteriores; el cierre sigue siendo `exported`, no el click de archivo.

## Delta 2026-03-28 Centralized email delivery lane added
- Se documentó `TASK-095` como lane paralela para centralizar el delivery de emails sobre Resend.
- La idea es que Payroll, Finance, Delivery, Permissions y Auth consuman una capa única de envío en vez de helpers ad hoc.
- La nueva task se apoya conceptualmente en la infraestructura de notificaciones existente, pero no cambia todavía el runtime de delivery.

## Delta 2026-03-28 Payroll close/export split completed
- Payroll separó el cierre canónico del período de la descarga del CSV.
- `POST /api/hr/payroll/periods/[periodId]/close` marca el período como `exported` y publica `payroll_period.exported`.
- `GET /api/hr/payroll/periods/[periodId]/csv` y el route legacy `export` quedaron como descarga de artefacto, sin mutar estado.
- La UI de `PayrollPeriodTab` ahora expone `Cerrar y notificar` y `Descargar CSV` como acciones distintas.
- La notificación downstream a Finance/HR sale desde `payroll_period.exported` vía Resend, con PDF/CSV adjuntos.
- La arquitectura y el catálogo de emails quedaron alineados con ese contrato.

## Delta 2026-03-28 Payroll export notification immediate flush
- El cierre de Payroll ahora intenta además un flush inmediato del dominio `notifications` después de exportar el período, para no depender exclusivamente del cron en entornos interactivos o staging.
- El flush inmediato sigue siendo best-effort: `outbox-publish` y `outbox-react` continúan como safety net operativo y la idempotencia se conserva por `outbox_reactive_log`.
- La mutación canónica sigue siendo `payroll_period.exported`; el cambio solo acelera la entrega del correo y de los recibos downstream cuando el entorno permite procesarlos en caliente.

## Delta 2026-03-28 Payroll operational calendar utility implemented
- La utilidad canónica de calendario operativo quedó implementada en `src/lib/calendar/operational-calendar.ts`.
- La hidratación pública de feriados quedó separada en `src/lib/calendar/nager-date-holidays.ts`.
- El contrato operativo sigue siendo timezone-aware, con base `America/Santiago`, feriados nacionales desde `Nager.Date` y overrides persistidos en Greenhouse.
- No se introdujo una API pública de cálculo temporal; la utility es de lectura y debe ser consumida por Payroll y otros dominios server-side.
- El mapa de consumidores actual quedó acotado a Payroll: `current-payroll-period`, `payroll-readiness`, routes de approve/readiness y las vistas `PayrollDashboard`, `PayrollPeriodTab`, `PayrollHistoryTab`, `MyPayrollView`, `PersonPayrollTab`, `PayrollPersonnelExpenseTab` y `ProjectedPayrollView`.
- No hay consumidores directos en otros módulos del producto todavía; Finance y Cost Intelligence solo ven estados derivados de nómina.
- Posibles futuros consumidores: `ICO`, `Finance`, `Campaigns` y `Cost Intelligence`, pero solo si esos dominios formalizan ciclos de cierre mensuales o ventanas operativas reales.

## Delta 2026-03-28 Payroll operational calendar timezone + jurisdiction
- El calendario operativo de Payroll quedó definido como una política timezone-aware con base en `America/Santiago`.
- La semántica de cierre debe separar:
  - `timezone` operativo de la casa matriz
  - `country/jurisdiction` del contrato de nómina
  - `holiday calendar` aplicado para contar días hábiles
- Regla operativa derivada:
  - el país de residencia de un colaborador no redefine el ciclo de cierre de una nómina cuya jurisdicción sea otra
  - el cambio de horario invierno/verano de Santiago afecta el offset, pero no el contrato mensual de cierre
  - la utilidad temporal debe seguir siendo pura y no publicar outbox events por sí misma

## Delta 2026-03-28 Payroll holiday source decision
- La timezone canónica del calendario operativo se resuelve con la base IANA del runtime, no con una API externa.
- La fuente pública de mercado recomendada para feriados nacionales es `Nager.Date`.
- Greenhouse puede persistir overrides corporativos o jurisdiccionales encima de esa fuente cuando la política local lo requiera.

## Delta 2026-03-28 Payroll operational calendar / current-period semantics split
- La semántica operativa de Payroll quedó partida en dos lanes explícitas para evitar mezclar calendario y UI:
  - `TASK-091` para una utilidad canónica de calendario operativo
  - `TASK-092` para la lectura de período actual, historial y cards KPI en `/hr/payroll`
- Regla operativa derivada:
  - el runtime actual aún no cambia; la semántica de período vigente seguirá siendo la previa hasta que ambas tasks se implementen
  - el helper temporal no debe seguir creciendo dentro de la vista de Payroll si el contrato se reutiliza en otros dominios

## Delta 2026-03-28 Payroll current-period semantics implementation started
- `TASK-092` empezó a mover la lectura del período actual hacia el mes operativo vigente resuelto por la utility compartida.
- `PayrollHistoryTab` dejó de contar `approved` como si fuera cierre final y ahora distingue `aprobado en cierre` de `cerrado/exportado`.
- La selección temporal de `current-payroll-period` ahora busca el período del mes operativo vigente, no solo el último periodo no exportado.

## Delta 2026-03-28 Payroll current-period semantics completed
- `TASK-092` quedó cerrada con la semántica operativa de período actual y la distinción visual de historial entre cierres reales y aprobaciones aún en cierre.
- El dashboard de Payroll mantiene KPI y copy atados al período activo, mientras el historial muestra los períodos aprobados en cierre como estado intermedio y los exportados como cierre final.

## Delta 2026-03-28 Payroll UX semantics and feedback hardening
- `TASK-089` cerró el endurecimiento de UX de Payroll sin alterar el dominio de cálculo:
  - el dashboard separa período activo e histórico seleccionado
  - las vistas críticas muestran error y retry visibles
  - los CTAs de descarga y los icon buttons del módulo tienen copy/labels accesibles más claros
  - `Mi Nómina` y `People > Nómina` ya no dependen de un orden implícito para definir el último período
- Regla operativa derivada:
  - el período histórico es navegación, no el nuevo contexto del período actual
  - los fallos de carga no deben verse como vacíos neutros
  - las descargas de recibos deben comunicar fallo y nombre humano del documento, no solo disparar una navegación o log interno

## Delta 2026-03-28 Operating Entity Identity — React context + API endpoint
- La identidad de la entidad operadora (razón social, RUT, dirección legal) ya no se resuelve ad hoc por cada consumer.
- Nuevo baseline:
  - `OperatingEntityProvider` + `useOperatingEntity()` hook en `src/context/OperatingEntityContext.tsx`
  - Hydration server → client: `Providers.tsx` llama `getOperatingEntityIdentity()` una vez y pasa al Provider
  - API endpoint `GET /api/admin/operating-entity` para consumers no-React (webhooks, integraciones, cron)
  - Payroll receipt card y PDF ya consumen la identidad del empleador desde el contexto
- Regla operativa derivada:
  - todo documento formal (recibo, DTE, contrato, propuesta, email) debe obtener la identidad del empleador desde `useOperatingEntity()` (client) o `getOperatingEntityIdentity()` (server), no hardcodearla
  - el Provider se resuelve una vez por layout render, no por componente
  - multi-tenant ready: si la operación se fragmenta por tenant, el layout resuelve el operating entity del scope de la sesión

## Delta 2026-03-28 Payroll reactive hardening complete
- `TASK-088` cerró la lane reactiva de Payroll sin cambiar la semántica funcional del módulo:
  - la cola persistente `greenhouse_sync.projection_refresh_queue` ya vuelve de forma observable a `completed` o `failed`
  - `reactive-consumer` completa best-effort después del ledger reactivo y no convierte un fallo de completion en fallo del refresh exitoso
  - el fallback BigQuery de export solo publica `payroll_period.exported` cuando la mutación realmente afecta una fila
  - `projected_payroll_snapshots` quedó documentado como serving cache interno; `/api/hr/payroll/projected` sigue resolviendo cálculo vivo + `latestPromotion`
- Regla operativa derivada:
  - `payroll_period.exported` sigue siendo el cierre canónico de nómina, independientemente del runtime Postgres-first o BigQuery fallback

## Delta 2026-03-28 Payroll hardening backlog documented
- La auditoría de Payroll dejó tres lanes explícitas para seguir endureciendo el módulo sin mezclar objetivos:
  - `TASK-087`: invariantes del lifecycle oficial y gate de readiness
  - `TASK-088`: cola reactiva, export parity y contrato de projected payroll / receipts
  - `TASK-089`: UX, copy, feedback y accesibilidad en HR, My Payroll y People
- La arquitectura de Payroll ahora documenta explícitamente:
  - la ventana operativa de cierre de nómina
  - `/hr/payroll/projected` como surface derivada
  - `payroll_receipts_delivery` como consumer downstream de `payroll_period.exported`
- Regla operativa derivada:
  - la nómina oficial y la proyectada siguen siendo objetos distintos; la proyección alimenta, pero no reemplaza, el lifecycle oficial

## Delta 2026-03-28 Payroll lifecycle invariants hardened
- `TASK-087` ya quedó cerrada para mover la semántica del lifecycle oficial desde los routes hacia el dominio.
- Nuevo contrato operativo:
  - `approved` solo se acepta desde `calculated`
  - la aprobación consulta readiness canónico y rechaza blockers antes de persistir
  - la edición de entries de un período aprobado reabre explícitamente el período a `calculated`
- Regla operativa derivada:
  - `approved` sigue siendo checkpoint editable, no cierre final; el cierre real sigue siendo `exported`

## Delta 2026-03-28 Compensation Chile líquido-first + reverse engine completo
- `TASK-079` a `TASK-085` cerradas en una sesión:
  - Motor reverse `computeGrossFromNet()` con binary search, piso IMM, convergencia ±$1 CLP
  - Regla de negocio: líquido deseado = neto con descuentos legales (7% salud, no Isapre)
  - Excedente Isapre mostrado como deducción voluntaria separada
  - AFP resuelta desde Previred, no desde compensación guardada
  - `desired_net_clp` persistido en `compensation_versions` (migration corrida)
  - Para Chile, el drawer siempre abre en modo reverse (sin switch) — el líquido es el punto de partida
  - Para internacional, salary base directo sin cambios
  - Preview enterprise con secciones semánticas (haberes/descuentos/resultado), monospace, accordion previsional
  - Error de guardado visible arriba del botón (no oculto en scroll)
  - Sección 24 agregada a `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- Regla operativa derivada:
  - toda nueva compensación Chile se crea desde un líquido deseado contractual
  - el sueldo base es siempre un resultado del motor reverse, nunca un input manual
  - el líquido a pagar varía mes a mes por ausencias, bonos, excedente Isapre, etc.

## Delta 2026-03-28 Reverse payroll engine (Slices 1-2 validados)
- `TASK-079` Slices 1-2 validados en staging contra liquidación real de Valentina Hoyos (Feb 2026).
- Motor `computeGrossFromNet()` en `src/lib/payroll/reverse-payroll.ts`: binary search sobre forward engine real, ±$1 CLP, 10 golden tests.
- Reglas de negocio Chile validadas:
  - **Líquido deseado = neto con descuentos legales solamente** (AFP + 7% salud + cesantía + impuesto). No incluye Isapre ni APV.
  - **Excedente Isapre** mostrado aparte como deducción voluntaria. "Líquido a pagar" = líquido deseado - excedente.
  - **Piso IMM**: el binary search arranca desde el Ingreso Mínimo Mensual ($539.000). Nunca calcula base inferior al mínimo legal.
  - **AFP desde Previred**: la tasa AFP se resuelve del período (Previred sync), no de la compensación guardada.
- Archivos: `reverse-payroll.ts`, `reverse-payroll.test.ts`, `reverse-quote/route.ts`, `CompensationDrawer.tsx`
- Hardening pendiente (Slice 3): persistir `desired_net_clp` en `compensation_versions`, sincronizar AFP rate al guardar, round-trip check, auto changeReason.
- No se introdujeron nuevos eventos ni cambios de schema (aún); el campo `desired_net_clp` requiere migration.

## Delta 2026-03-28 Reactive receipts projection log + queue fix
- El ledger reactivo ahora es projection-aware: `greenhouse_sync.outbox_reactive_log` quedó keyeado por `(event_id, handler)` para que un handler no bloquee al resto de proyecciones del mismo evento.
- La cola persistente `greenhouse_sync.projection_refresh_queue` recuperó su `UNIQUE (projection_name, entity_type, entity_id)` para que `enqueueRefresh()` deduzca intents sin caer en `ON CONFLICT` inválido.
- Esto destraba la materialización de `payroll_receipts_delivery` después de `payroll_period.exported`, que era el último bloqueo estructural del smoke de `TASK-077`.

## Delta 2026-03-28 Payroll receipts smoke complete
- `TASK-077` quedó cerrada en staging con smoke end-to-end real:
  - `outbox-publish` publicó el evento nuevo de `payroll_period.exported`
  - `outbox-react` materializó `payroll_receipts_delivery`
  - se generaron 4 recibos y se enviaron 4 correos
- Los PDFs quedaron almacenados en `gs://efeonce-group-greenhouse-media/payroll-receipts/2026-03/...`
- El flujo de recibos queda ahora validado no solo por código y docs, sino también por ejecución real sobre marzo 2026.

## Delta 2026-03-28 Payroll receipts registry + reactive delivery
- `Payroll` ya persistió un registry canónico de recibos en `greenhouse_payroll.payroll_receipts`.
- La generación batch de recibos al exportar período se ejecuta por `payroll_period.exported` a través de proyecciones reactivas, no por cron separado.
- La descarga de recibos por HR prioriza el PDF almacenado en GCS y cae a render on-demand solo como fallback.
- `My Nómina` ya expone descarga de recibo para el colaborador autenticado y `People > Person > Nómina` la expone para HR desde el mismo contrato de receipt.
- Quedan pendientes el pulido del layout de recibos y el smoke end-to-end con correo + descarga en staging.

## Delta 2026-03-28 Projected payroll snapshot grants
- `greenhouse_serving.projected_payroll_snapshots` es una materialización serving escribible por el runtime de Payroll projected, con grants explícitos para `greenhouse_app`, `greenhouse_runtime` y `greenhouse_migrator`.
- La promoción `Projected -> Official` usa ese snapshot como cache auditable, no como source of truth transaccional.
- El permiso denegado en staging se resolvió añadiendo el grant a la migration/bootstrap de Payroll, sin mover la tabla fuera de `greenhouse_serving`.

## Delta 2026-03-28 Payroll AFP split
- `Payroll Chile` ahora versiona y snapshottea `AFP` con split explícito de `cotización` y `comisión`, manteniendo también el total agregado para compatibilidad histórica.
- Las superficies de exportación y recibos deben mostrar ambos componentes cuando existan, pero el cálculo legal sigue consumiendo el total AFP para no alterar la paridad del período.
- La migration operativa quedó disponible en `scripts/migrations/add-chile-afp-breakdown.sql`.

## Delta 2026-03-28 Employer legal identity
- La razón social canónica de la organización operativa propietaria de Greenhouse es `Efeonce Group SpA`.
- El RUT canónico es `77.357.182-1`.
- La dirección legal canónica es `Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile`.
- Estos datos deben reutilizarse en liquidaciones, recibos, exportes legales, Finance y surfaces comerciales como identidad de la organización/empleador, no como dato de persona ni como identidad de cliente.

## Delta 2026-03-28 Chile employer cost base
- `Payroll Chile` ya calcula un breakdown de costos empleador (`SIS`, cesantía empleador y mutual estimado) y lo persiste junto a las entries.
- `member_capacity_economics.total_labor_cost_target` absorbe ese breakdown para que Cost Intelligence pueda ver el costo laboral cargado real sin inventar otra proyección.
- Esta base reutiliza la misma propagación reactiva de `compensation_version.created/updated` y `payroll_entry.upserted`.

## Delta 2026-03-28 Payroll Chile smoke validation
- Se validó contra la liquidación real de febrero 2026 de Valentina Hoyos que el núcleo legal de `Payroll Chile` ya calza con el PDF cuando existen los insumos correctos:
  - `IMM = 539000`
  - compensación Chile vigente con gratificación legal mensual
- El motor devuelve correctamente:
  - `baseSalary`
  - `gratificacionLegal`
  - `AFP`
  - `salud`
  - `cesantía`
  - `netTotal` imponible
- Regla operativa derivada:
  - la paridad completa con la liquidación impresa sigue pendiente mientras no se modelen `colación` y `movilización`
  - el helper/ruta de creación de compensación sigue requiriendo revisión separada, pero no invalida el cálculo core cuando la data está cargada

## Delta 2026-03-28 Chile payroll non-imponible allowances
- `Payroll Chile` ahora modela `colación` y `movilización` como haberes canónicos versionados en la compensación y en `payroll_entries`.
- El motor forward los incorpora al devengado y al neto, manteniendo su carácter no imponible.
- El cambio se expone por las superficies existentes de `compensation_version.created/updated` y `payroll_entry.upserted`; no se agregó un nuevo evento.
- Regla operativa derivada:
  - los consumidores de recibos, PDF, Excel, breakdown y projected payroll deben mostrar esos haberes cuando existan y tratarlos como parte del contrato de nómina Chile, no como un bono manual ad hoc

## Delta 2026-03-27 Payroll variable bonus policy recalibration
- `Payroll` ya no depende de una policy simple para bonos variables (`OTD >= threshold`, `RpA` lineal hasta un único umbral).
- Baseline nuevo materializado:
  - `OTD` con full payout desde `89%` y piso `70%`
  - `RpA` con bandas versionadas:
    - `<= 1.7` -> `100%`
    - `1.7 - 2.0` -> descenso suave hasta `80%`
    - `2.0 - 3.0` -> descenso hasta `0`
  - config canónica ampliada en `greenhouse_payroll.payroll_bonus_config` con:
    - `rpa_full_payout_threshold`
    - `rpa_soft_band_end`
    - `rpa_soft_band_floor_factor`
- Regla operativa derivada:
  - `Payroll` official, `projected payroll` y `recalculate-entry` deben leer exactamente la misma policy canónica
  - los cambios de payout variable deben versionarse por `effective_from`, no esconderse en fórmulas locales por consumer
  - `TASK-025` (`FTR`) deja de ser el siguiente paso obligatorio; pasa a ser una alternativa estratégica futura

## Delta 2026-03-27 Economic indicators runtime baseline
- Finance ya no queda limitado semánticamente a `exchange_rates` para datos macroeconómicos chilenos.
- Baseline nuevo materializado:
  - helper server-side común para `USD_CLP`, `UF`, `UTM`, `IPC`
  - endpoint `GET /api/finance/economic-indicators/latest`
  - endpoint `GET/POST /api/finance/economic-indicators/sync`
  - storage histórico previsto desde `2026-01-01`
  - cron diario movido a `/api/finance/economic-indicators/sync`
- Regla operativa derivada:
  - `USD/CLP` sigue manteniendo compatibilidad con `greenhouse_finance.exchange_rates`
  - indicadores no FX (`UF`, `UTM`, `IPC`) no deben modelarse como monedas ni reusar contratos de currency a la fuerza
- consumers que necesiten snapshots históricos de período deben leer desde la capa común de indicadores antes de pedir input manual al usuario
- `Payroll` ya no debe pedir `UF` manualmente por defecto al crear/editar períodos; debe autohidratarla desde indicadores usando el mes imputable

## Delta 2026-03-27 Payroll variable bonus policy recalibrated
- `Payroll` mantiene a `ICO` como fuente canónica de `OTD` y `RpA`, pero su policy de payout ya no es solo un threshold lineal simple.
- Regla operativa nueva:
  - `OTD` paga `100%` desde `89%`, con piso de prorrateo en `70%`
  - `RpA` usa bandas versionadas:
    - `<= 1.7` -> `100%`
    - `1.7 - 2.0` -> baja suavemente hasta `80%`
    - `2.0 - 3.0` -> baja desde `80%` hasta `0`
    - `>= 3.0` -> `0`
- La policy ya no depende solo de `rpa_threshold`; queda versionada en `greenhouse_payroll.payroll_bonus_config` con:
  - `rpa_full_payout_threshold`
  - `rpa_soft_band_end`
  - `rpa_soft_band_floor_factor`
- Impacto derivado:
  - `Payroll` oficial, `projected payroll` y `recalculate-entry` deben consumir exactamente la misma config canónica
  - cualquier fallback analítico debe tolerar esquemas viejos y rellenar defaults para no romper ambientes parcialmente migrados

## Delta 2026-03-26 Team capacity architecture canonized
- La arquitectura de capacidad/economía de equipo ya no vive solo en una task o en el código.
- La fuente canónica quedó fijada en:
  - `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- Regla operativa derivada:
  - futuros consumers de capacidad/economía por persona deben escalar desde:
    - helpers puros `src/lib/team-capacity/*`
    - snapshot reactivo `greenhouse_serving.member_capacity_economics`
  - no crear una segunda capa paralela de capacidad por miembro/período si el problema es solo un nuevo consumer o un nuevo campo del mismo dominio

## Delta 2026-03-26 TASK-056 reactive capacity economics slice
- Se materializó la nueva proyección reactiva `member_capacity_economics` en `greenhouse_serving.member_capacity_economics`.
- El snapshot quedó centrado en `member_id + period_year + period_month` y materializa:
  - capacidad contractual
  - carga comercial asignada
  - uso operativo derivado de ICO
  - economía laboral convertida a `CLP`
- La lane quedó wireada al projection registry y al event catalog con triggers para:
  - `member.*`
  - `assignment.*`
  - `compensation_version.*`
  - `payroll_period.*`
  - `payroll_entry.upserted`
  - `finance.exchange_rate.upserted`
  - eventos futuros de overhead/licencias/tooling
- Alcance deliberadamente no tocado:
  - `src/lib/team-capacity/*.ts`
  - routes UI
  - views
- Validación realizada:
  - `pnpm test src/lib/sync/projections/member-capacity-economics.test.ts src/lib/sync/projection-registry.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`

## Delta 2026-03-24 Task system normalization
- El sistema de tasks deja de nacer bajo el prefijo `CODEX_TASK_*` como convencion nueva.
- Regla operativa derivada:
  - toda task nueva debe usar un ID estable `TASK-###`
  - el numero no define prioridad mutable; el orden operativo vive en `Rank` y en `docs/tasks/README.md`
  - la plantilla canonica para crear e interpretar tasks queda fijada en `docs/tasks/TASK_TEMPLATE.md`
  - la reserva de IDs bootstrap y el siguiente ID disponible quedan fijados en `docs/tasks/TASK_ID_REGISTRY.md`
  - la capa operativa de seguimiento para tasks activas queda definida en `docs/operations/GITHUB_PROJECT_OPERATING_MODEL_V1.md`
- Compatibilidad:
  - los `CODEX_TASK_*` existentes siguen vigentes como legacy hasta su migracion y no deben renumerarse de forma masiva sin una lane dedicada

## Delta 2026-03-24 GitHub Project materialized
- El Project operativo recomendado ya no es hipotetico: quedó creado en GitHub bajo `efeoncepro`.
- Estado real:
  - Project: `Greenhouse Delivery`
  - URL: `https://github.com/orgs/efeoncepro/projects/2`
  - issues bootstrap creadas: `#9` a `#18` en `efeoncepro/greenhouse-eo`
- Regla operativa derivada:
  - el repo queda enlazado al Project a traves de issues reales `[TASK-###] ...`
  - el campo custom `Pipeline` es la fase operativa del equipo
  - el `Status` built-in de GitHub queda como estado coarse (`Todo`, `In Progress`, `Done`)

## Delta 2026-03-22 Webhook architecture canonized
- La infraestructura de webhooks de Greenhouse ya no queda como idea difusa entre una ruta aislada de Teams, el outbox y la API de integraciones.
- La fuente canonica para webhook architecture quedo fijada en:
  - `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- Decision operativa derivada:
  - los futuros webhooks inbound y outbound deben montarse sobre una capa reusable encima de `greenhouse_sync`
  - `greenhouse_sync.outbox_events` sigue siendo la fuente de eventos operativos para delivery externo
  - la API `/api/integrations/v1/*` sigue viva para sync/pull/push explicito; webhooks no la reemplazan
- Lane derivada creada:
  - `docs/tasks/to-do/CODEX_TASK_Webhook_Infrastructure_MVP_v1.md`

## Delta 2026-03-22 Repo ecosystem canonized
- Ya no queda implícito qué repos externos son hermanos operativos de `greenhouse-eo`.
- La fuente canónica para ownership multi-repo y selección de upstream quedó fijada en:
  - `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- Repos hermanos documentados:
  - `cesargrowth11/notion-bigquery`
  - `cesargrowth11/hubspot-bigquery`
  - `cesargrowth11/notion-teams`
  - `cesargrowth11/notion-frame-io`
  - `efeoncepro/kortex`
- Regla operativa derivada:
  - si un cambio toca una integración o pipeline cuyo runtime vive fuera del portal, el agente debe revisar primero ese repo hermano antes de asumir que el fix o la evolución pertenece a `greenhouse-eo`

## Delta 2026-03-21 Payroll architecture canonized
- `Payroll` ya no depende solo de contexto distribuido entre tasks y código: su contrato completo de módulo quedó consolidado en `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`.
- Ese documento fija como canon:
  - compensación versionada por vigencia, no mensual
  - período imputable como mes calendario, no mes de pago
  - lifecycle `draft -> calculated -> approved -> exported`, con `approved` todavía editable y `exported` como candado final
  - KPI mensual de `On-Time` y `RpA` sourced desde `ICO`
  - `People 360` como ficha individual oficial del colaborador, dejando `/hr/payroll/member/[memberId]` como redirect operativo
- Regla documental derivada:
  - cambios futuros de semantics o ownership de `Payroll` deben actualizar primero `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, y solo dejar deltas breves en `project_context.md`, `Handoff.md` y `changelog.md`

## Delta 2026-03-21 Payroll period lifecycle — approved is editable, exported is final
- Se ajustó la semántica operativa de estados de `Payroll` para alinearla con el flujo real de pago:
  - el período imputable sigue siendo el mes calendario (`2026-02`, `2026-03`, etc.)
  - la nómina puede aprobarse dentro del flujo de revisión y seguir ajustándose antes de su pago/exportación
- Regla operativa derivada:
  - `approved` ya no significa “cerrado final”; significa “listo para pago/revisión”
  - `exported` pasa a ser el candado final del período
  - por lo tanto, un período `approved` todavía puede:
    - recalcularse
    - editar entries manuales
    - reutilizar la compensación vigente para correcciones in-place
- Comportamiento derivado:
  - si un período `approved` se recalcula o se edita una entry, el sistema lo devuelve a `calculated`
  - después de eso, debe aprobarse nuevamente antes de exportar
  - solo los períodos `exported` quedan completamente congelados para recalcular, editar entries o bloquear cambios de compensación reutilizada

## Delta 2026-03-21 Payroll period correction — imputed month/year can be fixed before export
- Se detectó un caso operativo real: una nómina puede haberse creado como `2026-03` solo para prueba aunque en realidad corresponda al mes imputable `2026-02`.
- Regla operativa derivada:
  - `year` y `month` del período son la identidad del mes imputable, no del mes de pago
  - por lo tanto, deben poder corregirse mientras el período no haya sido `exported`
- Comportamiento derivado:
  - `Editar período` ahora permite corregir `year/month` además de `ufValue`, `taxTableVersion` y `notes`
  - si ese cambio altera la base de cálculo (`year`, `month`, `ufValue` o `taxTableVersion`), el período vuelve a `draft` y sus `payroll_entries` se eliminan para obligar un recálculo limpio
  - no se permite “renombrar” un período exportado ni moverlo encima de un `periodId` ya existente

## Delta 2026-03-21 Payroll KPI source cutover — ICO becomes the monthly source of truth
- Se confirmó una brecha entre la intención funcional de `Payroll` y su runtime real:
  - los montos de compensación (`salario base`, `bono conectividad`, `bono máximo On-Time`, `bono máximo RpA`) ya vivían correctamente versionados en `compensation_versions`
  - pero el cálculo mensual de `On-Time` y `RpA` todavía dependía de `notion_ops.tareas`
- Regla operativa derivada:
  - `Payroll` debe tomar los KPI mensuales de desempeño desde `ICO` por `member_id`, no directo desde Notion
  - la fuente preferida es `ico_engine.metrics_by_member` para el `year/month` del período
  - si ese mes aún no está materializado para un colaborador, el runtime puede hacer fallback live por miembro y congelar el snapshot resultante en `payroll_entries`
- Impacto práctico:
  - `Payroll` deja de depender del primer `responsable_id` de `notion_ops.tareas` para calcular bonos
  - el match de KPI queda alineado con la identidad canónica de colaborador (`member_id`) y con la capa `ICO`
  - períodos históricos con `kpi_data_source = notion_ops` se siguen leyendo por compatibilidad, pero los nuevos cálculos deben registrar `kpi_data_source = ico`

## Delta 2026-03-21 MUI live-region sizing pitfall — width/height numeric shorthand is unsafe for visually hidden nodes
- Se confirmó un bug real de layout en `People`: un `aria-live` oculto dentro de `PersonTabs` usaba `sx={{ width: 1, height: 1 }}`.
- Regla operativa derivada:
  - en MUI `sx`, para propiedades de tamaño (`width`, `height`, etc.), el valor numérico `1` significa `100%`, no `1px`
  - por lo tanto, **no usar** `width: 1` / `height: 1` para regiones visualmente ocultas, especialmente si además llevan `position: 'absolute'`
  - el patrón seguro para live regions visualmente ocultas debe usar strings explícitos (`'1px'`) más `clip`, `clipPath`, `whiteSpace: 'nowrap'` y `margin: '-1px'`
- Impacto práctico:
  - un `aria-live` aparentemente inocuo puede inflar `documentElement.scrollWidth` y `scrollHeight`, generando scroll horizontal y vertical a nivel de página aunque el resto del layout esté correcto
  - se corrigió `PersonTabs` y se saneó el duplicado equivalente en `OrganizationTabs`

## Delta 2026-03-20 HR Payroll — contraste arquitectónico confirma cierre completo
- Se contrastaron las 2 tasks de Payroll contra la arquitectura 360 real:
  - `CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1` — schema `greenhouse_payroll` materializado, 25+ funciones en postgres-store, 11/11 rutas Postgres-first
  - `CODEX_TASK_HR_Payroll_Module_v3` — 4 gaps UX cerrados (alta compensación, edición período, KPI manual, ficha colaborador)
- Backfill BQ → PG ejecutado: 0 rows transaccionales en BigQuery, módulo nunca usado en producción
- Regla operativa derivada:
  - Payroll está listo para primer uso real; el siguiente paso es onboarding de datos reales (compensaciones + primer período) directamente en Postgres
  - BigQuery queda como fallback pasivo; no debe recibir writes nuevos del módulo
- Ambas tasks cerradas y movidas a `docs/tasks/complete/`

## Delta 2026-03-20 BigQuery cron hardening — schema drift + streaming buffer
- Se confirmó que el readiness hacia producción no estaba bloqueado por `build`, sino por dos fallos de cron en BigQuery:
  - `GET /api/cron/ico-materialize` fallaba cuando `ico_engine.metrics_by_project` existía pero sin columnas nuevas como `pipeline_velocity`
  - `GET /api/cron/sync-conformed` fallaba por `streaming buffer` al ejecutar `DELETE` sobre `greenhouse_conformed.delivery_*` después de escribir con `insertAll`
- Regla operativa derivada:
  - en BigQuery, `CREATE TABLE IF NOT EXISTS` no migra tablas ya existentes; cuando una tabla analítica vive mucho tiempo, el runtime debe aplicar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para cerrar drift de esquema antes de depender de columnas nuevas
  - para reemplazos completos de tablas `greenhouse_conformed.delivery_*`, no usar `DELETE + streaming insert`; usar `load jobs` o un patrón equivalente sin streaming buffer
- Runtime actualizado:
  - `src/lib/ico-engine/schema.ts` ahora aplica migraciones aditivas en tablas ICO existentes antes de recrear views
  - `src/lib/sync/sync-notion-conformed.ts` ahora reemplaza `delivery_projects`, `delivery_tasks` y `delivery_sprints` con load jobs `WRITE_TRUNCATE`

## Delta 2026-03-20 Sidebar navigation — reestructuración arquitectónica
- Se eliminó todo label en inglés del sidebar: `Updates`, `Control Tower`, `HR`, `Admin`, `AI Tooling` pasan a español.
- Se definió una regla explícita de cuándo usar cada patrón de menú:
  - **Flat MenuItem**: navegación primaria siempre visible (click directo)
  - **MenuSection**: frontera de dominio con 2+ hijos del mismo contexto (header uppercase, sin acordeón)
  - **SubMenu**: módulo funcional con 3+ rutas donde ocultar reduce ruido (acordeón colapsable)
- Se fusionaron las secciones `Equipo` (1 hijo: Personas) y `HR` (4 hijos: Nómina, Departamentos, Permisos, Asistencia) en una sola sección `Equipo` con lógica condicional: people+HR → sección unificada; solo people → flat item; solo HR → sección HR.
- Sección `Agencia` renombrada a `Gestión` (colisión con item `Agencia`).
- Sección `Servicios` renombrada a `Módulos` (ambigüedad).
- Sección `Operacion` eliminada (single-child anti-pattern).
- Regla de producto derivada:
  - Todo label de navegación del portal debe estar en español; los nombres de producto (`Pulse`, `Greenhouse`, `Creative Hub`) son excepciones por ser brand names
  - Las secciones de 1 solo hijo no deben existir; usar flat item en su lugar
  - Los hijos de SubMenu deben usar `NavLabel` con subtítulo, igual que los items de nivel superior

## Delta 2026-03-20 Nubox DTE staging runtime aligned + DTE labeling clarified
- `staging` / `dev-greenhouse.efeoncepro.com` no tenía cargadas las env vars Nubox aunque `Development`, `Preview` y `Production` sí.
- Se alineó `staging` con:
  - `NUBOX_API_BASE_URL`
  - `NUBOX_BEARER_TOKEN`
  - `NUBOX_X_API_KEY`
- Regla operativa derivada:
  - cualquier ambiente que deba emitir, refrescar estado o descargar PDF/XML de DTE desde Nubox debe tener las 3 `NUBOX_*` presentes; no basta con cargarlas solo en `Development`, `Preview` o `Production`
- Validación de documento real:
  - Nubox `sale 26639047` corresponde a `type.legalCode = 33` y `number = 114`
  - por lo tanto `33` es código SII del tipo de DTE y `114` es el folio real
- Ajuste de UX derivado:
  - `Finance > Ingresos > detalle` debe separar visualmente `Tipo de documento`, `Código SII` y `Folio DTE` para evitar interpretar `33` como número de factura

## Delta 2026-03-19 Nubox DTE integration — API discovery, org mapping, supplier seeding, income import
- Se descubrió y validó la New API de Nubox (Integraciones/Pyme) con credenciales productivas:
  - Base URL: `https://api.pyme.nubox.com/nbxpymapi-environment-pyme/v1`
  - Auth: `Authorization: Bearer <token>` + `x-api-key: <key>`
  - 4 dominios verificados: `/v1/sales`, `/v1/purchases`, `/v1/expenses`, `/v1/incomes`
- Mapeo de organizaciones Greenhouse ↔ clientes Nubox via RUT (`organizations.tax_id`):
  - 4 organizaciones existentes enriquecidas con RUT: Corp Aldea (65258560-4), DDSoft (76613599-4), Gobierno RM (61923200-3), Sky Airline (88417000-1)
  - 2 organizaciones nuevas creadas desde Nubox: SGI (76438378-8), Sika (91947000-3)
  - 2 clientes nuevos creados: `nubox-client-76438378-8`, `nubox-client-91947000-3`
- Proveedores sembrados desde compras Nubox:
  - 19 proveedores en `greenhouse_finance.suppliers` con RUT, categoría y datos fiscales
  - Categorías: banking, software, services, accounting, freelancer, hosting, travel, supplies, marketplace
- Ingresos importados desde ventas Nubox (15 meses):
  - 78 registros en `greenhouse_finance.income` — ID format: `INC-NB-{nubox_id}`
  - Total: $163,820,646 CLP
  - Tipos: `service_fee` (facturas), `credit_note` (notas de crédito negativas), `quote` (cotizaciones), `debit_note`
  - 0 huérfanos: todos los ingresos tienen `client_id` válido
- Credenciales almacenadas en `.env.local`: `NUBOX_API_BASE_URL`, `NUBOX_BEARER_TOKEN`, `NUBOX_X_API_KEY`
- Task brief creado: `docs/tasks/to-do/CODEX_TASK_Nubox_DTE_Integration.md` (8 fases, bidireccional)
- Script de descubrimiento: `scripts/nubox-extractor.py`
- Regla operativa derivada:
  - RUT es el bridge canónico entre Greenhouse y Nubox en ambas direcciones
  - `organizations.tax_id` debe estar poblado para cualquier cliente que emita DTE
  - Finance income de Nubox usa prefijo `INC-NB-` para evitar colisiones con income manual o HubSpot
  - Nubox New API es la única API activa; la Old API (`api.nubox.com`) NO se usa

## Delta 2026-03-15 Person 360 audit and serving baseline materialized
- Se materializó `greenhouse_serving.person_360` en Cloud SQL como primer serving unificado de persona sobre:
  - `greenhouse_core.identity_profiles`
  - `greenhouse_core.members`
  - `greenhouse_core.client_users`
  - `greenhouse_crm.contacts`
- También se agregó el comando:
  - `pnpm audit:person-360`
- Estado validado:
  - `profiles_total = 38`
  - `profiles_with_member = 7`
  - `profiles_with_user = 37`
  - `profiles_with_contact = 29`
  - `profiles_with_member_and_user = 7`
  - `profiles_with_user_and_contact = 29`
  - `profiles_with_all_three = 0`
  - `profiles_without_any_facet = 1`
- Gaps reales identificados:
  - `users_without_profile = 2`
  - `contacts_without_profile = 34`
  - `internal_users_without_member = 1`
- Conclusión operativa:
  - el principal bloqueo de `Person 360` ya no es de arquitectura sino de reconciliación CRM/contactos
  - `People` y `Users` ya tienen un backbone real al cual migrar, pero todavía no lo consumen

## Delta 2026-03-15 Person 360 formalized as canonical profile strategy
- Se fijó explícitamente que Greenhouse no debe seguir tratando `People`, `Users`, `CRM Contact` y `Member` como identidades distintas.
- Decisión de arquitectura:
  - `identity_profile` es el ancla canónica de persona
  - `member` es faceta laboral/interna
  - `client_user` es faceta de acceso
  - `crm_contact` es faceta comercial
- Regla de producto derivada:
  - `People` debe evolucionar hacia la vista humana/operativa del mismo perfil
  - `Users` debe evolucionar hacia la vista de acceso/permisos del mismo perfil
  - ambas superficies deben reconciliarse sobre `identity_profile_id`
- Se creó la lane activa:
  - `docs/tasks/to-do/CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md`
- Esto no reemplaza `Identity & Access V2`; lo complementa como capa de modelo y serving sobre persona.

## Delta 2026-03-15 AI Tooling runtime migrated to PostgreSQL
- `AI Tooling` ya no depende primariamente del bootstrap runtime de BigQuery para `catalog`, `licenses`, `wallets` y `metadata`.
- Se materializó `greenhouse_ai` en Cloud SQL con:
  - `tool_catalog`
  - `member_tool_licenses`
  - `credit_wallets`
  - `credit_ledger`
- `src/lib/ai-tools/service.ts` ahora opera en modo `Postgres first`, con fallback controlado al store legacy solo cuando PostgreSQL no está listo o no está configurado.
- `scripts/setup-postgres-ai-tooling.ts` ya no solo crea schema: también siembra el catálogo mínimo operativo en PostgreSQL.
- Estado validado tras setup:
  - `greenhouse_ai.tool_catalog = 9`
  - `greenhouse_ai.member_tool_licenses = 0`
  - `greenhouse_ai.credit_wallets = 0`
  - `greenhouse_ai.credit_ledger = 0`
  - `greenhouse_core.providers` visibles para AI Tooling = `10`
- Providers visibles validados en PostgreSQL:
  - `Adobe`
  - `Anthropic`
  - `Black Forest Labs`
  - `Freepik`
  - `Google DeepMind`
  - `Higgsfield AI`
  - `Kuaishou`
  - `Microsoft`
  - `Notion`
  - `OpenAI`
- Regla operativa derivada:
  - `AI Tooling` runtime vive en PostgreSQL
  - `BigQuery` queda como compatibilidad temporal y eventual fuente de backfill/histórico
  - no volver a depender de `ensureAiToolingInfrastructure()` como camino principal de request path

## Delta 2026-03-15 Performance indicators and source RpA semaphore identified and wired for runtime
- Se confirmó contra `notion_ops.tareas` que la fuente ya trae indicadores operativos explícitos, no solo señales derivadas:
  - `🟢 On-Time`
  - `🟡 Late Drop`
  - `🔴 Overdue`
  - `🔵 Carry-Over`
- También se confirmó que Notion ya trae `semáforo_rpa` como dato fuente separado de `rpa`.
- Decisión de modelado:
  - `rpa` y `semáforo_rpa` se tratan como datos distintos
  - Greenhouse debe preservar ambos:
    - `rpa_value`
    - `rpa_semaphore_source`
    - y puede seguir calculando un `rpa_semaphore_derived` para compatibilidad/guardrails
- `Project Detail > tasks` ya expone en runtime el set de indicadores fuente:
  - `rpaSemaphoreSource`
  - `rpaSemaphoreDerived`
  - `performanceIndicatorLabel`
  - `performanceIndicatorCode`
  - `deliveryCompliance`
  - `completionLabel`
  - `daysLate`
  - `rescheduledDays`
  - `isRescheduled`
  - `clientChangeRoundLabel`
  - `clientChangeRoundFinal`
  - `workflowChangeRound`
  - `originalDueDate`
  - `executionTimeLabel`
  - `changesTimeLabel`
  - `reviewTimeLabel`
- `Source Sync Runtime Projections` quedó ampliado para proyectar ese mismo set a:
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_delivery.tasks`
  - además de señales fuente nuevas en `delivery_projects` y `delivery_sprints`
- Restricción operativa vigente:
  - el apply de BigQuery para estas nuevas columnas sigue bloqueado por `table update quota exceeded`
  - el consumer de `Project Detail` no depende de esperar ese apply porque lee estos campos directo desde `notion_ops.tareas`

## Delta 2026-03-15 Finance clients consumers migrated to canonical-first, live-compatible reads
- `Finance > Clients` ya no depende solo de `hubspot_crm.*` live para listar y detallar clientes.
- Las rutas:
  - `GET /api/finance/clients`
  - `GET /api/finance/clients/[id]`
  ahora usan patrón `canonical first + live fallback`.
- Fuente primaria nueva:
  - `greenhouse_conformed.crm_companies`
  - `greenhouse_conformed.crm_deals`
  - `greenhouse.client_service_modules`
- Compatibilidad conservada:
  - si una compañía o deal todavía no alcanzó a proyectarse por `Source Sync Runtime Projections`, el consumer cae a `hubspot_crm.companies` / `hubspot_crm.deals`
  - esto protege el flujo live donde HubSpot promociona un lead/empresa a cliente y Greenhouse lo crea en tiempo real
- Regla operativa derivada:
  - no cortar consumers a sync-only cuando el dominio todavía depende de provisioning live
  - el patrón correcto de transición es `canonical first, live fallback`, no `raw only` ni `projection only`

## Delta 2026-03-15 Admin project scope consumers now prefer delivery projections
- `Admin > tenant detail` y `Admin > user detail` ya no dependen solo de `notion_ops.proyectos` para resolver nombres de proyecto en scopes.
- Los consumers:
  - `src/lib/admin/get-admin-tenant-detail.ts`
  - `src/lib/admin/get-admin-user-detail.ts`
  ahora priorizan `greenhouse_conformed.delivery_projects.project_name`.
- `notion_ops.proyectos` queda temporalmente solo como fallback y para `page_url`, porque ese campo todavía no vive en `delivery_projects`.
- Regla derivada:
  - cuando la proyección canónica ya resuelve el nombre operativo, usarla primero
  - mantener source fallback solo para campos que aún no se materializan en el projection

## Delta 2026-03-15 Projects consumers now prefer delivery metadata first
- `Projects` ya no depende solo de `notion_ops.proyectos` y `notion_ops.sprints` para metadata base.
- Los consumers:
  - `src/lib/projects/get-projects-overview.ts`
  - `src/lib/projects/get-project-detail.ts`
  ahora priorizan:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_sprints`
- Alcance de este corte:
  - `project_name`, `project_status`, `start_date`, `end_date`
  - `sprint_name`, `sprint_status`, `start_date`, `end_date`
- Boundary vigente:
  - `notion_ops.tareas` sigue siendo necesario para métricas finas de tarea (`rpa`, reviews, blockers, frame comments)
  - `notion_ops.proyectos` sigue aportando `page_url` y `summary`
  - `notion_ops.sprints` sigue aportando `page_url` y fallback operativo
- Regla derivada:
  - mover primero metadata estructural a `delivery_*`
  - dejar el cálculo fino en legacy hasta que esos campos también estén proyectados de forma canónica

## Delta 2026-03-15 HubSpot contacts + owners projected into canonical sync model
- `Source Sync Runtime Projections` ya materializa contactos CRM en:
  - `greenhouse_conformed.crm_contacts`
  - `greenhouse_crm.contacts`
- El slice respeta la boundary canónica acordada:
  - solo entran contactos asociados a compañías que ya pertenecen al universo Greenhouse
  - el sync modela y reconcilia CRM contacts, pero no auto-provisiona nuevos `client_users`
  - la provisión de acceso sigue siendo responsabilidad de la integración/admin live de HubSpot -> Greenhouse
- Reconciliación activa para `HubSpot Contact -> client_user / identity_profile`:
  - preferencia por `user-hubspot-contact-<contact_id>`
  - luego source link explícito
  - luego email único dentro del tenant
  - si existe user runtime enlazado y no hay profile todavía, el sync crea `profile-hubspot-contact-<contact_id>` y fija el bridge canónico
- `HubSpot Owner -> Collaborator / User` ya queda proyectado usando `greenhouse.team_members.hubspot_owner_id`:
  - `owner_member_id` queda poblado en `crm_companies`, `crm_deals` y `crm_contacts`
  - `owner_user_id` se resuelve cuando el colaborador también tiene principal en `greenhouse_core.client_users`
  - además se sincronizan source links reutilizables en `greenhouse_core`:
    - `entity_source_links` `member <- hubspot owner`
    - `entity_source_links` `user <- hubspot owner`
    - `identity_profile_source_links` `identity_profile <- hubspot owner`
- Estado validado después de rerun completo:
  - BigQuery conformed `crm_contacts = 63`
  - PostgreSQL runtime `greenhouse_crm.contacts = 63`
  - contactos con `linked_user_id = 29`
  - contactos con `linked_identity_profile_id = 29`
  - `identity_profile_source_links` HubSpot contact = `29`
  - `entity_source_links` HubSpot contact -> user = `29`
  - `crm_contacts.owner_member_id = 63`
  - `crm_contacts.owner_user_id = 61`
  - PostgreSQL runtime owner coverage:
    - companies: `owner_member_id = 9`, `owner_user_id = 9`
    - deals: `owner_member_id = 21`, `owner_user_id = 21`
  - source links de owner:
    - `member <- hubspot owner = 6`
    - `user <- hubspot owner = 1`
    - `identity_profile <- hubspot owner = 6`
- Regla operativa derivada:
  - no pedirle a la integración live que escriba directo a BigQuery
  - el source sync es quien replica a `raw` / `conformed`
  - la integración live sigue siendo la pieza de provisioning y reconciliación de accesos
  - la cobertura actual de `owner -> user` depende de cuántos colaboradores internos ya tengan principal en `client_users`; hoy solo `Julio` quedó resuelto en esa capa

## Delta 2026-03-15 Space model added to canonical 360 and delivery projections
- `greenhouse_core.spaces` y `greenhouse_core.space_source_bindings` ya existen en Cloud SQL como nuevo boundary operativo del 360.
- Regla arquitectónica ya documentada y aplicada:
  - `client` = boundary comercial
  - `space` = workspace operativo para Agency, delivery e ICO metrics
- `space-efeonce` ya no depende solo de ser un pseudo-cliente legacy:
  - vive como `internal_space`
  - `client_id = null`
  - conserva binding operativo a `project_database_source_id`
- `greenhouse_serving.space_360` ya expone el nuevo shape canónico.
- `Source Sync Runtime Projections` ahora publica `space_id` en:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_conformed.delivery_sprints`
  - `greenhouse_delivery.projects`
  - `greenhouse_delivery.tasks`
  - `greenhouse_delivery.sprints`
- Estado validado:
  - `greenhouse_core.spaces = 11`
  - `client_space = 10`
  - `internal_space = 1`
  - `space_source_bindings = 69`
  - PostgreSQL delivery con `space_id`:
    - projects `57/59`
    - tasks `961/1173`
    - sprints `11/13`
  - BigQuery conformed delivery con `space_id`:
    - projects `57/59`
    - tasks `961/1173`
    - sprints `11/13`
- Transitional boundary que sigue viva:
  - el seed de `spaces` todavía nace desde `greenhouse.clients.notion_project_ids`
  - el target ya no es ese array, sino `space -> project_database_source_id`
- También se endureció la capa de acceso PostgreSQL:
  - `setup-postgres-access.sql` ahora intenta normalizar ownership de `greenhouse_core`, `greenhouse_serving` y `greenhouse_sync` hacia `greenhouse_migrator`
  - cuando un objeto legacy no puede transferirse, el script continúa con `NOTICE` en vez de bloquear toda la evolución del backbone

## Delta 2026-03-15 Data model master and source-sync runtime seed
- Se agregó la fuente de verdad del modelo de datos actual en:
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- Se agregó la guía operativa para evolucionar ese documento en:
  - `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`
- `AGENTS.md` y `docs/README.md` ya apuntan a ambos documentos cuando el trabajo toca modelado de datos, source sync, PostgreSQL o BigQuery.
- `Source Sync Runtime Projections` quedó ejecutado con datos reales:
  - BigQuery conformed:
    - `delivery_projects = 59`
    - `delivery_sprints = 13`
    - `delivery_tasks = 1173`
    - `crm_companies = 628`
    - `crm_deals = 178`
  - PostgreSQL runtime projections:
    - `greenhouse_delivery.projects = 59`
    - `greenhouse_delivery.sprints = 13`
    - `greenhouse_delivery.tasks = 1173`
    - `greenhouse_crm.companies = 9`
    - `greenhouse_crm.deals = 25`
- Regla 360 explicitada y ya aplicada al runtime:
  - `HubSpot Company` solo entra a `greenhouse_crm` si ya pertenece al universo de clientes Greenhouse
  - `raw` y `conformed` pueden conservar universo fuente completo
  - `greenhouse_crm` runtime mantiene solo companias cliente y sus relaciones comerciales relevantes
- `HubSpot Contacts` quedó declarado como slice obligatorio siguiente del modelo:
  - `HubSpot Contact -> client_user / identity_profile`
  - solo contactos asociados a companias cliente deben entrar al runtime Greenhouse
- Delivery quedó modelado con soporte explícito para:
  - `project_database_source_id`
  - binding tenant-level futuro del workspace de delivery en Notion

## Delta 2026-03-15 PostgreSQL access model and tooling
- Se formalizó la capa de acceso escalable a Cloud SQL en:
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `AGENTS.md` ya documenta explícitamente cómo acceder y operar PostgreSQL para evitar que otros agentes vuelvan a usar el perfil incorrecto.
- Greenhouse ahora separa explícitamente tres perfiles operativos de PostgreSQL:
  - `runtime`
  - `migrator`
  - `admin`
- Nuevas variables documentadas:
  - `GREENHOUSE_POSTGRES_MIGRATOR_USER`
  - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD`
  - `GREENHOUSE_POSTGRES_ADMIN_USER`
  - `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`
- Nuevo tooling operativo:
  - `pnpm setup:postgres:access`
  - `pnpm pg:doctor`
- Scripts de setup y backfill PostgreSQL ahora cargan env local de forma consistente y pueden elegir perfil antes de abrir la conexión.
- Regla operativa derivada:
  - runtime del portal usa solo credenciales `runtime`
  - bootstrap de acceso usa `admin`
  - setup y migraciones de dominio deben correr con `migrator`
- Estado validado en Cloud SQL:
  - `greenhouse_runtime` existe y `greenhouse_app` es miembro
  - `greenhouse_migrator` existe y `greenhouse_migrator_user` es miembro
  - `greenhouse_hr`, `greenhouse_payroll` y `greenhouse_finance` ya exponen grants consumibles por ambos roles
- Alcance de esta pasada:
  - no se cambió el runtime funcional de `Payroll`
  - se dejó la fundación para que los siguientes cortes de dominio no dependan de grants manuales repetidos

## Delta 2026-03-15 Finance PostgreSQL first slice
- Se materializó el primer slice operacional de `Finance` sobre PostgreSQL en `greenhouse-pg-dev / greenhouse_app`.
- Nuevo schema operativo:
  - `greenhouse_finance`
- Objetos materializados:
  - `greenhouse_finance.accounts`
  - `greenhouse_finance.suppliers`
  - `greenhouse_finance.exchange_rates`
  - `greenhouse_serving.provider_finance_360`
- Se agregó el repository `src/lib/finance/postgres-store.ts` con validación de infraestructura, writes y lecturas `Postgres first`.
- Rutas ya cortadas o semi-cortadas a PostgreSQL:
  - `GET /api/finance/accounts`
  - `POST /api/finance/accounts`
  - `PUT /api/finance/accounts/[id]`
  - `GET /api/finance/exchange-rates`
  - `POST /api/finance/exchange-rates`
  - `GET /api/finance/exchange-rates/latest`
  - `GET/POST /api/finance/exchange-rates/sync`
  - `GET /api/finance/expenses/meta` para el subset de cuentas
- Se ejecutó backfill inicial desde BigQuery:
  - `accounts`: `1`
  - `suppliers`: `2`
  - `exchange_rates`: `0`
- Alineación 360 aplicada:
  - `suppliers.provider_id` referencia `greenhouse_core.providers`
  - el backfill de suppliers también materializa providers canónicos tipo `financial_vendor`
  - `greenhouse_serving.provider_finance_360` expone la relación `provider -> supplier`
- Permisos estructurales corregidos en Cloud SQL:
  - `greenhouse_app` recibió `USAGE` sobre `greenhouse_core`, `greenhouse_sync` y `greenhouse_serving`
  - `greenhouse_app` recibió `SELECT, REFERENCES` sobre tablas de `greenhouse_core`
  - `greenhouse_app` recibió `SELECT, INSERT, UPDATE, DELETE` sobre tablas de `greenhouse_sync`
- Boundary vigente:
  - `accounts` y `exchange_rates` ya tienen store operativo PostgreSQL
  - `suppliers` quedó materializado y backfilleado en PostgreSQL, pero el runtime principal todavía no se corta ahí para no romper `AI Tooling`, que sigue leyendo `greenhouse.fin_suppliers` en BigQuery
  - dashboards y reporting financiero pesado siguen en BigQuery por ahora

## Delta 2026-03-15 Source sync foundation materialized
- Se ejecutó el primer slice técnico del blueprint de sync externo sobre PostgreSQL y BigQuery.
- Scripts nuevos agregados:
  - `pnpm setup:postgres:source-sync`
  - `pnpm setup:bigquery:source-sync`
- En PostgreSQL (`greenhouse-pg-dev / greenhouse_app`) quedaron materializados:
  - schemas:
    - `greenhouse_crm`
    - `greenhouse_delivery`
  - tablas de control:
    - `greenhouse_sync.source_sync_runs`
    - `greenhouse_sync.source_sync_watermarks`
    - `greenhouse_sync.source_sync_failures`
  - tablas de proyección inicial:
    - `greenhouse_crm.companies`
    - `greenhouse_crm.deals`
    - `greenhouse_delivery.projects`
    - `greenhouse_delivery.sprints`
    - `greenhouse_delivery.tasks`
- En BigQuery (`efeonce-group`) quedaron materializados:
  - datasets:
    - `greenhouse_raw`
    - `greenhouse_conformed`
    - `greenhouse_marts`
  - raw snapshots:
    - `notion_projects_snapshots`
    - `notion_tasks_snapshots`
    - `notion_sprints_snapshots`
    - `notion_people_snapshots`
    - `notion_databases_snapshots`
    - `hubspot_companies_snapshots`
    - `hubspot_deals_snapshots`
    - `hubspot_contacts_snapshots`
    - `hubspot_owners_snapshots`
    - `hubspot_line_items_snapshots`
  - conformed current-state tables:
    - `delivery_projects`
    - `delivery_tasks`
    - `delivery_sprints`
    - `crm_companies`
    - `crm_deals`
- Regla operativa derivada:
  - el siguiente paso ya no es “crear estructura”, sino construir jobs de ingestión/backfill que llenen `raw`, materialicen `conformed` y proyecten `greenhouse_crm` / `greenhouse_delivery`

## Delta 2026-03-15 External source sync blueprint
- Se agregó `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` para formalizar cómo Greenhouse debe desacoplar cálculos y runtime de `Notion` y `HubSpot`.
- Dirección operativa definida:
  - `Notion` y `HubSpot` quedan como `source systems`
  - `BigQuery raw` guarda el backup inmutable y replayable
  - `BigQuery conformed` normaliza entidades externas
  - `PostgreSQL` recibe solo proyecciones runtime-críticas para cálculos y pantallas operativas
  - `BigQuery marts` mantiene analítica, 360 e histórico
- Datasets y schemas objetivo explícitos:
  - BigQuery:
    - `greenhouse_raw`
    - `greenhouse_conformed`
    - `greenhouse_marts`
  - PostgreSQL:
    - `greenhouse_crm`
    - `greenhouse_delivery`
    - `greenhouse_sync.source_sync_runs`
    - `greenhouse_sync.source_sync_watermarks`
    - `greenhouse_sync.source_sync_failures`
- Regla operativa derivada:
  - ningún cálculo crítico del portal debe seguir leyendo APIs live de `Notion` o `HubSpot` en request-time
  - el raw externo se respalda en BigQuery y el subset operativo se sirve desde PostgreSQL

## Delta 2026-03-15 HR leave preview rollout hardening
- El cutover de `HR > Permisos` a PostgreSQL en `Preview` quedó endurecido con fallback operativo a BigQuery para evitar que la vista completa falle si Cloud SQL no está disponible.
- El slice de `leave` ahora puede caer controladamente al path legacy para:
  - metadata
  - balances
  - requests
  - create/review
- Regla operativa derivada:
  - una rama `Preview` que use Cloud SQL connector debe tener el service account de `GOOGLE_APPLICATION_CREDENTIALS_JSON` con `roles/cloudsql.client`
  - sin ese rol, el error esperable es `cloudsql.instances.get` / `boss::NOT_AUTHORIZED`
- Este fallback no cambia la dirección arquitectónica:
  - PostgreSQL sigue siendo el store objetivo del dominio
  - BigQuery queda como red de seguridad temporal mientras se estabiliza el rollout por ambiente

## Delta 2026-03-15 HR leave runtime cutover to PostgreSQL
- `HR > Permisos` se convirtió en el primer dominio operativo del portal que ya usa PostgreSQL en runtime sobre la instancia `greenhouse-pg-dev`.
- Se agregó el dominio `greenhouse_hr` en Cloud SQL con:
  - `leave_types`
  - `leave_balances`
  - `leave_requests`
  - `leave_request_actions`
- El slice migrado ahora resuelve identidad desde el backbone canónico:
  - `greenhouse_core.client_users`
  - `greenhouse_core.members`
- Rutas que ahora prefieren PostgreSQL cuando el ambiente está configurado:
  - `GET /api/hr/core/meta`
  - `GET /api/hr/core/leave/balances`
  - `GET /api/hr/core/leave/requests`
  - `GET /api/hr/core/leave/requests/[requestId]`
  - `POST /api/hr/core/leave/requests`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
- El resto de `HR Core` dejó de ejecutar `DDL` en request-time:
  - `ensureHrCoreInfrastructure()` queda como bootstrap explícito
  - runtime usa `assertHrCoreInfrastructureReady()` como validación no mutante
- Provisioning ejecutado en datos:
  - bootstrap único de `greenhouse_hr` en Cloud SQL
  - bootstrap único de `scripts/setup-hr-core-tables.sql` en BigQuery para dejar `HR Core` listo fuera del request path
- Infra compartida:
  - `src/lib/google-credentials.ts` centraliza las credenciales GCP para BigQuery, Cloud SQL connector y media storage
- Configuración Preview:
  - la rama `fix/codex-operational-finance` ya tiene env vars de PostgreSQL en Vercel Preview para este corte
- Boundary vigente:
  - sólo `HR > Permisos` quedó cortado a PostgreSQL
  - `departamentos`, `member profile` y `attendance` siguen en BigQuery, pero ya sin bootstraps mutantes en navegación normal

## Delta 2026-03-15 Data platform architecture and Cloud SQL foundation
- Se agregó la arquitectura de datos objetivo en:
  - `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- La dirección formal del stack queda declarada como:
  - `PostgreSQL` para `OLTP` y workflows mutables
  - `BigQuery` para `raw`, `conformed`, `core analytics` y `marts`
- Se provisionó la primera base operacional de referencia en Google Cloud:
  - proyecto: `efeonce-group`
  - instancia Cloud SQL: `greenhouse-pg-dev`
  - motor: `POSTGRES_16`
  - región: `us-east4`
  - tier: `db-custom-1-3840`
  - storage: `20 GB SSD`
  - base inicial: `greenhouse_app`
  - usuario inicial: `greenhouse_app`
- Secretos creados en Secret Manager:
  - `greenhouse-pg-dev-postgres-password`
  - `greenhouse-pg-dev-app-password`
- Boundary vigente:
  - la app todavía no está conectada a Postgres en runtime
  - esta pasada deja lista la fundación de infraestructura y el backbone canónico 360, no el cutover runtime
  - la integración de aplicación debe hacerse vía repository/services, no con rewrites directos módulo por módulo contra Cloud SQL
- Materialización ejecutada sobre la instancia:
  - esquemas:
    - `greenhouse_core`
    - `greenhouse_serving`
    - `greenhouse_sync`
  - vistas 360:
    - `client_360`
    - `member_360`
    - `provider_360`
    - `user_360`
    - `client_capability_360`
  - tabla de publicación:
    - `greenhouse_sync.outbox_events`
- Scripts operativos agregados:
  - `pnpm setup:postgres:canonical-360`
  - `pnpm backfill:postgres:canonical-360`
- Backfill inicial ejecutado desde BigQuery hacia Postgres:
  - `clients`: `11`
  - `identity_profiles`: `9`
  - `identity_profile_source_links`: `29`
  - `client_users`: `39`
  - `members`: `7`
  - `providers`: `8` canónicos sobre `11` filas origen, por deduplicación real de `provider_id`
  - `service_modules`: `9`
  - `client_service_modules`: `30`
  - `roles`: `8`
  - `user_role_assignments`: `40`
- Variables nuevas documentadas:
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
  - `GREENHOUSE_POSTGRES_IP_TYPE`
  - `GREENHOUSE_POSTGRES_HOST`
  - `GREENHOUSE_POSTGRES_PORT`
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD`
  - `GREENHOUSE_POSTGRES_MAX_CONNECTIONS`
  - `GREENHOUSE_POSTGRES_SSL`
  - `GREENHOUSE_BIGQUERY_DATASET`
  - `GREENHOUSE_BIGQUERY_LOCATION`

## Delta 2026-03-15 Finance exchange-rate sync persistence
- `Finance` ahora tiene hidratación automática server-side de `USD/CLP` para evitar que ingresos/egresos en USD dependan de carga manual previa.
- Proveedores activos para tipo de cambio:
  - primario: `mindicador.cl`
  - fallback: `open.er-api.com`
- Superficie backend agregada:
  - `POST /api/finance/exchange-rates/sync`
    - uso interno autenticado por sesión `finance_manager`
    - también admite acceso interno por cron
  - `GET /api/finance/exchange-rates/sync`
    - pensado para `Vercel Cron`
  - `GET /api/finance/exchange-rates/latest`
    - ahora intenta hidratar y persistir si no existe ninguna tasa `USD -> CLP` almacenada
- Persistencia operativa:
  - se guardan ambos pares por fecha:
    - `USD -> CLP`
    - `CLP -> USD`
  - la tabla sigue siendo `greenhouse.fin_exchange_rates`
  - el `rate_id` sigue siendo determinístico: `${fromCurrency}_${toCurrency}_${rateDate}`
- Ajuste de runtime:
  - `resolveExchangeRateToClp()` ahora puede auto-hidratar `USD/CLP` antes de fallar cuando no encuentra snapshot almacenado
- Deploy/configuración:
  - se agregó `vercel.json` con cron diario hacia `/api/finance/exchange-rates/sync`
  - nueva variable opcional: `CRON_SECRET`
- Regla operativa derivada:
  - frontend no debe intentar resolver tipo de cambio desde cliente ni depender de input manual cuando el backend ya puede hidratar la tasa del día

## Delta 2026-03-14 Portal surface consolidation task
- Se documentó una task `to-do` específica para consolidación UX y arquitectura de surfaces del portal:
  - `docs/tasks/to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md`
- La task no propone cambios de código inmediatos.
- Su objetivo es resolver con criterio explícito:
  - qué vistas son troncales
  - qué vistas se unifican
  - qué vistas se enriquecen
  - qué vistas deben pasar a tabs, drilldowns o redirects
- Regla operativa derivada:
  - no seguir abriendo rutas nuevas por módulo sin revisar antes esta consolidación de surfaces

## Delta 2026-03-14 People + Team capacity backend complements
- `People v3` y `Team Identity & Capacity v2` ya no dependen solo de contratos mínimos heredados.
- Complementos backend activos:
  - `GET /api/people/meta`
  - `GET /api/people` ahora también devuelve `filters`
  - `GET /api/people/[memberId]` ahora puede devolver `capacity` y `financeSummary`
  - `GET /api/team/capacity` ahora devuelve semántica explícita de capacidad por miembro y por rol
- Regla operativa derivada:
  - frontend no debe inferir salud de capacidad desde `FTE` o `activeAssets` si el backend ya devuelve `capacityHealth`
  - frontend de `People` debe usar `meta`, `capacity` y `financeSummary` como contratos canónicos de lectura 360

## Delta 2026-03-14 Team Identity & People task reclassification
- `Team Identity & Capacity` y `People Unified View v2` fueron contrastadas explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `FINANCE_CANONICAL_360_V1.md` en el caso de `People`
- Resultado operativo:
  - `People` sí está alineado con arquitectura y sí existe como módulo real
  - `People v2` ya debe tratarse como brief histórico porque el runtime avanzó más allá de su contexto original
  - `Team Identity & Capacity` sí cerró la base canónica de identidad sobre `team_members.member_id`
  - la parte de capacidad no debe tratarse todavía como cerrada
- Regla operativa derivada:
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md` queda como brief histórico
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v3.md` queda como cierre fundacional de la surface
  - `docs/tasks/to-do/CODEX_TASK_People_360_Enrichments_v1.md` pasa a ser la task vigente para enrichments 360 del colaborador
  - `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` queda como brief histórico/fundacional
  - `docs/tasks/to-do/CODEX_TASK_Team_Identity_Capacity_System_v2.md` pasa a ser la task vigente para formalización de capacity

## Delta 2026-03-14 Creative Hub task reclassification
- `Creative Hub` fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_SERVICE_MODULES_V1.md`
  - `Greenhouse_Capabilities_Architecture_v1.md`
- Resultado operativo:
  - el módulo sí está alineado estructuralmente con arquitectura
  - `Creative Hub` sigue siendo una capability surface, no un objeto canónico nuevo
  - el cliente canónico sigue anclado a `greenhouse.clients.client_id`
  - el brief original no debe tratarse como completamente implementado
- Gaps detectados en runtime:
  - activación demasiado amplia del módulo por `businessLine = globe`
  - ausencia real de la capa `Brand Intelligence`
  - `CSC Pipeline Tracker` soportado hoy con heurísticas, no con un modelo explícito de `fase_csc`
- Regla operativa derivada:
  - `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md` queda como brief histórico
  - `docs/tasks/to-do/CODEX_TASK_Creative_Hub_Module_v2.md` pasa a ser la task vigente para cierre runtime

## Delta 2026-03-14 Creative Hub backend runtime closure
- `Creative Hub v2` ya no depende solo del snapshot genérico de `Capabilities`; ahora tiene backend propio de enriquecimiento creativo para cerrar los gaps detectados.
- Complementos backend agregados:
  - `resolveCapabilityModules()` ahora exige match de `business line` y `service module` cuando ambos requisitos existen
  - `creative-hub` ya soporta activación por:
    - `agencia_creativa`
    - `produccion_audiovisual`
    - `social_media_content`
  - `src/lib/capability-queries/creative-hub-runtime.ts` agrega snapshot detallado de tareas con:
    - fase CSC explícita o derivada
    - aging real
    - FTR/RpA reales cuando existen columnas soporte
- Superficie runtime cerrada para frontend:
  - `GET /api/capabilities/creative-hub/data` ahora devuelve también:
    - sección `Brand Intelligence`
    - pipeline CSC por fase real
    - stuck assets calculados por tarea/fase
- Boundary vigente:
  - `Creative Hub` sigue siendo capability surface dentro de `Capabilities`
  - no crea objeto canónico paralelo de capability, asset o proyecto

## Delta 2026-03-14 HR core backend foundation
- `HR Core Module` fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Resultado operativo:
  - `Collaborator` sigue anclado a `greenhouse.team_members.member_id`
  - `Admin Team` mantiene ownership del roster base
  - `People` sigue siendo la vista read-first del colaborador
  - `HR Core` queda como capa de extensión para estructura org, perfil HR, permisos, asistencia y acciones de aprobación
- Infraestructura backend agregada:
  - `ensureHrCoreInfrastructure()` extiende `team_members` con:
    - `department_id`
    - `reports_to`
    - `job_level`
    - `hire_date`
    - `contract_end_date`
    - `daily_required`
  - crea:
    - `greenhouse.departments`
    - `greenhouse.member_profiles`
    - `greenhouse.leave_types`
    - `greenhouse.leave_balances`
    - `greenhouse.leave_requests`
    - `greenhouse.leave_request_actions`
    - `greenhouse.attendance_daily`
  - seed del rol `employee` con `route_group_scope = ['internal', 'employee']`
- Superficie backend activa:
  - `GET /api/hr/core/meta`
  - `GET/POST /api/hr/core/departments`
  - `GET/PATCH /api/hr/core/departments/[departmentId]`
  - `GET/PATCH /api/hr/core/members/[memberId]/profile`
  - `GET /api/hr/core/leave/balances`
  - `GET/POST /api/hr/core/leave/requests`
  - `GET /api/hr/core/leave/requests/[requestId]`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
  - `GET /api/hr/core/attendance`
  - `POST /api/hr/core/attendance/webhook/teams`
- Ajuste de identidad/acceso:
  - `tenant/access.ts` y `tenant/authorization.ts` ya reconocen `employee` como route group válido
- Variable nueva:
  - `HR_CORE_TEAMS_WEBHOOK_SECRET` para proteger la ingesta externa de asistencia

## Delta 2026-03-14 AI tooling backend foundation
- `AI Tooling & Credit System` fue contrastada explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `FINANCE_CANONICAL_360_V1.md`
- Resultado operativo:
  - la task sí quedó alineada con arquitectura
  - `greenhouse.clients.client_id` sigue siendo el ancla canónica de cliente para wallets y ledger
  - `greenhouse.team_members.member_id` sigue siendo el ancla canónica de colaborador para licencias y consumos atribuibles
  - `greenhouse.providers.provider_id` ya existe en runtime como registro reusable de vendor/plataforma
  - `ai_tool_catalog`, `member_tool_licenses`, `ai_credit_wallets` y `ai_credit_ledger` quedan como tablas de dominio, no como identidades paralelas
- Infraestructura backend agregada:
  - `ensureAiToolingInfrastructure()` crea on-demand:
    - `greenhouse.providers`
    - `greenhouse.ai_tool_catalog`
    - `greenhouse.member_tool_licenses`
    - `greenhouse.ai_credit_wallets`
    - `greenhouse.ai_credit_ledger`
  - `scripts/setup-ai-tooling-tables.sql` queda como referencia SQL versionada del mismo bootstrap
- Superficie backend activa:
  - operación:
    - `GET /api/ai-tools/catalog`
    - `GET /api/ai-tools/licenses`
  - créditos:
    - `GET /api/ai-credits/wallets`
    - `GET /api/ai-credits/ledger`
    - `GET /api/ai-credits/summary`
    - `POST /api/ai-credits/consume`
    - `POST /api/ai-credits/reload`
  - admin:
    - `GET /api/admin/ai-tools/meta`
    - `GET/POST /api/admin/ai-tools/catalog`
    - `GET/PATCH /api/admin/ai-tools/catalog/[toolId]`
    - `GET/POST /api/admin/ai-tools/licenses`
    - `GET/PATCH /api/admin/ai-tools/licenses/[licenseId]`
    - `GET/POST /api/admin/ai-tools/wallets`
    - `GET/PATCH /api/admin/ai-tools/wallets/[walletId]`
- Regla operativa derivada:
  - frontend de AI Tooling no debe inventar catálogo, providers, enums ni balance derivado si el backend ya entrega esos contratos

## Delta 2026-03-14 Admin team backend complements
- `Admin Team Module v2` fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Resultado operativo:
  - la task sigue alineada con arquitectura
  - `Admin Team` mantiene ownership de las mutaciones de roster y asignaciones
  - `People` sigue siendo read-first y no incorpora writes
  - `team_members.member_id` sigue siendo el ancla canónica del colaborador
- Complementos backend agregados para cerrar mejor el módulo:
  - `GET /api/admin/team/members` ahora devuelve metadata + `members` + `summary`
  - `GET /api/admin/team/members/[memberId]`
  - `GET /api/admin/team/assignments`
  - `GET /api/admin/team/assignments/[assignmentId]`
- Ajuste de alineación con identidad:
  - `Admin Team` puede seguir guardando snapshots útiles en `team_members`
  - cuando el colaborador ya tiene `identity_profile_id`, el backend ahora sincroniza best-effort `azureOid`, `notionUserId` y `hubspotOwnerId` hacia `greenhouse.identity_profile_source_links`

## Delta 2026-03-14 HR payroll v3 backend complements
- `HR Payroll v3` ya fue contrastado explícitamente contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- Resultado operativo:
  - la `v3` sí está alineada con arquitectura
  - `Payroll` sigue owning `compensation_versions`, `payroll_periods` y `payroll_entries`
  - el colaborador sigue anclado a `greenhouse.team_members.member_id`
  - no se movieron writes hacia `People` ni `Admin`
- Complementos backend agregados para desbloquear frontend:
  - `GET /api/hr/payroll/compensation` ahora devuelve `compensations`, `eligibleMembers`, `members` y `summary`
  - `GET /api/hr/payroll/compensation/eligible-members`
  - `GET /api/hr/payroll/periods` ahora devuelve `periods` + `summary`
  - `GET /api/hr/payroll/periods/[periodId]/entries` ahora devuelve `entries` + `summary`
  - `GET /api/hr/payroll/members/[memberId]/history` ahora incluye `member` además de `entries` y `compensationHistory`
- Regla operativa derivada:
  - frontend de `HR Payroll` debe consumir estos contratos como source of truth y no recomputar discovery de colaboradores o KPIs agregados si el backend ya los expone

## Delta 2026-03-14 Finance backend runtime closure
- `Finance` ya no debe tratarse solo como dashboard + CRUD parcial; ahora también expone una capa backend de soporte operativo para que frontend cierre conciliación y egresos especializados sin inventar contratos.
- Superficie backend agregada o endurecida:
  - `GET /api/finance/reconciliation/[id]/candidates`
  - `POST /api/finance/reconciliation/[id]/exclude`
  - `GET /api/finance/expenses/meta`
  - `GET /api/finance/expenses/payroll-candidates`
  - `POST /api/finance/expenses` ahora también acepta campos especializados de previsión, impuestos y varios
- Regla operativa vigente:
  - conciliación sigue siendo ownership de `Finance`; los writes siguen viviendo en `fin_reconciliation_periods`, `fin_bank_statement_rows`, `fin_income` y `fin_expenses`
  - la integración con `Payroll` sigue siendo read-only desde `Finance`; la nueva superficie de payroll candidates no convierte a `Finance` en source of truth de nómina
  - los contratos nuevos siguen anclados a `client_id` y `member_id` cuando corresponde
- Ajuste de consistencia relevante:
  - `auto-match`, `match`, `unmatch` y `exclude` ya no pueden dejar desacoplado el estado entre la fila bancaria y la transacción financiera reconciliada

## Delta 2026-03-14 Task board reorganization
- `docs/tasks/` ya no debe leerse como una carpeta plana de briefs.
- Regla operativa nueva:
  - las `CODEX_TASK_*` se ordenan en paneles `in-progress`, `to-do` y `complete`
  - `docs/tasks/README.md` es la vista maestra del board y la única entrada obligatoria para entender estado vigente de tasks
  - `complete` puede incluir tasks implementadas, absorbidas por una v2 o mantenidas como referencia histórica cerrada
- Regla de versionado nueva:
  - los briefs `CODEX_TASK_*` vigentes del proyecto deben vivir dentro de `docs/tasks/**`
  - el patrón ignorado `CODEX_TASK_*.md` ya no debe ocultar los documentos bajo `docs/tasks/`; queda reservado solo para scratch local en raíz
- Restricción operativa nueva:
  - mover una task entre paneles requiere contraste con repo real + `project_context.md` + `Handoff.md` + `changelog.md`, no solo intuición

## Delta 2026-03-14 Provider canonical object alignment
- La arquitectura 360 ya no debe tratar `provider`, `vendor` o `supplier` como conceptos intercambiables.
- Regla operativa nueva:
  - `Provider` pasa a reconocerse como objeto canónico objetivo para vendors/plataformas reutilizables entre AI Tooling, Finance, Identity y Admin
  - ancla recomendada: `greenhouse.providers.provider_id`
  - `fin_suppliers` debe tratarse como extensión financiera del Provider, no como identidad global del vendor
  - `vendor` libre puede existir como snapshot/display label, pero no como relación primaria cuando el vínculo de proveedor sea reusable entre módulos
- Impacto inmediato en diseño:
  - la task de `AI Tooling & Credit System` debe relacionar `ai_tool_catalog` con `provider_id`
  - futuras relaciones de licencias, wallets, costos y mapeos de identidad deben resolver contra `provider_id` cuando aplique

## Delta 2026-03-14 Greenhouse 360 object model
- El repo ahora formaliza una regla de arquitectura transversal: Greenhouse debe evolucionar como plataforma de `objetos canónicos enriquecidos`, no como módulos con identidades paralelas por silo.
- Documento canónico nuevo:
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- Regla operativa vigente:
  - si un módulo describe un objeto ya existente en Greenhouse, debe anclarse a su ID canónico
  - las tablas de dominio pueden existir, pero como `extension tables`, `transaction tables` o `event tables`, no como nuevos maestros del mismo objeto
  - las vistas 360 deben salir de read models enriquecidos sobre objetos compartidos
- Catálogo canónico actual explicitado:
  - `Cliente` → `greenhouse.clients.client_id`
  - `Colaborador` → `greenhouse.team_members.member_id`
  - `Producto/Capability` → `greenhouse.service_modules.module_id`
  - `Cotización`, `Proyecto` y `Sprint` quedan definidos como objetos canónicos objetivo aunque todavía necesiten mayor formalización de identidad en runtime

## Delta 2026-03-14 Finance canonical backend phase
- El módulo `Finance` mantiene sus tablas `fin_*` como capa transaccional propia, pero ya no debe modelarse como silo aislado:
  - `greenhouse.clients.client_id` queda como llave canónica de cliente
  - `greenhouse.team_members.member_id` queda como llave canónica de colaborador
  - `fin_client_profiles` actúa como extensión financiera del tenant, no como identidad primaria paralela
- Regla operativa vigente del backend financiero:
  - nuevas escrituras deben resolver referencias por `clientId` cuando sea posible
  - durante la transición se aceptan `clientProfileId` y `hubspotCompanyId`, pero el backend valida consistencia y responde `409` ante referencias incompatibles
  - egresos que vengan con `payrollEntryId` deben resolverse a `memberId` server-side
- Superficie backend relevante agregada o endurecida:
  - `src/lib/finance/canonical.ts` centraliza resolución cliente/persona
  - `GET /api/people/[memberId]/finance` agrega lectura financiera read-only para People sin introducir writes bajo `/api/people/*`
- Boundary de arquitectura:
  - `Finance` sigue owning cuentas, proveedores, tipos de cambio y conciliación
  - las vistas 360 deben salir de read-models enriquecidos, no de convertir `fin_*` en source of truth para roster o tenants

## Delta 2026-03-14 Admin team backend foundation
- El repo ya tiene la primera capa backend de escritura para `Admin Team Module v2` sobre rama de trabajo dedicada:
  - `src/lib/team-admin/mutate-team.ts`
  - `/api/admin/team/meta`
  - `/api/admin/team/members`
  - `/api/admin/team/members/[memberId]`
  - `/api/admin/team/members/[memberId]/deactivate`
  - `/api/admin/team/assignments`
  - `/api/admin/team/assignments/[assignmentId]`
- Regla operativa vigente:
  - `Admin Team` es la única capa de mutación de roster/asignaciones
  - `People` sigue siendo read-first y no debe incorporar writes bajo `/api/people/*`
  - todas las mutaciones nuevas se protegen con `requireAdminTenantContext()` y quedan reservadas a `efeonce_admin`
- Boundary de coordinación vigente:
  - Codex implementa backend de `Admin Team`
  - Claude implementa frontend de `Admin Team`
  - Claude puede avanzar en paralelo una vez exista el `mutation contract freeze` mínimo
- Ajuste de contrato para frontend:
  - `GET /api/admin/team/meta` expone metadata para drawers admin (`activeClients`, `roleCategories`, `contactChannels`)
  - `GET /api/admin/team/members` se mantiene como capability handshake compatible con la task para habilitar CTAs admin sin depender de `404/405`

## Delta 2026-03-14 People unified frontend
- Frontend completo de `People Unified View v2` implementado sobre los contratos backend:
  - `/people` → `PeopleList.tsx` (stats + filtros + tabla TanStack)
  - `/people/[memberId]` → `PersonView.tsx` (2 columnas: sidebar + tabs)
- Tabs dinamicos segun `detail.access.visibleTabs` del backend:
  - Asignaciones (read-only, ghost slot para futuro CRUD)
  - Actividad (3 KPI cards + breakdown por proyecto)
  - Compensacion (desglose vigente con seccion Chile condicional)
  - Nomina (chart ApexCharts + tabla detalle por periodo)
- Sidebar "Equipo > Personas" agregado al `VerticalMenu.tsx`:
  - visibilidad por `roleCodes`, no por route group
  - posicion: despues de Agencia, antes de HR
- Componentes reutilizables nuevos:
  - `CountryFlag.tsx` (banderas emoji por ISO alpha-2)
  - `IntegrationStatus.tsx` (check verde/gris por provider)
- La carpeta `views/greenhouse/people/drawers/` queda reservada para Admin Team Module (CRUD)

## Delta 2026-03-14 People unified backend foundation
- El repo ya tiene una primera capa backend read-only para `People Unified View`:
  - `GET /api/people`
  - `GET /api/people/[memberId]`
  - `src/lib/people/get-people-list.ts`
  - `src/lib/people/get-person-detail.ts`
  - `src/lib/people/get-person-operational-metrics.ts`
  - `src/types/people.ts`
- Regla operativa de acceso vigente:
  - `People` no introduce route group `people`
  - el backend valida `internal` y restringe por roles reales:
    - `efeonce_admin`
    - `efeonce_operations`
    - `hr_payroll`
- Regla operativa de arquitectura:
  - `People` es lectura consolidada, no CRUD
  - no se deben introducir writes bajo `/api/people/*`
  - el futuro `Admin Team Module` debe vivir bajo `/api/admin/team/*` y reutilizar la misma capa de datos
- Fuentes reales del backend `People`:
  - roster: `greenhouse.team_members`
  - assignments: `greenhouse.client_team_assignments`
  - identidad: `greenhouse.identity_profile_source_links`
  - actividad: `notion_ops.tareas`
  - HR: `greenhouse.compensation_versions` y `greenhouse.payroll_entries`
- Regla de modelado vigente:
  - usar `location_country`, no crear una columna redundante `country`
  - tratar `team_members.identity_profile_id` como identidad canonica de persona
  - tratar `client_users` como principal de acceso, no como ficha laboral
- Estado de integracion actual:
  - ya existen `/people` y `/people/[memberId]` en App Router
  - el sidebar ya expone `Personas`
  - el frontend consume el contrato backend consolidado
  - `pnpm build` ya incluye las dos rutas UI y las dos APIs del modulo
- Regla de acople frontend/backend:
  - el frontend no debe recalcular permisos de tabs desde la session si el backend ya entrega `access.visibleTabs`
  - el sidebar de persona debe usar `summary` del payload, no recomputar FTE u horas desde la tabla

## Delta 2026-03-14 HR payroll backend foundation
- El repo ya tiene una primera capa backend operativa de `HR Payroll` bajo el route group propio `hr`:
  - `src/app/(dashboard)/hr/layout.tsx`
  - `src/app/api/hr/payroll/**`
  - `src/lib/payroll/**`
  - `src/types/payroll.ts`
- La infraestructura de payroll no depende exclusivamente de una migración manual previa:
  - `ensurePayrollInfrastructure()` crea on-demand `greenhouse.compensation_versions`, `greenhouse.payroll_periods`, `greenhouse.payroll_entries` y `greenhouse.payroll_bonus_config`
  - el seed del rol `hr_payroll` también quedó incorporado en runtime y en SQL versionado
- Reglas backend vigentes del módulo:
  - solo períodos `draft` aceptan cambios de `uf_value`, `tax_table_version` o `notes`
  - la aprobación de nómina revalida server-side que los bonos respeten elegibilidad y rangos
  - la creación de `compensation_versions` ya no debe generar solapes de vigencia y distingue entre versiones actuales y futuras usando `effective_from` / `effective_to`
- Estado de validación actual:
  - `pnpm build`: correcto con las rutas `HR Payroll` incluidas
  - la validación runtime contra BigQuery real ya confirmó:
    - schema vivo de `notion_ops.tareas` con `responsables_ids`, `rpa`, `estado`, `last_edited_time`, `fecha_de_completado` y `fecha_límite`
    - bootstrap aplicado de `greenhouse.compensation_versions`, `greenhouse.payroll_periods`, `greenhouse.payroll_entries` y `greenhouse.payroll_bonus_config`
    - seed aplicado del rol `hr_payroll` en `greenhouse.roles`
- Ajuste operativo derivado del smoke real:
  - `fetch-kpis-for-period.ts` ya no debe asumir aliases sin acento como `fecha_limite`; en producción existen columnas acentuadas y deben citarse como identifiers escapados en SQL dinámico
  - el DDL versionado de payroll se endureció para no depender de `DEFAULT` literales en BigQuery, porque el runtime de la app ya setea esos valores explícitamente

## Delta 2026-03-14 GitHub collaboration hygiene
- El repo ahora incorpora una capa explicita de buenas practicas GitHub bajo `.github/`:
  - `workflows/ci.yml`
  - `PULL_REQUEST_TEMPLATE.md`
  - `ISSUE_TEMPLATE/bug_report.yml`
  - `ISSUE_TEMPLATE/feature_request.yml`
  - `ISSUE_TEMPLATE/config.yml`
  - `dependabot.yml`
  - `CODEOWNERS`
- La automatizacion minima esperada del repo queda formalizada:
  - `pnpm lint`
  - `pnpm build`
  - revision semanal de dependencias `npm` y GitHub Actions via Dependabot
- Se agregaron `.github/SECURITY.md` y `.github/SUPPORT.md` como documentos canonicos de reporte y soporte del repositorio.
- Regla operativa nueva:
  - Greenhouse es un repo `private` con licencia comercial declarada en `package.json`
  - no debe agregarse una licencia open source por defecto ni asumir permisos de redistribucion sin decision explicita de Efeonce
- Se removio la contradiccion de `.gitignore` respecto de `full-version/`; aunque siga siendo referencia local, hoy existe versionado en este workspace y no debe tratarse como artefacto ignorado.

## Delta 2026-03-14 Document structure reorganization
- La raiz documental del repo ya no debe usarse para mezclar specs, tasks y guias especializadas.
- Regla operativa vigente:
  - en raiz solo quedan `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `project_context.md`, `Handoff.md`, `Handoff.archive.md` y `changelog.md`
  - la documentacion canónica no operativa ahora vive en `docs/`
- Taxonomia activa:
  - `docs/architecture/`
  - `docs/api/`
  - `docs/ui/`
  - `docs/roadmap/`
  - `docs/operations/`
  - `docs/tasks/`
- `docs/README.md` es el mapa maestro y `docs/tasks/README.md` concentra el board de briefs `CODEX_TASK_*`.
- Estructura viva de tasks:
  - `docs/tasks/in-progress/`
  - `docs/tasks/to-do/`
  - `docs/tasks/complete/`

## Delta 2026-03-14 Agency data hydration correction
- La capa `agency` ya no debe asumir que toda la senal operativa vive solo en `notion_project_ids` ni filtrar `greenhouse.clients` por `tenant_type`.
  - `src/lib/agency/agency-queries.ts` ahora toma `clients.active = TRUE` como base canonica de spaces.
  - El inventario de proyectos agency se arma desde la union de:
    - `greenhouse.clients.notion_project_ids`
    - `greenhouse.user_project_scopes` via `greenhouse.client_users`
- Regla operativa nueva para `/agency/spaces`:
  - si un space tiene poca o nula senal en `notion_ops`, igual debe mostrar contexto util desde Greenhouse (`personas asignadas`, `FTE`, `usuarios`) y no quedar casi vacio.
- Regla operativa nueva para `/agency/capacity`:
  - la lista de capacidad debe reutilizar `TeamAvatar` y no un avatar ad-hoc, para heredar `avatarUrl` real y fallback cromatico consistente con el roster.

## Delta 2026-03-13 Agency operator layer
- El repo ahora tiene una primera capa agency para lectura ejecutiva interna a nivel transversal:
  - `/agency`
  - `/agency/spaces`
  - `/agency/capacity`
- Regla operativa de acceso:
  - hoy no existe un principal dedicado `agency`
  - la surface agency se habilita a usuarios `internal` o `admin` via `requireAgencyTenantContext()`
- La navegacion global ahora puede mostrar una seccion `Agencia` en `VerticalMenu` sin afectar el contrato cliente ni los flows de auth ya activos.
- La data agency sale de BigQuery real y no de mocks:
  - `greenhouse.clients`
  - `greenhouse.client_service_modules`
  - `greenhouse.service_modules`
  - `greenhouse.team_members`
  - `greenhouse.client_team_assignments`
  - `notion_ops.tareas`
  - `notion_ops.proyectos`
- Restriccion actual:
  - `/agency/spaces/[spaceId]` todavia no es una surface agency dedicada; redirige al dashboard del portal con `?space=<id>`
  - si se necesita una lectura agency por space mas profunda, debera implementarse como modulo posterior y no asumirse ya resuelto por esta iteracion

## Delta 2026-03-13 Pulse team view correction
- `Pulse` ya no debe tratar la seccion de equipo como una lectura primaria de capacidad operativa.
  - La surface del dashboard cliente ahora consume roster asignado (`getTeamMembers`) como fuente principal para `Tu equipo asignado`.
  - La columna derecha queda limitada a resumen contractual visible: FTE, horas, linea de servicio y modalidad.
- Regla operativa nueva para `Pulse`:
  - la Vista 1 (`Tu equipo asignado`) es roster-first y no depende de queries de carga operativa para renderizar
  - la Vista 2 (`Capacidad operativa`) queda fuera de la card principal y solo debe aparecer despues como detalle/expandible o en otra ubicacion
- El `view-as` admin del dashboard ahora tambien hidrata esta seccion server-side con roster del tenant para evitar errores por fetch cliente fuera del contexto `client`.

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
- Se implemento una primera capa real del task `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` dentro de este repo:
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
- El task `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` ya no debe asumirse contra columnas ficticias `responsable_*` en BigQuery.
  - La especificacion se alineo al contrato real verificado en `notion_ops.tareas`:
    - `responsables_names`
    - `responsables_ids`
    - `responsable_texto`
  - Los derivados operativos `responsable_nombre` y `responsable_notion_id` se resuelven en runtime desde esos campos.
- `/settings` ya no depende de `getDashboardOverview()` solo para el roster; consume el endpoint dedicado de equipo.
- `/dashboard` reemplaza la card legacy de capacity por una surface cliente que consume la API dedicada.
- `/proyectos/[id]` ahora incorpora una seccion `Equipo en este proyecto`.
- El repo no tenia `/sprints/[id]`; se habilito una primera ruta para hospedar `Velocity por persona` y enlazarla desde el detalle de proyecto.
- Cierre literal del task en UI:
  - Vista 1 ya no muestra FTE individual por persona
  - Vista 3 ya usa `AvatarGroup` + expandible tabular por persona
  - los semaforos visibles del modulo usan primitives basadas en `GH_COLORS.semaphore`
  - los textos visibles que faltaban en las 4 vistas se movieron a `GH_TEAM` / `GH_MESSAGES`

## Delta 2026-03-13 Preview auth hardening
- `src/lib/bigquery.ts` ahora acepta un fallback opcional `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` para evitar fallos de serializacion de secretos en Preview de Vercel.
- Si una Preview de branch necesita login funcional y el JSON crudo falla por quoting/escaping, la opcion preferida pasa a ser cargar `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` junto con `GCP_PROJECT`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL`.
- El repo ahora versiona una skill local para operaciones Vercel:
  - `.codex/skills/vercel-operations/SKILL.md`
  - cubre CLI, dominios protegidos, `promote`, `rollback`, env vars y el mapa operativo `Preview` / `Staging` / `Production` del proyecto
  - debe usarse como criterio operativo cuando el trabajo requiera verificar previews, dominios custom o promociones entre ambientes
- Regla operativa adicional para previews OAuth:
  - si una branch preview necesita login real, no asumir que hereda los secrets de otra preview
  - cargar un bloque explicito `Preview (<branch>)` con `GCP_PROJECT`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
  - para pruebas humanas de Google SSO, preferir el dominio autorizado `pre-greenhouse.efeoncepro.com` sobre aliases estables de branch si esos aliases no fueron agregados en GCP como redirect URI

## Delta 2026-03-13 Branding lock and nav hydration
- El shell autenticado ahora debe inyectar la sesion inicial al `SessionProvider` para evitar flicker entre menu cliente e interno/admin durante la hidratacion.
- La capa de nomenclatura ya no debe mezclar portal cliente con internal/admin:
  - `GH_CLIENT_NAV` queda reservado para la navegacion cliente normada por `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
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
- `src/config/greenhouse-nomenclature.ts` tambien versiona `GH_INTERNAL_NAV`, pero solo como capa operativa para superficies `internal/admin`; no como parte del contrato del portal cliente definido en `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`.
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

## Delta 2026-03-13 Promote and deploy closeout
- La iniciativa de alineacion de nomenclatura + branding + media persistente ya quedo promovida a:
  - `develop`
  - `main`
- Estado actual de aliases Vercel confirmado al cierre:
  - `pre-greenhouse.efeoncepro.com` apunta al preview vigente del branch `fix/google-sso-develop-safe`
  - `dev-greenhouse.efeoncepro.com` apunta al deployment de `staging` generado desde `develop`
  - `greenhouse.efeoncepro.com` apunta al deployment productivo generado desde `main`
- Regla operativa ratificada:
  - si `pre-greenhouse` no refleja una rama activa, no asumir fallo de codigo; primero revisar `vercel inspect`, alias asignado y estado del ultimo deployment del branch
  - si Preview falla por duplicados `* (1).ts(x)`, `tsconfig.json` ya los excluye para que el deploy no quede atascado por copias accidentales del workspace

## Delta 2026-03-13 Capabilities runtime foundation
- La spec `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md` ya tiene una primera ejecucion real sobre el runtime actual del repo, sin volver al modelo legacy de resolver capabilities directo desde `greenhouse.clients`.
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
- Se agrego `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` como contrato canonico para separar `auth principal` de `canonical identity` en usuarios internos Efeonce.
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

## Delta 2026-03-13 Google SSO foundation
- El login ahora soporta tres flujos paralelos sobre `greenhouse.client_users`:
  - `credentials`
  - Microsoft Entra ID (`azure-ad` en NextAuth)
  - Google OAuth (`google` en NextAuth)
- `client_users` extiende el contrato de identidad con:
  - `google_sub`
  - `google_email`
- `/login` ahora agrega Google como CTA secundaria debajo de Microsoft y antes del divisor de credenciales.
- `/settings` ahora muestra el estado de vinculo de Microsoft y Google, y permite iniciar cualquiera de los dos enlaces SSO cuando la sesion actual entro por credenciales.
- Infra ya aplicada fuera del repo:
  - `greenhouse.client_users` ya expone `google_sub` y `google_email` en BigQuery real
  - el proyecto `efeonce-group` ya tiene creado el OAuth client `greenhouse-portal`
  - Vercel `greenhouse-eo` ya tiene `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` cargados en `Development`, `staging`, `Production`, `Preview (develop)` y `Preview (feature/google-sso)`
- Regla operativa ratificada para auth:
  - Google SSO, igual que Microsoft SSO, solo vincula principals ya existentes en `greenhouse.client_users`
  - `allowed_email_domains` puede explicar un rechazo o servir de pista de provisioning, pero no auto-crea principals durante login

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
- Documento maestro actual: `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Resumen rapido de fases y tareas: `docs/roadmap/PHASE_TASK_MATRIX.md`
- Este documento debe leerse antes de cambiar arquitectura, auth, rutas, roles, multi-tenant, dashboard, team/capacity, campaign intelligence o admin.
- Si un agente necesita trabajar en paralelo con otro, debe tomar su scope desde las fases y actividades definidas en `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`.
- `docs/roadmap/BACKLOG.md` es el resumen operativo del roadmap; `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` es la explicacion completa.
- Documento tecnico de identidad y acceso: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- DDL de identidad y acceso: `bigquery/greenhouse_identity_access_v1.sql`
- Documento tecnico de modulos de servicio: `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- DDL de modulos de servicio: `bigquery/greenhouse_service_modules_v1.sql`
- Bootstrap de modulos de servicio: `bigquery/greenhouse_service_module_bootstrap_v1.sql`
- Metodo canonico de validacion visual: `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- Iniciativa tenant-especifica activa: `docs/ui/SKY_TENANT_EXECUTIVE_SLICE_V1.md`
- Contrato visual ejecutivo reusable: `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`
- Contrato canonico de orquestacion UI: `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- Catalogo curado de patrones Vuexy/MUI: `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- Brief canonico de intake UI: `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- Seed operativo para benchmark interno del dashboard: `bigquery/greenhouse_efeonce_space_v1.sql`
- Plan UX actual para la siguiente iteracion del dashboard: `docs/ui/GREENHOUSE_DASHBOARD_UX_GAPS_V1.md`

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
- Para dashboards y superficies ejecutivas, la referencia correcta es la jerarquia de `full-version/src/views/dashboards/analytics/*`; el sistema reusable que la adapta a Greenhouse queda fijado en `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`.
- La seleccion de patrones Vuexy/MUI para cualquier solicitud nueva ya no debe salir de exploracion libre de `full-version`; debe pasar por el sistema definido en `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`.
- El intake de solicitudes UI puede venir de personas o de otros agentes; el brief canonico para normalizar pedidos de Claude, Codex u otros queda en `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`.
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
- La estrategia de documentacion liviana del repo queda en `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`.
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
- ya existe una base documental para un orquestador UI multi-agente: `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`, `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md` y `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md` fijan como Claude, Codex u otros asistentes deben normalizar solicitudes y seleccionar patrones Vuexy/MUI sin explorar `full-version` de forma ad hoc
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
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`
- `next.config.ts` usa `process.env.BASEPATH` como `basePath`
- Riesgo operativo: si `BASEPATH` se configura en Vercel sin necesitarlo, la app deja de vivir en `/`

## Variables de Entorno Objetivo
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GCP_PROJECT`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `GCP_PROJECT` ya existen en Vercel para `Development`, `staging` y `Production`.
- `NEXTAUTH_SECRET` y `NEXTAUTH_URL` ya estan integradas al runtime actual.
- `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET` habilitan Microsoft SSO multi-tenant en NextAuth y deben existir en cualquier ambiente donde se quiera validar ese flujo.
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` habilitan Google SSO en NextAuth y deben existir en cualquier ambiente donde se quiera validar ese flujo.
- `RESEND_API_KEY` y `EMAIL_FROM` quedan reservadas para el sistema de emails transaccionales; no deben commitearse con valores reales y deben existir al menos en `Development`, `Preview`, `Staging` y `Production` si ese flujo se habilita.
- `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` permite apuntar Greenhouse al servicio dedicado `hubspot-greenhouse-integration`; si no se define, el runtime usa el endpoint activo de Cloud Run como fallback.
- Cuando una branch requiera login funcional en `Preview`, tambien debe tener `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GCP_PROJECT`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL` definidos en ese ambiente.
- `tsconfig.json` excluye `**/* (1).ts` y `**/* (1).tsx` para evitar que duplicados locales del workspace rompan `tsc` y los builds de Preview en Vercel.

## Multi-Tenant Actual
- Dataset creado: `efeonce-group.greenhouse`
- Tabla creada: `greenhouse.clients`
- Tenant bootstrap cargado: `greenhouse-demo-client`
- Documento de referencia: `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- Documento maestro de evolucion: `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Documento de Fase 1 para identidad y acceso: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
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
- La estrategia de IDs de producto ya no debe exponer prefijos de origen como `hubspot-company-*`; usar `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md` y `src/lib/ids/greenhouse-ids.ts` como referencia.
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
- La nueva referencia para conectores externos es `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`; la API de integraciones debe mantenerse generica para HubSpot, Notion u otros sistemas.
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
