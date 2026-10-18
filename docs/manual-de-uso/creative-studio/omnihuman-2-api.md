# OmniHuman 2.0: operar la API de Vision AI

Verificación documental: **2026-10-15**. Alcance: contrato del fabricante y preparación del operador.
**No se activó el modelo, no se crearon credenciales y no se generó video.** El modelo figuraba `Disabled`
en la consola autenticada de Efeonce. La investigación no demuestra disponibilidad de inferencia en la cuenta.
Evidencia y discrepancias: [auditoría](../../audits/creative-studio/OMNIHUMAN_2_API_RESEARCH_2026-10-15.md).
Referencia técnica: [contrato](../../architecture/creative-studio/BYTEPLUS_OMNIHUMAN_2_API_CONTRACT_V1.md).
Aplicaciones y límites: [documentación funcional](../../documentation/creative-studio/omnihuman.md).

## Qué superficie utilizar

OmniHuman anima personajes mediante imagen y audio; el prompt dirige la actuación y la cámara. El audio
debe existir antes de llamar al modelo: no es un endpoint de TTS. Una voz generada con Seed Speech constituye
otro servicio, con sus propios permisos, costo y consentimiento. Tampoco es una videollamada en tiempo real.

| Superficie | Estado verificado en el repositorio |
|---|---|
| `src/lib/ai/byteplus.ts` | Sólo transportes `ark` y `speech`; sin Vision AI |
| `src/lib/ai/byteplus-catalog.ts` | Sin OmniHuman; no ampliar el catálogo sólo con un nombre |
| `scripts/ai/byteplus.ts`, `pnpm ai:byteplus` | Sin operación OmniHuman; `--doctor` no verifica Vision AI |
| `src/lib/ai/byteplus-speech-stream.ts` | Voz/ASR/interpretación; no genera avatares |
| Dependencias | No se agregó SDK, paquete, secreto, endpoint ni CLI durante esta investigación |
| Globe / MCP / Marketing Studio | Sin integración OmniHuman demostrada; no inferirla desde este manual |

El [ADR de BytePlus directo](../../architecture/creative-studio/EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md)
gobierna el carril actual. Incorporar Vision AI requiere una unidad de implementación con contrato, secretos,
presupuesto, recibos y recuperación; no inventar `pnpm ai:byteplus --model omnihuman`.

## Acceso y dos métodos de autenticación

La [documentación de API Key de Vision AI](https://docs.byteplus.com/en/docs/byteplus-vision/api-key-usage-instructions)
establece una alternativa a la firma AK/SK. **Los dos métodos usan hosts diferentes.**

| Método | Credencial | Host | Identidad de la operación |
|---|---|---|---|
| Firma HMAC-SHA256 V4 | Access Key ID y Secret Access Key de IAM | `https://cv.byteplusapi.com/` | Query `Action` y `Version=2024-06-06`; service `cv`, region `ap-singapore-1` |
| Bearer | API Key Secret creada en IAM / Access Key Management | `https://openapi.cv.bytepluses.com` | Paths de la tabla siguiente; mismo cuerpo de la operación |

| Acción firmada | Path Bearer equivalente | Método |
|---|---|---|
| `CVSync2AsyncSubmitTask` | `/api/common/v3/submit_task_v2` | POST |
| `CVSync2AsyncGetResult` | `/api/common/v3/get_result_v2` | POST |
| `CVCancelTask` | `/api/common/v3/cancel_task` | POST |

Todos envían `Content-Type: application/json`. Bearer añade `Authorization: Bearer <API_KEY_SECRET>`.
No sustituir `_v2` por `/submit_task` o `/get_result`: son otras acciones. No enviar Bearer al host firmado.
No confundir la región de firma `ap-singapore-1` con la de ModelArk/Johor.

La clave ModelArk existente (`BYTEPLUS_API_KEY`) no acredita autorización IAM/Vision AI; la clave Seed Speech
tampoco. No se leyeron sus valores para probar esa hipótesis. Las credenciales y permisos de Vision AI
quedan pendientes de verificar con el propietario de la cuenta, independientemente del partnership.

Para producción, [IAM recomienda una identidad dedicada](https://docs.byteplus.com/en/docs/IAM/about-access-keys)
y Access Keys o credenciales STS, en vez de claves de la cuenta principal. No conceder permisos cloud generales
para un ensayo de generación. La política IAM exacta de Vision AI y la compatibilidad STS del consumidor elegido
deben verificarse al implementar; este manual no inventa nombres de policies ni secretos existentes.

## Preparar entradas y presupuesto

Según el [contrato API 2.0](https://docs.byteplus.com/en/docs/byteplus-vision/omnihuman-2-0-video-generation):

| Entrada | Contrato documentado de API |
|---|---|
| Imagen | JPEG, PNG, WebP, BMP, TIFF, GIF, HEIC o HEIF; menos de 30 MB; dimensiones entre 300 y 6000 px; ancho/alto entre 0,4 y 2,5 |
| Audio | WAV o MP3; 4–300 segundos; menos de 15 MB |
| Prompt | Opcional; idiomas de prompt: chino, inglés, japonés, coreano, español de México e indonesio |

La lista de idiomas corresponde al **prompt**; no demuestra un catálogo TTS, traducción automática o calidad
validada en todos esos idiomas. La ficha de consola observada mostraba audio hasta 120 s / 25 MB e imagen
JPEG/PNG hasta 5 MB / 4096²: es una restricción de esa superficie, distinta de la especificación API.
Para una primera prueba que sirva a ambas superficies: PNG/JPEG, 300–4096 px y menos de 5 MB;
MP3 de 4–120 s y menos de 15 MB. **300 s es capacidad documentada de la API, todavía sin canary en Efeonce.**

La consola mostraba salida MP4, 720p, 25 fps y concurrencia 1. La tabla de campos API no ofrece controles
`resolution`, `fps`, `seed`, `duration` ni `aspect_ratio`: no agregar esos campos por analogía con Seedance.
Las propiedades del MP4 efectivamente recibido se verifican con `ffprobe`.

Antes de enviar, medir duración y tamaño reales, comprobar acceso del proveedor a las URLs y dejar un
presupuesto por intento y por conjunto. A US$0,07/s observados: 10 s = US$0,70; 30 s = US$2,10;
60 s = US$4,20; 120 s = US$8,40; 300 s = US$21. Son estimaciones antes de impuestos, voces, almacenamiento,
transferencia, repeticiones y edición. No se verificó tarifa partner específica de OmniHuman ni liquidación.
El costo por minuto aprobado requiere contabilizar todos los intentos y la aceptación humana del resultado.

Las URLs de entrada deben ser HTTPS y permitir la lectura del proveedor durante la cola y el procesamiento.
Usar almacenamiento aprobado con acceso temporal; no publicar imágenes privadas permanentemente para
facilitar la prueba. Este contrato no contiene un upload de archivos locales. No registrar query strings de URLs
firmadas en Git, recibos o chat; materializarlas sólo en archivos privados o en memoria del proceso.

## Cuerpo y ciclo de una solicitud

El `req_key` exacto es `realman_avatar_picture_omni20_cv`. No reutilizar `omni15`, payloads ni parser de 1.5;
las acciones asíncronas genéricas no identifican por sí solas la versión del modelo.
En el primer ensayo se recomienda una sola imagen; `image_urls` es un array, pero la tabla API no fija aquí
su cardinalidad máxima. No asumir que múltiples imágenes representan escenas o personas distintas.

```json
{
  "req_key": "realman_avatar_picture_omni20_cv",
  "image_urls": ["https://media.example.invalid/retrato.png"],
  "audio_url": "https://media.example.invalid/locucion.mp3",
  "prompt": "La persona habla a cámara con gestos moderados y una expresión tranquila.",
  "enable_watermark": true
}
```

Los dominios de ejemplo no son ejecutables. `enable_watermark` es opcional y el proveedor documenta `true`
por defecto. Mantenerlo en ensayos; desactivarlo no elimina las obligaciones de disclosure y provenance.

1. Enviar **una vez** a submit y comprobar HTTP y `code == 10000` antes de acceder a `data`.
2. Persistir inmediatamente `data.task_id` como string, junto a `request_id`, sin guardar URLs ni media cruda.
3. Consultar get-result con `{"req_key":"realman_avatar_picture_omni20_cv","task_id":"<id>"}`.
4. Resolver el estado usando la tabla siguiente. Descargar la salida antes de expirar su enlace.
5. Verificar el archivo y el costo/uso de la cuenta, cerrar el recibo y realizar QA de la pieza.

| `data.status` | Actuación del operador |
|---|---|
| `in_queue` | Esperar; aún admite cancelación |
| `generating` | Esperar; la cancelación 2.0 no está documentada para este estado |
| `done` | Comprobar código externo y URL; terminar no demuestra éxito por sí solo |
| `not_found` | Investigar ID incorrecto o expiración; no volver a generar automáticamente |
| `expired` | Reconciliar el intento antes de autorizar un envío nuevo |
| `canceled` | Registrar la cancelación confirmada y verificar facturación |

La URL está en **`data.video_url`**, no en `resp_data` como en otros contratos. Dura una hora;
el lookup de tareas puede expirar tras 12 horas. Estos plazos no prueban eliminación de todos los datos del
proveedor ni política de zero retention. La API de cancelación recibe el mismo cuerpo que get-result y sólo
admite `in_queue`; `50217` indica que ya empezó a ejecutarse. No hay garantía de reembolso documentada aquí.

## Ejemplo HTTP Bearer para una operación

**Ejemplo documental, no comando incorporado al repositorio ni prueba realizada.** Requiere Python y `requests`
en un entorno aislado. Guardar el código como un helper temporal privado; no añadir paquetes al proyecto para
leer este manual. `OMNIHUMAN_IAM_API_KEY` es un nombre ilustrativo de variable, no un secreto ya provisionado.
Inyectar su valor por el mecanismo aprobado, sin escribirlo en argumentos, historial, captura o salida.

El helper recibe `submit|query|cancel` y la ruta de un JSON privado. Para submit, el JSON es el cuerpo anterior
con URLs reales autorizadas; para query/cancel lleva sólo `req_key` y `task_id`. Cada ejecución hace una llamada;
**submit puede generar un cargo**. Preparar no autoriza ejecutarlo.

```python
import json
import os
import sys
import requests

paths = {
    "submit": "submit_task_v2",
    "query": "get_result_v2",
    "cancel": "cancel_task",
}
operation, input_path = sys.argv[1:3]
path = paths[operation]
with open(input_path, encoding="utf-8") as stream:
    body = json.load(stream)
if body.get("req_key") != "realman_avatar_picture_omni20_cv":
    raise SystemExit("req_key inesperado")
key = os.environ["OMNIHUMAN_IAM_API_KEY"]
try:
    response = requests.post(
        "https://openapi.cv.bytepluses.com/api/common/v3/" + path,
        headers={"Authorization": "Bearer " + key,
                 "Content-Type": "application/json"},
        json=body,
        timeout=(10, 60),
        allow_redirects=False,
    )
    result = response.json()
except (requests.RequestException, ValueError):
    raise SystemExit("Respuesta incierta; conservar el intento y no repetir submit")
data = result.get("data") if result.get("code") == 10000 else None
data = data if isinstance(data, dict) else {}
receipt = {
    "operation": operation,
    "http_status": response.status_code,
    "code": result.get("code"),
    "request_id": result.get("request_id"),
    "task_id": data.get("task_id", body.get("task_id")),
    "state": data.get("status"),
    "output_url_present": bool(data.get("video_url")),
}
print(json.dumps(receipt))
if not (200 <= response.status_code < 300 and result.get("code") == 10000):
    raise SystemExit(1)
# En query/done: descargar data["video_url"] por un consumidor aprobado,
# sin imprimirla ni persistirla; este ejemplo no descarga ni hace polling.
```

El timeout `(10, 60)` es una elección local de transporte, **no SLA ni límite de generación**. Guardar el recibo
redactado fuera del código y proteger el JSON de entrada con `0600`. Para descargar, verificar HTTPS/host de
salida aprobado, limitar redirects, tamaño y tiempo; no reutilizar la cabecera Bearer de Vision AI contra el
almacenamiento. Conservar bytes, SHA-256, MIME, duración, dimensiones y fps, sin URL firmada en el recibo.
Un resultado listo sin descarga no es un entregable preservado.

## SDK y firma AK/SK

El [SDK oficial Python](https://github.com/byteplus-sdk/byteplus-sdk-python/blob/master/byteplus_sdk/visual/VisualService.py)
implementa `VisualService`, host, servicio, región y versión anteriores. La distribución se llama `byteplus-sdk`.
Los métodos concretos son `set_ak`, `set_sk`, `cv_sync2async_submit_task`, `cv_sync2async_get_result`
y `cv_cancel_task`. El [manual SDK](https://docs.byteplus.com/en/docs/byteplus-vision/SDK-Usage-instructions)
también ofrece Go; no copiar el payload de ejemplo 1.5 al invocar 2.0. Revisar y fijar una versión del SDK
al implementar, y verificar sus retries, timeouts y errores antes de usarlo con costo.

Si se implementa HTTP firmado, el [ejemplo oficial](https://docs.byteplus.com/en/docs/byteplus-vision/http_request_sample)
usa ruta `/`, query ordenada y payload SHA-256. La variante Python firma
`content-type;host;x-content-sha256;x-date`, fecha UTC `YYYYMMDDTHHMMSSZ`, scope
`YYYYMMDD/ap-singapore-1/cv/request` y derivación HMAC de SK → fecha → región → servicio → `request`.
La firma cubre los bytes exactos enviados. Sincronizar el reloj; no alterar JSON o query tras firmarlos.
No usar un firmador AWS con defaults de región/servicio ajenos sin demostrar compatibilidad.
Los ejemplos upstream imprimen respuestas y algunos datos de firma: omitir esos logs en la adaptación.

## Errores, reintentos y recuperación

Los errores documentados incluyen `50215` (entrada), `50400` (acceso), `50429` (QPS), `50430`
(concurrencia), `50500`/`50501` (interno) y `50510` (filtro de contenido). No registrar mensajes crudos upstream:
pueden contener referencias a las entradas. Guardar código, operación, estado HTTP y request/task ID.

La documentación considera reintentables QPS/concurrencia e internos, pero no demuestra idempotencia del
submit. La regla de Efeonce sigue siendo **no repetir automáticamente un POST que pueda crear generación**.
Un timeout o un 5xx no demuestra ausencia de tarea ni cobro cero. Consultar la tarea existente cuando se tenga
ID; sin ID dejar el intento `unknown` y reconciliar con soporte/usage antes de otro submit. Query admite
backoff acotado con jitter y `Retry-After` cuando exista; serializar con la concurrencia observada de la cuenta.
No convertir `expired` ni `not_found` en nuevas generaciones automáticas.

`callback_url` y `callback_auth_info` aparecen en el ejemplo API, pero su tabla no define un contrato completo
de firma, verificación o reintento de callbacks. Tratarlos como señal pendiente de certificación. Un campo de
autenticación reservado no demuestra autenticidad ni propiedad de la tarea; confirmar el resultado por query
autenticada. Polling recuperable sigue siendo obligatorio hasta cerrar esas garantías.

## Derechos, entrega y criterio de aceptación

Antes de usar rostros/voces reales, obtener autorización específica para réplica sintética, proveedor,
transformación y usos previstos. Comprobar música, fotografías, personajes y datos confidenciales; no inferir
licencia comercial, sublicencia, no training, región de todos los subprocesadores o indemnidad desde el
partnership. Aplicar [gobernanza de datos creativos](../../architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md)
y la skill `greenhouse-ai-creative-rights-governance` por modelo, versión, endpoint, plan y términos vigentes.

Los [AI Services Terms](https://docs.byteplus.com/en/docs/legal/AI-Services-terms), actualizados el
2026-08-28, exigen derechos sobre imagen/voz (§1.8), reconocen output al cliente entre las partes sujeto a ley
y derechos subyacentes (§2.1), y no garantizan exclusividad, protección o ausencia de infracción (§2.4–2.5).
Permiten retención necesaria para operar/proteger el servicio (§3.2); el no entrenamiento de modelos fundacionales
exceptúa feedback voluntario y consentimiento separado (§3.3). No equivalen a zero retention. La indemnidad de
ModelArk no se extrapola a Vision AI. Lectura de términos no sustituye una atestación humana para entrega comercial.

El recibo de producción debe unir autorización de derechos, hashes de entradas, identidad del modelo,
prompt versionado, intent ID local, task/request IDs, método de auth sin clave, tarifa/estimado y moneda,
inicio/fin, estado incierto o terminal, costo observado cuando exista, hashes/metadatos de salida y aceptación
humana. No presentar una estimación como factura ni un MP4 descargado como aprobación del cliente.

Para el primer canary autorizado: una persona o personaje con derechos claros, plano fijo y audio de 10–30 s;
evaluar español, identidad, sincronización, ojos/dientes/manos, gestos, emoción y continuidad. Sólo después
probar duración larga, cámara compleja y varias personas. Revisar el MP4 completo, incluyendo final y silencios;
medir tiempo total, repeticiones y costo por minuto aceptado. No prometer cinco minutos de calidad uniforme
desde una demo corta. Publicación, integración y promoción de rutas requieren su evidencia propia.
