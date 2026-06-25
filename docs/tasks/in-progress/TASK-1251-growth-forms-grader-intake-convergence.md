# TASK-1251 — Growth Forms ↔ AI Visibility Grader Convergence

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|api|public-site|reliability`
- Blocked by: `TASK-1229`
- Branch: `task/TASK-1251-growth-forms-grader-intake-convergence`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hacer converger el intake público a-medida del AI Visibility Grader (`grader_leads`/`grader_intake_events`/abuse-guard/captcha/`POST /api/public/growth/ai-visibility/run`, TASK-1240) sobre el **motor gobernado de formularios** (TASK-1229). Esta task NO duplica ni "estandariza hacia abajo": **sube de nivel** el intake artesanal del grader para que herede la robustez del motor (contratos versionados, consent snapshot, entrega con reintentos + dead-letter, abuse-guard/captcha compartidos, observabilidad, operabilidad por Nexa/MCP). Cierra la deuda de **dos stacks paralelos de public-submission en `greenhouse_growth`**.

## Why This Task Exists

Para lanzar EPIC-020 rápido, TASK-1240 shippeó un intake público **a-medida** que solo sirve al grader: su propia tabla de leads, su propio abuse-guard, su propio captcha, su propio endpoint. En paralelo, TASK-1229 nace como el **motor gobernado** que da esos mismos servicios — pero robustos, versionados y reutilizables — a *cualquier* formulario (WordPress/Astro/Next). Si ambos quedan vivos indefinidamente, mantenemos dos implementaciones del mismo problema en el mismo schema, con dos lugares donde arreglar bugs de consent/abuse/entrega. El domain arch §6.1 ya declara que "forms can feed AI diagnostics such as AI Visibility Grader"; TASK-1229 y TASK-1232 ya nombran esta convergencia como Open Question. Esta task la materializa como **upgrade gobernado**, no como deduplicación cosmética.

## Goal

- Extraer una capa compartida `src/lib/growth/**` de **abuse-guard + captcha port** consumida por el motor (TASK-1229) y por el grader, sin cambiar el comportamiento observable de ninguno.
- Migrar el intake público del grader para que un **submission gobernado del motor** dispare el run del grader (el grader pasa a ser un `host_surface`/form cuyo post-submit encola el diagnóstico), retirando el stack a-medida o dejándolo como proyección del motor.
- Preservar el contrato público vigente (`POST /run` + poll + `reportToken`) durante el cutover: cero regresión para el lead magnet ya lanzado.
- Dejar el grader heredando del motor: consent snapshot, attempts append-only + retry/dead-letter, signals canónicas `growth.forms.*`, y camino programático (Nexa/MCP/CLI) por construcción.

## Delta 2026-06-25 — Recalibración de discovery + implementación (Claude)

**Recalibración (la premisa de la spec cambió):** la spec asumía un lead magnet **ya lanzado** con tráfico vivo a migrar. Discovery confirmó que **el grader público NO ha lanzado**: `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` está **OFF en todos los environments** (rollout pendiente sign-off legal + captcha secret) y TASK-1245 (status reader `GET /run/[publicId]`), 1246 (launch), 1241/1242/1250 están **todos en to-do/**. → **No hay tráfico vivo que migrar, ni poll contract construido que preservar byte-a-byte.** El camino real es **converge-before-launch** (menor riesgo): el contrato HTTP de `POST /run` se mantiene estable, pero la maquinaria de "shadow + flip de tráfico vivo + 7d" se simplifica porque no hay tráfico hasta el launch. Decisión del operador (2026-06-25): **convergencia completa ahora**.

**Diseño bloqueado (arch-architect):** el grader es un **form gobernado del motor** (seed `fdef-ai-visibility-grader`); `POST /run` es una **fachada** detrás de `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` (default OFF) que persiste un **submission del motor** (`form_submission + consent_snapshot + outbox`, una tx) y devuelve el `submission_id` como handle de poll; un **reactive consumer** (`growth_grader_run_from_submission`, projection domain `growth`) encola el run + materializa el lead — **post-submit reactivo, no inline** (boundary atómico = submission+consent+outbox). El enqueue se modela como reactive consumer (OQ#4), NO como `form_destination` adapter (deja `form_destination` limpio para entregas reales HubSpot/email).

**Open Questions resueltas:** OQ#1 → fachada estable (no redirect). OQ#2 → `grader_leads` se conserva; el binding additive `submission_id` linkea lead↔submission (sin backfill: histórico a-medida queda NULL). OQ#3 → el port compartido nació en TASK-1229; **captcha ya convergió** (re-export), esta task convergió el **abuse-guard**. OQ#4 → reactive consumer (no destination). OQ#5 → converge-before-launch (la realidad lo decide).

**Estado: `code complete` + STAGING ON/VERIFICADO E2E; prod pendiente** (Runtime Rollout Completion Gate). Construido + verde + verificado en dev PG: Slice 1 (abuse-guard → core compartido `decideAbuse`), Slice 2a (migración seed + binding + flag), Slice 2b (fachada + reactive consumer + branch route), Slice 3 (UNIQUE parcial defense-in-depth).

**🟢 Rollout STAGING aplicado + verificado E2E (2026-06-25, pedido CEO):** push develop → deploy staging + ops-worker (cron `ops-reactive-growth` creado/ENABLED) → flags staging ON (`GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` + `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` + `TURNSTILE_SECRET`=test secret Cloudflare always-pass) → **smoke E2E verde:** `POST /run` → 202 `submissionId=fsub-9623896c…` → submission `delivered` + consent + outbox `published` → reactive consumer materializó **lead `glead-2d1e97f9`** + **run `EO-GRUN-00012`** linkeados (email en PG con consent, nunca al provider).

**Pendiente PROD (bloqueado, NO ejecutable por el agente):** (1) texto del aviso de consentimiento + URL política de privacidad cableados en la página del lead magnet (TASK-1241; el sitio ya tiene política), (2) `TURNSTILE_SECRET` real, (3) release control plane develop→main (aplica la migración a prod + flips). **Slice 4 (retiro del stack a-medida):** ejecutable **tras el flip prod verificado estable** — **sin espera fija de 7d (waiver CEO 2026-06-25)**; única regla que se mantiene: NUNCA en el mismo PR del cutover (reversibilidad).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md` (§6.1 forms → AI diagnostics)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (outbox+reactive+dead-letter; flag default-OFF+shadow+flip)

Reglas obligatorias:

- **No "estandarizar hacia abajo":** la convergencia es un upgrade — el grader debe terminar con MÁS robustez, no menos features. Si el motor aún no cubre una capacidad que el grader hoy tiene (p.ej. cost ceiling/budget diario de TASK-1240), esa capacidad se generaliza al motor, no se pierde.
- **Cero regresión del lead magnet ya lanzado:** el contrato público (`POST /run` + poll + `reportToken`) se preserva byte-compatible durante el cutover; el migration corre detrás de flag con shadow antes del flip.
- Extracción de primitives compartidos = refactor sin cambio de comportamiento observable; cubrir con tests de paridad antes/después **exhaustivos sobre la frontera de decisión** (thresholds de rate-limit, borde del budget, captcha pass/fail, hashing) — no solo happy path; es un primitive de seguridad.
- **El shadow es side-effect-free (crítico — el grader gasta LLM + email + HubSpot):** el path nuevo en sombra **compara el submission/contrato que PRODUCIRÍA, sin ejecutar efectos** — NO encola un run del grader (no gasto LLM), NO dispara email (TASK-1250), NO escribe a HubSpot (TASK-1242), NO crea un lead visible. Un "shadow" que escribe duplicaría costo y leads. Comparar shape/decisión, no ejecutar.
- **Inmutabilidad de la evidencia de consent:** al bindear `grader_leads` al `form_submission_consent_snapshot` del motor, preservar el consent ORIGINAL (copy/versión que el lead efectivamente aceptó al capturar) — NUNCA re-atribuirlo retroactivamente a la versión actual del form del motor (integridad legal Ley 21.719/GDPR; el consent evidence es inmutable y atado a lo mostrado al capturar).
- Submissions/attempts append-only o event-sourced; consent snapshot se conserva aunque falle delivery (invariante del motor).
- El email del lead nunca viaja a providers AI; solo delivery/HubSpot/consent (invariante TASK-1240/1250 preservado).

## Normative Docs

- `docs/tasks/to-do/TASK-1229-growth-forms-backend-api-parity-foundation.md` (Delta 2026-06-25 + Open Questions: la convergencia)
- `docs/tasks/to-do/TASK-1232-growth-forms-admin-cockpit-first-migration.md` (first migration pattern)
- `docs/tasks/complete/TASK-1240-growth-ai-visibility-public-run-intake-abuse-cost-controls.md` (el intake a migrar)
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1229` Growth Forms Backend/API Parity Foundation (el motor: contracts, submission/destination/consent model, outbox/consumer path, host surface registry, capa compartida `src/lib/growth/**` donde viven los primitives extraídos). **Bloqueante duro: sin el motor no hay a dónde converger.**
- `TASK-1240` (complete dev) — el intake a-medida a migrar (`grader_leads`, `grader_intake_events`, abuse-guard, captcha, `POST /run`).
- Coordinar con `TASK-1232` (define el patrón de "first real form migration" — esta task es, de hecho, una migración de form real y debe reusar ese patrón, no inventar otro).

### Blocks / Impacts

- Cierra la deuda de dos stacks paralelos de public-submission en `greenhouse_growth` (nombrada en TASK-1229 Delta 2026-06-25 + Open Questions y TASK-1232 Detailed Spec).
- Habilita que el grader sea operable por Nexa/MCP/CLI vía el contrato del motor (Full API Parity) sin trabajo grader-específico.
- Impacta `TASK-1242` (HubSpot lead handoff) y `TASK-1250` (email delivery): ambos leen el lead del intake — el migration debe preservar la fuente que consumen (o re-apuntarla al modelo del motor sin romper su contrato).
- Habilita el follow-up UI: re-render del lead magnet (`TASK-1241`) vía el renderer portable (`TASK-1231`) — fuera de scope aquí.

### Files owned

- `src/lib/growth/ai-visibility/public-intake/**` (migración del intake a-medida hacia el modelo del motor)
- `src/lib/growth/ai-visibility/__tests__/**` (tests de paridad/cutover del intake)
- `migrations/` (migración de convergencia: backfill/binding del lead del grader al submission del motor — additive, append-only)
- `docs/tasks/to-do/TASK-1251-growth-forms-grader-intake-convergence.md`

Extend/shared (NO owned — propiedad de TASK-1229): la capa compartida `src/lib/growth/**` (abuse-guard + captcha port extraídos), `src/lib/growth/forms/**` (submission/destination/consent interface), `src/app/api/public/growth/**`. La extracción de los primitives compartidos se coordina con el dueño de TASK-1229 (idealmente el port nace en 1229 y esta task lo consume; si 1229 ya cerró, esta task hace la extracción declarándolo).

## Current Repo State

### Already exists

- Intake a-medida del grader funcionando (TASK-1240): `src/lib/growth/ai-visibility/public-intake/**`, `greenhouse_growth.grader_leads`, `greenhouse_growth.grader_intake_events`, abuse-guard (rate-limit per-IP/email + budget diario), captcha port (Turnstile), `POST /api/public/growth/ai-visibility/run`.
- El motor gobernado de formularios (TASK-1229) `[verificar: estado de TASK-1229 al tomar esta task — debe estar complete]`: contratos, submission/destination/consent model, outbox/reactive delivery, host surface registry, capabilities `growth.forms.*`.
- Consumers downstream del lead: `TASK-1242` (HubSpot handoff) + `TASK-1250` (email) leen `grader_leads`.

### Gap

- El intake del grader no consume el motor: tiene su propio ledger, abuse-guard, captcha y endpoint en paralelo al modelo gobernado.
- No existe la capa compartida `src/lib/growth/**` de abuse-guard + captcha (hoy viven solo dentro de `ai-visibility/public-intake/**`).
- No existe el binding "submission del motor → run del grader" (el host_surface/form que dispara el diagnóstico).
- No hay tests de paridad que garanticen cutover sin regresión del lead magnet ya lanzado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth` (intake del grader + tablas del motor) + `src/lib/growth/**`
- Consumidores afectados: lead magnet público (TASK-1241), HubSpot handoff (TASK-1242), email delivery (TASK-1250), Reliability, Nexa/MCP
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `POST /api/public/growth/ai-visibility/run` + poll + `reportToken` (público, byte-compatible); la fuente del lead que leen TASK-1242/1250.
- Contrato nuevo o modificado: port compartido abuse-guard/captcha en `src/lib/growth/**`; binding submission→grader-run; el intake del grader pasa a emitir/consumir el submission model del motor.
- Backward compatibility: `compatible` (el contrato público no cambia; el cambio es interno + migración de almacenamiento).
- Full API parity: el grader queda operable por el contrato del motor (un primitive, muchos consumers); cero lógica de intake duplicada.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_leads`, `greenhouse_growth.grader_intake_events`, tablas del motor (`form_submission`, `form_submission_consent_snapshot`, `form_destination_attempt`, `form_host_surface` o nombres aprobados en TASK-1229).
- Invariantes que no se pueden romper:
  - El contrato público (`POST /run` + poll + `reportToken`) no cambia durante el cutover.
  - Consent snapshot se conserva aunque falle delivery; attempts append-only.
  - El cost ceiling / budget diario que hoy tiene el grader (TASK-1240) NO se pierde: se generaliza al motor o se preserva como policy del host_surface del grader.
  - Migración append-only / reversible: no DELETE destructivo de `grader_leads`/`grader_intake_events` sin validar el payload de reemplazo (regla BigQuery/SQL del repo aplica a cualquier migración de período/ledger).
  - `email_hash`/`ip_hash` siguen hasheados; nunca PII cruda en eventos.
  - **Binding `runPublicId`↔submission preservado:** el status reader de TASK-1245 (`GET /run/[publicId]`) debe seguir resolviendo estado→`reportToken` sobre el submission del motor; el `runPublicId` no cambia ni pierde su mapeo.
  - El grader-form tiene **múltiples post-submit consumers** (encolar diagnóstico + HubSpot handoff 1242 + email 1250), no uno solo: modelar el enqueue del diagnóstico como destination/post-submit del motor sin romper el modelo de `form_destination` (ver Open Question — decide si el motor necesita generalizar a "internal async destinations").
- Tenant/space boundary: público anónimo con captcha + rate-limit (igual que hoy); admin del form vía capabilities `growth.forms.*`.
- Idempotency/concurrency: `dedupe_fingerprint`/idempotency token del motor; el run del grader sigue siendo idempotente por su clave actual.
- **Boundary atómico del submit (NO atomizar los efectos externos):** la transacción síncrona del submit escribe todo-o-nada en una sola tx de Postgres `{form_submission + form_submission_consent_snapshot + outbox event(s)}`; el `200 OK` solo se devuelve con ese trío committeado. Los **múltiples post-submit consumers** (encolar grader-run + HubSpot handoff 1242 + email 1250) NO van dentro de esa tx (no 2PC sobre LLM/HubSpot/Resend; HubSpot caído no debe abortar la aceptación del lead): cada uno es un **reactive consumer idempotente** del evento committeado, con retry + dead-letter. Atomicidad del submit ✅ ≠ atomicidad de los efectos externos ❌. El fan-out a N consumers no es atómico entre sí; at-least-once + idempotencia = effectively-once.
- Audit/outbox/history: el submission del motor + attempts son el ledger; el run del grader cuelga del submission vía el evento, no inline.

### Migration, backfill and rollout

- Migration posture: `additive` (binding + proyección); evitar destructivo en el mismo PR del cutover.
- Default state: el path de convergencia detrás de flag (`GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` o equivalente, default OFF); el intake a-medida sigue activo hasta el flip.
- Backfill plan: bindear los `grader_leads` existentes al submission model del motor (o dejar el histórico como proyección read-only); validar conteos antes/después.
- Rollback path: flag OFF → el intake a-medida vuelve a ser el path activo (shadow no destructivo); revert PR.
- External coordination: ninguna externa nueva (Turnstile/HubSpot ya provisionados por TASK-1240/1242); coordinación interna con dueños de TASK-1229/1232.

### Security and access

- Auth/access gate: público vía captcha + rate-limit (preservado); admin del form vía capability.
- Sensitive data posture: email = PII con consent (Ley 21.719); hashing preservado; sin raw PII en eventos.
- Error contract: canonical errors; sin raw provider/internal errors al cliente; `captureWithDomain`.
- Abuse/rate-limit posture: el abuse-guard compartido preserva los límites actuales (per-email 3/día, per-IP 10/día, budget diario global) — generalizados al motor, no debilitados.

### Runtime evidence

- Local checks: tests de paridad del port compartido (antes/después), tests del binding submission→run, no-regresión del contrato público.
- DB/runtime checks: migración additive aplicada + conteos de leads pre/post + smoke del `POST /run` real contra el path nuevo en shadow.
- Integration checks: el lead sigue llegando a TASK-1242 (HubSpot) y TASK-1250 (email) sin cambios observables.
- Reliability signals/logs: `growth.forms.submission_error_rate`, `growth.forms.dead_letter_count` cubren ahora el grader; preservar/mapear `public_intake_*` de TASK-1240 durante la transición.
- Production verification sequence: shadow del path nuevo con flag OFF → comparar resultados contra el a-medida → flip → monitor.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Data invariants, tenant/access boundary e idempotency/concurrency explícitos.
- [ ] Migration/backfill/rollback posture explícita y proporcional al riesgo (additive + flag + shadow).
- [ ] Runtime/DB evidence listada (paridad + conteos + smoke público).
- [ ] Sin raw data leaks; canonical errors + signals + audit posture.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extraer la capa compartida (abuse-guard + captcha port)

- Mover/generalizar abuse-guard (rate-limit per-IP/email + budget diario) y captcha port (Turnstile) desde `ai-visibility/public-intake/**` a una capa compartida `src/lib/growth/**` consumida por el motor y el grader.
- Tests de paridad: el grader sigue rechazando/aceptando idéntico antes y después (cero cambio observable).

### Slice 2 — Binding submission del motor → run del grader

- Modelar el grader como `host_surface`/form del motor cuyo post-submit (vía outbox + reactive, no inline) **encola el diagnóstico** (`enqueueGraderRun`/`enqueueGraderDiagnostic`).
- Preservar el contrato público `POST /run` + poll + `reportToken` byte-compatible (el endpoint público puede mantenerse como fachada que internamente crea un submission del motor).
- Generalizar el cost ceiling/budget del grader al motor (o preservarlo como policy del host_surface).

### Slice 3 — Migración de almacenamiento + cutover detrás de flag

- Migración additive: bindear `grader_leads`/`grader_intake_events` al submission/consent/attempts del motor (o dejarlos como proyección read-only del histórico).
- Flag default-OFF + shadow: el path nuevo corre en sombra y se compara contra el a-medida antes del flip; validar conteos de leads pre/post.
- Verificar que TASK-1242 (HubSpot) y TASK-1250 (email) siguen leyendo el lead sin regresión.

### Slice 4 — Signals + retiro del stack a-medida

- Mapear/retirar las signals `public_intake_*` de TASK-1240 hacia las `growth.forms.*` del motor (sin perder cobertura de abuso/costo).
- Tras estabilización del flip, retirar (o congelar como proyección) el código a-medida redundante; documentar el delta en la arquitectura del grader y del motor.

## Out of Scope

- Re-render del lead magnet (`TASK-1241`) vía el renderer portable (`TASK-1231`) — follow-up UI separado.
- El HubSpot lead handoff (`TASK-1242`) y el email delivery (`TASK-1250`) — esta task preserva su fuente, no los reescribe.
- El destination adapter HubSpot Forms del motor (`TASK-1230`) — el grader usa el bridge CRM (TASK-1242), no el form-submission delivery.
- Cambiar el scoring/report builder del grader.

## Detailed Spec

La convergencia tiene dos pilares independientes en riesgo: (1) **extracción de primitives compartidos** (refactor sin cambio de comportamiento — bajo riesgo, alto valor inmediato) y (2) **migración del intake a-medida al submission model del motor** (alto riesgo — toca un path público lanzado, consent y almacenamiento de leads). Por eso el pilar 1 (Slice 1) se entrega y estabiliza antes de tocar el pilar 2 (Slices 2-4). El endpoint público `POST /run` se preserva como fachada estable durante toda la transición: el cambio es **interno** (qué primitive/almacenamiento usa por debajo), nunca del contrato que el lead magnet ya consume. Seguir el patrón de "first real form migration" que define `TASK-1232`, no inventar uno paralelo. Toda mutación de almacenamiento es additive + reversible por flag; nada destructivo hasta que el flip esté estable y validado por conteos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (extracción compartida, sin cambio de comportamiento) → estabiliza → Slice 2 (binding submission→run) → Slice 3 (migración + cutover detrás de flag, shadow antes del flip) → Slice 4 (signals + retiro).
- Slice 3 NUNCA flipea el flag a `true` en prod antes de: shadow verde + conteos de leads pre/post iguales + smoke público del `POST /run` sin regresión + confirmación de que TASK-1242/1250 siguen recibiendo el lead.
- El retiro del stack a-medida (Slice 4) MUST correr DESPUÉS del flip prod verificado estable — **sin espera fija de 7d (waiver CEO 2026-06-25)** — y NUNCA en el mismo PR del cutover.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El cutover rompe el lead magnet ya lanzado (`POST /run`) | public-site / growth | medium | Fachada byte-compatible + flag default-OFF + shadow + smoke público antes del flip | `growth.forms.submission_error_rate` / `public_intake_*` |
| Se pierde un lead durante la migración (TASK-1242/1250 dejan de recibirlo) | data / crm / communications | medium | Migración additive + binding validado por conteos pre/post + leak/parity tests | conteo leads pre/post + `lead_handoff_failed` |
| El grader pierde el cost ceiling/budget al converger | cost / reliability | medium | Generalizar el budget al motor (no eliminarlo) + test de circuit breaker | `public_intake_cost_window` |
| Migración destructiva irreversible de `grader_leads` | migration | low | Solo additive + proyección read-only del histórico; revert por flag; nada de DELETE sin validar reemplazo | migration check + conteos |
| Extracción del port cambia comportamiento de abuse/captcha sutilmente | security | medium | Tests de paridad antes/después (mismos accept/reject) | code review + `public_intake_blocked` |
| Shadow ejecuta efectos (doble LLM run / doble lead / doble email) | cost / data / comms | medium | Shadow side-effect-free: compara shape, NO encola run / email / HubSpot / lead visible | doble `provider_observations` / leads duplicados |
| Consent re-atribuido a versión actual del form (no la aceptada) | legal/privacy | medium | Preservar copy/versión original del consent en el snapshot; no reescribir histórico | audit de consent version |

### Feature flags / cutover

- Flag `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` (default `false`) `[verificar nombre en discovery]`: controla si `POST /run` crea un submission del motor (path nuevo) o usa el intake a-medida (path actual). Shadow con OFF, flip a `true` post smoke verde. Revert: flag a `false` + redeploy (<5 min Vercel).
- **Registrar la fila del flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` el mismo PR** (y en §Pendientes de acción si queda code-complete sin prender). `pnpm docs:closure-check` (feature-flags-audit --strict) bloquea el cierre si un `*_ENABLED` en código no tiene fila.
- Slice 1 (extracción) puede shippear sin flag (refactor cubierto por tests de paridad).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (port compartido); el grader vuelve al primitive in-place | <30 min | si |
| Slice 2 | flag OFF / revert PR; sin mutación de datos | <15 min | si |
| Slice 3 | flag a `false` (vuelve al intake a-medida); migración additive no se revierte pero queda inerte | <15 min | si (path), parcial (schema additive queda) |
| Slice 4 | re-habilitar el código a-medida congelado; revert PR del retiro | <30 min | si |

### Production verification sequence

1. `pnpm migrate:up` en staging + verify binding/tablas additive existen con default esperado.
2. Deploy a staging con flag `false` + verify el `POST /run` actual no cambió (smoke público + lead llega a TASK-1242/1250).
3. Correr el path nuevo en shadow + comparar resultado contra el a-medida (mismo lead, mismo run, mismo reportToken contract).
4. Flip flag `true` en staging + smoke público real (form → run → reportToken) + verify lead en HubSpot + email + conteos pre/post iguales.
5. Repetir 2-4 en producción con cooldown 24h.
6. Monitor signals post-flip hasta confirmar estable; recién entonces ejecutar Slice 4 (retiro). Sin espera fija de 7d (waiver CEO 2026-06-25); única regla: no retirar en el mismo PR del cutover.

### Out-of-band coordination required

- Coordinación interna con dueños de `TASK-1229` (capa compartida + submission model), `TASK-1232` (patrón de first migration) y `TASK-1240` (intake a-medida). N/A externo — repo-only change (Turnstile/HubSpot ya provisionados).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Abuse-guard + captcha viven en una capa compartida `src/lib/growth/**` consumida por el motor y el grader; tests de paridad verdes (cero cambio observable de accept/reject).
- [ ] Un submission gobernado del motor dispara el run del grader vía outbox + reactive (no inline); el grader es un `host_surface`/form del motor.
- [ ] El contrato público `POST /run` + poll + `reportToken` permanece byte-compatible; smoke público sin regresión; el binding `runPublicId`↔submission preserva el status reader de TASK-1245.
- [ ] El shadow es side-effect-free: comparó shape/decisión sin encolar run, email, HubSpot ni lead visible (cero doble gasto/lead durante la sombra).
- [ ] El consent migrado preserva la copy/versión original aceptada por el lead (no re-atribuida a la versión actual del form).
- [ ] El lead sigue llegando a `TASK-1242` (HubSpot) y `TASK-1250` (email); conteos de leads pre/post iguales.
- [ ] El cost ceiling/budget del grader se preserva (generalizado al motor), no se pierde.
- [ ] Migración additive + reversible por flag; sin DELETE destructivo de `grader_leads`/`grader_intake_events` sin validar reemplazo.
- [ ] Flag registrado en `FEATURE_FLAG_STATE_LEDGER.md`; `pnpm docs:closure-check` verde.
- [ ] El stack a-medida redundante queda retirado o congelado como proyección read-only, documentado en la arquitectura del grader y del motor.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1251`
- `pnpm ops:lint --changed`
- `pnpm migrate:status` + verify binding additive en staging.
- Smoke público del `POST /run` (shadow + post-flip) en staging.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (TASK-1229/1232/1240/1242/1250 + EPIC-020)
- [ ] Arquitectura del grader + del motor actualizadas con el delta de convergencia (un solo stack de public-submission)
- [ ] Si se introdujo el flag de convergencia, fila agregada a `FEATURE_FLAG_STATE_LEDGER.md` y `pnpm docs:closure-check` verde.

## Follow-ups

- Re-render del lead magnet (`TASK-1241`) vía el renderer portable (`TASK-1231`), consumiendo el `render_contract` del motor (UI; sigue a esta convergencia backend).
- Evaluar si otros lead magnets futuros nacen directamente sobre el motor (sin pasar por un intake a-medida).

## Open Questions

1. ¿El `POST /api/public/growth/ai-visibility/run` se preserva como fachada estable (recomendado, cero regresión) o se redirige al endpoint genérico del motor `POST /api/public/growth/forms/{slug}/submit`? Propuesta V1: fachada estable que internamente crea el submission.
2. ¿`grader_leads`/`grader_intake_events` se migran a las tablas del motor o se conservan como proyección read-only del histórico mientras el motor pasa a ser el SoT? Decidir en discovery según el costo del backfill.
3. ¿La capa compartida abuse-guard/captcha nace en `TASK-1229` (preferido) y esta task solo la consume, o la extrae esta task? Depende del estado de cierre de TASK-1229 al tomarla.
4. **Modelado del destino del grader-run:** ¿el enqueue del diagnóstico se modela como un `form_destination` adapter (tipo "internal async job") del motor, o como un post-submit reactive consumer distinto del modelo de destinations (que en TASK-1230 es HubSpot-céntrico)? Decide si TASK-1229 debe generalizar su abstracción de destination a destinos internos. Propuesta: post-submit reactive consumer sobre el submission, separado del adapter de destination CRM.
5. **Secuenciación vs launch (TASK-1246):** ¿la convergencia ocurre ANTES del launch público masivo (lanzar ya sobre el motor, menor riesgo) o DESPUÉS (migrar tráfico vivo, mayor riesgo)? Como 1246 es P1 y esta P2, el orden probable es launch-then-converge — la disciplina facade+shadow+flag+conteos+7d está diseñada precisamente para migrar tráfico vivo, pero conviene decidirlo explícito con el operador (idealmente converger antes del pico de tráfico).
