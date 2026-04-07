# Cotizaciones multi-source — Nubox y HubSpot

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-07 por Claude (TASK-210)
> **Ultima actualizacion:** 2026-04-07 por Claude (TASK-210)
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)

## Que es

El modulo de cotizaciones consolida las propuestas comerciales de dos fuentes — Nubox (DTE 52) y HubSpot CRM — en una sola tabla. Esto permite ver todo el pipeline de cotizaciones en un solo lugar, sin importar donde se originaron. Ademas, permite crear cotizaciones nuevas en HubSpot directamente desde Greenhouse.

## Superficies del portal

| Vista | Usuarios | Que muestra |
|-------|----------|-------------|
| Finanzas > Cotizaciones | Finance managers, admins | Tabla con todas las cotizaciones, filtros por estado y fuente, boton para crear |
| API `GET /api/finance/quotes` | Consumidores internos | Lista de cotizaciones con campo `source` y filtro `?source=` |
| API `POST /api/finance/quotes/hubspot` | Finance managers, admins | Crear cotizacion en HubSpot desde Greenhouse |

## Fuentes de datos

| Fuente | Identificador | Como llegan | Frecuencia |
|--------|--------------|-------------|------------|
| **Nubox** | `QUO-NB-{nubox_sale_id}` | Sync BigQuery → PostgreSQL (cron `nubox-sync`) | Diario (7:30 AM) |
| **HubSpot** | `QUO-HS-{hubspot_quote_id}` | Cloud Run integration service → PostgreSQL (cron `hubspot-quotes-sync`) | Cada 6 horas |
| **Manual** | ID generado por Greenhouse | Creacion directa (sin source externo) | On-demand |

La columna `source_system` en la base de datos identifica el origen de cada cotizacion: `nubox`, `hubspot`, o `manual`.

## Mapeo de estados

Las cotizaciones de HubSpot usan un sistema de estados distinto. Greenhouse los normaliza a un set comun:

| Estado HubSpot | Estado Greenhouse | Significado |
|----------------|-------------------|-------------|
| `DRAFT` | Borrador | Cotizacion en edicion |
| `PENDING_APPROVAL` | Enviada | Esperando aprobacion interna |
| `APPROVAL_NOT_NEEDED` | Enviada | Publicada sin aprobacion |
| `APPROVED` | Aceptada | Aprobada internamente |
| `REJECTED` | Rechazada | Rechazada internamente |
| `SIGNED` | Aceptada | Firmada por el cliente |
| `LOST` | Rechazada | Perdida |
| `EXPIRED` | Vencida | Paso la fecha de expiracion |

## Columnas de la vista

| Columna | Descripcion |
|---------|-------------|
| N° | Numero de cotizacion (folio Nubox o numero HubSpot) |
| Cliente | Nombre del cliente asociado |
| Fecha | Fecha de emision o creacion |
| Vencimiento | Fecha de expiracion |
| Monto | Total en CLP |
| Estado | Chip de color segun el estado normalizado |
| Fuente | Chip que indica Nubox (azul), HubSpot (naranja), o Manual (gris) |

## Filtros disponibles

- **Estado**: todos, borradores, enviadas, aceptadas, rechazadas, vencidas, facturadas
- **Fuente**: todas, Nubox, HubSpot, manual

## Crear cotizacion en HubSpot

Desde la vista de cotizaciones, el boton "Nueva cotizacion HubSpot" abre un formulario lateral con:

| Campo | Requerido | Descripcion |
|-------|-----------|-------------|
| ID de organizacion | Si | Organizacion de Greenhouse (debe tener HubSpot company vinculada) |
| Titulo | Si | Nombre descriptivo de la cotizacion |
| Fecha de vencimiento | Si | Hasta cuando es valida la cotizacion |
| Items | Si (min 1) | Nombre, cantidad y precio unitario por item |
| Publicar inmediatamente | No | Si se marca, la cotizacion se publica sin aprobacion |

Al crear:
1. Greenhouse llama al servicio Cloud Run que crea la quote en HubSpot
2. HubSpot genera el numero de cotizacion automaticamente
3. Greenhouse guarda la cotizacion localmente con `source_system = 'hubspot'`
4. La cotizacion aparece inmediatamente en la tabla

## Identity resolution

La vinculacion entre HubSpot y Greenhouse se hace via `hubspot_company_id`:

```
Organization (greenhouse_core.organizations)
  └── hubspot_company_id → HubSpot Company
        └── Quotes asociadas a esa company
```

Solo las organizaciones con `hubspot_company_id` configurado pueden sincronizar o crear cotizaciones de HubSpot.

## Sincronizacion automatica

El cron `hubspot-quotes-sync` se ejecuta cada 6 horas:

1. Consulta todas las organizaciones con `hubspot_company_id`
2. Para cada una, pide las quotes al servicio Cloud Run
3. Inserta o actualiza cada quote en PostgreSQL (idempotente por `quote_id`)
4. Publica un evento `finance.quote.synced` en el outbox

El cron tiene un **readiness gate**: si la integracion HubSpot esta marcada como `down` o `blocked` en el registro de integraciones, el sync se salta con un log.

## Eventos del outbox

| Evento | Cuando se emite | Payload clave |
|--------|----------------|---------------|
| `finance.quote.synced` | Al sincronizar una quote desde HubSpot | `quoteId`, `hubspotQuoteId`, `sourceSystem`, `action` |
| `finance.quote.created` | Al crear una quote outbound hacia HubSpot | `quoteId`, `hubspotQuoteId`, `direction: 'outbound'` |

> Detalle tecnico: ver [GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md) y [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
