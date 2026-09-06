# Efeonce ID — autoridad interna nativa

- Status: Accepted
- Date: 2026-09-05
- Owner: Identity / MCP Platform
- Scope: TASK-1836; auth-server, sesiones, OAuth, contexto delegado y reader del gateway.
- Reversibility: two-way-but-slow
- Confidence: medium
- Validated as of: 2026-09-05, follow-up OIDC publicado; integridad del writer compartido en corrección y piloto interno OFF.
- Authorization: ejecución de TASK-1836 corregida D1–D7 solicitada por el operador y objetivo aprobado
  en esta conversación. El rollout posterior fue autorizado explícitamente por el operador el 2026-09-05.

## Context

El emisor nativo usa bindings B2B que requieren cliente activo. Personal Efeonce tiene identidad corporativa
pero no un camino propio a tokens nativos. Hacer a Efeonce cliente o clasificar todo el issuer como interno
rompería fronteras. La auditoría TASK-1836 A1–A7 mostró también gaps de assurance, discovery y rollout.

## Decision

1. Entra se usa sólo como upstream OIDC de login; auth-server emite el token MCP. No hay proxy Graph ni
   passthrough de tokens. Entra directo sigue disponible durante transición.
2. Identidad por tenant/oid verificados y source link canónico; `sub` nativo opaco estable separado. Email
   no crea ni fusiona identidad. La relación laboral elegible y los permisos son controles independientes.
3. Cada autorización interna usa un contexto server-side ligado a issuer/environment, subject, perfil,
   cliente, audiencia, organización, binding interno y sesión corporativa de procedencia. La población
   no se infiere de `issuer_class`; el registro externo actual conserva sus invariantes comerciales.
4. Token nativo interno incluye `authorization_context_id` y `authorization_context_version=1` firmados.
   Reader revalida las mismas dimensiones, elegibilidad, grants, revocación y versión. Contexto ajeno o
   ausente no autoriza. `gv` es la versión del binding seleccionado, no máximo entre organizaciones.
5. Login Entra crea nivel primary. V1 no traduce MFA upstream; step-up usa TOTP/passkey UV real y reciente
   de TASK-1830 sobre sesión corporativa. Método externo no habilita contexto interno. Refresh preserva
   instante/procedencia de autenticación; no rejuvenece MFA ni amplía contexto/scopes.
6. Consentimientos y familias OAuth quedan ligados al contexto. Los registros externos legacy sin
   contexto mantienen su semántica; jamás se promueven a internos. La resolución inicial interna no cachea
   permisos positivos. Revocación confirmada local debe impedir dispatch en ≤60 s; demora de ingestión
   de baja upstream se mide y documenta separadamente.
7. Gates separados OFF por defecto: emisor `AUTH_SERVER_INTERNAL_AUTH_ENABLED`, gateway
   `MCP_NATIVE_INTERNAL_AUTH_ENABLED`. Apagarlos deniega también refresh/dispatch de contextos emitidos.
   Backend/reader/gateway/UI compatibles y pruebas negativas preceden activación de cohorte.

## Alternatives Considered

- Sólo Entra directo: sirve como compatibilidad pero no entrega acceso mediante el autorizador propio.
- Login nativo independiente para empleados: duplicaría procedencia/recuperación corporativa.
- Promover `issuer_class` del emisor: concede autoridad a externos por compartir emisor; descartado.
- Interpretar claims MFA de Entra en V1: más casos de compatibilidad y riesgo de sobreafirmar assurance;
  diferido. El coste es un factor local adicional para elevar permisos.
- Tokens con permisos autosuficientes hasta expirar: no cumple revocación local acotada; descartado.

## Consequences

Se añade persistencia/lectura por contexto y transacciones de login. Esa lectura tiene coste y dependencia
operativa, a cambio de poder retirar acceso sin esperar expiración JWT. El gateway sigue siendo adapter:
no obtiene acceso DB ni inventa reglas workforce. La autorización final de negocio sigue en el provider.
El rollout es multicomponente y no puede cerrarse sólo desplegando auth-server.

## Runtime Contract

- Auth-server escribe sólo `greenhouse_auth`; commands de identidad poseen writes de source links/core.
- Store de contexto y upstream transacción: módulo `src/lib/auth-server/internal/` nuevo en TASK-1836.
- Sesiones: extensión aditiva de `persons` con procedencia corporativa real y source link nativo coherente.
- OAuth: code/refresh/consent/contexto preservados de authorize a dispatch; schema y tipos versionados.
- Reader interno: autenticado por lane ecosystem; devuelve contexto resuelto, nunca tokens upstream.
- TASK-1831 aplica verifier y policy por tool; TASK-1835 consume rutas; TASK-1832 verifica clientes reales.
- Cambios aditivos gateados; no reclasificar organizaciones ni reabrir payroll/relaciones workforce.
- Claims o contexto no soportados fallan cerrado. No alterar el inventario MCP ni el transporte en esta task.

Esta decisión amplía sólo el carril interno nativo de las decisiones nativa/federación anteriores. Entra
legado y acceso externo mantienen sus contratos hasta la activación específica de sus consumers.

## Revisit When

- Clientes no pueden descubrir/seleccionar el emisor de forma interoperable.
- Latencia del reader requiere caché: demostrar invalidación y ventana ≤60 s antes de introducirla.
- Se requiere MFA upstream o APIs Graph: revisión separada de assurance/consentimiento y token custody.
- No hay relación canónica verificable para una población: resolver política explícita, no bypass.

## Aclaración de revocación por token — 2026-09-05

El recheck interno valida también el `jti` firmado de cada access token contra el ledger OAuth.
El gateway exige el identificador base64url de 22 caracteres que emite `generateOpaqueId(16)` y lo
transporta como `jti` al reader de máquina existente. No consulta `/oauth/introspect` ni envía el
bearer al provider. El ledger debe corresponder a environment, sujeto, cliente y contexto, estar
sin revocar y no vencido; issuer, audiencia, versión y `gv` conservan sus verificaciones canónicas
por contexto/configuración. No se introduce otra caché positiva ni una migración.

Motivo: revocar consentimientos o familias ya invalida sus filas OAuth, pero el recheck limitado al
contexto/grant no observaba esa invalidación. La lectura del token permite denegar la familia revocada
sin revocar otras familias que comparten sesión/cliente/contexto. El acceso interno exige esta
comprobación antes de activar la cohorte. Los bindings externos legacy sin contexto conservan su
contrato; esta decisión no acredita una federación externa ni su revocación operativa completa.

## Aclaración del contrato OIDC upstream — 2026-09-05

La solicitud de identidad usa los scopes OIDC `openid profile`: `profile` es requerido por Entra para
emitir `oid`, que forma parte de la identidad canónica junto a `tid`. No habilita Graph como provider
MCP ni introduce scopes de APIs de negocio, `offline_access` o custody de refresh tokens upstream.
Se mantienen firma, issuer, audience, nonce, PKCE, tenant, object ID y frescura. `auth_time` se configura
como claim ID esencial en la aplicación; la instancia Entra fue releída y cumple ese contrato.

La auditoría interna puede registrar una clasificación cerrada de la etapa que rechazó el login;
no puede registrar URLs OAuth, códigos, tokens, valores de claims, cuerpos upstream ni mensajes
crudos. La respuesta pública conserva el error genérico. El primer canary llegó desde Microsoft al
callback pero fue rechazado; esta aclaración corrige el contrato documentado y no acredita aún un
login operativo. [Contrato Microsoft](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference).

El instante de validación del ID token se obtiene después de leer la respuesta del token endpoint,
no al llegar el callback. La regresión con JWT firmado reproduce emisión en el segundo siguiente al
callback: el token válido se acepta al recibirlo y el expirado en tránsito se rechaza. No se añade
tolerancia al reloj, extensión de TTL ni fallback de identidad.


## Delta de integridad y población — 2026-09-05 (decisión A)

La revisión arquitectónica de TASK-1836 confirma una desviación del writer único: el command interno
escribió bindings, grants y source links compartidos con audit/outbox internos, pero sin el audit/outbox
canónico de esas mutaciones. No constituye ausencia total de audit; sí rompe el contrato de ownership y
la observabilidad compartida. El piloto permanece OFF y esta decisión exige reparación antes de activarlo.

Se adopta **A: núcleo transaccional canónico compartido**, descartando declarar permanentemente un
segundo writer. Las primitives de `identity/external-access/authority-transactions.ts` poseerán las
mutaciones compartidas, su audit, outbox y versión, usando la misma transacción del command llamador.
Los wrappers externos e internos conservan sus capabilities y políticas; no se crean transacciones anidadas
independientes. El audit interno de enrollment se conserva como evidencia complementaria.

El binding tendrá población persistida e inmutable `external | internal`, distinta de `issuer_class`.
La membership externa continúa siendo una invitación `linked` y exige cliente activo. La membership
interna continúa siendo enrollment vigente más identidad, pertenencia y relación laboral canónicas;
no se fabrican invitaciones ni se clasifica a Efeonce como cliente. La organización propia debe tener
`status=active`, `active=true` e `is_operating_entity=true`; su lifecycle comercial no concede ni revoca
por sí mismo autoridad interna. Los readers, writers, recuperación y revocación respetarán la población.
La recuperación externa no puede desactivar source links protegidos por un enrollment interno.

La migración aditiva clasifica únicamente bindings sustentados por enrollment verificable y rechaza
mezclas ambiguas de invitaciones/grants. Conserva IDs, subjects e historia y aumenta `gv` al clasificar
para invalidar contextos anteriores. No infiere población desde emails, issuer ni prefijos. La regularización
posterior es un command idempotente, con dry-run, actor y razón actuales, referencias al audit interno
original y eventos explícitos de reconciliación; no inserta timestamps históricos ficticios ni reescribe logs.

La señal `identity.external_binding.unaudited_write` tiene steady 0: observa bindings activos y grants
activos vigentes sin evidencia canónica aplicada y correlacionada de creación o reconciliación. Un evento
ajeno o denegado no satisface el contrato. Fallar la consulta produce `unknown`, nunca cero artificial.

Aceptación: aislamiento de población y recuperación, organización suspendida denegada, ausencia de grants
internos generales sin persona, atomicidad estado/audit/outbox/versiones, detector SQL real y smoke externo
sin regresión. Secuencia: código y migración compatibles con gate OFF, regularización con evidencia,
publicación gobernada y canaries reales. Esta decisión no declara esas verificaciones ya completadas.


### Resolución y diagnóstico por población

La fachada de dispatch existente del reader ecosystem selecciona autoridad interna sólo con contexto
interno y `jti` válidos, y devuelve `population=internal`; el recorrido sin contexto conserva el resolver
externo y sus requisitos. Son dos políticas explícitas detrás de una frontera común, no dos resolvers que
deban producir la misma respuesta para toda persona. `resolveExternalAccess=internal_population` deniega el recorrido externo para un source link
propiedad de enrollment interno, incluso revocado; no crear una membership externa para
hacer coincidir resultados ni usar esa diferencia sola como alerta `resolver_divergence`.

Soporte debe identificar población y procedencia antes de interpretar un denial. El resolver externo
registra denials en `external_access_resolution_log`: llamar ambos resolvers para compararlos no es un
diagnóstico puramente read-only y contaminaría la señal de intentos externos. La evidencia operativa de
la fachada exige el contexto/token real en el canary; un reader externo aislado no describe acceso interno.
Inconsistencias con la población persistida se rechazan y se prueban como tales; ausencia de audit se mide
por `unaudited_write`. Un diagnóstico administrativo adicional sin token requeriría contrato de sólo lectura
específico, no ampliar permisos del resolver externo. No es requisito para autorizar el canary actual.


### Diagnóstico permanente y reconciliación verificable

`internal_population` es un outcome cerrado del reader, su log PG y el gateway; nunca concede acceso ni
invoca un fallback interno. Precedencia: environment inactivo, colisión de links activos, propiedad interna,
y finalmente controles externos. La propiedad persiste aunque el enrollment/link/perfil esté inactivo;
la elegibilidad se decide únicamente por el carril interno con contexto firmado. No se registra `unbound`
para este caso ni se incluye en `unbound_dispatch_attempt`.

`identity.external_binding.mixed_population` cuenta bindings distintos con cualquiera de estos defectos,
en todo estado histórico (steady 0, error si >0, unknown si falla SQL):

- Binding interno con cualquier invitación externa o grant sin persona, sin vencimiento, o sin enrollment
  del mismo binding/persona/environment.
- Enrollment con binding inexistente/externo, environment distinto o entidad operativa ajena a EO-ORG-0007.
- Links nativo/upstream inexistentes o incoherentes en perfil, sistema, tipo u object ID; ausencia del
  client_user que correlaciona perfil, tenant y object ID canónicos.

Revocación, vencimiento y links inactivos coherentes no son mezcla. La señal no llama resolvers ni compara
sus resultados. Las pruebas SQL corrompen cada relación en tablas temporales y comprueban deduplicación.
El reader interno exige vencimiento futuro; NULL conserva semántica legacy sólo en grants externos.

La regularización exige evidencia interna original del grant con capability y vencimiento idénticos.
No puede certificar una ampliación de autoridad como recuperación de auditoría. Evidencia canónica previa
requiere dimensiones correlacionadas y outbox correspondiente; si falta esa pareja, se registra una nueva
reconciliación actual, atómica e idempotente. No se reescriben los audits previos ni se rejuvenece el grant.

### Solicitud de autenticación reciente compatible con Entra — 2026-09-05

Se usa `prompt=login` en lugar de `max_age=0`: Microsoft permite solicitar credenciales
explícitamente sin introducir el efecto de max_age corto sobre la duración del token.
La evidencia real disponible es `jwt_expired`; la causalidad de max_age para este ID token
queda pendiente del canary. Se conserva expiración estricta y auth_time obligatorio firmado,
no futuro, no anterior a now−600s ni al inicio server-side−60s. `auth_time<=iat` no es
un requisito OIDC y se elimina; no se elimina ni sustituye auth_time. El navegador no puede
eludir la frescura retirando prompt porque el callback la verifica contra la transacción.
[Microsoft OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc) ·
[OIDC ID token](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) ·
[Antecedente MSAL](https://github.com/AzureAD/microsoft-authentication-library-for-python/discussions/598).

### Presentación de consentimiento separada por población — 2026-09-05

La resolución vigente de autoridad precede a cualquier lectura de nombres. El consentimiento
interno usa una proyección mínima de bindings internos del store interno; el externo conserva
el reader restringido a externos. Ambos verifican población, binding, organización, entorno,
estado, revocación y gv. Un reader ausente o de otra población deniega, nunca elige fallback.
El canary real detectó el antiguo uso del reader externo para internos después de un SSO
correcto; la corrección no modifica la autoridad ni amplía el reader externo.

### Formularios HTML y origen CSRF — 2026-09-05

Las páginas HTML usan `Referrer-Policy: strict-origin`: no envían rutas ni queries como
Referer y conservan Origin en POST HTTPS del formulario. JSON y redirecciones mantienen
no-referrer. No se relaja el guard de origen ni se acepta Origin:null indiscriminadamente.
Reproducción en navegador integrado: policy anterior produce Origin opaque/null con
Sec-Fetch-Site same-origin y decision válida; strict-origin produce origen propio y Referer
sólo origen. [Fetch Standard](https://fetch.spec.whatwg.org/#append-a-request-origin-header).
La prueba de navegador canónica debe ejecutar el handler real, con controles negativo
no-referrer y cross-origin; un test unitario con header Origin escrito a mano no reproduce
la interacción del navegador y la política de respuesta.

La página de consentimiento permite además en form-action el origen del callback que
authorize ya resolvió contra los redirects registrados del cliente. No toma ese origen
directamente de la query ni amplía la CSP de otras páginas. La ruta POST→authorize→callback
se prueba en navegador: self-only bloquea la redirección final en Chromium; permitir el
origen validado conserva el flujo y sigue bloqueando destinos de otros orígenes. La CSP
no sustituye la coincidencia exacta de redirect_uri realizada por el protocolo.

## Entrada directa a Microsoft — 2026-09-06

Hallazgo del operador posterior a PR225: el botón de Claude existía pero `corporateLoginUrl`
lo ocultaba en `/login` sin `return_to`. El canary anterior inició desde OAuth y no acreditaba
la entrada directa. La corrección reutiliza el mismo botón, icono, shell y estilos; no es un rediseño.

Flujo directo: `/login` → botón Microsoft → `/auth/internal/login` → Entra → callback protegido
→ `/auth/session` HTML autenticado, con salida por el POST de logout existente. Sólo la ausencia
de `return_to` selecciona ese destino fijo; vacío/duplicado/inválido se rechaza. El único destino
adicional admitido es `/auth/session` exacto, sin query/fragmento; se valida al iniciar y al consumir
la transacción. OAuth conserva su retorno validado y crea sus contextos y permisos por su carril.
No se fabrica cliente, audiencia, grant ni contexto para iniciar una sesión directamente.

`GET /auth/session` reutiliza `resolvePersonSession`: HTML explícito muestra la confirmación y
logout; anónimo/revocado muestra login con401, sin afirmar sesión activa. JSON conserva su contrato,
`Vary: Accept` y no-store. Copy directo en `src/lib/copy/auth-server.ts` distingue sesión de permisos.
La dirección visual es reuse de «Nocturno editorial» de Claude, sin CSS ni primitive nuevos.

Validación local:235 pruebas pasan/4 live omitidas, tipos y lint dirigido correctos. Chromium6/6
para origen/CSP/redirect; renderers reales a1440px y390px con Microsoft visible, foco de teclado,
sin overflow ni errores JS; fixtures visuales no sustituyen sesión real. Revisión independiente
sin hallazgos de seguridad. Publicación y verificación de `/login` público todavía pendientes.
