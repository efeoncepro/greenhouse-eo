# Flota de modelos del Producer — disponibilidad por workspace

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-07-25 por Claude (TASK-1554)
> **Ultima actualizacion:** 2026-08-27 por Codex (TASK-1781; investigación, sin rollout)
> **Documentacion tecnica:** [`GLOBE_MODEL_FLEET_STATUS.md`](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md) · [`EFEONCE_GLOBE_CREATIVE_STUDIO_ARCHITECTURE_V1.md`](../../architecture/EFEONCE_GLOBE_CREATIVE_STUDIO_ARCHITECTURE_V1.md)

## Qué resuelve

El Producer de Globe puede correr muchos modelos distintos. Antes de esto, el catálogo respondía
**"qué modelos existen"**, pero nadie respondía la pregunta que importa al usarlo: **"¿cuáles puedo
usar yo, ahora, en este espacio de trabajo?"**

Son preguntas diferentes. Un modelo puede estar integrado y probado y aun así no estar habilitado
para tu workspace. La flota es el dato que responde la segunda.

## Gemini Omni 1.1 no aparece por el solo hecho de haberse anunciado

Google lanzó **Gemini Omni 1.1 Flash** el 2026-08-27, pero el anuncio no modifica automáticamente la
flota de Globe. Además, Google usa dos identidades distintas: `gemini-omni-1.1-flash` en Gemini Developer
API y `gemini-omni-1.1-flash-preview` en Google Cloud. No se pueden intercambiar ni heredar la evaluación,
el costo, los términos o el canary del modelo anterior. Google también fijó el retiro de
`gemini-omni-flash-preview` para el 2026-09-30 en Gemini API.

El proveedor documenta generación 360p/720p/1080p/4K —1080p y 4K son escalados—, primer y último cuadro,
referencias de video, edición y extensión. Para Globe, cada combinación puede requerir una ruta y una forma
de salida propias. Antes de mostrar cualquiera como disponible hay que verificar cuota, endpoint y auth,
precio real, derechos, credenciales C2PA en los bytes, canary facturable y promoción con readback.

Hasta que `TASK-1781` entregue esas pruebas y `globe.producer.fleet.list` confirme el estado, Omni 1.1 es
un **candidato del proveedor**, no una capacidad operativa de Globe. La llegada de 1.1 tampoco reescribe las
piezas, canaries ni atestaciones históricas de Omni Flash.

## Los tres estados

Cada modelo aparece siempre, con uno de tres estados. **Aparecer no es lo mismo que poder usarse**, y
esa distinción es deliberada: esconder un modelo hace que el usuario no sepa que existe, y termine
preguntando "¿por qué en Video no están los de Google?" cuando sí estaban, sólo que invisibles.

| Estado | Qué significa | Qué puede hacer el usuario |
|---|---|---|
| **Disponible** | Promovido y habilitado para este workspace | Elegirlo y ejecutar |
| **Próximamente** | Existe en el catálogo pero no está promovido acá | Verlo. No es ejecutable |
| **Bloqueado** | Una dependencia externa lo impide | Verlo con **la razón escrita** |

"Bloqueado" siempre viene con su motivo. Un modelo que no se puede usar y no dice por qué es
indistinguible de un producto roto.

## Un modelo puede estar disponible y aun así pedirte algo

Hay un caso que confunde y conviene entenderlo: **Veo aparece como "Necesita cuadros"**, no como
bloqueado. El modelo está disponible; lo que pasa es que necesita imágenes de referencia para
trabajar, y todavía no se las diste.

La diferencia importa. "Bloqueado" es *no puedes*; "necesita cuadros" es *puedes, pero falta un
insumo*. Elegirlo cambia el modo por ti y te deja donde se lo puede dar.

Si en cambio se ofreciera como ejecutable en un modo que sólo acepta prompt, la ejecución
**reservaría crédito y recién después fallaría**. Por eso se muestra con lo que necesita, nunca
como algo que puedes lanzar donde no corresponde.

## Por qué agregar un modelo ya no toca la pantalla

Éste es el punto de todo el diseño. La lista de modelos **no está escrita en la interfaz**: la
interfaz pregunta y dibuja lo que recibe.

Entonces, sumar un modelo nuevo es:

1. Declararlo en el catálogo.
2. Completar su rate, driver/endpoint, evaluación, derechos y promoción gobernada para el workspace.
3. Probar una generación real desde una superficie consumidora.

Y aparece solo — en el Producer, en Nexa, en las integraciones. Nadie edita una pantalla por modelo.
Antes, cada modelo nuevo era trabajo de interfaz; ahora es **consecuencia del dato**.

Lo mismo al revés: si se despromueve, desaparece de todos lados a la vez. No queda un botón que
promete algo que ya no existe.

Recraft v4.1 lo demuestra: `ref/still/vector-v1` pasó de existir como ruta no ejecutable a aparecer
disponible sin modificar el selector. La prueba real desde Producer produjo y retuvo un SVG de
4 créditos, con vista previa y descarga habilitadas.

## Estado verificado el 2026-08-05

El workspace interno ofrece simultáneamente seis rutas de imagen:

| Modelo | Ruta | Evidencia visible |
|---|---|---|
| Seedream 5 Pro | `ref/still/rrss-v1` | disponible y sin regresión como default |
| Nano Banana Pro | `ref/still/nanobanana-pro-v1` | revisión humana, readiness y binding promovidos; selector `Disponible` |
| Nano Banana 2 | `ref/still/nanobanana-2-v1` | generación UI real de 10 créditos, `completed/retained` |
| GPT Image 2 | `ref/still/openai-v2` | generación UI real de 14 créditos |
| GPT Image 1.5 | `ref/still/openai-v1-5` | generación UI real de 10 créditos, asset gobernado y descargable |
| Recraft v4.1 | `ref/still/vector-v1` | generación UI real de 4 créditos, SVG retenido y descargable |

La disponibilidad no elimina los controles. Cada identidad exacta llegó mediante rate, driver,
endpoint, evaluación, revisión, derechos, binding, readiness y circuito gobernados. El canary final
se hizo desde el Producer autenticado, no sólo desde una llamada directa al proveedor.

Los canaries también corrigieron defectos que los tests aislados no habían expuesto:

- Nano Banana 2 detectó un off-by-one al reconstruir el hash durable de Vertex. Globe `1fb5728`
  recuperó y completó el mismo run de forma idempotente, sin generar ni cobrar dos veces.
- Recraft detectó que Fal declara SVG en el payload pero su CDN lo transporta como
  `application/octet-stream`. Globe `84d6a8e` acepta ese MIME genérico sólo para una salida que
  espera SVG, verifica los bytes antes del ingest y sirve el asset con CSP sandbox.

Estos fixes no son excepciones generales: ambos fallan cerrado y están acotados al contrato exacto
que verifican.

TASK-1553 sigue `in-progress` únicamente porque faltan los receipts transversales que conectan cada
ruta promovible con la rate version vigente de TASK-1468 y el onboarding receipt de TASK-1578. No
queda una promoción, un selector ni un canary pendiente para estas seis rutas.

## El "recomendado"

Por cada tipo de tarea hay un modelo recomendado, marcado con **✦**. Es una sugerencia, no una
restricción: siempre puedes elegir otro.

Y es **honesto**: si el recomendado no está disponible para tu workspace, se muestra su estado real
en vez de preseleccionarlo. Preseleccionar algo que no se puede ejecutar convierte la recomendación
en una trampa.

## Una promoción no está terminada hasta que se sella (y si no, se deshace sola)

Promover una ruta a un workspace tiene un último paso que es fácil de subestimar: **una generación real
con esa ruta exacta, verificada del lado del servidor**. Se llama *canary*, y hasta que existe, la
promoción está **activada pero no sellada** — con una ventana de tiempo. Si la ventana vence sin sello,
la promoción **se revierte sola**: el modelo vuelve a "Próximamente" sin que nadie haya hecho nada mal.

Eso es deliberado y **no se relaja**: una ruta que nadie probó produciendo de verdad no debe quedar
disponible para el equipo ni para un cliente. Nadie puede "declarar" que el canary pasó; el sistema
resuelve la evidencia por su cuenta (la corrida, el intento, la pieza retenida y su decisión de
governance) y sólo entonces sella.

**El 2026-08-04 se descubrió que ese último paso llevaba tiempo sin poder ejecutarse.** El sello fallaba
con un error genérico **aunque la evidencia estuviera perfecta**, por un defecto interno de la consulta
que la verifica. La consecuencia medida: **10 de 12 promociones históricas terminaron revirtiéndose**,
varias de ellas segundos después de vencer su ventana. Ya está corregido, y ese mismo día **las dos rutas
de video quedaron promovidas, selladas y habilitadas**: `ref/motion/reference-v1` (Gemini Omni Flash) y
`ref/video/frames-v1` (Veo 3.1).

Con un matiz que conviene decir en voz alta: **el canary de Veo no se produjo desde el Producer**, sino
por el carril gobernado, con los comandos internos de la plataforma. La ruta exige referencias de imagen
y los dos caminos para aportarlas desde el Producer siguen rotos hoy — dos defectos ajenos a la promoción,
registrados por separado. Es decir: la ruta está sellada y habilitada, pero **generar desde el Producer un
modelo que exige referencias todavía no funciona**.

La lectura práctica para quien opera: **si una ruta que ya habías visto disponible deja de estarlo, la
causa más probable no es un fallo del modelo, sino una promoción que venció sin su canary.**

> Detalle técnico: la saga de promoción y el Delta de esta corrección están en el
> [ADR-009](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md).

## Qué nunca vas a ver

Tres cosas quedan fuera por diseño, no por omisión:

- **El identificador interno del proveedor.** Ves "GPT Image 2", nunca el código con que Globe
  habla con el proveedor por dentro.
- **El costo del proveedor.**
- **El margen.**

Ves el **nombre público del modelo y su versión** — eso alcanza para elegir con criterio, y de hecho
el nombre ya identifica a su creador. Lo que se protege es la mecánica comercial y de integración,
no la identidad del modelo.

## Lo mismo para todos

El Producer, Nexa y las integraciones externas leen **exactamente el mismo dato**. No hay una lista
para la pantalla y otra para el asistente.

La consecuencia práctica: si le preguntas a Nexa qué modelos tienes disponibles, la respuesta coincide
con lo que muestra el Producer, siempre. No pueden divergir, porque no son dos listas.

> **Detalle técnico:** contrato en `efeonce-globe/packages/contracts/src/producer-fleet.ts`;
> proyección en `packages/domain/src/producer-fleet.ts` con sus tests en `producer-fleet.test.ts`.
> El estado por modelo se lleva en
> [`GLOBE_MODEL_FLEET_STATUS.md`](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md).
> Para operarlo: [manual de flota](../../manual-de-uso/creative-studio/operar-flota-modelos-producer-globe.md).
