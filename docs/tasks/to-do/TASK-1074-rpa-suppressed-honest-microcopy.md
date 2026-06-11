# TASK-1074 — RpA suppressed/unavailable: microcopy honesto (no leer "—" como roto)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ico|delivery|ui|content`
- Blocked by: `none`
- Branch: `task/TASK-1074-rpa-suppressed-honest-microcopy`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La card de RpA en `/my/performance` (y demás superficies ICO) muestra un "—" pelado cuando el valor es null, indistinguible de un error de sistema. Pero el null tiene **4 causas semánticamente distintas** que la política `classifyRpaMetric` ya clasifica (`rpa-policy.ts`): sin piezas cerradas, todas con 0 rondas de corrección (¡lo mejor!), sin RpA registrado, o mixto. Esta task hace que la UI **honre la `suppressionReason`** con microcopy + tooltip honesto — distinguiendo "calidad perfecta (0 correcciones)" de "falta dato" de "error". **UI-only, bonus-neutral, additive**: NUNCA cambia el valor numérico ni la elegibilidad del RpA.

## Why This Task Exists

Caso fuente verificado contra BigQuery real (2026-06-10): Daniela Ferreira (Sky) mostró RpA "—" en Junio 2026 porque sus 28 tareas cerradas del mes tienen `rpa_value = 0` / semáforo `"✅ 0"` (aprobadas a la primera, **cero rondas de corrección** — el mejor resultado posible). La política `classifyRpaMetric` lo clasifica correctamente como `dataStatus='suppressed'` + `suppressionReason='non_positive_rpa_values_only'`, pero la card lo renderiza como "—" idéntico a un fallo. El operador no puede distinguir "excelente, sin correcciones" de "roto".

El render actual ([MyPerformanceView.tsx:357-375](src/views/greenhouse/my/MyPerformanceView.tsx#L357-L375)) hace `const stats = showPending ? COPY.noClosures : (kpi.format(value) ?? '—')` — solo usa `m.value` y `m.zone`, **ignora** `m.dataStatus` y `m.suppressionReason` que el metric SÍ carga desde [read-metrics.ts](src/lib/ico-engine/read-metrics.ts). La info honesta existe; la UI la tira.

Esto es **degradación honesta a medias**: el backend degrada honesto (suprime + da razón), pero la UI colapsa las razones en un "—" ambiguo. Es el patrón anti `state-design` "$0 silencioso / null ambiguo".

NO es el fix del defecto semántico de fondo de la fórmula legacy de RpA (excluir tareas de 0-correcciones del promedio) — eso es la migración RpA V2 (TASK-901/908/912/916) y toca el bono (requiere stop-gates + HR). Esta task es solo la **honestidad de presentación**, sin tocar el cálculo ni el bono.

## Goal

- La card de RpA distingue visualmente/textualmente las 4 razones de supresión + `low_confidence`, en vez de un "—" único.
- "Todas las piezas sin rondas de corrección" (`non_positive_rpa_values_only`) se lee como **neutral/positivo** ("Sin rondas de corrección"), NUNCA como error.
- "Sin RpA registrado" (`missing_rpa_values_only` / mixto) se lee como **gap de dato** (atención), con tooltip que explica.
- El mapping `suppressionReason → microcopy/tooltip` es un **helper compartido** reusable por las otras superficies que renderizan RpA (Agency, Space, Person 360).
- Cero cambio en el valor numérico, la elegibilidad, ni el bono.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- Skill `state-design` (overlay Greenhouse) — degradación honesta: distinguir "good-no-data" de "data-gap" de "error"; nunca null ambiguo.
- Skill `greenhouse-ux-writing` — copy es-CL tuteo, sentence case; toda string nueva pasa por `src/lib/copy/*` (regla TASK-265, lint `greenhouse/no-untokenized-copy`).
- Skill `dataviz-design` — KPI card anatomy: null fallback honesto, no "—" que se lee como roto.
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — RpA es métrica owned por Greenhouse; esta task NO toca su cálculo.

Reglas obligatorias:

- **NUNCA** cambiar el valor numérico, `dataStatus`, `suppressionReason` ni la elegibilidad del RpA — es UI-only. El bono lee el valor materializado, intacto.
- **NUNCA** inventar un número cuando RpA es null (no mostrar 0 ni 1 falso). Mostrar microcopy honesto.
- **NUNCA** mostrar la razón `non_positive_rpa_values_only` con color/tono de error — es el caso de **mejor calidad** (0 correcciones).
- Toda string nueva en `src/lib/copy/my-performance.ts` (`GH_MY_PERFORMANCE`) — validada con `greenhouse-ux-writing` antes de cerrar.
- El mapping `suppressionReason → copy` vive en UN helper canónico, no inline en cada surface.

## Normative Docs

- `src/lib/ico-engine/rpa-policy.ts` — `RpaSuppressionReason` enum (4 valores) + `RpaDataStatus` (`valid|low_confidence|suppressed|unavailable`). SSOT de las razones.
- `src/lib/ico-engine/read-metrics.ts` — `metricValueFromRow` ya devuelve `dataStatus` + `suppressionReason` + `evidence` en el `MetricValue`.

## Dependencies & Impact

### Depends on

- `classifyRpaMetric` / `RpaSuppressionReason` en [src/lib/ico-engine/rpa-policy.ts](src/lib/ico-engine/rpa-policy.ts) (ya existe, no se modifica).
- El `MetricValue` que llega a la view ya carga `dataStatus`/`suppressionReason` (verificar que `findMetric` los preserve — `[verificar]`).

### Blocks / Impacts

- Superficies que renderizan la card de RpA: `/my/performance` (V1 de esta task), Agency ICO, Space 360, Person 360 — pueden adoptar el helper compartido (mismo o follow-up slice).
- NO impacta payroll/bono (UI-only).

### Files owned

- `src/lib/copy/my-performance.ts` (microcopy nueva)
- `src/lib/ico-engine/rpa-presentation.ts` [nuevo, verificar nombre] — helper `suppressionReason → { label, tooltip, tone }`
- `src/views/greenhouse/my/MyPerformanceView.tsx` (consumir helper en la card)
- Tests focales asociados

## Current Repo State

### Already exists

- `classifyRpaMetric` clasifica null en 4 razones + `low_confidence` con value ([rpa-policy.ts](src/lib/ico-engine/rpa-policy.ts)).
- `MetricValue` carga `dataStatus`/`suppressionReason`/`evidence` ([read-metrics.ts](src/lib/ico-engine/read-metrics.ts)).
- Card render en [MyPerformanceView.tsx:357-375](src/views/greenhouse/my/MyPerformanceView.tsx#L357-L375) con `HorizontalWithSubtitle` + Tooltip ya importado.
- Copy module `GH_MY_PERFORMANCE` en `src/lib/copy/my-performance.ts`.

### Gap

- La card ignora `dataStatus`/`suppressionReason` → "—" único para las 4 razones.
- No hay helper que mapee `suppressionReason → microcopy/tooltip/tone`.
- `[verificar]` que `findMetric(metrics, 'rpa')` preserva `dataStatus`/`suppressionReason` hasta la view (no solo `value`/`zone`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Helper canónico `suppressionReason → presentación`

- Crear helper puro (`src/lib/ico-engine/rpa-presentation.ts` `[verificar nombre]`) `resolveRpaPresentation({ dataStatus, suppressionReason, evidence })` → `{ statLabel, tooltip, tone: 'neutral'|'positive'|'attention' }`. Pure, testeable.
- Mapping canónico (draft — validar copy con `greenhouse-ux-writing`):
  - `unavailable` / `no_completed_tasks` → stat "—", tooltip "Aún sin piezas cerradas este período", tone neutral.
  - `suppressed` / `non_positive_rpa_values_only` → stat "Sin correcciones" (o "0 rondas"), tooltip "Todas las piezas cerradas se aprobaron sin rondas de corrección", tone **positive** (no error).
  - `suppressed` / `missing_rpa_values_only` → stat "Sin registrar", tooltip "Las piezas cerradas no tienen RpA registrado en Notion", tone **attention**.
  - `suppressed` / `mixed_missing_and_non_positive_rpa_values` → stat "Parcial", tooltip "Algunas piezas sin RpA registrado; el resto sin rondas de corrección", tone attention.
  - `low_confidence` → mostrar el valor + tooltip "Confianza baja: pocas piezas con rondas de corrección este período", tone neutral.
  - `valid` → comportamiento actual (valor + zona).
- Microcopy a `GH_MY_PERFORMANCE` (o namespace ICO compartido si aplica a >3 surfaces).

### Slice 2 — Consumir el helper en la card de `/my/performance`

- En `KPI_CONFIG`/render de la card RpA, pasar `dataStatus`/`suppressionReason` al `resolveRpaPresentation` y usar `statLabel` + `tooltip` + `tone` (color del avatar/stat según tone, no rojo para positive).
- `[verificar]` que `findMetric` preserva los campos; si no, propagarlos.
- Mantener el path `pendingClosures`/`noClosures` existente para los otros KPIs (no romper).

### Slice 3 — (opcional) Adopción cross-surface + tests

- Tests focales del helper (las 4 razones + low_confidence + valid).
- Si bajo costo, adoptar el helper en la card RpA de Agency/Space/Person 360 (mismo treatment honesto). Si no, dejar follow-up declarado.

## Out of Scope

- **NO** cambiar la fórmula legacy de RpA ni `classifyRpaMetric` (la elegibilidad/supresión se queda; esto es solo presentación).
- **NO** tocar el bono ni el valor materializado `rpa_avg`.
- **NO** acelerar ni habilitar RpA V2 (TASK-901/908/912/916) — el fix de fondo es esa migración, gated por stop-gates.
- **NO** aplicar el mismo treatment a otras métricas (OTD/FTR/etc.) en esta task — RpA es el caso con supresión semántica; las demás no suprimen igual.

## Detailed Spec

El backend ya degrada honesto (`classifyRpaMetric` da `dataStatus` + `suppressionReason`); el gap es que la UI los colapsa en "—". El fix es un adapter de presentación que traduce la razón a copy honesto + tono, **sin tocar el cálculo**. SSOT de las razones = `rpa-policy.ts`; el helper de presentación es el único lugar que mapea razón → copy (no inline por surface).

Distinción de tono crítica (state-design): `non_positive_rpa_values_only` (0 correcciones = mejor calidad) → **positive/neutral**, jamás error. `missing_*` (gap real de dato) → attention. Color-only prohibido: siempre label + tooltip (a11y, WCAG).

## Rollout Plan & Risk Matrix

N/A operationally safe — additive UI-only. No toca runtime de payroll/finance/identity, no migración, no flag. El valor numérico y el bono quedan bit-for-bit; solo cambia cómo se rotula un `value=null` que ya existía. Rollback = revert PR + redeploy.

### Slice ordering hard rule

- Slice 1 (helper + copy) → Slice 2 (consumir en card). Slice 3 (tests/adopción) tras Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Copy en segunda lectura confunde "sin correcciones" con "sin datos" | UI/contenido | low | validar con `greenhouse-ux-writing` + tooltip explícito + tono positive | revisión humana / GVC |
| `findMetric` no propaga `suppressionReason` → helper recibe undefined | UI | low | `[verificar]` en discovery; fallback a "—" neutral si falta | test focal |
| Tono positive mal mapeado pinta verde un gap real | UI | low | tabla de mapping explícita + test por razón | test focal |

### Feature flags / cutover

Sin flag — additive, immediate cutover. El cambio nunca altera un número; solo enriquece el rótulo de un null preexistente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (helper + copy additive) | <10 min | sí |
| Slice 2 | revert PR (card vuelve a "—") | <10 min | sí |
| Slice 3 | revert PR | <10 min | sí |

### Production verification sequence

1. Local: tests del helper verdes (4 razones + low_confidence + valid).
2. GVC `/my/performance` con `agent-collaborator@…` en período con RpA suprimido (o Daniela en Junio) → leer frame: "Sin correcciones" tono positivo, no "—" rojo.
3. Verificar período con RpA válido (ej. Mayo) sigue mostrando el valor numérico sin cambio.

### Out-of-band coordination required

Ninguna. Cambio UI puro.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe helper puro `resolveRpaPresentation` que mapea `dataStatus`/`suppressionReason` → `{ statLabel, tooltip, tone }`, con test por cada razón + low_confidence + valid.
- [ ] La card RpA de `/my/performance` muestra microcopy honesto distinto por razón (no "—" único) consumiendo el helper.
- [ ] `non_positive_rpa_values_only` se renderiza en tono neutral/positivo con tooltip que aclara "0 rondas de corrección" — nunca color de error.
- [ ] `missing_rpa_values_only` / mixto se renderiza en tono attention con tooltip que aclara el gap de dato.
- [ ] El valor numérico de RpA cuando `valid` no cambia (Mayo de Daniela sigue 1.0); el bono no se toca.
- [ ] Toda string nueva vive en `GH_MY_PERFORMANCE` (o namespace compartido) y pasó por `greenhouse-ux-writing`.
- [ ] GVC capturado + leído confirmando la distinción honesta.

## Verification

```bash
pnpm local:check
pnpm test src/lib/ico-engine src/lib/copy
pnpm fe:capture --route=/my/performance --env=staging --hold=3000
```

- Smoke con `agent-collaborator@greenhouse.efeonce.org` o verificación visual del caso Daniela (Junio = suprimido por 0-correcciones; Mayo = valor 1.0).

## Closing Protocol

- Mover `Lifecycle` → `complete` + archivo a `complete/` + sincronizar `docs/tasks/README.md`.
- `greenhouse-documentation-governor`: doc funcional de métricas ICO si aplica + changelog + Handoff.
- `pnpm test` (full) + `pnpm build` antes del cierre.

## Follow-ups

- El fix de fondo del defecto semántico (RpA legacy excluye tareas de 0-correcciones del promedio) = migración RpA V2 (TASK-901/908/912/916), gated por stop-gates + HR. Esta task solo cubre la honestidad de presentación.
- Adoptar el helper de presentación en Agency/Space/Person 360 si no se hizo en Slice 3.
