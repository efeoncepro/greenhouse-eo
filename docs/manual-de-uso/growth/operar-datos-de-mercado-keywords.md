# Operar la captura de datos de mercado por keyword (volumen y dificultad)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-13 por Claude (TASK-1661)
> **Ultima actualizacion:** 2026-08-13 por Claude (TASK-1661)
> **Documentacion tecnica:** [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §7 y §8
> **Documentacion funcional:** [`modulo-seo-search-visibility-360.md`](../../documentation/growth/modulo-seo-search-visibility-360.md)

## Para que sirve

Trae desde DataForSEO el **volumen de busqueda** y la **dificultad** de las keywords que un cliente
tiene en seguimiento, y las persiste con su fecha de captura. Es lo que permite contestar *"¿vale la
pena?"* y *"¿cuanto cuesta?"* para una busqueda donde el cliente todavia **no** aparece — el caso en
que Search Console no entrega nada.

🔴 **Esta corrida gasta dinero real.** No es como el resto del modulo SEO, donde el flag habilita
lecturas ya presupuestadas: aca cada fila devuelta se le paga al proveedor.

## Antes de empezar

| Requisito | Como se verifica |
|---|---|
| La organizacion tiene el modulo SEO asignado (`seo_v2` vigente) | `docs/manual-de-uso/growth/asignar-modulo-seo-organizacion.md` |
| El target tiene keywords en seguimiento | Si el set esta vacio, la corrida reporta `no_keywords` y no gasta |
| `GROWTH_SEO_ENABLED=true` en el ops-worker | Es el flag padre; sin el, esta captura no corre |
| Autorizacion para gastar saldo DataForSEO | Es una decision del operador, no del agente |

## Los dos frenos (y por que son dos)

La captura esta detenida por **dos condiciones independientes**, a proposito:

1. **El flag** `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED`, que nace en `false`.
2. **El Cloud Scheduler** `ops-seo-keyword-market-data`, que nace **pausado**.

Soltar uno solo no gasta: con el scheduler activo y el flag apagado la corrida devuelve `disabled`;
con el flag prendido y el scheduler pausado nadie la dispara. Hacen falta los dos.

⚠️ **El flag vive SOLO en el ops-worker** (`services/ops-worker/deploy.sh`), porque la captura es
asincrona. Declararlo en Vercel no hace nada. Y como los `--set-env-vars` del deploy son
destructivos, aplicarlo unicamente en vivo con `gcloud run services update` lo borra en el proximo
deploy, en silencio: **hay que dejarlo escrito en `deploy.sh`**.

## Paso a paso

### 1. Correr el dry-run primero (obligatorio)

Nunca se gasta antes de ver el numero. El dry-run consulta el set, descuenta lo que ya esta fresco y
reporta la formula, sin llamar al proveedor.

```bash
curl -X POST "$OPS_WORKER_URL/seo/keyword-market-data/capture-batch" -H 'Content-Type: application/json' -d '{"dryRun": true}'
```

Devuelve, por target: keywords en seguimiento, cuantas se consultarian de verdad, cuantas llamadas y
el costo estimado. Si `blocked` es mayor que cero, el gate de presupuesto no autorizaria la corrida.

### 2. Prender el flag

En `services/ops-worker/deploy.sh`, `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED` a `true`, y desplegar.
Para efecto inmediato sin esperar el deploy, aplicar ademas `--update-env-vars` — pero **sin omitir
el cambio en `deploy.sh`**, o se pierde solo.

### 3. Despausar el scheduler

En el mismo `deploy.sh`, el quinto argumento de `upsert_scheduler_job` para
`ops-seo-keyword-market-data` pasa de `"true"` a `"false"`. El estado de pausa **se re-aplica en cada
deploy**: despausarlo a mano desde la consola se revierte solo en el siguiente.

### 4. Verificar que el gasto quedo atribuido

```sql
SELECT organization_id, spend_date, call_count, provider_cost_usd
  FROM greenhouse_growth.seo_provider_spend_daily
 WHERE family = 'labs'
 ORDER BY spend_date DESC;
```

El costo tiene que aparecer contra la organizacion que lo pago. Si la corrida gasto y aca no hay
nada, **algo esta mal**: significa que el runtime llamo al proveedor sin el registrador de gasto.

## Que significan los estados

| Estado por target | Significa |
|---|---|
| `captured` | Se trajeron datos nuevos |
| `skipped` | No habia nada que comprar: todo fresco, o el target no tiene keywords |
| `blocked` | El gate de entitlement, cuota o presupuesto no autorizo la corrida |
| `failed` | El proveedor fallo. **No** se escribio ninguna fila |

| Estado por keyword | Significa |
|---|---|
| `captured` | El proveedor tiene el dato y quedo guardado |
| `already_fresh` | Ya se consulto dentro del ciclo mensual vigente: **no se volvio a pagar** |
| `no_market_data` | Se pregunto y el proveedor **no tiene** esa keyword. Queda registrado con su fecha |
| `budget_blocked` | Se acabo el presupuesto a mitad de corrida |
| `provider_error` | Fallo la llamada. No se invento ningun numero |

## Que NO hacer

- **No poner el cron mas seguido que mensual.** El proveedor refresca una vez al mes siguiendo el
  ciclo de Google Ads. Un cron diario paga treinta veces por el mismo numero.
- **No mover el cron al dia 1.** A mitad de mes el proveedor ya publico el ciclo anterior; el dia 1
  se trae el ciclo viejo al mismo precio.
- **No leer `competition` como dificultad.** Es competencia **paga** (Google Ads). La dificultad
  organica es `keyword_difficulty`.
- **No mostrar `keyword_difficulty` a un cliente en mercados es-LATAM.** Es una metrica pura de
  backlinks con un piso duro: si las URLs del top-10 tienen pocos backlinks propios (lo normal en
  SERPs de LATAM), colapsa a 0 exacto aunque la keyword tenga 135.000 busquedas/mes. Un 0 se lee
  como "trivialmente facil" y es falso. Detalle y formula verificada:
  `.claude/skills/dataforseo-operator/references/02-labs.md` §7.
- **No mostrar un volumen sin su fecha**, ni promediarlo con datos de Search Console. Son dos lentes
  distintas: una es medida, la otra estimada.
- **No rellenar con `0` una celda vacia.** Vacio significa "no lo consultamos" o "el proveedor no lo
  tiene"; `0` afirmaria que nadie busca eso.

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| La corrida devuelve `disabled` | Falta uno de los dos flags, o se prendio solo en Vercel | Verificar `GROWTH_SEO_ENABLED` y `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED` **en el ops-worker** |
| Todo sale `provider_error` con cero llamadas | El runtime no tiene credenciales de DataForSEO | Revisar `DATAFORSEO_API_LOGIN` y `DATAFORSEO_API_PASSWORD_SECRET_REF` en ese runtime |
| La corrida gasta pero el ledger queda en cero | El entrypoint no importa el registrador de gasto | Debe existir `import '@/lib/growth/seo/register-provider-spend'` en el entrypoint del runtime |
| Una corrida repetida vuelve a cobrar | El pre-check de frescura no encuentra las filas | Verificar que las keywords sin dato tambien esten registradas: una keyword que el proveedor no tiene igual escribe fila, justamente para no re-comprarse |
| La señal de frescura queda en `warning` | Cobertura parcial, o la captura nunca corrio | Con el flag apagado es lo esperado. Con el flag prendido, revisar el scheduler y el gate de costo |

## Rollback

Poner `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED=false` en `deploy.sh` y desplegar: deja de gastar de
inmediato. Los datos ya capturados **quedan** — la tabla es append-only y borrar una captura
destruiria la evidencia de un gasto ya incurrido.

## Referencias tecnicas

- Command y reader: `src/lib/growth/seo/keyword-market-data.ts`
- Batch del worker: `src/lib/growth/seo/keyword-market-data-batch.ts`
- Handler: `services/ops-worker/server.ts` → `POST /seo/keyword-market-data/capture-batch`
- Señal: `src/lib/reliability/queries/seo-market-data-freshness.ts`
- Verificacion contra PG real: `scripts/growth/_sanity-task-1661-market-data.ts`
