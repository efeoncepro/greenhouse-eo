# Efeonce Globe — El ciclo de vida de una corrida

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-03 por Claude
> **Ultima actualizacion:** 2026-08-03 por Claude
> **Documentacion tecnica:** [`TASK-1469` — Governed Run Lifecycle, Submission Fence and Provider Completion](../../tasks/in-progress/TASK-1469-globe-governed-run-lifecycle-submission-fence.md) · [`ISSUE-135` — la outbox reintenta infinito y en silencio](../../issues/open/ISSUE-135-globe-governed-run-outbox-infinite-silent-retry.md) · [`ISSUE-127` — códigos genéricos esconden causas accionables](../../issues/open/ISSUE-127-globe-generic-error-codes-hide-actionable-causes.md) · [Persistencia durable de Globe](../../architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md)

Cuando alguien pide una pieza en Globe, esa pieza no se produce en el momento en que se aprieta el
botón. Se produce a lo largo de **minutos**, en pasos que sobreviven a reinicios, a que el navegador
se cierre y a que el proveedor tarde. Ese recorrido —de "lo pedí" a "acá está" o "no se pudo"— es lo
que llamamos el **ciclo de vida de una corrida**.

Este documento explica cómo funciona ese ciclo, y lo hace contando el defecto que lo obligó a
cambiar: **el 2026-08-03 un cliente pagó una imagen y no la recibió.**

## El caso que explica todo el sistema

Una generación de imagen fue **aceptada por el proveedor** a las 11:17 y **cobrada** — el saldo del
espacio de trabajo bajó de 748 a 738 créditos. La imagen existía del otro lado. Pero el paso final,
el que la registra y la publica, falló. El sistema lo reintentó tres veces, se dio por vencido, y la
pieza quedó diciendo **"generando"** en la pantalla. Para siempre.

Dos cosas hay que subrayar, porque son las que hacen que este caso valga como enseñanza:

- **El cliente pagó y no recibió.** No es un error de forma; es la falla más cara que este sistema
  puede cometer.
- **Ninguno de los cuatro componentes involucrados estaba roto.** Cada uno hacía exactamente lo que
  se le pidió. El defecto vivía en la **cadena**, no en los eslabones.

> Detalle técnico: evidencia de producción registrada en los commits `bbbc9c1` y `deffbd4` del repo
> `efeonce-globe` (2026-08-03). El defecto encadena tres incidentes ya abiertos:
> [`ISSUE-127`](../../issues/open/ISSUE-127-globe-generic-error-codes-hide-actionable-causes.md) (el
> genérico que borra la causa) e
> [`ISSUE-135`](../../issues/open/ISSUE-135-globe-governed-run-outbox-infinite-silent-retry.md) (el
> tope de reintentos que se puso encima de ese genérico).

## La cadena de cuatro eslabones

| # | Qué hacía | Por qué parecía correcto |
|---|---|---|
| 1 | El paso final expresaba una **espera** como si fuera un error | Es la forma normal de interrumpir un trabajo que todavía no puede terminar |
| 2 | El limpiador de errores no reconocía ese nombre y lo reemplazaba por uno **genérico** | Existe para no filtrar contraseñas, saldos ni texto crudo del proveedor: sanitiza bien |
| 3 | La política de reintentos no podía clasificar algo que **había perdido su nombre**, así que lo trató como "no clasificado": tope de 3 intentos | Un tope bajo para lo desconocido es prudente — es la respuesta correcta a no saber |
| 4 | La pausa entre intentos crecía exponencialmente (hasta 5 minutos), igual para errores que para esperas | El crecimiento existe para no golpear a un sistema caído |

Leídos en fila, se ve el daño: **el paso 1 dijo "espera", el paso 2 borró esa palabra, el paso 3 leyó
"no sé qué pasó" y aplicó el tope más corto que tenía, y el paso 4 hizo que esos tres intentos se
consumieran despacio.** El día anterior ese mismo paso, con ese mismo error, había necesitado **doce**
intentos y había terminado bien. O sea: el tope de 3 no protegía de nada. Cortaba trabajo sano a
mitad de camino.

> Detalle técnico: el paso final es `#registerGeneratedOutputs` en
> `packages/domain/src/model-lab-run-finalizer.ts` (repo `efeonce-globe`), que lanza
> `generated_asset_governance_pending`. El limpiador es `finalizationFailureCode` y su lista
> `SAFE_FINALIZATION_CODES`, en `packages/domain/src/governed-run-lifecycle.ts`. La política vive en
> `packages/domain/src/governed-run-failure-policy.ts`.

## Qué estaba esperando, en realidad

**Asset Governance.** Antes de que una pieza generada pueda mostrarse, descargarse o entregarse, pasa
por cuatro controles: inspección del archivo, escaneo de malware, verificación de procedencia C2PA y
reconciliación de derechos. Hasta que esos cuatro terminan, la pieza existe pero **todavía no es
elegible**.

El paso final de la corrida consulta ese estado. Si Governance no terminó, no hay nada que hacer
salvo **volver a mirar**. Eso no es un fallo: es una espera — exactamente igual que esperar a que el
proveedor devuelva su resultado.

> Detalle técnico: las cuatro etapas son `inspecting`, `malware_scan`, `c2pa_verify` y
> `rights_reconcile` (`packages/contracts/src/asset-governance.ts`, repo `efeonce-globe`). Ver también
> [Asset Governance Worker](../../architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md).

## Las cuatro clases de fallo

La decisión de cuántas veces vale la pena reintentar **no se toma con un número único**. Un número
único siempre se equivoca en una de las dos direcciones: o mata corridas que se iban a recuperar, o
mantiene vivas corridas que jamás iban a completar. Por eso se decide por **clase**.

| Clase | Qué significa | Cuántos intentos | Ejemplo |
|---|---|---|---|
| `terminal` | El próximo intento fallaría idéntico | **1** — no se reintenta ni una vez | Falta la autoridad de derechos; el insumo no resuelve; el pedido no calza con la ruta |
| `unknown` | No supimos clasificarlo | **3** antes del gasto · **25** después | Cualquier error nuevo que nadie declaró |
| `transient` | Se recupera solo | **25** (con las pausas crecientes, unas 2 horas) | Un 5xx del proveedor, el circuito abierto, una escritura que no pegó |
| `waiting` | El otro lado está **trabajando**, no roto | **240** | Esperando el resultado del proveedor · esperando a Asset Governance |

El criterio de admisión a `terminal` es concreto y se puede aplicar sin discutir: **si dos intentos
separados por una hora dan el mismo resultado sin que nadie toque nada, es `terminal`.** Un error que
depende del estado del proveedor no lo es, aunque parezca definitivo.

> Detalle técnico: `FAILURE_ATTEMPT_CAPS`, `TERMINAL_CODES`, `TRANSIENT_CODES` y `WAITING_CODES` en
> `packages/domain/src/governed-run-failure-policy.ts`. La clasificación se hace sobre la **raíz** del
> código, antes del primer `:` — un código puede llevar sufijo de diagnóstico
> (`run_finalization_failed:typeerror`) y la política sigue siendo la de la raíz.

## Los cinco arreglos

### 1. El nombre de la espera sobrevive al limpiador

`generated_asset_governance_pending` entró a la lista de códigos que el limpiador conserva tal cual.
Antes salía de ahí convertido en un genérico y **la causa se perdía**: dos fallos de origen
completamente distinto quedaban indistinguibles.

### 2. Se clasifica como espera, no como error

Con su nombre preservado, la política puede reconocerla y ponerla junto a la otra espera del ciclo.
Las dos son simétricas: una espera al proveedor, la otra a Governance. Ninguna de las dos es un
fallo.

### 3. La fase entra en la decisión

Este es el arreglo con más contenido de negocio, y la asimetría que lo justifica es directa:

- **Antes del gasto** (el proveedor todavía no aceptó): abandonar devuelve el crédito y no se pierde
  nada.
- **Después del gasto** (el proveedor ya aceptó y cobró): abandonar significa que **el cliente pagó y
  no recibió**.

Dos errores que cuestan tan distinto no pueden compartir tope. Después del gasto, lo que no supimos
clasificar recibe el trato de lo recuperable — porque equivocarse hacia el lado de insistir cuesta
tiempo, y equivocarse hacia el lado de rendirse cuesta una pieza pagada.

**Lo genuinamente determinista sigue muriendo en su primer intento, también después del gasto.** Una
autoridad de derechos ausente no aparece por insistir: ahí abandonar es lo correcto, y la fase no lo
cambia.

### 4. El ritmo depende de la clase

La pausa creciente existe para **no martillar a un sistema caído**. Asset Governance no está caído:
está trabajando, y va a terminar. Aplicarle pausas crecientes sólo agrega latencia **después** de que
el trabajo ya terminó — en el intento número diez, el techo de cinco minutos deja una pieza lista y
sin publicar todo ese rato.

Ahora una **espera** vuelve a mirar pronto, con cadencia fija de **10 segundos**; un **error** conserva
la pausa creciente, que es donde sirve. El piso real de latencia lo pone el worker, que corre cada minuto; lo
que la cadencia garantiza es que el trabajo esté **elegible en el próximo ciclo** en vez de dormido
cinco minutos.

### 5. Una corrida terminal cierra su experimento

`governed_runs` y `experiments` son **dos agregados distintos** y sus estados divergían: al agotar los
intentos, el almacén marcaba la corrida como fallida y **nadie tocaba el experimento**, que quedaba
"corriendo" para siempre. Como la pantalla lee el experimento, la pieza decía "generando"
eternamente.

Esto es transversal: el mismo paso final atiende imagen, video y audio, así que el hueco afectaba a
las tres.

Tres decisiones de diseño que vale la pena nombrar:

- **El cierre del agregado visible es obligatorio, no opcional.** Quien no lo implemente rompe la
  compilación — y en la práctica atrapó cuatro implementaciones incompletas, que es exactamente lo
  que tenía que pasar.
- **No toca créditos, a propósito.** La liquidación es autoridad de otro dueño y ya decidió; meter
  dinero ahí arriesgaría un segundo movimiento sobre una corrida ya liquidada. Una reserva que quede
  colgada la recoge el vencimiento de reservas.
- **Nombra la causa real.** En un abandono el proveedor **sí** entregó; reportarlo como "falló el
  proveedor" sería nombrar mal la causa, que es justamente el defecto de `ISSUE-127`.

> Detalle técnico: los cinco arreglos viven en `packages/domain/src/governed-run-failure-policy.ts`
> (clases, fases y topes), `packages/domain/src/governed-run-lifecycle.ts` (limpiador, cadencia de
> espera `WAITING_POLL_MS`, y el puerto obligatorio `abandon` de `RunFinalizerPort`) y
> `packages/domain/src/model-lab-run-finalizer.ts` (la implementación de `abandon`). Commits
> `bbbc9c1` y `deffbd4`.

## Cómo se sabe si el ciclo está sano

Dos señales, que el worker emite en cada tanda de trabajo. En estado normal ambas valen **0**.

| Señal | Qué cuenta | Cómo leerla |
|---|---|---|
| `outboxDeadLetter` | Trabajo que **ya murió**: agotó sus intentos y no va a llegar | Cada uno es una promesa incumplida que alguien tiene que mirar |
| `outboxRetryStorm` | Trabajo que **todavía insiste** por encima del umbral (10 intentos), sin cerrar aún | Es la alerta temprana: llega antes de que el tope actúe |

Las dos existen porque el tope de reintentos **evita el daño pero no avisa**. Una corrida llegó a 705
intentos en tres días sin que nadie se enterara, porque el contador vivía en la base de datos y
ningún consumidor lo leía.

⚠️ **Lo que prueba que un `outboxDeadLetter` no es tuyo es la serie temporal, no el valor puntual.**
Un `1` sin su historia no distingue "venía de antes" de "lo acabo de causar".

> Detalle técnico: `readOutboxHealth` en
> `packages/database/src/stores/governed-run-store.ts` (ventana de 24 h sobre `updated_at`, a propósito:
> una señal que nunca se apaga es una señal que el equipo aprende a ignorar) y el payload
> `globe_worker_completed` de `apps/studio-web/src/worker-main.ts`. Umbral `RETRY_STORM_THRESHOLD`. El
> runbook para leerlas está en
> [Operar el ciclo de vida de corridas de Globe](../../manual-de-uso/creative-studio/operar-ciclo-de-vida-corridas-globe.md).

## Qué no resuelve todavía

- **El tope de espera no es infinito, y eso es deliberado.** 240 intentos siguen siendo la red que
  puso `ISSUE-135`. El rescate real de una corrida colgada es la reconciliación, no el tope.
- **`ISSUE-127` sigue abierto** en su última fila (el código de autenticación del modo API). La
  lección que dejó —que acordarse de clasificar no funciona, y por eso hay un test que rompe el
  build— ya está aplicada en el vocabulario del compilador de rutas.
- **`TASK-1469` sigue en curso.** Lo que queda es terminalizar los reconciles de corridas ya
  terminales y demostrar que una entrega duplicada o tardía converge sin segundo cobro.
</content>
</invoke>
