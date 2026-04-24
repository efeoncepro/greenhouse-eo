# TASK-598 — ICO Narrative Presentation Layer (resolve mentions + relevance filter + sanitization)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none` (infra compartida que EPIC-006 reusa; no es child del epic)
- Status real: `Diseño`
- Rank: `TBD` (deadline duro lunes 2026-04-27 07:00 Chile)
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-598-ico-narrative-presentation-layer`
- Legacy ID: `none`
- GitHub Issue: `—`

## Summary

Instalar una **capa de presentación compartida** para narrativas de signals del ICO Engine que reconcilia contra la verdad canónica vigente al momento de renderizar — en vez de mostrar labels frozen de hace días, enrichments huérfanos, y placeholder sentinels ("Sin nombre") que contaminan el weekly digest, la UI, los webhooks y Nexa. El bug concreto que dispara este task: el email **ops-nexa-weekly-digest** scheduled a lunes 07:00 Chile va a contener 20 rows con "Sin nombre" literal en narrativas + 42% de enrichments huérfanos (signal ya borrado en BQ por el DELETE+INSERT del materialize). La capa nueva vive en `src/lib/ico-engine/ai/narrative-presentation.ts` con dos utilities: `resolveMentions(narrative, context)` (re-hidrata `@[label](type:id)` contra canonical + sanitiza sentinels) y `selectPresentableEnrichments(window, options)` (filtra huérfanos, deduplica, aplica quality gate + diversidad por space). Inmediato: integrar en `build-weekly-digest.ts` antes del lunes. Future-proof: TASK-595 (UI inbox), TASK-596 (webhooks + Nexa) reusan las mismas utilities — hereda fix automáticamente.

## Why This Task Exists

### El email del lunes 27-04 va a salir visiblemente roto

Diagnóstico ejecutado 2026-04-24 sobre `greenhouse_serving.ico_ai_signal_enrichment_history` (ventana últimos 7 días):

| Métrica | Valor |
|---|---|
| Total rows en ventana (status=succeeded) | 143 |
| Enrichments únicos | 20 (re-procesados ≤7 veces cada uno por materialize diario) |
| Rows con `"Sin nombre"` literal en narrativa | **20** |
| Enrichments **huérfanos** (signal parent borrado de `ai_signals`) | **60 (42%)** |
| Críticos top-N candidatos al digest | 33 anomaly + 20 recommendation + 76 root_cause |

Samples reales que aparecerían en el email enviado a ejecutivos:

```
"El proyecto 'Sin nombre' en Sky Airline experimentó una caída crítica
 en OTD% al 67.6%..."

"El proyecto @[Sin nombre](project:30b39c2f...) en el Space @[Sky Airline]
 presenta una disminución crítica de OTD% al 67.6%..."
```

Si el email sale así, se daña credibilidad del producto con stakeholders externos.

### TASK-588 no cubre este frente

TASK-588 (closed 2026-04-24) agregó sanitizer en `sanitizeProjectNarrative` y `enrichSignalPayload` — pero **solo actúan al generar la narrativa**. Las narrativas ya persistidas en `ico_ai_signal_enrichment_history` tienen `"Sin nombre"` como string crudo. El digest las lee y las pasa al email template sin sanitizar.

### Bug estructural (más profundo que un hotfix)

Las narrativas LLM se guardan con menciones `@[label](type:id)` donde el `label` queda **congelado al momento de generación**:

- Si el proyecto se llamaba `"Sin nombre"` el lunes pasado y hoy se llama `"TEASER TS - Chile (S)"`, el enrichment sigue diciendo "Sin nombre" para siempre.
- Si un miembro cambia de apellido, sus enrichments viejos muestran el nombre antiguo.
- Si un signal fue borrado por el DELETE+INSERT del materialize, su enrichment sigue vivo en `_history`.

Un hotfix solo en `build-weekly-digest.ts` no previene el mismo bug en TASK-595 (UI inbox), TASK-596 (webhooks + Nexa), ni en cualquier reader futuro de `enrichment_history`.

### Este task resuelve por contrato, no por parche

Principio del fix:

> **Las narrativas son templates con referencias canónicas. Los consumers resuelven contra la verdad vigente al renderizar, no al persistir.**

Analogía: Slack renderiza `<@U123|old_username>` mostrando el username actual del user, no el frozen. Mismo patrón.

## Goal

- Módulo nuevo `src/lib/ico-engine/ai/narrative-presentation.ts` con dos utilities canónicas + tests exhaustivos.
- `build-weekly-digest.ts` refactorizado para consumir las utilities.
- Deploy ops-worker Cloud Run antes del lunes 27-04 07:00 Chile.
- Observability: rate de fallback de mentions expuesto en `materialize_runs` o equivalente.
- Scope escalable: la capa queda disponible para TASK-595, TASK-596, y cualquier future consumer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/epics/to-do/EPIC-006-ico-signals-operational-memory-platform.md` (alineación con el contrato v2 futuro)

Reglas obligatorias:

- La capa es **pure resolver**: NO muta datos en `ico_ai_signal_enrichments` ni en `_history`. Resuelve al read.
- No reemplaza `sanitizeProjectNarrative` ni `isProjectDisplaySentinel` existentes — los compone.
- Reusa `greenhouse_delivery.projects` + `greenhouse_core.members` + `greenhouse_core.spaces` como canonical sources (post-TASK-588 ya están saneados de sentinels).
- Multi-tenant: toda query filtra por `space_id`.
- Compatible con contrato v2 de EPIC-006: cuando `signals_v2` + `signal_key` existan, se añade sin refactor en los consumers.

## Normative Docs

- `docs/tasks/complete/TASK-588-project-title-resolution-conformed-sync-hardening.md` (contrato post-sanitize que este task extiende)

## Dependencies & Impact

### Depends on

- `TASK-588` (complete 2026-04-24) — provides `PROJECT_DISPLAY_SENTINELS`, `isProjectDisplaySentinel`, `isTechnicalProjectIdentifier`, `sanitizeProjectNarrative` exportados desde `entity-display-resolution.ts`.
- `greenhouse_serving.ico_ai_signal_enrichment_history` (existente) — source de read.
- `greenhouse_serving.ico_ai_signals` (existente) — target de INNER JOIN para filtrar huérfanos.
- `greenhouse_delivery.projects`, `greenhouse_core.members`, `greenhouse_core.spaces` (existentes) — canonical source of truth.

### Blocks / Impacts

- **Weekly digest email** (ops-worker cron `ops-nexa-weekly-digest` lunes 07:00 Chile) — beneficiario directo, P0.
- `TASK-595` (UI inbox operativo, EPIC-006 child 6/8) — consumir estas utilities desde día 1, evita duplicación de lógica.
- `TASK-596` (webhooks + Nexa integration, EPIC-006 child 7/8) — webhooks HMAC-signed envían narrativa ya resuelta.
- `TASK-593` (enrichment versioning, EPIC-006 child 4/8) — puede eliminar el INNER JOIN con signals cuando enrichments v2 referencien entidades por ID sin label frozen.
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — otros read paths del reader que consumen `enrichment_history` se evalúan como candidatos de refactor (si aplica).

### Files owned

- `src/lib/ico-engine/ai/narrative-presentation.ts` (nuevo)
- `src/lib/ico-engine/ai/narrative-presentation.test.ts` (nuevo)
- `src/lib/nexa/digest/build-weekly-digest.ts` (refactor)
- `src/lib/nexa/digest/build-weekly-digest.test.ts` (extender con fixtures de sentinels y orphans)
- `src/lib/ico-engine/ai/entity-display-resolution.ts` (minor: export adicional si se necesita)
- `services/ops-worker/` redeploy (cambio de código, no de archivos)
- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md` (sección nueva sobre presentation layer)

## Current Repo State

### Already exists

- `build-weekly-digest.ts:237` — query directa a `ico_ai_signal_enrichment_history` sin INNER JOIN contra `ico_ai_signals` (permite huérfanos).
- `build-weekly-digest.ts:121` — `parseNarrativeText` parsea `@[label](type:id)` pero **no sanitiza sentinels ni re-resuelve labels**.
- `entity-display-resolution.ts:31` — `PROJECT_DISPLAY_SENTINELS` exportado (TASK-588).
- `entity-display-resolution.ts:77` — `isProjectDisplaySentinel` exportado.
- `entity-display-resolution.ts:35-60` — `isTechnicalProjectIdentifier` extendido con shapes nuevos.
- `entity-display-resolution.ts:163-222` — `sanitizeProjectNarrative` existe pero requiere un `projectResolutions` Map pre-construido (solo projects, no members/spaces).
- `llm-enrichment-worker.ts` — escribe `enrichment_history` con `@[label]` frozen; no se toca en este task.
- `resolve-signal-context.ts` — ya resuelve spaces + members + projects para signals actuales; patrón reutilizable.
- `ops-worker` Cloud Run con cron scheduler `ops-nexa-weekly-digest 0 7 * * 1`.

### Gap

- No existe utility genérico de mention resolution que cubra los 3 tipos (`space | member | project`) en una pasada batch.
- No existe filtro de huérfanos en ningún consumer de `enrichment_history`.
- No existe dedup por `signal_id` para evitar contar el mismo signal múltiples veces en digest (materialize diario genera múltiples enrichments por signal).
- No existe diversity cap per-space (Sky podría dominar 8/8 items del digest con todos los críticos de OTD).
- No existe quality gate en el read path del digest (quality_score puede ser cualquier valor).
- No hay observabilidad de fallback rate de mention resolution.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar aquí)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — `resolveMentions` utility

Nuevo módulo `src/lib/ico-engine/ai/narrative-presentation.ts` exporta:

```ts
export interface MentionResolutionContext {
  projects: Map<string, string | null>   // id → current project_name (post-TASK-588: null si no hay)
  members: Map<string, string | null>    // id → current display_name
  spaces: Map<string, string | null>     // id → current space_name
  fallbacks?: {
    project?: string     // default 'este proyecto'
    member?: string      // default 'este responsable'
    space?: string       // default 'este espacio'
  }
}

export interface MentionResolutionReport {
  type: 'space' | 'member' | 'project'
  id: string
  originalLabel: string
  resolvedLabel: string
  fallbackReason: 'none' | 'sentinel' | 'missing_entity' | 'null_canonical' | 'orphan_signal'
}

export interface ResolvedNarrative {
  text: string
  reports: MentionResolutionReport[]
}

export function resolveMentions(
  narrative: string | null,
  context: MentionResolutionContext
): ResolvedNarrative
```

**Comportamiento:**

- Parsea tokens `@[label](type:id)` con la misma regex que `sanitizeProjectNarrative`.
- Para cada mención:
  - Lookup `context.[type+'s'].get(id)`.
  - Si `canonical_label` es null / sentinel / technical ID → replace con `fallbacks[type]`.
  - Si existe y es humano → replace label con `canonical_label` (independiente del `originalLabel` frozen).
  - Preserva el `@[label](type:id)` mention syntax en la salida para que consumers downstream puedan re-renderizar como link si quieren.
- Texto fuera de menciones que contenga sentinels como strings planos (ej. `"proyecto Sin nombre"`): barre con los sentinels de `PROJECT_DISPLAY_SENTINELS` y reemplaza con el fallback genérico.
- Devuelve `reports[]` para que la observability cuente por fallback_reason.

**Helper asociado:**

```ts
export async function loadMentionContext(
  enrichments: Array<{ space_id: string; [narrative_fields]: string | null }>,
  options?: { includeOrphansCheck?: boolean }
): Promise<MentionResolutionContext>
```

Pre-extrae todos los `project:id`, `member:id`, `space:id` de los narratives, hace batch lookup a las 3 canonical tables en una sola query cada una, construye el context.

### Slice 2 — `selectPresentableEnrichments` utility

```ts
export interface PresentationFilters {
  requireSignalExists?: boolean     // default true — INNER JOIN con ai_signals
  minQualityScore?: number          // default 0.6
  maxPerSpace?: number              // default 3
  maxTotal?: number                 // default 8
  dedupBy?: 'signal_id' | 'signal_key'  // default 'signal_id' hoy; 'signal_key' post-EPIC-006
  excludeStatuses?: string[]        // default ['auto_resolved', 'resolved'] post-EPIC-006
  severityFloor?: 'info' | 'warning' | 'critical'  // default 'warning' para digest
}

export async function selectPresentableEnrichments(
  windowStart: Date,
  windowEnd: Date,
  filters: PresentationFilters
): Promise<PresentableEnrichment[]>
```

**Comportamiento:**

- Query consolidada: `enrichment_history INNER JOIN ai_signals INNER JOIN spaces LEFT JOIN clients` (cuando EPIC-006 aterriza: `signal_enrichments_v2 INNER JOIN signals_v2`).
- WHERE `status='succeeded'` + quality_score >= floor + signal existe + severity >= floor + dedup.
- ORDER BY severity DESC, quality_score DESC, recency DESC.
- Aplicar diversity cap per-space: para cada space, max N enrichments. Si Sky tiene 10 críticos, solo los top 3 entran.
- LIMIT maxTotal.

### Slice 3 — Refactor `build-weekly-digest.ts`

Reemplazar el flow actual por el consumer delgado:

```ts
const enrichments = await selectPresentableEnrichments(window.startAt, window.endAt, {
  maxTotal: normalizeLimit(options.limit),
  maxPerSpace: 3,
  requireSignalExists: true,
  minQualityScore: 0.6,
  severityFloor: 'warning'
})

const context = await loadMentionContext(enrichments, { includeOrphansCheck: true })

const presentable = enrichments.map(e => ({
  ...e,
  explanation_summary: resolveMentions(e.explanation_summary, context).text,
  root_cause_narrative: resolveMentions(e.root_cause_narrative, context).text,
  recommended_action: resolveMentions(e.recommended_action, context).text
}))

// … resto del mapeo a WeeklyDigestSpaceSection / WeeklyDigestInsight
```

Esto elimina ~150 líneas de lógica en el digest y las mueve a utilities testeadas.

### Slice 4 — Tests

En `narrative-presentation.test.ts`:

- **Sentinel resolution**: input `@[Sin nombre](project:abc)`, context con `projects.get('abc') = null` → output usa fallback `'este proyecto'`.
- **Fresh resolution**: input `@[Sin nombre](project:abc)`, context con `projects.get('abc') = 'TEASER TS - Chile (S)'` → output usa el nombre fresh.
- **Orphan signal**: input con mention válido pero `requireSignalExists=true` y signal borrado → el enrichment se excluye en `selectPresentableEnrichments`.
- **Technical ID inline**: input `"proyecto 30b39c2f-efe7-..."` → sanitiza a `"este proyecto"` (via `isTechnicalProjectIdentifier`).
- **Multi-mention en una narrativa**: varios `@[x](type:id)` en el mismo string → cada uno resolvido independientemente.
- **Dedup por signal_id**: N enrichments del mismo signal_id → solo 1 pasa el filter.
- **Diversity cap**: fixture con 10 enrichments de Sky críticos + 2 de Efeonce → top-8 debe tener 3 de Sky + todos los de Efeonce + 3 más de Sky repartidos.
- **Quality gate**: enrichment con quality_score=0.5 y otro con 0.8 → solo el segundo pasa con floor=0.6.
- **Sentinel word en texto plano fuera de menciones**: input `"El proyecto 'Sin nombre' en Sky..."` → output reemplaza `'Sin nombre'` por `'este proyecto'`.

En `build-weekly-digest.test.ts` (extender):

- Fixture con 143 rows tipo prod + 20 con "Sin nombre" + 60 huérfanos → output final del digest tiene 0 sentinels, 0 huérfanos, top 8 con diversidad.

### Slice 5 — Observability

Contar per-invocation fallback rates:

- Log estructurado: `{event: 'narrative_presentation', digest_window, total_mentions, resolved, fallback_count_by_reason}`.
- Si existe `materialize_runs` (no en este task, es de TASK-590), escribir ahí. Mientras tanto: log + métrica Cloud Logging que TASK-594 eventualmente consume.
- Umbral de alerta: si `fallback_rate > 20%` en un run → log warning con sample de mentions afectados.

### Slice 6 — Deploy ops-worker + rollout

- Redeploy `services/ops-worker/` para que el Cloud Run tenga el nuevo `build-weekly-digest.ts` bundled.
- Ejecutar dry-run manual: `curl -X POST https://ops-worker-.../nexa/weekly-digest?dry_run=true` (si el endpoint soporta dry_run; si no, invocar la función directamente).
- Verificar output del email con 0 sentinels + 0 huérfanos.
- Confirmación al owner antes del lunes 07:00 Chile.

## Out of Scope

- **No se cambia el enrichment worker** (`llm-enrichment-worker.ts`) — sigue escribiendo narrativas con `@[label](type:id)` frozen. La resolución es pura al read.
- **No se cambia el prompt LLM** ni el contrato del enrichment — eso es TASK-593 / EPIC-006.
- **No se modifica `ico_ai_signal_enrichments` ni `_history`** en escritura.
- **No se elimina el materialize DELETE+INSERT** — esa deuda se cierra en TASK-591 (EPIC-006).
- **No se refactoriza la UI de home** (Nexa insights section) — hereda al cambio vía `llm-enrichment-reader` refactorizado si aplica, pero scope principal es solo digest.
- **No se agrega presentation layer a las superficies de finance** (`finance/ai/llm-provider.ts` tiene su propio flow) — scope es ICO engine.
- **No se implementa schema v2** de EPIC-006 — esta task es independiente y precede al epic.

## Detailed Spec

### Contrato exacto de `resolveMentions`

```ts
// Input
narrative = "El FTR% del proyecto @[Sin nombre](project:30b39c2f...) en @[Sky Airline](space:spc-ae463d9f...) cayó a 67.6%."
context = {
  projects: Map { '30b39c2f...' => null },
  members: Map {},
  spaces: Map { 'spc-ae463d9f...' => 'Sky Airline' },
  fallbacks: { project: 'este proyecto', space: 'este espacio' }
}

// Output
{
  text: "El FTR% del proyecto @[este proyecto](project:30b39c2f...) en @[Sky Airline](space:spc-ae463d9f...) cayó a 67.6%.",
  reports: [
    { type: 'project', id: '30b39c2f...', originalLabel: 'Sin nombre', resolvedLabel: 'este proyecto', fallbackReason: 'null_canonical' },
    { type: 'space',   id: 'spc-ae463d9f...', originalLabel: 'Sky Airline', resolvedLabel: 'Sky Airline', fallbackReason: 'none' }
  ]
}
```

### Contrato SQL de `selectPresentableEnrichments`

```sql
WITH eligible AS (
  SELECT DISTINCT ON (signal_id)   -- dedup
    e.enrichment_id, e.signal_id, e.space_id, e.signal_type,
    e.metric_name, e.severity, e.quality_score,
    e.explanation_summary, e.root_cause_narrative, e.recommended_action,
    e.confidence, e.processed_at
  FROM greenhouse_serving.ico_ai_signal_enrichment_history e
  INNER JOIN greenhouse_serving.ico_ai_signals sig ON sig.signal_id = e.signal_id   -- filtra orphans
  WHERE e.processed_at >= $1 AND e.processed_at < $2
    AND e.status = 'succeeded'
    AND e.quality_score >= $3
    AND e.severity IN ('critical', 'warning')
  ORDER BY signal_id, e.processed_at DESC
),
ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY space_id
      ORDER BY severity_order, quality_score DESC NULLS LAST, processed_at DESC
    ) AS per_space_rank
  FROM eligible
)
SELECT *
FROM ranked
WHERE per_space_rank <= $4   -- maxPerSpace
ORDER BY severity_order, quality_score DESC NULLS LAST, processed_at DESC
LIMIT $5                     -- maxTotal
```

### Diagrama del flow

```
weekly-digest cron (Mon 07:00 Chile)
  ↓
selectPresentableEnrichments(window, filters)
  ↓ — SQL filter: orphans out, dedup, quality, severity, diversity
ranked enrichments[]
  ↓
loadMentionContext(enrichments)
  ↓ — batch fetch: greenhouse_delivery.projects + greenhouse_core.members + greenhouse_core.spaces
MentionResolutionContext
  ↓
resolveMentions(narrative, context) per each narrative field per enrichment
  ↓ — re-resolve @[label](id) against canonical vigente; sentinels → fallback
presentable enrichments[] (clean text, mentions hidratadas)
  ↓
build WeeklyDigestSpaceSection[] / WeeklyDigestInsight[]
  ↓
email template render + sendgrid send
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/lib/ico-engine/ai/narrative-presentation.ts` existe con `resolveMentions`, `loadMentionContext`, `selectPresentableEnrichments` exportados.
- [ ] Test suite `narrative-presentation.test.ts` cubre: sentinel, fresh, orphan, technical ID inline, multi-mention, dedup, diversity, quality gate, plain-text sentinel. Todos verdes.
- [ ] `build-weekly-digest.ts` refactorizado: usa las utilities y su código se reduce en ≥40%.
- [ ] Fixture test de `build-weekly-digest.test.ts`: con 20 enrichments sentinel + 60 huérfanos en la ventana → digest produce 0 sentinels + 0 huérfanos + top 8 con diversidad.
- [ ] Dry-run manual en staging: el email NO contiene literal `"Sin nombre"`, `"Sin título"`, `"untitled"`, ni `"N/A"` standalone.
- [ ] Dry-run manual: el email NO contiene narrativas cuyo `signal_id` no existe en `ico_ai_signals`.
- [ ] `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` clean.
- [ ] Ops-worker Cloud Run redeployed con el código nuevo antes del lunes 27-04 07:00 Chile.
- [ ] Logs estructurados de `narrative_presentation` emitidos por invocación del digest.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test src/lib/ico-engine/ai/narrative-presentation.test.ts src/lib/nexa/digest/`
- `pnpm build`
- Dry-run del digest con dataset actual: script o curl a `/nexa/weekly-digest?dry_run=true` o invocación directa de `buildWeeklyDigest` + assert manual sobre output.
- Logs en Cloud Logging post-deploy confirmando `fallback_reason` bucketing.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`to-do` → `in-progress` → `complete`).
- [ ] Archivo en carpeta correcta (`complete/` al cerrar).
- [ ] `docs/tasks/README.md` sincronizado con el cierre.
- [ ] `Handoff.md` actualizado con fix deployed + dry-run evidence.
- [ ] `changelog.md` con entry de 2026-04-24/25.
- [ ] Chequeo de impacto cruzado: TASK-595 + TASK-596 del EPIC-006 actualizan sus stubs con referencia a esta utility compartida (en vez de re-implementar).

## Follow-ups

- **TASK-595 (UI inbox)** debe consumir `resolveMentions` + `selectPresentableEnrichments` desde día 1.
- **TASK-596 (webhooks + Nexa)** idem; el payload HMAC-signed debe llevar narrativa ya resuelta.
- **TASK-593 (LLM enrichment versioning)**: cuando los enrichments v2 referencien entidades por ID sin label frozen, la utility `resolveMentions` puede simplificar (ya no hay `originalLabel` que comparar).
- Si se detecta `fallback_rate > 20%` sostenido por una semana → crear task de data-quality-remediation upstream (probablemente indica que el sync de la canonical source está teniendo drift).
- Evaluar si `llm-enrichment-reader.ts` (otras superficies que leen `_history` para UI actual) necesita integración también — discovery dentro del task.

## Open Questions

- ¿El ops-worker deploy script tiene un dry-run endpoint o hay que agregarlo inline como parte del scope? Verificar en Discovery — si no existe, agregar flag `?dry_run=true` al handler como slice 6.1.
- ¿El digest email tiene test fixtures con output esperado en algún snapshot suite? Si sí, actualizar los snapshots tras el refactor.
- ¿`llm-enrichment-reader.ts` es un candidato para el mismo refactor? Discovery evalúa scope marginal.
