# Operar el keyword gap competitivo (TASK-1662)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-28 por Claude (TASK-1662)
> **Ultima actualizacion:** 2026-08-28 por Claude
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §3 y §4.2

## Para qué sirve

Responde la pregunta con más valor comercial del módulo: **"¿qué búsquedas gana la competencia
donde el cliente es invisible?"**. Search Console es estructuralmente ciego a lo que el cliente
no rankea (sin top ~100 no hay impresiones), así que esta capacidad compra la cobertura de un
competidor DECLARADO y deriva el gap al leer.

Tres salidas separadas que **nunca se mezclan**:

- **Gap de contenido** (`content_gap`): el competidor rankea y el cliente no aparece → contenido nuevo.
- **Gap de optimización** (`ranks_worse`): ambos rankean, el cliente peor → lo cubre la superficie de oportunidades.
- **Objetivos declarados** (`declaredTargets`): keywords ya comprometidas con el cliente (TASK-1659) — son un compromiso en curso desde una fecha, **jamás un hallazgo para vender en una reunión**.

Toda cifra es **◑ estimada** (DataForSEO Labs, ciclo mensual). Una keyword con impresiones reales
en el GSC del cliente **no aparece en el gap**: ahí manda la lente medida (●) y la conversación es
la de oportunidades.

## Antes de empezar

- Módulo SEO activo (`GROWTH_SEO_ENABLED=true`) y org con assignment `seo_v2` vigente.
- **Un competidor es un hecho declarado por un humano** (autor + fecha + procedencia quedan en la
  fila). La propuesta puede venir de una máquina — el top-N de TASK-1699 (ya implementado; su
  serie arranca con el primer deploy del worker post-release) o el diagnóstico de prospecto —,
  pero la declaración no se automatiza: un competidor mal elegido invalida todo el análisis río
  abajo.
- **Declarar es un compromiso de gasto**: la captura de cobertura paga ~USD 0,15 por competidor por
  ciclo mensual (2 llamadas `domain_intersection`, row limit 500). Techo por target:
  `GROWTH_SEO_COMPETITORS_PER_TARGET` (default 5).
- **Estado de rollout vigente (2026-08-28, autorización plena del operador):** flag
  `GROWTH_SEO_COMPETITOR_GAP_ENABLED` **ON declarativo** (`:-true` en `services/ops-worker/deploy.sh`),
  efectivo con el primer deploy del worker post-release (la revisión activa no tiene el endpoint).
  Scheduler `ops-seo-competitor-coverage` (`0 9 18 * *`) **PAUSADO hasta ese deploy** (despausarlo
  antes haría que Cloud Scheduler golpee un 404). La secuencia de encendido YA corrió: competidor
  real declarado (Berel MX → `comex.com.mx`, autoría del operador, evidencia
  `BEREL_SEO_DIAGNOSTIC_2026-08-25`) + dry-run + **primera corrida real USD 0,1076 con Δ exacto en
  el ledger** (697 filas de cobertura, 640 de mercado gratis, gap derivado 357/54/269-excluidas).
  Script reusable: `scripts/growth/_rollout-task-1662-first-coverage.ts`.

## Paso a paso

### 1. Declarar un competidor

Por el lane admin (capability `growth.seo.target.configure`):

```bash
curl -s -X POST "$BASE/api/admin/growth/seo/competitors/declare" \
  -H 'Content-Type: application/json' \
  -d '{"seoTargetId": "seot-…", "domains": ["competidor.cl"]}'
```

Leer el `outcomes` **por dominio**: `declared | already_declared | capacity_exceeded | invalid`.
El dominio del propio cliente es `invalid` por diseño. También existe la tool MCP
`declare_seo_competitors` (scope `efeonce.mcp.seo.write`, fail-closed hasta TASK-1631) y el lane
ecosystem (sólo bindings `internal`).

### 2. Dry-run de costo (sin gastar)

```bash
curl -s -X POST "$WORKER_URL/seo/competitor-coverage/capture-batch" \
  -H 'Content-Type: application/json' -d '{"dryRun": true}'
```

Reporta competidores elegibles (vigentes, sin captura fresca <30 días) y el costo estimado con su
fórmula. V1 procesa **un competidor por corrida** (`maxCompetitors` default 1).

### 3. Primera corrida real (UN competidor de UNA org)

Con el flag ON (ver secuencia de encendido): mismo endpoint sin `dryRun`. Verificar después:

- el run en `seo_competitor_coverage_runs` (`status='captured'`, `provider_cost`);
- el gasto en el ledger (`seo_provider_spend_daily`, familia `labs`, consumer `seo`, la org del cliente);
- filas de mercado gratis en `seo_keyword_market_data` (`source_endpoint='domain_intersection'`).

### 4. Leer el gap

```bash
curl -s "$BASE/api/admin/growth/seo/keyword-gap?seoTargetId=seot-…"
```

O la tool MCP `get_seo_keyword_gap`. La respuesta trae, por competidor: `contentGap`,
`ranksWorse`, `declaredTargets`, `excluded` (cuántas keywords se callaron por GSC medido y por
"el cliente ya está mejor") y `truncated` (techo declarado). Cada fila lleva sus factores con
procedencia; un factor ausente dice `sin_dato`/`null`, nunca 0 ni "baja".

### Secuencia de encendido (rollout)

1. `pnpm migrate:status` al día (la migración `20260828113457119` ya está aplicada).
2. Declarar un competidor real por los 3 lanes y verificar el evento en el outbox.
3. Dry-run (paso 2 de arriba).
4. Flag: `GROWTH_SEO_COMPETITOR_GAP_ENABLED=true` en `deploy.sh` (SoT) **y** en vivo con
   `gcloud run services update ops-worker --update-env-vars ...` (sólo lo segundo se borra en el
   próximo deploy, en silencio).
5. Primera corrida real acotada + costo verificado en el ledger (paso 3).
6. Medir el costo por competidor ANTES de habilitar más competidores o despausar el scheduler.
7. Despausar `ops-seo-competitor-coverage` y actualizar la fila del flag en
   `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Qué significan los estados

| Estado | Significado |
|---|---|
| `coverage.state = 'no_coverage'` | Competidor declarado pero nunca capturado (flag OFF o corrida pendiente). |
| `coverage.stale = true` | La captura tiene más de 30 días — el proveedor ya refrescó su base. |
| run `failed` | El proveedor falló; NO consume la ranura del día y no cuenta como fresco. |
| `excluded.measuredInGsc` | Keywords calladas porque el cliente YA tiene demanda medida (● gana). |
| señal `seo.competitor_coverage.stale` | `ok` pre-rollout (honesto) · `warning` parcial · `error` = la captura murió. |

## Qué no hacer

- **No presentar el gap como ranking.** El reader entrega hechos en orden alfabético neutral; la
  prioridad la acuña la cola de trabajo (TASK-1700) con su `priority_score_version`. Ordenar por
  volumen pone arriba justo lo inalcanzable (AIO, barrera de enlaces).
- **No vender un `declaredTarget` como hallazgo.** Ya se lo prometimos al cliente en una fecha.
- **No exponer la comparativa competitiva al cliente** (auditoría §7): el lane ecosystem del gap es
  sólo-internal con 404 anti-oracle a propósito.
- **No declarar competidores "para probar"**: cada vigente multiplica el gasto del ciclo. El
  reverso existe (`retire`), pero la cobertura ya comprada no se devuelve.
- **No persistir el gap** en una tabla nueva: se deriva al leer; congelarlo envejece sin señal.

## Problemas comunes

- **`capacity_exceeded` al declarar** → retirar un competidor o subir el techo por env var (decisión
  de gasto, no un default).
- **`skipped_fresh` en la corrida** → ya hay captura <30 días; el ciclo mensual es el correcto
  (re-comprar antes paga dos veces por el mismo dato).
- **Gap vacío con cobertura fresca** → puede ser real ("no hay gap") — el run ledger lo registró
  como hecho; no re-correr.
- **`budget_blocked`** → el gate per-org (`enforceSeoRunEntitlement`) frenó la corrida; revisar
  presupuesto mensual y la señal `seo.provider.cost_over_budget`.

## Referencias técnicas

- Commands/reader: `src/lib/growth/seo/{competitors,competitor-coverage,keyword-gap-reader}.ts`
- Sanity live: `scripts/growth/_sanity-task-1662-keyword-gap.ts` (22 checks contra PG real)
- Spec: `docs/tasks/in-progress/TASK-1662-growth-seo-keyword-gap-discovery.md`
