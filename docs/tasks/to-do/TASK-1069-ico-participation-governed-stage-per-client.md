# TASK-1069 — ICO Participation as a Governed Per-Client Dimension (`ico_metrics_stage`)

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
- Domain: `delivery|data|platform|identity`
- Blocked by: `none`
- Branch: `task/TASK-1069-ico-participation-governed-stage`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy "qué clientes están en el pipeline ICO productivo (y en qué etapa)" está codificado en **dos fuentes que driftan**: la constante TS hardcodeada `PRODUCTIVE_TAREAS_DATA_SOURCE_IDS` (solo Efeonce + Sky) + flags env dispersos, **vs** la registración real data-driven en `greenhouse_core.space_notion_sources` (lo que escribe el wizard de onboarding). Esto es una violación de SSOT y hace que un cliente nuevo (Berel) nunca entre a la captura de RpA/FTR aunque ya esté sincronizado. Esta task introduce una **dimensión gobernada por-cliente** `ico_metrics_stage` (`none | capture | shadow | writeback`) como **única fuente de verdad** de la participación ICO — patrón TASK-780 (Home Rollout Flag Platform). El wizard setea `capture`; la captura/materializador/writeback leen del mismo stage; la promoción a `writeback` (que paga bono) sigue gated por los 8 stop-gates del Strangler.

## Why This Task Exists

Investigación live (Grupo Berel, 2026-06-09): la captura de transiciones (`notion-status-transition-capture`) descarta a Berel porque `resolveProductiveWorkspace` solo conoce 2 data sources escritos a mano (`efeonce`, `sky`). Cualquier cliente nuevo es invisible para RpA/FTR. El problema de fondo, vía análisis arch-architect, es estructural:

1. **SSOT roto** — la lista de "clientes productivos ICO" vive como constante de código, no como dato. No escala (cada cliente nuevo = editar código) y driftea contra `space_notion_sources`.
2. **Dimensiones ortogonales mezcladas** — inferir participación ICO desde `sync_enabled` (drena a BQ) es incorrecto: "drena a BQ" ≠ "está en el pipeline de bono RpA/FTR".
3. **Asimetría de puertas (reversibility)** — *capturar* transiciones es una puerta de ida-y-vuelta (solo acumula data, no paga a nadie); *pagar bono* es una puerta de ida (no se des-paga). Un único booleano "en ICO" colapsaría ambas. Por eso deben ser **etapas distintas del mismo SSOT**.

El mandato Strangler (TASK-910/912/916) ya gobierna la migración **por-cliente con stop-gates**. Hoy ese gobierno vive como constantes + env flags. Volverlo un **dato gobernado** lo hace first-class, escalable y fiel al Strangler — el stage registra el resultado de pasar los gates, no los reemplaza.

## Goal

- `space_notion_sources.ico_metrics_stage` (`none | capture | shadow | writeback`) como **SSOT** de participación ICO per-cliente, con CHECK de valores válidos.
- `resolveProductiveWorkspace` (captura) deriva de `space_notion_sources` (`stage >= capture`), no de la constante hardcodeada. La constante se retira.
- El **wizard de onboarding** setea `ico_metrics_stage = 'capture'` al alta (puerta two-way, bajo riesgo) → cliente nuevo empieza a acumular historial de transiciones desde el día 1.
- La **promoción** `capture → shadow → writeback` per-cliente pasa por un helper gobernado (capability + audit) que documenta el cumplimiento de los 8 stop-gates. El writeback (bono) **nunca** se prende desde el wizard.
- Reliability signal de drift (cliente sincronizado a BQ pero `stage='none'`, o `stage>=capture` pero captura no produce transiciones).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` (mandato Strangler + 8 stop-gates — el stage `writeback` los respeta, no los reemplaza)
- `docs/tasks/complete/TASK-780-home-rollout-flag-platform.md` (precedente canónico: flag declarativo por-scope + reliability signal de drift)
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (Notion = OS / Greenhouse = motor)
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` + `space_notion_sources` (Space canónico)

Reglas obligatorias:

- **NUNCA** inferir participación ICO desde `sync_enabled` — es dimensión gobernada propia.
- **NUNCA** codificar "clientes productivos ICO" como constante TS — SSOT es `space_notion_sources.ico_metrics_stage`.
- **NUNCA** auto-promover a `shadow`/`writeback` desde el wizard. El wizard solo setea `capture`. Promoción = helper gobernado + 8 stop-gates.
- **NUNCA** mezclar dimensiones ortogonales en un enum (regla arch overlay).
- Defense-in-depth proporcional: arrancar con columna + CHECK + promote-helper + signal; audit table/outbox/capability completa se gradúa al primer promote real a `writeback`.
- `captureWithDomain(err, 'delivery' | 'integrations.notion', ...)` — NUNCA Sentry directo.

## Normative Docs

- Skill `greenhouse-ico` → `migration-playbook/progressive-strategy-canonical.md` + `anti-patterns-catalog.md` (anti-patterns 4/5/6: no flip sin gates, no big-bang cross-cliente, no acelerar timeline).
- CLAUDE.md → "ICO Metrics Progressive Migration invariants (TASK-910)" + "RpA V2 productive compute + writeback invariants (TASK-916)".

## Dependencies & Impact

### Depends on

- `greenhouse_core.space_notion_sources` (tabla del Space + token scoped, TASK-998/1000/1003).
- `notion-status-transition-capture` projection (TASK-912) + `resolveProductiveWorkspace` (`notion-productive-workspaces.ts`).
- Writeback RpA/FTR (TASK-916/903) — flags `NOTION_{RPA,FTR}_WRITEBACK_ENABLED`.
- TASK-780 (patrón de flag gobernado por-scope).

### Blocks / Impacts

- **TASK-1068** (cold-start materializador) — complementaria, independiente. 1068 hace que OTD/Throughput aparezcan; 1069 gobierna captura/writeback de RpA/FTR. Pueden shipear en cualquier orden.
- Wizard de onboarding (`provisionClientFromWizard`) — gana un paso (setear stage `capture`).
- Habilita onboarding de clientes nuevos a la **captura** de RpA/FTR sin editar código (escalable).

### Files owned

- `migrations/` — columna `ico_metrics_stage` + CHECK en `space_notion_sources`.
- `src/lib/notion-metrics/notion-productive-workspaces.ts` — resolver data-driven; retiro de la constante hardcodeada.
- `src/lib/sync/projections/notion-status-transition-capture.ts` — consumir el resolver data-driven.
- `src/lib/notion-metrics/ico-participation-stage.ts` (nuevo) — reader + promote-helper.
- `src/lib/client-lifecycle/commands/provision-client-from-wizard.ts` — setear `capture` al alta.
- `src/lib/reliability/queries/ico-participation-drift.ts` (signal nuevo) + wire-up.
- ADR/Delta + CLAUDE.md.

### Current Repo State

#### Already exists

- `PRODUCTIVE_TAREAS_DATA_SOURCE_IDS` (constante 2 entradas) + `resolveProductiveWorkspace` (`notion-productive-workspaces.ts`).
- `space_notion_sources` con `sync_enabled` + `notion_token_secret_ref` per-cliente.
- Flags env globales del writeback (`NOTION_{RPA,FTR}_WRITEBACK_ENABLED`) — **se mantienen** como gate global de la maquinaria (ortogonal al stage per-cliente).
- TASK-780 declarative rollout flag platform (precedente).

#### Gap

- No existe dimensión per-cliente de participación ICO. La participación está hardcodeada + inferible erróneamente de `sync_enabled`.
- El resolver de captura no lee de la DB.
- No hay signal de drift de participación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Columna gobernada `ico_metrics_stage` (SSOT)

- Migración: `space_notion_sources.ico_metrics_stage TEXT NOT NULL DEFAULT 'none'` + CHECK `IN ('none','capture','shadow','writeback')`.
- Backfill: Efeonce + Sky a su stage real actual (RpA writeback hoy es flag-OFF/shadow → setear `shadow`; OTD/captura activa → al menos `capture`). Cualquier otro space sincronizado queda `none` hasta decisión.
- Reader canónico `getIcoMetricsStage(spaceId)` + `listSpacesAtOrAboveStage(stage)` en `ico-participation-stage.ts`.

### Slice 2 — Resolver de captura data-driven

- `resolveProductiveWorkspace` deriva de `space_notion_sources` (`stage >= capture`, mapeando `parent.data_source_id` → space). Retirar `PRODUCTIVE_TAREAS_DATA_SOURCE_IDS` como fuente (puede quedar como seed del backfill, no como runtime SSOT).
- El consumer `notion-status-transition-capture` persiste con `workspace_id` derivado del space real (no del enum `'efeonce'|'sky'` hardcodeado) — evaluar en Plan el shape de `workspace_id` para no romper datos existentes.
- Degradación honesta: data source que no resuelve a un space `>= capture` → skip (como hoy).

### Slice 3 — Wizard setea `capture` + promote-helper gobernado

- `provisionClientFromWizard` setea `ico_metrics_stage = 'capture'` al escribir `space_notion_sources` (puerta two-way).
- `promoteIcoMetricsStage(spaceId, targetStage, { actor, reason, gatesEvidence })` — transición gobernada (capability + reason). `writeback` exige evidencia de los 8 stop-gates (referencia al runbook). Idempotente.
- Defense-in-depth proporcional: column+CHECK+helper+signal ahora; audit table append-only + outbox + capability dedicada se agregan al primer promote real a `writeback`.

### Slice 4 — Reliability signal de drift

- `src/lib/reliability/queries/ico-participation-drift.ts`: (a) spaces con `sync_enabled=TRUE` pero `ico_metrics_stage='none'` (candidatos sin decidir), (b) spaces `>= capture` que no produjeron transiciones en N días (captura rota). Steady según política; wire-up subsystem `delivery`.

## Out of Scope

- El cold-start del materializador de snapshots (OTD/Throughput) — eso es **TASK-1068**.
- Activar `writeback` (bono) para Berel ni ningún cliente nuevo — esta task **habilita captura**, no paga. La promoción a `writeback` es decisión gated separada.
- Granularidad per-(cliente × métrica) — YAGNI hasta el 3er cliente con etapas mixtas (ver Open Questions).
- Cambios a los flags env globales del writeback (se mantienen como gate de maquinaria).

## Detailed Spec

**Separación de ejes (clave arch):**

| Eje | Qué gobierna | Dónde vive |
|---|---|---|
| Flag env global (`NOTION_RPA_WRITEBACK_ENABLED`) | ¿La maquinaria de writeback está prendida del todo? | env var |
| `ico_metrics_stage` per-cliente | ¿Qué clientes participan y en qué etapa? | `space_notion_sources` (SSOT) |

Un cliente recibe writeback de RpA solo si **ambos**: flag global ON **AND** su `ico_metrics_stage = 'writeback'`. Esto da dos ejes de rollback ortogonales (kill global vs por-cliente).

**Asimetría de puertas (por qué stages, no booleano):**

- `capture` (two-way) — acumula `task_status_transitions`. Reversible: bajar a `none`, la data queda. No paga.
- `shadow` (two-way) — computa + compara paridad, no escribe a Notion ni paga.
- `writeback` (one-way) — escribe `[GH]` properties + alimenta bono. Promoción gated por 8 stop-gates + (graduado) audit.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (columna + backfill) → Slice 2 (resolver data-driven) → Slice 3 (wizard + promote) → Slice 4 (signal).
- Slice 2 NO se mergea sin que el backfill (Slice 1) tenga a Efeonce/Sky en su stage correcto — sino la captura productiva existente se rompe.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Resolver data-driven rompe captura de Efeonce/Sky (backfill incompleto) | RpA/FTR captura | medium | Backfill verificado + test: Efeonce/Sky siguen resolviendo a `>= capture` antes de retirar la constante | `ico.participation.drift` + transiciones por workspace |
| Auto-promover a writeback por error (paga bono indebido) | payroll/bono | low | `promoteIcoMetricsStage` exige `writeback` con evidencia gates; wizard solo setea `capture`; flag global sigue OFF | `notion.metrics.shadow_paridad_rpa` + reconciliación HR |
| `workspace_id` shape cambia y rompe datos de transiciones existentes | task_status_transitions | medium | Evaluar en Plan: mantener `'efeonce'|'sky'` para los 2 legacy + space_id para nuevos, o migrar con cuidado | tests anti-regresión captura |
| Cliente queda en `none` y nadie lo nota | observabilidad | low | Signal de drift (sync_enabled pero stage none) | `ico.participation.drift` |

### Feature flags / cutover

- `ico_metrics_stage` ES el mecanismo de cutover graduado (per-cliente). Flags env globales del writeback se mantienen. Default de la columna `none` → additive seguro. Revert: bajar stage o revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | columna additive con DEFAULT `none`; revert = drop columna o ignorar | <10 min | sí |
| Slice 2 | revert PR (vuelve a la constante) — por eso Slice 1 backfill debe ser correcto antes | <10 min | sí |
| Slice 3 | wizard: revert del set de stage; promote-helper: bajar stage | <10 min | sí |
| Slice 4 | quitar source del wire-up | <5 min | sí |

### Production verification sequence

1. Slice 1 staging: `migrate:up` + verify columna + CHECK + backfill Efeonce/Sky en stage correcto.
2. Slice 2 staging: verify Efeonce/Sky siguen capturando (transiciones nuevas entran) + un space `capture` nuevo (test) captura.
3. Slice 3 staging: onboardear cliente test → verify `ico_metrics_stage='capture'` seteado + empieza a acumular.
4. Slice 4 staging: verify signal de drift.
5. Repetir en prod con cooldown. Berel: setear `capture` → confirmar que acumula transiciones forward (NO `writeback`).
6. Monitor 7d.

### Out-of-band coordination required

- Avisar a HR/Delivery: clientes nuevos entran a **captura** de RpA/FTR (acumulación), NO a bono. El bono per-cliente sigue siendo decisión gated.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `space_notion_sources.ico_metrics_stage` existe con CHECK; Efeonce/Sky backfilled a su stage real.
- [ ] `resolveProductiveWorkspace` deriva de la DB; la constante hardcodeada ya no es SSOT de runtime.
- [ ] Un cliente onboardeado por el wizard queda en `ico_metrics_stage='capture'` y empieza a acumular transiciones.
- [ ] `writeback` solo se alcanza vía `promoteIcoMetricsStage` con evidencia de gates; **nunca** desde el wizard.
- [ ] Efeonce/Sky siguen capturando RpA/FTR sin regresión.
- [ ] Signal `ico.participation.drift` activo.
- [ ] Berel queda en `capture` (no writeback) tras la verificación en prod.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm migrate:up` + verify `information_schema` (columna + CHECK)
- Smoke captura: Efeonce/Sky transiciones nuevas + cliente test `capture`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1068, TASK-910/912/916, TASK-998)
- [ ] CLAUDE.md actualizado con las hard rules del stage gobernado

## Follow-ups

- Audit table append-only + outbox + capability dedicada para `promoteIcoMetricsStage` — graduar al primer promote real a `writeback`.
- Granularidad per-(cliente × métrica) si emerge un cliente con OTD en shadow y RpA en writeback simultáneo.

## Open Questions

- ¿`ico_metrics_stage` es una sola columna global por-cliente o una tabla sibling per-métrica? Arranca con columna global; per-métrica si emerge necesidad real.
- ¿`workspace_id` en `task_status_transitions` migra a `space_id` o se mantiene `'efeonce'|'sky'` para legacy + space_id para nuevos? Decisión de Plan con cuidado de no romper datos existentes.
- ¿`shadow` per-cliente requiere su propio reliability signal de paridad por-cliente, o se reusa `notion.metrics.shadow_paridad_*`? Evaluar en Plan.
