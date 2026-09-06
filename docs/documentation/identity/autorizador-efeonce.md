# Autorizador de Efeonce (`auth.efeonce.org`)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.4
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-06 por Claude (TASK-1837)
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1828–1831 · TASK-1836)
> **Documentacion tecnica:** [EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) (ADR nativo y contrato interno vigente), [EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md) (contrato OAuth: endpoints, claims, tablas e invariantes de TASK-1829), [GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md#authorization-server-propio-authefeonceorg--task-1828-2026-09-04), [EPIC-044](../../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md)
> **Manual de uso:** [Operar el autorizador de Efeonce](../../manual-de-uso/identity/operar-autorizador-efeonce.md)

---

## La idea central

Efeonce ID autentica a las personas y emite tokens propios para conectar aplicaciones al MCP de Efeonce.
El acceso corporativo usa Microsoft como proveedor de login; la autoridad para cada aplicación y
organización la resuelve Efeonce. Compartir un emisor no comparte permisos entre empleados y clientes.

## Qué hace hoy

La base de TASK-1828 (servicio, llaves y dirección pública), el OAuth de TASK-1829 y la autenticación de
personas de TASK-1830 están integrados. TASK-1836 agrega el recorrido corporativo y TASK-1831 su consumo
en el gateway. La cohorte interna está verificada; los límites y pendientes se detallan más abajo.

| Pieza | Qué es, en simple | Estado |
| --- | --- | --- |
| **Servicio** | Un programa pequeño corriendo en Google Cloud (Cloud Run, región `us-east4`), uno solo para staging y producción. | **En producción desde 2026-09-04** (release `9100bbd2765d`, revisión `auth-server-00005-pk8`). |
| **Dirección** | `https://auth.efeonce.org`, servida por la **misma puerta de entrada** (balanceador, IP y protección anti-abuso) que ya usa `mcp.efeonce.org`. No se creó una puerta nueva. | Vivo; certificado activo. |
| **Llave de firma** | La "máquina de sellar" pases. Vive en un módulo de hardware de Google Cloud (Cloud KMS HSM): el servicio puede pedirle que firme, pero **nadie puede sacar la llave de ahí**, ni siquiera Efeonce. | Creada y rotada una vez (ver más abajo). |
| **Registro de llaves** | Una tabla propia (`greenhouse_auth.signing_keys`) que dice qué versión de la llave está activa, cuál está en retiro y cuál ya se retiró, con un historial que no se puede borrar. Sólo guarda la parte **pública**. | Aplicado en la base de datos. |
| **Interruptor** | El flag `AUTH_SERVER_ENABLED`: con OFF el servicio sólo responde "estoy vivo"; con ON publica también su estado de salud completo y sus llaves públicas. | ON desde 2026-09-04. |

La base de salud y llaves expone:

| Ruta | Para qué | Qué esperar |
| --- | --- | --- |
| `GET /healthz` | "¿Está vivo el servicio?" | Siempre `200`. |
| `GET /readyz` | "¿Está listo para trabajar?" — revisa base de datos, la llave en KMS y que exista una llave activa. | `200` con todo bien; `503` si el flag está OFF o alguna revisión falla (la respuesta dice cuál). |
| `GET /.well-known/jwks.json` | Las **llaves públicas** con las que cualquiera puede verificar un pase firmado por Efeonce. | La llave activa y, durante una rotación, también la que se está retirando. `404` con el flag OFF. |

El release inicial `9100bbd2765d` del 2026-09-04 publicó salud y JWKS. La superficie OAuth se activó
después y el canary interno ya pasó firma/verificación y dispatch reales; el estado inicial OAuth OFF
no es el estado vigente. Greenhouse tiene configurada la dirección JWKS para verificar las llaves.

> Detalle técnico: rutas y flag en [`services/auth-server/server.ts`](../../../services/auth-server/server.ts) y
> [`services/auth-server/README.md`](../../../services/auth-server/README.md); estado por entorno del flag en
> [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md); lo implementado, en el
> [§Delta 2026-09-04 del ADR](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md#delta-2026-09-04--task-1828-ejecutada-runtime-llaves-front-door).

## La llave de firma, explicada

- **Nunca sale del hardware.** El servicio le manda un resumen del pase y recibe la firma de vuelta. Si alguien
  copiara el servidor entero, seguiría sin tener la llave.
- **Tiene versiones.** Cada versión se identifica con un `kid` (un nombre corto derivado de la llave pública).
  Hoy la versión 2 es la **activa** (la que firma) y la versión 1 quedó **en retiro**: todavía sirve para
  verificar pases viejos, pero ya no firma.
- **Rotar con solapamiento.** Al cambiar de llave, la anterior se mantiene publicada al menos una hora para que
  un pase firmado justo antes del cambio siga siendo válido. Retirarla antes de tiempo está bloqueado (sólo se
  fuerza en un incidente, y queda registrado).
- **Sólo una activa.** La base de datos impide que haya dos llaves activas al mismo tiempo.
- **Permisos mínimos.** La identidad del servicio sólo puede *firmar y verificar* con esa llave; no puede crear
  ni destruir versiones. Eso lo hace una persona con `gcloud` o la herramienta de rotación.

> Detalle técnico: [`src/lib/auth-server/keys/`](../../../src/lib/auth-server/keys/) (adapter KMS + store de
> llaves, 15 tests), migración `migrations/20260904111156246_task-1828-greenhouse-auth-schema.sql`, CLI
> `pnpm auth-server:rotate-key` (`scripts/auth-server/rotate-signing-key.ts`).

## Cómo se conecta una aplicación (OAuth)

Esta parte la entregó `TASK-1829` y su activación ya permite el canary interno de TASK-1836. Vive detrás
de `AUTH_SERVER_OAUTH_ENABLED`: cuando está apagado, las rutas OAuth responden `404` (el JWKS depende
del flag general). Default, configuración desplegada y cohorte autorizada se verifican por separado.
El flujo tiene cinco momentos.

### 1. La app lee las reglas (metadata)

`GET /.well-known/oauth-authorization-server` (y su versión OIDC, `/.well-known/openid-configuration`) es la
"hoja informativa" de la oficina: dice quién es el emisor (**exactamente** `https://auth.efeonce.org`, nunca
otra dirección), dónde están las ventanillas, qué alcances (scopes) existen y qué exige. Dos exigencias fijas:
PKCE con `S256` (no hay otra opción) y que la app pueda presentarse con un documento CIMD
(`client_id_metadata_document_supported: true`). La lista de alcances publicada es sólo la de lecturas; los de
escritura existen pero se piden explícitamente y exigen un segundo factor.

### 2. La app se presenta (registro de clientes)

| Forma | Cómo funciona | Para quién | Redirects que acepta |
| --- | --- | --- | --- |
| **CIMD** (la principal) | El identificador de la app es la **URL de un documento** que la describe. El emisor lo descarga, lo valida (redirects, sin secretos, host con nombre real, nunca una IP privada) y lo recuerda 24 horas. Si el documento no cumple, se rechaza y queda una señal. | Apps públicas modernas (Claude Code, claude.ai). | Loopback `127.0.0.1` / `[::1]` / `localhost` en **cualquier puerto**, o HTTPS exacto. |
| **DCR** (compatibilidad) | La app se registra sola con `POST /oauth/register` y recibe un identificador `dcr-…`. Sólo para apps **públicas** (sin secreto). Máximo 10 registros por minuto por IP. | Apps que todavía no hablan CIMD. | Igual que CIMD. |
| **Cliente pre-registrado** (confidencial) | Lo registra un administrador de Efeonce por command (ruta admin o CLI) y recibe un **secreto que se muestra una sola vez**. | Conectores hospedados que pueden guardar un secreto (por ejemplo, un connector de ChatGPT). | Sólo HTTPS exacto; `localhost` por nombre se rechaza. |

Nunca hay comodines en los redirects, y el emisor valida el `client_id` y el `redirect_uri` **antes** de
redirigir a cualquier parte. La política de loopback en cualquier puerto es una decisión del operador del
2026-09-04: Claude Code la necesita.

### 3. La persona dice que sí (consentimiento)

`GET /oauth/authorize` es la ventanilla donde la persona ve qué app pide qué alcances y decide **permitir** o
**rechazar**. La decisión queda ligada a persona, app y alcances y, en el carril interno, también al contexto
de autorización: no se hereda un consentimiento de otra organización o contexto. Los alcances de escritura exigen además un **step-up** (segundo factor, lo trae
`TASK-1830`). La UI de TASK-1835 presenta el consentimiento usando una lectura de nombres de su propia población,
posterior a la comprobación de autoridad; una proyección ausente o incompatible deniega.

Desde TASK-1837 la pantalla de consentimiento muestra además el bloque **"Destino de la autorización"** con el
host al que se enviará el código de autorización (el del `redirect_uri` ya validado contra el cliente), con la
nota "El código de autorización se enviará a esta dirección". Por qué: el nombre de la aplicación lo declara la
propia aplicación y puede sonar creíble; el destino no se puede maquillar. Mostrarlo le permite a la persona
detectar una app que quiere llevarse el código a un dominio ajeno y es un MUST de la especificación de
autorización MCP. El emisor se niega a renderizar el consentimiento sin ese host (no hay pantalla "sin destino").
El tratamiento visual del bloque dentro de la ficha de la aplicación es de TASK-1835.

### 4. La app recibe sus pases (`POST /oauth/token`)

| Pase | Qué es | Cuánto dura | Qué pasa si se reusa |
| --- | --- | --- | --- |
| **Access token** | Un JWT firmado en el HSM (ES256) que dice quién es el emisor, la persona (`sub`), para qué recurso (`aud`, el MCP), qué app (`azp`), qué alcances (`scope`) y la versión de permisos (`gv`) y, para internos, el contexto de autorización firmado. | **15 minutos.** | Se verifica con las llaves públicas; cuando expira, la app usa el refresh. |
| **Refresh token** | Una cadena opaca que sirve para pedir un access token nuevo. **Rota en cada uso**: el anterior deja de servir. | 30 días desde el último uso, con tope absoluto de 90 días. | Si alguien presenta un refresh ya usado (o un código de autorización ya canjeado), **se revoca toda la familia** de pases de esa app y persona, y salta una señal. |

`gv` es la versión del binding que autoriza la operación. Para internos pertenece al binding seleccionado
dentro del contexto; no se toma el máximo de otras organizaciones. Sin autoridad vigente, el emisor deniega.
Revocar un grant aumenta esa versión y el gateway la contrasta antes de ejecutar. Refresh conserva el contexto,
los scopes y el instante de autenticación: no renueva permisos ni hace más reciente un segundo factor.

### 5. Cancelar y consultar

- `POST /oauth/revoke` (RFC 7009): la app o el operador cancela un pase; se cancela la familia completa.
- `POST /oauth/introspect` (RFC 7662): un cliente confidencial pregunta si un pase sigue vivo. El gateway MCP
  **no** usa esta ruta: verifica la firma con el JWKS y reconsulta al reader confiable. En internos también
  exige contexto, sesión/procedencia y el `jti` vigente del ledger de access tokens. Si no puede verificar, deniega.
- Revocar el **consentimiento** de una persona a una app (lo hace un administrador) cancela todas sus familias
  de pases vivas con esa app.

> Detalle técnico: contrato completo en
> [EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md);
> dominio en [`src/lib/auth-server/oauth/`](../../../src/lib/auth-server/oauth/) (metadata, CIMD, DCR,
> authorize, token, revoke/introspect, consent, store PostgreSQL) y handler en
> [`services/auth-server/app.ts`](../../../services/auth-server/app.ts); siete tablas en `greenhouse_auth`
> (`oauth_clients`, `cimd_cache`, `authorization_codes`, `refresh_tokens`, `access_tokens`, `client_consents`,
> `oauth_audit_events` append-only) por la migración
> `migrations/20260904130826694_task-1829-auth-oauth-tables.sql`, ya aplicada en Cloud SQL; 68 tests
> (`pnpm vitest run src/lib/auth-server`) más un smoke del store contra PostgreSQL real
> (`pnpm auth-server:oauth-store:smoke`). Copy de la pantalla en `src/lib/copy/auth-server.ts`.

## Entrar y autorizar hoy

| Situación | Resultado |
| --- | --- |
| Abres `/login` directamente con acceso interno habilitado | Aparece **Continuar con Microsoft**. Tras autenticar, el destino es la confirmación de sesión; no se conceden permisos a una app. |
| Una app inicia OAuth y no tienes sesión | Efeonce ID presenta login y conserva el retorno OAuth validado. Con `prompt=none`, devuelve `login_required`. |
| Tienes sesión corporativa y enrollment/grants vigentes | Se resuelve el contexto del cliente y organización, se solicita el consentimiento que falte y se emite el token nativo. |
| Tienes sesión pero falta autoridad, venció el permiso o el contexto es ajeno | Se deniega. El correo, un rol del portal o compartir emisor no sustituyen esos controles. |
| Un flag del carril se apaga | El componente deniega el carril interno, incluido refresh o dispatch según el flag; no basta una sesión/token previamente emitido. |

La entrada directa reutiliza el botón de Claude. Antes el código lo ocultaba si no había `return_to`,
por eso el canary desde OAuth funcionaba sin acreditar la página `/login` normal. La corrección fue
desplegada desde `develop` y su botón/click público están verificados; el nuevo recorrido humano directo
completo sigue pendiente. Instrucciones: [Acceso corporativo a Efeonce ID](../../manual-de-uso/identity/efeonce-id-interno.md).

El canary interno real sí verificó SSO, consentimiento, emisión, lectura propia, denegación de organización
ajena, refresh y revocación antes de expirar el access token. El [mapa de evidencia](../../audits/2026-09-06-task-1836-1831-consolidated-evidence.md)
separa ese resultado de las matrices externas/multicontexto pendientes y de la promoción de PR226.

## Permisos

Las dos acciones administrativas nuevas son capabilities del módulo `organization`, hoy otorgadas sólo al rol
`efeonce_admin`:

| Capability | Qué permite | Por dónde |
| --- | --- | --- |
| `identity.auth_client.register` | Registrar un cliente OAuth **confidencial** (el que recibe un secreto). | `POST /api/admin/auth-server/oauth-clients` o `pnpm auth-server:register-client`. |
| `identity.auth_consent.revoke` | Revocar el consentimiento de una persona a una app; cancela todas sus familias de pases vivas con esa app. Exige un motivo. | `POST /api/admin/auth-server/consents/revoke`. |

Registrarse por CIMD o DCR no necesita permiso alguno: es la app la que se presenta, y el emisor la valida.
Todo evento del protocolo (autorizar, emitir, refrescar, revocar, registrar, rechazos CIMD, reusos) queda en
una auditoría que no se puede editar ni borrar, con IPs, agentes y sujetos guardados como hashes.

## Límites de la disponibilidad

El piloto interno no acredita disponibilidad general de clientes externos, la matriz completa multicontexto
ni compatibilidad con todos los clientes MCP. Esas pruebas permanecen abiertas en TASK-1831/1832/1836.
WebKit y otros pendientes de UI tienen evidencia separada; un test omitido no cuenta como aprobado.
El aseguramiento de TASK-1833 y la convergencia del portal de TASK-1834 tampoco quedan cerrados por este canary.
El trabajo posterior de invitaciones externas de TASK-1837 no forma parte de esta entrega documentada.

El login del portal Greenhouse conserva su contrato. Efeonce ID tiene cookie y sesión propias; no comparte
`NEXTAUTH_SECRET` ni convierte una sesión del portal en autorización MCP.

## Cómo se relaciona con Greenhouse

- Comparte la **base de datos** (`greenhouse-pg-dev`), pero en un esquema propio (`greenhouse_auth`) que guarda
  el registro de llaves y, desde `TASK-1829`, las siete tablas del protocolo OAuth (clientes, caché CIMD,
  códigos, tokens, consentimientos y auditoría). La autoridad compartida se modifica por los commands canónicos de identidad; no reutiliza sesiones del portal.
- El portal expone dos rutas de administración (registrar cliente confidencial, revocar consentimiento) que
  llaman a los **mismos commands** que usa el emisor; no hay lógica duplicada en la UI.
- Comparte el **repositorio** (`services/auth-server/`) y el **carril de despliegue** de los workers Cloud Run:
  se despliega a staging al empujar a `develop` y a producción sólo por el release controlado (el primero fue
  `9100bbd2765d`, 2026-09-04). Como es un solo servicio, la misma revisión sirve staging y producción.
- El emisor está registrado como environment `efeonce-auth`, activo para el piloto. Su `issuerClass`
  no decide si la persona es interna o externa; el binding persistido y el resolver correspondiente lo hacen.
- Usa las mismas piezas de **observabilidad**: incidentes en Sentry (dominio `identity`, componente
  `auth-server`) y cinco señales en `/admin/operations` (dos de llaves, tres del protocolo OAuth).
- Está aislado a propósito: cookie propia, secretos propios, identidad propia en Google Cloud. Es una excepción
  documentada del programa de desacople (`EPIC-027`) porque no toca el portal Next.js.

## Cómo se relaciona con el MCP

- Vive **detrás de la misma puerta** que `mcp.efeonce.org`: mismo balanceador, misma IP (`34.111.78.237`) y la
  misma protección Cloud Armor. Se agregó un segundo "nombre de host" con su propio certificado; nada del gateway
  se destruyó ni se reemplazó. El interruptor de ese host vive en el Terraform del repo `efeonce-mcp`
  (`enable_auth_host`).
- TASK-1831 ya verifica tokens nativos con JWKS y construye el contexto de autorización por issuer. Las tools
  tienen policy de población, scopes, capabilities y organización; aceptar el emisor no abre todas las tools.
- El reader interno revalida contexto, `gv`, elegibilidad y ledger del access token antes del dispatch.
  El retiro de una familia se observó sin esperar los 15 minutos de expiración. El carril externo mantiene
  sus propios requisitos y no hereda ese canary interno como certificación.
- Costo adicional estimado: unos **USD 15 al mes** (una instancia mínima en producción, la llave en hardware y
  menudencias). Sin balanceador ni protección nuevos.

> Detalle técnico: Terraform en `efeonce-mcp/infra/terraform` (commit `6a144a5`), backend
> `efeonce-auth-server-backend`, certificado `efeonce-auth-server-cert`; contrato del gateway en
> [EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md](../../architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
> §`Slice 0 gateway authorization-context contract`.

## Qué señales verás en `/admin/operations`

| Señal | Qué vigila | Cuándo se pone en alerta |
| --- | --- | --- |
| `auth.issuer.jwks_unreachable` | Que las llaves públicas se puedan leer desde Greenhouse y coincidan con el registro. | `AUTH_SERVER_JWKS_URL` ya está configurada en Vercel (producción y staging, 2026-09-04), así que ya no debería mostrar `not_configured`; `error` si el endpoint no responde o publica llaves distintas a las registradas. Falta una lectura humana en producción para confirmarlo. |
| `auth.signing_keys.lifecycle` | Que exista exactamente una llave activa y que ninguna se quede "en retiro" para siempre. | `error` sin llave activa o con más de una; `warning` si una llave lleva más de 7 días en retiro. |
| `auth.oauth.code_reuse_detected` | Que nadie canjee dos veces el mismo código de autorización. | Cualquier reuso en 24 h (`error`): la familia ya quedó revocada; puede ser un cliente mal implementado o un código robado. Normal = 0. |
| `auth.oauth.refresh_reuse_detected` | Que nadie presente un refresh token ya rotado o revocado. | Cualquier reuso en 24 h (`error`): igual que arriba, la familia ya quedó revocada. Normal = 0. |
| `auth.oauth.cimd_rejected` | Que los documentos CIMD de las apps sean válidos y seguros. | Cualquier rechazo en 24 h (`warning`): una app se presentó con un documento inválido o apuntando a una red privada; el motivo queda en la auditoría. Normal = 0. |
| Incidentes Sentry `component=auth-server` | Fallos al firmar (KMS), de base de datos o del servicio. | Cualquier incidente nuevo. |

> Detalle técnico: [`src/lib/reliability/queries/auth-server-signals.ts`](../../../src/lib/reliability/queries/auth-server-signals.ts);
> runbook operativo en [`docs/operations/runbooks/auth-server.md`](../../operations/runbooks/auth-server.md).


## Integridad del acceso corporativo

La pertenencia interna y la membresía cliente siguen recorridos distintos. El diagnóstico
`internal_population` rechaza una identidad corporativa en el recorrido externo; no significa que
la persona carezca de identidad ni justifica crearle una invitación cliente. El acceso corporativo
requiere su sesión y contexto propios, con permisos personales que tengan vencimiento.

La recuperación de un acceso cliente no puede reemplazar el vínculo corporativo activo. Si soporte
encuentra relaciones mezcladas o evidencia auditora incompleta, debe detener la ampliación y aplicar el rollback de la cohorte afectada según el incidente, y
seguir la [regularización gobernada](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md).
Esa reparación conserva permisos y vigencia; no es un mecanismo para conceder o renovar acceso.
