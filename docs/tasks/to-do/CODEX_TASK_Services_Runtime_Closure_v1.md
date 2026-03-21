# CODEX TASK — Services Runtime Closure v1

## Estado

Nuevo. Derivado de la auditoría de `Greenhouse_Services_Architecture_v1.md` (movida a `docs/architecture/`), cuyo modelo de datos core (tabla `services`, view `v_client_active_modules`, resolución de capabilities) ya está implementado.

Esta task cierra los **3 gaps operativos** que impiden que el modelo de Services funcione end-to-end.

---

## Alineación obligatoria

- `docs/architecture/Greenhouse_Services_Architecture_v1.md` — spec canónica
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md`

---

## Realidad técnica del repo

### Ya implementado

| Recurso | Ubicación |
|---------|-----------|
| Tabla `greenhouse_core.services` | `scripts/setup-postgres-services.sql` (líneas 19-73) |
| View `v_client_active_modules` | `scripts/setup-postgres-services.sql` (líneas 87-99) |
| `loadServiceModules()` lee de services + legacy | `src/lib/tenant/identity-store.ts` (líneas 110-140, UNION transition) |
| `resolveCapabilityModules()` consume modules derivados | `src/lib/capabilities/resolve-capabilities.ts` |
| `service_sync_queue` tabla para write-back async | DDL en services script |
| Read endpoints HubSpot Services | `src/lib/integrations/hubspot-greenhouse-service.ts` |

### No implementado (lo que este task cierra)

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| HubSpot Services sync inbound | Services no se crean automáticamente desde HubSpot al cerrar un Deal | P1 |
| PostgreSQL → BigQuery ETL para services | Sin analytics cross-service en BigQuery, sin JOINs con ICO engine | P2 |
| Cutover del legacy `client_service_modules` | `loadServiceModules()` sigue haciendo UNION con tabla manual legacy | P1 |

---

## Plan de implementación

### Fase 1 — HubSpot Services inbound sync (P1)

**Objetivo:** Cuando un Service se crea/actualiza en HubSpot, debe llegar a `greenhouse_core.services` en PostgreSQL.

1. **Crear endpoint de sync** — `POST /api/integrations/hubspot/services/sync`
   - Recibe webhook de HubSpot o se ejecuta via polling periódico
   - Llama a `getHubSpotGreenhouseCompanyServices()` (ya existe en `hubspot-greenhouse-service.ts`)
   - Upsert en `greenhouse_core.services` por `hubspot_service_id`
   - Mapea properties HubSpot → columnas PostgreSQL según spec

2. **Crear cron de sync** — `/api/cron/services-sync`
   - Frecuencia: diario (ej. 06:00 UTC)
   - Itera sobre organizations con `hubspot_company_id`
   - Llama al endpoint de sync por cada company
   - Logging de resultados: creados, actualizados, errores

3. **Write-back async** — procesar `service_sync_queue`
   - Cuando un service se modifica en Greenhouse → INSERT en `service_sync_queue`
   - Cron o background job procesa la cola y actualiza HubSpot vía API

### Fase 2 — Cutover del legacy UNION (P1)

**Objetivo:** `loadServiceModules()` deja de leer de `client_service_modules` y usa solo `v_client_active_modules`.

4. **Verificar cobertura** — antes del cutover:
   - Listar todos los `client_service_modules` activos
   - Verificar que cada uno tiene su equivalente en `services` → `v_client_active_modules`
   - Si hay gaps, backfill services desde `client_service_modules`

5. **Remover UNION** en `identity-store.ts`:
   - `loadServiceModules()` lee SOLO de `v_client_active_modules`
   - Eliminar la rama legacy de `client_service_modules`

6. **Deprecar `client_service_modules`** como write target:
   - Marcar tabla como legacy en documentación
   - No eliminar aún (mantener como fallback de emergencia)

### Fase 3 — PostgreSQL → BigQuery ETL (P2)

**Objetivo:** Services disponibles en BigQuery para analytics y JOINs con ICO engine.

7. **Crear tabla BigQuery** — `greenhouse_conformed.services`
   - Schema mirror de `greenhouse_core.services`
   - Partitioned por `created_at`, clustered por `space_id`

8. **Crear ETL script** — `scripts/etl-services-to-bigquery.ts`
   - Lee de PostgreSQL `greenhouse_core.services`
   - Escribe a BigQuery `greenhouse_conformed.services` con `WRITE_TRUNCATE`
   - Ejecutar como cron nocturno o post-sync

9. **Crear view ICO** — `greenhouse_conformed.v_tareas_by_service`
   - JOIN `notion_ops.tareas` con `services` por `notion_project_id`
   - Habilita métricas ICO por servicio individual

---

## Criterios de aceptación

- [ ] Services de HubSpot llegan a PostgreSQL vía sync (cron o webhook)
- [ ] `loadServiceModules()` ya no hace UNION con `client_service_modules`
- [ ] `v_client_active_modules` es la fuente única de capabilities derivadas
- [ ] Services disponibles en BigQuery `greenhouse_conformed.services`
- [ ] `npx tsc --noEmit` limpio
- [ ] Capabilities siguen resolviéndose correctamente post-cutover (smoke test)

---

## Fuera de alcance

- No cambiar el schema del capability registry (`requiredServiceModules` se mantiene)
- No crear UI de gestión de services (eso viene en una task futura)
- No implementar revenue recognition temporal por service
- No tocar `resolve-capabilities.ts` ni `capability-registry.ts`

---

## Dependencies & Impact

- **Depende de:**
  - `greenhouse_core.services` (ya implementado)
  - `greenhouse_core.v_client_active_modules` (ya implementado)
  - `src/lib/integrations/hubspot-greenhouse-service.ts` (ya implementado)
  - HubSpot API para services inbound sync
- **Impacta a:**
  - `CODEX_TASK_Business_Units_Canonical_v2` — `linea_de_servicio` alignment con `module_code`
  - `CODEX_TASK_Campaign_360_v2` — campaigns se asocian a services activos
  - `CODEX_TASK_Tenant_Notion_Mapping` — services analytics en BigQuery mejoran con `space_id`
  - `CODEX_TASK_Staff_Augmentation_Module_v2` — placements pueden enlazarse a `service_id`
- **Archivos owned:**
  - `src/lib/tenant/identity-store.ts` (UNION removal en `loadServiceModules()`)
  - `src/app/api/integrations/hubspot/services/sync/route.ts` (nuevo endpoint)
  - `src/app/api/cron/services-sync/route.ts` (nuevo cron)
  - `scripts/etl-services-to-bigquery.ts` (nuevo ETL)
