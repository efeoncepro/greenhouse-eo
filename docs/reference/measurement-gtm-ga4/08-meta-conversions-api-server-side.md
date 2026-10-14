# Meta Conversions API mediante GTM Server

> Canon operativo de CAPI/sGTM. Server6/Web5; matching TASK-2034 activado tras release completo PR254. Primera conversión comercial consentida post-flip todavía sin observar.
> Dirección elegida por el operador: [ADR](../../architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md).
> Estado vigente 2026-10-13: hosting existente recuperado en efeonce-group; consentimiento y transporte activos. §2 conserva el inventario inicial anterior al rollout.
> [Implementación vigente completa](10-growth-lead-matching-runtime.md) · [release y evidencia](../../audits/releases/2026-10-13-full-develop-matching-release.md).
> [Diagnóstico y recuperación histórica](../../audits/measurement/META_CAPI_RECOVERY_2026-10-13.md).

## 1. Separar Pixel, CAPI y contenedores

Meta Pixel ejecuta `fbq` en el navegador. CAPI envía eventos desde un servidor a Meta.
Una etiqueta Pixel en un contenedor **web** no instala ni restaura CAPI.
Para Efeonce, el operador eligió **GTM Server** como carril CAPI; conservar el contenedor
web para adquisición de señales cuando corresponda, sin confundirlo con el emisor CAPI.

Meta también admite CAPI directa desde backend mediante su SDK; GTM Server es nuestra
decisión, no una exigencia universal del proveedor. CAPI Gateway es una solución distinta:
su estado «no configurado» no demuestra ausencia de CAPI por GTM Server o backend.
Fuentes Meta: [template oficial](https://github.com/facebookincubator/ConversionsAPI-Tag-for-GoogleTagManager),
[SDK Node](https://github.com/facebook/facebook-nodejs-business-sdk),
[Gateway](https://github.com/facebookincubator/catalogue-of-api-solutions/blob/main/solutions/signals/conversions-api-gateway-control-panel.md).

## 2. Inventario observado, sin secretos

Inventario inicial13/10, anterior a la recuperaciónlive5 y al matching de §4.2. Es historia de diagnóstico; releer el estado live antes de operar:

| Recurso | Evidencia observada | Alcance de la prueba |
| --- | --- | --- |
| Web `GTM-NGHPGRLZ` | cuenta `6291647045`, container `218104216`, `usageContext=[web]`, versión live `4` | Sin tags Meta; no se hallaron claves `server_container_url`/`transport_url` dentro de sus parámetros de tags |
| `Efeonce Server` · `GTM-K2X4ZTTK` | cuenta `6068297031`, container `191286361`, `usageContext=[server]`, versión live `3`, workspace Default `4` | Existe configuración publicada de servidor |
| URL registrada del tagging server | `https://efeonce-gtm-tagging-183008134038.us-central1.run.app` | Hosting recuperado en `efeonce-group`; `/healthy` 200/ok, Preview funcional y asociación API releída; routing productivo pendiente |
| Client live | `GA4` · `gaaw_client` | Preview del draft reclamó y parseó seis solicitudes GA4; no prueba recepción productiva |
| Tag live | `FB_CONVERSIONS_API-708931297255942-Server-Tag`, tipo `cvt_191286361_3` | `pixelId` coincide con `708931297255942`; parámetro `apiAccessToken` no vacío, sin revelar valor ni probar vigencia |
| Trigger live | `FB_CONVERSIONS_API-708931297255942-Server-Trigger` · `always` | Activador amplio; pendiente revisar filtros de negocio y consentimiento |
| Template live | `Conversions API Tag`, id `3`; gallery `facebookincubator/ConversionsAPI-Tag-for-GoogleTagManager`, SHA `a495e1bb54b3b1fe6e7a9f10fc64aa12e8731428` | Procedencia del template instalada; pendiente comparar código/permisos con versión vigente |

El historial de «último evento servidor 6 de abril de 2026» y conteos de Meta proviene del
diagnóstico aportado por el operador; no se releyó Meta en esta auditoría. No se afirma que
el token esté vencido ni que la ausencia de transporte web sea la única causa: puede haber
otras fuentes, scripts del host o un sender backend fuera de ese contenedor.

`pnpm gtm:snapshot --check` compara **solamente el contenedor web** (ruta fija en
`scripts/gtm/snapshot.ts`). Tampoco `pnpm measurement:smoke` certifica CAPI: comprueba GA4.
La API distingue el tipo por `usageContext`; el nombre o ID público no basta.
[Container API de Google](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers).

## 3. Ruta y verdad de negocio

Ruta de matching después del cutover de TASK-2034 (estado de rollout en §4.2):

```text
Navegación consentida → sGTM Client GA4 → Meta PageView
Backend acepta formulario / confirma reserva → cola cifrada → worker → Client autenticado → Meta Lead
Espejo browser aceptado/confirmado → GA4 generate_lead → sGTM Client GA4 → forwarding GA4
Cola + client_id real + consentimiento ads/analytics → MP user_data sin events → Google UPD
```

El contenedor Server necesita solicitudes entrantes; publicarlo no captura visitas ni
formularios. Un Client reclama y convierte el protocolo en Event Data. Un POST arbitrario
no prueba procesamiento; `server_container_url` cambia transporte, no el tipo de contenedor.
Ver [ingreso a sGTM](https://developers.google.com/tag-platform/tag-manager/server-side/send-data).

- **PageView:** navegación real consentida, una ocurrencia por vista, hostname permitido y
  URL saneada. Sigue dependiendo de que esa señal salga del navegador.
- **Lead formulario:** aceptación en `greenhouse_growth.form_submission` y evento
  `growth.forms.submission_accepted`. La proyección de matching usa la transacción del source;
  un clic, submit intentado o agradecimiento no acreditan aceptación.
- **Reunión:** confirmación elegible del proveedor/ledger, con allowlist scheduler/surface.
  Apertura, selección, intento, error y replay no son conversiones nuevas. Preparar matching
  antes de descartar contacto del ledger HMAC; guardar sólo material cifrado48h en la proyección.
- **GA4:** conserva un solo espejo `gh_form_submission_accepted` o
  `gh_meeting_booking_confirmed → generate_lead`. La etiqueta de forwarding exige
  `Client Name=GA4`, por lo que el Client backend no envía una segunda conversión. Google UPD
  vincula user_data al client_id existente sin otro event. No usar receipt/provider IDs como
  user_id ni incluir hashes/contactos en dimensiones o dataLayer.
- **Identidad Meta:** UUID/timestamp durable por source_kind/source_id y destino. No exponer
  IDs internos ni reutilizar HMAC de negocio. La recuperación inicial usaba el espejo GA4
  como transporte Meta; se retiran sus triggers Lead12/17 al activar el backend. No mantener
  dos emisores independientes. Si se introduce Pixel complementario, necesita identidad
  compartida/dedupe y autorización propia.
- Excluir postulaciones, rechazos, spam y eventos de interacción; analítica no concede
  consentimiento publicitario. Consultar las skills dueñas de Forms/Meetings.

El template oficial normaliza `page_view→PageView` y `generate_lead→Lead`. El ingreso backend
propio exige Client compatible, autenticación, validación, allowlists y límites; ver §4.2.

## 4. Contrato mínimo y tratamiento de datos

| Campo CAPI | Regla de implementación Efeonce |
| --- | --- |
| `event_name` | `PageView` o `Lead`, case exacto; no enviar `generate_lead` como nombre Meta |
| `event_time` | Momento real en segundos Unix; conservar en retries, no sustituir por la hora de reenvío |
| `event_id` | Identidad estable por ocurrencia; browser usa `eventID`; mismo ID y nombre para la misma conversión |
| `action_source` | `website` para estos eventos; no describe el canal técnico browser/server |
| `event_source_url` | URL pública saneada del host donde ocurrió; no URL interna del tagging server, secretos ni queries personales |
| `user_data` | Sólo campos autorizados y necesarios, con normalización/hashing según Meta; nunca datos inventados |
| `test_event_code` | Sólo canary/Test Events, en raíz del request junto a `data`; retirar para producción |

No fijar versión Graph API, ventanas de dedupe, límites ni expiración de tokens desde memoria;
validar contrato vigente y template **instalado** antes de ejecutar. Fuentes verificadas:
[template Meta](https://github.com/facebookincubator/ConversionsAPI-Tag-for-GoogleTagManager/blob/main/template.tpl),
[Event](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/event.py),
[EventRequest](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/event_request.py),
[UserData](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/user_data.py).

- Email/teléfono autorizados se normalizan/hash según campo; IP, UA, `fbp` y `fbc` no
  se hash por defecto. No inventar `fbc` sin cookie/clic real. `lead_id` de Meta Lead Ads
  no es el ID interno de un formulario Greenhouse.
- No transportar email/teléfono mediante GA4 ni ampliar el dataLayer para ello. Usar ingreso
  servidor separado y transformaciones/allowlists por destino; comprobar que GA4 no reciba datos Meta.
- Política operativa: consentimiento publicitario denegado o desconocido → **no enviar a Meta**.
  Evaluar en origen y servidor. Consent Mode adapta tags Google; no demuestra que el template
  Meta respete automáticamente ese estado. Probar el gate Meta explícito.
- Hashing, server-side, dominio propio, `opt_out` y Limited Data Use no sustituyen autorización.
  Evitar texto libre, datos sensibles, cookies arbitrarias y querystrings con PII.
- Token sólo servidor. No registrar valores ni serializar exports completos de tags/templates:
  el tag existente tiene `apiAccessToken`. Un snapshot servidor debe redactar secretos antes
  de persistir. No rotar ni reemplazar el token porque exista un parámetro no vacío.
- Registrar publisher, repositorio, SHA, permisos, Graph API y opciones de enriquecimiento/cookies.
  La gallery distribuye templates, no certifica su behavior. No actualizar SHA ni activar
  cookie extension/user enrichment automáticamente.

### 4.1. Lead utilizable para remarketing — requisito confirmado 2026-10-13

El operador requiere coincidencia de personas y segmentación comercial, además de recepción
de eventos. **Estado: desplegado y activado, Server6/Web5, source y worker con flags ON.**
La primera conversión comercial consentida con matching post-flip sigue sin observarse.
La recuperación histórica5/5 sólo transportaba IP/User-Agent. Ahora el backend prepara
contactos validados y contexto consentido; `fbp`/`fbc` sólo si reales y disponibles.
El endpoint run.app no implica acceso a cookies de los hosts públicos.

| Información | Contrato de la ampliación |
| --- | --- |
| `user_data.em` | Email real validado, normalizado y SHA-256 sin salt conforme al SDK Meta; nunca reutilizar el hash interno de dedupe |
| `user_data.ph` | Teléfono real, si se recogió y validó, con código internacional y normalización Meta antes de SHA-256; omitir si no existe |
| `user_data.fn` / `ln` | Nombre/apellido separados y validados cuando existan; normalizar/hash según Meta, sin inventar apellidos ni dividir un nombre libre por posición |
| `user_data.fbp` / `fbc` | Contexto publicitario real capturado con consentimiento; `fbc` sólo desde cookie o clic `fbclid` real; no inventar IDs ni depender de leer cookies cross-domain |
| IP / User-Agent | Contexto original del visitante cuando esté disponible; no sustituirlo por IP/UA del backend |
| `custom_data` | Allowlist comercial explícita: `lead_source`, `form_slug`, `surface_id` y `scheduler_key` según origen; sólo clasificadores gobernados, nunca respuestas/texto libre |

`form_slug`/`lead_source` presentes en Event Data no se copian automáticamente a Meta: la
plantilla oficial instalada sólo añade propiedades arbitrarias desde `custom_properties`.
El mapper construye `custom_properties` como JSON string: el template pin usa `.indexOf()` antes del control de tipo; un objeto produce error. Conservar `Lead`, URL limpia y
momento/ID de la misma ocurrencia. `external_id` queda fuera hasta definir identidad estable
y autorizada; `event_id` identifica una conversión, no una persona.

**Flujo publicado y activado en el mismo GTM Server:**

1. Adjuntar al POST público de Forms/Meetings un contexto separado de publicidad con estado
   granular HubSpot/GPC y versión/fuente de consentimiento. Antes del release, el runtime sólo recibía
   `consent`/`consentCheckboxes`; Meetings, procesamiento y comunicaciones. Ninguno concede
   publicidad por inferencia. Legacy/sin señal publicitaria = unknown = sin enriquecimiento.
2. Después de aceptación/confirmación real, construir en Greenhouse la proyección mínima
   de coincidencia desde los campos validados. Meetings debe hacerlo antes de descartar el
   contacto: su ledger HMAC no conserva email/nombre recuperables. Capturar snapshot e ID
   durable para retries mediante contrato transaccional propio, sin PII cruda en outbox/logs.
3. Entregar esa proyección por ingreso autenticado exclusivo de servidor a sGTM, con Client
   y allowlists propios. No pasar contactos ni hashes por eventos GA4 ordinarios, dimensiones, dataLayer o URLs. Google UPD usa su contrato dedicado descrito abajo.
   Mantener el token de Meta exclusivamente en la etiqueta del servidor existente.
4. Elegir un solo emisor Meta de Lead al hacer el cutover. El espejo GA4 de aceptación puede
   continuar, pero no debe emitir otro Lead CAPI independiente. El nonce browser de reuniones
   no es identidad durable del backend: compartir identidad o retirar su envío Meta antes de
   activar el nuevo. Retries conservan ID/tiempo y replay no crea otra conversión.
5. Probar hashes con fixtures sintéticas, missing/denied/GPC, errores, replay y aislamiento
   GA4. Después Preview + Test Events con `em`/`ph` presentes cuando corresponda y una única
   conversión; publicar mediante el flujo aprobado y verificar recepción live.

Las audiencias y sus reglas se configuran aparte en Meta. Un evento recibido no prueba tamaño
de audiencia, coincidencia efectiva ni entrega de remarketing. Una lista CRM es otro carril:
CAPI no entrega una libreta de emails legibles. No bloquear la conversión comercial por fallo
de medición ni enviar datos históricos cuyo consentimiento publicitario no esté acreditado.
Fuentes de campos/normalización: [SDK UserData](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/user_data.py),
[SDK Normalize](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/normalize.py)
y [plantilla instalada](https://github.com/facebookincubator/ConversionsAPI-Tag-for-GoogleTagManager/blob/a575edb31aa447469b855c3006ed9991dad711cf/template.tpl).

## 5. Recuperación paso a paso, sin publicar durante discovery

1. Releer inventario con acceso GTM de sólo lectura, por ambas cuentas; recuperar el servidor
   existente antes de crear otro. Conservar versiones/configuration y evidencias **saneadas**.
2. Inspeccionar metadata de hosting, proyecto/región, preview/tagging, IAM, endpoint,
   DNS/TLS/dominio propio, logging redacted, métricas y costo actual. `run.app` registrado
   no prueba configuración first-party. No aprovisionar, cambiar IAM/DNS ni escalar por inferencia.
3. En Preview de servidor seguir request entrante → Client que reclama → Event Data →
   trigger → tag → POST a Meta → respuesta. Encontrar el primer eslabón que falla; revisar
   filtros `always`, token/dataset y permisos sin imprimir credenciales.
4. Determinar fuentes actuales de ambos hosts y backend. Diseñar PageView consentido y
   Lead anclado al espejo de aceptación real, con consentimiento, validación, dedupe y
   fallo de medición independiente del éxito del submit. Crear cambios en workspaces aislados
   basados en la versión live correcta de **cada** contenedor; no publicar WIP ajeno.
5. Revisar template instalado y mapping; construir/previewar ingress y tags. No inventar shapes
   server desde plantillas `gaawe` web. Los readers tipados actuales de Greenhouse no cubren
   automáticamente Clients/templates ni snapshot servidor; registrar esa limitación.
6. Ejecutar canary con `test_event_code`, evidencia saneada de request y respuesta
   (`events_received`, `messages`, `fbtrace_id`), y Test Events con origen **Server**.
   No usar datos de clientes para un canary ni activar entregas HubSpot/CRM inadvertidas.
7. Presentar diff, versiones, costo/config, resultados de QA y rollback. Publicar sólo con
   aprobación explícita sobre esos cambios. Este pedido de documentación no autoriza publish,
   despliegue, provisión, secretos ni envío de conversiones.
8. Retirar código de prueba, publicar coordinadamente y verificar tráfico productivo en Meta;
   registrar versión y hora por contenedor, readback de ambos dominios y pendientes en tracking plan.

Cloud Run: Google documenta servicios separados de **preview** y **tagging** con configuration
del contenedor y URL de preview. Dimensionar disponibilidad/costo con datos actuales;
no fijar un presupuesto ni desactivar todo logging automáticamente. `/healthy=ok` sólo
demuestra salud. [Hosting](https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide),
[dominio propio](https://developers.google.com/tag-platform/tag-manager/server-side/custom-domain),
[debug](https://developers.google.com/tag-platform/tag-manager/server-side/debug),
[consent](https://developers.google.com/tag-platform/tag-manager/server-side/consent-mode),
[transformations](https://developers.google.com/tag-platform/tag-manager/server-side/transformations),
[gallery](https://developers.google.com/tag-platform/tag-manager/templates/gallery).

## 6. Criterios de verificación

| Prueba | Evidencia necesaria |
| --- | --- |
| PageView en ambos hosts | Una navegación elegible → un evento; URL correcta, ingreso sGTM y recepción Server en Meta |
| Lead comercial aceptado | Correspondencia con aceptación persistida, espejo accepted/generate_lead, ingreso sGTM y recepción Server |
| Reunión confirmada | Una reserva elegible → un generate_lead meeting_booking → un Lead Server; reconciliar con ledger |
| Apertura/selección/intento/error/replay de agenda | Cero nueva conversión; comprobar contrato de identidad sin exponer receipt |
| Error, clic, postulación o spam | Cero Lead CAPI |
| Consentimiento denegado/ausente | Cero envío Meta; probar también que el backend aplica el gate |
| Retry/replay | Mismo nombre, tiempo e ID; no duplicar negocio ni efectos downstream |
| Pixel + CAPI, si se adopta dual | Nombre e ID iguales, recepción de ambos carriles y deduplicación leída en Meta |
| Datos | Nada de token, PII o payload crudo en logs/artefactos; campos Meta no llegan a GA4 |
| Cierre productivo | Versiones publicadas correctas, sin test code, readback live separado del canary |

HTTP 200, tag disparado, `/healthy`, GA4 realtime y snapshot web no certifican entrega CAPI.
Recepción no demuestra atribución publicitaria, match quality ni efectividad comercial.

## 7. Diagnóstico previo a publicación (histórico 2026-10-13)

Este apartado conserva el punto previo de la investigación. No es el inventario servido:
consultar [estado vigente](#estado-vigente--cierre-autorizado-2026-10-13) y [runtime](10-growth-lead-matching-runtime.md).

[Auditoría](../../audits/measurement/META_CAPI_RECOVERY_2026-10-13.md): hosting del contenedor
existente recuperado en `efeonce-group`; tagging/preview min 0/max 1, 1CPU/512MiB,
instance-based, salud 200/ok. No proyecto nuevo ni cuota Google solicitada. Workspaces server 5
y web 7 siguen sin publicar (live 3/4): Meta v25, reenvío GA4 `sgtmgaaw`, transporte Think y
gates de consentimiento/UUID. Transformaciones exclusivas Meta limpian page_location y excluyen
page_referrer/control fields; Preview valida URL limpia de ambos hosts y vacío para tercero
con cero envíos. Salida positiva transformada pendiente. Site Kit requiere routing propio.

Seis negativos en Preview: denegado, hostname ajeno, form no comercial, reunión sin ID,
ID literal `undefined`, PageView sin consentimiento. Cero salidas Meta/GA4 con marcador QA
que sólo bloquea forwarding GA4. Antes de corregir `.+` por UUID anclado, **un Lead sintético
sin ID fue aceptado por Meta** (`events_received=1`), sin Test Events code. No fue una reserva
ni submission real; no acredita rollout. No repetir positivos sin código real de Test Events.
Pendientes: fuente real de consentimiento, routing inicial WordPress/Think y primer PageView,
release del renderer, canary positivo controlado, forwarding GA4, replay y aprobación/publicación.

## 8. Frescura y límites de fuentes

Tres subagentes revisaron Meta, Google y repo. Los enlaces Google y los repositorios oficiales
Meta se consultaron el 2026-10-13. `developers.facebook.com` respondió 429 y Business Help
requirió login; no se afirma lectura de esas páginas ni términos actuales. La evidencia Meta
verificable procede de README/código oficial, no de tutoriales de terceros. Las URLs `main`
son móviles: reverificar al implementar y contrastar con el SHA instalado.


## Estado vigente — cierre autorizado 2026-10-13

Server live6/Web live5, matching activado tras PR254/main d692ab51dc48 y SQL post-release.
[Readbacks, runtime y límites](../../audits/releases/2026-10-13-full-develop-matching-release.md).
HubSpot categorías y routing WP/Think activos.
[Consentimiento y distribución del bridge](09-hubspot-consent.md) gobiernan adquisición,
PV por destino, UUID sender compatible y retiro. Positivos Server procesados en Test Events,
10 negativos sin salidas y PageView real completó tags Meta/GA4 desde ambos hosts.
El SDK usa `evnid` para event_id; Client GA4 normaliza. No duplicar un parámetro por un
falso negativo al buscar sólo ep.event_id. Renderers con contexto publicados en Production;
la primera aceptación/reserva comercial consentida tras matching sigue sin observarse.
Evidencia/rollback en auditoría; estado previo descrito arriba es histórico, no el bloqueo actual.


### 4.2. Implementación de matching y Google UPD — 2026-10-13

Detalle implementado y frontera con la propuesta de configuración: [runtime](10-growth-lead-matching-runtime.md).
Las listas de formularios y scheduler/surface siguen fijas tanto en backend como en Client sGTM;
la [configuración administrable](../../architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md)
es una propuesta pendiente de GO, sin implementación ni publicación autorizadas.

Dueño: [TASK-2034](../../tasks/in-progress/TASK-2034-growth-lead-matching-meta-google.md).
`src/lib/growth/measurement` prepara proyecciones desde Forms aceptados/Meetings confirmados.
Contexto publicitario opcional estricto; missing/denied/stale/GPC y header `Sec-GPC: 1` vetan
matching. Contactos no entran en dataLayer. Captura transaccional con SAVEPOINT; fallo de
instrumentación no cambia aceptación ni entrega comercial. AES-256-GCM con AAD por eventId,
UUID/timestamp persistidos, unique source, retries por destino (máximo 5/24 h), lease CAS y
retención cifrada48 h. Worker existente `/growth/forms/dispatch`, cada 2 min; fallo de medición
se aísla del Forms dispatcher y configuración fallida de un destino no detiene el otro.

Normalización Meta y Google separada: email Meta conserva puntos Gmail; Google los elimina.
Teléfono Meta hashea dígitos internacionales sin `+`; Google conserva `+` E.164. Nunca adivinar
país, reutilizar hash HMAC interno ni usar hashes SDK con appendix (plain 64 hex para el template pin).
Google MP admite **user_data sin events**: asocia hashes dedicados a client_id real, con ads
consent GRANTED y analytics separado. No crea otro generate_lead ni inventa user_id/client_id.
[Contrato oficial UPD](https://developers.google.com/analytics/devguides/collection/ga4/uid-data).

GA4 correcto: cuenta 252968286/propiedad 486264460/stream 10593675149/G-KYPPY57M14,
`jreyes@efeoncepro.com`. UPD y reconocimiento general activados tras autorización; colección
automática OFF. Link Ads 9531478329 y personalización existentes. Siete audiencias 90 d creadas
(AEO, SEO, proyectosweb, contacto, social, reuniones, comerciales) y releídas; condiciones
form_slug/scheduler_key/lead_source vinculadas al **mismo** generate_lead. Customer Match
no requiere activar Google Signals. Audiencias creadas no prueban volumen/elegibilidad/serving.

sGTM workspace 8: Client 31/template 30/trigger 33, bearer 256 bit cuyo digest SHA256 se compara
server-side; sólo `/efeonce/lead-enrichment`, schema/campos/hashes/consent/alcance comercial.
Client HTTP 200 sólo con tag 6 status success, no se infiere Processed de ese ack.
Preview/Test Events mostró em/ph/fn/ln + clasificadores de ambos hosts; seis negativos bloqueados.
Replay conserva ID/tiempo; Test Events muestra cada recepción y no demuestra dedupe de atribución.
Publicado **Server6/Web5**, sin test code; triggers Meta Lead12/17 retirados en la misma versión.
Versión congelada verificada antes del publish23:38:57Z. Negativos live400/401 sin disparar Meta.

Orden aplicado (repetir sólo con readback actual, nunca por snapshot): release source/worker/renderer →migración post-release →refs pinned →
publicar Client y quitar triggers Meta Lead 12/17 atómicamente→activar destinos/retención del
worker→activar captura y redeploy Vercel→readbacklive. Captura se habilita última.
El forwarding GA4 exige `Client Name = GA4`; el Client autenticado de Lead queda fuera,
aunque su event_name sea generate_lead. Conservar esa frontera al crear la versión.
Validar el artefacto congelado (Meta, Client/template y forwarding GA4) antes de publicar;
si falla tras create_version, recuperar esa versión/recibo, nunca repetir ciegamente el builder.
Nunca activar backend Meta mientras exista el emisor Lead browser con otroID. PageView 11 y
GA4 mirror continúan. Flags defaultOFF; retention ON permanece durante rollback. No rotar
payloadkey antes de expirar ciphertext48 h. Secretos versión 1 en proyecto efeonce-group; sólo
portal SA tiene grant por secreto. Refs configuradas y resueltas en Ops00775-fnh, canary200
unavailableDestinations=[]; Meta/Google/retención true allí y en GitHub repo vars. Captura
Vercel true exacta y dpl_BxU6V7EGpo5R3REbazWxhXLsrVZT READY/alias canónico. SQL
20261013233429748 aplicada, claims/leaseCAS/retención probados con rol greenhouse_app.
No se ejercitó negocio real post-flip ni se acredita serving/calidad por fixtures Test Events.
