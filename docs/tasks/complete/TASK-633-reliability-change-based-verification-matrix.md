# TASK-633 — Reliability Change-Based Verification Matrix

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (TASK-600 ya cerró la foundation)
- Branch: `task/TASK-633-reliability-change-based-verification-matrix`

## Summary

Cuando un PR toca un archivo `owned` por un módulo crítico declarado en el `Reliability Registry`, GitHub Actions debe ejecutar el smoke test + las señales correspondientes a ese módulo y bloquear el merge si fallan. Convierte el campo `dependencies` + `smokeTests` del registry en gates concretos por PR.

## Why This Task Exists

Hoy el smoke E2E corre como suite completa en `develop`. Eso vale para detección post-merge, pero no protege un PR contra una regresión específica del módulo que está modificando. El registry de `TASK-600` ya declara qué archivos pertenecen a cada módulo (futuras `files owned` + smoke specs); falta el GitHub Action que lea el diff, derive los módulos afectados y dispare solo lo necesario — más rápido que una suite completa, más confiable que esperar al smoke nightly.

## Goal

- Action `reliability-verify` que lee el diff del PR, mapea archivos cambiados → módulos afectados via registry, y ejecuta solo los smoke specs + reliability signals relevantes.
- Status check obligatorio en GitHub que aparece en el PR con detalle por módulo.
- Reuso del registry estático (sin duplicar el mapping en YAML).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/PLAYWRIGHT_E2E.md`
- `.github/workflows/playwright.yml` (lane preventiva existente)
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` — CI como gate compartido

Reglas obligatorias:

- el mapping archivo→módulo vive en código (registry), no duplicado en YAML.
- el action extiende el registry con el campo `filesOwned` (o lo deriva de los paths existentes).
- no rompe la lane completa actual de Playwright; agrega un carril `verify-affected`.
- compatible con GitHub Actions Node.js 24 (alineado con TASK-607).
- usa Workload Identity Federation; nunca service account keys.

## Normative Docs

- `src/lib/reliability/registry.ts` — fuente del mapping
- `tests/e2e/smoke/` — specs canónicos
- `.github/workflows/ci.yml`, `.github/workflows/playwright.yml`

## Dependencies & Impact

### Depends on

- `TASK-600` (entregada): registry estático con `routes`, `apis`, `smokeTests`.
- `TASK-632` (recomendado): synthetic runs como segunda fuente de verdad para señales runtime — el matrix puede inspeccionar la última corrida en vez de re-ejecutar.
- WIF + GitHub Actions ya en producción (varios workflows existentes).

### Blocks / Impacts

- Velocidad y confianza de PRs en `develop`/`main` (gate más fino que la suite completa).
- Reduce flakiness perceived: un PR de `finance` no falla por flake en un test de `delivery`.
- Habilita regla "no merge sin smoke verde para módulos tocados".

### Files owned

- `[verificar] src/lib/reliability/affected-modules.ts` — helper que recibe un diff y devuelve `ReliabilityModuleKey[]`
- `[verificar] scripts/reliability/affected-modules.ts` — CLI que el action invoca
- `[verificar] .github/workflows/reliability-verify.yml`
- `[verificar] src/lib/reliability/registry.ts` — extensión `filesOwned: string[]` (glob patterns)

## Current Repo State

### Already exists

- Registry con módulos críticos y `routes`/`apis`/`smokeTests` (TASK-600).
- Playwright suite completa (`pnpm test:e2e`) con auth fixture.
- WIF configurado para varios workflows (`hubspot-greenhouse-integration-deploy.yml`, `ops-worker-deploy.yml`).
- GitHub Actions Node.js 24 ya parcialmente migrado (TASK-574, TASK-607).

### Gap

- No hay mapping declarativo `archivo → módulo`. El registry tiene `routes` y `dependencies` pero no globs de archivos owned.
- No hay action que lea el diff del PR y derive afectación por módulo.
- No hay status check separado; todo va a la suite completa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extender registry con `filesOwned`

- Agregar campo `filesOwned: string[]` (glob patterns minimatch) a `ReliabilityModuleDefinition`.
- Sembrar para los 4 módulos iniciales:
  - `finance`: `src/lib/finance/**`, `src/views/greenhouse/finance/**`, `src/app/api/finance/**`
  - `integrations.notion`: `src/lib/integrations/notion-*`, `src/app/api/integrations/notion/**`
  - `cloud`: `src/lib/cloud/**`, `src/lib/bigquery.ts`, `src/lib/postgres/**`
  - `delivery`: `src/lib/delivery/**`, `src/lib/ico-engine/**`, `src/views/greenhouse/agency/**`

### Slice 2 — Helper de afectación

- `getAffectedModules(changedFiles: string[]): ReliabilityModuleKey[]` matchea cada archivo contra los globs `filesOwned` del registry.
- CLI `scripts/reliability/affected-modules.ts` lee `git diff --name-only origin/develop...HEAD` y emite `MODULE=finance,cloud` para el action.

### Slice 3 — GitHub Action `reliability-verify`

- Workflow que en cada PR:
  1. Computa archivos cambiados.
  2. Llama al CLI para derivar módulos afectados.
  3. Ejecuta `pnpm test:e2e -- $(map_modules_to_specs)` solo para los smoke specs relevantes.
  4. Llama `GET /api/admin/reliability` (preview deploy) y verifica que la severidad de los módulos afectados no haya empeorado.
  5. Emite GitHub status check con detalle por módulo.

### Slice 4 — Status check policy

- Configurar el check `reliability-verify` como required en branch protection de `develop` y `main` (decisión owner: usuario).
- Documentar en `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`.

## Out of Scope

- Reescribir la suite completa de Playwright.
- Detection de regresión de performance (latency budgets) — eso queda como follow-up.
- Auto-fix o auto-rebase: solo gate, nunca remediación.

## Detailed Spec

`ReliabilityModuleDefinition` extension:

```typescript
export interface ReliabilityModuleDefinition {
  // ... existing fields
  filesOwned: string[]   // glob patterns (minimatch)
}
```

Helper concept:

```typescript
import { minimatch } from 'minimatch'

export const getAffectedModules = (
  changedFiles: string[]
): ReliabilityModuleKey[] => {
  const affected = new Set<ReliabilityModuleKey>()
  for (const def of RELIABILITY_REGISTRY) {
    for (const glob of def.filesOwned) {
      if (changedFiles.some(file => minimatch(file, glob))) {
        affected.add(def.moduleKey)
        break
      }
    }
  }
  return [...affected]
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `ReliabilityModuleDefinition.filesOwned` declarado para los 4 módulos (finance, integrations.notion, cloud, delivery) con globs minimatch.
- [x] CLI `scripts/reliability/affected-modules.ts` testado: 12 unit tests verdes en `src/lib/reliability/affected-modules.test.ts` cubriendo single-module, cross-domain, orden estable, dotfiles, files no owned.
- [x] Workflow `.github/workflows/reliability-verify.yml` registrado con triggers `pull_request` (develop, main) + `workflow_dispatch`.
- [x] CLI smoke verificado localmente: `tsx scripts/reliability/affected-modules.ts --files src/lib/finance/foo.ts src/lib/cloud/bar.ts CHANGELOG.md` → modules `finance, cloud` + 4 specs.
- [x] PR cross-domain ejecuta múltiples smoke specs en una sola corrida (Playwright acepta lista positional).
- [x] Workflow degrada con warning (no falla) cuando `PLAYWRIGHT_BASE_URL` o `AGENT_AUTH_SECRET` no están configurados — evita romper PRs de forks/contributors externos.

## Verification

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm test` ✅ (407 files / 2090 passed)
- `pnpm build` ✅
- CLI manual: `tsx scripts/reliability/affected-modules.ts --files <paths>` ✅
- Workflow: validación contra PR real queda como follow-up post-merge.

## Resolution

V1 entregada. Decisiones tomadas durante Discovery:

1. **`minimatch` agregado como devDependency directa** (^9.0.5). Estaba transitively pero no declarado.
2. **`server-only` removido de `registry.ts`**: el archivo es data pura sin secretos. Permite consumirlo desde el CLI (Node script) y desde Vitest sin necesidad de mock global. La advertencia "server-only" sigue aplicada en `get-reliability-overview.ts`, `synthetic/*.ts`, etc.
3. **Specs huérfanos asociados al registry**: aprovechando la migración de `filesOwned`, también poblé `smokeTests` para los módulos que estaban con array vacío. Mapping final:
   - `finance` → `finance-quotes.spec.ts`
   - `integrations.notion` → `admin-nav.spec.ts`
   - `cloud` → `admin-nav`, `login-session`, `home`
   - `delivery` → `people-360`, `hr-payroll`
4. **Verificación contra `/api/admin/reliability` (preview deploy) descartada en V1**: requiere preview deploy determinista por PR. Queda como follow-up cuando exista esa pieza. El smoke pass/fail es gate suficiente por ahora.
5. **Status check NO obligatorio desde día 1**: el workflow corre informativo. La activación de branch protection es decisión separada del owner.
6. **Comportamiento sin secrets**: warning + skip en vez de fail, para no romper PRs de contributors externos sin acceso a secrets.

## Closing Protocol

- [x] `Lifecycle` sincronizado con estado real (`complete`)
- [x] archivo en la carpeta `complete/`
- [x] `docs/tasks/README.md` sincronizado con el cierre
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] chequeo cruzado: TASK-632 (synthetic — los `filesOwned` son consistentes con sus rutas), TASK-634 (puede heredar `filesOwned` para correlación path→módulo), TASK-599 (cuando entregue specs nuevas, se registran en `smokeTests` del módulo finance).
- [x] documentado en `docs/operations/PLAYWRIGHT_E2E.md` §"Change-Based Verification Matrix" cómo el carril nuevo coexiste con la suite completa.
- [x] `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` §3.1 actualizado con el campo `filesOwned`; §5 menciona el workflow.

## Follow-ups

- Verificación adicional contra `/api/admin/reliability` (preview deploy) cuando los preview deploys deterministas por PR estén disponibles.
- Latency budget per module (si una ruta crítica supera N ms en synthetic, el check falla).
- Selección granular de tests unitarios afectados (`vitest --changed`).
- Integración con `ultrareview` para correr el matrix automáticamente cuando se invoca el bot.
- Activar status check obligatorio en branch protection una vez calibrados los globs con datos de PRs reales.

## Open Questions (resueltas)

- ✅ `filesOwned` queda en código estático. Si TASK-635 ejecuta, migra a DB junto con el resto del registry.
- ✅ Status check informativo en V1; activación obligatoria queda como follow-up post-calibración.
