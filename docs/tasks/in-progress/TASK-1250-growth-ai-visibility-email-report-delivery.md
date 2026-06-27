# TASK-1250 — Growth AI Visibility: Email Report Delivery

## Delta 2026-06-27 — implementación (code complete · rollout pendiente)

Implementada local-first (develop, sin push), 4 slices de código + docs. **NO movida a `complete/` — rollout pendiente** (Runtime Rollout Completion Gate): flag OFF + ops-worker sin redeploy + sin smoke staging.

**Hecho (con evidencia):**

- `EmailType` `ai_visibility_grader_report` + `EmailDomain growth` + template `AiVisibilityGraderReportEmail.tsx` (dirección **Report Packet Delivery**, marca **Efeonce** vía `EmailLayout brand='efeonce'`) + copy es-CL en `emails.ts` + plain text + preview meta. Baseline test 5/5 (render es/en + banner parcial + score null + guard de marca Efeonce, sin "Efeonce Greenhouse").
- Attachment builder `buildAiVisibilityReportAttachment` → `renderAiVisibilityReportPdf(variant attachment)` (TASK-1273), determinista + leak-safe por tipo. No-leak test (input público sin marcadores INTERNAL + PDF real `%PDF-`).
- Migration `greenhouse_growth.grader_report_email_dispatches` (UNIQUE DB `(report_id, email_type)`) **aplicada+verificada en dev PG** + seed `email_type_config` + flag `GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED` (default OFF, registrado en ledger).
- Command `dispatchAiVisibilityReportEmail` (gates: flag → consent → snapshot → report-state `ready`/`partial` → claim idempotente → `sendEmail`) + ledger de claim atómico. Test 8/8 (blocked states + idempotencia + happy + partial). Claim ON CONFLICT ejercitado vs PG real.
- Evento `growth.ai_visibility.report_email_requested` + command de enqueue `requestAiVisibilityReportEmail` en los **3 puntos de publicación** (auto-finalize, aprobación, publish route, no-fatal) + projection `growth_ai_visibility_report_email` (lane `ops-reactive-growth`) + reliability signal `growth.ai_visibility.report_email_failed` + EVENT_CATALOG.

**Gates verdes:** `pnpm test` full **8245/0** · `pnpm build` prod (exit 0) · typecheck · lint full · `worker:runtime-deps-gate` · `flags:audit` 0 sin registrar.

**Open Question 1 resuelta:** adjunto = **PDF** (TASK-1273), no HTML.

**Pendiente de rollout (owner: operador, gated por TASK-1246):** redeploy ops-worker (`bash services/ops-worker/deploy.sh`) + flip flag dual-location (ops-worker + Vercel) + smoke staging E2E (run con lead → snapshot → email + adjunto + `status='sent'` + no doble-envío + signal steady=0) + from-address/sign-off legal del lead magnet. Prod = release control plane + EPIC-020.

## Delta 2026-06-27 — Renderer PDF premium del adjunto LISTO (TASK-1273, complete)

El adjunto ya NO necesita ser print-HTML: TASK-1273 entregó el renderer PDF real. **Para el attachment, invocar:**

```ts
import { renderAiVisibilityReportPdf, modelFromPublicReport } from '@/components/growth/ai-visibility/report-artifact'

const model = modelFromPublicReport(publicReport, 'attachment')
const pdfBuffer = await renderAiVisibilityReportPdf({
  model,
  header: { organizationName, reportDate, periodLabel }
})
// adjuntar pdfBuffer como application/pdf (filename p.ej. `informe-visibilidad-ia-<org>.pdf`)
```

Es server-only (usa `renderToBuffer`), leak-safe por construcción (solo variant `attachment`), 4 páginas A4 con fuentes embebidas. **Open Question V1 de TASK-1273 (¿PDF directo o print-HTML como fallback?) = decisión de ESTA task:** se recomienda el PDF directo (fidelidad cross-cliente real); el print-HTML queda disponible como fallback si se quiere validar tamaño/entregabilidad antes. Mantener `has_attachments=true` + leak test del attachment.

## Delta 2026-06-27 — Report Artifact Design System implementado (TASK-1252)

El informe adjunto completo YA tiene su adapter: `AiVisibilityReportPrint` (print/PDF-safe, sin JS/motion/Recharts) desde `@/components/growth/ai-visibility/report-artifact`, con `model={modelFromPublicReport(publicReport, 'attachment')}`. El cuerpo del email (resumen breve) sigue siendo el React Email de esta task — NO confundir: attachment = documento standalone print-safe; email body = constraints de email-client. V1 del attachment es print-HTML; renderer PDF premium queda como follow-up declarado en TASK-1252.

## Delta 2026-06-25 — impacto de TASK-1251 (convergencia sobre el motor)

TASK-1251 **preservó `grader_leads` como la fuente del lead** (email + consent) — sin cambio de fuente para el email delivery. En el path convergente el lead se materializa vía el reactive consumer (campo additive `submission_id`); el shape leído no cambia. El email delivery debe ser **un reactive consumer idempotente más** del lead/submission (post-submit, con retry + dead-letter), nunca inline en el request — espeja el boundary atómico de 1251 (HubSpot/Resend caídos no abortan la aceptación del lead). El email sigue siendo PII con consent y nunca viaja a providers AI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `copy`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1250-ai-visibility-email-report-delivery.md`
- Backend impact: `sync`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|communications|reliability`
- Blocked by: `TASK-1245, TASK-1252`
- Branch: `task/TASK-1250-growth-ai-visibility-email-report-delivery`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entrega el reporte del AI Visibility Grader por email al lead: un resumen breve en el cuerpo del correo, link tokenizado al reporte y un informe completo adjunto generado server-side desde el snapshot público. Completa el intercambio de valor del lead magnet: no basta mostrar el resultado en pantalla, el prospecto debe recibirlo en su inbox.

## Why This Task Exists

El flujo actual planificado muestra el reporte en pantalla (`TASK-1241`) y `TASK-1245` entrega el `reportToken`, pero falta la entrega transaccional por correo. Como el intake captura work email con consent (`TASK-1240`), el reporte debe enviarse de forma idempotente, trackeable y reversible usando la capa canónica de email, no como fetch/browser-side ni como adjunto improvisado.

## Goal

- Enviar un email transaccional al lead cuando el snapshot público esté listo.
- Incluir cuerpo breve con score/gap/next step + link tokenizado al reporte.
- Adjuntar un informe completo public-safe generado desde el `PublicGraderReport`, sin raw provider text ni evidencia interna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §9 public experience, §11 programmatic contract, §13 privacy/security.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — delivery como primitive server-side, no UI-only.
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — Resend webhooks, bounce/complaint/delivery tracking.
- `docs/tasks/to-do/TASK-1245-growth-ai-visibility-public-run-status-delivery-orchestrator.md`
- `docs/tasks/complete/TASK-1240-growth-ai-visibility-public-run-intake-abuse-cost-controls.md`
- `docs/tasks/complete/TASK-1239-growth-ai-visibility-public-report-snapshot-token-reader.md`

Reglas obligatorias:

- El email se envía desde Greenhouse server-side usando `src/lib/email/delivery.ts`; no se llama Resend directo desde el dominio ni desde la UI.
- **Disparo write-side, NUNCA on-read (overlay arch #3 + consistencia con TASK-1245):** el dispatch del email es un **reactive consumer del evento de publicación/aprobación del snapshot** (el worker finaliza+publica el snapshot auto-publicable, o TASK-1244 aprueba → emite outbox event `growth.ai_visibility.report_email_requested` → consumer ejecuta `sendEmail`). NUNCA se dispara desde el `GET /run/[publicId]` de status (un poll público no envía correos). La pantalla (1241) y el email son dos consumers del MISMO delivery state.
- El adjunto se genera desde el snapshot `PublicGraderReport` ya congelado, no desde el reporte interno on-read ni desde raw provider responses; **el builder es determinista** (mismo snapshot → mismos bytes), base de un resend idempotente.
- `review_required`/`insufficient_data` no envían informe completo; si aplica, envían estado honesto o esperan aprobación según `TASK-1244/1245`.
- **Consent-gate en el dispatch:** enviar solo si el consent snapshot del lead (TASK-1240) cubre la entrega del reporte; NUNCA enviar a un lead sin consent o con consent retirado. Email transaccional, no marketing (nurturing queda fuera).
- El email del lead no viaja a providers AI; solo se usa para delivery/HubSpot/consent.
- El envío es idempotente por run/report snapshot; no doble correo por doble poll.

## Normative Docs

- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — contrato `PublicGraderReport`.
- `docs/tasks/to-do/TASK-1241-growth-ai-visibility-public-lead-magnet-page.md` — UI que mostrará el resultado en pantalla.
- `docs/tasks/to-do/TASK-1246-growth-ai-visibility-public-launch-readiness-rollout.md` — rollout operativo del lead magnet.

## Dependencies & Impact

### Depends on

- `TASK-1245` — status/delivery orquestado y `reportToken` listo.
- `TASK-1239` — snapshot público inmutable y token reader.
- `TASK-1240` — `grader_leads` con email consentido.
- Email delivery foundation existente: `src/lib/email/delivery.ts`, `src/lib/email/templates.ts`, `src/lib/email/types.ts`, `src/emails/**`.

### Blocks / Impacts

- Bloquea el launch completo si el criterio de producto exige entrega por email además de pantalla.
- Alimenta `TASK-1246` con un smoke end-to-end más realista: form -> report -> email con adjunto.
- Complementa `TASK-1242`; HubSpot recibe lead/contexto, pero el prospecto recibe el informe transaccional desde Greenhouse.

### Files owned

- `src/lib/growth/ai-visibility/public-delivery/email/**` (el command + attachment builder — específicos)
- `src/emails/AiVisibilityGraderReportEmail.tsx` (nuevo)
- `src/lib/copy/dictionaries/es-CL/emails.ts` (agregar copy)
- `src/lib/reliability/queries/growth-ai-visibility-report-email-*.ts` (señal nueva)
- `docs/tasks/to-do/TASK-1250-growth-ai-visibility-email-report-delivery.md`

Extend (NO owned — append, no apropiar): `src/lib/email/templates.ts` + `types.ts` + `template-copy.ts` (registrar el nuevo `EmailType`, +seed row en `email_type_config` el mismo PR si la tabla lo requiere); `src/lib/growth/ai-visibility/report/**` y `public-delivery/**` (compartidos con TASK-1235/1239/1245 — tocar con cuidado).

## Current Repo State

### Already exists

- `src/lib/email/delivery.ts` soporta attachments y persiste `greenhouse_notifications.email_deliveries`.
- `src/lib/email/templates.ts` registra templates React Email.
- `src/lib/email/types.ts` define `EmailType`, `EmailDomain`, priorities y `EmailAttachment`.
- `src/emails/**` contiene templates transaccionales y tests baseline.
- `TASK-1239` crea snapshots public-safe y `TASK-1245` define el puente status/token.

### Gap

- No existe `EmailType`/template para `ai_visibility_grader_report`.
- No existe command/idempotency de delivery por run/snapshot.
- No existe generador de informe adjunto public-safe del grader.
- No existe signal/operacion de retry/dead-letter especifica para este delivery.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite`
- Usuario / rol: prospecto público que completó el lead magnet.
- Momento del flujo: después de que el reporte está listo o parcialmente listo.
- Resultado perceptible esperado: recibe un correo claro con su hallazgo principal, link al reporte y adjunto completo.
- Friccion que debe reducir: perder el resultado si cierra la pestaña o no tiene tiempo de leerlo completo.
- No-goals UX: newsletter, secuencia nurturing, diseño visual de landing, A/B testing de asuntos.

### Surface & system decision

- Surface: email transaccional React Email + plain text.
- Composition Shell: `no aplica` — no es superficie web.
- Primitive decision: `reuse` — `EmailLayout`, componentes de `src/emails/components/**` y tokens email existentes.
- Adaptive density / The Seam: `no aplica` — email clients usan layout inline.
- Floating/Sidecar/Dialog decision: N/A.
- Copy source: `src/lib/copy/dictionaries/es-CL/emails.ts`
- Access impact: `none` — recipient por email consentido del lead; link tokenizado.

### State inventory

- Default: reporte listo con score/gap/CTA/link + adjunto.
- Loading: N/A para el recipient; delivery pending queda en tracking interno.
- Empty: no enviar si falta snapshot/reportToken.
- Error: delivery failed/dead-letter trackeado internamente.
- Degraded / partial: cuerpo y asunto deben indicar si el reporte es parcial.
- Permission denied: N/A en email; link token maneja acceso.
- Long content: el cuerpo es breve; el detalle vive en adjunto/link.
- Mobile / compact: template readable en cliente móvil.
- Keyboard / focus: links con texto claro.
- Reduced motion: sin motion.

### Interaction contract

- Primary interaction: abrir link del reporte y/o descargar adjunto.
- Hover / focus / active: limitado por email client.
- Pending / disabled: N/A.
- Escape / click-away: N/A.
- Focus restore: N/A.
- Latency feedback: N/A para email; UI pública sigue mostrando estados.
- Toast / alert behavior: N/A.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: N/A.
- Layout morph: N/A.
- Stagger: N/A.
- Timing / easing token: N/A.
- Reduced-motion fallback: N/A.
- Non-goal motion: cualquier animación o GIF.

### Visual verification

- GVC scenario: N/A — email template preview/test baseline.
- Viewports: email preview desktop/mobile si existe admin preview.
- Required captures: rendered template preview opcional.
- Required `data-capture` markers: N/A.
- Scroll-width check: N/A.
- Accessibility/focus checks: subject, plain text, CTA link text, attachment notice.
- Before/after evidence: N/A template nuevo.
- Known visual debt: email adapters usan inline styles/tokens propios.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `sync`
- Source of truth afectado: `greenhouse_growth.grader_reports`, `greenhouse_growth.grader_leads`, `greenhouse_notifications.email_deliveries`
- Consumidores afectados: public lead magnet, email delivery, reliability, HubSpot handoff indirectly
- Runtime target: `local|staging|external`

### Contract surface

- Contrato existente a respetar: `sendEmail()` en `src/lib/email/delivery.ts`, `readPublicGraderReport`, `publishGraderReportSnapshot`, `TASK-1245` delivery status.
- Contrato nuevo o modificado: `dispatchAiVisibilityReportEmail(runId|reportToken)` + email template `ai_visibility_grader_report` + attachment builder.
- Backward compatibility: `compatible`
- Full API parity: delivery es command server-side idempotente; UI pública no construye ni envía correos.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_notifications.email_deliveries`; posiblemente config rows para `email_type_config` [verificar].
- Invariantes que no se pueden romper:
  - Un snapshot reportable genera como máximo un email principal por lead/report version salvo resend explícito.
  - El adjunto contiene solo `PublicGraderReport` y metadata pública del snapshot.
  - No enviar informe si `review_required` no aprobado o `insufficient_data`.
  - El link público usa `reportToken`; no incluir ids internos secuenciales como secreto.
- Tenant/space boundary: público sin sesión; auth del informe por token; recipient derivado de `grader_leads` consentido.
- Idempotency/concurrency: idempotency key por `lead_id + report_id + email_type` **respaldada por UNIQUE a nivel DB** (no solo check app-level) para que disparos concurrentes (worker publish + retry) no doble-envíen; retry usa la delivery layer y no duplica.
- Audit/outbox/history: outbox event `growth.ai_visibility.report_email_requested/sent/failed` (registrar en el event catalog) → reactive consumer ejecuta el envío; `email_deliveries` persiste el resultado; dead-letter tras N retries.

### Migration, backfill and rollout

- Migration posture: `none|seed` — agregar `EmailType` TypeScript; seed/config si `email_type_config` requiere row.
- Default state: gated por readiness de `TASK-1245`; no production send hasta `TASK-1246`.
- Backfill plan: N/A para launch; resend manual/backfill solo con task separada.
- Rollback path: disable email type config or feature flag [verificar], revert command/template; public on-screen report sigue funcionando.
- External coordination: Resend configured, from-address, legal/consent copy, attachment size limits.

### Security and access

- Auth/access gate: server-side command; recipient from consented lead; public link tokenized.
- Sensitive data posture: work email PII only for delivery; no raw evidence; no internal accuracy findings.
- Error contract: canonical delivery outcomes; no raw provider/Resend errors in public UI.
- Abuse/rate-limit posture: one send per snapshot/lead; resend manual gated; use email delivery rate/undeliverable controls.

### Runtime evidence

- Local checks: template baseline tests, command idempotency tests, leak tests for attachment.
- DB/runtime checks: delivery row persisted with `has_attachments=true`; no duplicate on retry.
- Integration checks: Resend staging/test send with attachment if configured.
- Reliability signals/logs: delivery failed/dead-letter; optional `growth.ai_visibility.report_email_failed`.
- Production verification sequence: covered by `TASK-1246` launch readiness.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Hybrid Execution Justification

- Why not split: el backend delivery y el email copy/template son una sola capability transaccional; separar el template produciría un command sin artefacto enviable o un template sin delivery.
- Primary execution profile: `backend-data`
- Contract boundary: command server-side + email template + attachment builder; no web UI ni business logic en browser.
- Risk controls: idempotency, no-leak tests, attachment generated from public snapshot, rollout gated by `TASK-1246`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Email type + template

- Agregar `EmailType` `ai_visibility_grader_report` y domain/config apropiado (`growth` si se extiende el enum, o domain existente con rationale).
- Crear template React Email con subject, resumen breve, CTA al reporte tokenizado, notice de adjunto y plain text.
- Agregar copy es-CL canonica y baseline test.

### Slice 2 — Attachment builder

- Crear generador server-side del informe completo desde `PublicGraderReport`.
- Formato recomendado V1: PDF o HTML/PDF-like attachment segun capacidades existentes [verificar]; debe ser public-safe, estable y con nombre de archivo claro.
- Tests de no-leak: sin `providerFindings`, `accuracyFindings`, raw provider text, email ajeno ni ids internos sensibles.

### Slice 3 — Delivery command + idempotency

- Crear `dispatchAiVisibilityReportEmail` que resuelva lead consentido + snapshot + report token.
- Usar `sendEmail()` con attachment y source metadata.
- Idempotencia por lead/report/email type; retry/resend explicito separado.

### Slice 4 — Signals + integration (reactive consumer)

- Integrar con `TASK-1245` como **reactive consumer del evento de snapshot publicado/aprobado** (outbox `report_email_requested`), NO acoplado al GET de status. El dispatch corre async (worker/consumer), no en el request path público.
- Agregar signal/query de failures/dead-letter si la capa de email generica no basta (rollup módulo `growth`).
- Staging smoke con delivery real o dry-run si Resend no esta configurado; confirmar que el job del consumer corre en staging (Cloud Scheduler/ops-worker, no Vercel cron).

## Out of Scope

- Nurturing/marketing automation o secuencias comerciales.
- HubSpot handoff (`TASK-1242`).
- UI pública del reporte (`TASK-1241`).
- Cambiar el scoring/report builder.
- Resend webhook hardening general.

## Detailed Spec

El email debe ser transaccional, no promocional: "tu diagnóstico está listo". El cuerpo incluye un resumen breve: score global, brecha principal, recomendación principal, disclosure si es parcial y CTA al reporte. El adjunto contiene el informe completo public-safe derivado del snapshot, no una recomputación. La capa de delivery debe persistir `email_deliveries`, usar attachments soportados por `src/lib/email/delivery.ts`, respetar undeliverable/rate-limit/kill-switch y dejar trazabilidad para retry.

### Approved visual direction

Product Design direction approved on 2026-06-25: **Report Packet Delivery**.

Use Option 2 as the implementation base because it represents the email as an auditable delivery packet instead of only a notification: secure tokenized link, consent metadata, attachment notice, `PublicGraderReport` provenance and plain-text fallback are visible in the hierarchy.

Blend these elements into the final email/attachment implementation:

- Base from **Option 2 — Report Packet Delivery**: transactional email plus prominent first-page attachment preview, delivery metadata, consent/link/attachment proof, and fallback link.
- Add from **Option 1 — Executive Snapshot Email**: compact score summary and mobile-readable preview discipline.
- Add from **Option 3 — Insight-to-Action Email**: one priority insight with "que detectamos / por que importa / que hacer ahora" so the email creates commercial activation, not only delivery.

Versioned visual assets:

- `docs/assets/product-design/task-1250-ai-visibility-email-report-delivery/executive-snapshot-email.png`
- `docs/assets/product-design/task-1250-ai-visibility-email-report-delivery/report-packet-delivery.png`
- `docs/assets/product-design/task-1250-ai-visibility-email-report-delivery/insight-to-action-email.png`

Implementation guardrails:

- Keep the runtime email inside `EmailLayout`, `EmailButton`, `src/emails/components/**` and existing email tokens; do not introduce a web-app layout system for this surface.
- Preserve email-client safety: inline styles, simple sections/tables, no motion, no interactive controls beyond links.
- Use canonical copy in `src/lib/copy/dictionaries/es-CL/emails.ts`.
- Do not include raw provider evidence, internal accuracy findings, provider logos, guaranteed ranking claims or non-public IDs in HTML, text or attachment.
- Render partial/degraded delivery honestly in subject/body when required by the report state.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (template/type) -> Slice 2 (attachment) -> Slice 3 (command/idempotency) -> Slice 4 (integration/signal). No integrar con `TASK-1245` antes de que idempotency y no-leak tests estén verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble email por doble poll/retry | communications | low | UNIQUE DB lead/report/type + disparo write-side (no on-read) | duplicate delivery rows |
| Envío sin consent / consent retirado | privacy/legal | medium | consent-gate en dispatch contra el snapshot de consent de 1240 | sends sin consent match |
| Adjuntar evidencia interna/raw | privacy/legal | medium | builder desde `PublicGraderReport` + leak tests | no-leak test failure |
| Enviar reportes gateados | safety/legal | low | check `review_required`/`insufficient_data` antes de dispatch | dispatch blocked count |
| Attachment excede limite provider | email delivery | medium | tamaño acotado + fallback link-only documentado | resend failure |
| Bounce/complaint no visible para Growth | reliability | low | usar `email_deliveries` + webhook Resend existente | dead-letter signal |

### Feature flags / cutover

- Reusar `email_type_config` kill switch si aplica.
- Production send se valida en `TASK-1246`; staging primero.
- Si se agrega flag dedicado, default OFF: `GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED` — **registrar fila en `FEATURE_FLAG_STATE_LEDGER.md` el mismo PR** (gate `pnpm docs:closure-check`).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert template/type | <5 min | si |
| Slice 2 | disable attachment / link-only fallback | <5 min | si |
| Slice 3 | disable command via config/flag | <5 min | si |
| Slice 4 | remove integration trigger; manual resend off | <5 min | si |

### Production verification sequence

1. En staging: run publico -> snapshot -> dispatch email.
2. Confirmar email recibido con link valido y adjunto completo.
3. Confirmar `email_deliveries.has_attachments=true` y no duplicacion en retry.
4. Confirmar no raw/internal fields en HTML/text/attachment.
5. Produccion queda dentro de `TASK-1246` con sign-off.

### Out-of-band coordination required

- Legal/privacy copy del email y del informe adjunto.
- From-address/branding aprobado para lead magnet.
- Confirmar formato final del adjunto (PDF recomendado si hay renderer disponible; si no, documentar formato V1 y follow-up PDF).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe email type/template para `ai_visibility_grader_report` con subject, HTML y plain text.
- [ ] El email incluye resumen breve, CTA al reporte tokenizado y aviso del adjunto.
- [ ] El template aplica la direccion visual aprobada **Report Packet Delivery** y referencia los assets versionados de Product Design.
- [ ] El informe completo adjunto se genera desde `PublicGraderReport` snapshot, no desde raw/internal report.
- [ ] Dispatch es idempotente por lead/report snapshot (UNIQUE a nivel DB) y no duplica en doble poll/retry; se dispara como reactive consumer del evento de publicación, NO desde el GET de status.
- [ ] Consent-gate verificado: solo envía si el consent snapshot del lead cubre la entrega; nunca a consent ausente/retirado.
- [ ] `review_required` sin aprobacion e `insufficient_data` no envian informe completo.
- [ ] `email_deliveries` registra envio, status, source metadata y `has_attachments=true`.
- [ ] Tests cubren template baseline, attachment no-leak, idempotency y blocked states.
- [ ] `TASK-1245`/`TASK-1246` quedan actualizadas para incluir email delivery en el flujo end-to-end.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/lib/email src/emails src/lib/growth/ai-visibility`
- `pnpm task:lint --task TASK-1250`
- `pnpm ops:lint --changed`
- Staging/dry-run email con attachment si Resend esta disponible

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `EPIC-020` exit criteria actualizados
- [ ] `TASK-1245`/`TASK-1246` cross-impact revisado

## Follow-ups

- Resend manual desde admin si delivery falla.
- PDF visual premium si V1 usa HTML/text attachment por limitacion tecnica.
- Marketing nurturing posterior desde HubSpot, separado de este email transaccional.

## Open Questions

1. ¿Formato del adjunto V1: PDF o HTML? Propuesta: PDF si existe renderer/adapter disponible; si no, HTML adjunto public-safe + follow-up PDF premium.
2. ¿El email se dispara inmediatamente al snapshot o espera que la UI lo muestre primero? **Resuelto:** se dispara como reactive consumer del evento de publicación/aprobación del snapshot (write-side, no on-read GET); pantalla y email son dos consumers del mismo delivery state. Mecanismo consistente con el ajuste de TASK-1245 (publish en worker, no on-read).
