# Operar Efeonce Insights por API y MCP

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.6
> **Creado:** 2026-09-15 por Claude (TASK-1845)
> **Ultima actualizacion:** 2026-09-18 por Claude (TASK-1848 en producción con flags OFF: enlaces, correo y recurrencia; gateway 1.7.0)
> **Documentacion tecnica:** [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) §14

## Para qué sirve

Crear y seguir ediciones de Efeonce Insights sin pantalla (la UI llega en TASK-1849): desde el
portal autenticado (lane `app`), desde un consumer del ecosistema (lane `ecosystem`) o desde un
agente por MCP. Hoy el flujo llega hasta `ready_for_review` y, en staging y producción, hasta el deck PDF renderizado;
emitir sigue apagado en producción (encendido en staging desde 2026-09-18 para el canary de TASK-1848). Las
recetas de enlaces compartidos, envío por correo y recurrencia (TASK-1848) están en su sección: el código está
**en producción con los flags OFF** (release `bda1cf2cd938`, 2026-09-18) y encendido en staging.

## Antes de empezar

1. Flags en el runtime donde vas a operar (ledger `FEATURE_FLAG_STATE_LEDGER.md`; se leen sólo en Vercel):
   `INSIGHTS_GENERATION_ENABLED` para crear/revisar — **ON en staging y producción desde 2026-09-15**, OFF en
   Preview; `INSIGHTS_ISSUANCE_ENABLED` (emitir) e `INSIGHTS_AUTHORING_AI_ENABLED` (IA) — **OFF en todos los
   targets**. Sin generación, crear responde `503 service_unavailable` con `details.code = generation_disabled`.
   Trampa de Vercel: un env var nuevo no lo ve una deployment construida antes; tras `vercel env add` hace falta
   `vercel redeploy` del target (pasó en staging y en producción).
2. La organización debe tener el módulo `insights_v1` asignado. Se asigna con el script canónico (pasa por
   `enableClientPortalModule`, con audit + outbox, idempotente; dry-run por defecto):
   `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/assign-insights-module.ts --org=<organization_id>`
   y, tras leer lo que haría, el mismo comando con `--apply`. Sin módulo, la org responde `404 not_found`
   (anti-oráculo), también para un interno.
3. Tu actor debe tener la capability: leer (`insights.report.read`), crear (`insights.edition.create`),
   revisar/recuperar (`insights.edition.review`), emitir/retirar (`insights.edition.issue`). Admin y Account
   tienen todas; Operations no emite; el cliente lee y crea sobre su org.

## Paso a paso (lane app, sesión autenticada)

1. `GET /api/platform/app/insights/catalog?organizationId=<org>` (el interno declara la org; el cliente no la
   pasa: se usa la de su sesión). Confirma que los módulos que quieres estén `available`.
2. `POST /api/platform/app/insights/editions` con `Idempotency-Key` y cuerpo
   `{ "organizationId": "<org>", "request": { "modules": ["seo","ico"], "period": { "start": "2026-08-01",
   "endExclusive": "2026-09-01", "timeZone": "America/Santiago" }, "comparison": { "kind": "previous_period" },
   "audience": "client", "outputs": ["report_pdf"], "idempotencyKey": "insights-<org>-2026-08" } }`.
   Respuesta `202` con `report`, `edition` y `generation.outcome`.
3. `GET /api/platform/app/insights/editions/<editionId>?include=evidence&organizationId=<org>` para leer el
   snapshot sellado (hechos + rechazos), el plan congelado y el historial (interno).
4. Si `generation.outcome = failed`: lee `failedPhase` y `failureCode`; corrige la causa (por ejemplo
   pide meses completos si el código es `unsupported_window`) y `POST .../editions/<id>/recover`, o crea un
   encargo nuevo. No dupliques ediciones "para reintentar".
5. Corregir un encargo ya generado: `POST .../editions/<id>/revise` con el encargo nuevo → versión nueva.
6. Emitir: `POST .../editions/<id>/issue` con `{ "reason": "..." }`. Hoy responde `409 not_ready` porque no
   hay salidas validadas; es el comportamiento esperado hasta TASK-1846. Retirar: `POST .../withdraw`.

Lane ecosystem: mismas rutas bajo `/api/platform/ecosystem/insights/**` con `externalScopeType`/`externalScopeId`
en la query. Un binding org-scoped sólo lee; uno `internal` crea/revisa/recupera pasando `organizationId`.
Ningún binding emite ni retira (esas rutas no existen en el lane).

## Cómo se ve cada respuesta

Verificado el 2026-09-15 en staging (lanes app y ecosystem) y producción (lane ecosystem):

| Llamada | Respuesta | Qué significa |
| --- | --- | --- |
| `GET .../catalog` | `200` con módulos `available` o su razón (`module_not_assigned`, `no_active_spaces`), `renderableOutputs: ["deck_pdf"]` (desde TASK-1846) | Sólo los `available` producen evidencia; `renderableOutputs` lista lo que el motor puede producir hoy |
| `POST .../editions` (encargo nuevo) | `202` con `report.code` (`EO-INS-…`), `edition.state = ready_for_review` (o `failed` + `failedPhase`) y `generation.outcome` | La generación corre por fases tras el commit |
| Mismo `POST` con la misma `idempotencyKey` y el mismo encargo | `200` con la **misma** edición e `idempotent: true` (el primer create responde `202`) | Replay seguro; en el lane ecosystem la respuesta cacheada por la lane también devuelve la misma edición |
| Misma `idempotencyKey` con un encargo distinto (por ejemplo otro `depth`) | `409 idempotency_conflict` | Por diseño: una clave por encargo humano distinto |
| Cualquier ruta sobre una org sin módulo, o un cliente apuntando a otra org | `404 not_found` | Anti-oráculo: no se distingue "no existe" de "no tiene módulo" |
| `POST .../editions` con generación apagada en ese runtime | `503 service_unavailable` (`details.code = generation_disabled`) | Prender el flag en el target correcto y redeploy |
| `POST .../editions/<id>/issue` | `409` (`details.code = not_ready`) | Faltan outputs `completed` de la misma audiencia (`missing`/`pending`); además la emisión sigue OFF |
| `GET .../editions/<id>?include=evidence` como cliente sobre una no emitida | `200` con `evidence` y `plan` en `null` | Por diseño: el cliente ve evidencia/plan sólo de ediciones emitidas; el interno siempre |

## Qué ve un cliente y qué ve un interno

- **Cliente** (`client_executive`/`client_manager` crean; `client_specialist` sólo lee): opera únicamente su
  organización (no la declara: sale de su sesión), ve el estado resumido (`in_progress`, `in_review`, `issued`,
  `needs_attention`, `withdrawn`) y **evidencia/plan sólo de ediciones emitidas**; `audience=internal` se le
  rechaza siempre.
- **Interno** (Admin/Account todo; Operations no emite): declara `organizationId` en cada llamada, ve el estado
  real por fase, la evidencia sellada (hechos + rechazos), el plan congelado (con `limits` y `methodology`) y
  el historial de transiciones.

## Canary por lane ecosystem (receta usada en staging y producción)

Sirve para probar el contrato sin sesión de portal. Nada de esto expone secretos: el token es el del consumer
del gateway (binding interno del provider SEO/Insights, scope `internal`), nunca se pega en docs ni en logs.

1. Confirma que la org objetivo tiene `insights_v1` (script de asignación en dry-run) y que
   `INSIGHTS_GENERATION_ENABLED` está ON en el target (ledger + `vercel env pull --environment=<target>`).
2. `GET /api/platform/ecosystem/insights/catalog?externalScopeType=<tipo>&externalScopeId=<id>&organizationId=<org>`
   con el token del consumer del gateway en `Authorization`. Espera `200`; anota qué módulos están `available`.
3. `POST /api/platform/ecosystem/insights/editions` con `Idempotency-Key: insights-canary-<org>-<fecha>` y el
   encargo sobre un módulo `available` (meses completos, zona IANA). Espera `202` y `ready_for_review`.
4. Repite el paso 3 idéntico → `202` misma edición. Cambia `depth` con la misma clave → `409`.
5. `GET .../editions/<id>?include=evidence...` → snapshot sellado, plan congelado, historial. Con una org
   sintética sin datos en la ventana verás **0 hechos y rechazos `no_data`**: eso valida el camino honesto,
   no un informe con cifras.
6. Negativo: la misma llamada sobre una org sin módulo → `404`.

Evidencia del 2026-09-15: `EO-INS-000012` (app, staging), `EO-INS-000013` (ecosystem, staging),
`EO-INS-000014` (ecosystem, producción); las tres `ready_for_review` sobre la org sintética Greenhouse Demo.

Vista web compartida: el resolver por token ya existe (TASK-1848); cuando exista la página de Think (TASK-1875), el enlace apuntará a `think.efeoncepro.com/insights/r/<token>`;
Think resuelve el token contra Greenhouse en cada visita, así que revocar el enlace corta el acceso de inmediato.

MCP: `get_insights_catalog` → `create_insight_edition` → `get_insight_edition` (con `includeEvidence`),
con el manual servido `efeonce-insights` (`get_greenhouse_skill`). Las cuatro tools **ya están federadas** en el
gateway `efeonce-mcp` (federadas en la versión 1.5.0 del 2026-09-15; hoy el gateway está en **1.7.0, 58 tools**, 2026-09-18): las tres de
lectura con el scope base `efeonce.mcp.read`; `create_insight_edition` exige la clase
`efeonce.mcp.insights.write`, que ya existe en Entra pero **ningún cliente porta todavía** → responde
`insufficient_scope` hasta un consentimiento/grant gobernado. Canary de lectura del gateway:
`scripts/greenhouse-insights-canary.mjs` en el repo `efeonce-mcp` (nunca crea).

## Pedir el render de una edición (TASK-1846 — vivo en staging y producción desde 2026-09-16)

Cuando una edición está en `ready_for_review`, se puede encargar su **deck PDF**. El encargo es
asíncrono: la respuesta es un `run` con un `output` por target en cola; el archivo lo produce el
worker de render y se consulta después. Hoy sólo `deck_pdf` es renderizable; pedir `report_pdf` o
`web` responde `422 render_rejected` y no encola nada.

1. `POST /api/platform/app/insights/editions/{editionId}/render` con `{ "organizationId": "…" }`
   (interno) y opcionalmente `"outputs": ["deck_pdf"]`. Respuesta `202` con `run`, `outputs` e
   `idempotent: false`; si ya había un run vivo para esos targets, `200` con `idempotent: true`.
2. `GET /api/platform/app/insights/render-runs/{renderRunId}`: estado del run
   (`pending|running|completed|partial_failed|failed|cancelled`) y de cada output
   (`queued|running|completed|failed|dead_letter|cancelled`, `attempts`, `failureCode`, `outputAssetId`).
3. Si un output quedó `failed`: `POST …/render-runs/{renderRunId}/retry` re-encola **sólo** los
   fallidos. `dead_letter` (intentos agotados o `manifest_drift`) no se reintenta desde aquí.
4. `POST …/render-runs/{renderRunId}/cancel` cancela lo pendiente; lo que ya está renderizando
   termina solo y la respuesta lo dice (`stillRunning`). Un run cancelado es **terminal**: un `retry` sobre él
   responde `200` sin re-encolar nada. Si se quiere el deck, se pide de nuevo con el paso 1.
5. Con todos los outputs `completed`, `issue` deja de responder `not_ready` por outputs y pasa a
   depender sólo del flag de emisión y del gate humano.

Por MCP: `request_insight_render`, `get_insight_render_run`, `retry_insight_render`,
`cancel_insight_render` (las tres de escritura exigen binding interno).

Un cliente que pide o consulta el render de una edición `internal` recibe `404` y no se crea ningún output
(anti-oráculo). Cada encargo, retry y cancelación queda auditado con el actor humano (`member` o `client_user`),
no como `system`.

### Cuánto tarda (medido en Cloud Run staging, 2026-09-16)

El worker no escucha la cola: Cloud Scheduler `ops-artifact-render-dispatch` llama cada **2 minutos** al
`ops-worker` (`/artifact-render/dispatch`), que lanza **una** ejecución del Cloud Run Job `artifact-worker`
(`parallelism=1`) y esa ejecución renderiza **un** output. Si en ese tick Proposal tenía trabajo, Proposal gana
y Insights espera al siguiente.

| Qué | Medido |
| --- | --- |
| Throughput | **1 output por tick de 2 min**: una ráfaga de N outputs tarda ≈ 2·N min |
| Ráfaga de 5 `deck_pdf` | edad en cola de 3m18s (el primero) a 11m10s (el quinto); las 5 `completed` al primer intento |
| Render (started → finished) | 6,3–7,3 s; PDF ~330 KB |
| Arranque de la ejecución | 3,9 s en caliente · 42 s la primera tras un deploy · 154 s en frío |
| Duración total de la tarea | 50–58 s (Chromium + claim + render + upload) |

No consultar el run en bucle cerrado: con esta cadencia, una consulta cada 30–60 s basta.

### Estado por runtime (2026-09-16, tras el release)

`INSIGHTS_RENDER_ENABLED` se lee en **tres** runtimes y debe estar ON en los tres:

| Runtime | Rol | Estado |
| --- | --- | --- |
| Vercel `staging` | encolar | **ON** |
| Vercel Production | encolar | **ON** desde 2026-09-16 (redeploy `greenhouse-d6l33zils`) |
| Cloud Run Job `artifact-worker` | reclamar y renderizar | ON (default `true` en su `deploy.sh`) |
| Cloud Run `ops-worker` | dispatcher | ON desde la revisión `ops-worker-00690-xhl` (default `true` en su `deploy.sh`) |

El Job y el `ops-worker` son **únicos** para staging y producción: la puerta por ambiente es el encolado en Vercel.
El bucket de assets del Job está fijo en `efeonce-group-greenhouse-private-assets-staging` (cada asset guarda su
`bucket_name`). Las 4 tools de render están en el gateway `efeonce-mcp` v1.6.0, **desplegado el 2026-09-16** (revisión
`efeonce-mcp-gateway-00054-n78`, 51 tools). El Job recibió su primer deploy productivo con el release `917491fd02e4`
(change-gated por el control plane). `INSIGHTS_ISSUANCE_ENABLED` sigue OFF.

**Doble ejecución en frío (comportamiento conocido).** Si el Job arranca en frío (~2 min), el tick siguiente del
dispatcher puede ver el output todavía `queued` y lanzar una segunda ejecución. Sólo una lo reclama y finaliza
(claim atómico + fencing); la otra termina sin trabajo. No es un output duplicado ni un fallo: no reintentar ni
cancelar por ver dos ejecuciones del Job para un mismo output.

### Canary de render en producción (receta usada el 2026-09-16)

Por el lane ecosystem, con el token consumer del gateway y la org sintética «Greenhouse Demo» (misma receta de
credenciales que «Canary por lane ecosystem»):

1. `POST /api/platform/ecosystem/insights/editions` → `202` (edición `ready_for_review`).
2. `POST /api/platform/ecosystem/insights/editions/<editionId>/render` → `202` con el run (`requestedByKind: member`)
   y un output `deck_pdf` `queued`.
3. **Esperar al dispatcher** (no lanzar el Job a mano) y consultar `GET …/render-runs/<renderRunId>` cada 30–60 s
   hasta `completed` con `outputAssetId`. El 2026-09-16: `deck_pdf` `completed` al primer intento, render
   22:14:46→22:14:52Z.
4. Negativo: pedir `outputs: ["web"]` → `422 render_rejected`, sin encolar.
5. Gateway: en el repo `efeonce-mcp`, `scripts/greenhouse-insights-canary.mjs --render-run` → catalog (renderable=1),
   list, render run `completed` y deny `404` verdes.

### Canary de render en staging (receta usada el 2026-09-16)

Con la org sintética «Greenhouse Demo» y la persona cliente:

1. `AGENT_AUTH_EMAIL=agent-client@greenhouse.efeonce.org pnpm staging:request POST /api/platform/app/insights/editions '<InsightRequestV1 con outputs ["deck_pdf"]>'`
   → `202`, edición `ready_for_review`.
2. `AGENT_AUTH_EMAIL=agent-client@greenhouse.efeonce.org pnpm staging:request POST /api/platform/app/insights/editions/<editionId>/render '{}'`
   → `202` con `run` y un output `queued`.
3. **No lanzar el Job a mano.** El canary debe esperar al tick del dispatcher (hasta ~2 min, más arranque) y
   consultar `GET /api/platform/app/insights/render-runs/<renderRunId>` hasta `completed` con `outputAssetId`.
   Lanzarlo a mano ocultó que el `ops-worker` no tenía el flag.
4. Negativos: `POST …/render-runs/<id>/cancel` sobre un run todavía encolado → `cancelled` con 0 intentos, y
   `retry` sobre él → `200` sin re-encolar; render de una edición `internal` (creada por un interno) pedido por la
   persona cliente → `404`, sin outputs.
5. Contra PostgreSQL real: `pnpm test:live src/lib/efeonce-insights/render` (4/4 el 2026-09-16).

## Enlaces, correo y recurrencia (TASK-1848 — en producción con flags OFF desde 2026-09-18)

> **Estado (2026-09-18):** código en producción (release `bda1cf2cd938`) con `INSIGHTS_SHARING/DELIVERY/SCHEDULES_ENABLED`
> y la emisión **OFF en producción** hasta que exista el lector de Think (TASK-1875). En **staging** los cuatro flags
> están ON y el canary sintético corrió completo en la org sandbox (`EO-INS-000015`); los dos correos llegaron al buzón
> autorizado del operador (evidencia humana: Resend no reporta `delivered`, ISSUE-160). Canary de contrato en
> producción: crear enlace ⇒ `503 sharing_disabled`; lector público con token inexistente ⇒ `404`; sin token ⇒ `401`.
> Todo requiere una edición `issued` con audiencia `client`.
>
> **Por MCP (`mcp.efeonce.org`, gateway 1.7.0):** cinco lecturas con el scope base (`list_insight_shares`,
> `list_insight_deliveries`, `get_insight_delivery`, `list_insight_schedules`, `get_insight_schedule`) y dos
> escrituras de enlace (`create_insight_share`, `revoke_insight_share`) que exigen `efeonce.mcp.insights.write`
> — ningún cliente la porta, así que hoy responden `insufficient_scope`. **Enviar por correo y programar recurrencias
> no existen por MCP**: sólo lane App (persona interna; UI en el portal cuando llegue TASK-1849). En el gateway,
> `*_disabled` (503) llega como `policy_blocked` y `quota_exceeded` (429) como `rate_limited`.
>
> ⚠️ **Nunca pruebes límites (rate limit, cuota) con ráfagas concurrentes** contra la base compartida: una ráfaga de
> 64 requests al lector público dejó 86–88 conexiones ociosas en Cloud SQL durante 5 min (ISSUE-174; TASK-1876).
> Secuencia las requests.

### Flags y dónde se leen

| Flag | Vercel | `ops-worker` | Con OFF |
|---|---|---|---|
| `INSIGHTS_SHARING_ENABLED` | crear enlace + reader público | — | crear → `503 sharing_disabled`; reader → `404`; revocar sigue funcionando |
| `INSIGHTS_DELIVERY_ENABLED` | crear el envío | despacho (default `true` en `deploy.sh`) | crear y reintentar → `503 delivery_disabled`; cancelar y reconciliar siguen funcionando |
| `INSIGHTS_SCHEDULES_ENABLED` | escrituras de schedule | tick (default `true` en `deploy.sh`) | crear → `503 schedules_disabled`; pausar y retirar siguen funcionando |
| `INSIGHTS_GENERATION_ENABLED` | ya existente | **ahora también** en el tick (default `true`) | el tick no genera ediciones |

Kill switch del correo, aparte del flag: `greenhouse_notifications.email_type_config`, filas
`insights_edition_delivery` (con enlace) e `insights_edition_delivery_attachment` (con PDF), sembradas
`enabled = false`. **La tabla falla abierto si falta la fila**: nunca la borres para "encender".
Prender un flag del worker es multi-runtime: `deploy.sh` + revisión activa (ledger `FEATURE_FLAG_STATE_LEDGER.md`).

### Crear y revocar un enlace

1. `POST /api/platform/app/insights/editions/<editionId>/shares` con `{ "organizationId": "<org>", "expiresInDays": 30,
   "downloadOutputs": ["deck_pdf"] }` (`expiresInDays` 1–90, default 30; `downloadOutputs` sólo `deck_pdf`/`report_pdf`
   que existan en la edición). Responde `201` con el grant, **el token y la URL, una sola vez**. Guárdalo en el canal
   seguro que corresponda; Greenhouse no puede mostrarlo de nuevo.
2. Listar: `GET …/editions/<editionId>/shares` (sin token ni digest).
3. Revocar: `POST /api/platform/app/insights/shares/<shareGrantId>/revoke`. Idempotente; nunca reactiva.
- Ecosystem: mismas rutas bajo `/api/platform/ecosystem/insights/**`; crear y revocar exigen binding `internal`.
- MCP: `create_insight_share`, `list_insight_shares`, `revoke_insight_share` (federadas en el gateway 1.7.0; crear y revocar exigen `efeonce.mcp.insights.write`, que ningún cliente porta).
- Límite: 20 activos por edición → `429 quota_exceeded`. Permiso: `insights.share.manage` (Admin/Account; cliente executive sobre su org).

### Leer el reader público

`GET /api/public/insights/shared/<token>` → `InsightSharedEditionResponseV1` (`header`, `model`, `downloads`,
`expiresAt`). Descarga: `GET /api/public/insights/shared/<token>/outputs/<output>` (proxy; revalida el grant antes de
leer bytes). Sin sesión.

| Respuesta | Significa |
|---|---|
| `200` | Grant activo; edición emitida y accesible |
| `404` | Token desconocido, mal formado o expirado, flag OFF, org suspendida o módulo retirado. **Indistinguibles a propósito** |
| `410` | Revocado o edición retirada |
| `429` | Rate limit: por IP 300 vistas/60 descargas por minuto, por grant 60/20. También si la base no responde (falla cerrado) |
| `503` | Error interno sanitizado |

Verifica las cabeceras en cualquier canary: `Cache-Control: private, no-store, max-age=0`, `X-Robots-Tag: noindex,
nofollow, noarchive`, `Referrer-Policy: no-referrer`. El access log (`insight_share_access_events`) registra resultado y
tipo de cliente, nunca token ni IP; un hit **no** prueba lectura humana.

### Solicitar un envío por correo (sólo lane App, persona interna)

`POST /api/platform/app/insights/editions/<editionId>/deliveries` con:

```json
{ "organizationId": "<org>", "modality": "share_link", "recipientUserIds": ["<userId>"],
  "outputs": ["deck_pdf"], "subject": "Informe de agosto", "message": "Opcional, ≤ 2000",
  "shareTtlDays": 30, "idempotencyKey": "insights-delivery-<org>-2026-08" }
```

- `modality`: `share_link` (enlace personal por destinatario) o `attachment` (exige
  `"acknowledgeIrrevocableAttachment": true` y outputs). `portal_link` → `not_ready` hasta TASK-1849.
- `recipientUserIds`: 1–50 user ids de personas activas de la org o internas activas; nunca correos libres.
- `subject` 3–200; `idempotencyKey` 8–200. Misma key + mismo payload → `200` idempotente; nuevo → `202`.
- Seguimiento: `GET …/deliveries/<deliveryIntentId>` → estado del intent y por destinatario, correo enmascarado y
  `transportStatus` leído de `email_deliveries` (`accepted`, `delivered`, `bounced`, `suppressed`…). Nunca "leído".
- Ecosystem y MCP (`list_insight_deliveries`, `get_insight_delivery`) sólo leen.

### Reconciliar un destinatario ambiguo

Un destinatario `ambiguous` (o `claimed` hace más de 30 min; señal `insights.delivery.ambiguous`) **no se reenvía**.

1. `POST /api/platform/app/insights/delivery-recipients/<deliveryRecipientId>/reconcile` con `{ "organizationId": "<org>" }`.
   Lee el ledger del intento exacto: enviado/entregado/`resend_id` → `accepted`; sin fila o `failed` sin
   `dispatch_unknown` → `failed` (revoca el enlace); `pending`/`dispatch_unknown` → `unresolved`.
2. Si queda `unresolved`, confirma en el proveedor de correo y decide:
   `{ "organizationId": "<org>", "operatorDecision": "accepted" | "failed", "reason": "≥ 10 caracteres con la evidencia" }`.
3. Sólo después, si quedó `failed`, reintenta.

### Reintentar fallidos y cancelar

- Reintentar: `POST …/deliveries/<deliveryIntentId>/retry`. Re-encola **sólo** destinatarios `failed`, máximo 5
  intentos; cada intento lleva su propia correlación (`idlr-<uuid>:aN`) y un enlace nuevo.
- Cancelar: `POST …/deliveries/<deliveryIntentId>/cancel`. Cancela lo que aún no salió; lo aceptado no se retira.
- Retirar la edición revoca sus enlaces y cancela envíos pendientes en la misma transacción.

### Crear y operar un schedule (sólo lane App)

1. Crear: `POST /api/platform/app/insights/schedules` con `{ "organizationId": "<org>", "label": "Mensual SEO",
   "cadence": "monthly", "timeZone": "America/Santiago", "consolidationDays": 3, "catchUpLimit": 1,
   "requestTemplate": { … } }`. `cadence` `weekly|monthly`; `consolidationDays` 0–15; `catchUpLimit` 1–3;
   `requestTemplate` es el encargo **sin** `period`, `idempotencyKey` ni `organizationId` (se validan contra el
   último período cerrado). `reviewPolicy` sólo admite `draft_for_review`. Nace `draft`.
2. Activar: `POST …/schedules/<scheduleId>/activate`. Quien activa queda como autoridad durable. Máximo 10 activos por org.
3. Pausar: `POST …/schedules/<scheduleId>/pause`. Retirar: `POST …/schedules/<scheduleId>/retire` (definitivo).
4. Leer por qué se pausó: `GET …/schedules/<scheduleId>` → `state`, `pauseReason` (`manual`, `authority_revoked`,
   `module_unavailable`, `repeated_failures`), `pausedAt` y `recentOccurrences` con su `failureCode`.
   Tras corregir la causa, `activate` de nuevo (un `retired` no se reactiva).
- El tick corre en el `ops-worker` (`POST /insights/schedules/tick`, Cloud Scheduler `ops-insights-schedules-tick`,
  `20 * * * *`). Cada ocurrencia crea la edición (`idempotencyKey` `sched-<scheduleId>-v<version>-<periodStart>`) y pide
  el render de `deck_pdf`; queda `ready_for_review`. **Nunca emite ni envía.**
- Ecosystem y MCP (`list_insight_schedules`, `get_insight_schedule`) sólo leen.

### Rollback por lane

| Lane | Cómo apagar | Qué queda |
|---|---|---|
| Enlaces | `INSIGHTS_SHARING_ENABLED` OFF en Vercel + redeploy | Todo enlace responde `404`; los grants siguen en la base y revocar funciona |
| Correo | `email_type_config.enabled = false` en los dos EmailTypes (efecto inmediato) y/o `INSIGHTS_DELIVERY_ENABLED` OFF en Vercel y en el `ops-worker` (`deploy.sh` + revisión activa) | Intents pendientes no salen; reconciliar y cancelar siguen disponibles |
| Recurrencia | Pausar los schedules y/o `INSIGHTS_SCHEDULES_ENABLED` OFF en Vercel y `ops-worker` | Sin ocurrencias nuevas; la purga de retención sigue corriendo |

### Qué no hacer (enlaces, correo y recurrencia)

- No reenviar a un destinatario `ambiguous` ni devolverlo a `pending` a mano: reconcilia primero.
- No pegar tokens `isg_…` ni URLs `/insights/r/…` en tickets, logs, chats o commits.
- No borrar filas de `email_type_config` para "encender" un correo: falla abierto; cambia `enabled`.
- No prender un flag de worker sólo con `gcloud run services update`: el próximo deploy lo borra; declarar en `deploy.sh`.
- No prometer que revocar recupera lo descargado o un PDF adjunto ya enviado: no es revocable.
- No crear un cron por cliente para recurrencias: hay un solo tick para todas las organizaciones.

## Qué significan los estados

| Estado (interno) | Cliente ve | Significa |
| --- | --- | --- |
| `draft` / `collecting` / `composing` / `validating` | `in_progress` | Generación en curso, por fases |
| `ready_for_review` | `in_review` | Evidencia sellada y plan congelado; falta revisión humana y emisión |
| `issued` | `issued` | Emitida con hash de aprobación; sólo puede retirarse |
| `failed` (+ `failedPhase`) | `needs_attention` | Una fase falló; recuperable desde esa fase |
| `withdrawn` | `withdrawn` | Retirada; terminal |

Estados de un **run de render** y de sus **outputs** (TASK-1846): el run agrega a sus outputs y
distingue `partial_failed` (uno salió y otro no) de `failed`; un output `dead_letter` es terminal por
diseño; `cancelled` sólo se aplica a lo que aún no había empezado.

Códigos de rechazo de evidencia: `unsupported_window` (grano no servible; suele traer alternativa
`month`), `method_mismatch`, `insufficient_data`, `suppressed` (RpA), `review_required` (grader),
`module_disabled`, `not_connected`, `target_ambiguous` (varios mercados SEO), `no_data`.

## Qué no hacer

- No presentar una ausencia como cero ni el último score AEO como dato del período.
- No prender un flag "para probar" en producción: la base es única y compartida.
- No emitir sin salidas validadas ni intentar emitir desde MCP.
- No reutilizar una `idempotencyKey` para un encargo distinto: es conflicto por diseño.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| `503 service_unavailable` (`generation_disabled`) al crear | Flag de generación OFF en ese runtime, **o** la deployment se construyó antes del env var | Ledger + prender en el target correcto + `vercel redeploy`; verificar con `vercel env pull` |
| `404 not_found` sobre una org que existe | Sin módulo `insights_v1`, o cliente apuntando a otra org | Asignar módulo con el script (`--apply`) / usar la org propia |
| `evidence`/`plan` en `null` leyendo como cliente | La edición no está emitida | Esperado; sólo el interno ve evidencia de no emitidas |
| `insufficient_scope` en `create_insight_edition` por el gateway | El cliente MCP no porta `efeonce.mcp.insights.write` | Grant gobernado del scope; no rodear con otro token |
| `plan.limits` repite «ico: sin datos.» varias veces | Un límite por rechazo `no_data` en el plan congelado | Esperado: el render lo deduplica; el plan sellado no se toca |
| `503 service_unavailable` (`render_disabled`) al pedir el render | Flag `INSIGHTS_RENDER_ENABLED` OFF en el Vercel de ese ambiente (desde 2026-09-16 está ON en staging y Production: si aparece, alguien lo apagó o la deployment es anterior al flag) | Rollout autorizado: prender en Vercel + redeploy; verificar además el Job `artifact-worker` y el `ops-worker` (`deploy.sh` + revisión activa) |
| Output `queued` que no arranca pasado varios ticks | Cola larga (1 output por tick de 2 min; Proposal gana el tick) **o** el `ops-worker` sin el flag (logs del dispatcher con `insightsQueued=0` y outputs en cola) | Calcular ≈ 2·N min por posición en la cola; si excede, revisar el flag en la revisión activa del `ops-worker` |
| `retry` sobre un run `cancelled` responde `200` y no pasa nada | Cancelado es terminal | Pedir un render nuevo |
| Output falla de nuevo tras `retry` con `render_error` | Causa de contenido (p. ej. validación de slots) que reintentar no arregla; `attempts` sube hasta 3 y termina en `dead_letter` | Corregir la edición (`revise`) y pedir el render de la nueva versión |
| `422 render_rejected` al pedir el render | Output no renderizable todavía (`report_pdf`/`web`), o el plan excede un presupuesto del catálogo | Pedir sólo `deck_pdf`; si es presupuesto, la causa viene en `details` — no se trunca copy en silencio |
| Run en `partial_failed` | Un output salió y otro falló | Leer cada output; `retry` re-encola sólo los fallidos |
| Output `running` que no avanza | Worker caído o flag OFF en su revisión activa (señal `insights.render.orphaned_output`) | Verificar el Job y el flag en Cloud Run; los reclamos por lease vencido son automáticos si el worker corre. Un `running` **sin lease** no se reclama solo: decisión humana |
| `failed` en `validating` con `evidence_rejected` | Un módulo requerido no aportó hechos | Revisar rechazos; pedir meses completos o `policy.allowPartial=true` explícito |
| Edición > 30 min en una fase | Proceso caído (señal `insights.editions.stuck_generation`) | `recover` desde la fase |

## Referencias técnicas

- `src/lib/efeonce-insights/**` (commands/readers/adapters), `src/lib/api-platform/resources/{app,ecosystem}-insights.ts`.
- Asignación del módulo: `scripts/insights/assign-insights-module.ts`. Flags: `src/lib/efeonce-insights/flags.ts` + ledger.
- Estado, rollout, límites e invariantes: arquitectura §14.
- Señales: `src/lib/reliability/queries/insights-edition-signals.ts`. Eventos: `insights.*` en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- Tests: `pnpm vitest run --project unit src/lib/efeonce-insights` · `pnpm test:live src/lib/efeonce-insights`.
