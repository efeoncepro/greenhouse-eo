# Verificación de un evento individual en Meta

Revisión: 2026-10-17. Alcance: fuentes oficiales y código local del sender sGTM de Efeonce.
No se enviaron eventos, no se consultaron credenciales y no se modificaron GTM ni el runtime publicado.
El recibo por evento está **implementado localmente, sin activar ni desplegar** por orden del operador.
[ADR](../../architecture/GREENHOUSE_META_EVENT_RECEIPT_DECISION_V1.md) ·
[Preparación y límites](../../manual-de-uso/growth/conservar-recibos-meta.md).

## Qué podemos confirmar

Podemos seguir una ocurrencia de Forms hasta su conversión UUID, consentimiento, cola y ACK
del tag sGTM. La API pública de CAPI no proporciona en la referencia revisada una consulta
individual por ese UUID para recuperar su procesamiento, matching o atribución. La referencia
de `/{pixel_id}/events` declara que la lectura no está soportada; su operación documentada es
crear eventos con POST. No tratar `GET /{event_id}` ni `GET /{pixel_id}/events?event_id=...` como
endpoints existentes. [Referencia oficial de Events](https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/events/).

El `event_id` lo elige el anunciante. Meta lo utiliza junto con `event_name` para deduplicar
la misma acción entre emisores; no es un ID de objeto Graph emitido por Meta. En Efeonce,
la identidad externa es un UUID durable de `measurement_conversion`, distinto del
`fsub-UUID` de Forms. [Parámetros de evento de Meta](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event/),
[contrato local](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).

| Evidencia | Qué acredita | Qué queda sin demostrar |
| --- | --- | --- |
| Fuente persistida + conversión UUID | Asociación local de la ocurrencia y su medición | Recepción de Meta |
| `http_accepted` actual | Respuesta exitosa de sGTM y tag configurado con estado success | Cuerpo original de respuesta CAPI; procesamiento individual |
| Respuesta CAPI capturada para una petición de un evento | Aceptación HTTP y contador recibido de esa petición | Matching, descarte posterior, dedupe efectivo o atribución |
| Stats por evento/hora/origen | Actividad agregada del dataset en esa ventana | Que una fila corresponda al UUID concreto |
| Dataset Quality / EMQ | Calidad y diagnósticos agregados del tipo de evento | Puntuación o matching de una persona individual |
| Detalle de un evento visible en Test Events | Evidencia de recepción/estado mostrado para ese envío de prueba | Atribución comercial, elegibilidad de audiencia o matching individual |

La guía de verificación de Meta distingue los eventos recibidos de las etapas posteriores:
Overview puede contar recepción antes de deduplicación, controles de consentimiento y
procesamiento. Un contador recibido no debe elevarse a atribución.
[Verificación oficial de CAPI](https://developers.facebook.com/docs/marketing-api/conversions-api/verifying-setup/).
Stats expone agregaciones; Dataset Quality expone indicadores y feedback de calidad.
[Stats](https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/stats/),
[Dataset Quality](https://developers.facebook.com/docs/marketing-api/conversions-api/dataset-quality-api/).

## Respuesta CAPI y límite del recibo

La referencia devuelve `events_received`, `messages` y `fbtrace_id` en la respuesta habitual
de creación. No devuelve ahí una lista de UUIDs con su estado individual de procesamiento.
`events_received` es un contador de la petición; `fbtrace_id` es una referencia de traza de
esa respuesta, no una consulta documentada de atribución. No hay una operación de lectura
por `fbtrace_id` documentada en las superficies revisadas.
[Respuesta oficial de Events](https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/events/).

En un envío controlado que contiene exactamente un evento, conservar `events_received=1`
y vincular esa respuesta con el UUID que salió en esa misma petición mejora la prueba de
recepción individual. Esa vinculación la acredita nuestro transporte: el contador no es
un eco del UUID ni una lectura posterior dentro de Meta. Con un batch de varios eventos,
un contador aislado no permite asignar resultados individuales.

## Qué conserva el carril publicado, sin activar el cambio local

Esta sección describe el contrato publicado previo. Los archivos locales enlazados contienen
también la implementación preparada de recibos, cuyo rollout no está autorizado.

El código local y el snapshot saneado identifican el template oficial Meta fijado en
`a575edb31aa447469b855c3006ed9991dad711cf`; esta revisión no relee el contenedor live.

1. [Client sGTM](../../../scripts/measurement/sgtm-lead-client.js): autentica el ingreso
   `/efeonce/lead-enrichment`, valida UUID y sobre, ejecuta el contenedor y observa el estado
   del tag configurado. Devuelve únicamente `meta_tag_status` y una clase de error.
2. El [template oficial fijado](https://github.com/facebookincubator/ConversionsAPI-Tag-for-GoogleTagManager/blob/a575edb31aa447469b855c3006ed9991dad711cf/template.tpl)
   llama `gtmOnSuccess` ante HTTP 2xx. Su callback dispone del cuerpo, pero no lo analiza
   para conservar `events_received`, `messages` o `fbtrace_id`. También convierte
   `generate_lead` a `Lead`.
3. [Dispatcher](../../../src/lib/growth/measurement/dispatch.ts): exige respuesta HTTP
   exitosa de sGTM y `meta_tag_status=success`. El carril publicado no obtiene el recibo Graph;
   el código local preparado valida su header sin cambiar el ACK. `processed` cuenta intentos locales.
4. [Store](../../../src/lib/growth/measurement/store.ts): finaliza con CAS por lease y
   conserva `http_status`, clase segura, estado, intentos y fecha. No conserva recibos
   CAPI por intento en el carril publicado; `http_status=200` corresponde a sGTM. El código local
   prepara el append operacional por intento, sin migración aplicada.
5. [Modelo de traza](../../../scripts/meta/lead-trace-model.ts): expone ACK registrado y
   mantiene procesamiento, matching, deduplicación y atribución como `unknown`.

La API `addEventCallback` de Google entrega estado/tiempo y metadata de los tags; no entrega
automáticamente el cuerpo HTTP del proveedor. Para recuperarlo hay que instrumentar el punto
que realiza la petición saliente. [API oficial de sGTM](https://developers.google.com/tag-platform/tag-manager/server-side/api#addEventCallback).

La [auditoría del último envío de Performance](../../audits/growth/2026-10-17-performance-latest-lead-trace.md)
registra un ACK sGTM individual y un Lead servidor agregado en la hora correspondiente.
El agregado no contiene el UUID y no convierte esa correlación en prueba individual de Meta.
El cuerpo original CAPI de esa ocurrencia no está en el ledger descrito: no puede reconstruirse
retroactivamente desde el ACK. Esta revisión documental no repitió aquella lectura live.

## Test Events: alcance real

Meta indica abrir Events Manager → fuente de datos → Test Events, obtener el código real
y enviarlo como `test_event_code`. Permite observar el nuevo envío en esa herramienta.
Debe retirarse de los payloads productivos. La documentación vigente advierte expresamente
que los eventos con ese código no se descartan y pueden usarse para targeting y medición.
No presentar Test Events como sandbox, ni un formulario sintético como demanda comercial.
[Uso oficial de CAPI y Test Events](https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api/).

El código sólo se admite hoy por petición autenticada en el Client; no está fijado como
configuración de producción. Añadirlo ahora implicaría otro envío: no revela una ocurrencia
histórica que ya salió sin él. No reenviar ese Lead únicamente para hacerlo aparecer en la
ventana de pruebas, ni cambiar su UUID/tiempo para simular una ocurrencia nueva.

Si se autoriza una prueba futura, registrar dataset, UUID, nombre, hora, origen Server y el
estado efectivamente visible en la UI. Si la herramienta no muestra ese UUID, conservar la
limitación de correlación. Un estado visible allí describe esa evidencia de diagnóstico;
no acredita por sí solo matching, audiencia ni atribución a un anuncio.

## Implementación local preparada: recibo por evento e intento

La mejora mantiene el único sender CAPI dentro de sGTM. Instrumenta su petición saliente;
no añade un POST paralelo desde la CLI. Requiere un cambio gobernado del template/ingress,
persistencia y readers, con Preview, revisión y publicación conforme al
[ADR vigente de CAPI](../../architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md).

- Conservar la relación exacta entre UUID, destino, intento y lease. Mantener una petición
  de un evento para este ingreso y verificar que el `event_id` y `event_name=Lead` salen en
  el payload real. Los retries conservan identidad y tiempo.
- En el callback saliente capturar sólo campos permitidos: versión del contrato de recibo,
  dataset, UUID, nombre, hora, versión API solicitada, HTTP original de Graph,
  `events_received`, `fbtrace_id` acotado y códigos numéricos de error cuando existan.
  No guardar el body libre, mensajes crudos, token, URL autenticada, PII, hashes ni cookies.
- Validar JSON/tipos/tamaños. HTTP 2xx y `events_received=1` permite indicar
  `meta.receipt.reception=acknowledged`; recibo ausente o malformado queda explícitamente desconocido.
  No transformar una respuesta 2xx ambigua en rechazo ni crear un reenvío automático nuevo
  sólo por faltar telemetría; preservar los retries existentes sin ampliar su semántica.
- El tag preparado publica metadata saneada en una cabecera de respuesta reservada sólo para
  el ingreso backend autenticado; el dispatcher la valida y persiste. Google documenta
  `sendHttpRequest` para obtener cuerpo/status y `setResponseHeader` para responder antes
  de `returnResponse`. Está probado con mocks del template fijado; la compilación de GTM queda
  pendiente. Permisos acotados y queryPermission evitan que telemetría cambie el callback. No exportar
  el recibo por el carril público PageView.
  [APIs oficiales de sGTM](https://developers.google.com/tag-platform/tag-manager/server-side/api#sendHttpRequest).
- Registrar cada intento de forma durable y asociarlo mediante CAS, sin sobreescribir un
  recibo anterior ni aceptar una respuesta tardía para otro lease. La retención del recibo
  operacional debe conservarse separada del matching cifrado.
- Extender `leads trace` para distinguir ACK sGTM, recibo CAPI y observación UI independiente.
  Procesamiento individual, matching, deduplicación y atribución permanecen desconocidos
  salvo evidencia específica adicional; EMQ agregado no los sustituye.

Las pruebas locales cubren UUID distinto, contador inesperado, JSON inválido, timeout
posterior al envío, 4xx/5xx, dos peticiones concurrentes, respuesta tardía y ausencia de
recibo. Después: Preview sin envío, validación del diff y, sólo con autorización de la
prueba concreta, un envío controlado. Un test local o publish no certifica recepción Meta.

Persistencia preparada: `measurement_delivery.provider_receipts_json`, máximo cinco observaciones
append-only; finalización y recibo comparten CAS por evento, destino, lease y número de intento.
Header `x-efeonce-meta-receipt`; correlación backend mediante `x-efeonce-meta-attempt` y
`x-efeonce-meta-attempt-number`, fuera del payload CAPI. Opción `captureEfeonceReceipt` default OFF.
La CLI lee `meta.receipt` y tolera schema anterior sin inventar un recibo para los históricos.

Estado: **implementado/probado localmente; sin activar, publicar ni desplegar**. SQL parqueado fuera
del runner. No hay nuevo endpoint de lectura individual, schema aplicado ni evidencia Meta adicional.
