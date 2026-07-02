# TASK-1321 — AEO `/aeo-2/` submit auto-runs Grader + emails report (self-serve intake)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
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
- Domain: `growth|ai|public-site|forms|hubspot`
- Blocked by: `TASK-1320` (Success Card renderer live) · `TASK-1246` (flag rollout gate — verificar live)
- Branch: `task/TASK-1321-aeo-form-auto-grader-report-delivery`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Conectar el submit del formulario público de la landing **`/aeo-2/`** (`fdef-efeonce-aeo-diagnostic`, hoy captura-de-lead comercial a HubSpot) con el **pipeline del AEO Grader que YA existe**, de modo que un submit corporativo aceptado corra el grader async, y **cuando el informe esté listo** se le envíe al cliente **por correo con el PDF adjunto** + se **dedupe el lead en HubSpot** (enriquecer el mismo contacto, no crear uno segundo). `/aeo-2/` pasa de captura comercial a **loop self-serve** (submit → informe), sin construir un pipeline nuevo: `/aeo-2/` se vuelve **cliente** del run engine canónico del grader.

## Why This Task Exists

Hoy hay dos formularios distintos: `/aeo-2/` (comercial → HubSpot "AEO - Lead Form") y el form del grader (`fdef-ai-visibility-grader`, cableado al pipeline). La landing `/aeo-2/` promete "Diagnóstico de Visibilidad en IA gratis", pero su submit NO corre el grader — solo crea un lead comercial. El pipeline completo del grader (run → PDF → correo → lead) **ya existe y funciona (verde en staging)**; el seam para dispararlo desde un submit **ya existe** (outbox `growth.forms.submission_accepted` → projection `growthGraderRunFromSubmissionProjection`), pero está scopeado al form del grader, no a `/aeo-2/`. Esta task cierra ese gap: entrega el valor prometido (el informe), arma a ventas con un artefacto de calificación real (score/brechas del prospecto antes de la llamada), y monta un loop PLG — reusando todo lo construido.

## Goal

- Extender el pipeline existente para que `fdef-efeonce-aeo-diagnostic` (`/aeo-2/`) dispare un grader run async por cada submit corporativo aceptado.
- Mapear/derivar los campos del form `/aeo-2/` al intake requerido del grader (`brandName`, `market`, `locale`, `category`), con **gate de confianza de categoría** (no correr `unknown`).
- Entregar el informe al cliente **por correo con PDF adjunto apenas el informe esté listo** (event-driven); si no queda listo, **no enviar**.
- **Dedup del lead HubSpot**: enriquecer el mismo contacto/empresa (por email/dominio), nunca duplicar.
- Cost-cap + guardrails anti-abuso; flags default-OFF + staging shadow antes de prod.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (§Delta 2026-06-25, seam `growth.forms.submission_accepted`)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (providers LLM canónicos)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

Reglas obligatorias:

- El **run engine del grader es el primitive canónico (SSOT)**; ambos forms son clientes. Extender, no paralelizar.
- Los workflows de dominio se modelan como **reactive projections** suscritas al outbox event, NO como `form_destination` (eso es solo entrega externa).
- El grader run corre **async** (outbox → worker), NUNCA síncrono en el submit (llamadas LLM caras).
- El browser nunca recibe internals de HubSpot/grader/mapping/PII; el email vive solo en `grader_leads`, nunca viaja al run engine.
- **NUNCA** un run con `category=unknown` (gate TASK-1291); **NUNCA** editar una versión publicada del form in-place.
- Providers LLM vía el cliente canónico de `src/lib/ai/`; secretos server-side.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/context/07_ico.md` · `docs/context/11_hubspot-bowtie.md`
- `.codex/skills/greenhouse-growth-forms/SKILL.md`
- `.codex/skills/greenhouse-ai-image-generator/SKILL.md` (providers LLM)
- `.codex/skills/hubspot-greenhouse-bridge/SKILL.md`

## Dependencies & Impact

### Depends on

- **TASK-1320** — Success Card renderer live (la superficie de confirmación); esta task revisa su copy.
- **TASK-1246** — public launch readiness / flag rollout gate. Los flags `REPORT_EMAIL` + `LEAD_HANDOFF` estaban gated ahí. **VERIFICAR estado live** (`vercel env ls`): la reconciliación 2026-07-01 sugiere que pueden estar ON en prod (drift vs ledger).
- Pipeline del grader (existe, verde en staging): `src/lib/growth/ai-visibility/**` — `run-engine.ts`, `commands.ts` (`enqueueGraderDiagnostic`), `public-intake/create-public-run.ts` + `contracts.ts`, `public-delivery/finalize-delivery.ts`, `public-delivery/email/dispatch-report-email.ts`, `hubspot/execute.ts` (`executeLeadHandoff`), `flags.ts`.
- Seam de forms: `src/lib/growth/forms/store.ts` (`persistAcceptedSubmission` emite el evento), `contracts.ts:551` (`FORM_SUBMISSION_ACCEPTED_EVENT`).
- Projection existente: `src/lib/sync/projections/growth-grader-run-from-submission.ts` (+ `projections/index.ts:176`).
- Clasificador de categoría/arquetipo (EPIC-021) + gate operador (TASK-1291).

### Blocks / Impacts

- **Cross-impact TASK-1319/1320 (Success Card copy):** la entrega pasa a **event-driven** ("apenas esté listo"), no "24–48h fijo". Al shippear esta task, revisar el copy del `success_behavior_json` de AEO (de "…en las próximas 24–48 horas" a "…apenas esté listo / en cuanto lo tengamos"), vía el activation script existente.
- Presupuesto LLM (cada submit corporativo = un run pagado).
- El destino HubSpot actual de `/aeo-2/` (AEO - Lead Form) coexiste con el handoff del grader → dedup.
- EPIC-020 master flow: `/aeo-2/` pasa a ser nodo de intake del grader.

### Files owned

- Adapter nuevo `src/lib/growth/ai-visibility/public-intake/aeo-form-grader-adapter.ts` (o equivalente): mapeo `/aeo-2/` → intake grader.
- `src/lib/sync/projections/growth-grader-run-from-submission.ts` (extender scope) o sibling projection nueva + `projections/index.ts`.
- `src/lib/growth/ai-visibility/public-intake/create-public-run.ts` (reuso; no fork).
- `src/lib/growth/ai-visibility/hubspot/execute.ts` (dedup del lead).
- `src/lib/growth/ai-visibility/flags.ts` (si hace falta un flag de scope `/aeo-2/`).
- Tests: `src/lib/growth/ai-visibility/**/__tests__/*` + `src/lib/sync/projections/__tests__/*`.
- `scripts/growth/activate-aeo-success-card-contract.ts` (revisión de copy event-driven — cross-impact).
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (flags).

## Current Repo State

### Already exists

- **Submit → evento outbox** `growth.forms.submission_accepted` in-tx (`store.ts:persistAcceptedSubmission`); el path de dedupe retorna `accepted` sin re-emitir (no doble-run).
- **Projection que dispara el grader** desde un submit (`growth-grader-run-from-submission.ts`), scopeada a `fdef-ai-visibility-grader`, encola `enqueueGraderDiagnostic` idempotente por `submissionId`.
- **Pipeline grader completo** verde en staging: run engine → `finalizeRunDelivery` (gate `ready`/`partial`) → `requestAiVisibilityReportEmail` → `dispatchAiVisibilityReportEmail` (`sendEmail emailType='ai_visibility_grader_report'` + `pdfBuffer`) → PDF `renderAiVisibilityReportPdf`.
- **HubSpot handoff** del grader (`executeLeadHandoff` → `upsertLeadToHubSpot`), gated `isLeadHandoffEnabled`.
- **Form `/aeo-2/`** `fdef-efeonce-aeo-diagnostic` (form_key `b120566a-dd1a-43c8-956a-4e0121e805b8`): captura `fullName`, `email` (corporate), `brandWebsite` (dominio, requerido), `country`, `companySize`, `mainCompetitor`, `consent`. Destino HubSpot "AEO - Lead Form" (portal 48713323, GUID `8649e76c-8b01-41f3-9b0c-5713d7b4dba6`); `brandWebsite` NO se envía a HubSpot hoy.
- Clasificador de categoría + gate (bloquea `unknown`).

### Gap

- La projection no gatilla para `fdef-efeonce-aeo-diagnostic`.
- No hay adapter que mapee los campos de `/aeo-2/` al intake del grader (`brandName`/`market`/`locale`/`category` faltan: el form tiene dominio + country, no esos 4).
- No hay política de dedup entre el destino HubSpot del form y el handoff del grader.
- No hay cost-cap por período para runs disparados desde `/aeo-2/`.
- Los flags `REPORT_EMAIL` + `LEAD_HANDOFF` pueden estar OFF en prod (verificar).
- El copy del Success Card promete "24–48h" (incompatible con la entrega event-driven que pide esta task).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (write path público que gasta LLM + escribe a HubSpot + envía correo con PII del cliente)
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_ai` (grader runs/leads), `greenhouse_growth.form_submission`, `greenhouse_sync.outbox_events`, HubSpot (contacto/empresa)
- Consumidores afectados: worker reactivo (ops-worker), email pipeline, HubSpot, el cliente (correo), ventas (lead calificado)
- Runtime target: `production` (gated por flags + staging shadow primero)

### Contract surface

- Contrato existente a respetar: intake del grader `public-intake/contracts.ts` (`brandName`+`market`+`locale`+`category`+`email`+`consent` requeridos; `websiteUrl` opcional), `ExecuteGraderRunInput` (`run-engine.ts`), el evento `growth.forms.submission_accepted`, `ProjectionDefinition`.
- Contrato nuevo o modificado: adapter `/aeo-2/` → intake; política de dedup HubSpot; posible flag de scope.
- Backward compatibility: `compatible` — el form del grader sigue funcionando; `/aeo-2/` sigue creando su lead comercial; el cambio es aditivo detrás de flag.
- Full API parity: `/aeo-2/` es un cliente más del run engine canónico; no se construye lógica grader-específica en el form.

### Data model and invariants

- Entidades/tablas: grader runs + `grader_leads` (`grader_leads.submission_id` liga lead↔submission, TASK-1251), `form_submission`, `outbox_events`.
- Invariantes:
  - **NUNCA** correr un run con `category=unknown` → si el clasificador no resuelve con confianza, **skip grader + no email**, degradar al lead comercial (+ opcional flag operador). No runs basura (lección EPIC-021).
  - **NUNCA** doble-lead HubSpot: el handoff del grader **dedupea por email/dominio** y enriquece el mismo contacto/empresa; NO crea uno segundo. Coexiste con el destino "AEO - Lead Form" (HubSpot dedupea contactos por email).
  - **Entrega event-driven**: el correo se dispara SOLO cuando `finalizeRunDelivery` marca el report `ready`/`partial`; si nunca queda listo, **no se envía correo** (sin promesa de tiempo fija).
  - Idempotencia por `submissionId` (reusa la del pipeline existente).
  - El email del cliente vive solo en `grader_leads`; nunca entra al run engine ni a telemetry.
- Tenant/access boundary: superficie pública anónima; Turnstile + corporate-email + rate-limit + surface allowlist (ya).
- Idempotency/concurrency: projection idempotente; el dedupe-path del submit no re-emite; el run es idempotente por submission.
- Audit/outbox/history: reusa outbox + audit del grader; append-only.

### Migration, backfill and rollout

- Migration posture: `none` esperado (reuso de tablas del grader). Si el adapter necesita persistir el mapeo `/aeo-2/`→run, evaluar columna aditiva. Confirmar en Discovery.
- Default state: detrás de flag OFF → `/aeo-2/` sigue igual (lead comercial, sin grader).
- Backfill plan: none (aplica a submits nuevos).
- Rollback path: apagar el flag de scope → `/aeo-2/` vuelve a solo-comercial. Reversible sin DDL.
- External coordination: HubSpot (dedup + posibles properties de score AEO en el contacto); legal/consent (mismo posture que el intake público del grader, sign-off 2026-07-01); presupuesto LLM.

### Security and access

- Auth/access gate: Turnstile + corporate-email + rate-limit + surface/CORS (ya). **Cost-cap por período** nuevo (budget guard anti-abuso).
- Sensitive data posture: PII (email/nombre) solo en `grader_leads` + el correo; nunca en telemetry/logs/browser.
- Error contract: run/report/email degradan honesto (partial/blocked); errores sanitizados; `captureWithDomain`.
- Abuse/rate-limit posture: cada run es pagado → corporate-email + rate-limit + cost-cap son load-bearing.

### Runtime evidence

- Local checks: tests del adapter + projection + dedup + tests del pipeline grader; typecheck; lint.
- DB/runtime checks: en staging, submit real en `/aeo-2/` → run encolado → report `ready` → correo con PDF recibido → contacto HubSpot único enriquecido (sin duplicado).
- Integration checks: verificar dedup HubSpot con un email que ya existe; verificar el gate de categoría con un dominio no clasificable (skip grader, no email).
- Reliability signals: reusar los del grader (run failure, email failure, dead-letter); agregar signal de cost-cap alcanzado si aplica.
- Production verification sequence: staging shadow completo → verificar flags live → flip escalonado → smoke real en prod con un dominio propio → monitorear Sentry/costo.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes (no unknown-run, no doble-lead, event-driven email, idempotencia) explícitos.
- [ ] Migration/backfill/rollback posture explícito.
- [ ] Runtime/integration evidence listada (staging E2E + dedup + gate categoría).
- [ ] Cost-cap + consent + PII posture explícitos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Adapter de mapeo/derivación `/aeo-2/` → intake grader

- Adapter que traduce un `form_submission` de `fdef-efeonce-aeo-diagnostic` al intake del grader:
  - `brandWebsite` → `websiteUrl` + dominio.
  - `country` → `market` + `locale`.
  - Derivar `brandName` del dominio (o del site content que el grader ya fetchea).
  - Clasificar `category` con el clasificador EPIC-021 + **gate de confianza**: si no resuelve, marcar el submission como `grader_skipped:category_unresolved` (sin run).
  - `email`/`consent` desde el submission (solo a `grader_leads`, no al run engine).
- Tests: mapeo feliz, país→market/locale, categoría no resuelta → skip.

### Slice 2 — Projection scope: gatillar el grader desde `/aeo-2/`

- Extender el `extractScope` de `growthGraderRunFromSubmissionProjection` (o sibling nueva) para incluir `fdef-efeonce-aeo-diagnostic`, usando el adapter de Slice 1. Idempotente por `submissionId`. Re-lee de PG.
- Detrás de un flag de scope default-OFF (`GROWTH_AEO_FORM_GRADER_INTAKE_ENABLED` o reuso de `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` con scope ampliado — decidir en Discovery; registrar en el ledger).
- Tests: submit `/aeo-2/` → run encolado; submit de otro form → no-op; categoría no resuelta → no run.

### Slice 3 — Dedup del lead HubSpot

- El handoff del grader dedupea por email/dominio y **enriquece el mismo contacto/empresa** (properties de score AEO), sin crear un segundo lead; coexiste con el destino "AEO - Lead Form".
- Decidir contrato canónico: ¿el destino Forms sigue creando el lead comercial y el grader solo enriquece? (recomendado). Documentar.
- Tests: email existente → un solo contacto enriquecido; no duplicado.

### Slice 4 — Entrega event-driven del correo (reuso)

- Confirmar que el path `finalizeRunDelivery` → `dispatchAiVisibilityReportEmail` entrega al email del submission `/aeo-2/` con PDF, **solo cuando `ready`/`partial`**; si no queda listo, no envía. Template del grader (`ai_visibility_grader_report`).
- Cost-cap por período (budget guard) antes de encolar el run.
- Tests: report ready → email con PDF; report no-ready → sin email.

### Slice 5 — Cross-impact copy + flags + rollout gated

- Revisar el copy del Success Card AEO a semántica event-driven ("apenas esté listo") vía el activation script existente (cross-impact TASK-1319/1320).
- Verificar estado live de `REPORT_EMAIL_ENABLED` + `LEAD_HANDOFF_ENABLED` (+ el flag de scope) en prod; flip escalonado tras staging shadow verde. Registrar en el ledger.
- Runtime Rollout Completion Gate: no cerrar hasta submit real en prod entregando informe + contacto único.

## Out of Scope

- Render on-screen del informe en `/aeo-2/` (la entrega es email-only por decisión de producto; el grader self-serve on-screen es TASK-1241).
- Rediseñar el form `/aeo-2/` o agregarle campos (se derivan, no se agregan — decisión CRO anti-fricción).
- Cambiar el motor del grader, el scoring o los prompt packs (EPIC-021 intacto).
- Nuevo template de email (se reusa el del grader).
- El cross-sell operador (TASK-1279/1291) — se conserva como fallback, no se modifica.

## Detailed Spec

### Decisiones de producto tomadas

- **Q1 (volumen):** todo submit corporativo corre el grader + **cost-cap por período**. (El `corporate_email` gate ya filtra free/disposable.)
- **Email:** event-driven — se envía **apenas el informe esté listo**; si no está listo, **no se envía**. Template del grader.
- **Q4 (categoría no clasificable):** **skip grader + no email**, degradar al lead comercial (+ opcional flag operador). Sin runs basura.
- **Q5 (CTA):** el informe **complementa** el "Agenda una conversación", no lo reemplaza (report = valor + qualification; CTA = pipeline).
- **Lead dedup:** el destino "AEO - Lead Form" sigue creando el lead comercial; el handoff del grader **enriquece el mismo contacto** por email (HubSpot dedupea). Un contacto, dos fuentes de properties.

### Riesgo de honestidad de copy

La entrega event-driven hace que "24–48h" del Success Card actual quede desalineado. Al shippear: cambiar a algo tipo "Recibimos tu solicitud. Estamos preparando tu diagnóstico y te llegará por correo apenas esté listo." Validar con `greenhouse-ux-writing` (accepted-only, sin timing fijo).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (adapter) → 2 (projection scope) → 3 (dedup) → 4 (email event-driven + cost-cap) → 5 (copy + flags + rollout).
- Slice 5 flip de flags en prod SOLO tras staging shadow verde + verificación de estado live de flags + sign-off de costo/consent.
- NUNCA correr el grader síncrono ni sin cost-cap.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Doble-lead en HubSpot | CRM | medium | Dedup por email; enriquecer, no crear | manual review / HubSpot dupes |
| Run basura por categoría mal clasificada | AI/calidad | medium | Gate de confianza; skip si unknown (EPIC-021) | golden eval / operator gate |
| Costo LLM se dispara | costo | medium | corporate-email + rate-limit + cost-cap por período | budget signal / billing |
| Correo con informe incorrecto/incompleto | UX/legal | medium | Solo `ready`/`partial`; no enviar si no listo | report-state gate |
| Flags mal seteados en prod | rollout | medium | Verificar live + staging shadow + flip escalonado | vercel env ls / smoke |
| Copy Success Card promete timing falso | UX | low | Revisar a event-driven en Slice 5 | GVC / manual |
| PII en logs/telemetry | privacidad | low | email solo en grader_leads; sanitizar | telemetry test |

### Feature flags / cutover

- Flag de scope `/aeo-2/`→grader **default-OFF** + registrar en `FEATURE_FLAG_STATE_LEDGER.md`.
- `REPORT_EMAIL_ENABLED` + `LEAD_HANDOFF_ENABLED`: verificar live; flip escalonado.
- Cutover reversible por flag (sin DDL).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revert adapter PR | <30 min | yes |
| 2 | Apagar flag de scope | <5 min | yes |
| 3 | Revert dedup PR | <30 min | yes |
| 4 | Apagar `REPORT_EMAIL` | <5 min | yes |
| 5 | Apagar flags + revertir copy | <15 min | yes |

### Production verification sequence

1. Tests locales (adapter + projection + dedup + pipeline) + typecheck + lint.
2. Staging shadow: submit real `/aeo-2/` → run → report ready → correo con PDF → contacto HubSpot único enriquecido.
3. Verificar categoría no clasificable → skip grader + no email.
4. Verificar estado live de flags (`vercel env ls`).
5. Flip escalonado en prod + smoke con dominio propio.
6. Monitorear Sentry / costo LLM / dupes HubSpot.

### Out-of-band coordination required

- Legal/consent: confirmar que el consent del form `/aeo-2/` cubre correr el grader + enviar informe (mismo posture que el intake público, sign-off 2026-07-01).
- Presupuesto LLM: aprobar el cost-cap por período.
- HubSpot: confirmar properties de score AEO en el contacto (si se agregan).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un submit corporativo aceptado en `/aeo-2/` encola un grader run async (detrás de flag), idempotente por `submissionId`.
- [ ] Los campos de `/aeo-2/` se mapean/derivan al intake del grader; `category` pasa por el gate de confianza y un `unknown` **no corre run** (degrada a lead comercial).
- [ ] El informe se entrega al cliente **por correo con PDF adjunto apenas esté `ready`/`partial`**; si no queda listo, **no se envía**.
- [ ] El lead HubSpot se **dedupea** (un contacto enriquecido, sin duplicado) coexistiendo con el destino "AEO - Lead Form".
- [ ] Cost-cap por período aplicado antes de encolar; corporate-email + Turnstile + rate-limit intactos.
- [ ] PII (email/nombre) nunca en telemetry/logs/browser; solo en `grader_leads` + el correo.
- [ ] Copy del Success Card AEO revisado a semántica event-driven (cross-impact TASK-1319/1320).
- [ ] Flags default-OFF + staging shadow verde + estado live verificado antes de flip prod.
- [ ] Evidencia runtime: staging E2E (submit → correo con PDF → contacto único) + caso categoría no clasificable.
- [ ] Documentation, task lifecycle y handoff sincronizados al cierre.

## Verification

- `pnpm task:lint --task TASK-1321`
- `pnpm exec vitest run src/lib/growth/ai-visibility src/lib/growth/forms src/lib/sync/projections`
- Staging E2E: submit real `/aeo-2/` → run → correo con PDF → contacto HubSpot único.
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm qa:gates --changed --agent codex --task TASK-1321 --runtime --api --integration --production --docs`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real (`in-progress` al tomarla, `complete`/`code complete, rollout pendiente` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arch docs `## Delta` (grader architecture + event catalog si aplica)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado con los flags
- [ ] cross-impact aplicado a TASK-1319/1320 (copy Success Card) + EPIC-020 master flow
- [ ] doc funcional + manual si cambia comportamiento visible

## Follow-ups

- Render on-screen del informe en `/aeo-2/` (si se decide dejar de ser email-only) — coordinar con TASK-1241.
- Properties de score AEO en el contacto HubSpot para calificación de ventas.
- Apretar la promesa de timing del Success Card si los runs son consistentemente rápidos (medir primero).

## Open Questions

1. ¿El flag de scope es nuevo (`GROWTH_AEO_FORM_GRADER_INTAKE_ENABLED`) o se amplía `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED`? (Discovery.)
2. ¿El destino "AEO - Lead Form" sigue creando el lead comercial y el grader solo enriquece, o se unifica el handoff? (Recomendado: coexisten, grader enriquece.)
3. ¿El cost-cap es global o por-dominio/email? (Discovery + presupuesto.)
