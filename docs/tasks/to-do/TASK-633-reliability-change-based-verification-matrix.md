# TASK-633 — Reliability Change-Based Verification Matrix

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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

- [ ] `ReliabilityModuleDefinition.filesOwned` declarado para los 4 módulos.
- [ ] CLI `scripts/reliability/affected-modules.ts` testado con casos sinéticos.
- [ ] Workflow `reliability-verify.yml` corre en cada PR y emite status check.
- [ ] PR sintético con cambio en `src/lib/finance/**` ejecuta solo smoke `finance-quotes.spec.ts` (no la suite completa).
- [ ] PR con cambios cross-domain ejecuta múltiples smoke specs en paralelo.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- PR sintético en branch experimental — validar status check.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] chequeo cruzado: TASK-632 (synthetic), TASK-634 (correlador), TASK-599 (smoke lane)
- [ ] documentado en `docs/operations/PLAYWRIGHT_E2E.md` cómo el matrix interactúa con la suite completa.

## Follow-ups

- Latency budget per module (si una ruta crítica supera N ms en synthetic, el check falla).
- Selección granular de tests unitarios afectados (`vitest --changed`).
- Integración con `ultrareview` para correr el matrix automáticamente cuando se invoca el bot.

## Open Questions

- ¿`filesOwned` se deriva del registry estático o se mueve a una tabla DB junto con TASK-635?
- ¿Status check obligatorio desde día 1 o opt-in mientras se calibran globs?
