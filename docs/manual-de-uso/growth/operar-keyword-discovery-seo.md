# Operar el keyword discovery (seed expansion + enrichment)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-14 por Claude (TASK-1664)
> **Ultima actualizacion:** 2026-08-14 por Claude (TASK-1664)
> **Documentacion tecnica:** [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §7 y §8
> **Documentacion funcional:** [`modulo-seo-search-visibility-360.md`](../../documentation/growth/modulo-seo-search-visibility-360.md)

## Para que sirve

Convierte una idea ("¿habrá demanda para X?") en un conjunto de **candidatos** priorizables:
expande hasta 10 seeds con DataForSEO Labs, trae volumen/intención/barrera de enlaces y deja todo
trazable por corrida. **No agrega nada al set monitoreado**: descubrir y seguir son decisiones
separadas.

## Antes de empezar

- La organización necesita assignment `seo_v2` vigente y un target activo (con más de un mercado,
  declara `market`).
- **Cada corrida gasta** (Labs cobra por request y por fila). El gate de entitlement y el
  presupuesto mensual del tier aplican; el preview es obligatorio de facto: mira la fórmula antes
  de confirmar.
- Flags: `GROWTH_SEO_ENABLED` (módulo) + `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED` (default **OFF**;
  lo leen **Vercel y el ops-worker** — prenderlo en uno solo deja la capacidad coja). El
  scheduler `ops-seo-keyword-discovery-drain` (cada 10 min) **nace pausado**: dos frenos
  independientes.

## Paso a paso

1. **Preview (no gasta ni encola):**

```bash
curl -s -X POST https://<host>/api/admin/growth/seo/keyword-discovery \
  -H 'Content-Type: application/json' \
  -d '{"intent":"preview","organizationId":"org-...","seedSource":"manual","manualSeeds":["pintura para piso"],"methods":["keyword_suggestions"]}'
```

   Devuelve seeds resueltas, `estimate.formula`, `budgetRemainingUsd` y `wouldBeAllowed`.

2. **Encolar** (mismo body con `intent: "queue"`; responde `202` con `runId`). El mismo intent
   repetido devuelve la corrida existente (`deduped: true`) sin gastar de nuevo.
3. **Esperar el drain** (scheduler cada 10 min) o dispararlo a mano contra el worker:
   `POST /seo/keyword-discovery/drain` (requiere OIDC del scheduler o `CRON_SECRET`).
4. **Leer candidatos:** `GET /api/admin/growth/seo/keyword-discovery?organizationId=...&runId=...`
   (filtros `intent`, `minSearchVolume`, `maxDifficulty`, `query`, `sourceEndpoint`, `limit`,
   `cursor`). Por MCP: `get_seo_keyword_discovery`; encolar: `discover_seo_keywords` (siempre con
   `preview: true` primero y confirmación humana).
5. **Decidir por candidato:** `intent: "record_action"` con `candidateId` +
   `actionKind` (`dismissed | selected_for_target | selected_for_grounded_query |
   promoted_to_tracking | rejected`). **Seguir de verdad** una keyword usa el command de tracking
   existente (`keywords/track`), nunca esta ruta.

## Que significan los estados

| Estado | Lectura |
|---|---|
| `pending` | Encolada, esperando el drain. Pendiente >2h = scheduler pausado o flag OFF (señal `stuck_runs`). |
| `running` | En ejecución (minutos). Más de 15 min = atascada (señal `stuck_runs`). |
| `succeeded` | Todas las llamadas OK y hay candidatos. |
| `partial` | Hubo candidatos pero alguna subllamada falló (`error_code` dice si fue proveedor o presupuesto). Lo materializado se conserva. |
| `no_results` | Corrida válida sin filas (incluye el modo GSC-only sin métodos: costo 0). NO es un error. |
| `budget_blocked` | El gate/fence frenó el gasto. El costo ya incurrido queda registrado. |
| `failed` | Proveedor caído o error inesperado; nunca se disfraza de lista vacía. |

## Que NO hacer

- **NUNCA** prender el flag sin sign-off de gasto del operador, ni en un solo runtime.
- **NUNCA** interpretar `◑` (mercado estimado) como demanda medida: `measuredGsc` (`●`) es la
  lente medida y viaja separada. `competition` es competencia PAGA, no dificultad.
- **NUNCA** "limpiar" runs/candidates/actions con DELETE: las tablas son append-only (trigger).
- **NUNCA** re-encolar en loop ante `budget_blocked`: el freno está operando; revisa el budget del
  tier.

## Problemas comunes

- **`disabled`**: falta uno de los dos flags en ese runtime.
- **`multiple_markets` (409)**: la org tiene más de un target activo — pasa `market` (ISO-2 o
  `location_code`).
- **Pendientes que no avanzan**: scheduler pausado (estado se re-aplica en cada deploy de
  `deploy.sh`) o flag OFF en el worker. Señales en `/admin/operations` (Growth Health).
- **Sanity/verificación**: `pnpm pg:connect` +
  `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1664-keyword-discovery.ts`
  (27 checks sin gasto; `--spend` ejecuta el smoke real acotado, ~USD 0.03, sólo con autorización).

## Referencias tecnicas

- Primitives: `src/lib/growth/seo/keyword-discovery/{contracts,queue,runner,reader,provider}.ts`
- Worker: `services/ops-worker/server.ts` (`/seo/keyword-discovery/drain`) + `deploy.sh`
- Lanes: `src/app/api/admin/growth/seo/keyword-discovery/route.ts` ·
  `src/app/api/platform/ecosystem/growth/seo/keyword-discovery/{route.ts,actions/route.ts}` ·
  MCP `src/mcp/greenhouse/{server,tools,http-client}.ts`
- Señales: `src/lib/reliability/queries/seo-keyword-discovery-health.ts`
