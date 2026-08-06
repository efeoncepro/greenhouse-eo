# Operar el site audit técnico y el snapshot de backlinks (SEO)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-06 por Claude (TASK-1304)
> **Ultima actualizacion:** 2026-08-06 por Claude (TASK-1304)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §6/§7/§8

## Para qué sirve

Dos capturas del módulo SEO (EPIC-022) que responden "¿qué está roto técnicamente?" y
"¿qué te enlaza?":

- **Site audit (OnPage)**: crawl técnico semanal del sitio del cliente — health score
  0–100, páginas crawleadas y findings por severidad (critical/warning/notice:
  4xx/5xx, canonicals rotos, meta faltante, JSON-LD con errores, etc.).
- **Backlink snapshot**: foto semanal del perfil de enlaces — dominios referentes,
  backlinks totales, rank del dominio (0–100), share tóxico y flujo new/lost.

## Antes de empezar

- La org debe tener el módulo `seo_v1` asignado (`docs/manual-de-uso/growth/asignar-modulo-seo-organizacion.md`)
  y un `seo_target` activo.
- `GROWTH_SEO_ENABLED=true` en el ops-worker (ya ON desde TASK-1302).
- El audit **consume el cupo mensual de site-audits del tier** (contracted 8/mes,
  trial 1, pilot 2) además del presupuesto. El backlink snapshot solo consume presupuesto.

## Cómo funciona (el ciclo async de OnPage)

El site audit son **dos fases desacopladas** — el crawl tarda minutos a horas y nunca
se espera en un request:

1. `ops-seo-audit-enqueue` (lunes 06:00 CLT) crea la task OnPage por target elegible y
   deja el run en `running` con su `provider_task_id`.
2. `ops-seo-audit-collect` (cada 30 min) poll-ea las tasks en vuelo; cuando el crawl
   termina, materializa el run (status final + findings) **exactamente una vez**.

Estados finales honestos: `succeeded` (crawl OK — 0 findings = sitio limpio),
`degraded` (crawl parcial), `failed` (no crawleó nada, o task colgada >24h).

El backlink snapshot (`ops-seo-backlink-capture`, lunes 07:00 CLT) es síncrono:
una fila por `(target, semana)`, idempotente.

## Paso a paso — habilitar los crons (rollout)

Los 3 schedulers **nacen pausados**. Para habilitarlos:

1. Editar `services/ops-worker/deploy.sh`: cambiar el 5.º argumento de
   `upsert_scheduler_job` de `"true"` a `"false"` para el job correspondiente.
   ⚠️ **`ops-seo-audit-enqueue` SIEMPRE antes que `ops-seo-audit-collect`** (el collect
   sin runs encolados es un no-op, pero el orden inverso en un despliegue parcial deja
   tasks sin poll-ear).
2. Push a `develop` → el workflow `ops-worker-deploy` re-aplica el estado.
3. Verificar: `gcloud scheduler jobs list --project efeonce-group --location us-east4 | grep seo`.

El estado de pausa se **re-aplica en cada deploy**: despausar con `gcloud` a mano se
revierte solo en el siguiente deploy.

## Corridas manuales (diagnóstico)

```bash
# Encolar un audit para todos los targets elegibles (o maxTargets acotado)
curl -s -X POST "$OPS_WORKER_URL/seo/audit/enqueue-batch" -H "Authorization: Bearer $CRON_SECRET" -d '{"maxTargets":1}'

# Poll de las tasks en vuelo
curl -s -X POST "$OPS_WORKER_URL/seo/audit/collect" -H "Authorization: Bearer $CRON_SECRET" -d '{}'

# Snapshot de backlinks
curl -s -X POST "$OPS_WORKER_URL/seo/backlinks/capture-batch" -H "Authorization: Bearer $CRON_SECRET" -d '{}'
```

Smoke E2E local (gasta dinero real acotado, deja datos reales del target):

```bash
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_smoke-task-1304-live.ts
```

Sanity SQL sin gasto ni residuo:

```bash
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1304-audit-backlinks-sql.ts
```

## Qué significan los estados y señales

- **Run `running` viejo**: la signal `seo.audit.stuck_tasks` (en `/admin/operations`,
  Growth Health) alerta `warning` a las 6h y `error` a las 30h. El `error` significa
  que **el propio collect no está corriendo** (debió degradar el run a `failed` a las
  24h): revisar el scheduler `ops-seo-audit-collect`, el worker o el flag.
- **`succeeded` con 0 findings**: sitio técnicamente limpio. NO es un fallo.
- **Backlink `partial`**: el summary llegó pero el delta new/lost falló — el snapshot
  se persiste con `new_lost_delta` vacío (dato faltante visible, jamás inventado).
- **`breaker_open`**: la familia (`onpage` o `backlinks`) está en cooldown; el fallo de
  una NO afecta a la otra ni al rank capture/AEO.

## Qué no hacer

- **NUNCA** despausar `ops-seo-audit-collect` antes que `ops-seo-audit-enqueue`.
- **NUNCA** re-encolar a mano una task OnPage repetida (el guard `audit_already_running`
  existe para eso; un run `failed` de hoy sí se puede re-encolar y consume cupo de nuevo).
- **NUNCA** hacer UPDATE/DELETE sobre `seo_site_audit_findings` o
  `seo_backlink_snapshots` (append-only con trigger).
- **NUNCA** apuntar dashboards a DataForSEO en vivo — los reads salen de PG.

## Problemas comunes

| Síntoma | Causa probable | Acción |
|---|---|---|
| `collect` siempre `pollFailed` | Transporte/credenciales o endpoint summary | Revisar Sentry (`seo_site_audit_collect`); credenciales con `checkDataForSeoConnection` |
| Audit bloqueado `quota_exhausted` | Cupo mensual del tier agotado | Esperar el reset mensual o subir tier/override pilot |
| Snapshot BQ no aparece | Worker desplegado sin las projections o evento sin replay | `POST /api/admin/ops/replay-reactive` (el replay es explícito, lección TASK-1303) |
| Run zombie >30h | Scheduler collect pausado/roto | Despausar/verificar worker; el collect lo degradará a `failed` |

## Referencias técnicas

- Commands/readers: `src/lib/growth/seo/site-audit/**`, `src/lib/growth/seo/backlinks/**`
- Handlers: `services/ops-worker/server.ts` (`/seo/audit/*`, `/seo/backlinks/*`)
- Schedulers: `services/ops-worker/deploy.sh` (TASK-1304)
- Mirrors BQ: `greenhouse_growth_analytics.seo_site_audit_history` + `seo_backlink_history`
- MCP tools: `get_seo_site_audit_report`, `get_seo_backlink_profile`
