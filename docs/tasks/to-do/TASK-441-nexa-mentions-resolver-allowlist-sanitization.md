# TASK-441 — Nexa Mentions Resolver + Allowlist + Sanitization

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `hardening`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-441-nexa-mentions-resolver-allowlist`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Blinda la capa de @mentions de Nexa convirtiéndola en un contrato server-side: un resolver único valida cada marca `@[Nombre](type:ID)` contra PostgreSQL antes de persistirla, sanitiza el display name, re-emite nombres canónicos, descarta IDs alucinados y emite telemetría (`emitted`, `invalidated`, `rendered`, `clicked`). Cierra el riesgo de XSS por payload del LLM y de chips rotos que navegan a 404.

## Why This Task Exists

Hoy el formato de mención se emite directamente por Gemini sobre `explanationSummary` y `recommendedAction`, se persiste crudo y se parsea en el frontend ([NexaMentionText.tsx:28](src/components/greenhouse/NexaMentionText.tsx#L28)). No hay:

- Validación de que el ID exista realmente en PG (LLM puede alucinar `space:xyz`).
- Sanitización del display name (si el modelo emite `[<img onerror=...>](member:id)` el string va al DOM via `Chip label`).
- Telemetría para medir tasa de hallucination, clicks ni errores de navegación.
- Reemisión de nombre canónico (el LLM puede escribir mal el nombre de un Space y queda persistido).

Para nivel enterprise necesitamos la mención como **contrato validado**, no como texto libre del modelo.

## Goal

- Server-side resolver `resolveNexaMentions(text)` que valida cada marca contra PG y devuelve `{ text, mentions[], invalidated[] }`
- Allowlist por tipo (`member`, `space`, `project`, y los nuevos que sume TASK-442) resuelta con una sola query batch
- Sanitización del display name (whitelist alfanumérico + unicode básico, strip HTML)
- Reemisión del nombre canónico desde PG (ignorar el texto del LLM entre corchetes)
- Telemetría `nexa_mention_events` (`emitted` / `invalidated` / `rendered` / `clicked`) con `source_surface`, `mention_type`, `entity_id`, `insight_id`
- El enrichment LLM corre el resolver antes de persistir — narrativas persistidas solo contienen menciones válidas
- Fallback: mención inválida → texto plano con el nombre original (no se rompe la UI)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- El resolver vive en `src/lib/nexa/mentions/` (nuevo submódulo canónico — no mezclar con `ico-engine/ai/`).
- El resolver corre en el pipeline de enrichment antes del write a `ico_signal_enrichments` y equivalentes.
- Zero trust del output del LLM: si una mención no resuelve, se degrada a texto plano con el nombre original sanitizado.
- El display name se re-emite desde PG (fuente de verdad), no desde el corchete que escribió el modelo.
- La tabla `nexa_mention_events` se aprovisiona vía migración `node-pg-migrate` y queda owned por `greenhouse_ops`.

## Normative Docs

- `docs/tasks/complete/TASK-240-nexa-insights-entity-mentions.md` — implementación base del parser
- `docs/tasks/in-progress/TASK-440-nexa-project-label-resolution.md` — resolución canónica de project labels (input del resolver)
- `docs/tasks/to-do/TASK-239-nexa-advisory-prompt-enrichment-metric-glossary.md` — enrichment del prompt

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/NexaMentionText.tsx` — parser frontend actual
- `src/lib/ico-engine/ai/llm-provider.ts` — pipeline de enrichment (se engancha aquí)
- `src/lib/nexa/digest/build-weekly-digest.ts` — parser de email (se refactoriza para usar el registry resolver)
- PG tables: `greenhouse_core.team_members`, `greenhouse_core.spaces`, `greenhouse.projects` (según TASK-440)
- `src/types/db.d.ts` — tipos Kysely

### Blocks / Impacts

- TASK-442 (registry + entity expansion) consume este resolver para sumar tipos nuevos
- TASK-443 (chat rendering) asume que el texto ya viene validado
- TASK-445 (a11y + tests) testea el resolver además del renderer
- Todos los consumers de `NexaMentionText` se benefician del nombre canónico y el fallback

### Files owned

- `src/lib/nexa/mentions/resolver.ts` — nuevo
- `src/lib/nexa/mentions/sanitize.ts` — nuevo
- `src/lib/nexa/mentions/telemetry.ts` — nuevo
- `src/lib/nexa/mentions/parse-marks.ts` — nuevo (regex compartida UI ↔ server)
- `src/lib/nexa/mentions/index.ts` — nuevo (barrel)
- `src/lib/ico-engine/ai/llm-provider.ts` — modificar: correr resolver post-LLM, pre-persist
- `src/lib/nexa/digest/build-weekly-digest.ts` — modificar: consumir regex compartida
- `src/components/greenhouse/NexaMentionText.tsx` — modificar: mostrar tombstone si el server marcó una mención como inválida; click telemetry
- `migrations/<timestamp>_nexa-mention-events.sql` — nuevo: tabla `nexa_mention_events`

## Current Repo State

### Already exists

- Parser frontend: [NexaMentionText.tsx:28](src/components/greenhouse/NexaMentionText.tsx#L28) con regex `/@\[([^\]]+)\]\((member|space|project):([^)]+)\)/g`
- Prompt instruction del LLM: [llm-types.ts:213-218](src/lib/ico-engine/ai/llm-types.ts#L213-L218)
- Parser paralelo en email: [build-weekly-digest.ts:92-127](src/lib/nexa/digest/build-weekly-digest.ts#L92-L127) con regex escape-aware `/@\[((?:[^\]\\]|\\.)+)\]\(...\)/`
- TASK-240 cerrada: menciones renderizadas en `NexaInsightsBlock`
- TASK-440 en progreso: entrega contrato canónico de project labels que esta task consume
- Kysely disponible para batch query multi-tabla

### Gap

- Regex duplicada e inconsistente entre UI (`[^\]]`) y email (`[^\]\\]|\\.`) — nombres con `]` rompen en UI
- Cero validación server-side de IDs
- Cero sanitización del display name
- Cero telemetría de menciones
- No existe tabla `nexa_mention_events`
- El nombre del corchete es texto libre del LLM, no canónico
- Mención inválida hoy renderiza chip con link roto (no hay fallback)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Regex compartida y parse-marks

- Crear `src/lib/nexa/mentions/parse-marks.ts` exportando `MENTION_REGEX` escape-aware y `parseMarks(text) → Mark[]`
- Reutilizar desde UI ([NexaMentionText.tsx](src/components/greenhouse/NexaMentionText.tsx)) y email ([build-weekly-digest.ts](src/lib/nexa/digest/build-weekly-digest.ts))
- Tests unitarios: nombres con `]`, escapes, marcas malformadas, marcas anidadas, IDs con `:` y `-`

### Slice 2 — Sanitizer del display name

- Crear `sanitize.ts` con `sanitizeMentionName(raw) → string`
- Whitelist: alfanumérico + espacios + acentos + `'` `.` `&` `-`
- Strip HTML tags, zero-width chars, control chars
- Cap de 80 caracteres

### Slice 3 — Server-side resolver + allowlist

- Crear `resolver.ts` con:
  - `resolveNexaMentions(text, { tenantId }) → { text, mentions[], invalidated[] }`
  - Una query Kysely batch por tipo (IN clause) a las tablas canónicas
  - Reescribe el texto reemplazando `@[LLMName](type:id)` por `@[CanonicalName](type:id)` si resuelve
  - Marca como inválida si no resuelve → degrada a texto plano con `sanitizeMentionName(LLMName)`
  - Registra cada mention en `nexa_mention_events` con evento `emitted` o `invalidated`
- Scope tenant-aware: respeta multi-tenancy via `tenant_id` en las tablas

### Slice 4 — Migración `nexa_mention_events`

- `pnpm migrate:create nexa-mention-events`
- Schema: `id`, `tenant_id`, `event_type` (`emitted|invalidated|rendered|clicked`), `mention_type`, `entity_id`, `entity_name`, `source_surface` (`ico_insight|chat|digest|briefing|push`), `source_reference_id`, `insight_id`, `user_id`, `occurred_at`
- Indexado por `(tenant_id, occurred_at)` y `(mention_type, entity_id)`
- Owned por `greenhouse_ops`
- `pnpm db:generate-types`

### Slice 5 — Integración en pipeline de enrichment

- En [llm-provider.ts](src/lib/ico-engine/ai/llm-provider.ts): correr `resolveNexaMentions()` sobre `explanationSummary`, `rootCauseNarrative`, `recommendedAction` antes del write
- Persistir solo texto validado en `ico_signal_enrichments`
- Métricas: log de rate de invalidación en `source_sync_runs` (`reactive_worker` o ad-hoc enrichment)

### Slice 6 — Telemetría de render/click

- `NexaMentionText` hace POST fire-and-forget a `/api/nexa/mentions/track` con `{ event_type: 'rendered' | 'clicked', mention_type, entity_id, source_surface }`
- Endpoint `src/app/api/nexa/mentions/track/route.ts` valida payload + escribe en `nexa_mention_events`
- Dedup en cliente: una mención solo registra `rendered` una vez por sesión (sessionStorage)

### Slice 7 — Fallback tombstone en UI

- Si el servidor marcó una mención como inválida (vendrá con formato `@!{Name}` o similar), `NexaMentionText` muestra `<Chip variant='outlined' disabled>` en gris sin href + tooltip `Entidad no encontrada`
- Si el entity_id existe pero la entidad fue eliminada (chequeo en ruta target), surface maneja su 404

## Out of Scope

- Autocompletado en input — va en TASK-444
- Nuevos tipos de entidad (client, provider, business_line) — van en TASK-442
- Mentions en `NexaThread` — va en TASK-443
- Role colors en chips de miembro
- Compactar las 3 fuentes (UI, email, push) en un único render component

## Detailed Spec

### Contrato del resolver

```ts
export interface MentionMark {
  type: 'member' | 'space' | 'project' // extensible en TASK-442
  id: string
  rawName: string // lo que escribió el LLM
}

export interface ResolvedMention extends MentionMark {
  canonicalName: string
  href: string | null
  valid: true
}

export interface InvalidMention extends MentionMark {
  reason: 'not_found' | 'tenant_mismatch' | 'deleted'
  sanitizedName: string
  valid: false
}

export async function resolveNexaMentions(
  text: string,
  ctx: { tenantId: string; surface: MentionSurface; sourceReferenceId?: string }
): Promise<{
  text: string
  mentions: ResolvedMention[]
  invalidated: InvalidMention[]
}>
```

### Shape de `nexa_mention_events`

```sql
CREATE TABLE greenhouse_core.nexa_mention_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('emitted','invalidated','rendered','clicked')),
  mention_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  source_surface TEXT NOT NULL,
  source_reference_id TEXT,
  insight_id TEXT,
  user_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX nme_tenant_time ON greenhouse_core.nexa_mention_events (tenant_id, occurred_at DESC);
CREATE INDEX nme_entity ON greenhouse_core.nexa_mention_events (mention_type, entity_id);
```

### Flujo de validación

1. LLM emite `explanationSummary: "...@[Sky Arilines](space:spc-hallucinated)..."`
2. Post-process: `resolveNexaMentions()` → query `spaces` WHERE id IN (...) → `spc-hallucinated` no existe
3. Reescribe a `"...Sky Arilines..."` (texto plano sanitizado) + registra evento `invalidated`
4. Persiste `ico_signal_enrichments.explanation_summary` ya limpio
5. UI nunca renderiza chip roto

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `resolveNexaMentions()` valida todos los IDs contra PG en una sola query batch por tipo
- [ ] Nombre canónico reemplaza al nombre del LLM en el texto persistido
- [ ] Mención inválida → texto plano sanitizado + evento `invalidated`
- [ ] `nexa_mention_events` registra `emitted`, `invalidated`, `rendered`, `clicked`
- [ ] Regex compartida UI ↔ server ↔ email (`parse-marks.ts`)
- [ ] `sanitizeMentionName()` bloquea HTML, zero-width, control chars
- [ ] Endpoint `/api/nexa/mentions/track` con rate limit y payload validation
- [ ] Tests unitarios del parser, sanitizer y resolver (mock PG)
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` sin errores
- [ ] Re-materialización del pipeline LLM produce narrativas sin chips rotos en staging

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- nexa/mentions`
- `pnpm build`
- Migración: `pnpm migrate:up` (verificar tabla creada)
- Manual: inyectar mención con ID inexistente en prompt → verificar que queda como texto plano post-enrichment
- Manual: inyectar `[<img onerror=alert(1)>](member:x)` en prompt → verificar que se sanitiza
- Query: `SELECT event_type, COUNT(*) FROM nexa_mention_events GROUP BY 1` tras re-ejecutar enrichment

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-240, TASK-438, TASK-439, TASK-440, TASK-442, TASK-443
- [ ] `docs/architecture/Greenhouse_ICO_Engine_v1.md` agrega delta del resolver
- [ ] `docs/documentation/` bajo `agency/` o `client-portal/` documenta el contrato de menciones

## Follow-ups

- Dashboard en Admin Center con tasa de hallucination por modelo / prompt version
- Alerta automática si `invalidated / emitted` supera threshold (e.g. 5%)
- Exponer tabla via `authorizedViews` para ops

## Open Questions

- ¿Conviene guardar el texto pre-resolver también (debugging)? Propuesta: NO — solo log en `source_sync_runs` con sample. Confirmar con ops.
