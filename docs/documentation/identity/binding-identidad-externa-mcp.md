# Binding de Identidad Externa para el MCP

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-04 por Claude
> **Modulo:** Identidad y acceso (EPIC-044 U04 · TASK-1631)
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
| `issued` | Se emitió y el token viajó una sola vez al operador. Está abierta y con fecha de expiración (72 h por defecto, máximo 30 días). | Entregar el token a la persona por un canal seguro. |
| `accepted` | Estado intermedio de la aceptación. | Se completa en la misma transacción hacia `linked`. |
| `linked` | La persona aceptó, quedó unida a su identidad externa y **esta fila es su membresía de acceso**. | Ya puede resolver acceso `bound` en el gateway. |
| `revoked` | La invitación (abierta o ya ligada) se cerró por decisión del operador, por reemisión o porque se revocó a la persona o al binding. | Si corresponde, emitir una nueva. |
| `expired` | Venció sin aceptarse. | Emitir una nueva. |

Una organización solo puede tener **una invitación abierta por correo** a la vez. Si el token se perdió, no se
reenvía: se **reemite** (la abierta se revoca con motivo `reissued` y sale una nueva con token nuevo).

> Detalle técnico: enums en `src/lib/identity/external-access/types.ts`; reglas de transición en
> `src/lib/identity/external-access/commands.ts` (`upsertExternalIdentityEnvironment`, `bindExternalOrganization`,
> `grantExternalCapability`, `issueExternalInvitation`, `acceptExternalInvitation`, `revokeExternalAccess`).

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

## Las 4 señales en `/admin/operations`

Las señales viven en el módulo **Identity** del panel de operaciones. Estado estable: todas en 0.

| Señal | Qué detecta | Ventana | Lectura |
| --- | --- | --- | --- |
| `identity.external_binding.unbound_dispatch_attempt` | Tokens válidos del emisor que llegaron sin binding, sin persona activa o con environment inactivo. | 24 h | `warning` desde 1, `error` desde 20. Uno o dos suelen ser una invitación mal entregada o un environment en `draft`; muchos, un emisor mal configurado o alguien probando. El smoke `--apply` deja 4 durante 24 h: es esperado. |
| `identity.external_binding.revoked_still_dispatching` | Identidades revocadas hace más de 5 minutos que siguen intentando entrar. | 24 h | `warning` desde 1, `error` desde 10. El deny funciona (por eso se ve); lo que preocupa es que el cliente no fue avisado o hay un agente automatizado reintentando. |
| `identity.external_binding.subject_collision` | Un subject externo que apunta a más de una persona, o una persona con más de un subject activo en el mismo environment. | Estado actual | `error` desde 1. Requiere revisión manual de identidad; nunca se resuelve con un merge automático. |
| `identity.external_binding.orphan_grant` | Grants activos colgando de un binding revocado o de un environment suspendido/retirado. | Estado actual | `error` desde 1. Señala drift: alguien tocó datos fuera de los commands. |

Si PostgreSQL no responde, la señal aparece como `unknown` en lugar de mentir con un 0.

> Detalle técnico: `src/lib/reliability/queries/external-identity-binding-signals.ts`, cableado en
> `get-reliability-overview.ts` como `externalIdentityBinding` y en `src/lib/reliability/registry.ts` (módulo `identity`).

## Quién puede operar

Solo el rol interno **`efeonce_admin`**, y solo a través de las rutas admin. Cada acción tiene su capability
dedicada, de modo que un permiso de lectura no habilita escribir ni revocar:

| Capability | Acción | Ruta |
| --- | --- | --- |
| `identity.external_binding.read` | Listar y ver environments, elegibilidad, bindings y su detalle | `GET .../environments`, `.../eligibility`, `.../bindings`, `.../bindings/[id]` |
| `identity.external_environment.manage` | Registrar o actualizar un environment | `POST .../environments` |
| `identity.external_binding.bind` | Ligar una organización | `POST .../bindings` |
| `identity.external_grant.issue` | Otorgar una capability | `POST .../bindings/[id]/grants` |
| `identity.external_invitation.issue` | Invitar a una persona | `POST .../bindings/[id]/invitations` |
| `identity.external_access.revoke` | Revocar binding, grant, persona o invitación | `POST .../revoke` |

Prefijo común de las rutas: `/api/admin/identity/external-access`. Un usuario sin sesión admin recibe 401; con
sesión pero sin la capability, 403.

> Detalle técnico: guard `requireExternalAccessOperator` en `src/lib/identity/external-access/http.ts`; grants de
> rol en `src/lib/entitlements/runtime.ts`; catálogo en `src/config/entitlements-catalog.ts` + `capabilities_registry`.

## Qué NO hace este slice

Conviene decirlo explícito, porque el nombre "identidad externa" invita a suponer más de lo que hay:

- **No hay login.** Nadie puede iniciar sesión con una identidad externa todavía; el emisor propio y la
  aceptación de invitaciones por parte de la persona llegan con TASK-1828/1830.
- **No hay pantalla.** Todo se opera por API (ver el manual). La UI de administración es una task aparte.
- **No se corrieron canaries** con clientes reales (Claude, Codex, ChatGPT) ni tokens en vivo contra el gateway;
  eso vive en TASK-1831/1832.
- **No hay autoregistro (signup).** Una persona entra solo por invitación de un operador.
- **No se infiere nada por dominio de correo.** Que alguien tenga `@cliente.com` no lo liga a la organización
  "Cliente". Solo cuenta la organización que ya existe en Account 360 y está en `active_client`.
- **No escribe nada en Globe.** El binding declara grants; Globe (o cualquier provider) sigue decidiendo dentro de
  su propio runtime.
- **No proyecta la membresía a `person_memberships`.** La fila `linked` es la membresía de acceso externo; la
  proyección a Account 360 es un follow-up declarado.
- **No agrega un feature flag** en Greenhouse: las escrituras las gatea la capability admin y el uso externo del
  gateway lo gatea el gateway mismo.

> Detalle técnico: alcance y follow-ups en
> [TASK-1631](../../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md) y en
> [EPIC-044](../../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md).
