# Operar Portal Cliente y Customer Experience

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Portal Cliente / Customer Experience
> **Rutas:** `/home`, `/analytics`, `/campaigns`, `/updates`, `/notifications`, `/settings`, `/admin/client-portal/*`
> **Documentacion relacionada:** `docs/documentation/client-portal/portal-cliente-customer-experience-end-to-end.md`, `docs/manual-de-uso/client-portal/menu-dinamico-y-empty-states.md`

## Para que sirve

Este manual sirve para operar la experiencia que ve un cliente en Greenhouse: que modulos aparecen, por que una ruta esta disponible o bloqueada, como diagnosticar empty states y como activar o pausar modulos sin saltarse permisos.

## Antes de empezar

Necesitas acceso admin con capabilities de Portal Cliente para gestionar catalogo/asignaciones. Si solo eres usuario cliente, puedes navegar tu portal y reportar problemas, pero no activar modulos.

Ten a mano:

- Organizacion cliente.
- Usuario afectado.
- Modulo o ruta reportada.
- Estado visible: normal, zero-state, not assigned, degraded o error.

## Activar un modulo para un cliente

1. Entra a la superficie admin de Portal Cliente.
2. Busca la organizacion cliente.
3. Revisa modulos disponibles en el catalogo.
4. Elige el modulo correcto.
5. Revisa si su `applicability_scope` calza con la business line del cliente.
6. Si no calza, usa override solo con razon operativa clara.
7. Guarda la asignacion.
8. Pide al cliente recargar sesion o espera la invalidacion de cache.
9. Verifica la ruta cliente relacionada.

## Pausar o deshabilitar un modulo

1. Identifica el modulo asignado.
2. Confirma si se trata de pausa temporal o baja.
3. Registra razon.
4. Aplica la accion desde Admin Center.
5. Verifica que el cliente ya no vea la ruta como activa.
6. Si corresponde, confirma que vea not assigned o estado informativo, no error generico.

## Diagnosticar "no veo una ruta"

1. Confirma que el usuario sea el correcto y este en la organizacion correcta.
2. Revisa su rol cliente: executive, manager, specialist u otro.
3. Revisa que la vista exista en `view_registry`.
4. Revisa que el rol tenga `role_view_assignments`.
5. Revisa que el modulo este asignado a la organizacion.
6. Revisa si la fuente de datos esta vacia o degradada.
7. Si el cliente entra por URL directa, confirma que el page guard use el resolver cliente.

## Que significan los estados

- **Normal:** acceso y datos listos.
- **Zero-state:** acceso correcto, pero aun no hay datos.
- **Not assigned:** el cliente no tiene comprado/activado ese modulo.
- **Degraded:** parte de la fuente falla o esta atrasada.
- **Error:** no se pudo resolver acceso o datos minimos.

## Problemas comunes

### El cliente ve not assigned pero deberia ver el modulo

Revisa `module_assignments`. Si el modulo no esta asignado, activalo por la UI admin. No edites la DB manualmente.

### El cliente ve zero-state y cree que es error

Explica que el modulo esta activo pero aun no hay datos. Revisa la fuente responsable antes de escalar.

### El cliente ve degraded

Revisa data source del modulo. Si depende de integraciones, mira `/admin/integrations` y runs recientes.

### El usuario tiene rol correcto pero no ve la vista

Rol no basta. Revisa `view_registry`, `role_view_assignments`, overrides y modulo asignado.

## Que no hacer

- No activar modulos insertando filas SQL sueltas.
- No cambiar route groups para "arreglar" un cliente.
- No dar rol admin a un usuario cliente.
- No ocultar un degraded como si fuera estado normal.
- No asumir que business line equivale automaticamente a modulo comprado.

## Referencias tecnicas

- `src/lib/client-portal/commands/enable-module.ts`
- `src/app/api/client-portal/modules/route.ts`
- `src/app/api/admin/client-portal/**`
- `greenhouse_client_portal.modules`
- `greenhouse_client_portal.module_assignments`
- `greenhouse_client_portal.module_assignment_events`
