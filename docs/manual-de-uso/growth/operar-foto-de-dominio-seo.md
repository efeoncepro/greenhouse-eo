# Operar la foto de dominio SEO (TASK-1775)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-08-27 por Claude (TASK-1775)
> **Ultima actualizacion:** 2026-09-01 por Codex
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §3 y §4.2

## Para qué sirve

Responde las dos preguntas que abren toda reunión de SEO: **"¿cómo estamos contra ellos?"** y
**"¿venimos subiendo o bajando?"**. Captura la foto de un dominio completo — keywords ranqueadas
totales, tráfico orgánico estimado (ETV), distribución del top-100, momentum — del dominio del
cliente **y de sus competidores declarados**, más la trayectoria histórica mensual desde 2020-10.

Toda cifra es **◑ estimada** (DataForSEO Labs, ciclo mensual). Nunca se compara, promedia ni
grafica junto a datos ● medidos de Search Console.

> **Alerta metodológica 2026-09-01:** DataForSEO anunció ETV improved y cambio de default para
> 2026-11-01. El runtime actual no envía fórmula ni la persiste; no ejecutes un backfill, shadow o cutover
> manual agregando el flag a esta corrida. Hasta implementar provenance formula-aware, cualquier salto de ETV
> se trata como posible cambio de modelo, no como crecimiento/caída. Auditoría y plan:
> [DataForSEO Improved ETV](../../audits/seo/2026-09-01-dataforseo-improved-etv-impact.md).

## Antes de empezar

- El módulo SEO debe estar activo (`GROWTH_SEO_ENABLED=true`) y la org con assignment `seo_v2` vigente.
- Los sujetos salen de `seo_targets` (dominio del cliente) + `seo_competitors` (vigentes). Un
  dominio que no está declarado como target o competidor no se captura en el ciclo mensual.
- **Estado de rollout vigente (2026-08-27, smoke live autorizado):** flag
  `GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED=true` en el ops-worker (declarado en `deploy.sh` + revisión
  activa verificada) y scheduler `ops-seo-domain-overview` **ACTIVO** (`ENABLED`, día 16 de cada
  mes 09:00). El ciclo mensual corre solo; "Encendido" abajo queda como referencia del
  procedimiento.

## Las tres corridas y su costo

| Corrida | Endpoint | Cadencia | Costo aprox |
|---|---|---|---|
| Foto mensual (cron) | `domain_rank_overview` | mensual, día 16 09:00 CLT | ~USD 0.0121 por sujeto |
| Backfill histórico (manual) | `historical_rank_overview` | **UNA vez por sujeto** | USD 0.12/req + USD 0.0012/mes (**10× el resto**) |
| Screening de cartera (manual) | `bulk_traffic_estimation` | on-demand | ~USD 0.13 por 1.000 dominios |

## Paso a paso

### 1. Dry-run del batch mensual (no gasta)

```bash
# contra el ops-worker (staging/prod comparten servicio); CRON_SECRET del worker
curl -s -X POST "$OPS_WORKER_URL/seo/domain-overview/capture-batch" \
  -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' \
  -d '{"dryRun": true}'
```

Reporta por target: sujetos, frescos, pendientes y `estimatedCostUsd` con la fórmula.

### 2. Corrida real acotada (gasta; exige flag ON)

```bash
curl -s -X POST "$OPS_WORKER_URL/seo/domain-overview/capture-batch" \
  -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' \
  -d '{"maxTargets": 1}'
```

Verificar: (a) el `costUsd` devuelto contra el estimado del dry-run; (b) la fila en
`greenhouse_growth.seo_domain_overview_snapshots`; (c) **re-disparar el mismo target y confirmar
costo USD 0** con outcome `fresh` — el pre-check de frescura es el seguro del presupuesto.

### 3. Backfill histórico (manual, tope duro)

```bash
# DRY-RUN por defecto: imprime meses faltantes por sujeto + costo estimado
npx tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/growth/backfill-domain-rank-history.ts --target=seot-XXXX

# Corrida real: --apply explícito; tope USD 5 salvo --max-usd; acotable por dominio
... --target=seot-XXXX --apply --domains=cliente.cl --from=2023-01 --max-usd=2
```

- **Confirmar el tope en USD con el operador antes del primer `--apply`** (cuesta 10× el resto).
- Es resumible: meses ya presentes se saltan; una corrida interrumpida se retoma sola.
- El dato es pasado inmutable: **jamás** va en un cron.

### 4. Leer el resultado

- Reader canónico: `readDomainOverview` / `readDomainOverviewForTarget` (`src/lib/growth/seo/domain-overview/reader.ts`).
- Lane ecosystem: `GET /api/platform/ecosystem/growth/seo/domain-overview[?subject=competidor.cl][&months=24][&market=MX]`.
- Tool MCP: `get_seo_domain_overview` (lectura, scope `efeonce.mcp.read`).

## Encendido (rollout) y apagado

Multi-runtime — el flag se lee **SOLO en el ops-worker** (prenderlo en Vercel es inerte):

1. Declarar `GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED=true` en `services/ops-worker/deploy.sh` (SoT —
   su `--set-env-vars` es destructivo y borraría un flag aplicado sólo en vivo).
2. Aplicar en vivo: `gcloud run services update ops-worker --region us-east4 --update-env-vars GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED=true` y **verificar en la revisión activa**.
3. Correr el smoke del paso 2 (un sujeto real + re-corrida a USD 0).
4. Despausar: `gcloud scheduler jobs resume ops-seo-domain-overview --location us-east4`.
5. Actualizar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

**Rollback (<5 min):** flag a `false` (deploy.sh + `--update-env-vars`) + pausar el scheduler.
Las filas capturadas quedan — son mediciones válidas de una tabla append-only, no se borran.

## Qué significan los estados

| Outcome | Significado |
|---|---|
| `captured` | Se compró la foto del sujeto en este ciclo |
| `fresh` | Foto vigente (< 30 días): no se pegó al proveedor, costo cero |
| `no_market_data` | El proveedor no conoce el dominio; queda fila con NULLs (no se re-compra el ciclo) |
| `budget_blocked` | Gate de entitlement/presupuesto de la org |
| `cap_blocked` (backfill) | El tope duro `--max-usd` de la corrida no alcanza para ese sujeto |
| `provider_error` | El proveedor falló; NO se escribió fila (sin veredicto no hay hecho) |

## Señal de confiabilidad

`seo.domain_overview.stale_subjects` (dashboard `/admin/operations`, módulo Growth; steady = 0):

- **ok "sin rollout"** — nadie capturado jamás: la capacidad está apagada (estado esperado pre-encendido).
- **warning** — algún sujeto sin foto en 2 ciclos (60 días): sujeto nuevo sin captura inicial o gate bloqueando.
- **error** — TODOS los sujetos stale habiendo data histórica: la captura murió. Causa típica: un
  deploy con `--set-env-vars` borró el flag del worker. Revisar la **revisión activa**, no el `deploy.sh`.

## Qué no hacer

- **NO** correr `historical_rank_overview` en un cron ni sin `--dry-run` previo.
- **NO** comparar/promediar estas cifras con GSC — lentes distintas (◑ vs ●).
- **NO** rotular `etv` como "visitas" ni como dólares: es tráfico mensual **estimado**; el USD es
  `organicEstimatedTrafficCostUsd`.
- **NO** exponer `captured_by_organization_id` en ninguna superficie.
- **NO** "actualizar" una fila: la tabla es append-only; una medición errónea se corrige con una
  captura nueva, jamás con UPDATE/DELETE.

## Problemas comunes

- **El dry-run muestra 0 pendientes pero esperabas compra** → los sujetos están frescos (< 30 días).
  Correcto: repetir dentro del ciclo debe costar cero.
- **Un competidor nuevo no aparece** → verificar que esté en `seo_competitors` con `effective_to IS NULL`.
- **El batch devuelve `disabled`** → falta el flag propio o `GROWTH_SEO_ENABLED` en el ops-worker (revisión activa).
- **`no_market_data` para un dominio real** → el proveedor no lo tiene en ese mercado
  (location/language del target). Verificar el mercado antes de asumir error.

## Referencias técnicas

- Primitives: `src/lib/growth/seo/domain-overview/{capture,history-backfill,traffic-estimation,reader,persist}.ts`
- Worker: `services/ops-worker/server.ts` (`/seo/domain-overview/capture-batch`) + `deploy.sh` (`ops-seo-domain-overview`)
- Migración: `migrations/20260827190156045_task-1775-seo-domain-overview.sql`
- Spec: `docs/tasks/TASK_ID_REGISTRY.md → TASK-1775 (spec en la carpeta de su lifecycle vigente)`
- Proveedor: `.claude/skills/dataforseo-operator/references/02-labs.md` §2/§5
