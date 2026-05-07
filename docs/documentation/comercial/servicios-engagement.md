> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 2.0
> **Creado:** 2026-05-06 por TASK-813
> **Ultima actualizacion:** 2026-05-07 por TASK-813 (cierre + alto detalle post-merge)
> **Documentacion tecnica:** `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` + `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`

# Servicios y engagements — modelo comercial Greenhouse

## ¿Qué resuelve este documento?

Antes de TASK-813 había confusión persistente sobre qué es un "servicio" en Greenhouse: ¿es lo que vendemos? ¿lo que tenemos contratado? ¿lo que está en HubSpot? ¿lo que entregamos? La confusión venía de mezclar 4 capas distintas en una sola tabla, y de tener 30 filas seedeadas en marzo 2026 que no representaban nada real. Este documento explica el modelo canónico actualizado, cómo HubSpot y Greenhouse se sincronizan, y qué señales monitoreamos para detectar drift.

Si ya entendés el modelo y solo querés operar el sync (registrar un servicio, archivar uno viejo, diagnosticar un huérfano), saltá directo al manual de uso: `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md`.

---

## El modelo de las 4 capas — analogía del restaurante

Pensar en un restaurante. Hay **4 capas distintas** que tienden a mezclarse pero son cosas diferentes:

### Capa 1 — Menú (catálogo)

**Qué SABEMOS hacer y vender.** 28 ítems abstractos: Globe, Wave, CRM Solutions, Agencia Creativa, Procurement, etc. No tiene cliente, no tiene precio, no tiene fecha.

| Atributo | Ejemplo |
|---|---|
| Vive en | `greenhouse_core.service_modules` |
| Dueño | Greenhouse (decisión nuestra) |
| Cardinalidad | ~28 ítems globales |
| Cuándo se actualiza | Cuando Efeonce decide ofrecer un servicio nuevo |

### Capa 2 — Cuenta de cliente (entitlement)

**Qué cliente tiene activado qué módulo.** "Sky Airline tiene activado Globe + Wave". Es el bridge entre menú y cliente, sin negociación todavía.

| Atributo | Ejemplo |
|---|---|
| Vive en | `greenhouse_core.client_service_modules` |
| Dueño | Greenhouse (operacional) |
| Cardinalidad | ~50-200 filas (clientes × módulos activos) |
| Cuándo se actualiza | Cuando se firma un engagement nuevo |

### Capa 3 — Conversación con mozo (deal)

**La negociación comercial abierta.** "Estamos hablando con Aguas Andinas para incorporar Wave en Q3 2026, valor estimado $X CLP". Puede cerrar (ganada o perdida) o quedarse abierta.

| Atributo | Ejemplo |
|---|---|
| Vive en | HubSpot (objeto `deals`), sincronizado a `greenhouse_crm.deals` |
| Dueño | HubSpot (sales tool nativo) |
| Cardinalidad | Decenas de deals abiertos en cualquier momento |
| Cuándo se actualiza | Continuamente por sales |

### Capa 4 — Plato servido en mesa (engagement firmado)

**Lo que se firmó y se está entregando.** "ANAM Service Hubs — engagement activo desde 2025-09-01, líneas: Service Hubs Inbound + Service Hubs Outbound". Esto es lo que TASK-813 puso en su lugar.

| Atributo | Ejemplo |
|---|---|
| Vive en | HubSpot custom object `p_services` (objectTypeId 0-162) + proyectado a `greenhouse_core.services` |
| Dueño | HubSpot lo origina, Greenhouse lo proyecta |
| Cardinalidad | ~16 services activos hoy (octubre 2025 + abril 2026) |
| Cuándo se actualiza | Cuando sales firma un engagement (real-time vía webhook) |

---

## Regla de oro de source of truth

```text
HubSpot p_services  →  Greenhouse core.services
   (writer)               (reader proyectado)
```

**HubSpot es source of truth para el engagement firmado.** Greenhouse refleja lo que HubSpot dice. Cualquier cambio de un service nace en HubSpot y se proyecta a Greenhouse vía webhook + cron + backfill (3 paths convergentes idempotentes).

**Greenhouse NUNCA escribe a HubSpot p_services.** El único path Greenhouse → HubSpot autorizado (en una versión futura V1.1) es el back-fill de propiedades `ef_*` derivadas (ej. `ef_member_loaded_cost_estimate`) — y solo cuando exista justificación clara y review de governance.

---

## Cómo llegan los services HubSpot a Greenhouse — 3 caminos

| Path | Cuándo dispara | Latencia | Rol |
|---|---|---|---|
| **Webhook real-time** | Sales crea/edita un service en HubSpot | < 10s | Path por defecto en producción. Captura el 99% de cambios. |
| **Cron diario (Cloud Scheduler)** | `0 6 * * * America/Santiago` | ~24h | Safety net. Captura events que el webhook perdió (HubSpot retries exhausted, deploy gap, bug downstream). |
| **Backfill manual one-shot** | Operador ejecuta `pnpm tsx scripts/services/backfill-from-hubspot.ts --apply` | bajo demanda | Setup inicial o recovery operacional cuando emerge un caso histórico. |

Los 3 paths convergen en el mismo helper canónico `upsertServiceFromHubSpot` (`src/lib/services/upsert-service-from-hubspot.ts`) que hace UPSERT idempotente por `hubspot_service_id`. Si los 3 paths convergen al mismo service en el mismo segundo, no hay duplicados ni race conditions — es la misma fila resuelta por la misma key natural.

---

## Cómo se ven los datos hoy (estado live post-merge 2026-05-07)

| Estado | Cantidad | Significado |
|---|---|---|
| `synced` | ~13 services | OK, datos completos de HubSpot, attribution downstream consume |
| `unmapped` | ~3 services | `ef_linea_de_servicio` NULL en HubSpot — operador completa propiedad y siguiente sync re-clasifica |
| `legacy_seed_archived` | 30 filas | Seed pre-TASK-813 del 2026-03-16, archivadas con audit trail (active=FALSE) |
| `pending` | 0 | No hay residuales — todos clasificados |

Para verlo en vivo:

```sql
SELECT hubspot_sync_status, COUNT(*)
FROM greenhouse_core.services
GROUP BY hubspot_sync_status
ORDER BY 2 DESC;
```

---

## El modelo Aguas-Andinas-paga-por-ANAM (cross-billing semántico)

**Caso real del onboarding inicial**: "ANAM Service Hubs" en HubSpot tiene company association = `Aguas Andinas`, NO ANAM. Esto es correcto y deliberado:

- **Aguas Andinas** es el holding que paga las licencias HubSpot del cluster ANAM.
- **ANAM** es la filial operativa que recibe el servicio.
- Para attribution P&L, lo que importa es **quién paga** (Aguas Andinas), porque ahí va el revenue.
- Si ANAM directamente firmara un nuevo engagement (ej. "ANAM Nuevas Licencias"), ese sí va asociado a la company ANAM directamente.

**Cómo lo refleja Greenhouse**: el webhook resuelve la company association al sync time. El space en Greenhouse queda vinculado a Aguas Andinas (el holding pagador), y la línea de servicio queda con el nombre "ANAM Service Hubs" para que el operador entienda quién recibe el servicio. El P&L cae en el space del pagador. Cero ambigüedad downstream.

**Implicancia operativa**: si emerge un caso similar (otro holding con filiales que reciben sus servicios), no hay que crear un client paralelo en Greenhouse — basta con asegurar que la company association en HubSpot apunte al pagador correcto. El sync hace lo correcto automáticamente.

---

## Qué pasa si un service HubSpot tiene datos faltantes — 3 escenarios robustos

### Escenario 1 — Service con `ef_linea_de_servicio` NULL (no clasificado)

**Qué pasa**: Greenhouse lo materializa con `hubspot_sync_status='unmapped'`. La fila existe, tiene su `hubspot_service_id`, su `hubspot_company_id`, su `space_id`, pero el campo `service_module_id` queda NULL porque no sabemos qué módulo del menú es.

**Por qué importa**: downstream (P&L attribution, ICO scorecard, dashboards comerciales) filtra por `hubspot_sync_status='synced'` para no contaminar números con datos sin clasificar. Eso es **degradación honesta** — el service existe, pero no contribuye a métricas hasta que esté completo.

**Cómo se resuelve**: operador HubSpot completa la propiedad `ef_linea_de_servicio` con uno de los valores canónicos (`globe`, `wave`, `crm_solutions`, etc.). El siguiente webhook event (`p_services.propertyChange`) re-clasifica automáticamente y flip-ea el status a `synced`.

### Escenario 2 — Service de un cliente que no existe en Greenhouse (huérfano)

**Qué pasa**: el handler resuelve la company association → no encuentra match en `core.clients` ni en `crm.companies`. Marca el webhook event como `failed` con `error_message='organization_unresolved:<hubspot_company_id>'`. Aparece en cola admin como reliability signal `commercial.service_engagement.organization_unresolved`.

**Por qué importa**: services sin client owner son ambigüedades — no podemos crear el space porque no sabemos a quién pertenece. Crear un client placeholder a ciegas es worse que dejarlo como TODO operacional.

**Cómo se resuelve**: operador comercial revisa el caso y decide:
1. **Crear el client real** en Greenhouse (via Admin Tenants UI) → siguiente sync materializa el service.
2. **Archivar el service en HubSpot** si era basura/test → el webhook recibe el delete event y limpia la cola.

Endpoint admin para listar pendientes: `GET /api/admin/integrations/hubspot/orphan-services`.

### Escenario 3 — Service de un cliente que existe pero no tiene space

**Qué pasa**: el handler encuentra el client → busca el space en `core.spaces` → no existe → **auto-crea el space** con `numeric_code` del próximo libre (race-safe vía `pg_advisory_xact_lock(8131_0001)`). Luego materializa el service en ese space.

**Por qué importa**: un client puede existir como entidad CRM pero no haber sido formalmente operacionalizado todavía (sin members, sin assignments). El service incoming forza la creación del scaffolding mínimo.

**Cómo se resuelve**: automático. Cero acción operacional. Audit log en outbox event `space.auto_created` v1 documenta que el space nació por el sync de un service.

---

## Las 3 señales que monitoreamos (reliability signals)

Visibles en `/admin/operations` bajo subsystem `Commercial Health`:

### 1. `commercial.service_engagement.sync_lag`

**Pregunta**: ¿Está el sync corriendo a tiempo?

| Severidad | Condición |
|---|---|
| `ok` | Last successful sync < 24h ago |
| `warning` | Last successful sync entre 24h y 48h |
| `error` | Last successful sync > 48h |
| Steady state | `ok` |

**Si dispara warning/error**: webhook caído O cron Cloud Scheduler caído O secret rotado sin redeploy. Runbook en el manual de uso.

### 2. `commercial.service_engagement.organization_unresolved`

**Pregunta**: ¿Hay services huérfanos esperando decisión operativa?

| Severidad | Condición |
|---|---|
| `ok` | 0 huérfanos OR todos < 24h (gracia para que sales arregle) |
| `warning` | Algún huérfano entre 24h y 7 días |
| `error` | Algún huérfano > 7 días |
| Steady state | 0 huérfanos |

**Si dispara warning/error**: alguien en sales/ops tiene que actuar. Ver Escenario 2 arriba.

### 3. `commercial.service_engagement.legacy_residual_reads`

**Pregunta**: ¿Algún consumer downstream está leyendo las 30 filas seedeadas legacy?

| Severidad | Condición |
|---|---|
| `ok` | 0 reads de filas con `status='legacy_seed_archived'` |
| `error` | > 0 reads |
| Steady state | 0 |

**Si dispara error**: hay un consumer que no respeta el filtro `status != 'legacy_seed_archived'`. Es bug de regression. Hay que rastrear el query y arreglarlo.

---

## ¿Cómo encaja TASK-813 con el resto del pipeline comercial?

```text
        ┌──────────────────────────────────────────────────────────┐
        │  HubSpot CRM (source of truth de relaciones comerciales) │
        │                                                          │
        │  Companies   Contacts   Deals   p_services (TASK-813)    │
        └────┬───────────┬─────────┬───────────┬────────────────────┘
             │           │         │           │
             ▼           ▼         ▼           ▼
   ┌──────────────────────────────────────────────────────┐
   │  Greenhouse webhooks (real-time, < 10s)              │
   │                                                      │
   │  hubspot-companies      hubspot-services (TASK-813)  │
   │  (TASK-706)             ↓ outbox event v1            │
   │                         ↓ reactive consumer          │
   │                         ↓ canonical UPSERT helper    │
   └──────────────────────────────────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────────────────────────┐
   │  Greenhouse PostgreSQL (proyección OLTP)             │
   │                                                      │
   │  core.clients       core.spaces                      │
   │  core.services ◀── TASK-813 cierra este loop         │
   │  client_service_modules                              │
   └──────────────────────────────────────────────────────┘
             │
             ▼
   ┌──────────────────────────────────────────────────────┐
   │  Downstream consumers                                │
   │                                                      │
   │  - Member Loaded Cost Model (TASK-710-713)           │
   │  - Cost Attribution (TASK-708/709)                   │
   │  - ICO Engine (TASK-178)                             │
   │  - Dashboards comerciales (Pulse, MRR/ARR)           │
   │  - P&L Engine (Finance)                              │
   └──────────────────────────────────────────────────────┘
```

TASK-813 cerró la última pieza faltante en este pipeline: el engagement firmado real-time, no más manual y no más solo via deals (que son negociación, no compromiso).

---

## Glossary — términos que aparecen en el portal

| Término | Significado |
|---|---|
| `p_services` | Custom object HubSpot, objectTypeId `0-162`. Engagement firmado. |
| `service_module` | Ítem del menú (Globe, Wave, etc.). |
| `engagement` | Sinónimo de "service firmado activo en producción". |
| `hubspot_service_id` | PK natural del p_services en HubSpot. |
| `space` | Workspace operacional de un cliente (donde viven members, assignments). |
| `client` | Tenant comercial de Greenhouse. Puede tener múltiples spaces. |
| `numeric_code` | Identificador 2-digit zero-padded del space (`00-99`). Usado en account number rendering (TASK-700). |
| `unmapped` | Service materializado pero sin línea de servicio asignada. |
| `legacy_seed_archived` | Filas pre-TASK-813 archivadas con audit trail. |
| `organization_unresolved` | Service huérfano sin client owner. |

---

## ¿Qué viene después? (followups documentados)

- **TASK-807**: introducir domain `commercial` en el ops-worker (hoy temporal en `finance`). Permitirá un cron Cloud Scheduler dedicado al pipeline comercial sin acoplamiento con finance.
- **V1.1 — back-fill de propiedades `ef_*`**: Greenhouse podría escribir `ef_member_loaded_cost_estimate` u otras métricas computadas a HubSpot. Requiere governance review (ya no es solo reader).
- **Member Loaded Cost integration (TASK-713)**: cuando esté production-ready, los services Greenhouse alimentarán el cálculo de costo cargado per-member-per-client-per-period. Ya está la pieza de attribution lista.

---

> **Detalle técnico:**
> - Spec arquitectural completa: `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (515 líneas, 18 secciones).
> - Spec del modelo comercial 4-capas: `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`.
> - Hard rules anti-regresión: CLAUDE.md sección "HubSpot inbound webhook — p_services (0-162)".
> - Code paths principales:
>   - Helper canónico: `src/lib/services/upsert-service-from-hubspot.ts`
>   - Webhook handler: `src/lib/webhooks/handlers/hubspot-services.ts`
>   - Reactive projection: `src/lib/sync/projections/hubspot-services-intake.ts`
>   - Backfill script: `scripts/services/backfill-from-hubspot.ts`
>   - Archive script: `scripts/services/archive-legacy-seed.ts`
>   - HubSpot direct API helper: `src/lib/hubspot/list-services-for-company.ts`
>   - Reliability readers: `src/lib/reliability/queries/services-*.ts`
>   - Cloud Scheduler cron: `services/ops-worker/server.ts:handleHubspotServicesSync`
>   - Race-safe space allocator: `src/lib/services/allocate-space-numeric-code.ts`
> - Outbox events v1: `commercial.service_engagement.intake_requested`, `commercial.service_engagement.materialized`, `commercial.service_engagement.archived_legacy_seed`, `space.auto_created`.
