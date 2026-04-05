# Plan — TASK-249 Test Observability MVP

## Discovery summary

- El repo ya tiene una base sana y operativa de testing: `pnpm test` usa Vitest desde `package.json`, `vitest.config.ts` descubre tests en `src/**` y `scripts/**`, y `.github/workflows/ci.yml` corre `lint -> test -> build` en CI.
- La corrida de referencia más reciente del suite está verde: `220` archivos de test, `923` tests pasados y `2` skipped.
- El conocimiento del estado del suite todavía está distribuido entre logs crudos, comandos manuales y documentos que pueden driftar. No hay artifacts, coverage ni summary estructurado publicados por CI.
- `TASK-172` ya mencionaba coverage/artifacts, pero la lane estaba mezclada con logging estructurado y security headers. `TASK-249` la extrae a una unidad ejecutable propia.
- No hay dependencia de backend runtime para resolver este gap. La arquitectura correcta del MVP es `CI + artifacts + docs`, no `portal admin + persistence`.
- Riesgo de blast radius: cambios en CI y coverage pueden volver blocking el pipeline si se endurecen demasiado en una sola iteración; por eso el baseline debe empezar advisory donde haga falta.

## Skills

- Ninguna skill especializada del repo es estrictamente necesaria para esta task.
- La implementación debe seguir directamente `AGENTS.md`, `TASK_PROCESS.md`, `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` y `docs/architecture/12-testing-development.md`.

## Subagent strategy

`sequential`

- El agente principal ejecuta discovery, scripts de inventario, wiring de coverage/CI y documentación en orden.
- No se justifica fork: el valor está en mantener consistencia entre artifacts, config de Vitest y workflow de GitHub Actions.

## GitHub Issue Draft

### Title

`[TASK-249] Test Observability MVP`

### Body

```md
## Summary

Crear un MVP de observabilidad de tests para Greenhouse sin backend admin: inventario automático del suite, outputs machine-readable de Vitest, coverage y artifacts en CI, más un summary corto en GitHub Actions.

## Why

Hoy el repo tiene una base fuerte de tests, pero el estado del suite depende de logs crudos y conocimiento manual. No existe una fuente viva y operable que responda cuántos tests hay, dónde viven, si pasaron o qué falló en la última corrida.

## Scope

- Inventario automático del suite por dominio, tipo y entorno
- Resultados machine-readable de la corrida Vitest
- Coverage output reutilizable
- Artifacts de testing/coverage en GitHub Actions
- Job summary legible para reviewers
- Documentación operativa actualizada

## Out of Scope

- Admin backend o UI dentro del portal
- Persistencia runtime en PostgreSQL o BigQuery
- Introducir una nueva capa E2E
- Aumentar coverage funcional de dominios específicos

## Acceptance Criteria

- Existe un script reproducible de inventario del suite
- CI publica artifacts de inventario, resultados y coverage
- GitHub Actions muestra un summary corto de testing
- Coverage baseline/documentación quedan formalizados
- El MVP deja explícito que no usa backend admin
```

## Execution order

1. Baseline y decisiones del MVP
   - Confirmar baseline actual de `pnpm test`, `pnpm lint`, `npx tsc --noEmit` y comportamiento actual de CI.
   - Decidir policy inicial de coverage: advisory en primera iteración salvo que el baseline permita bloquear sin ruido.
2. Inventario del suite
   - Implementar `scripts/test-inventory.ts`.
   - Generar salidas `json` + legible.
   - Añadir script en `package.json`.
3. Results + coverage outputs
   - Extender `vitest.config.ts` o el comando de CI para producir `results.json` y coverage summary.
   - Definir directorios estables de artifacts.
4. GitHub Actions wiring
   - Actualizar `.github/workflows/ci.yml` para ejecutar inventario, tests, coverage y subir artifacts.
   - Escribir job summary corto y estable.
5. Documentación operativa
   - Actualizar `docs/architecture/12-testing-development.md` con source of truth, artifacts y comandos.
   - Registrar cualquier delta adicional en `TASK-172` si el contrato final cambia.

## Files to create

- `scripts/test-inventory.ts`
- `scripts/test-observability-summary.ts`
- `docs/tasks/plans/TASK-249-plan.md`

## Files to modify

- `.github/workflows/ci.yml` — inventory, coverage, artifacts, job summary
- `package.json` — scripts de inventario/summary/coverage si aplica
- `vitest.config.ts` — outputs y coverage config
- `docs/architecture/12-testing-development.md` — operating model actualizado
- `docs/tasks/complete/TASK-249-test-observability-mvp.md` — deltas si el plan cambia materialmente

## Files to delete

- Ninguno esperado.

## Risk flags

- Coverage blocking demasiado agresivo puede volver rojo el pipeline sin entregar valor proporcional.
- El inventario debe excluir árboles no operativos (`full-version`, `.claude`, worktrees auxiliares) para no inflar conteos.
- La salida de summary no debe depender de parsing frágil de logs humanos si existe una salida JSON más estable.

## Open questions

- ¿Coverage empieza advisory o blocking?
- ¿Se usa el reporter JSON nativo de Vitest o un summary script propio como capa estable del repo?

## Checkpoint

`human`

Justificación: la task quedó en `P1 / Medio`, así que la implementación debe esperar aprobación humana del plan antes de modificar CI/coverage.
