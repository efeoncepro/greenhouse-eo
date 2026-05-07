> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-06 por TASK-813
> **Ultima actualizacion:** 2026-05-06 por TASK-813
> **Documentacion tecnica:** `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`

# Servicios y engagements — modelo comercial Greenhouse

## ¿Qué son los servicios en Greenhouse?

Pensar en un restaurante. Hay **4 capas distintas**:

1. **Menú (catálogo)** — qué SABEMOS hacer y vender. 28 ítems abstractos: Globe, Wave, CRM Solutions, Agencia Creativa, etc. Vive en `service_modules`.
2. **Cuenta de cliente (entitlement)** — qué cliente tiene activado qué módulo. Vive en `client_service_modules`.
3. **Conversación con mozo (deal)** — la negociación comercial abierta. Puede cerrar o irse. Vive en HubSpot, sincronizado a `crm.deals`.
4. **Plato servido en mesa (engagement firmado)** — lo que se firmó y se está entregando. **Vive en HubSpot custom object `p_services` (objectTypeId 0-162) + `core.services` en Greenhouse**. Esa es la pieza que TASK-813 puso en su lugar.

## ¿Quién es dueño de qué?

| Capa | Dueño | Por qué |
|---|---|---|
| Menú | Greenhouse | Decisión nuestra qué ofrecemos |
| Entitlement | Greenhouse | Operacional |
| Deal | HubSpot | Sales tool nativo |
| Engagement firmado | HubSpot lo origina, Greenhouse lo proyecta | Sales lo cierra ahí, nosotros lo ejecutamos |

**Regla de oro**: HubSpot es source of truth para el engagement firmado. Greenhouse refleja lo que HubSpot dice.

## ¿Cómo llegan los services HubSpot a Greenhouse?

3 caminos convergentes (todos terminan en `core.services` con UPSERT idempotente por `hubspot_service_id`):

| Path | Cuándo | Latencia |
|---|---|---|
| **Webhook real-time** | Sales crea/edita un service en HubSpot | < 10s |
| **Cron diario** | Safety net — captura eventos perdidos por webhook | 24h |
| **Backfill manual** | One-shot inicial o recovery operacional | bajo demanda |

## ¿Qué pasa si un service HubSpot tiene datos faltantes?

3 escenarios robustos:

### Service con `ef_linea_de_servicio` NULL (no clasificado)

Greenhouse lo materializa pero con flag `hubspot_sync_status='unmapped'`. Downstream (P&L, ICO, attribution) lo filtra para no contaminar números. Operador HubSpot completa la propiedad y el siguiente sync re-clasifica.

### Service de un cliente que no existe en Greenhouse (huérfano)

El handler marca el webhook event como `failed` con `error_message='organization_unresolved:<id>'`. Aparece en cola admin para que el operador comercial decida:
- Crear el client en Greenhouse
- O archivar el service en HubSpot (era basura)

### Service de un cliente que existe pero no tiene space

Auto-creación de space (con `numeric_code` del próximo libre). El service se materializa correctamente.

## ¿Qué señales monitoreamos?

3 reliability signals en subsystem `Commercial Health` (visibles en `/admin/operations`):

| Signal | Severidad | Steady |
|---|---|---|
| `commercial.service_engagement.sync_lag` | Warning si > 0 | 0 |
| `commercial.service_engagement.organization_unresolved` | Error si > 7 días | 0 |
| `commercial.service_engagement.legacy_residual_reads` | Error si > 0 | 0 |

> **Detalle técnico:** spec arquitectural en `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 + CLAUDE.md sección "HubSpot inbound webhook — p_services". Code paths: `src/lib/services/service-sync.ts`, `src/lib/webhooks/handlers/hubspot-services.ts`, `src/lib/hubspot/list-services-for-company.ts`, `scripts/services/{archive-legacy-seed,backfill-from-hubspot}.ts`.
