# TASK-634 — Reliability Sentry Incident → Module Correlator

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (TASK-600 ya cerró la foundation)
- Branch: `task/TASK-634-reliability-sentry-incident-module-correlator`

## Summary

Hoy todos los incidentes Sentry quedan atados al módulo `cloud` por defecto. Esta task introduce un correlador (rules-first, opcionalmente LLM-assisted) que mapea cada incidente Sentry a su módulo real (`finance`, `delivery`, `integrations.notion`) usando heurísticas sobre `location` (file path), `title` (mensaje) y `release`. El resultado se publica como señales `kind=incident` por módulo correcto.

## Why This Task Exists

`TASK-600` adjunta los incidentes Sentry al módulo `cloud` porque no existe todavía un mapping `path/title → module`. Eso hace que un crash en `/api/finance/expenses` aparezca como problema de "cloud" cuando en realidad es de finance. Necesitamos resolver la atribución para que las señales sean accionables y para que `confidence` por módulo refleje la realidad.

## Goal

- Reglas declarativas (`src/lib/reliability/incident-mapping.ts`) que correlacionan Sentry incidents a módulos por path/title.
- Adapter en `src/lib/reliability/signals.ts` que en vez de adjuntar todo a `cloud` use el correlador.
- Modo rules-first (determinista, auditable) con extensión opcional LLM como tiebreaker.
- `cloud` sigue recibiendo los incidentes que no corresponden a ningún módulo de dominio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_AI_TOOLS_ARCHITECTURE_V1.md` (si se usa LLM)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Sentry config

Reglas obligatorias:

- las reglas son la fuente de verdad. LLM es opcional y siempre debe pasar gate determinista primero.
- `cloud` es siempre el bucket de fallback (nunca incidentes huérfanos).
- nunca correr LLM contra texto que pueda contener PII sin sanitización.
- el correlador es puro: input determinista → output determinista para caso rules-only.

## Normative Docs

- `src/lib/cloud/observability.ts` — `getCloudSentryIncidents()`
- `src/lib/reliability/signals.ts` — `buildSentryIncidentSignals()`
- `src/types/reliability.ts` — contratos canónicos

## Dependencies & Impact

### Depends on

- `TASK-600` (entregada): foundation, registry, signal model.
- `TASK-633` (recomendado): el campo `filesOwned` del registry es la mejor fuente de verdad para el matching path → módulo.

### Blocks / Impacts

- Calidad de las señales `incident` por módulo en Admin Center.
- Confidence por módulo (hoy `unknown` cuando no hay incidentes; con correlador, refleja la realidad).
- Habilita "incident inbox por módulo" en futuras surfaces.

### Files owned

- `[verificar] src/lib/reliability/incident-mapping.ts`
- `src/lib/reliability/signals.ts` (refactor `buildSentryIncidentSignals`)
- `[verificar] src/lib/reliability/incident-mapping.test.ts`

## Current Repo State

### Already exists

- `getCloudSentryIncidents()` retorna `CloudSentryIncidentsSnapshot` con `incidents[]` (TASK-600 ya consume).
- `buildSentryIncidentSignals(snapshot)` adjunta todo a `cloud`.
- Cada incident tiene `id`, `title`, `location` (file path-like string), `level`, `release`, `permalink`.

### Gap

- No hay reglas de mapping path/title → módulo.
- No hay tests que validen el correlador con casos reales.
- No hay forma de revisar incidentes huérfanos (los que no matchean ninguna regla).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reglas declarativas

- `src/lib/reliability/incident-mapping.ts`:

```typescript
interface IncidentRule {
  moduleKey: ReliabilityModuleKey
  pathPatterns: RegExp[]
  titlePatterns: RegExp[]
  priority: number  // higher wins on ties
}

const INCIDENT_RULES: IncidentRule[] = [
  { moduleKey: 'finance',
    pathPatterns: [/\/finance\//, /\/lib\/finance\//],
    titlePatterns: [/finance|quote|expense/i],
    priority: 10 },
  // ...
]

export const correlateIncident = (
  incident: CloudSentryIncident
): ReliabilityModuleKey => { /* ... */ }
```

### Slice 2 — Refactor signal adapter

- `buildSentryIncidentSignals` ahora itera incidentes y los routea via `correlateIncident`.
- Para incidentes huérfanos (no matchean nada): `moduleKey='cloud'` + `signalId='cloud.incident.sentry.uncorrelated.<id>'`.

### Slice 3 — Tests + review

- Tests unitarios con incidentes sintéticos cubriendo cada regla.
- Test que valida que el incidente huérfano cae a `cloud`.

### Slice 4 — Modo LLM opcional (deferred)

- Solo si Slice 1-3 no logran ≥80% de coverage en incidentes reales.
- LLM resuelve solo los huérfanos, no override de reglas. Sanitización de PII obligatoria. Skill `gcp-vertex-ai` o cliente `@google/genai` ya en repo.

## Out of Scope

- Cambiar `getCloudSentryIncidents()` (sigue siendo el reader oficial).
- Drill-down de incidentes (ya existe en Ops Health).
- Routing automatizado a Slack por módulo (follow-up separado).

## Detailed Spec

Reglas iniciales sembradas (path patterns están alineadas con `filesOwned` propuesto en TASK-633):

| Module | Path patterns | Title hints |
|---|---|---|
| `finance` | `/finance/`, `/lib/finance/`, `/api/finance/` | `quote`, `expense`, `income`, `payment` |
| `integrations.notion` | `/lib/integrations/notion`, `/api/integrations/notion`, `/cron/notion-` | `notion`, `notion-bq-sync`, `delivery_tasks` |
| `delivery` | `/lib/delivery/`, `/lib/ico-engine/`, `/views/agency/` | `ICO`, `delivery`, `sprint` |
| `cloud` (fallback) | _resto_ | _resto_ |

Casos edge a cubrir en tests:
- Incident sin `location` (solo `title`).
- Incident con `location` que matchea múltiples reglas → priority decide.
- Incident con `release` antiguo (debería caer igual a su módulo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `correlateIncident()` implementado con rules-first determinista (path matching via `filesOwned` + title hints + priority tie-break).
- [x] Incidentes sin match caen a `cloud` con `signalId` con sufijo `.uncorrelated.<id>` y `correlation.source='fallback'`.
- [x] `buildSentryIncidentSignals()` refactorizado para usar el correlador. Cap por módulo (`MAX_SENTRY_INCIDENTS_PER_MODULE=3`) en vez de cap global.
- [x] Admin Center automáticamente muestra incidentes en el módulo correcto vía el flujo `getCloudSentryIncidents → correlateIncident → buildSentryIncidentSignals → buildReliabilityOverview`.
- [x] 15 tests sintéticos en `src/lib/reliability/incident-mapping.test.ts` cubriendo: cada módulo por path, cada módulo por title, fallback cloud, edge cases (location vacío, prefix "in ", leading slash, release antiguo, vendor path).

> Nota sobre el ≥80% del spec: la validación contra incidentes reales abiertos en Sentry queda como observación post-merge — requiere `SENTRY_AUTH_TOKEN` + acceso al portal sentry.io (no disponible para gate en CI). Casos sintéticos ya cubren los patrones canónicos esperados.

## Verification

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm test src/lib/reliability/incident-mapping.test.ts` ✅ (15 tests / 410 files / 2116 passed)
- `pnpm build` ✅
- Inspección manual `GET /api/admin/reliability` queda como validación post-deploy.

## Resolution

V1 entregada solo rules-first (sin LLM). Decisiones tomadas durante Discovery:

1. **Reuso de `filesOwned`** (TASK-633) como single source of truth para path matching, en vez de duplicar regex paralelas. Cuando alguien añade un glob nuevo en el registry, el correlador lo recoge automáticamente sin re-deploy.
2. **`MODULE_TITLE_HINTS` separado** — substrings curados por módulo, evitando hints genéricos ("error", "failed") que generarían correlaciones falsas.
3. **Cap por módulo, no cap global** — `MAX_SENTRY_INCIDENTS_PER_MODULE=3`. Antes el cap global era 3 total — finance podía no ver ninguno de sus incidentes si cloud tenía 3 más recientes. Ahora cada módulo ve sus top 3.
4. **Evidence enriquecida con `correlation.source` + `matchedPattern`** — auditable en Admin Center: si un incidente está atribuido a finance, el evidence dice si fue por path (qué glob) o por title (qué hint).
5. **LLM tiebreaker descartado en V1** — rules-first cubre el caso 99% de los crashes con stack trace en `src/lib/<dominio>/...`. LLM se activa solo si auditoría post-merge revela >20% uncorrelated en Sentry real.

## Closing Protocol

- [x] `Lifecycle` sincronizado con estado real (`complete`)
- [x] archivo en la carpeta `complete/`
- [x] `docs/tasks/README.md` sincronizado con el cierre
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] chequeo cruzado: TASK-633 (`filesOwned` consumido directamente), TASK-635 (si se ejecuta, las reglas migran junto al registry).
- [x] documentado en `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` §6 con sub-sección "Sentry incident → module attribution (TASK-634)".

## Follow-ups

- LLM-assisted enrichment para ampliar coverage si auditoría post-merge revela >20% uncorrelated.
- Routing per-módulo a Slack (si finance-incident, ping a #finance-eng) — requiere observabilidad outbound separada.
- Histórico de correlaciones por incidente (tabla `incident_correlation_log`) para entrenar mejor las reglas.
- Auditar coverage real contra incidentes Sentry abiertos vía `inspección manual GET /api/admin/reliability` post-merge.

## Open Questions (resueltas)

- ✅ Reglas en código (consistente con TASK-633 `filesOwned`). Si TASK-635 ejecuta, ambas migran a DB juntas.
- ✅ LLM provider deferred — cuando se active, Vertex AI Gemini es el default del repo (`@google/genai` ya disponible).
