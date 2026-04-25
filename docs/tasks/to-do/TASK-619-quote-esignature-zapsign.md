# TASK-619 — Quote eSignature ZapSign (firmante / refrendario opcional per-version)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio` (~6.5 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2.1)
- Status real: `Diseno cerrado, listo para arrancar`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (TASK-490/491 NO requeridas — short path)
- Branch: `task/TASK-619-quote-esignature-zapsign`
- Legacy ID: `RESEARCH-005 P2.1`
- GitHub Issue: `none`

## Summary

Habilitar firma electronica bilateral (firmantes lado cliente + refrendarios lado Efeonce) para cotizaciones, usando la integracion ZapSign que ya existe en produccion para Master Service Agreements. La firma es 100% opcional, configurable per-version desde la creacion de la quote v1.

## Why This Task Exists

Hoy una quote pasa de `sent` a `approved` sin trail criptografico de firma. El cliente puede aceptar verbalmente, por email, o por silencio — pero no hay artifact firmado que cierre el ciclo legalmente. Esto bloquea cobranza enterprise y rompe auditoria contable LATAM (Chile/Colombia/Mexico/Peru/Brasil exigen firma electronica simple para contratos B2B con monto significativo).

ZapSign ya esta integrado en repo para MSAs (cliente + webhook + secrets configurados); falta cablear el mismo plumbing al flujo de cotizaciones con un modelo bilateral firmante/refrendario.

## Goal

- Capacidad opcional de firma activable per-version desde v1
- Modelo bilateral: firmantes (lado cliente, `order_group=1`) + refrendarios (lado Efeonce, `order_group=2`)
- Reuso 100% del cliente ZapSign + webhook handler existentes
- Estado runtime visible en QuoteDetailView con chip por estado de firma
- Artifact firmado persistido en GCS via `storeSystemGeneratedPrivateAsset`
- Eventos outbox emitidos para reactivar dashboard / Slack / AI features

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.6

Reglas obligatorias:

- la firma no debe acoplarse a un provider unico (capa `eSignatureProvider` interface aunque sea minima)
- el orden de firma debe ser legalmente correcto: cliente firma primero, Efeonce refrenda
- la quote firmada (`status=signed`) es inmutable — cualquier cambio requiere amendment (TASK-628)
- artifact firmado vuelve a Greenhouse como asset privado en GCS
- webhook idempotente — replay del mismo evento no duplica state

## Dependencies & Impact

### Depends on

- `src/lib/integrations/zapsign/client.ts` (ya productivo)
- `src/app/api/webhooks/zapsign/route.ts` (ya productivo, requiere refactor para multi-aggregate)
- `src/lib/storage/greenhouse-assets.ts` (ya productivo)
- TASK-631 Fase 4 (PDF cache layer — ya cerrado en develop, dependencia satisfecha)

### Blocks / Impacts

- `TASK-628` (Amendment): un quote firmado solo puede modificarse via amendment, esta task define la frontera de inmutabilidad
- `TASK-624` (Renewal engine): renewals heredan la politica de firma de la quote original
- `TASK-621` (Analytics dashboards): nuevos eventos `quote.signed_*` alimentan dashboards de conversion

### Files owned

- `migrations/YYYYMMDD_task-619-quote-esignature.sql` (nueva)
- `src/lib/finance/quotations/signature-store.ts` (nuevo)
- `src/lib/finance/quotations/signature-policy.ts` (nuevo — defaults + validation)
- `src/app/api/finance/quotes/[id]/signature-requests/route.ts` (nuevo)
- `src/app/api/finance/quotes/[id]/signature-requests/cancel/route.ts` (nuevo)
- `src/app/api/webhooks/zapsign/route.ts` (refactor: dispatcher por aggregate type)
- `src/app/api/finance/quotes/route.ts` (extender body POST con `signaturePolicy`)
- `src/app/api/finance/quotes/[id]/versions/route.ts` (extender body POST con override de politica)
- `src/views/greenhouse/finance/QuoteShareDrawer.tsx` (seccion firma colapsable)
- `src/views/greenhouse/finance/QuoteCreationForm.tsx` (toggle `signature_enabled` desde v1)
- `src/views/greenhouse/finance/QuoteDetailView.tsx` (chip estado + link PDF firmado)
- `src/types/db.d.ts` (regenerado por kysely-codegen)

## Current Repo State

### Already exists

- Cliente ZapSign productivo: `createZapSignDocument`, `getZapSignDocument`, `isZapSignConfigured`
- Webhook handler `/api/webhooks/zapsign` (hard-coded a MSA, requiere refactor a dispatcher)
- Patron de uso: `/api/finance/master-agreements/[id]/signature-requests`
- Asset storage para PDFs firmados: `storeSystemGeneratedPrivateAsset`
- Secret Manager config: `ZAPSIGN_API_TOKEN`, `ZAPSIGN_WEBHOOK_SHARED_SECRET`, `ZAPSIGN_API_BASE_URL`
- PDF cache de cotizaciones: `getOrCreateQuotePdfBuffer` (TASK-631 Fase 4)
- Schema `quotations` + `quotation_versions` (modelo header + snapshots)

### Gap

- No existe modelo de signers bilaterales para quotes (firmante/refrendario)
- Webhook handler asume aggregate=MSA, no rutea por tipo
- No hay columnas `signature_*` en `quotations` (politica) ni tabla `quotation_signature_signers` (signers materializados)
- No hay UI para toggle + configuracion de signers en form de creacion ni en drawer
- No hay eventos outbox `commercial.quote.signature_*` registrados

## Scope

### Slice 1 — Schema (0.5 dia)

Migracion node-pg-migrate:

```sql
ALTER TABLE greenhouse_commercial.quotations
  -- Politica (editable per-version)
  ADD COLUMN signature_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN signature_requires_client_signers boolean NOT NULL DEFAULT true,
  ADD COLUMN signature_requires_efeonce_countersigners boolean NOT NULL DEFAULT true,
  ADD COLUMN signature_min_client_signers int NOT NULL DEFAULT 1
    CHECK (signature_min_client_signers >= 0),
  ADD COLUMN signature_min_efeonce_countersigners int NOT NULL DEFAULT 1
    CHECK (signature_min_efeonce_countersigners >= 0),
  ADD COLUMN signature_order_active boolean NOT NULL DEFAULT true,

  -- Estado runtime
  ADD COLUMN esignature_provider text
    CHECK (esignature_provider IS NULL OR esignature_provider IN ('zapsign','docusign','adobe_sign')),
  ADD COLUMN esignature_document_token text,
  ADD COLUMN esignature_status text
    CHECK (esignature_status IS NULL OR esignature_status IN
      ('not_required','draft','pending_client','pending_countersign','signed','declined','voided','expired','cancelled')),
  ADD COLUMN esignature_sent_at timestamptz,
  ADD COLUMN esignature_completed_at timestamptz,
  ADD COLUMN esignature_signed_asset_id uuid REFERENCES greenhouse_core.assets(asset_id);

CREATE UNIQUE INDEX quotations_esignature_token_uniq
  ON greenhouse_commercial.quotations (esignature_document_token)
  WHERE esignature_document_token IS NOT NULL;

CREATE TABLE greenhouse_commercial.quotation_signature_signers (
  signer_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id        text NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE CASCADE,
  version_number      int  NOT NULL,
  signer_role         text NOT NULL
    CHECK (signer_role IN ('client_signer','efeonce_countersigner','observer')),
  order_group         int  NOT NULL,
  full_name           text NOT NULL,
  email               text NOT NULL,
  phone_country       text,
  phone_number        text,
  qualification       text,
  contact_id          text,
  member_id           text,
  zapsign_signer_token text,
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','viewed','signed','declined','expired')),
  signed_at           timestamptz,
  signed_ip           text,
  decline_reason      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quotation_signature_signers_quote_idx
  ON greenhouse_commercial.quotation_signature_signers (quotation_id, version_number);
CREATE INDEX quotation_signature_signers_token_idx
  ON greenhouse_commercial.quotation_signature_signers (zapsign_signer_token);
```

Regenerar `src/types/db.d.ts` con `pnpm db:generate-types`.

### Slice 2 — Backend store + endpoint creacion (1.5 dias)

`src/lib/finance/quotations/signature-store.ts`:

- `getQuoteSignaturePolicy(quotationId, versionNumber)` — lee politica vigente
- `getQuoteBySignatureDocumentToken(token)` — lookup para webhook
- `createQuoteSignatureRequest({...})` — INSERT signers + UPDATE quote a `pending_client`
- `syncQuoteSignatureFromZapsign({quotationId, payload})` — actualiza estado de signers + deriva estado agregado de la quote
- `cancelQuoteSignatureRequest(quotationId, actorUserId)` — pasa a `cancelled`, libera la quote para edicion

`src/lib/finance/quotations/signature-policy.ts`:

- `derivePolicyDefaults({organizationId, businessLineCode})` — pre-poblar firmantes + refrendarios
- `validateSigners({clientSigners, efeonceCountersigners, policy})` — valida cantidad minima + roles
- `deriveSignatureStatus(signers[])` — `pending_client` / `pending_countersign` / `signed` / `declined`

`src/app/api/finance/quotes/[id]/signature-requests/route.ts`:

- `GET` — devuelve estado actual + signers
- `POST` — body con signers, valida politica, llama `createZapSignDocument`, persiste signers + token, emite evento `commercial.quote.signature_requested`

`src/app/api/finance/quotes/[id]/signature-requests/cancel/route.ts`:

- `POST` — solo si estado en `pending_*`, llama `cancelZapSignDocument` (futuro), pasa a `cancelled`, emite evento

### Slice 3 — Webhook refactor a dispatcher (0.5 dia)

`src/app/api/webhooks/zapsign/route.ts`:

- Detectar tipo de aggregate via `metadata.aggregate_type` o `external_id` prefix (`msa:` vs `quote:`)
- Rutear a MSA store o quote store
- Backwards compatible — MSAs sin `metadata.aggregate_type` siguen funcionando

### Slice 4 — Endpoints de quote create / version (0.5 dia)

`src/app/api/finance/quotes/route.ts` (POST):

- Aceptar `signaturePolicy?: { enabled, requiresClientSigners, requiresEfeonceCountersigners, minClientSigners, minEfeonceCountersigners, orderActive }`
- Default si omitido: `{ enabled: false }`

`src/app/api/finance/quotes/[id]/versions/route.ts` (POST):

- Bloquear si vigente esta en `pending_client | pending_countersign | signed`
- Heredar politica de version anterior por default
- Override via body opcional

### Slice 5 — UI (1.5 dias)

> **Nota arquitectonica importante:** Greenhouse NO captura la firma del usuario. ZapSign provee la UI hosted donde el firmante elige metodo (dibujar con mouse/touch, escribir nombre con estilos cursive preset, subir imagen escaneada, OTP, selfie). El sales rep solo configura el envelope desde Greenhouse (quien firma, con que nivel de auth). Por eso **no se necesitan librerias de captura de firma** (`react-signature-canvas`, `signature_pad`, etc.). Reuso 100% de la UI hosted de ZapSign.

Stack UI (todo ya en el repo):

- `react-hook-form` para validacion de forms del modal de signer
- `react-datepicker` (envuelto en `GreenhouseDatePicker`) para `dateLimitToSign`
- MUI Drawer + Dialog
- `CustomTextField`, `CustomChip`, `CustomAvatar` (Vuexy wrappers)

Selector de metodo de firma per-signer (mapea a `ZapSignSignerInput.authMode`):

| Opcion UI | Valor ZapSign | Uso tipico |
| --- | --- | --- |
| "Estandar (firma manuscrita o escrita)" | `assinaturaTela` (default) | B2B normal, monto bajo-medio |
| "Reforzada con OTP email" | `token-email` | Monto medio-alto, sin telefono |
| "Reforzada con OTP SMS" | `sms` | Monto alto, telefono confirmado |
| "Reforzada con OTP WhatsApp" | `whatsapp` | Monto alto, contacto WhatsApp confirmado |
| "Maxima (selfie + biometria facial)" | `facial-biometrics` | Solo si cliente lo exige (premium ZapSign, costo extra) |

Toggle adicional per-signer: "Enviar tambien por WhatsApp" (`sendAutomaticWhatsapp`) — diferenciador LATAM.

`QuoteCreationForm.tsx`:

- Seccion "Firma electronica (opcional)" colapsable
- Toggle `signature_enabled` (off por default)
- Si on: 2 checkboxes (`requires_client_signers`, `requires_efeonce_countersigners`) + sliders de minimo + checkbox de orden secuencial
- Texto helper: "Los firmantes y refrendarios concretos se agregan al enviar a firma"

`QuoteShareDrawer.tsx`:

- Seccion nueva "Firma electronica" debajo del envio email
- Si `signature_enabled=false`: link "Activar firma para esta version" (solo si quote no esta locked)
- Si `signature_enabled=true` y estado = `not_required | draft`:
  - 2 listas editables (firmantes + refrendarios) con defaults pre-poblados
  - Boton "Enviar a firma ZapSign"
- Si estado en `pending_*`: read-only con lista de signers + estado individual + boton "Cancelar firma"
- Si estado = `signed`: link a PDF firmado + lista de signers con timestamps

`QuoteDetailView.tsx`:

- Chip de estado de firma en header de la quote (colores segun tabla del Delta v1.6)
- Link a PDF firmado cuando exista

### Slice 6 — Eventos outbox (0.5 dia)

Registrar 4 eventos nuevos en `commercial_outbox`:

- `commercial.quote.signature_requested`
- `commercial.quote.signed_by_client` (todos los `client_signer` firmaron)
- `commercial.quote.countersigned_by_efeonce` (todos los `efeonce_countersigner` firmaron — contrato cerrado)
- `commercial.quote.signature_declined`

Documentar en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.

### Slice 7 — Tests + smoke E2E (1 dia)

Tests unitarios:

- `signature-policy.test.ts` — validacion de signers + derivacion de status
- `signature-store.test.ts` — state transitions + idempotency del webhook
- `webhook-dispatcher.test.ts` — routing por aggregate_type

Smoke E2E con cuenta ZapSign de staging:

- Crear quote v1 con firma activada
- Enviar a ZapSign → recibir email → firmar como cliente
- Verificar que estado pasa a `pending_countersign`
- Refrendar como Efeonce → estado pasa a `signed`
- Verificar PDF firmado descargable + chip verde + evento outbox

## Out of Scope

- Provider DocuSign / Adobe Sign (interface preparada, no implementada)
- TASK-490 signature orchestration foundation (agregado neutro per-domain) — se hace cuando aparezca el 3er dominio
- Amendment de quote firmada (TASK-628)
- Multi-language email templates de ZapSign (usa default ZapSign por ahora)
- Tabla `business_line_signature_policy` para mandatorios automaticos por BU (futuro)
- WhatsApp + SMS auth modes (solo `assinaturaTela` + email en Fase 1; otros modes vienen on-demand)

## Acceptance Criteria

- [ ] migracion aplicada en dev/staging/prod sin downtime
- [ ] toggle `signature_enabled` visible en form de creacion de quote v1
- [ ] toggle editable en versiones siguientes mientras estado runtime no este `pending_*` o `signed`
- [ ] enviar a ZapSign con firmantes + refrendarios resulta en envelope creado con `order_group=1` para cliente y `order_group=2` para Efeonce
- [ ] webhook recibe `signed` evento del cliente → estado pasa a `pending_countersign`
- [ ] webhook recibe `signed` evento del refrendario → estado pasa a `signed` + PDF firmado persiste en GCS
- [ ] quote firmada bloquea edicion (UI + backend retorna 409)
- [ ] cancelar firma libera la quote para edicion + emite evento
- [ ] webhook es idempotente — replay del mismo payload no duplica state
- [ ] eventos outbox emitidos en cada transicion (4 eventos del catalogo)
- [ ] chip de estado visible en QuoteDetailView con color correcto
- [ ] PDF firmado descargable con permisos correctos (Finance Admin + Sales Rep dueno de la quote)

## Verification

- `pnpm migrate:status` → migracion aplicada sin pendientes
- `pnpm db:generate-types` → tipos regenerados
- `pnpm tsc --noEmit` clean
- `pnpm lint` clean
- `pnpm test` → tests nuevos passing + suite full passing
- `pnpm build` clean
- Smoke E2E con cuenta ZapSign de staging documentado en `Handoff.md`

## Decisions Cerradas (segun conversacion 2026-04-25)

| # | Decision | Resolucion |
| --- | --- | --- |
| 1 | Camino corto (sin TASK-490) o largo (con agregado neutro) | **Corto** — replicar patron MSA, TASK-490 cuando aparezca 3er dominio |
| 2 | Firmante obligatorio del lado Efeonce | Sales rep que creo la quote (default), editable |
| 3 | SMS/WhatsApp ademas de email | No en Fase 1, solo `assinaturaTela` + email |
| 4 | PDF firmado convive o reemplaza original | **Convive** — original = oferta, signed = ejecutado |
| 5 | Quote firmada bloquea edicion | **Si**, requiere amendment (TASK-628) |
| 6 | Modelo bilateral firmante/refrendario | **Si** — `client_signer` (`order_group=1`) + `efeonce_countersigner` (`order_group=2`) |
| 7 | Firma 100% opcional | **Si** — `signature_enabled=false` por default |
| 8 | Capacidad disponible desde v1 | **Si** — toggle en form de creacion |
| 9 | Politica heredada per-version con override | **Si** |
| 10 | Lock al pasar a `pending_client` | **Pendiente confirmacion final del owner** (recomendado: si) |

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados (`to-do/` -> `in-progress/` -> `complete/`)
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con smoke E2E + screenshots
- [ ] `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` actualizado con Delta cerrando P2.1
- [ ] `docs/documentation/finance/cotizaciones-gobernanza.md` actualizado con flujo de firma
- [ ] `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` actualizado con 4 eventos nuevos
