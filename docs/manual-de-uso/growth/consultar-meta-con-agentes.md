# Consultar y operar Meta con agentes

Contrato: `meta-agent.v2`. [Decisión vigente](../../architecture/GREENHOUSE_META_AGENT_WRITE_CLI_DECISION_V1.md).
[Foundation y evidencia inicial](../../architecture/GREENHOUSE_META_AGENT_CLI_DECISION_V1.md).
[Capacidad funcional](../../documentation/growth/meta-agent-cli.md).
[Activación de IDs nativos HubSpot](guardar-identidad-nativa-hubspot.md) (pendiente de rollout) y
[límites de verificación individual Meta](../../documentation/growth/meta-individual-event-verification.md).
[Recibos CAPI por evento](conservar-recibos-meta.md): código local preparado, sin activar/desplegar;
`meta.receipt` sólo muestra evidencia persistida, no reconstruye históricos desde stats.
La CLI local consulta y opera el perfil Efeonce. La medición CAPI y las políticas se operan por sus
[comandos propios](configurar-medicion-conversiones.md).

## Antes de consultar

Ejecutar desde `greenhouse-eo`, con Node/pnpm y `gcloud` disponibles. La identidad Google local
necesita acceso al secreto existente
`projects/efeonce-group/secrets/efeonce-meta-agent-token/versions/latest`.
El agente no debe copiar el valor al chat, shell, `.env`, argumentos o archivos. La CLI lo resuelve
en memoria; también mantiene privado el token de Página. No crear ni renovar credenciales por
inferencia ante una denegación.

```bash
pnpm --silent meta discover
pnpm --silent meta auth verify
pnpm --silent meta auth permissions
```

`discover` es estático y funciona sin credenciales. `auth verify` verifica identidad y vínculo al
Business; `auth permissions` muestra permisos efectivos saneados. Un permiso concedido no prueba
que una consulta o escritura esté habilitada. Si falla identidad/Business, detener la lectura.
El principal Graph esperado es Greenhouse `122100132867513483`, distinto del ID de Business Suite
`61595404505049`. La app declarada del perfil es Efeonce Measurement `1665579481811196`; ese dato
no prueba por sí solo el binding del token.

El perfil usa Graph `v25.0`, Business Efeonce Group `2764962567067087`, cuenta
`act_660841415768357`, Pixel/dataset `708931297255942`, Página `106570685420996` e Instagram
`17841437175569224`. Son IDs Graph; los identificadores de selección de Business Suite pueden
ser distintos. No reemplazar el perfil para consultar otra cuenta sin verificar propiedad y autorización.

## Comandos

```bash
pnpm --silent meta account get
pnpm --silent meta campaigns list --pages 2 --limit 25
pnpm --silent meta adsets list
pnpm --silent meta ads list
pnpm --silent meta insights get --days 30 --level campaign
pnpm --silent meta pixel get
pnpm --silent meta pixel diagnostics --pages 1 --limit 25
pnpm --silent meta events stats --days 7 --source server --aggregation event
pnpm --silent meta events stats --days 7 --source server --aggregation host --event Lead
pnpm --silent meta events quality
pnpm --silent meta page get
pnpm --silent meta posts list
pnpm --silent meta posts list --content
pnpm --silent meta comments list --post-id PAGEID_POSTID
pnpm --silent meta instagram get
pnpm --silent meta instagram media
pnpm --silent meta instagram comments list --media-id ID_MEDIA_PROPIA --content
pnpm --silent meta conversations list --platform facebook
pnpm --silent meta conversations list --platform instagram
```

Reemplazar `PAGEID_POSTID` por el ID devuelto para un post de la Página del perfil; no es una URL.
Posts, comentarios y conversaciones respetan la proyección de campos permitidos. No hay comando de
export de identidad individual, lectura de bodies privados, mensajes, activación publicitaria o CAPI de prueba.
Las escrituras públicas del apartado siguiente tienen payload, preflight y receipt propios.
Posts, comentarios e Instagram media muestran metadata por defecto. `--content` solicita texto o
caption público para esas lecturas, incluidos comentarios de media propia Instagram; no habilita
bodies o participantes de conversaciones. `instagram comments list` exige `--media-id` y ownership
verificado; `pixel diagnostics` consulta `da_checks` con paginación acotada y no repara configuración.

| Consulta | Límites |
| --- | --- |
| Listas | `--pages` 1–10, default 1; `--limit` 1–100, default 25; `--cursor` opaco cuando corresponda. |
| `insights get` | `--days` 1–1095, default 30, o `--since YYYY-MM-DD --until YYYY-MM-DD`; `--level account\|campaign\|adset\|ad`. |
| `events stats` | `--days` 1–7, default 7; `--source server\|browser\|all`; `--event` opcional. |
| Agregación de stats | Catálogo cerrado de 16 agregaciones SDK25; consultar `discover`/`metrics list`. |

No convertir una página en inventario completo. Revisar `pagination.hasMore` y el cursor devuelto;
continuar con el mismo comando/ventana si hace falta. El resultado parcial y los fallos de páginas
posteriores quedan explícitos. No seguir URLs crudas devueltas por Meta ni ampliar páginas sin límite.
En insights sociales, la continuación puede usar fechas: el adapter valida origen HTTPS, activo y edge,
y reconstruye el GET en la versión fija del perfil. Nunca sigue el token, host o versión de la URL.
Si hay `pagination.error` y no hay `nextCursor`, no existe una continuación segura: no adivinar
el cursor ni reiniciar y sumar resultados. Si una página falla antes de aceptar sus datos, el
cursor de esa página permite reintentar sin dar sus filas por leídas.

## Métricas: seleccionar o recorrer el catálogo

```bash
pnpm --silent meta metrics list
pnpm --silent meta insights get --days 30 --level campaign --fields impressions,reach,clicks,spend
pnpm --silent meta metrics list --surface ads
pnpm --silent meta metrics list --surface instagram
pnpm --silent meta insights all --days 7 --metric-limit 10 --metric-offset 0
pnpm --silent meta instagram insights --metrics reach --period day
pnpm --silent meta instagram media insights --media-id ID_MEDIA_PROPIA --metrics reach --period lifetime
```

`metrics list --surface ...` admite `all`, `ads`, `pixel`, `dataset`, `page`, `instagram` e
`instagram-media`. Incluye 200 campos Ads, 81 breakdowns, 16 action breakdowns, 16 agregaciones pixel y 27 valores IGMetric
del SDK oficial 25.0.0. ALL significa catálogo completo iterable con disponibilidad por campo;
no significa descarga de datos individuales del pixel. El catálogo no garantiza soporte de cada
campo en esa cuenta, nivel, período o combinación. `ID_MEDIA_PROPIA` se sustituye por un ID de media
Instagram obtenido para la cuenta del perfil. Los ejemplos expresan consultas, no garantizan soporte.

Page no tiene un enum de nombres de métricas en el SDK: `--surface page` explica ese límite y
`page insights --metrics <CSV>` exige nombres concretos resueltos con el proveedor. No admite
`--metrics all`. `instagram insights --metrics all` e `instagram media insights --metrics all`
exploran las 27 métricas mediante consultas independientes, con `--metric-limit` 1–30 (default diez),
`--metric-offset` y `--cursor` como alias de offset. No admiten `--pages` en modo all: una página por
métrica; continuar la página pendiente con el mismo comando, `--metrics METRICA` y su cursor Graph.

`insights get --fields <CSV>` admite hasta treinta campos distintos. Las opciones `--breakdowns`,
`--action-breakdowns`, `--attribution-windows` y `--action-report-time` usan valores del catálogo;
`--time-increment` admite `all_days`, `monthly` o 1–90. Se puede usar `--days` 1–1095 (default 30)
o el par `--since/--until` con rango inclusivo de hasta 1095 días, sin mezclarlos. Si Meta rechaza una combinación, conservar ese estado y la consulta;
no convertirla en cero ni afirmar falta de actividad. `insights all` consulta campos por separado:
`--metric-limit` default diez, máximo treinta por invocación. Continuar con el `nextMetricOffset`
devuelto como `--metric-offset`; `--cursor` en este comando es un alias del offset, no un cursor
Graph. No se admite `--pages` en `insights all`. Sólo se solicita una página por campo: si hay más filas, continuar su cursor mediante
`insights get --fields CAMPO` y los mismos filtros. Conservar estados `available`, `no_data`,
`partial`, `field_not_returned`, `partially_returned`, `unavailable` o `denied`; un lote no certifica
todo el catálogo. `fieldCoverage` distingue filas que incluyen la métrica pedida de filas que la omiten. Un rechazo de autoridad
detiene el recorrido. Los probes Ads a nivel campaign/adset/ad conservan el ID de entidad junto al campo solicitado;
no se combinan filas por posición. `catalogTraversalComplete` sólo indica que se alcanzó el final del catálogo;
no implica que todos sus campos hayan sido accesibles o que sus datos estén completos.

`page insights` e `instagram insights` requieren `--metrics <CSV>` y admiten `--period`,
`--since/--until` opcionales y `--pages/--limit/--cursor`. Instagram añade `--metric-type`,
`--timeframe` y `--breakdown` conforme al catálogo. `instagram media insights --media-id <ID>`
comprueba ownership y admite `--metrics`, `--period`, `--breakdown` y paginación. Las opciones de
lote `--metric-limit/--metric-offset` son exclusivas de `--metrics all`, tanto para cuenta como media. Ninguno admite
`--days` en estos comandos sociales. Los períodos disponibles en el catálogo son `day`, `days_28`,
`lifetime`, `month`, `total_over_range` y `week`; su compatibilidad concreta la decide Meta.
La ventana calendario de Ads, períodos sociales y ventana móvil UTC del pixel son cosas distintas.
No sumar métricas de distinta atribución/denominador. No existe descarga de `user_data` individual del
pixel: stats y calidad son agregados. `events quality` conserva los objetos anidados; campos omitidos
siguen no disponibles. `pixel diagnostics` lee los DA checks expuestos por Meta, conservando errores,
denegaciones o indisponibilidad. La existencia del endpoint no garantiza diagnóstico para cada cuenta.

## Rastrear un lead: Forms → medición → HubSpot

[ADR del rastreo](../../architecture/GREENHOUSE_META_LEAD_TRACE_CLI_DECISION_V1.md). Son comandos de
sólo lectura, separados de las escrituras de Ads/social. No crean leads, contactos, conversiones ni
reintentos de entrega. No requieren un token Meta nuevo para inspeccionar la fuente persistida.

Si se conoce el email, guardarlo en un JSON regular privado `0600` fuera del repo. No pasarlo como
argumento, imprimir el archivo o copiarlo a logs. Estructura ilustrativa:

```json
{"email":"persona@example.org","since":"2026-10-10T00:00:00Z","until":"2026-10-17T00:00:00Z"}
```

```bash
pnpm --silent meta leads find --input /Users/jreye/Documents/Meta-Efeonce-Connection/lead-lookup.json --limit 10
pnpm --silent meta leads trace --submission-id fsub-UUID_DEL_CANDIDATO
pnpm --silent meta leads trace --event-id UUID_DEL_EVENTO
pnpm --silent meta leads trace --submission-id fsub-UUID_DEL_CANDIDATO --source-only
```

Los placeholders se sustituyen por IDs reales del resultado; no ejecutar literalmente `UUID_DEL_*`.
`leads find` sólo devuelve candidatos con `submissionId`, `formId`, `formVersionId`, `surfaceId`,
`status` y `createdAt`, sin escoger uno por proximidad.
Ventana default siete días, máximo 31; `since`/`until` aceptan fechas UTC o timestamps ISO con zona.
`--limit` 1–20, default diez. Si `hasMore=true`, acotar la ventana o revisar candidatos; no afirmar
que se agotó el historial. La búsqueda sólo cubre Forms persistidos en esa ventana, no intentos que
no llegaron al backend.

`leads trace` exige exactamente un selector: submission ID `fsub-UUID` **o** UUID de evento persistido.
`--source-only` consulta fuente, consentimiento, proyección, colas e intentos locales y omite HubSpot;
no admite `--pages/--limit`. Sin ese flag, la verificación remota usa `--pages` 1–10 (default tres)
y `--limit` 1–50 (default cincuenta), con límite adicional de cincuenta submissions por página de
HubSpot. Estos controles acotan cobertura; el cursor del proveedor no es una URL ejecutable.
Cada destino HubSpot real de los intentos debe quedar verificado; un mapping inválido u otro
destino sin consultar aparece en `coverage.uncheckedHubspotDestinations` y obliga a cobertura parcial.

El lector usa la conexión PostgreSQL canónica, rol runtime `greenhouse_app` y transacción READ ONLY.
No usa credenciales de migrator/ops ni agrega pools, roles o feature flags. El companion del store
busca el hash canónico de email; únicamente si ese hash es NULL puede contrastar el único campo
tipado email del formulario. Esa identidad y los targets HubSpot permanecen en memoria; no se
incluyen en JSON, hashes de salida ni payloads descifrados. Los errores de dependencias se sanean
antes de salir del proceso.

Para HubSpot se conserva el resolver de token canónico y se verifica primero el portal Efeonce
`48713323`. Los scopes pertinentes son `forms` para el historial y `crm.objects.contacts.read`
para el contacto. Si sólo existe el recibo sintético local y no un ID de ocurrencia nativo persistido, una coincidencia
de historial remoto permanece correlación. Un 401/403 produce indisponibilidad; no autoriza reconectar, ampliar scopes,
cambiar portal o sustituir un resultado negado por un contacto de otra cuenta.

| Bloque de la traza | Lectura correcta |
| --- | --- |
| Fuente | Si existe la ocurrencia y cuál es su lifecycle/aceptación. No acredita calidad comercial. |
| Consentimiento | Snapshot y policy revision observados; sin conversión no se deduce consentimiento denegado. |
| Proyección | Sólo presencia de payload cifrado; no se descifra ni acredita matching válido. |
| Entrega Meta | Cola pendiente/reintentando/error/ACK local. `http_accepted` es ACK del tag servidor sGTM. |
| Procesamiento Meta | Matching, deduplicación, atribución y visibilidad individual siguen desconocidos. Stats agregados no los prueban. |
| HubSpot local | HTTP/intento registrado; `hsforms-<submission_id>` es un recibo local sintético, nunca native ID. |
| HubSpot remoto | `confirmed` requiere ID de ocurrencia nativo; email/form/tiempo devuelve `correlated`, varios matches `ambiguous`; parcialidad o denegación no son ausencia. |
| Contacto CRM | Encontrarlo por identidad es una evidencia separada; pudo existir antes. No prueba que este envío lo creó ni acredita el historial del formulario. |

La salida `meta-lead-trace.v1` separa cada etapa, issue codes y limitaciones. Revisar `coverage` y
códigos de salida: una traza parcial no declara todo el recorrido confirmado. Incluso una traza
completa de evidencia local no transforma el ACK en procesamiento Meta observado. No redispatchar,
crear una conversión de prueba, cambiar contactos o descifrar matching para «cerrar» una etapa.

## Preparar y aplicar una escritura concreta

Comandos admitidos: `campaigns create`, `adsets create`, `creatives create`, `ads create`,
`posts publish`, `photos publish`, `instagram container create`, `instagram publish`,
`comments reply` e `instagram comments reply`. `discover` muestra su esquema/alcance vigente.
No hay flag `--plan`: preparar es el comportamiento por defecto.

1. Tener autorización previa para el contenido, valores y efecto reales. Preparar los payloads en
   Documents u otra carpeta privada fuera del repo, con permisos `0600`; no incluir credenciales.
2. Ejecutar el comando con `--input` para validar y obtener preview, destino, preflight fresco y hash.
3. Revisar el plan y comprobar que coincide con la autorización existente. Si esa autorización ya
   cubre expresamente la operación y sus valores, no pedir una segunda aprobación sólo por los flags.
4. Aplicar el mismo payload con hash y receipt exclusivo. No reutilizar un receipt anterior.

Ejemplo de flujo para una campaña cuya carga JSON ya contiene los campos nativos aprobados:

```bash
pnpm --silent meta campaigns create --input /Users/jreye/Documents/Meta-Efeonce-Connection/campaign.json
pnpm --silent meta campaigns create --input /Users/jreye/Documents/Meta-Efeonce-Connection/campaign.json --apply --confirm HASH_DEVUELTO --receipt /Users/jreye/Documents/Meta-Efeonce-Connection/campaign-receipt.json
pnpm --silent meta write verify --receipt /Users/jreye/Documents/Meta-Efeonce-Connection/campaign-receipt.json
```

`HASH_DEVUELTO` es un placeholder documental: sustituirlo por el SHA-256 del campo `digest` devuelto.
El ejemplo explica la sintaxis; no autoriza una campaña o payload particular. No ejecutar publicaciones,
respuestas o anuncios ficticios para probar la CLI.

### Payloads JSON admitidos

Ejemplos ilustrativos de estructura: sustituir textos, URLs e IDs por los del contenido y operación
concretos autorizados. Los IDs de ejemplo no acreditan propiedad; el preflight los comprueba.
No copiar campos de una operación a otra ni agregar `published` a los payloads locales: lo fija
la implementación. Se rechazan propiedades fuera del esquema.

`campaigns create`:

```json
{"name":"Campaña aprobada","objective":"OUTCOME_TRAFFIC","special_ad_categories":[],"status":"PAUSED"}
```

`creatives create`, usando un post de la Página fija:

```json
{"name":"Creative del post aprobado","object_story_id":"106570685420996_123456789"}
```

`instagram container create`, elegir una variante:

```json
{"media_type":"IMAGE","image_url":"https://assets.example.org/pieza.jpg","caption":"Texto aprobado","alt_text":"Descripción de la imagen"}
```

```json
{"media_type":"REELS","video_url":"https://assets.example.org/reel.mp4","caption":"Texto aprobado","share_to_feed":true}
```

`instagram publish`, después de crear y verificar el container de la misma cuenta:

```json
{"creation_receipt":"/Users/jreye/Documents/Meta-Efeonce-Connection/container-receipt.json"}
```

`comments reply`:

```json
{"post_id":"106570685420996_123456789","comment_id":"123456789_987654321","message":"Respuesta aprobada"}
```

`instagram comments reply`:

```json
{"media_id":"17900000000000000","comment_id":"18000000000000000","message":"Respuesta aprobada"}
```

`posts publish` recibe `message` y `link` opcional; `photos publish`, `url` y `caption` opcional.
`ads create` recibe `name`, `adset_id`, `creative:{"creative_id":"ID"}` y `status:"PAUSED"`
opcional, siempre forzado. `adsets create` requiere nombre, campaign ID, optimization goal,
`targeting.geo_locations.countries` y exactamente un `daily_budget` o `lifetime_budget` positivo;
este último requiere `end_time`. Fechas ISO con offset, edad opcional 18–65 y promoted object de la
Página/pixel propios cuando el objetivo lo exige. No inventar presupuesto para completar el esquema.

| Operación | Preparación y verificación necesarias |
| --- | --- |
| Ads | Campaign/adset/ad se crean PAUSED; creative sólo desde post propio. Verificar cuenta y entidades padre. Presupuesto positivo explícito en unidades Meta para la moneda de la cuenta, sin conversión supuesta. |
| Post Facebook | Texto y enlace opcional en Página fija; readback del post y autor/estado/permalink cuando Meta los devuelve. |
| Foto Facebook | URL pública HTTPS y caption opcional; conservar photo ID y post ID como entidades distintas. |
| Container Instagram | `IMAGE` o `REELS`; crear no publica. Guardar su receipt, container ID y cuenta. |
| Publicación Instagram | Payload `creation_receipt` referencia el receipt de creación propio. GET fresco debe devolver `FINISHED`; `IN_PROGRESS` queda pendiente, `ERROR/EXPIRED` detienen, `PUBLISHED` no autoriza repetir. |
| Respuesta Facebook | Verificar comentario → post → Página propia; POST al edge `/{comment}/comments`, nunca actualizar el nodo del comentario original. |
| Respuesta Instagram | Verificar comentario → media → owner propio; POST a `/{comment}/replies`. |

Las URLs de media deben ser públicas HTTPS, sin query, fragmento, usuario/contraseña ni secretos;
no usar enlaces firmados o IP/hosts privados. Para Instagram imagen el contrato remoto omite
`media_type`; `IMAGE` es el tipo local del payload. Los formatos/codec y la elegibilidad de publicación
siguen sujetos a Meta; un error de formato no autoriza regenerar ni reemplazar assets por inferencia.
Esta versión no publica Facebook video o Instagram carousel, no activa pauta, no edita objetos ni
envía mensajes privados.

### Estados y recuperación del receipt

El archivo tiene locking y modo `0600`. Los estados separan `prepared`, `dispatched`, `accepted`,
`verified` y `pending`; también pueden ser `not_sent`, `rejected` o `unknown`. Revisar el estado y
los IDs saneados, no sólo `ok`. `accepted` prueba aceptación inicial; `verified` exige readback del
efecto previsto. Los campos de visibilidad pública que Meta no devuelva no se dan por comprobados.

`write verify --receipt ...` sólo consulta mediante GET y permite continuar una verificación pendiente.
Si el POST termina en timeout o resultado ambiguo, `unknown` bloquea repetir automáticamente: Meta
puede haber creado/publicado la entidad. Conservar receipt e investigar el ID disponible. El hash
local no ofrece idempotencia Meta; nombres/captions tampoco son claves únicas. No sobrescribir el
receipt, adivinar un ID ni generar otro para sortear el bloqueo.

## Leer el resultado

stdout contiene un único JSON con versión de contrato, `ok`, `command`, `observedAt`, perfil,
versión API, `data` y paginación/estado/error cuando corresponda. Usar `pnpm --silent` evita banners
del runner. Los errores son códigos saneados; no se imprimen cuerpos arbitrarios del proveedor.

| Exit | Significado |
| --- | --- |
| 0 | Operación completada conforme al estado declarado; inspeccionar receipt/readback en escrituras. |
| 2 | Comando, opción, rango o ID inválido. |
| 3 | Autenticación no disponible o identidad incompatible. |
| 4 | Acceso denegado. |
| 5 | Error o indisponibilidad del proveedor. |
| 6 | Resultado parcial de lectura; revisar cobertura y paginación antes de concluir. |
| 7 | Escritura de resultado desconocido o checkpoint/receipt inseguro; reconciliar sin repetir el POST. |
| 8 | ID aceptado con verificación incompleta o pendiente; continuar sólo `write verify`. |

Una respuesta vacía exitosa sólo describe esa consulta y ventana. Un error, permiso ausente o
resultado parcial no equivale a cero actividad. En Insights conservar moneda, zona horaria,
ventana/atribución y nivel al comparar con GA4; dos plataformas pueden contar distinto.

Para auditar eventos, comparar `--source server` y `--source browser`, identidad del dataset y
hosts. Lead de Efeonce tiene sender backend por sGTM; PageView sigue su transporte consentido.
El agregado `Lead` no prueba contacto CRM, calidad comercial ni una recepción individual determinada.
Correlacionar aceptación real, event_id y recibos propios con el alcance que permita Meta; nunca
enviar negocio ficticio para cerrar esa prueba.

`events quality` se interpreta **por evento y con su muestra**. EMQ de PageView no es EMQ de Lead.
Cobertura cero entre browser/servidor no prueba CAPI apagada si el evento sólo usa servidor.
Un ACK HTTP tampoco prueba procesamiento, deduplicación de atribución, audiencia utilizable o venta.

## Evidencia y recuperación

Guardar sólo resultados necesarios y saneados fuera del repo, por ejemplo en Documents, usando
archivos privados. No registrar tokens de usuario/Página, URLs autenticadas, leads individuales o
mensajes privados. Las auditorías anteriores viven en
`/Users/jreye/Documents/Meta-Efeonce-Connection/audit-2026-10-17/`; sus consultas no prueban por sí
solas que esta nueva CLI haya ejecutado todos sus comandos.

Ante expiración o falta de acceso a Secret Manager, conservar el error saneado y recuperar la
identidad autorizada. Ante 403 de Meta, comprobar permiso y asignación del activo; no ampliar
permisos ni cambiar cuenta automáticamente. Reintentar una consulta no autoriza nuevas capacidades.
No hay promoción Greenhouse, servidor MCP, despliegue ni nueva autorización de activos por este manual.

## Evidencia inicial de lectura — 17 de octubre de 2026

Lectura real completada entre 17:10 y 17:12 Chile: los 17 comandos del catálogo se ejercitaron en
18 invocaciones, incluyendo Facebook e Instagram conversations y comentarios de un post propio.
`auth verify`, 29 permisos, cuenta, pixel, Página, Instagram y calidad respondieron correctamente.
Insights de 30 días: cero filas; conversaciones Facebook una e Instagram cero; comentarios cero.
Listas de campañas/adsets/ads/posts/media, limitadas a dos filas y una página, devolvieron `ok=true`,
exit 6 y continuación explícita. Son resultados parciales esperados.

Stats `--days 7 --source server --pages 10 --limit 100` completó dos páginas/36 filas.
El comando final `--days 1 --source server --pages 10 --limit 100` completó dos páginas/seis filas,
exit 0. `events quality` devolvió Lead EMQ 6,9 y PageView 3: el cambio respecto de una lectura previa
es disponibilidad del agregado, no una mejora provocada por esta CLI. Lead mostró email, IP, UA,
fbp, external_id, nombre y apellido al 100 %, teléfono/fbc al 0 % en la muestra devuelta; esos
porcentajes no autorizan completar datos inventados ni acreditan atribución comercial.

Pruebas locales: 34 PASS (19 CLI + 15 cliente); ESLint y TypeScript focalizados PASS para los cuatro
archivos de implementación/tests. Sin envíos, publicaciones ni eventos sintéticos. Evidencia privada:
`/Users/jreye/Documents/Meta-Efeonce-Connection/cli-verification-2026-10-17/summary.json` y
`final-stats.json` de esa misma carpeta. El asistente de token terminó y el desafío SMS ya no estaba
presente; ese estado de UI no amplía las capacidades de lectura de la CLI.

## Readback de la ampliación v2 — 17 de octubre de 2026

Contrato local aceptado. El corte inicial de 34 tests/17 comandos de lectura se conserva como evidencia
histórica. Lecturas nuevas ejecutadas: identidad correcta; Ads CTR/CPC y otros campos a 30 días sin
filas; exploración Ads de tres campos `no_data`, exit 6 y `nextMetricOffset=3`, sin falsa completitud.
Pixel match_keys devolvió diez filas con continuación (exit 6); DA checks dos filas completas (exit 0).
Calidad respondió Lead EMQ 6,9 y PageView 3, sin atribuir una mejora de datos a la CLI.

Instagram media reach/lifetime devolvió una fila completa (exit 0); sus comentarios cero filas con
cobertura completa. El lote de dos métricas IG (`clips_replays_count`, `comments`) preservó errores
independientes code 100 como `unavailable` y `nextMetricOffset=2`: fallo del proveedor no es cero.
El plan de una campaña devolvió exit 0 y `noMutation=true`; no creó campaña ni prueba un POST.

En este readback se solicitaron rutas `v25.0`, pero un `paging.next` de Instagram señalaba una ruta
`v26.0` del mismo activo/edge. Es la versión observada en el enlace de continuación, no una prueba
sobre la versión efectiva del payload servido. El adapter reconstruye el GET `v25.0` propio; no sigue
esa URL, su token ni la versión anunciada; `pagination.returnedLinkApiVersion` identifica la versión
observada en ese enlace. Prueba final: Instagram reach/day devolvió una fila y cursor de fechas
(exit 6); reanudar la misma consulta con ese cursor devolvió cero filas y completitud explícita
(exit 0) para la siguiente ventana. Page `page_post_engagements`/day devolvió una fila y continuación
por fechas (exit 6); no se afirma completitud de esa lista. Ambas primeras respuestas registraron
`returnedLinkApiVersion=v26.0` sin error de paginación. Los JSON `instagram-insights.json`,
`instagram-date-resume.json` y `page-insights.json` conservan la evidencia saneada.

Implementación local: 105 tests en cinco archivos PASS, TypeScript `--strict` para todos los
`scripts/meta/*.ts` PASS y lint global PASS. Evidencia saneada privada en
`/Users/jreye/Documents/Meta-Efeonce-Connection/cli-v2-verification-2026-10-17/`.
Código completo; estas pruebas y planes no certifican POST públicos en vivo.

POST públicos no certificados en vivo; no se han autorizado publicaciones de prueba por documentar
o implementar estos comandos. Una lectura, fixture o plan no sustituye ese readback externo.

## Readback de lead trace — 17 de octubre de 2026

Se inspeccionó un envío existente de Efeonce Performance, sin crear otro: submission
`fsub-7d76a9ba-ae79-49a1-a57b-a3bce86ce7c9` y evento
`474092ed-4407-4934-8458-afb40ee9a746` resolvieron la misma ocurrencia. Forms registró recepción
a las `19:19:43.462Z` (16:19:43 Chile), lifecycle `delivered`; el ledger de medición registró ACK
sGTM HTTP 200 a las `19:20:02.380Z`. Eso acredita el ACK local, no procesamiento Meta.

HubSpot registró intento local HTTP 200. La lectura remota encontró un candidato nativo único
`ec4257e0-c8f3-490a-b952-7174fd62302a`, submittedAt `19:20:01.602Z`; la traza conserva
`remoteForm.status=correlated`, porque el vínculo con el envío local es email/form/tiempo, sin
native conversion ID persistido como identidad exacta de origen. El contacto `255816530227` se
confirmó por identidad y su creación tiene la misma hora; `contactCreatedByThisSubmission` permanece
`unknown`. La cercanía temporal no demuestra causalidad o que el formulario creara ese contacto.

Las tres consultas completas/source-only/por evento devolvieron `ok=true` y
`coverage.complete=true`. Ese indicador significa que se leyeron los observables solicitados,
no que toda etapa remota esté demostrada: `meta.processing`, matching, deduplicación y atribución
permanecen `unknown`; source-only deja HubSpot `not_checked`. Evidencia saneada privada:
`/Users/jreye/Documents/Meta-Efeonce-Connection/lead-trace-verification-2026-10-17/`
(`full-trace.json`, `source-only.json`, `event-trace.json`). Suite completa: 172 tests en nueve
archivos PASS (105 v2 + 15 modelo + 20 orquestador + 17 HubSpot + 15 store), TypeScript strict
focal con imports canónicos DB/source/tests y ESLint global de archivos propios PASS. Los readers
reales `read/find` también se verificaron; no se envió otro lead para probarlos.

Relectura posterior del envío más reciente y contraste con stats Meta: [auditoría de Performance](../../audits/growth/2026-10-17-performance-latest-lead-trace.md).
