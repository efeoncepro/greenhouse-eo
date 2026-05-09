> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-08 por Claude (TASK-613)
> **Ultima actualizacion:** 2026-05-08 por Claude
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1 — Delta 2026-05-08](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), [GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1](../../architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md)

# Clientes finanzas — vista de detalle

## Para que sirve

La vista de detalle de Clientes finanzas (URL `/finance/clients/[id]`) es la cabina del operador financiero: muestra la información comercial y económica de un cliente en una sola pantalla, agrupada por capacidades visibles según el rol del usuario.

A partir de TASK-613 (mayo 2026), esa vista vive **dentro del Organization Workspace** — el mismo shell que usa Agency para `/agency/organizations/[id]`. Eso significa:

- El cliente se entiende como una organización canónica (modelo 360).
- El operador ve siempre el mismo header (nombre, industria, país, KPIs) independientemente desde dónde entró.
- El contenido de la pestaña Finanzas preserva 1:1 lo que existía antes: 4 sub-pestañas (Facturación / Contactos / Facturas / Deals) y 3 KPIs (Por cobrar / Vencidas / Condiciones).

## Donde aparece

- Lista de clientes finanzas (`/finance/clients`) — al hacer click en una fila.
- Cualquier link directo: `/finance/clients/{clientProfileId}` o `/finance/clients/{organizationId}` (ambos formatos resuelven al mismo workspace).

## Que ve el usuario

| Sección | Contenido |
| --- | --- |
| Header | Nombre, status, badges (industria, país), `Public ID` y, para admins, ID interno. |
| KPI strip | Revenue mensualizado, gross margin, headcount FTE — alimentados desde el 360. |
| Tabs por facet | Identity, Spaces, Team, Economics, Delivery, **Finance**, CRM, Services, Staff Aug. Solo aparecen los facets autorizados por el rol del usuario. |
| Tab Finance (entrypoint Finance) | KPIs Por cobrar / Vencidas / Condiciones · 4 sub-tabs Facturación / Contactos / Facturas / Deals · drawer Add membership. |

## Capacidades preservadas (zero-loss)

Todo lo que el operador podía hacer antes, lo sigue pudiendo hacer:

- Editar términos comerciales del cliente (drawer Edit organization).
- Sincronizar con HubSpot (acción admin en el header).
- Ver facturas, contactos, deals.
- Agregar membresías al cliente (drawer Add membership).

## Modo legacy (fallback honesto)

Si el cliente todavía no tiene `organization_id` canónica resuelta, o si el flag de rollout está apagado para tu usuario, la URL muestra el detalle **legacy** (`<ClientDetailView>`) sin pérdida funcional. Cuando finanzas o el equipo de identidad complete el linkeo canónico, la vista bascula automáticamente al workspace nuevo en el siguiente acceso.

> Detalle técnico: el page server component evalúa `isWorkspaceShellEnabledForSubject(subject, 'finance')` y `resolveFinanceClientContext(...)`. Sin organización canónica → cae a `<ClientDetailView>` (degradación honesta, no error). Reliability signal `finance.client_profile.unlinked_organizations` cuenta cuántos clientes activos siguen sin `organization_id`.

## Diferencias con la vista Agency

Los dos entrypoints (`/agency/organizations/[id]` y `/finance/clients/[id]`) montan el **mismo shell** y la **misma projection** del Organization Workspace, pero el **facet Finance** decide qué mostrar según `entrypointContext`:

- Desde Finance → contenido rico legacy (4 sub-tabs + KPIs Por cobrar/Vencidas/Condiciones + Add membership drawer).
- Desde Agency / Admin / Client portal → wrapping Agency-flavored del legacy `OrganizationFinanceTab` (KPIs económicos del 360 + summary mensual).

Esto evita duplicación de UIs y garantiza que un cambio en el shell beneficia a todos los entrypoints simultáneamente.

> Detalle técnico: `src/views/greenhouse/organizations/facets/FinanceFacet.tsx` (dual-entrypoint dispatch). Patrón canónico documentado en [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md Delta 2026-05-08](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md).

## Permisos y visibilidad

La projection canónica (TASK-611) decide qué facets son visibles según:

- `tenantType` del usuario (efeonce_internal, client, agency_partner).
- `roleCodes` (efeonce_admin, finance_admin, etc.).
- `routeGroups` (`finance` activo da acceso al entrypoint Finance).
- Capabilities granulares (`organization.finance_sensitive`, `organization.crm`, etc.).

Si un facet no es visible para tu rol, no aparece como tab. La degradación es silenciosa (no rompe la página).

## Roadmap (rollout)

1. **V1** (mayo 2026): default off. Shell visible solo para usuarios pilot via flag `organization_workspace_shell_finance` con `scope_type='user'`.
2. **V1.1**: activación gradual por rol (efeonce_admin → finance_admin → operador finanzas).
3. **V2**: cleanup de `<ClientDetailView>` legacy una vez que >= 90 días de rollout estable confirme paridad funcional.

## Referencias técnicas

- Spec: [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md Delta 2026-05-08](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
- Spec workspace: [GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md](../../architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md)
- Page: [src/app/(dashboard)/finance/clients/[id]/page.tsx](../../../src/app/(dashboard)/finance/clients/[id]/page.tsx)
- Wrapper client: [src/views/greenhouse/finance/FinanceClientsOrganizationWorkspaceClient.tsx](../../../src/views/greenhouse/finance/FinanceClientsOrganizationWorkspaceClient.tsx)
- Facet dispatch: [src/views/greenhouse/organizations/facets/FinanceFacet.tsx](../../../src/views/greenhouse/organizations/facets/FinanceFacet.tsx)
- Contenido rico: [src/views/greenhouse/organizations/facets/FinanceClientsContent.tsx](../../../src/views/greenhouse/organizations/facets/FinanceClientsContent.tsx)
- Reliability signal: [src/lib/reliability/queries/finance-client-profile-unlinked.ts](../../../src/lib/reliability/queries/finance-client-profile-unlinked.ts)
- Flag store: [src/lib/home/rollout-flags-store.ts](../../../src/lib/home/rollout-flags-store.ts)
