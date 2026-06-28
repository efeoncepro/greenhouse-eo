# TASK-1279 — AEO Operator Cross-Sell: Send Report + Open Opportunity (governed)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Blocked by: `TASK-1277`
- Branch: `task/TASK-1279-aeo-operator-send-report-open-opportunity`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Command gobernado que cierra el loop de prospección AEO del operador: tras correr el motor sobre un cliente o **prospecto (HubSpot company)** y ver su brecha competitiva, el operador **envía el informe** al contacto y **abre/vincula una oportunidad** en HubSpot (pipeline Expansion para clientes, New Business para prospectos) seteando `aeo_check_result`. El envío a prospectos es por **interés legítimo, nunca en frío**: requiere conversación previa + consentimiento capturado, todo auditado.

## Why This Task Exists

La vista operador (TASK-1276) puede correr AEO sobre cualquier target, pero "ver la brecha" no genera negocio: el valor comercial está en **enviar el diagnóstico + abrir la oportunidad** de forma trazable. Es el motion pre-pitch del pack comercial (el grader como auditoría AEO equivalente al Surround Map): correr → mostrar situación vs competidores → enviar → abrir deal. Sin un command gobernado, esto sería un envío ad-hoc fuera del CRM, sin consentimiento ni trazabilidad, y rompería el bowtie.

## Goal

- Command `sendAeoReportAndOpenOpportunity` que, desde la vista operador, envía el informe AEO a un contacto cliente/prospecto y crea/vincula el deal HubSpot + `aeo_check_result`.
- **Consent gate**: envío a prospecto solo con consentimiento capturado (post-conversación) + base de interés legítimo documentada; envío a cliente = relación/servicio. Audit append-only de cada envío.
- Reuse del renderer/entrega de email (TASK-1250) y del write path HubSpot in-app (no bridge legacy); Full API parity (Nexa puede ejecutarlo vía propose→confirm→execute).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` + `docs/context/11_hubspot-bowtie.md` (pipelines Expansion/New Business, deal property `aeo_check_result`)
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (outbox + reactive para writes HubSpot)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (command gobernado; Nexa por construcción)
- `docs/context/08_estrategia-comercial.md` (Motor 1 expansión / Motor 2 new business filtrado; diagnóstico pre-pitch)

Reglas obligatorias:

- **Write HubSpot = cliente in-app directo** (`getHubSpotAccessToken` + fetch), NUNCA "agregar endpoint al Cloud Run bridge" (el bridge es legacy para deals/products/quotes/webhooks). Si el write puede reintentarse o es async, outbox + reactive consumer.
- **Envío a prospecto NUNCA en frío**: requiere `consentRef` (consentimiento capturado post-conversación) + base legal `legitimate_interest`; sin eso el command rechaza (422). Cliente con relación activa = servicio.
- Email reusa `renderAiVisibilityReportPdf` (TASK-1273) + la capa de entrega de TASK-1250 (operator-triggered), con marca **Efeonce** (agencia) para el lead magnet/prospecto.
- Prospecto = `organization` tipo prospect sincronizada de HubSpot company (TASK-706); el deal/contact se resuelven por el bridge identity HubSpot. NUNCA crear identidades paralelas.
- Audit append-only de todo envío (quién, a quién, qué report, consentimiento, deal); errores canónicos; sin leaks de evidencia interna.

## Normative Docs

- `docs/tasks/complete/TASK-1250-*` (entrega de email del informe) y `docs/tasks/complete/TASK-1273-*` (renderer PDF)
- `docs/tasks/to-do/TASK-1277-aeo-entitlement-metering-platform.md` (run operador, sujeto = org incl. prospecto)
- `docs/tasks/to-do/TASK-1276-aeo-operator-view-growth-account360.md` (consumer UI)

## Dependencies & Impact

### Depends on

- **TASK-1277** (run operador + sujeto org/prospecto + report disponible) — bloqueante.
- TASK-1250 (entrega de email del informe) + TASK-1273 (PDF) — existen.
- HubSpot bridge identity (company/contact/deal) + write path in-app + property `aeo_check_result` (existe en HubSpot).

### Blocks / Impacts

- **TASK-1276** consume este command (acción "Enviar + abrir oportunidad").
- Alimenta el bowtie (pipelines Expansion/New Business) — Motor 1 + Motor 2.

### Files owned

- `src/lib/growth/ai-visibility/send-report-open-opportunity.ts` (command) `[verificar naming]`
- `migrations/<ts>_task-1279-aeo-opportunity-send-audit.sql` (audit append-only + consent ref)
- `src/app/api/.../send-report` route (capability) `[verificar lane]`
- `src/lib/entitlements/*` (capability + grant)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (Delta: cross-sell close loop)

## Current Repo State

### Already exists

- Renderer PDF (TASK-1273) + entrega de email del informe (TASK-1250) + marca Efeonce.
- HubSpot bridge identity + write path in-app + pipelines Expansion/New Business + `aeo_check_result`.
- (Tras TASK-1277) run operador + report bound a org/prospecto.

### Gap

- No hay command que envíe el informe operator-triggered ni que abra/vincule el deal con consentimiento + audit.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (outbound a externos + write HubSpot + consentimiento/PII)
- Impacto principal: `integration` (+ `command` + `migration` del audit)
- Source of truth afectado: HubSpot deal (oportunidad) + audit append-only de envíos + email_deliveries
- Consumidores afectados: UI operador (TASK-1276) · Nexa/MCP
- Runtime target: `production|staging` (envío real) + worker (outbox HubSpot)

### Contract surface

- Contrato existente a respetar: entrega de email (TASK-1250), PDF (TASK-1273), HubSpot write in-app + outbox.
- Contrato nuevo: `sendAeoReportAndOpenOpportunity({ subjectOrganizationId, runId, recipient, consentRef, legalBasis, dealIntent })` + audit + evento outbox HubSpot.
- Backward compatibility: `compatible` (additive).
- Full API parity: command gobernado; Nexa lo ejecuta vía propose→confirm→execute (el LLM nunca envía directo; muta en el endpoint de confirmación humana).

### Data model and invariants

- Entidades: audit append-only `greenhouse_growth.grader_report_send_log` (quién, subject org, run_id, recipient hash, consent_ref, legal_basis, deal_id, sent_at) `[verificar schema]`; HubSpot deal + `aeo_check_result`.
- Invariantes:
  - Envío a prospecto requiere `consentRef` no vacío + `legalBasis='legitimate_interest'` con consentimiento capturado; sin eso → 422 (NUNCA cold send).
  - Cliente con relación activa: envío permitido como servicio (sin consent explícito, audit igual).
  - Idempotencia por `(run_id, recipient)` — no doble-envío.
  - El deal se crea en Expansion (cliente) o New Business (prospecto) según el tipo de org; nunca duplica si ya existe (vincula).
- Tenant/space boundary: capability interna (Growth/AM); el subject es la org/prospecto target.
- Idempotency/concurrency: claim atómico del send log; write HubSpot vía outbox + reactive (no inline en route).
- Audit/outbox/history: send log append-only + outbox del write HubSpot + email_deliveries.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla audit).
- Default state: detrás de flag `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` (default OFF) hasta smoke real HubSpot + email.
- Backfill plan: ninguno.
- Rollback path: flag OFF + revert PR; el audit append-only se preserva.
- External coordination: verificar property `aeo_check_result` + pipelines en HubSpot; sign-off comercial del copy/legal del envío a prospectos.

### Security and access

- Auth/access gate: capability `growth.ai_visibility.opportunity.open` (interna, Growth/AM) + grant mismo PR.
- Sensitive data posture: recipient email = PII (hash en audit, no crudo); consentimiento registrado; sin evidencia interna del grader en el email a externos (variant público-safe/attachment).
- Error contract: canónico (`forbidden`, `consent_required` 422, `hubspot_write_failed` degradado); `captureWithDomain(err,'growth'|'commercial',…)`.
- Abuse/rate-limit posture: capability-gated a operadores; idempotencia por run+recipient; no masivo (1 envío por target/decisión humana).

### Runtime evidence

- Local checks: focal tests (consent gate 422, idempotencia, deal Expansion vs New Business, leak-safe del email).
- DB/runtime checks: migrate verify del audit; smoke del command en staging (envío real a un contacto de prueba + deal creado/vinculado).
- Integration checks: HubSpot deal aparece + `aeo_check_result` seteado; email entregado (email_deliveries); outbox publicado.
- Reliability signals/logs: send failed / hubspot write failed / consent missing.
- Production verification sequence: staging flag ON + smoke a contacto interno → verify deal + email → prod.

### Acceptance criteria additions

- [ ] Source of truth (audit send log + HubSpot deal), contract surface (command + outbox) y consumers nombrados.
- [ ] Consent gate (prospecto requiere consentimiento + interés legítimo; cold send rechazado 422) explícito.
- [ ] Write HubSpot in-app + outbox (no bridge legacy, no inline en route); idempotencia por run+recipient.
- [ ] Email reusa TASK-1250/1273, variant público-safe, marca Efeonce; recipient PII hasheada en audit.
- [ ] Capability + grant mismo PR + coverage; errores canónicos; sin leaks.

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

- Migration additive `grader_report_send_log` (append-only) + `consent_ref`/`legal_basis`; bloque DO de verificación.

### Slice 2 — Command gobernado

- `sendAeoReportAndOpenOpportunity`: consent gate (422 sin consentimiento en prospecto), idempotencia run+recipient, envío email (TASK-1250/1273 variant público-safe, marca Efeonce), audit.

### Slice 3 — HubSpot opportunity (outbox + reactive)

- Crear/vincular deal (Expansion cliente / New Business prospecto) + set `aeo_check_result` vía write in-app + outbox/reactive (no inline). Capability + grant + coverage.

### Slice 4 — Signals + flag

- Reliability signals (send/hubspot/consent) + flag `OPERATOR_SEND_ENABLED` default OFF.

## Out of Scope

- La vista operador / subject picker / botón (TASK-1276).
- El run operador y su sujeto (TASK-1277).
- Lead magnet público (TASK-1250 ya cubre el envío al lead self-serve).

## Detailed Spec

El command es el único camino de envío+oportunidad operator-triggered. Reusa el PDF/email existentes; el write HubSpot va por outbox + reactive (no inline en route handler Vercel). El consent gate distingue prospecto (requiere consentimiento capturado post-conversación) de cliente (relación activa).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Bloqueada por TASK-1277. Slice 1 (audit) → Slice 2 (command + consent) → Slice 3 (HubSpot outbox) → Slice 4 (signals/flag). El envío real no se prende (flag) hasta smoke staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cold send a prospecto sin consentimiento | commercial/legal | medium | consent gate 422 + audit + flag OFF default | `consent missing` |
| Write HubSpot inline rompe el route | integrations | medium | outbox + reactive (nunca inline) | `hubspot write failed` |
| Deal duplicado | commercial | low | idempotencia + vincular si existe | dup detection |
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
3. Flip flag staging → smoke envío a contacto interno de prueba → verify email_deliveries + HubSpot deal + `aeo_check_result`.
4. Verify consent gate (prospecto sin consent → 422).
5. Prod con cooldown + monitor signals.

### Out-of-band coordination required

- HubSpot: confirmar `aeo_check_result` + pipelines. Comercial/legal: copy del envío a prospectos + base de interés legítimo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `sendAeoReportAndOpenOpportunity` envía el informe (email TASK-1250/1273, público-safe, marca Efeonce) y crea/vincula el deal HubSpot + `aeo_check_result`.
- [ ] Envío a prospecto exige consentimiento capturado + interés legítimo; cold send rechazado (422); cliente con relación = servicio. Todo en audit append-only.
- [ ] Write HubSpot in-app + outbox/reactive (no bridge legacy, no inline); idempotencia por run+recipient.
- [ ] Capability `growth.ai_visibility.opportunity.open` + grant mismo PR + coverage; errores canónicos; recipient PII hasheada; sin leaks.
- [ ] Flag default OFF + smoke staging real (email + deal) antes de prod.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` + smoke del command en staging (email + HubSpot deal + consent gate)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1276, TASK-1277, TASK-1250)
- [ ] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (cross-sell close loop)

## Follow-ups

- Plantilla de email operator-to-prospect (copy comercial + legal) si difiere del lead magnet.
- Métrica de conversión del diagnóstico AEO → deal ganado (efectividad del motion).

## Open Questions

- ¿El `consentRef` apunta a un registro de consentimiento existente (HubSpot/contacto) o se captura en el momento del envío? (definir en Discovery con comercial/legal).

## Delta 2026-06-28 — conectada al Master UI Flow del programa AEO

- Esta task es el nodo **S11** — command enviar informe + abrir oportunidad del flujo cross-surface del programa AEO. Su UI/flujo se conecta con todas las demás superficies (público → email/PDF → portal cliente tiers/PLG → operador cross-sell → Account 360) en el doc maestro **`docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`** (info-architecture + state-design + ux-writing + modern-ui). Toda UI del programa renderiza el `ReportArtifactModel` compartido (TASK-1252) y deriva su visibilidad del **entitlement** (TASK-1277), nunca del rol; cada acción mapea a un command gobernado (Full API Parity → Nexa por construcción).
