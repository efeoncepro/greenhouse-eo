# SCIM con Microsoft Entra

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-04 por Codex
> **Modulo:** Identidad y acceso
> **Ruta en portal:** `/admin/scim-tenant-mappings`
> **Documentacion relacionada:** [Provisioning SCIM con Microsoft Entra](../../documentation/identity/scim-entra-provisioning.md), [GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md](../../architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md)

## Para que sirve

Este manual sirve para verificar y operar el provisioning SCIM entre Microsoft Entra y Greenhouse sin romper usuarios, roles ni saldos de identidad.

SCIM crea, actualiza y desactiva usuarios desde Entra. No reemplaza el modelo de permisos de Greenhouse: roles, vistas, route groups, responsabilidades y scopes siguen viviendo en Greenhouse.

## Antes de empezar

Necesitas:

- Acceso admin a Greenhouse.
- Azure CLI autenticado en el tenant Efeonce.
- GCP/psql disponible si vas a verificar DB.
- No imprimir ni pegar tokens SCIM en chats, screenshots o docs.

Identificadores canonicos:

- Enterprise App SCIM: `GH SCIM`
- Service principal ID: `fe7a54ef-844f-4cbc-acee-3349d914f1ce`
- Job ID: `scim.a80bf6c17c454d70b04351389622a0e4.4d89f061-eeb0-4aa8-ac94-df57d37e8c2a`
- Tenant interno Efeonce: `scim_tenant_mappings.client_id=NULL`

## Verificar que Greenhouse responde SCIM

1. Abre el endpoint discovery:

```bash
curl -i https://greenhouse.efeoncepro.com/api/scim/v2/ServiceProviderConfig
```

Resultado esperado: `200`.

2. Verifica que `/Users` rechaza requests sin bearer:

```bash
curl -i "https://greenhouse.efeoncepro.com/api/scim/v2/Users?count=1"
```

Resultado esperado: `401`.

3. Si necesitas probar con bearer real, usa el secreto desde el mecanismo canonico y no lo imprimas. Resultado esperado con bearer valido: `200`.

## Verificar el job de Entra

Usa Azure CLI:

```bash
SP_ID='fe7a54ef-844f-4cbc-acee-3349d914f1ce'
JOB_ID='scim.a80bf6c17c454d70b04351389622a0e4.4d89f061-eeb0-4aa8-ac94-df57d37e8c2a'

az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/${SP_ID}/synchronization/jobs/${JOB_ID}" \
  --query "{scheduleState:schedule.state,statusCode:status.code,lastState:status.lastExecution.state,countEscrowed:status.lastExecution.countEscrowed,error:status.lastExecution.error,quarantine:status.quarantine,steady:status.steadyStateLastAchievedTime}" \
  -o json
```

Estado sano:

- `scheduleState = Active`
- `statusCode = Active`
- `lastState = Succeeded`
- `error = null`
- `quarantine = null`

## Probar un usuario real desde Entra

Usa `provisionOnDemand` para validar end-to-end. Esta prueba es mejor que un `curl` directo porque pasa por scoping, matching, mapping y export de Entra.

1. Obtén el `objectId` del usuario en Entra.
2. Usa la rule del job:

```bash
SP_ID='fe7a54ef-844f-4cbc-acee-3349d914f1ce'
JOB_ID='scim.a80bf6c17c454d70b04351389622a0e4.4d89f061-eeb0-4aa8-ac94-df57d37e8c2a'
RULE_ID='03f7d90d-bf71-41b1-bda6-aaf0ddbee5d8'
USER_ID='<entra-user-object-id>'

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/${SP_ID}/synchronization/jobs/${JOB_ID}/provisionOnDemand" \
  --headers 'Content-Type=application/json' \
  --body "{\"parameters\":[{\"ruleId\":\"${RULE_ID}\",\"subjects\":[{\"objectId\":\"${USER_ID}\",\"objectTypeName\":\"User\"}]}]}" \
  -o json
```

Resultado sano:

- `EntryImport = Success`
- `EntrySynchronizationScoping = Success`
- `EntryExportAdd = Success` o `EntryExportUpdate = Success`

## Verificar en Postgres

Para un usuario interno Efeonce provisionado por SCIM, verifica:

```sql
select
  cu.email,
  cu.scim_id is not null as has_scim_id,
  cu.client_id,
  cu.tenant_type,
  cu.auth_mode,
  cu.status,
  cu.active,
  cu.provisioned_by,
  ura.role_code,
  ura.client_id as role_client_id,
  ura.scope_level,
  ura.active as role_active
from greenhouse_core.client_users cu
left join greenhouse_core.user_role_assignments ura on ura.user_id = cu.user_id
where lower(cu.email) = lower('<email>');
```

Resultado esperado para Efeonce interno:

- `has_scim_id = true`
- `client_id = NULL`
- `tenant_type = efeonce_internal`
- `auth_mode = microsoft_sso`
- `provisioned_by = scim`
- `role_code = collaborator`
- `role_client_id = NULL`
- `scope_level = NULL`

## Que hacer si Entra muestra `countEscrowed`

Primero mira si hay error real:

- Si `quarantine != null`, hay incidente activo.
- Si `lastExecution.error != null`, revisa provisioning logs.
- Si `provisionOnDemand` falla, el contrato endpoint/mapping puede estar roto.
- Si `provisionOnDemand` funciona, Greenhouse esta sano y el escrow puede ser backlog historico de Entra.

Para reintentar escrows de forma segura:

```bash
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/${SP_ID}/synchronization/jobs/${JOB_ID}/restart" \
  --headers 'Content-Type=application/json' \
  --body '{"criteria":{"resetScope":"Escrows"}}'

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/${SP_ID}/synchronization/jobs/${JOB_ID}/start"
```

## Que no hacer

- No borrar usuarios SCIM reales para limpiar contadores de Entra.
- No editar `client_users.client_id` a mano para "hacer pasar" una FK.
- No volver a usar `efeonce-admin` como cliente interno.
- No cambiar la Enterprise App de SSO para arreglar SCIM; son apps separadas.
- No copiar el bearer token SCIM en Slack, docs, capturas o commits.

## Problemas comunes

### El job esta `Succeeded` pero `countEscrowed` no baja

Ejecuta `provisionOnDemand` para un usuario real en scope. Si exporta con success y la DB queda correcta, el endpoint Greenhouse esta sano. Revisa provisioning logs de Entra para entender el backlog; no hagas SQL manual.

### `/Users` devuelve 401 con bearer

Verifica que estas usando el token correcto desde GCP Secret Manager o el fallback canonico de Vercel. No crees una variable paralela.

### Entra intenta crear un usuario interno y Greenhouse devuelve 500

Revisa `scim_tenant_mappings`: el mapping interno Efeonce debe tener `client_id=NULL`. Si tiene un valor legacy como `efeonce-admin`, esta mal.

### Un usuario existe pero no entra con Microsoft

Eso puede ser SSO, no SCIM. Revisa el manual de auth resiliente y `/api/auth/health`. SCIM crea/actualiza usuarios; SSO autentica sesiones.

## Referencias tecnicas

- [Arquitectura SCIM + Entra](../../architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md)
- [Documentacion funcional SCIM](../../documentation/identity/scim-entra-provisioning.md)
- [Sistema de autenticacion resiliente](../../documentation/identity/sistema-auth-resiliente.md)
