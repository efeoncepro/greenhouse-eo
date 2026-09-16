# Operar Efeonce Insights por API y MCP

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.4
> **Creado:** 2026-09-15 por Claude (TASK-1845)
> **Ultima actualizacion:** 2026-09-16 por Claude (TASK-1846 complete: render en producción y canary productivo)
> **Documentacion tecnica:** [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) §14

## Para qué sirve

Crear y seguir ediciones de Efeonce Insights sin pantalla (la UI llega en TASK-1849): desde el
portal autenticado (lane `app`), desde un consumer del ecosistema (lane `ecosystem`) o desde un
agente por MCP. Hoy el flujo llega hasta `ready_for_review` y, en staging, hasta el deck PDF renderizado;
emitir sigue apagado en todos los ambientes.

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

Vista web compartida: cuando exista (TASK-1848/1849), el enlace apuntará a `think.efeoncepro.com/insights/r/<token>`;
Think resuelve el token contra Greenhouse en cada visita, así que revocar el enlace corta el acceso de inmediato.

MCP: `get_insights_catalog` → `create_insight_edition` → `get_insight_edition` (con `includeEvidence`),
con el manual servido `efeonce-insights` (`get_greenhouse_skill`). Las cuatro tools **ya están federadas** en el
gateway `efeonce-mcp` (versión 1.5.0, 47 tools, 8 clases de scope, desplegado el 2026-09-15): las tres de
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
