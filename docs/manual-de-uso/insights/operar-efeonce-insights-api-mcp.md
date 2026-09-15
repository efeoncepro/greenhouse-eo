# Operar Efeonce Insights por API y MCP

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-15 por Claude (TASK-1845)
> **Ultima actualizacion:** 2026-09-15 por Claude (TASK-1845)
> **Documentacion tecnica:** [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) §14

## Para qué sirve

Crear y seguir ediciones de Efeonce Insights sin pantalla (la UI llega en TASK-1849): desde el
portal autenticado (lane `app`), desde un consumer del ecosistema (lane `ecosystem`) o desde un
agente por MCP. Hoy el flujo llega hasta `ready_for_review`; emitir queda bloqueado hasta que el
render valide salidas (TASK-1846).

## Antes de empezar

1. Flags en el runtime donde vas a operar (ledger `FEATURE_FLAG_STATE_LEDGER.md`):
   `INSIGHTS_GENERATION_ENABLED=true` para crear; `INSIGHTS_ISSUANCE_ENABLED=true` sólo cuando exista render.
   Hoy ambos están OFF en todos los targets: sin ellos, crear responde `service_unavailable`.
2. La organización debe tener el módulo `insights_v1` asignado (`module_assignments`, vía el command de
   habilitación de servicios). Sin módulo, la org responde `not_found` (anti-oráculo).
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
Ningún binding emite.

MCP: `get_insights_catalog` → `create_insight_edition` → `get_insight_edition` (con `includeEvidence`),
con el manual servido `efeonce-insights` (`get_greenhouse_skill`). Federar las tools en el gateway
`efeonce-mcp` es un paso aparte todavía pendiente.

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
| `503 service_unavailable` al crear | Flag de generación OFF en ese runtime | Ledger + prender en el runtime correcto tras canary |
| `404 not_found` sobre una org que existe | Sin módulo `insights_v1`, o cliente apuntando a otra org | Asignar módulo / usar la org propia |
| `failed` en `validating` con `evidence_rejected` | Un módulo requerido no aportó hechos | Revisar rechazos; pedir meses completos o `policy.allowPartial=true` explícito |
| Edición > 30 min en una fase | Proceso caído (señal `insights.editions.stuck_generation`) | `recover` desde la fase |

## Referencias técnicas

- `src/lib/efeonce-insights/**` (commands/readers/adapters), `src/lib/api-platform/resources/{app,ecosystem}-insights.ts`.
- Señales: `src/lib/reliability/queries/insights-edition-signals.ts`. Eventos: `insights.*` en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- Tests: `pnpm vitest run --project unit src/lib/efeonce-insights` · `pnpm test:live src/lib/efeonce-insights`.
