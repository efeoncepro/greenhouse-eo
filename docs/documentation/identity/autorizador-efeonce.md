# Autorizador de Efeonce (`auth.efeonce.org`)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-04 por Claude (TASK-1829)
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1828 · TASK-1829)
> **Documentacion tecnica:** [EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) (ADR nativo; §Delta 2026-09-04 = lo implementado), [EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md) (contrato OAuth: endpoints, claims, tablas e invariantes de TASK-1829), [GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md#authorization-server-propio-authefeonceorg--task-1828-2026-09-04), [EPIC-044](../../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md)
> **Manual de uso:** [Operar el autorizador de Efeonce](../../manual-de-uso/identity/operar-autorizador-efeonce.md)

---

## La idea central

Efeonce decidió tener su **propio autorizador**: un servicio que, con el tiempo, será la puerta por la que una
persona de un cliente demuestra quién es y recibe un "pase" (un token) para usar el MCP de Efeonce. No se compró
a un tercero; lo opera Efeonce en `https://auth.efeonce.org`.

Piensa en él como una **oficina de pases** recién inaugurada. Hoy la oficina existe, tiene luz, la puerta abre y
la máquina que sella los pases está instalada y probada. Desde `TASK-1829` también existe la **ventanilla para
aplicaciones**: las reglas para que una app (Claude, Codex, ChatGPT) se presente, pida permiso y reciba un pase
están escritas en código y probadas, aunque todavía detrás de un interruptor apagado. Lo que falta es la
ventanilla para **personas**: nadie puede demostrar quién es todavía, porque el login se construye en
`TASK-1830`. Y sin persona autenticada, la oficina no entrega ningún pase.

## Qué hace hoy

Lo entregado en `TASK-1828` es la base: el servicio corriendo, la llave con la que firma y la dirección pública.
`TASK-1829` agregó encima la superficie OAuth (ver [Cómo se conecta una aplicación](#cómo-se-conecta-una-aplicación-oauth)),
que hoy está en código pero con su propio interruptor apagado.

| Pieza | Qué es, en simple | Estado |
| --- | --- | --- |
| **Servicio** | Un programa pequeño corriendo en Google Cloud (Cloud Run, región `us-east4`), uno solo para staging y producción. | Vivo en staging desde 2026-09-04; producción entra con el próximo release. |
| **Dirección** | `https://auth.efeonce.org`, servida por la **misma puerta de entrada** (balanceador, IP y protección anti-abuso) que ya usa `mcp.efeonce.org`. No se creó una puerta nueva. | Vivo; certificado activo. |
| **Llave de firma** | La "máquina de sellar" pases. Vive en un módulo de hardware de Google Cloud (Cloud KMS HSM): el servicio puede pedirle que firme, pero **nadie puede sacar la llave de ahí**, ni siquiera Efeonce. | Creada y rotada una vez (ver más abajo). |
| **Registro de llaves** | Una tabla propia (`greenhouse_auth.signing_keys`) que dice qué versión de la llave está activa, cuál está en retiro y cuál ya se retiró, con un historial que no se puede borrar. Sólo guarda la parte **pública**. | Aplicado en la base de datos. |
| **Interruptor** | El flag `AUTH_SERVER_ENABLED`: con OFF el servicio sólo responde "estoy vivo"; con ON publica también su estado de salud completo y sus llaves públicas. | ON desde 2026-09-04. |

Concretamente, hoy responde tres cosas:

| Ruta | Para qué | Qué esperar |
| --- | --- | --- |
| `GET /healthz` | "¿Está vivo el servicio?" | Siempre `200`. |
| `GET /readyz` | "¿Está listo para trabajar?" — revisa base de datos, la llave en KMS y que exista una llave activa. | `200` con todo bien; `503` si el flag está OFF o alguna revisión falla (la respuesta dice cuál). |
| `GET /.well-known/jwks.json` | Las **llaves públicas** con las que cualquiera puede verificar un pase firmado por Efeonce. | La llave activa y, durante una rotación, también la que se está retirando. `404` con el flag OFF. |

Se verificó en vivo el 2026-09-04: `/readyz` respondió `200` con base de datos, KMS y llave activa en orden, y un
token de prueba firmado por el hardware se validó correctamente contra esas llaves públicas — exactamente la
comprobación que hará el MCP cuando empiece a aceptar estos pases.

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

Esta parte la entregó `TASK-1829` (2026-09-04, `code complete, rollout pendiente`). Vive detrás del flag
`AUTH_SERVER_OAUTH_ENABLED`, que está **apagado por defecto** en `services/auth-server/deploy.sh`: mientras siga
apagado, todas las rutas de abajo responden `404` (salvo el JWKS, que depende del otro flag). El flujo, en simple,
tiene cinco momentos.

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
**rechazar**. La decisión se guarda por (persona, app, alcance): la próxima vez no se vuelve a preguntar, salvo
que la app pida un alcance nuevo. Los alcances de escritura exigen además un **step-up** (segundo factor, lo trae
`TASK-1830`). Hoy la pantalla es una página mínima con el isotipo de Efeonce; la task `ui-ux` la reemplazará sin
cambiar el contrato.

### 4. La app recibe sus pases (`POST /oauth/token`)

| Pase | Qué es | Cuánto dura | Qué pasa si se reusa |
| --- | --- | --- | --- |
| **Access token** | Un JWT firmado en el HSM (ES256) que dice quién es el emisor, la persona (`sub`), para qué recurso (`aud`, el MCP), qué app (`azp`), qué alcances (`scope`) y la versión de permisos de su organización (`gv`). | **15 minutos.** | Se verifica con las llaves públicas; cuando expira, la app usa el refresh. |
| **Refresh token** | Una cadena opaca que sirve para pedir un access token nuevo. **Rota en cada uso**: el anterior deja de servir. | 30 días desde el último uso, con tope absoluto de 90 días. | Si alguien presenta un refresh ya usado (o un código de autorización ya canjeado), **se revoca toda la familia** de pases de esa app y persona, y salta una señal. |

`gv` merece una explicación: es el número de versión de los permisos que la organización cliente le dio a esa
persona (el binding de `TASK-1631`). Si nadie ligó a la persona a una organización, el emisor responde
`access_denied` y no entrega nada. Cada vez que Efeonce revoca un grant, ese número sube, y el gateway lo
compara en cada llamada.

### 5. Cancelar y consultar

- `POST /oauth/revoke` (RFC 7009): la app o el operador cancela un pase; se cancela la familia completa.
- `POST /oauth/introspect` (RFC 7662): un cliente confidencial pregunta si un pase sigue vivo. El gateway MCP
  **no** usa esta ruta: verifica la firma con el JWKS y vuelve a comprobar `gv`, que es más rápido y no depende
  de que el emisor esté disponible.
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

## Qué pasa hoy si intentas autorizar

| Situación | Respuesta | Por qué |
| --- | --- | --- |
| Flag `AUTH_SERVER_OAUTH_ENABLED` apagado (estado actual en todos los entornos) | `404` en metadata y en `/oauth/*` | La superficie está en código pero no publicada. Prenderla en staging exige registrar el emisor como environment y validar la metadata (ver el manual). |
| Flag prendido, una app lee la metadata o se registra por DCR | Funciona (`200` / `201`) | Estas rutas no necesitan a la persona. |
| Flag prendido, una app manda a la persona a `/oauth/authorize` | **"Necesitas iniciar sesión"** (`login_required`; con `prompt=none`, redirect a la app con `error=login_required`). **No se emite ningún código.** | Todavía no existe quien autentique a la persona: el emisor no acepta la sesión del portal ni ninguna otra. `TASK-1830` trae passkeys, magic link y TOTP con su cookie propia `__Host-efeonce_auth`. |
| Flag prendido, persona autenticada pero sin organización ligada | `access_denied` | Sin membership `bound` (`TASK-1631`) no hay `gv`, y sin `gv` no hay pase. |

El flujo completo (metadata → registro → consentimiento → código → JWT verificado contra el JWKS → refresh →
reuso → revocación → introspección) ya se prueba de punta a punta en tests dentro del proceso; lo que falta es
correrlo en staging con el flag prendido y, para la parte de personas, `TASK-1830`.

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

## Qué no hace todavía

| Falta | Qué significa para una persona | Task |
| --- | --- | --- |
| Superficie OAuth **prendida** en un entorno real | Está en código (`develop`) y probada, pero `AUTH_SERVER_OAUTH_ENABLED` sigue apagado: ninguna app puede leer la metadata ni pedir un pase todavía. Prenderla en staging exige registrar el environment `efeonce-auth`, validar la metadata y probar clientes CIMD/DCR; producción entra con el próximo release. | `TASK-1829` (rollout pendiente) |
| Pantalla de consentimiento definitiva | Hoy es una página mínima servida por el emisor; la task `ui-ux` la reemplaza sin cambiar rutas ni campos. | task `ui-ux` (U06) |
| Login de personas (passkeys, magic link, TOTP, recuperación) | No hay pantalla donde alguien demuestre quién es. No habrá contraseñas. | `TASK-1830` |
| Que el MCP acepte estos pases | El gateway sigue aceptando sólo la identidad interna (Entra). | `TASK-1831` |
| Pruebas con clientes reales (canaries) | Primera cohorte de clientes. | `TASK-1832` |
| Pentest y rotación programada | Aseguramiento antes de abrir a clientes. | `TASK-1833` |
| Que el portal Greenhouse use este login | Convergencia del login de clientes del portal. | `TASK-1834` |

**Importante:** el login de Greenhouse **no cambia**. Entrar al portal sigue siendo igual que antes; este servicio
no comparte sesiones, cookies ni secretos con el portal.

## Cómo se relaciona con Greenhouse

- Comparte la **base de datos** (`greenhouse-pg-dev`), pero en un esquema propio (`greenhouse_auth`) que guarda
  el registro de llaves y, desde `TASK-1829`, las siete tablas del protocolo OAuth (clientes, caché CIMD,
  códigos, tokens, consentimientos y auditoría). No toca usuarios, roles ni sesiones del portal.
- El portal expone dos rutas de administración (registrar cliente confidencial, revocar consentimiento) que
  llaman a los **mismos commands** que usa el emisor; no hay lógica duplicada en la UI.
- Comparte el **repositorio** (`services/auth-server/`) y el **carril de despliegue** de los workers Cloud Run:
  se despliega a staging al empujar a `develop` y a producción sólo por el release controlado.
- Usa las mismas piezas de **observabilidad**: incidentes en Sentry (dominio `identity`, componente
  `auth-server`) y cinco señales en `/admin/operations` (dos de llaves, tres del protocolo OAuth).
- Está aislado a propósito: cookie propia, secretos propios, identidad propia en Google Cloud. Es una excepción
  documentada del programa de desacople (`EPIC-027`) porque no toca el portal Next.js.

## Cómo se relaciona con el MCP

- Vive **detrás de la misma puerta** que `mcp.efeonce.org`: mismo balanceador, misma IP (`34.111.78.237`) y la
  misma protección Cloud Armor. Se agregó un segundo "nombre de host" con su propio certificado; nada del gateway
  se destruyó ni se reemplazó. El interruptor de ese host vive en el Terraform del repo `efeonce-mcp`
  (`enable_auth_host`).
- El plan es que el gateway MCP lea las llaves públicas de `auth.efeonce.org` y verifique cada pase con ellas,
  además de comprobar el binding con la organización cliente (ver
  [Binding de Identidad Externa para el MCP](binding-identidad-externa-mcp.md)). Eso se conecta en `TASK-1831`.
- El pase que emite ya trae lo que el gateway necesita (`sub`, `azp`, `scope`, `gv`): `TASK-1831` sólo tiene que
  verificar la firma con el JWKS y comparar `gv` con el binding. El gateway no consulta `introspect`.
- Costo adicional estimado: unos **USD 15 al mes** (una instancia mínima en producción, la llave en hardware y
  menudencias). Sin balanceador ni protección nuevos.

> Detalle técnico: Terraform en `efeonce-mcp/infra/terraform` (commit `6a144a5`), backend
> `efeonce-auth-server-backend`, certificado `efeonce-auth-server-cert`; contrato del gateway en
> [EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md](../../architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
> §`Slice 0 gateway authorization-context contract`.

## Qué señales verás en `/admin/operations`

| Señal | Qué vigila | Cuándo se pone en alerta |
| --- | --- | --- |
| `auth.issuer.jwks_unreachable` | Que las llaves públicas se puedan leer desde Greenhouse y coincidan con el registro. | Muestra `not_configured` hasta que Vercel tenga `AUTH_SERVER_JWKS_URL`; `error` si el endpoint no responde o publica llaves distintas a las registradas. |
| `auth.signing_keys.lifecycle` | Que exista exactamente una llave activa y que ninguna se quede "en retiro" para siempre. | `error` sin llave activa o con más de una; `warning` si una llave lleva más de 7 días en retiro. |
| `auth.oauth.code_reuse_detected` | Que nadie canjee dos veces el mismo código de autorización. | Cualquier reuso en 24 h (`error`): la familia ya quedó revocada; puede ser un cliente mal implementado o un código robado. Normal = 0. |
| `auth.oauth.refresh_reuse_detected` | Que nadie presente un refresh token ya rotado o revocado. | Cualquier reuso en 24 h (`error`): igual que arriba, la familia ya quedó revocada. Normal = 0. |
| `auth.oauth.cimd_rejected` | Que los documentos CIMD de las apps sean válidos y seguros. | Cualquier rechazo en 24 h (`warning`): una app se presentó con un documento inválido o apuntando a una red privada; el motivo queda en la auditoría. Normal = 0. |
| Incidentes Sentry `component=auth-server` | Fallos al firmar (KMS), de base de datos o del servicio. | Cualquier incidente nuevo. |

> Detalle técnico: [`src/lib/reliability/queries/auth-server-signals.ts`](../../../src/lib/reliability/queries/auth-server-signals.ts);
> runbook operativo en [`docs/operations/runbooks/auth-server.md`](../../operations/runbooks/auth-server.md).
