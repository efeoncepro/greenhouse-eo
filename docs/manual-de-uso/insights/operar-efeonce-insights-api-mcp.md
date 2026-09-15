# Operar Efeonce Insights por API y MCP

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-09-15 por Claude (TASK-1845)
> **Ultima actualizacion:** 2026-09-15 por Claude (TASK-1845, rollout a producción)
> **Documentacion tecnica:** [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) §14

## Para qué sirve

Crear y seguir ediciones de Efeonce Insights sin pantalla (la UI llega en TASK-1849): desde el
portal autenticado (lane `app`), desde un consumer del ecosistema (lane `ecosystem`) o desde un
agente por MCP. Hoy el flujo llega hasta `ready_for_review`; emitir queda bloqueado hasta que el
render valide salidas (TASK-1846).

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
| `GET .../catalog` | `200` con módulos `available` o su razón (`module_not_assigned`, `no_active_spaces`), `renderableOutputs: []` | Sólo los `available` producen evidencia; `renderableOutputs` vacío hasta el render |
| `POST .../editions` (encargo nuevo) | `202` con `report.code` (`EO-INS-…`), `edition.state = ready_for_review` (o `failed` + `failedPhase`) y `generation.outcome` | La generación corre por fases tras el commit |
| Mismo `POST` con la misma `idempotencyKey` y el mismo encargo | `200` con la **misma** edición e `idempotent: true` (el primer create responde `202`) | Replay seguro; en el lane ecosystem la respuesta cacheada por la lane también devuelve la misma edición |
| Misma `idempotencyKey` con un encargo distinto (por ejemplo otro `depth`) | `409 idempotency_conflict` | Por diseño: una clave por encargo humano distinto |
| Cualquier ruta sobre una org sin módulo, o un cliente apuntando a otra org | `404 not_found` | Anti-oráculo: no se distingue "no existe" de "no tiene módulo" |
| `POST .../editions` con generación apagada en ese runtime | `503 service_unavailable` (`details.code = generation_disabled`) | Prender el flag en el target correcto y redeploy |
| `POST .../editions/<id>/issue` | `409` (`details.code = not_ready`) | Esperado hasta TASK-1846; no hay outputs validados |
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

## Qué significan los estados

| Estado (interno) | Cliente ve | Significa |
| --- | --- | --- |
| `draft` / `collecting` / `composing` / `validating` | `in_progress` | Generación en curso, por fases |
| `ready_for_review` | `in_review` | Evidencia sellada y plan congelado; falta revisión humana y emisión |
| `issued` | `issued` | Emitida con hash de aprobación; sólo puede retirarse |
| `failed` (+ `failedPhase`) | `needs_attention` | Una fase falló; recuperable desde esa fase |
| `withdrawn` | `withdrawn` | Retirada; terminal |

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
| `plan.limits` repite «ico: sin datos.» varias veces | Un límite por rechazo `no_data` | Cosmético; dedupe asignado a TASK-1846 |
| `failed` en `validating` con `evidence_rejected` | Un módulo requerido no aportó hechos | Revisar rechazos; pedir meses completos o `policy.allowPartial=true` explícito |
| Edición > 30 min en una fase | Proceso caído (señal `insights.editions.stuck_generation`) | `recover` desde la fase |

## Referencias técnicas

- `src/lib/efeonce-insights/**` (commands/readers/adapters), `src/lib/api-platform/resources/{app,ecosystem}-insights.ts`.
- Asignación del módulo: `scripts/insights/assign-insights-module.ts`. Flags: `src/lib/efeonce-insights/flags.ts` + ledger.
- Estado, rollout, límites e invariantes: arquitectura §14.
- Señales: `src/lib/reliability/queries/insights-edition-signals.ts`. Eventos: `insights.*` en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- Tests: `pnpm vitest run --project unit src/lib/efeonce-insights` · `pnpm test:live src/lib/efeonce-insights`.
