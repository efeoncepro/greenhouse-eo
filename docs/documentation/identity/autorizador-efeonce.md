# Autorizador de Efeonce (`auth.efeonce.org`)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-04 por Claude
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1828)
> **Documentacion tecnica:** [EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) (ADR nativo; §Delta 2026-09-04 = lo implementado), [GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md#authorization-server-propio-authefeonceorg--task-1828-2026-09-04), [EPIC-044](../../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md)
> **Manual de uso:** [Operar el autorizador de Efeonce](../../manual-de-uso/identity/operar-autorizador-efeonce.md)

---

## La idea central

Efeonce decidió tener su **propio autorizador**: un servicio que, con el tiempo, será la puerta por la que una
persona de un cliente demuestra quién es y recibe un "pase" (un token) para usar el MCP de Efeonce. No se compró
a un tercero; lo opera Efeonce en `https://auth.efeonce.org`.

Piensa en él como una **oficina de pases** recién inaugurada. Hoy la oficina existe, tiene luz, la puerta abre, y
la máquina que sella los pases está instalada y probada. Lo que todavía no existe es la ventanilla de atención:
nadie puede pedir un pase aún, porque los flujos de login se construyen en las tasks siguientes.

## Qué hace hoy

Lo entregado en `TASK-1828` es la base: el servicio corriendo, la llave con la que firma y la dirección pública.

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

## Qué no hace todavía

| Falta | Qué significa para una persona | Task |
| --- | --- | --- |
| Endpoints OAuth (metadata, registro de clientes, `authorize`, `token`, revocación, consentimiento) | Ninguna app (Claude, Codex, ChatGPT) puede pedir un pase todavía. | `TASK-1829` |
| Login de personas (passkeys, magic link, TOTP, recuperación) | No hay pantalla donde alguien demuestre quién es. No habrá contraseñas. | `TASK-1830` |
| Que el MCP acepte estos pases | El gateway sigue aceptando sólo la identidad interna (Entra). | `TASK-1831` |
| Pruebas con clientes reales (canaries) | Primera cohorte de clientes. | `TASK-1832` |
| Pentest y rotación programada | Aseguramiento antes de abrir a clientes. | `TASK-1833` |
| Que el portal Greenhouse use este login | Convergencia del login de clientes del portal. | `TASK-1834` |

**Importante:** el login de Greenhouse **no cambia**. Entrar al portal sigue siendo igual que antes; este servicio
no comparte sesiones, cookies ni secretos con el portal.

## Cómo se relaciona con Greenhouse

- Comparte la **base de datos** (`greenhouse-pg-dev`), pero en un esquema propio (`greenhouse_auth`) que sólo
  guarda el registro de llaves. No toca usuarios, roles ni sesiones del portal.
- Comparte el **repositorio** (`services/auth-server/`) y el **carril de despliegue** de los workers Cloud Run:
  se despliega a staging al empujar a `develop` y a producción sólo por el release controlado.
- Usa las mismas piezas de **observabilidad**: incidentes en Sentry (dominio `identity`, componente
  `auth-server`) y dos señales nuevas en `/admin/operations`.
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
| Incidentes Sentry `component=auth-server` | Fallos al firmar (KMS), de base de datos o del servicio. | Cualquier incidente nuevo. |

> Detalle técnico: [`src/lib/reliability/queries/auth-server-signals.ts`](../../../src/lib/reliability/queries/auth-server-signals.ts);
> runbook operativo en [`docs/operations/runbooks/auth-server.md`](../../operations/runbooks/auth-server.md).
