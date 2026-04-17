# TASK-448 — Nexa Insights Mention Reverse Index + Entity Filter

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-441`
- Branch: `task/TASK-448-nexa-insights-mention-reverse-index-filter`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Construye un reverse index de menciones (`nexa_insight_mentions`) a partir del resolver de TASK-441 para responder en O(1) "¿qué insights mencionan a @Andrés / Sky Airlines / Campaña Q1?". Habilita filtrado entity-centric del feed, un tab "Menciones sobre mí/esta entidad" en Space 360 / Person 360, y recomendaciones proactivas del tipo "3 insights nuevos mencionan a tu cliente X esta semana".

## Why This Task Exists

Hoy el feed de Insights se navega top-down (último, más severo, por métrica). No hay forma de decir "quiero ver todo lo que Nexa dijo sobre Andrés Carlosama en el último mes" sin leer full-feed y cazar menciones a ojo. El operador que abre un perfil 360 de un cliente o miembro ve insights del contexto directo de esa entidad pero no insights donde esa entidad es causa probable (root cause mentioning) en otros dominios.

El reverse index convierte las menciones de output pasivo del LLM en un grafo consultable que potencia:

- Filtro entity-centric del feed
- Tab "Menciones recientes" en perfiles 360
- Notificación proactiva a un owner cuando su entidad aparece en un insight crítico
- Métrica de entity salience (qué entidades están en el foco de Nexa)

## Goal

- Tabla `greenhouse_core.nexa_insight_mentions` poblada por el resolver al persistir cada enrichment
- Endpoint `GET /api/nexa/insights?mentionedEntityId={type}:{id}&since=...` con filter por entidad
- UI: filter chip en `NexaInsightsBlock` ("Filtrando: @Sky Airlines × ")
- Space 360 / Person 360: tab "Nexa menciona" con insights donde la entidad aparece mencionada
- Backfill script para enrichments históricos
- Métrica `entity_salience` computable por rango y tipo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- Insert al reverse index ocurre dentro de la misma transacción que el enrichment (consistencia)
- Index tenant-aware
- Lecturas respetan RBAC + `authorizedViews`
- Recompute idempotente para poder reprocesar enrichment sin duplicar

## Normative Docs

- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/tasks/complete/TASK-242-nexa-insights-space-360.md`
- `docs/tasks/complete/TASK-243-nexa-insights-person-360.md`

## Dependencies & Impact

### Depends on

- TASK-441: resolver que extrae `mentions[]` por enrichment — esta task consume ese output
- Tabla `nexa_mention_events` ya existe (TASK-441); `nexa_insight_mentions` es distinta (relación insight → mention, no evento)

### Blocks / Impacts

- TASK-447 (preview card): puede agregar subcount "N insights mencionan esta entidad"
- TASK-436 (critical push): notifica al owner cuando su entidad aparece en critical insight
- TASK-439 (daily briefing): puede ordenar brief por entity salience

### Files owned

- `migrations/<timestamp>_nexa-insight-mentions.sql` — nuevo
- `src/lib/nexa/mentions/reverse-index.ts` — nuevo (writer)
- `src/lib/nexa/insights/query-by-entity.ts` — nuevo (reader)
- `src/app/api/nexa/insights/route.ts` — modificar: aceptar `mentionedEntityId` filter
- `src/components/greenhouse/NexaInsightsBlock.tsx` — modificar: filter chip + empty state
- `src/views/greenhouse/spaces/Space360InsightsTab.tsx` — nuevo o modificar
- `src/views/greenhouse/people/PersonInsightsTab.tsx` — nuevo o modificar
- `scripts/backfill-nexa-insight-mentions.ts` — nuevo

## Current Repo State

### Already exists

- `ico_signal_enrichments` con narrativas marcadas
- Resolver (post TASK-441) que extrae `mentions[]` de cada enrichment
- Space 360 y Person 360 surfaces (TASK-242, TASK-243 cerradas) con `NexaInsightsBlock`

### Gap

- Narrativas tienen mentions como texto — no hay estructura consultable
- Filtro por entidad en el feed no existe
- Tabs 360 muestran insights del contexto directo, no insights donde la entidad aparece mencionada
- No hay métrica de entity salience

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tabla + migración

- `pnpm migrate:create nexa-insight-mentions`
- Schema:
  ```sql
  CREATE TABLE greenhouse_core.nexa_insight_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    insight_id TEXT NOT NULL,          -- FK lógico a ico_signal_enrichments o equivalente
    insight_source TEXT NOT NULL,      -- 'ico' | 'finance' | 'payroll' | ...
    insight_severity TEXT,
    insight_emitted_at TIMESTAMPTZ NOT NULL,
    mention_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field TEXT NOT NULL,               -- 'explanation' | 'root_cause' | 'recommended_action'
    position INT NOT NULL,             -- orden dentro del texto
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, insight_id, field, position)
  );
  CREATE INDEX nim_entity ON greenhouse_core.nexa_insight_mentions (mention_type, entity_id, insight_emitted_at DESC);
  CREATE INDEX nim_tenant_insight ON greenhouse_core.nexa_insight_mentions (tenant_id, insight_id);
  ```
- Owned por `greenhouse_ops`
- `pnpm db:generate-types`

### Slice 2 — Writer (integrado en enrichment pipeline)

- Hook en `llm-provider.ts` después del resolver: para cada mention resuelta, INSERT en `nexa_insight_mentions` en la misma transacción que el enrichment
- Idempotente: unique constraint + upsert ON CONFLICT
- Limpia index cuando un enrichment se marca como superseded/reprocessed

### Slice 3 — Reader API

- `GET /api/nexa/insights?mentionedEntityId=member:EO-MBR-a1b2c3d4&since=2026-03-01`
- Resolución de `mentionedEntityId` → `nexa_insight_mentions` JOIN `ico_signal_enrichments` (+ finance / payroll fuentes)
- Ordenación: `insight_severity DESC, insight_emitted_at DESC`
- Paginación standard

### Slice 4 — Filter chip en `NexaInsightsBlock`

- Props extendidas: `filterEntity?: { type, id, name }`
- Chip visible "Filtrando: @Sky Airlines × " con botón clear
- Header del block actualiza copy a "Nexa menciona: Sky Airlines"
- Empty state específico: "Nexa no ha mencionado esta entidad en los últimos N días"

### Slice 5 — Tabs 360

- Space 360: nueva tab "Nexa menciona" con `<NexaInsightsBlock filterEntity={{type:'space', id, name}} />`
- Person 360: ídem para `member:...`
- Counter badge en el tab: `3 recientes`

### Slice 6 — Backfill histórico

- `scripts/backfill-nexa-insight-mentions.ts`:
  - Lee todos los enrichments existentes
  - Corre el resolver sobre cada uno
  - Inserta mentions en el index
  - Idempotente + logged en `source_sync_runs`

### Slice 7 — Entity salience (opcional MVP)

- Función `getEntitySalience(type, id, rangeDays)` → count + last mention + severity mix
- Exponer en preview card (TASK-447 follow-up) y/o Admin Ops Health

## Out of Scope

- Notificaciones proactivas al owner — TASK-436 / TASK-439 lo consumen una vez index live
- Tab "Nexa menciona" en Client Portal externo — respetar privacy first
- Cross-tenant mentions

## Detailed Spec

### Ejemplo de query

```sql
SELECT e.id, e.insight_source, e.severity, e.explanation_summary, e.recommended_action, e.emitted_at
FROM greenhouse_core.nexa_insight_mentions m
JOIN ico_signal_enrichments e ON e.id = m.insight_id
WHERE m.tenant_id = $1
  AND m.mention_type = 'member'
  AND m.entity_id = $2
  AND m.insight_emitted_at >= $3
ORDER BY m.insight_emitted_at DESC
LIMIT 50;
```

### Flujo writer

1. `resolveNexaMentions()` devuelve `mentions[]` validadas
2. Antes del commit del enrichment: `insertMentionIndex(enrichmentId, mentions, field)`
3. Transaction commit
4. En caso de reprocessamiento: `DELETE FROM nexa_insight_mentions WHERE insight_id = $1` + re-insert

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Tabla `nexa_insight_mentions` creada + backfilled
- [ ] Writer integrado en pipeline (consistencia transaccional)
- [ ] Endpoint filter por entidad funcional
- [ ] Filter chip en `NexaInsightsBlock`
- [ ] Tabs "Nexa menciona" en Space 360 y Person 360
- [ ] Backfill script ejecutado en staging + validado
- [ ] Reprocessamiento no duplica entries
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` sin errores

## Verification

- `pnpm migrate:up`
- `pnpm test -- nexa/mentions/reverse-index`
- Manual: ejecutar backfill → verificar conteo
- Manual: filter por @SkyAirlines → verificar feed
- Manual: tab Nexa menciona en Space 360 → coincide con filter
- SQL: query salience (`SELECT mention_type, entity_id, COUNT(*) FROM nexa_insight_mentions GROUP BY 1,2 ORDER BY 3 DESC LIMIT 20`)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-441, TASK-442, TASK-447, TASK-436, TASK-439, TASK-242, TASK-243

## Follow-ups

- Notify owner cuando su entidad aparece en critical insight (hook con TASK-436)
- Salience dashboard en Admin Center
- Permalink a insight con highlight de mención específica (hook con TASK-449)

## Open Questions

- ¿Tabla unificada para insights de todas las fuentes o una por dominio? Propuesta: unificada con `insight_source` discriminator.
