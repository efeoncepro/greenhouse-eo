# TASK-1242 — Growth AI Visibility: HubSpot Lead Handoff

## Delta 2026-06-25 — impacto de TASK-1251 (convergencia sobre el motor)

TASK-1251 **preservó `grader_leads` como la fuente del lead** (sin cambio de fuente para esta task). En el path convergente el lead lo materializa el reactive consumer `growth_grader_run_from_submission` (con un campo nuevo additive `submission_id`); el shape de `grader_leads` que esta task lee no cambia. Recomendación de modelado (consistente con 1251): el HubSpot handoff es **otro reactive consumer del mismo evento `growth.forms.submission_accepted`** del grader-form (o del lead ya materializado), idempotente, separado del enqueue del diagnóstico — NO un `form_destination` CRM inline. El email (PII) sigue viviendo sólo en el lead con consent.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|crm|integrations`
- Blocked by: `none` (TASK-1240/1235 complete)
- Branch: `task/TASK-1242-growth-ai-visibility-hubspot-lead-handoff`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir el lead capturado en el intake público (`grader_leads`, TASK-1240) en un **lead de ventas en HubSpot** (EPIC-020 D): `syncAiVisibilityRunToHubSpot` crea/actualiza el contact/company + props `ai_visibility_*` (score, `primary_gap`, `recommended_motion`) + lifecycle stage, vía el patrón **outbox + reactive consumer** (no POST inline en la route). Cierra el bow-tie: el grader (acquisition) entrega el lead a ventas (SQL).

## Estado de ejecución — `staging operativo + smoke E2E verificado` · prod gated EPIC-020 (2026-06-25)

Los 3 slices implementados + verificados (typecheck + build + 509 tests focales) **y rollout staging completo con smoke E2E real contra HubSpot**. El flag `GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED` está **ON en staging** (Vercel + ops-worker). **Prod queda OFF, gated por el launch de EPIC-020** (release control plane develop→main + sign-off; prod no tiene leads del grader hasta que el intake público lance).

**Smoke E2E PASÓ (2026-06-25):** run `EO-GRUN-00012` score `completed` (25.8) → publish snapshot → auto-trigger → reactive consumer (ops-worker) upsert **contact** `smoke-task1251@example.com` + **company** `example.com` con las 7 props `ai_visibility_*` (score/version/primary_gap/recommended_motion/report_url/last_run_at/competitors) + `hubspot_synced_at`. Registros de prueba borrados post-verificación (CRM limpio).

**3 hallazgos de runtime del smoke (todos corregidos):**
1. **Gate bug** — `executeLeadHandoff` exigía `gate.status === 'ready'`, más estricto que `publishGraderReportSnapshot` (que permite `partial`) → un score real publicado nunca llegaba. Fix: rechazar solo `insufficient_data`/`review_required` (commit `360fdd7ec`).
2. **Flag dual-location** — el WRITE corre en el **ops-worker (Cloud Run)**, no en Vercel; el flag se necesita en AMBOS. Sin él en el worker, el consumer salta `reason=disabled`. Fix: flag en el ops-worker + declarativo en `deploy.sh` (commit `69a9e48d5`).
3. **Worker con imagen vieja** — `gcloud run services update --update-env-vars` pineó la imagen pre-fix; requirió rebuild vía CI Ops Worker Deploy.

**Pendiente (prod, gated EPIC-020):** flag ON en Vercel prod + ops-worker prod (deploy.sh prod-branch) vía release control plane + sign-off. **Sub-task aparte** (decisión operador): captura de `first_name`/`last_name` en el intake público + columnas en `grader_leads` (1242 ya mapea `firstname`/`lastname` cuando existan).

## Delta 2026-06-25 — frontera con el HubSpot destination adapter del Forms engine (TASK-1230)

Hay **dos caminos de escritura a HubSpot en el dominio `growth`** que NO deben confundirse ni colapsar en un tercer cliente:

| Esta task (1242) — lead/CRM handoff | TASK-1230 — form submission delivery |
|---|---|
| `grader_leads` → upsert contact/company + back-fill props `ai_visibility_*` + lifecycle | una *submission* de cualquier form del motor → HubSpot **Forms** API (`/submissions/v3/.../secure/submit`) |
| Vía el **Cloud Run hubspot bridge** (patrón integraciones) | Vía el **destination adapter** del forms engine (TASK-1229 path) |
| Dispara al **completar el run** del grader | Dispara al **aceptar un submit** |

Son **complementarios, no redundantes** (uno es backfill CRM orientado a ventas; el otro es la entrega gobernada de submissions de cualquier form del motor). Frontera dura compartida: ambos **reusan el resolver de token canónico** + `captureWithDomain(err,'integrations.hubspot',…)`; **NUNCA** un cliente HubSpot paralelo. Si el grader migra su intake al forms engine (convergencia TASK-1229/1232), evaluar si este handoff sigue siendo un paso aparte (probable) o se modela como `destination` adicional del submission — decisión diferida, fuera de esta task.

## Delta 2026-06-25 — decisiones del operador (naming, no-deal, nombre/apellido)

1. **HubSpot property naming — label legible + property group.** Toda custom property `ai_visibility_*` se define con TRES partes: internal name `snake_case` (ej. `ai_visibility_score`) + **label en Title Case legible** (ej. "AI Visibility Score") + **property group** "AEO" que las agrupe en la UI. El label es cara visible del CRM para las personas de ventas — **NUNCA** dejar el internal name crudo como label. Aplica a todas las custom props de esta task y al `aeo_check_result` existente (label "AEO Check Result"). Las nativas (`email`/`firstname`/`lastname`) NO van al grupo AEO.
2. **NO crear negocios/deals.** Un lead que completa el AEO grader **no** está listo para ser oportunidad — se nutre (nurturing) primero. El handoff se queda en **Contact + Company** (back-fill de props + actividad del lead). **NUNCA** crear deals automáticamente ni mapear `ai_visibility_score_at_creation`/lifecycle SQL desde esta task. Esto elimina la fila Deal de la tabla §12.2 del arch para el scope de 1242.
3. **Capturar y guardar Nombre + Apellido.** Además del email (con consent), el intake debe pedir **nombre** y **apellido**, y el handoff los mapea a las **propiedades nativas de HubSpot** `firstname` / `lastname` (no custom). Cross-impact: requiere que `grader_leads` (TASK-1240) persista `first_name`/`last_name` — si el intake hoy sólo guarda email/consent/marca, hay que extenderlo (additive) antes de que 1242 pueda mapearlos.

## Why This Task Exists

El intake público (TASK-1240) captura el lead (email + consent + marca) pero **no lo sincroniza a HubSpot** — el lead muere en `grader_leads` sin llegar a ventas. El valor comercial del lead magnet es justamente el handoff: el reporte ya produce `primary_gap` + `recommended_motion` (TASK-1235) que orientan el siguiente movimiento comercial. Sin esto, el grader genera leads que nadie trabaja.

## Goal

- **Command gobernado `syncAiVisibilityRunToHubSpot(runId, …)` como primitive canónico (full API parity)** — una sola implementación server-side, muchos consumers: (1) reactive worker (disparo automático al completar el run), (2) endpoint admin de re-trigger/replay/backfill, (3) Nexa/MCP vía el loop `propose → confirm → execute`, (4) CLI/runbook. NUNCA lógica de negocio enterrada en el consumer; el consumer LLAMA al command.
- Upsert contact/company + props `ai_visibility_*` + lifecycle, vía outbox + reactive (idempotente, sin POST inline; write = cliente HubSpot in-app directo TASK-1230).
- Disparo automático al completar el run público (lead + score `completed` + reporte listos), respetando consent + sin PII sensible cruda.
- **Capability gobernada `growth.ai_visibility.lead_handoff.execute`** para la superficie operada por humano/agente (re-trigger/replay), grant en `runtime.ts` mismo PR. El worker automático corre con identidad de sistema (no chequea `can()`); la capability gatea el endpoint/Nexa/MCP/CLI.
- Reader gobernado del estado del handoff (para UI/Nexa/MCP: "¿se sincronizó este lead?") + reliability signal (lag/fallo/cobertura) + estado en `grader_leads.hubspot_synced_at`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

### Delta 2026-06-25 — write path = cliente HubSpot in-app directo, NO el Cloud Run bridge

**Corrección de baseline (verificada en repo).** El write a HubSpot NO va por un endpoint del Cloud Run Python bridge. TASK-574 absorbió ese servicio (legacy, cubre deals/products/quotes/lifecycle + webhook inbound; **no** tiene upsert de contact/company suelto). El path moderno (TASK-1230) es el **cliente HubSpot directo in-app**: `getHubSpotAccessToken()` ([src/lib/hubspot/access-token.ts](../../../src/lib/hubspot/access-token.ts)) + `fetch` directo a la HubSpot CRM v3 API. Referencia canónica del patrón: [src/lib/growth/forms/destinations/hubspot/adapter.ts](../../../src/lib/growth/forms/destinations/hubspot/adapter.ts). **NO** agregar endpoint Python al bridge ni deployar Cloud Run para este handoff.

Revisar y respetar:

- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` — outbox event + reactive consumer (NUNCA POST/PATCH inline en route Vercel); `captureWithDomain`.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — declarar el evento outbox.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.8 (HubSpot handoff), §11.2 (`syncAiVisibilityRunToHubSpot`).
- Referencia de implementación: `src/lib/growth/forms/destinations/hubspot/adapter.ts` (TASK-1230) + `src/lib/hubspot/access-token.ts` (token canónico).

Reglas obligatorias:

- **NUNCA** ejecutar POST/PATCH a HubSpot inline en un route handler Vercel: outbox event + reactive consumer (ProjectionDefinition growth, lane `ops-reactive-growth`).
- **Write a HubSpot = cliente in-app directo** (CRM v3 API) reusando `getHubSpotAccessToken()` + patrón `adapter.ts`. NUNCA un cliente/secret HubSpot paralelo. NUNCA plantear endpoint Python + Cloud Run deploy.
- **NUNCA** `Sentry.captureException` directo: `captureWithDomain(err, 'integrations.hubspot'|'growth', …)`.
- Idempotente: `outbox_reactive_log` ON CONFLICT + `grader_leads.hubspot_synced_at` guard; respetar consent (no sync sin consent).
- Sólo back-fill de props `ef_*`/`ai_visibility_*` (no sincronizar Greenhouse → pipelines `0-162`).

## Normative Docs

- `docs/tasks/complete/TASK-1240-growth-ai-visibility-public-run-intake-abuse-cost-controls.md` — `grader_leads` (email/consent/run_id/`hubspot_synced_at`).
- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — `primary_gap` + `recommended_motion` (del reporte).
- Skill `seo-aeo` `efeonce/AI_VISIBILITY_GRADER.md` + `commercial-expert` (bow-tie, lifecycle).

## Dependencies & Impact

### Depends on

- `TASK-1240` (complete dev) — `grader_leads` con el lead + consent + run_id.
- `TASK-1235` (complete) — `readGraderReport` → `primary_gap`/`recommended_motion`.
- Cliente HubSpot in-app directo (`getHubSpotAccessToken` + adapter pattern, TASK-1230) — ya existe, se reusa. HubSpot custom properties `ai_visibility_*` + grupo "AEO" (out-of-band, creables vía HubSpot API).
- **Captura de nombre/apellido en el intake** → **sub-task aparte** (decisión operador 2026-06-25): ~~el form público + `grader_leads` no capturan `first_name`/`last_name` hoy~~. **Cerrado por TASK-1257 (2026-06-25):** `grader_leads.first_name`/`last_name` capturados en el intake + propagados al lead; `getGraderLeadForHandoff` ya NO devuelve `null` y `execute.ts` manda nombre real a `firstname`/`lastname` nativos. El mapper de 1242 (sin cambios) los consume.

### Blocks / Impacts

- Cierra el bow-tie del lead magnet (acquisition → ventas).
- Alimenta el "AI Visibility Snapshot" (artefacto de ventas en HubSpot/Account 360).
- Coexiste con el HubSpot **destination adapter** del Forms engine (`TASK-1230`) — integraciones HubSpot distintas, mismo token + discipline; ver Delta de frontera 2026-06-25.

### Files owned

- `src/lib/growth/ai-visibility/hubspot/**` — `syncAiVisibilityRunToHubSpot` + mapper props + publisher de outbox event [verificar estructura].
- `src/lib/sync/**` — reactive consumer del evento [verificar].
- `src/lib/reliability/queries/growth-ai-visibility-*.ts` — signal del handoff.
- `migrations/` — sólo si se requiere estado/cola adicional (preferir reusar `grader_leads.hubspot_synced_at` + outbox).

## Current Repo State

### Already exists

- `grader_leads` con `email`/`consent`/`run_id`/`profile_id`/`hubspot_synced_at` (TASK-1240).
- `readGraderReport` → `primaryGap`/`recommendedMotion` + el score persistido.
- Outbox/reactive infra (`greenhouse_sync.outbox_events`) + Cloud Run hubspot bridge + `captureWithDomain`.

### Gap

- No existe `syncAiVisibilityRunToHubSpot` ni el mapper a props `ai_visibility_*`.
- No hay outbox event ni reactive consumer del handoff.
- Las HubSpot custom properties `ai_visibility_*` no existen aún (out-of-band).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration` (HubSpot write vía outbox).
- Source of truth afectado: HubSpot (contact/company props) + `grader_leads.hubspot_synced_at`.
- Consumidores afectados: ventas (Account 360 / HubSpot), el "AI Visibility Snapshot".
- Runtime target: `staging` + `production` gated.

### Contract surface

- Contrato existente a respetar: outbox event catalog, Cloud Run hubspot bridge, `grader_leads`, `readGraderReport`.
- Contrato nuevo: `syncAiVisibilityRunToHubSpot(runId, idempotencyKey)` + outbox event `growth.ai_visibility.lead_handoff` + reactive consumer + mapper props.
- Backward compatibility: `additive`.
- Full API parity (gobernado a nivel capability): `syncAiVisibilityRunToHubSpot` es el primitive canónico; consumers declarados = reactive worker · endpoint admin re-trigger (`api/.../growth/ai-visibility/lead-handoff/[runId]/retry`) · Nexa/MCP (`propose → confirm → execute`, el LLM nunca escribe directo) · CLI/runbook. Reader `readLeadHandoffStatus(runId)` para superficies de lectura. Capability `growth.ai_visibility.lead_handoff.execute` (+ grant en `runtime.ts`, guard `capability-grant-coverage.test`). NUNCA un click-handler remoto acoplado a la UI.

### Data model and invariants

- Entidades afectadas: `grader_leads` (UPDATE `hubspot_synced_at`; lee `email`/`first_name`/`last_name`/`consent`), HubSpot contact/company (upsert vía bridge). El contact se identifica/crea por `email` (nativo) + `firstname`/`lastname` (nativos). NO se crea deal.
- Invariantes que no se pueden romper:
  - **NUNCA** POST/PATCH HubSpot inline en route: outbox + reactive.
  - **NUNCA** sync sin consent (`grader_leads.consent = TRUE`).
  - **NUNCA** handoff de un run degradado (regla de honestidad). Solo se sincroniza un run `scored`/`succeeded` con score real; un run `insufficient_data`/`review_required` NO empuja un número a HubSpot (no hay "47/100" falso).
  - **NUNCA** mapear el score sin su `score_version` (`ai_visibility_score_v1`). El score viaja con la versión (prop `ai_visibility_score_version` o embebida en el `report_url`) para que la tendencia en HubSpot no compare scores de versiones distintas como si fueran la misma escala.
  - **NUNCA** crear una company desde un email personal (gmail/hotmail/outlook/etc.). Solo asociar/crear company con **dominio corporativo**; email personal = solo contact, sin company. El matching de company sigue las reglas de ownership del bridge, no inventa lógica nueva.
  - Idempotencia por `idempotencyKey`; el reactive re-lee de PG (no estado en memoria).
  - Sólo props `ai_visibility_*`/`ef_*`; no tocar pipelines `0-162`.
- Tenant/space boundary: lead público/pre-tenant; el binding a company sigue el matching del bridge (solo dominio corporativo).
- Idempotency/concurrency — **dos semánticas explícitas**:
  - Per-event: el `idempotencyKey` por `run_id` evita aplicar el **mismo run** dos veces.
  - Convergente: re-correr el grader para el mismo email genera **otro** run que debe **converger** sobre el mismo contacto/company por `email` (latest-run-wins en las props + `last_run_at`), NUNCA duplicar contacto.
  - `hubspot_synced_at` como guard de la state machine del outbox.
- Audit/outbox/history: el outbox event ES el ledger.

### Migration, backfill and rollout

- Migration posture: `none` (reusa `grader_leads` + outbox); additive sólo si se requiere cola dedicada.
- Default state: detrás del flag del intake (no hay leads hasta que TASK-1240 esté ON) + flag propio si se quiere gating extra.
- Backfill plan: leads ya capturados sin sync → re-disparar el handoff (idempotente).
- Rollback path: flag OFF / revert PR; el outbox event no consumido se descarta.
- External coordination: **crear las HubSpot custom properties `ai_visibility_*`** + verificar el bridge.

### Security and access

- Auth/access gate: el worker automático corre server-side con identidad de sistema (sin `can()`). El endpoint admin de re-trigger/replay (full API parity) es capability-gated por `growth.ai_visibility.lead_handoff.execute` (least-privilege); sin endpoint público.
- Sensitive data posture: email = PII con consent (Ley 21.719); no enviar raw provider text a HubSpot. El `ai_visibility_competitors_detected` se mapea desde la **lista normalizada acotada**, NUNCA el dump crudo del provider.
- Atribución (mide o no existió): setear **Original Source** nativo de HubSpot + marca de origen del lead magnet (ej. `ai_visibility_lead = true` o source tag) para poder medir conversión grader → SQL y alimentar el "AI Visibility Snapshot".
- `report_url` access model: link **estable, no enumerable** (token), no expone el reporte de un lead a otro. Definir el modelo de acceso antes del handoff productivo.
- Consent revocado (Ley 21.719 — derecho a supresión): si el lead revoca consent después del sync, el contacto ya está en HubSpot → definir el path de supresión/anonimización (follow-up, pero nombrado, no resuelto callado).
- Error contract: `captureWithDomain('integrations.hubspot'|'commercial', …)`; sin raw HubSpot errors al cliente.
- Abuse/rate-limit posture: el handoff es interno (post-run); hereda los abuse controls de TASK-1240; respeta los rate limits del bridge.

### Runtime evidence

- Local checks: tests del mapper (lead+reporte → props), idempotencia, no-sync-sin-consent.
- DB/runtime checks: outbox event emitido + `hubspot_synced_at` actualizado.
- Integration checks: smoke contra HubSpot sandbox/staging (contact upsert + props).
- Reliability signals/logs: `growth.ai_visibility.lead_handoff_lag`/`_failed`, steady=0. **+ signal de cobertura** `growth.ai_visibility.lead_handoff_uncovered`: leads con `consent=TRUE` + run `scored` pero **sin `hubspot_synced_at`** pasados N min (detecta handoff saltado silenciosamente; patrón VIEW canónica + signal). steady=0.
- Production verification sequence: lead real → outbox → bridge → contact en HubSpot con props.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Outbox + reactive (no POST inline), idempotencia (per-event + convergente) y consent-gate explícitos.
- [ ] Gate de run-scored: no handoff de runs `insufficient_data`/`review_required` (test).
- [ ] `score_version` viaja con el score (no comparar versiones distintas).
- [ ] Dedup de company por dominio corporativo; email personal = contact-only (test).
- [ ] Signal de cobertura `lead_handoff_uncovered` además de lag/failed.
- [ ] Migration posture explícita (reusa grader_leads/outbox); props HubSpot como out-of-band.
- [ ] Evidencia runtime (tests + smoke HubSpot staging) listada.
- [ ] Sin raw HubSpot errors al cliente; `captureWithDomain`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Command gobernado (primitive) + mapper + helper email-domain + outbox event

- Helper `classifyEmailDomain(email)` (corporate vs free/personal) — primitive nueva reusable (no existe).
- `syncAiVisibilityRunToHubSpot(runId, …)`: command canónico de parity. Lee `grader_leads` + `readGraderReport` → mapper a props `ai_visibility_*` (`overallScore` + `scoreVersion` + `primaryGap` + `recommendedMotion` + `report_url` del snapshot + `last_run_at`). Gate `score_status='completed'` + consent-gate. Publica outbox event `growth.ai_visibility.lead_handoff_requested`. Tests del mapper + gate + dedup + idempotencia.
- **Trigger automático:** emitir el evento desde el scoring command cuando el score queda `completed` Y existe `grader_lead` con consent para el `run_id` (in-tx con el upsert del score).

### Slice 2 — Reactive consumer + write HubSpot in-app directo + estado + signals

- ProjectionDefinition `domain:'growth'` (lane `ops-reactive-growth`) re-lee el lead de PG → **cliente HubSpot CRM v3 in-app directo** (`getHubSpotAccessToken` + patrón `adapter.ts`): upsert contact (por email) + company (por dominio corporativo) + props + asociación. Actualiza `grader_leads.hubspot_synced_at`.
- Flag `GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED` (default OFF + ledger). 3 reliability signals (`lead_handoff_lag`/`_failed`/`_uncovered`). Smoke HubSpot staging.

### Slice 3 — Superficie gobernada (full API parity)

- Capability `growth.ai_visibility.lead_handoff.execute` en `entitlements-catalog.ts` + grant en `runtime.ts` (mismo PR; guard `capability-grant-coverage.test`).
- Endpoint admin de re-trigger/replay (`POST api/.../growth/ai-visibility/lead-handoff/[runId]/retry`) que llama al command gobernado (capability-gated, idempotente).
- Reader `readLeadHandoffStatus(runId)` (estado del handoff para UI/Nexa/MCP). Declarar el path Nexa/MCP (`propose → confirm → execute`).

## Out of Scope

- La página pública (EPIC-020 C / TASK-1241).
- Crear las HubSpot custom properties (out-of-band; documentar cuáles, con label legible Title Case).
- **Crear negocios/deals en HubSpot** — un lead del grader NO es una oportunidad (se nutre primero; el handoff queda en Contact + Company). Sin `ai_visibility_score_at_creation` ni lifecycle SQL automático.
- Sincronizar Greenhouse → pipelines `0-162`.
- El "AI Visibility Snapshot" UI en Account 360 (follow-up).

## Detailed Spec

El handoff sigue el patrón canónico HubSpot del repo: **outbox event + reactive consumer**, NUNCA POST inline. El command lee el lead (`grader_leads`) + el reporte (`readGraderReport`) y mapea a props `ai_visibility_*`. El consent es gate duro (no sync sin consent). El bridge (Cloud Run) hace el upsert; `hubspot_synced_at` marca el estado + idempotencia. Las custom properties HubSpot se crean out-of-band (documentar el set exacto).

**Semántica de upsert (create-or-update):** la operación es un **upsert idempotente**, no un insert ciego.

- **Contact:** matchear por `email` (clave nativa). Si no existe → **crear** con `email`/`firstname`/`lastname` + props `ai_visibility_*`. Si existe → **actualizar** esas props (latest-run-wins) sin duplicar el contacto ni pisar campos ajenos al handoff.
- **Company:** matchear por **dominio corporativo** del email. Si no existe (y el dominio es corporativo) → **crear** + asociar al contact. Si existe → **actualizar** sus props `ai_visibility_*` + asociar el contact. Email personal → no se crea/asocia company (contact-only).
- El upsert solo escribe el subconjunto de props del handoff; nunca reemplaza el registro completo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (mapper + command + outbox) → Slice 2 (reactive consumer + bridge + estado). El consumer (2) consume el evento que emite el command (1).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| POST HubSpot inline → bloquea/timeouts route | reliability | low | outbox + reactive (patrón canónico) | `lead_handoff_lag` |
| Sync sin consent (PII) | legal (Ley 21.719) | medium | consent-gate duro + test | code review |
| Props HubSpot inexistentes → fallo silencioso | integration | medium | crear props out-of-band + validar en smoke | `lead_handoff_failed` |
| Doble sync / contacto duplicado | data quality | low | upsert convergente (match por email) + idempotencia + `hubspot_synced_at` guard | test idempotencia |
| Handoff de run degradado → score falso a ventas | data quality | medium | gate run-scored (no sync `insufficient_data`/`review_required`) | code review + test |
| Company basura desde email personal (gmail) | data quality | medium | dedup por dominio corporativo; email personal = contact-only | test dedup |
| Handoff saltado silenciosamente | reliability | medium | signal de cobertura `lead_handoff_uncovered` (consent+scored sin `hubspot_synced_at`) | `lead_handoff_uncovered` |

### Feature flags / cutover

- Sin flag nuevo obligatorio (gateado de facto por el intake OFF → no hay leads). Opcional flag de gating del handoff. Cutover = el intake genera leads + el consumer corre.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (command/mapper/event) | <5 min | si |
| Slice 2 | flag/consumer OFF + revert PR | <10 min | si |

### Production verification sequence

1. Crear HubSpot custom properties `ai_visibility_*` (out-of-band).
2. Staging: lead real → outbox → reactive → contact en HubSpot con props + `hubspot_synced_at`.
3. Verificar idempotencia (re-disparo no duplica) + signals en steady.
4. Prod: vía release control plane junto a EPIC-020.

### Out-of-band coordination required

- **Crear las HubSpot custom properties `ai_visibility_*`** (portal 48713323).
- Verificar el Cloud Run hubspot bridge acepta el upsert.
- Coordinar con TASK-1240 (consent) + TASK-1241 (cuándo se completa el flujo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `syncAiVisibilityRunToHubSpot(runId, idempotencyKey)` lee lead + reporte → props `ai_visibility_*`; idempotente; consent-gate.
- [ ] Outbox event + reactive consumer (NUNCA POST inline); el consumer re-lee de PG.
- [ ] `grader_leads.hubspot_synced_at` refleja el estado; re-disparo no duplica.
- [ ] Reliability signal del handoff (lag/fallo) en steady; `captureWithDomain`.
- [ ] Smoke HubSpot staging: contact/company upsert con props.
- [ ] Sin PII sensible cruda ni raw provider/HubSpot text a HubSpot/cliente.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- Smoke HubSpot staging (contact upsert)
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arch `## Delta` + `EVENT_CATALOG` (evento nuevo) + `EPIC-020` Child Task D
- [ ] chequeo de impacto cruzado (TASK-1240/1241 + Account 360)

## Follow-ups

- "AI Visibility Snapshot" en Account 360 (artefacto de ventas que lee estas props).
- Re-sync al re-correr el grader (tendencia en HubSpot).

## Open Questions

1. Set de HubSpot custom properties `ai_visibility_*` (Contact + Company; **sin Deal**). Cada una con internal name `snake_case` + **label Title Case legible** + **property group "AEO"** (las custom van todas a ese grupo; las nativas no):
   - Company: `ai_visibility_score` ("AI Visibility Score"), `ai_visibility_primary_gap` ("AI Visibility Primary Gap"), `ai_visibility_recommended_motion` ("AI Visibility Recommended Motion"), `ai_visibility_report_url` ("AI Visibility Report URL"), `ai_visibility_last_run_at` ("AI Visibility Last Run At"), opcional `ai_visibility_competitors_detected` ("AI Visibility Competitors Detected").
   - Contact: nativas `email` + `firstname` + `lastname` + `ai_visibility_last_submit_at` ("AI Visibility Last Submit At").
   Confirmar el set final con `commercial-expert` + el bridge.
2. Lifecycle stage del lead: **NO** crear deal. Tope = `lead`/`MQL` para nurturing (decidir MQL automático por score con `commercial-expert`, bow-tie). El paso a SQL/oportunidad es trabajo comercial posterior, fuera de este handoff.
3. ¿`grader_leads` (TASK-1240) ya persiste `first_name`/`last_name`? Si el intake hoy sólo guarda email/consent/marca, extenderlo (additive) + actualizar el form público para pedir nombre y apellido antes de que 1242 los pueda mapear.
4. **Props lean — el detalle vive en el reporte.** El grader produce 7 dimensiones (entity clarity, category ownership, message alignment, etc.). HubSpot guarda solo el **titular** (score + primary_gap + recommended_motion + report_url + last_run_at); el desglose completo vive detrás del `report_url`. NO crear 7 props que nadie mantiene. Confirmar el subconjunto final con `commercial-expert`.
5. **Frontera de dominio.** El handoff es de `growth` (reactive consumer en `growth.ai_visibility` / `src/lib/sync`), NUNCA en `commercial` (revenue motion ya cualificado — un lead del grader todavía no lo es). Consistente con "no crear deals".
6. **`report_url` access model** + **consent revoke** (Ley 21.719): definir token estable no enumerable para el link, y el path de supresión si el lead revoca consent post-sync (follow-up, pero decidido antes del rollout productivo).
