# TASK-210 - HubSpot Quotes Bidirectional Integration

## Delta 2026-04-07

- **Complete**: all 9 slices implemented and deployed
- Migration applied: `source_system`, `hubspot_quote_id`, `hubspot_deal_id`, `hubspot_last_synced_at`
- Backfill executed: 15 HubSpot quotes synced across 9 organizations
- Existing Nubox quotes tagged with `source_system = 'nubox'`
- Cloud Run service deployed: `GET /companies/{id}/quotes` + `POST /quotes`
- Cron registered: `hubspot-quotes-sync` every 6 hours in `vercel.json`
- UI: multi-source chips, source filter, create drawer

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `finance`

## Summary

Integracion bidireccional de cotizaciones entre HubSpot CRM y Greenhouse. **Inbound**: sincronizar quotes de HubSpot a `greenhouse_finance.quotes` junto a las de Nubox en la misma tabla unificada. **Outbound**: permitir crear quotes en HubSpot desde Greenhouse, incluyendo asociaciones a deal, company, line items y quote template. El resultado es un pipeline comercial de cotizaciones completo y operable desde un solo lugar.

## Why This Task Exists

Hoy la tabla de cotizaciones solo muestra documentos Nubox (DTE 52 / COT). HubSpot tiene un modulo de quotes activo que la empresa usa, pero esos datos no estan integrados. El resultado es una vista parcial del pipeline comercial: las cotizaciones nacen en HubSpot y solo aparecen en Greenhouse cuando se emiten por Nubox. Eso crea un gap temporal y de visibilidad sobre cotizaciones en estado draft, enviadas o en negociacion que aun no se han formalizado como DTE.

Ademas, hoy no existe forma de crear una cotizacion en HubSpot desde Greenhouse. El flujo obliga a salir del portal, ir a HubSpot, crear la quote manualmente y esperar a que el sync la traiga de vuelta. La integracion bidireccional cierra ese loop.

## Goal

- Cotizaciones de HubSpot visibles en la misma tabla que las de Nubox (inbound)
- Crear cotizaciones en HubSpot desde Greenhouse con asociaciones completas (outbound)
- Columna `source_system` que identifica origen (`nubox`, `hubspot`, `manual`)
- Sync automatico de HubSpot quotes via el middleware Cloud Run existente
- Mapeo bidireccional de estados HubSpot <-> estados Greenhouse normalizados
- Identity resolution: HubSpot company <-> `client_id` / `organization_id` canonico

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- El patron de integracion HubSpot es via middleware Cloud Run (`hubspot-greenhouse-integration`), no SDK directo. Tanto reads como writes de quotes pasan por el middleware.
- Las quotes de HubSpot se insertan con `quote_id = QUO-HS-{hubspot_quote_id}` para coexistir con `QUO-NB-{nubox_sale_id}` sin colision.
- La identity resolution usa `hubspot_company_id` <-> `organization_id` / `client_id` del modelo canonico 360.
- Migracion DDL via `node-pg-migrate` antes de cualquier deploy.
- `source_system` permite filtrar y reportar por origen sin ambiguedad.
- Patron outbound de referencia: `issuNuboxSales()` en `src/lib/nubox/client.ts` + `emitDte()` en `src/lib/nubox/emission.ts`. Misma disciplina: idempotencia, outbox event, log de emision, transaction scope.

## HubSpot Quotes API Reference

La API de HubSpot CRM v3 soporta CRUD completo de quotes:

### Endpoints

| Operacion | Metodo | Endpoint | Notas |
| --- | --- | --- | --- |
| Crear quote | `POST` | `/crm/v3/objects/quotes` | Crea en estado `DRAFT` |
| Leer quote | `GET` | `/crm/v3/objects/quotes/{quoteId}` | Con `properties` y `associations` |
| Listar quotes | `GET` | `/crm/v3/objects/quotes` | Paginado, filtrable |
| Actualizar quote | `PATCH` | `/crm/v3/objects/quotes/{quoteId}` | Solo en `DRAFT`/`PENDING_APPROVAL`/`REJECTED` |
| Buscar quotes | `POST` | `/crm/v3/objects/quotes/search` | Filter groups, sorting |
| Asociar objetos | `PUT` | `/crm/v3/objects/quotes/{id}/associations/{toType}/{toId}/{assocType}` | Line items, deal, template, contacts |

### Propiedades clave

| Propiedad HubSpot | Tipo | Writable | Notas |
| --- | --- | --- | --- |
| `hs_title` | string | Si | **Requerido**. Titulo de la quote |
| `hs_expiration_date` | date | Si | **Requerido**. Formato `YYYY-MM-DD` |
| `hs_status` | enum | Si | Controla lifecycle (ver abajo) |
| `hs_quote_amount` | number | No | **Auto-calculado** desde line items + taxes + discounts |
| `hs_quote_number` | string | No | **Auto-generado** (timestamp-based) |
| `hs_currency` | string | No | Derivado del deal asociado o default de la cuenta |
| `hs_quote_link` | string | No | URL publica de la quote publicada |
| `hs_esign_enabled` | boolean | Si | Habilitar firma electronica |
| `hs_payment_enabled` | boolean | Si | Habilitar cobro online |
| `hs_language` | string | Si | Idioma de la quote |
| `hs_locale` | string | Si | Locale para formato numerico |
| `hs_sender_firstname` | string | Si | Nombre del remitente |
| `hs_sender_lastname` | string | Si | Apellido del remitente |
| `hs_sender_email` | string | Si | Email del remitente |
| `hs_sender_company_name` | string | Si | Empresa del remitente |

### Lifecycle de estados

```
DRAFT → APPROVAL_NOT_NEEDED (publicar sin aprobacion)
DRAFT → PENDING_APPROVAL → APPROVED (publicar con aprobacion)
DRAFT → PENDING_APPROVAL → REJECTED → DRAFT (rechazo, vuelta a edicion)
```

**Regla critica**: para modificar propiedades de una quote publicada, primero se debe revertir `hs_status` a `DRAFT`, `PENDING_APPROVAL` o `REJECTED`.

### Asociaciones requeridas para publicar

| Asociacion | Type ID | Categoria | Requerida? |
| --- | --- | --- | --- |
| Line items | 67 | `HUBSPOT_DEFINED` | Si (para que `hs_quote_amount` se calcule) |
| Quote template | — | `HUBSPOT_DEFINED` | Si (para renderizar la quote) |
| Deal | — | `HUBSPOT_DEFINED` | Recomendado (provee currency y owner) |
| Contact (signer) | — | `HUBSPOT_DEFINED` | Opcional (requerido si e-sign habilitado) |
| Company | — | `HUBSPOT_DEFINED` | Opcional |

### Flujo completo de creacion via API

1. `POST /crm/v3/objects/quotes` — crear quote draft con `hs_title` + `hs_expiration_date`
2. `POST /crm/v3/objects/line_items` — crear cada line item (nombre, cantidad, precio, etc.)
3. `PUT /associations` — asociar line items → quote (type 67)
4. `PUT /associations` — asociar quote → deal (para currency/owner)
5. `PUT /associations` — asociar quote → quote template (para render)
6. `PUT /associations` — asociar quote → contact signers (opcional, para e-sign)
7. `PATCH /crm/v3/objects/quotes/{id}` — cambiar `hs_status` a `APPROVAL_NOT_NEEDED` o `PENDING_APPROVAL`

### Mapeo de estados bidireccional

| HubSpot `hs_status` | Greenhouse `status` | Direccion |
| --- | --- | --- |
| `DRAFT` | `draft` | Inbound + Outbound |
| `PENDING_APPROVAL` | `sent` | Inbound + Outbound |
| `APPROVAL_NOT_NEEDED` | `sent` | Inbound + Outbound |
| `APPROVED` | `accepted` | Inbound |
| `REJECTED` | `rejected` | Inbound |
| `SIGNED` | `accepted` | Inbound |
| `LOST` | `rejected` | Inbound |
| `EXPIRED` | `expired` | Inbound |

Para outbound: Greenhouse solo puede crear en `DRAFT` y transicionar a `PENDING_APPROVAL` o `APPROVAL_NOT_NEEDED`. Los estados terminales (`APPROVED`, `SIGNED`, `LOST`) son gestionados en HubSpot y llegan por inbound sync.

## Dependencies & Impact

### Depends on

- **Cloud Run integration service** (`hubspot-greenhouse-integration`): necesita endpoints de lectura Y escritura de quotes.
- **`greenhouse_finance.quotes`** tabla existente (TASK-163 complete).
- **Identity resolution** HubSpot company <-> `organization_id` (patron ya existente en services sync).
- **Integration health/readiness** (`src/lib/integrations/health.ts`, `readiness.ts`) para gating del sync.
- **Nubox emission pattern** (`src/lib/nubox/emission.ts`): referencia para el patron outbound.

### Impacts to

- **TASK-070** (Cost Intelligence Finance UI): quotes multi-source enriquecen el pipeline financiero visible
- **TASK-154** (Revenue Pipeline Intelligence): HubSpot quotes son input directo del pipeline de revenue
- **TASK-167** (Operational P&L Org Scope): quotes por organization scope
- **TASK-013** (Nubox Finance Reconciliation): la reconciliacion debe distinguir source_system
- **QuotesListView.tsx**: actualizar para multi-source + accion de crear

### Files owned

- `migrations/XXXX_add-hubspot-quotes-columns.sql` (nueva migracion)
- `src/lib/hubspot/sync-hubspot-quotes.ts` (nuevo — inbound sync)
- `src/lib/hubspot/create-hubspot-quote.ts` (nuevo — outbound creation)
- `src/app/api/cron/hubspot-quotes-sync/route.ts` (nuevo)
- `src/app/api/finance/quotes/route.ts` (update: source_system, hubspot fields, POST handler)
- `src/app/api/finance/quotes/hubspot/route.ts` (nuevo — outbound creation endpoint)
- `src/lib/integrations/hubspot-greenhouse-service.ts` (extension: quotes read + write)
- `src/views/greenhouse/finance/QuotesListView.tsx` (update: multi-source UI + create action)

## Current Repo State

### Ya existe

- `greenhouse_finance.quotes` table con columnas Nubox-specific (`nubox_document_id`, `nubox_sii_track_id`, etc.)
- Pipeline Nubox → BigQuery → PostgreSQL quotes (DTE 52 / COT filter en `sync-nubox-to-postgres.ts`)
- HubSpot integration service con endpoints para companies, contacts, services (no quotes, solo read)
- Service sync pattern (`src/lib/services/service-sync.ts`) como referencia de como hacer sync de objetos HubSpot
- Identity resolution via `hubspot_company_id` → `organization_id` ya probada en service sync
- Health/readiness gates para HubSpot integration
- Vista `QuotesListView.tsx` con chip "Nubox" y filtro por estado
- API `GET /api/finance/quotes` leyendo de PostgreSQL
- **Patron outbound Nubox** en `src/lib/nubox/emission.ts`: `emitDte()` con idempotencia, transaction, outbox event, emission log — referencia directa para outbound HubSpot

### Gap actual

- **No hay columna `source_system`** en `greenhouse_finance.quotes` — todo se asume Nubox
- **No hay columnas HubSpot** (`hubspot_quote_id`, `hubspot_deal_id`, `hubspot_last_synced_at`)
- **No hay endpoint de quotes** en el Cloud Run integration service (ni read ni write)
- **No hay sync pipeline** para HubSpot quotes (inbound)
- **No hay creacion outbound** de quotes hacia HubSpot
- **UI hardcodeada** a Nubox como unica fuente (subtitulo, empty state, chip)
- **API response** usa `isFromNubox: Boolean(nubox_document_id)` sin campo `source` generico
- **Cloud Run service es read-only** — no tiene endpoints POST/PUT/PATCH hacia HubSpot

## Scope

### Lane A — Inbound (HubSpot → Greenhouse)

#### Slice 1 - Schema migration (multi-source ready)

- Crear migracion `node-pg-migrate` que agregue:
  - `source_system TEXT DEFAULT 'manual'` (nuevas filas sin source explicito quedan como manual)
  - `hubspot_quote_id TEXT`
  - `hubspot_deal_id TEXT`
  - `hubspot_last_synced_at TIMESTAMPTZ`
  - Index: `idx_quotes_hubspot (hubspot_quote_id)`
  - Index: `idx_quotes_source (source_system)`
- Backfill: `UPDATE greenhouse_finance.quotes SET source_system = 'nubox' WHERE nubox_document_id IS NOT NULL`
- Regenerar tipos: `pnpm db:generate-types`

#### Slice 2 - Cloud Run integration service: quotes read endpoint

- Agregar endpoint al servicio Cloud Run `hubspot-greenhouse-integration`:
  - `GET /companies/{hubspotCompanyId}/quotes` — lista de quotes asociadas a la company
  - `GET /quotes/{quoteId}` — detalle de una quote individual (opcional)
- Response normalizada:

```typescript
interface HubSpotGreenhouseQuoteProfile {
  identity: {
    quoteId: string          // hs_object_id
    title: string | null     // hs_title
    quoteNumber: string | null // hs_quote_number
    hubspotQuoteId: string
  }
  financial: {
    amount: number | null    // hs_quote_amount
    currency: string | null  // hs_currency
    discount: number | null  // hs_discount_percentage
  }
  dates: {
    createDate: string | null
    expirationDate: string | null  // hs_expiration_date
    lastModifiedDate: string | null
  }
  status: {
    approvalStatus: string | null  // hs_status
    signatureStatus: string | null
  }
  associations: {
    dealId: string | null
    companyId: string | null
    contactIds: string[]
    lineItemCount: number
  }
  source: {
    sourceSystem: 'hubspot'
    sourceObjectType: 'quote'
    sourceObjectId: string
  }
}
```

- Nota: este slice se ejecuta en el repo del Cloud Run service, no en greenhouse-eo.

#### Slice 3 - Client en Greenhouse + sync function (inbound)

- Extender `hubspot-greenhouse-service.ts`:
  - `getHubSpotGreenhouseCompanyQuotes(hubspotCompanyId: string)` — consume el nuevo endpoint
  - Type: `HubSpotGreenhouseQuoteProfile` y `HubSpotGreenhouseCompanyQuotesResponse`
- Crear `src/lib/hubspot/sync-hubspot-quotes.ts`:
  - `syncHubSpotQuotesForCompany(hubspotCompanyId, organizationId, clientId)` — fetch + upsert
  - `syncAllHubSpotQuotes()` — iterar orgs con `hubspot_company_id`, sync cada una
  - Upsert logic:
    - Idempotency key: `hubspot_quote_id`
    - Quote ID format: `QUO-HS-{hubspot_quote_id}`
    - Source system: `hubspot`
    - Status mapping segun tabla bidireccional
  - Outbox event: `finance.quote.synced` con `source_system: 'hubspot'`
- Crear ruta cron: `src/app/api/cron/hubspot-quotes-sync/route.ts`
  - Readiness gate: HubSpot integration must be healthy
  - Bearer token auth (mismo patron que `nubox-sync` y `services-sync`)
  - Logging: quotes created, updated, skipped, errored

#### Slice 4 - API response update

- Actualizar `GET /api/finance/quotes`:
  - SELECT adicional: `source_system`, `hubspot_quote_id`, `hubspot_deal_id`
  - Response item: reemplazar `isFromNubox` por `source: string` (`nubox` | `hubspot` | `manual`)
  - Nuevo query param opcional: `source` para filtrar por origen
  - Mantener backward compat: `isFromNubox` como campo derivado temporal si hay consumidores

#### Slice 5 - UI multi-source (inbound)

- Actualizar `QuotesListView.tsx`:
  - Subtitulo: "Cotizaciones sincronizadas desde Nubox y HubSpot"
  - Columna Fuente: chip dinamico segun `source`:
    - `nubox` → `<Chip color="info" label="Nubox" />`
    - `hubspot` → `<Chip color="warning" label="HubSpot" />`
    - `manual` → `<Chip color="secondary" label="Manual" />`
  - Filtro por fuente (select adicional al lado de estado)
  - Empty state actualizado para mencionar ambas fuentes
  - Badge en header card: count por fuente o total

### Lane B — Outbound (Greenhouse → HubSpot)

#### Slice 6 - Cloud Run integration service: quotes write endpoints

- Agregar endpoints de escritura al servicio Cloud Run `hubspot-greenhouse-integration`:

| Endpoint | Metodo | Funcion |
| --- | --- | --- |
| `POST /quotes` | POST | Crear quote draft en HubSpot |
| `PATCH /quotes/{hubspotQuoteId}` | PATCH | Actualizar propiedades de una quote |
| `POST /quotes/{hubspotQuoteId}/line-items` | POST | Crear y asociar line items a la quote |
| `POST /quotes/{hubspotQuoteId}/associations` | POST | Asociar deal, template, contacts |
| `POST /quotes/{hubspotQuoteId}/publish` | POST | Transicionar status a publicada |

- Request de creacion normalizado:

```typescript
interface HubSpotGreenhouseCreateQuoteRequest {
  title: string                    // → hs_title
  expirationDate: string           // → hs_expiration_date (YYYY-MM-DD)
  language?: string                // → hs_language (default: 'es')
  locale?: string                  // → hs_locale (default: 'es-cl')
  sender?: {
    firstName: string              // → hs_sender_firstname
    lastName: string               // → hs_sender_lastname
    email: string                  // → hs_sender_email
    companyName: string            // → hs_sender_company_name
  }
  associations?: {
    dealId?: string                // HubSpot deal ID
    companyId?: string             // HubSpot company ID
    contactIds?: string[]          // HubSpot contact IDs (signers)
    quoteTemplateId?: string       // HubSpot quote template ID
  }
  lineItems?: Array<{
    name: string                   // hs_product_name or name
    quantity: number
    unitPrice: number              // price
    description?: string
    discount?: number              // discount percentage
    taxAmount?: number
  }>
}

interface HubSpotGreenhouseCreateQuoteResponse {
  hubspotQuoteId: string
  quoteNumber: string | null
  status: string
  quoteLink: string | null         // URL publica (solo si publicada)
  associations: {
    dealId: string | null
    lineItemIds: string[]
  }
}
```

- **Nota**: este slice se ejecuta en el repo del Cloud Run service, no en greenhouse-eo.
- **Orquestacion interna del Cloud Run**: el endpoint `POST /quotes` ejecuta los pasos 1-7 del flujo de creacion (crear quote → crear line items → asociar todo → opcionalmente publicar) como una operacion atomica desde la perspectiva de Greenhouse.

#### Slice 7 - Greenhouse outbound: quote creation logic

- Crear `src/lib/hubspot/create-hubspot-quote.ts`:

```typescript
type CreateHubSpotQuoteInput = {
  // Datos de Greenhouse
  quoteId: string                  // ID interno Greenhouse (pre-asignado)
  organizationId: string           // → resolver hubspot_company_id
  title: string
  expirationDate: string
  description?: string
  lineItems: Array<{
    name: string
    quantity: number
    unitPrice: number
    description?: string
  }>
  // Opciones HubSpot
  dealId?: string                  // HubSpot deal (si ya existe)
  publishImmediately?: boolean     // true = APPROVAL_NOT_NEEDED, false = DRAFT
}

type CreateHubSpotQuoteResult = {
  success: boolean
  quoteId: string                  // Greenhouse quote ID
  hubspotQuoteId: string | null    // HubSpot hs_object_id
  hubspotQuoteNumber: string | null
  hubspotQuoteLink: string | null  // URL publica
  error: string | null
}
```

- Flujo:
  1. Resolver `organization_id` → `hubspot_company_id` desde `greenhouse_core.organizations`
  2. Llamar `POST /quotes` al Cloud Run service (endpoint de Slice 6)
  3. Recibir `hubspotQuoteId` del response
  4. Persistir en `greenhouse_finance.quotes`:
     - `quote_id`: pre-asignado por Greenhouse
     - `source_system`: `'hubspot'`
     - `hubspot_quote_id`: del response
     - `hubspot_deal_id`: si se asocio
     - `status`: `'draft'` o `'sent'` segun `publishImmediately`
  5. Publicar outbox event: `finance.quote.created` con `source_system: 'hubspot'`, `direction: 'outbound'`
- Patron de referencia: `emitDte()` en `src/lib/nubox/emission.ts`
  - Misma disciplina: transaction scope, idempotencia, emission log, outbox event
  - Diferencia: Nubox emite un DTE formal (SII), HubSpot crea un objeto CRM comercial

#### Slice 8 - API outbound endpoint

- Crear `POST /api/finance/quotes/hubspot`:
  - Requiere tenant context con permiso de escritura finance
  - Body: `CreateHubSpotQuoteInput`
  - Response: `CreateHubSpotQuoteResult`
  - Validaciones:
    - `organizationId` debe tener `hubspot_company_id` asociado
    - `title` y `expirationDate` son requeridos
    - Al menos un line item
  - Si falla la creacion en HubSpot: no persistir en PostgreSQL (rollback)

#### Slice 9 - UI outbound: crear cotizacion HubSpot

- Agregar boton "Nueva cotizacion HubSpot" en `QuotesListView.tsx`
  - Solo visible si el usuario tiene permiso de escritura finance
  - Abre drawer o dialog con formulario:
    - Organization (select, filtra por orgs con `hubspot_company_id`)
    - Titulo de la cotizacion
    - Fecha de expiracion
    - Line items (tabla editable: nombre, cantidad, precio unitario)
    - Deal asociado (opcional, select de deals de la organization via HubSpot)
    - Toggle: publicar inmediatamente o dejar como draft
  - Submit: `POST /api/finance/quotes/hubspot`
  - Feedback: success con link a la quote en HubSpot, error con detalle
  - Refresh de la tabla despues de crear

## Out of Scope

- **Convertir quote HubSpot a factura Nubox** — es un bridge cross-source DTE que merece su propia task
- **Edicion de quotes HubSpot existentes desde Greenhouse** — primera iteracion es create-only; update es follow-up
- **Aprobacion de quotes dentro de Greenhouse** — el workflow de aprobacion vive en HubSpot
- **Firma electronica desde Greenhouse** — se configura en HubSpot
- **BigQuery raw/conformed layer para HubSpot quotes** — HubSpot quotes va directo a PostgreSQL via integration service (consistente con service sync)
- **Webhook/realtime push** — primera version es pull-based via cron (inbound) y on-demand (outbound)

## Acceptance Criteria

### Lane A — Inbound

- [ ] Migracion aplicada: columnas `source_system`, `hubspot_quote_id`, `hubspot_deal_id`, `hubspot_last_synced_at` existen en `greenhouse_finance.quotes`
- [ ] Backfill ejecutado: quotes existentes con `nubox_document_id` tienen `source_system = 'nubox'`
- [ ] Cloud Run service expone `GET /companies/{id}/quotes` con response normalizada
- [ ] `hubspot-greenhouse-service.ts` tiene metodo `getHubSpotGreenhouseCompanyQuotes()`
- [ ] Sync function inserta quotes HubSpot con `quote_id = QUO-HS-{id}` y `source_system = 'hubspot'`
- [ ] Estados HubSpot mapeados correctamente a estados Greenhouse
- [ ] Identity resolution: `hubspot_company_id` → `organization_id` / `client_id` funciona
- [ ] Cron endpoint `/api/cron/hubspot-quotes-sync` ejecuta sync con readiness gate
- [ ] API `GET /api/finance/quotes` devuelve campo `source` y acepta filtro `?source=hubspot`
- [ ] Vista muestra chip de fuente correcto para cada quote
- [ ] Filtro por fuente funcional en la vista

### Lane B — Outbound

- [ ] Cloud Run service expone `POST /quotes` que crea quote + line items + asociaciones en HubSpot
- [ ] `hubspot-greenhouse-service.ts` tiene metodo `createHubSpotGreenhouseQuote()`
- [ ] `create-hubspot-quote.ts` orquesta creacion: resolver org → call Cloud Run → persist local → outbox
- [ ] `POST /api/finance/quotes/hubspot` crea quote en HubSpot y la persiste en PostgreSQL
- [ ] Quote creada aparece en HubSpot con title, line items, deal association
- [ ] Quote creada aparece inmediatamente en la vista de Greenhouse con `source = 'hubspot'`
- [ ] UI tiene formulario de creacion con validacion de campos requeridos
- [ ] Si la creacion falla en HubSpot, no queda registro huerfano en PostgreSQL

### Cross-cutting

- [ ] `pnpm build` sin errores
- [ ] `pnpm lint` sin errores
- [ ] `pnpm test` sin regresiones

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm migrate:status` confirma migracion aplicada
- Preview deploy: vista de cotizaciones muestra quotes de ambas fuentes
- Cron manual: `POST /api/cron/hubspot-quotes-sync` con bearer token devuelve summary
- API: `GET /api/finance/quotes?source=hubspot` filtra correctamente
- API: `POST /api/finance/quotes/hubspot` crea quote en HubSpot y devuelve resultado
- HubSpot: la quote creada aparece en el CRM con asociaciones correctas
- Greenhouse: la quote creada aparece en la tabla con chip "HubSpot"

## Open Questions

- Que estados de quote usa HubSpot en el portal de Efeonce? Hay custom properties? Validar mapeo real vs documentado.
- Se necesita un trigger manual de sync ademas del cron? (e.g. boton en admin)
- Frecuencia del cron: igual que services-sync o independiente?
- Hay quotes HubSpot que ya se emitieron por Nubox? Necesitamos dedup cross-source?
- Que quote template(s) estan configurados en HubSpot? Se necesita un default para el outbound?
- Que deal pipeline y stages usa Efeonce? El outbound necesita saber cual deal asociar.
- Quien tiene permisos para crear quotes? Solo admins o tambien account managers?

## Rollout Notes

- **Lane A (inbound) es independiente de Lane B (outbound)**: se pueden deployar por separado.
- Recomendacion: deployar Lane A primero (slices 1-5), validar que el sync funciona, y luego iterar Lane B (slices 6-9).
- Lane B requiere que el Cloud Run service soporte write operations (slice 6), lo cual es un cambio arquitectural significativo — el servicio actualmente es read-only.
- Para Lane B, considerar una fase alpha donde el boton de crear solo este visible para admins antes de abrirlo a account managers.

## Follow-ups

- **Quote update bidireccional**: editar quotes existentes desde Greenhouse y sincronizar cambios
- **Quote → Invoice bridge**: convertir quote HubSpot aceptada en factura Nubox (DTE 33/34)
- **Line items sync (inbound)**: traer detalle de productos/servicios de quotes existentes
- **Quote analytics**: pipeline funnel (draft → sent → accepted → invoiced) multi-source
- **Webhook realtime**: HubSpot quote lifecycle events via webhook push en vez de polling
- **Quote PDF**: generar o descargar PDF de la quote desde HubSpot (via `hs_quote_link`)
- **Quote duplication**: duplicar una quote Nubox como quote HubSpot o viceversa
