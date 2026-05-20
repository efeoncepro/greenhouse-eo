# ISSUE-078 — SQL reader schema mismatch task_source_id canonical drift

> **Status**: Resolved 2026-05-18 (hotfix immediate). Follow-up architectonal evaluation deferred (no urgency).
> **Severity**: Error en producción (Sentry JAVASCRIPT-NEXTJS-65)
> **Ambiente**: preview + staging + production (todos los environments que renderean `/admin`)
> **Detected**: 2026-05-18 16:10:25 -04 via Sentry alert (URL: `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app/admin`)
> **Resolved**: 2026-05-18 (hotfix commit pending)

---

## Síntoma

Cualquier render del `/admin` page (operations dashboard) emite Sentry exception:

```text
error: column t.task_source_id does not exist
File "app:///_next/server/chunks/ssr/_3cda150e._.js", line 12
```

Stack trace apunta a reader del `getReliabilityOverview` que invoca todos los reliability signals en paralelo. El signal `notion.correction_transitions.source_availability` (shipped TASK-908 Slice 3.5 commit `ca62969a` 2026-05-18) lanza error PG; el wrapper canonical `captureWithDomain('delivery', ...)` lo emite a Sentry; el composer del dashboard degrada el signal a `severity='unknown'` y sigue rendereando los demás.

**Blast radius**: solo el signal afectado retorna `unknown` en el dashboard. El resto de signals + admin page funcionan. Pero el Sentry alert es repetitivo (cada render del admin), creando noise + ocultando alerts reales.

---

## Causa raíz

**Schema naming drift entre 2 tablas canonical** que representan el mismo identificador Notion:

| Tabla | Column canonical | Identificador |
|---|---|---|
| `greenhouse_delivery.tasks` | `notion_task_id` (TEXT NOT NULL) | Notion page UUID |
| `greenhouse_delivery.task_status_transitions` | `task_source_id` (TEXT NOT NULL) | Notion page UUID (mismo) |

El reader signal hace JOIN entre las 2 tablas, pero la query usa el **mismo nombre** para referenciar columns con **nombres distintos**:

```sql
-- BUG (commit ca62969a)
WITH completed_in_window AS (
  SELECT t.task_source_id            -- ❌ column NO existe en tasks
  FROM greenhouse_delivery.tasks t
  WHERE t.completed_at IS NOT NULL
)
```

PG rechaza con `column t.task_source_id does not exist` (correct — tasks tiene `notion_task_id` o `task_record_id`, NUNCA `task_source_id`).

**Por qué shipeé el bug**: violé CLAUDE.md "SQL Signal Reader Schema Validation Gate" (TASK-893 hotfix #3, canonized post incident 2026-05-16):

> "Toda query SQL embebida en TS que aparezca en code paths productivos — especialmente signal readers, reliability queries, materializers, audit scripts — **debe validar sus assumptions de schema contra PG real antes de mergear**. `db.d.ts` (Kysely codegen) NO es source of truth"

Yo asumí el column name basándome en mi memoria del schema sin smoke test contra PG real. El gate canonical lo prohíbe exactamente para evitar este bug class.

---

## Solución canonical aplicada (hotfix immediate)

Pattern canonical V1: alias `t.notion_task_id AS task_source_id` en el CTE para que el LEFT JOIN downstream funcione idéntico al naming de transitions.

```sql
-- FIX canonical (hotfix commit pending)
WITH completed_in_window AS (
  SELECT t.notion_task_id AS task_source_id   -- ✅ canonical alias
  FROM greenhouse_delivery.tasks t
  WHERE t.completed_at IS NOT NULL
    AND t.completed_at >= NOW() - INTERVAL '90 days'
)
```

**Pattern fuente** (callsites canonical que ya usan este alias):

- `src/lib/projects/get-project-detail.ts:484` — `dt.task_source_id = t.notion_page_id`
- `src/lib/identity/reconciliation/delivery-coverage.ts:112` — uses `task_source_id` consumiendo BQ source aliasing

**Live PG smoke verified canonical** (cumplir gate TASK-893 retroactivamente):

```bash
$ pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/_smoke-task-source-id-canonical.ts
tasks columns matching source/notion/record:
  notion_task_id (text, nullable=NO)                # ← canonical column en tasks
  task_record_id (text, nullable=NO)
  ...

task_status_transitions columns matching task:
  task_source_id (text)                              # ← canonical column en transitions

--- canonical query attempt with notion_task_id ---
Canonical query result: { total_completed: '1927', unavailable_count: '1927' }
```

Result canonical V1: `total_completed=1927, unavailable_count=1927` → 100% unavailable → `severity='error'` per matrix existente — exactamente el steady state esperado pre-TASK-912 deployment (per CLAUDE.md "ICO Status Transition Foundation invariants").

---

## Anti-regresión canonical

1. **JSDoc canonical embedded en el reader** documenta el cross-table naming drift + pattern alias canonical V1 + cross-ref a callsites canonical para que futuros maintainers no caigan en el mismo trap.

2. **Hard rule canonical canonized en CLAUDE.md** desde TASK-893: live PG smoke verify ANTES de mergear cualquier signal reader nuevo. Yo lo violé en TASK-908 — esto refuerza la importancia de cumplir el gate.

3. **ISSUE-078 archive permanente** documenta el bug class + resolution para audit + onboarding de nuevos agentes.

---

## Follow-up architectonal evaluation (deferred, NO urgent)

**Question**: ¿debería `task_status_transitions` renombrar su column `task_source_id → notion_task_id` para eliminar el drift architectonal entre las 2 tablas?

**Trade-offs**:

- **Pro rename**: single canonical naming cross-table. Onboarding agents nuevos no confunden. Anti-regresión arquitectónica permanente vs JSDoc patches.
- **Pro keep current**: ya shipped en TASK-908 (migration `20260518193001910` + helper `countCorrectionTransitions` + `CorrectionTransitionRecord` type + tests). Rename requires migration + update consumers + breaking change API.

**Decisión**: deferred a sesión separada. Hotfix actual con alias canonical V1 es safe + correct + follows existing pattern. Drift residual es **documented + JSDoc-protected**, no es bug runtime.

Trigger para revisitar: cuando emerja segundo callsite que necesite JOIN tasks ⇄ transitions (TASK-913 reactive consumer, TASK-912 webhook handler). Si emerge 3er bug class similar por drift, escalar rename column architectonal.

---

## Spec canonical

- **Reader fixed**: `src/lib/reliability/queries/notion-correction-transitions-source-availability.ts` (commit hotfix pending)
- **Gate violado canonized**: CLAUDE.md sección "SQL Signal Reader Schema Validation Gate (TASK-893 hotfix #3, desde 2026-05-16)"
- **Pattern fuente**: `src/lib/projects/get-project-detail.ts:484`, `src/lib/identity/reconciliation/delivery-coverage.ts:112`
- **Bug class hermano**: ISSUE pre-existing TASK-893 hotfix #3 (column DATE vs TIMESTAMP, `EXTRACT(EPOCH FROM date - date)` failure) — mismo bug class architectonal "TS types diverge from PG reality".
