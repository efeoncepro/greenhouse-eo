# ISSUE-043 — Organigrama puede estar permitido por permisos pero oculto en el menú

## Ambiente

runtime general

## Detectado

2026-04-10, auditoría de routing, permisos y navegación lateral

## Síntoma

Un usuario con alcance limitado de supervisor puede tener acceso funcional a `/hr/org-chart`, pero no ver la entrada correspondiente en el menú lateral.

## Causa raíz

La page y la API del organigrama aceptan acceso broad o supervisor scope, pero la construcción del menú lateral sigue una condición más restrictiva basada en `isHrUser || isAdminUser`.

Eso deja desacoplados:

- el contrato de acceso
- la navegación visible

Referencias:

- [page.tsx](/Users/jreye/Documents/greenhouse-eo/src/app/(dashboard)/hr/org-chart/page.tsx#L14)
- [route.ts](/Users/jreye/Documents/greenhouse-eo/src/app/api/hr/core/org-chart/route.ts#L19)
- [VerticalMenu.tsx](/Users/jreye/Documents/greenhouse-eo/src/components/layout/vertical/VerticalMenu.tsx#L160)
- [GREENHOUSE_IDENTITY_ACCESS_V2.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md#L16)

## Impacto

- El usuario puede concluir que no tiene acceso aunque la ruta sí funcione.
- El descubrimiento de la capacidad depende de conocer la URL exacta.
- La experiencia de permisos queda inconsistente entre backend, page guard y menú.

## Solución

Unificar el criterio de navegación con el criterio de acceso:

1. Si supervisor-limited debe ver el módulo, reflejarlo en el menú.
2. Si no debe verlo, endurecer también page guard y API para que el contrato sea consistente.

## Verificación

1. Probar con un usuario supervisor-limited sin rol broad de HR.
2. Confirmar si el menú lateral muestra `Organigrama`.
3. Abrir `/hr/org-chart` directo y validar que navegación y autorización coincidan.

## Estado

open

## Relacionado

- [TASK-329](../../tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md)
- [GREENHOUSE_IDENTITY_ACCESS_V2.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md)
