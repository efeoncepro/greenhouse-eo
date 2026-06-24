# TASK-1239 — Growth AI Visibility: Public Report Snapshot + Token Reader

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai`
- Blocked by: `TASK-1235`
- Branch: `task/TASK-1239-growth-ai-visibility-public-report-snapshot-token-reader`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializar el **snapshot inmutable tokenizado** del reporte público (`greenhouse_growth.grader_reports`) + el reader `readPublicGraderReport(reportToken)`, para que el sitio público sirva un reporte que **NO cambia si el score recomputa** (congela `run_id + score_version + report_version + recommendation_pack_version + as_of` + el `PublicGraderReport` + token + `expires_at`). Es la foundation de parity del consumer público (§11.1). El reporte interno sigue siendo derivación on-read (TASK-1235); el público se **congela al publicar**.

## Why This Task Exists

TASK-1235 decidió on-read (sin tabla) y dejó explícito que el **snapshot inmutable pertenece a la task de superficie pública**. Un lead magnet público necesita esa pieza: si el prospecto recibe un link y luego el score recomputa (prompt-pack nuevo, re-run), el reporte que se le mostró en fecha X **no puede cambiar en silencio** (integridad + confianza + defensa legal del "esto se te mostró"). Además, el público no tiene sesión interna: necesita un reader resuelto por **token**, no por capability `report.read`. Hoy no existe ni la tabla, ni el token, ni el reader público.

## Goal

- Tabla inmutable `grader_reports` (snapshot público versionado + token + `expires_at`), append-only (no se muta el payload congelado).
- Command `publishGraderReportSnapshot(runId)` que congela el `PublicGraderReport` vigente + emite token, gateado por capability nueva + por el estado del gate (no publica `review_required`/`insufficient_data`).
- Reader `readPublicGraderReport(reportToken)` (sin sesión interna; token = auth) + endpoint público read-only, respetando `expires_at`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 (`grader_report` fields: `report_url`/`expires_at`/`visibility`), §9.4 (trust: link tokenizado + expira), §11.1 (`readPublicGraderReport(reportToken)`), §Delta TASK-1235.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers.
- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md` — rol (A) del programa.

Reglas obligatorias:

- El snapshot es **inmutable**: una vez congelado, el `public_report_json` no se actualiza (re-publicar = fila nueva con token nuevo). Append-only (NUNCA UPDATE/DELETE del payload).
- El reporte interno NO cambia (sigue on-read, TASK-1235). El snapshot es SOLO el congelado público.
- El reader público es **token-based** (sin capability/sesión); el token es secreto, no enumerable, y respeta `expires_at`. NUNCA expone raw provider text (hereda `PublicGraderReport`).
- NUNCA publicar un snapshot de un score `review_required`/`insufficient_data` (gate humano / sin precisión falsa).

## Normative Docs

- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — `readGraderReport`/`toPublicGraderReport`/`PublicGraderReport` (dependencia directa).
- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — schema `greenhouse_growth` + patrón `public_id` no enumerable.
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — migraciones (markers, DO block anti pre-up-marker).

## Dependencies & Impact

### Depends on

- `TASK-1235` (complete) — `readGraderReport` + `PublicGraderReport`.
- `greenhouse_growth.grader_runs`/`grader_scores` — ya en PG.

### Blocks / Impacts

- Bloquea la página pública (EPIC-020 C) — qué link se le da al prospecto.
- Habilita el consumer público de la parity (token-reader); coordina con TASK-1240 (B) para el ciclo intake→run→snapshot.

### Files owned

- `migrations/` — `greenhouse_growth.grader_reports` (additive).
- `src/lib/growth/ai-visibility/report/snapshot.ts` — command `publishGraderReportSnapshot` + reader `readPublicGraderReport` (server-only) + store.
- `src/app/api/public/growth/ai-visibility/report/[token]/route.ts` — endpoint público read-only (sin capability; token + rate-limit).
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` — capability `growth.ai_visibility.report.publish` + grant.
- `src/lib/growth/ai-visibility/__tests__/**` — tests.

## Current Repo State

### Already exists

- `readGraderReport`/`toPublicGraderReport` → `PublicGraderReport` (TASK-1235) — el payload exacto a congelar.
- Patrón `public_id` no enumerable en `grader_profiles`/`grader_runs` (TASK-1226) — base para el token.
- Capabilities `growth.ai_visibility.{run.execute,observation.read,report.read}`.

### Gap

- No existe tabla de snapshot ni token ni `expires_at`.
- No hay reader público token-based ni endpoint público (todo es `/api/admin/**`).
- No hay command de publicación (congelar + emitir token + gate de release).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration` (tabla nueva additive) + `command`/`reader`.
- Source of truth afectado: NUEVO `greenhouse_growth.grader_reports` (snapshot público inmutable; el score sigue siendo el SoT del cómputo).
- Consumidores afectados: sitio público (read), EPIC-020 C (página), HubSpot handoff (link), admin (preview del snapshot).
- Runtime target: `local` + `staging`.

### Contract surface

- Contrato existente a respetar: `PublicGraderReport`, `readGraderReport`.
- Contrato nuevo: tabla `grader_reports` + `publishGraderReportSnapshot(runId)` + `readPublicGraderReport(reportToken)` + endpoint público.
- Backward compatibility: `additive`.
- Full API parity: el snapshot congela la salida del MISMO `buildGraderReport`; el público lee el congelado, no recomputa ni reimplementa.

### Data model and invariants

- Entidades/tablas afectadas: NUEVA `greenhouse_growth.grader_reports` (`report_id`, `run_id` FK, `score_version`, `report_version`, `recommendation_pack_version`, `audience`, `report_token` UNIQUE no enumerable, `public_report_json` jsonb, `as_of`, `expires_at` nullable, `created_at`, `created_by`).
- Invariantes que no se pueden romper:
  - **Inmutable**: `public_report_json` no se actualiza tras crearse; re-publicar = fila nueva (append-only). NUNCA UPDATE/DELETE del payload.
  - El token es secreto, UNIQUE, no enumerable (generado con entropía suficiente, patrón `public_id`).
  - `expires_at` respetado en el reader (expirado → 404/gone, no el payload).
  - No publicar score `review_required`/`insufficient_data`.
- Tenant/space boundary: V1 público/pre-tenant; el binding a org cliente es de EPIC-020 (E).
- Idempotency/concurrency: `publishGraderReportSnapshot` idempotente por `(run_id, score_version, report_version, recommendation_pack_version)` (re-publicar el mismo estado devuelve el snapshot existente, no duplica).
- Audit/outbox/history: la tabla ES el ledger append-only (cada publish es una fila inmutable).

### Migration, backfill and rollout

- Migration posture: `additive` (tabla nueva). Marker `-- Up Migration` + DO block anti pre-up-marker + GRANTs runtime + regenerar `db.d.ts`.
- Default state: sin uso hasta que la página (C) consuma; `report.publish` gateada por capability.
- Backfill plan: N/A.
- Rollback path: revert PR; tabla additive sin uso o reverse migration (DROP).
- External coordination: N/A — repo/interno.

### Security and access

- Auth/access gate: **mint** = capability `growth.ai_visibility.report.publish` (interno) + grant; **read público** = token (sin capability/sesión) + rate-limit en el endpoint.
- Sensitive data posture: el snapshot congela `PublicGraderReport` (public-safe por construcción); NUNCA raw provider text. Token no logueado en claro.
- Error contract: canónico es-CL; token inválido/expirado → 404 sanitizado; `captureWithDomain('growth')`.
- Abuse/rate-limit posture: endpoint público read con rate-limit por IP/token (el write/cost vive en TASK-1240).

### Runtime evidence

- Local checks: tests de inmutabilidad (no UPDATE del payload), idempotencia de publish, gate de no-publicar review_required, expiración en el reader, token no enumerable, leak test (snapshot público sin raw).
- DB/runtime checks: migration verify (DO block) + dry-run sobre un run real (publicar + leer por token).
- Integration checks: N/A (el HubSpot link es D).
- Reliability signals/logs: opcional `growth.ai_visibility.public_report_published` (conteo) — o reusar; sin signal crítico nuevo.
- Production verification sequence: migrate staging → publish snapshot de un run real → leer por token → verificar inmutabilidad tras recompute del score.

### Acceptance criteria additions

- [ ] Tabla, token, contract surface y consumers nombrados con paths reales.
- [ ] Inmutabilidad, idempotencia y expiración explícitas y testeadas.
- [ ] Migration additive con DO block + GRANTs + `db.d.ts` regenerado.
- [ ] Reader público sin raw leak (hereda `PublicGraderReport` + leak test).
- [ ] Capability `report.publish` + grant en el mismo PR (guard coverage).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migration `grader_reports` + store

- Migration additive (tabla inmutable + índices: `report_token` UNIQUE, `run_id`) + DO block + GRANTs + `db.d.ts`.
- Store server-only: insert append-only + lookup por token.

### Slice 2 — publishGraderReportSnapshot + capability

- Command que congela el `PublicGraderReport` vigente (vía `readGraderReport`+`toPublicGraderReport`) + emite token + `as_of`; idempotente por versión; gate de no-publicar review_required/insufficient_data.
- Capability `growth.ai_visibility.report.publish` + grant `runtime.ts`.

### Slice 3 — readPublicGraderReport + endpoint público + dry-run

- Reader token-based (respeta `expires_at`) + endpoint `GET /api/public/.../report/[token]` (sin capability, rate-limit, error sanitizado).
- Leak test + dry-run real (publicar + leer + verificar inmutabilidad post-recompute).

## Out of Scope

- Página pública / render (EPIC-020 C).
- Write path público / intake / consent (EPIC-020 B / TASK-1240).
- HubSpot handoff (EPIC-020 D).
- Binding a org cliente / portal cliente (EPIC-020 E).

## Detailed Spec

El snapshot congela la salida del MISMO `buildGraderReport` (vía `readGraderReport` → `toPublicGraderReport`) en una fila inmutable con un token secreto. El reporte interno sigue on-read (TASK-1235) — el snapshot es solo el contrato público/legal "esto se mostró en fecha X". Re-publicar tras un recompute crea una fila NUEVA (token nuevo); el link viejo sigue sirviendo el congelado viejo hasta `expires_at`. El gate de release no publica scores gateados (`review_required`/`insufficient_data`) — eso espera al review humano (EPIC-020 F). El token usa el patrón `public_id` no enumerable.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tabla) → Slice 2 (publish + capability) → Slice 3 (reader público + endpoint). El reader público (3) NO puede existir antes de la inmutabilidad de la tabla (1) y el gate de publish (2).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Token enumerable → fuga de reportes de terceros | privacy/security | low | token con entropía alta (patrón `public_id`), UNIQUE, no secuencial | leak/enumeration test |
| Snapshot mutado pierde el "esto se mostró" | trust/legal | low | tabla append-only, payload inmutable, re-publish = fila nueva | test inmutabilidad |
| Se publica un score review_required | trust (YMYL) | medium | gate de release en el command (no publica gateado) | test gate |
| Link público sin expiración vive para siempre | privacy | low | `expires_at` respetado en el reader | test expiración |

### Feature flags / cutover

- Sin flag nuevo para el mint (gateado por capability `report.publish`). El endpoint público read es additive y nadie lo enlaza hasta la página (C). Revert: revert PR / reverse migration.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (DROP tabla sin uso) | <10 min | si |
| Slice 2 | revert PR (command + capability) | <5 min | si |
| Slice 3 | revert PR (endpoint + reader) | <5 min | si |

### Production verification sequence

1. `pnpm migrate:up` staging + verify tabla + índices (DO block).
2. Publicar snapshot de un run real (capability) + leer por token + verificar `PublicGraderReport` congelado.
3. Recomputar el score del run + verificar que el token viejo sigue sirviendo el congelado viejo (inmutabilidad).
4. Verificar `expires_at` (token expirado → 404).
5. Prod: junto con el resto de EPIC-020, via release control plane.

### Out-of-band coordination required

- N/A — repo/interno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `grader_reports` inmutable (token UNIQUE no enumerable, `expires_at`, `public_report_json` congelado) con migration additive + DO block + `db.d.ts`.
- [ ] `publishGraderReportSnapshot(runId)` congela el `PublicGraderReport` vigente, idempotente por versión, NO publica `review_required`/`insufficient_data`.
- [ ] `readPublicGraderReport(reportToken)` token-based (sin sesión), respeta `expires_at`, sin raw leak (leak test).
- [ ] Endpoint público read-only con rate-limit + error sanitizado (sin capability).
- [ ] Capability `growth.ai_visibility.report.publish` + grant (guard coverage verde).
- [ ] Dry-run real: publicar + leer por token + inmutabilidad verificada tras recompute.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` + verify
- Dry-run publish+read sobre un run real
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arch `## Delta` (snapshot inmutable + token reader) + `EPIC-020` Child Tasks actualizado
- [ ] chequeo de impacto cruzado (TASK-1235/1240 + EPIC-020 C/D/E)

## Follow-ups

- Binding del snapshot a org cliente (EPIC-020 E) cuando exista el portal cliente surface.
- Métrica de expiración/regeneración de snapshots si el volumen lo amerita.

## Open Questions

1. ¿El token lo emite este snapshot (A) al publicar, o lo emite el intake (B) y A lo puebla? **Propuesta:** A emite el token al **publicar** (post run completo + gate OK); B/la página pollean el `run.public_id` y, al estar listo, muestran el link del snapshot. Confirmar en Discovery con EPIC-020 B.
2. ¿`expires_at` por defecto (ej. 90 días) o sin expiración salvo configuración? Decidir con criterio legal/privacidad (§9.4) en Discovery.
