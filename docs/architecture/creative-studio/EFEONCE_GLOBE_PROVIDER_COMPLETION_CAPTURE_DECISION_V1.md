# ADR-021 — Captura de completitud por proveedor: tres mecanismos, un contrato

> **Estado:** Accepted — implementado y verificado en runtime (2026-08-04). Dueña: `TASK-1469`.
> **Repos:** decisión y doc en `greenhouse-eo`; implementación en `efeonce-globe`.
> **Relacionado:** `ISSUE-138` (los 13 huecos que motivaron esta decisión) · `ISSUE-127` · `ISSUE-135` ·
> SPEC-001 (API Contract Spine) · ADR-013 (resolución por ruta) · ADR-007 (Asset Governance).

## Contexto

Globe genera media llamando a proveedores externos. El submit y la completitud son **dos momentos
distintos**, y la pregunta que esta decisión responde es: **¿cómo se entera Globe de que un asset ya está
listo?**

Hasta el 2026-08-04 la respuesta vivía **solo en el código**. Ningún documento de arquitectura mencionaba
siquiera la palabra «webhook». Esa ausencia no fue neutra: una auditoría de los tres proveedores contra su
documentación oficial encontró **13 huecos**, tres de los cuales terminaban en un asset **generado, facturado
e irrecuperable** — y **ninguno producía un error visible**. Dos fallaban *exactamente en el momento del
éxito*, que es la peor forma de fallar.

Este ADR existe para que el contrato deje de ser tácito.

## Decisión

**Cada proveedor avisa distinto, y el sistema respeta esa diferencia en vez de forzar una abstracción común.**
Los tres mecanismos convergen en un único contrato interno de completitud (`NormalizedProviderCompletionV1`),
pero **cómo llega la señal es propiedad del proveedor, no una elección nuestra**.

| Proveedor | Mecanismo | Por qué ése |
|---|---|---|
| **Fal** | Webhook firmado **por request** + poll de respaldo | Acepta `?fal_webhook=<url>` en cada submit; el handle de correlación viaja en el path |
| **OpenAI** | **Polling** (que en su lane de imagen es un no-op durable) | `/v1/images/generations` es **síncrono**: los bytes vuelven en la misma respuesta HTTP. **OpenAI no emite eventos de webhook para imágenes** |
| **Vertex — Veo** | LRO: `predictLongRunning` → `fetchPredictOperation` | **Vertex no ofrece callback por request.** Su propia doc de long-running operations describe polling |
| **Vertex — Omni / imagen** | Unary síncrono | La respuesta trae el resultado |

### Consecuencia de producto que hay que no olvidar

**Que OpenAI y Vertex corran por `poll` NO es una omisión ni una deuda.** Es la única forma posible con sus
APIs. Un agente futuro que vea `completion_driver='poll'` y cero filas en `provider_completion_signals` está
mirando el comportamiento **correcto**, no un síntoma.

### El webhook acelera; nunca es la única vía

`completion_driver` es **metadato de identidad de la ruta**, no un interruptor que apague el reconcile. El
polling corre para ambos drivers. Un webhook perdido no puede dejar una corrida colgada — y por eso importa
que el poll **sepa cerrar un fallo**, que es exactamente lo que ISSUE-138 D6 encontró que no hacía.

## Invariantes

### I1 · El ack es rápido y no hace trabajo

El handler verifica, persiste la señal y responde **202**. No descarga, no calcula hashes, no liquida
créditos. Fal da **15 segundos** a la primera entrega; cualquier trabajo real dentro de ese tiempo convierte
una entrega válida en un reintento.

### I2 · El payload del webhook nunca es el resultado

El resultado se lee **siempre** del `response_url` persistido. Es literalmente la remediación que Fal prescribe
para su propio `payload_error` (un payload no serializable llega `null`), y la teníamos gratis por diseño.

### I3 · La firma se verifica sobre el cuerpo CRUDO

SHA-256 de los bytes, cuatro partes unidas por `\n` en orden `request-id → user-id → timestamp → digest`,
Ed25519 contra el JWKS. **Cualquier refactor que meta un `JSON.parse`/`stringify` en el camino rompe la
verificación.**

### I4 · Una firma válida no prueba que la entrega sea NUESTRA

🔴 **El JWKS de Fal es GLOBAL**: todos sus clientes firman con las mismas claves. Cualquier cliente de Fal
puede apuntar su `fal_webhook` a nuestra URL y producir una entrega **genuinamente firmada**.

No permite robar un asset —el resultado está atado al `providerOperationId` persistido— pero **sí matar runs
ajenos** con un `status:"ERROR"` firmado, porque el finalizador toma la rama de fallo sin pedir evidencia de
resultado. Por eso se compara el `x-fal-webhook-user-id` contra el nuestro.

### I5 · La reintentabilidad la declara el PROVEEDOR, no la inferimos

Fal publica **`X-Fal-Retryable`**. Respetar esa señal vale más que cualquier heurística nuestra sobre 4xx/5xx;
el status sólo decide cuando el header falta. Y el **400** de su endpoint de resultado significa «todavía no
completada», no error.

### I6 · El código que devolvemos gobierna si el proveedor reintenta

Un fallo **nuestro** (base de datos, dependencia) responde **503** para que reintente. Sólo un rechazo
**definitivo** —firma inválida, cuerpo sobredimensionado— responde 400. Responder 400 a un blip transitorio le
dice al proveedor «tu pedido está mal, no insistas» y **descarta la señal para siempre**.

### I7 · La identidad de ruta ejecutada es la aprobada

Los fallbacks de modelo de Fal están **activos por defecto** y pueden reenrutar a otro endpoint. Para un
consumidor cualquiera es una cortesía; para una plataforma gobernada rompe el invariante de ADR-013: el run se
aprobó, tarifó y atestó contra la tupla exacta. Se desactivan con `x-app-fal-disable-fallbacks`.

### I8 · 🔴 Las URLs de seguimiento de Fal NO son derivables — se declaran

Ésta es la regla que más veces se intentó romper, y la evidencia medida contra nuestra propia cuenta la
sostiene:

| endpoint de submit | base de seguimiento real |
|---|---|
| `bytedance/seedream/v5/pro/text-to-image` | `bytedance/seedream` (**descarta 3 segmentos**) |
| `bytedance/seedance-2.0/text-to-video` | `bytedance/seedance-2.0` (descarta 1) |
| `fal-ai/elevenlabs/tts/multilingual-v2` | `fal-ai/elevenlabs` (descarta 2) |
| y la doc de Fal muestra `fal-ai/flux/schnell` | **conservando los 3** |

**No hay regla de cantidad de segmentos**: hay un límite de «app id» que sólo Fal conoce. Derivarlo apuntaría
a leer el resultado de otro modelo.

El camino normal usa **exclusivamente** las URLs que Fal devuelve en el submit. Sólo para reponer la evidencia
tras un **lost-ack** (el submit llegó, nuestra respuesta se perdió) se usa una base **declarada por endpoint y
medida** contra `provider_response_url` real. Un endpoint sin entrada declarada **no se recupera y falla
nombrado** — correcto: mucho mejor que leer el resultado equivocado.

### I9 · La espera no es un fallo

Una operación en vuelo (`pending`), la espera del checkpoint del proveedor y la espera de Asset Governance son
**clase `waiting`**, con cadencia fija y tope alto. Heredar el backoff exponencial de error deja una pieza
lista y sin publicar; heredar el tope de `unknown` la mata a la tercera entrega **ya cobrada**.

### I10 · Un timeout del cliente no es un fallo del servidor

Ante un `execute` o un canary que expira: **leer el estado antes de decidir**. Verificado en vivo el
2026-08-04 — una corrida dio timeout de cliente a los 20 minutos y **completó sola en la entrega 21**.
Reintentar habría gastado de nuevo.


### I11 · La fila de la cola se sella con el reloj de PARED, no con el instante del dominio

`completed_at`/`available_at` de `governed_run_outbox` describen **la cola**, no el negocio. Cuando cada call
site de `finishLease` pasaba su instante de dominio —aceptación del proveedor, próxima acción, terminal—, **tres
de los siete pasaban instantes del FUTURO** y la fila quedaba diciendo que terminó antes de estar disponible.

Medido en producción: **23 de 131 filas `done`** con `completed_at < available_at`, peor caso **−34.965 s = 9,7
horas**. Con eso, cualquier señal de latencia de cola **miente sin fallar**: una edad negativa no «se ve rara»,
desaparece del conteo y con ella el trabajo que representaba.

`finishLease` recibe hoy el reloj **inyectado** —no `new Date()` disperso, para que un test pueda afirmar qué
reloj se usó— y es el único que sella. El instante de dominio no se pierde: tiene columna propia en los siete
caminos (`provider_accepted_at`, `next_action_at`, `terminal_at`, `cancellation_confirmed_at`, el JSON de
`completion`), y eso es lo que hizo el cambio barato.

**Reglas duras.** **NUNCA** le pases a `finishLease` un instante de negocio. **NUNCA** guardes un instante de
dominio en una columna de la cola: si hace falta, se agrega su propia columna. ⚠️ **Toda edad o latencia
calculada sobre filas anteriores al sello es sospechosa** y no sirve para cerrar un incidente.
## Convergencia terminal de los agregados del run

La captura de completitud tiene un corolario que se descubrió por el camino difícil: **cuando un run llega a
terminal, todo agregado que dependa de su estado converge o queda observable.**

Se declara así —y no como el arreglo de un caso— porque el mismo defecto apareció en **dos parejas de
agregados** y sólo una estaba declarada: `governed_run_outbox ↔ governed_runs` (reconciles pendientes de runs
terminales) y `experiments ↔ governed_runs` (experimento `running` eterno sobre una pieza ya cobrada). Arreglar
por pareja garantiza descubrir la tercera en producción.

`RUN_DEPENDENT_AGGREGATES` es un array enumerable con test de cobertura **en ambas direcciones**: un agregado
sin postura declarada rompe el build, y un `observable` sin señal que lo vigile se rechaza — porque declararlo
así es la forma elegante de no hacerse cargo.

| Agregado | Postura | Quién lo cierra |
|---|---|---|
| `governed_run_outbox` | converge | `supersedeNonReclaimableReconciles`, pre-batch |
| `experiments` | converge | `RunFinalizerPort.abandon` — camino terminal **y** barrido de recuperación |
| `credit_reservations` | observable | expiry de reservas, con su propia alerta de latencia |
| `asset_governance_jobs` | converge | lease y `max_attempts` propios del Job |

**El barrido hacia atrás reusa el MISMO `abandon`** del camino hacia adelante. Una lógica de cierre propia
serían dos definiciones de «converger» capaces de divergir entre sí — el bug class original, una capa más
arriba. Y sólo toma terminales recuperables: marcar `failed` un run `completed` sería mentir sobre una corrida
que sí entregó, así que ese caso **se cuenta y no converge**, y la diferencia queda en `divergentAggregates`.

## Latencia esperada, que no es un síntoma

⚠️ **Confundir la latencia normal con un cuelgue es el error de lectura más caro de este dominio.** Asset
Governance avanza **una etapa por tick de su cron**, así que su latencia es **cadence-bound, no size-bound**:
el trabajo real son ~60 segundos y el reloj lo pone el scheduler.

Con el cron en `*/5` eso daban **~20-25 minutos en frío**, y lo encontraron **dos caminos independientes el
mismo día**: el readback de `ISSUE-137` —que refutó la hipótesis de runs colgados— y el canary de generación
de `ISSUE-138`, que **abortaba a los 20 minutos sobre un sistema perfectamente sano**.

`ISSUE-137` lo bajó a `*/1` (`efeonce-globe@d78ce01`) y la medición post-arreglo lo confirma: video completo en
**7,9 min** con governance en **3 min**, imagen en 7,9/3 — que las dos modalidades coincidan es justamente la
prueba de que el cuello era la cadencia y no el tamaño.

**La regla que sobrevive al número:** publica el presupuesto de latencia de todo camino que un canary vigile,
y revísalo cuando cambie una cadencia. Un canary calibrado contra una latencia vieja falla tarde o en falso,
y las dos cosas erosionan la confianza en la señal.

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| **Forzar webhook en los tres proveedores** | OpenAI no emite eventos de imagen y Vertex no ofrece callback por request. Sería inventar una abstracción que el proveedor no sostiene |
| **Confiar sólo en el webhook** | Una entrega puede perderse. El poll es la red de recuperación y por eso debe saber cerrar un fallo |
| **Derivar las URLs de seguimiento desde el slug** | Medido: no es derivable. Apuntaría a otro modelo |
| **Usar el payload del webhook como resultado** | Fal lo entrega `null` ante `payload_error`, y su propia doc dice que en ese caso se use la queue |
| **Ampliar la ventana de replay «por las dudas»** | Debilitaría una protección real para cubrir un riesgo hipotético. La ventana de ±300 s es la que Fal prescribe, y el control de fondo es el dedupe durable por `(provider, delivery_id)` |
| **Adivinar el user id de Fal desde su username** | Medido: es un identificador estilo Auth0 (`github|…`) que no se parece al username. Adivinarlo habría rechazado **todas** las entregas legítimas |
| **Un flag para `storageUri` sin canary** | Sería código muerto que nadie puede activar — el mismo defecto que este trabajo vino a limpiar |

## Lo que este ADR NO decide

- **`storageUri` en Veo** (el video aterrizaría en un bucket nuestro en vez de volver inline). Elimina la
  ventana de retención y el costo de memoria del presupuesto derivado, pero **cambia lo que le enviamos al
  proveedor** y exige un canary con gasto real. Queda como `ISSUE-138` D12, con dueño.
- **El carril de webhook de OpenAI sobre `/v1/responses` en background.** La ruta ya acepta su URL estática,
  pero ninguna ruta de producción usa esa lane.
- **La retención de una Operation de Vertex con resultado inline.** No está documentada por Google (buscado el
  2026-08-04).

## Verificación

Generación real sobre el runtime desplegado (2026-08-04): run `completed`, experimento `candidate_ready`,
Asset Governance `eligible`, pieza publicada. La clase `waiting` sostuvo **21 entregas** sin matar la corrida —
con el tope anterior habría muerto en la tercera, con el asset ya cobrado.

## Reglas duras

- **NUNCA** hacer trabajo real dentro del handler del webhook: verificar, persistir, 202.
- **NUNCA** usar el payload del webhook como resultado; el resultado sale del `response_url` persistido.
- **NUNCA** meter un `JSON.parse`/`stringify` entre el cuerpo recibido y el cálculo del digest.
- **NUNCA** tratar una firma válida como prueba de propiedad: el JWKS de Fal es global.
- **NUNCA** inferir la reintentabilidad del status HTTP cuando el proveedor la declara.
- **NUNCA** responder 400 a un fallo nuestro: eso le dice al proveedor que no reintente.
- **NUNCA** reconstruir una URL de seguimiento de Fal desde el slug; se declara por endpoint desde evidencia
  medida, o no se recupera.
- **NUNCA** dejar que una espera herede el backoff o el tope de un error.
- **NUNCA** interpretar un timeout de cliente como fallo del servidor sin leer el estado primero.
- **SIEMPRE** que se agregue un endpoint de Fal, mirar su `provider_response_url` real antes de declarar su
  base de seguimiento. Nunca por analogía con otro endpoint.
