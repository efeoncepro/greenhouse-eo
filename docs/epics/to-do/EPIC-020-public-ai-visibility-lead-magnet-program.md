# EPIC-020 — Public AI Visibility Lead Magnet Program

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Motor + 3 consumers backend completos (12/13 childs complete); falta encender la cara pública self-serve — solo TASK-1246 (H) abierta`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-020-public-ai-visibility-lead-magnet-program`
- GitHub Issue: `none`

> **Estado y qué sigue de TODO el programa AEO** (no solo este epic): [`../AEO_PROGRAM_STATUS.md`](../AEO_PROGRAM_STATUS.md). El trabajo pendiente vive repartido en EPIC-020/021/022/024 + tasks sueltas (`TASK-1276` cockpit operador, `TASK-1321`/`1327` cara pública) + blockers de config multi-runtime. Empezar ahí para recuperar visibilidad.

## Summary

Convertir el AI Visibility Grader (motor interno ya construido: medir → puntuar → reportar → tendencia → señales) en un **lead magnet público real**: el flujo `input público → consent + email → run async → reporte → HubSpot handoff`, consumido por **3 superficies** (sitio público, Greenhouse admin interno, portal cliente) sobre el **mismo primitive gobernado** (`buildGraderReport`), sin lógica paralela. Cierra el gap entre "tenemos el motor" y "tenemos la máquina de adquisición + Full API Parity de 3 consumers".

## Why This Epic Exists

El motor del grader está completo y verificado (TASK-1226/1227/1234/1235/1236/1237). Pero hoy **todo el surface es `/api/admin/**`**: el sitio público y el portal cliente no tienen ningún contrato que consumir, no existe el snapshot inmutable tokenizado (un link público no puede cambiar si el score recomputa), no existe el write path público (create→consent→run) ni el control de abuso/costo (gasto LLM expuesto), ni el HubSpot handoff. Es un programa cross-domain (growth + public_site + client + commercial) que no cabe en una sola task: cada superficie y cada capa (snapshot, intake, página, handoff, cliente, review) es una task con su propio contrato y rollout. El veredicto Full API Parity hoy es **parcial** (la base es parity-correcta — un primitive + DTO público/interno — pero solo 1 de 3 consumers lo alcanza). Este epic lleva la parity a real.

## Outcome

- Los **3 consumers** (público, admin, cliente) consumen el MISMO `buildGraderReport` vía contratos gobernados: público = token-reader sobre snapshot inmutable; admin = `report.read` (ya existe); cliente = reader client-scoped. Cero builders paralelos.
- **Lead magnet end-to-end live**: un prospecto ingresa su marca + consent + email en el sitio público, recibe el reporte, y el lead + su `primary_gap`/`recommended_motion` llegan a HubSpot.
- **Escalera de 3 artefactos** operativa (Bow-tie): AI Visibility Grader (público, acquisition) → AI Visibility Snapshot (sales/HubSpot, conversión a SQL) → Surround Discovery Audit (pagado, primer land).
- Control de **abuso/costo** del path público (rate-limit + cost ceiling + modo `light`) — sin esto el lead magnet es un vector de gasto LLM no acotado.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 (`grader_report`), §9 (public experience: flow/input/states/trust), §11 (programmatic contract + parity: `readPublicGraderReport(reportToken)`, `createAiVisibilityRun`, `syncAiVisibilityRunToHubSpot`).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers (el norte del epic).
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md` · `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (anti-corruption layer del portal cliente) · `GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (handoff).
- Skill `seo-aeo` `efeonce/AI_VISIBILITY_GRADER.md` (naming canónico + frame Surround Discovery) + `modules/07/04`.

## Child Tasks

> **Estado real (verificado por carpeta 2026-07-16):** 12/13 childs `complete`. **La única abierta es `TASK-1246` (H)** — el rollout de la cara pública self-serve. La lista abajo corrige el drift previo (varias figuraban como planificadas cuando ya están `complete`).

- `TASK-1239` ✅ **complete (dev)** — **(A) Public Grader Report Snapshot + Token Reader** — `grader_reports` inmutable (run_id + score_version + report_version + recommendation_pack_version + as_of + DTO público congelado + token NO enumerable 256-bit + expires_at) + `readPublicGraderReport(reportToken)` + `publishGraderReportSnapshot` (idempotente, no publica gateados) + capability `report.publish` + endpoints admin/público. Foundation de parity pública. **P1.**
- `TASK-1240` ✅ **code complete (dev); rollout pendiente** — **(B) Public Grader Run Intake + abuse/cost controls** — `createPublicGraderRun` (§9.2 input + consent + work email, **email nunca a providers**) → captcha (Turnstile) + rate-limit (per-IP 10/email 3) + presupuesto global diario (circuit breaker) + modo `light` → enqueue al worker async (TASK-1234). Lead dedicado `grader_leads` + `grader_intake_events`. Flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` default OFF. **P1. Pendiente:** sign-off legal consent + secret captcha + flag ON staging.
- `TASK-1241` ✅ **complete** — **(C) Public Lead Magnet Page** (ui-ux): landing + form §9.2 + consent + Turnstile + estados async honestos (§9.3) + render del reporte usando el artifact design system de `TASK-1252` (table-fallback + a11y WCAG 2.2 AA). Cliente puro de A (token-reader) + B (intake). **P1.**
- `TASK-1242` ✅ **complete** — **(D) HubSpot Lead Handoff** (backend, integration): `syncAiVisibilityRunToHubSpot` upserta contact/company + props `ai_visibility_*` + lifecycle desde `primary_gap`/`recommended_motion`, vía outbox + reactive. **P2.**
- `TASK-1243` ✅ **complete** (2026-06-26, code complete dev) — **(E) Client-Scoped Report Access** (backend, reader): reader client-scoped (binding additive `grader_profiles.organization_id`) gateado por capability dedicada `growth.ai_visibility.report.read_client`, mismo `buildGraderReport` (reusa `readGraderReport`). DTO `ClientGraderReport` leak-safe; tenant boundary A≠B (test + SQL live); endpoint BFF `GET /api/client-portal/growth/ai-visibility/report`. **Tercer consumer de la parity cerrado.** Desbloquea `TASK-1248` (UI). Rollout: poblar `organization_id` = intake cliente. **P2.**
- `TASK-1244` ✅ **code complete (dev); rollout pendiente** — **(F) Admin Evidence Review** (backend, command): cola (`listPendingReportReviews`) + `approveAiVisibilityReport`/`rejectAiVisibilityReport` (log append-only `grader_report_reviews` = state machine + CHECK + audit; el LLM nunca aprueba) de `review_required` antes del release público; `publishGraderReportSnapshot` honra la aprobación (approved → publicable; pending/rejected → 409). Approve publica snapshot + delivery `ready` + HubSpot handoff; reject → `unavailable`. Capability `report.review` + grant. Signal `report_review_pending`. Gate humano YMYL. **P2. Pendiente:** UI admin (TASK-1247) + dry-run aprobar→publish sobre un `review_required` real en staging.
- `TASK-1245` ✅ **complete** — **(G) Public Run Status + Delivery Orchestrator** (backend, api): endpoint público de poll por `runPublicId`, estados public-safe y delivery idempotente de `reportToken` cuando existe snapshot publicable. **P1.**
- `TASK-1246` 🚧 **in-progress — ÚNICA TASK ABIERTA DEL EPIC** — **(H) Public Launch Readiness + Rollout** (ops/backend): legal consent + Turnstile + flags/envs + staging smoke end-to-end + release control plane + rollback. **P1.** Residual central = **decisión de arquitectura abierta**: ¿la cara pública se embebe vía `<greenhouse-form>` (candidato `TASK-1321`, `/aeo-2/`) o se hace en el hub público Astro (candidato `TASK-1327`, `think/brand-visibility`)? Hoy 0 tráfico self-serve real. Ver [`../AEO_PROGRAM_STATUS.md`](../AEO_PROGRAM_STATUS.md) §6 Ola 3.
- `TASK-1247` ✅ **complete** — **(I) Admin Review UI** (ui-ux): cola y detalle interno para operar approve/reject de `review_required` usando `TASK-1244`. **P2.**
- `TASK-1248` ✅ **complete** — **(J) Client Report UI** (ui-ux): superficie del portal cliente sobre el reader client-scoped de `TASK-1243`, consumiendo el artifact design system de `TASK-1252`. **P2.** ⚠️ Rollout pendiente: la ruta `/aeo` es **deep-link (no está en nav)** y falta poblar `grader_profiles.organization_id` para que un cliente real la vea. Ver `AEO_PROGRAM_STATUS.md` §2.A.
- `TASK-1249` ✅ **complete** — **(K) Calibration + Provider Completion** (backend, data-quality): Perplexity, prompt pack v2 y recalibración/golden eval; calidad del motor no bloqueante del MVP. **P2.**
- `TASK-1250` ✅ **code complete (dev); rollout pendiente** — **(L) Email Report Delivery** (backend, communications): email transaccional al lead con resumen breve + insight prioritario + link tokenizado + **PDF completo adjunto** (TASK-1273), disparado write-side (reactive consumer del snapshot publicado) con idempotencia DB-level + consent-gate. Marca **Efeonce** (agencia), no el portal. Flag `GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED` default OFF. **P1. Pendiente:** redeploy ops-worker + flip flag dual-location + smoke staging (gated por TASK-1246).
- `TASK-1252` ✅ **complete** — **(M) Report Artifact Design System** (ui-ux): visual y sistema reusable del informe completo del grader, con componentes/variants para web publica, portal cliente, attachment y admin preview. **P1.**

## Estado actual y qué sigue (2026-07-16)

**Backend maduro, cara pública apagada.** Los 3 consumers (público/admin/cliente) están cerrados a nivel backend y el motor corre en prod (brand-aware, EPIC-021). Lo que resta para "cerrar el epic" es **encender la puerta pública self-serve** (`TASK-1246` + decidir entre `TASK-1321`/`TASK-1327`) y destrabar los blockers de config.

**Blockers de config (no son tasks nuevas; encienden lo ya hecho):**

- Provisionar property HubSpot `aeo_check_result` (script `scripts/growth/provision-ai-visibility-hubspot-properties.ts`) — sin ella el handoff (D) da 400 en el upsert de Company.
- Flags AEO: **ya están ON en prod** (verificado runtime 2026-07-16 — Vercel prod y `ops-worker` rev. activa; el ledger estaba desactualizado). Acción restante = solo actualizar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, no prender nada.
- `TASK-1341` (DataForSEO AIO en prod, `to-do`): hoy `missing_secret` → informes `partial`.
- Poblar `grader_profiles.organization_id` para el consumer cliente (J).

**Trabajo relacionado que vive FUERA de este epic** (por eso conviene mirar el doc de programa, no solo esta spec):

- `TASK-1276` (`to-do`) — **cockpit operador `/growth/aeo` + facet AEO en Account 360**. Gap #1 de operabilidad interna; backend listo (`TASK-1275/1279/1287` complete). No es child de EPIC-020 pero es lo que falta para operar el AEO como herramienta de venta/servicio desde el portal.
- `TASK-1321` / `TASK-1327` (`in-progress`) — las dos candidatas de la cara pública self-serve.
- `TASK-1270` (`in-progress`) — re-grade recurrente / SoV (faceta operativa recurrente del cliente).

**Secuencia recomendada:** ver [`../AEO_PROGRAM_STATUS.md`](../AEO_PROGRAM_STATUS.md) §6 (olas 1→4). Resumen: Ola 1 config → Ola 2 `TASK-1276` → Ola 3 cara pública → Ola 4 cara del cliente contratado.

## Existing Related Work

- `TASK-1226/1227/1234` (complete) — provider foundation + scoring + worker async (el motor).
- `TASK-1235/1236/1237` (complete) — report builder + tendencia + señales (qué se muestra; DTO público/interno ya separados).
- `TASK-1238` (to-do) — brand accuracy/hallucination monitoring (alimenta el gate `review_required` que (F) revisa).
- `EPIC-019` (to-do) — Public Website / Landing Control Plane: **dónde se hospeda la página pública (C)** — coordinar, no duplicar el runtime de landing.
- ADR `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md`.

## Exit Criteria

- [ ] Los 3 consumers (público/admin/cliente) consumen `buildGraderReport` vía contrato gobernado; cero lógica de reporte duplicada por superficie (parity verificada).
- [ ] Snapshot inmutable tokenizado: un link público no cambia si el score recomputa; `expires_at` respetado.
- [ ] Flujo público end-to-end live en staging: input + consent → run async → reporte → lead en HubSpot con `primary_gap`/`recommended_motion`.
- [ ] El prospecto recibe email transaccional con resumen breve, link tokenizado e informe completo adjunto.
- [ ] El informe completo tiene direccion visual aprobada y sistema reusable de componentes/variants antes de implementarse en web, portal cliente y adjunto.
- [ ] Poll público `runPublicId → status → reportToken` existe como contrato backend gobernado, sin lógica de status dentro de la UI.
- [ ] Control de abuso/costo activo (rate-limit + cost ceiling + modo `light`); sin gasto LLM no acotado.
- [ ] `review_required` no se auto-publica: gate humano (F) antes de exponer al público (seguridad YMYL).
- [ ] Launch readiness con consent legal, captcha, flags, smoke staging y rollback documentado.
- [ ] Triple documentación + reliability signals por capa; rollout proporcional (prod via release control plane).

## Non-goals

- Re-construir el motor (TASK-1226/1227/1234/1235/1236/1237 ya están).
- El runtime de hosting de la landing pública (lo cubre EPIC-019; este epic consume, no duplica).
- Pricing/checkout del Surround Discovery Audit pagado (motion comercial separado).
- Nexa/MCP exposure (sigue por construcción una vez existe el contrato gobernado; no es trabajo Nexa-específico).

## Delta 2026-06-24

- Epic creado desde el análisis con skills `commercial-expert` + `arch-architect` + `seo-aeo` + product design sobre el estado del grader. Veredicto parity = parcial (base correcta, 2 de 3 consumers sin contrato). Se crean A (`TASK-1239`) y B (`TASK-1240`) como foundation P1; C–F quedan trazadas como child tasks a crear.
