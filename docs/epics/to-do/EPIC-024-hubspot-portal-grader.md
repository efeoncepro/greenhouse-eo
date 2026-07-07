# EPIC-024 — HubSpot Portal Grader (lead magnet + auditoría conectada)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-024-hubspot-portal-grader`
- GitHub Issue: `[optional]`

## Summary

Construye el **HubSpot Portal Grader**: un diagnóstico de portal HubSpot como lead magnet, con **motor en Kortex** (`kortex.audit.run`, peer system — NO reimplementado), **contrato gobernado en Greenhouse** (`growth.hubspot_portal`: run + report token + entitlement per-org + Growth Forms capture + HubSpot handoff), y **superficie pública headless en Think**. Modelo **híbrido de dos puertas sobre un motor**: pública = self-assessment de madurez sin OAuth (lead magnet, **Fase 1**); conectada = auditoría OAuth sobre el portal del prospecto (**Fase 2**, gateada). Espeja el patrón del AI Visibility Grader (EPIC-020) con motor distinto. Materializa el "diagnóstico de portal" que PDR-006/TASK-1352 dejaron diferido.

## Why This Epic Exists

PDR-006/TASK-1352 posicionaron la landing HubSpot con un CTA secundario "Solicita un diagnóstico de tu portal HubSpot" y lo dejaron como entregable diferido. El operador decidió (2026-07-07) construirlo como lead magnet con el flywheel del AI Visibility Grader, pero con el motor en Kortex (que ya audita portales). Sin este programa, el CTA de la landing es un form vacío; con él, es un producto que abre la conversación comercial (self-assessment) y la cierra (auditoría conectada). Además le da a Think un segundo lead magnet y vuelve **demostrable** el diferenciador Kortex-en-Marketplace.

## Outcome

- Un prospecto puede, **sin conectar nada** (puerta pública), responder un self-assessment y recibir un reporte de madurez de su operación HubSpot en Think, con hallazgos accionables + CTA a reunión/auditoría.
- Un prospecto trial/contratado puede **conectar su portal** (puerta conectada, Fase 2) y recibir la auditoría profunda real de Kortex.
- Greenhouse gobierna el run/report/entitlement/handoff como contrato Full API Parity (consumido por Think, la landing, Nexa, MCP, admin); Kortex sigue siendo el motor; Think solo pinta.

## Architecture Alignment

- ADR: [`GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md`](../../architecture/GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md) (boundary, dos puertas, data posture, 4 pilares).
- Posicionamiento: [PDR-007](../../public-site/decisions/PDR-007-hubspot-portal-grader-lead-magnet.md) (+ PDR-006 landing hermana).
- Template/patrón: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` + EPIC-020 (mismo flywheel, motor distinto).
- Growth domain: `GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`.
- Kortex boundary: `GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md` + PDR-003 (Greenhouse le pide comandos gobernados, no lo absorbe).
- Headless render: `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`.
- Entitlement "un motor, N puertas": TASK-1277.

## Child Tasks

> Secuencia **Fase 1 (puerta pública) primero**. IDs a reservar desde `TASK-1353`. Se autoran vía `greenhouse-task-planner` cuando el operador dé green-light al programa.

**Fase 1 — Puerta pública (self-assessment lead magnet), sin dependencia del cutover prod de Kortex:**

1. **`TASK-1353` — Growth `hubspot-portal` domain foundation** (backend-data): schema `greenhouse_growth` (`portal_diagnostic_run` state machine + `portal_diagnostic_report` token inmutable), chokepoints (`createPublicPortalDiagnosticRun` / `requestPortalDiagnosticRunForOrganization`), módulo entitlement `hubspot_portal_v1` (`module_assignments`) + capabilities `growth.hubspot_portal.run.portal|operator` + grants + coverage, flags default-OFF. Espeja `src/lib/growth/ai-visibility`.
2. **`TASK-1354` — Puerta pública: self-assessment scoring + intake + report model** (backend-data): command Kortex `score_self_assessment` (tier `safe`) **o** seam a rubric-artifact versionado autorado por Kortex; public intake (`/api/public/growth/hubspot-portal/**`) con captcha + rate-limit + budget cap; report token + modelo render-ready versionado.
3. **`TASK-1355` — Superficie pública en Think** (ui, repo `efeonce-think`): landing lead magnet `/hubspot-portal` + reporte headless `/hubspot-portal/r/[token]` consumiendo el modelo de Greenhouse (dumb render, reuso `MaturityLadder`/`StatusScreen`).
4. **`TASK-1356` — Growth Form + handoff HubSpot** (backend-data): form instance `efeonce-hubspot-portal-audit` (config), `successBehavior=tokenized_report` (TASK-1336), CORS origin (TASK-1335), Success Card (TASK-1320), HubSpot handoff → portal `48713323` (delivery `disabled` hasta cutover).
5. **`TASK-1352` (existente) — wiring del CTA** (Delta): el CTA secundario de la landing apunta a la superficie de Think (no nuevo form).

**Fase 2 — Puerta conectada (OAuth deep audit), gateada:**

6. **`TASK-1357` — Puerta conectada: OAuth app + `kortex.audit.run` orchestration + trial/contracted entitlement** (backend-data): OAuth app least-privilege read-only para portales de prospectos, consentimiento, data-minimization (guarda score, no CRM crudo), delete-on-disconnect; invoca `kortex.audit.run` vía command adapter; entitlement trial/contratado. **Depende de**: cutover prod integración Kortex + revisión seguridad/PII.
7. **`TASK-1358` — Admin/operator control plane + reliability + review** (backend-data/ui): panel de review de runs, operator door, reliability signals (`growth.hubspot_portal.run_failed`, adapter lag), observabilidad.

## Existing Related Work

- **EPIC-020** — Public AI Visibility Lead Magnet Program (mismo flywheel, motor `growth.ai_visibility`; template de referencia, no contenedor).
- **EPIC-019** — Public Website Landing Control Plane (dueño de PDR-006/TASK-1352, la landing que ofrece este diagnóstico).
- **TASK-1164** — Kortex Command Adapter (`greenhouse-kortex-command-adapter.v1`); **TASK-1162** — Kortex Control Plane Reader.
- **TASK-1277** — AEO entitlement/metering platform (`module_assignments` per-org, "un motor N puertas").
- **TASK-1335/1336/1320/1327** — Growth Forms plumbing (CORS, tokenized report success, Success Card, lead-magnet landing blueprint).
- **TASK-1329** — Public report headless render (PDF token-gated; patrón Think).

## Exit Criteria

- [ ] Puerta pública (self-assessment) live: un prospecto responde y recibe reporte en Think, sin OAuth, con hallazgos + CTA.
- [ ] Run/report/entitlement gobernados como contrato Full API Parity (readers+commands), no lógica en Think.
- [ ] Motor = Kortex (o rubric-artifact autorado por Kortex en el seam); Greenhouse NO reimplementa la auditoría.
- [ ] Entitlement per-org `hubspot_portal_v1` con capabilities + grants + coverage; puerta pública sin entitlement, conectadas per-org.
- [ ] Superficie Think headless (dumb render, no scoring en Astro, no iframe, `noindex`, no-leak).
- [ ] Growth Form `efeonce-hubspot-portal-audit` + handoff HubSpot (delivery disabled hasta cutover); CORS gobernado.
- [ ] Reliability signals + audit + flags default-OFF registrados (incl. Feature Flag State Ledger).
- [ ] CTA de la landing (TASK-1352) enlaza a la superficie de Think.
- [ ] Puerta conectada (Fase 2) NO habilitada en prod sin OAuth app least-privilege + revisión seguridad/PII + Kortex prod.
- [ ] Triple documentación proporcional (técnica/funcional/manual) al cerrar Fase 1.

## Non-goals

- No reimplementa el motor de auditoría en Greenhouse.
- No habilita la puerta conectada (OAuth) en Fase 1.
- No guarda el CRM crudo del prospecto (data-minimization).
- No afirma un tier de partner ni presenta la integración interna Kortex como productiva.
- No construye un motor de forms nuevo (reusa Growth Forms).
- No hace el cutover de HubSpot delivery del form (coordinar aparte).
