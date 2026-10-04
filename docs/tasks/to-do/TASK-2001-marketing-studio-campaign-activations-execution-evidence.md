# TASK-2001 — Marketing Studio: activaciones de campaña y evidencia de ejecución

## Delta 2026-10-04 (posterior) — lo que la UI aprobada necesita del contrato

El operador aprobó la dirección visual completa de TASK-2002 (páginas v3, v3.1 y v3.2; renders en
`docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/`) y las decisiones propuestas. Esta task suma al
contrato lo que esas pantallas leen o escriben; la UI no calcula nada de esto:

- **Mercado y hora local.** La activación guarda `market` (país ISO, atributo de la activación según TASK-1905) y la cuenta
  su zona IANA. `GET /api/v1/calendar` acepta `market` como filtro y cada activación devuelve la hora en la zona de la
  cuenta y en America/Santiago.
- **Evidencia owned.** Email desde HubSpot (proveedor de lectura `hubspot`, canal `email_hubspot`): programado y enviado
  como evidencia; entregados, aperturas y clics llegan con TASK-1892/1910. Blog y landing: **lector del WordPress del sitio
  público** (proveedor nuevo `wordpress`, aprobado por el operador) con URL viva y fecha de publicación observada; sin él,
  esas activaciones sólo pueden quedar `planned` u `overdue`.
- **Avisos que calcula el reader:** `piece_not_approved` (la versión planificada no está aprobada), `version_mismatch` (la
  versión en la herramienta no es la planificada; identificada por hash o nombre canónico del archivo), `same_account_same_time`
  (otra activación de la misma cuenta a la misma hora; advierte, no bloquea) y `tool_stale` (frescura por herramienta, que
  alimenta la barra de estado).
- **Command `rescheduleActivation`** separado de `updateActivation`: recibe la nueva fecha y devuelve el estado resultante
  (p. ej. `scheduled_off_plan` con su diferencia) para que el diálogo avise antes de confirmar; nunca toca la herramienta.
- **Validación en seco.** `planActivation` y `updateActivation` aceptan `dryRun: true` y devuelven los chequeos del catálogo
  (copy contra el límite del canal, formato admitido en el placement, pieza aprobada, colisión de hora) sin escribir.
- **Crear desde ejecución.** `createActivationFromExecution` responde los campos precargados con su origen
  (`source: tool`) y exige campaña y pieza antes de vincular.
- **Registro de eventos** append-only por activación (`planned`, `updated`, `rescheduled`, `linked`, `unlinked`,
  `discovered`, `published_observed`, `cancelled`, con actor persona, agente o regla), expuesto por `getActivation`; es la
  base del historial que construye TASK-2005.
- **Tracking congelada** (`tracking_frozen`) en cuanto hay evidencia publicada o de entrega, ya prevista; la UI la muestra
  bloqueada.

## Delta 2026-10-04 — estados de pauta y tolerancia (decisión del operador, dirección visual v3)

Decidido por el operador sobre la dirección visual v3 de TASK-2002 ([canvas «Efeonce Marketing Studio»](https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi), páginas
«v3 · Calendario de activaciones» y «v3.1 · Línea de tiempo por plataforma»):

- **Dos estados de ejecución nuevos, sólo para paid:** `delivering` («En curso»: entrega observada desde el inicio real) y
  `ended` («Finalizada»: fin observado). `published` queda para organic y owned. En paid, `overdue` significa que pasó el
  inicio planificado sin entrega observada. Los calcula el reader; la UI nunca los deriva.
- **Paid compara inicio y fin por separado**, como fechas de calendario en la zona horaria de la cuenta de anuncios (no
  horas). Tolerancia por defecto **0 días**, como dato del catálogo de canales y editable por versión, igual que la de
  organic. Una diferencia en el inicio o en el fin es `scheduled_off_plan`, con la diferencia visible (p. ej. «inicio +2 d»).
- El reader expone por activación paid: fechas planificadas, fechas configuradas en la herramienta, inicio y fin observados
  y el id de la campaña en la herramienta, para que la UI pinte plan, herramienta y entrega como tres capas.

## Decisión vigente 2026-10-04 (posterior) — escritura por MCP con TASK-2003

El operador decidió (2026-10-04, después de retirar TASK-1899) que Efeonce es agent-friendly y que todo lo de EPIC-049
nace Full API Parity con sus tools en el MCP, **escrituras incluidas**. La «nueva decisión» que dejaba pendiente la
retirada de TASK-1899 es **TASK-2003**: núcleo de escritura por MCP con identidad delegada (scope en Entra, canje por
capability exacta, persona como actor, gateway con escrituras `T1`), **sin** aprobaciones ni `proposalDigest`, que
siguen retirados en TASK-1899. Las escrituras `T1` de esta task se federan sobre TASK-2003 cuando esté vivo; las `T2`
siguen por CLI/UI. La implementa Codex.

**Sin bloqueo** (revisión de Codex aceptada por el operador, 2026-10-04): esta task **no espera** a TASK-2003. Se
construye en paralelo (API, CLI y UI) con todas sus tools en el manifiesto; sus escrituras se federan por MCP en cuanto
TASK-2003 esté vivo.

## Decisión vigente 2026-10-04 — desarrollo sin TASK-1899

El operador retiró TASK-1899 por la fricción que añadiría en esta etapa. Su diseño de escritura MCP deja de ser
prerrequisito de desarrollo y cierre del alcance API/CLI/UI de esta task. La federación de escrituras MCP y su
verificación se retiran del alcance actual, pendientes de una nueva decisión; nunca se declaran operativas por
cerrar ese alcance. Esta decisión prevalece sobre las referencias y criterios MCP de TASK-1899 conservados más
abajo. API-first, dependencias funcionales y controles de acceso existentes siguen vigentes.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-04 — Full API Parity y operación por MCP obligatorias (decisión del operador)

- **Regla:** todo lo que esta task implemente nace con command o reader en `packages/domain`, ruta `/api/v1`, entrada en
  el registro con **tool** (exclusión sólo para transporte o metadatos, nunca para una capacidad de negocio) y **tool
  federada y operable por Efeonce MCP**, lecturas **y escrituras**, con la identidad delegada de la persona
  (carril de TASK-2003: clase `efeonce.mcp.marketing_studio.write`, canje por capability exacta, persona como actor;
  las aprobaciones `T2` siguen por CLI/UI mientras TASK-1899 esté retirada). La UI es un cliente más de esos commands.
- **Cierre:** la task no se cierra hasta que una **sesión MCP real** (token Entra humano) ejecuta cada operación nueva
  —leer, planificar y editar (las `T2` por CLI/UI mientras TASK-1899 esté retirada)— y la evidencia queda registrada. Manual servido
  (`docs/mcp/skills/marketing-studio/SKILL.md`) actualizado con las tools nuevas.
- **Orden:** no espera a TASK-2003. Toda operación nace con su tool en el manifiesto; las lecturas se federan y prueban al
  cerrar; las escrituras se federan y prueban por MCP cuando TASK-2003 esté vivo (si ya lo está al cerrar, se prueban ahí).

## Delta 2026-10-04 — UTM derivadas de la activación (RESEARCH-012)

- Por [RESEARCH-012](../../research/RESEARCH-012-utm-relevance-ga4-activation-tracking.md): cada activación expone su **tracking URL** generada con la convención (`utm_content` = id de la activación, `utm_id` = id de la campaña); la evidencia de ejecución compara la URL publicada con la generada (sin UTM o con otra = advertencia).

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-10-04 por decisión del operador (ADR de estrategia §15: el calendario es de Studio; la ejecución es evidencia); ningún slice empezado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1905 (catálogo de canales con channel_key, valores UTM por canal y semilla de §15). La evidencia de paid desde Meta/LinkedIn llega con TASK-1910`
- Branch: `efeonce-marketing-studio main (migraciones, dominio, worker, rutas, registro, manifiesto) · Greenhouse develop (docs, manual servido) · efeonce-mcp rama + PR (sync del manifiesto); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la **activación** como entidad de Studio: la salida concreta de una campaña en un canal (campaña obligatoria,
modalidad, familia, plataforma, placement, cuenta, mercado, pieza en versión exacta, copy y fecha planificada; punto
para organic/owned, franja para paid). Las herramientas que ejecutan dejan de definir el calendario: lo que Metricool
(y después las plataformas de ads) tiene programado o publicado entra como **evidencia de ejecución** adjunta a la
activación, y Studio compara plan contra ejecución (`planned`, `scheduled`, `scheduled_off_plan`, `published`,
`overdue`, `cancelled`). Lo programado sin activación aparece en «Hoy» como **ejecución sin activación**. El calendario
(`studio.calendar.get`) pasa a leer activaciones. La UI es TASK-2002.

## Why This Task Exists

- Verificado el 2026-10-04: Metricool tenía 14 publicaciones programadas entre el 4 y el 20 de octubre (incluido el
  reel de «Los Sparks» del 5/10 14:00); el calendario de Studio mostraba 3. Studio sólo conoce los posts que llegan en el
  catálogo de OneDrive al importar; el readback de Metricool (TASK-1893) actualiza los posts conocidos y nunca descubre
  los nuevos.
- `studio.scheduled_post` modela el post **de la herramienta**: guarda `media` como URLs de Metricool, no referencia la
  pieza ni su versión, y su `channel` es texto libre. El calendario y «Hoy» pintan la portada de la campaña, no la pieza.
- No existe el **plan**: no hay dónde decir «este spot sale en Instagram el 5/10 y en LinkedIn el 8/10» antes de
  programarlo, ni con qué comparar lo que pasó.
- El operador decidió (ADR de estrategia §15, 2026-10-04): la campaña es el objeto canónico, no hay activación sin
  campaña (el contenido permanente vive en campañas **Always On**), el calendario es de Studio y Metricool es un
  atributo de ejecución.

## Goal

- Toda salida a un canal es una activación de una campaña, con sus dimensiones de canal validadas contra el catálogo.
- La ejecución de cada herramienta queda como evidencia adjunta, nunca como plan; el estado de ejecución se calcula.
- Lo programado en Metricool aparece en Studio sin cargas manuales: vinculado a su activación o como «ejecución sin
  activación» para que una persona decida.
- El calendario, «Hoy», el MCP y la UI leen el mismo reader de activaciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (**gobernante**: §4.2 y
  §15 — taxonomía de canales, activaciones, calendario de Studio, ejecución como evidencia)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 invariantes: programado ≠
  publicado, `null` = ausente; §7.2 worker y readback de Metricool; §7.4 commands, autoridad por campaña)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` y `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **No hay activación sin campaña** (las campañas Always On son campañas normales con `kind`).
- **La herramienta no define el plan:** la evidencia de ejecución nunca crea ni mueve una activación por sí sola; sólo
  una persona (o un agente con su identidad delegada, TASK-1899) crea, vincula o reprograma.
- **Programado ≠ publicado:** `published` exige observación con fecha; programado en el pasado sin observación =
  `overdue`.
- **Canal del catálogo:** `channel_key` + placement + cuenta validados contra la versión del catálogo (TASK-1905); el
  mercado y el buying method nunca van en el `channel_key`.
- **Pieza en versión exacta:** la activación referencia `asset_version_id` (no sólo la pieza); la UI y los agentes ven
  qué versión salió.
- `packages/domain` libre de framework; errores `{ error (es-CL), code, actionable }`; `null` = ausente; versiones sólo en
  el `catalog:`; registro de operaciones con tool o exclusión; manifiesto regenerado, nunca a mano.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- Skill `efeonce-marketing-studio` (`references/contracts.md`, `operations.md`, `lessons.md`)
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` (nodos `MS-N1` Hoy y `MS-N4` Calendario)

## Dependencies & Impact

### Depends on

- TASK-1905 (catálogo de canales, `channel_key`, semilla de §15, `riskTier` en el registro).
- TASK-1894 Entregable B (en producción): kernel de commands, `Idempotency-Key`, `If-Match`, `revision`, auditoría.
- TASK-1893 (complete): worker de medios, cliente de Metricool (`providers/metricool/client.ts`), `worker_run`,
  `recordPostObservation`, `runMetricoolReadback`.

### Blocks / Impacts

- **TASK-2002** (UI del calendario y de activaciones) consume este contrato.
- **TASK-1911**: su «calendario unificado» pasa a esta task y a TASK-2002; TASK-1911 conserva experimentos y
  aprendizajes y suma las ventanas de experimento al reader de calendario como follow-up (delta en TASK-1911).
- **TASK-1907**: `setContentPlanItemProgress` vincula ítems del plan con activaciones (`activation_id`) además de pieza,
  copy y anuncio; un ítem puede tener varias activaciones (delta en TASK-1907).
- **TASK-1910**: la evidencia de paid (anuncio activo, entregas observadas) se adjunta a activaciones pagadas por el mismo
  modelo de evidencia (delta en TASK-1910).
- **TASK-1892**: el «adapter de social orgánico (Metricool)» que dejaba como follow-up queda cubierto por el
  descubrimiento de esta task.
- **TASK-1899**: federa las escrituras de activaciones con identidad delegada.

### Files owned

- `efeonce-marketing-studio/packages/database/migrations/<ts>_campaign-activations.sql` + `packages/database/src/schema.ts`
- `efeonce-marketing-studio/packages/domain/src/activations/**` (commands, estado de ejecución, emparejamiento, readers)
- `efeonce-marketing-studio/packages/domain/src/providers/metricool/**` (descubrimiento de programados)
- `efeonce-marketing-studio/packages/domain/src/readers/overview.ts` (`getCalendarRange`, atención)
- `efeonce-marketing-studio/packages/contracts/src/{dto,semantics,errors,operations-activations}.ts` + `operations.ts` + `generated/tool-manifest.json`
- `efeonce-marketing-studio/apps/web/src/app/api/v1/activations/**` y `.../campaigns/{campaignId}/activations/**`
- `efeonce-marketing-studio/apps/worker/{src/handlers.ts,src/config.ts,deploy.sh}` + `scripts/ops/infra/media-originals.sh` (scheduler del descubrimiento)
- Greenhouse: esta task, `docs/mcp/skills/marketing-studio/SKILL.md`, skill `efeonce-marketing-studio`, `FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- `studio.scheduled_post` (`post_id`, `campaign_id`, `post_key`, `provider`, `provider_brand_id`, `provider_post_id`,
  `provider_post_uuid`, `network`, `scheduled_at`, `scheduled_timezone`, `body_text`, `media` jsonb de URLs de la
  herramienta, `planner_url`, `provider_status`, `observed_at`, `observation_source`, `published_at`, `permalink`,
  `revision`); 6 filas en producción (CMP-001 ×3 de septiembre, CMP-003 ×3 de octubre).
- Commands `createScheduledPost` / `updateScheduledPost` / `cancelScheduledPost` (TASK-1894 B): Studio planifica
  `PLANNED`, cancela `CANCELLED`, nunca publica; un post del proveedor no se edita.
- Readback de Metricool en el worker (`/jobs/metricool-readback` cada 30 min, `MEDIA_WORKER_METRICOOL_READBACK_ENABLED`
  ON en producción), marcas permitidas `METRICOOL_BLOG_IDS=3961547,5105024`; sólo consulta posts conocidos.
- `getCalendarRange` (`studio.calendar.get`): vuelos por semana + posts; `undated` con razón; miniatura = portada de la
  campaña (`campaignThumbs`).
- `ad_configuration` (anuncio con `channel`, `placement`, `audience_key`, `objective`, `utm`) y `media_flight` (fechas).
- Autoridad por campaña: escrituras del catálogo sobre campañas `onedrive` ⇒ `409 campaign_not_studio_owned`.

### Gap

- No hay entidad de plan de salida (activación), ni dimensiones de canal estructuradas, ni vínculo post ↔ versión de pieza.
- No hay descubrimiento de lo programado en la herramienta ni comparación plan ↔ ejecución.
- `campaign.kind` (Always On) no existe.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` — dominio `packages/domain/src/activations`, worker de medios (descubrimiento), rutas `/api/v1` en `apps/web`
- Future candidate home: `remain-shared`
- Boundary: commands y readers de activaciones en `packages/domain`; consumidores autorizados: rutas `/api/v1`, tools MCP federadas, UI de TASK-2002, plan de contenidos de TASK-1907, readback pagado de TASK-1910
- Server/browser split: commands, readers y descubrimiento corren en el servidor (web y worker); la UI sólo llama la API
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (cambio de fuente de verdad del calendario + integración externa en el worker + backfill de los posts existentes)
- Impacto principal: `command`
- Source of truth afectado: `studio.activation` (nueva) + `studio.execution_record` (nueva; absorbe la evidencia hoy en `scheduled_post`) + `studio.campaign.kind`
- Consumidores afectados: web (Calendario, Hoy, espacio de campaña), `studio.calendar.get`, `studio.attention.get`, `studio.campaign.posts.list`, MCP, health profundo (`overdue_unverified_posts`)
- Runtime target: `staging` → `production`; worker de medios (Cloud Run)

### Contract surface

- Contrato existente a respetar: `getCalendarRange`, `listCampaignPosts`, `getAttention`, commands de posts de TASK-1894 B, readback de TASK-1893, `ScheduledPost` DTO.
- Contrato nuevo o modificado:
  - `Activation { activationId, campaignId, kind: 'point' | 'span', channelKey, modality, family, platform, placement, account, market, buyingMethod | null, assetVersions[] (assetId, versionNo, position), copyId | null, adConfigurationId | null, plannedAt | plannedRange, timezone, state: draft | planned | cancelled, execution: { status, records[] }, revision }`.
  - `ExecutionRecord { recordId, provider (metricool | meta_ads | linkedin_ads | google_ads | …), providerRef, accountRef, network, scheduledAt | null, observedAt | null, publishedAt | null, permalink | null, providerStatus, activationId | null, linkedBy: person | rule | null, mediaRefs }`.
  - Estado de ejecución calculado (nunca guardado): `planned | scheduled | scheduled_off_plan | published | overdue | cancelled`, con la tolerancia por canal como dato del catálogo.
  - Commands (registro, `riskTier`): `planActivation`, `updateActivation`, `cancelActivation` (T1); `linkExecution`, `unlinkExecution` (T1); `createActivationFromExecution` (T1, desde «ejecución sin activación»).
  - Readers: `listCampaignActivations`, `getActivation`, `listUnlinkedExecutions` (T0); `getCalendarRange` lee activaciones (+ vuelos) y agrega filtros `modality`, `family`, `platform`, `account`, `campaignId`, `executionStatus`.
  - `campaign.kind ∈ {campaign, always_on}` (`createCampaign` lo acepta; Always On sin fecha de fin obligatoria).
  - Atención: ítems `execution_without_activation`, `activation_overdue`, `scheduled_off_plan`.
- Backward compatibility: `gated` — `scheduled_post` y sus commands siguen hasta el contract posterior al release; `ScheduledPost` se proyecta desde `execution_record` mientras conviven; `studio.calendar.get` agrega campos (compatible) y cambia su descripción (bump de versión del gateway en el sync).
- Full API parity: cada command con ruta `/api/v1`, entrada en el registro y tool MCP; la UI de TASK-2002 escribe sólo por ellos.

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.activation`, `studio.activation_asset`, `studio.execution_record`, `studio.campaign` (`kind`), `studio.scheduled_post` (expand → contract).
- Invariantes que no se pueden romper:
  - `activation.campaign_id NOT NULL`; `execution_record.activation_id` nullable (ejecución sin activación).
  - Un `execution_record` se vincula a lo más a una activación; una activación puede tener varios (reprogramación, cross-post).
  - La evidencia nunca cambia `planned_at` ni crea activaciones; sólo una persona (o regla de emparejamiento explícita, ver abajo) vincula.
  - `published` sólo con `observed_at` + `published_at` de la herramienta; programado nunca se muestra como publicado.
  - `channel_key` válido en la versión de catálogo fijada en la activación; mercado y buying method fuera del `channel_key`.
  - Pieza por `asset_version_id` de la misma campaña con `review_state ∈ {imported, approved}` (una versión `pending_review` no se planifica para salir).
  - `null` = ausente (sin copy, sin placement conocido); nunca valores inventados.
- Write-target allowlist: `N/A` (Studio no tiene boundary test de destinos de escritura).
- Tenant/space boundary: organización vía la campaña (`scopeCampaigns`); `listUnlinkedExecutions` filtra por las marcas de Metricool permitidas a la organización.
- Idempotency/concurrency: commands con `Idempotency-Key` + `If-Match` (`revision`); descubrimiento idempotente por `(provider, provider_ref)` con `ON CONFLICT`; el emparejamiento automático corre en la misma transacción que la escritura de la evidencia.
- Audit/outbox/history: `audit_event` en cada command y en cada vínculo automático (`linkedBy: rule`, con la regla); `worker_run kind='metricool_discovery'`.

**Autoridad por campaña (decisión propuesta, a confirmar en el Plan):** activaciones y evidencia **no** son territorio del
import de OneDrive (el catálogo no las trae y el import no las toca), así que se pueden escribir también en campañas
`source_of_truth = 'onedrive'`, igual que la puerta de ingreso y la revisión de versiones. El import deja de crear
`scheduled_post` para campañas que ya tengan activaciones.

**Emparejamiento automático (regla propuesta, a confirmar):** se vincula sin persona sólo si hay **exactamente una**
activación `planned` de la misma campaña (resuelta por `utm_campaign` del enlace del post o por la cuenta), misma
plataforma y cuenta, y la fecha programada cae dentro de la tolerancia del canal. Cualquier otro caso queda como
«ejecución sin activación». Nunca se adivina la campaña por el texto.

### Migration, backfill and rollout

- Migration posture: `additive` (tablas nuevas + `campaign.kind` con default `campaign`); contract de `scheduled_post` en una migración posterior al release (`docs/tasks/pending-migrations/`).
- Default state: flags OFF — `STUDIO_ACTIVATIONS_ENABLED` (web: rutas de escritura y lectura nueva del calendario) y `MEDIA_WORKER_METRICOOL_DISCOVERY_ENABLED` (worker).
- Backfill plan: los 6 `scheduled_post` existentes pasan a `execution_record` (sin pérdida de observación); un dry-run propone activaciones para cada uno y una persona confirma (`createActivationFromExecution`); el descubrimiento trae lo programado en Metricool desde hoy menos 30 días.
- Rollback path: flags OFF (el calendario vuelve al reader actual); `migrate down` sólo sin activaciones confirmadas; `scheduled_post` intacto hasta el contract.
- External coordination: ninguna credencial nueva (el token de Metricool y `METRICOOL_BLOG_IDS` existen); scheduler nuevo del descubrimiento; sync del gateway con autorización.

### Security and access

- Auth/access gate: lectura `marketing_studio.campaign.read` / `studio:read`; escritura `marketing_studio.campaign.write` / `studio:write` (T1); sesión de persona hasta TASK-1898; MCP con identidad delegada en TASK-1899.
- Sensitive data posture: el texto de los posts es contenido de marca, sin PII; el token de Metricool sigue en Secret Manager y no se loggea.
- Error contract: `activation_not_found`, `channel_not_in_catalog`, `asset_version_not_plannable`, `execution_already_linked`, `revision_conflict`, `campaign_required` (catálogo cerrado, es-CL).
- Abuse/rate-limit posture: descubrimiento con ventana acotada (−30/+120 días) y reintentos con backoff ante 429 de Metricool (cliente existente).

### Runtime evidence

- Local checks: tests de estado de ejecución (cada estado por fixture, tolerancia por canal, zona horaria America/Santiago), emparejamiento (único, ambiguo, sin UTM), idempotencia del descubrimiento, paridad del registro, leak test.
- DB/runtime checks: migración en staging (up/down/up), backfill dry-run y apply sobre los 6 posts, `execution_record` = 6 + programados descubiertos.
- Integration checks: descubrimiento real contra Metricool (marcas 3961547 y 5105024) en staging; caso «Los Sparks» 5/10 y 8/10 visible como evidencia vinculable.
- Reliability signals/logs: health profundo reemplaza `overdue_unverified_posts` por `activations_overdue` y agrega `metricool_discovery` (frescura); `worker_run`.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist del dominio donde exista: `N/A`.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `packages/domain/src/activations`, no en la UI.
- [ ] Activación modelada como recurso con commands, no como handler de pantalla.
- [ ] Reads como readers canónicos; writes con `Idempotency-Key`, `If-Match`, capability fina, auditoría, errores canónicos y observabilidad.
- [ ] Sin capability nueva (usa `.campaign.read` / `.campaign.write`); si el Plan decide una propia, va con grant y coverage test en el mismo PR.
- [ ] Camino programático: `/api/v1` + tools MCP (lectura federada; escritura con TASK-1899).
- [ ] Writes aptos para `propose → confirm → execute` (`dryRun` en cada command).
- [ ] Un primitive, muchos consumers: calendario, Hoy, MCP, plan de contenidos y UI leen el mismo reader.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Esquema y Always On

- Migración: `activation`, `activation_asset`, `execution_record`, `campaign.kind`; verificación `DO … RAISE`; grants.
- `createCampaign`/`updateCampaign` aceptan `kind: always_on`.

### Slice 2 — Commands y estado de ejecución

- `planActivation`, `updateActivation`, `cancelActivation` con validación de catálogo, pieza planificable y campaña.
- Cálculo puro del estado de ejecución (con tolerancia por canal) y tests.

### Slice 3 — Evidencia y descubrimiento

- `execution_record` como destino del readback existente (observación) y del descubrimiento nuevo de programados en
  Metricool (`/jobs/metricool-discovery`, scheduler, flag); emparejamiento automático según la regla; `linkExecution`,
  `unlinkExecution`, `createActivationFromExecution`.

### Slice 4 — Readers, calendario y atención

- `listCampaignActivations`, `getActivation`, `listUnlinkedExecutions`; `getCalendarRange` desde activaciones con filtros
  por dimensión; ítems de atención; health profundo.

### Slice 4b — Tracking URL por activación ([RESEARCH-012](../../research/RESEARCH-012-utm-relevance-ga4-activation-tracking.md) §Origen y ciclo de vida)

- `buildTrackingUrl(activation, catalogVersion)` pura en `packages/domain/src/activations/tracking.ts`: `utm_source`,
  `utm_medium`, `utm_source_platform` y modo de etiquetado desde el catálogo; `utm_campaign` (slug congelado) y `utm_id`
  desde la campaña; `utm_content` = id público de la activación `ACT-######`; `utm_term`, `utm_creative_format` y
  `utm_marketing_tactic` desde anuncio, placement/pieza y audiencia; `null` se omite.
- Slug de campaña: se genera en `createCampaign` y se congela con la primera activación con evidencia; migración que
  agrega `campaign.utm_campaign_slug` y lo rellena para CMP-001…005 con revisión de una persona.
- Snapshot en la activación (`tracking_url`, `tracking_params`, `catalog_version`); se regenera mientras no haya
  evidencia y se congela después (`tracking_frozen`).
- Validación: destino `https` en dominios propios de la organización; destino sin `utm_*` (`destination_has_tracking`);
  vocabulario cerrado.
- Comparación con lo publicado: la evidencia de ejecución extrae los enlaces del post o del anuncio y marca
  `tracking_missing` / `tracking_mismatch` como advertencias en la activación y en «Hoy».
- Operación `previewTrackingUrl` (T0) y campo `tracking` en `getActivation` / `listCampaignActivations`.

### Slice 5 — Registro, manifiesto y backfill

- Operaciones con `riskTier`, tools y exclusiones; manifiesto; API minor; backfill de los 6 posts con confirmación.

## Out of Scope

- UI del calendario y de las activaciones (TASK-2002).
- Publicar o programar en Metricool o en plataformas de ads desde Studio (Studio nunca publica).
- Evidencia desde Meta/LinkedIn/Google Ads (TASK-1910; esta task deja el modelo listo).
- Ventanas de experimento en el calendario (TASK-1911).
- Contract (retiro) de `scheduled_post`: migración posterior al release.

## Detailed Spec

**Tolerancia por canal.** `scheduled` si la fecha de la herramienta cae a ±15 min de la planificada para organic social
(dato del catálogo, editable por versión); fuera de eso, `scheduled_off_plan` con la diferencia visible.

**Franja (paid).** Una activación pagada referencia `adConfigurationId` y su `plannedRange` = el flight (o una
subventana); el estado sale de la evidencia de la plataforma (TASK-1910); sin evidencia, `planned`.

**Proyección compatible.** Mientras conviven, `listCampaignPosts` y `ScheduledPost` se proyectan desde
`execution_record`, para no romper la UI vigente ni la tool `studio.campaign.posts.list`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → 2 → 3 → 4 → 5. La migración antes del worker; el worker (descubrimiento) antes de la web con el flag ON;
  el backfill sólo con confirmación de una persona.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Emparejamiento automático vincula mal un post | datos | medium | sólo con coincidencia única + UTM/cuenta; auditado con la regla; `unlinkExecution` | atención `execution_without_activation` / revisión |
| Metricool cambia su API o limita | integración | medium | cliente existente con backoff; flag del worker; `worker_run` | `metricool_discovery` en health |
| El calendario pierde posts durante la convivencia | UI/API | low | proyección compatible desde `execution_record`; flag web | comparación de conteos en staging |
| Campañas `onedrive` reimportadas pisan activaciones | datos | low | el import no toca activaciones ni evidencia vinculada | test del import |

### Feature flags / cutover

- `STUDIO_ACTIVATIONS_ENABLED` (Vercel de Studio) y `MEDIA_WORKER_METRICOOL_DISCOVERY_ENABLED` (worker, SoT `deploy.sh`), ambos OFF por defecto; filas en `FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `migrate down` (sin activaciones confirmadas) | 5 min | sí |
| Slice 2–4 | flag web OFF + revert | 5 min | sí |
| Slice 3 | flag del worker OFF + redeploy | 10 min | sí |
| Slice 5 | desvincular/cancelar activaciones creadas por el backfill | 10 min | sí |

### Production verification sequence

1. Staging: migración, worker con descubrimiento, backfill dry-run → confirmación, calendario con filtros.
2. Producción con autorización del operador: migración → worker → descubrimiento → backfill → web con flag ON.
3. Verificar «Los Sparks» (5/10 y 8/10) como evidencia vinculada a su activación de CMP-001.

### Out-of-band coordination required

- Autorización explícita del operador para migración, deploys y push de producción; decisión sobre la regla de
  emparejamiento y la autoridad por campaña (Open Questions).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una activación no se puede crear sin campaña ni con un `channel_key` fuera del catálogo; las campañas Always On existen.
- [ ] El estado de ejecución se calcula para los seis casos con tests y nunca se persiste.
- [ ] El descubrimiento trae lo programado en Metricool de las marcas permitidas, idempotente, sin crear activaciones.
- [ ] Lo programado sin activación aparece como `execution_without_activation` en «Hoy» y en `listUnlinkedExecutions`.
- [ ] `studio.calendar.get` devuelve activaciones con sus dimensiones y estado, filtrables; posts actuales siguen visibles durante la convivencia.
- [ ] Los 6 posts existentes quedan como evidencia, vinculados a activaciones confirmadas por una persona.
- [ ] Cada activación tiene su tracking URL generada sólo por `buildTrackingUrl`; tests de determinismo, omisión de `null`, modo `auto` de Google Ads, validación de destino y congelamiento con evidencia.
- [ ] `tracking_missing` y `tracking_mismatch` aparecen al comparar con lo publicado (fixture de un post de Metricool sin UTM y otro con UTM distinta).
- [ ] Registro, manifiesto, paridad y leak test verdes; `pnpm check` y `pnpm build` de Studio verdes.
- [ ] Cada operación nueva (`planActivation`, `updateActivation`, `cancelActivation`, `linkExecution`, `unlinkExecution`, `createActivationFromExecution`, `previewTrackingUrl` y las lecturas) se ejecutó en una sesión MCP real con identidad delegada; manual servido actualizado.

## Verification

- `pnpm check` y `pnpm build` (Studio); tests del worker
- Migración y backfill en staging con evidencia SQL
- Descubrimiento real contra Metricool en staging

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Skill `efeonce-marketing-studio`, arquitectura, manual servido y manual de uso actualizados

## Follow-ups

- Contract de `scheduled_post` después del release.
- Evidencia pagada (TASK-1910) y ventanas de experimento (TASK-1911) en el mismo reader.

## Open Questions

1. ¿Activaciones escribibles en campañas `onedrive` (recomendado: sí, no son territorio del import)?
2. ¿Se acepta el emparejamiento automático con coincidencia única + UTM/cuenta, o todo vínculo lo hace una persona?
3. Tolerancia por defecto entre fecha planificada y programada (propuesta: ±15 min en organic social).
