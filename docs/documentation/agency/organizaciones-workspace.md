# Organizaciones — Workspace compartido

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-08 por Claude (TASK-612)
> **Ultima actualizacion:** 2026-05-08 por Claude
> **Documentacion tecnica:** [GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md](../../architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md), [GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md)

## La idea central

Cuando un usuario interno o un contacto de cliente entra al detalle de una organización (un cliente B2B), todas las superficies del portal deberían mostrar la **misma estructura visual**: el mismo header, las mismas tarjetas de KPI, las mismas pestañas. Lo que cambia es el contenido de cada pestaña según quién entra y desde dónde.

Antes de TASK-612, cada módulo (Agency, Finance, etc.) construía su propia vista de organización con copy-paste, lo que generaba inconsistencias visuales y fricción para mantener.

Ahora hay un **shell compartido** (cabecera + KPIs + contenedor de pestañas) y un **router de contenido por pestaña** que carga cada sección on-demand. Cada módulo solo decide desde qué punto entra (`entrypointContext`) y qué pestaña abre por defecto.

## Las 9 secciones canónicas

Cada organización tiene 9 facetas posibles (las mismas que `Account 360`):

| Facet | Qué muestra |
|---|---|
| **Identidad** | Datos básicos: nombre, dominio, status comercial, identidad legal/fiscal, conexión HubSpot |
| **Spaces** | Spaces operativos asociados |
| **Equipo** | Personas asignadas + proyectos |
| **Economía** | KPIs económicos: ICO, contribution margin, P&L summary |
| **Entrega** | Tasks, projects, sprints, ICO score, RpA, OTD |
| **Finanzas** | Ingresos, gastos, payment orders, FX, balances |
| **CRM** | Contactos, deals, pipeline HubSpot (próximamente) |
| **Servicios** | Catálogo `p_services` + engagements (próximamente) |
| **Staff Aug** | Arrangements de staff augmentation (próximamente) |

Las 3 últimas hoy muestran un **mensaje vacío honesto** porque la vista dedicada se construirá en tasks futuras (TASK-836/837 para servicios, TASK-XXX para CRM y staff aug). El shell ya las contempla; cuando emerja el contenido real solo hay que reemplazar el wrapper.

## Quién ve qué

Las pestañas que ve cada usuario las decide la **proyección canónica** (TASK-611). Resumen:

| Usuario | Qué ve por defecto |
|---|---|
| `efeonce_admin` | Las 9 pestañas, todas las acciones (incluyendo HubSpot sync + Edit) |
| Equipo interno (sin admin) | 7 pestañas non-sensitive: identidad, spaces, equipo, entrega, CRM, servicios, staff aug |
| Equipo finanzas (sin admin) | Lo anterior + economía + finanzas |
| Contacto del cliente | 4 pestañas: identidad, equipo, entrega, servicios — solo de su propia org |
| Interno sin asignación | Mensaje "Sin relación con esta organización" |

La pestaña por defecto depende del entrypoint:

- Desde **Agency** → abre en Identidad
- Desde **Finance** → abre en Finanzas (cuando TASK-613 mergee)
- Desde **Admin** → abre en Identidad

Si el usuario llega via deep-link `?facet=delivery`, esa pestaña queda activa al cargar (preserva navegación bookmarkable).

## Cómo se activa

El nuevo workspace está detrás de un **flag de rollout** llamado `organization_workspace_shell_agency`. Por defecto está `disabled` para no afectar a nadie. Un admin lo activa progresivamente desde Admin Center > Gobernanza > Flags:

1. **Internal dogfood** (1 día): activar para 1-2 admins por scope `user`.
2. **Tenant rollout staged** (1 semana): activar por scope `role` empezando por `efeonce_admin`, luego `agency_lead`, luego `collaborator`.
3. **Default global enabled** (post-soak): activar global cuando no haya issues.
4. **V1 retirement** (60+ días post-default): retirar la `OrganizationView` legacy en una task derivada.

Mientras el flag está disabled (o si la resolución falla por algún motivo), el portal sigue mostrando la vista legacy sin pérdida funcional.

## Cuando algo falla

Si la proyección no puede resolverse (ej. backend caído, permisos no resolubles), el shell muestra un **mensaje de modo degradado** honesto en es-CL tuteo, sin tabs ni acciones. Los 3 motivos posibles:

- "No pudimos resolver tu relación con esta organización."
- "No pudimos cargar tus permisos para esta organización."
- "No tenés acceso a ninguna sección de esta organización. Hablá con un admin."

Nunca renderiza una vista en blanco ni crashea. El error queda capturado en Sentry con `domain=identity` para que ops vea la causa raíz.

## Qué viene después

Esta task entrega la **foundation visual** del workspace. Las siguientes piezas:

- **TASK-613** — Convergencia Finance: `/finance/clients/[id]` adopta el mismo shell con `entrypointContext='finance'` (default tab Finanzas).
- **TASK-839** — Wire Admin Center governance: cuando emerja, los admins pueden otorgar permisos finos por usuario (ej. dar acceso a `organization.finance_sensitive` solo a Valentina para Sky), y el cache del workspace se invalida automáticamente vía outbox.
- **TASK-836/837** — Service pipeline: la pestaña Servicios pasa de empty state honest a la vista real de engagements.

> **Detalle tecnico:** Componentes canonicos en [`src/components/greenhouse/organization-workspace/`](../../../src/components/greenhouse/organization-workspace/). Facets en [`src/views/greenhouse/organizations/facets/`](../../../src/views/greenhouse/organizations/facets/). Page server-side en [`src/app/(dashboard)/agency/organizations/[id]/page.tsx`](../../../src/app/(dashboard)/agency/organizations/[id]/page.tsx). Helper rollout en [`src/lib/workspace-rollout/index.ts`](../../../src/lib/workspace-rollout/index.ts). Spec canonica: [`GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`](../../architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md).
