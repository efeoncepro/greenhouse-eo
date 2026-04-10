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

Se alineó el criterio de acceso y descubrimiento:

1. page + API ahora usan un resolver propio `resolveHrOrgChartAccessContext()` para broad HR/admin o supervisor subtree-aware;
2. el menú lateral deja visible `Organigrama` cuando la persona ya aterriza en el workspace supervisor y tiene identidad interna materializada.

## Verificación

1. `pnpm exec vitest run src/app/api/hr/core/org-chart/route.test.ts src/lib/tenant/authorization.test.ts`
2. `pnpm lint`
3. `pnpm build`

## Estado

resolved

## Relacionado

- [TASK-329](../../tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md)
- [GREENHOUSE_IDENTITY_ACCESS_V2.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md)
