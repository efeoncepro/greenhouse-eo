# TASK-634 — Reliability Sentry Incident → Module Correlator

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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

- [ ] `correlateIncident()` mapea correctamente ≥80% de incidentes reales abiertos en Sentry hoy.
- [ ] incidentes sin match caen a `cloud` con tag `uncorrelated`.
- [ ] `buildSentryIncidentSignals()` usa el correlador.
- [ ] Admin Center muestra incidentes en el módulo correcto, no todos colapsados a `cloud`.
- [ ] tests pasan con casos sintéticos que cubren cada módulo + huérfano.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/reliability/incident-mapping.test.ts`
- inspección manual: `GET /api/admin/reliability` y verificar que `module.signals` por dominio refleja incidentes correctos.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] chequeo cruzado: TASK-633 (filesOwned), TASK-635 (registry persistence)
- [ ] documentar en `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` §6 cómo se atribuyen incidentes ahora.

## Follow-ups

- LLM-assisted enrichment para ampliar coverage si reglas no alcanzan.
- Routing per-módulo a Slack (si finance-incident, ping a #finance-eng).
- Histórico de correlaciones por incidente para entrenar mejor las reglas.

## Open Questions

- Reglas en código vs DB junto con TASK-635 (registry persistence).
- LLM provider preferido cuando se active Slice 4: Vertex AI Gemini vs Anthropic.
