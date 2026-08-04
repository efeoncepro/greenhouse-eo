# Globe Producer — triage de alertas de workers y cola V1

> **Estado:** operativo internal-only · **Fecha:** 2026-07-23 · **Owner:** Globe Platform/Ops

## Alcance

Este runbook cubre alertas `globe_producer_worker_failures`, edad de cola del Producer, fallas del Job de Asset
Governance y las **tres alertas de salud del ciclo de corridas** vivas desde el 2026-08-04. Una alerta confirma
una señal, no la causa: primero correlacionar ejecución, run/outbox y logs antes de reintentar o modificar estado.

## ⚠️ Antes de triagear: ~8 minutos NO son una cola stale

La latencia del camino en frío es **cadence-bound, no size-bound**: Asset Governance avanza **una etapa por tick
de su cron**, así que el reloj lo pone el scheduler y no el peso del archivo. Con el cron cada minuto una corrida
sana tarda **~7,9 min** (con `*/5` tardaba ~20-25). Que imagen y video midan casi lo mismo es la prueba.

🔴 **Un canary que aborta por debajo de ese presupuesto reporta su propia impaciencia, no un defecto.** Ocurrió:
una prueba automática abortó sobre una corrida perfecta que completó sola. Antes de tocar nada, mide el estado.

## Las tres señales del ciclo de corridas

| Alerta | Severidad | Qué significa | Primera acción |
|---|---|---|---|
| `outbox terminal attempts` | ERROR, sin espera | Intentos que **ya murieron**: trabajo pedido que no va a llegar | Mirar la **serie**, no el valor: distingue preexistente de recién causado |
| `outbox retry storm` | WARNING, con ventana | Intentos que **insisten** por encima del umbral, sin cerrar | Alerta temprana; un `waiting` alto puede ser sano por contrato |
| `run aggregate divergence` | ERROR | Un agregado que depende de una corrida terminal **no convergió** | Se mide **después** del barrido: >0 significa que el barrido no pudo cerrarlo |

🔴 **La señal terminal cuenta INTENTOS DISTINTOS, no filas de outbox.** Se llamaba `outboxDeadLetter` y contaba
filas —una por fase—, así que decía **3 para UN solo intento**. Toda lectura previa al 2026-08-04 que cite ese
número está inflada.

⚠️ **La cola stale de reconciles ya no es residuo esperado**: un barrido previo a cada tanda la cierra, y la
divergencia medida fue **0**. Si aparece, es defecto nuevo.

## Al crear o editar una alerta

**El aligner es función del TIPO de métrica, no del gusto de la alerta.** `ALIGN_COUNT` sólo vale sobre
DELTA/INT64 (métrica que cuenta entradas de log); una que **extrae un valor** es DELTA/DISTRIBUTION y necesita
`ALIGN_PERCENTILE_99`. Copiarlo de la alerta hermana equivocada **falla en el apply con 400**, no antes.

Y un **404 de la métrica recién creada no es defecto**: es propagación de Cloud Monitoring, hasta 10 minutos.


⚠️ **Antes de concluir por una edad: las filas viejas de la cola tienen el reloj sucio.** De 131 filas terminadas
medidas en producción, **23 eran contradictorias** (la peor decía haber terminado 9,7 horas antes de estar
disponible). Desde el 2026-08-04 se sellan con el reloj real y las nuevas dan **0**. Una latencia calculada sobre
filas anteriores a ese arreglo **no es evidencia**.

**Conexión a la base de Globe** (para correlacionar por readback):

```bash
cloud-sql-proxy "efeonce-globe:southamerica-west1:globe-pg" --port 15433 --auto-iam-authn
psql "host=127.0.0.1 port=15433 dbname=globe user=<tu email> sslmode=disable"
-- y después, obligatorio:  set search_path to globe;
```

## Primeros cinco minutos

1. Confirmar proyecto `efeonce-globe`, región `southamerica-west1`, policy/condition y hora exacta del incidente.
2. Identificar servicio o Job, revisión/digest y execution name. No copiar secretos, grants ni cuerpos upstream.
3. Buscar el evento estructurado por ventana:
   - Producer: `globe_worker_failed`, `globe_worker_completed`, `queueOldestAgeSeconds`.
   - Governance: `asset_governance_batch_completed`, `failed`, `retried`, `stale`, versión de motores/firmas.
4. Correlacionar con Postgres/readers: lifecycle del run, attempt terminal, outbox reclamable y última proyección.
5. Clasificar:
   - **evento aislado recuperado:** ejecución siguiente verde, sin cola reclamable vieja;
   - **cola stale/no reclamable:** run terminal pero outbox `reconcile` sigue `pending`;
   - **incidente persistente:** nuevas ejecuciones fallan o trabajo reclamable no avanza.

## Estado verificado del 2026-07-23

- La policy de failure dispara con un solo `globe_worker_failed`, threshold `>0` y duración cero.
- Las policies vivas declaran failure=`ERROR` y queue age=`WARNING`.
- Se terminalizaron mediante reconciler gobernado seis residuos `reconcile` —los cinco originales más uno
  observado durante el diagnóstico— y queue age quedó en `0` contando sólo trabajo reclamable. No se usó SQL.
- El source pendiente de desplegar emite `globe_worker_failed` como JSON estructurado con
  `severity=ERROR`, `classification`, `safeCode` allowlisted y referencias saneadas opcionales. Nunca serializa
  raw error, URL, token ni secreto. Hasta ese deploy, el evento live anterior conserva payload plano.
- No regenerar outputs ni reiniciar a ciegas. Ante una nueva cola stale, usar el command/reconciler versionado;
  **nunca** `UPDATE` manual.

## Asset Governance / C2PA

- `No claim found` de `c2patool` para MP4/MP3 válido sin manifest significa
  `unverified/c2pa_manifest_absent`; no es dependencia caída ni media unsupported.
- `unsupported` se reserva para formatos realmente no soportados. Errores desconocidos, binario ausente,
  firmas stale o policy no disponible continúan retryable/fail-closed.
- Antes de reencolar, verificar si existe una revisión terminal no proyectada. Aplicarla primero evita duplicar
  evidencia o perder derechos.

## Acciones seguras

- Pausar Scheduler si hay fallas persistentes, crecimiento de trabajo **reclamable** o riesgo de gasto repetido.
- Preservar jobs, outbox, objetos y evidencia; rollback mueve flags/digest, no borra datos.
- Reintentar sólo operations idempotentes con lease/revision vigente.
- Para commands de gasto con respuesta ambigua, leer estado antes de repetir.
- Verificar recuperación con una ejecución manual acotada y luego una ventana del Scheduler.

## Cierre

Registrar policy/condition, ventana UTC, revisión/digest, execution/correlation sanitizados, conteos
claimed/applied/failed/retried, edad reclamable antes/después y acción de rollback/backfill. La alerta sólo se
cierra cuando la causa dejó de producir señal; silenciarla o subir umbral no corrige una cola semanticamente stale.

## Severidad y escalamiento

`globe_worker_failed` aislado es `ERROR`; queue age es `WARNING`. Escalar a `CRITICAL` sólo ante indisponibilidad
sostenida, riesgo de gasto repetido, cruce de tenant, corrupción/pérdida de evidencia o incapacidad de rollback.
Asset Governance failure o firmas stale persistentes son `CRITICAL`. El payload de fallo sólo puede incluir
referencia saneada a ejecución/correlación, nunca raw error ni secreto.
