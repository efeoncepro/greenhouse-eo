# Greenhouse runtime — Property allowlist canonical

> **Purpose**: declarar qué properties Notion son INPUTS de compute Greenhouse vs cuáles son outputs read-only
> **Last verified**: 2026-05-17

## ⚠️ Update canonical 2026-05-17 — Status property unificada cross-tenant

Post ADR `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md`: la property de status canonical se llama **`Estado`** en TODOS los teamspaces Greenhouse-managed (Efeonce, Sky, Demo, futuros).

Sky tenía `Estado 1` (typo histórico) — se renombra a `Estado` como parte del cleanup Notion.

Los 11 estados canonical universales:
`Sin empezar` · `Brief listo` · `En curso` · `Listo para revisión` · `Cambios solicitados` · `Aprobado` · `Pendiente aprobación interna` · `En pausa` · `Bloqueado` · `Cancelado` · `Archivado`

Evento canonical de corrección RpA: transición `Listo para revisión → Cambios solicitados` (universal cross-tenant).

`INPUT_PROPS_ALLOWLIST` updated: la entrada `'Estado 1'` se ELIMINA post-cleanup Notion Sky. Queda solo `'Estado'` para status.

## 1. Categorías canonical de properties

Cada property Notion en data sources Greenhouse-managed pertenece a una de:

| Categoría | Quién escribe | Quién lee compute |
|---|---|---|
| **INPUT** (operador-editable) | Operador en Notion UI | Greenhouse ICO Engine consume |
| **OUTPUT `[GH]` canonical** | **Greenhouse only** (read-only para operador) | Operador ve, consumers downstream consumen |
| **LEGACY formula** (deprecated post-flip) | Notion engine computa | Mantenido durante shadow mode + 90 días post-flip |
| **NEUTRAL** (operativo, no parte de compute) | Operador | Display only |

## 2. INPUT properties canonical — `INPUT_PROPS_ALLOWLIST`

Usado por:
- Webhook handler para filtrar eventos relevantes (`patterns-canonical/echo-loop-filter.md` capa 3)
- Reactive consumer para determinar qué recompute disparar
- Discovery / shadow mode paridad

```typescript
// src/lib/notion-metrics/config.ts (TBD canonical TASK-901 S0)
export const INPUT_PROPS_ALLOWLIST = [
  // Status canonical → drives RpA + OTD + transition tracking
  'Status',                    // Efeonce
  'Estado',                    // Sky (mismo concepto, alias localizado)

  // Date inputs
  'completed_at',              // OTD denominator
  'due_date',                  // OTD numerator
  'Fecha de completado',       // Sky alias
  'Fecha límite',              // Sky alias

  // RpA-specific legacy (durante shadow mode)
  'Correcciones',              // legacy rollup count (DEPRECATED post TASK-901 flip + 90d)
  'Client Change Round',       // Frame.io future signal (V2)
  'Workflow Change Round',     // Frame.io future signal (V2)
  'Review Source',             // Frame.io future signal (V2)

  // Assignment (drives member-level metrics)
  'Assignee',                  // Efeonce
  'Responsable',               // Sky alias
  'primary_owner',             // optional explicit override
] as const

export type InputPropertyName = typeof INPUT_PROPS_ALLOWLIST[number]
```

⚠️ **Verificar nombres reales en Discovery (TASK-901 Slice 1)** — los nombres aliases entre tenants pueden variar. Esta lista refleja shape esperado al 2026-05-17.

## 3. OUTPUT properties canonical — `[GH] <metric>` read-only

Greenhouse escribe estos via writeback canonical (TASK-901+). Operador NO debería editarlos (configurar permissions Notion).

```typescript
export const GH_OUTPUT_PROPERTIES = {
  // TASK-901 V1.0
  rpa: '[GH] RpA',                          // number — banded inverse proration input bonus

  // TASK-902 V1.0 (futuro)
  otd: '[GH] OTD%',                         // percent — graduated linear proration input bonus

  // TASK-903 V1.0 (futuro)
  ftr: '[GH] FTR',                          // select 'pass'|'fail'|'not_applicable' — derived from RpA

  // TASK-904+ V1.0 (futuros)
  cumplimiento: '[GH] Cumplimiento',        // alias narrativo OTD
  cycle_time: '[GH] Cycle Time (días)',     // number
  ct_slo: '[GH] CT SLO%',                   // percent

  // Display metadata
  rpa_formula_version: '[GH] RpA — formula version',    // optional debug
  last_writeback_at: '[GH] Last writeback'              // optional debug
} as const
```

## 4. Convention `[GH]` prefix

### Por qué `[GH]`
- Visual marker para operador (no confundir con properties operativas)
- Pattern matching simple para audits (`grep '\[GH\]'` en schema)
- Future-proof: cualquier propiedad nueva managed by Greenhouse usa el prefix

### Permissions canonical
- En Notion data source schema: configure que solo el integration `Greenhouse Metrics Integration` tenga write permission a properties con prefix `[GH]`
- Operadores: read-only (UI Notion oculta opción de edit)
- ⚠️ **Notion API limitation**: property-level permissions no son granular nativamente al 2026-05-17. Workaround: documentar en governance doc + relyon trust + audit log Notion para detectar overrides manuales

## 5. LEGACY formula properties — deprecation timeline

Per ADR migration strategy + TASK-901 design:

| Property | Status post-flip | Cuándo borrar |
|---|---|---|
| `RpA` (formula original) | Deprecated post writeback flip | **90+ días después** de TASK-901 S6 verde |
| `Correcciones` (rollup) | Sigue siendo INPUT durante shadow mode | Cuando Frame.io integration ship → reemplazada por transitions canonical |
| Otras formulas (OTD%, FTR, etc.) | TBD per cada TASK 902/903/904 |  |

**Hard rule canonical**: NUNCA borrar formula legacy hasta 90+ días post-flip stable + 0 reliability signal alertas + HR/Finance sign-off escrito.

## 6. Lint protection canonical

```typescript
// eslint-plugins/greenhouse/rules/no-inline-input-props-allowlist.mjs (TBD)
// Detecta: definición de property name lists fuera del canonical
// Override block exime: src/lib/notion-metrics/config.ts, tests
```

## 7. Hard rules canonical

- **NUNCA** definir lista de properties allowlist fuera de `src/lib/notion-metrics/config.ts` canonical
- **NUNCA** escribir property sin prefix `[GH]` desde Greenhouse — todo writeback usa el prefix
- **NUNCA** dejar operador editar property `[GH] *` (configurar permissions)
- **SIEMPRE** que emerja métrica nueva con writeback → agregar a `GH_OUTPUT_PROPERTIES`
- **SIEMPRE** que emerja INPUT nuevo → agregar a `INPUT_PROPS_ALLOWLIST`
- **NUNCA** borrar legacy formula pre-90d post-flip stable

## 8. Discovery checklist (TASK-901 Slice 1)

Antes de comprometer la lista canonical, ejecutar Discovery:

```bash
# Via Notion MCP
mcp__claude_ai_Notion__notion-fetch(url='<Efeonce Tasks DS URL>')
# → inspect properties list completa
# → identificar aliases Sky vs Efeonce
# → confirmar nombres exactos (case-sensitive, spaces, accents)

mcp__claude_ai_Notion__notion-fetch(url='<Sky Tasks DS URL>')
# → mismo
```

Output: actualizar este archivo §2 + §3 con nombres exactos verified.

## 9. Cross-refs

- `api-reference/data-model.md` — property types disponibles
- `patterns-canonical/echo-loop-filter.md` — INPUT_PROPS_ALLOWLIST usage capa 3
- `use-cases-greenhouse/writeback-gh-metrics.md` — `[GH] <metric>` writeback flow
- TASK-901 (Greenhouse) — Slice 1 Discovery + Slice 3 setup en Notion
- CLAUDE.md § "Delivery Metrics Ownership Boundary invariants"
