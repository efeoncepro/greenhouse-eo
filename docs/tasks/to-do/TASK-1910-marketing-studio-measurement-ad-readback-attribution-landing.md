# TASK-1910 — Marketing Studio: medición real (readback de Meta y LinkedIn Ads, atribución bow-tie y chequeo de destino)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-04 — activaciones y calendario de Studio (TASK-2001/2002)

- La evidencia de paid (anuncio activo, entregas observadas) se adjunta a **activaciones pagadas** (`kind: span`) como `execution_record` del modelo de TASK-2001; el `buying method` y el `deal type` viven en el anuncio (ADR de estrategia §15).

## Delta 2026-09-26 — decisiones del operador

- **El canje de `marketing_studio.integration.manage` verifica la acción única `update`** (decisión de Julio Reyes,
  operador, 2026-09-26). Conectar, revalidar y revocar una cuenta publicitaria son `T2` y se canjean con `update`; el
  cliente `efeonce-mcp-marketing-studio-integration-manage` se siembra con esa acción y la fila de TASK-1899 queda
  sin marca de verificación.

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
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-09-26 desde el ADR de capa de estrategia (§4.7); sólo lectura sobre las plataformas publicitarias`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-1892 (métricas desde Greenhouse, consumer y mapeo de campaña) · TASK-1905 (channel_key y readback_provider por canal) · TASK-1907 (plan de medición y KPIs aprobados) · TASK-1899 (escritura MCP y T2)`
- Branch: `efeonce-marketing-studio main (adapters de pauta en el worker, observaciones, chequeo de destino, progreso de KPIs) · Greenhouse develop (lane de atribución bow-tie, campos de atribución de formularios, capability, cliente de canje, docs) · efeonce-mcp rama + PR (sync, versión, tools nuevas de Greenhouse); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra la medición de una campaña con datos observados, nunca estimados: **readback** de gasto y resultados de Meta Ads
y LinkedIn Ads como observaciones fechadas (las líneas `actual` del presupuesto nacen sólo de ahí), **atribución del
bow-tie de HubSpot** (lead → deal por `utm_campaign`) leída por un lane de Greenhouse, **chequeo de destino** antes de
lanzar (responde, conserva la UTM, tiene la etiqueta de medición y los campos de atribución del formulario) como
observación con su falla visible en «atención», **progreso de KPIs** del plan aprobado contra su fuente declarada, y la
edición del mapeo de métricas que TASK-1892 dejó como follow-up. Conectar una cuenta publicitaria es `T2`. **Sólo
lectura** sobre las plataformas: lanzar, pausar o cambiar presupuesto queda fuera y requiere otro ADR con su propia
clase de scope.

## Why This Task Exists

- El plan de medios distingue propuesto, aprobado y real, pero `actual` hoy no tiene fuente: nadie observa el gasto
  en las plataformas y el invariante «`actual` vacío = sin dato» nunca se llena (ADR de capa de estrategia §4.7).
- TASK-1892 trae GA4, Search Console y SEO por campaña, y deja fuera pauta pagada, atribución y edición del mapeo
  (sus Out of Scope y Follow-ups). Sin esto, el plan aprobado de TASK-1907 no se puede medir contra sus metas.
- Una campaña puede salir con la landing rota o sin UTM y no enterarse hasta ver cero leads. El ADR pide chequeo de
  destino como observación y falla visible, sin tocar `launch_state`.
- Studio nunca llama a HubSpot directo: el puente es de Greenhouse, que no expone todavía atribución por campaña.

## Goal

- Cuentas de Meta Ads y LinkedIn Ads conectadas por organización con credenciales de sólo lectura (verificado al
  conectar), por un command `T2` con la persona como actor.
- Observaciones diarias de gasto y resultados por anuncio; líneas `actual` mensuales por canal derivadas sólo de ellas.
- Lane de Greenhouse con atribución bow-tie agregada por `utm_campaign`, sin PII, consumida por Studio.
- Chequeo de destino registrado, con sus fallas en «atención» y en la proyección de `checksPending`.
- Progreso de KPIs del plan aprobado con «sin dato» honesto y sin cruzar fuentes.
- Todo por `/api/v1` y MCP.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (**gobernante**: §4.7,
  §4.8, §5, §8)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 invariantes de presupuesto,
  §7.2 worker de medios, §9 observabilidad)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lane ecosystem, anti-oráculo)
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` y `docs/context/11_hubspot-bowtie.md` (puente HubSpot,
  etapas del bow-tie con internal names)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`

Reglas obligatorias:

- **Sólo lectura sobre plataformas publicitarias.** Las credenciales se verifican al conectar y se rechazan si traen
  permisos de escritura (Meta `ads_management`, LinkedIn `rw_ads`); ningún adapter tiene un método de escritura.
- **`actual` nace sólo de readback observado**, escrito por el worker con actor `system` y `worker_run_id`; nunca por
  command de persona ni agente. Montos en la moneda de la cuenta; nunca convertidos ni sumados entre monedas ni con
  propuesto/aprobado.
- **Observaciones append-only:** una reexpresión del proveedor agrega una observación nueva; el reader usa la última por
  anuncio y día y conserva la historia.
- **Studio nunca llama a HubSpot:** la atribución llega por el lane de Greenhouse, agregada y sin datos personales.
- **Destino ≠ lanzamiento:** el chequeo registra observaciones y fallas; no cambia `launch_state` ni escribe la fila del
  anuncio (la falla entra a `checksPending` por proyección del reader).
- **Ausencia ≠ cero:** fuente no conectada, sin mapeo o sin observación es `no_data`/`not_connected`, nunca 0.
- Secretos sólo por referencia (nombre en Secret Manager); ningún valor pasa por la API, por MCP ni por logs.

## Normative Docs

- `.claude/skills/efeonce-marketing-studio/SKILL.md` (worker, readback de Metricool como precedente, contrato de
  mantenimiento).
- `.claude/skills/efeonce-agent-media-planner/SKILL.md` (rol del agente de medios: lee el gasto observado y los benchmarks; nunca conecta cuentas ni opera plataformas).
- `.claude/skills/greenhouse-secret-hygiene/SKILL.md` (publicar secretos como escalar crudo; `secretAccessor` acotado).
- `.claude/skills/hubspot-greenhouse-bridge/SKILL.md` (lectura de contactos y deals; nunca escribir a HubSpot).
- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `mcp-craft`.
- `docs/tasks/to-do/TASK-1892-marketing-studio-greenhouse-metrics.md` (DTO por fuente, estados, consumer).
- Referencia de API oficial de Meta Marketing (Insights) y LinkedIn Marketing (adAnalytics), leída y fechada en Discovery.

## Dependencies & Impact

### Depends on

- `TASK-1892`: `studio.campaign_metrics_mapping`, adapter de Greenhouse, estados de fuente, consumer y bindings.
- `TASK-1905`: `channel_key` y `readback_provider` en el catálogo.
- `TASK-1907`: `plan_kpi` (fuente y meta) y `plan_measurement` (UTM y eventos de conversión con referencia de formulario).
- `TASK-1899`: escritura MCP y digest para `T2`.
- Worker de medios de Studio (TASK-1893) y `studio.worker_run`.

### Blocks / Impacts

- `TASK-1911`: los resultados de experimentos y la evidencia de aprendizajes citan estas observaciones.
- `TASK-1909`: el informe semanal cita progreso de KPIs, gasto observado y atribución.
- `TASK-1912`: pinta resultados, gasto real, atribución, destino y progreso.
- `TASK-1895`: su pestaña «Resultados» puede agregar la tarjeta «Pauta» consumiendo `studio.campaign.paid_performance.get` (Delta sugerido, no bloqueante).

### Files owned

- Repo Studio: `packages/domain/src/ads/**` [nuevo] (`meta-adapter.ts`, `linkedin-adapter.ts`, `readback.ts`, `connections.ts`, `scope-guard.ts`), `packages/domain/src/landing/**` [nuevo] (`check.ts`, `html-probe.ts`), `packages/domain/src/metrics/kpi-progress.ts` [nuevo], `packages/domain/src/metrics/attribution-adapter.ts` [nuevo], `packages/domain/src/commands/ad-connection.ts` [nuevo], `packages/domain/src/commands/metrics-mapping.ts` [nuevo], `packages/domain/src/worker.ts` (jobs nuevos), `packages/database/migrations/<ts>_ad-readback.sql` [nuevo], `packages/database/migrations/<ts>_landing-check.sql` [nuevo], `packages/database/src/schema.ts`, `packages/contracts/src/{ads,landing,kpi-progress}.ts` [nuevos], `packages/contracts/src/operations.ts`, rutas `apps/web/src/app/api/v1/{ad-connections,campaigns/[campaignId]/{paid-performance,attribution,landing-checks,kpi-progress,metrics-mapping},ads/[adId]/provider-link}/**`, `scripts/ads-linkedin-authorize.ts` [nuevo], infraestructura del worker (scheduler e IAM) [verificar ruta en `scripts/ops/infra/`]
- Greenhouse: `src/lib/growth/attribution/campaign-bowtie.ts` [nuevo], `src/lib/growth/forms/attribution-fields.ts` [nuevo], `src/lib/api-platform/resources/ecosystem-growth-attribution.ts` [nuevo], `src/app/api/platform/ecosystem/growth/attribution/campaign-bowtie/route.ts` [nuevo], `src/app/api/platform/ecosystem/growth/forms/[formRef]/attribution-fields/route.ts` [nuevo], `src/mcp/greenhouse/tool-manifest.ts`, `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`, `migrations/<ts>_task-1910-marketing-studio-integration-manage-capability.sql` [nuevo], `migrations/<ts>_task-1910-mcp-marketing-studio-integration-manage-client.sql` [nuevo], `src/lib/sister-platforms/mcp-token-exchange.ts`
- Gateway: sync de manifiestos, provider SEO (tool de atribución si comparte lane) [verificar], contratos de canje, `package.json`, `surface-baseline.json`

## Current Repo State

### Already exists

- `studio.budget_line.kind ∈ {proposed, approved, actual}` y el invariante de no sumarlas; `ad_configuration` con
  `utm`, `destination_url`, `checks_pending`, `status`.
- Worker de medios en Cloud Run con readback de Metricool (TASK-1893) y `studio.worker_run`.
- TASK-1892 (to-do): GA4/GSC/SEO por campaña y `campaign_metrics_mapping`.
- Puente HubSpot de Greenhouse (bow-tie en `docs/context/11_hubspot-bowtie.md`); Growth Forms propios en
  `src/lib/growth/forms`.
- MCP oficial de Meta Ads disponible para personas (no es la vía de runtime; runtime usa la API oficial con credencial
  de sólo lectura).

### Gap

- No hay conexiones de cuentas publicitarias, adapters, observaciones de gasto ni líneas `actual`.
- Greenhouse no expone atribución por campaña ni campos de atribución de formularios.
- No hay chequeo de destino ni progreso de KPIs del plan.
- El mapeo de métricas de TASK-1892 no se puede editar por API ni MCP.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` (dominio, worker Cloud Run, rutas) + Greenhouse (`src/lib/growth/attribution/**`, lanes ecosystem) + `efeonce-mcp`
- Future candidate home: `worker`
- Boundary: adapters de pauta y chequeo de destino en `packages/domain` ejecutados por el worker; lectura de HubSpot y formularios sólo en Greenhouse; Studio consume por lane
- Server/browser split: adapters, secretos y fetch de landings sólo en el worker/servidor; el navegador consume `/api/v1`
- Build impact: `none` (clientes HTTP propios, sin SDK de Meta ni LinkedIn)
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (credenciales externas, dinero observado, fuente de `actual`)
- Impacto principal: `integration`
- Source of truth afectado: Studio `ad_account_connection`, `ad_performance_observation`, `budget_line(kind=actual)`, `landing_check` (nuevas/derivadas); Greenhouse lanes de atribución y formularios
- Consumidores afectados: plan de campaña, informes semanales, experimentos, UI
- Runtime target: worker de Studio (Cloud Run), Vercel de Studio, Vercel de Greenhouse, gateway

### Contract surface

- Contrato existente a respetar: DTO por fuente y estados de TASK-1892; invariantes de presupuesto; `ERROR_CATALOG`
- Contrato nuevo o modificado: operaciones de Detailed Spec; lanes Greenhouse `growth/attribution/campaign-bowtie` y `growth/forms/{formRef}/attribution-fields`
- Backward compatibility: `compatible` (fuentes y rutas nuevas; el DTO de métricas de TASK-1892 no cambia)
- Full API parity: conectar, mapear, pedir readback y chequear destino tienen command, ruta y tool

### Data model and invariants

- Entidades/tablas/views afectadas: nuevas de Detailed Spec §«Modelo»; `studio.budget_line` (filas `actual` del sistema); `studio.ad_configuration.provider_ref jsonb NULL` (nueva columna)
- Invariantes que no se pueden romper:
  - conexión con permisos de escritura ⇒ rechazada al conectar y al revalidar
  - `actual` sólo desde observaciones, por el worker, en moneda de la cuenta
  - observaciones append-only; restatement = fila nueva
  - atribución agregada, sin PII, con `not_connected` para organizaciones sin HubSpot conectado a Greenhouse
  - chequeo de destino nunca cambia `launch_state` ni la fila del anuncio
- Write-target allowlist: Greenhouse growth: declarar si existe boundary test [verificar]; Studio N/A
- Tenant/space boundary: conexiones por `organization_id`; readback sólo de cuentas conectadas a la organización de la campaña; lanes Greenhouse con anti-oráculo por binding
- Idempotency/concurrency: readback idempotente por `(ad, fecha, observed_run)`; `requestAdReadback` con `Idempotency-Key` y cooldown de 15 min por campaña; commands con `If-Match`
- Audit/outbox/history: `audit_event` en conectar/mapear; `worker_run` por corrida; observaciones como historia

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `STUDIO_AD_READBACK_ENABLED=false` (worker), `STUDIO_LANDING_CHECK_ENABLED=false`, `GROWTH_CAMPAIGN_ATTRIBUTION_ENABLED=false` (Greenhouse)
- Backfill plan: primer readback trae los últimos 90 días de cada anuncio mapeado (dry-run con conteo antes del apply)
- Rollback path: flags OFF; revocar conexión (`T2`); observaciones quedan como historia; líneas `actual` derivadas se pueden recomputar
- External coordination: tokens de sólo lectura creados por el admin de cada plataforma y publicados en Secret Manager por el operador; `secretAccessor` acotado para la SA del worker; scheduler del worker; allowlist del cliente de canje y redeploy de Greenhouse; dispatch del gateway

### Security and access

- Auth/access gate: conectar/revocar/revalidar cuenta `marketing_studio.integration.manage` (nueva, `T2`); mapear anuncio y mapeo de métricas `.campaign.write` (`T1`); pedir readback y chequeo `.campaign.write` (`T1`); lecturas `.campaign.read`
- Sensitive data posture: credenciales sólo en Secret Manager; atribución sin PII; HTML de landings no se persiste (sólo hallazgos)
- Error contract: `ad_connection_write_scope_forbidden`, `ad_connection_unverified`, `ad_readback_cooldown` (429), `provider_ref_invalid`, `attribution_not_connected` (estado, no error), `landing_unreachable` (hallazgo)
- Abuse/rate-limit posture: respetar límites de las APIs (backoff exponencial, `Retry-After`); cooldown de readback manual; fetch de landings con UA identificable, timeout 10 s, sin JS

### Runtime evidence

- Local checks: tests de adapters con fixtures de respuestas oficiales, guard de scopes, derivación de `actual` (sin mezcla de monedas), append-only, chequeo de destino con fixtures HTML (con y sin UTM, con redirección que la pierde)
- DB/runtime checks: migraciones verificadas; filas `actual` sólo con actor `system`
- Integration checks: conexión real de la cuenta de Meta de Efeonce con token de sólo lectura en staging; readback de una campaña real vigente; un token con `ads_management` rechazado; lane de atribución contra el portal de Efeonce en staging
- Reliability signals/logs: frescuras `ad_readback` y `landing_check` en el health profundo (desde `worker_run`, no desde el último dato); proyección por `platform.marketing_studio.health` en Greenhouse
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Adapters, derivación de `actual`, chequeo y progreso en `packages/domain`; atribución en `src/lib/growth/attribution`.
- [ ] Conexiones y observaciones como recursos; commands para conectar, mapear y pedir readback.
- [ ] `riskTier`: conectar/revocar `T2`; mapear/pedir `T1`; lecturas `T0`.
- [ ] Capability `marketing_studio.integration.manage` + grant + coverage test + cliente de canje en el mismo PR.
- [ ] Camino programático: `/api/v1` + tools; lanes Greenhouse + tool de atribución.
- [ ] Un primitive, muchos consumers.
- [ ] Parity check = SÍ.

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

### Slice 1 — Conexiones de cuentas publicitarias (`T2`)

- Migración `<ts>_ad-readback.sql`: `ad_account_connection`, `ad_performance_observation`, `ad_configuration.provider_ref`.
- `connectAdAccount` (`T2`, `requiresPerson`, `.integration.manage`): entrada `{ provider, externalAccountId,
  credentialSecretRef }` (nombre del secreto, nunca el valor). `dryRun`: el worker lee el secreto, llama la
  introspección oficial (Meta `debug_token`; LinkedIn introspección de token) y una lectura de la cuenta; rechaza con
  `ad_connection_write_scope_forbidden` si hay permisos de escritura; devuelve digest. Con digest confirma y activa.
  `revokeAdAccount` y `revalidateAdAccount` con la misma mecánica.
- CLI `pnpm ads:linkedin:authorize` (operador, loopback local) que obtiene el refresh token con scopes de reporte y lo
  publica directo en Secret Manager (`printf %s … | gcloud secrets versions add … --data-file=-`), sin imprimirlo;
  para Meta el token de usuario de sistema lo publica el operador con el mismo patrón.

### Slice 2 — Mapeo de anuncios y adapters de lectura

- `linkAdToProvider` (`T1`): `provider_ref` (proveedor, cuenta, campaña, conjunto/grupo, anuncio/creatividad) validado
  contra la cuenta conectada de la organización y el `readback_provider` del canal del anuncio.
- `meta-adapter.ts` y `linkedin-adapter.ts`: sólo lecturas de insights/analytics diarios por anuncio (gasto, moneda,
  impresiones, clics, resultados según objetivo), backoff y paginación; versión de API fijada y fechada.

### Slice 3 — Readback en el worker y líneas `actual`

- Job diario (Cloud Scheduler) + `requestAdReadback` (`T1`, cooldown 15 min por campaña): escribe observaciones
  append-only con `observed_at`, `source`, `worker_run_id`; restatements como filas nuevas.
- Derivación de `budget_line(kind='actual', granularity='month_channel')` por mes, canal y moneda desde la última
  observación de cada anuncio y día, con actor `system`; recomputo idempotente por mes.
- Frescura `ad_readback` en el health profundo (desde `worker_run`).

### Slice 4 — Greenhouse: atribución bow-tie y campos de formulario

- Reader `readCampaignBowtieAttribution(organizationId, { utmCampaigns, startDate, endDate })`: conteos por etapa del
  bow-tie (internal names) de contactos cuyo `utm_campaign` capturado coincide [verificar propiedad y fuente:
  proyección `greenhouse_crm` o raw `hubspot_crm` en BigQuery], y deals asociados por etapa y moneda (montos nunca
  sumados entre monedas). Organizaciones sin HubSpot conectado ⇒ `not_connected`.
- Reader `readFormAttributionFields(formRef)`: para Growth Forms de Greenhouse y formularios HubSpot conocidos por el
  puente, qué campos de atribución (`utm_*`, ocultos) captura; desconocido ⇒ `unverifiable`.
- Lanes `GET /api/platform/ecosystem/growth/attribution/campaign-bowtie` y
  `GET /api/platform/ecosystem/growth/forms/{formRef}/attribution-fields` con `runEcosystemReadRoute` y anti-oráculo;
  flag `GROWTH_CAMPAIGN_ATTRIBUTION_ENABLED`.
- Tool `get_campaign_bowtie_attribution` (read) en `src/mcp/greenhouse/tool-manifest.ts`; federación por el protocolo
  (sync, provider, `EXPECTED_*`, status, canary).

### Slice 5 — Chequeo de destino

- Migración `<ts>_landing-check.sql`: `landing_check` (observación append-only).
- `html-probe.ts`: `GET` con UA identificable, sigue hasta 5 redirecciones, registra cadena y si la UTM llegó al
  destino final; detecta etiqueta de medición declarada en el plan (GA4 `G-…` o contenedor `GTM-…`), `noindex`
  (informativo) y el formulario declarado; los campos de atribución los confirma el lane de Slice 4.
- `runLandingCheck` (`T1`) + job del worker al aprobar un plan y diario para campañas con lanzamiento próximo;
  resultado `ready | warning | blocked`. Fallas ⇒ ítem de atención y proyección en `checksPending` de los anuncios con
  ese destino (reader), sin escribir la fila del anuncio ni `launch_state`.

### Slice 6 — Progreso de KPIs y lecturas

- Reader `getKpiProgress(actor, campaignId)`: por KPI del plan **aprobado**, valor observado desde su
  `measurement_source` (TASK-1892 para GA4/GSC/SEO; observaciones de pauta; atribución), meta, ventana, `dataThrough` y
  estado `on_track | at_risk | off_track | no_data | not_connected`; nunca combina fuentes.
- Readers `getPaidPerformance` y `getCampaignAttribution`.

### Slice 7 — Mapeo de métricas editable (follow-up de TASK-1892)

- `setCampaignMetricsMapping` (`T1`) y `deriveCampaignMetricsMapping` (`T0`, propone desde el plan de medición y los
  anuncios).

### Slice 8 — Capability, gateway, canary y docs

- `marketing_studio.integration.manage` (`actions: ['create','update']`, concedidas juntas; grant `efeonce_admin`,
  `efeonce_operations`) + seed + coverage; cliente de canje `efeonce-mcp-marketing-studio-integration-manage` sembrado
  con la acción única `update` para conectar, revalidar y revocar (todas `T2`; decisión del operador 2026-09-26) +
  allowlist + redeploy.
- Registro con `riskTier`, manifiestos, sync del gateway, bump minor, `surface:baseline`, dispatch.
- Docs: arquitectura de Studio (medición), runbook (conectar cuentas, rotación de tokens, readback manual), manual
  servido, ledger de flags (runtimes: worker de Studio en Cloud Run, Vercel de Studio, Vercel de Greenhouse), skills.

## Out of Scope

- Cualquier escritura en Meta o LinkedIn (lanzar, pausar, editar, presupuesto): ADR nuevo con su clase de scope.
- Google Ads y TikTok Ads readback (follow-up con la misma receta cuando se usen).
- Atribución multi-toque (ADR §11.7).
- Experimentos, aprendizajes y calendario unificado (TASK-1911).
- UI (TASK-1912; la tarjeta «Pauta» de TASK-1895 es un Delta sugerido).

## Detailed Spec

### Modelo (Studio)

| Tabla | Columnas clave |
|---|---|
| `ad_account_connection` | `connection_id PK`, `organization_id`, `provider meta_ads\|linkedin_ads`, `external_account_id`, `credential_secret_ref`, `status pending\|active\|revoked\|error`, `verified_scopes text[]`, `verified_at`, `connected_by`, `revision` |
| `ad_performance_observation` | `observation_id PK`, `connection_id`, `campaign_id`, `ad_id`, `provider_ad_ref`, `day date`, `currency`, `spend numeric NULL`, `impressions bigint NULL`, `clicks bigint NULL`, `results jsonb`, `objective`, `observed_at`, `worker_run_id` |
| `landing_check` | `check_id PK`, `campaign_id`, `url`, `checked_at`, `http_status NULL`, `final_url NULL`, `redirects jsonb`, `utm_preserved bool NULL`, `measurement_tag jsonb`, `form jsonb`, `noindex bool NULL`, `result ready\|warning\|blocked`, `findings jsonb`, `worker_run_id NULL`, `requested_by NULL` |

### Operaciones y tools

| operationId | Método y ruta | Tool | Nivel | Capability |
|---|---|---|---|---|
| `listAdConnections` | `GET /api/v1/ad-connections?organizationId=` | `studio.ad_connections.list` | T0 | `.campaign.read` |
| `connectAdAccount` | `POST /api/v1/ad-connections` | `studio.ad_connection.connect` | T2 (persona) | `.integration.manage` |
| `revalidateAdAccount` · `revokeAdAccount` | `POST /api/v1/ad-connections/{connectionId}/revalidate` · `…/revoke` | `studio.ad_connection.revalidate` · `studio.ad_connection.revoke` | T2 | `.integration.manage` |
| `linkAdToProvider` | `PUT /api/v1/ads/{adId}/provider-link` | `studio.ad.provider_link.set` | T1 | `.campaign.write` |
| `requestAdReadback` | `POST /api/v1/campaigns/{campaignId}/paid-performance/readback` | `studio.campaign.paid_performance.readback` | T1 | `.campaign.write` |
| `getPaidPerformance` | `GET /api/v1/campaigns/{campaignId}/paid-performance?from=&to=` | `studio.campaign.paid_performance.get` | T0 | `.campaign.read` |
| `getCampaignAttribution` | `GET /api/v1/campaigns/{campaignId}/attribution?from=&to=` | `studio.campaign.attribution.get` | T0 | `.campaign.read` |
| `runLandingCheck` | `POST /api/v1/campaigns/{campaignId}/landing-checks` | `studio.campaign.landing_check.run` | T1 | `.campaign.write` |
| `listLandingChecks` | `GET /api/v1/campaigns/{campaignId}/landing-checks` | `studio.campaign.landing_checks.list` | T0 | `.campaign.read` |
| `getKpiProgress` | `GET /api/v1/campaigns/{campaignId}/kpi-progress` | `studio.campaign.kpi_progress.get` | T0 | `.campaign.read` |
| `deriveCampaignMetricsMapping` | `GET /api/v1/campaigns/{campaignId}/metrics-mapping/proposal` | `studio.campaign.metrics_mapping.propose` | T0 | `.campaign.read` |
| `setCampaignMetricsMapping` | `PUT /api/v1/campaigns/{campaignId}/metrics-mapping` | `studio.campaign.metrics_mapping.set` | T1 | `.campaign.write` |
| `ads:linkedin:authorize` | CLI | exclusión: flujo OAuth interactivo del operador con secreto | — | `operator_cli` |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Dependencias en producción → Slice 1 → Slice 2 → Slice 3 · Slice 4 (Greenhouse) en paralelo → Slice 5 → Slice 6 →
  Slice 7 → Slice 8.
- Ninguna conexión real antes de que el guard de scopes esté probado con un token con permisos de escritura (debe
  rechazarse).
- Flags: worker y Vercel de Studio primero en staging; Greenhouse antes que Studio consuma el lane.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Token con permisos de escritura aceptado | plataformas publicitarias | low | introspección al conectar y revalidación diaria; ningún método de escritura en los adapters | `ad_connection_write_scope_forbidden` |
| `actual` incorrecto por restatement | presupuesto | medium | observaciones append-only y recomputo desde la última por anuncio/día | diferencia vs plataforma en el canary |
| Suma de monedas distintas | presupuesto | low | derivación por moneda; test | test |
| Fuga de secreto en logs | secretos | low | sólo `credential_secret_ref`; scrubbing de `@studio/observability` | leak test y revisión de logs |
| Atribución con PII | datos personales | low | reader agregado; test de forma del DTO | test |
| Chequeo de destino interpretado como lanzamiento | estados | low | no toca `launch_state`; descripción de tool | revisión del canary |

### Feature flags / cutover

- `STUDIO_AD_READBACK_ENABLED` (worker de Studio en Cloud Run; declarado en su configuración de despliegue [verificar
  ruta] y aplicado en vivo; los dos, o el siguiente deploy lo borra).
- `STUDIO_LANDING_CHECK_ENABLED` (worker + Vercel de Studio).
- `GROWTH_CAMPAIGN_ATTRIBUTION_ENABLED` (Vercel de Greenhouse).
- Filas en `FEATURE_FLAG_STATE_LEDGER.md` con cada runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `revokeAdAccount`; deshabilitar versión del secreto | < 15 min | sí |
| Slices 2–3 | `STUDIO_AD_READBACK_ENABLED=false`; líneas `actual` recomputables | < 15 min | sí |
| Slice 4 | `GROWTH_CAMPAIGN_ATTRIBUTION_ENABLED=false` | < 5 min | sí |
| Slice 5 | `STUDIO_LANDING_CHECK_ENABLED=false` | < 5 min | sí |
| Slices 6–8 | revert PR + regenerar manifiesto + sync | < 30 min | sí |

### Production verification sequence

1. Staging: guard de scopes rechaza un token con escritura; acepta uno de sólo lectura.
2. Staging: conexión de la cuenta de Meta de Efeonce (`T2` con digest), mapeo de un anuncio real, readback de 90 días
   con dry-run → apply; comparar gasto de 3 días contra el administrador de anuncios.
3. Greenhouse staging: lane de atribución para Efeonce devuelve conteos agregados; org sin HubSpot ⇒ `not_connected`.
4. Chequeo de destino sobre una landing real y una con redirección que pierde la UTM ⇒ `blocked`.
5. Production con flags OFF → ON por runtime; sesión MCP real con persona.

### Out-of-band coordination required

- Admin de Meta Business y de LinkedIn Campaign Manager genera credenciales de sólo lectura.
- Operador publica secretos y concede `secretAccessor` acotado a la SA del worker.
- Allowlist del cliente de canje + redeploy de Greenhouse; dispatch del gateway.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Conectar una cuenta exige persona y digest; un token con permisos de escritura se rechaza (probado).
- [ ] Ningún adapter tiene métodos de escritura (test estático).
- [ ] Observaciones diarias append-only para anuncios mapeados; un restatement crea fila nueva.
- [ ] Las líneas `actual` existen sólo con actor `system`, por moneda, y nunca se suman con propuesto/aprobado.
- [ ] El gasto observado de 3 días coincide con la plataforma en el canary.
- [ ] El lane de atribución devuelve conteos por etapa del bow-tie sin PII; organización sin HubSpot ⇒ `not_connected`.
- [ ] El chequeo de destino detecta UTM perdida por redirección y lo muestra en atención y `checksPending`, sin tocar `launch_state`.
- [ ] El progreso de KPIs usa sólo la fuente declarada de cada KPI y dice `no_data` cuando falta.
- [ ] El mapeo de métricas se edita por API y MCP.
- [ ] `marketing_studio.integration.manage` sembrada con grant, coverage y cliente de canje que verifica la acción `update`; sesión MCP real verde.
- [ ] Frescuras `ad_readback` y `landing_check` en el health profundo, calculadas desde `worker_run`.

## Verification

- Studio: `pnpm check` + `pnpm build`; tests del worker.
- Greenhouse: `pnpm local:check`, tests de `src/lib/growth/attribution`, `pnpm mcp:manifest:check`; `pnpm test` + `pnpm build` al cerrar.
- Gateway: tests + `pnpm surface:baseline`; canary.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skills `efeonce-marketing-studio` y `efeonce-campaign-planning` actualizadas y espejadas.
- [ ] `EPIC-049` refleja el estado de esta task.

## Follow-ups

- Readback de Google Ads y TikTok Ads.
- Atribución multi-toque (ADR §11.7).
- ADR de escritura en plataformas publicitarias con su clase de scope (sólo si el operador lo pide).

## Open Questions

- ¿Qué propiedad de HubSpot guarda la `utm_campaign` capturada (primera o última conversión) y dónde está proyectada en Greenhouse? Discovery la confirma; si no existe, la atribución responde `not_connected` y se abre follow-up con `hubspot-greenhouse-bridge`.
