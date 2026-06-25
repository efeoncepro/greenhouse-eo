# EPIC-020 — Public AI Visibility Lead Magnet Program

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-020-public-ai-visibility-lead-magnet-program`
- GitHub Issue: `none`

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

- `TASK-1239` ✅ **complete (dev)** — **(A) Public Grader Report Snapshot + Token Reader** — `grader_reports` inmutable (run_id + score_version + report_version + recommendation_pack_version + as_of + DTO público congelado + token NO enumerable 256-bit + expires_at) + `readPublicGraderReport(reportToken)` + `publishGraderReportSnapshot` (idempotente, no publica gateados) + capability `report.publish` + endpoints admin/público. Foundation de parity pública. **P1.**
- `TASK-1240` ✅ **code complete (dev); rollout pendiente** — **(B) Public Grader Run Intake + abuse/cost controls** — `createPublicGraderRun` (§9.2 input + consent + work email, **email nunca a providers**) → captcha (Turnstile) + rate-limit (per-IP 10/email 3) + presupuesto global diario (circuit breaker) + modo `light` → enqueue al worker async (TASK-1234). Lead dedicado `grader_leads` + `grader_intake_events`. Flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` default OFF. **P1. Pendiente:** sign-off legal consent + secret captcha + flag ON staging.
- **(C) Public page: landing + form + states + report render** — superficie pública (product design + a11y WCAG 2.2 AA/EAA): formulario de captura, estados async honestos (§9.3), render del reporte (radar/bar + table-fallback). Consume A (token-reader) + B (intake). **P1, sin ID aún.**
- **(D) HubSpot handoff** — `syncAiVisibilityRunToHubSpot(runId, idempotencyKey)`: contact/company + props `ai_visibility_*` + lifecycle stage desde `primary_gap`/`recommended_motion`. **P2, sin ID aún.**
- **(E) Client-scoped reader + portal cliente surface** — reader client-scoped (binding run↔org cliente) + surface en el portal cliente vía su anti-corruption layer. Tercer consumer. **P2, sin ID aún.**
- **(F) Admin evidence review** — aprobar/rechazar reportes `review_required` antes de release público (gate humano YMYL). **P2, sin ID aún.**

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
- [ ] Control de abuso/costo activo (rate-limit + cost ceiling + modo `light`); sin gasto LLM no acotado.
- [ ] `review_required` no se auto-publica: gate humano (F) antes de exponer al público (seguridad YMYL).
- [ ] Triple documentación + reliability signals por capa; rollout proporcional (prod via release control plane).

## Non-goals

- Re-construir el motor (TASK-1226/1227/1234/1235/1236/1237 ya están).
- El runtime de hosting de la landing pública (lo cubre EPIC-019; este epic consume, no duplica).
- Pricing/checkout del Surround Discovery Audit pagado (motion comercial separado).
- Nexa/MCP exposure (sigue por construcción una vez existe el contrato gobernado; no es trabajo Nexa-específico).

## Delta 2026-06-24

- Epic creado desde el análisis con skills `commercial-expert` + `arch-architect` + `seo-aeo` + product design sobre el estado del grader. Veredicto parity = parcial (base correcta, 2 de 3 consumers sin contrato). Se crean A (`TASK-1239`) y B (`TASK-1240`) como foundation P1; C–F quedan trazadas como child tasks a crear.
