# ISSUE-143 — La migración del cutover `seo_v1 → seo_v2` colapsó expand y contract en un paso

> **Estado:** **resuelto y cerrado del todo (2026-08-09)** — incidente y cutover
> **Detectado:** 2026-08-08 (Claude, durante el rollout de TASK-1310)
> **Resuelto:** 2026-08-08 (caida restaurada + fix durable)
> **Cierre definitivo:** 2026-08-09 por `TASK-1677` — migración `20260809163352129` aplicada y verificada con canary
> **Ambiente:** Producción (`greenhouse.efeoncepro.com`) — Cloud SQL `greenhouse-pg-dev` es única y compartida
> **Severidad:** alta — módulo SEO inaccesible en producción durante ~25 minutos
> **Dominio:** Growth / SEO · entitlements per-org · evolución de schema
> **Relacionado:** `TASK-1310`, `EPIC-022`, `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §10.7

## Síntoma

Tras aplicar la migración de catálogo de TASK-1310, el canary del provider Greenhouse-SEO contra
producción devolvió:

```
✓ entitlement(Grupo Berel): {"hasModule":false,"tier":null,"audits":0,"budgetUsd":0}
✗ visibility-360:      greenhouse_seo_lane_404
✗ rank-evolution:      greenhouse_seo_lane_404
✗ site-audit-report:   greenhouse_seo_lane_404
✗ backlink-profile:    greenhouse_seo_lane_404
```

La misma llamada, dos horas antes, devolvía `domainQuadrant=riesgo keywords=50 aeo=44.5`.

## Causa raíz

La migración `20260808131441444_task-1310-seo-client-view-codes.sql` ejecuta, en un solo archivo:

1. **expand** — crea el módulo `seo_v2` con los viewCodes de cliente y le asigna las organizaciones;
2. **contract** — supersede los assignments `seo_v1` poniéndoles `effective_to = CURRENT_DATE`.

El paso 2 anula el propósito del paso 1. Todo el trabajo previo de expand/contract —el dual-read
`SEO_MODULE_KEYS_READ = ['seo_v2','seo_v1']` aplicado a los 5 consumidores, documentado en §10.7 de la
arquitectura, con su contenido fijado por test— existía **exactamente** para que hubiera un período
con ambas claves vigentes. La migración eliminó ese período en el mismo commit que lo creaba.

Vercel producción corre `main`, donde `SEO_MODULE_KEY = 'seo_v1'` sin dual-read. Con `seo_v1`
superseded, el resolver devolvió 0 filas → `hasModule=false` → los lanes ecosystem respondieron con el
404 anti-oracle.

**Lo que no falló, y por qué importa:** el `ops-worker` ya estaba desplegado en `0dac9d3cb` (el push
disparó su build), así que tenía el dual-read. Los tres batches que le pagan a DataForSEO —rank
capture, site audit collect, backlink capture— siguieron resolviendo entitlement. El daño fue de
lectura, no de gasto ni de datos.

## Por qué el diseño correcto no bastó

Esta es la lección con más recorrido: **§10.7 describía el patrón bien y el incidente ocurrió igual.**
El documento decía "el contract es un cambio posterior y deliberado", pero nada impedía escribirlo en
el mismo archivo que el expand, y nadie lo revisó contra esa frase. Un patrón que vive sólo en prosa
no gobierna: hay que hornearlo donde el código lo pueda romper.

Contribuyó una segunda causa, de método: verifiqué la migración con un `SELECT` sobre la base y la di
por buena. La base era la mitad del contrato; la otra mitad era qué versión de código la estaba
leyendo en cada uno de los cinco runtimes. El `SELECT` decía exactamente lo que el SQL prometía.

## Solución aplicada

1. **Restauración inmediata** — `effective_to = NULL` en los assignments `seo_v1` superseded,
   reabriendo la ventana. Verificado contra producción con el canary real: `hasModule=true`,
   `tier=contracted`, `domainQuadrant=riesgo keywords=50 aeo=44.5`, y los cuatro lanes verdes.
2. **Fix durable** — migración `20260808184512073_task-1310-reopen-seo-module-cutover-window.sql`,
   idempotente, que además hornea el invariante en un bloque `DO`: mientras la ventana esté abierta,
   ambas claves deben cubrir **exactamente** las mismas organizaciones; una ventana asimétrica aborta
   la migración con `RAISE EXCEPTION`. Su `Down` vuelve a cerrar la ventana, sin pérdida.
3. **Reglas duras** documentadas en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §10.7 (delta
   2026-08-08).

No hay doble conteo de cuota ni de presupuesto con ambas claves vigentes: el resolver hace
`ORDER BY created_at DESC LIMIT 1` sobre el `module_key = ANY(...)`, así que cada organización resuelve
a un único assignment — el más nuevo que su runtime sepa nombrar.

## Verificación

- Canary del provider contra `https://greenhouse.efeoncepro.com` — restaurado (arriba).
- Los dos ✗ que persisten (`keywords/track`, `keywords/untrack`) son **preexistentes y no relacionados**:
  esas rutas sólo existen en `develop`, no en `main`. El canary de `efeonce-mcp` es más nuevo que el
  código desplegado en producción.
- Migración de reapertura aplicada; sus dos guards pasaron.

## Pendiente

El **contract** sigue sin ejecutar, y así debía quedar hasta que `main` tuviera el dual-read desplegado
y el canary lo confirmara.

**Delta 2026-08-09 — la precondición se cumplió.** El release llevó a producción el dual-read y los
viewCodes del catálogo. Verificado runtime por runtime: `main` con `SEO_MODULE_KEYS_READ`, canary del
provider **100% verde** (con `track`/`untrack` devolviendo ya `400` en vez de `404`, o sea que esas
rutas existen), y el ops-worker en una revisión que es ancestro de `main`. El contract pasa a tener
dueño propio: **`TASK-1677`**, separada de `TASK-1310` porque es `backend-data` de bajo riesgo y no
debe quedar atada a un ciclo de diseño abierto.

**Delta 2026-08-09 (segundo) — el contract arrancó por el código; falta la mitad de datos.** Este
issue está **a mitad de camino**, no cerrado:

- ✅ **Hecho y en producción:** `SEO_MODULE_KEYS_READ` pasó de `['seo_v2','seo_v1']` a `['seo_v2']`
  (release `49f86c98cda6`, 2026-08-09, `TASK-1677` Slice 1). Lectura y escritura vuelven a ser la
  misma clave en los 5 consumidores. Precondición verificada contra PG **antes** de tocar el código:
  las dos organizaciones con SEO tienen ambas claves vigentes en `active`, así que dejar de leer
  `seo_v1` no le quitó el módulo a nadie.
- ⏳ **Falta:** la migración que supersede los 2 assignments `seo_v1` vigentes. Está **redactada y
  verificada, sin aplicar** (con bloque `DO` que aborta si alguna organización quedara sin
  cobertura); vive en el §Delta de ejecución de `TASK-1677`.
- **Por qué no viajó junto al código, y esto es la lección de este issue aplicada:** entre el código
  y los datos hay que **desplegar y verificar**. Y además el check `postgres_migrations` del preflight
  trata una migración commiteada y no aplicada como `pending` ⇒ error ⇒ release bloqueado, mientras
  que aplicarla antes del deploy es justo lo que el ordering prohíbe. **La migración no puede ir en
  el mismo release que el código.**
- **Riesgo vivo mientras dure el estado intermedio:** un assignment nuevo creado bajo `seo_v1` queda
  en la base y **no existe para el runtime** — `hasModule=false` y 404 anti-oracle, en silencio. Toda
  alta se escribe con `seo_v2`.

**Cerrado el 2026-08-09.** La migración `20260809163352129_task-1677-seo-module-cutover-contract`
superseded los 2 assignments `seo_v1` vigentes por `effective_to = CURRENT_DATE`, con su bloque `DO`
verificando que ambas organizaciones conservaran su `seo_v2` `active`. El canary del provider contra
producción quedó verde antes y después: la superficie de Grupo Berel abre con datos medidos. La fila
`seo_v1` sigue en `modules` como historia append-only.

Texto original del pendiente, conservado como registro: este issue se cerraba en el Slice 3 de
`TASK-1677`, después de aplicar la migración y volver a
pasar el canary del provider contra el host de producción — no antes, y no con un `SELECT`.

Follow-up declarado sin dueño: una señal de fiabilidad que vigile la simetría de la ventana en
runtime. Hoy el invariante sólo se verifica en el momento de migrar; una ventana que se desbalancee
después (por una revocación, por un assignment nuevo creado sólo en una clave) no tiene detector.
Con el código ya contraído, la forma vigente de ese hueco es más concreta: **nadie detecta un
assignment vivo bajo una clave que ningún runtime lee.**

## Reglas que salen de este incidente

- **NUNCA** una sola migración contiene el expand y el contract del mismo cutover.
- **NUNCA** superseder una clave que el código vigente todavía lee. `grep` en `src/` y `services/`
  antes de escribir el supersede.
- **NUNCA** dar por verificada una migración de cutover con un `SELECT`. Verificar con el consumidor
  real, contra el host real.
- **SIEMPRE** recordar que el repo tiene **cinco runtimes con despliegues independientes**. "Lo
  desplegué a develop" no es "lo desplegué".
