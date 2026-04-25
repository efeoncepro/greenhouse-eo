# TASK-552 — Multi-Currency Quote Output Follow-ups (Email + Bidirectional FX + Locked Rates + Line History + Drift Alerts + Client Portal)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui + platform`
- Blocked by: `none` (TASK-485 solo condiciona el rollout auto-synced de CLF/COP/MXN/PEN para el Slice 6 cuando el cliente sea LatAm)
- Branch: `task/TASK-552-multi-currency-quote-output-followups`
- Legacy ID: `follow-up de TASK-466`
- GitHub Issue: `none`

## Summary

Cerrar los 6 items que quedaron fuera del V1 de TASK-466 — uno cubierto a medias (email outbound client-facing) y cinco declarados out-of-scope explícito (payment currency bidireccional, negotiated FX lock por organización, snapshot FX a nivel línea, FX drift alerts >5%, client portal multi-moneda). Consume la foundation ya shipped (`QuotationFxSnapshot`, `evaluateQuotationFxReadinessGate`, endpoint `fx-snapshot`, PDF footer) sin reabrir decisiones pinned.

## Why This Task Exists

TASK-466 convergió el contrato canónico `currency + exchange_rates + exchange_snapshot_date` y entregó gating + PDF + review toggle, pero dejó 6 items que la arquitectura necesita para cerrar el loop end-to-end:

1. **El email outbound nunca se envía**. El endpoint `/send` de TASK-466 es un wrapper legacy que solo cambia el estado a `issued`. No existe `QuotationSendEmail.tsx` ni pipeline Resend para quotations. El AE hoy tiene que copiar el PDF manualmente al correo que arma en su cliente de mail. El `QuoteSendDialog` ya muestra "la cotización pasará a estado Emitida" pero el cliente final no recibe nada automático.
2. **El cliente no siempre paga en la moneda que ve**. Una quote emitida en MXN que el cliente paga en USD rompe el reconcile en `income` (el snapshot FX es al send, pero el pago ocurre en otro momento y otra moneda). Hoy no hay modelo para separar `output_currency` (lo que ve el cliente) de `payment_currency` (lo que liquida el banco).
3. **Clientes enterprise negocian rate fija**. Pinturas Berel ya pidió emitir siempre MXN a un rate negociado independiente del mercado. El resolver canónico no tiene hook para consultar overrides antes de ir a la tabla FX master.
4. **El snapshot FX quote-level pierde granularidad**. El pricing engine ya produce cost breakdown multi-moneda (tool USD + overhead CLP en la misma línea). Al congelar a nivel quote el auditor no puede reconstruir por qué cada línea quedó en X.
5. **No hay detector de drift**. Si la tasa cambia >5% entre que el AE crea la quote en draft y la emite, nadie avisa. El AE puede estar enviando un pricing obsoleto sin saberlo.
6. **El cliente interno tiene toggle, el cliente final no tiene nada**. `QuoteDetailView` es internal (finance/admin). El portal cliente (`(dashboard)/my/`) no tiene surface de quotes. Cuando se habilite, debe respetar la moneda del snapshot (no el default CLP del resto del portal).

## Goal

- `POST /api/finance/quotes/[id]/send` envía email real al cliente con PDF adjunto (o link firmado al PDF), trackeado en `greenhouse_notifications.email_deliveries` como el resto del portal
- `quotations.payment_currency` modelado como campo separado y resolver FX al momento del payment, con reconcile en `income.fx_gain_loss_clp`
- Tabla `greenhouse_commercial.organization_fx_rate_overrides` con governance (approver + effective range) consumida por una capa previa al `resolveFxReadiness`
- `quotation_line_items.line_fx_snapshot` (JSONB) persistido por línea para auditor y cost breakdown multi-moneda
- Detector reactivo `commercial.quotation.fx_drift_detected` que compara tasa al `draft.updated_at` vs tasa al `issue` y advierte en `QuoteSendDialog` si delta >5%
- Client portal con `/my/quotes` y `/my/quotes/[id]` que renderiza siempre en la moneda del snapshot de la quote (no CLP default)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (para el flujo Resend + webhook de delivery)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (para el evento nuevo `commercial.quotation.fx_drift_detected`)
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (capability nueva para gobernar `organization_fx_rate_overrides`)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **No reabrir decisiones pinned de TASK-466**: el contrato sigue siendo `currency + exchange_rates + exchange_snapshot_date`. No se introduce `output_currency` paralela. El nuevo `payment_currency` (Slice 2) es una dimensión adicional, no un reemplazo del campo `currency`.
- **Reutilizar `QuotationFxSnapshot`**: el shape canónico en `src/lib/finance/quotation-fx-snapshot.ts` es la fuente de verdad. El Slice 4 (line-level) usa exactamente el mismo shape por línea; no define otro formato.
- **Reutilizar `evaluateQuotationFxReadinessGate`**: el gate client-facing es el punto de entrada único para decisiones de política. El Slice 3 (overrides) se enchufa ANTES del resolver, no después, para que el gate siga operando sobre el mismo contrato.
- **Email tracking obligatorio vía `email_deliveries`**: el Slice 1 usa `src/lib/email/delivery.ts` como tracker canónico. No escribir a la tabla directamente ni crear un pipeline paralelo.
- **Client portal respeta tenant scope `client`**: el Slice 6 aplica `requireClientTenantContext` y filtra por `organization_id` (no `space_id`). No reutilizar las surfaces internas de finance — son internas por diseño.
- **Outbox event catalog**: el Slice 5 emite `commercial.quotation.fx_drift_detected`. Debe registrarse en `GREENHOUSE_EVENT_CATALOG_V1.md` y consumirlo via outbox (no inline).

## Normative Docs

- TASK-466 (cerrada) — `docs/tasks/complete/TASK-466-multi-currency-quote-output.md` para contrato FX + snapshot
- TASK-475 (cerrada) — foundation FX platform
- TASK-485 (to-do) — rollout auto_synced CLF/COP/MXN/PEN (bloquea solo el Slice 6 si el cliente LatAm del portal abre antes)
- TASK-524 — invoice/income bridge con HubSpot (Slice 2 necesita coordinarse: `payment_currency` se refleja en `income`)
- TASK-482 — quoted vs actual margin feedback loop (Slice 5 emite el evento que ese feedback loop puede consumir como input de calibración)

## Dependencies & Impact

### Depends on

- TASK-466 ✅ (cerrada 2026-04-20, merge `3507ef60` en develop) — proveé `QuotationFxSnapshot`, `evaluateQuotationFxReadinessGate`, endpoint `fx-snapshot`, PDF footer, QuoteSendDialog readiness hooks
- `greenhouse_commercial.quotations.currency` CHECK expandido a 6 monedas — migración `20260421011323497` **debe estar aplicada en staging/prod antes de tomar esta task** (`pnpm pg:connect:migrate`). Sin eso, Slice 2 falla al tratar de persistir `payment_currency` en monedas nuevas.
- `src/lib/finance/quotation-fx-snapshot.ts` — fuente de verdad del shape canónico
- `src/lib/finance/quotation-fx-readiness-gate.ts` — policy gate
- `src/lib/email/delivery.ts` — tracker canónico de `email_deliveries`
- `src/lib/resend.ts` (hardened por Codex 2026-04-20 con lifecycle timestamps) — provider
- Templates existentes en `src/emails/` (ej. `LeaveRequestDecisionEmail.tsx`, `InvitationEmail.tsx`) como patrón de referencia
- TASK-485 (solo para Slice 6 si el portal abre para clientes LatAm antes del flip `auto_synced`)

### Blocks / Impacts

- **TASK-524** (invoice/income bridge HubSpot) — Slice 2 (`payment_currency`) cambia el shape que `income` debe heredar. Coordinar el orden de merge.
- **TASK-462** (MRR/ARR reporting) — Slice 4 (line-level FX history) cambia la granularidad de los agregadores. El reader debe preferir `line_fx_snapshot` cuando existe y fallback al quote-level.
- **TASK-482** (feedback loop quoted vs actual) — Slice 5 (drift alert) es input adicional para el feedback loop.
- **TASK-344** [verificar] (si existe HubSpot quote sync) — Slice 1 (email outbound) puede querer notificar al deal en HubSpot cuando el email se envía.

### Files owned

Slice 1 — Email outbound:
- `src/emails/QuotationIssuedEmail.tsx` (nuevo)
- `src/lib/commercial/quotation-send-email.ts` (nuevo, orchestrator + render + attach PDF)
- `src/app/api/finance/quotes/[id]/send/route.ts` (modificar — hoy es wrapper legacy; implementar el envío real manteniendo el backward-compat con `issue`)
- `src/config/greenhouse-nomenclature.ts` (claves nuevas en `GH_PRICING.sendEmail.*` para copy)

Slice 2 — Payment currency:
- `migrations/YYYYMMDD_task-552-quotation-payment-currency.sql` (nuevo)
- `src/lib/commercial/quotation-canonical-store.ts` [verificar] (reader + writer)
- `src/app/api/finance/quotes/route.ts` + `/[id]/route.ts` (POST + PATCH aceptan `paymentCurrency`)
- `src/lib/finance/quote-to-cash/quote-to-cash-choreography.ts` [verificar] (propagar `payment_currency` a `income`)
- `src/types/db.d.ts` (regenerado por migrate:up)

Slice 3 — Organization FX rate overrides:
- `migrations/YYYYMMDD_task-552-organization-fx-overrides.sql` (nuevo)
- `src/lib/finance/organization-fx-overrides.ts` (nuevo, reader + writer + governance)
- `src/lib/finance/fx-readiness.ts` (modificar — capa previa que consulta overrides antes del resolver canónico)
- `src/app/api/admin/organizations/[id]/fx-overrides/route.ts` (nuevo, CRUD gated por `canManageOrganizationFxOverrides`)
- `src/config/capability-registry.ts` [verificar] (nueva capability)

Slice 4 — Line-level FX history:
- `migrations/YYYYMMDD_task-552-line-fx-snapshot.sql` (nuevo — ADD COLUMN `line_fx_snapshot jsonb`)
- `src/lib/commercial/quotation-issuance.ts` (extender para llenar `line_fx_snapshot` por línea)
- `src/lib/finance/quotation-fx-snapshot.ts` (exportar `buildLineFxSnapshot` reutilizando el mismo shape)

Slice 5 — FX drift alerts:
- `src/lib/commercial/quotation-fx-drift-detector.ts` (nuevo, comparador puro)
- `src/lib/commercial/quotation-events.ts` (nuevo evento `publishQuotationFxDriftDetected`)
- `src/lib/commercial/quotation-issue-command.ts` (emitir drift si delta >5%)
- `src/views/greenhouse/finance/workspace/QuoteSendDialog.tsx` (mostrar alert de drift cuando aplica)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (registrar evento)

Slice 6 — Client portal:
- `src/app/(dashboard)/my/quotes/page.tsx` (nuevo)
- `src/app/(dashboard)/my/quotes/[id]/page.tsx` (nuevo)
- `src/app/api/my/quotes/route.ts` (nuevo — list filtered by `organization_id` del tenant client)
- `src/app/api/my/quotes/[id]/route.ts` (nuevo — detail read-only)
- `src/app/api/my/quotes/[id]/pdf/route.ts` (nuevo — reusa `renderQuotationPdf` con tenant client scope)
- `src/views/greenhouse/my/MyQuotesListView.tsx` (nuevo)
- `src/views/greenhouse/my/MyQuoteDetailView.tsx` (nuevo — SIN toggle interno USD/cliente; siempre moneda cliente)

## Current Repo State

### Already exists

- `QuotationFxSnapshot` canónico (`src/lib/finance/quotation-fx-snapshot.ts`) — shape reutilizable para Slice 4 por línea
- `evaluateQuotationFxReadinessGate` (`src/lib/finance/quotation-fx-readiness-gate.ts`) — policy gate importable client + server
- Endpoint read-only `GET /api/finance/quotes/[id]/fx-snapshot` — Slice 6 lo consume desde el portal cliente
- Endpoint `GET /api/finance/exchange-rates/readiness` — resolver central, Slice 3 se enchufa antes de esto
- `finalizeQuotationIssued` escribe snapshot quote-level (`src/lib/commercial/quotation-issuance.ts`) — Slice 4 extiende para llenar line-level
- PDF footer FX (`src/lib/finance/pdf/quotation-pdf-document.tsx`) — Slice 1 reutiliza el PDF completo como attach
- `QuoteSendDialog` con FX readiness alerts (`src/views/greenhouse/finance/workspace/QuoteSendDialog.tsx`) — Slice 5 agrega alert de drift; Slice 1 cambia el copy de confirmación para decir "se enviará por correo a <contacto>"
- Resend pipeline hardened (`src/lib/resend.ts`) con webhook lifecycle timestamps (`delivered_at`, `bounced_at`, `complained_at`) — Slice 1 reutiliza sin modificar
- `src/lib/email/delivery.ts` — tracker canónico `email_deliveries` con insert + update
- Templates de ejemplo (`src/emails/LeaveRequestDecisionEmail.tsx`, `InvitationEmail.tsx`) — Slice 1 replica el patrón
- `QuoteDetailView` con toggle internal USD/moneda cliente — Slice 6 NO reutiliza (es internal); crea surface cliente separada

### Gap

- No existe template `QuotationIssuedEmail.tsx` ni orchestrator para el send real. `/send` hoy solo invoca `requestQuotationIssue`.
- `quotations.payment_currency` no modelado. `income.currency` se infiere del snapshot quote-level hoy.
- No existe `organization_fx_rate_overrides` ni capability asociada. Negotiated rates se manejan hoy fuera del sistema.
- `quotation_line_items` no tiene columna `line_fx_snapshot`. El snapshot vive solo a nivel quote.
- No hay detector de drift FX entre draft → issue. El gate ya existe pero solo evalúa readiness al momento del issue, no delta temporal.
- No existe `/my/quotes` en el portal cliente. `QuoteDetailView` es internal; `requireClientTenantContext` no tiene surface de cotizaciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Quote outbound email template + pipeline real

- `src/emails/QuotationIssuedEmail.tsx` con `@react-email/components`: header con branding Efeonce, subject dinámico `"Cotización {quotationNumber} — Efeonce"`, body con monto en moneda del snapshot (usa `fxSnapshot.outputCurrency` + `fxSnapshot.rate` del contrato canónico), footer con disclaimer FX cuando `composedViaUsd` o `outputCurrency !== 'USD'`, link firmado al PDF (o adjunto en base64).
- Orchestrator `src/lib/commercial/quotation-send-email.ts`:
  - Lee la quote + snapshot + PDF desde `render-quotation-pdf.ts`
  - Resuelve destinatario desde `contact_identity_profile_id` de la quotation (si existe); fallback a email del organization primary contact
  - Llama `resend.emails.send` con template + attachments
  - Inserta fila en `email_deliveries` con `source_entity='quotation'`, `source_entity_id=quotationId`, `subject`, `resend_id`
- `src/app/api/finance/quotes/[id]/send/route.ts`: implementar el envío real post-`finalizeQuotationIssued`. Si el issue queda en `pending_approval`, NO envía email (espera approval). Si queda en `issued`, envía inmediatamente. El response incluye `{ issued, emailDelivery: { id, status } | null }`.
- `QuoteSendDialog`: copy de confirmación actualizado — "La cotización se enviará por correo a {contacto}. Podrás trackear el estado desde Audit." (usar `greenhouse-ux-writing` para copy final).
- `GH_PRICING.sendEmail.*` keys nuevas en nomenclature.

### Slice 2 — Bidirectional payment currency

- Migración que agrega `quotations.payment_currency text NULL` con CHECK contra el mismo set de 6 monedas `pricing_output`. Si es NULL, fallback a `currency` (backward-compat para quotes pre-migration).
- Extender `POST /api/finance/quotes` y `PATCH /api/finance/quotes/[id]` para aceptar `paymentCurrency?`.
- Extender `QuoteBuilderActions` / `QuoteContextStrip` [verificar] con un selector secundario "Moneda de pago" (collapsed por default; expandible cuando el AE marca "Cliente paga en otra moneda").
- `quote-to-cash-choreography` [verificar]: cuando la quote se convierte en `income`, `income.currency = payment_currency ?? currency`. El reconcile de `fx_gain_loss_clp` compara `payment_currency` vs `currency` al rate del momento del payment (NO del snapshot quote).
- `QuoteDetailView.QuoteCurrencyView`: si `payment_currency !== currency`, mostrar badge "Cliente paga en {paymentCurrency}" junto al snapshot quote-level.

### Slice 3 — Organization FX rate overrides (negotiated rates)

- Migración que crea `greenhouse_commercial.organization_fx_rate_overrides`:
  ```
  override_id text PK
  organization_id text NOT NULL FK → greenhouse_core.organizations
  from_currency text NOT NULL (CHECK contra 6 monedas)
  to_currency text NOT NULL (CHECK contra 6 monedas)
  rate numeric(14,6) NOT NULL (>0)
  effective_from date NOT NULL
  effective_until date NULL
  negotiated_by text NOT NULL (actor that approved)
  notes text NULL
  created_at timestamptz, updated_at timestamptz
  UNIQUE (organization_id, from_currency, to_currency, effective_from)
  ```
- `src/lib/finance/organization-fx-overrides.ts`: reader `resolveOrganizationFxOverride(organizationId, from, to, refDate)` devuelve `{rate, effectiveFrom, source: 'negotiated_override'}` o null.
- Modificar `src/lib/finance/fx-readiness.ts`: aceptar `organizationId?` opcional. Si presente, consulta override ANTES del lookup canónico. Si hay override válido, devuelve `FxReadiness` con `source='negotiated_override'` y `state='supported'`.
- `POST /api/finance/quotes/[id]/issue` y `/send`: pasar `organizationId` al resolver.
- CRUD admin en `/admin/organizations/[id]/fx-overrides` (lista + create + archive). Gated por capability nueva `canManageOrganizationFxOverrides` (efeonce_admin + finance_admin).
- `QuoteCurrencyView`: si `snapshot.source === 'negotiated_override'`, chip especial "Tasa negociada" (color primary, distinto de "derivada vía USD").

### Slice 4 — Line-level FX snapshot

- Migración que agrega `quotation_line_items.line_fx_snapshot jsonb NULL`.
- `finalizeQuotationIssued`: además de escribir `quotations.exchange_rates.__snapshot`, iterar las líneas de la versión actual y escribir `line_fx_snapshot` por línea. Por defecto copia el snapshot quote-level. Cuando el pricing engine v2 produzca cost breakdown multi-moneda (ej. tool USD + overhead CLP), construye un snapshot por línea con las 2 tasas relevantes.
- `buildLineFxSnapshot` exportado desde `quotation-fx-snapshot.ts` — shape idéntico a `QuotationFxSnapshot` pero permite múltiples rates en `extraRates: Record<Currency, RateEntry>`.
- `src/app/api/finance/quotes/[id]/lines/route.ts` [verificar]: response incluye `lineFxSnapshot` por línea.
- `QuoteDetailView` tabla de líneas: tooltip en cada subtotal que muestra el `line_fx_snapshot.source` y rate usado si difiere del quote-level.

### Slice 5 — FX drift alerts (>5% change draft → issue)

- Comparador puro `src/lib/commercial/quotation-fx-drift-detector.ts`:
  ```
  detectFxDrift({ draftSnapshotRate, currentReadiness, thresholdPct = 5 })
    → { detected: boolean, deltaPct: number, direction: 'appreciation' | 'depreciation', severity: 'info' | 'warning' | 'critical' }
  ```
- `requestQuotationIssue`: ANTES de construir el snapshot nuevo, lee `quotations.exchange_rates.__snapshot.rate` previo (si existe, de un draft save previo). Compara con la nueva readiness. Si delta >5%, emite `publishQuotationFxDriftDetected` a outbox y registra en audit.
- `QuoteSendDialog`: si el issue fue bloqueado por drift (nuevo severity='critical' cuando delta >10%), mostrar confirmación explícita. Si severity='warning' (5-10%), Alert informativa no bloqueante.
- Registrar evento `commercial.quotation.fx_drift_detected` en `GREENHOUSE_EVENT_CATALOG_V1.md` con shape:
  ```
  { quotationId, versionNumber, fromRate, toRate, deltaPct, direction, detectedAt }
  ```
- Follow-up (NO parte de este slice): que TASK-482 consuma el evento para calibración del feedback loop.

### Slice 6 — Client portal /my/quotes

- Nuevo route group surface en `(dashboard)/my/quotes/`:
  - `page.tsx` → `MyQuotesListView.tsx` — lista de quotes del `organization_id` del tenant client. Columnas: número, fecha, total en moneda del snapshot, estado (traducido: "Emitida" / "Vencida" / "Facturada"). NO mostrar health, margin, ni nada internal.
  - `[id]/page.tsx` → `MyQuoteDetailView.tsx` — detail read-only, SIN toggle USD (cliente solo ve su moneda). Muestra items, totales, términos, download PDF. Sin historia de versiones ni audit ni approval steps.
- API routes bajo `/api/my/quotes/`:
  - `GET /api/my/quotes` — lista filtrada por `tenant.organizationIds` (reutilizar `requireClientTenantContext` + nuevo helper `resolveClientTenantOrganizationIds`). Devuelve subset de campos (no margin, no cost).
  - `GET /api/my/quotes/[id]` — detail con mismo filtro, shape safe-for-client.
  - `GET /api/my/quotes/[id]/pdf` — reutiliza `renderQuotationPdf` con snapshot congelado.
- `GH_CLIENT_NAV` [verificar] actualizado para incluir "Cotizaciones".
- Copy en español Latam (tuteo) consistente con resto del portal cliente.

## Out of Scope

- Lock rate por cliente a nivel **contrato** (MSA/SOW) en lugar de organization — si se necesita, es TASK separada.
- Cliente paga en moneda distinta y se reconcilia contra **cuentas bancarias multi-moneda** — requiere extender `fin_accounts` con `currency_hedging`, fuera de este scope.
- Aprobación de `organization_fx_rate_overrides` vía maker-checker queue (como pricing catalog) — V1 es CRUD directo gated por capability restrictiva. Upgrading a queue es follow-up.
- Cliente puede aceptar/rechazar la quote desde `/my/quotes/[id]` — es solo view-only. El "aceptar" vive en email (link firmado fuera del portal) o en negociación externa. Aceptación in-portal es otra task.
- HubSpot sync del email delivery status (ej. abrir tarea cuando el cliente abre el email) — follow-up en el lane HubSpot bridge.
- Multi-language del email outbound (hoy es español por contrato Greenhouse). Inglés queda como follow-up cuando haya cliente US/intl explícito.
- Payment currency a nivel **línea** — granularidad solo a nivel quote en este V1.
- Historial de cambios del organization FX override (audit trail dedicado) — follow-up.

## Detailed Spec

### Slice 1 — Detalle del pipeline de email

**Template file**: `src/emails/QuotationIssuedEmail.tsx`

Props:
```ts
interface QuotationIssuedEmailProps {
  quotationNumber: string
  clientName: string
  totalAmount: number
  outputCurrency: string
  fxFooter?: { baseCurrency: string; rate: number; rateDateResolved: string | null; source: string | null; composedViaUsd: boolean } | null
  validUntil: string | null
  pdfUrl: string | null // link firmado si no hay attach inline
  senderName: string
  senderEmail: string // footer contact
}
```

Secciones del template (inspirado en `LeaveRequestDecisionEmail.tsx`):
1. Header con logo Efeonce
2. Greeting: "Hola {clientName},"
3. Body: "Adjuntamos la cotización {quotationNumber} por {formatCurrency(totalAmount, outputCurrency)}."
4. FX note (condicional): bloque con rate + fecha + fuente si `fxFooter` present
5. CTA: button "Ver cotización" linkeando a `pdfUrl`
6. Footer: "Válida hasta {validUntil}" + contacto + disclaimer legal

**Orchestrator**: `src/lib/commercial/quotation-send-email.ts`

```ts
export const sendQuotationIssuedEmail = async ({
  quotationId,
  tenant,
  client
}: SendQuotationIssuedEmailInput): Promise<{ deliveryId: string; status: 'sent' | 'skipped' }> => {
  // 1. Resolver destinatario (contact_identity_profile_id → primary contact de organization → fallback configurable)
  // 2. Fetch snapshot + render PDF a buffer
  // 3. Render template con props del snapshot
  // 4. Subir PDF a storage (assets) y generar signed URL con expiry
  // 5. Llamar resend.emails.send con subject, react, attachments
  // 6. Insertar email_deliveries con status='sent', resend_id, source_entity='quotation', source_entity_id=quotationId
  // 7. Retornar { deliveryId, status }
}
```

**Error handling**:
- Si no hay destinatario → status='skipped', no throw. Audit: "email_delivery_skipped: no recipient available".
- Si Resend falla → email_deliveries.status='failed'. Retry reactivo via existing `src/lib/notifications/` [verificar] como el resto del portal.

### Slice 2 — Payment currency detailed

Migración `quotation-payment-currency.sql`:

```sql
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN payment_currency text NULL
  CHECK (
    payment_currency IS NULL OR payment_currency = ANY (
      ARRAY['CLP'::text, 'USD'::text, 'CLF'::text, 'COP'::text, 'MXN'::text, 'PEN'::text]
    )
  );
```

Semantic:
- `payment_currency IS NULL` → cliente paga en la misma moneda que ve (`= currency`). Caso default.
- `payment_currency != currency` → AE explicita que hay conversión en el payment. Se congela también al issue time dentro de `exchange_rates.__payment_snapshot` (separado del `__snapshot` output).

Income inheritance (coordinar con TASK-524):
- `income.currency = quotation.payment_currency ?? quotation.currency`
- `income.exchange_rate_to_clp` resuelto al momento del pago (no del send)
- `income.fx_gain_loss_clp = (income.amount * rate_at_payment) - (income.amount * rate_at_issue_snapshot)` cuando `payment_currency != currency`

### Slice 3 — Organization FX overrides governance

Schema:
```sql
CREATE TABLE greenhouse_commercial.organization_fx_rate_overrides (
  override_id text PRIMARY KEY DEFAULT ('ofx-' || gen_random_uuid()::text),
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  from_currency text NOT NULL CHECK (from_currency = ANY (ARRAY['CLP','USD','CLF','COP','MXN','PEN'])),
  to_currency text NOT NULL CHECK (to_currency = ANY (ARRAY['CLP','USD','CLF','COP','MXN','PEN'])),
  rate numeric(14,6) NOT NULL CHECK (rate > 0),
  effective_from date NOT NULL,
  effective_until date NULL,
  negotiated_by text NOT NULL,
  negotiated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ofx_pair_not_self CHECK (from_currency != to_currency),
  CONSTRAINT ofx_effective_range CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE UNIQUE INDEX ofx_unique_active
  ON greenhouse_commercial.organization_fx_rate_overrides (organization_id, from_currency, to_currency, effective_from);

CREATE INDEX ofx_lookup
  ON greenhouse_commercial.organization_fx_rate_overrides (organization_id, from_currency, to_currency, effective_from DESC);
```

Resolver integration:
- `resolveFxReadiness` acepta prop `organizationId?`.
- Si presente, ANTES del direct lookup canónico, consulta override activo para `(organizationId, from, to)` con `effective_from <= refDate AND (effective_until IS NULL OR effective_until >= refDate)`.
- Si hay override → devuelve `FxReadiness` con `rate, rateDateResolved=effective_from, source='negotiated_override'`, `state='supported'`, `composedViaUsd=false`.
- `evaluateQuotationFxReadinessGate` debe reconocer `source='negotiated_override'` y NO aplicar staleness check (las tasas negociadas no se vuelven stale por definición).

Capability:
- `canManageOrganizationFxOverrides` = `efeonce_admin` + `finance_admin` (restrictivo, alineado con otras surfaces de governance FX).

### Slice 4 — Line-level snapshot shape

Extender `QuotationFxSnapshot` con variant line-level:

```ts
export interface LineFxSnapshotEntry {
  currency: PlatformCurrency
  rate: number
  source: string | null
  composedViaUsd: boolean
  rateDateResolved: string | null
}

export interface QuotationLineFxSnapshot extends QuotationFxSnapshot {
  // Para líneas con breakdown multi-moneda (tool USD + overhead CLP):
  extraRates?: Record<string, LineFxSnapshotEntry>
}
```

Si `extraRates` vacío, el snapshot de línea = snapshot quote-level (caso 95%). Si el pricing engine produjo breakdown multi-moneda, llena `extraRates` con las tasas auxiliares.

### Slice 5 — Drift detector semantics

```ts
export interface FxDriftResult {
  detected: boolean
  deltaPct: number // signed; positive = appreciation of output vs base
  direction: 'appreciation' | 'depreciation' | 'stable'
  severity: 'info' | 'warning' | 'critical'
}

export const detectFxDrift = ({
  previousRate,
  currentRate,
  warningThresholdPct = 5,
  criticalThresholdPct = 10
}: DetectFxDriftInput): FxDriftResult => {
  const deltaPct = ((currentRate - previousRate) / previousRate) * 100
  const absDelta = Math.abs(deltaPct)
  // ...
}
```

### Slice 6 — Client portal surface constraints

- `requireClientTenantContext()` resuelve `tenant.tenantType === 'client'` y `tenant.routeGroups.includes('client')`.
- Helper nuevo `resolveClientTenantOrganizationIds(tenant)` [verificar si ya existe análogo]: devuelve las organizations que el client user tiene asociadas (via `person_memberships` o análogo).
- `GET /api/my/quotes` filtra `WHERE organization_id = ANY($organizationIds) AND status IN ('issued', 'expired', 'converted')` (NO draft ni pending_approval).
- Detail response: omite `effective_margin_pct`, `target_margin_pct`, `margin_floor_pct`, `total_cost`, `sales_context_at_sent`, `pricing_context` (todos internos). Incluye items con `label, description, quantity, unit, unit_price, subtotal` en moneda snapshot.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

Slice 1 (Email):
- [ ] `POST /api/finance/quotes/[id]/send` con status `issued` envía email real al contacto de la quotation
- [ ] `email_deliveries` tiene fila con `source_entity='quotation'`, `source_entity_id=<quotationId>`, `status='sent'` después del send
- [ ] El template `QuotationIssuedEmail` renderiza el total en la moneda del snapshot, no en CLP
- [ ] Si la quote va a `pending_approval`, NO se envía email (verificado)
- [ ] Admin UI de email deliveries muestra las nuevas filas con el source correcto

Slice 2 (Payment currency):
- [ ] `quotations.payment_currency` persistido como NULL por default
- [ ] Quote creada con `paymentCurrency='USD'` y `currency='MXN'` persiste ambos correctamente
- [ ] `income` generado desde esa quote tiene `income.currency = 'USD'` (no MXN)
- [ ] `QuoteCurrencyView` muestra badge "Cliente paga en USD" cuando `payment_currency !== currency`

Slice 3 (FX overrides):
- [ ] Tabla `organization_fx_rate_overrides` existe con los constraints declarados
- [ ] Override activo para `(orgX, USD, MXN, rate=18.00)` hace que `resolveFxReadiness` devuelva `rate=18.00` y `source='negotiated_override'`
- [ ] Quote emitida para orgX en MXN congela el snapshot con rate=18.00 y source='negotiated_override'
- [ ] CRUD en `/admin/organizations/[id]/fx-overrides` accesible solo para `efeonce_admin` y `finance_admin` (verificado con 403 para otros roles)
- [ ] `QuoteCurrencyView` muestra chip "Tasa negociada" cuando snapshot.source='negotiated_override'

Slice 4 (Line-level):
- [ ] `quotation_line_items.line_fx_snapshot` existe (JSONB nullable)
- [ ] Quote emitida con todas las líneas en la misma moneda → `line_fx_snapshot` copia el snapshot quote-level
- [ ] Quote emitida con breakdown multi-moneda → `line_fx_snapshot.extraRates` contiene las tasas auxiliares
- [ ] `QuoteDetailView` tooltip sobre subtotal muestra rate usado cuando difiere del quote-level

Slice 5 (Drift):
- [ ] `detectFxDrift({ previousRate: 20.0, currentRate: 21.5, warningThresholdPct: 5 })` devuelve `{ detected: true, deltaPct: 7.5, severity: 'warning' }`
- [ ] Quote con drift >5% entre draft_saved_at y issue_at emite `commercial.quotation.fx_drift_detected` al outbox
- [ ] `QuoteSendDialog` muestra Alert severity='warning' cuando el drift es 5-10%
- [ ] Evento registrado en `GREENHOUSE_EVENT_CATALOG_V1.md`

Slice 6 (Client portal):
- [ ] `/my/quotes` renderiza sólo quotes donde `organization_id ∈ tenant.organizationIds`
- [ ] `/my/quotes/[id]` NO muestra campos internal (margin, cost, audit)
- [ ] PDF download desde `/my/quotes/[id]/pdf` reutiliza el snapshot congelado
- [ ] Client user con 2 organizations ve quotes de ambas
- [ ] Client user NO ve quotes en status `draft` ni `pending_approval`

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `pnpm build`
- `pnpm pg:connect:migrate` (tras cada slice que incluya migración)
- Manual staging Slice 1: emitir quote test → verificar email real llega + tracking en `/admin/email-deliveries`
- Manual staging Slice 2: crear quote con payment_currency=USD en quote currency=MXN → convertir a income → verificar income.currency=USD
- Manual staging Slice 3: crear override MXN rate=18.0 → emitir quote → PDF muestra rate=18.0 + chip "Tasa negociada"
- Manual staging Slice 4: inspect `quotation_line_items.line_fx_snapshot` tras emit
- Manual staging Slice 5: simular drift (backdate una exchange_rate) → emitir quote → verificar event + alert
- Manual staging Slice 6: login como cliente → `/my/quotes` → verificar lista + detail + PDF

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real
- [ ] archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo impacto cruzado con TASK-524 (invoice bridge), TASK-462 (MRR/ARR), TASK-482 (feedback loop)
- [ ] migración de TASK-466 aplicada en prod (`20260421011323497`) antes de tomar el Slice 2 que depende de ella
- [ ] Event catalog (`GREENHOUSE_EVENT_CATALOG_V1.md`) actualizado con `commercial.quotation.fx_drift_detected`
- [ ] Verificación manual post-deploy de TASK-466 también ejecutada (smoke con quote MXN → PDF → email → inmutabilidad 1 semana) — parte del checklist de esta task dado que V1 nunca se validó end-to-end en staging

## Follow-ups

- Upgrade `organization_fx_rate_overrides` a maker-checker approval queue (como pricing catalog) cuando el volumen justifique
- Multi-language del email outbound (inglés) cuando haya cliente US/intl explícito
- Payment currency a nivel línea (granularidad fina) si algún cliente la requiere
- Aceptar/rechazar quote desde `/my/quotes/[id]` (acceptance workflow in-portal)
- HubSpot sync de email delivery events (deal timeline cuando cliente abre email)
- Historial auditable dedicado de `organization_fx_rate_overrides` (audit trail)
- Cliente paga contra cuenta bancaria multi-moneda con hedging

## Open Questions

- ¿Sender del email outbound: `greenhouse@efeonce.com`, `cotizaciones@efeonce.com`, o el email del AE que emite? Propuesta: `cotizaciones@efeonce.com` con reply-to al AE. Necesita confirmar branding.
- ¿El PDF va adjunto al email o como link firmado? Propuesta: link firmado (más seguro, expira, tracking). Attach inline solo si producto pide clientes sin link-click.
- ¿`payment_currency` default es NULL o `= currency`? Propuesta: NULL para backward-compat. Consumers hacen fallback explícito.
- ¿`organization_fx_rate_overrides` permite múltiples overrides activos simultáneos para la misma (org, from, to, fecha)? Propuesta: NO — el UNIQUE index rechaza. Governance queda simple.
- ¿Drift alert compara vs snapshot del draft más reciente, o vs el primer draft_save? Propuesta: el más reciente (captura cambios incrementales del AE).
- ¿`/my/quotes` requiere capability adicional o basta con `routeGroups.includes('client')`? Propuesta: basta con route group (es read-only de datos propios).
- ¿La verificación manual de TASK-466 (smoke MXN quote end-to-end) se hace antes de empezar esta task o como parte del Slice 1 closing? Propuesta: como paso 0 de esta task, para validar la foundation antes de construir encima.
