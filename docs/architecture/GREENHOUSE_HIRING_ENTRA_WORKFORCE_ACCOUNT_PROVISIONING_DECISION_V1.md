# Greenhouse Hiring → Microsoft Entra Workforce Account Provisioning Decision V1

## Architecture Decision 2026-08-21 — provisión Greenhouse-originated sin duplicar identidad ni mezclar ciclos de vida

- Status: `Proposed`
- Date: `2026-08-21`
- Owner: `Identity + Workforce/People + Hiring + Ops/Security`
- Scope: `EPIC-011`, identidad longitudinal, Microsoft Entra inbound provisioning, SCIM de retorno, habilitación Microsoft 365 y offboarding
- Reversibility: `two-way-but-slow`
- Confidence: `high` en el patrón técnico; `medium` en licenciamiento y ceremonia de activación hasta cerrar gates del tenant
- Validated as of: `2026-08-21` mediante código/repositorio, Azure CLI read-only y documentación oficial Microsoft

## Context

Hiring ya puede producir un `member` sobre la misma persona y TASK-1731 diseña dos checkpoints separados:
`principal_bound` y `workforce_enabled`. Falta convertir esos hechos en una identidad laboral de Microsoft sin:

- crear un segundo `user_id`, `identity_profile_id` o `member` por cambio de correo;
- interpretar selección, handoff o `member.created` como autorización laboral suficiente;
- mezclar la vigencia del portal longitudinal `/my` con `accountEnabled` de la cuenta corporativa;
- declarar éxito cuando Microsoft Graph sólo aceptó una carga asíncrona;
- meter una cuenta aún no enlazada al grupo que alimenta el SCIM Entra → Greenhouse;
- habilitar servicios Microsoft 365 sin licencia, grupo y aprobación verificables;
- construir un alta sin baja, revocación y reconciliación.

### Evidencia verificada

- El tenant tiene un job SCIM Entra → Greenhouse activo y exitoso, scoped al grupo Microsoft 365 `Efeonce Group`.
- No existe una Enterprise App instalada para `API-driven provisioning to Microsoft Entra ID`.
- `Efeonce Group` es `Unified` y `securityEnabled=false`; no tiene licencias asignadas y no debe reutilizarse como
  grupo de licenciamiento.
- El snapshot de SKUs no demuestra capacidad libre: Microsoft 365 Business Premium aparece 6/6 consumida y Entra
  ID P1 1/1 consumida; el rollout debe bloquear ante capacidad no verificada.
- El mapping SCIM saliente actual compara `userPrincipalName → userName` y devuelve `objectId → externalId`.
- `src/lib/entra/profile-sync.ts` carga sólo `client_users.active=TRUE` y hoy traduce
  `accountEnabled=false` a `client_users.active=false`. Una precreación deshabilitada apagaría por error el
  principal Greenhouse longitudinal y dejaría inalcanzable la reactivación del mismo cron.
- `client_users.microsoft_oid` y `members.identity_profile_id` tienen protección de unicidad, pero
  `identity_profile_source_links` no impide por sí sola que el mismo objeto externo termine ligado a perfiles
  distintos. El nuevo write path debe cerrar esa brecha bajo transacción.

Microsoft documenta que `/bulkUpload` responde `202 Accepted`, procesa de forma asíncrona y exige consultar
provisioning logs antes de tratar un registro como creado o reintentar. El servicio administrado hace
matching, scoping, mapping, create/update/enable/disable; la carga admite hasta 50 operaciones por request y el
cliente debe respetar `429`/`Retry-After` y el límite más conservador publicado. Fuentes:

- [API-driven inbound provisioning concepts](https://learn.microsoft.com/en-ie/entra/identity/app-provisioning/inbound-provisioning-api-concepts)
- [bulkUpload synchronization API](https://learn.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-post-bulkupload)
- [Grant access to API-driven provisioning](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/inbound-provisioning-api-grant-access)
- [Customize attribute mappings](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/customize-application-attributes)

## Decision

### 1. Patrón de integración

Greenhouse usará una Enterprise App dedicada de **API-driven provisioning to Microsoft Entra ID** para identidades
cloud-only. No reutilizará la App Registration de login ni la Enterprise App SCIM Entra → Greenhouse. No hará
`POST /users` directo como camino canónico.

El writer tendrá sólo `SynchronizationData-User.Upload.OwnedBy`. La lectura de resultados, que requiere
`ProvisioningLog.Read.All`, se separará en otro principal o boundary operativo cuando sea viable; si se conserva
en un mismo runtime, el ADR de implementación deberá justificar y auditar ese permiso más amplio. En producción se
prefiere autenticación con certificado/identidad workload sobre secreto de larga vida.

### 2. Source of truth repartido

| Hecho | Autoridad |
| --- | --- |
| Persona, selección confirmada, activation request, elegibilidad laboral, start/leave facts | Greenhouse Hiring/Workforce |
| Principal longitudinal, `user_id`, `identity_profile_id`, audiences y acceso `/my` | Greenhouse Identity |
| Objeto Microsoft, OID y resultado de provisioning | Microsoft Entra |
| Nombre UPN reservado y binding Greenhouse ↔ OID | Registro de provisioning Greenhouse reconciliado con Entra |
| `accountEnabled`, métodos de autenticación Microsoft y acceso M365 | Microsoft Entra, derivados sólo de commands Greenhouse autorizados y readback |
| Capacidad/assignment de licencias | Microsoft Entra/Microsoft 365; nunca inferida desde Greenhouse |

Esto califica el contrato vigente de `GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`: Entra sigue siendo autoridad del
objeto Microsoft y de su estado, pero Greenhouse pasa a ser una fuente autorizada de intención laboral para el
job inbound. `accountEnabled=false` **no** significa que el principal longitudinal de Greenhouse deba quedar
inactivo.

### 3. Dos checkpoints y un resultado posterior

1. **Reserva/provisión deshabilitada**: sólo después de `principal_bound`, activation lane `internal_hire`, People
   approval de datos mínimos y UPN reservado sin colisión. Greenhouse envía `active=false`, sin licencia, sin grupo
   de acceso y sin TAP. Selección, handoff aprobado o `member.created` solos no bastan.
2. **Binding confirmado**: el reconciler llega a estado terminal, obtiene el OID por el ancla inmutable, y liga
   OID/UPN al `user_id` + `identity_profile_id` + `member_id` existentes bajo lock/CAS. Sólo entonces la cuenta
   puede entrar al scope del SCIM saliente.
3. **Preparación y habilitación M365**: es un checkpoint independiente posterior a `workforce_enabled`, condicionado
   por licencia disponible, `usageLocation`, grupo de seguridad dedicado, aprobación humana y readback de
   `licenseAssignmentStates`. La cuenta permanece disabled durante la preparación y `accountEnabled=true` es el
   último side effect de acceso. Un fallo no revierte selección, member ni principal; queda `blocked` con
   `nextRequiredAction`.

### 4. Correlación, matching y anti-duplicación

- `externalId`/matching principal será un ID Greenhouse opaco, inmutable y no reutilizable, estable 1:1 con el
  principal longitudinal. `hiring_handoff_id` y activation request/version son causation/idempotency por intento,
  nunca el anchor de identidad; el nombre físico final se congela en Plan Mode.
- Email personal, correo corporativo, alias, display name y UPN **nunca** prueban ownership ni autorizan auto-merge.
- El UPN se reserva por policy y una colisión entra a cola humana; no se resuelve agregando sufijos silenciosos.
- Antes de enviar, se consulta que el ancla no esté vinculada a otro OID/perfil. El write de binding agrega una
  restricción única efectiva por `(source_system, source_object_type, source_object_id)` o un resolver transaccional
  equivalente, además de las constraints existentes.
- Idempotency key: `targetTenant + immutableWorkforceAnchor + provisioningVersion`. Un outcome incierto siempre
  obliga a readback de logs/objeto antes de retry.
- Secuencia dura: `crear disabled fuera de grupos → resultado terminal/OID → bind CAS → preparar/readback de
  grupos y licencia → habilitar al final → scope SCIM/reconciliar`.
  Invertirla puede hacer que SCIM cree un segundo principal por corporate UPN.

### 5. Ciclos de vida separados

Se modelan al menos estos ejes independientes:

- `portal_principal_active`: acceso longitudinal candidate/ex-collaborator según audiences/capabilities Greenhouse;
- `workforce_account_enabled`: autenticación de la cuenta Microsoft;
- `m365_service_ready`: licencia y grupos de servicio confirmados;
- `workforce_membership_active`: ciclo laboral del member.

Se prohíbe que `src/lib/entra/profile-sync.ts` o SCIM traduzcan automáticamente
`workforce_account_enabled=false` a `portal_principal_active=false`. La corrección y su prueba negativa son un gate
pre-canary de TASK-1761.

### 6. Alta, cambios y baja

El bridge cubre Joiner-Mover-Leaver:

- **Joiner**: provisionar disabled, bind, y habilitar sólo después de gates.
- **Mover**: UPN/display/profile/group changes son proposals o commands idempotentes con readback; un rename no
  cambia la identidad estable.
- **Cancelación pre-start**: deshabilitar, retirar grupos/licencia/TAP si existieran y preservar audit/principal.
- **Leaver**: TASK-1349 conserva ownership del cierre laboral/member; TASK-1761 ejecuta la compensación Microsoft
  (disable, remove access/license groups, revoke TAP/auth bootstrap) y reconcilia residual access.
- **Rehire**: reusar el mismo principal, perfil, member y OID cuando el readback sea inequívoco; no crear otra fila.

Nunca se hace hard-delete automático de la cuenta Microsoft ni del principal Greenhouse.

### 7. Credenciales iniciales

No se envían ni persisten passwords. Temporary Access Pass queda fuera del primer rollout hasta que su policy,
licencia, destinatario y revocación estén verificadas. TAP se revela una sola vez y no puede aparecer en logs,
eventos ni DB. Lifecycle Workflows requiere licenciamiento Governance y se evalúa como carril posterior.

Fuentes:

- [Temporary Access Pass](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-authentication-temporary-access-pass)
- [Lifecycle Workflow tasks](https://learn.microsoft.com/en-us/entra/id-governance/lifecycle-workflow-tasks)
- [Microsoft Entra ID Governance licensing](https://learn.microsoft.com/en-us/entra/id-governance/licensing-fundamentals)

## Alternatives Considered

### A. Crear usuarios con `POST /users`

Rechazada como camino canónico: obliga a Greenhouse a manejar password profile y a reconstruir matching,
scoping, provisioning logs y enable/disable que ya entrega el servicio inbound. Puede existir sólo como recovery
break-glass con ADR específico.

### B. Power Automate o flujo manual desde el cierre de Hiring

Rechazada: no entrega ledger durable, idempotencia, anti-duplicación, reconciliación ni JML completo. Puede ser una
ceremonia temporal visible, nunca la fuente de verdad.

### C. Agregar inmediatamente al grupo `Efeonce Group`

Rechazada: ese grupo alimenta el SCIM inverso, no es un security group de licencias y puede disparar creación
duplicada antes de que el OID esté ligado.

### D. Usar email/UPN como clave

Rechazada: cambian, pueden colisionar y el email personal no equivale a identidad laboral.

### E. Habilitar y licenciar en el mismo paso que crear

Rechazada: mezcla `principal_bound` con `workforce_enabled`, impide una pausa segura y puede conceder acceso antes
de readiness/aprobación.

## Consequences

### Beneficios

- Un solo principal y una sola persona de candidatura a empleo, salida y rehire.
- Provisioning administrado, asíncrono y observable con least privilege.
- No se promete una cuenta utilizable si falta licencia o approval.
- El SCIM existente puede reconciliar sobre el mismo principal en lugar de crear otro.
- Rollback y offboarding preservan el portal longitudinal y la evidencia.

### Costos y riesgos residuales

- Se requiere nuevo aggregate/ledger, job de reconciliación y hardening previo del profile sync.
- `ProvisioningLog.Read.All` es amplio y requiere separación/justificación.
- El tenant actual no demuestra capacidad de licencia; el rollout usable puede quedar bloqueado comercialmente.
  El diseño debe preferir grupo de seguridad/dinámico dedicado para evitar `GroupMember.ReadWrite.All` en el uploader;
  cualquier grupo estático requiere un writer separado y ADR/permission gate. `usageLocation` se verifica antes de
  assignment. [Group-based licensing](https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing)
- Los logs Entra tienen retención dependiente de licencia; Greenhouse debe guardar outcome/correlation minimizados,
  no payloads ni PII duplicada. [Retención de reportes Entra](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-reports-data-retention)
- No existe staging tenant aislado: el canary será una escritura externa real y requiere allowlist, cuenta sintética,
  disabled-by-default y aprobación explícita.

## Runtime Contract

El runtime descrito aquí **no existe aún**. `TASK-1761` es la unidad de implementación. Hasta que cierre:

- la integración productiva vigente sigue siendo Entra → Greenhouse;
- no hay autorización para crear usuarios, apps, secrets, grupos ni assignments en Azure;
- los nombres de tabla/eventos/flags de TASK-1761 son contratos planificados, no catálogo runtime activo;
- el ADR `Proposed` bloquea cambios irreversibles y cualquier canary.

La implementación deberá materializar:

- aggregate durable `entra_workforce_account_provisioning` y command/reader/reconciler canónicos;
- Enterprise App y principals dedicados, con permisos y consentimientos readback;
- WIF del service account GCP hacia Entra como opción preferida; certificado dedicado si el spike demuestra que WIF
  no es viable, nunca el secreto/app actual. [Workload identity federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
- flags default OFF para submit, enablement y M365 activation;
- signals de stuck, binding drift, loop SCIM, licencia bloqueada y residual leaver access;
- documentación técnica, funcional y manual/runbook antes del cierre.

## Revisit When

- Microsoft cambie permisos, límites, licenciamiento o soporte de API-driven provisioning.
- exista un tenant no productivo o Lifecycle Workflows/TAP autorizado.
- el source of truth de empleo migre fuera de Greenhouse.
- se requieran identidades híbridas/on-premises o multi-tenant Microsoft.
- el SCIM saliente cambie su matching/scope.
- se decida que `m365_service_ready` debe ser requisito de completitud de TASK-1721, sin convertirlo en parte de
  `workforce_enabled`.

## Implementation Owner

- `TASK-1761 — Hiring-to-Entra Workforce Account Provisioning and Lifecycle Bridge`
