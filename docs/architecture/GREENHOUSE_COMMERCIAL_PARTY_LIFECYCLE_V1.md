# Greenhouse EO — Commercial Party Lifecycle Architecture V1

> **Version:** 1.0
> **Created:** 2026-04-20 por Claude (Opus 4.7)
> **Audience:** Backend engineers, product owners, agentes que implementen features de pre-venta, quote builder, HubSpot sync o revenue pipeline
> **Related:** `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`, `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`, `GREENHOUSE_EVENT_CATALOG_V1.md`, `GREENHOUSE_IDENTITY_ACCESS_V2.md`, `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
> **Supersedes:** ninguno (spec nuevo)

---

## 1. Resumen ejecutivo

Greenhouse hoy trata al `Cliente` como un estado terminal — una empresa es cliente **después** de un closed-won o cuando es proveedor. Esto rompe la pre-venta: no se puede cotizar contra una empresa que todavía no ganamos, y el builder de cotizaciones exige un `organization_id` que solo existe para clientes consolidados o proveedores. El operador comercial termina saltando a HubSpot para crear deal + company y volver a Greenhouse, reintroduciendo dual-write y drift.

Este spec formaliza el **Commercial Party Lifecycle**: una sola identidad comercial (`organization_id` + `client_id` como anclas existentes) con **estados explícitos** que cubren todo el funnel —`prospect → opportunity → active_client → inactive → churned`— sincronizada bi-direccionalmente con HubSpot desde que la empresa aparece como `Company` en CRM, no desde el closed-won. Sobre ese modelo se habilitan tres capacidades operativas:

1. **Selector unificado** en el Quote Builder que incluye prospects de HubSpot sin esperar clientización.
2. **Comando de creación de Deal desde Greenhouse** como parte del flujo de cotización (sin context-switch a HubSpot).
3. **Coreografía quote-to-cash atómica** que promueve party + deal + contract + income en una sola transacción canónica cuando la cotización se convierte.

Es una evolución del modelo canónico 360, no una reescritura — `organization_id` sigue siendo el anchor y `client_id` la extensión financiera; lo nuevo es el **contrato de lifecycle** sobre ambos, y los comandos/eventos que lo gobiernan.

---

## 2. Problema que este spec resuelve

### 2.1 Síntoma reportado (operación, 2026-04-20)

- Al crear una cotización, el selector "Organización (cliente o prospecto)" solo devuelve organizaciones que **ya existen** en `greenhouse_core.organizations`.
- Las organizations hoy se crean solo cuando: (a) llega un closed-won desde HubSpot y genera `client_id`; (b) se registra un proveedor; (c) se provisiona manualmente desde Admin.
- Consecuencia: para cotizar a una empresa nueva el operador debe (1) ir a HubSpot, (2) crear Company, (3) crear Deal, (4) esperar al sync de Greenhouse, (5) volver al Quote Builder. Minutos de context-switch por cada quote de pre-venta.
- La cotización misma exige un `hubspot_deal_id` válido; si el deal no existe, no hay shortcut inline para crearlo.

### 2.2 Causa raíz arquitectónica

El modelo canónico 360 actual (`GREENHOUSE_360_OBJECT_MODEL_V1.md`) trata `Cliente` como una entidad que nace al final del funnel. Eso es correcto para la definición contable-financiera de cliente (alguien que factura), pero **bloquea la semántica comercial** (alguien a quien podemos venderle). El gap es de vocabulario: hoy no existe un estado canónico para "empresa que está en el funnel pero todavía no es cliente". HubSpot sí lo tiene (`lifecyclestage=lead|mql|sql|opportunity|customer`), pero Greenhouse no consume esa columna en su backbone canónico.

El sync de companies desde HubSpot ya hidrata `hubspot_company_id` en `clients`, pero el gate de creación está condicionado a señales finales (won, provider), no a la mera presencia de la company como candidato.

### 2.3 Impacto de no resolverlo

- **Fricción operativa** medida en minutos por cotización × N cotizaciones/semana.
- **Dual-write invisible**: operadores crean la misma empresa en HubSpot y en Greenhouse, con typos distintos, y el sync posterior genera duplicados que el equipo resuelve a mano.
- **Revenue pipeline incompleto**: el dashboard `Pipeline comercial` (TASK-457) no ve deals de empresas que aún no tienen organization, subestimando forecast.
- **Reporting ciego a prospects**: Admin Center no puede mostrar MRR potencial ni velocity de conversión porque el prospect no existe como fila.
- **Bloqueador de Kortex**: la plataforma paralela de CRM para clientes externos depende de este modelo para funcionar — hoy está blocked.

---

## 3. Scope y no-goals

### 3.1 In scope

- Definir el contrato canónico de **lifecycle stage** sobre `organizations` + `clients`.
- Permitir la creación de `organization_id` desde HubSpot Company **sin** requerir closed-won ni status de provider.
- Extender el sync HubSpot → Greenhouse para incluir prospects.
- Habilitar sync Greenhouse → HubSpot bi-direccional de lifecycle transitions (no del dataset completo).
- Nuevo comando canónico `commercial.party.promote` (transiciones de estado) con auditoría.
- Nuevo comando canónico `commercial.deal.create` (outbound creation desde Quote Builder).
- Extender el selector del Quote Builder para incluir prospects y exponer CTA "Crear deal nuevo" inline.
- Definir la coreografía quote-to-cash atómica: cuando una cotización pasa a `converted`, automatizar la promoción del party y el deal asociado.
- Nuevos eventos de outbox + proyecciones reactivas para estos flujos.

### 3.2 Non-goals

- **No** se introduce una tabla nueva `commercial_parties` paralela a `organizations`/`clients`. Se extiende el modelo existente con un nuevo campo `lifecycle_stage` y contratos de semántica.
- **No** se migra el dominio finance del `client_id` como anchor. Finance sigue asumiendo `client_id` para income/contracts/MRR; solo cambia quién **puede originar** un `client_id` y en qué estado vive antes de facturar.
- **No** se redefine el modelo de Person/Contact (ya resuelto en `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` y TASK-486). El spec asume que `contact_identity_profile_id` sigue siendo el anchor del contacto del cliente.
- **No** se construye un CRM competidor a HubSpot. Greenhouse consume señal comercial de HubSpot para habilitar cotización y revenue attribution; la operación comercial sigue en HubSpot.
- **No** se aborda el caso B2C (personas naturales como clientes finales) — queda explícitamente fuera. Este spec cubre B2B (empresa como party comercial).
- **No** cubre flujos de renovación automática ni expansión dentro de contratos existentes — son gobernados por TASK-462 (MRR/ARR) y su spec de NRR.

---

## 4. Modelo conceptual

### 4.1 Definición canónica de `Commercial Party`

Un **Commercial Party** es una empresa con la que Greenhouse **puede o podría** tener relación comercial. No es una tabla nueva; es una **vista conceptual** sobre las dos anclas canónicas existentes:

```
greenhouse_core.organizations  ← contenedor operativo (tenant, space, members)
greenhouse_core.clients        ← extensión financiera (facturación, income, contratos)
```

La unión entre ambas está definida por `organizations.client_id` (nullable). El Party existe desde el momento en que existe la organization; `client_id` se materializa cuando la party alcanza el estado `active_client` y necesita artefactos financieros.

### 4.2 Lifecycle states canónicos

| Estado | Semántica | Origen típico | Puede cotizar | Puede facturar |
|---|---|---|---|---|
| `prospect` | Empresa detectada como lead/MQL/SQL en HubSpot o ingresada manualmente desde Greenhouse. Sin deal ganado todavía. | HubSpot company `lifecyclestage ∈ {lead, marketingqualifiedlead, salesqualifiedlead}` | ✅ sí | ❌ no |
| `opportunity` | Tiene al menos un HubSpot deal en pipeline abierto (no closed). Es objetivo activo. | HubSpot company con deal abierto, o promoción desde `prospect` al asociar deal | ✅ sí | ❌ no |
| `active_client` | Al menos un deal closed-won o al menos un contrato activo. Tiene `client_id`. | Promoción automática desde `opportunity` al ganar deal, o bootstrap manual. | ✅ sí | ✅ sí |
| `inactive` | Fue `active_client` pero no tiene contratos activos ni facturación en los últimos N meses (default: 6). | Detección automática por sweep. | ✅ sí (recotizar) | ❌ no (pausa) |
| `churned` | Fue `active_client` y se marca como fin de relación (explícito o por lost-all-deals + inactividad > N meses). | Explícito desde HubSpot (`lifecyclestage=other`) o sweep automático. | ⚠️ con override | ❌ no |
| `provider_only` | Es proveedor y **no** es target comercial (no se le vende). | Bootstrap manual o sync desde proveedores. | ❌ no | ❌ no (AP separado) |
| `disqualified` | Descartada del funnel (fuera de mercado, blacklist, conflicto). | Explícito operador o HubSpot lost reason. | ❌ no | ❌ no |

**Invariantes del lifecycle:**

1. Toda Party empieza en `prospect` o `provider_only` (mutuamente excluyentes como origen).
2. `prospect → opportunity` ocurre cuando aparece el primer HubSpot deal abierto asociado.
3. `opportunity → active_client` ocurre en el momento de closed-won del primer deal (o al firmarse contrato).
4. `active_client → inactive` es automático por sweep cron (default 6 meses sin contrato activo + sin quote emitida).
5. `inactive → active_client` ocurre si se emite nueva cotización que se convierte.
6. `churned` requiere acción explícita o sweep (default 12 meses sin actividad + deal perdido más reciente).
7. `provider_only` nunca cruza al funnel comercial — si la empresa pasa a vender Y comprar, se crea un registro dual con la misma FK `hubspot_company_id` pero marcando `is_dual_role=true` en ambos.
8. `disqualified` es terminal salvo override explícito con razón y actor.

### 4.3 Modelo de datos (extensión, no reemplazo)

```sql
-- greenhouse_core.organizations (EXTENSIÓN)
ALTER TABLE greenhouse_core.organizations
  ADD COLUMN lifecycle_stage TEXT NOT NULL DEFAULT 'prospect'
    CHECK (lifecycle_stage IN (
      'prospect', 'opportunity', 'active_client',
      'inactive', 'churned', 'provider_only', 'disqualified'
    )),
  ADD COLUMN lifecycle_stage_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN lifecycle_stage_source TEXT NOT NULL DEFAULT 'bootstrap'
    CHECK (lifecycle_stage_source IN (
      'bootstrap', 'hubspot_sync', 'manual', 'auto_sweep',
      'quote_converted', 'deal_won', 'contract_created',
      'deal_lost_sweep', 'inactivity_sweep', 'operator_override'
    )),
  ADD COLUMN lifecycle_stage_by TEXT, -- user_id si es manual, 'system' si es sweep
  ADD COLUMN is_dual_role BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN commercial_party_id UUID NOT NULL DEFAULT gen_random_uuid(); -- stable id surfaceable aunque cambie organization_id

-- Historial inmutable de transiciones
CREATE TABLE greenhouse_core.organization_lifecycle_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transition_source TEXT NOT NULL,
  transitioned_by TEXT,
  trigger_entity_type TEXT, -- 'deal' | 'quote' | 'contract' | 'manual' | null
  trigger_entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (to_stage <> from_stage) -- no self-transitions
);

CREATE INDEX idx_org_lifecycle_hist_org ON greenhouse_core.organization_lifecycle_history(organization_id, transitioned_at DESC);
CREATE INDEX idx_org_lifecycle_stage ON greenhouse_core.organizations(lifecycle_stage) WHERE lifecycle_stage NOT IN ('churned', 'disqualified', 'provider_only');
```

**Notas de diseño:**

- `commercial_party_id` es un UUID estable que viaja con la organization aunque cambie su `organization_id` (rename, merge). Es el identificador usado en eventos outbox y proyecciones.
- `is_dual_role` resuelve el caso real de empresas que son cliente y proveedor (ej. estudio de arquitectura que contratamos + le vendemos sistemas). Permite que la misma company HubSpot proyecte dos lifecycle tracks sin colisión.
- El índice parcial sobre `lifecycle_stage` optimiza el selector del Quote Builder (que solo quiere stages sellables).

### 4.4 Relación con `clients`

`greenhouse_core.clients` queda como la **extensión financiera** de una organization que cruzó a `active_client`. Invariantes:

- `clients.organization_id` es UNIQUE y NOT NULL.
- `organizations.client_id` es NULLABLE y se materializa en la transición `opportunity → active_client`.
- Una organization sin `client_id` **no** puede tener rows en `greenhouse_finance.*` — esto se enforce con FK y con un guard en `src/lib/db.ts` query helpers.
- La transición a `active_client` es la que instancia el `client_id` (comando canónico, ver §6.3).

### 4.5 Relación con HubSpot `Company.lifecyclestage`

HubSpot maneja su propio vocabulario. Mapping canónico:

| HubSpot `lifecyclestage` | Greenhouse `lifecycle_stage` |
|---|---|
| `subscriber`, `lead` | `prospect` |
| `marketingqualifiedlead`, `salesqualifiedlead` | `prospect` |
| `opportunity` | `opportunity` |
| `customer` | `active_client` |
| `evangelist` | `active_client` |
| `other` | `churned` (con override manual posible) |
| (sin lifecycle definido) | `prospect` por default |

Mapping bi-direccional: si Greenhouse promueve a `active_client`, escribe `customer` a HubSpot; si HubSpot cambia a `opportunity`, Greenhouse promueve a `opportunity` respetando precedence rules (ver §5.3).

---

## 5. Contrato de sync HubSpot ↔ Greenhouse

### 5.1 Inbound: HubSpot → Greenhouse

Hoy el sync crea `organizations` solo en ciertos triggers (closed-won, provider). La extensión:

**Nuevo trigger de creación**: **cualquier HubSpot Company con `lifecyclestage IN (lead, mql, sql, opportunity, customer)`** dispara creación/update de `organization` con el mapping de §4.5.

Implementación:

- `src/lib/sync/hubspot/hubspot-companies-sync.ts` (nuevo o extensión del existente) — ejecuta por cron o por reactive consumer del webhook HubSpot.
- El sync es **idempotente** (upsert por `hubspot_company_id`).
- Al crear una organization como `prospect`, **no** se crea `client_id` ni `space_id`. Solo la organization con lifecycle_stage correspondiente.
- Si la company ya existe en Greenhouse como `provider_only`, el sync respeta el flag y no degrada el estado; evalúa `is_dual_role`.
- El sync escribe en `organization_lifecycle_history` toda transición con `transition_source='hubspot_sync'`.

Frecuencia recomendada:

- Cron cada 5-10 minutos para cambios incrementales (`hs_lastmodifieddate`).
- Webhook inbound (HubSpot → Cloud Run ops-worker) para cambios real-time de `lifecyclestage`.
- Full resync nocturno para reconciliar.

### 5.2 Outbound: Greenhouse → HubSpot

Hoy es casi inexistente para companies (solo quotes/deals vía TASK-463). La extensión:

**Nuevo dominio outbound**: `commercial.party.*` events se proyectan a HubSpot Company properties via reactive projection `partyHubSpotOutbound`.

Propiedades HubSpot escritas por Greenhouse:

- `lifecyclestage` (respetando precedence, ver §5.3)
- `gh_commercial_party_id` (custom property; id canónico de Greenhouse)
- `gh_last_quote_at` (timestamp última cotización emitida)
- `gh_last_contract_at`
- `gh_mrr_clp` (solo si `active_client`)
- `gh_active_contracts_count`

**NO** se escriben por Greenhouse:

- `name`, `domain`, `industry`, `country` → HubSpot owns.
- Address, phone, employee count → HubSpot owns.
- `lifecyclestage` si el cambio vino **originalmente** de HubSpot en los últimos 60s (anti-ping-pong).

### 5.3 Conflict resolution (bi-directional edits)

Cuando ambos lados editan `lifecyclestage` casi simultáneamente:

1. **Authoritative field owner table** (`src/lib/sync/field-authority.ts`): cada property tiene owner declarado. Para `lifecyclestage`, owner = **Greenhouse si existe quote/contract activo; HubSpot en cualquier otro caso**. Esto respeta la intuición operativa: si ya hay compromiso comercial, Greenhouse es la verdad; antes de eso, el comercial decide en HubSpot.
2. **Timestamp tiebreak**: si ambos editaron dentro de 60s, gana el más reciente; se loguea conflicto en `greenhouse_sync.sync_conflicts`.
3. **Manual override**: el operador puede forzar un estado con `transition_source='operator_override'` y razón auditada; bloquea el sync automático por 10 minutos con un flag `lifecycle_stage_frozen_until`.
4. **Anti-ping-pong guard**: cada outbound escribe `gh_last_write_at` en HubSpot; el inbound skipea si el cambio detectado fue escrito por Greenhouse en los últimos 60s.

### 5.4 Impacto en el pipeline de sync existente

- `source_sync_pipelines` gana 2 nuevos records: `hubspot_companies_full` (inbound), `hubspot_companies_lifecycle_outbound` (outbound).
- Ambos reportan en `source_sync_runs` como siempre.
- Admin Center > Ops Health muestra run status, última transition exitosa, conflictos sin resolver.

---

## 6. Comandos canónicos (CQRS write side)

Los comandos son funciones TypeScript server-side en `src/lib/commercial/party-commands/` que envuelven transacción + outbox emit + audit log. No se hacen DB writes directos desde routes para estas operaciones.

### 6.1 `promoteParty(input)`

Transiciona una Party de un estado a otro con validación de invariantes.

```typescript
export async function promoteParty(input: {
  organizationId: string;
  toStage: LifecycleStage;
  source: LifecycleTransitionSource;
  actor: { userId?: string; system?: boolean; reason?: string };
  triggerEntity?: { type: 'deal' | 'quote' | 'contract'; id: string };
  metadata?: Record<string, unknown>;
}): Promise<PartyPromotionResult>;
```

Responsabilidades:

- Validar que la transición esté permitida por la máquina de estados.
- Ejecutar side effects atómicos (ej. si `→ active_client`, instanciar `client_id`).
- Persistir en `organization_lifecycle_history`.
- Emitir evento `commercial.party.promoted` con payload rico.

### 6.2 `createPartyFromHubSpotCompany(input)`

Crea una organization+party desde una HubSpot company que aún no existe en Greenhouse.

```typescript
export async function createPartyFromHubSpotCompany(input: {
  hubspotCompanyId: string;
  hubspotLifecycleStage?: string;
  defaultName?: string;
  tenantContext: TenantContext;
  actor: Actor;
}): Promise<{ organizationId: string; commercialPartyId: string; lifecycleStage: LifecycleStage }>;
```

Invocado por:

- Inbound sync pipeline (HubSpot webhook o cron).
- Selector del Quote Builder al "adoptar" un prospect desde HubSpot.
- Admin Center al provisionar manualmente.

Es idempotente: si ya existe por `hubspot_company_id`, retorna el existente.

### 6.3 `instantiateClientForParty(input)`

Side effect de la promoción a `active_client`. Separado para poder invocarse directamente en bootstrap.

```typescript
export async function instantiateClientForParty(input: {
  organizationId: string;
  triggerEntity: { type: 'deal' | 'contract'; id: string };
  billingDefaults?: { currency: Currency; paymentTermsDays?: number };
  actor: Actor;
}): Promise<{ clientId: string }>;
```

- Crea row en `greenhouse_core.clients` con FK a organization.
- Genera `client_id` (ULID o UUID).
- Bootstrapea `fin_client_profiles` con defaults.
- Emite `commercial.client.instantiated`.
- Fails si la organization ya tiene `client_id`.

### 6.4 `createDealFromQuoteContext(input)`

Nuevo comando que resuelve el pain point principal: crear un HubSpot deal desde el Quote Builder sin context-switch.

```typescript
export async function createDealFromQuoteContext(input: {
  organizationId: string;
  dealName: string;
  amount?: number;
  currency?: Currency;
  closeDateHint?: string; // YYYY-MM-DD
  pipelineCode?: string; // default por BU del actor
  stageCode?: string; // default "appointmentscheduled"
  ownerHubSpotId?: string; // default owner del actor en HubSpot
  businessLineCode?: string;
  actor: Actor;
}): Promise<{ dealId: string; hubspotDealId: string; organizationPromoted?: boolean }>;
```

Flujo interno:

1. Resolver `hubspot_company_id` desde la organization.
2. POST a `hubspot-greenhouse-integration` Cloud Run service (`/deals` endpoint — nuevo, ver §7.2).
3. Persistir en `greenhouse_commercial.deals` con `sync_status='created_from_greenhouse'`.
4. Si la organization estaba en `prospect`, promover a `opportunity` automáticamente.
5. Emitir `commercial.deal.created` con `origin='greenhouse_quote_builder'`.

Idempotencia: si el caller incluye un `idempotencyKey`, el comando lo registra en `greenhouse_commercial.deal_create_attempts` y evita duplicados.

### 6.5 `convertQuoteToCash(input)`

Coreografía atómica invocada al aceptar formalmente una cotización. Es el pivote del quote-to-cash.

```typescript
export async function convertQuoteToCash(input: {
  quotationId: string;
  conversionTriggeredBy: 'contract_signed' | 'deal_won_hubspot' | 'operator';
  actor: Actor;
}): Promise<{
  contractId?: string;
  clientId: string;
  organizationPromoted: boolean;
  dealPromoted: boolean;
}>;
```

Steps transaccionales:

1. Lock pesimista sobre `quotations.quotation_id`.
2. Transicionar quote a `converted`.
3. Si la organization no es `active_client`, invocar `instantiateClientForParty` + `promoteParty → active_client`.
4. Resolver el deal asociado (`hubspot_deal_id` de la quote) y marcar como `is_won=true` si aún no lo está; outbound a HubSpot si el trigger fue `operator`.
5. Delegar a `createContractFromQuotation` (TASK-460) la creación del contract.
6. Emitir eventos: `commercial.quotation.converted`, `commercial.party.promoted`, `commercial.deal.won` (si aplica), `commercial.contract.created`.
7. Auditar como operación única en `commercial_operations_audit`.

Rollback: si cualquier step falla, toda la transacción abortea; no hay estados inconsistentes intermedios.

---

## 7. Read projections y UI surfaces

### 7.1 Selector unificado del Quote Builder

Hoy: `GET /api/commercial/organizations` retorna solo organizations existentes.

Target: **`GET /api/commercial/parties/search?q=&includeStages=`** unifica dos fuentes:

1. Organizations ya materializadas en PG (todos los stages excepto `churned`, `disqualified`, `provider_only` por default).
2. HubSpot companies NO aún sincronizadas — query directo al sync pipeline cache (`greenhouse_sync.hubspot_companies_cache`, proyección actualizada cada 5min).

Response:

```typescript
type PartySearchResult = {
  parties: Array<{
    kind: 'party' | 'hubspot_candidate';
    organizationId?: string; // null si es candidate
    commercialPartyId?: string; // null si es candidate
    hubspotCompanyId?: string;
    displayName: string;
    lifecycleStage?: LifecycleStage;
    domain?: string;
    lastActivityAt?: string;
    // Si kind === 'hubspot_candidate', el front puede llamar
    // POST /api/commercial/parties/adopt para materializarla en un click
    canAdopt: boolean;
  }>;
  hasMore: boolean;
};
```

### 7.2 Endpoint de adopción

`POST /api/commercial/parties/adopt { hubspotCompanyId }` — llama `createPartyFromHubSpotCompany` y retorna el `organizationId` listo para usar. El Quote Builder lo invoca cuando el operador selecciona un candidate de HubSpot.

### 7.3 Endpoint de creación de deal inline

`POST /api/commercial/organizations/:id/deals` — recibe payload mínimo (name, pipeline, stage, amount opcional) e invoca `createDealFromQuoteContext`. Responde con el deal listo para asociar a la cotización.

El Quote Builder muestra un botón "Crear deal nuevo" en el selector de deal cuando el organization ya está seleccionado y no hay deals abiertos; abre un drawer mínimo con los campos, submit único.

### 7.4 Cloud Run integration service extension

`hubspot-greenhouse-integration` Cloud Run service gana dos endpoints nuevos:

- `POST /deals` — crea deal en HubSpot (wraps HubSpot Deals API con autenticación y rate limit handling).
- `PATCH /companies/:id/lifecycle` — actualiza lifecyclestage + custom properties outbound (§5.2).

Request/response JSON contract va en `docs/architecture/GREENHOUSE_INTEGRATION_SERVICES_V1.md` (spec separado, puede crearse en una task de hardening).

---

## 8. Eventos de outbox (extensión del catálogo)

Nuevos eventos canónicos a añadir en `GREENHOUSE_EVENT_CATALOG_V1.md`:

| Event | Domain | Emitido por | Payload clave |
|---|---|---|---|
| `commercial.party.created` | `cost_intelligence` | `createPartyFromHubSpotCompany`, bootstrap manual | `commercialPartyId`, `organizationId`, `initialStage`, `source`, `hubspotCompanyId?` |
| `commercial.party.promoted` | `cost_intelligence` | `promoteParty` | `commercialPartyId`, `fromStage`, `toStage`, `source`, `triggerEntity?` |
| `commercial.party.demoted` | `cost_intelligence` | `promoteParty` (si es degradación) | igual a promoted, `direction='demote'` |
| `commercial.party.hubspot_synced_in` | `cost_intelligence` | inbound pipeline | `hubspotCompanyId`, `fieldsChanged`, `hubspotLastModified` |
| `commercial.party.hubspot_synced_out` | `cost_intelligence` | outbound projection | `commercialPartyId`, `fieldsWritten`, `hubspotResponseStatus` |
| `commercial.party.sync_conflict` | `cost_intelligence` | sync reconciler | `commercialPartyId`, `conflictFields`, `resolutionApplied` |
| `commercial.client.instantiated` | `cost_intelligence` | `instantiateClientForParty` | `clientId`, `organizationId`, `triggerEntity` |
| `commercial.deal.created_from_greenhouse` | `cost_intelligence` | `createDealFromQuoteContext` | `dealId`, `hubspotDealId`, `organizationId`, `quotationId?` |

Proyecciones reactivas nuevas:

- `partyLifecycleSnapshot` → `greenhouse_serving.party_lifecycle_snapshots` (una row por party, latest state + funnel timings).
- `partyHubSpotOutbound` → escribe a HubSpot via integration service.

---

## 9. Governance y guardrails

### 9.1 Autorización

Los comandos requieren capabilities del modelo de entitlements (`GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`):

| Comando | Capability requerida |
|---|---|
| `createPartyFromHubSpotCompany` | `commercial.party.create` (default: `sales`, `efeonce_admin`) |
| `promoteParty → active_client` | `commercial.party.promote_to_client` (default: `finance_admin`, `efeonce_admin`) |
| `promoteParty → churned` | `commercial.party.churn` (default: `sales_lead`, `efeonce_admin`) |
| `createDealFromQuoteContext` | `commercial.deal.create` (default: `sales`, `sales_lead`, `efeonce_admin`) |
| `convertQuoteToCash` | `commercial.quote_to_cash.execute` (default: `finance_admin`, `efeonce_admin`) |

Manual overrides requieren capability `commercial.party.override_lifecycle` (default: solo `efeonce_admin`).

### 9.2 Thresholds y aprobaciones

- Crear deal inline con `amount > $50,000,000 CLP` requiere aprobación (reutiliza approval workflow de TASK-504).
- Transición a `churned` manual requiere razón obligatoria (enum: `lost_to_competitor`, `out_of_market`, `relationship_ended`, `bad_fit`, `other_with_note`).
- Quote-to-cash de contratos > `$100,000,000 CLP` requiere dual approval (CFO + CEO) — integración con `contract_approval_workflow` TASK-460.

### 9.3 Audit trail

Toda invocación de los comandos escribe a `greenhouse_core.commercial_operations_audit` con:

- `operation_name`
- `actor_user_id`, `actor_agent?`
- `inputs` (JSONB redacted si contiene PII)
- `result` (success / error + code)
- `latency_ms`
- `outbox_event_ids[]` (array de ids emitidos)
- `correlation_id` (para trazar la cadena quote → deal → contract)

### 9.4 Multi-tenancy

- Toda operación resuelve `tenantContext` via `resolveTenantContext()` (existe ya).
- Parties son tenant-scoped por el `organizations.tenant_type` existente (no se modifica).
- `efeonce_internal` ve todas las parties; `client` solo las propias; `provider` solo su propio provider_only record.

### 9.5 Anti-fraud

- Ratelimit en `createDealFromQuoteContext`: 20/min por user, 100/hora por tenant.
- Dedupe por `hubspotCompanyId + dealName + actor` en ventana de 5min.
- Deals creados desde Greenhouse se etiquetan en HubSpot con custom property `gh_deal_origin='greenhouse_quote_builder'` para análisis.

---

## 10. Migración y rollout

### 10.1 Migraciones DDL (fase 1, PR único)

1. `ALTER TABLE organizations ADD lifecycle_stage` con default `prospect`.
2. **Backfill** por script `scripts/backfill-organization-lifecycle.ts`:
   - Organizations con `client_id` + contratos activos → `active_client`.
   - Organizations con `client_id` sin contratos activos + sin income 6m → `inactive`.
   - Organizations provider sin cliente → `provider_only`.
   - Organizations sin client y sin provider → `prospect` (default).
3. Crear `organization_lifecycle_history` e insertar un initial row por organization con `from_stage=NULL, to_stage=<backfilled>`.
4. Crear índices.
5. Bloque idempotente: si la migración corre de nuevo, detecta estado previo y no-op.

### 10.2 Código (fase 2, serie de PRs)

Orden recomendado para minimizar blast radius:

1. **PR-A** (solo código, flag off): comandos canónicos, helpers, tipos, tests unitarios. Nada visible al usuario.
2. **PR-B**: extensión del inbound sync de HubSpot companies — empieza a poblar prospects. Feature flag `GREENHOUSE_PARTY_LIFECYCLE_SYNC=true`.
3. **PR-C**: endpoints `/parties/search` + `/parties/adopt`. Todavía no expuestos en UI.
4. **PR-D**: Quote Builder consume selector unificado. Flag UI `GREENHOUSE_PARTY_SELECTOR_UNIFIED=true`.
5. **PR-E**: endpoint `/organizations/:id/deals` + drawer "Crear deal nuevo" en Quote Builder.
6. **PR-F**: outbound sync HubSpot lifecycle property + projection.
7. **PR-G**: comando `convertQuoteToCash` + wiring desde `contract.created` y `deal.won`.
8. **PR-H**: dashboards en Admin Center para Ops Health + party lifecycle funnel metrics.
9. **PR-I**: deprecación del endpoint viejo y remoción de flags tras validación en staging.

### 10.3 Operational readiness

- Runbook en `docs/operations/party-lifecycle-runbook.md`: diagnostico de conflictos, forzar transición manual, replay de sync fallido.
- Alertas: >10 sync_conflicts sin resolver en 24h → slack #ops-alerts; >5 deals creados con error 5xx en HubSpot en 1h → page oncall.
- Dashboards: velocity de conversión (`prospect → opportunity → active_client`), time-in-stage, funnel drop-off.

---

## 11. Dependencies & impact

### 11.1 Depende de

- `greenhouse_core.organizations` (existe — TASK-486 lo consolidó como anchor).
- `greenhouse_core.clients` (existe).
- `greenhouse_commercial.deals` (existe — TASK-453 lo mirrora).
- `hubspot-greenhouse-integration` Cloud Run service (existe, gana 2 endpoints).
- Reactive projections infrastructure (existe).
- Outbox + event catalog (existe).

### 11.2 Impacta a

- **Quote Builder UX** (TASK-486, TASK-463, TASK-504): cambia el selector, añade drawer de deal inline. No rompe contratos existentes.
- **Revenue Pipeline dashboard** (TASK-457, TASK-456): gana visibilidad de prospects/opportunities que hoy no ve.
- **MRR/ARR snapshots** (TASK-462): no cambia contrato, pero la lista de clients fuente se extiende a más organizations.
- **Admin Center**: nueva surface "Commercial Parties" para gestión manual.
- **Finance reports**: ningún cambio — `client_id` sigue siendo el anchor contable.
- **Kortex**: desbloquea la plataforma CRM externa al dar el modelo estable.
- **TASK-466** (multi-currency quote output): sin cambios — este spec es ortogonal.

### 11.3 Archivos que pasarán a ser owned por tasks derivadas

(Listado para que el `Chequeo de impacto cruzado` del task protocol pueda seguirlos.)

- `src/lib/commercial/party-commands/**` (nuevo)
- `src/lib/sync/hubspot/hubspot-companies-sync.ts` (extensión)
- `src/lib/sync/projections/party-hubspot-outbound.ts` (nuevo)
- `src/app/api/commercial/parties/**` (nuevo)
- `src/app/api/commercial/organizations/[id]/deals/route.ts` (nuevo)
- `src/views/greenhouse/finance/QuoteBuilderShell.tsx` (modificación — selector y drawer deal)
- `migrations/YYYYMMDD_add-organization-lifecycle.sql`
- `scripts/backfill-organization-lifecycle.ts`

---

## 12. Preguntas abiertas (para resolver en fase de task planning)

1. **Dual-role companies**: ¿creamos dos `organization_id` separados o un solo registro con `is_dual_role=true` y dos lifecycle tracks en columnas separadas (`commercial_lifecycle_stage` + `provider_status`)? El spec propone la primera (simpler) pero hay casos donde la misma company opera ambos lados.
2. **HubSpot portal mismatch**: si tenemos más de un HubSpot portal (multi-tenant B2B, ej. Kortex), ¿cómo disambiguamos `hubspot_company_id`? Propuesta: `hubspot_portal_id + hubspot_company_id` compuesto.
3. **Scope del outbound**: ¿escribimos `gh_mrr_clp` a HubSpot? Hay riesgo de que sales vea números financieros crudos. Alternativa: solo tier (`mrr_tier=1..5`).
4. **Merge de companies**: cuando HubSpot hace merge de dos companies, ¿cómo reconciliamos? Propuesta: evento `commercial.party.merged` con `absorbed_party_id[]` + script de migración de referencias FK.
5. **Nager-like sweep frequency**: ¿el sweep de `active_client → inactive` corre nocturno o semanal? Default sugerido: nocturno 03:00 `America/Santiago`.
6. **Compliance / data residency**: al promover un prospect a `active_client` y exponer más data a HubSpot, ¿hay restricción de GDPR/Ley 21.719 Chile? Revisar con legal antes del PR-F.
7. **Pricing de HubSpot API**: crear deals outbound cuesta calls/mes. ¿Tenemos tier suficiente? Estimar volumen esperado.

---

## 13. Anexo: máquina de estados completa

```
                    ┌─────────────────┐
                    │    prospect     │◄──────────────(default, HubSpot lead/mql/sql)
                    └────────┬────────┘
                             │ deal abre
                             ▼
                    ┌─────────────────┐
                    │  opportunity    │◄──────────────(HubSpot opportunity)
                    └────────┬────────┘
              deal won       │       all deals lost
          ┌──────────────────┴────────────────────┐
          ▼                                        ▼
┌─────────────────┐                      ┌─────────────────┐
│  active_client  │                      │   disqualified  │──── terminal
└────────┬────────┘                      └─────────────────┘
         │ sin actividad 6m
         ▼
┌─────────────────┐        nueva quote convertida
│    inactive     │──────────────────────┐
└────────┬────────┘                      │
         │ sin actividad 12m             ▼
         ▼                        ┌─────────────────┐
┌─────────────────┐              │  active_client  │
│    churned      │              └─────────────────┘
└─────────────────┘
     terminal (salvo
     operator_override)

 ┌─────────────────┐
 │  provider_only  │  ←─ track paralelo, no cruza al funnel
 └─────────────────┘
```

---

## 14. Changelog

- **v1.0 — 2026-04-20:** Spec inicial. Define modelo canónico de Commercial Party Lifecycle, contratos de sync bi-direccional con HubSpot, comandos CQRS, coreografía quote-to-cash, governance, y plan de rollout por fases.
