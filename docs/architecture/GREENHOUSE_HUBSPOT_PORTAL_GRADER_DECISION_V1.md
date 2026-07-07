# Greenhouse HubSpot Portal Grader Decision V1

## Status

Accepted (direction) — no runtime changes yet.

Este ADR autoriza la arquitectura y la planificación (EPIC-024) de un **HubSpot Portal Grader**: un diagnóstico de portal HubSpot gobernado desde Greenhouse, con motor en Kortex, superficie pública en Think y captura vía Growth Forms. **No** autoriza tasks de implementación, provisioning de una OAuth app para portales de prospectos, habilitar la puerta conectada en producción, el cutover a producción de la integración Kortex, ni escrituras al portal del prospecto. Todo eso requiere follow-ups explícitos + aprobación del operador.

## Date

2026-07-07

## Owner

Product / Platform Architecture / Growth / Ecosystem (Kortex) / GTM

## Scope

- Segunda capability `growth` de lead magnet: diagnóstico de madurez/salud de un portal HubSpot, hermana del AI Visibility Grader.
- **Modelo híbrido de dos puertas** sobre un mismo motor:
  - **Puerta pública (self-assessment)** — cuestionario de madurez, sin OAuth, sin tocar el portal del prospecto. Lead magnet self-serve.
  - **Puerta conectada (OAuth)** — auditoría profunda sobre el portal HubSpot productivo del prospecto (Kortex `kortex.audit.run`), tras puerta trial/contratada.
- Contrato gobernado en Greenhouse: run aggregate + report token + entitlement por-org + Growth Forms capture + HubSpot handoff + outbox/reliability.
- Superficie pública headless en Think (`efeonce-think`).

Out of scope for this ADR:

- Construir la UI (pública o admin).
- Crear los `TASK-###` (los define EPIC-024).
- Provisionar/rotar la OAuth app para portales de prospectos ni secrets.
- Habilitar la puerta conectada en producción (depende del cutover prod de la integración Kortex + revisión de seguridad).
- Reimplementar el motor de auditoría en Greenhouse.
- Escribir al portal HubSpot del prospecto.

## Reversibility

**Asimétrica por puerta.**

- **Puerta pública (self-assessment): two-way.** No toca datos del prospecto (respuestas auto-reportadas). Reversible archivando la superficie y los runs, con inercia reputacional menor (mismo perfil que el AI Visibility Grader).
- **Puerta conectada (OAuth): one-way, slow.** Conectar el HubSpot **productivo** de un prospecto por OAuth crea obligaciones de confianza, privacidad y retención. Revertir exige revocar tokens, borrar/retener datos según política, y arrastra inercia reputacional. Por eso se **fasea** (pública primero) y se gatea con defense-in-depth.

## Confidence

Alta en el boundary y el patrón (espeja precedentes ya aceptados: AI Visibility Grader, Growth domain, Kortex Command Adapter, Public Report Headless Render). Media en la puerta conectada, por su dependencia del cutover prod de Kortex y de una revisión de seguridad/PII aún no hecha.

## Validated as of

2026-07-07 — contra `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`, `GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`, `GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`, `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`, PDR-003, PDR-006, TASK-1277 (entitlement), y el catálogo de commands Kortex (`kortex.audit.run` existe, tier `stateful`).

## Context

HubSpot se reposicionó como Agentic Customer Platform (ver PDR-006). La landing `/servicios-contratar-hubspot/` (TASK-1352) ofrece como gancho secundario un "diagnóstico de portal HubSpot", pero PDR-006/TASK-1352 dejaron **diferido** su entregable operativo. El operador decidió (2026-07-07) construirlo como lead magnet con el **mismo flywheel del AI Visibility Grader** — motor + superficie pública en Think + captura gobernada — pero con el **motor en Kortex** (que ya expone `kortex.audit.run`, "run and persist a portal audit").

Existe una tensión de diseño que el AI Visibility Grader no tiene: el grader AEO **no necesita datos del prospecto** (sondea motores de IA sobre una marca, data pública); un diagnóstico de portal **sí necesita el portal**, y nadie conecta por OAuth su HubSpot productivo a una herramienta desconocida como lead magnet frío. La resolución es el **modelo híbrido de dos puertas sobre un motor** (espejo del entitlement "un motor, N puertas" de TASK-1277).

## Decision

### D1 — Kortex es el SSOT del motor; Greenhouse orquesta, no reimplementa

El motor de auditoría de portal vive en **Kortex** (`kortex.audit.run`, tier `stateful`; complementos `kortex.strategy.seed_from_audit`, `kortex.portal.hub_profile.put`). Greenhouse **NUNCA** reimplementa la auditoría ni escribe HubSpot directo por este carril (regla dura PDR-003: Kortex = eje B, Greenhouse lo observa y le pide comandos gobernados). La puerta conectada invoca `kortex.audit.run` vía el **command adapter** (`POST /api/admin/kortex/commands`, contrato `greenhouse-kortex-command-adapter.v1`, `Idempotency-Key`, binding `EO-SPB-0002`).

### D2 — Greenhouse es el contrato gobernado (Full API Parity)

Greenhouse `growth` posee el **run aggregate**, el **report token**, el **entitlement por-org**, la captura Growth Forms, el HubSpot handoff, el outbox/BQ y los reliability signals. Todo como readers+commands gobernados (Full API Parity): los consumers son Think, la landing (TASK-1352), Nexa, MCP y admin — no algo "Think-específico". Espeja `src/lib/growth/ai-visibility/**` en un módulo hermano `src/lib/growth/hubspot-portal/**`.

### D3 — Dos puertas sobre un motor (faseadas)

- **Puerta pública (self-assessment) — Fase 1.** Chokepoint público (espeja `createPublicGraderRun`: captcha + rate-limit por email/IP + budget diario global). El scoring del self-assessment se resuelve por un **command stateless de Kortex** (`kortex.audit.score_self_assessment` o equivalente, tier `safe`) que **no** requiere OAuth ni portal; si la integración Kortex aún no está en prod, seam a un **rubric-artifact versionado autorado por Kortex** ejecutado Greenhouse-side (Kortex sigue siendo SSOT del rubric). Blast-radius bajo → se envía primero, sin bloquear en el cutover prod de Kortex.
- **Puerta conectada (OAuth) — Fase 2.** Chokepoint por-org (espeja `requestGraderRunForOrganization`) → invoca `kortex.audit.run` sobre el portal **conectado del prospecto**. Requiere OAuth del prospecto (app dedicada, least-privilege read-only) + entitlement trial/contratado. **Nunca** anónima.

### D4 — Entitlement "un motor, N puertas" (reuso TASK-1277)

Nuevo módulo `hubspot_portal_v1` en `greenhouse_client_portal.modules` (espejo de `ai_visibility_v1`), gateado per-org vía `module_assignments` (NO por-rol), con tier en `metadata_json`. Puertas: **público** (self-assessment, sin entitlement) · **trial** (conectada, time-boxed) · **contratado** (conectada, ongoing) · **operador** (Growth/AM, ilimitado, costo "sales"). Capabilities `growth.hubspot_portal.run.portal` (scope `own`) + `growth.hubspot_portal.run.operator` (scope `tenant`), granteadas en el mismo PR (capability⇒grant coverage). Los runs SON el ledger (claim atómico `FOR UPDATE`).

### D5 — Superficie pública headless en Think (dumb render)

El reporte se computa server-side en Greenhouse (modelo versionado) y Think lo pinta "tonto" (dumb-render line): `hubspot-portal/r/[token].astro` consumiendo `GET /api/public/growth/hubspot-portal/report/[token]` → modelo render-ready (espejo `ReportArtifactModel`), token no al browser, `noindex`, no-leak, **NO iframe**, **NO reconstruir scoring en Astro** (regla `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`). Reusa primitivas del hub (`MaturityLadder`, `StatusScreen`).

### D6 — Reuso del plumbing Growth Forms

Form instance `efeonce-hubspot-portal-audit` (config del contrato existente; ya nombrado en TASK-1352), `successBehavior.kind="tokenized_report"` (TASK-1336), CORS gobernado para el origin (TASK-1335), Success Card (TASK-1320), HubSpot delivery `disabled` hasta cutover. HubSpot handoff → portal `48713323`.

## Alternatives considered

### Alternative A — Reimplementar el motor de auditoría en Greenhouse
Rechazada: viola PDR-003 (Kortex = SSOT del motor de HubSpot) y el principio SSOT; duplicaría la lógica que Kortex ya opera y rompería la narrativa B2B2B (Kortex-en-Marketplace como producto).

### Alternative B — Solo puerta conectada (OAuth desde el inicio)
Rechazada como lead magnet: OAuth a un CRM productivo ajeno es alta fricción/confianza → funciona como entregable de venta, no como gancho frío. Se conserva como la puerta contratada/trial (Fase 2).

### Alternative C — Solo self-assessment (sin puerta conectada nunca)
Rechazada: pierde la profundidad real (el Portal Audit de Kortex) que es el diferenciador y la conversión. El híbrido conserva ambas.

### Alternative D — Think computa el scoring / render con datos crudos
Rechazada: viola la dumb-render line + Full API Parity; el scoring es SSOT de Greenhouse/Kortex, Think solo pinta el modelo.

### Alternative E — Extender EPIC-020 (AI Visibility)
Rechazada: motor distinto (`kortex.audit.run` en un peer system, no `src/lib/growth/ai-visibility`), cruza el boundary Kortex que EPIC-020 nunca toca, superficie/entitlement/handoff propios. EPIC-020 es referencia/template, no contenedor → EPIC-024 nuevo.

## Consequences

### Positive
- El CTA secundario de TASK-1352 pasa de "form" a **producto real** (Fase 1 no depende del cutover prod de Kortex).
- Think gana un **segundo lead magnet**; se refuerza el flywheel de adquisición HubSpot.
- Kortex-en-Marketplace se vuelve **demostrable** (el grader ES Kortex operando), sosteniendo el B2B2B.
- Cero duplicación de motor; Greenhouse suma un consumer más al command adapter ya construido.

### Negative
- La puerta conectada arrastra dependencia dura (cutover prod Kortex + OAuth app + revisión seguridad/PII) → se fasea, no se promete en Fase 1.
- Dos superficies (self-assessment vs conectada) implican dos experiencias de reporte (mitigado: mismo modelo, distinta profundidad de secciones).

### Neutral / contextual
- Cruza tres sistemas (Greenhouse `growth` + Kortex peer + Think Astro), coordinados por contratos ya aceptados; el trabajo Think vive en el repo `efeonce-think` (cross-repo, Codex concurrente).

## Runtime contract

- **Command adapter (puerta conectada):** `POST /api/admin/kortex/commands` `{ commandName: "kortex.audit.run", hubspotPortalId, reason, payload }` + `Idempotency-Key` (tier `stateful`; live execute gated por flags).
- **Public intake (puerta pública):** `POST /api/public/growth/hubspot-portal/**` (nunca HubSpot directo) → run + token.
- **Report read:** `GET /api/public/growth/hubspot-portal/report/[token]` → modelo versionado (server-side, sin token al browser).
- **Chokepoints:** `createPublicPortalDiagnosticRun` (público) · `requestPortalDiagnosticRunForOrganization` (conectada) — espejos de los del grader AEO.
- **Flags default-OFF:** `HUBSPOT_PORTAL_GRADER_ENABLED`, `HUBSPOT_PORTAL_GRADER_CONNECTED_DOOR_ENABLED` (registrar en el Feature Flag State Ledger).

## Data posture

- **Puerta pública:** solo respuestas auto-reportadas del cuestionario. Sin datos del CRM del prospecto.
- **Puerta conectada:** **data-minimization dura** — se computa la auditoría y se persisten **métricas/score derivados**, NUNCA contactos/deals/PII crudos del portal del prospecto en stores de Greenhouse. OAuth least-privilege read-only, consentimiento explícito, retención declarada, **delete-on-disconnect**. Postgres-first; BQ downstream vía outbox.

## AI autonomy posture

`kortex.audit.run` audita/persiste en Kortex (read del portal + persistencia del audit); **no** muta el portal del prospecto. Cualquier recomendación LLM es **advisory** (propose→confirm→execute; el LLM nunca ejecuta write). Sin `external_write` al portal del prospecto en el carril grader.

## 4-pillar scoring

- **Safety.** Puerta conectada gateada con defense-in-depth: OAuth least-privilege + consentimiento + entitlement por-org + capability + tier `stateful` del adapter (no `external_write`) + audit (`api_platform_command_executions`) + reliability signal + data-minimization. Puerta pública: captcha + rate-limit + budget cap. Nunca puerta conectada anónima.
- **Robustness.** Run como state machine append-only (los runs son el ledger); claim atómico `FOR UPDATE`; idempotencia por `Idempotency-Key`; degradación honesta si Kortex no responde (run `failed` con evidencia, no reporte en $0); seam a rubric-artifact si Kortex prod no está listo.
- **Resilience.** Outbox + reactive → BQ; reliability signals (`growth.hubspot_portal.run_failed`, adapter lag) en `/admin/operations`; report token con `expires_at`; `StatusScreen` para not_found/gone/rate_limited/error.
- **Scalability.** Motor en Kortex (escala aparte); Greenhouse orquesta (Vercel max pool respetado); public intake con budget global; entitlement per-org con cap/mes; async por outbox, no inline.

## Revisit when

- La integración Kortex pasa a producción (habilita la puerta conectada real).
- Emerge demanda de la puerta conectada suficiente para justificar la OAuth app + revisión de seguridad/PII.
- Un tercer lead magnet aparece (evaluar extraer un "lead magnet grader kit" reusable de los dos primeros).

## Related documents

- ADR AI Visibility Grader: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md` + `..._ARCHITECTURE_V1.md` (template a espejar).
- Growth domain: `GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`.
- Kortex boundary: `GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`, `GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md`, `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`, PDR-003.
- Headless render: `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`.
- Growth Forms: `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md` (+ TASK-1335/1336/1320/1327).
- Entitlement "un motor, N puertas": TASK-1277 (Delta en el ADR del grader AEO).
- Posicionamiento de superficie: PDR-006 (landing) + PDR-007 (este lead magnet).
- Programa: EPIC-024.
