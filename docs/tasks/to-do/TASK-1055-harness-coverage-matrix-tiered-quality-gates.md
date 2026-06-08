# TASK-1055 — Harness Coverage Matrix + Tiered Quality Gates

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|quality|reliability|ui`
- Blocked by: `none`
- Branch: `task/TASK-1055-harness-coverage-matrix-tiered-quality-gates`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Greenhouse ya tiene un harness potente, pero distribuido: Vitest, Playwright, GVC, lint rules, route gates, docs gates, staging smokes y reliability lanes viven como piezas separadas. Esta task crea la matriz canonica `riesgo -> evidencia -> gate`, define tiers de criticidad y agrega un `harness:lint` inicial para detectar gaps basicos sin inflar CI a ciegas.

## Why This Task Exists

El repo tiene muchas garantias buenas, pero aun falta trazabilidad operacional entre una surface/flujo critico y la evidencia que debe protegerlo. Hoy un agente puede saber que existe GVC, Playwright o `test:observability`, pero no hay un contrato unico que responda: "si toco Payroll export, Finance close, Home, una primitive o Teams announcements, que harness minimo debo correr y que gap bloquea cierre?".

La mejora no es "mas tests" genericos. La causa raiz a resolver es gobernanza de cobertura: clasificar riesgo, mapear evidencia existente, detectar gaps y endurecer solo las rutas maduras.

## Goal

- Crear una matriz viva de harness por dominio/surface/flow con tier, owner, tests, GVC, e2e, staging smoke, fixture/data requirement y evidencia de cierre.
- Agregar un `harness:lint` inicial que lea esa matriz y detecte gaps mecanicos basicos.
- Definir politica gradual para promover warnings maduros a errores sin romper velocidad local-first.
- Conectar el harness existente (`test:inventory`, Playwright, GVC, reliability lanes, docs gates) bajo un vocabulario comun de `Tier 0/1/2`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/12-testing-development.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No convertir el harness en una suite pesada por reflejo; cada gate nuevo debe derivar de criticidad y evidencia.
- Mantener local-first: el primer entregable debe ser diagnostico y lint de gaps, no CI obligatorio universal.
- GVC sigue siendo la evidencia visual primaria para UI visible; no reemplazarlo con scripts Playwright ad-hoc.
- No duplicar el Reliability Control Plane: el harness debe consumir o complementar sus lanes/smoke signals, no crear otro tablero runtime en V1.
- Toda ruta o flow Tier 0 debe poder explicar su evidencia minima de cierre; si no existe, debe quedar como gap explicito.

## Normative Docs

- `docs/tasks/complete/TASK-633-reliability-change-based-verification-matrix.md`
- `docs/documentation/plataforma/reliability-control-plane.md`
- `scripts/frontend/README.md`
- `scripts/frontend/scenarios/_README.md`
- `.github/workflows/ci.yml`
- `.github/workflows/playwright.yml`
- `.github/workflows/reliability-verify.yml`
- `vitest.config.ts`
- `playwright.config.ts`

## Dependencies & Impact

### Depends on

- `scripts/test-inventory.ts` — inventario actual de tests Vitest.
- `scripts/test-observability-summary.ts` — resumen actual de resultados/coverage.
- `scripts/frontend/` — GVC, scenarios, quality gates y baseline diff.
- `tests/e2e/smoke/` — smoke specs Playwright.
- `src/lib/reliability/registry.ts` — mapping de reliability modules y smoke specs.
- `.github/workflows/ci.yml`, `.github/workflows/playwright.yml`, `.github/workflows/reliability-verify.yml` — lanes CI existentes.

### Blocks / Impacts

- Mejor cierre de tasks UI y runtime criticas.
- Menos regresiones por "esta pieza no sabia que necesitaba GVC/e2e/smoke".
- Base para endurecer rutas maduras a `error` sin afectar experimentos o mockups.
- Posible follow-up futuro: surface interna de Harness Health en Ops Health.

### Files owned

- `[verificar] docs/testing/HARNESS_MATRIX.md`
- `[verificar] scripts/harness/lint.ts`
- `[verificar] scripts/harness/README.md`
- `package.json`
- `scripts/test-inventory.ts`
- `scripts/test-observability-summary.ts`
- `scripts/frontend/scenarios/`
- `docs/architecture/12-testing-development.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/documentation/plataforma/reliability-control-plane.md`

## Current Repo State

### Already exists

- `pnpm test`, `pnpm test:inventory`, `pnpm test:results`, `pnpm test:coverage` y `pnpm test:observability:summary`.
- Vitest descubre tests en `src/**`, `scripts/**` y `services/**` via `vitest.config.ts`.
- Playwright smoke suite vive en `tests/e2e/smoke/` con auth/bypass canonico.
- GVC vive en `scripts/frontend/` con 60+ scenarios, readiness/assertions, reports, baseline diff y `quality.*` gates opt-in.
- CI corre lint, custom lint-rule tests, typecheck, route reachability, migration marker, test inventory, Vitest results y build condicional.
- Playwright staging smoke publica lanes `finance.web`, `delivery.web` e `identity.web` hacia `greenhouse_sync.smoke_lane_runs`.
- Reliability change-based verification existe como workflow informativo para PRs.

### Gap

- No existe una matriz canonica que mapee `flow/surface -> tier -> evidencia minima`.
- `test:inventory` no sabe de e2e, GVC scenarios, docs gates ni smoke lanes; sirve para Vitest, no para el harness completo.
- GVC critical gates son opt-in por scenario, pero no hay politica central de que rutas Tier 0/1 los activen.
- Coverage se observa, pero no hay thresholds por dominio critico ni reglas de excepcion.
- Los datos/fixtures canonicos para e2e/smoke siguen distribuidos por dominio; falta declararlos como requisito de harness.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Harness Matrix V1

- Crear `docs/testing/HARNESS_MATRIX.md` como contrato vivo de `flow/surface -> tier -> evidence`.
- Definir tiers:
  - `Tier 0`: auth/session, Home, payroll, finance close/payments, release/deploy, DB/runtime, Teams critical operator messages.
  - `Tier 1`: UI productiva, primitives, admin, integrations normales, APIs operativas.
  - `Tier 2`: mockups, labs, experiments y docs-only.
- Registrar al menos 15 entries iniciales que cubran Home/auth, Finance, Payroll, Teams, Design System primitives, GVC/design-system labs y release/deploy.
- Declarar para cada entry: owner domain, required unit/integration/e2e/GVC/staging smoke, fixture/data requirement, commands y source docs.

### Slice 2 — Harness lint inicial

- Agregar `scripts/harness/lint.ts` y script `pnpm harness:lint`.
- Validar mecanicamente:
  - cada entry tiene tier, owner, path/flow y al menos una evidencia requerida;
  - todo `gvcScenario` declarado existe en `scripts/frontend/scenarios/`;
  - todo `e2eSpec` declarado existe en `tests/e2e/smoke/`;
  - todo comando declarado existe en `package.json` o se marca como manual;
  - Tier 0 no puede quedar sin `runtime/e2e/smoke` o una excepcion explicita.
- Output en consola legible + exit non-zero solo para gaps estructurales de la matriz, no para falta de cobertura historica aun no migrada.

### Slice 3 — Observability bridge

- Extender `pnpm test:observability:summary` o crear un resumen separado que incluya resultado de `harness:lint` y conteo de coverage gaps por tier.
- No crear UI runtime en V1; dejar `artifacts/tests/summary.md` o `artifacts/harness/summary.md` como handoff humano.
- Documentar como se interpreta `ok`, `warning`, `gap` y `exempted`.

### Slice 4 — Critical GVC/e2e policy

- Actualizar docs de GVC/testing para declarar que Tier 0/1 UI estable debe tener scenario GVC o excepcion.
- Identificar rutas Tier 0 donde `quality.runtime` y `quality.layout` pueden pasar de warning-first a error sin romper flujo local.
- No activar todos los gates en CI en esta task; dejar matriz y lint listos para una promocion posterior.

### Slice 5 — Fixture/data registry plan

- Documentar el minimo viable de fixture registry: usuarios agente, tenant demo, payroll period, finance account, contractor, Teams recipient y HubSpot/Notion test objects.
- Declarar ownership y comandos deseados (`[verificar] pnpm test:fixtures:ensure --env=local|staging`) como follow-up, sin implementarlos si excede el scope.

## Out of Scope

- Reescribir Vitest, Playwright o GVC.
- Agregar una pantalla nueva en `/admin/ops-health` en V1.
- Hacer que todos los GVC scenarios corran en CI.
- Subir coverage global por vanity metric.
- Crear fixtures mutantes en staging sin protocolo de datos y ownership por dominio.
- Cambiar branch protection o required checks sin aprobacion del operador.

## Detailed Spec

### Harness Matrix shape

La matriz puede empezar como Markdown tabular o YAML/JSON + Markdown render, pero debe quedar machine-readable para `harness:lint`. Si se usa Markdown, el script debe parsear una seccion estructurada estable.

Campos minimos:

```yaml
- id: finance.close
  tier: 0
  owner: finance
  surfaces:
    - /finance
  evidence:
    unit:
      - src/lib/finance/__tests__/finance-pnl-e2e.test.ts
    e2e:
      - tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts
    gvc: []
    runtime:
      - pnpm staging:request /api/admin/reliability
  fixtures:
    - canonical finance period
  notes: "No cierra con lint+tsc solamente."
```

### Tier policy

- `Tier 0`: cierre requiere prueba funcional o runtime. `pnpm lint` + `tsc` nunca bastan solos.
- `Tier 1`: cierre requiere test focal o GVC si hay UI visible; puede aceptar warnings con excepcion documentada.
- `Tier 2`: cierre puede ser local/manual con evidencia proporcionada; no debe endurecer CI.

### Failure taxonomy

Reusar vocabulario de GVC y Reliability cuando aplique:

- `missing_gvc_scenario`
- `missing_e2e_spec`
- `missing_runtime_smoke`
- `missing_fixture_contract`
- `coverage_visibility_only`
- `manual_exception_required`
- `stale_matrix_entry`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (matrix) -> Slice 2 (`harness:lint`) -> Slice 3 (summary bridge) -> Slice 4 (policy docs) -> Slice 5 (fixture plan).
- No promover CI strict antes de que Slice 1-3 esten verdes y revisados.
- Fixture commands son follow-up si no existe ownership claro de datos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Inflar CI con gates pesados y bajar velocidad multi-agente | CI / release | medium | V1 local-first, lint de matriz, sin required checks nuevos | GitHub Actions duration/cost + feedback operador |
| Matriz queda desactualizada y se vuelve decorativa | docs / platform | medium | `harness:lint` y entries machine-readable | `stale_matrix_entry` |
| Tier 0 mal clasificado deja flow critico sin smoke | finance / payroll / auth / release | medium | Review de domains owners + excepciones explicitas | `missing_runtime_smoke` |
| GVC se endurece en rutas inestables y genera ruido | UI | medium | warning-first hasta estabilizar; error solo por entry aprobada | GVC `quality.runtime` / `quality.layout` failures |
| Fixtures mutantes contaminan staging | data / integrations | low | V1 solo planifica fixtures; comandos mutantes quedan follow-up | no signal — emerge en staging smoke |

### Feature flags / cutover

Sin feature flags. V1 es repo-only y local-first. Si en follow-up se promueve `harness:lint` a CI strict, hacerlo en task separada o con delta explicito y aprobacion del operador.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir archivo de matriz o entry especifica | <10 min | si |
| Slice 2 | Remover script `harness:lint` de `package.json` o bajar a warning | <10 min | si |
| Slice 3 | Remover bridge del summary o artifact harness | <10 min | si |
| Slice 4 | Revertir policy docs o devolver gates a warning-first | <10 min | si |
| Slice 5 | Revertir plan fixture/follow-up docs | <10 min | si |

### Production verification sequence

1. Ejecutar `pnpm harness:lint` local con matriz V1.
2. Ejecutar `pnpm ops:lint --changed` si se tocan docs/tasks/epics/mini-tasks durante cierre.
3. Ejecutar `pnpm test:inventory` y confirmar que el bridge no rompe artifacts existentes.
4. Ejecutar tests focales del script `harness:lint`.
5. Ejecutar `pnpm docs:closure-check` al cerrar.
6. Si se decide CI opt-in, correr workflow manual antes de hacerlo required.

### Out-of-band coordination required

N/A — repo-only change. La promocion a required CI checks o branch protection requiere aprobacion humana y queda fuera de V1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `docs/testing/HARNESS_MATRIX.md` existe y lista al menos 15 entries con tier, owner, evidencia, fixtures y comandos.
- [ ] `pnpm harness:lint` existe, falla ante entries estructuralmente invalidas y pasa con la matriz V1.
- [ ] Todo `gvcScenario` y `e2eSpec` declarado en la matriz se valida contra archivos reales.
- [ ] Tier 0 entries no pueden quedar sin evidencia funcional/runtime o excepcion documentada.
- [ ] `test:observability` o artifact equivalente incluye estado resumido del harness.
- [ ] Docs de testing/GVC/reliability explican como usar la matriz durante cierre de tasks.
- [ ] No se agregan required CI checks nuevos sin aprobacion explicita del operador.

## Verification

- `pnpm harness:lint`
- `pnpm test:inventory`
- `pnpm test:observability:summary`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Tests focales para `scripts/harness/lint.ts`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se reviso si alguna entry Tier 0 abre follow-up propio para fixture/data harness

## Follow-ups

- Posible TASK futura: fixture registry runtime con `pnpm test:fixtures:ensure --env=local|staging`.
- Posible TASK futura: `/admin/ops-health/harness` o integracion con Reliability Control Plane.
- Posible TASK futura: promover subset Tier 0 de `harness:lint` a CI required.

## Delta YYYY-MM-DD

N/A.

## Open Questions

- Confirmar si la matriz V1 debe vivir como Markdown parseable o YAML/JSON + render documental.
- Confirmar owners de datos para fixtures mutantes en staging antes de crear comandos `test:fixtures:*`.
