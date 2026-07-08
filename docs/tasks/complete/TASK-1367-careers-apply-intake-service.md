# TASK-1367 — Careers Apply Intake Service

## Delta 2026-07-08 (recalibración post-Discovery)

- **Atomicidad recalibrada:** Person (`createIdentityProfile`, `account-360`, email-first) + `reconcileCandidateFacet` + `createHiringApplication` son **3 commits separados** (ninguna función acepta client externo). Diseño real = **multi-step IDEMPOTENTE** (reconcile por email + upsert por `identity_profile_id` + dedupe `UNIQUE(opening_id, identity_profile_id)` → retry seguro), NO single-transaction. La concurrencia la resuelve el UNIQUE (→ 409 → success genérico).
- **Backend impact `api` → `migration`:** (a) NO existe columna de portafolio/LinkedIn en `candidate_facet` → additive `portfolio_url`/`linkedin_url` + extender `reconcileCandidateFacet`; (b) el rate-limit necesita contar ventanas por `email_hash`/`ip_hash` → tabla append-only `hiring_application_intake_events` (mirror del grader). **consent + source columns YA EXISTEN** (sin migración de consent).
- **Gap reader:** `getPublicOpeningByPublicId` NO expone el `opening_id` interno (que `createHiringApplication` necesita) → agregar reader `resolvePublishedOpeningIdByPublicId` (published-gated).
- **Reuso confirmado:** shared security core `src/lib/growth/public-submission/{abuse-guard,captcha}` (`decideAbuse`, `turnstileCaptchaVerifier`, `hashIdentifier`) + validador puro estilo grader + respuesta genérica (duplicado = mismo success 202).
- **Flag confirmado:** `HIRING_PUBLIC_APPLICATIONS_ENABLED` default OFF (404 invisible, mirror public-intake) + Turnstile requerido (fail-closed en prod).

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
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-353`
- Branch: `task/TASK-1367-careers-apply-intake-service`
- Legacy ID: `split de TASK-354 (backend half)`
- GitHub Issue: `none`

## Summary

El servicio backend que recibe una postulación pública y la ancla al dominio `Hiring / ATS` sin abrir un pipeline paralelo: endpoint público `POST /api/public/hiring/applications`, validación tipada, reconciliación `Person → candidate_facet → hiring_application`, dedupe/idempotency, persistencia de consentimiento + source attribution, anti-abuse y respuestas genéricas seguras. Es la mitad **backend** del split de TASK-354; la careers UI (TASK-354) es su cliente delgado.

## Why This Task Exists

TASK-353 dejó la foundation (`talent_demand → hiring_opening → candidate_facet → hiring_application`) y el publication contract allowlist, pero **no existe forma de que un candidato externo entre al sistema**: sin apply service no hay `applications` de origen público, y por lo tanto 1360/1361 (assessment) no tienen a quién evaluar. TASK-354 era un híbrido UI+backend; se parte por Execution profile (Task Authoring Contract: backend-data foundation primero, ui-ux consumer después) para que el service exista con contrato gobernado y la UI sea un cliente delgado (Full API Parity).

## Goal

- Exponer un endpoint público gobernado que reciba una postulación, la valide y la ancle a `Person → candidate_facet → hiring_application` idempotentemente.
- Persistir consentimiento explícito + `source='public_careers'` + versión de copy/legal, sin efectos síncronos pesados (scoring/email/handoff salen async).
- Responder genérico y seguro (nunca revelar dedupe, estado interno ni existencia previa de la persona) + anti-abuse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (foundation + publication contract)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (Person = `identity_profiles`; una persona = una `candidate_facet`)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` + `src/lib/growth/ai-visibility/public-intake/**` (patrón de intake público anti-abuse `[verificar]`)
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (nodo N3; contrato de datos del apply)

Reglas obligatorias:

- Reconciliar SIEMPRE `Person` primero (`identity_profiles`), luego `reconcileCandidateFacet` (upsert person-first), luego `createHiringApplication`. `candidate_facet.identity_profile_id` es NOT NULL + UNIQUE → una persona = una faceta.
- Dedupe determinístico por `openingId + normalizedEmail + window` + `dedupe_fingerprint` como idempotency key. El store ya tiene `UNIQUE(opening_id, identity_profile_id)` (409) — el service lo traduce a **success genérico**, no error revelador.
- Validación tipada con **assertion functions canónicas** (NO introducir Zod nuevo — `greenhouse-backend`). Errores es-CL vía `toHiringErrorResponse`/`hiringInvalidBodyResponse`; nunca prosa inglesa raw ni detalle técnico al público.
- Efectos pesados (scoring, email, revisión, handoff) FUERA del submit síncrono → eventos/jobs posteriores.
- V1 **links-only** (portafolio/LinkedIn como enlace en `candidate_facet`); el upload de archivo (CV) es TASK-1362 (necesita quarantine/scan). NO tocar la plataforma de assets acá.
- `captureWithDomain(err, 'hiring', …)` para observabilidad; NUNCA `Sentry.captureException` directo.

## Normative Docs

- `docs/tasks/to-do/TASK-354-public-careers-landing-apply-intake.md` (la mitad UI que consume este service)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`

## Dependencies & Impact

### Depends on

- `TASK-353` (schema `greenhouse_hiring` + store `src/lib/hiring/**`: `reconcileCandidateFacet`, `createHiringApplication`, publication contract)
- `src/lib/hiring/publication.ts` (`listPublicOpenings` / `getPublicOpeningByPublicId` — para validar que el `openingId` esté publicado)
- `greenhouse_core.identity_profiles` + el reconciler de Person `[verificar nombre canónico]`
- Anti-abuse/rate-limit compartido `[verificar]` (`src/lib/growth/ai-visibility/public-intake/abuse-guard.ts` como referencia)

### Blocks / Impacts

- `TASK-354` (careers UI) — es su cliente directo (bloqueada por esta task)
- Habilita que 1360/1361 (assessment) tengan candidatos reales
- `source='public_careers'` para analítica de conversión futura

### Files owned

- `src/lib/hiring/public-careers/schema.ts` (validación tipada del payload)
- `src/lib/hiring/public-careers/submit-application.ts` (`submitPublicHiringApplication`)
- `src/app/api/public/hiring/applications/route.ts` (endpoint público)
- `src/lib/hiring/public-careers/**` (helpers de reconciliación/dedupe/consent)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (delta del apply intake)

## Current Repo State

### Already exists

- Foundation Hiring (TASK-353): schema `greenhouse_hiring` + store `src/lib/hiring/**` (`reconcileCandidateFacet` upsert person-first, `createHiringApplication` con dedupe `UNIQUE(opening_id, identity_profile_id)` → 409) + publication contract allowlist.
- Error contract canónico (`toHiringErrorResponse`, `hiringInvalidBodyResponse`, `HiringValidationError`).
- Patrón de intake público con anti-abuse en `src/lib/growth/ai-visibility/public-intake/**` `[verificar]`.

### Gap

- No existe endpoint público de apply ni el service `submitPublicHiringApplication`.
- No existe el schema de validación del payload público de postulación.
- No existe el reconciliador end-to-end Person→facet→application desde origen público con consentimiento + attribution.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (endpoint público hostil, PII de candidato, dedupe/idempotency, consentimiento legal)
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_hiring.hiring_application` + `candidate_facet` (creados vía store TASK-353) + `greenhouse_core.identity_profiles` (Person)
- Consumidores afectados: TASK-354 (careers UI), analítica futura, desk (TASK-355)
- Runtime target: `local` → `staging` → `production`

### Contract surface

- Contrato existente a respetar: `reconcileCandidateFacet`, `createHiringApplication`, publication contract, error contract canónico
- Contrato nuevo: `submitPublicHiringApplication(input)` + endpoint `POST /api/public/hiring/applications` + schema de validación tipado
- Backward compatibility: `additive` (nuevo endpoint + helpers; sin romper 353)
- Full API parity: la lógica vive en `src/lib/hiring/public-careers/**` (command); la UI (354) y cualquier otro consumer (import CSV futuro, referral) postean el mismo contrato

### Data model and invariants

- Entidades afectadas: `identity_profiles` (Person, reconcile), `candidate_facet` (upsert person-first, UNIQUE por persona; portafolio/LinkedIn como links), `hiring_application` (create, dedupe)
- Invariantes que no se pueden romper:
  - Person-first: reconcile Person → facet → application, en ese orden, atómico
  - una persona = una `candidate_facet` (UNIQUE `identity_profile_id`)
  - dedupe determinístico (`openingId + normalizedEmail + window`) → success genérico, nunca duplica application
  - consentimiento + `source='public_careers'` + versión copy/legal SIEMPRE persistidos
  - respuesta pública genérica: nunca revela dedupe/estado/existencia previa/PII de terceros
  - efectos pesados async (no en el submit síncrono)
- Tenant/space boundary: origen público (sin sesión); scope interno lo aplica el desk downstream. El endpoint NO expone lectura de applications.
- Idempotency/concurrency: idempotency key = `dedupe_fingerprint`; submit atómico en `withGreenhousePostgresTransaction`; doble submit/retry = mismo resultado
- Audit/outbox/history: evento de submit (`hiring.application.created` ya existe en 353) + audit mínimo de dedupe/rechazo por abuso SIN payload sensible innecesario

### Migration, backfill and rollout

- Migration posture: `additive` (probable sin schema nuevo — reusa tablas de 353; si se agrega columna de consent/version, additive con DEFAULT) `[verificar en Discovery]`
- Default state: `enabled` gateable por flag público si se quiere rollout gradual (`CAREERS_PUBLIC_APPLY_ENABLED` opcional) — decidir en Discovery
- Backfill plan: `none`
- Rollback path: `revert PR + redeploy` (additive); si flag, apagar el flag
- External coordination: `none` (repo-only + DB vía release pipeline)

### Security and access

- Auth/access gate: **público sin sesión** — el gate es anti-abuse (rate-limit por IP/email hash + captcha si aplica, patrón `public-intake`) + validación estricta, NO capability (no hay actor autenticado)
- Sensitive data posture: PII de candidato (nombre/email/teléfono) — persistir minimizado, consentimiento explícito, NUNCA loggear PII cruda; el email se normaliza para dedupe (hash para audit)
- Error contract: `toHiringErrorResponse`/`hiringInvalidBodyResponse` (es-CL, genérico); 429 genérico en rate-limit; nunca detalle técnico
- Abuse/rate-limit posture: rate-limit + anti-spam mínimo real del repo; sanitizar texto libre + URLs antes de persistir

### Runtime evidence

- Local checks: unit del schema de validación (casos válidos/ inválidos/ maliciosos) + unit del dedupe determinístico; test de que el submit NO dispara efectos pesados
- DB/runtime checks: smoke contra PG dev — postular a un opening publicado real → verificar Person+facet+application creados; doble submit → 1 sola application; opening no publicado → rechazo
- Integration checks: `none` (sin providers externos)
- Reliability signals/logs: `hiring.application.created` (existente); audit de rechazo por abuso; `captureWithDomain`
- Production verification sequence: migrate/deploy staging → curl público al endpoint con opening publicado → verificar application + dedupe + respuesta genérica → repetir prod vía release pipeline

### Acceptance criteria additions

- [ ] Source of truth (`hiring_application`/`candidate_facet`/`identity_profiles`) + contract surface (`submitPublicHiringApplication`, `POST /api/public/hiring/applications`) + consumers nombrados.
- [ ] Invariantes (person-first, una-persona-una-faceta, dedupe→success genérico, consent+attribution, async pesado) explícitos y con test.
- [ ] Access boundary: público anti-abuse (no capability); el endpoint NO expone lectura.
- [ ] Migration/rollback posture explícito (additive / flag opcional).
- [ ] Evidencia DB real: postular → Person+facet+application; doble submit → 1; opening despublicado → rechazo.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `src/lib/hiring/public-careers/**` (command), no en el route ni en el cliente.
- [ ] Modelado como command (`submitPublicHiringApplication`), no click-handler remoto.
- [ ] Write con validación + idempotencia + audit + errores canónicos; efectos pesados async.
- [ ] Sin capability (origen público); el gate es anti-abuse. Downstream (desk) sí capability-gated.
- [ ] Camino programático: `POST /api/public/hiring/applications`; otros consumers (referral/import) postean el mismo contrato.
- [ ] Un command, muchos consumers (careers UI, futura import/referral) sin lógica duplicada.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Validation schema + dedupe

- `src/lib/hiring/public-careers/schema.ts`: validación tipada del payload (nombre, apellido, email, teléfono opcional, portafolio/LinkedIn como URL, disponibilidad, mensaje opcional, consentimiento) con assertion functions canónicas (NO Zod); normalización de email + URLs; mensajes es-CL seguros.
- Helper de dedupe determinístico (`openingId + normalizedEmail + window` → `dedupe_fingerprint`).

### Slice 2 — Submit command (reconciliation)

- `submitPublicHiringApplication(input)`: en `withGreenhousePostgresTransaction` → reconcile Person → `reconcileCandidateFacet` (con links portafolio/LinkedIn) → `createHiringApplication` (con `dedupe_fingerprint`, `source='public_careers'`, consent + versión copy/legal). Traduce el 409 del store a **success genérico**. Efectos pesados NO acá.

### Slice 3 — Public endpoint + anti-abuse

- `POST /api/public/hiring/applications`: parse + validación + rate-limit/anti-spam (patrón `public-intake`) + sanitización + llamada al command + respuesta genérica (`success`/429/error), `captureWithDomain('hiring')`. Verifica que el `openingId` esté publicado (via publication contract) antes de persistir.

## Out of Scope

- La careers UI (listing/detalle/apply form) — TASK-354.
- Upload de archivo CV/portafolio — TASK-1362 (V1 es links-only).
- Assessment (envío/rendición del test) — TASK-1360/1361/1363; el apply NO dispara el test.
- Desk/bandeja interna — TASK-355. Handoff/decisión — TASK-356.

## Detailed Spec

Espejar el patrón de intake público del AEO grader (`src/lib/growth/ai-visibility/public-intake/**`) para el anti-abuse + respuesta genérica `[verificar]`, y el store de TASK-353 para la reconciliación. El command es el único punto que toca el rollup de agregados; el route es delgado (auth-less + anti-abuse + validación + delega). El detalle de columnas de consent/version se resuelve en Discovery contra el schema real (`[verificar]` si `candidate_facet`/`hiring_application` ya tienen columnas de consent o hace falta migración additive).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema+dedupe) → Slice 2 (command) → Slice 3 (endpoint+anti-abuse). El endpoint no se expone sin el anti-abuse (Slice 3 es atómico: endpoint + guard juntos).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Endpoint público abusado (spam/scraping) | api / abuse | medium | Rate-limit por IP/email hash + captcha si aplica + validación estricta | tasa de submits/errores anómala |
| Fuga de estado interno en la respuesta | seguridad / privacy | medium | Respuesta genérica única + 409→success; test anti-leak | revisión de payloads de respuesta |
| Duplicados por retry/doble submit | data | medium | `dedupe_fingerprint` + `UNIQUE(opening_id, identity_profile_id)` | conteo applications vs personas |
| PII logueada o expuesta | privacy | low | Minimización + email hash para audit + nunca PII en logs | audit de logs |
| Persona paralela (no person-first) | identity | low | Reconcile Person→facet→application obligatorio + UNIQUE facet | drift en 360 |

### Feature flags / cutover

- Opcional `CAREERS_PUBLIC_APPLY_ENABLED` (decidir en Discovery). Si se usa: default OFF hasta smoke en staging + registrar en `FEATURE_FLAG_STATE_LEDGER.md`. Si no, additive con revert por PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-2 | revert PR (helpers/command additive) | <10 min | si |
| Slice 3 | apagar flag (si existe) o revert PR + redeploy | <10 min | si |

### Production verification sequence

1. Deploy staging → curl público a `POST /api/public/hiring/applications` con un `openingId` publicado real.
2. Verificar en PG: Person + `candidate_facet` + `hiring_application` creados, `source='public_careers'`, consent persistido.
3. Doble submit → 1 sola application (dedupe). Opening despublicado → rechazo genérico.
4. Repetir en prod vía release pipeline.

### Out-of-band coordination required

- N/A — repo-only + DB vía release pipeline.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `submitPublicHiringApplication` reconcilia Person→facet→application atómicamente con `source='public_careers'` + consent + versión copy/legal.
- [ ] Dedupe determinístico → doble submit/retry = 1 application; el 409 del store se traduce a success genérico.
- [ ] `POST /api/public/hiring/applications` valida (assertion functions, NO Zod), aplica anti-abuse, sanitiza, y responde genérico (success/429/error es-CL).
- [ ] La respuesta pública NUNCA revela dedupe/estado interno/existencia previa/PII de terceros (test anti-leak).
- [ ] Efectos pesados (scoring/email/handoff) FUERA del submit síncrono.
- [ ] V1 links-only (sin upload de archivo); portafolio/LinkedIn como link en `candidate_facet`.
- [ ] Evidencia DB real contra PG dev/staging.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Smoke DB: postular a opening publicado → Person+facet+application; doble submit → 1; opening despublicado → rechazo
- `pnpm staging:request POST /api/public/hiring/applications '{…}'` (o curl público con opening real)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (desbloquea TASK-354)
- [ ] delta en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (apply intake)
- [ ] flag registrado en `FEATURE_FLAG_STATE_LEDGER.md` (si se usa)

## Follow-ups

- `TASK-354` (careers UI) — consumer directo.
- `TASK-1362` (doc capture) — habilita el upload de CV como archivo (V2 del apply).
- Analítica de conversión de careers (`source='public_careers'`).
- Import/referral como consumers adicionales del mismo command.

## Open Questions

- ¿`candidate_facet`/`hiring_application` ya tienen columnas de consent/version o hace falta migración additive? Resolver en Discovery contra el schema real (`[verificar]`).
- ¿Se usa flag `CAREERS_PUBLIC_APPLY_ENABLED` o additive directo? Recomendado additive salvo que se quiera rollout gradual del endpoint público.
- ¿Captcha en V1 o solo rate-limit? Depende de la capacidad real del repo (patrón `public-intake` / Turnstile ya usado en growth forms).
