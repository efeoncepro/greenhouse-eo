# Operar el binding de identidad externa (MCP)

## Frontera con el acceso corporativo

Este manual opera bindings externos. Si el reader devuelve `internal_population`, no crees una invitación
cliente ni reemplaces el source link: usa el [runbook corporativo](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md).
La [documentación del binding](../../documentation/identity/binding-identidad-externa-mcp.md#frontera-con-el-acceso-corporativo)
explica población, audit/outbox compartidos, reconciliación y señales de integridad. Esas reparaciones
conservan autoridad y vencimientos; nunca son una vía para ampliar permisos.


> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-06 por Claude (TASK-1837)
> **Modulo:** Identidad y acceso (EPIC-044 U04 · TASK-1631 · U12 · TASK-1837)
> **Ruta en portal:** sin UI en este slice; se opera por API bajo `/api/admin/identity/external-access/*` (y, para el administrador del cliente, `/api/platform/ecosystem/identity/invitations` vía gateway)
> **Documentacion relacionada:** [Binding de Identidad Externa para el MCP](../../documentation/identity/binding-identidad-externa-mcp.md), [EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md](../../architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md), [Runbook del gateway MCP — soporte a cliente externo](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md#soporte-cliente-externo-que-no-puede-entrar-task-1631)

## Para que sirve

Este manual te guía para preparar, paso a paso y sin tocar la base de datos, el acceso de una organización
cliente al MCP de Efeonce: registrar el emisor de identidad (environment), ligar la organización, otorgar
capabilities de solo lectura, invitar a su administrador designado (el sistema envía el correo), reenviar o
revelar un enlace cuando haga falta, revisar el estado y revocar. Cierra con la verificación por smoke y con la
lane delegada por la que el administrador del cliente invita a su propia gente.

No cubre el login de la persona ni la pantalla de administración: en este slice no existen (ver
[qué no hace este slice](../../documentation/identity/binding-identidad-externa-mcp.md#qué-no-hace-este-slice)).

## Antes de empezar

Necesitas:

- Una sesión con rol **`efeonce_admin`**. Cada ruta exige su capability dedicada; otro rol recibe 403.
- Una forma de llamar la API con esa sesión:
  - **Staging (recomendado):** `pnpm staging:request` maneja el bypass de Vercel y la sesión del agente
    superadmin (`agent@greenhouse.efeonce.org`). Sintaxis: `pnpm staging:request [METHOD] <path> ['<json>']`.
  - **Local:** `pnpm dev` + una cookie de sesión admin (por ejemplo la que devuelve `POST /api/auth/agent-session`
    con `AGENT_AUTH_SECRET`). En los ejemplos con `curl`, `$COOKIE` es esa cookie `nombre=valor`.
- Los datos del emisor: URL del issuer (https), URL del JWKS, audiencia esperada y si es un emisor **interno**
  (Entra de Efeonce) o **externo**.
- El **`organizationId`** de la organización cliente en Account 360 (formato `org-<uuid>`). Si no la tienes,
  la consulta de elegibilidad del paso 2 la busca por nombre.
- Saber si el flag `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` está encendido en el entorno donde operas
  (hoy está **apagado** en todos; ver `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`). Con el flag encendido el
  sistema envía el correo y la respuesta no trae `token`; apagado, el token vuelve en la respuesta y lo entregas
  tú por un canal seguro (nunca un ticket ni un chat abierto).

Todas las respuestas de error siguen el contrato canónico: `{ error, code, actionable }` con `error` en
español listo para leer. La tabla de códigos está al final.

## Paso a paso

### 1. Registrar el environment (emisor de identidad)

```bash
pnpm staging:request POST /api/admin/identity/external-access/environments '{
  "environmentId": "efeonce-auth-prod",
  "displayName": "Efeonce Auth (producción)",
  "provider": "efeonce_auth",
  "issuerUrl": "https://auth.efeonce.org",
  "jwksUri": "https://auth.efeonce.org/.well-known/jwks.json",
  "audience": "https://mcp.efeonce.org/mcp",
  "issuerClass": "external",
  "subjectType": "public",
  "status": "draft",
  "notes": "Emisor propio para clientes; activar cuando el canary OAuth pase."
}'
```

Reglas del body:

- `environmentId`: slug estable, `^[a-z0-9][a-z0-9_-]{2,63}$`. Es el ID que verá el gateway; no lo cambies después.
- `provider`: `^[a-z][a-z0-9_]{1,31}$` (por ejemplo `efeonce_auth`, `entra`).
- `issuerUrl` y `jwksUri`: obligatoriamente `https://`.
- `issuerClass`: `internal` o `external`. **No se puede cambiar en un environment existente** (responde 409
  `external_access_conflict`). Si el emisor cambia de clase, retira este y registra otro.
- `subjectType`: `public` (por defecto) o `pairwise`.
- `status`: `draft` por defecto. Pásalo a `active` solo cuando el emisor esté verificado.

Respuesta: `201` si lo creó, `200` si ya existía. Repetir el mismo body es inofensivo (`changed: false`).
Actualizar (cambiar issuer, status, notas) es el mismo `POST` con el mismo `environmentId`: queda auditado.

Lista lo registrado con `pnpm staging:request /api/admin/identity/external-access/environments`.

### 2. Consultar elegibilidad de la organización

```bash
pnpm staging:request "/api/admin/identity/external-access/eligibility?search=acme&limit=20" --pretty
```

Devuelve organizaciones cliente **existentes** en Account 360 con `eligible`, `lifecycleStage` y
`activeBindings`. Solo `lifecycle_stage = active_client` sale como `eligible: true`. Las inactivas o churned se
listan con `eligible: false` para que veas por qué no entran; no intentes ligarlas.

Este paso nunca crea organizaciones. Si la organización no existe, primero pasa por el lifecycle de cliente.

### 3. Ligar la organización al environment (binding)

```bash
pnpm staging:request POST /api/admin/identity/external-access/bindings '{
  "organizationId": "org-<uuid>",
  "environmentId": "efeonce-auth-prod",
  "externalOrganizationRef": "acme",
  "reason": "Onboarding MCP acordado en el kickoff del 2026-09-04."
}'
```

- `externalOrganizationRef` es la referencia con la que el emisor identifica a esa organización (tenant, slug,
  org id externo). Es única por environment: si otra organización ya la usa, responde 409.
- El environment puede estar en `draft` o `active`; suspendido o retirado responde 409
  `external_access_environment_not_active`.
- Repetir el mismo trío (organización, environment, ref) devuelve el binding existente con `200`; cambiar la
  ref de una organización ya ligada responde 409.
- Anota el `bindingId` (`xob-<uuid>`) de la respuesta: lo usan los pasos siguientes.

### 4. Otorgar una capability de solo lectura

```bash
pnpm staging:request POST /api/admin/identity/external-access/bindings/xob-<uuid>/grants '{
  "capability": "globe.producer.fleet.read",
  "reason": "Lectura de la flota Globe acordada en el SOW."
}'
```

- `capability` debe ser una clave con namespace y puntos (`^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`).
- Sin `profileId` el grant aplica a **todas** las personas ligadas del binding. Con `profileId` aplica solo a
  esa persona, que ya debe estar `linked` (si no, 422 `external_access_invalid_request`).
- Cada grant nuevo sube `grantsVersion` (viene en la respuesta). Repetir el mismo grant no lo sube.
- En este slice solo se otorgan capabilities de **lectura**. El gateway sigue mandando: un grant declarado aquí no
  habilita una tool que el provider no exponga.

### 5. Invitar al administrador designado

```bash
pnpm staging:request POST /api/admin/identity/external-access/bindings/xob-<uuid>/invitations '{
  "email": "admin@acme.example",
  "designatedAdmin": true,
  "expiresInHours": 72,
  "reason": "Administrador designado por Acme en el kickoff."
}'
```

La respuesta trae `invitation`, `created` y `delivery`:

```json
{
  "invitation": { "invitationId": "xmi-…", "status": "issued", "deliveryStatus": "sent", "deliveryAttempts": 1, "…": "…" },
  "created": true,
  "delivery": { "mode": "system", "status": "sent", "attempts": 1, "recipientMasked": "a***@acme.example", "errorCode": null }
}
```

- **Con `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED=true`** (entrega por sistema) la respuesta **no trae
  `token`**: el correo con el enlace `https://<emisor>/i/<token>` sale solo, desde el remitente de Efeonce, al
  correo invitado. Lo que tienes que revisar es `delivery.status`:
  - `sent` o `delivered`: salió bien. Espera a que la persona acepte.
  - `failed`: la invitación **sí quedó emitida** (`issued`) pero el correo no salió (`delivery.errorCode` dice por
    qué: proveedor, configuración, plantilla). No le digas al cliente que "ya está": revisa la causa (Sentry,
    dominio remitente en Resend, kill-switch `email_type_config('external_access_invitation')`) y **reenvía** (5b).
  - `not_attempted`: pediste entrega manual (`"delivery": "manual"` en el body) o el flag está apagado.
- **Con el flag apagado** (comportamiento previo) la respuesta incluye `token` **una sola vez** y
  `delivery.mode = "manual"`. Greenhouse guarda únicamente su hash. Cópialo al canal seguro y no lo pegues en
  tickets, Teams abierto, commits ni logs.
- `expiresInHours`: 72 por defecto, máximo 720 (30 días).
- `profileId` es opcional: úsalo si la persona ya existe en Greenhouse y quieres ligarla a ese perfil.
- `designatedAdmin: true` exige que el binding **no tenga otro administrador designado** con membresía
  `linked`: si lo tiene, la emisión responde 409 `external_access_conflict` y, si el guard salta al aceptar, el
  enlace no se consume. Revoca al anterior antes (paso 7, scope `member`).
- Si ya hay una invitación abierta para ese correo, responde `200` con `created: false` y **sin token**. Para
  recuperar, usa el reenvío (5b) o repite con `"reissue": true`: revoca la abierta (motivo `reissued`) y emite otra
  con enlace nuevo.
- La aceptación la hace la persona en el emisor (TASK-1830). Hasta entonces la invitación queda `issued`.
- Tope: 20 operaciones (emisiones + reenvíos + revelaciones) por binding cada hora; al pasarlo, 429 `rate_limited`.

### 5b. Reenviar una invitación

Cuando el correo no llegó (spam, casilla corregida, `delivery.status` en `failed` o `bounced`):

```bash
pnpm staging:request POST /api/admin/identity/external-access/bindings/xob-<uuid>/invitations/xmi-<uuid>/resend '{
  "reason": "El cliente corrigió la casilla del administrador.",
  "expiresInHours": 72
}'
```

- Misma capability que emitir (`identity.external_invitation.issue`). Responde `201` con `invitation`, `created`
  y `delivery` (misma forma que en 5).
- **Reenviar rota el enlace**: la invitación abierta queda `revoked` con motivo `resent` y sale una nueva con
  `invitationId` nuevo y enlace nuevo. **El enlace anterior deja de funcionar.** La nueva hereda el contador de
  intentos (`deliveryAttempts`).
- Solo se puede reenviar una invitación `issued`; si ya fue aceptada, revocada o reemplazada responde 409
  `external_access_invitation_not_open`.
- Topes: **3 reenvíos por cadena** (la invitación original y sus reenvíos) y 20 operaciones por binding cada
  hora. Al pasarlos responde **429 `rate_limited`**: no es un error del correo, es que ya reenviaste demasiadas
  veces. Si a la tercera sigue sin llegar, el problema no se arregla reenviando: confirma la casilla con el
  cliente o usa la excepción de 5c.

### 5c. Revelar el enlace (excepción)

Solo para una persona que **no tiene una casilla operativa** (por ejemplo el correo corporativo aún no existe y
el kickoff es hoy). No es una vía normal.

```bash
pnpm staging:request POST /api/admin/identity/external-access/bindings/xob-<uuid>/invitations/xmi-<uuid>/reveal '{
  "reason": "Casilla corporativa aún no creada; enlace entregado en videollamada con el CTO de Acme."
}'
```

- Exige la capability dedicada `identity.external_invitation.reveal_token` (distinta de emitir) y un `reason`
  de **al menos 10 caracteres**; sin él, 422.
- Responde `{ invitation, token, acceptanceUrl, expiresAt }` **una sola vez**. Rota la invitación a una nueva
  **de 1 hora** que no envía correo; la anterior queda `revoked` con motivo `revealed`.
- Queda auditado (`invitation_token_revealed`) con quién reveló y el motivo, nunca con el token, y enciende la
  señal `identity.external_invitation.token_revealed` (warning desde 1). Cada revelación debe poder
  justificarse después.
- Entrega `acceptanceUrl` a la persona por un canal seguro y verificado (videollamada, teléfono). No la pegues
  en Teams, tickets ni correos alternativos.

### 5d. Qué hacer cuando el correo rebota

El proveedor de correo avisa el rebote por webhook; el ops-worker lo recibe y marca la invitación con
`deliveryStatus: "bounced"` (evento `email_delivery.bounced`, sin flag). Lo ves así:

1. La señal `identity.external_invitation.undelivered` pasa a `warning` en `/admin/operations` → Identity.
2. En `GET .../bindings/xob-<uuid>` la invitación sigue `issued` pero con `deliveryStatus: "bounced"` y
   `lastDeliveryErrorCode: "bounce:<tipo>"`.

Qué hacer: confirma la casilla con el administrador del cliente (typo, casilla inexistente, buzón lleno o
bloqueo del dominio remitente), corrige lo que haya que corregir y **reenvía** (5b). Si el correo era
incorrecto, revoca esa invitación (paso 7, scope `invitation`) y emite una nueva al correo correcto. La señal baja
sola cuando la invitación abierta vuelve a tener una entrega buena o cuando se revoca.

### 6. Ver el detalle del binding

```bash
pnpm staging:request /api/admin/identity/external-access/bindings/xob-<uuid> --pretty
```

Devuelve `binding` (estado, `grantsVersion`, admin designado), `grants` e `invitations` (con estado, correo,
fechas; **nunca** el token ni su hash). Es la vista que usas para responder "¿por qué esta persona no entra?".

Para buscar por organización: `.../bindings?organizationId=org-<uuid>` (filtros opcionales `environmentId`,
`status=active|revoked`).

### 7. Revocar

Un solo endpoint con cuatro alcances; `reason` es obligatorio en todos.

```bash
# Toda la organización (grants + personas + invitaciones abiertas)
pnpm staging:request POST /api/admin/identity/external-access/revoke \
  '{"scope":"binding","bindingId":"xob-<uuid>","reason":"Fin de contrato 2026-12-31."}'

# Un grant
pnpm staging:request POST /api/admin/identity/external-access/revoke \
  '{"scope":"grant","grantId":"xcg-<uuid>","reason":"Capability retirada del SOW."}'

# Una persona (sus membresías y grants personales en ese binding)
pnpm staging:request POST /api/admin/identity/external-access/revoke \
  '{"scope":"member","bindingId":"xob-<uuid>","profileId":"<identity_profile_id>","reason":"Salió de Acme."}'

# Una invitación abierta
pnpm staging:request POST /api/admin/identity/external-access/revoke \
  '{"scope":"invitation","invitationId":"xmi-<uuid>","reason":"Correo equivocado."}'
```

Qué esperar: `changed: true` la primera vez y `false` si repites; `grantsVersion` nuevo salvo en `invitation`;
listas `revokedGrantIds` / `revokedProfileIds` / `revokedInvitationIds` con lo que cayó en cadena. Un binding
revocado no se reactiva: si el cliente vuelve, se crea un binding nuevo.

### 8. Verificar con el smoke

```bash
pnpm pg:connect                                # levanta el proxy Cloud SQL
pnpm identity:external-access:smoke            # solo lecturas: readers + las 4 señales
pnpm identity:external-access:smoke -- --apply # ciclo completo sobre el fixture de smoke
```

- El modo **read-only** imprime una muestra de elegibilidad, los environments con su estado, cuántos bindings
  activos hay y la severidad de las 4 señales. Sirve en cualquier momento.
- `--apply` ejercita el ciclo completo (environment → binding → grant → invitación → aceptación → resolve
  `bound` → revocar persona → resolve `revoked` → revocar binding → environment `retired`) **únicamente** sobre la
  organización fixture `ZZZ Q2C Smoke Fixture` (`org-ddd962ae-6417-4325-92d0-f1994dc06cc5`) y el environment
  `smoke-task-1631`. Deja audit permanente y 4 denegaciones que ponen
  `identity.external_binding.unbound_dispatch_attempt` en `warning` durante 24 h: es esperado.
- Nunca apuntes `--apply` a una organización real (`EXTERNAL_ACCESS_SMOKE_ORGANIZATION_ID` existe para otro
  fixture, no para clientes).
- Usa el perfil `runtime` (por defecto): así verificas los GRANTs reales del runtime, no los del owner.
- El smoke emite su invitación con `delivery: 'manual'` explícito: no manda correo aunque el flag esté encendido.

### 9. El cliente invita a su gente (lane delegada)

La persona que aceptó como **administrador designado** de un binding puede listar e invitar personas de su
propia organización. No llama a Greenhouse directo: habla con el gateway MCP, que verifica su token y llama a
la lane ecosystem con `environment` + `subject` (consumer `internal`). Hoy el flag
`EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` está **apagado** (la lane responde 404) y el gateway aún no
federa la lane (TASK-1831/1832); las llamadas siguientes describen el contrato para cuando esté encendido.

```bash
# Listar las invitaciones del binding propio
GET /api/platform/ecosystem/identity/invitations?environment=efeonce-auth-prod&subject=<sub>&bindingId=xob-<uuid>
# → { "bindingId": "xob-…", "count": 3, "items": [ … ] }

# Invitar a una persona de la misma organización (Idempotency-Key obligatorio)
POST /api/platform/ecosystem/identity/invitations
{ "environment": "efeonce-auth-prod", "subject": "<sub>", "bindingId": "xob-<uuid>",
  "email": "analista@acme.example", "reason": "Analista del equipo de datos." }
# → { "invitation": { … }, "created": true, "delivery": { … } }   (nunca token)
```

Qué significan las respuestas:

| HTTP | `code` | Qué pasó |
| --- | --- | --- |
| 404 | — | Flag apagado, o el consumer no es el interno del gateway. Sin pistas a propósito. |
| 403 | `forbidden` | La identidad no está `bound`, el `bindingId` no es el suyo o no es el administrador designado. No se distingue la causa. |
| 422 | `external_access_invalid_request` | Pidió `designatedAdmin: true` (no puede designar administradores) o el body es inválido. |
| 422 | `external_access_limit_reached` | El binding llegó al tope de asientos (25 por defecto: `issued` + `accepted` + `linked`). Lo amplía Efeonce, no el cliente. |
| 429 | `rate_limited` | Tope de 20 operaciones por binding por hora. |

Cada invitación delegada queda auditada con actor `external-admin:<perfil>` y metadata `delegated: true`.

## Que significan los estados y señales

Resumen operativo; el detalle está en la [documentación funcional](../../documentation/identity/binding-identidad-externa-mcp.md#qué-significa-cada-estado).

| Dónde | Estado | Lectura rápida |
| --- | --- | --- |
| Environment | `draft` | Preparación: liga y otorga, pero nadie entra. |
| Environment | `active` | Operativo. |
| Environment | `suspended` / `retired` | Todo el emisor denegado (`environment_inactive`). |
| Binding | `active` / `revoked` | Revocado = todo lo que colgaba cayó; no se reactiva. |
| Grant | `active` / `revoked` | Sin persona = para todos los ligados; con persona = solo ella. |
| Invitación | `issued` | Abierta; el correo salió (o el token se entregó a mano). Mira `deliveryStatus`. |
| Invitación | `linked` | Es la membresía; la persona puede resolver `bound`. |
| Invitación | `revoked` / `expired` | Emitir una nueva (o `reissue`/reenvío si estaba abierta). Motivos `resent`/`revealed` = fue rotada por un reenvío o una revelación. |
| Entrega | `not_attempted` | Sin correo: flag apagado o entrega manual. Tú entregas el enlace. |
| Entrega | `sent` / `delivered` | El proveedor aceptó / confirmó la entrega. |
| Entrega | `bounced` | La casilla rechazó el correo. Corregir casilla y reenviar (5d). |
| Entrega | `failed` | No salió. La invitación existe pero nadie la recibió: revisar causa y reenviar (5b). |
| Gateway | `bound` | Entra con sus grants. |
| Gateway | `unbound` / `revoked` / `environment_inactive` / `profile_inactive` | Deny genérico para el cliente; para soporte, el outcome dice por qué. |

Señales en `/admin/operations` → módulo Identity (estado estable: 0):

| Señal | Cuándo actuar |
| --- | --- |
| `identity.external_binding.unbound_dispatch_attempt` | Alguien con token válido no está ligado: revisa invitación entregada/aceptada y estado del environment. Warning 1+, error 20+. |
| `identity.external_binding.revoked_still_dispatching` | Un revocado sigue intentando pasados 5 min: avisa al cliente / detén el agente que reintenta. Warning 1+, error 10+. |
| `identity.external_binding.subject_collision` | Un subject apunta a más de una persona (o viceversa): revisión manual de identidad, nunca merge automático. Error 1+. |
| `identity.external_binding.orphan_grant` | Grants activos sobre binding revocado o environment inactivo: alguien escribió fuera de los commands. Error 1+. |
| `identity.external_binding.unaudited_write` / `mixed_population` | Integridad de población (TASK-1836): ver la [documentación funcional](../../documentation/identity/binding-identidad-externa-mcp.md#frontera-con-el-acceso-corporativo). |
| `identity.external_invitation.undelivered` | Invitaciones abiertas con correo rebotado o fallido: corregir casilla / causa y reenviar (5b, 5d). Warning 1+, error 5+. |
| `identity.external_invitation.expired_unaccepted` | Vencieron sin aceptarse en 7 días: confirmar con el cliente y emitir una nueva. Informativa: warning 1+, nunca error. |
| `identity.external_invitation.token_revealed` | Hubo revelaciones en 24 h: cada una debe tener actor y motivo en el audit. Varias en un día = se está usando como vía normal. Warning 1+, error 5+. |

## Que no hacer

- **No escribas SQL a mano** sobre `external_identity_environments`, `external_organization_bindings`,
  `external_capability_grants`, `external_member_invitations` ni `identity_profile_source_links`. Los commands
  hacen estado + audit + outbox en una sola transacción; un UPDATE suelto deja `grants_version` sin subir (el
  gateway no se entera) y dispara `orphan_grant`.
- **No pegues el token ni el enlace** en tickets, Teams, chats, commits, capturas ni logs. Viaja una sola vez;
  si se perdió, reenvía (5b) o `reissue`.
- **No uses la revelación (5c) como rutina** porque "así es más rápido". Es una excepción auditada para una
  persona sin casilla; cada una enciende `token_revealed` y hay que poder justificarla.
- **No emitas dos invitaciones con `designatedAdmin: true`** para el mismo binding: solo puede haber un
  administrador designado vigente. La segunda aceptación falla con `conflict`; revoca al anterior primero.
- **No des por entregada una invitación** sin mirar `delivery.status`: `failed` y `bounced` significan que nadie
  recibió nada aunque la invitación exista.
- **No ligues una organización que no esté en `active_client`** ni intentes "arreglar" la elegibilidad
  cambiando `lifecycle_stage` para saltarte la regla.
- **No crees una organización desde aquí** ni la infieras por dominio de correo. Primero el lifecycle de cliente.
- **No cambies `issuerClass`** de un environment vigente. Retira y registra otro.
- **No pongas un environment en `active`** sin que el emisor esté verificado (JWKS accesible, audiencia
  correcta, canary OAuth cuando exista).
- **No corras el smoke `--apply`** contra una organización real.
- **No uses la persona superadmin del agente** para validar experiencias de cliente: este slice no tiene login
  externo, y la validación de acceso externo real llega con las tasks de emisor y gateway.

## Problemas comunes

| Código (`code`) | HTTP | Qué pasó | Qué hacer |
| --- | --- | --- | --- |
| `external_access_invalid_request` | 422 | Un campo falta o no cumple el formato (`environmentId`, `provider`, URL sin https, capability sin namespace, email inválido, `expiresInHours` fuera de 1–720, `scope` desconocido), o el `profileId` de un grant personal no es miembro `linked` del binding. `extra.details.field` dice cuál. | Corrige el body y reintenta. |
| `external_access_not_found` | 404 | El environment, binding, grant, invitación o persona indicada no existe. | Revisa el ID (prefijos `xob-`, `xcg-`, `xmi-`) con `GET .../bindings`. |
| `external_access_conflict` | 409 | Choca con algo vigente: `issuerClass` distinto al registrado, `externalOrganizationRef` ya usada por otra organización, la misma organización con otra ref, issuer ya registrado en otro environment no retirado. | Lee el estado actual (`GET`) y decide: usar el existente, retirar el viejo o corregir la ref. |
| `external_access_organization_not_eligible` | 422 | La organización no es cliente `active_client`, no está activa o no existe. | Consulta `/eligibility`; si debe entrar, primero corrige su lifecycle por el camino canónico. |
| `external_access_environment_not_active` | 409 | El environment está suspendido/retirado (para ligar u otorgar) o no está `active` (para aceptar invitaciones). | Revisa `GET .../environments` y actívalo si corresponde. |
| `external_access_binding_not_active` | 409 | El binding está revocado. | Crea un binding nuevo si el cliente vuelve; no se reactiva. |
| `external_access_invitation_not_open` | 409 | La invitación ya fue aceptada, revocada o reemitida. | Emite una nueva (o revisa el detalle: quizá ya está `linked`). |
| `external_access_invitation_expired` | 410 | Venció sin aceptarse. | Emite una nueva; ajusta `expiresInHours` si el cliente tarda. |
| `external_access_identity_collision` | 409 | Al aceptar, el correo coincide con más de una persona en Greenhouse. | Revisión manual de identidad (Person 360); luego invita con `profileId` explícito. |
| `external_access_conflict` (al emitir o aceptar con `designatedAdmin`) | 409 | El binding ya tiene un administrador designado con membresía `linked`. Al emitir, no se crea la invitación; al aceptar, el enlace no se consume. | Revoca al administrador anterior (scope `member`) y vuelve a emitir, o pide a la persona que reabra el enlace. |
| `rate_limited` | 429 | 3 reenvíos por cadena o 20 operaciones por binding en la última hora. | Espera; si el correo sigue sin llegar, el problema es la casilla, no el reenvío. |
| `external_access_limit_reached` | 422 | El binding llegó al tope de asientos de la lane delegada (25 por defecto). | Lo amplía un operador de Efeonce (`EXTERNAL_INVITATION_DELEGATED_SEAT_LIMIT`) o se revocan membresías que sobran. |
| `unauthorized` / `forbidden` | 401 / 403 | Sin sesión admin, o con sesión sin la capability dedicada. | Usa una sesión `efeonce_admin`. En staging, `pnpm staging:request` ya la resuelve. |
| `internal_error` | 500 | Falla no prevista; queda capturada en Sentry (dominio `identity`). | Reintenta; si persiste, revisa Sentry y `pnpm pg:doctor`. |

Otros síntomas:

- **`POST .../invitations` responde 200 sin `token` y `created: false`:** ya había una invitación abierta para
  ese correo. Usa el reenvío (5b) o `reissue: true`.
- **`POST .../invitations` responde 201 sin `token`:** el flag de entrega por sistema está encendido; el enlace
  viajó por correo. Revisa `delivery.status`, no busques el token.
- **El correo no le llega a la persona:** (1) mira `delivery.status` / `deliveryStatus` en el detalle del binding
  (`failed` = no salió, `bounced` = la casilla lo rechazó, `sent` = salió y no rebotó); (2) pídele revisar spam;
  (3) verifica que el dominio remitente de Efeonce esté verificado en Resend y que `email_type_config
  ('external_access_invitation')` esté habilitado; (4) reenvía (5b). Si nada de eso alcanza y la casilla no
  existe, 5c.
- **409 `external_access_conflict` al emitir o aceptar con `designatedAdmin: true`:** ya hay un administrador
  designado vigente. Revoca al anterior (scope `member`) antes de emitir o de que la persona nueva acepte.
- **404 en la lane delegada (`/api/platform/ecosystem/identity/invitations`):** el flag
  `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` está apagado o el consumer no es el interno del gateway. No
  es un bug: es el 404 anti-oráculo.
- **El cliente sigue entrando después de revocar:** el gateway rechequea con `grantsVersion` en menos de 5
  minutos. Si pasa más, mira `identity.external_binding.revoked_still_dispatching` y sigue el
  [runbook de soporte](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md#soporte-cliente-externo-que-no-puede-entrar-task-1631).
- **Señal en `unknown`:** PostgreSQL no respondió al leer la señal; corre `pnpm pg:doctor`.
- **`unbound_dispatch_attempt` en warning justo después del smoke:** esperado durante 24 h.

## Referencias tecnicas

- Documentación funcional: [Binding de Identidad Externa para el MCP](../../documentation/identity/binding-identidad-externa-mcp.md).
- ADR de federación: [EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md](../../architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md);
  emisor propio: [EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md).
- Task y epic: [TASK-1631](../../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md),
  [EPIC-044](../../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md).
- Código: dominio `src/lib/identity/external-access/` (`commands.ts`, `store.ts`, `resolve-external-access.ts`,
  `http.ts`, y desde TASK-1837 `delivery.ts` + `config.ts`); rutas `src/app/api/admin/identity/external-access/**`
  (incluye `invitations/[invitationId]/{resend,reveal}`); reader del gateway
  `src/lib/api-platform/resources/ecosystem-identity-binding.ts` y lane delegada
  `src/lib/api-platform/resources/ecosystem-identity-invitations.ts`; errores canónicos
  `src/lib/api/canonical-error-response.ts`; señales `src/lib/reliability/queries/external-identity-binding-signals.ts`;
  rebote `src/lib/sync/projections/external-invitation-delivery-bounced.ts` (ops-worker); correo
  `src/emails/ExternalAccessInvitationEmail.tsx` + `src/lib/email/templates.ts`; smoke
  `scripts/identity/external-access-smoke.ts`.
- Migraciones: `migrations/20260904104914802_task-1631-external-identity-binding-foundation.sql`,
  `migrations/20260904110809060_task-1631-invitation-linked-check-one-directional.sql` y
  `migrations/20260906004450748_task-1837-external-invitation-delivery-lifecycle.sql` (columnas `delivery_*`,
  tipos de audit, capabilities `reveal_token`/`issue_delegated`, `email_type_config`; **pendiente de aplicar**).
- Flags (`EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED`, `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED`) y knob
  `EXTERNAL_INVITATION_DELEGATED_SEAT_LIMIT`: estado por entorno y orden de rollout en
  [FEATURE_FLAG_STATE_LEDGER.md](../../operations/FEATURE_FLAG_STATE_LEDGER.md).
- Invariantes para agentes: [IDENTITY_WORKFORCE_AGENT_INVARIANTS.md](../../architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md).
- Acceso a staging: [GREENHOUSE_STAGING_ACCESS_V1.md](../../architecture/GREENHOUSE_STAGING_ACCESS_V1.md).
