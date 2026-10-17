# ADR — Integración Google Ads de Greenhouse

- Status: `Accepted` — dirección aceptada por instrucción expresa del operador el 2026-10-17; implementación y rollout de producto pendientes.
- Date: `2026-10-17`.
- Owner: `Growth / Integrations / Marketing Operations`; Identity y Platform son responsables de credenciales y autoridad.
- Scope: lectura Google Ads, conexión por organización y separación de administración, instrumentación GTM e ingesta de conversiones; discovery operador Efeonce previo al runtime de producto.
- Reversibility: `two-way-but-slow`; readers y bindings son reversibles, mientras que conversiones enviadas, aprendizaje de puja y retenciones ejecutadas no se revierten con un rollback de código.
- Confidence: `high` en los límites de autoridad y separación de carriles; `medium` en el diseño de rollout hasta verificar acceso, fuentes, acciones y primeros resultados reales.
- Validated as of: `2026-10-17`; documentación primaria Google consultada y discovery de superficies existentes. El resultado de OAuth/API se registra en la auditoría enlazada, sin deducirlo de este ADR.
- Architecture: [medición e integración Google Ads](GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md).
- Evidence: [discovery y prueba API del 17/10](../audits/growth/2026-10-17-google-ads-api-discovery.md).

## Context

El operador pidió habilitar medición de Google Ads para la cuenta Efeonce **686-253-9491**, investigar
GTM Web/Server, profundizar la conexión API y avanzar con autorización y una prueba de lectura antes
de implementar producto. El correo de Ads indicado es **jreyes@efeoncepro.com**. La administración
del proyecto Cloud canónico usa **julio.reyes@efeonce.org**. Son identidades diferentes: el acceso
Cloud, una sesión de navegador y un grant de Analytics no acreditan autoridad sobre Ads.

Greenhouse ya tiene infraestructura OAuth Google y lectores GA4/GSC, políticas de medición,
aceptación backend de Forms/Meetings, entrega CRM y matching. Esos componentes resuelven problemas
distintos. El [estado de matching](../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md)
describe Google UPD dedicado sin `events`, un espejo GA4 y un vínculo Ads observado previamente al
MCC; nada de eso prueba que exista una acción Ads configurada o una conversión atribuida.

El discovery inicial del 17/10 identificó la cuenta Ads solicitada, su vínculo GA4 y una conexión
HubSpot, sin acciones de conversión observadas en esa superficie. En `efeonce-group` se observaron
Analytics Admin/Data, Search Console y GTM habilitados, y Ads/Data Manager ausentes antes del nuevo
flujo de autorización. Ese corte es evidencia histórica de descubrimiento; el resultado posterior,
la cobertura y cualquier bloqueo se consultan en la auditoría. Una conexión HubSpot visible no
certifica el envío de un evento ni sus condiciones comerciales.

La capacidad debe permitir a una organización comprender gasto, resultados y salud de medición,
sin transformar una consulta en autorización para publicar tags, editar campañas, enviar datos
personales o importar conversiones. Las primeras lecturas Efeonce verifican una hipótesis de
integración; no constituyen una conexión multiempresa desplegada.

## Decision

### 1. Producto de lectura primero; prueba del operador fuera del runtime

Se acepta diseñar una integración de lectura Google Ads de Greenhouse reutilizando los primitives
de autenticación, conexiones, autorización y observabilidad existentes. La primera autorización
y prueba local quedan fuera del runtime del producto. No se crea un servicio, cron, deployable,
SDK público o secreto cross-runtime para que una prueba funcione.

El probe usa un catálogo de llamadas de lectura, objetivo Efeonce fijado y salida saneada. Se
permiten métodos de consulta que empleen HTTP POST, como `googleAds:searchStream`; la frontera
se define por el método del proveedor y su efecto, no sólo por el verbo HTTP. No incluye
`mutate`, uploads, ajustes, creación de acciones, cambios de enlaces, campañas, presupuesto,
puja, audiencias, términos o permisos Ads. La autorización de lectura no concede esas operaciones.

El inventario futuro cubre identidad/cuenta, jerarquía autorizada, configuración de conversiones,
acciones y snippets, objetivos efectivos por campaña y métricas con cobertura/ventana explícitas.
Los campos no soportados, páginas pendientes, restricciones y permisos denegados conservan su
estado; nunca se presentan como cero. [Contrato Google de reporting][google-reporting].

### 2. Reutilizar infraestructura OAuth, mantener grants y bindings propios

La integración puede reutilizar el proyecto y OAuth client existentes después de verificar su
propiedad, APIs, audiencia, scopes y acceso de producción. Mantiene un grant Ads identificable,
revocable y con sus scopes efectivos. No sobrescribe ni amplía silenciosamente la conexión GA4/GSC
de otra persona u organización. Pedir `adwords` exige consentimiento efectivo; agregar el string
en configuración no agrega el scope a un refresh token existente.

Para este discovery, Cloud permanece en `julio.reyes@efeonce.org` y Ads se autoriza como
`jreyes@efeoncepro.com`. Un login que resuelva otra cuenta exige detener esa prueba y corregir
identidad; no cambiar el objetivo a una cuenta que resulte más accesible.

El futuro binding de producto vincula organización autorizada, grant, identidad Google, proyecto
OAuth, customer anunciante, ruta de acceso/MCC y propietario efectivo de conversiones. La autoridad
sale de sesión/organización y binding del servidor; un `customerId` enviado por cliente sólo puede
restringir ese conjunto. Acceso a varias cuentas Ads no autoriza exponerlas a todos los tenants.

Ads usa `https://www.googleapis.com/auth/adwords`; Data Manager usa
`https://www.googleapis.com/auth/datamanager`. No hay un scope OAuth Ads independiente de sólo
lectura: se respetan roles Ads y se limita el catálogo de comandos. Una service account es una
alternativa futura, con acceso Ads concedido expresamente y credencial/runtime verificados; IAM
Cloud no sustituye ese acceso. [OAuth][google-oauth], [modelo de acceso][google-access],
[Data Manager auth][google-dm-auth].

### 3. Mantener customer anunciante, MCC y conversion owner separados

El perfil inicial fija **6862539491** como anunciante Efeonce. **9531478329** es el MCC candidato
conocido; sólo se usa como `login-customer-id` cuando una lectura prueba la ruta de acceso.
No reemplaza el customer objetivo. Acceso directo permite omitir ese header. El propietario de
acciones se resuelve mediante `google_ads_conversion_customer` y la configuración cross-account.

Se conservan por separado customer ID, ID del vínculo GA4, ID de acción, Conversion ID/AW y Label.
No construir `AW-6862539491` desde el customer. Una acción puede pertenecer al manager sin cambiar
la cuenta anunciante del reporte; ese caso exige binding explícito y verificado antes de cualquier
configuración o envío. [Modelo de acceso][google-access], [conversion settings][google-settings].

### 4. Tres carriles con permisos y rollout independientes

| Carril | Autoridad y responsabilidad | Frontera inicial |
| --- | --- | --- |
| Google Ads API | Leer reporting/configuración; en una ampliación, administrar `conversionActions` y goals con comandos gobernados | Lectura primero; gestión futura no autorizada por el grant de lectura |
| GTM Web + Server | Instrumentar eventos web reales, consentimiento, atribución y tag nativo Ads | Preparar, verificar preview y publicar sólo mediante su gate de operación |
| Data Manager API | Ingerir resultados backend/CRM y, si se decide, complementar conversiones online | Destino y acción opt-in, sin uploads implícitos |

La integración API no sustituye GTM ni hace llegar conversiones por existir. Vincular GA4 o HubSpot
tampoco equivale a publicar un tag. Las escrituras de campañas son otra capacidad y quedan fuera
de este ADR. [Acciones Ads][google-conversions], [GTM Server Ads][google-sgtm],
[Data Manager eventos][google-dm-events].

El baseline de medición online es el tag Ads nativo mediante los contenedores existentes, con
evento comercial backend confirmado y una identidad coherente. La colocación Web/Server se
verifica en la arquitectura y preview del contenedor; no se asume que el evento browser actual
alcanza al server. La ruta server requiere cliente compatible, consentimiento transportado y
Conversion Linker server. No duplicar mecánicamente un Conversion Linker web si Google tag o
Destination tag del destino ya cubre todas las páginas. No pasar PII/hashes por parámetros
analíticos ordinarios para seguir una receta genérica. [GTM Server][google-sgtm],
[Conversion Linker][google-linker], [consentimiento server][google-consent].

### 5. Elegir un escritor por acción y resultado; HubSpot nativo se evalúa primero

Para resultados posteriores del CRM se compara la integración nativa HubSpot→Ads con Data Manager.
No se activan dos escritores sobre el mismo resultado por precaución o para conseguir evidencia.
La decisión se registra por organización, acción y versión del mapping, con estos criterios:

| Criterio | Favorece HubSpot nativo | Favorece Data Manager gobernado |
| --- | --- | --- |
| Fuente del resultado | Etapa y transición canónica viven en HubSpot | Resultado confirmado vive en Greenhouse u otra fuente gobernada |
| Semántica/edición | Función, licencia y mapping nativos comprobados cubren exactamente el resultado | La función nativa no conserva la semántica necesaria y hay contrato propio verificable |
| Identidad y reintentos | Conector demuestra identidad estable, duplicados y recuperación aceptables | Se necesita control explícito de ocurrencia, idempotencia y reconciliación |
| Evidencia y operación | Recepción, errores y soporte nativos ofrecen cobertura suficiente | Ledger y diagnóstico API aportan evidencia requerida que el conector no expone |
| Consentimiento y datos | Conector demuestra base/consentimiento y minimización por resultado | Existe una ruta propia autorizada con conservación y supresión definidas |

Una limitación nativa no autoriza el fallback automáticamente. El acta de selección debe registrar
licencia, permisos, acción y owner, campos, identificadores, consentimiento, transición, recuperación,
rollback y cómo se retirará el otro escritor si existe. La conexión HubSpot observada no resuelve
esa comparación. Importar GA4 y enviar Ads nativo para el mismo resultado requiere seleccionar
una acción para puja y revisar custom goals: marcar otra como secundaria no siempre la excluye
de puja. [Objetivos Ads][google-goals].

Data Manager multi-source online queda como ampliación beta, no baseline. Sólo se habilita con
decisión por acción, `transactionId` coincidente, aceptación de su período inicial de 14 días,
diagnósticos y ausencia de un segundo escritor no coordinado. Su payload online usa una acción
`WEBPAGE`; offline/lead lifecycle usa `UPLOAD_CLICKS`. El hecho de enviar por API no decide si
el resultado es online u offline. [Online][google-dm-online], [offline][google-dm-offline].

### 6. Fuente comercial, identidad y conservación

Forms/Meetings y CRM conservan la verdad de aceptación, reserva y avance comercial. Clasificación
backend y policy vigente deciden elegibilidad publicitaria: no se infiere un lead comercial desde
un clic, un `submit`, existencia de un contacto, analytics o una etapa editable por el visitante.
Newsletter, postulaciones, encuestas y fuentes de riesgo siguen excluidas según el
[ADR de medición](GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md).

La identidad durable representa una ocurrencia y etapa, no el email ni el contacto. Un reintento
conserva identidad y momento; una nueva etapa legítima necesita su propia semántica/acción. El
ledger conserva tenant, fuente, ocurrencia, acción/destino/owner, versión, consentimiento, tiempos,
intentos y recibos saneados. Una correlación por email/hora no se promueve a identidad exacta.
Se reutiliza el [contrato de identidad HubSpot](GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md)
cuando existe; históricos sin marcador conservan confianza histórica.

El ciphertext de matching actual tiene limpieza a las **48 horas**. No se extiende para cubrir
ventas que ocurren semanas después, ni se confunde con el período de atribución de Google. El
futuro carril lifecycle debe definir una conservación mínima propia, fuente que conserva cada
dato, base/consentimiento, derecho de supresión y acceso. Los recibos/identidades operativos sin
payload personal se conservan según su política. No copiar PII, hashes, tokens, URLs firmadas o
payloads privados a documentación, fixtures o logs para alargar su disponibilidad.

Consentimiento comercial, analytics, publicidad, datos de usuario y personalización permanecen
separados. La decisión de negar matching no rechaza la aceptación comercial. Servir desde un
server no evita las elecciones de la persona. [Consent Mode][google-consent].

### 7. Entrega, procesamiento y atribución son estados distintos

El diseño debe distinguir elegible, pendiente, enviado, recibido por transporte, procesamiento
pendiente, procesado con errores/advertencias, resultado desconocido y atribución no verificada.
Un HTTP 200, `requestId`, preview o contador agregado no prueban conversión atribuida.

Cada envío futuro usa ledger/outbox e identidad estable. Ante timeout o respuesta ambigua se
registra `unknown`, se consulta/reconcilia por mecanismo documentado y no se reenvía ciegamente.
Si el proveedor no ofrece consulta de ocurrencia suficiente, se conserva el resultado desconocido
y se escala la decisión de recuperación; no se inventa un readback individual. Reintentos de fallos
confirmados siguen la política del proveedor sin crear identidad nueva.

Data Manager devuelve recepción y un `request_id`; el diagnóstico asíncrono se consulta con la
misma ruta de acceso, revisando estado por destino y warnings incluso con `SUCCESS`. Los ajustes
por mismo ID pueden sobrescribir valor o completar información; no son un mecanismo inocuo de
reintento. Data Manager no retracta el conteo completo. [Diagnóstico][google-dm-diagnostics],
[ajustes y migración][google-dm-upgrade].

### 8. Acceso Cloud vigente; legacy no es un requisito nuevo

La versión elegida para el probe es Google Ads API **v26**, fijada y registrada por corrida. Al
17/10, la guía específica documenta el retiro de developer tokens el **09/09/2026**: el acceso de
producción depende del proyecto Cloud propietario de las credenciales. Habilitar la API sólo
otorga Test inicialmente; se verifica el nivel real Explorer/Basic/Standard. Un token antiguo o
un API Center visible no acreditan acceso producción. [Migración][google-devtoken],
[niveles][google-levels].

Las restricciones legacy de `UploadClickConversions` vigentes desde el **15/06/2026** son otro
control: no habilitar el upload Ads porque reporting funcione. Para nueva ingesta se evalúa Data
Manager, con sus permisos y contrato propios. No resolver una denegación cambiando cuenta,
proyecto o credencial sin autoridad, ni revocando grants funcionales de GA4/GSC.
[Deprecaciones][google-deprecations].

### 9. API/MCP de producto sólo después de su contrato

Los readers de producto deben nacer con límites de tenancy, paginación, datos, versión, errores y
auditoría reutilizables desde las superficies permitidas. La API pública, CLI producto o MCP no
se crean implícitamente por aprobar este ADR ni por un probe local exitoso. Una futura tool debe
declararse en el manifest canónico Greenhouse y pasar el gate de federación y autorización por
organización; el gateway no almacena credenciales Ads ni decide semántica comercial. La ausencia
de tool sigue explícita hasta ese rollout. Se conserva la
[paridad API](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md) en la unidad formal que implemente producto.

## Alternatives Considered

| Alternativa | Resolución y razón |
| --- | --- |
| Sólo configurar GTM manualmente | Insuficiente como dirección de producto: no ofrece lectores gobernados de cuenta/configuración; sí conserva su rol como instrumento de tags |
| Reutilizar directamente el token GA4/GSC | Rechazada: scopes, identidad, proyecto y cuenta autorizada son controles independientes |
| Integración universal Ads con customer libre | Rechazada: mezcla tenants y facilita operar otra cuenta; binding verificado del servidor y perfil Efeonce cerrado |
| Un único adaptador para Ads/GTM/Data Manager | Rechazada: operaciones, permisos, resultados y gates difieren; compartir primitives no fusiona autoridad |
| HubSpot nativo para todo resultado | Condicional: preferible si cumple la matriz; conexión visible o familiaridad no prueban suficiencia |
| Data Manager para todo, incluido online desde el inicio | Diferida: baseline nativo GTM; beta multi-source y lifecycle exigen decisión/diagnóstico por acción |
| GA4 importado y Ads nativo ambos optimizando el mismo resultado | Rechazada como default: riesgo de doble conteo y objetivos de puja incoherentes |
| Nuevo servicio o MCP para resolver el probe | Rechazada: agrega superficie antes de probar acceso y utilidad; discovery fuera del runtime |

## Consequences

La separación permite inspección repetible sin activar medición o pauta. Reutilizar OAuth y los
primitives del producto reduce duplicación manteniendo independencia entre grants. El costo es
modelar explícitamente bindings, propietarios, ocurrencias, cobertura y estados del proveedor.

No se promete recuperación universal de conversiones ni atribución individual. Beta, permisos,
latencia, supresión y ausencia de identificadores limitan cobertura. Las decisiones de objetivos
afectan aprendizaje y negocio: su activación requiere revisión por acción y campaña. Cambiar el
reader no corrige datos históricos ni deshace información enviada.

## Runtime Contract

Este ADR gobierna dirección y fronteras; el detalle técnico y las unidades de implementación
pertenecen a la [arquitectura Google Ads](GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md).
No declara tablas, endpoints, flags, tools o senders nuevos como existentes.

Se conservan como fuentes canónicas:

- [Growth](GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md): pertenencia del dominio y contratos de fuente.
- [Policy de medición](GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md): elegibilidad y configuración gobernadas.
- [Matching implementado](../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md): captura cifrada, destinos y retención actuales.
- [Forms](GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md) y [Meetings](GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md): verdad de aceptación/reserva.
- [Auditoría del 17/10](../audits/growth/2026-10-17-google-ads-api-discovery.md): identidades y resultados reales del probe, timestamps, cobertura y bloqueos.

El contrato futuro exige tests de aislamiento de organización/cuenta, rutas de acceso, rechazo
de mutaciones, redacción, paginación parcial, idempotencia y reconciliación. La implementación
de lecturas requiere pruebas de API reales sin crear conversiones comerciales ficticias. El
rollout de conversiones requiere además evidencia independiente de fuente, consentimiento,
acción/owner, preview/transporte, procesamiento y resultado real, con límites de atribución.

## Revisit When

- Cambia la identidad, proyecto OAuth, nivel API, scopes, acceso al MCC o propietario de conversiones.
- Se solicita otra cuenta/tenant, una escritura Ads, publicación GTM, ingesta o exposición MCP/API.
- HubSpot cambia licencia, semántica, identidad, observabilidad o garantías que sustentan la selección del escritor.
- Se promueve multi-source fuera de beta o cambian sus ajustes, deduplicación o período de prueba.
- El lifecycle necesita datos después de 48 horas sin una política propia aprobada y implementada.
- Aparecen duplicados, resultados desconocidos sin reconciliación, drift de clasificación o divergencia entre aceptaciones y conversiones.
- Google modifica autenticación, versiones, consentimiento, permisos, ventanas o disponibilidad de uploads.

## Delta de evidencia — 2026-10-17, prueba de lectura del operador

El OAuth se completó a las **22:36:48 UTC** como **`jreyes@efeoncepro.com`**, con `openid`,
`userinfo.email` y `adwords`. El cliente web existente de GSC se reutilizó mediante el callback
localhost ya registrado y un probe PKCE privado. Cloud permaneció bajo **`julio.reyes@efeonce.org`**
y proyecto **`efeonce-group`**. La prueba no sustituyó ADC ni modificó la configuración del cliente
OAuth Cloud. La API Ads estaba habilitada y el proyecto mostraba nivel Explorador.

La lectura Google Ads API **v26** al anunciante fijado produjo esta evidencia:

| Lectura | Resultado observado | Alcance de la conclusión |
| --- | --- | --- |
| Identidad sin manager en el header | HTTP 403, `USER_PERMISSION_DENIED` | La ruta directa no funcionó con este grant; no prueba falta de acceso por MCC |
| Identidad vía `login-customer-id: 9531478329` | HTTP 200; `customers/6862539491`, `Efeonce - Agencia` | Ruta de acceso probada al anunciante exacto; el MCC no sustituyó el objetivo |
| Moneda, zona y entorno | `CLP`, `America/Santiago`, `testAccount=false`, autoetiquetado ON | Metadata de la cuenta real leída, no resultado de una campaña |
| Propietario de conversiones | `customers/6862539491` | El propio anunciante es el propietario efectivo observado |
| Tracking | ID **`18432951465`**, `NOT_CONVERSION_TRACKED`, effective enablement `OFF` | El ID existe, pero no acredita seguimiento activo, Label utilizable ni envío |
| Acciones, inventario corregido | Dos GA4 `HIDDEN`, ambas `primaryForGoal=false` | No equivale a cero recursos; tampoco acredita importación activa o conversiones Ads medidas |
| Campañas, account goals, campaign goals/config y custom goals | HTTP 200, cero filas en las consultas ejecutadas, sin página siguiente | Ausencia observada en esos inventarios al momento del probe; el operador confirmó que la cuenta es nueva |

Las acciones son **`7852171430`** (`efeoncepro.com (web) purchase`,
`GOOGLE_ANALYTICS_4_PURCHASE`) y **`7852171433`** (`efeoncepro.com (web) generate_lead`,
`GOOGLE_ANALYTICS_4_GENERATE_LEAD`). El inventario no encontró una acción nativa `WEBPAGE`.
Los snippets GA4 devueltos no se interpretan como Conversion Label de una acción Ads nativa ni
autorizan convertir el espejo genérico `generate_lead` en conversión comercial.

La primera consulta de acciones recibió HTTP 400 `UNRECOGNIZED_FIELD` por seleccionar el agregado
`value_settings`. Se corrigió a subcampos admitidos y el inventario posterior respondió HTTP 200
con dos recursos; el error de consulta no se convirtió en un inventario vacío. Los request IDs y
las consultas efectivas se conservan en la [auditoría](../audits/growth/2026-10-17-google-ads-api-discovery.md).
Evidencia privada saneada: `.auth/google-ads-discovery-20261017/probe-results.json` y
`.auth/google-ads-discovery-20261017/inventory-results.json`; no incorporar archivos de credenciales
a documentación ni al commit.

Resultado: **prueba de acceso y lectura del operador PASS**, exclusivamente mediante las llamadas
`googleAds.search` registradas, sin mutaciones Ads ni uploads. Se comprobaron identidad, anunciante,
MCC y propietario efectivos; no se publicaron tags ni se crearon acciones o conversiones. El grant
local exitoso no es un binding de producto, conexión multiempresa, sender, procesamiento de eventos
o atribución verificados. **Implementación y rollout de producto continúan pendientes.**

## Fuentes primarias verificadas el 17/10/2026

Las fuentes describen contratos del proveedor; no certifican el acceso de esta instalación.
Cuando un resumen o ejemplo conserva un requisito legacy, prevalece la guía específica vigente
y se contrasta con la respuesta real documentada en auditoría.

[google-reporting]: https://developers.google.com/google-ads/api/docs/reporting/overview
[google-oauth]: https://developers.google.com/google-ads/api/docs/oauth/overview
[google-access]: https://developers.google.com/google-ads/api/docs/oauth/access-model
[google-settings]: https://developers.google.com/google-ads/api/reference/rpc/v26/ConversionTrackingSetting
[google-conversions]: https://developers.google.com/google-ads/api/docs/conversions/getting-started
[google-sgtm]: https://developers.google.com/tag-platform/tag-manager/server-side/ads-setup
[google-linker]: https://support.google.com/tagmanager/answer/7549390
[google-consent]: https://developers.google.com/tag-platform/tag-manager/server-side/consent-mode
[google-goals]: https://support.google.com/google-ads/answer/10995103
[google-dm-auth]: https://developers.google.com/data-manager/api/devguides/quickstart/set-up-access
[google-dm-events]: https://developers.google.com/data-manager/api/devguides/events
[google-dm-online]: https://developers.google.com/data-manager/api/devguides/events/google-ads/online/send-events
[google-dm-offline]: https://developers.google.com/data-manager/api/devguides/events/google-ads/offline/send-events
[google-dm-diagnostics]: https://developers.google.com/data-manager/api/devguides/diagnostics
[google-dm-upgrade]: https://developers.google.com/data-manager/api/devguides/events/google-ads/offline/upgrade
[google-devtoken]: https://developers.google.com/google-ads/api/docs/api-policy/developer-token
[google-levels]: https://developers.google.com/google-ads/api/docs/api-policy/access-levels
[google-deprecations]: https://developers.google.com/google-ads/api/docs/deprecations

## Delta aceptado 2026-10-17 — OAuth Efeonce y CLI de consulta obligatoria

Por instrucción posterior del operador, la autorización de producción debe presentar la identidad
**Efeonce**. La marca histórica **Claude** queda registrada como evidencia del piloto; no satisface
el gate de lanzamiento. App name, logo, soporte, dominios y políticas deben representar a Efeonce,
con administración Cloud siempre `julio.reyes@efeonce.org` en `efeonce-group` y principal Ads
`jreyes@efeoncepro.com` para el anunciante `6862539491`.

La marca del consentimiento es configuración **del proyecto**, distinta del nombre interno de un
OAuth client. Crear o renombrar un client dentro del mismo proyecto no proporciona por sí solo otra
marca. Antes de aplicar el cambio se deben inventariar clientes y consumidores de GA4/GSC/OAuth del proyecto,
se define la transición y se verifica su funcionamiento. Nombre visible y verificación de aplicación/scopes
son gates separados. [Modelo oficial de marca por proyecto](https://developers.google.com/identity/protocols/oauth2/cross-client-identity).

La primera unidad de producto incorpora una **CLI de Google Ads para consultas**, siguiendo el patrón
de las herramientas de Meta, GA4 y GSC. Es un entregable obligatorio del reader canónico, con identidad,
binding de cuenta/organización, credenciales privadas, ayuda/discovery, inventarios y reporting, JSON
estructurado, errores seguros, paginación, cobertura, moneda/timezone y pruebas reales de lectura.
La [arquitectura §5.4](GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md#54-api-cli-y-mcp) define
el catálogo inicial. La CLI no depende de activar conversiones ni de construir una UI; tampoco habilita
mutaciones Ads por disponer del scope `adwords`. Su implementación queda para la siguiente unidad;
esta ampliación sólo formaliza los requisitos y no cambia configuración Cloud ni crea la CLI.

## Delta aceptado 2026-10-17 — CLI operativa con gestión y OAuth Efeonce

El operador autorizó ejecutar el cambio OAuth e implementar la CLI, y amplió expresamente su alcance
a **escritura y actualización**, manteniendo la prueba real de conexión en lectura. Este delta amplía
el catálogo inicial de sólo lectura; no autoriza ninguna modificación publicitaria concreta por sí mismo.

La CLI local `pnpm google-ads` usa el adaptador de dominio `src/lib/growth/google-ads/` y el binding fijo
`6862539491` vía `9531478329`. El grant se custodia en Secret Manager como
`efeonce-google-ads-agent-oauth`, con refresh, audiencia/scopes y principal comprobados con Google.
Cloud opera explícitamente como `julio.reyes@efeonce.org`; Ads como `jreyes@efeoncepro.com`.
No se promueve el grant a una conexión multiorganización ni se crean DB schema, UI, API o MCP de producto.
Esas superficies quedan excluidas de esta unidad local por faltar conexión/autoridad de organización;
cuando se implementen reutilizarán el adaptador y sus límites, sin otro transporte proveedor.

El catálogo cerrado agrega diez operaciones de creación/actualización de campañas Search, presupuestos,
grupos Search, acciones de conversión y objetivos. Campañas/grupos se crean o actualizan a PAUSED;
activar, eliminar, crear creatividades e ingerir conversiones quedan fuera del catálogo actual.
Cada operación usa input tipado, un plan determinista con digest, `validateOnly` del proveedor, confirmación
del digest y journal privado duradero antes del dispatch. Un digest sólo se despacha una vez desde la CLI;
un timeout conserva `unknown` y bloquea el replay automático. El readback compara todos los campos del
plan; una diferencia o ausencia devuelve verificación pendiente, no éxito. No se promete exactly-once
remoto ni verificación desde un HTTP 200.

En Cloud se guardó nombre **Efeonce**, homepage y enlace de privacidad públicos existentes; clientes,
callbacks, dominios, scopes y audiencia se preservaron. La verificación Google de marca/scopes sigue
siendo un gate distinto. Lecturas reales, pruebas locales y límites de rollout:
[cierre de implementación](../audits/growth/2026-10-17-google-ads-cli-oauth-implementation.md).
