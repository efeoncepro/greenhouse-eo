# TASK-1245 — Growth AI Visibility: Public Run Status + Report Delivery Orchestrator

## Delta 2026-06-27 — segundo consumer del delivery state: email (TASK-1250)

TASK-1250 agrega un **segundo consumer del mismo delivery state** que esta task materializa: cuando el snapshot se publica (`finalizeRunDelivery` → `ready`, o la aprobación TASK-1244, o el publish route admin), además del estado que lee la pantalla pública (TASK-1241), se encola `growth.ai_visibility.report_email_requested` → un reactive consumer envía el informe por email + PDF adjunto. **No cambia el contrato de esta task** (el status reader, los handles, el finalizer siguen intactos); el email es un enqueue no-fatal adicional en los puntos de publicación. Pantalla y email son dos consumers del MISMO delivery state (write-side, nunca on-read).

## Delta 2026-06-25 — impacto de TASK-1251 (convergencia sobre el motor)

TASK-1251 dejó `POST /run` con DOS paths (flag `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED`, default OFF): el a-medida devuelve `runPublicId` (run encolado inline), el convergente devuelve `submissionId` (el run lo crea un reactive consumer, async). **El status reader debe resolver AMBOS handles:** por `runPublicId` directo (path a-medida) y por `submissionId` → `grader_leads.submission_id` → `run_id` → estado/reportToken (path convergente). En el path convergente hay una ventana corta `submission aceptado pero run aún no encolado` (el reactive consumer `growth_grader_run_from_submission` corre vía `ops-reactive-growth` ~cada 5 min): el poll debe representarla como `queued`, no como error/404. El binding `grader_leads.submission_id` (UNIQUE parcial) es additive y ya existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `api`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|reliability`
- Blocked by: `TASK-1239, TASK-1240`
- Branch: `task/TASK-1245-growth-ai-visibility-public-run-status-delivery-orchestrator`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el contrato publico que falta entre el intake y la UI del lead magnet: un reader publico seguro por `runPublicId`, un orquestador idempotente de finalizacion y la entrega del `reportToken` cuando el snapshot sea publicable. Sin esta task, `TASK-1241` no tiene forma real de hacer poll ni de pasar de `runPublicId` a reporte.

## Why This Task Exists

`TASK-1240` devuelve `runPublicId` "para poll" y `TASK-1241` asume estados async honestos, pero en el repo solo existen `POST /api/public/growth/ai-visibility/run` y `GET /api/public/growth/ai-visibility/report/[token]`. Falta el puente gobernado `run publico -> estado -> snapshot token`, incluyendo el caso `review_required` donde no se debe publicar automaticamente.

## Goal

- Exponer un endpoint publico read-only de estado por `runPublicId`, sin filtrar evidencia interna ni PII.
- Orquestar la finalizacion idempotente del run: score/report/snapshot cuando corresponda, y estado honesto cuando falte revision.
- Entregar `reportToken` solo cuando exista snapshot publicable; preparar el camino para email/link delivery sin acoplarlo a la UI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §9 public experience, §11 programmatic contract, delta TASK-1239/1240.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la UI publica consume reader/command, no tablas ni logica paralela.
- `docs/tasks/complete/TASK-1239-growth-ai-visibility-public-report-snapshot-token-reader.md`
- `docs/tasks/complete/TASK-1240-growth-ai-visibility-public-run-intake-abuse-cost-controls.md`
- `docs/tasks/to-do/TASK-1244-growth-ai-visibility-admin-evidence-review.md`

Reglas obligatorias:

- `runPublicId` no es secreto; el estado publico debe ser bounded y no debe permitir enumerar datos sensibles.
- El `reportToken` solo se devuelve cuando el snapshot existe y es publicable.
- `review_required` nunca se auto-publica; si falta aprobacion humana, el estado publico debe ser honesto y no revelar razones internas delicadas.
- La lectura publica debe tener abuso/rate-limit proporcional aunque no gaste LLM.

## Normative Docs

- `docs/tasks/to-do/TASK-1241-growth-ai-visibility-public-lead-magnet-page.md` — consumer UI que queda bloqueado por este contrato.
- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — shape de `PublicGraderReport`.

## Dependencies & Impact

### Depends on

- `TASK-1239` — `publishGraderReportSnapshot` y `readPublicGraderReport`.
- `TASK-1240` — `grader_leads`, public intake y `runPublicId`.
- `TASK-1234` — worker async que ejecuta el run.

### Blocks / Impacts

- Bloquea `TASK-1241` como consumer correcto de poll publico.
- Alimenta `TASK-1248` si el portal cliente quiere deep-link o delivery del snapshot.
- Reduce riesgo operativo de lanzamiento al separar status/delivery de la UI.

### Files owned

- `src/lib/growth/ai-visibility/public-delivery/**` (nuevo)
- `src/app/api/public/growth/ai-visibility/run/[publicId]/route.ts` (nuevo)
- `src/lib/reliability/queries/growth-ai-visibility-public-*.ts` (señales nuevas)
- `docs/tasks/to-do/TASK-1245-growth-ai-visibility-public-run-status-delivery-orchestrator.md`

Extend/shared (NO owned — de tasks completadas, tocar con cuidado): `src/lib/growth/ai-visibility/public-intake/**` (TASK-1240), `src/lib/growth/ai-visibility/report/snapshot.ts` (TASK-1239, recién aterrizada), `src/lib/growth/ai-visibility/run-engine.ts` (TASK-1234 — agregar el step de auto-publish sin romper su contrato de finalización).

## Current Repo State

### Already exists

- `src/app/api/public/growth/ai-visibility/run/route.ts` crea el run publico.
- `src/app/api/public/growth/ai-visibility/report/[token]/route.ts` lee un snapshot por token.
- `src/lib/growth/ai-visibility/report/snapshot.ts` publica y lee snapshots publicos.
- `src/lib/growth/ai-visibility/public-intake/create-public-run.ts` crea lead + run async.

### Gap

- No existe endpoint publico de status por `runPublicId`.
- No existe contrato que transforme un run terminado en `reportToken` entregable al prospecto.
- El hardening de lectura publica del reporte por token quedo como follow-up en `TASK-1239`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_growth.grader_runs`, `grader_leads`, `grader_reports`
- Consumidores afectados: UI publica, futuro email delivery, QA release
- Runtime target: `local|staging`

### Contract surface

- Contrato existente a respetar: `createPublicGraderRun`, `publishGraderReportSnapshot`, `readPublicGraderReport`
- Contrato nuevo o modificado: `readPublicGraderRunStatus(publicId)` + `GET /api/public/growth/ai-visibility/run/[publicId]`
- Backward compatibility: `compatible`
- Full API parity: la pagina publica solo hace POST intake + GET status + GET report token; no consulta tablas ni recomputa reportes.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_runs`, `greenhouse_growth.grader_leads`, `greenhouse_growth.grader_reports`
- Invariantes que no se pueden romper:
  - El email vive solo en lead/CRM; nunca viaja a providers ni al status publico.
  - `review_required` sin aprobacion devuelve estado publico de espera, no token.
  - `insufficient_data` devuelve estado/failure honesto, no reporte definitivo.
  - `partial` puede entregar reporte parcial si `publishGraderReportSnapshot` lo permite.
  - **`runPublicId` debe ser alto-entropía/no-guessable** (token tipo UUID, NO secuencial): como no hay sesión, el id ES la autorización; verificar el generador en TASK-1240 y afirmar la entropía en el reader.
- Tenant/space boundary: publico sin sesion; autorizacion por `runPublicId` bounded + rate-limit + no PII.
- Idempotency/concurrency: el publish vive en el worker (finalizador único), NO on-read → el doble poll concurrente no puede duplicar snapshot por construcción. Hornear además **UNIQUE parcial** (un snapshot publicable por `run_id`/version) en DB para que la garantía no dependa solo del código. Reads sin gasto LLM.
- Audit/outbox/history: usar snapshot append-only; signal de delivery/status; outbox solo si se agrega email follow-up.

### Migration, backfill and rollout

- Migration posture: `none` por defecto; additive solo si se requiere columna `public_delivery_state` [verificar en discovery].
- Default state: endpoint disponible pero el intake sigue gateado por `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED`.
- Backfill plan: N/A; runs existentes pueden resolverse on-read.
- Rollback path: revert endpoint/reader; el intake y snapshots existentes quedan intactos.
- External coordination: ninguna para status; email delivery si se decide incluir requiere provider/copy/legal [fuera de scope salvo contrato].

### Security and access

- Auth/access gate: publico, token/run id bounded; no session.
- Sensitive data posture: PII redacted; no raw provider text; no accuracy findings internas.
- Error contract: outcomes canonicos sanitizados; `captureWithDomain('growth')`.
- Abuse/rate-limit posture: rate-limit IP para status y report read; no gasto LLM en reads.

### Runtime evidence

- Local checks: tests unitarios del reader/finalizador/status mapping.
- DB/runtime checks: dry-run con run fake/real dev: pending -> running -> completed/partial -> token.
- Integration checks: staging smoke con flag ON y worker activo.
- Reliability signals/logs: `growth.ai_visibility.public_status_read`, `growth.ai_visibility.public_delivery_pending`, `growth.ai_visibility.public_delivery_failed` [nombres finales en discovery].
- Production verification sequence: en rollout task, no aqui.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Public status reader

- Crear `readPublicGraderRunStatus(publicId)` con DTO publico bounded: status, reason seguro, nextAction, retryAfter/estimatedWait opcional, `reportToken` nullable.
- Crear `GET /api/public/growth/ai-visibility/run/[publicId]` con rate-limit y errores sanitizados.

### Slice 2 — Delivery finalizer (write-side, NO on-read)

- **Separación read/write (overlay arch #5 + #3):** el auto-publish del snapshot NO ocurre en el `GET /run/[publicId]` (un GET público anónimo no dispara writes). El publish se hornea en el **path de finalización del worker** (`run-engine.ts` `updateGraderRunStatus`/`recoverStuckRunningRuns`, TASK-1234): cuando el run completa y es **auto-publicable** (no `review_required`, datos suficientes), el mismo path que finaliza el status publica el snapshot idempotente. Para `review_required`, el publish lo dispara la aprobación humana de `TASK-1244` (write-side). El `GET` queda **read-only puro**: refleja estado y devuelve `reportToken` si ya existe una fila de snapshot publicable.
- **Cross-task touch declarado:** esta task agrega el step de auto-publish al worker de `TASK-1234` (completada). Discovery debe confirmar el punto exacto y no romper su contrato de finalización.
- Para `review_required`, devolver estado de espera sin token hasta que `TASK-1244` habilite aprobacion; documentar el integration point.
- Para `failed`/`insufficient_data`, devolver estado final honesto y recovery copy-key, no reporte falso.

### Slice 3 — Hardening + signals

- Rate-limit reads de status y reporte por token, sin costo LLM.
- Signals de status/delivery y tests de no-leak.
- Staging smoke con run fake o real low-volume.

## Out of Scope

- UI publica del lead magnet (`TASK-1241`).
- Comandos approve/reject de review humano (`TASK-1244`).
- UI admin o portal cliente (`TASK-1247`/`TASK-1248`).
- HubSpot write (`TASK-1242`) y email marketing avanzado.

## Detailed Spec

El endpoint publico de status es el contrato que consume la pagina: `POST /run` devuelve `runPublicId`; la UI hace poll a `GET /run/[publicId]`; cuando el run esta listo, el backend publica o recupera el snapshot idempotente y devuelve `reportToken`; la UI entonces lee `GET /report/[token]`. El DTO nunca contiene evidencia cruda, email, accuracy findings internas ni identificadores secuenciales internos distintos de lo estrictamente necesario. El estado `review_required` debe ser explicitamente no-publicable hasta aprobacion humana.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (reader/endpoint) -> Slice 2 (snapshot delivery) -> Slice 3 (hardening/signals). No conectar `TASK-1241` antes de tener Slice 1 y 2 verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Enumeracion de estados por public id | privacy | medium | DTO bounded + rate-limit + no PII/raw | `public_status_read` alto |
| Snapshot duplicado por poll concurrente | data quality | low | publish en worker (finalizador único), NO on-read + UNIQUE parcial por run/version en DB | duplicates by run/version |
| Publicar `review_required` sin humano | safety/legal | low | gate explicito; integration point con TASK-1244 | test publish gate |
| UI queda esperando para siempre | UX/reliability | medium | estados finales y `nextAction` seguros | `public_delivery_pending` |

### Feature flags / cutover

- Respeta `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED`; el status endpoint puede existir aun con intake OFF.
- Si se agrega delivery email, debe nacer flagueado OFF **y registrar su fila en `FEATURE_FLAG_STATE_LEDGER.md` el mismo PR** (gate `pnpm docs:closure-check`).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert route/reader | <5 min | si |
| Slice 2 | revert finalizer; mantener status sin token | <10 min | si |
| Slice 3 | desactivar rate-limit/signal nuevo por revert | <5 min | si |

### Production verification sequence

1. Staging: crear run publico con flag ON.
2. Poll por `runPublicId` hasta estado final.
3. Confirmar que `reportToken` abre el snapshot y que `review_required` no entrega token.
4. Confirmar que no se filtra email/raw evidence/accuracy findings.

### Out-of-band coordination required

- Ninguna para status basico.
- Si se agrega email delivery en esta task, requiere owner legal/copy y provider de email aprobado; si no, dejar task follow-up.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `GET /api/public/growth/ai-visibility/run/[handle]` existe, es **read-only puro** (no publica snapshot ni dispara writes) y devuelve estados public-safe. El handle es el **poll_token de alta entropía** (256 bits) o `submissionId`, NO el `public_id` secuencial (enumerable).
- [x] El auto-publish del snapshot vive en el path de finalización del worker (`run-engine`, 4 puntos terminales), gateado por gate publicable (`ready`/`partial`); `review_required` → `in_review` (NUNCA auto-publica, espera TASK-1244); insufficient/failed → `unavailable`.
- [x] El endpoint devuelve `reportToken` solo cuando existe snapshot publicable (`grader_reports` row).
- [x] `review_required`/`insufficient_data` no generan reporte definitivo ni filtran razones internas (delivery state materializado bounded).
- [x] Doble poll concurrente no duplica snapshots ni dispara providers (publish en finalizador único + `ON CONFLICT` idempotente; GET read-only).
- [x] Reads públicos de status/report tienen rate-limit proporcional por IP (sin gasto LLM; fail-open; handle no enumerable de fondo).
- [x] Tests cubren success, partial, review_required, failed, not-found, no-leak e idempotencia (status-reader 13 + finalizer 8 + read-guard 5 + signals 5).
- [x] `TASK-1241` queda desbloqueada por un contrato real de poll (`pollToken`/`submissionId` → `GET /run/[handle]` → `reportToken` → `GET /report/[token]`).

## Closure Note (2026-06-25)

**Verdict QA:** CONDITIONAL PASS — `code complete, rollout pendiente` (staging smoke del poll→token gated por el launch EPIC-020).

- **Decisión de diseño (operador-aprobada):** el `public_id` del run es **secuencial/enumerable** (`EO-GRUN-#####`) → no sirve como auth de un endpoint público sin sesión. Se introdujo `grader_runs.poll_token` (256-bit, alta entropía) como handle de poll; el `public_id` queda como id display/admin interno. El status reader resuelve **poll_token** (a-medida) o **submissionId** (convergente + su ventana `queued`), NUNCA el `public_id`.
- **Slice 1** (reader + endpoint): migración `poll_token` + `readPublicGraderRunStatus(handle)` (DTO bounded queued/processing/ready/in_review/unavailable/not_found, sin PII/raw/razones internas) + `GET /run/[handle]` read-only + intake devuelve `pollToken`. SQL validada live (JOIN + security: `EO-GRUN-####` → 0 matches).
- **Slice 2** (finalizer write-side): migración `public_delivery_state` (materialización O(1) leak-proof) + `finalizeRunDelivery` en la finalización del worker (auto-publish snapshot si releasable; review_required → in_review; resto → unavailable; best-effort). Validado live sobre **8 runs reales** (materializados correctamente, signals a steady).
- **Slice 3** (hardening + signals): rate-limit de reads por IP (reusa `grader_intake_events`, outcomes `read_status`/`read_report`, fail-open) + 3 reliability signals (`public_status_read` posture; `public_delivery_pending` + `public_delivery_inconsistent` steady=0) wired al overview. Cierra el follow-up de rate-limit del `report/[token]`.
- **Gates verdes:** `pnpm test` (8073) + `pnpm build` + `pnpm typecheck` + lint + `pg:doctor` + `docs:closure-check` (0 flags). 2 migraciones additive aplicadas+verificadas en dev PG; signals en steady (0/0).
- **Integration points abiertos:** `review_required` → publish lo dispara la aprobación humana de **TASK-1244** (write-side). **TASK-1241** consume el contrato de poll. Email delivery del token → **TASK-1250** (OQ1 resuelta: fuera de scope, solo el contrato).
- **Rollout pendiente (gated EPIC-020):** staging smoke low-volume del flujo `POST /run → poll /run/[handle] → ready → /report/[token]` con flag ON + worker activo.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/lib/growth/ai-visibility`
- `pnpm task:lint --task TASK-1245`
- Dry-run PG/dev del flujo status -> token
- Staging smoke low-volume si el worker/flag estan disponibles

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` actualizado con delta del contrato publico
- [ ] Cross-impact revisado: `TASK-1241`, `TASK-1244`, `TASK-1239`, `TASK-1240`

## Follow-ups

- Email delivery transaccional si no entra en esta task.
- Public status webhook/Server-Sent Events si el polling resulta insuficiente.

## Open Questions

1. ¿El delivery email debe entrar aqui o en una task separada de CRM/marketing automation? Propuesta: esta task solo deja el contrato; email avanzado queda para HubSpot/marketing.
