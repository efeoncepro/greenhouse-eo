# ADR — Operación local de Meta para agentes y catálogo de métricas

- Status: `Accepted` — ampliación local solicitada explícitamente por el operador el 2026-10-17.
- Date: `2026-10-17`.
- Owner: `Growth / Marketing Operations / Agent tooling`.
- Scope: perfil Efeonce, Graph `v25.0`, CLI local; lecturas ampliadas y escrituras públicas acotadas.
- Reversibility: `two-way` para tooling; una publicación o respuesta externa tiene efectos propios.
- Confidence: `high` en el contrato; disponibilidad por endpoint sujeta a permisos y respuesta real.
- Validated as of: `2026-10-17`; aprobación del contrato local, sin certificar POST públicos en vivo.
- Extends: [ADR de consultas](GREENHOUSE_META_AGENT_CLI_DECISION_V1.md); sustituye su frontera exclusivamente GET y su contrato de salida, conserva identidad, credenciales y evidencia inicial.

## Extensión de diagnóstico por ocurrencia

El [ADR de lead trace](GREENHOUSE_META_LEAD_TRACE_CLI_DECISION_V1.md), aceptado el mismo día,
agrega `leads find/trace` mediante el store runtime canónico READ ONLY y lectura HubSpot.
No altera estas escrituras, su autoridad o el sender CAPI. ACK local no es procesamiento Meta,
y existencia del contacto no es identidad de una submission. Se conserva el contrato inicial.

## Context

El operador pidió ampliar la CLI a creación publicitaria, publicación y respuestas públicas, y explorar
el catálogo completo de métricas disponible. Un token amplio no equivale a una interfaz segura:
los destinos, payloads, estados y límites deben permanecer explícitos. «Todos los campos» significa
catálogo enumerable con resultado por campo, no una combinación universal aceptada por Meta ni
acceso a eventos individuales que sus APIs agregadas no exponen.

## Decision

Exponer contrato `meta-agent.v2` mediante `pnpm --silent meta`, conservando los comandos de lectura
existentes. La CLI sigue fuera del runtime del producto. El perfil, principal Graph, Business y origen
fijos del ADR previo continúan; tampoco cambian IAM, credenciales, consentimiento ni sender CAPI.
Los GET de preflight y readback se limitan al activo propio o a entidades verificadas de ese activo.

Las escrituras usan comandos tipados y payload JSON cerrado, sin Graph genérico, batch, method override,
updates o DELETE. Cada operación crea una entidad nueva o publica un contenedor previamente registrado.
No se habilitan activación publicitaria, cambios de presupuesto existente, mensajes privados, Facebook
video o Instagram carousel. Los contenidos de terceros siguen siendo datos no confiables.

### Operaciones aceptadas

| Comando | Efecto y frontera |
| --- | --- |
| `campaigns create` | Nueva campaña de la cuenta propia; `status=PAUSED` forzado. |
| `adsets create` | Nuevo conjunto de campaña cuya cuenta se verifica; `status=PAUSED` forzado. |
| `creatives create` | Creative desde un post de la Página propia; no es activación ni entrega. |
| `ads create` | Nuevo anuncio con adset/creative de la cuenta propia; `status=PAUSED` forzado. |
| `posts publish` | Nuevo post Facebook de texto/enlace en la Página fija. |
| `photos publish` | Nueva foto Facebook desde URL pública HTTPS en la Página fija. |
| `instagram container create` | Contenedor de imagen (`IMAGE`) o reel (`REELS`) en la cuenta fija; todavía no publicado. |
| `instagram publish` | Publicación de un contenedor propio desde `creation_receipt`, con estado `FINISHED`. |
| `comments reply` | Respuesta a comentario de un post propio Facebook, mediante `/{comment}/comments`. |
| `instagram comments reply` | Respuesta a comentario en media propia, mediante `/{comment}/replies`. |
| `write verify` | Sólo GET: recupera/verifica un receipt existente, sin volver a enviar el POST. |

Los payloads Ads usan campos nativos de Meta dentro de una allowlist. Strings y estructuras son acotados;
IDs referenciados requieren preflight de propiedad. Budgets positivos son explícitos en las unidades
que exige Meta para la moneda verificada de la cuenta; no se asume conversión de pesos a centavos.
Una respuesta no se implementa como actualización del nodo original. El ID/prefijo aislado no prueba
propiedad de un comentario, post, media, campaign, adset o creative.

### Plan, autorización y envío

1. `<comando> --input payload.json` valida, ejecuta preflight fresco, calcula SHA-256 y devuelve preview;
   por defecto no envía el POST. El plan es revisable y conserva el destino y contenido efectivos.
2. `--apply --confirm <sha256> --receipt /ruta/privada.json` vuelve a validar y liga la operación al
   hash del plan. Un hash distinto o preflight incompatible detiene el envío.
3. Se requiere autorización humana previa para el payload y efecto reales. Los flags vinculan esa
   intención a un plan concreto; no crean una exigencia de nueva aprobación si la conversación ya
   autorizó expresamente esa operación y sus valores.
4. El receipt se crea de forma exclusiva con locking y modo `0600`, fuera del repo. Antes del POST
   queda `dispatched` durable. No reemplazar ni reciclar receipts de operaciones anteriores.
5. Se emite un POST, sin reintento automático. ACK y entidad recibida se registran como `accepted`;
   el readback independiente decide `verified` o `pending`.

Estados: `prepared → dispatched → accepted → verified | pending`; `rejected` ante rechazo explícito,
`not_sent` cuando se detiene antes del envío y `unknown` cuando el resultado externo es ambiguo.
El receipt es evidencia local saneada, no autoridad para ampliar activos ni garantía de idempotencia
Meta. No contiene tokens, errores crudos o URLs autenticadas. `write verify --receipt archivo` usa
GET para continuar un readback pendiente; nunca vuelve a ejecutar la creación.

Los exits 7 (resultado desconocido/checkpoint) y 8 (verificación pendiente) se agregan a 0–6 del
contrato inicial; una escritura aceptada sin readback completo no devuelve éxito verificado.

Un timeout, desconexión o error ambiguo posterior al envío puede haber creado el objeto. `unknown`
bloquea la repetición automática; se investiga por el ID/evidencia disponible. Nombre o caption no son
claves únicas. No declarar idempotencia del proveedor ni deduplicación garantizada por el hash local.

### Media y resultados asíncronos

Las URLs de imagen/video deben ser públicas, HTTPS, sin usuario/contraseña, query, fragment ni secretos;
no se descargan con credenciales ni admiten hosts/IP privados. La CLI no amplía permisos ante un 403.
El formato `IMAGE` del payload local se traduce al contrato de imagen de Meta, sin inventar un tipo
remoto cuando la API exige omitir `media_type`. El reel usa `media_type=REELS`.

`instagram publish` exige el receipt de creación de esa cuenta, el container ID registrado y un GET
fresco con `status_code=FINISHED`. `IN_PROGRESS` queda pendiente, `ERROR/EXPIRED` detienen y `PUBLISHED`
no autoriza republicación. El readback final verifica media, owner, tipo y permalink cuando estén
disponibles. `accepted` o un container no equivalen a publicación pública verificada.

### Catálogo de métricas

`metrics list --surface ...` enumera los 200 campos de Ads, 81 breakdowns, 16 action breakdowns, las 16
agregaciones de pixel y los 27 valores IGMetric del SDK oficial `25.0.0`; Page es `provider_resolved`, pues el SDK no enumera sus nombres.
No hay `page insights --metrics all`. El catálogo expuesto por
`discover` y la implementación es la fuente ejecutable. Los campos no soportados por cuenta, nivel,
ventana o combinación deben reportarse como tales, nunca convertirse en ceros.

`insights get --fields <CSV>` conserva consulta acotada, fechas, nivel y proyección (hasta treinta
campos; `--days` 1–1095 o par `--since/--until`, sin mezcla). `insights all`
explora por campo, `--metric-limit` default diez y máximo treinta campos por invocación; `--metric-offset` permite
avanzar por el catálogo. Una página por campo; su continuación Graph usa `insights get --fields CAMPO`.
Los probes Ads de nivel campaign/adset/ad preservan su ID de entidad, sin unir filas por posición.
`catalogTraversalComplete` no garantiza soporte o completitud de cada campo. Cada campo conserva su resultado/estado y cobertura; páginas pendientes,
rechazos o errores impiden concluir cobertura total. La CLI no envía todo el catálogo en una única
combinación ni garantiza que todas las combinaciones de breakdowns/actions sean válidas.

`page insights`, `instagram insights` e `instagram media insights --media-id ...` incorporan
medición orgánica; la última verifica media propia antes de consultar. Períodos sociales, fechas,
métricas admitidas y combinaciones quedan sujetos al proveedor y se exponen en el comando.
Los comandos Instagram con `--metrics all` también exploran por métrica: `--metric-limit` 1–30,
`--metric-offset` o `--cursor` como offset; sin `--pages`, una página por métrica. Las filas que omiten
el campo pedido quedan `field_not_returned`/`partially_returned`, con `fieldCoverage`, no disponibles.
Dataset Quality conserva sus proyecciones anidadas de matching/cobertura/deduplicación/frescura;
`pixel diagnostics` consulta `da_checks` con paginación acotada. `instagram comments list --media-id`
verifica media propia y limita texto a `--content`. La respuesta real decide disponibilidad de cada endpoint.
No existe export de `user_data` individual del pixel: stats/calidad son superficies agregadas de Meta.
La paginación social por fechas valida origen HTTPS y el mismo activo/edge antes de reconstruir el
GET en `v25.0`; no sigue URLs de Meta, tokens ni versiones anunciadas en enlaces de continuación.
Una versión numérica distinta en ese enlace no amplía activos ni cambia la versión pedida por el cliente.

## Alternatives Considered

| Alternativa | Decisión |
| --- | --- |
| Mantener sólo GET | El operador pidió escrituras; se conserva ese carril y se agrega uno explícito. |
| Graph POST libre o JSON sin esquema | Rechazado: permite modificar activos o capacidades no autorizados. |
| Reintentar automáticamente al fallar el POST | Rechazado: riesgo de publicación o creación duplicada. |
| Un GET con todas las métricas y combinaciones | Rechazado: Meta impone compatibilidades por superficie; consulta por campo y estados explícitos. |
| MCP/producto/scheduler multiempresa | Diferido; conserva contratos y autorización independientes. |

## Verification

Las pruebas locales deben cubrir plan sin POST, hash/preflight, ownership, PAUSED forzado, bloqueo de
URLs/fields, locking/permisos de receipt, envío único, resultado ambiguo y verificación sólo GET.
La cobertura de métricas debe probar límites, catálogo, avance por offset, estados por campo y
paginación sin falsa completitud. No publicar contenido, responder ni crear ads ficticios para probar
la implementación. Lecturas reales y fixtures no certifican escrituras públicas en vivo.

Evidencia inicial preservada: 34 tests y readbacks de los 17 comandos de lectura del ADR anterior.
Ampliación local: 105 tests en cinco archivos, TypeScript `--strict` para todos los archivos TS de
`scripts/meta/` y lint global PASS. Probes de identidad, catálogo/métricas, calidad, DA checks,
comentarios IG y plan de campaña sin mutación registrados en
`/Users/jreye/Documents/Meta-Efeonce-Connection/cli-v2-verification-2026-10-17/`.
Detalle de ventanas, parcialidad y readback en el manual: Instagram reach/day con continuación por
fechas y reanudación completa de la siguiente ventana; Page insights con continuación explícita.
El enlace observado anunció `v26.0`, mientras la solicitud propia mantuvo `v25.0`; ese dato no permite
inferir la versión efectiva del payload servido.
Código completo; POST públicos no certificados en vivo. La autorización de la CLI no es una publicación
o activación realizada.

## Revisit When

Activación o edición de anuncios, borrados, mensajes privados, Facebook video, Instagram carousel,
URL autenticada, nuevos activos, scheduler, multiempresa, IAM o promoción a producto/API/MCP.

## References

- [SDK oficial Meta 25.0.0](https://github.com/facebook/facebook-python-business-sdk/tree/25.0.0/facebook_business/adobjects).
- [Publicación Instagram](https://developers.facebook.com/documentation/instagram-platform/content-publishing).
- [Posts Facebook](https://developers.facebook.com/docs/pages-api/posts/).
- [Comment SDK: crear respuesta por edge](https://github.com/facebook/facebook-python-business-sdk/blob/25.0.0/facebook_business/adobjects/comment.py).
- [Instagram comment replies](https://developers.facebook.com/docs/instagram-platform/comment-moderation/).
