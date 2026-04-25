# TASK-619 — Quote eSignature (consumer del foundation neutro de firma)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio` (~4 dias post-foundation)
- Type: `implementation`
- Epic: `EPIC-001` (Document Vault & Signature Orchestration Platform)
- Status real: `Diseno cerrado v3 (defense-in-depth) — bloqueada por foundation`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-489, TASK-490, TASK-491`
- Branch: `task/TASK-619-quote-esignature-zapsign`
- Legacy ID: `RESEARCH-005 P2.1`
- GitHub Issue: `none`

## Summary

Habilitar firma electronica bilateral (firmantes lado cliente + refrendarios lado Efeonce) para cotizaciones, **consumiendo el agregado neutro `signature_requests`** que provee TASK-490 + el adapter ZapSign que provee TASK-491. La firma es 100% opcional, configurable per-version desde la creacion de la quote v1, con state machine formal y compliance LATAM defendible.

Esta task es el **primer consumer de produccion del foundation documental + firma neutral**, no la integracion en si — la integracion vive en TASK-491.

## Why This Task Exists

Hoy una quote pasa de `sent` a `approved` sin trail criptografico de firma. El cliente puede aceptar verbalmente, por email, o por silencio — pero no hay artifact firmado que cierre el ciclo legalmente. Esto bloquea cobranza enterprise y rompe auditoria contable LATAM (Chile/Colombia/Mexico/Peru/Brasil exigen firma electronica simple para contratos B2B con monto significativo).

Tras analisis 2026-04-25 con owner, se decidio el camino largo (foundation primero) en vez del camino corto (replicar patron MSA) porque:

1. HR contracts (TASK-027) reutilizara la misma foundation — ahorra ~5 dias futuros
2. Refactoring MSA al agregado neutro (TASK-491) ya estaba planeado — esta task lo absorbe naturalmente
3. Compliance LATAM defendible legalmente (vs deuda tecnica si vamos cortos)
4. Multi-provider real desde dia 1: DocuSign/Adobe Sign en cliente enterprise = ~2 dias de adapter, no ~2 sprints

## Goal

- Capacidad opcional de firma activable per-version desde v1
- Modelo bilateral: firmantes (lado cliente, `order_group=1`) + refrendarios (lado Efeonce, `order_group=2`)
- Consumir `signature_requests` agregado neutro provisto por TASK-490
- State machine formal con XState (no transiciones ad-hoc)
- Compliance LATAM: hash SHA-256 + SHA-512 inmutable, retention 10 anos, audit log dedicado, sanitizacion PII
- Provider-agnostic via interface `eSignatureProvider` (ZapSign primary, DocuSign/Adobe on-demand)
- Webhook processing async (outbox + reactive worker, NO escritura sincrona en handler)
- Notificaciones multi-canal: email + in-app + Slack via 3 reactores independientes
- Quote firmada bloquea edicion + bloquea convert-to-income salvo override Finance Admin

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.6
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

Reglas obligatorias:

- consumir `signature_requests` y `signature_request_signers` del foundation (no inventar tablas paralelas en `greenhouse_commercial`)
- el orden de firma es legalmente vinculante: cliente firma primero, Efeonce refrenda
- la quote firmada (`status=signed`) es inmutable — cualquier cambio requiere amendment (TASK-628)
- artifact firmado vuelve a Greenhouse via `signed-documents` bucket (TASK-619.1) con retention 10 anos + multi-region
- webhook handler NO escribe a DB sincronicamente — solo valida + persiste en `webhook_event_log` + emite outbox event procesado por reactive worker
- toda transicion de estado debe pasar por XState machine + persistir audit event
- PII sanitizada en logs (emails, IPs, nombres mascarados con hash SHA-256[:8])

## Dependencies & Impact

### Depends on

- **`TASK-489`** (Document Registry & Versioning Foundation) — provee asset registry canonico
- **`TASK-490`** (Signature Orchestration Foundation) — provee agregado neutro `signature_requests`
- **`TASK-491`** (ZapSign Adapter + Webhook Convergence) — provee adapter + circuit breaker + dedup
- **`TASK-619.1`** (Signed PDF Storage Hardening) — provee bucket separado + multi-region + retention
- **`TASK-619.2`** (Signature Operational Worker) — provee reconciliation + expiry alerting
- **`TASK-619.3`** (Quote Signature Notifications) — provee 3 reactors notificacion
- TASK-631 Fase 4 (PDF cache) — ya cerrado en develop

### Blocks / Impacts

- `TASK-628` (Amendment): consumer de quotes firmadas
- `TASK-624` (Renewal engine): renewals heredan politica de firma
- `TASK-621` (Analytics dashboards): nuevos eventos `quote.signed_*` alimentan funnel
- `TASK-027` (HRIS Document Vault): consumer hermano del foundation, valida que el modelo es generalizable

### Files owned

- `migrations/YYYYMMDD_task-619-quote-signature-link.sql` (link table + politica en quotations)
- `src/lib/finance/quotations/signature-policy.ts`
- `src/lib/finance/quotations/signature-state-machine.ts` (XState definition)
- `src/lib/finance/quotations/signature-store.ts` (consumer de signature_requests)
- `src/app/api/finance/quotes/[id]/signature-requests/route.ts`
- `src/app/api/finance/quotes/[id]/signature-requests/cancel/route.ts`
- `src/app/api/finance/quotes/[id]/signature-requests/void/route.ts`
- `src/app/api/finance/quotes/[id]/signature-requests/signers/[signerId]/route.ts` (PATCH + resend)
- `src/app/api/finance/quotes/route.ts` (extender body POST con signaturePolicy)
- `src/app/api/finance/quotes/[id]/versions/route.ts` (extender body con override)
- `src/views/greenhouse/finance/QuoteShareDrawer.tsx`
- `src/views/greenhouse/finance/QuoteCreationForm.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`
- `src/views/greenhouse/finance/QuoteSignaturePanel.tsx` (nuevo componente)
- `src/types/db.d.ts` (regenerado)

## Current Repo State

### Already exists

- Asset registry: `greenhouse_core.assets` + `storeSystemGeneratedPrivateAsset`
- Outbox publisher: `publishOutboxEvent` (`src/lib/sync/publish-event.ts`)
- Circuit breaker: `src/lib/operations/reactive-circuit-breaker.ts`
- Idempotency wrapper: `src/lib/idempotency/idempotency-key.ts`
- Audit log: `src/lib/commercial/governance/audit-log.ts` (sera reusado pero NO modificado)
- PDF cache: `getOrCreateQuotePdfBuffer` (TASK-631 Fase 4)
- Schema `quotations` + `quotation_versions`
- Reactive worker infra: Cloud Run `ops-worker` con scheduler

### Gap

- `signature_requests` agregado neutro NO existe (lo crea TASK-490)
- `eSignatureProvider` interface NO existe (lo crea TASK-490, lo implementa TASK-491)
- `webhook_event_log` para dedup NO existe (lo crea TASK-491)
- Bucket `signed-documents` con retention 10 anos NO existe (lo crea TASK-619.1)
- Workers de reconciliation + expiry alerting NO existen (lo crea TASK-619.2)
- 3 reactors de notificacion NO existen (lo crea TASK-619.3)
- Schema quotations NO tiene columnas de politica + link a signature_request

## Scope

### Slice 1 — Schema link + politica per-version (0.5 dia)

```sql
-- migrations/YYYYMMDD_task-619-quote-signature-link.sql

ALTER TABLE greenhouse_commercial.quotations
  -- Politica (editable per-version, persistida en snapshot)
  ADD COLUMN signature_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN signature_requires_client_signers boolean NOT NULL DEFAULT true,
  ADD COLUMN signature_requires_efeonce_countersigners boolean NOT NULL DEFAULT true,
  ADD COLUMN signature_min_client_signers int NOT NULL DEFAULT 1
    CHECK (signature_min_client_signers >= 0),
  ADD COLUMN signature_min_efeonce_countersigners int NOT NULL DEFAULT 1
    CHECK (signature_min_efeonce_countersigners >= 0),
  ADD COLUMN signature_order_active boolean NOT NULL DEFAULT true,

  -- Link al agregado neutro (provisto por TASK-490)
  ADD COLUMN active_signature_request_id uuid
    REFERENCES greenhouse_signatures.signature_requests(signature_request_id),

  -- Estado denormalizado para queries rapidas (la fuente de verdad esta en signature_requests.status)
  ADD COLUMN esignature_status text
    CHECK (esignature_status IS NULL OR esignature_status IN
      ('not_required','draft','pending_client','pending_countersign','signed',
       'declined','voided','voided_after_signature','expired','cancelled','partial_signed_expired')),

  -- Override compliance gate
  ADD COLUMN force_invoice_without_signature boolean NOT NULL DEFAULT false,
  ADD COLUMN force_invoice_reason text,
  ADD COLUMN force_invoice_authorized_by text,
  ADD COLUMN force_invoice_authorized_at timestamptz;

CREATE INDEX quotations_active_signature_request_idx
  ON greenhouse_commercial.quotations (active_signature_request_id)
  WHERE active_signature_request_id IS NOT NULL;
```

**Tabla `business_line_signature_policy` (opcional pero recomendada):**

```sql
CREATE TABLE greenhouse_commercial.business_line_signature_policy (
  policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_line_code text NOT NULL,
  required_countersigner_member_id text REFERENCES greenhouse.team_members(member_id),
  requires_dual_countersign boolean NOT NULL DEFAULT false,
  min_amount_for_dual_clp numeric(14,2),
  min_auth_mode_above_amount_clp numeric(14,2),
  min_auth_mode text CHECK (min_auth_mode IN ('assinaturaTela','token-email','sms','whatsapp','facial-biometrics')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_line_code)
);
```

### Slice 2 — State machine formal (XState) (0.75 dia)

`src/lib/finance/quotations/signature-state-machine.ts`:

```typescript
import { createMachine } from 'xstate'

export const quoteSignatureMachine = createMachine({
  id: 'quoteSignature',
  initial: 'not_required',
  states: {
    not_required: {
      on: { ENABLE: 'draft' }
    },
    draft: {
      on: {
        DISABLE: 'not_required',
        SEND_TO_PROVIDER: { target: 'pending_client', cond: 'hasValidSigners' }
      }
    },
    pending_client: {
      on: {
        CLIENT_SIGNED_ALL: 'pending_countersign',
        DECLINED: 'declined',
        EXPIRED: 'expired',
        CANCELLED: 'cancelled'
      }
    },
    pending_countersign: {
      on: {
        EFEONCE_SIGNED_ALL: 'signed',
        DECLINED: 'declined',
        EXPIRED: 'partial_signed_expired',
        CANCELLED: 'cancelled'
      }
    },
    signed: {
      type: 'final',
      on: { VOID_AFTER_SIGNATURE: 'voided_after_signature' }
    },
    declined: { type: 'final' },
    expired: { type: 'final' },
    voided: { type: 'final' },
    voided_after_signature: { type: 'final' },
    cancelled: { on: { ENABLE: 'draft' } },
    partial_signed_expired: { type: 'final' }
  }
}, {
  guards: {
    hasValidSigners: ({ context }) => /* ... */
  }
})
```

Ventaja: transiciones invalidas son rechazadas en compile-time por XState. Cero estado inconsistente.

### Slice 3 — Backend store + endpoints (1 dia)

**`signature-policy.ts`:**

- `derivePolicyDefaults({organizationId, businessLineCode, totalClp})` — pre-poblar firmantes desde HubSpot CRM con role legal_signatory, refrendarios desde sales rep + business_line policy, auth_mode minimo basado en monto
- `validateSigners({clientSigners, efeonceCountersigners, policy, totalClp})` — valida cantidad minima + roles + auth_mode minimo

**`signature-store.ts`:**

- `linkQuoteToSignatureRequest(quotationId, versionNumber, signatureRequestId)` — set `active_signature_request_id`
- `derivedQuoteSignatureStatus(signatureRequest)` — computa `esignature_status` denormalizado
- `applyStateTransition(quotationId, event)` — usa XState machine + persiste audit
- `cancelSignatureRequest`, `voidAfterSignature` — wrappers

**Endpoints:**

- `POST /api/finance/quotes/[id]/signature-requests` — body con signers + politica; valida estado vigente (debe estar `approved` para enviar a firma); llama `createSignatureRequest` del provider via TASK-491 adapter
- `GET /api/finance/quotes/[id]/signature-requests` — devuelve estado + signers + audit log
- `POST /api/finance/quotes/[id]/signature-requests/cancel` — solo si en `pending_*`
- `POST /api/finance/quotes/[id]/signature-requests/void` — solo si en `signed`, requiere razon + Finance Admin
- `PATCH /api/finance/quotes/[id]/signature-requests/signers/[signerId]` — editar email mientras `status != signed`
- `POST /api/finance/quotes/[id]/signature-requests/signers/[signerId]/resend` — re-enviar email a un signer especifico

**Idempotency:** todos los POST usan `withIdempotency` con `Idempotency-Key` header.

### Slice 4 — Cross-flow gates (0.5 dia)

**Gate A: enviar a firma requiere `quotation.status='approved'`:**

```typescript
if (quote.status !== 'approved') {
  throw new ValidationError('Quote debe estar approved antes de enviar a firma. Status actual: ' + quote.status)
}
```

**Gate B: convert-to-income bloqueado si `signature_enabled=true` y no firmada:**

```typescript
// En src/lib/finance/income-conversion.ts (o equivalente)
if (quote.signature_enabled && quote.esignature_status !== 'signed' && !quote.force_invoice_without_signature) {
  throw new ValidationError('Quote requiere firma. Use override Finance Admin con razon.')
}
```

**Gate C: edicion bloqueada si `esignature_status IN (pending_*, signed)`:**

```typescript
const EDITABLE_SIGNATURE_STATES = new Set([null, 'not_required', 'draft', 'cancelled', 'declined', 'expired', 'voided', 'partial_signed_expired'])
if (!EDITABLE_SIGNATURE_STATES.has(quote.esignature_status)) {
  throw new ValidationError('Quote bloqueada por firma en proceso. Cancela firma o crea amendment.')
}
```

**Gate D: validar `valid_until` al enviar a firma:**

```typescript
const minRequiredValidity = addDays(today, dateLimitToSignDays)
if (quote.valid_until < minRequiredValidity) {
  throw new ValidationError(`Extiende validity hasta al menos ${minRequiredValidity}`)
}
```

### Slice 5 — Form de creacion + drawer (1 dia)

**`QuoteCreationForm.tsx`:**

- Seccion "Firma electronica (opcional)" colapsable al final del form
- Toggle `signature_enabled` (off por default)
- Si on: 2 checkboxes (`requires_client_signers`, `requires_efeonce_countersigners`) + sliders de minimo + checkbox de orden secuencial
- Texto helper: "Los firmantes y refrendarios concretos se agregan al enviar a firma"

**`QuoteSignaturePanel.tsx` (nuevo, embebido en QuoteShareDrawer):**

> **Nota arquitectonica:** Greenhouse NO captura la firma del usuario. ZapSign hostea la UI completa donde el firmante elige metodo (dibujar, escribir nombre con cursive, subir imagen, OTP, biometria). Cero librerias de captura de firma necesarias.

- Si `signature_enabled=false`: link "Activar firma para esta version" (solo si quote no esta locked)
- Si `signature_enabled=true` y estado = `not_required | draft`:
  - Lista editable de firmantes (lado cliente) con defaults pre-poblados de HubSpot CRM
  - Lista editable de refrendarios (lado Efeonce) con sales rep pre-poblado
  - Selector per-signer de auth_mode (5 opciones)
  - Toggle WhatsApp per-signer
  - Plazo de firma (default 30 dias)
  - Boton "Enviar a firma" — disabled si quote.status != 'approved'
- Si estado en `pending_*`:
  - Read-only con lista de signers + estado individual + timestamps
  - Boton "Cancelar firma" + "Re-enviar a [signer]"
- Si estado = `signed`:
  - Link a PDF firmado + lista de signers con timestamps + IPs sanitizadas
  - Boton "Void" (solo Finance Admin)

**`QuoteDetailView.tsx`:**

- Chip de estado de firma en header (colores segun tabla)
- Timeline event prominente "Firmada por X el Y" cuando estado = signed
- Link a PDF firmado descargable

### Slice 6 — Outbox events del consumer (0.25 dia)

Emitir desde quote signature flow:

| Evento | Cuando | Payload (sin PII) |
| --- | --- | --- |
| `commercial.quote.signature_requested` | POST signature-requests OK | `{quotationId, versionNumber, signatureRequestId, signersCount, estimatedCostUsd}` |
| `commercial.quote.signed_by_client` | XState transition `pending_client → pending_countersign` | `{quotationId, versionNumber, clientSignerHashes[]}` |
| `commercial.quote.countersigned_by_efeonce` | XState transition `pending_countersign → signed` | `{quotationId, versionNumber, signedAssetId, sha256, sha512}` |
| `commercial.quote.signature_declined` | XState transition `* → declined` | `{quotationId, versionNumber, declinedByRole, declineReasonHash}` |
| `commercial.quote.signature_voided_after_signature` | `signed → voided_after_signature` | `{quotationId, versionNumber, voidedBy, voidReasonHash}` |

Documentar en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.

### Slice 7 — Tests + smoke E2E (0.75 dia)

Tests unitarios:

- `signature-state-machine.test.ts` — todas las transiciones validas + rechazo de invalidas
- `signature-policy.test.ts` — validacion de signers + auth_mode minimo por monto
- `signature-store.test.ts` — gates A/B/C/D + linkage al agregado neutro
- `quote-signature-endpoints.test.ts` — POST/GET/PATCH/cancel/void
- `cross-flow-gates.test.ts` — convert-to-income con override + edicion bloqueada

Smoke E2E con cuenta ZapSign de staging:

1. Crear quote v1 con `signature_enabled=true`
2. Aprobar quote (gate de governance)
3. Enviar a firma con 1 client_signer + 1 efeonce_countersigner
4. Verificar evento outbox `signature_requested` + estado `pending_client`
5. Firmar como cliente en UI ZapSign
6. Verificar webhook procesa async + estado pasa a `pending_countersign` + evento `signed_by_client`
7. Refrendar como Efeonce
8. Verificar estado pasa a `signed` + PDF firmado en bucket `signed-documents` + evento `countersigned_by_efeonce`
9. Verificar SHA-256 + SHA-512 persistidos
10. Intentar editar quote → rechazado
11. Intentar convert-to-income sin override → rechazado; con override → aceptado + audit log

## Out of Scope

- Provider DocuSign / Adobe Sign concretos (interface preparada por TASK-490, implementacion on-demand)
- WhatsApp templates personalizados (usa default ZapSign)
- HR contracts signature flow (TASK-027 lo consume del mismo foundation)
- Multi-language email templates (Fase 2)
- Bulk send a firma de N quotes simultaneas (Fase 2)

## Acceptance Criteria

- [ ] migracion aplicada en dev/staging/prod sin downtime
- [ ] toggle `signature_enabled` visible en form de creacion de quote v1
- [ ] toggle editable en versiones siguientes mientras estado != `pending_*` y != `signed`
- [ ] enviar a ZapSign requiere quote.status='approved' (Gate A)
- [ ] convert-to-income bloqueado sin firma cuando enabled (Gate B); override audita razon + autor
- [ ] edicion bloqueada cuando estado en pending_* o signed (Gate C)
- [ ] valid_until validado al enviar a firma (Gate D)
- [ ] envelope ZapSign con `order_group=1` cliente, `order_group=2` Efeonce
- [ ] state machine XState rechaza transiciones invalidas en compile-time
- [ ] webhook procesa async via outbox + reactive worker (no escritura sincrona en handler)
- [ ] webhook idempotente — replay del mismo `event_id` no duplica state (dedup en `webhook_event_log`)
- [ ] eventos outbox emitidos en cada transicion (5 eventos del catalogo)
- [ ] PDF firmado persistido en bucket `signed-documents` con SHA-256 + SHA-512 inmutables
- [ ] chip de estado en QuoteDetailView con color correcto
- [ ] PDF firmado descargable solo por Finance Admin + sales rep owner
- [ ] PII sanitizada en logs (emails/IPs/nombres mascarados)
- [ ] re-envio a signer + edit signer email funcionales
- [ ] void post-firma requiere Finance Admin + razon + audit log
- [ ] notificaciones email + in-app + Slack disparadas (TASK-619.3)
- [ ] reconciliation worker detecta drift cada 6h (TASK-619.2)

## Verification

- `pnpm migrate:status` clean
- `pnpm db:generate-types` ejecutado
- `pnpm tsc --noEmit` clean
- `pnpm lint` clean
- `pnpm test` clean (incluye tests nuevos)
- `pnpm build` clean
- Smoke E2E completo documentado en `Handoff.md`

## Decisions Cerradas (segun conversacion 2026-04-25)

| # | Decision | Resolucion |
| --- | --- | --- |
| 1 | Camino corto vs largo | **Largo** — TASK-489 → TASK-490 → TASK-491 → TASK-619 (defense-in-depth + multi-domain reuse) |
| 2 | State machine | **XState formal** — transiciones invalidas rechazadas en compile-time |
| 3 | Webhook processing | **Async via outbox + reactive worker** — handler solo valida + dedup + emite |
| 4 | Provider abstraction | **`eSignatureProvider` interface real desde dia 1** — ZapSign primary, DocuSign/Adobe on-demand |
| 5 | Storage del PDF firmado | **Bucket separado `signed-documents` + retention 10 anos + replicacion multi-region** (TASK-619.1) |
| 6 | Hash integridad | **SHA-256 + SHA-512 inmutables persistidos en outbox event** |
| 7 | State machine cruzado approved/signed | **`approved → sent → pending_client → ... → signed`** — firma requiere approve previo |
| 8 | Convert-to-income con firma activa | **Bloqueado salvo override Finance Admin con razon auditada** |
| 9 | Auth mode minimo por monto | **Tabla `business_line_signature_policy.min_auth_mode_above_amount`** |
| 10 | PII en logs | **Logger custom sanitiza emails/IPs/nombres antes de escribir** |
| 11 | Notificaciones | **Email + in-app + Slack via 3 reactores independientes** (TASK-619.3) |
| 12 | Re-envio + edit signer | **Incluido en MVP** |
| 13 | Partial signed + expired | **Estado dedicado `partial_signed_expired` + alerting 24h antes de expiry** (TASK-619.2) |
| 14 | Void post-firma | **Estado `voided_after_signature` + integracion explicita con TASK-628** |
| 15 | Validacion valid_until | **Gate D al enviar + flag al recibir webhook** |
| 16 | Audit log de firma | **Reusa `quotation_audit_log` existente con event_type prefix `signature.*`** |
| 17 | Costo tracking envelopes | **Outbox event con `estimated_cost_usd` + dashboard Admin Center** |
| 18 | Multi-tenancy ZapSign | **Folder `/{tenant_id}/quotes/` para aislamiento operacional** |
| 19 | Reconciliation periodica | **Worker cada 6h via Cloud Run ops-worker** (TASK-619.2) |
| 20 | Backup off-GCS | **Replicacion cross-region GCS** (us-east4 → us-central1); revisar S3 cross-cloud en 12 meses |
| 21 | Retencion legal | **10 anos cubre todos los paises LATAM** |
| 22 | HubSpot sync | **`signed → 'Signed - Awaiting Invoice'` (stage nuevo, separado de Closed Won)** |
| 23 | Lock al pasar a `pending_client` | **Si — XState bloquea transitions de edit en estado pending_*** |
| 24 | Identidad firmante real | **Para monto > umbral en `business_line_signature_policy` se exige `auth_mode='facial-biometrics'` o `'sms'` validado** |

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con smoke E2E
- [ ] `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` actualizado con Delta cerrando P2.1
- [ ] `docs/documentation/finance/cotizaciones-gobernanza.md` actualizado con flujo de firma
- [ ] `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` actualizado con 5 eventos nuevos
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` actualizado con state machine cruzado approved/signed/income
