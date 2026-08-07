> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-08-06 por Claude (TASK-1303)
> **Ultima actualizacion:** 2026-08-06 por Claude (sync post-rollout: cron ACTIVO, saldo recargado)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §8

# Operar la captura diaria de rankings (SEO)

## Para que sirve

La captura diaria de rankings mide, una vez al dia, en que posicion exacta aparece el dominio de cada organizacion (con modulo `seo_v1` asignado) para sus keywords trackeadas — la serie que alimenta la pantalla ancla "Rank & URL performance over time". **Esta captura gasta dinero real** (DataForSEO, ~USD 0.01 por keyword al dia con los parametros actuales), asi que toda la operacion gira alrededor del control de costo.

## Antes de empezar

- El cron `ops-seo-rank-capture` (Cloud Scheduler, `0 5 * * *` America/Santiago) esta **ACTIVO desde el 2026-08-06** (despausado tras el smoke E2E real de este manual). Nacio pausado por diseño; el estado declarado vive en `deploy.sh` (ver "Pausar/despausar" abajo).
- El flag `GROWTH_SEO_ENABLED` ya esta ON en el ops-worker y en Vercel (ver `FEATURE_FLAG_STATE_LEDGER.md`).
- La cuenta DataForSEO debe tener saldo (recargada el 2026-08-06 — verificar el saldo vigente con `/v3/appendix/user_data` antes de expandir a mas organizaciones).
- El blast radius real lo controla el **assignment per-org**: el batch solo itera organizaciones con `module_assignments.seo_v1` vigente. Berel primero (Fase 0).

## Paso a paso

### Verificar antes de despausar (una vez, en staging)

1. Corrida manual acotada contra el ops-worker (1 target):

```bash
gcloud scheduler jobs run ops-seo-rank-capture --project=efeonce-group --location=us-central1
```

   o directamente el endpoint con body `{"maxTargets": 1}` (auth del worker via OIDC).

2. Verificar el log de la corrida: `[ops-worker] /seo/rank/capture-batch done — targets=N snapshots=M cost=$X ...`.
3. Verificar idempotencia: repetir la corrida el mismo dia → `skippedTargets` sube, `cost=$0` para lo ya capturado.
4. Verificar el gate: una org con presupuesto agotado debe aparecer `blocked` con `budget_exhausted`, sin llamadas al proveedor.
5. Verificar el mirror: el evento `growth.seo.rank_snapshot.captured` pasa por el outbox (publisher cada 2 min) y el lane `ops-reactive-growth` (cada 5 min) lo espeja a BigQuery:

```bash
bq --project_id=efeonce-group query --use_legacy_sql=false 'SELECT capture_date, COUNT(*) FROM greenhouse_growth_analytics.seo_rank_history GROUP BY 1 ORDER BY 1 DESC LIMIT 5'
```

6. Verificar el gasto contabilizado en `greenhouse_growth.seo_provider_spend_daily` (familia `serp`).

### Pausar/despausar (cambio de estado)

> La habilitacion inicial ya se ejecuto el 2026-08-06 (cron ACTIVO). Esta subseccion queda como referencia para cualquier cambio de estado futuro — incluido el rollback inverso (volver a pausar).

1. En `services/ops-worker/deploy.sh`, cambiar el 5.º argumento del job `ops-seo-rank-capture` (`"false"` = activo, `"true"` = pausado) y redeployar. **No cambiar el estado a mano con `gcloud scheduler jobs resume`/`pause`**: el estado declarado en `deploy.sh` se re-aplica en cada deploy y revertiria el cambio en silencio.
2. Tras activar, observar 1–2 corridas reales: costo en `seo_provider_spend_daily`, snapshots por dia, signal `seo.rank.capture_lag` en verde en `/admin/operations`.

### Consultar la serie

- Por MCP: tool `get_seo_rank_evolution` (organizationId para bindings internos; rangeDays/engine/device/keywords opcionales).
- Por codigo: `readRankEvolution(seoTargetId, { rangeDays })` — ≤180 dias desde PG, mas desde BigQuery.

## Verificacion ejecutada (2026-08-06 — smoke real)

La cadena completa quedo verificada con dinero real el 2026-08-06 (Berel, 8 keywords sembradas
desde las top queries medidas de GSC): captura via worker HTTP → 8 snapshots con
posicion/URL/features reales (berel #1; "pintura para alberca" #2 **con `ai_overview`
presente**) a costo real USD 0.03 (USD 0.00375/call, bajo el estimador 0.01) → ledger `serp`
8 calls escrito por el transporte → re-run mismo dia = `skipped` con USD 0 → outbox
`published` → mirror BQ con las 8 filas → `readRankEvolution` sirviendo las 8 series →
signal en warning honesto (Efeonce elegible sin captura inicial). Tras el smoke, el cron se
despauso el mismo dia (serie dia-1: Berel con 31 keywords).

## Que significan los estados

| Estado | Significado |
|---|---|
| `succeeded` | Todos los combos elegibles del target quedaron capturados hoy. |
| `partial` | Capturo una parte; el resto quedo `budget_blocked`/`provider_error` (ver outcomes). |
| `degraded` | Habia keywords elegibles y NO se capturo ninguna — nunca se reporta como exito. |
| `skipped` | Todo estaba capturado hoy (re-run idempotente, cero gasto). |
| `blocked` | El gate freno el target completo (sin entitlement, expirado o sin presupuesto). |
| `position` vacia | La keyword se midio y el dominio no aparece en el top-20 — dato valido de la serie. |

## Que NO hacer

- **NUNCA** despausar el cron sin verificar el gate de costo en staging: el costo DataForSEO es el riesgo #1 del programa.
- **NUNCA** "arreglar" un snapshot con UPDATE/DELETE: la tabla es append-only por trigger y el presupuesto ya se gasto; un dato malo se documenta, no se reescribe.
- **NUNCA** sumar el `provider_cost` de los snapshots al presupuesto: el ledger `seo_provider_spend_daily` (escrito por el transporte) es la unica fuente — sumarlos duplica el gasto.
- **NUNCA** activar la captura para todas las organizaciones de golpe: expandir assignment por assignment.

## Problemas comunes

| Sintoma | Causa probable | Accion |
|---|---|---|
| El worker lanza "no registró el contador de gasto" | Falta `import '@/lib/growth/seo/register-provider-spend'` en el entrypoint | Es un guard a proposito (TASK-1300); restaurar el import |
| Corrida con `breakerOpen` en todos los combos | Circuit breaker de la familia `serp` abierto (5 fallos seguidos del proveedor) | Esperar el cooldown (60 s) o revisar credencial/saldo DataForSEO |
| `seo.rank.capture_lag` en warning con el cron activo | Un target dejo de capturarse (presupuesto agotado o proveedor caido) | Revisar outcomes de la ultima corrida en los logs del worker |
| Snapshots en PG pero no en BigQuery | Outbox atascado o lane reactiva con dead-letter | Revisar `sync.outbox.unpublished_lag` y `sync.outbox.dead_letter` en `/admin/operations` |
| Mirror con `Access Denied: bigquery.tables.updateData` | El dataset BQ nuevo no tiene grant WRITER para el SA del worker (`greenhouse-portal@`) | Agregar el access entry WRITER al dataset (patron de `greenhouse_conformed`); resuelto para `greenhouse_growth_analytics` el 2026-08-06 |
| Evento del mirror quedo en `result='retry'` y no avanza | La lane periodica NO re-reclama eventos en retry — el replay es explicito | `pnpm staging:request POST /api/admin/ops/replay-reactive '{"domain":"growth","handlerKeys":["seo_rank_history_bq_sync:growth.seo.rank_snapshot.captured"],"replayFailedHandlers":true}'` |

## Referencias tecnicas

- Command: `src/lib/growth/seo/rank-capture.ts` · batch: `rank-capture-batch.ts` · mirror: `rank-history-bq-mirror.ts` · reader: `rank-evolution-reader.ts`
- Signal: `src/lib/reliability/queries/seo-rank-capture-lag.ts` (`seo.rank.capture_lag`)
- Sanity SQL live: `scripts/growth/_sanity-task-1303-rank-capture-sql.ts`
- Skill del proveedor: `.claude/skills/dataforseo-operator/`
