# Manual de uso — Clientes finanzas (vista de detalle)

> **Tipo:** Manual de uso — operador del portal
> **Version:** 1.0
> **Creado:** 2026-05-08 por Claude (TASK-613)
> **Documentacion funcional:** [clientes-finanzas](../../documentation/finance/clientes-finanzas.md)

## Para que sirve

Para revisar y operar un cliente finanzas: ver lo que debe, las facturas vigentes, los contactos, los deals comerciales, y editar términos. Todo en una sola pantalla.

## Antes de empezar

- Necesitas haber iniciado sesión en Greenhouse.
- Tu rol debe tener acceso al route group `finance` o ser `efeonce_admin`.
- Si tu organización todavía no aparece en el shell nuevo, vas a ver la pantalla legacy (no es error — el equipo de identidad está completando el backbone canónico para todos los clientes).

## Paso a paso

1. Entra a `/finance/clients` (en el menú lateral, sección Finance > Clientes).
2. Click en la fila del cliente que quieres ver.
3. La URL cambia a `/finance/clients/<id>`.
4. Verás:
   - **Header** con nombre del cliente, badges (industria, país, status) y el `Public ID`.
   - **KPIs** (Revenue, gross margin, headcount FTE) si tu rol ve la facet Economics.
   - **Tabs** por capability — Identity, Spaces, Team, Economics, **Finance** (default), CRM, Services, Staff Aug. Solo aparecen los facets autorizados.
5. La tab Finance está seleccionada por default. Adentro encontrarás:
   - 3 KPI cards: Por cobrar / Vencidas / Condiciones.
   - 4 sub-tabs: Facturación / Contactos / Facturas / Deals.
6. Para cambiar de tab usa los chips superiores. La URL refleja la selección con `?facet=...` (deep-link compartible).
7. Para **editar** términos del cliente o sincronizar con HubSpot: botones en el header (solo visibles para admins).

## Que significan los estados o señales

- **Tab degradada**: si la projection no pudo resolver una capability, el tab puede aparecer con un mensaje "no disponible". Pasa cuando un módulo dependiente está caído. Refresca, si persiste avisar al canal de operaciones.
- **Vista legacy en lugar del shell nuevo**: significa que el cliente todavía no tiene `organization_id` canónica linkeada. El operador de identidad debe linkear desde Admin Center. Mientras tanto, todas las funciones siguen disponibles.
- **Sin tabs visibles**: tu rol no tiene acceso a ningún facet. Pedir capability adecuada en Admin Center.

## Que no hacer

- **No hacer click directo en la URL `.vercel.app`** — usa siempre el dominio (`greenhouse.efeoncepro.com` en producción, `dev-greenhouse.efeoncepro.com` en staging). Las URLs `.vercel.app` requieren bypass token.
- **No editar el `organization_id` de un cliente directamente en BigQuery o Postgres.** Toda mutación pasa por el endpoint canónico de organizations.
- **No esperar que la pestaña Finance muestre el mismo contenido desde Agency.** Cuando entras al mismo cliente desde `/agency/organizations/[id]`, la tab Finance muestra una vista Agency-flavored (KPIs económicos del 360 + summary mensual). Es intencional — Agency necesita una lectura más narrativa, Finance necesita el detalle operativo.

## Problemas comunes

| Síntoma | Probable causa | Solución |
| --- | --- | --- |
| "No veo la tab Finance" | Tu rol no tiene `routeGroups: finance` | Pedir acceso en Admin Center. |
| "Veo la pantalla legacy" | Cliente sin `organization_id` canónica O flag rollout off para tu usuario | Avisar al canal de operaciones; mientras tanto, todas las funciones funcionan en legacy. |
| "El KPI 'Por cobrar' no carga" | `/api/finance/clients/[id]` falló | Refrescar; si persiste, abrir issue. |
| "Cambié de cliente y la tab activa quedó pegada" | URL `?facet=` persistente | Limpiar el query param o hacer click en otra tab. |

## Referencias tecnicas

- Funcional: [docs/documentation/finance/clientes-finanzas.md](../../documentation/finance/clientes-finanzas.md)
- Arquitectura: [docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) Delta 2026-05-08
- Spec workspace: [docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md](../../architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md)
