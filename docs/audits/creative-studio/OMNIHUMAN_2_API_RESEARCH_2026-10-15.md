# OmniHuman 2.0 — contrato API y evidencia de disponibilidad

Fecha de investigación: **2026-10-15**. Alcance: fuentes primarias públicas y readback de consola de la
cuenta Efeonce informado por el agente coordinador. No se activó el modelo, no se crearon credenciales y
no se envió ninguna generación ni cancelación. Investigación/documentación ≠ integración ejecutada.

Procedimiento para operar: [manual OmniHuman 2.0](../../manual-de-uso/creative-studio/omnihuman-2-api.md).
Esta auditoría conserva lo observado y las diferencias pendientes; el manual operacionaliza el contrato.
Referencia técnica: [contrato API](../../architecture/creative-studio/BYTEPLUS_OMNIHUMAN_2_API_CONTRACT_V1.md).
Uso y criterios creativos: [documentación funcional](../../documentation/creative-studio/omnihuman.md).

## Resultado

**Existe un contrato público completo de OmniHuman 2.0 en Vision AI, con dos formas oficiales de
autenticación.** El modelo figura desactivado y habilitable en la cuenta revisada. No está integrado en
`pnpm ai:byteplus`, cuyo cliente actual tiene únicamente los carriles ModelArk y Seed Speech.
La investigación no altera la hibernación de Globe ni crea disponibilidad en su flota.

El límite publicado por la **API 2.0 es 4–300 segundos**. La ficha de la consola de la cuenta mostraba
120 segundos y otros límites de archivo: ambos hechos se conservan por separado. No hay prueba de una
generación de 300 segundos ni confirmación de que ese máximo esté efectivo en la cuenta.

## Fuentes y método reproducible

| ID | Fuente primaria | Evidencia / alcance |
|---|---|---|
| S1 | [OmniHuman 2.0 API Document](https://docs.byteplus.com/en/docs/byteplus-vision/omnihuman-2-0-video-generation) | Contrato exacto 2.0; `DocumentID=90351`, `UpdatedTime=2026-10-15T03:29:58Z` |
| S2 | [API Key Usage Instructions](https://docs.byteplus.com/en/docs/byteplus-vision/api-key-usage-instructions) | Host Bearer y traducción de `Action` a paths |
| S3 | [SDK Usage Instructions](https://docs.byteplus.com/en/docs/byteplus-vision/SDK-Usage-instructions) | SDK Python `byteplus_sdk.visual.VisualService` y métodos de transporte |
| S4 | [HTTP Request Sample](https://docs.byteplus.com/en/docs/byteplus-vision/http_request_sample) | Firma HMAC con AK/SK; servicio `cv`, región `ap-singapore-1` |
| S5 | [Producto OmniHuman](https://www.byteplus.com/en/product/OmniHuman) | Anuncio comercial, precio público, actuaciones y ejemplos; no benchmark independiente |
| S6 | [Vision AI console](https://console.byteplus.com/ai) | Readback autenticado informado por el coordinador; disponibilidad de cuenta y ficha, no ejecución API |
| S7 | [Multi-Character Interaction 1.5](https://docs.byteplus.com/en/docs/byteplus-vision/OmniHuman1-5-Multi-Character-Interaction-Demo) | Control de versión: guía de máscaras y stitching explícitamente **1.5**, no contrato 2.0 |
| S8 | [Service Specific Terms](https://docs.byteplus.com/en/docs/legal/docs-service-specific-terms) | Actualizado `2026-10-08T09:34:37Z`; sección Seed Speech and Vision AI incluye OmniHuman |
| S9 | [General Terms for AI Services](https://docs.byteplus.com/en/docs/legal/AI-Services-terms) | Actualizado `2026-08-28T11:39:50Z`; inputs, outputs, consentimiento, datos |
| S10 | [Prompt guide enlazado por BytePlus](https://bytedance.larkoffice.com/docx/FdZldIXpdo3a3bxLdYicneYWnOg) | Redirige a login Lark; contenido no recuperado |

El extractor web y el primer render del API document devolvían solamente título y fecha. **Eso no
significa que no exista documentación**. Un GET público del HTML contiene
`window._ROUTER_DATA.loaderData['(lang)/docs/(libcode)/(doccode$)/page'].curDoc.MDContent` con el
Markdown completo. También existe `curDoc.Content` con bloques JSON ricos. Se recuperaron esas
propiedades sin sesión, sin datos de cuenta y sin ejecutar el JavaScript de la página.

Para repetir la lectura: descargar S1 por HTTPS, extraer el JSON de `window._ROUTER_DATA`, seleccionar
la propiedad `MDContent` de `curDoc` y leer además `DocumentID`/`UpdatedTime`. No usar la ausencia de
texto del extractor como evidencia de ausencia de un schema. Los archivos temporales no son el canon.

Hashes SHA-256 de los bytes UTF-8 de `MDContent` recuperados, no del HTML completo:

| Documento | SHA-256 |
|---|---|
| S1 API 2.0 | `9029a0dbc2f6ef4e01b9a4c871371fee863b2d63cf22b04a18e20cbff36be35c` |
| S2 API Key | `078cc328aaa41a88e743e6a21d3cc1f7d3a1df76900b22364484a3729a50482b` |
| S3 SDK | `eacd743d9cdde1443db73b4f14091d718b29e96bec318ee8304c4d25b6cae1d5` |
| S4 HTTP | `9f861eb67b28a982098bbef021ca7b4f24c8b056477591142b2bffb8922d629f` |
| S8 Service Specific Terms | `c042ac426e4135ce99c491cf359807143b1fb96b1efc90e6738b994a97dc6ea4` |
| S9 General AI Terms | `9ee3692cde7b4419d12f42743db69b7f359b779e98c420bc35b49440858445bc` |

## Cuenta Efeonce y discrepancias

Readback del coordinador en la cuenta `julio.reyes@efeonce.org`, Vision AI → Model management:

| Campo | Observado en cuenta / ficha de consola | Contrato público S1 / producto S5 |
|---|---|---|
| OmniHuman 2.0 | `Disabled`, botón `Enable model` | Producto y API anunciados |
| Precio 2.0 | USD 0,07/segundo, antes de impuestos | USD 0,07/segundo |
| Prueba 2.0 | `-` | No asumir prueba gratuita |
| Concurrencia | 1 | S1 contempla rechazo por concurrencia; no publica una cuota universal |
| Audio | MP3, hasta 120 s, hasta 25 MB | S1: WAV/MP3, `[4,300]` s, **menos de 15 MB** |
| Imagen | JPEG/PNG, hasta 5 MB, hasta 4096 × 4096 | S1: 8 formatos, **menos de 30 MB**, dimensión `[300,6000]`, ratio `[0.4,2.5]` |
| Video | MP4, 720p, 25 fps | S1 no expone campos de resolución/fps; la ficha no es evidencia de códec interno |
| Tiempo | RTF 25 en ficha | Orientación del proveedor, no SLA ni tiempo medido |
| OmniHuman 1.5 | Desactivado; 100 s de prueba | Modelo distinto; no usar ese saldo como saldo de 2.0 |

Para un primer canary se recomienda la intersección segura de las dos superficies: una imagen JPEG/PNG
menor de 5 MB y dimensiones dentro de ambas fichas, audio MP3 de 4–120 s y menor de 15 MB. Esto es una
**recomendación operativa conservadora**, no una redefinición del límite API. Confirmar con BytePlus si la
ficha de consola quedó desactualizada o expresa otra variante antes de comprometer cinco minutos a un cliente.

## Identidad y autenticación exactas

OmniHuman 2.0 pertenece a **BytePlus Vision AI**, no al endpoint ModelArk de Seedance ni a Seed Speech.
El identificador fijo de servicio en el body es **`realman_avatar_picture_omni20_cv`**.

| Transporte | Host | Autenticación | Selección de operación |
|---|---|---|---|
| AK/SK firmado | `https://cv.byteplusapi.com` | `HMAC-SHA256 Credential={AccessKeyId}/{ShortDate}/ap-singapore-1/cv/request, SignedHeaders={SignedHeaders}, Signature={Signature}` | `Action` y `Version=2024-06-06` en query |
| API Key IAM | `https://openapi.cv.bytepluses.com` | `Authorization: Bearer <API_KEY>` | Path según tabla S2; mismo body de negocio |

Ambos son `POST` y `Content-Type: application/json`. API Key IAM se administra en
[Access Key Management](https://console.byteplus.com/iam/keymanage). No se comprobó una clave Vision AI
existente ni sus permisos. Una clave ModelArk o Speech no acredita autorización Vision AI.

| Operación | Action AK/SK | Path Bearer |
|---|---|---|
| Crear | `CVSync2AsyncSubmitTask` | `/api/common/v3/submit_task_v2` |
| Consultar | `CVSync2AsyncGetResult` | `/api/common/v3/get_result_v2` |
| Cancelar | `CVCancelTask` | `/api/common/v3/cancel_task` |

Python oficial: `VisualService`, `set_ak`/`set_sk` y métodos `cv_sync2async_submit_task`,
`cv_sync2async_get_result`, `cv_cancel_task` (S3). No reemplazar estos por
`cv_submit_task`/`cv_get_result`: estos últimos corresponden al otro par de Actions utilizado por 1.5.

## Entrada y controles documentados de 2.0

| Campo / restricción | Contrato S1 |
|---|---|
| `req_key` | String requerido, valor fijo anterior |
| `image_urls` | Array de strings requerido; URL de imagen. No se publica cardinalidad máxima |
| `audio_url` | String requerido; audio suministrado por el operador |
| `prompt` | String opcional; dirección de escena, personaje, movimiento y cámara |
| `enable_watermark` | Boolean opcional, **activado por defecto** |
| Imagen | JPEG, PNG, WebP, BMP, TIFF, GIF, HEIC, HEIF; <30 MB; ratio ancho/alto 0,4–2,5; dimensión 300–6000 px |
| Audio | WAV o MP3; duración 4–300 s; <15 MB |
| Idiomas de prompt | Chino, inglés, japonés, coreano, español de México, indonesio |

No hay `seed`, `negative_prompt`, `duration`, `output_resolution`, ratio de salida, códec, fps,
intensidad de actuación, control de lip-sync, `mask_url` ni audio por personaje en la tabla de 2.0.
No enviar parámetros heredados de otros modelos por intuición. Los idiomas listados pertenecen al
**prompt**: no convertirlos en una garantía de soporte o calidad para todos los idiomas/acento del audio.

Ejemplo mínimo compuesto a partir del contrato, con watermark conservado:

```json
{
  "req_key": "realman_avatar_picture_omni20_cv",
  "image_urls": ["https://media.example.org/personaje.png"],
  "audio_url": "https://media.example.org/locucion.mp3",
  "prompt": "La presentadora explica con calma y mantiene la mirada hacia la cámara.",
  "enable_watermark": true
}
```

No es un request ejecutado. Las URLs del ejemplo son marcadores sin datos ni firmas. La documentación
no fija TTL mínimo de las URLs de entrada: como recomendación, usar recursos HTTPS accesibles para el
proveedor durante toda la cola/procesamiento y minimizar exposición de datos. No registrar URLs firmadas.

### Varios personajes

La web S5 anuncia escenas con varias personas. El contrato S1 contiene `image_urls` pero un solo
`audio_url`; no explica asociación imagen-personaje, turnos, diarización, número máximo de imágenes ni
voces separadas. **No prometer turn-taking determinístico ni control de un hablante específico.**
La guía S7 pide máscaras y concatenación para diálogos de **1.5**; no prueba que 2.0 lo requiera ni que
su API acepte esas máscaras. La frase del post «sin stitching» es una afirmación a validar en una salida
larga de 2.0, no una descripción verificada del procesamiento interno.

## Ciclo asíncrono y salidas

1. Validar inputs y permisos; habilitación del modelo y credenciales son precondiciones independientes.
2. Crear una tarea y comprobar primero `code == 10000`; entonces conservar `data.task_id` y `request_id`.
3. Consultar con `req_key` y `task_id`, usando el transporte escogido arriba.
4. Comprobar `code` antes de desreferenciar `data`. El `status` numérico de nivel superior no es el estado
   de ejecución. El estado útil es `data.status`.
5. En `code == 10000` + `data.status == "done"`, leer **`data.video_url` directamente**, descargar y
   verificar el archivo antes de reportar entrega. No aplicar el parser `resp_data` de ejemplos 1.5.

| `data.status` | Significado publicado / tratamiento |
|---|---|
| `in_queue` | Creada en cola; es el único estado cancelable documentado |
| `generating` | Consumida, en proceso; no hay cancelación garantizada |
| `done` | Finalizada; éxito depende además de `code`/`message` |
| `not_found` | Inexistente o fuera de la ventana de conservación de 12 h |
| `expired` | Expirada; proveedor sugiere nueva solicitud, pero no acredita ausencia de cobro previo |
| `canceled` | Cancelada; registrar readback terminal |

**URL de video: válida por una hora. Tarea: puede expirar a las 12 horas.** Son dos ventanas distintas;
la expiración del link no prueba eliminación integral de datos ni cero retención. Guardar el resultado
verificado en almacenamiento propio con permisos apropiados antes de que el enlace caduque.

No se publica frecuencia de polling ni SLA de procesamiento. Como política local recomendada: espera
con backoff y jitter, límite de espera explícito, conservar el task ID ante timeout y reanudar el polling;
**no reenviar automáticamente una creación**. Un timeout de cliente no cancela ni demuestra ausencia de
consumo. No se encontró un campo de idempotencia de creación en S1.

### Callback y cancelación

El ejemplo S1 incluye `callback_url` y `callback_auth_info` comentados y un callback con
`task_id`, `req_key`, `request_id`, `code`, `data.status` y `data.video_url`. **Esos dos campos no figuran
en la tabla de parámetros 2.0**; no se publica allí una garantía de firma, calendario de reintentos o
seguridad anti-replay. No heredar las garantías del callback 1.5. Tratar el callback como aviso que
dispara una consulta autenticada; no como única prueba de propiedad ni único mecanismo de completitud.

Cancelar usa `req_key` + `task_id`, pero S1 permite hacerlo únicamente en `in_queue`.
El error `50217` indica que la tarea ya se ejecuta y no admite la cancelación. Cancelar no acredita
reembolso ni costo cero; esas reglas de facturación no están verificadas aquí.

## Errores, cuotas y reintentos

| HTTP / código negocio | Situación según S1 | Conducta operativa recomendada |
|---|---|---|
| 200 / `10000` | Operación aceptada | Continuar según `data.status`; aceptación no es video final |
| Ejemplo / `50215` | Entrada inválida | Corregir entrada; no repetir sin cambios |
| Ejemplo / `50400` | Acceso denegado | Revisar IAM/habilitación; no confundir con falta de modelo en catálogo |
| 429 / `50429` | Límite QPS | Backoff, observar Retry-After si existe; no inventar cuota numérica |
| 429 / `50430` | Límite concurrencia | Mantener serial la cuenta observada; esperar término de tarea existente |
| 500 / `50500`, `50501` | Error interno/algorítmico, marcados retryable | Consulta recuperable; en creación incierta primero reconciliar tarea/cobro |
| 500 / `50510` | Pre-filtro de contenido | No reintentar igual; revisar contenido y permisos |
| Ejemplo / `50217` | Cancelación ya no permitida | Seguir consultando la tarea existente |

Registrar identidad exacta de modelo, IDs, fase, códigos, duración y número de intentos; redactar secretos,
tokens y URLs firmadas. Un 500 retryable del proveedor no resuelve la idempotencia de un POST de creación.

## Precio y utilidad

S5 y el readback S6 coinciden en **USD 0,07 por segundo**, sin un descuento partner 2.0 demostrado.
Base matemática: 30 s = USD 2,10; 60 s = USD 4,20; 120 s = USD 8,40; 300 s = USD 21,00. El último es
una estimación del contrato público, no un run verificado en la cuenta. Impuestos, repeticiones, voz,
edición, revisión, almacenamiento y distribución se calculan aparte.

Faltan reglas de redondeo, mínimo facturable, fallos/cancelaciones y readback de un consumo real 2.0.
Ni el partnership activo ni las condiciones de Seedance/Seedream permiten inferir descuento OmniHuman.

Aplicaciones candidatas: series con presentador, cápsulas de producto, capacitación, onboarding y variantes
de una misma actuación con audio aprobado. La referencia comercial debe ser costo y tiempo por **minuto
aprobado**, no por minuto generado; revisar consistencia, manos, boca, actuación, marca y audio.
Las promesas de calidad y coherencia larga siguen pendientes de evaluación con español/acento objetivo.

## Derechos y datos: evidencia, no autorización comercial automática

S8 coloca a OmniHuman bajo Vision AI y remite a S9. Hechos de S9 revisados:

- §1.8: el cliente obtiene los derechos y consentimientos necesarios, incluidos imagen, parecido y voz.
- §2.1: entre las partes, conserva derechos de entrada y posee salida en la medida permitida por ley;
  los derechos de contenido subyacente permanecen con su titular.
- §2.4–2.6: puede haber salidas similares para terceros; no garantiza originalidad, registrabilidad ni
  ausencia de infracción; el cliente responde por inputs y uso de outputs.
- §3.2: puede retener/procesar datos necesarios para servicio, seguridad y prevención de abuso.
- §3.3: no entrena modelos fundacionales con Customer Data salvo feedback voluntario, consentimiento
  separado o acuerdo escrito. **No es zero data retention.**

No se encontró una atestación firmada de derechos para la identidad exacta OmniHuman 2.0/ruta/plan de
Efeonce. No extrapolar indemnidad de ModelArk, reventa, sublicencia, exclusividad o aprobación cliente.
La capacidad `enable_watermark=false` no es por sí sola autorización para quitar disclosure/identificadores.
Mantener el valor por defecto salvo revisión aplicable. Para producción, seguir
`greenhouse-ai-creative-rights-governance` y verificar permisos de cada rostro, voz, música, personaje y
material del cliente antes de subirlos.

## Pendientes verificables

- [ ] Confirmar discrepancia API 300 s / ficha de consola 120 s y límites de archivo en esta cuenta.
- [ ] Habilitación del modelo con readback, si se decide operar; no realizada en esta investigación.
- [ ] Credencial Vision AI con permiso mínimo, gestión canónica y doctor redactado; no realizada.
- [ ] Resolver cardinalidad/mapping `image_urls`, turnos y voces múltiples 2.0; prompt guide con acceso.
- [ ] Confirmar parámetros callback 2.0 y seguridad; no asumir firma/reintentos 1.5.
- [ ] Primer submit/query/download autorizado, verificación técnica de archivo y QA en español.
- [ ] Comprobar cargo real, mínimos/redondeos y tratamiento de fallos/cancelaciones; partner rate exacto.
- [ ] Derechos exactos del modelo/endpoint/plan y consentimiento de inputs para producción cliente.
- [ ] Si se implementa CLI, ADR y carril Vision AI propios, sin reutilizar transportes ModelArk/Speech.
- [ ] Si se propone Globe, ruta/contrato/evaluación/canary/promoción independientes y respetar hibernación.

Estado de cierre: **investigación de contrato y canalización documental; ejecución y disponibilidad API
de cuenta no verificadas**. No convertir estas casillas en completas por existir documentación.

## Canalización documental y verificación

El cierre abarca 32 archivos de documentación y skills, más dos archivos históricos por rotación: cuatro documentos nuevos (esta auditoría, contrato técnico, funcional
y manual); deltas en ADR, guía de selección, flota, manual BytePlus, índices y continuidad; seis skills con
sus equivalentes Codex/Claude y fuentes de diseño/motion. Derechos conserva su companion Claude liviano
existente. El contrato completo vive en el manual; las skills remiten a él sin duplicar límites numéricos.

Se comprobaron 89 enlaces locales añadidos, sin faltantes; sintaxis del ejemplo Python y `git diff --check`
acotado pasan. `pnpm skills:mirrors`, el cierre documental acotado y la cadena `pnpm docs:closure-check`
pasan, incluido el gate bidireccional de índices Creative Studio. El aviso de TTL de fichas de rutas históricas
es informativo y no certifica uso actual; no se revalidó ni ejecutó esa flota. La rotación canónica conserva
una entrada antigua de Handoff y otra de changelog en sus archivos mensuales; los routers de contexto se
compactan sin perder su contrato. El gate de contexto estricto se ejecuta después de la última edición.

AGENTS/CLAUDE mantienen sus routers existentes: no nace una regla transversal ni se incorpora un catálogo
en ellos. No se modificaron código, catálogo ejecutable, permisos, secretos, oferta, créditos, deploy ni tasks.
El WIP previo de otros frentes se conserva; no hubo commit ni push.
