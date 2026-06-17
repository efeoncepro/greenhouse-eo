# Operar Identity, Access y Admin Center

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Identity / Access / Admin Center
> **Rutas:** `/admin/users`, `/admin/roles`, `/admin/views`, `/admin/tenants`, `/admin/identity`, `/admin/scim-tenant-mappings`
> **Documentacion relacionada:** `docs/documentation/identity/identity-access-admin-center-end-to-end.md`

## Diagnosticar acceso

1. Identifica usuario, tenant y ruta.
2. Revisa `/admin/users` para estado y roles.
3. Revisa `/admin/views` para confirmar que la vista existe y esta asignada.
4. Revisa permission sets si el acceso viene de conjunto.
5. Revisa capabilities si el problema es una accion, no una pantalla.
6. Si el usuario viene de Entra, revisa SCIM mappings y grupos.

## Dar acceso a una vista

1. Verifica que la vista esta en `view_registry`.
2. Decide si el acceso debe venir por rol, permission set u override.
3. Prefiere rol/permission set cuando es repetible.
4. Usa override solo para excepcion auditada.
5. Pide al usuario cerrar/reabrir sesion si el cambio no aparece de inmediato.

## Resolver drift de identidad

1. Abre `/admin/identity/drift-reconciliation`.
2. Revisa propuesta y fuentes.
3. Aplica link/merge solo si la evidencia coincide.
4. No borres perfiles para resolver duplicados.
5. Verifica People/Member/SCIM despues del cambio.

## Operar SCIM

1. Revisa `/admin/scim-tenant-mappings`.
2. Verifica tenant, groups y mapping.
3. Usa Entra provisioning on demand para validar un usuario.
4. No crees members manualmente si SCIM debe hacerlo.
5. Si SCIM crea identidad incompleta, resuelve Workforce Activation despues.

## Que no hacer

- No dar `admin` broad para resolver un bloqueo puntual.
- No editar DB para asignar views.
- No saltarse capabilities server-side.
- No usar `approval_delegate` generico como autoridad de aprobacion.
- No mutar `password_hash` desde scripts o syncs.

## Problemas comunes

### Ve la pantalla pero no puede ejecutar la accion

Es un problema de entitlement/capability, no de view. Revisa capabilities.

### No ve la ruta

Revisa view registry, role assignments, permission sets y overrides.

### Entra provisiona pero Greenhouse no habilita al colaborador

SCIM crea identidad/acceso. Workforce Activation sigue validando ficha, compensation, legal profile y payment profile.
