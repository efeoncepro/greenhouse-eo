# TASK-1255 — Growth Forms PII Hardening (Ley 21.719)

## Delta 2026-06-26 — nueva superficie con email (TASK-1254 code complete scaffold)

TASK-1254 agregó verificación de email + cache. Postura PII ya alineada con esta task, pero a revisar al endurecer: la **`greenhouse_growth.email_verification_cache` guarda solo el hash del email (`email_hash`, sha256 salteado) + el veredicto — NUNCA el email crudo**. Las columnas nuevas `form_submission.email_quality`/`email_domain_class` son derivadas (no PII directa). El email crudo sigue viviendo solo en `form_submission.normalized_fields_json` (la superficie que esta task debe cubrir con cifrado/retención). El endpoint público `verify-email` no persiste el email crudo. Al implementar cifrado/retención, incluir la nueva superficie de cache en el inventario (aunque ya sea hash-only).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-1253`
- Branch: `task/TASK-1255-growth-forms-pii-hardening-ley-21719`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El motor de formularios growth guarda PII (email, teléfono, **RUT/cédula**) como **raw dentro de un blob `normalized_fields_json`**, sin masking ni cifrado ni retención. Dado el régimen reforzado de la **Ley 21.719** (protección de datos Chile), esta task aplica una postura PII **tiered y proporcional**: cifrado at-rest solo para `national_id` (el dato más sensible, que no viaja a downstream), masking en el cockpit admin con **reveal gobernado** (capability + reason + audit), y política de retención + purga programada con base legal/finalidad por formulario.

## Why This Task Exists

Email/teléfono/RUT son PII; el RUT es cédula (dato sensible). Hoy el cockpit admin (TASK-1232) mostrará estos leads sin masking, el RUT se almacena en claro en un JSON, no hay retención ni reveal-audit, y la Ley 21.719 exige consentimiento, finalidad, retención acotada y derecho de borrado. Cifrar todo el blob es over-engineering y rompería el sync (HubSpot necesita email/teléfono en claro). La postura correcta es proporcional al dato: cifrar la cédula (no necesita viajar en claro), enmascarar email/teléfono en admin (sí viajan a downstream), y agregar retención + reveal gobernado.

## Goal

- **Cifrado at-rest de `national_id`** (application-layer, key en GCP Secret Manager / KMS); email/teléfono quedan en claro pero **enmascarados en admin** + hash para dedup (ya existe).
- **Reveal gobernado** de PII cruda en el cockpit: capability dedicada + `reason ≥ N chars` + fila de audit append-only (patrón IDENTITY_WORKFORCE).
- **Clasificación PII** efectiva con `FIELD_DATA_CLASSES` (hoy existe pero no gobierna almacenamiento/lectura).
- **Retención + purga programada** (Cloud Scheduler) con audit del borrado + **base legal/finalidad por formulario** junto al consent snapshot existente.
- Signals de PII (intentos de reveal, purga ejecutada, leads fuera de ventana de retención).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` — patrón reveal masked/snapshot/reveal (capability + reason + audit)
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `CLAUDE.md` §"Secret Manager Hygiene" + §"Entitlements governance" + §"Database — Migration markers"

Reglas obligatorias:

- **NUNCA** loggear PII cruda (`value_full`-style) ni exponerla en respuestas; usar `redactSensitive`.
- **NUNCA** leer `national_id` descifrado en consumers sin pasar por el reader reveal (capability + reason + audit).
- El cifrado de `national_id` es application-layer con key gobernada; el RUT **no** se envía a HubSpot/destinos (boundary).
- Email/teléfono **siguen en claro** para el dispatcher (parity con HubSpot) pero enmascarados en toda surface admin.
- Migration con marker `-- Up Migration` + bloque DO de verificación post-DDL (anti pre-up-marker bug).
- Reveal capability seedeada en `capabilities_registry` + grant a ≥1 rol real en el MISMO PR (TASK-873/935).

## Normative Docs

- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

## Dependencies & Impact

### Depends on

- **TASK-1253** — `FIELD_DATA_CLASSES` clasificación + normalización canónica (define qué campo es `national_id`/PII).
- `greenhouse_growth.form_submission` (`normalized_fields_json`), `form_submission_consent_snapshot`.
- GCP Secret Manager / KMS para la key de cifrado.
- `capabilities_registry` + `src/lib/entitlements/runtime.ts`.

### Blocks / Impacts

- **TASK-1256** (cockpit UI) — el masking + reveal affordance se consumen en el admin.
- Dispatcher (HubSpot) — confirmar que el RUT cifrado NO se intenta enviar a destinos.
- **TASK-1246** (lanzamiento público del Grader / lead magnet) — **bloquea su cutover**: lanzar un lead magnet público que captura PII (incl. RUT) a escala sin la postura Ley 21.719 es exposición legal. Esta task es prerrequisito de 1246.

### Files owned

- `src/lib/growth/forms/pii/` (NUEVO — cifrado/descifrado national_id, masking, retención)
- `src/lib/growth/forms/store.ts` (persistencia cifra national_id; reader masked vs reveal)
- `src/lib/growth/forms/readers.ts` (lecturas masked por default)
- `migrations/` (columnas cifradas/clasificación + retención + audit table de reveal)
- `src/lib/entitlements/` (capability `growth.forms.lead_pii.reveal` + grant + coverage test)
- `services/ops-worker/` o Cloud Scheduler job (purga de retención)
- `src/lib/reliability/queries/` (signals PII)
- `docs/documentation/` + `docs/manual-de-uso/` (postura PII + cómo revelar/retener)

## Current Repo State

### Already exists

- `FIELD_DATA_CLASSES` en `contracts.ts` (clasificación declarada, no gobierna storage/lectura).
- `form_submission_consent_snapshot` (consent capturado en tx).
- `lead_email_hash`, `ip_hash` (hashing para dedup/rate-limit).
- Patrón reveal masked/snapshot/reveal en el dominio identity (a replicar).

### Gap

- PII (incl. RUT) en claro en `normalized_fields_json`.
- Sin masking en admin, sin reveal gobernado, sin audit de lectura PII.
- Sin política de retención ni purga.
- Sin base legal/finalidad por formulario.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (PII regulada + migration + capability nueva)
- Impacto principal: `migration`
- Source of truth afectado: persistencia de PII en `form_submission` + reader masked/reveal
- Consumidores afectados: `cockpit admin (TASK-1256), dispatcher, reliability`
- Runtime target: `production` + `worker` (purga)

### Contract surface

- Contrato existente a respetar: persistencia de `form_submission`, consent snapshot, dispatcher
- Contrato nuevo o modificado: reader masked por default + reader reveal (capability+reason+audit); cifrado de `national_id`; política de retención por form
- Backward compatibility: `gated` — submissions existentes se migran/backfillean a la nueva postura (national_id cifrado, masking en lectura)
- Full API parity: el reader reveal es el primitive; cockpit, Nexa y MCP lo consumen con la misma capability + audit

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_submission`, `form_submission_consent_snapshot`, `lead_pii_reveal_audit` (NUEVO append-only)
- Invariantes que no se pueden romper:
  - `national_id` nunca se persiste ni se loggea en claro
  - Toda lectura de PII cruda pasa por reveal (capability + reason ≥ N + audit row) — el default es masked
  - El RUT cifrado nunca se envía a destinos externos
  - La purga es append-only en su audit (qué se purgó, cuándo, por qué) — nunca borrar el rastro de la purga
- Tenant/space boundary: retención + finalidad por form/surface
- Idempotency/concurrency: purga idempotente (`WHERE retention_expires_at < now() AND NOT purged`); cifrado determinista o con IV almacenado
- Audit/outbox/history: `lead_pii_reveal_audit` append-only + anti-UPDATE/DELETE trigger; evento de purga

### Migration, backfill and rollout

- Migration posture: `destructive` en el sentido de re-encode (backfill que cifra national_id existente + reescribe blob) — requiere dry-run + rollback verificado
- Default state: `read-only`/`shadow` — cifrar en escritura primero (nuevos leads), backfill de históricos en batch con allowlist tras verify
- Backfill plan: `dry-run → apply allowlist → batch` para cifrar national_id histórico; verify post-batch
- Rollback path: la key de cifrado se conserva (descifrar siempre posible); revert PR para el reader; backfill reverso solo si imprescindible
- External coordination: crear key en GCP KMS/Secret Manager + grant; sign-off legal sobre ventana de retención

### Security and access

- Auth/access gate: capability `growth.forms.lead_pii.reveal` (NO admin-coarse) + reason ≥ N + audit
- Sensitive data posture: `PII` regulada (Ley 21.719) — national_id cifrado, email/tel masked en admin
- Error contract: `canonicalErrorResponse`; `redactSensitive` en todo log/respuesta; `captureWithDomain(err, 'growth', ...)`
- Abuse/rate-limit posture: reveal auditado + rate-limit de reveal por operador (detectar scraping interno de PII)

### Runtime evidence

- Local checks: `pnpm test` (cifrado round-trip, masking, reveal con/sin capability, purga idempotente)
- DB/runtime checks: verify columnas/clasificación/audit table vía `information_schema` + bloque DO en migration; query a `lead_pii_reveal_audit` tras un reveal
- Integration checks: confirmar que el dispatcher NO envía national_id a HubSpot
- Reliability signals/logs: `growth.forms.pii_reveal_without_reason` (=0), `growth.forms.retention_overdue` (leads pasada la ventana sin purgar), `growth.forms.pii_purge_executed`
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] `national_id` cifrado at-rest; nunca en claro en DB/logs/respuestas.
- [ ] Reader masked por default; reveal exige capability + reason + audit row.
- [ ] Retención + purga idempotente con audit append-only.
- [ ] Migration con marker + bloque DO; backfill con dry-run/apply/rollback.
- [ ] Capability + grant + coverage test en el mismo PR.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica de cifrado/masking/reveal en `src/lib/growth/forms/pii/`, no en la UI.
- [ ] Modelada como reader masked + command reveal, no como handler de pantalla.
- [ ] Read masked canónico; reveal con authz fina (`growth.forms.lead_pii.reveal`) + reason + audit + observabilidad.
- [ ] Capability + grant a ≥1 rol real (ej. `efeonce_admin` / `efeonce_operations`) + coverage test en el MISMO PR.
- [ ] Camino programático: reader reveal consumido por cockpit + Nexa + MCP con la misma capability.
- [ ] Un primitive, muchos consumers.
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

### Slice 1 — Clasificación + masking reader

- Hacer que `FIELD_DATA_CLASSES` gobierne la lectura: reader masked por default en `readers.ts` (email `j***@dominio`, tel/national_id parcial).
- Sin cambio aún de almacenamiento; masking en la capa de lectura.

### Slice 2 — Cifrado at-rest de national_id

- `pii/` con cifrado/descifrado application-layer (key GCP), IV almacenado.
- `store.ts` cifra national_id en escritura; migration additive de columnas + bloque DO de verificación.
- Boundary: confirmar que el dispatcher no toca national_id.

### Slice 3 — Reveal gobernado + audit

- Capability `growth.forms.lead_pii.reveal` + grant + coverage test.
- Command reveal (capability + reason ≥ N + `lead_pii_reveal_audit` append-only + anti-UPDATE/DELETE trigger).
- Signal `growth.forms.pii_reveal_without_reason` (=0).

### Slice 4 — Retención + purga + base legal por form

- Política de retención por form + base legal/finalidad junto al consent snapshot.
- Job de purga (Cloud Scheduler/ops-worker) idempotente + audit de purga + signal `retention_overdue`.
- Backfill: cifrar national_id histórico (dry-run → allowlist → batch).

## Out of Scope

- Cifrado de email/teléfono (quedan en claro por contrato downstream; solo masking en admin).
- UI del cockpit que muestra masked + botón reveal → **TASK-1256** (esta task expone los readers/commands).
- Validación/normalización de campos → **TASK-1253**.
- Verificación de email → **TASK-1254**.

## Detailed Spec

Veredicto arch-architect: postura tiered. `national_id` (cédula) = cifrado at-rest, no viaja a downstream. email/tel = masking en admin + hash dedup (ya) + retención, porque deben fluir en claro a HubSpot/dispatcher. Reveal pattern de IDENTITY_WORKFORCE: masked por default, reveal con capability + reason + audit. Retención + purga programada con audit append-only y base legal/finalidad por form sobre el consent snapshot existente. Defensa en profundidad: DB (columnas cifradas + audit trigger) + app (reader masked/reveal) + capability + signal + audit log.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (masking reader) → Slice 2 (cifrado) → Slice 3 (reveal+audit) → Slice 4 (retención/purga + backfill).
- Slice 3 (reveal gobernado) MUST shippear antes de que el cockpit (TASK-1256) exponga cualquier reveal.
- Slice 4 backfill de cifrado corre solo después de Slice 2 verificado en staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Backfill de cifrado corrompe national_id histórico | migration | medium | dry-run + allowlist + batch + rollback (key conservada, descifrado siempre posible) | verify post-batch + `information_schema` |
| Pérdida/rotación de la key de cifrado deja PII irrecuperable | secrets | low | Key gobernada en KMS + no rotar sin re-encrypt plan + backup de versión | `pnpm secrets:audit` |
| Reveal sin reason / scraping interno de PII | identity | medium | capability fina + reason ≥ N + audit + rate-limit reveal | `growth.forms.pii_reveal_without_reason` |
| Purga borra leads dentro de ventana legal | data | medium | purga solo `retention_expires_at < now()` + dry-run + audit append-only | `growth.forms.retention_overdue` |
| national_id se filtra a HubSpot | integrations | low | boundary test: dispatcher nunca lee national_id descifrado | dispatcher smoke |

### Feature flags / cutover

- `GROWTH_FORMS_PII_ENCRYPTION_ENABLED` (default `false` → `true` tras staging) controla cifrado en escritura. Reveal gateado por capability (no flag). Purga gateada por `GROWTH_FORMS_RETENTION_PURGE_ENABLED` (default `false`). Registrar ambos en `FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (reader vuelve a unmasked) | <5 min | sí |
| Slice 2 | flag OFF (escribe en claro); descifrar con key conservada | <10 min | sí |
| Slice 3 | revert PR; capability deshabilitada | <5 min | sí |
| Slice 4 | flag purga OFF; backfill reverso con key | variable | parcial |

### Production verification sequence

1. `pnpm migrate:up` staging + bloque DO verifica columnas/audit table.
2. Crear key GCP + verify grant.
3. Deploy staging Slice 1: verify masking en lectura.
4. Flip cifrado ON staging: nuevo lead con RUT → DB cifrada, log redactado.
5. Reveal con capability+reason → audit row; reveal sin reason → rechazo + signal.
6. Backfill dry-run staging → verify plan; apply allowlist → verify post.
7. Purga dry-run staging → verify solo overdue.
8. Repetir en prod con cooldown 24h + sign-off legal sobre la ventana; monitor signals 7d.

### Out-of-band coordination required

- Sign-off legal sobre la ventana de retención y la base legal por form (Ley 21.719). Crear key de cifrado en GCP + grant. Comunicar a operadores el nuevo flujo masked/reveal del cockpit.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `national_id` cifrado en DB (verificado con query directa: no aparece en claro) y redactado en logs.
- [ ] Lectura por default masked en cockpit/readers; el unmasked exige capability + reason + audit row.
- [ ] `lead_pii_reveal_audit` append-only con anti-UPDATE/DELETE trigger.
- [ ] Job de purga idempotente borra solo leads fuera de ventana + audita la purga.
- [ ] El dispatcher NO envía national_id a HubSpot (boundary test).
- [ ] Capability `growth.forms.lead_pii.reveal` + grant + coverage test en el mismo PR.
- [ ] Migration con marker `-- Up Migration` + bloque DO de verificación.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- query directa a `form_submission` (RUT cifrado) + reveal audit + purga dry-run en staging

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1253/1254/1256)
- [ ] filas de flags agregadas a `FEATURE_FLAG_STATE_LEDGER.md`
- [ ] docs funcional + manual de uso (postura PII / reveal / retención)
- [ ] capability coverage test verde

## Follow-ups

- Derecho de borrado a pedido del titular (endpoint/runbook) si el negocio lo requiere.
- Evaluar cifrado de email/tel si un cambio de contrato downstream lo permite.

## Open Questions

- ~~Ventana de retención por defecto (días)~~ — **RESUELTO 2026-06-26 (operador):** default **24 meses**, configurable por form, base legal "interés legítimo" B2B. La purga **NO corre** hasta sign-off legal (flag `GROWTH_FORMS_RETENTION_PURGE_ENABLED` default OFF). Slice 4 se diseña con este default pero queda diferida.
- ~~¿Cifrado determinista vs aleatorio con IV?~~ — **RESUELTO 2026-06-26 (Claude, opción robusta):** **IV aleatorio por fila** con **AES-256-GCM**; IV (12 bytes) + authTag (16 bytes) almacenados junto al ciphertext. No se necesita búsqueda por RUT. El dedup ya usa `lead_email_hash`, no el RUT.

## Progress 2026-06-26 — Slices 1-3 code-complete (rollout pendiente)

- **Slice 1 (masking reader) — DONE.** `pii/mask.ts` + `pii/classify.ts` + `pii/masked-reader.ts` (`getSubmissionLeadMasked`, masked por default, resuelve national_id vía `field_schema_json`; soporta cifrado ON con mask precomputado y legacy/OFF enmascarando en lectura). 17 tests.
- **Slice 2 (cifrado at-rest) — DONE.** `pii/encryption.ts` (AES-256-GCM, IV aleatorio + authTag, key Secret Manager) + `splitAndEncryptPii` (saca national_id del blob en claro → `encrypted_fields_json`) + `submitForm` gated por `GROWTH_FORMS_PII_ENCRYPTION_ENABLED` (fail-closed: outcome `error` 503 si ON sin key) + boundary incondicional en el dispatcher (`redactNationalIdFromBlob`). Email/tel/empresa fluyen normal a HubSpot; SOLO national_id se redacta. 11 tests + round-trip real.
- **Slice 3 (reveal gobernado) — DONE.** `pii/reveal.ts` (`revealSubmissionPiiField`, reason ≥10 + audit append-only + outbox en tx) + `pii/audit.ts` + capability `growth.forms.lead_pii.reveal` (catálogo + grant least-privilege EFEONCE_ADMIN ∪ EFEONCE_OPERATIONS + coverage test) + evento `growth.forms.lead_pii.revealed` + signal `growth.forms.pii_reveal_without_reason` (steady=0) + rutas parity `GET .../lead` (masked) y `POST .../reveal` (gobernado). 6 tests.
- **Migración aplicada a dev:** `form_submission.encrypted_fields_json` + `lead_pii_reveal_audit` (append-only + trigger anti-UPDATE/DELETE + DO block). db.d.ts regenerado.
- **Rollout STAGING hecho + verificado (2026-06-26):** push develop (6 commits) → redeploy staging Ready; `vercel env` flag=true (staging) + `GROWTH_FORMS_PII_ENCRYPTION_KEY_SECRET_REF` (staging+production); key en Secret Manager con grant. **Verificación live contra el deployment de staging** (persona agente):
  - `GET .../submissions/{id}/lead` (masked) → 404 `growth_submission_not_found` (es-CL): ruta + auth `growth.forms.submissions.read` + masked-reader vivos.
  - `POST .../reveal` admin, reason válida → 404 (capability `growth.forms.lead_pii.reveal` pasa + command corre).
  - `POST .../reveal` reason corta → 400 `growth_lead_reveal_reason_required` (gate reason ≥10 server-side).
  - `POST .../reveal` como **collaborator** (sin la capability) → **403 forbidden** (least-privilege enforce real, no solo route-group).
- **Pendiente de verificación e2e del cifrado de RUT real:** requiere un form publicado con campo `national_id` (no existe aún en staging). El round-trip del cifrado está unit-tested con la key real; flag+key live en staging.
- **Prod:** SECRET_REF ya en production; el flip del flag `=true` va por el **release control plane develop→main** (no unilateral). El cifrado en prod no requiere sign-off legal (lo legal es la ventana de retención de Slice 4). Lifecycle queda **in-progress**: Slices 1-3 shipped+rolled-out a staging; sólo Slice 4 (retención, legal-blocked) resta.

### Slice 4 (retención + purga) — DIFERIDA (decisión operador)

- Espera **sign-off legal** sobre la ventana de retención. Default acordado a sembrar cuando se implemente: **24 meses**, configurable por form, base legal "interés legítimo" B2B.
- Diseño previsto: columna `retention_expires_at` (additive, `created_at + ventana`) + política/base legal por form junto al consent snapshot + job de purga idempotente (`WHERE retention_expires_at < now() AND NOT purged`) en Cloud Scheduler/ops-worker + audit de purga append-only + signal `growth.forms.retention_overdue`. Flag `GROWTH_FORMS_RETENTION_PURGE_ENABLED` (default OFF) — **aún NO declarado en código** (no se declara hasta implementar, para no romper el gate de flags con un flag inerte).
- Backfill de cifrado de national_id histórico (dry-run → allowlist → batch) también queda en Slice 4 (corre tras verificar Slice 2 en staging).

## Execution Decisions 2026-06-26 (operador checkpoint)

- **Alcance autorizado: Slices 1-3 completas** (masking reader + cifrado at-rest national_id + reveal gobernado). **Slice 4 (retención/purga) diferida** hasta que legal confirme la ventana; se siembra el default 24m + flag OFF + base legal/finalidad por form, sin job de purga corriendo.
- **Key de cifrado: GCP Secret Manager** (key simétrica 256-bit) + cifrado application-layer **AES-256-GCM** — elegido por ser lo más económico/funcional (sin costo ni latencia por-llamada de KMS CMEK en cada reveal). Grant `secretAccessor` a `greenhouse-portal@`.
- **TASK-1253 (blocker):** su código (`national_id` field type, validator registry, `src/lib/identity-documents/` módulo-11, normalización canónica RUT, re-validación server) está aterrizado y testeado; detección de "qué campo es national_id" se resuelve por JOIN submission ↔ `field_schema_json` (`type === 'national_id'`), NO desde el blob persistido. El cierre formal de 1253 no bloquea el código de 1255.
