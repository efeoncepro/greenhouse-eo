# Operar el keyword discovery (seed expansion + enrichment)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-08-14 por Claude (TASK-1664)
> **Ultima actualizacion:** 2026-08-28 por Claude (TASK-1694 + TASK-1692: el contrato de lectura devuelve una fila por keyword normalizada, `maxDifficulty` se acepta pero no filtra y se declara, `maxLinkBarrier` es el filtro canonico, y `record_action` solo acepta decisiones humanas puras; ademas la cadencia real del drain es `*/2`)
> **Documentacion tecnica:** [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §7 y §8
> **Documentacion funcional:** [`modulo-seo-search-visibility-360.md`](../../documentation/growth/modulo-seo-search-visibility-360.md)

## Para que sirve

Convierte una idea ("¿habrá demanda para X?") en un conjunto de **candidatos** priorizables:
expande hasta 10 seeds con DataForSEO Labs, trae volumen/intención/barrera de enlaces y deja todo
trazable por corrida. **No agrega nada al set monitoreado**: descubrir y seguir son decisiones
separadas.

## Antes de empezar

- Para un plan editorial, empezar por la matriz de necesidades y cobertura propia del
  [modelo editorial §2.3](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md).
  Presupuestar el conjunto de corridas, no sólo cada lote. Para Berel aplica
  [la estrategia de cobertura](../../operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md).
- Leer todas las páginas de candidatos antes de concluir ausencia. Una categoría con menos piezas
  no es automáticamente prioridad; un candidato puede pedir ampliar una pieza existente.

- La organización necesita assignment `seo_v2` vigente y un target activo (con más de un mercado,
  declara `market`).
- **Cada corrida gasta** (Labs cobra por request y por fila). El gate de entitlement y el
  presupuesto mensual del tier aplican; el preview es obligatorio de facto: mira la fórmula antes
  de confirmar.
- Flags: `GROWTH_SEO_ENABLED` (módulo) + `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED` (default **OFF**;
  lo leen **Vercel y el ops-worker** — prenderlo en uno solo deja la capacidad coja). El
  scheduler `ops-seo-keyword-discovery-drain` **nace pausado**: dos frenos independientes.
- **Cadencia vigente del drain: `*/2 * * * *`** (verificada en vivo el 2026-08-28: job `ENABLED`,
  atendiendo cada 2 minutos). Bajó de `*/10` porque la lente es interactiva y un drain con cola
  vacía no cuesta nada.

  🔴 **Esa cadencia se puede revertir sola, sin aviso.** El `*/2` lo declara
  `services/ops-worker/deploy.sh` en `develop`; en `origin/main` ese mismo archivo todavía dice
  `*/10`. Hay **un solo** servicio ops-worker y **un solo** set de jobs de Cloud Scheduler
  (staging y producción los comparten), y el helper `upsert_scheduler_job` hace
  `create … || update … --schedule=…`: la rama de update **re-aplica el schedule**. Por lo tanto
  cualquier deploy que corra el árbol de `main` —un release de producción, un rollback, un
  `workflow_dispatch` de break-glass— devuelve el drain a `*/10` **en silencio**: el job queda
  `ENABLED` y sano, sólo drenando 5× más lento, y **ninguna señal lo detecta**. La ventana se
  cierra sola en la próxima promoción normal `develop → main`. Mientras siga abierta: si ves
  corridas `pending` acumulándose sin que nada esté caído, **verifica el schedule real del job
  antes de buscar otra causa**:

  ```bash
  gcloud scheduler jobs describe ops-seo-keyword-discovery-drain \
    --project efeonce-group --location us-east4
  ```

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
3. **Esperar el drain** (scheduler cada 2 min — ver la advertencia de reversión más arriba) o
   dispararlo a mano contra el worker: `POST /seo/keyword-discovery/drain` (requiere OIDC del
   scheduler o `CRON_SECRET`).
4. **Leer candidatos:** `GET /api/admin/growth/seo/keyword-discovery?organizationId=...&runId=...`
   (filtros `intent`, `minSearchVolume`, `maxLinkBarrier`, `includeUnknownBarrier`, `query`,
   `sourceEndpoint`, `limit`, `cursor`). Por MCP: `get_seo_keyword_discovery`; encolar:
   `discover_seo_keywords` (siempre con `preview: true` primero y confirmación humana).

   Tres cosas del contrato de lectura que cambiaron el 2026-08-28 (TASK-1694) y que un agente o
   una integración **tienen que conocer para no leer mal la respuesta**:

   | Qué | Cómo se comporta |
   |---|---|
   | **Una fila por keyword normalizada** | Si dos métodos hallaron la misma keyword, es **una** fila, no dos. Trae `candidateIds[]` y `provenance[]` con todas sus procedencias, y `totalCandidates` cuenta keywords distintas. **NUNCA** trates una procedencia como un candidato propio: son un solo compromiso de gasto |
   | **`maxDifficulty` se acepta pero NO filtra** | Se conserva para no romper a quien ya lo mandaba, y la respuesta lo **declara** en `ignoredFilters`. Ese índice del proveedor colapsa a 0 en SERPs es-LATAM (764 de 923 filas del almacén marcan cero), así que pedir "sólo lo fácil" devolvía casi todo, **barrera Alta incluida** |
   | **`maxLinkBarrier` es el filtro canónico** | Vocabulario cerrado `low \| medium \| high`, sobre la barrera derivada del perfil de enlaces del top-10. Por defecto **deja fuera lo no medido**; para incluirlo, `includeUnknownBarrier=true`. "Sin dato" nunca satisface un filtro de barrera |

   Además cada candidato trae `clusterConflict` (`conflict` · `clear` · `unknown`): avisa cuando
   pertenece al mismo grupo que una keyword que **ya se sigue**, y nombra contra cuáles choca. Es
   un **aviso, no un bloqueo**, y `unknown` significa "no se pudo saber" — jamás vía libre.
   `ignoredFilters` viaja **siempre** (`[]` cuando no aplica): si tu integración lo ignora, estarás
   asumiendo que filtró algo que no filtró.

5. **Decidir por candidato:** `intent: "record_action"` con `candidateId` + `actionKind`.

   🔴 **Desde TASK-1692 sólo se aceptan tres kinds** —los que corresponden a una **decisión humana
   pura**—: `dismissed`, `rejected` y `selected_for_grounded_query` (este último **únicamente** como
   re-selección explícita de un candidato descartado, con `metadata.reason = 'reselected'`).

   Mandar `promoted_to_tracking` o `selected_for_target` devuelve **400**, a propósito y verificado
   contra producción. La razón: **el hecho lo escribe el proceso que lo produce, no el consumidor
   que lo observa.** Promover a seguimiento deja su fila del historial **dentro de la misma
   transacción** que abre la membresía; preparar consultas AEO la deja el propio bridge. Si cada
   cliente tuviera que reportarlo en una segunda llamada, bastaría con que se cayera la red para
   dejar el compromiso de gasto hecho y la decisión sin autor.

   `selected_for_target` además **se retiró del vocabulario**: no tenía escritor ni podía tenerlo —
   la intención (`target | opportunity`) es un atributo de la **membresía**, no del candidato. El
   `CHECK` de la base conserva el valor para que una fila histórica siga siendo legible.

   **Seguir de verdad** una keyword —y **declarar objetivo**, que es lo mismo con
   `intent: 'target'`— usa el command de tracking (`keywords/track`), nunca esta ruta.

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
- **NUNCA** filtrar por `maxDifficulty` creyendo que filtra. No filtra: lee `ignoredFilters` de la
  respuesta. Si necesitas acotar por dificultad, el parámetro es `maxLinkBarrier`.
- **NUNCA** encadenar un `record_action` después de seguir una keyword o de preparar consultas AEO
  para "dejar constancia". Ya quedó registrada por el proceso que la produjo; hacerlo de nuevo es
  la puerta que TASK-1692 cerró, y devuelve 400.
- **NUNCA** contar filas de procedencia como oportunidades distintas. Una keyword hallada por dos
  métodos es **una** decisión y **un** compromiso de gasto.
- **NUNCA** presentar un `clusterConflict: 'unknown'` como "no hay conflicto". Significa que no se
  pudo saber: un hueco de datos no es una vía libre.

## Problemas comunes

- **`disabled`**: falta uno de los dos flags en ese runtime.
- **`multiple_markets` (409)**: la org tiene más de un target activo — pasa `market` (ISO-2 o
  `location_code`).
- **Pendientes que no avanzan**: scheduler pausado (estado se re-aplica en cada deploy de
  `deploy.sh`) o flag OFF en el worker. Señales en `/admin/operations` (Growth Health).
- **Pendientes que avanzan pero lentas** (el job está `ENABLED`, nada falla, y aun así se acumulan):
  revisa el **schedule real** del job. Si dice `*/10` en vez de `*/2`, un deploy corrido desde el
  árbol de `main` lo revirtió — ver la advertencia en `## Antes de empezar`. No hay señal que lo
  detecte, así que hay que mirarlo.
- **`400` al registrar una acción**: sólo se aceptan `dismissed`, `rejected` y
  `selected_for_grounded_query`. `promoted_to_tracking` y `selected_for_target` se rechazan a
  propósito — el primero lo escribe el command de tracking, el segundo se retiró del vocabulario.
- **El filtro de dificultad "no hace nada"**: es correcto. `maxDifficulty` se acepta, no se aplica
  y viaja declarado en `ignoredFilters`. Usa `maxLinkBarrier`.
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
