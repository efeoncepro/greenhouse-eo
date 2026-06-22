# TASK-921 — Captura de cambios de fecha límite + inferencia de motivo de reprogramación (foundation)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno (foundation del ADR Attributable Lateness V1)`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `TASK-912 (captura de transiciones de estado — patrón sibling a clonar). El webhook YA está suscrito (confirmado operador 2026-05-23): existe un webhook Demo (integración Greenhouse) + uno en Greenhouse PRD con scope MUY AMPLIO que cubre productivos — NO hay que suscribir webhook nuevo, solo agregar el handler/consumer para los events de Fecha límite y verificar que el scope PRD los incluye. No bloquea por compute: esta task solo CAPTURA eventos de due_date, no calcula atraso.`
- Branch: `task/TASK-921-due-date-change-capture-reschedule-reason`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear el **log append-only de cambios de fecha límite** `greenhouse_delivery.task_due_date_changes` (sibling del log de transiciones de estado de TASK-908/912), capturado vía webhook Notion `page.properties_updated` filtrado por `Fecha límite` → re-fetch → HMAC → echo-loop → persist. Cada cambio registra `previous_due_date`, `new_due_date`, `days_delta`, `status_at_change`, y un **motivo de reprogramación** (`reason_code`) inferido del contexto y confirmable por el operador vía una propiedad Notion nueva `Motivo de reprogramación`.

Es la **foundation** del modelo de Atraso Imputable (`GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md`): reemplaza el casillero único `Fecha límite original` + fórmula `Días reprogramados` por un historial real (cuántas veces, cuándo, de→a, por qué). No computa atraso — eso es TASK-922.

## Why This Task Exists

Hoy la reprogramación en Notion es una resta-foto (`vigente − original`) con un solo casillero `Fecha límite original`: si una tarea se reprograma dos veces, se pierde el detalle, no hay conteo de movidas, y **no hay motivo**. El motivo es la bisagra del modelo (cliente→fecha nueva; interno→fecha original — ver ADR §2, §5). Sin captura de eventos de `due_date` + motivo, no se puede computar el atraso imputable correcto ni el OTD reason-aware. Fuente: ISSUE-081 + ADR Attributable Lateness V1 §3.2, §6, §12 (fase Foundation).

## Goal

- Tabla `greenhouse_delivery.task_due_date_changes` append-only (triggers anti-UPDATE/DELETE; CHECK enum en `reason_code` + `reason_source`; UNIQUE partial `source_event_id`).
- Webhook handler/consumer que capture cambios de `Fecha límite` con re-fetch + HMAC + echo-loop (clonar patrón TASK-912), resolviendo workspace por `parent.data_source_id`.
- Inferencia de `reason_code` desde `status_at_change` + transiciones recientes (`task_status_transitions`); `reason_source='inferred'`.
- Propiedad Notion nueva `Motivo de reprogramación` (select amigable, read-only para el valor inferido / editable para confirmar) + writeback de la sugerencia; confirmación del operador → `reason_source='operator_confirmed'`.
- Reliability signals: `delivery.reschedule.capture_lag`, `delivery.reschedule.pending_reason_confirmation`.
- Feature flag de captura default OFF (cero impacto al merge), mismo patrón TASK-912.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` — **ADR canónico** (§3.2 log, §5 partición de motivos, §6 inferencia, §10 boundary, §13 hard rules)
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — Notion captura, Greenhouse computa
- TASK-912 — patrón sibling de captura (webhook + re-fetch + HMAC + echo-loop + workspace resolution + reliability signals + flag OFF)
- notion-platform skill — re-fetch absoluto, HMAC, echo-loop, Notion-Version explícito, `captureWithDomain('integrations.notion', ...)`

Reglas obligatorias:

- **NUNCA** confiar el payload del webhook — re-fetch de la página antes de registrar.
- **NUNCA** persistir en `task_due_date_changes` una tarea cuyo workspace no resuelva a un tenant productivo (SKIP).
- **NUNCA** usar el motivo inferido como confirmado — `reason_source` distingue; el bono (TASK-922+) solo usa `operator_confirmed`.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'integrations.notion', { tags: { source: 'due_date_change_capture' } })`.
- **NUNCA** computar atraso en esta task — solo captura. El compute es TASK-922.

## Dependencies & Impact

### Depends on
- TASK-912 captura de transiciones (patrón + `task_status_transitions` para inferencia de motivo)
- Webhook subscription Notion incluyendo `Fecha límite` (operador-side)
- `src/lib/space-notion/notion-client.ts` (`fetchPageStatus`/equivalente para re-fetch de fecha)

### Blocks / Impacts
- **TASK-922** (compute de atraso imputable) consume este log + el motivo.
- Reemplaza conceptualmente `Días reprogramados`/`Fecha límite original` (legacy preservado 90d).

### Files owned (estimado)
- `migrations/<ts>_task-921-task-due-date-changes.sql` — NEW
- `src/app/api/webhooks/notion-due-date-changes/route.ts` (o extender el handler de status) — NEW
- `src/lib/sync/projections/notion-due-date-change-capture.ts` — NEW
- `src/lib/delivery/reschedule-reason-inference.ts` — NEW (función pura de inferencia)
- `src/lib/reliability/queries/reschedule-*.ts` — NEW (2 signals)

## Current Repo State

### Already exists
- `task_status_transitions` (TASK-908) + captura TASK-912 (patrón a clonar)
- Notion: `Fecha límite`, `Fecha límite original`, fórmulas `Días reprogramados`/`Reprogramada` (legacy, a deprecar 90d post-cutover)

### Gap
- No existe log de cambios de `due_date` (solo el casillero único)
- No existe captura de motivo de reprogramación
- No existe propiedad Notion `Motivo de reprogramación`

## Out of Scope
- Cómputo de atraso imputable / fecha justa / bucket OTD → TASK-922.
- Cutover del bono → futura, gated.
- Backfill histórico profundo (más allá del best-effort de fecha original) → evaluar en TASK-922+.

## Acceptance Criteria
- [x] Migration `task_due_date_changes` aplicada + tipos regenerados + triggers append-only + CHECK enums (verificada live: 16 cols, 2 triggers, 4 indexes)
- [x] Captura con re-fetch + workspace resolution + flag OFF default → cero impacto al merge (reusa el HMAC/echo-loop del webhook `notion-status-transitions` de TASK-912 vía `page_change_signal`; flag propio `NOTION_DUE_DATE_CAPTURE_ENABLED`)
- [x] Inferencia de motivo (función pura + 16 tests) desde status_at_change + transiciones
- [~] Propiedad Notion `Motivo de reprogramación` + **path de confirmación operador incluido** (consumer lee el select → `operator_confirmed`); **writeback de la sugerencia DEFERIDO a follow-up** (ver Follow-ups + Delta)
- [x] 2 reliability signals wired (capture_lag, pending_reason_confirmation), steady=0 (SQL verificado live)
- [x] `pnpm test` (focales) verde — 32 tests nuevos; build no corrido por WIP de Codex en el árbol (ver Delta)
- [x] Task movida a `complete/`

## Delta 2026-05-24 — M0 SHIPPED (develop, sin branch — override operador)

5 slices committeados en `develop`. Decisiones de diseño (Audit pre-FASE 1):

- **Reusar `notion.task.page_change_signal`** (webhook `notion-status-transitions` de TASK-912, ya emite para cualquier cambio de propiedad y ya está ON en prod) con un 2do consumer `notionDueDateChangeCaptureProjection` — NO segundo endpoint/HMAC/suscripción. Más DRY/robusto.
- **Flag propio `NOTION_DUE_DATE_CAPTURE_ENABLED` (default OFF)**: como el webhook de TASK-912 ya está ON, sin flag propio el merge capturaría inmediato. El flag gatea el persist del consumer → cero impacto al merge.
- **Writeback-de-sugerencia DEFERIDO** (mirror TASK-927): mostrar el motivo inferido en la propiedad Notion es el componente más pesado (Cloud Tasks + echo-loop + propiedad out-of-band) y NO es lo que TASK-922 consume. El **path de confirmación-read del operador SÍ se incluye**: el consumer lee la propiedad `Motivo de reprogramación` en el re-fetch → si el operador la setea, `reason_source='operator_confirmed'`. El operador setea el motivo por su propio conocimiento; ver la sugerencia es nicety.
- **Baseline seed** desde `Fecha límite original` en la primera observación (best-effort histórico, `source_quality='backfilled'`); `scope_change` NUNCA se infiere (solo operador), default ambiguo `unspecified` (conservador). `days_delta` en TS (no `EXTRACT(EPOCH FROM date-date)`, gate TASK-893).

Slices: 1 migration (`20260524100613341`) · 2 helper `reschedule-reason-inference.ts` · 3 `fetchPageDueDate` + consumer + flag · 4 signals · 5 docs. 32 tests focales verdes. Test pre-existente roto en develop `src/lib/reliability/ai/build-prompt.test.ts` (byte-idéntico a origin/develop, ajeno a M0). WIP de Codex sin commitear en el árbol (`reliability/ai|synthetic` + `ops-worker/server.ts`) — NO tocado.

## Follow-ups
- **TASK-922** (compute shadow / atraso imputable) consume este log + el motivo confirmado. Desbloqueado.
- **Writeback-de-sugerencia del motivo a Notion** (deferido): proyección que escribe el `reason_code` inferido a la propiedad `Motivo de reprogramación` (read-only para el operador, con sufijo "(sugerido)") vía Cloud Tasks throttled + echo-loop. Requiere crear la propiedad out-of-band. Patrón fuente: TASK-927 (writeback display). Crear task derivada cuando se priorice la UX de sugerencia.

## Delta 2026-06-19 — runtime verificado: captura viva pero **0 motivos confirmados** (pre-planeación M3)

Auditoría read-only a pedido del CEO. **No se tocó código ni runtime.** Estado real:

- **Captura M0 ACTIVA en producción.** El flag `NOTION_DUE_DATE_CAPTURE_ENABLED=true` está vivo en el ops-worker (deploy.sh lo defaultea a `true` desde 2026-05-24). `greenhouse_delivery.task_due_date_changes` tiene **735 filas, última captura 2026-06-18** (fresco). El plumbing funciona.
- **⚠️ 0 motivos `operator_confirmed`.** Las 735 capturas son **100% `reason_source='inferred'`**. Como por diseño del ADR §6 **solo `operator_confirmed` extiende la `fairDeadline`**, hoy `fairDeadline = fecha original` para todas las tareas → la dimensión de extensión por cliente/scope **no acredita nada** en el shadow de TASK-922. La mitad que funciona es el freeze por estados; la mitad de la fecha justa está inerte.
- **Implicación para M3:** el writeback-de-sugerencia (este follow-up, hoy deferido) **deja de ser nicety y pasa a ser load-bearing** para que el cutover corrija por demoras de cliente y no solo por freeze. Sin operadores confirmando motivos, M3 corregiría a medias. Es prerequisito #2 del cutover (ver TASK-1169 → §Prerequisitos). Decisión de UX a tomar: ¿propiedad `[GH] Motivo (sugerido)` separada read-only, o empujar directamente la confirmación en `Motivo de reprogramación`?
- **Observación colateral (corregida más abajo):** `task_status_transitions.assignee_member_id` está **0% poblado** (0/932).

### Corrección 2026-06-19 — el 0% de assignee en transitions NO es un blocker de atribución

La observación colateral de arriba me llevó (en TASK-922 / TASK-1169) a concluir erróneamente que el cutover no podía atribuir por miembro. **Estuvo mal:** la atribución vive en `greenhouse_delivery.tasks.assignee_member_id` (no en transitions), joinable por `notion_task_id`, con **~51% de cobertura directa hoy** sobre las filas shadow + reconstruible desde estos mismos logs append-only. Que transitions no traiga assignee es irrelevante para la atribución — la fuente correcta está intacta. Esto **abarata la ruta B** del cutover (PG-native) y deja a TASK-927 como ruta A opcional, no como prerequisito duro. Ver TASK-1169 §Prerequisitos (corregido) + TASK-922 Corrección 2026-06-19.
