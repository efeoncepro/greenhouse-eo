# Manual — Operar la serie diaria de Search Console

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 1.0
> **Creado:** 2026-08-05 por Claude (TASK-1302)
> **Última actualización:** 2026-08-05 por Claude (TASK-1302)
> **Módulo:** Growth / SEO (Search Visibility 360)
> **Ruta en portal:** sin UI todavía — la operación es por línea de comandos y logs (las pantallas llegan con TASK-1306 y TASK-1308)
> **Documentación relacionada:** [doc funcional del módulo SEO](../../documentation/growth/modulo-seo-search-visibility-360.md) · [Conexión a Search Console](../../documentation/growth/conexion-search-console.md) · [Conectar Search Console a una marca](conectar-search-console.md)

## Para qué sirve

Google Search Console solo conserva **16 meses** de historia. Desde el 2026-08-05, Greenhouse guarda todos los días su propia copia de esos datos (qué consulta trajo clics e impresiones y a qué página llegaron, por marca), para que la serie de tiempo sobreviva cuando Google la olvide. Sobre esa serie se calculan las **oportunidades de distancia corta** (keywords donde la marca ya aparece pero un poco más abajo de donde convierte).

Este manual te permite:

- verificar que la captura diaria corrió y que lo hizo bien;
- volver a materializar un día puntual cuando algo quedó incompleto;
- leer el resultado del batch sin abrir código;
- apagar la captura (rollback) sin que se te vuelva a prender sola.

**Lo que este manual no cubre:** conectar la propiedad de Search Console de una marca (eso es [conectar-search-console.md](conectar-search-console.md)) ni habilitar el módulo SEO a una organización (eso es [asignar-modulo-seo-organizacion.md](asignar-modulo-seo-organizacion.md)).

## Antes de empezar

- Necesitas `gcloud` autenticado contra el proyecto `efeonce-group`. Si no lo estás, corre **los dos** flujos: `gcloud auth login` y `gcloud auth application-default login`.
- Ubicación de todo lo de este manual: proyecto `efeonce-group`, región `us-east4`.
- Piezas involucradas (para que sepas dónde estás parado):

  | Pieza | Qué es |
  |---|---|
  | `ops-seo-gsc-snapshot` | El trabajo programado (Cloud Scheduler) que dispara la captura. Corre `0 9 * * *` en hora de Santiago. |
  | `ops-worker` | El servicio de fondo (Cloud Run) que hace el trabajo real. **La captura corre acá, no en el portal.** |
  | `GROWTH_SEO_ENABLED` | El interruptor general del módulo SEO. Lo lee el `ops-worker`, **no** el portal. Encendido desde el 2026-08-05. |
  | `seo_gsc_daily` | La tabla donde queda la serie, por organización y fecha de captura. |

- **La captura solo toca marcas con la conexión a Search Console activa.** Una marca sin conexión se salta; no es un error.
- **No consume presupuesto de proveedor.** Los datos de Search Console son gratis y salen de la propiedad del propio cliente. Las corridas que sí cuestan (rankings, site audit, backlinks) son otras tasks y pasan por el control de cupos.

## Paso a paso

### 1. Verificar que la captura diaria está programada y corrió

Primero, el estado del trabajo programado:

```bash
gcloud scheduler jobs describe ops-seo-gsc-snapshot \
  --project=efeonce-group --location=us-east4
```

Qué mirar en la respuesta:

- **`state`** debe decir `ENABLED`. Si dice `PAUSED`, la captura no está corriendo (ver "Cómo revertir").
- **`schedule`** debe ser `0 9 * * *` y **`timeZone`** `America/Santiago`.
- **`lastAttemptTime`** te dice cuándo disparó por última vez. Si es de hace más de un día, algo no está corriendo.
- **`status`** vacío (o sin código de error) significa que el último disparo se entregó bien.

Ojo: que el disparo se haya entregado bien **no** significa que la captura escribió filas. Para eso, el paso 3.

### 2. Forzar una corrida ahora (ventana normal)

Si necesitas que capture ya, sin esperar a las 9:00:

```bash
gcloud scheduler jobs run ops-seo-gsc-snapshot \
  --project=efeonce-group --location=us-east4
```

Esto ejecuta la **ventana móvil de 5 días** (lo mismo que corre a diario). Es seguro repetirlo: la captura es idempotente por fecha — re-correr el mismo día no duplica, **corrige**.

El comando vuelve enseguida; el trabajo real puede tardar. Espera un minuto y lee el resultado (paso 3).

### 3. Leer el resultado del batch

El resultado se lee en los logs del `ops-worker`:

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="ops-worker" AND textPayload:"snapshot-batch done"' \
  --project=efeonce-group --limit=3 --freshness=1h --format="value(textPayload)"
```

Vas a ver una línea como esta (los números son de ejemplo):

```
[ops-worker] /seo/gsc/snapshot-batch done — dates=2026-08-01,2026-08-02,2026-08-03,2026-08-04 orgs=1 materialized=3 degraded=1 failed=0 rows=26192 truncatedOrgs=0
```

Cómo leerla:

| Campo | Qué significa |
|---|---|
| `dates` | Los días que se capturaron en esta corrida (la ventana móvil). |
| `orgs` | Cuántas marcas con conexión activa se recorrieron. |
| `materialized` | Capturas que escribieron datos correctamente (se cuenta **por marca y por día**, no por marca). |
| `degraded` | Capturas que **no escribieron nada a propósito**, con motivo. No es una falla del sistema: es honestidad. Ver la tabla de motivos más abajo. |
| `failed` | Capturas que reventaron con un error inesperado. Cualquier número mayor a 0 amerita mirar Sentry. |
| `rows` | Filas escritas en total. Es la señal más directa de que la serie está creciendo. |
| `truncatedOrgs` | **La señal que más importa.** Ver abajo. |

⚠️ **`truncatedOrgs` mayor a 0 no se ignora.** Significa que ese día se capturó **incompleto** para alguna marca, y ese dato **no se puede recuperar** una vez que se cierra la ventana de Google. Además de aparecer en el log, se emite un aviso a Sentry. Si lo ves, re-materializa ese día de inmediato (paso 4) y revisa por qué el sitio devolvió tantas filas.

Si el módulo está apagado, la respuesta del batch dice `skipped: seo_module_disabled` y no toca ni la base ni Google.

### 4. Re-materializar un día puntual

Cuando un día quedó vacío, incompleto (`truncatedOrgs`) o simplemente quieres corregirlo, se puede pedir **un solo día** en vez de la ventana.

```bash
export OPS_WORKER_URL=$(gcloud run services describe ops-worker \
  --project=efeonce-group --region=us-east4 --format="value(status.url)")

export ID_TOKEN=$(gcloud auth print-identity-token)

curl -X POST "${OPS_WORKER_URL}/seo/gsc/snapshot-batch" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"captureDate": "2026-08-02"}'
```

Opciones que acepta el cuerpo del pedido:

| Opción | Para qué |
|---|---|
| `captureDate` (`"YYYY-MM-DD"`) | Fuerza **un único día**. Sin esta opción corre la ventana móvil normal. |
| `lookbackDays` (número) | Cambia el ancho de la ventana móvil. Por defecto 5; el máximo aceptado es 30. Útil para rellenar hacia atrás. |
| `maxOrgs` (número) | Limita cuántas marcas se recorren. Útil para probar con una sola antes de soltar el batch completo. |

Ejemplo de relleno hacia atrás de dos semanas:

```bash
curl -X POST "${OPS_WORKER_URL}/seo/gsc/snapshot-batch" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"lookbackDays": 14}'
```

Después de cualquiera de estos, vuelve al paso 3 para leer el resultado.

**Si el token te da 401/403** (a veces las credenciales de usuario no sirven para invocar el servicio), usa este camino alternativo: cambia temporalmente el cuerpo del mensaje del trabajo programado, dispara, y **devuélvelo a `{}`**.

```bash
# 1. Apuntar el trabajo a un día puntual
gcloud scheduler jobs update http ops-seo-gsc-snapshot \
  --project=efeonce-group --location=us-east4 \
  --message-body='{"captureDate": "2026-08-02"}'

# 2. Dispararlo
gcloud scheduler jobs run ops-seo-gsc-snapshot \
  --project=efeonce-group --location=us-east4

# 3. ⚠️ DEVOLVERLO — si no, el trabajo diario queda clavado en esa fecha para siempre
gcloud scheduler jobs update http ops-seo-gsc-snapshot \
  --project=efeonce-group --location=us-east4 \
  --message-body='{}'
```

El paso 3 no es opcional. Un trabajo que quedó con una fecha fija sigue "corriendo bien" todos los días mientras la serie deja de avanzar.

## Qué significan los estados y las señales

### Por qué la ventana es de 5 días y no "ayer"

Es la decisión menos obvia del sistema, y está medida en vivo, no supuesta:

- **Google no publica el día anterior.** Si se le pregunta por D-1, responde correctamente pero **sin datos**; recién D-2 trae información. Un trabajo que capturara solo "ayer" habría escrito un día vacío cada vez, para siempre, **reportando éxito**.
- **Google consolida sus métricas con unas 48 horas de retraso.** Los números de un día reciente cambian después. Volver a capturarlo **corrige** los valores.

La ventana móvil resuelve las dos cosas con el mismo mecanismo. Por eso **re-ejecutar siempre es seguro**: la escritura es idempotente por marca, fecha, consulta y página.

### Los tres resultados por captura

| Resultado | Qué significa | Qué hacer |
|---|---|---|
| `materialized` | Se escribieron datos de ese día para esa marca. | Nada. |
| `degraded` | **No se escribió nada, a propósito**, con motivo registrado. Un día sin datos y un día que falló nunca se ven iguales en la serie: no existen los ceros fantasma. | Depende del motivo (tabla siguiente). |
| `failed` | Error inesperado. Queda en Sentry con la marca y la fecha. | Revisar Sentry; re-materializar ese día después del fix. |

### Motivos de degradación

| Motivo | Qué significa | Qué hacer |
|---|---|---|
| `disabled` | El módulo SEO está apagado. | Encender `GROWTH_SEO_ENABLED` en el `ops-worker` si corresponde. |
| `not_connected` | La marca no tiene Search Console conectada. | Es esperado si esa marca no lo tiene contratado. Si debería tenerlo: [conectar-search-console.md](conectar-search-console.md). |
| `token_unhealthy` | El acceso a Google se revocó o expiró. | **Urgente:** mientras no se reconecte, esa marca **deja de acumular historia** y esos días no se recuperan. Reconectar desde el panel del cliente. |
| `query_failed` | La consulta a Google falló. | Suele ser transitorio; re-materializar el día (paso 4). Si se repite, escalar. |

### Aislamiento entre marcas

Si una marca falla, **las demás siguen capturando**. Es deliberado: la serie no se puede reconstruir después, así que un token revocado en un cliente nunca puede frenar la captura del resto.

## Cómo revertir (rollback)

Hay dos frenos. Elige según lo que quieras detener.

### Freno A — apagar el módulo (deja de capturar, no toca el programador)

Pon `GROWTH_SEO_ENABLED=false` en `services/ops-worker/deploy.sh` y vuelve a desplegar el `ops-worker`. El trabajo va a seguir disparando, pero el servicio responde `skipped: seo_module_disabled` sin tocar la base ni Google.

### Freno B — pausar el trabajo programado

```bash
gcloud scheduler jobs pause ops-seo-gsc-snapshot \
  --project=efeonce-group --location=us-east4
```

> ### ⚠️ El gotcha que muerde: pausarlo a mano **se revierte solo**
>
> El estado de pausa del trabajo se re-aplica **en cada despliegue** desde `services/ops-worker/deploy.sh`. Si lo pausas solo con `gcloud`, el próximo despliegue del `ops-worker` lo **vuelve a activar en silencio** — y nadie se entera, porque no falla nada.
>
> **Para que la pausa sobreviva tienes que hacer las dos cosas:**
>
> 1. pausarlo con `gcloud scheduler jobs pause ...` (efecto inmediato), **y**
> 2. poner el **5.º argumento** de la llamada a `upsert_scheduler_job "ops-seo-gsc-snapshot"` en `"true"` dentro de `services/ops-worker/deploy.sh` (para que el próximo despliegue no lo despierte).
>
> Es exactamente la misma trampa que aplicar una variable de entorno solo en vivo: funciona hasta el próximo despliegue, y después se deshace sin aviso.

Para volver a activarlo, el camino inverso: `gcloud scheduler jobs resume ...` **y** el 5.º argumento de vuelta en `"false"`.

## Qué no hacer

- **No pauses el trabajo solo con `gcloud`.** Sin tocar también `deploy.sh`, el próximo despliegue lo revive en silencio (ver el bloque de arriba).
- **No dejes el trabajo con una fecha fija en su cuerpo de mensaje.** Si lo apuntaste a un día puntual, devuélvelo a `{}`. Un trabajo clavado en una fecha "corre bien" todos los días mientras la serie deja de avanzar.
- **No prendas ni apagues el módulo desde Vercel.** `GROWTH_SEO_ENABLED` lo lee el `ops-worker`. Cambiarlo en el portal no tiene efecto sobre la captura.
- **No apliques cambios de variables solo con `gcloud run services update`.** El despliegue del `ops-worker` es destructivo con las variables: lo que no esté declarado en `deploy.sh` se borra en el siguiente despliegue.
- **No "arregles" un día vacío escribiendo ceros.** Un día sin datos y un día con fallo son estados distintos por diseño. Rellenarlos con ceros destruye la única señal honesta que tenemos.
- **No ignores `truncatedOrgs`.** Es el único caso donde el dato se pierde de forma irreversible si no actúas dentro de la ventana de Google.
- **No edites ni borres filas de la serie a mano.** La serie es historia: se corrige re-materializando el día, no editándolo.
- **No asumas que "el trabajo disparó" significa "se capturó".** El programador te dice que entregó el pedido; solo el log del `ops-worker` te dice que se escribió.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El trabajo dice `ENABLED` y dispara, pero `rows=0` siempre | Ninguna marca tiene la conexión activa, o el módulo está apagado | Revisa los motivos de degradación en el log: `not_connected` (conectar la marca) o `disabled` (encender el módulo en el `ops-worker`) |
| La captura anduvo por meses y de golpe una marca deja de aparecer | El acceso a Google se revocó (`token_unhealthy`) | Reconectar cuanto antes: los días no capturados no se recuperan pasada la ventana de Google |
| Volví a activar la captura y sigue sin correr | Se pausó a mano y el despliegue no la revivió porque `deploy.sh` la tiene en `"true"` | Poner el 5.º argumento en `"false"` y desplegar, además de `resume` |
| Pausé el trabajo y a los días estaba corriendo otra vez | El gotcha del despliegue: la pausa se re-aplica desde `deploy.sh` | Hacer las dos cosas (pausa + `"true"` en `deploy.sh`) |
| Un día aparece con muchísimas menos filas que sus vecinos | Google todavía no consolidó ese día, o la captura truncó | Espera a la siguiente ventana (se corrige sola), o re-materializa ese día; si el log marcó `truncatedOrgs`, hazlo ya |
| `failed` mayor a 0 en el resumen | Error inesperado en esa marca/día | Revisar Sentry (dominio `growth`), corregir, y re-materializar el día afectado |
| El `curl` al servicio da 401/403 | Las credenciales de usuario no sirven para invocar ese servicio | Usar el camino alternativo por el trabajo programado (paso 4) y acordarse de devolver el cuerpo a `{}` |
| El log no devuelve nada | La corrida es más vieja que la ventana consultada | Sube `--freshness` (por ejemplo `--freshness=2d`) |

## Referencias técnicas

- Doc funcional del módulo: [Modulo SEO — Search Visibility 360](../../documentation/growth/modulo-seo-search-visibility-360.md)
- Doc funcional de la conexión: [Conexion a Google Search Console](../../documentation/growth/conexion-search-console.md)
- Arquitectura: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)
- Código del materializador y del batch: [`src/lib/growth/seo/`](../../../src/lib/growth/seo/)
- Declaración del trabajo programado y del interruptor: [`services/ops-worker/deploy.sh`](../../../services/ops-worker/deploy.sh)
- Manuales vecinos: [Conectar Search Console a una marca](conectar-search-console.md) · [Asignar el modulo SEO a una organizacion](asignar-modulo-seo-organizacion.md)
