# ISSUE-182 — La captura diaria de rankings pierde keywords por timeout y no lo avisa

## Ambiente

producción, Cloud Run `ops-worker`, job `ops-seo-rank-capture` (`0 5 * * *`, `America/Santiago`).

## Detectado

2026-10-12, correo de Sentry `JAVASCRIPT-NEXTJS-9D` aportado por el operador
(`AbortError: This operation was aborted` en `requestDataForSeo`, `POST /seo/rank/capture-batch`).
Logs del worker y base verificados directamente.

## Síntoma

Berel (`seot-berel-mx`) capturó 28 de 31 keywords el 12 de octubre; faltaron
`impermeabilizante berel`, `pintura para alberca` y `pintura para piso`. El resumen del batch
decía `degraded=0 failed=0`.

## Causa raíz

- El transporte aborta una consulta SERP a los 35 s y un POST no se reintenta por diseño (puede
  haberse cobrado). La keyword queda sin medición del día, y la SERP de hoy no se compra mañana.
- El handler sólo imprimía y alertaba targets `degraded` o `failed`. Un target `partial` no
  aparecía en el log ni disparaba aviso: la única huella era el `AbortError` suelto.
- No había segundo intento el mismo día.

## Impacto

Días con huecos en Berel: 28-sep (29/31) y 1-oct (4/31) según logs; 8-oct (30/31) y 12-oct (28/31)
según la base. El 7-oct se recuperó solo porque Cloud Scheduler reintentó al superar su deadline
de 540 s. Los huecos anteriores al 12 son pérdida irrecuperable de la serie.

## Solución

Triage: `issue-only fix`.

- Job nuevo `ops-seo-rank-capture-retry` (`0 7 * * *`), mismo endpoint y body. El pre-check de
  idempotencia filtra lo ya capturado antes de llamar al proveedor: un día completo cuesta USD 0.
- El handler imprime `partial=` y `missing=` y avisa (warning) cuando hay targets parciales.

## Verificación

`bash -n services/ops-worker/deploy.sh`, `deploy-contract.test.ts`, `pnpm typecheck` y lint en verde.
La idempotencia de una re-corrida ya estaba verificada (runbook, 2026-08-06) y se observó en
producción el 2026-10-07.

## Estado

**Code complete, rollout pendiente**: el job nuevo y el log sólo existen tras el próximo deploy del
`ops-worker` (push de `develop`). Pendiente del operador: recuperar las 3 keywords del 12 de octubre
antes de la medianoche de Santiago con
`gcloud scheduler jobs run ops-seo-rank-capture --location us-east4 --project efeonce-group`
(la sesión del agente no tuvo permiso para dispararlo). Cierre: job `ENABLED` tras el deploy y una
corrida de las 07:00 observada en logs.

## Relacionado

`TASK-1303` · `docs/manual-de-uso/growth/operar-captura-rankings-seo.md`.
