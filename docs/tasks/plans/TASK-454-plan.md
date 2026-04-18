# Plan — TASK-454 HubSpot Lifecycle Stage Sync

## Discovery summary

- La spec original asumía `greenhouse_core.clients` como root canónico de company, pero el runtime actual ya es `organization-first`.
- El carril CRM runtime ya existe en PostgreSQL:
  - `greenhouse_crm.companies.lifecycle_stage`
  - `greenhouse_crm.contacts.lifecycle_stage`
- No existe todavía un sync canónico de company lifecycle en `src/lib/hubspot/`.
- Ya existen patrones reutilizables para:
  - HubSpot live reads (`src/lib/integrations/hubspot-greenhouse-service.ts`)
  - cron + readiness gate (`src/app/api/cron/hubspot-*-sync/route.ts`)
  - sync por company/org (`src/lib/services/service-sync.ts`, `src/lib/hubspot/sync-hubspot-quotes.ts`)
  - outbox (`src/lib/sync/publish-event.ts`)
- El corte correcto es:
  - mantener `greenhouse_crm.companies` como source projection CRM
  - agregar `lifecyclestage` en `greenhouse_core.clients` como bridge denormalizado para consumers legacy client-scoped
  - no reabrir Contact sync ni canonicalizar Lead

## Access model

No aplica cambio de acceso.

- `routeGroups`: sin cambios
- `views` / `authorizedViews`: sin cambios
- `entitlements`: sin cambios
- `startup policy`: sin cambios

## Skills

- Slice 1 — migration + store/backend helpers:
  - `greenhouse-agent`
- Slice 2 — App Router cron route:
  - `greenhouse-agent`
  - `vercel:nextjs`
- Slice 3 — event catalog + publisher:
  - `greenhouse-agent`

## Subagent strategy

`sequential`

- La discovery ya fue paralelizada con dos explorers.
- La implementación tiene dependencias en cadena:
  - primero migration/types
  - luego helper/store
  - luego publisher/event catalog
  - luego cron route
- Mantengo la escritura en un solo hilo para evitar drift en la misma zona backend.

## Execution order

1. Crear migración formal para `greenhouse_core.clients.lifecyclestage*`.
2. Correr migración y regenerar `src/types/db.d.ts`.
3. Implementar publisher de `crm.company.lifecyclestage_changed`.
4. Extender `src/lib/sync/event-catalog.ts` con aggregate/event type nuevos.
5. Implementar `src/lib/hubspot/sync-hubspot-company-lifecycle.ts`.
6. Implementar reader helper `getClientLifecycleStage(clientId)`.
7. Crear `src/app/api/cron/hubspot-company-lifecycle-sync/route.ts`.
8. Registrar cron en `vercel.json`.
9. Actualizar documentación de arquitectura/event catalog.
10. Validar con migrate, lint, tsc, test y build.

## Files to create

- `migrations/<timestamp>_task-454-hubspot-company-lifecycle-stage.sql`
- `src/lib/hubspot/company-lifecycle-events.ts`
- `src/lib/hubspot/sync-hubspot-company-lifecycle.ts`
- `src/lib/hubspot/company-lifecycle-store.ts`
- `src/app/api/cron/hubspot-company-lifecycle-sync/route.ts`

## Files to modify

- `src/lib/sync/event-catalog.ts`
  - agregar aggregate/event type nuevos
- `src/types/db.d.ts`
  - regen post-migration
- `vercel.json`
  - registrar cron
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
  - documentar evento nuevo
- `Handoff.md`
  - cierre operativo
- `docs/tasks/in-progress/TASK-454-lifecyclestage-sync-company-contact.md`
  - cierre administrativo final
- `docs/tasks/README.md`
  - sincronizar lifecycle al cierre

## Files to delete

- ninguno

## Risk flags

- `clients` no es el root canónico actual; evitar que el nuevo helper cree más acoplamiento del necesario.
- El fallback Nubox debe ser conservador para no etiquetar erróneamente tenants legacy sin evidencia económica real.
- El sync no debe pisar futuros overrides manuales si ese carril se habilita después.
- Hay que preservar tenant isolation: toda lectura/escritura debe mantener `client_id` / `space_id` / `organization_id` cuando existan en payload y helpers.

## Open questions

- ¿El sync debe consumir HubSpot live siempre o aceptar fallback a `greenhouse_crm.companies` cuando ya está fresco? Para este corte voy a priorizar HubSpot live y dejar el projection CRM solo como referencia/diagnóstico.
- ¿El aggregate_id del outbox debe ser `clientId` o `hubspotCompanyId`? Para este corte voy a usar `clientId` cuando exista, porque el consumer target inmediato es client-scoped, y dejaré `hubspotCompanyId` en payload.
