# Operar el perfil de enlaces SEO: snapshot semanal + detalle nominal (TASK-1304 · TASK-1777)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-27 por Claude (TASK-1777)
> **Ultima actualizacion:** 2026-08-27 por Claude
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §4.2

## Para qué sirve

El snapshot semanal (vivo desde 2026-08) dice **cuántos** dominios referentes hay y cuántos se
ganaron o perdieron. El detalle nominal dice **cuáles**: qué dominio enlazó, cuál se cayó (con una
muestra del enlace y su anchor — suficiente para escribir el correo de recuperación), y con qué
textos te enlazan — la lectura de sobre-optimización de anchors que el proxy `toxic_share` no da.

**La disciplina de costo es el corazón:** el detalle sólo se compra donde el agregado se movió.
Un target estable registra `skipped_no_movement` a costo cero — y eso es un hallazgo ("el perfil
estuvo estable"), no un hueco.

## Antes de empezar

- El snapshot semanal ya corre solo: cron `ops-seo-backlink-capture` (lunes 07:00 CLT, ACTIVO).
- **El detalle NO tiene cron propio**: es un paso del mismo batch, detrás de
  `GROWTH_SEO_BACKLINK_DETAIL_ENABLED` (**ON desde 2026-08-27**, smoke live autorizado; deploy.sh
  + revisión activa verificada). No hay scheduler nuevo que crear.
- **Verificación pendiente (lunes 2026-08-31, primer ciclo natural con el flag ON):** confirmar
  que targets sin movimiento salen `skipped_no_movement` a USD 0 — receta SQL en el Delta (3) de
  `docs/tasks/in-progress/TASK-1777-growth-seo-backlink-profile-drilldown.md`. Hasta entonces el
  estado es `code complete, rollout parcialmente verificado`.
- Umbrales y limit (fijan el costo anual — confirmarlos antes del flip):
  `GROWTH_SEO_BACKLINK_DRILLDOWN_MIN_BACKLINK_MOVEMENT` (default 10),
  `…_MIN_REFDOMAIN_MOVEMENT` (default 3), `GROWTH_SEO_BACKLINK_DETAIL_ROW_LIMIT` (default 100).

## Cuándo dispara el drill-down (y cuándo no)

| Situación | Resultado | Costo |
|---|---|---|
| Primera evaluación de un target | Dispara una vez (funda la línea base) | ~USD 0.05–0.10 |
| Movimiento ≥ umbral (backlinks o dominios referentes) | Dispara | ~USD 0.05–0.10 |
| Sin movimiento | `skipped_no_movement` (afirmación positiva) | **USD 0** |
| Snapshot `partial` (el delta no llegó) | `skipped_partial` — jamás gastar "por si acaso" | **USD 0** |
| Proveedor falló a mitad del drill-down | `failed` + señal en rojo; cero filas fabricadas | lo ya gastado |

Cada evaluación deja su **veredicto persistido** (`seo_backlink_drilldowns`) — por eso el reader
puede distinguir "no pasó nada" de "no sabemos qué pasó", que son conclusiones opuestas.

## Paso a paso

### 1. Encendido (rollout)

1. `GROWTH_SEO_BACKLINK_DETAIL_ENABLED=true` en `services/ops-worker/deploy.sh` (SoT — su
   `--set-env-vars` es destructivo).
2. `gcloud run services update ops-worker --region us-east4 --update-env-vars GROWTH_SEO_BACKLINK_DETAIL_ENABLED=true` y verificar en la **revisión activa**.
3. Smoke (paso 2 de abajo). 4. Actualizar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

**Nota de gasto inicial:** al prender, la regla de "primera vez" dispara una vez por cada target
activo (~USD 0.1 c/u). Con la cartera actual es centavos; si creciera, escalonar con `maxSnapshots`.

**Rollback (<5 min):** flag a `false` — el batch semanal vuelve a su comportamiento actual sin
tocar el cron ni redeployar.

### 2. Smoke de verificación (dispara el batch a mano)

```bash
curl -s -X POST "$OPS_WORKER_URL/seo/backlinks/capture-batch" \
  -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' \
  -d '{"maxTargets": 2}'
```

Verificar en la respuesta (`detailPass`): (a) un target **con** movimiento quedó `drilled` con
filas en ambas tablas hijas y su `cost` cerca del estimado; (b) un target **sin** movimiento quedó
`skipped_no_movement` con **USD 0** en `seo_provider_spend_daily`; (c) `readBacklinkProfile`
devuelve exactamente el mismo shape de siempre.

### 3. Leer el resultado

- Reader canónico: `readBacklinkDetail` (`src/lib/growth/seo/backlinks/detail-reader.ts`) — tres
  estados + dominios con movimiento + perfil de anchors con la derivación de sobre-optimización
  ya calculada (ningún consumer la recalcula).
- Lane ecosystem: `GET /api/platform/ecosystem/growth/seo/backlink-detail[?captureDate=YYYY-MM-DD]`.
- Tool MCP: `get_seo_backlink_detail` (lectura, scope `efeonce.mcp.read`).

## Qué significan las dos métricas de "toxicidad"

| Métrica | Qué responde | Remedio |
|---|---|---|
| `toxic_share` (snapshot, proxy del spam score promedio) | "¿De qué barrio vienen mis enlaces?" | Desautorizar (trabajo manual del especialista) |
| Sobre-optimización de anchors (nueva, del detalle) | "¿Parece natural cómo me enlazan?" (60% con el mismo anchor exacto = señal de manipulación) | Diversificar el anchor de campañas futuras |

Son diagnósticos distintos con remedios distintos: **jamás se intercambian ni se promedian**.

## Señal de confiabilidad

`seo.backlink.detail_drilldown_failed` (módulo Growth; steady = 0): un `failed` significa "hubo
movimiento y no sabemos qué se movió" — el detalle de esa semana no es recuperable (la ventana del
proveedor avanza). warning con 1–2 en la ventana de 14 días; error con 3+ o todos fallidos
(revisar el breaker de la familia `backlinks` y los logs del pase).

## Qué no hacer

- **NO** cablear el drill-down incondicional sobre la cartera: la condición de disparo es parte
  del contrato, no una optimización.
- **NO** crear un Cloud Scheduler para el detalle: un cron aparte lo desincronizaría de su
  snapshot padre.
- **NO** renderizar `skipped_no_movement` como "sin datos": es la afirmación "el perfil estuvo
  estable" — colapsarla con `drilldown_failed` borra la distinción que le importa al especialista.
- **NO** mezclar escalas de `rank` (todo se pide y persiste 0–100).
- **NO** recalcular `toxic_share` desde las filas hijas (poblaciones distintas de spam score).
- **NO** hacer backfill del detalle histórico: la ventana del proveedor ya pasó y sería inventar
  historia con fechas que no corresponden a lo observado.

## Problemas comunes

- **`no_detail` en el reader** → el snapshot es anterior a la feature o el flag estaba OFF esa
  semana: ningún veredicto existe todavía. Esperar el próximo ciclo con el flag ON.
- **Todo sale `skipped_no_movement` semana tras semana** → el perfil realmente está estable
  (verificable contra `new_lost_delta` del snapshot) o los umbrales están demasiado altos para
  ese target: ajustar knobs con el operador.
- **`failed` recurrente** → breaker de la familia `backlinks` abierto o task del proveedor
  fallando; el batch del snapshot es independiente y sigue corriendo.

## Referencias técnicas

- Primitives: `src/lib/growth/seo/backlinks/{should-drill-down,detail-capture,anchors,detail-reader}.ts`
- Worker: `services/ops-worker/server.ts` (paso `detailPass` en `/seo/backlinks/capture-batch`) + `deploy.sh` (flag)
- Migración: `migrations/20260827203319906_task-1777-seo-backlink-detail.sql`
- Spec: `docs/tasks/TASK_ID_REGISTRY.md → TASK-1777 (spec en la carpeta de su lifecycle vigente)`
- Proveedor: `.claude/skills/dataforseo-operator/references/03-backlinks.md` §2/§4/§5/§7/§8
