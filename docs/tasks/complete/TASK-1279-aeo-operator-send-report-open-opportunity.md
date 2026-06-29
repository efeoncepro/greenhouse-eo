# TASK-1279 — AEO Operator Cross-Sell: Send Report + Create Lead (governed)

> **Nota de objeto comercial (corrección 2026-06-29):** este command crea/asocia un **Lead de HubSpot** (objeto `leads`, asociado a Contact y/o Company), **NO un Deal/Negocio**. Un Deal es un momento comercial más avanzado (oportunidad calificada con pipeline/stage/monto). El diagnóstico AEO es pre-pitch (tope del bowtie): genera un Lead; recién al calificar se convierte en Deal. El slug del archivo conserva `open-opportunity` por estabilidad de links, pero el objeto correcto es **Lead**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1279-aeo-operator-send-report-open-opportunity`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Command gobernado que cierra el loop de prospección AEO del operador: tras correr el motor sobre un cliente o **prospecto (HubSpot company)** y ver su brecha competitiva, el operador **envía el informe** al contacto y **crea/asocia un Lead de HubSpot** (objeto `leads`, asociado a Contact y/o Company) seteando el resultado AEO. El Lead lleva un tipo `expansion` (cliente con relación) vs `new_business` (prospecto) — **NO** se crea un Deal: el diagnóstico es pre-pitch, el Deal es un momento comercial posterior (oportunidad calificada). El envío a prospectos es por **interés legítimo, nunca en frío**: requiere conversación previa + consentimiento capturado, todo auditado.

## Why This Task Exists

La vista operador (TASK-1276) puede correr AEO sobre cualquier target, pero "ver la brecha" no genera negocio: el valor comercial está en **enviar el diagnóstico + abrir el Lead** de forma trazable. Es el motion pre-pitch del pack comercial (el grader como auditoría AEO equivalente al Surround Map): correr → mostrar situación vs competidores → enviar → **crear Lead** (no Deal). En el bowtie, el diagnóstico AEO está en el tope del funnel: captura interés calificado → **Lead** asociado a Contact/Company; el **Deal** se crea recién cuando ese Lead se califica (conversación comercial avanzada). Crear un Deal en este punto inflaría el pipeline y corrompería la higiene de forecast. Sin un command gobernado, esto sería un envío ad-hoc fuera del CRM, sin consentimiento ni trazabilidad, y rompería el bowtie.

## Goal

- Command `sendAeoReportAndCreateLead` que, desde la vista operador, envía el informe AEO a un contacto cliente/prospecto y **crea/asocia un Lead de HubSpot** (objeto `leads` ligado a Contact y/o Company) + setea el resultado AEO en el Contact/Company asociado. **No crea Deal.**
- **Consent gate**: envío a prospecto solo con consentimiento capturado (post-conversación) + base de interés legítimo documentada; envío a cliente = relación/servicio. Audit append-only de cada envío.
- **Reuse del primitive HubSpot ya canónico** `syncAiVisibilityRunToHubSpot` (TASK-1242): enqueue gobernado → outbox → reactive consumer (lane `ops-reactive-growth`) con el cliente HubSpot in-app directo (`crm-client.ts`); NO bridge legacy, NO write inline en route. Reuse del renderer/entrega de email (TASK-1250/1273). Full API parity (Nexa lo ejecuta vía propose→confirm→execute).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` + `docs/context/11_hubspot-bowtie.md` (objeto `leads`, asociaciones Contact/Company, `aeo_check_result`)
- `docs/tasks/complete/TASK-1242-growth-ai-visibility-hubspot-lead-handoff.md` (primitive `syncAiVisibilityRunToHubSpot` + lane `ops-reactive-growth` + `crm-client.ts`/`property-mapper.ts` a EXTENDER)
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (outbox + reactive para writes HubSpot)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (command gobernado; Nexa por construcción)
- `docs/context/08_estrategia-comercial.md` (Motor 1 expansión / Motor 2 new business filtrado; diagnóstico pre-pitch)

Reglas obligatorias:

- **Crear Lead, NO Deal.** El objeto HubSpot es `leads` (objeto `0-136`), asociado a Contact y/o Company. El Deal (oportunidad calificada con pipeline/stage/monto) es un momento posterior y NO se crea acá. El Lead lleva tipo `expansion` (cliente) vs `new_business` (prospecto) vía property/source + la asociación a company existente vs prospect company.
- **Write HubSpot = reuse del primitive canónico `syncAiVisibilityRunToHubSpot`** (TASK-1242): enqueue gobernado que publica el outbox event; el reactive consumer (lane `ops-reactive-growth`) hace el upsert con el cliente HubSpot in-app directo (`getHubSpotAccessToken` + `crm-client.ts`). **NUNCA** write inline en el route handler Vercel; **NUNCA** "agregar endpoint al Cloud Run bridge" (legacy para deals/products/quotes/webhooks). El crear-Lead + asociaciones + property mapping EXTIENDEN `crm-client.ts`/`property-mapper.ts`/`events.ts`/`execute.ts` (hoy cubren contact/company), con su propio outbox event `opportunity`→renombrar a `lead`.
- **Envío a prospecto NUNCA en frío**: requiere `consentRef` (consentimiento capturado post-conversación) + base legal `legitimate_interest`; sin eso el command rechaza (422). Cliente con relación activa = servicio.
- Email reusa `buildAiVisibilityReportAttachment` (→ `renderAiVisibilityReportPdf`, TASK-1273) + `sendEmail` (`@/lib/email/delivery`) + el patrón idempotente del dispatch ledger de TASK-1250, con marca **Efeonce** (agencia) para el lead magnet/prospecto. Es operator-triggered (governed command), distinto del reactive consumer público consent-driven de TASK-1250.
- Prospecto = `organization` tipo prospect sincronizada de HubSpot company (TASK-706); el lead/contact/company se resuelven por el bridge identity HubSpot. NUNCA crear identidades paralelas.
- Audit append-only de todo envío (quién, a quién, qué report, consentimiento, lead_id); errores canónicos; sin leaks de evidencia interna.

## Normative Docs

- `docs/tasks/complete/TASK-1250-*` (entrega de email del informe) y `docs/tasks/complete/TASK-1273-*` (renderer PDF)
- `docs/tasks/to-do/TASK-1277-aeo-entitlement-metering-platform.md` (run operador, sujeto = org incl. prospecto)
- `docs/tasks/to-do/TASK-1276-aeo-operator-view-growth-account360.md` (consumer UI)

## Dependencies & Impact

### Depends on

- **TASK-1277** (run operador + sujeto org/prospecto + report disponible) — **COMPLETA** (ya no bloqueante; ver Delta 2026-06-29). Entregó `requestGraderRunAsOperator`, route `/api/admin/growth/ai-visibility/operator-run`, capability `growth.ai_visibility.run.operator`, y nombró esta task como su follow-up de cross-sell.
- TASK-1250 (entrega de email del informe) + TASK-1273 (PDF) — existen (`buildAiVisibilityReportAttachment` + `sendEmail` + dispatch ledger).
- TASK-1242 (HubSpot lead handoff) — entregó el primitive `syncAiVisibilityRunToHubSpot` + lane `ops-reactive-growth` + `crm-client.ts`/`property-mapper.ts` (upsert contact/company). A EXTENDER con crear-Lead + asociaciones.
- HubSpot bridge identity (company/contact) + write path in-app + property `aeo_check_result` (existe en HubSpot, hoy en deals — confirmar destino en objeto Lead/Contact, ver Open Questions).

### Blocks / Impacts

- **TASK-1276** consume este command (acción "Enviar informe + crear Lead").
- Alimenta el bowtie en el **tope del funnel** (Lead tipo expansion/new_business) — Motor 1 + Motor 2. La conversión Lead → Deal es un paso comercial posterior (fuera de scope).

### Files owned

- `src/lib/growth/ai-visibility/operator/send-report-and-create-lead.ts` (command — el dir `operator/` ya existe con `command.ts`)
- `migrations/<ts>_task-1279-aeo-report-send-audit.sql` (audit append-only `greenhouse_growth.grader_report_send_log` + consent ref; schema `greenhouse_growth` confirmado)
- `src/app/api/admin/growth/ai-visibility/runs/[runId]/send-lead/route.ts` (lane admin, espeja `runs/[runId]/lead-handoff/route.ts`)
- `src/lib/growth/ai-visibility/hubspot/{crm-client,property-mapper,events,execute}.ts` (EXTENDER: crear Lead + asociaciones + mapping `aeo_check_result`)
- `src/lib/entitlements/runtime.ts` + tests (capability `growth.ai_visibility.lead.open` + grant a los roles que ya tienen `run.operator`)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (Delta: cross-sell close loop)

## Current Repo State

### Already exists

- Renderer PDF (TASK-1273, `renderAiVisibilityReportPdf`) + entrega de email (`buildAiVisibilityReportAttachment` + `sendEmail` + dispatch ledger, TASK-1250) + marca Efeonce.
- Primitive HubSpot in-app `syncAiVisibilityRunToHubSpot` (TASK-1242): enqueue → outbox → reactive consumer `ops-reactive-growth` → `crm-client.ts` (hoy upsert contact/company `ai_visibility_*`). Property `aeo_check_result` existe en HubSpot.
- Run operador (TASK-1277, COMPLETA): `requestGraderRunAsOperator` + route `/api/admin/growth/ai-visibility/operator-run` + capability `growth.ai_visibility.run.operator`. Report bound a org/prospecto.

### Gap

- No hay command que envíe el informe operator-triggered ni que cree/asocie el **Lead** con consentimiento + audit. El `crm-client.ts` actual hace upsert de contact/company pero NO crea el objeto `leads` ni sus asociaciones; el mapping de `aeo_check_result` no existe aún en `property-mapper.ts`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (outbound a externos + write HubSpot + consentimiento/PII)
- Impacto principal: `integration` (+ `command` + `migration` del audit)
- Source of truth afectado: HubSpot **Lead** (objeto `leads`, asociado a Contact/Company) + audit append-only de envíos + email_deliveries. **NO** se toca el objeto Deal.
- Consumidores afectados: UI operador (TASK-1276) · Nexa/MCP
- Runtime target: `production|staging` (envío real) + worker (reactive consumer `ops-reactive-growth` del outbox HubSpot)

### Contract surface

- Contrato existente a respetar: entrega de email (`buildAiVisibilityReportAttachment` + `sendEmail`, TASK-1250), PDF (TASK-1273), primitive `syncAiVisibilityRunToHubSpot` + lane `ops-reactive-growth` (TASK-1242).
- Contrato nuevo: `sendAeoReportAndCreateLead({ subjectOrganizationId, runId, recipient, consentRef, legalBasis, leadIntent: { type: 'expansion' | 'new_business', stage?, owner? } })` + audit + **dos** outbox events (email dispatch + crear/asociar Lead HubSpot), ambos drenados por reactive consumers. El route handler solo escribe PG (claim del send log + publish events); cero write externo inline.
- Backward compatibility: `compatible` (additive).
- Full API parity: command gobernado; Nexa lo ejecuta vía propose→confirm→execute (el LLM nunca envía directo; muta en el endpoint de confirmación humana).

### Data model and invariants

- Entidades: audit append-only `greenhouse_growth.grader_report_send_log` (quién, subject org, run_id, recipient hash, consent_ref, legal_basis, **lead_id**, lead_type, sent_at) — schema `greenhouse_growth` confirmado (alberga `grader_runs`/`grader_profiles`); HubSpot **Lead** (`leads`) + asociaciones Contact/Company + `aeo_check_result` en el objeto asociado.
- Invariantes:
  - Envío a prospecto requiere `consentRef` no vacío + `legalBasis='legitimate_interest'` con consentimiento capturado; sin eso → 422 (NUNCA cold send).
  - Cliente con relación activa: envío permitido como servicio (sin consent explícito, audit igual).
  - Idempotencia por `(run_id, recipient)` — no doble-envío.
  - Se crea un **Lead** (NO Deal) tipo `expansion` (cliente) o `new_business` (prospecto) según el tipo de org, asociado a Contact y/o Company; si ya existe un Lead abierto para ese Contact/Company del mismo motivo → vincula/actualiza, no duplica.
  - El resultado AEO se setea como `aeo_check_result` en el Contact/Company asociado (reusa el mapper de TASK-1242); set a nivel Lead solo si la property existe en el objeto Lead (ver Open Questions).
- Tenant/space boundary: capability interna (Growth/AM); el subject es la org/prospecto target.
- Idempotency/concurrency: claim atómico del send log; ambos writes externos (email + Lead HubSpot) vía outbox + reactive (no inline en route); idempotencia del enqueue HubSpot reusada de `syncAiVisibilityRunToHubSpot`.
- Audit/outbox/history: send log append-only + outbox del write HubSpot (lane `ops-reactive-growth`) + email_deliveries.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla audit).
- Default state: detrás de flag `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` (default OFF) hasta smoke real HubSpot + email.
- Backfill plan: ninguno.
- Rollback path: flag OFF + revert PR; el audit append-only se preserva.
- External coordination: verificar el objeto `leads` en HubSpot (API `crm/v3/objects/leads`, lead stages, asociaciones a Contact/Company) + dónde vive `aeo_check_result` (hoy en deals — definir si se setea en Contact/Company asociado o se crea en el objeto Lead); sign-off comercial del copy/legal del envío a prospectos. **NO** se usan pipelines de Deal.

### Security and access

- Auth/access gate: capability `growth.ai_visibility.lead.open` (interna, Growth/AM; action `execute`, scope `tenant`) + grant a los roles que ya tienen `growth.ai_visibility.run.operator` (efeonce_operations / efeonce_account / efeonce_admin), mismo PR. Distinta de `growth.ai_visibility.lead_handoff.execute` (esa es el handoff del lead del form público; ésta abre un Lead comercial operator-triggered).
- Sensitive data posture: recipient email = PII (hash en audit, no crudo); consentimiento registrado; sin evidencia interna del grader en el email a externos (variant público-safe/attachment, mismo DTO público de `build-report-attachment`).
- Error contract: canónico (`forbidden`, `consent_required` 422, `hubspot_write_failed` degradado); `captureWithDomain(err,'growth'|'integrations.hubspot',…)`.
- Abuse/rate-limit posture: capability-gated a operadores; idempotencia por run+recipient; no masivo (1 envío por target/decisión humana).

### Runtime evidence

- Local checks: focal tests (consent gate 422, idempotencia run+recipient, Lead tipo expansion vs new_business, asociación Contact/Company, leak-safe del email).
- DB/runtime checks: migrate verify del audit; smoke del command en staging (envío real a un contacto de prueba + Lead creado/asociado).
- Integration checks: HubSpot **Lead** aparece asociado a Contact/Company + `aeo_check_result` seteado; email entregado (email_deliveries); outbox publicado y drenado por `ops-reactive-growth`.
- Reliability signals/logs: send failed / hubspot write failed / consent missing.
- Production verification sequence: staging flag ON + smoke a contacto interno → verify deal + email → prod.

### Acceptance criteria additions

- [ ] Source of truth (audit send log + HubSpot **Lead**), contract surface (command + 2 outbox events) y consumers nombrados.
- [ ] Consent gate (prospecto requiere consentimiento + interés legítimo; cold send rechazado 422) explícito.
- [ ] Write HubSpot reusa `syncAiVisibilityRunToHubSpot` + lane `ops-reactive-growth` (no bridge legacy, no inline en route); idempotencia por run+recipient; **crea Lead, no Deal**.
- [ ] Email reusa `buildAiVisibilityReportAttachment`/`sendEmail` (TASK-1250/1273), variant público-safe, marca Efeonce; recipient PII hasheada en audit.
- [ ] Capability `growth.ai_visibility.lead.open` + grant mismo PR + coverage; errores canónicos; sin leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Audit send log + consent model

- Migration additive `greenhouse_growth.grader_report_send_log` (append-only) + `consent_ref`/`legal_basis`/`lead_id`/`lead_type`; bloque DO de verificación.

### Slice 2 — Command gobernado + email

- `sendAeoReportAndCreateLead`: consent gate (422 sin consentimiento en prospecto), idempotencia run+recipient (claim atómico del send log), enqueue del email dispatch (reusa `buildAiVisibilityReportAttachment`/`sendEmail`, variant público-safe, marca Efeonce), audit. El route handler solo escribe PG + publica events.

### Slice 3 — HubSpot Lead (outbox + reactive, extiende TASK-1242)

- Extender `crm-client.ts`/`property-mapper.ts`/`events.ts`/`execute.ts`: crear/asociar **Lead** (objeto `leads`, tipo expansion cliente / new_business prospecto) ligado a Contact y/o Company + set `aeo_check_result` en el objeto asociado, vía outbox event nuevo drenado por el reactive consumer `ops-reactive-growth` (NO inline). Capability `growth.ai_visibility.lead.open` + grant + coverage.

### Slice 4 — Signals + flag

- Reliability signals (send/hubspot/consent) + flag `OPERATOR_SEND_ENABLED` default OFF.

## Out of Scope

- La vista operador / subject picker / botón (TASK-1276).
- El run operador y su sujeto (TASK-1277).
- Lead magnet público (TASK-1250 ya cubre el envío al lead self-serve).

## Detailed Spec

El command es el único camino de envío + creación de Lead operator-triggered. Reusa el PDF/email existentes y el primitive `syncAiVisibilityRunToHubSpot`; los dos writes externos (email + Lead HubSpot) van por outbox + reactive consumer `ops-reactive-growth` (NO inline en route handler Vercel). El consent gate distingue prospecto (requiere consentimiento capturado post-conversación + `legitimate_interest`) de cliente (relación activa = servicio). **El objeto creado es un Lead, nunca un Deal**: el diagnóstico AEO es pre-pitch (tope del bowtie); la conversión Lead → Deal es un paso comercial posterior fuera de scope.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1277 **COMPLETA** (ya no bloquea). Slice 1 (audit) → Slice 2 (command + consent + email) → Slice 3 (HubSpot Lead outbox) → Slice 4 (signals/flag). El envío real no se prende (flag) hasta smoke staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cold send a prospecto sin consentimiento | commercial/legal | medium | consent gate 422 + audit + flag OFF default | `consent missing` |
| Write HubSpot inline rompe el route | integrations | medium | outbox + reactive (nunca inline) | `hubspot write failed` |
| Lead duplicado | commercial | low | idempotencia run+recipient + vincular Lead abierto si existe | dup detection |
| Crear Deal en vez de Lead (inflar pipeline) | commercial | medium | el command crea SOLO objeto `leads`; review + test de que no toca el objeto Deal | deal creado inesperado |
| Leak de evidencia interna al externo | growth | low | email variant público-safe (attachment), leak test | leak test |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` (default OFF). Flip post-smoke staging. Revert: flag OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (drop audit) | <5 min | sí |
| Slice 2 | flag OFF / revert PR | <5 min | sí |
| Slice 3 | revert PR (outbox consumer) | <10 min | sí |
| Slice 4 | revert PR | <5 min | sí |

### Production verification sequence

1. migrate staging + verify audit table.
2. Deploy staging flag OFF.
3. Flip flag staging → smoke envío a contacto interno de prueba → verify email_deliveries + HubSpot **Lead** asociado + `aeo_check_result`.
4. Verify consent gate (prospecto sin consent → 422).
5. Prod con cooldown + monitor signals.

### Out-of-band coordination required

- HubSpot: confirmar objeto `leads` + asociaciones + dónde vive `aeo_check_result` (Contact/Company vs Lead). Comercial/legal: copy del envío a prospectos + base de interés legítimo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `sendAeoReportAndCreateLead` envía el informe (email TASK-1250/1273, público-safe, marca Efeonce) y **crea/asocia un Lead de HubSpot** (objeto `leads`, ligado a Contact y/o Company) + setea `aeo_check_result` en el objeto asociado (Company). **No crea Deal.** _(El reactive consumer hace ambos writes; flag OFF → smoke staging pendiente.)_
- [x] Envío a prospecto exige consentimiento capturado + interés legítimo; cold send rechazado (422 `aeo_send_consent_required`); cliente con relación = servicio. Audit append-only + CHECK duro en DB. Tipo comercial DERIVADO server-side (no se confía en el operador).
- [x] Write HubSpot vía cliente in-app directo (`createOperatorCrossSellLead`) + lane `ops-reactive-growth` (no bridge legacy, no inline en route); idempotencia por `(run_id, recipient)` + por sub-paso.
- [x] Capability `growth.ai_visibility.lead.open` + grant mismo PR + coverage verde; errores canónicos es-CL; recipient en PG interno (nunca al outbox/cliente/Sentry); sin leaks (email = DTO público).
- [x] Flag default OFF. _(Smoke staging real email + Lead = rollout pendiente; ver §Delta de cierre.)_

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` + smoke del command en staging (email + HubSpot deal + consent gate)

## Closing Protocol

- [x] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [x] archivo en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] chequeo de impacto cruzado (TASK-1276, TASK-1277, TASK-1250) — ver §Delta de cierre
- [x] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (cross-sell close loop) + `GREENHOUSE_EVENT_CATALOG_V1.md`

## Delta 2026-06-29 — cierre (code complete, rollout pendiente)

**Implementado (4 slices, develop local, sin push):**
- **S1** migración `greenhouse_growth.grader_report_send_log` (audit append-only; UNIQUE `(run_id, lower(recipient_email))`; CHECK `legitimate_interest ⇒ consent_ref`); aplicada dev/staging + `db.d.ts`.
- **S2** command `sendAeoReportAndCreateLead` (gates + derivación server-side cliente/prospecto + consent gate 422 + claim+publish en tx) · flag `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` (OFF) · errores canónicos · route `POST /api/admin/growth/ai-visibility/runs/[runId]/send-lead` · capability `growth.ai_visibility.lead.open` (catalog + grant operador + coverage).
- **S3** `createOperatorCrossSellLead` (upsert Contact/Company + `POST crm/v3/objects/leads` + asociaciones v4 default) · `aeo_check_result` (property nueva en Company) + `deriveAeoCheckResult` · executor `executeOperatorReportSend` (email público-safe + Lead, 2 sub-pasos idempotentes) · projection `growth_ai_visibility_operator_send` (lane `ops-reactive-growth`).
- **S4** signal `growth.ai_visibility.operator_send_failed` + ledger.

**Gates verdes:** `pnpm test` full **8496** · `pnpm build` compiló (boundary OK) · `eslint .` 0 err · `tsc --noEmit` · `pg:doctor` healthy · `docs:closure-check` flag-audit 0 sin registrar · SQL ejercida contra PG real (claim + dedup case-insensitive + signal). 17 tests focales nuevos.

**Hallazgos live (2026-06-29):** objeto `leads` reachable vía REST (`crm/v3/objects/leads`; el MCP NO lo soporta) — el operador confirmó "se encuentra por la API". `aeo_check_result` **NO existe** en el portal (ni deals/contacts/companies/leads) → la spec/docs asumían que sí; **provisión out-of-band es prerequisito de rollout**.

**Rollout pendiente (flag OFF):** (1) provisionar la property `aeo_check_result` (Company) vía `scripts/growth/provision-ai-visibility-hubspot-properties.ts`; (2) confirmar asociaciones del objeto `leads` en el portal; (3) flag ON en ops-worker + Vercel staging; (4) smoke staging real (correr+publicar run operador → `send-lead` → email `sent` + Lead creado + `aeo_check_result` + consent gate 422); (5) sign-off comercial/legal del copy a prospectos → prod vía release control plane (EPIC-020).

**Cross-impact:** **TASK-1276** (vista operador) consume `sendAeoReportAndCreateLead` + route `runs/[runId]/send-lead` + capability `growth.ai_visibility.lead.open` (ya disponibles). **TASK-1277** (su blocker) quedó COMPLETA. **TASK-1250/1273** (email/PDF) reusados sin fork.

## Follow-ups

- Plantilla de email operator-to-prospect (copy comercial + legal) si difiere del lead magnet.
- Métrica de conversión del motion: diagnóstico AEO → Lead → Deal calificado → ganado (efectividad por etapa del bowtie).
- Conversión Lead → Deal (cuando el Lead califica): command/automatización aparte, fuera de scope de esta task.

## Open Questions

- ¿El `consentRef` apunta a un registro de consentimiento existente (HubSpot/contacto) o se captura en el momento del envío? Recomendación (Discovery con comercial/legal): referenciar un registro de consentimiento ya capturado (en el contacto/HubSpot o un consent record de Greenhouse) en o antes del envío, y guardar solo la referencia + base legal en el audit (nunca el PII crudo).
- ¿Dónde vive `aeo_check_result`? Hoy es property de **deals**. Como esta task NO crea Deal, definir con HubSpot si se setea en el **Contact/Company** asociado (reusa el mapper de TASK-1242) o se crea la property en el objeto **Lead**. Recomendación: Contact/Company (ya soportado) + opcionalmente en el Lead si la property existe ahí.
- ¿El objeto `leads` de HubSpot soporta las asociaciones + lead stages que necesitamos vía el cliente in-app (`crm/v3/objects/leads`)? Verificar en Discovery antes de extender `crm-client.ts`.

## Delta 2026-06-28 — conectada al Master UI Flow del programa AEO

- Esta task es el nodo **S11** — command enviar informe + abrir oportunidad del flujo cross-surface del programa AEO. Su UI/flujo se conecta con todas las demás superficies (público → email/PDF → portal cliente tiers/PLG → operador cross-sell → Account 360) en el doc maestro **`docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`** (info-architecture + state-design + ux-writing + modern-ui). Toda UI del programa renderiza el `ReportArtifactModel` compartido (TASK-1252) y deriva su visibilidad del **entitlement** (TASK-1277), nunca del rol; cada acción mapea a un command gobernado (Full API Parity → Nexa por construcción).

## Delta 2026-06-29 — objeto comercial corregido (Lead, no Deal) + reuse verificado + unblock

Revisión con arch-architect + commercial-expert + seo-aeo + product-ui-architect. Ajustes:

- **Objeto comercial: Lead, no Deal (corrección del operador).** El diagnóstico AEO es pre-pitch (tope del bowtie): crea/asocia un **Lead de HubSpot** (objeto `leads`) ligado a Contact y/o Company, NO un Deal/Negocio. El Deal es un momento comercial posterior (oportunidad calificada). Se reemplazó todo "deal/oportunidad/pipeline Expansion-New Business" por "Lead tipo expansion/new_business + asociaciones". Crear un Deal acá inflaría el pipeline y rompería la higiene de forecast. El slug del archivo conserva `open-opportunity` por estabilidad de links; el objeto correcto es Lead. Renombrado: command `sendAeoReportAndCreateLead`; capability `growth.ai_visibility.lead.open`; param `leadIntent`.
- **TASK-1277 COMPLETA → unblock.** `Blocked by: none`. El run operador, su route admin (`/api/admin/growth/ai-visibility/operator-run`), la capability `growth.ai_visibility.run.operator` y el namespace ya existen; TASK-1277 nombró explícitamente este cross-sell como su follow-up.
- **Reuse verificado (se eliminaron los `[verificar]`):** write HubSpot reusa el primitive canónico `syncAiVisibilityRunToHubSpot` (TASK-1242) + lane `ops-reactive-growth` + `crm-client.ts`/`property-mapper.ts`/`events.ts`/`execute.ts` (extender con crear-Lead + asociaciones + mapping `aeo_check_result`, hoy NO mapeado). Email reusa `buildAiVisibilityReportAttachment`/`sendEmail` + dispatch ledger (TASK-1250/1273). Route en el lane admin `runs/[runId]/send-lead/route.ts`. Schema `greenhouse_growth` confirmado. Command en `operator/`.
- **Arquitectura (4-pilar):** el route handler solo escribe PG (claim send log + publish events); los dos writes externos (email + Lead) van por outbox + reactive (cero write externo inline en Vercel). Idempotencia run+recipient + dedup de Lead. Capability + grant + coverage mismo PR.
- **Pendiente de Discovery (Open Questions):** dónde vive `aeo_check_result` (Contact/Company asociado vs objeto Lead — hoy es property de deals); soporte del objeto `leads` vía cliente in-app (`crm/v3/objects/leads`); forma del `consentRef`.
