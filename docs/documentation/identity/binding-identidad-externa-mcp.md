# Binding de Identidad Externa para el MCP

## Frontera con el acceso corporativo

Este documento describe la población externa. TASK-1836 añadió población persistida e inmutable
`external | internal` sobre los bindings compartidos y centralizó sus mutaciones con audit/outbox
canónicos; compartir tablas o emisor no comparte reglas de acceso. Los internos requieren enrollment
y grants personales con vencimiento; no requieren invitaciones cliente ni convertir Efeonce en cliente.

`internal_population` en el reader externo es una denegación esperada para una identidad propiedad del
carril interno, incluso si su enrollment está revocado. No se arregla creando una invitación externa,
reemplazando el source link o tratando ese outcome como `unbound`. El gateway elige el carril interno
únicamente con contexto firmado y `jti` verificable; no por correo o `issuer_class`.

Las señales `identity.external_binding.unaudited_write` y
`identity.external_binding.mixed_population` vigilan integridad (normal: cero; error de consulta:
`unknown`). La reconciliación conserva permisos y vigencia, y no sustituye un grant nuevo autorizado.
Contrato: [autoridad interna nativa](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md);
operación corporativa: [runbook de cohorte](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md).


> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-06 por Claude (TASK-1837)
> **Modulo:** Identidad y acceso (EPIC-044 U04 · TASK-1631 · U12 · TASK-1837)
> **Documentacion tecnica:** [EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md](../../architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md), [EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md), [GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md), [EPIC-044](../../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md), [TASK-1631](../../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md)
> **Manual de uso:** [Operar el binding de identidad externa](../../manual-de-uso/identity/operar-binding-identidad-externa.md)

---

## La idea central

Hoy el gateway MCP de Efeonce (`mcp.efeonce.org`) solo deja entrar a personas del tenant interno. Para que una
persona de un **cliente** pueda usar el MCP con su propia identidad, Greenhouse necesita saber tres cosas antes
de que exista cualquier login:

1. **De qué emisor de identidad** viene esa persona (el *environment*).
2. **A qué organización cliente** de Account 360 pertenece (el *binding*).
3. **Qué puede hacer** ahí y **quién la invitó** (los *grants* y la *invitación*).

El **binding de identidad externa** es ese grafo. Es la fundación de datos y de reglas que después consumirán el
emisor propio de Efeonce (`auth.efeonce.org`) y el gateway MCP. Este slice construye el grafo y las decisiones;
no construye el login ni la pantalla.

La regla que gobierna todo: **nadie entra por ser quien dice ser; entra porque una organización cliente activa lo
ligó y una persona autorizada lo invitó.** Un correo con dominio del cliente no vale nada por sí solo.

> Detalle técnico: ADR de federación [EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md](../../architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md);
> dominio en `src/lib/identity/external-access/` (`index.ts`, `types.ts`, `commands.ts`, `store.ts`,
> `resolve-external-access.ts`).

## El grafo: organización → environment → binding → grants → personas

```text
Account 360
  organización cliente (active_client)
        │
        │  binding  (status, grants_version, admin designado)
        ▼
  environment de identidad  (emisor: issuer, JWKS, audience, clase)
        │
        ├── grants        → capabilities que la organización (o una persona) puede usar en el MCP
        └── invitaciones  → personas invitadas; la que queda `linked` ES la membresía de acceso externo
```

| Pieza | Qué representa | Quién la crea |
| --- | --- | --- |
| **Organización** | Una empresa cliente que ya existe en Account 360. Nunca se crea desde aquí. | Lifecycle de cliente (wizard canónico) |
| **Environment** | Un emisor de identidad concreto: la URL del issuer, dónde están sus llaves públicas (JWKS), la audiencia esperada y si es un emisor **interno** (Entra de Efeonce) o **externo** (el emisor propio para clientes u otro). | Operador (`efeonce_admin`) |
| **Binding** | La relación "esta organización usa este environment con esta referencia externa". Es el eje del grafo: de él cuelgan grants e invitaciones. | Operador |
| **Grant** | Una capability con nombre (por ejemplo `globe.producer.fleet.read`) otorgada a todo el binding o a una sola persona ya ligada. | Operador |
| **Invitación** | El camino por el que una persona concreta entra. Lleva el correo invitado, si será administrador designado y una fecha de expiración. Cuando la persona la acepta y queda `linked`, esa fila es su membresía. | Operador (emite) · Persona (acepta, en TASK-1830) |
| **Persona** | Una `identity_profile` de Greenhouse. Si no existía, se crea como contacto externo al aceptar. Una identidad externa activa apunta a UNA sola persona. | Aceptación de la invitación |

Nada se identifica por la URL del emisor en crudo: el environment tiene su propio ID y rotar el issuer es una
actualización auditada, no una fila nueva.

> Detalle técnico: tablas `greenhouse_core.external_identity_environments`, `external_organization_bindings`,
> `external_capability_grants`, `external_member_invitations` (migración
> `migrations/20260904104914802_task-1631-external-identity-binding-foundation.sql`); el vínculo persona ↔ subject
> vive en `identity_profile_source_links` con `source_system = 'external_idp:<environment_id>'`.

## Qué significa cada estado

### Environment

| Estado | Qué significa | Qué permite |
| --- | --- | --- |
| `draft` | Registrado pero todavía no confiable. Estado por defecto al crearlo. | Ligar organizaciones y preparar grants. **No** acepta invitaciones ni resuelve acceso. |
| `active` | El emisor está verificado y en uso. | Todo: ligar, otorgar, invitar, aceptar y resolver acceso. |
| `suspended` | Pausa temporal (incidente, rotación, sospecha). | Nada nuevo. El gateway responde `environment_inactive` a cualquier token de ese emisor. |
| `retired` | Cerrado de forma definitiva. | Nada. Libera la URL del issuer para un environment futuro. |

La **clase** del environment (`internal` o `external`) se fija al crearlo y **no se puede cambiar**: si un emisor
cambia de naturaleza, se retira y se registra otro.

### Binding

| Estado | Qué significa |
| --- | --- |
| `active` | La organización está ligada al environment. Sus grants e invitaciones son válidos. |
| `revoked` | Se cortó la relación. Todo lo que colgaba (grants, membresías) quedó revocado en la misma operación. No se reactiva: si hace falta, se crea un binding nuevo. |

### Grant

| Estado | Qué significa |
| --- | --- |
| `active` | La capability está otorgada. Si el grant no tiene persona, aplica a todas las membresías ligadas del binding; si tiene persona, solo a ella. |
| `revoked` | Ya no aplica. Queda como historial. |

### Invitación (y membresía)

| Estado | Qué significa | Qué sigue |
| --- | --- | --- |
| `issued` | Se emitió y está abierta, con fecha de expiración (72 h por defecto, máximo 30 días). Con la entrega por sistema, el correo con el enlace sale en el mismo acto. | Esperar a que la persona acepte; si el correo no llegó, reenviar. |
| `accepted` | Estado intermedio de la aceptación. | Se completa en la misma transacción hacia `linked`. |
| `linked` | La persona aceptó, quedó unida a su identidad externa y **esta fila es su membresía de acceso**. | Ya puede resolver acceso `bound` en el gateway. |
| `revoked` | La invitación (abierta o ya ligada) se cerró por decisión del operador, por reemisión, reenvío o revelación, o porque se revocó a la persona o al binding. | Si corresponde, emitir una nueva. |
| `expired` | Venció sin aceptarse. | Emitir una nueva. |

Una organización solo puede tener **una invitación abierta por correo** a la vez. Si el token se perdió, no se
"recupera": se **rota** (la abierta se revoca y sale una nueva con enlace nuevo), ya sea por reemisión
(`reissued`), por reenvío (`resent`) o por revelación (`revealed`).

#### Cómo llega la invitación a la persona (desde TASK-1837)

Antes, el token de la invitación volvía en la respuesta al operador y él tenía que hacérselo llegar a la persona
por un canal seguro. Ahora **el sistema envía el correo** con el enlace de aceptación (`https://<emisor>/i/<token>`,
donde el emisor es el `issuer_url` del environment del binding, nunca una variable de entorno) en el mismo acto en
que emite la invitación. Esto se activa con el flag `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` (hoy apagado
en todos los entornos; con el flag apagado el comportamiento es el anterior: el token vuelve en la respuesta y no
sale correo). **Con entrega por sistema, el token nunca aparece en la respuesta.** El correo sale con remitente
Efeonce, muestra el host del emisor, tiene un botón "Aceptar invitación", indica la vigencia y avisa que al
aceptar llegará un enlace de acceso (magic link) al mismo correo.

Cada invitación lleva ahora un **estado de entrega** (`delivery_status`) separado del estado de la invitación:

| Estado de entrega | Qué significa | Qué hacer |
| --- | --- | --- |
| `not_attempted` | No se intentó enviar: el flag está apagado o el operador pidió entrega manual (`delivery: 'manual'`). | Entregar el enlace por canal seguro (comportamiento previo). |
| `sent` | El proveedor de correo aceptó el mensaje. Todavía no confirma que llegó. | Esperar; si la persona no lo ve, revisar spam y reenviar. |
| `delivered` | El proveedor confirmó la entrega en la casilla. | Nada. |
| `bounced` | La casilla rechazó el correo (no existe, llena, bloqueada). Lo registra el ops-worker al recibir el rebote del proveedor. | Corregir la casilla con el cliente y **reenviar** (ver abajo). Enciende la señal `undelivered`. |
| `failed` | El envío falló antes de salir (proveedor caído, configuración, plantilla). La invitación **sí quedó emitida**, pero nadie la recibió. | Reintentar con un **reenvío**. La respuesta nunca dice "listo" si el correo no salió. |

También se guardan cuántos intentos hubo (`delivery_attempts`, que un reenvío hereda), cuándo fue el último y el
código del último error.

Tres reglas operativas que conviene tener claras:

- **Reenviar = enlace nuevo.** Un reenvío no vuelve a mandar el mismo enlace: revoca la invitación abierta (motivo
  `resent`), crea una nueva con enlace nuevo y la envía. **El enlace anterior deja de funcionar.** Hay un tope de 3
  reenvíos por cadena y de 20 operaciones (emisiones + reenvíos + revelaciones) por binding cada hora; al pasarlo,
  la API responde 429.
- **Revelar el enlace es una excepción gobernada**, no una vía normal. Sirve solo para una persona sin casilla
  operativa. Exige una capability propia (`identity.external_invitation.reveal_token`), un motivo escrito de al
  menos 10 caracteres, rota la invitación a una nueva **de 1 hora** sin correo, y queda auditado con quién y por
  qué (nunca con el token). Cada revelación enciende la señal `token_revealed`.
- **Un solo administrador designado vigente por binding.** Emitir una invitación marcada como `designatedAdmin`
  mientras el binding tenga otro administrador cuya membresía siga `linked` responde `conflict` (409) y no crea
  nada; el mismo guard corre al aceptar, y si salta ahí la aceptación falla con `conflict` y el enlace **no se
  consume**. El operador debe revocar al anterior antes. Al revocar a la persona que era administrador, el binding queda sin administrador designado
  (auditado como `designated_admin_cleared`) hasta que se invite a otro.

> Detalle técnico: enums en `src/lib/identity/external-access/types.ts`; reglas de transición en
> `src/lib/identity/external-access/commands.ts` (`upsertExternalIdentityEnvironment`, `bindExternalOrganization`,
> `grantExternalCapability`, `issueExternalInvitation`, `resendExternalInvitation`, `revealExternalInvitationToken`,
> `acceptExternalInvitation`, `revokeExternalAccess`); entrega y rebote en
> `src/lib/identity/external-access/delivery.ts` (`resolveInvitationAcceptanceUrl`, `sendInvitationEmailViaPlatform`,
> `recordExternalInvitationDeliveryOutcome`) + proyección `src/lib/sync/projections/external-invitation-delivery-bounced.ts`
> (ops-worker, evento `email_delivery.bounced`); columnas `delivery_*` y tipos de audit en la migración
> `migrations/20260906004450748_task-1837-external-invitation-delivery-lifecycle.sql`; plantilla de correo
> `src/emails/ExternalAccessInvitationEmail.tsx` (`email_type = external_access_invitation`, cuerpo no persistido);
> invariantes en `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`.

## Qué es `grants_version`

Cada binding lleva un contador entero que empieza en 1 y **sube cada vez que cambia la autoridad**: se otorga un
grant nuevo, se revoca un grant, se revoca a una persona o se revoca el binding completo. Revocar una invitación
abierta no lo mueve (nadie tenía acceso todavía).

Para qué sirve: cuando el emisor de Efeonce entregue un token a una persona, ese token llevará el valor vigente
como claim `gv`. El gateway MCP, al verificar el acceso, compara el `gv` del token **por igualdad** con el
`grants_version` actual del binding. Si el operador revocó algo, el número cambió, el token deja de coincidir y el
gateway deniega en el siguiente chequeo (menos de 5 minutos), aunque el token siga sin vencer. Es la palanca que
hace que la revocación sea rápida sin tener que perseguir tokens.

## Qué pasa al revocar

Toda revocación exige un **motivo** escrito, queda en el audit y es idempotente (repetirla no cambia nada y lo
dice: `changed: false`).

| Alcance | Qué revoca en cadena | `grants_version` |
| --- | --- | --- |
| **Binding** | El binding, todos sus grants activos, todas sus membresías `linked` y las invitaciones abiertas. Desactiva los vínculos de identidad que quedan huérfanos. | Sube |
| **Grant** | Solo ese grant. | Sube |
| **Persona (member)** | Sus invitaciones/membresías en ese binding y sus grants personales. Si la persona no conserva otra membresía activa en el mismo environment, su vínculo de identidad se desactiva y **su sesión en el emisor muere**. | Sube |
| **Invitación** | Solo una invitación abierta (`issued`/`accepted`). No toca personas ya ligadas. | No cambia |

Nada se borra: los estados pasan a `revoked` y las filas quedan como historial.

> Detalle técnico: `revokeExternalAccess` en `src/lib/identity/external-access/commands.ts`; audit append-only
> en `greenhouse_core.external_identity_audit_log`; eventos outbox `identity.external_access.revoked` y
> compañía (aggregate `external_identity_binding`).

## Cómo lo ve el gateway MCP

El gateway no lee las tablas. Pregunta a Greenhouse por un lector de solo lectura: "para este environment y
este subject (la identidad que trae el token), ¿qué acceso hay?". La respuesta tiene un **outcome** y, solo cuando
es `bound`, la lista de membresías con sus grants y su `grants_version`.

| Outcome | Qué significa | Cómo lo vive el cliente |
| --- | --- | --- |
| `bound` | Environment activo, subject ligado a una persona activa, con al menos una membresía `linked` bajo un binding activo. | Entra; puede usar las tools que sus grants permitan. |
| `unbound` | Nadie con esa identidad fue invitado ni ligado nunca en ese environment. | Deny genérico. |
| `revoked` | La identidad estuvo ligada y fue revocada (persona o binding). | Deny genérico. Para soporte, se distingue de `unbound`: "fue alguien y ya no". |
| `environment_inactive` | El environment está en `draft`, `suspended` o `retired`. | Deny genérico. Afecta a todas las personas de ese emisor. |
| `profile_inactive` | La persona existe pero está inactiva o fue fusionada con otra. | Deny genérico. |

Toda denegación queda registrada (con el subject **hasheado**, nunca en claro) para que soporte pueda
reconstruir qué pasó. Los accesos correctos no se registran uno por uno; son el caso normal.

La respuesta al gateway se puede cachear como máximo 60 segundos y solo funciona para el consumidor interno
`efeonce-mcp-gateway`; cualquier otro consumidor recibe 404, sin pistas.

> Detalle técnico: reader `resolveExternalAccess` en `src/lib/identity/external-access/resolve-external-access.ts`;
> lane ecosystem `GET /api/platform/ecosystem/identity/binding` (`src/lib/api-platform/resources/ecosystem-identity-binding.ts`);
> log de denegaciones `greenhouse_core.external_access_resolution_log`.

## Las señales en `/admin/operations` (9 en el grupo)

Las señales viven en el módulo **Identity** del panel de operaciones. Estado estable: todas en 0. El grupo tiene
hoy 9 señales: las 4 originales del binding (tabla siguiente), las 2 de integridad de población que trajo
TASK-1836 (`unaudited_write`, `mixed_population`, descritas al inicio de este documento) y las 3 de entrega de
invitaciones de TASK-1837 (segunda tabla).

| Señal | Qué detecta | Ventana | Lectura |
| --- | --- | --- | --- |
| `identity.external_binding.unbound_dispatch_attempt` | Tokens válidos del emisor que llegaron sin binding, sin persona activa o con environment inactivo. | 24 h | `warning` desde 1, `error` desde 20. Uno o dos suelen ser una invitación mal entregada o un environment en `draft`; muchos, un emisor mal configurado o alguien probando. El smoke `--apply` deja 4 durante 24 h: es esperado. |
| `identity.external_binding.revoked_still_dispatching` | Identidades revocadas hace más de 5 minutos que siguen intentando entrar. | 24 h | `warning` desde 1, `error` desde 10. El deny funciona (por eso se ve); lo que preocupa es que el cliente no fue avisado o hay un agente automatizado reintentando. |
| `identity.external_binding.subject_collision` | Un subject externo que apunta a más de una persona, o una persona con más de un subject activo en el mismo environment. | Estado actual | `error` desde 1. Requiere revisión manual de identidad; nunca se resuelve con un merge automático. |
| `identity.external_binding.orphan_grant` | Grants activos colgando de un binding revocado o de un environment suspendido/retirado. | Estado actual | `error` desde 1. Señala drift: alguien tocó datos fuera de los commands. |

### Las 3 señales de entrega de invitaciones (TASK-1837)

| Señal | Qué detecta | Ventana | Lectura |
| --- | --- | --- | --- |
| `identity.external_invitation.undelivered` | Invitaciones abiertas (`issued`, no vencidas) cuyo correo rebotó o falló al salir (`delivery_status` en `bounced` o `failed`). | Estado actual | `warning` desde 1, `error` desde 5. Es la señal de "el operador cree que invitó, pero nadie recibió nada". Qué hacer: mirar el detalle del binding, corregir la casilla con el cliente si rebotó (o revisar el proveedor de correo si falló) y **reenviar**. Baja sola cuando la nueva invitación sale bien o la vieja se revoca. |
| `identity.external_invitation.expired_unaccepted` | Invitaciones que vencieron sin aceptarse en los últimos 7 días (`expired`, o `issued` ya pasadas de fecha sin `accepted_at`). | 7 días | Informativa: `warning` desde 1 y **nunca** `error`. Suele ser una persona que no alcanzó a entrar o un correo que fue a spam. Qué hacer: confirmar con el administrador del cliente y emitir una nueva, ajustando la vigencia si el cliente tarda. |
| `identity.external_invitation.token_revealed` | Revelaciones del enlace (audit `invitation_token_revealed`). | 24 h | `warning` desde 1, `error` desde 5. Cualquier valor distinto de 0 debe corresponder a una excepción justificada: en el audit tiene que estar quién reveló y por qué. Qué hacer: revisar que cada revelación tenga motivo válido; varias en un día indican que se está usando como vía normal y hay que corregir el proceso (o el correo que no llega). |

Si PostgreSQL no responde, la señal aparece como `unknown` en lugar de mentir con un 0.

> Detalle técnico: `src/lib/reliability/queries/external-identity-binding-signals.ts` (las 9), cableado en
> `get-reliability-overview.ts` como `externalIdentityBinding` y en `src/lib/reliability/registry.ts` (módulo `identity`);
> el smoke read-only `pnpm identity:external-access:smoke` las lee todas.

## El administrador del cliente invita a su propia gente

Hasta TASK-1837, toda invitación la emitía un operador de Efeonce. Ahora existe una **autoridad delegada**: la
persona que aceptó la invitación como **administrador designado** de un binding puede invitar a otras personas de
su misma organización sin pasar por Efeonce. Es una autoridad acotada a propósito:

| Regla | Qué significa |
| --- | --- |
| **Quién** | Solo la persona cuya membresía `linked` en ese binding tiene `designatedAdmin = true`. Se resuelve por su identidad (environment + subject), nunca por lo que diga el cuerpo de la petición. Quien no cumpla recibe 403 sin distinguir la causa. |
| **Solo su binding** | Puede listar e invitar únicamente sobre el binding del que es administrador. Un `bindingId` ajeno responde 403. |
| **Nunca designa administradores** | Si pide `designatedAdmin: true`, la API responde 422: no hay auto-elevación ni cadena de administradores. Un administrador nuevo solo lo designa Efeonce. |
| **Tope de asientos** | El binding no puede pasar de 25 personas (invitaciones `issued` + `accepted` + `linked`) por defecto (`EXTERNAL_INVITATION_DELEGATED_SEAT_LIMIT`). Al llegar, 422. |
| **Tope por hora** | Comparte el tope de 20 operaciones por binding cada hora; al pasarlo, 429. |
| **Queda auditado como delegado** | La invitación registra que fue emitida por delegación y por qué perfil (`delegated: true`, `delegatedByProfileId`); el actor en el audit es `external-admin:<perfil>`. |
| **Sin token en la respuesta** | La lane delegada **nunca** devuelve el token: la entrega es por correo del sistema. |

Cómo llega la petición: la persona no llama a Greenhouse directo. Habla con el **gateway MCP**, que verifica su
token y llama a Greenhouse por la lane ecosystem (`/api/platform/ecosystem/identity/invitations`) pasando
`environment` + `subject`, igual que hace hoy para resolver el acceso. Greenhouse resuelve desde ahí que esa
identidad es el administrador designado del binding pedido.

Estado hoy: el flag `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` está **apagado** en todos los entornos (la
lane responde 404, sin pistas), y el gateway todavía no federa esta lane (follow-up de TASK-1831/1832). La consola
para que el administrador del cliente lo haga desde una pantalla es un follow-up aparte; hoy es solo programático.

> Detalle técnico: `resolveDelegatedAuthority`, `issueDelegatedExternalInvitation` y
> `listDelegatedExternalInvitations` en `src/lib/identity/external-access/commands.ts`; resource
> `src/lib/api-platform/resources/ecosystem-identity-invitations.ts`; flags y knob en
> `src/lib/identity/external-access/config.ts`; estado por entorno en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Qué ve la persona al autorizar

Cuando la persona autoriza una aplicación en el emisor de Efeonce, la pantalla de consentimiento muestra, además
del nombre de la aplicación, el **"Destino de la autorización"**: el host al que se enviará el código de
autorización (el del `redirect_uri` ya validado). El nombre de la app lo declara la propia app; el destino no se
puede maquillar. Así la persona puede detectar una app con nombre creíble que quiere llevarse el código a un
dominio ajeno. El tratamiento visual de ese bloque es de TASK-1835.

> Detalle técnico: `renderConsentPage` (`src/lib/auth-server/oauth/pages/render.ts`, bloque
> `data-capture="id-redirect-host"`), host resuelto en `authorize.ts`; copy en `src/lib/copy/auth-server.ts`
> (`consent_redirect_host_label` / `consent_redirect_host_hint`).

## Quién puede operar

Solo el rol interno **`efeonce_admin`**, y solo a través de las rutas admin. Cada acción tiene su capability
dedicada, de modo que un permiso de lectura no habilita escribir ni revocar:

| Capability | Acción | Ruta |
| --- | --- | --- |
| `identity.external_binding.read` | Listar y ver environments, elegibilidad, bindings y su detalle | `GET .../environments`, `.../eligibility`, `.../bindings`, `.../bindings/[id]` |
| `identity.external_environment.manage` | Registrar o actualizar un environment | `POST .../environments` |
| `identity.external_binding.bind` | Ligar una organización | `POST .../bindings` |
| `identity.external_grant.issue` | Otorgar una capability | `POST .../bindings/[id]/grants` |
| `identity.external_invitation.issue` | Invitar a una persona y reenviar una invitación | `POST .../bindings/[id]/invitations`, `POST .../bindings/[id]/invitations/[invitationId]/resend` |
| `identity.external_invitation.reveal_token` | Revelar el enlace de una invitación (excepción gobernada, 1 h, con motivo) | `POST .../bindings/[id]/invitations/[invitationId]/reveal` |
| `identity.external_invitation.issue_delegated` | Invitar por delegación (la ejerce el administrador designado del cliente; el grant a `efeonce_admin` existe por paridad) | `GET/POST /api/platform/ecosystem/identity/invitations` (lane ecosystem, vía gateway) |
| `identity.external_access.revoke` | Revocar binding, grant, persona o invitación | `POST .../revoke` |

Prefijo común de las rutas: `/api/admin/identity/external-access`. Un usuario sin sesión admin recibe 401; con
sesión pero sin la capability, 403.

> Detalle técnico: guard `requireExternalAccessOperator` en `src/lib/identity/external-access/http.ts`; grants de
> rol en `src/lib/entitlements/runtime.ts`; catálogo en `src/config/entitlements-catalog.ts` + `capabilities_registry`.

## Qué NO hace este slice

Conviene decirlo explícito, porque el nombre "identidad externa" invita a suponer más de lo que hay:

- **No hay pantalla de administración.** Todo se opera por API (ver el manual). La consola para el operador de
  Efeonce y la consola para el administrador del cliente son tasks aparte.
- **No hay autoregistro (signup).** Una persona entra solo por invitación de un operador de Efeonce o, cuando
  la lane delegada esté encendida, del administrador designado de su organización.
- **No hay SCIM ni contraseñas.** La persona externa entra por invitación y accede sin contraseña (magic link,
  passkey; TASK-1830); no hay provisión automática desde el directorio del cliente.
- **No se infiere nada por dominio de correo.** Que alguien tenga `@cliente.com` no lo liga a la organización
  "Cliente". Solo cuenta la organización que ya existe en Account 360 y está en `active_client`.
- **No escribe nada en Globe.** El binding declara grants; Globe (o cualquier provider) sigue decidiendo dentro de
  su propio runtime.
- **No proyecta la membresía a `person_memberships`.** La fila `linked` es la membresía de acceso externo; la
  proyección a Account 360 es un follow-up declarado.
- **La lane delegada todavía no está federada en el gateway.** Greenhouse la expone, pero `efeonce-mcp` aún no
  la llama con `environment` + `subject`; es follow-up de TASK-1831/1832. Mientras tanto el flag sigue apagado.
- **Todo lo de TASK-1837 está `code complete, rollout pendiente`.** La migración no se aplicó en la instancia
  compartida, los dos flags no están seteados y no hubo verificación en vivo. Ver el ledger de flags.
- **La primera persona externa real sigue pendiente de decisión del operador** (qué organización y qué
  persona); esa decisión desbloquea TASK-1830/1832.

> Detalle técnico: alcance y follow-ups en
> [TASK-1631](../../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md), en
> [EPIC-044](../../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md) y en
> el estado de rollout de `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (filas `EXTERNAL_INVITATION_*`).
