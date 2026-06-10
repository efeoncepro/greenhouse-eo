# TASK-1068 — ICO Materializer Cold-Start Hardening (incremental delta anti-join)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `delivery|data|platform`
- Blocked by: `none`
- Branch: `task/TASK-1068-ico-materializer-cold-start-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El materializador ICO (TASK-900) usa un filtro incremental (MERGE delta) que solo recalcula buckets cuyo `entity_last_edited >= cutoff`. Un cliente recién onboardeado cuyas tareas dejaron de editarse en Notion justo cuando entró al pipeline **nunca cruza ese umbral** → cae en un punto ciego permanente y nunca entra a `metrics_by_organization` / `metrics_by_project`. Caso fuente verificado live: **Grupo Berel** (84 tareas en BQ con `client_id` válido, snapshot junio presente, pero `entity_last_edited = 2026-06-05` < cutoff `2026-06-08` → 0 filas materializadas → OTD/Throughput/Cycle "Sin datos" en el portal). El fix vive en el **delta del MERGE** (anti-join contra la tabla destino para incluir buckets nunca materializados), NO en el onboarding.

## Why This Task Exists

TASK-900 reemplazó el `DELETE+INSERT` destructivo (BUG-CLASS-001) por `MERGE incremental + freshness gate`. La optimización del delta incremental asume *"si una entidad no se editó recientemente, ya fue materializada antes"*. Esa premisa **es falsa para una entidad nueva**: su contenido puede haber dejado de editarse antes de que entrara al snapshot, así que su `MAX(last_edited_time)` queda por debajo del cutoff de la primera corrida que la vería. Resultado: el cliente nuevo es invisible para el motor de métricas aunque toda su data esté en BigQuery. Es el **shadow/dual de BUG-CLASS-001**: el hardening que evitó destruir data buena introdujo un gap que **omite data nueva**. Hay que canonizarlo como **BUG-CLASS-005**.

Esto NO se arregla disparando una materialización desde el wizard de onboarding: (a) "materialización full" = `DELETE+INSERT` = reabre BUG-CLASS-001; (b) acopla el motor ICO al flujo de alta → frágil, no escala a cada path de alta nuevo (HubSpot adopt, reactivación, import). El fix correcto es de **correctitud del materializador**, una sola vez, y beneficia a todo cliente futuro automáticamente.

## Goal

- El MERGE incremental incluye buckets **nunca materializados** para el período (no solo los `entity_last_edited >= cutoff`), de modo que cualquier cliente nuevo entra solo en la próxima corrida nocturna sin tocar onboarding.
- Se preserva el MERGE (cero `DELETE+INSERT`, cero `WHEN NOT MATCHED BY SOURCE THEN DELETE`) → no regresión BUG-CLASS-001.
- Reliability signal canónico que detecta el síntoma upstream (cliente presente en snapshots pero ausente de `metrics_by_organization`), steady=0.
- BUG-CLASS-005 canonizado en `reference/bug-class-catalog.md` de la skill `greenhouse-ico`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` (TASK-900 — ADR padre; agregar Delta)
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` (PG + BQ dual-store)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (registry de signals)

Reglas obligatorias:

- **NUNCA** `DELETE+INSERT` ni "materialización full" como recovery de cold-start. El fix vive en el `USING` del MERGE.
- **NUNCA** agregar `WHEN NOT MATCHED BY SOURCE THEN DELETE` — la omisión es load-bearing (preserva históricos cuando upstream es parcial).
- Patrón canónico **VIEW/aggregation con drift risk → reliability signal** (TASK-571/766/774): el cold-start ships con su signal.
- `captureWithDomain(err, 'delivery', { tags: { source: 'ico_materializer_*' } })` — NUNCA `Sentry.captureException` directo.
- Cualquier cambio al materializador corre **full suite + shadow** porque toca `metrics_by_member` (path de bono). 5-pilar Safety obligatorio.

## Normative Docs

- `CLAUDE.md` → sección "ICO Materializer Hardening Pattern (TASK-900)" (las reglas del MERGE/delta/freshness gate).
- Skill `greenhouse-ico` → `reference/bug-class-catalog.md` (BUG-CLASS-001 es el padre).

## Dependencies & Impact

### Depends on

- TASK-900 (materializador MERGE incremental + tracking `greenhouse_sync.ico_materialization_runs`).
- BQ `ico_engine.delivery_task_monthly_snapshots` + `v_tasks_enriched` (fuente del materializador, ya incluye clientes nuevos).

### Blocks / Impacts

- **TASK-1069** (ICO participation stage) — independiente pero complementaria: 1068 hace que OTD/Throughput aparezcan; 1069 gobierna qué clientes están en el pipeline y en qué etapa. Pueden shipear en cualquier orden.
- Desbloquea visibilidad de OTD/Throughput/Cycle/org/project para **todo cliente nuevo** (Berel y siguientes).

### Files owned

- `src/lib/ico-engine/materialize-sql-builders.ts` (el builder del MERGE `USING`)
- `src/lib/ico-engine/materialize-orchestrator.ts` y/o `materialize.ts` (si el anti-join requiere pasar el set de keys ya materializadas)
- `src/lib/reliability/queries/ico-materializer-cold-start.ts` (signal nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up del signal)
- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` (Delta)
- `~/.claude/skills/greenhouse-ico/reference/bug-class-catalog.md` (BUG-CLASS-005)

### Current Repo State

#### Already exists

- MERGE incremental con `WHERE entity_last_edited >= TIMESTAMP(@deltaCutoff)` a nivel bucket (`buildMergeSql`, `materialize-sql-builders.ts`).
- `getLastSuccessfulMaterializationAt` (delta cutoff) en `materialize-tracking.ts`.
- Flags `ICO_MATERIALIZER_{MERGE_PATTERN,INCREMENTAL_DELTA}_ENABLED` (ON en staging/dev — verificado en run tracking 2026-06-09).
- Signal `delivery.ico_materializer.skipped_safety` (freshness gate) — distinto del cold-start.

#### Gap

- El filtro `entity_last_edited >= cutoff` no contempla "esta key nunca se materializó". Un bucket nuevo con contenido viejo queda permanentemente afuera.
- No hay signal que detecte "cliente en snapshots pero ausente de `metrics_by_organization`".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Anti-join en el delta del MERGE

- Extender el `USING` de `buildMergeSql` para incluir buckets donde
  `entity_last_edited >= @deltaCutoff` **OR** la key no existe aún en la tabla destino para `(period_year, period_month)`.
- Implementación canónica: `LEFT JOIN` (o `NOT EXISTS`) del subquery agregado contra `target` por la(s) `keyColumns` + período; incluir la fila si `target.<key> IS NULL` aunque su `entity_last_edited` sea viejo.
- Aplica a los materializers afectados por cold-start: `metrics_by_organization`, `metrics_by_project`, `metrics_by_sprint`, `metrics_by_business_unit`. (`metrics_by_member` se evalúa: la key member ya existe para colaboradores activos → menos afectado; decidir en Plan si entra.)
- Cero cambio al freshness gate, al `WHEN MATCHED`, ni introducir `WHEN NOT MATCHED BY SOURCE`.

### Slice 2 — Reliability signal cold-start

- `src/lib/reliability/queries/ico-materializer-cold-start.ts`: cuenta `client_id` presentes en `delivery_task_monthly_snapshots` (período vigente) ausentes de `metrics_by_organization` para el mismo período. Steady=0; warning>0; error si >0 sostenido >24h.
- Wire-up en `getReliabilityOverview` (subsystem rollup `delivery`).

### Slice 3 — Canonización

- Delta en `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` (la premisa rota del delta + el anti-join + el signal).
- BUG-CLASS-005 en `greenhouse-ico/reference/bug-class-catalog.md` (síntoma → causa → fix → lección → cross-ref BUG-CLASS-001).
- Actualizar CLAUDE.md sección "ICO Materializer Hardening Pattern" con la regla nueva.

## Out of Scope

- Gobernanza de "qué clientes están en el pipeline ICO" (eso es **TASK-1069**).
- RpA/FTR (captura de transiciones + writeback) — esta task solo cubre el materializador de snapshots → metrics_by_*.
- Cambios al freshness gate (TASK-900) ni a la semántica del bono.

## Detailed Spec

Patrón del anti-join (pseudo-SQL sobre el `USING` actual):

```sql
USING (
  SELECT <keys>, period_year, period_month, <metrics>, materialized_at, entity_last_edited
  FROM ( ... GROUP BY <keys> ... ) agg
  LEFT JOIN `<project>.ico_engine.<table>` tgt
    ON tgt.<key> = agg.<key>
   AND tgt.period_year = agg.period_year
   AND tgt.period_month = agg.period_month
  WHERE agg.entity_last_edited >= TIMESTAMP(@deltaCutoff)   -- bucket editado reciente
     OR tgt.<key> IS NULL                                    -- ← bucket nunca materializado (cold-start)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY <partition> ORDER BY materialized_at DESC) = 1
) AS s
ON ...
WHEN MATCHED THEN UPDATE ...
WHEN NOT MATCHED THEN INSERT ...
-- NUNCA WHEN NOT MATCHED BY SOURCE THEN DELETE
```

El builder debe parametrizar la(s) `keyColumns` para el `LEFT JOIN` (ya las tiene en `MaterializerSqlConfig`). El test de paridad debe verificar: (a) bucket nunca-materializado con contenido viejo entra; (b) bucket ya-materializado sin cambios no se re-mergea innecesariamente (idempotente); (c) cero filas históricas borradas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (anti-join) → Slice 2 (signal) → Slice 3 (docs). Slice 2 puede correr en paralelo con Slice 3.
- Slice 1 NO se mergea sin shadow contra el path de bono (ver Safety).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Anti-join un-blindea data de cliente nuevo que altera el bono de un member ya activo | payroll/bono | low | Shadow compare metrics_by_member before/after + `pnpm test` full; member buckets ya existen (no son cold-start) | `delivery.ico_materializer.cold_start` + diff bono shadow |
| Anti-join re-mergea de más (costo BQ) por incluir buckets viejos cada noche | BQ cost | low | El `LEFT JOIN tgt.<key> IS NULL` solo incluye nunca-materializados; una vez insertados ya no califican | run tracking `rows_merged` anómalo |
| Regresión a DELETE+INSERT por error de implementación | metrics_by_* | low | Guard de revisión: NUNCA `WHEN NOT MATCHED BY SOURCE`; test anti-regresión | preservación de históricos en test |

### Feature flags / cutover

- Reusa los flags existentes `ICO_MATERIALIZER_{MERGE_PATTERN,INCREMENTAL_DELTA}_ENABLED`. El anti-join solo aplica cuando incremental delta está ON. Revert: el cambio es aditivo al SQL del MERGE; revert = revert PR (no muta datos).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (cambio de SQL, no muta datos persistidos de forma destructiva) | <10 min | sí |
| Slice 2 | quitar el source del wire-up | <5 min | sí |
| Slice 3 | revert doc | — | sí |

### Production verification sequence

1. Slice 1 en staging → correr materializador → verify Berel (u otro cliente cold-start) aparece en `metrics_by_organization` con OTD/Throughput correctos.
2. Shadow compare `metrics_by_member` before/after en staging → verify cero cambio en members de Efeonce/Sky (bono intacto).
3. `pnpm test` full + smoke del materializador.
4. Deploy a prod → correr materializador → verify Berel poblado en el portal + signal cold-start = 0.
5. Monitor signals 7d.

### Out-of-band coordination required

- N/A — repo-only change. (Opcional: avisar al operador que Berel aparecerá poblado tras el primer run.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un cliente nuevo cuyo contenido dejó de editarse antes de entrar al snapshot aparece en `metrics_by_organization`/`metrics_by_project` en la siguiente corrida incremental, sin trigger manual.
- [ ] Cero `DELETE+INSERT` y cero `WHEN NOT MATCHED BY SOURCE` introducidos; históricos preservados (test).
- [ ] Berel (`cli-0863869c-…`) muestra OTD/Throughput/Cycle poblado en `/agency/organizations/[id]`.
- [ ] `metrics_by_member` de Efeonce/Sky idéntico before/after (bono intacto).
- [ ] Signal `delivery.ico_materializer.cold_start` activo, steady=0.
- [ ] BUG-CLASS-005 canonizado + Delta en el ADR + CLAUDE.md actualizado.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (full suite — toca materializador compartido)
- Shadow compare metrics_by_member before/after en staging
- Correr materializador en staging y verify cliente cold-start poblado

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1069, TASK-900)
- [ ] BUG-CLASS-005 agregado a la skill `greenhouse-ico`

## Follow-ups

- Si se decide que `metrics_by_member` también necesita el anti-join (cold-start de member), evaluar en una task derivada con su propio shadow de bono.

## Open Questions

- ¿El anti-join aplica a los 4 materializers afectados o solo org/project? (member ya tiene keys existentes para colaboradores activos → posiblemente no lo necesita). Lo decide el Plan con evidencia.
