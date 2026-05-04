# Provisioning SCIM con Microsoft Entra

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-04 por Codex
> **Modulo:** Identidad y acceso
> **Documentacion tecnica:** [GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md](../../architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md), [GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md)

---

## La idea central

Microsoft Entra decide que personas existen y si estan activas. Greenhouse decide que pueden hacer dentro del portal. SCIM es el puente automatico que crea, actualiza o desactiva usuarios en Greenhouse cuando Entra envia cambios.

Este flujo es distinto del login SSO:

- **Microsoft SSO** permite entrar al portal.
- **SCIM** mantiene el lifecycle de usuarios y grupos.
- **Graph profile sync** completa datos de perfil que SCIM no envia bien, como cargo, pais, telefono o manager.

## Que sincroniza SCIM

SCIM sincroniza atributos basicos de lifecycle:

- email / `userName`
- nombre visible / `displayName`
- estado activo / inactivo
- identificador externo de Entra
- grupos asignados desde Entra

SCIM no es el dueno de permisos finos, rutas, vistas ni responsabilidades operativas. Esas decisiones viven en Greenhouse.

## Como se provisiona un usuario interno Efeonce

Cuando Entra envia un usuario con dominio permitido (`efeoncepro.com`, `efeonce.org`, `efeonce.cl`), Greenhouse busca el tenant mapping interno.

El contrato canonico post-incidente 2026-05-04 es:

- `scim_tenant_mappings.client_id = NULL` significa tenant interno Efeonce.
- El usuario se crea en `client_users` con `client_id=NULL`.
- El usuario queda con `tenant_type='efeonce_internal'`.
- El login queda configurado con `auth_mode='microsoft_sso'`.
- El origen queda como `provisioned_by='scim'`.
- Se asigna el rol base definido por el mapping, hoy `collaborator`.

Esto evita usar pseudo-clientes como `efeonce-admin`, que no existen en `greenhouse_core.clients` y pueden romper foreign keys.

## Como se provisiona un cliente externo

Para tenants/clientes externos, el mapping debe apuntar a un cliente real de Greenhouse:

- `scim_tenant_mappings.client_id` debe existir en `greenhouse_core.clients`.
- La base de datos impide guardar mappings externos con clientes inexistentes.
- Los dominios permitidos del mapping controlan que emails pueden entrar por esa configuracion.

Este contrato permite escalar a provisioning multi-tenant sin mezclar usuarios internos con clientes.

## Que significa `countEscrowed` en Entra

`countEscrowed` significa que Entra retuvo objetos para reintento. Puede aparecer por errores historicos, por ejemplo cuando Greenhouse respondia `500` durante un `CREATE`.

No significa automaticamente que el endpoint Greenhouse siga roto. Para interpretar el estado hay que mirar:

- si el job esta `Active`
- si la ultima ejecucion esta `Succeeded`
- si `quarantine` es `null`
- si `lastExecution.error` es `null`
- si `provisionOnDemand` de un usuario real termina con `EntryExportAdd=Success`

Si `provisionOnDemand` funciona y la DB queda correcta, el endpoint Greenhouse esta sano. Los escrows restantes son backlog/estado del motor de Entra y deben manejarse desde Microsoft Graph, no con SQL manual.

## Incidente cerrado el 2026-05-04

El 2026-05-04 se detecto que Entra fallaba al crear usuarios internos porque el mapping Efeonce apuntaba al pseudo-client legacy `efeonce-admin`. Como ese cliente no existia, Postgres rechazaba el insert por FK.

La correccion robusta fue cambiar el contrato, no parchar el usuario:

- Tenant interno Efeonce usa `client_id=NULL`.
- Mappings externos quedan protegidos por FK contra `greenhouse_core.clients`.
- El runtime crea usuarios internos con `tenant_type='efeonce_internal'`.
- Admin UI/API permiten crear mappings internos dejando `clientId` vacio.

Validacion ejecutada:

- SCIM discovery productivo respondio `200`.
- `/Users` sin bearer respondio `401`.
- `/Users` con bearer productivo respondio `200`.
- `provisionOnDemand` desde Microsoft Entra para `support@efeoncepro.com` termino `EntryExportAdd=Success`.
- La DB confirmo usuario interno con `client_id=NULL`, `tenant_type='efeonce_internal'`, `auth_mode='microsoft_sso'`, `provisioned_by='scim'` y rol `collaborator`.

## Reglas duras

- No arreglar escrows de Entra editando usuarios directamente en SQL.
- No volver a usar `efeonce-admin` como `client_id`.
- No mezclar SSO y SCIM: son enterprise apps separadas en Entra.
- No poner el token SCIM en codigo, logs o capturas.
- No crear mappings externos si no existe un cliente canonico en `greenhouse_core.clients`.

## Para profundizar

- Manual operativo: [Manual de uso — SCIM con Microsoft Entra](../../manual-de-uso/identity/scim-entra-provisioning.md)
- Arquitectura: [GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md](../../architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md)
- Auth resiliente: [Sistema de Autenticacion Resiliente](sistema-auth-resiliente.md)
