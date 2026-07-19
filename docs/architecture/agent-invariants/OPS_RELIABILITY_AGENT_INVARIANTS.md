# Invariantes operativos para agentes — Ops/Reliability/Platform (TASK-672…937)

---

## Invariantes operativos para agentes — Ops/Reliability/Platform (TASK-672…937)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim.** Teams Bot, Cloud Run ops-worker, Vercel cron classification, reliability dashboard hygiene, async observer liveness, Platform Health API. Contrato por sub-área: `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`, `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`, `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`, `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`. Skills: `teams-bot-platform`/`greenhouse-teams-message-operator`, `greenhouse-cron-sync-ops`. Dedup = Slice 4.

### Teams Bot outbound smoke y mensajes manuales

- Greenhouse/Nexa debe enviar mensajes proactivos a Teams vía **Bot Framework Connector**. Microsoft Graph sirve para discovery/lectura, no como contrato principal de envío del bot.
- Secreto runtime: `greenhouse-teams-bot-client-credentials` en GCP Secret Manager, JSON `{ clientId, clientSecret, tenantId }`. Nunca loggear tokens ni `clientSecret`.
- OAuth: token desde `https://login.microsoftonline.com/<tenantId>/oauth2/v2.0/token` con scope `https://api.botframework.com/.default`.
- Delivery:
  - Resolver primero el `chatId`/conversation id exacto (`teams_notification_channels.recipient_chat_id`, conversation reference cache o Teams connector `_resolve_chat`).
  - Enviar `POST {serviceUrl}/v3/conversations/{encodeURIComponent(chatId)}/activities`.
  - Usar failover de service URL: `https://smba.trafficmanager.net/teams`, `/amer`, `/emea`, `/apac`.
- Para group chats con `@todos`, usar `textFormat: "xml"`, `<at>todos</at>` y mention entity con `mentioned.id = chatId`, `mentioned.name = "todos"`. El transcript puede mostrar `todos` sin arroba; si importa la notificación real, verificar en Teams.
- Para chats individuales ya instalados por usuario, **no crear 1:1 a ciegas con AAD Object ID**. Resolver el `oneOnOne` existente y postear ahí. El intento `members: [{ id: "29:<aadObjectId>" }]` puede fallar con `403 Failed to decrypt pairwise id` aunque el usuario exista.
- En 1:1 no hace falta mencionar al destinatario; Teams notifica el chat. Para smoke scripts locales con imports server-side, usar `npx tsx --require ./scripts/lib/server-only-shim.cjs ...`.
- Producto/UI: cualquier canal manual debe converger con Notification Hub / `TASK-716` (intent/outbox, preview, aprobación, idempotencia, retries, audit, delivery status y permisos `views` + `entitlements`), no con un textbox que postea directo a Teams.
- **Helper canónico ya existe para anuncios manuales vía TeamBot**:
  - comando: `pnpm teams:announce`
  - runbook: `docs/operations/manual-teams-announcements.md`
  - runtime: `src/lib/communications/manual-teams-announcements.ts`
  - destinos registrados: `src/config/manual-teams-announcements.ts`
  - guardrails: `--dry-run` primero, `--yes` para enviar, `--body-file` con párrafos separados por línea en blanco, CTA `https` obligatorio
  - para futuras peticiones del tipo "envía este mensaje por Greenhouse/TeamBot", reutilizar este helper antes de crear scripts temporales o usar el conector personal de Teams
- Chats verificados:
  - `EO Team`: `19:1e085e8a02d24cc7a0244490e5d00fb0@thread.v2`.
  - `Sky - Efeonce | Shared`: `19:bf42622ef7b44d139cd4659e8aa22e81@thread.v2`.
  - Mention real de Valentina Hoyos: `text = "<at>Valentina Hoyos</at>"`, `mentioned.id = "29:f60d5730-1aab-45ec-a435-45ffe8be6f54"`.
- Referencia de tono: el 2026-04-28 Nexa se presentó en `Sky - Efeonce | Shared` como AI Agent de Efeonce y anunció a Valentina Hoyos como `Content Lead` del Piloto Sky de mayo. Activity id: `1777411344948`. Mantener copy cálido, claro, con emojis moderados y enfoque de coordinación útil.

### Cloud Run ops-worker (crons reactivos + materialización)

- Servicio Cloud Run dedicado (`ops-worker`) en `us-east4` para crons reactivos del outbox y materialización de cost attribution.
- 3 Cloud Scheduler jobs: `ops-reactive-process` (_/5), `ops-reactive-process-delivery` (2-59/5), `ops-reactive-recover` (_/15), timezone `America/Santiago`.
- Endpoint adicional: `POST /cost-attribution/materialize` — materializa `commercial_cost_attribution` + recomputa `client_economics`. Acepta `{year, month}` o vacío para bulk. Las VIEWs complejas (3 CTEs + LATERAL JOIN + exchange rates) que timeout en Vercel serverless corren aquí.
- SA: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/run.invoker`.
- Si el cambio toca el runtime que bundlea `ops-worker` (`services/ops-worker/**`, `services/_shared/**`, `src/lib/sync/**`, `src/lib/knowledge/**`, `src/lib/payroll/**`, `src/lib/finance/payroll-expense-reactive.ts`, `src/lib/finance/apply-payroll-reliquidation-delta.ts`, `src/lib/email/**`, `src/lib/integrations/**`, `src/lib/space-notion/**`, `src/lib/auth/**`, `src/lib/auth-secrets.ts`, `src/lib/secrets/**`, `src/lib/reliability/**`, `src/lib/notion-metrics/**`, `package.json`, `pnpm-lock.yaml` o `tsconfig.json`), verificar build/deploy del worker o el drift guard del workflow.
- **ESM/CJS**: servicios Cloud Run que reutilicen `src/lib/` sin NextAuth shimean `next-auth`, providers y `bcryptjs` via esbuild `--alias`. Patrón en `services/ops-worker/Dockerfile`.
- **⚠️ Worker @core boundary (canonizado live 2026-06-08, incidente ICO batch TASK-1048/1053):** los Docker builds de los 4 workers Cloud Run **EXCLUYEN `src/@core`** (la capa de tema AXIS/Vuexy) vía `.dockerignore` — los workers NO copian ni bundlean `@core`. Por eso **NUNCA importes `@core/theme/*` (ni `@menu`/`@layouts`/`@assets`) desde código `src/lib/**` que un worker bundlee** (dominio: `ico-engine`, `sync`, `finance`, `payroll`, `commercial-cost-attribution`, projections, materializers, PDF/Excel generators consumidos por projections). Con `--packages=external` el esbuild del worker externaliza el import → **silent startup crash** (`ERR_MODULE_NOT_FOUND` → container no escucha en 8080 → deploy failed). Causa raíz del incidente: `metric-registry.ts` (dominio) importó `@core/theme/axis-chart` para un mapa de color de UI.
  - **DATA de design tokens runtime-agnóstica** (hexes puros que UI + worker + PDF necesitan, ej. `axisSemanticSubValues`) vive en **`src/lib/design-tokens/*`** (literales, cero deps); `@core/theme/*` la **re-exporta** para consumidores UI. Worker/PDF importan del módulo `src/lib/design-tokens`, NUNCA de `@core`.
  - **Color/concern de UI** (mapas de color de chart, tonos de chip) vive en la **capa UI** (`src/components/**`, excluida de workers), NO en código de dominio worker-bundled. Patrón fuente: `CSC_CHART_COLORS` movido de `metric-registry` (dominio) → `src/components/greenhouse/charts/csc-chart-colors.ts` (UI).
  - **Guard defensivo:** el esbuild de los 3 workers Node tiene `--alias:@core=./src/@core` — convierte un futuro import `@core` en worker-bundled de **silent-startup-crash** a **loud-build-fail** (`Could not resolve`), detectable en CI antes del runtime. NO removerlo.
  - **Verificación local (simula Docker sin `src/@core`):** `esbuild services/<worker>/server.ts --bundle --packages=external --alias:@=./src --alias:@core=/tmp/emptydir --tsconfig=tsconfig.json` → si lista algún `Could not resolve "@core/..."`, ese import rompe el worker. Debe dar cero.
- **⚠️ Worker runtime npm deps (hermano del @core boundary, canonizado live 2026-06-09, ISSUE-090):** los workers Node externalizan paquetes npm y los resuelven desde `node_modules` de la imagen. Por eso **TODO paquete npm importado directamente por un runtime worker DEBE estar en `dependencies`, NUNCA solo en `devDependencies` ni llegar por casualidad como transitive**. Los runners slim instalan `--prod`; `artifact-worker` instala el árbol completo por su ejecución source+tsx, pero conserva la misma regla de declaración directa. Si el paquete no está declarado, el contenedor puede caer con `ERR_MODULE_NOT_FOUND` o cambiar de resolución al variar otra dependencia. Causas reales: `pngjs` en el ops-worker y `playwright` directo en Artifact Worker pero sólo transitivo de `@playwright/test`.
  - **Guard canónico:** `pnpm worker:runtime-deps-gate` (`scripts/ci/worker-runtime-deps-gate.mjs`, wired en `ci.yml`) replica el grafo estático de los 4 workers, enumera paquetes externalizados y **falla loud** si alguno no está en `dependencies`. Mantener `SHIMMED_PACKAGES` en sync con los aliases Docker.
  - **Fix canónico cuando el guard falla:** mover el paquete a `dependencies` (+ `pnpm install --lockfile-only` para sincronizar `pnpm-lock.yaml`; `--frozen-lockfile` lo exige), **o** hacer el import lazy/dinámico si el código no debe correr en el worker. NUNCA `--packages=bundle` el paquete a ciegas ni bypasear el guard.
- **⚠️ Worker build inputs:** toda dependencia `file:` debe existir, estar trackeada, coincidir por SHA-512 con el lockfile, entrar a `.gcloudignore`/`.dockerignore` y copiarse antes de cada `pnpm install`. Los 4 workflows observan `package.json`, lockfile, ignores y `vendor/**`. Ejecutar `pnpm worker:build-contract-gate`; canon completo en `GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`.
- **Deploy canónico via GitHub Actions** (`.github/workflows/ops-worker-deploy.yml`): trigger automático en `push` a `develop` o `main` que toque el runtime surface del worker; trigger manual: `gh workflow run ops-worker-deploy.yml --ref <branch>` o desde la UI de Actions. El workflow autentica con WIF, corre `bash services/ops-worker/deploy.sh` (mismo script idempotente que upsertea Cloud Scheduler jobs), verifica `/health` y registra el commit. Desde 2026-06-18, `workflow_dispatch` sin `expected_sha` resuelve el último SHA que tocó paths runtime del worker, no necesariamente el HEAD documental; antes de construir Docker compara la revisión Cloud Run actual por `GIT_SHA` y por diff de paths runtime para saltar build/deploy cuando el worker servido es runtime-equivalente. Confirmar deploy con `gh run list --workflow=ops-worker-deploy.yml --limit 1` o `gh run watch <run-id>`. **Manual local (`bash services/ops-worker/deploy.sh`) solo para hotfix puntual** con `gcloud` autenticado contra `efeonce-group`; el path canónico para que el deploy quede trazable es el workflow.
- Las rutas API Vercel (`/api/cron/outbox-react`, etc.) son fallback manual, no scheduladas.
- Run tracking: `source_sync_runs` con `source_system='reactive_worker'`, visible en Admin > Ops Health.
- Fuente canónica: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 y §5.

### Vercel cron classification + migration platform (TASK-775)

Toda decisión "dónde vive un cron" pasa por las **3 categorías canónicas** de `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`:

- **`async_critical`** — alimenta o consume pipeline async (outbox, projection, sync downstream) que QA/staging necesita. **Hosting canónico: Cloud Scheduler + ops-worker. NO Vercel cron.**
- **`prod_only`** — side effects que solo importan en producción real (compliance, GDPR cleanup, FX rates externos). Hosting Vercel cron OK.
- **`tooling`** — utilitarios para developers/QA/monitoreo (synthetic monitors, data quality probes). Hosting Vercel cron OK.

**Patrón de migración canónico** (cuando crees un cron nuevo o migres uno existente):

1. Lógica pura en `src/lib/<dominio>/<orchestrator>.ts` o `src/lib/cron-orchestrators/index.ts` — reusable desde Vercel route + Cloud Run.
2. Endpoint Cloud Run en `services/ops-worker/server.ts` via helper canónico `wrapCronHandler({ name, domain, run })` — centraliza `runId`, `captureWithDomain`, `redactErrorForResponse`, audit log, 502 sanitizado.
3. Cloud Scheduler job en `services/ops-worker/deploy.sh` con `upsert_scheduler_job` (idempotente).
4. Si era cron Vercel scheduled, eliminar entry de `vercel.json` (la route queda como fallback manual via curl + `CRON_SECRET`).
5. Sincronizar snapshot `CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS` en **dos** lugares:
   - `src/lib/reliability/queries/cron-staging-drift.ts` (reader runtime)
   - `scripts/ci/vercel-cron-async-critical-gate.mjs` (CI gate)

**Defensas anti-regresión**:

- **Reliability signal `platform.cron.staging_drift`** (subsystem `Event Bus & Sync Infrastructure`): kind=`drift`, severity=`error` si count>0, steady=0. Lee `vercel.json`, matchea contra `ASYNC_CRITICAL_PATH_PATTERNS` (`outbox*`, `sync-*`, `*-publish`, `webhook-*`, `hubspot-*`, `entra-*`, `nubox-*`, `*-monitor`, `email-delivery-retry`, `reconciliation-auto-match`), verifica equivalente Cloud Scheduler, honra `KNOWN_NON_ASYNC_CRITICAL_PATHS` (`sync-previred` = prod_only legítimo) y override `// platform-cron-allowed: <reason>` adyacente al path en vercel.json.
- **CI gate `pnpm vercel-cron-gate`** (`.github/workflows/ci.yml` después de Lint, modo `--warn` durante TASK-775; promueve a strict tras estabilización). Falla CI si detecta async-critical sin equivalent.

**⚠️ Reglas duras**:

- **NUNCA** agregar a `vercel.json` un path que matchea pattern async-critical sin Cloud Scheduler equivalent. CI gate bloquea, reliability signal alerta. Si emerge un caso legítimo prod_only/tooling cuyo path matchea pattern, agregarlo a `KNOWN_NON_ASYNC_CRITICAL_PATHS` (en AMBOS readers) o usar override comment.
- **NUNCA** crear handler Cloud Run sin pasar por `wrapCronHandler`. Sin él, perdés runId estable, audit log consistente, captureWithDomain canónico, sanitización de error y 502 contract uniforme.
- **NUNCA** duplicar lógica de cron entre route Vercel y server.ts del ops-worker. Toda lógica vive en `src/lib/<...>/orchestrator.ts` y ambos endpoints la importan. Single source of truth.
- **NUNCA** sincronizar `CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS` en uno solo de los dos lugares (reader + gate). Drift entre ambos = falsos positivos en CI o falsos negativos en runtime dashboard.
- **NUNCA** modificar pattern array en uno solo. Si emerge un nuevo pattern async-critical, agregarlo en AMBOS lugares con comentario justificando la categoría.
- Cuando se cree un cron nuevo, **categorizarlo PRIMERO** según las 3 categorías canónicas, luego elegir hosting. NO al revés.

**Spec canónica**: `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (categorías + decision tree + inventario).
**Helper canónico**: `services/ops-worker/cron-handler-wrapper.ts` (`wrapCronHandler`).
**Reader runtime**: `src/lib/reliability/queries/cron-staging-drift.ts`.
**CI gate**: `scripts/ci/vercel-cron-async-critical-gate.mjs`.

### Reliability dashboard hygiene — orphan archive, channel readiness, smoke lane bus, domain incidents

Cuatro patrones que evitan que el dashboard muestre falsos positivos o señales `awaiting_data` perpetuas.

#### 1. Orphan auto-archive en `projection_refresh_queue`

- `markRefreshFailed` (`src/lib/sync/refresh-queue.ts`) corre los `ENTITY_EXISTENCE_GUARDS` antes de rutear a `dead`. Si el `entity_id` no existe en su tabla canónica (e.g. `team_members.member_id`), la fila se marca `archived=TRUE` en el mismo UPDATE.
- Dashboard query filtra `WHERE COALESCE(archived, FALSE) = FALSE`. Cero ruido por test residue, deletes, snapshot drift.
- **Agregar un guard nuevo** = añadir entry al array `ENTITY_EXISTENCE_GUARDS` con `(entityType, errorMessagePattern, checkExists)`. Cheap (single PG lookup), runs solo al moment dead-routing.
- **NO borrar rows archived** — quedan para audit. Query `WHERE archived = TRUE` para ver el cleanup history.

#### 2. Channel provisioning_status en `teams_notification_channels`

- Tabla tiene `provisioning_status IN ('ready', 'pending_setup', 'configured_but_failing')`. `pending_setup` significa "config existe en PG pero secret no está en GCP Secret Manager" — sends se skipean silenciosamente, NO cuentan en el subsystem failure metric.
- Dashboard query Teams Notifications (en `get-operations-overview.ts`) filtra `NOT EXISTS` por `secret_ref` matching channels en `pending_setup`.
- **Provisionar un channel nuevo**: crear row con `provisioning_status='pending_setup'`, después subir el secret a GCP Secret Manager, después flip a `'ready'`. El dashboard nunca pinta warning durante el periodo de setup.

#### 3. Smoke lane runs vía `greenhouse_sync.smoke_lane_runs` (PG-backed)

- CI publica resultados Playwright vía `pnpm sync:smoke-lane <lane-key>` después de cada run (auto-resuelve `GITHUB_SHA`, `GITHUB_REF_NAME`, `GITHUB_RUN_ID`).
- Reader (`getFinanceSmokeLaneStatus` y similares) lee la última row por `lane_key`. Funciona desde Vercel runtime, Cloud Run, MCP — no más dependencia de filesystem local.
- **Lane keys canónicos**: `finance.web`, `delivery.web`, `identity.api`, etc. Stable, lowercase, dot-separated. Coinciden con expectations del registry.
- **Agregar nueva lane**: solo upsertear desde CI con un nuevo `lane_key`. El reader genérico se adapta sin migration.

#### 4. Sentry incident signals via `domain` tag (per-module)

- Wrapper canónico: `captureWithDomain(err, 'finance', { extra })` en `src/lib/observability/capture.ts`. Reemplaza `Sentry.captureException(err)` directo donde haya un dominio claro.
- Reader: `getCloudSentryIncidents(env, { domain: 'finance' })` filtra issues por `tags[domain]`. UN proyecto Sentry, MUCHOS tags — sin overhead de proyectos por dominio.
- Registry: cada `ReliabilityModuleDefinition` declara `incidentDomainTag` (`'finance'`, `'integrations.notion'`, etc.). `getReliabilityOverview` itera y produce un `incident` signal per module. Cierra el `expectedSignalKinds: ['incident']` gap para finance/delivery/integrations.notion sin per-domain Sentry projects.
- **Agregar un módulo nuevo**: añadir `incidentDomainTag: '<key>'` al registry + usar `captureWithDomain(err, '<key>', ...)` en code paths del módulo. Cero config Sentry-side adicional.

**⚠️ Reglas duras**:

- **NO** borrar rows de `projection_refresh_queue` por DELETE manual. Usar el orphan guard si es residue, o `requeueRefreshItem(queueId)` si es real fallo a recuperar.
- **NO** contar failed de `source_sync_runs WHERE source_system='teams_notification'` sin excluir `pending_setup` channels — re-introduce el ruido que la migration `20260426162205347` resolvió.
- **NO** leer Playwright results desde filesystem en runtime (Vercel/Cloud Run no tienen el archivo). Usar `greenhouse_sync.smoke_lane_runs`. El fallback fs queda solo para dev local.
- **NO** usar `Sentry.captureException()` directo en code paths con dominio claro — el tag `domain` no se setea y el módulo correspondiente NUNCA ve el incidente. Usar `captureWithDomain()`.

### Async observer liveness — heartbeat, no output freshness (TASK-937, desde 2026-05-26)

Cuando un proceso async produce un artefacto que también se **deduplica** (el AI Observer del RCP persiste `overview`/módulos solo si el fingerprint del snapshot cambió), su **liveness NO puede inferirse de la frescura de su output**. Una postura estable hace que el artefacto no se re-persista por días — eso es sano, no "apagado". El bug class (TASK-637/638 → TASK-937, detectado live 2026-05-26): el banner `/admin` gateaba "AI Observer no activo" sobre una observación `overview` fresca en ventana de 24h; con el portal estable el overview no se re-persistía (4 días) → banner falso, aunque el cron horario corría y Vertex respondía.

**El patrón canónico desacopla tres preguntas distintas que NO deben colapsarse en un booleano**:

| Pregunta | Fuente de verdad | NUNCA |
|---|---|---|
| ¿El proceso **corre**? | heartbeat append-only en `greenhouse_sync.source_sync_runs` | inferir de la frescura/presencia del output |
| ¿Está **sano**? | reliability signal que lee el heartbeat | medir solo "hay output reciente" |
| ¿Hay **artefacto fresco**? | el último artefacto (sin filtro de edad, con label "hace X") | esconderlo tras una ventana que se confunde con "apagado" |

**⚠️ Reglas duras**:

- **NUNCA** inferir la liveness de un observer/cron/proyección async desde la frescura de su output cuando ese output se deduplica. Liveness = heartbeat propio.
- **NUNCA** crear tabla de run-tracking nueva para un heartbeat. Reusar `source_sync_runs` con un `source_system` nuevo (precedentes: `reactive_worker`, `reliability_synthetic`, `reliability_ai_observer`). El `status` debe respetar el CHECK enum (`running|succeeded|failed|partial|cancelled`) — `skipped` NO existe; mapear "deshabilitado" a `cancelled` y "falló" a `failed`.
- **NUNCA** dejar que el heartbeat rompa el proceso principal. Va en wrapper boundary con `try/catch + warn` (non-blocking).
- **NUNCA** togglear off el `thinkingConfig:{thinkingBudget:0}` del AI Observer (`src/lib/reliability/ai/runner.ts`). `gemini-2.5-flash` corre con *thinking* ON por default y quema el `maxOutputTokens` → trunca el JSON estructurado (`unbalanced_or_truncated_json`). Con `responseSchema` (constrained decoding) + thinking apagado + budget adecuado, el JSON sale válido. Loggear `candidates[0].finishReason` para distinguir `MAX_TOKENS` (truncado por budget) de JSON malformado.
- **SIEMPRE** que un async path nuevo necesite "¿está vivo/sano?", shippear (a) heartbeat en `source_sync_runs`, (b) reliability signal que lo lee, (c) el reader del artefacto distingue `loading|empty|degraded|healthy_stable` sin colapsar en un estado ambiguo.

**Spec canónica**: `docs/tasks/complete/TASK-937-ai-observer-reliability-hardening.md`. Helpers: `src/lib/reliability/ai/ai-observer-run-tracker.ts` (heartbeat), `src/lib/reliability/queries/ai-observer-unhealthy.ts` (signal `reliability.ai_observer.unhealthy`, moduleKey `cloud`).

### Platform Health API Contract — preflight programático para agentes (TASK-672)

Contrato versionado `platform-health.v1` que un agente, MCP, Teams bot, cron de CI o cualquier app puede consultar antes de actuar. Compone Reliability Control Plane + Operations Overview + runtime checks + integration readiness + synthetic monitoring + webhook delivery + posture en una sola respuesta read-only con timeouts por fuente y degradación honesta.

- **Rutas**:
  - `GET /api/admin/platform-health` — admin lane (`requireAdminTenantContext`). Devuelve payload completo con evidencia y referencias.
  - `GET /api/platform/ecosystem/health` — lane ecosystem-facing (`runEcosystemReadRoute`). Devuelve summary redactado, sin evidence detail hasta que TASK-658 cierre el bridge `platform.health.detail`.
- **Composer**: `src/lib/platform-health/composer.ts`. Llama 7 sources en paralelo via `Promise.all` con `withSourceTimeout` per-source. Una fuente caída produce `degradedSources[]` + baja `confidence` — NUNCA un 5xx.
- **Helpers reusables NUEVOS**:
  - `src/lib/observability/redact.ts` (`redactSensitive`, `redactObjectStrings`, `redactErrorForResponse`) — strip de JWT/Bearer/GCP secret URI/DSN/email/query secret. **USAR ESTE helper** antes de persistir o devolver cualquier `last_error` o response body que cruce un boundary externo. NUNCA loggear `error.stack` directo.
  - `src/lib/platform-health/with-source-timeout.ts` — wrapper canónico `(produce, { source, timeoutMs }) → SourceResult<T>`. Reutilizable por TASK-657 (degraded modes) y cualquier otro reader que necesite timeout + fallback estructurado.
  - `src/lib/platform-health/safe-modes.ts` — deriva booleans `readSafe/writeSafe/deploySafe/backfillSafe/notifySafe/agentAutomationSafe`. Conservador: en duda → `false`.
  - `src/lib/platform-health/recommended-checks.ts` — catálogo declarativo de runbooks accionables filtrados por trigger.
  - `src/lib/platform-health/cache.ts` — TTL 30s in-process per audience.
- **Cómo lo usa un agente**: consultar `safeModes` + respetar las banderas tal cual vienen. Si `agentAutomationSafe=false`, escalar a humano. NO interpretar `degraded` como `healthy`.

**⚠️ Reglas duras**:

- **NO** crear endpoints paralelos de health en otros módulos. Si un nuevo módulo necesita exponer su salud, registrarlo en `RELIABILITY_REGISTRY` (con `incidentDomainTag` si tiene incidents Sentry) y el composer lo recoge automáticamente.
- **NO** exponer payload sin pasar por `redactSensitive` cuando contiene strings de error o de fuente externa.
- **NO** computar safe modes ni rollup en el cliente. Consumir las banderas tal como vienen del contrato.
- **NO** cachear el payload más de 30s del lado del cliente. El composer ya cachea in-process.
- **NO** depender de campos no documentados. Solo `contractVersion: "platform-health.v1"` garantiza shape estable.
- Tests: `pnpm test src/lib/platform-health src/lib/observability/redact` (47 tests cubren composer, safe-modes, redaction, with-source-timeout, recommended-checks).
- Spec: `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (sección Platform Health), doc funcional `docs/documentation/plataforma/platform-health-api.md`, OpenAPI `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml` (schema `PlatformHealthV1`).

## Cloud Run JOBS (categoría nueva desde 2026-07-12 — TASK-1391)

El ecosistema dejó de tener sólo **services**: `artifact-worker` es el **primer Cloud Run Job**
(render de artefactos del composer). Un Job **no expone HTTP**, se ejecuta por invocación y **una
ejecución = un artefacto** (`tasks=1`, `parallelism=1`, `max-retries=0`).

- **NUNCA** ejecutes render pesado (Chromium) en el `ops-worker` ni en Vercel: bloquearía el
  publisher del outbox. Va en el Job dedicado — y **un deployable nuevo exige la decisión de
  frontera de EPIC-027** (la de `artifact-worker` está autorizada por excepción documentada).
- **NUNCA** subas `--max-retries` del Job: el reintento es **del dominio**
  (`proposal_render_jobs.attempts` + `retryProposalRenderJob`). Si Cloud Run reintentara solo, el
  contador y el dead-letter dejarían de significar algo.
- **NUNCA** le des al dispatcher el permiso `run.jobs.runWithOverrides`: el worker **claim-ea** su
  trabajo (`FOR UPDATE SKIP LOCKED`), así basta `run.invoker` (menos privilegio + concurrencia
  segura). Rediseñar para necesitar menos permiso > escalar IAM.
- **SIEMPRE** que una imagen de worker lleve runtime pesado (Chromium, fuentes, catálogos), **la
  imagen se prueba a sí misma en el build** (`--selftest` como paso de Cloud Build): un ENOENT o una
  fuente faltante debe morir en el pipeline, nunca en una ejecución productiva (ISSUE-121).
- **SIEMPRE** pinnea la imagen base a la versión exacta de la dependencia del repo (Playwright):
  otro Chromium = otro píxel = otro artefacto. Hay test de contrato (`deploy-contract.test.ts`).
- El **dispatcher** del Job vive en el `ops-worker` (endpoint + Cloud Scheduler) y hace `jobs.run`
  (~200 ms). El flag (`ARTIFACT_RENDER_JOBS_ENABLED`) es **multi-runtime ×3** (Vercel enqueue ·
  ops-worker dispatch · el Job): prenderlo en uno solo deja el pipeline muerto **en silencio**.

Spec: `GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md` · Runbook: `docs/manual-de-uso/proposal-studio/operar-el-artifact-worker.md`
